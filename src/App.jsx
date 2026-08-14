import React, { useState, useEffect } from 'react';
import CharacterList from './components/CharacterList';
import CampaignWorkspace from './components/CampaignWorkspace';
import FloatingNote from './components/FloatingNote';
import AppHeader from './components/shell/AppHeader';
import AppStatusLine from './components/shell/AppStatusLine';
import RightRail from './components/shell/RightRail';
import CharacterEditorModal from './components/modals/CharacterEditorModal';
import RestModal from './components/modals/RestModal';
import SettingsModal from './components/modals/SettingsModal';
import { ResizeHandle } from './ds';
import { applyTheme, readStoredTheme } from './ds/theme';
import { CURRENT_SCHEMA_VERSION, MAX_CAMPAIGN_FILE_BYTES, prepareCampaign } from './utils/campaignValidation';
import { resolveSyncToken } from './utils/syncToken';
import { createLocalRecoveryPoint, describeStorageError, listLocalRecoveryPoints, loadCampaignSnapshot, restoreLocalRecoveryPoint, safeWriteSetting, saveCampaignSnapshot } from './utils/campaignSnapshotStore';
import { createCampaignExport, openCampaignExport } from './utils/campaignExport';
import { serializeJsonOffThread } from './utils/jsonSerialization';
import { decideInitialSync, decidePollingSync } from './utils/syncDecision';
import { buildPublicPresentationSnapshot, DEFAULT_PRESENTATION_SETTINGS, normalizePresentationSettings, PRESENTATION_PROTOCOL } from './utils/presentation';


// --- Helper to ensure all characters have default resources ---
const sanitizeCharacters = (chars) => {
  return chars.map(c => {
    let resources = c.resources ? c.resources.map(r => ({ ...r })) : [];
    
    // Check if '动作' is present, if not add it, otherwise ensure type
    const hasAction = resources.some(r => r.name === '动作');
    if (!hasAction) {
      resources = [
        { name: '动作', max: 1, value: 1, resetType: 'turn' },
        ...resources
      ];
    } else {
      resources = resources.map(r => r.name === '动作' ? { ...r, resetType: 'turn', max: 1 } : r);
    }

    // Check if '附赠动作' is present, if not add it, otherwise ensure type
    const hasBonusAction = resources.some(r => r.name === '附赠动作');
    if (!hasBonusAction) {
      resources = [
        ...resources.filter(r => r.name !== '附赠动作'),
        { name: '附赠动作', max: 1, value: 1, resetType: 'turn' }
      ];
    } else {
      resources = resources.map(r => r.name === '附赠动作' ? { ...r, resetType: 'turn', max: 1 } : r);
    }

    // Ensure all resources have a resetType, defaulting to 'long_rest'
    resources = resources.map(r => ({
      ...r,
      resetType: r.resetType || 'long_rest'
    }));

    return {
      ...c,
      resources,
      level: c.level !== undefined ? c.level : 1,
      hitDice: c.hitDice !== undefined ? c.hitDice : 'd8',
      levelHpIncreases: c.levelHpIncreases ? [...c.levelHpIncreases] : [],
      tempHp: c.tempHp !== undefined ? c.tempHp : 0
    };
  });
};

// --- Campaign Initial Fallback Templates (Out of the Box) ---
const INITIAL_CHARACTERS = [
  {
    id: 'char_player_a',
    name: '奥利奥 (战士)',
    type: 'PC',
    hp: 45,
    maxHp: 55,
    gridX: 5,
    gridY: 5,
    mapId: 'map_initial_1',
    stats: {
      '力量 (Physical)': 16,
      '敏捷 (Agility)': 12,
      '体质 (Fortitude)': 14,
      '感知 (Perception)': 10,
      '智力 (Intellect)': 8,
      '神秘 (Arcane)': 6
    },
    feats: { '重甲防护': '受到物理伤害减少3点', '横扫攻击': '一次攻击同时打击两个紧挨着的目标' },
    excelPath: ''
  },
  {
    id: 'char_goblin_squad',
    name: '哥布林斥候 x3',
    type: 'NPC',
    hp: 15,
    maxHp: 15,
    gridX: 12,
    gridY: 10,
    mapId: 'map_initial_1',
    stats: {
      '力量 (Physical)': 8,
      '敏捷 (Agility)': 14,
      '体质 (Fortitude)': 10,
      '感知 (Perception)': 12,
      '智力 (Intellect)': 6,
      '神秘 (Arcane)': 2
    },
    feats: { '潜伏优势': '在草丛/阴影处具有伏击优势加成。' },
    excelPath: ''
  }
];

const INITIAL_ITEM_TEMPLATES = [
  { name: '远古圣水', category: '消耗品', description: '饮用后回复20点生命，并对不死生物产生5d6的真实灼烧伤害。' },
  { name: '魔岩大剑', category: '武器', description: '需要力量15以上。攻击伤害为 2d8+3 物理碎甲伤害。' },
  { name: '初级治疗药水', category: '消耗品', description: '饮用回复1d8+2点生命值。' }
];

const INITIAL_ITEM_POOL = [
  {
    id: 'item_initial_1',
    name: '远古圣水',
    category: '消耗品',
    quantity: 3,
    description: '饮用后回复20点生命，并对不死生物产生5d6的真实灼烧伤害。',
    ownerId: 'WORLD'
  },
  {
    id: 'item_initial_2',
    name: '魔岩大剑',
    category: '武器',
    quantity: 1,
    description: '需要力量15以上。攻击伤害为 2d8+3 物理碎甲伤害。',
    ownerId: 'WORLD'
  },
  {
    id: 'item_initial_3',
    name: '初级治疗药水',
    category: '消耗品',
    quantity: 2,
    description: '饮用回复1d8+2点生命值。',
    ownerId: 'char_player_a'
  }
];

const INITIAL_LOGS = [
  {
    type: 'SYSTEM',
    content: '**DMForge 战役辅助系统** 已成功初始化。',
    timestamp: new Date().toLocaleTimeString()
  }
];

const INITIAL_GROUPS = [
  { id: 'group_pcs', name: '玩家成员' },
  { id: 'group_npcs', name: '怪物与NPC' }
];

const INITIAL_FLOATING_NOTES = [
  {
    id: 'note_initial_1',
    title: '酒馆传闻与秘密',
    content: '听酒馆老板娘提起，北山废弃矿井深处，每到月圆之夜就会传出低沉的龙吼声。另外，村口的独眼老汉似乎藏有一张旧矿图...',
    x: 100,
    y: 120,
    color: 'purple',
    isMinimized: false,
    isOpen: true
  },
  {
    id: 'note_initial_2',
    title: '地牢隐藏陷阱提示',
    content: '注意：第三通道的转角处，第4块和第7块地砖下装有重力压敏机关，踏入会触发两侧墙壁的飞矢陷阱，伤害为 2d6 穿刺。',
    x: 350,
    y: 200,
    color: 'red',
    isMinimized: true,
    isOpen: true
  }
];

const INITIAL_MAPS = [
  {
    id: 'map_initial_1',
    name: '村口酒馆大厅 (地上)',
    width: 60,
    height: 40,
    bgUrl: '',
    blockedCells: {
      '8_7': true, '8_8': true, '8_9': true,
      '9_7': true, '9_9': true
    },
    terrainAreas: [
      {
        id: 'terrain_initial_1',
        name: '烈焰熔岩深渊',
        type: 'rect',
        color: 'red',
        gridX: 15,
        gridY: 8,
        width: 8,
        height: 4,
        isSecret: false
      },
      {
        id: 'terrain_initial_2',
        name: '剧毒腐蚀气溶胶',
        type: 'circle',
        color: 'emerald',
        gridX: 28,
        gridY: 12,
        radius: 5,
        isSecret: false
      },
      {
        id: 'terrain_initial_3',
        name: '隐藏针刺陷阱',
        type: 'rect',
        color: 'amber',
        gridX: 5,
        gridY: 14,
        width: 2,
        height: 2,
        isSecret: true
      }
    ]
  },
  {
    id: 'map_initial_2',
    name: '地底秘境遗迹 (地下)',
    width: 50,
    height: 35,
    bgUrl: '',
    blockedCells: {
      '15_15': true, '15_16': true, '15_17': true
    },
    terrainAreas: [
      {
        id: 'terrain_initial_4',
        name: '寒冰深水潭',
        type: 'circle',
        color: 'blue',
        gridX: 20,
        gridY: 20,
        radius: 4,
        isSecret: false
      }
    ]
  }
];

// --- Helper for loading from LocalStorage ---
const getSavedState = (key, fallback) => {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(`Failed to parse localStorage key [${key}]`, e);
    }
  }
  return fallback;
};

export default function App() {
  // --- LAN Sync System States ---
  const clientId = React.useRef(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const lastUpdatedRef = React.useRef(getSavedState('dmforge_lastUpdated', 0));
  const serverRevisionRef = React.useRef(null);
  const isServerUpdateInProgress = React.useRef(false);
  const isSyncInitialized = React.useRef(false);
  const localDirtyRef = React.useRef(false);
  const isPushInFlight = React.useRef(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(() => getSavedState('dmforge_isSyncEnabled', true));
  const [syncToken, setSyncToken] = useState(() => {
    return resolveSyncToken(window.location.hash, getSavedState('dmforge_syncToken', ''));
  });
  const [isSyncConnected, setIsSyncConnected] = useState(true);
  const presentationSessionRef = React.useRef((() => {
    try {
      const existing = sessionStorage.getItem('dmforge_presentation_session');
      if (existing) return existing;
      const created = crypto.randomUUID();
      sessionStorage.setItem('dmforge_presentation_session', created);
      return created;
    } catch { return crypto.randomUUID(); }
  })());
  const presenterWindowRef = React.useRef(null);
  const presentationLastSeenRef = React.useRef(0);
  const [presentationConnected, setPresentationConnected] = useState(false);
  const [presentationWindowOpen, setPresentationWindowOpen] = useState(false);
  const [presentationFallbackUrl, setPresentationFallbackUrl] = useState('');
  const [presentationCamera, setPresentationCamera] = useState({ scale: 1, x: 0, y: 0 });
  const [presentationInteraction, setPresentationInteraction] = useState(null);
  const [presentationSettings, setPresentationSettings] = useState(() => normalizePresentationSettings(getSavedState(
    'dmforge_presentationSettingsV2',
    { ...getSavedState('dmforge_presentationSettings', DEFAULT_PRESENTATION_SETTINGS), showBlockedCells: true }
  )));
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  // Byte size of the last payload we serialized for sync. Measured only where a
  // serialized string already exists — never worth a extra JSON pass per render.
  const [campaignBytes, setCampaignBytes] = useState(0);
  const [storageStatus, setStorageStatus] = useState('正在加载本地存档…');
  const [localRecoveryPoints, setLocalRecoveryPoints] = useState([]);
  const [syncConflict, setSyncConflict] = useState(null);
  const [serverBackups, setServerBackups] = useState([]);

  const [currentTab, setCurrentTab] = useState('map'); // map, items, excel
  const [appRole, setAppRole] = useState(() => getSavedState('dmforge_appRole', 'DM'));
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const isPlayerViewMode = appRole === 'PLAYER';

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Resizable sidebar widths
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(() => getSavedState('dmforge_leftSidebarWidth', 320));
  const [rightSidebarWidth, setRightSidebarWidth] = useState(() => getSavedState('dmforge_rightSidebarWidth', 320));

  // Sidebar collapse states (DM workspace control)
  const [isLeftSidebarCollapsed, setIsLeftSidebarCollapsed] = useState(() => getSavedState('dmforge_isLeftSidebarCollapsed', false));
  const [isRightSidebarCollapsed, setIsRightSidebarCollapsed] = useState(() => getSavedState('dmforge_isRightSidebarCollapsed', false));

  // Core Campaign states initialized from LocalStorage
  const [characters, setCharacters] = useState(() => {
    const rawChars = getSavedState('dmforge_characters', INITIAL_CHARACTERS);
    const sanitized = rawChars.map(c => ({
      ...c,
      conditions: c.conditions || [],
      combatSpeedRemaining: c.combatSpeedRemaining !== undefined ? c.combatSpeedRemaining : (c.speed !== undefined ? c.speed : 30),
      combatStartGridX: c.combatStartGridX !== undefined ? c.combatStartGridX : (c.gridX || 0),
      combatStartGridY: c.combatStartGridY !== undefined ? c.combatStartGridY : (c.gridY || 0)
    }));
    return sanitizeCharacters(sanitized);
  });
  const [itemPool, setItemPool] = useState(() => getSavedState('dmforge_itemPool', INITIAL_ITEM_POOL));
  const [itemTemplates, setItemTemplates] = useState(() => getSavedState('dmforge_itemTemplates', INITIAL_ITEM_TEMPLATES));
  const [logs, setLogs] = useState(() => getSavedState('dmforge_logs', INITIAL_LOGS));
  const [floatingNotes, setFloatingNotes] = useState(() => getSavedState('dmforge_floatingNotes', INITIAL_FLOATING_NOTES));
  const [maps, setMaps] = useState(() => getSavedState('dmforge_maps', INITIAL_MAPS));
  const [activeMapId, setActiveMapId] = useState(() => getSavedState('dmforge_activeMapId', 'map_initial_1'));
  
  // Global turn-based combat states
  const [isInCombat, setIsInCombat] = useState(() => getSavedState('dmforge_isInCombat', false));
  const [combatRound, setCombatRound] = useState(() => getSavedState('dmforge_combatRound', 1));
  const [currentTurnIndex, setCurrentTurnIndex] = useState(() => getSavedState('dmforge_currentTurnIndex', 0));
  const [combatParticipants, setCombatParticipants] = useState(() => getSavedState('dmforge_combatParticipants', []));
  const [combatTurnOrder, setCombatTurnOrder] = useState(() => getSavedState('dmforge_combatTurnOrder', []));
  
  // High-fidelity Excel Spreadsheets database
  const [excelCards, setExcelCards] = useState(() => getSavedState('dmforge_excelCards', []));
  const [activeExcelCardId, setActiveExcelCardId] = useState(() => getSavedState('dmforge_activeExcelCardId', ''));

  // Custom Groups state
  const [groups, setGroups] = useState(() => getSavedState('dmforge_groups', INITIAL_GROUPS));

  // Custom Core Attribute display labels state
  const [customAttributeLabels, setCustomAttributeLabels] = useState(() => getSavedState('dmforge_customAttributeLabels', {
    '力量 (Physical)': '力量 (Physical)',
    '敏捷 (Agility)': '敏捷 (Agility)',
    '体质 (Fortitude)': '体质 (Fortitude)',
    '感知 (Perception)': '感知 (Perception)',
    '智力 (Intellect)': '智力 (Intellect)',
    '神秘 (Arcane)': '神秘 (Arcane)'
  }));

  useEffect(() => {
    let active = true;
    loadCampaignSnapshot().then(snapshot => {
      if (!active || !snapshot) return;
      const data = prepareCampaign(snapshot);
      setCharacters(sanitizeCharacters(data.characters));
      setItemPool(data.itemPool);
      setItemTemplates(data.itemTemplates);
      setLogs(data.logs);
      setFloatingNotes(data.floatingNotes);
      setMaps(data.maps);
      setActiveMapId(data.activeMapId);
      setExcelCards(data.excelCards);
      setGroups(data.groups);
      setIsInCombat(data.isInCombat);
      setCombatRound(data.combatRound);
      setCurrentTurnIndex(data.currentTurnIndex);
      setCombatParticipants(data.combatParticipants);
      setCombatTurnOrder(data.combatTurnOrder);
      setCustomAttributeLabels(data.customAttributeLabels);
      lastUpdatedRef.current = data.lastUpdated || 0;
    }).catch(error => {
      if (active) setStorageError(describeStorageError(error));
    }).finally(() => {
      if (active) {
        setStorageReady(true);
        setStorageStatus('本地存档已就绪');
        listLocalRecoveryPoints().then(setLocalRecoveryPoints).catch(() => {});
      }
    });
    return () => { active = false; };
  }, []);

  const handleSetAppRole = (role) => {
    setAppRole(role);
    if (role === 'PLAYER') {
      setCurrentTab('map');
    }
  };

  // Root-level Character creation modal states
  const [isAddCharModalOpen, setIsAddCharModalOpen] = useState(false);
  const [editingCharId, setEditingCharId] = useState(null);
  const [newChar, setNewChar] = useState({
    name: '',
    type: 'NPC',
    class: '',
    maxHp: 30,
    ac: 10,
    initiative: 0,
    speed: 30,
    stats: {
      '力量 (Physical)': 10,
      '敏捷 (Agility)': 10,
      '体质 (Fortitude)': 10,
      '感知 (Perception)': 10,
      '智力 (Intellect)': 10,
      '神秘 (Arcane)': 10
    },
    resources: [],
    conditions: [],
    level: 1,
    hitDice: 'd8',
    levelHpIncreases: [],
    tempHp: 0
  });

  // Rest & Recovery Modal states
  const [isRestModalOpen, setIsRestModalOpen] = useState(false);
  const [restModalType, setRestModalType] = useState('short'); // 'short' | 'long'
  const [restParticipants, setRestParticipants] = useState({}); // { charId: boolean }

  const handleOpenAddCharModal = React.useCallback(() => {
    setEditingCharId(null);
    setNewChar({
      name: '',
      type: 'NPC',
      class: '',
      maxHp: 30,
      ac: 10,
      initiative: 0,
      speed: 30,
      stats: {
        '力量 (Physical)': 10,
        '敏捷 (Agility)': 10,
        '体质 (Fortitude)': 10,
        '感知 (Perception)': 10,
        '智力 (Intellect)': 10,
        '神秘 (Arcane)': 10
      },
      resources: [],
      conditions: [],
      level: 1,
      hitDice: 'd8',
      levelHpIncreases: [],
      tempHp: 0
    });
    // The resource sub-form lives in CharacterEditorModal and unmounts with it,
    // so it resets itself every time the modal opens.
    setIsAddCharModalOpen(true);
  }, []);

  const handleOpenRestModal = React.useCallback((type) => {
    setRestModalType(type);
    
    // Auto-select all PCs by default, NPCs unselected
    const initialSelection = {};
    characters.forEach(c => {
      initialSelection[c.id] = c.type === 'PC';
    });
    setRestParticipants(initialSelection);
    setIsRestModalOpen(true);
  }, [characters]);

  const handleShortRest = (selectedIds) => {
    const restingNames = [];
    setCharacters(prev => {
      const updated = prev.map(c => {
        if (selectedIds.includes(c.id)) {
          restingNames.push(c.name);
          
          // 1. Recover 50% max HP
          const hpRecovery = Math.floor(c.maxHp * 0.5);
          const newHp = Math.min(c.maxHp, c.hp + hpRecovery);
          
          // 2. Reset resources with resetType === 'short_rest' or 'turn'
          const updatedResources = (c.resources || []).map(res => {
            if (res.resetType === 'short_rest' || res.resetType === 'turn') {
              return { ...res, value: res.max };
            }
            return res;
          });

          return {
            ...c,
            hp: newHp,
            resources: updatedResources
          };
        }
        return c;
      });
      return sanitizeCharacters(updated);
    });

    addLog({
      type: 'COMBAT',
      content: `**战役短休**: 角色 [${restingNames.join(',')}] 完成了短休整顿，生命值恢复 50%，并充能重置了短休和回合技能资源槽！`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleLongRest = (selectedIds) => {
    const restingNames = [];
    setCharacters(prev => {
      const updated = prev.map(c => {
        if (selectedIds.includes(c.id)) {
          restingNames.push(c.name);
          
          // 1. Recover 100% max HP
          // 2. Reset ALL resources to max
          const updatedResources = (c.resources || []).map(res => {
            return { ...res, value: res.max };
          });

          return {
            ...c,
            hp: c.maxHp,
            resources: updatedResources,
            conditions: [], // clear all conditions
            combatSpeedRemaining: c.speed !== undefined ? c.speed : 30 // recover speed
          };
        }
        return c;
      });
      return sanitizeCharacters(updated);
    });

    addLog({
      type: 'COMBAT',
      content: `**战役长休**: 角色 [${restingNames.join(',')}] 完成了长休整顿！生命恢复 100%，所有资源槽满额重载，且身上的特殊状态与移动限制已完全清除！`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleOpenEditCharModal = React.useCallback((char) => {
    setEditingCharId(char.id);
    setNewChar({
      name: char.name || '',
      type: char.type || 'NPC',
      class: char.class || '',
      maxHp: char.maxHp || 30,
      ac: char.ac !== undefined ? char.ac : 10,
      initiative: char.initiative !== undefined ? char.initiative : 0,
      speed: char.speed !== undefined ? char.speed : 30,
      stats: char.stats ? { ...char.stats } : {
        '力量 (Physical)': 10,
        '敏捷 (Agility)': 10,
        '体质 (Fortitude)': 10,
        '感知 (Perception)': 10,
        '智力 (Intellect)': 10,
        '神秘 (Arcane)': 10
      },
      resources: char.resources ? char.resources.map(r => ({ ...r })) : [],
      conditions: char.conditions || [],
      level: char.level !== undefined ? char.level : 1,
      hitDice: char.hitDice !== undefined ? char.hitDice : 'd8',
      levelHpIncreases: char.levelHpIncreases ? [...char.levelHpIncreases] : [],
      tempHp: char.tempHp !== undefined ? char.tempHp : 0
    });
    // The resource sub-form lives in CharacterEditorModal and unmounts with it,
    // so it resets itself every time the modal opens.
    setIsAddCharModalOpen(true);
  }, []);


  // --- LAN Sync Engine ---
  
  // Pack current campaign state to JSON payload
  const getCampaignPayload = (timestamp) => {
    return {
      characters,
      itemPool,
      itemTemplates,
      logs,
      floatingNotes,
      maps,
      activeMapId,
      excelCards,
      activeExcelCardId,
      groups,
      isInCombat,
      combatRound,
      currentTurnIndex,
      combatParticipants,
      combatTurnOrder,
      customAttributeLabels,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      lastUpdated: timestamp,
      clientId: clientId.current,
      version: '1.0.0'
    };
  };

  const presentationHost = window.location.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  const presentationOrigin = `${window.location.protocol}//${presentationHost}${window.location.port ? `:${window.location.port}` : ''}`;
  const presentationUrl = `${presentationOrigin}/presenter?session=${encodeURIComponent(presentationSessionRef.current)}`;
  const presentationSnapshot = React.useMemo(() => buildPublicPresentationSnapshot(
    getCampaignPayload(lastUpdatedRef.current || Date.now()), presentationSettings, presentationCamera, presentationInteraction
  // getCampaignPayload captures the campaign fields listed in this dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [characters, itemPool, itemTemplates, logs, floatingNotes, maps, activeMapId, excelCards, activeExcelCardId, groups, isInCombat, combatRound, currentTurnIndex, combatParticipants, combatTurnOrder, customAttributeLabels, presentationSettings, presentationCamera, presentationInteraction]);
  const presentationChannelRef = React.useRef(null);
  const presentationSnapshotRef = React.useRef(presentationSnapshot);
  presentationSnapshotRef.current = presentationSnapshot;

  const sendPresentationSnapshot = React.useCallback((targetWindow = presenterWindowRef.current) => {
    const message = { protocol: PRESENTATION_PROTOCOL, sessionId: presentationSessionRef.current, type: 'SNAPSHOT', snapshot: presentationSnapshotRef.current };
    try { if (targetWindow && !targetWindow.closed) targetWindow.postMessage(message, presentationOrigin); } catch { /* the window may be navigating */ }
    presentationChannelRef.current?.postMessage(message);
  }, [presentationOrigin]);

  useEffect(() => {
    safeWriteSetting('dmforge_presentationSettingsV2', normalizePresentationSettings(presentationSettings), setStorageError);
  }, [presentationSettings]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(`${PRESENTATION_PROTOCOL}:${presentationSessionRef.current}`);
    presentationChannelRef.current = channel;
    channel.onmessage = event => {
      if (event.data?.protocol !== PRESENTATION_PROTOCOL || event.data.sessionId !== presentationSessionRef.current) return;
      if (event.data.type === 'READY') { presentationLastSeenRef.current = Date.now(); setPresentationConnected(true); sendPresentationSnapshot(); }
      if (event.data.type === 'PONG') { presentationLastSeenRef.current = Date.now(); setPresentationConnected(true); }
    };
    return () => { presentationChannelRef.current = null; channel.close(); };
  }, [sendPresentationSnapshot]);

  useEffect(() => {
    const receive = event => {
      const data = event.data;
      if (event.origin !== presentationOrigin || data?.protocol !== PRESENTATION_PROTOCOL || data.sessionId !== presentationSessionRef.current) return;
      if (data.type === 'READY') {
        if (!presenterWindowRef.current || presenterWindowRef.current.closed) presenterWindowRef.current = event.source;
        if (event.source !== presenterWindowRef.current) return;
        presentationLastSeenRef.current = Date.now(); setPresentationWindowOpen(true); setPresentationConnected(true); sendPresentationSnapshot(event.source);
      }
      if (data.type === 'PONG' && event.source === presenterWindowRef.current) { presentationLastSeenRef.current = Date.now(); setPresentationConnected(true); }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [presentationOrigin, sendPresentationSnapshot]);

  useEffect(() => {
    if (!presentationWindowOpen && !presentationConnected) return undefined;
    const timer = setTimeout(() => sendPresentationSnapshot(), 120);
    return () => clearTimeout(timer);
  }, [presentationSnapshot, presentationWindowOpen, presentationConnected, sendPresentationSnapshot]);

  useEffect(() => {
    const timer = setInterval(() => {
      const target = presenterWindowRef.current;
      if (!target || target.closed) {
        presenterWindowRef.current = null;
        if (presentationWindowOpen) setPresentationWindowOpen(false);
        if (presentationLastSeenRef.current && Date.now() - presentationLastSeenRef.current > 5000) setPresentationConnected(false);
        return;
      }
      setPresentationWindowOpen(true);
      if (presentationLastSeenRef.current && Date.now() - presentationLastSeenRef.current > 5000) setPresentationConnected(false);
      try { target.postMessage({ protocol: PRESENTATION_PROTOCOL, sessionId: presentationSessionRef.current, type: 'PING' }, presentationOrigin); }
      catch { setPresentationConnected(false); }
    }, 2000);
    return () => clearInterval(timer);
  }, [presentationOrigin, presentationWindowOpen]);

  const openPresentationWindow = () => {
    const target = window.open(presentationUrl, 'dmforge-presenter', 'popup,width=1600,height=900,resizable=yes');
    setPresentationFallbackUrl(presentationUrl);
    if (!target) { setPresentationWindowOpen(false); return; }
    presenterWindowRef.current = target; setPresentationWindowOpen(true); setPresentationConnected(false); target.focus();
  };
  const openPresentationTab = () => {
    const target = window.open(presentationUrl, 'dmforge-presenter');
    if (!target) { setPresentationWindowOpen(false); return; }
    presenterWindowRef.current = target; setPresentationWindowOpen(true); setPresentationConnected(false); target.focus();
  };
  const focusPresentationWindow = () => { try { presenterWindowRef.current?.focus(); } catch { /* cross-origin focus may be restricted */ } };
  const closePresentationWindow = () => { try { presenterWindowRef.current?.close(); } catch { /* already closed */ } presenterWindowRef.current = null; setPresentationWindowOpen(false); setPresentationConnected(false); };
  const requestPresentationFullscreen = () => setPresentationSettings(current => ({ ...current, fullscreenRequest: (current.fullscreenRequest || 0) + 1 }));
  const handlePresentationCameraChange = React.useCallback(camera => {
    setPresentationCamera(previous => Math.abs(previous.scale - camera.scale) < .002 && Math.abs(previous.x - camera.x) < .5 && Math.abs(previous.y - camera.y) < .5 ? previous : camera);
  }, []);

  // Push state to server
  const pushCampaignToServer = async (timestamp, expectedRevision = serverRevisionRef.current || '"empty"') => {
    if (isPushInFlight.current) return;
    isPushInFlight.current = true;
    const payload = getCampaignPayload(timestamp);
    let body;
    try {
      body = await serializeJsonOffThread(payload);
      setCampaignBytes(new Blob([body]).size);
    } catch (error) {
      setStorageError(`同步数据序列化失败：${error.message}`);
      isPushInFlight.current = false;
      return;
    }
    fetch('/api/campaign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(syncToken ? { Authorization: `Bearer ${syncToken}` } : {}),
        'If-Match': expectedRevision
      },
      body
    })
    .then(async res => {
      if (res.status === 409) {
        const conflict = await res.json();
        serverRevisionRef.current = conflict.revision || res.headers.get('ETag') || serverRevisionRef.current;
        setSyncConflict({ local: payload, server: conflict.campaign, revision: serverRevisionRef.current });
        setIsSyncConnected(true);
        return null;
      }
      if (!res.ok) throw new Error('HTTP ' + res.status);
      serverRevisionRef.current = res.headers.get('ETag') || serverRevisionRef.current;
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) {
        if (lastUpdatedRef.current === timestamp) localDirtyRef.current = false;
        setIsSyncConnected(true);
      } else {
        console.error('Server returned success: false', data);
      }
    })
    .catch(err => {
      console.warn('Network sync error pushing to server:', err);
      setIsSyncConnected(false);
    })
    .finally(() => { isPushInFlight.current = false; });
  };

  // Helper to apply incoming server state
  const applyServerState = (data) => {
    isServerUpdateInProgress.current = true;
    localDirtyRef.current = false;
    
    if (data.characters) setCharacters(sanitizeCharacters(data.characters));
    if (data.itemPool) setItemPool(data.itemPool);
    if (data.itemTemplates) setItemTemplates(data.itemTemplates);
    if (data.logs) setLogs(data.logs);
    if (data.floatingNotes) setFloatingNotes(data.floatingNotes);
    if (data.maps) setMaps(data.maps);
    if (data.activeMapId) setActiveMapId(data.activeMapId);
    if (data.excelCards) setExcelCards(data.excelCards);
    if (data.activeExcelCardId !== undefined) setActiveExcelCardId(data.activeExcelCardId);
    if (data.groups) setGroups(data.groups);
    if (data.isInCombat !== undefined) setIsInCombat(data.isInCombat);
    if (data.combatRound !== undefined) setCombatRound(data.combatRound);
    if (data.currentTurnIndex !== undefined) setCurrentTurnIndex(data.currentTurnIndex);
    if (data.combatParticipants) setCombatParticipants(data.combatParticipants);
    if (data.combatTurnOrder) setCombatTurnOrder(data.combatTurnOrder);
    if (data.customAttributeLabels) setCustomAttributeLabels(data.customAttributeLabels);
    
    lastUpdatedRef.current = data.lastUpdated;
    safeWriteSetting('dmforge_lastUpdated', data.lastUpdated, setStorageError);

    setTimeout(() => {
      isServerUpdateInProgress.current = false;
    }, 100);
  };

  // Effect 1: Auto-push local changes to server (Debounced)
  useEffect(() => {
    if (appRole === 'PLAYER') {
      return;
    }
    // DO NOT auto-push local changes until the initial handshake/alignment has finished successfully.
    // This prevents a newly opened device (e.g. tablet with empty/default state) from racing and overwriting the host's actual server data.
    if (!isSyncEnabled || !isSyncInitialized.current || syncConflict) {
      return;
    }

    if (isServerUpdateInProgress.current) {
      // Clear flag since we just finished applying server state
      setTimeout(() => {
        isServerUpdateInProgress.current = false;
      }, 50);
      return;
    }

    const now = Date.now();
    localDirtyRef.current = true;
    lastUpdatedRef.current = now;
    safeWriteSetting('dmforge_lastUpdated', now, setStorageError);

    const handler = setTimeout(() => {
      pushCampaignToServer(now);
    }, 150);

    return () => clearTimeout(handler);
  // pushCampaignToServer intentionally captures the same state listed below;
  // adding its changing identity would retrigger this debounce on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    characters, itemPool, itemTemplates, logs, floatingNotes, maps, activeMapId,
    excelCards, activeExcelCardId, groups, isInCombat,
    combatRound, currentTurnIndex, combatParticipants, combatTurnOrder,
    customAttributeLabels,
    isSyncEnabled, appRole, syncToken, syncConflict
  ]);

  // Effect 2: Initial alignment on mount and Background polling (1500ms)
  useEffect(() => {
    if (!isSyncEnabled) {
      setIsSyncConnected(false);
      return;
    }

    let active = true;

    const alignAndSync = () => {
      fetch('/api/campaign', { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} })
        .then(async res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return { data: await res.json(), revision: res.headers.get('ETag') || '"empty"' };
        })
        .then(({ data, revision }) => {
          if (!active) return;
          setIsSyncConnected(true);

          if (data && data.lastUpdated !== undefined) {
            const localLU = getSavedState('dmforge_lastUpdated', 0);
            const action = decideInitialSync({ role: appRole, serverHasState: true, serverTimestamp: data.lastUpdated, localTimestamp: localLU });
            if (action === 'pull-server') applyServerState(data);
            if (action === 'conflict') setSyncConflict({ local: getCampaignPayload(localLU || Date.now()), server: data, revision });
            if (action === 'matched') localDirtyRef.current = false;
            serverRevisionRef.current = revision;
            isSyncInitialized.current = true;
          } else {
            const action = decideInitialSync({ role: appRole, serverHasState: false, serverTimestamp: 0, localTimestamp: getSavedState('dmforge_lastUpdated', 0) });
            if (action === 'initialize-server') {
              const localLU = getSavedState('dmforge_lastUpdated', 0) || Date.now();
              serverRevisionRef.current = revision;
              pushCampaignToServer(localLU, revision);
            }
            isSyncInitialized.current = true;
          }
        })
        .catch(err => {
          if (!active) return;
          console.warn('LAN Sync initial align failed (server offline):', err);
          setIsSyncConnected(false);
          // Fallback to allow auto-saves locally even if offline
          isSyncInitialized.current = true;
        });
    };

    // Run initial align
    alignAndSync();

    // Setup 1500ms Polling
    const pollInterval = setInterval(() => {
      if (isServerUpdateInProgress.current) return;

      // Smart Defer-on-Focus: skip polling if user is currently typing
      const isTyping = document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      );
      if (isTyping) {
        // Defer sync to avoid cursor jumping or focus loss
        return;
      }

      fetch('/api/campaign', { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} })
        .then(async res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return { data: await res.json(), revision: res.headers.get('ETag') || '"empty"' };
        })
        .then(({ data, revision }) => {
          if (!active) return;
          setIsSyncConnected(true);

          if (data && data.lastUpdated !== undefined) {
            const action = decidePollingSync({ role: appRole, revisionChanged: revision !== serverRevisionRef.current, localDirty: localDirtyRef.current, conflictOpen: Boolean(syncConflict) });
            if (action === 'retry-push') pushCampaignToServer(lastUpdatedRef.current || Date.now(), revision);
            if (action === 'pull-server') {
              applyServerState(data);
              serverRevisionRef.current = revision;
            }
            if (action === 'conflict') {
              setSyncConflict({ local: getCampaignPayload(lastUpdatedRef.current || Date.now()), server: data, revision });
              serverRevisionRef.current = revision;
            }
          }
        })
        .catch(err => {
          if (!active) return;
          console.warn('LAN Sync polling failed:', err);
          setIsSyncConnected(false);
        });
    }, 1500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  // Recreate polling only when its operating mode changes. The helper reads the
  // current campaign snapshot used during this effect's alignment lifecycle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncEnabled, appRole, syncToken, syncConflict]);

  // --- Auto-Save Effects ---
  useEffect(() => {
    safeWriteSetting('dmforge_isSyncEnabled', isSyncEnabled, setStorageError);
  }, [isSyncEnabled]);

  useEffect(() => {
    safeWriteSetting('dmforge_syncToken', syncToken, setStorageError);
    if (new URLSearchParams(window.location.hash.slice(1)).has('syncToken')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [syncToken]);

  useEffect(() => {
    safeWriteSetting('dmforge_leftSidebarWidth', leftSidebarWidth, setStorageError);
  }, [leftSidebarWidth]);

  useEffect(() => {
    safeWriteSetting('dmforge_rightSidebarWidth', rightSidebarWidth, setStorageError);
  }, [rightSidebarWidth]);

  useEffect(() => {
    safeWriteSetting('dmforge_isLeftSidebarCollapsed', isLeftSidebarCollapsed, setStorageError);
  }, [isLeftSidebarCollapsed]);

  useEffect(() => {
    safeWriteSetting('dmforge_isRightSidebarCollapsed', isRightSidebarCollapsed, setStorageError);
  }, [isRightSidebarCollapsed]);

  useEffect(() => {
    safeWriteSetting('dmforge_appRole', appRole, setStorageError);
  }, [appRole]);

  useEffect(() => {
    if (!storageReady) return;
    setStorageStatus('正在保存…');
    const timestamp = lastUpdatedRef.current || Date.now();
    const campaign = getCampaignPayload(timestamp);
    campaign.activeExcelCardId = activeExcelCardId;
    const timer = setTimeout(() => {
      saveCampaignSnapshot(campaign).then(() => {
        setStorageError('');
        setStorageStatus(`已保存 ${new Date().toLocaleTimeString()}`);
      }).catch(error => {
        setStorageError(describeStorageError(error));
        setStorageStatus('保存失败');
      });
    }, 250);
    return () => clearTimeout(timer);
  // getCampaignPayload captures precisely the campaign fields listed below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageReady, characters, itemPool, itemTemplates, logs, floatingNotes, maps, activeMapId, excelCards, activeExcelCardId, groups, isInCombat, combatRound, currentTurnIndex, combatParticipants, combatTurnOrder, customAttributeLabels]);

  // --- Campaign Import / Export / Reset Functions ---
  const handleExportCampaign = async () => {
    const campaignData = {
      characters,
      itemPool,
      itemTemplates,
      logs,
      floatingNotes,
      maps,
      activeMapId,
      leftSidebarWidth,
      rightSidebarWidth,
      isPlayerViewMode,
      excelCards,
      activeExcelCardId,
      groups,
      isInCombat,
      combatRound,
      currentTurnIndex,
      combatParticipants,
      combatTurnOrder,
      customAttributeLabels,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      version: '1.0.0',
      timestamp: Date.now()
    };

    const password = window.prompt('可选：输入密码以使用 AES-256-GCM 加密备份；直接确定则导出普通 JSON。', '') ?? '';
    let exportPackage;
    try {
      exportPackage = await createCampaignExport(campaignData, password);
    } catch (error) {
      alert(`导出失败：${error.message}`);
      return;
    }
    const exportText = await serializeJsonOffThread(exportPackage, true);
    const blob = new Blob([exportText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `dmforge_campaign_${dateStr}_${exportPackage.revision.slice(0, 12)}${password ? '_encrypted' : ''}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog({
      type: 'SYSTEM',
      content: '**导出战役存档成功**！您已顺利下载物理备份 JSON 文件（含已导入的玩家 Excel 角色卡）。',
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleImportCampaign = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_CAMPAIGN_FILE_BYTES) {
      alert('战役存档超过 10MB 安全上限，请先精简存档。');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const password = parsed?.encrypted ? (window.prompt('该存档已加密，请输入导出密码：', '') ?? '') : '';
        const data = prepareCampaign(await openCampaignExport(parsed, password));
        await createLocalRecoveryPoint(getCampaignPayload(lastUpdatedRef.current || Date.now()), '导入前自动恢复点');

        setCharacters(sanitizeCharacters(data.characters));
        setItemPool(data.itemPool || []);
        setItemTemplates(data.itemTemplates || INITIAL_ITEM_TEMPLATES);
        setLogs(data.logs || []);
        setFloatingNotes(data.floatingNotes || []);
        setMaps(data.maps);
        setActiveMapId(data.activeMapId || data.maps[0].id);
        setExcelCards(data.excelCards || []);
        setActiveExcelCardId(data.activeExcelCardId || '');
        if (data.groups) {
          setGroups(data.groups);
        } else {
          setGroups(INITIAL_GROUPS);
        }
        setIsInCombat(data.isInCombat || false);
        setCombatRound(data.combatRound || 1);
        setCurrentTurnIndex(data.currentTurnIndex || 0);
        setCombatParticipants(data.combatParticipants || []);
        setCombatTurnOrder(data.combatTurnOrder || []);

        if (data.leftSidebarWidth) setLeftSidebarWidth(data.leftSidebarWidth);
        if (data.rightSidebarWidth) setRightSidebarWidth(data.rightSidebarWidth);
        if (data.isPlayerViewMode !== undefined) handleSetAppRole(data.isPlayerViewMode ? 'PLAYER' : 'DM');
        if (data.customAttributeLabels) setCustomAttributeLabels(data.customAttributeLabels);

        await saveCampaignSnapshot(data);
        setLocalRecoveryPoints(await listLocalRecoveryPoints());
        alert('战役存档导入成功！导入前状态已自动保存为恢复点。');

        addLog({
          type: 'SYSTEM',
          content: '**成功导入外部战役存档**！所有战场数据、备考日志及 Excel 玩家卡已完美复原。',
          timestamp: new Date().toLocaleTimeString()
        });

      } catch (err) {
        console.error(err);
        alert(`存档导入失败：${err.message || '文件不是有效的 DMForge 存档'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const refreshRecoveryPoints = async () => {
    try {
      setLocalRecoveryPoints(await listLocalRecoveryPoints());
    } catch (error) {
      setStorageError(describeStorageError(error));
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      const timestamp = lastUpdatedRef.current || Date.now();
      await createLocalRecoveryPoint(getCampaignPayload(timestamp), '手动备份');
      setLocalRecoveryPoints(await listLocalRecoveryPoints());
      let serverMessage = '';
      if (isSyncConnected && appRole !== 'PLAYER' && serverRevisionRef.current) {
        const response = await fetch('/api/backups', {
          method: 'POST',
          headers: { ...(syncToken ? { Authorization: `Bearer ${syncToken}` } : {}), 'If-Match': serverRevisionRef.current }
        });
        const data = await response.json();
        if (response.status === 409) {
          serverRevisionRef.current = data.revision || response.headers.get('ETag') || serverRevisionRef.current;
          setSyncConflict({ local: getCampaignPayload(timestamp), server: data.campaign, revision: serverRevisionRef.current });
          serverMessage = '；服务器版本已变化，请先处理同步冲突';
        } else if (!response.ok) {
          serverMessage = `；服务器备份失败：${data.error || `HTTP ${response.status}`}`;
        } else {
          serverRevisionRef.current = response.headers.get('ETag') || serverRevisionRef.current;
          serverMessage = `；服务器备份 ${data.backup} 已创建`;
          await refreshServerBackups();
        }
      } else if (!isSyncConnected) {
        serverMessage = '；当前为单机状态，仅创建本机备份';
      }
      alert(`手动备份完成：本机恢复点已创建${serverMessage}`);
    } catch (error) {
      alert(`手动备份失败：${error.message}`);
    }
  };

  const handleRestoreLocal = async key => {
    if (!window.confirm('恢复该本地版本？当前版本会先自动创建一个恢复点。')) return;
    try {
      await createLocalRecoveryPoint(getCampaignPayload(lastUpdatedRef.current || Date.now()), '恢复操作前版本');
      await restoreLocalRecoveryPoint(key);
      window.location.reload();
    } catch (error) {
      alert(`恢复失败：${error.message}`);
    }
  };

  const refreshServerBackups = async () => {
    try {
      const response = await fetch('/api/backups', { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} });
      if (!response.ok) throw new Error(`服务器返回 HTTP ${response.status}`);
      const data = await response.json();
      setServerBackups(data.backups || []);
    } catch (error) {
      alert(`读取服务器备份失败：${error.message}`);
    }
  };

  const handleRestoreServer = async name => {
    if (!window.confirm(`恢复服务器备份 ${name}？服务器会先保存当前版本。`)) return;
    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(syncToken ? { Authorization: `Bearer ${syncToken}` } : {}), 'If-Match': serverRevisionRef.current || '"missing"' },
        body: JSON.stringify({ name })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      serverRevisionRef.current = response.headers.get('ETag') || serverRevisionRef.current;
      applyServerState(prepareCampaign(data.campaign));
      setSyncConflict(null);
      await refreshServerBackups();
    } catch (error) {
      alert(`服务器恢复失败：${error.message}`);
    }
  };

  const resolveConflictWithServer = () => {
    if (!syncConflict?.server) return;
    applyServerState(prepareCampaign(syncConflict.server));
    setSyncConflict(null);
  };

  const resolveConflictWithLocal = () => {
    if (!syncConflict) return;
    const timestamp = Date.now();
    lastUpdatedRef.current = timestamp;
    pushCampaignToServer(timestamp, syncConflict.revision);
    setSyncConflict(null);
  };

  const handleResetCampaign = async () => {
    if (window.confirm('危险警告\n确定要将当前推演进度恢复为“出厂设置”吗？\n当前内容会先保存为本机恢复点，随后重置地图、角色、Excel 看板和日志。')) {
      if (window.confirm('第二重防手误安全确认\n您真的确定要恢复初始的战役模版吗？')) {
        try {
          await createLocalRecoveryPoint(getCampaignPayload(lastUpdatedRef.current || Date.now()), '恢复出厂设置前版本');
        } catch (error) {
          alert(`无法创建重置前恢复点，已取消重置：${error.message}`);
          return;
        }
        localStorage.removeItem('dmforge_characters');
        localStorage.removeItem('dmforge_itemPool');
        localStorage.removeItem('dmforge_itemTemplates');
        localStorage.removeItem('dmforge_logs');
        localStorage.removeItem('dmforge_floatingNotes');
        localStorage.removeItem('dmforge_maps');
        localStorage.removeItem('dmforge_activeMapId');
        localStorage.removeItem('dmforge_leftSidebarWidth');
        localStorage.removeItem('dmforge_rightSidebarWidth');
        localStorage.removeItem('dmforge_appRole');
        localStorage.removeItem('dmforge_isLeftSidebarCollapsed');
        localStorage.removeItem('dmforge_isRightSidebarCollapsed');
        localStorage.removeItem('dmforge_excelCards');
        localStorage.removeItem('dmforge_activeExcelCardId');
        localStorage.removeItem('dmforge_groups');
        localStorage.removeItem('dmforge_isInCombat');
        localStorage.removeItem('dmforge_combatRound');
        localStorage.removeItem('dmforge_currentTurnIndex');
        localStorage.removeItem('dmforge_combatParticipants');
        localStorage.removeItem('dmforge_combatTurnOrder');
        localStorage.removeItem('dmforge_customAttributeLabels');

        setCharacters(sanitizeCharacters(INITIAL_CHARACTERS));
        setItemPool(INITIAL_ITEM_POOL);
        setItemTemplates(INITIAL_ITEM_TEMPLATES);
        setLogs(INITIAL_LOGS);
        setFloatingNotes(INITIAL_FLOATING_NOTES);
        setMaps(INITIAL_MAPS);
        setActiveMapId('map_initial_1');
        setLeftSidebarWidth(320);
        setRightSidebarWidth(320);
        setAppRole('DM');
        setIsLeftSidebarCollapsed(false);
        setIsRightSidebarCollapsed(false);
        setExcelCards([]);
        setActiveExcelCardId('');
        setGroups(INITIAL_GROUPS);
        setIsInCombat(false);
        setCombatRound(1);
        setCurrentTurnIndex(0);
        setCombatParticipants([]);
        setCombatTurnOrder([]);
        setCustomAttributeLabels({
          '力量 (Physical)': '力量 (Physical)',
          '敏捷 (Agility)': '敏捷 (Agility)',
          '体质 (Fortitude)': '体质 (Fortitude)',
          '感知 (Perception)': '感知 (Perception)',
          '智力 (Intellect)': '智力 (Intellect)',
          '神秘 (Arcane)': '神秘 (Arcane)'
        });

        setLocalRecoveryPoints(await listLocalRecoveryPoints());
        alert('出厂战役重置成功！重置前内容已保留在本机恢复点中。');
      }
    }
  };

  const addLog = React.useCallback((logObj) => {
    setLogs(prev => [logObj, ...prev]);
  }, []);

  const addFloatingNote = (title = '新对话笔记', content = '') => {
    const offset = (floatingNotes.length * 35) % 210;
    const newNote = {
      id: 'note_' + Date.now(),
      title,
      content,
      x: 150 + offset,
      y: 120 + offset,
      color: 'blue',
      isMinimized: false,
      isOpen: true
    };
    setFloatingNotes(prev => [...prev, newNote]);
  };

  const deleteFloatingNote = (id) => {
    setFloatingNotes(prev => prev.filter(note => note.id !== id));
  };

  const updateFloatingNote = (id, updatedFields) => {
    setFloatingNotes(prev => prev.map(note => {
      if (note.id === id) {
        return { ...note, ...updatedFields };
      }
      return note;
    }));
  };

  const updateTokenPosition = React.useCallback((tokenId, x, y, mapId) => {
    setCharacters(prev => {
      return prev.map(c => {
        if (c.id === tokenId) {
          return { ...c, gridX: x, gridY: y, mapId: mapId || activeMapId };
        }
        return c;
      });
    });
  }, [activeMapId]);

  const handleDuplicateChar = React.useCallback((char) => {
    const newId = 'char_' + Date.now() + Math.floor(Math.random() * 1000);
    const newName = `${char.name} (副本)`;
    
    // Offset gridX slightly to prevent exact stacking overlapping
    const offsetX = char.gridX !== undefined ? Math.min(char.gridX + 1, 60) : 2;
    const offsetY = char.gridY !== undefined ? char.gridY : 2;

    const duplicatedChar = {
      ...char,
      id: newId,
      name: newName,
      hp: char.hp !== undefined ? char.hp : char.maxHp,
      maxHp: char.maxHp || 30,
      gridX: offsetX,
      gridY: offsetY,
      stats: char.stats ? { ...char.stats } : {
        '力量 (Physical)': 10,
        '敏捷 (Agility)': 10,
        '体质 (Fortitude)': 10,
        '感知 (Perception)': 10,
        '智力 (Intellect)': 10,
        '神秘 (Arcane)': 10
      },
      feats: char.feats ? { ...char.feats } : {},
      resources: char.resources ? char.resources.map(r => ({ ...r })) : [],
      groupId: char.groupId || (char.type === 'PC' ? 'group_pcs' : 'group_npcs')
    };

    setCharacters(prev => [...prev, duplicatedChar]);

    addLog({
      type: 'COMBAT',
      content: `**复制角色**: 成功克隆了角色 [${char.name}] -> **[${newName}]**`,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [addLog]);

  const handleLeftMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = leftSidebarWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(240, Math.min(600, startWidth + deltaX));
      setLeftSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightMouseDown = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (moveEvent) => {
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(240, Math.min(600, startWidth + deltaX));
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const addMap = React.useCallback((name = '新战役地图', width = 40, height = 30, bgUrl = '') => {
    const newMap = {
      id: 'map_' + Date.now(),
      name,
      width,
      height,
      bgUrl,
      blockedCells: {},
      terrainAreas: []
    };
    setMaps(prev => [...prev, newMap]);
    setActiveMapId(newMap.id);
  }, []);

  const deleteMap = React.useCallback((id) => {
    setMaps(prev => {
      const remaining = prev.filter(m => m.id !== id);
      if (activeMapId === id && remaining.length > 0) {
        setActiveMapId(remaining[0].id);
      }
      return remaining;
    });
  }, [activeMapId]);

  const updateMap = React.useCallback((id, updatedFields) => {
    setMaps(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, ...updatedFields };
      }
      return m;
    }));
  }, []);

  const [theme, setTheme] = useState(() => readStoredTheme());
  const handleTheme = React.useCallback(next => setTheme(applyTheme(next)), []);
  React.useEffect(() => { applyTheme(theme); }, [theme]);

  const activeMap = maps.find(m => m.id === activeMapId) || null;

  // combatTurnOrder holds either ids or {id,...} entries depending on how the
  // round was started; resolve both so the status line never shows an object.
  const activeTurnEntry = isInCombat ? combatTurnOrder[currentTurnIndex] : null;
  const activeTurnId = typeof activeTurnEntry === 'string' ? activeTurnEntry : activeTurnEntry?.id;
  const activeTurnName = activeTurnId
    ? (characters.find(c => c.id === activeTurnId)?.name ?? activeTurnEntry?.name ?? null)
    : null;

  const handleSaveCharacter = () => {
    if (!newChar.name.trim()) {
      alert('请输入角色/怪物名称！');
      return;
    }
    const timestamp = new Date().toLocaleTimeString();

    if (editingCharId) {
      setCharacters(prev => sanitizeCharacters(prev.map(c => {
        if (c.id !== editingCharId) return c;
        return {
          ...c,
          name: newChar.name.trim(),
          type: newChar.type,
          class: newChar.class.trim() || '无职业',
          maxHp: newChar.maxHp,
          hp: Math.min(c.hp, newChar.maxHp), // keep current HP inside the new ceiling
          ac: newChar.ac,
          initiative: newChar.initiative,
          speed: newChar.speed,
          stats: newChar.stats,
          resources: newChar.resources,
          conditions: c.conditions || [],
          level: newChar.level !== undefined ? newChar.level : (c.level || 1),
          hitDice: newChar.hitDice !== undefined ? newChar.hitDice : (c.hitDice || 'd8'),
          levelHpIncreases: newChar.levelHpIncreases ? [...newChar.levelHpIncreases] : (c.levelHpIncreases || []),
          tempHp: newChar.tempHp !== undefined ? newChar.tempHp : (c.tempHp || 0)
        };
      })));

      setIsAddCharModalOpen(false);
      setEditingCharId(null);
      addLog?.({
        type: 'COMBAT',
        content: `**修改角色属性**: [${newChar.type}] **${newChar.name}** (职业: ${newChar.class || '无职业'}, HP上限: ${newChar.maxHp}, AC: ${newChar.ac})`,
        timestamp
      });
      return;
    }

    const created = {
      id: 'char_' + Date.now(),
      name: newChar.name.trim(),
      type: newChar.type,
      class: newChar.class.trim() || '无职业',
      hp: newChar.maxHp,
      maxHp: newChar.maxHp,
      ac: newChar.ac,
      initiative: newChar.initiative,
      speed: newChar.speed,
      gridX: 2,
      gridY: 2,
      stats: newChar.stats,
      feats: { '特质': '新录入的角色' },
      resources: newChar.resources,
      groupId: newChar.type === 'PC' ? 'group_pcs' : 'group_npcs',
      conditions: [],
      combatSpeedRemaining: newChar.speed !== undefined ? newChar.speed : 30,
      combatStartGridX: 2,
      combatStartGridY: 2,
      level: newChar.level !== undefined ? newChar.level : 1,
      hitDice: newChar.hitDice !== undefined ? newChar.hitDice : 'd8',
      levelHpIncreases: newChar.levelHpIncreases ? [...newChar.levelHpIncreases] : [],
      tempHp: newChar.tempHp !== undefined ? newChar.tempHp : 0
    };

    setCharacters(prev => [...prev, sanitizeCharacters([created])[0]]);
    setIsAddCharModalOpen(false);
    addLog?.({
      type: 'COMBAT',
      content: `**新增角色/怪物**: [${newChar.type}] **${newChar.name}** (职业: ${created.class}, HP: ${newChar.maxHp}, AC: ${newChar.ac})`,
      timestamp
    });
  };

  const handleConfirmRest = () => {
    const selectedIds = Object.keys(restParticipants).filter(id => restParticipants[id]);
    if (selectedIds.length === 0) return;
    if (restModalType === 'short') handleShortRest(selectedIds);
    else handleLongRest(selectedIds);
    setIsRestModalOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert(`进入全屏模式失败: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const showLeftSidebar = !isPlayerViewMode && !isLeftSidebarCollapsed;
  const showRightRail = !isPlayerViewMode && !isRightSidebarCollapsed;

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', overflow: 'hidden' }}>
      <AppHeader
        campaignName={activeMap?.name || '未命名战役'}
        chapter={`${maps.length} 张地图 · ${characters.length} 名角色`}
        theme={theme}
        onTheme={handleTheme}
        isPlayerViewMode={isPlayerViewMode}
        onTogglePlayerView={() => handleSetAppRole(isPlayerViewMode ? 'DM' : 'PLAYER')}
        syncConflict={syncConflict}
        isSyncEnabled={isSyncEnabled}
        isSyncConnected={isSyncConnected}
        onToggleSync={() => (syncConflict ? setIsSettingsModalOpen(true) : setIsSyncEnabled(!isSyncEnabled))}
        presentationConnected={presentationConnected}
        isLeftSidebarCollapsed={isLeftSidebarCollapsed}
        onToggleLeftSidebar={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
        isRightSidebarCollapsed={isRightSidebarCollapsed}
        onToggleRightSidebar={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {showLeftSidebar && (
          <aside
            style={{
              width: `${leftSidebarWidth}px`,
              minWidth: `${leftSidebarWidth}px`,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              background: 'var(--surface-panel)',
              borderRight: 'var(--border-hairline)',
              overflow: 'hidden'
            }}
          >
            <CharacterList
              characters={characters}
              setCharacters={setCharacters}
              addLog={addLog}
              onOpenAddCharModal={handleOpenAddCharModal}
              onOpenEditCharModal={handleOpenEditCharModal}
              onDuplicateChar={handleDuplicateChar}
              groups={groups}
              setGroups={setGroups}
              isInCombat={isInCombat}
              combatTurnOrder={combatTurnOrder}
              currentTurnIndex={currentTurnIndex}
              onOpenRestModal={handleOpenRestModal}
              customAttributeLabels={customAttributeLabels}
            />
          </aside>
        )}

        {showLeftSidebar && <ResizeHandle onMouseDown={handleLeftMouseDown} title= "拖拽调整左侧栏宽度" />}

        <CampaignWorkspace {...{
          currentTab, setCurrentTab, isPlayerViewMode, appRole, characters, setCharacters,
          updateTokenPosition, addLog, maps, activeMapId, setActiveMapId, addMap, deleteMap,
          updateMap, isInCombat, setIsInCombat, combatRound, setCombatRound,
          currentTurnIndex, setCurrentTurnIndex, combatParticipants, setCombatParticipants,
          combatTurnOrder, setCombatTurnOrder, itemPool, setItemPool, itemTemplates,
          setItemTemplates, groups, excelCards, setExcelCards, activeExcelCardId,
          setActiveExcelCardId, floatingNotes, setFloatingNotes, updateFloatingNote,
          deleteFloatingNote, onPresentationCameraChange: handlePresentationCameraChange,
          onPresentationInteractionChange: setPresentationInteraction
        }} />

        {showRightRail && <ResizeHandle onMouseDown={handleRightMouseDown} title= "拖拽调整右侧栏宽度" />}

        {showRightRail && (
          <aside
            style={{
              width: `${rightSidebarWidth}px`,
              minWidth: `${rightSidebarWidth}px`,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              background: 'var(--surface-panel)',
              borderLeft: 'var(--border-hairline)'
            }}
          >
            <RightRail
              addLog={addLog}
              logs={logs}
              setLogs={setLogs}
              floatingNotes={floatingNotes}
              addFloatingNote={addFloatingNote}
              updateFloatingNote={updateFloatingNote}
              deleteFloatingNote={deleteFloatingNote}
            />
          </aside>
        )}

        {!isPlayerViewMode && floatingNotes.filter(note => note.isOpen !== false).map(note => (
          <FloatingNote
            key={note.id}
            note={note}
            onClose={(id) => updateFloatingNote(id, { isOpen: false })}
            onUpdate={updateFloatingNote}
          />
        ))}
      </div>

      <AppStatusLine
        isPlayerViewMode={isPlayerViewMode}
        isInCombat={isInCombat}
        combatRound={combatRound}
        activeTurnName={activeTurnName}
        activeMap={activeMap}
        currentTab={currentTab}
        saveBytes={campaignBytes}
        saveLimitBytes={MAX_CAMPAIGN_FILE_BYTES}
        isSyncEnabled={isSyncEnabled}
        isSyncConnected={isSyncConnected}
        lanAddress={typeof window !== 'undefined' ? window.location.host : ''}
      />

      <CharacterEditorModal
        open={isAddCharModalOpen}
        editingCharId={editingCharId}
        newChar={newChar}
        setNewChar={setNewChar}
        customAttributeLabels={customAttributeLabels}
        onClose={() => { setIsAddCharModalOpen(false); setEditingCharId(null); }}
        onSave={handleSaveCharacter}
      />

      <RestModal
        open={isRestModalOpen}
        restType={restModalType}
        characters={characters}
        participants={restParticipants}
        setParticipants={setRestParticipants}
        onClose={() => setIsRestModalOpen(false)}
        onConfirm={handleConfirmRest}
      />

      <SettingsModal
        open={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        appRole={appRole}
        onSetAppRole={handleSetAppRole}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        customAttributeLabels={customAttributeLabels}
        setCustomAttributeLabels={setCustomAttributeLabels}
        isSyncEnabled={isSyncEnabled}
        setIsSyncEnabled={setIsSyncEnabled}
        isSyncConnected={isSyncConnected}
        syncToken={syncToken}
        setSyncToken={setSyncToken}
        syncConflict={syncConflict}
        resolveConflictWithServer={resolveConflictWithServer}
        resolveConflictWithLocal={resolveConflictWithLocal}
        storageError={storageError}
        storageStatus={storageStatus}
        characterCount={characters.length}
        mapCount={maps.length}
        localRecoveryPoints={localRecoveryPoints}
        refreshRecoveryPoints={refreshRecoveryPoints}
        onRestoreLocal={handleRestoreLocal}
        serverBackups={serverBackups}
        refreshServerBackups={refreshServerBackups}
        onRestoreServer={handleRestoreServer}
        onCreateManualBackup={handleCreateManualBackup}
        onExportCampaign={handleExportCampaign}
        onImportCampaign={handleImportCampaign}
        onResetCampaign={handleResetCampaign}
        clientId={clientId.current}
        presentationProps={{
          settings: presentationSettings,
          setSettings: setPresentationSettings,
          characters,
          connected: presentationConnected,
          windowOpen: presentationWindowOpen,
          fallbackUrl: presentationFallbackUrl,
          onOpen: openPresentationWindow,
          onOpenTab: openPresentationTab,
          onFocus: focusPresentationWindow,
          onClose: closePresentationWindow,
          onRequestFullscreen: requestPresentationFullscreen
        }}
      />
    </div>
  );
}
