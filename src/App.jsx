import React, { useState, useEffect } from 'react';
import CharacterList from './components/CharacterList';
import DiceRoller from './components/DiceRoller';
import CampaignWorkspace from './components/CampaignWorkspace';
import ActionLog from './components/ActionLog';
import FloatingNote from './components/FloatingNote';
import { CURRENT_SCHEMA_VERSION, MAX_CAMPAIGN_FILE_BYTES, prepareCampaign } from './utils/campaignValidation';
import { resolveSyncToken } from './utils/syncToken';
import { createLocalRecoveryPoint, describeStorageError, listLocalRecoveryPoints, loadCampaignSnapshot, restoreLocalRecoveryPoint, safeWriteSetting, saveCampaignSnapshot } from './utils/campaignSnapshotStore';
import { createCampaignExport, openCampaignExport } from './utils/campaignExport';
import { serializeJsonOffThread } from './utils/jsonSerialization';
import { decideInitialSync, decidePollingSync } from './utils/syncDecision';
import { buildPublicPresentationSnapshot, DEFAULT_PRESENTATION_SETTINGS, normalizePresentationSettings, PRESENTATION_PROTOCOL } from './utils/presentation';
import PresentationControls from './components/PresentationControls';
import { Shield, UserPlus, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
    content: '🚀 **DMForge 战役辅助系统** 已成功初始化。',
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
  const [tempResName, setTempResName] = useState('');
  const [tempResMax, setTempResMax] = useState(4);
  const [tempResResetType, setTempResResetType] = useState('long_rest');

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
    setTempResName('');
    setTempResMax(4);
    setTempResResetType('long_rest');
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
      content: `⏳ **战役短休**: 角色 [${restingNames.join(', ')}] 完成了短休整顿，生命值恢复 50%，并充能重置了短休和回合技能资源槽！`,
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
      content: `💤 **战役长休**: 角色 [${restingNames.join(', ')}] 完成了长休整顿！生命恢复 100%，所有资源槽满额重载，且身上的特殊状态与移动限制已完全清除！`,
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
    setTempResName('');
    setTempResMax(4);
    setTempResResetType('long_rest');
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
      content: '📤 **导出战役存档成功**！您已顺利下载物理备份 JSON 文件（含已导入的玩家 Excel 角色卡）。',
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
          content: '📥 **成功导入外部战役存档**！所有战场数据、备考日志及 Excel 玩家卡已完美复原。',
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
    if (window.confirm('🚨 危险警告 🚨\n确定要将当前推演进度恢复为“出厂设置”吗？\n当前内容会先保存为本机恢复点，随后重置地图、角色、Excel 看板和日志。')) {
      if (window.confirm('⚠️ 第二重防手误安全确认 ⚠️\n您真的确定要恢复初始的战役模版吗？')) {
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
      content: `👥 **复制角色**: 成功克隆了角色 [${char.name}] -> **[${newName}]**`,
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

  return (
    <div className="app-container">
      
      {/* 1. Header Toolbar */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={24} style={{ color: 'var(--accent-purple)', filter: 'drop-shadow(0 0 8px var(--accent-purple-glow))' }} />
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, letterSpacing: '0' }}>
            DMForge <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--accent-purple)' }}>TRPG 战役助手</span>
          </h1>
        </div>

        {/* Presentation & Toggle Controls */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>


          {/* LAN Sync Status Indicator Pill */}
          <button 
            onClick={() => syncConflict ? setIsSettingsModalOpen(true) : setIsSyncEnabled(!isSyncEnabled)}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: syncConflict ? 'rgba(239,68,68,0.16)' : !isSyncEnabled
                ? 'rgba(255, 255, 255, 0.05)' 
                : isSyncConnected 
                  ? 'rgba(52, 211, 153, 0.12)' 
                  : 'rgba(251, 191, 36, 0.12)',
              padding: '4px 10px', 
              borderRadius: '20px', 
              border: `1px solid ${
                !isSyncEnabled 
                  ? 'rgba(255, 255, 255, 0.15)' 
                  : isSyncConnected 
                    ? 'rgba(52, 211, 153, 0.4)' 
                    : 'rgba(251, 191, 36, 0.4)'
              }`,
              boxShadow: isSyncEnabled && isSyncConnected ? '0 0 10px rgba(52, 211, 153, 0.2)' : 'none',
              transition: 'all 0.3s ease',
              height: '28px',
              cursor: 'pointer',
              outline: 'none'
            }}
            title={
              syncConflict ? '需要处理同步冲突；点击打开设置选择保留版本。' : !isSyncEnabled
                ? "局域网实时数据同步已关闭（单机离线模式，完全无网络请求消耗）。点击开启局域网同步" 
                : isSyncConnected 
                  ? "局域网实时数据同步开启中，其他设备更改会秒级在此拉取。点击关闭局域网同步" 
                  : "同步暂不可用，应用已自动使用本地存档并继续重试。"
            }
          >
            <span 
              className={isSyncEnabled && isSyncConnected ? "sync-dot-active" : ""}
              style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: syncConflict ? '#f87171' : !isSyncEnabled
                  ? '#9ca3af' 
                  : isSyncConnected 
                    ? '#34d399' 
                    : '#fbbf24',
                display: 'inline-block'
              }} 
            />
            <span style={{ 
              fontSize: '11px', 
              color: !isSyncEnabled 
                ? '#9ca3af' 
                : isSyncConnected 
                  ? '#34d399' 
                  : '#fbbf24',
              fontWeight: '700', 
              fontFamily: 'var(--font-heading)',
              userSelect: 'none'
            }}>
              {syncConflict ? '⚠️ 同步冲突待处理' : !isSyncEnabled
                ? '📡 同步已关闭' 
                : isSyncConnected 
                  ? '📡 局域网同步中' 
                  : '💾 自动单机使用'}
            </span>
          </button>

          {!isPlayerViewMode && (
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn"
              style={{ height: '28px', padding: '3px 9px', fontSize: '10px', border: `1px solid ${presentationConnected ? 'rgba(52,211,153,.45)' : 'var(--border-light)'}`, background: presentationConnected ? 'rgba(52,211,153,.1)' : 'rgba(255,255,255,.04)', color: presentationConnected ? '#6ee7b7' : 'var(--text-secondary)' }}
              title="打开直播展示控制面板"
            >
              📺 {presentationConnected ? '直播展示中' : '直播展示'}
            </button>
          )}

          {/* Sidebar Collapse Controls (Hidden in Player View Mode) */}
          {!isPlayerViewMode && (
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-light)', height: '28px', alignItems: 'center' }}>
              <button
                onClick={() => setIsLeftSidebarCollapsed(!isLeftSidebarCollapsed)}
                className="btn"
                style={{ 
                  padding: '2px 8px', 
                  fontSize: '11px', 
                  height: '22px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: isLeftSidebarCollapsed ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
                  border: isLeftSidebarCollapsed ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: isLeftSidebarCollapsed ? 'var(--accent-purple)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                title={isLeftSidebarCollapsed ? "展开左侧栏 (角色与NPC列表)" : "折叠隐藏左侧栏"}
              >
                {isLeftSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                <span>{isLeftSidebarCollapsed ? "显示左栏" : "隐藏左栏"}</span>
              </button>
              
              <div style={{ width: '1px', height: '12px', background: 'var(--border-light)', margin: '0 2px' }} />
              
              <button
                onClick={() => setIsRightSidebarCollapsed(!isRightSidebarCollapsed)}
                className="btn"
                style={{ 
                  padding: '2px 8px', 
                  fontSize: '11px', 
                  height: '22px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  background: isRightSidebarCollapsed ? 'rgba(192, 132, 252, 0.15)' : 'transparent',
                  border: isRightSidebarCollapsed ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid transparent',
                  borderRadius: '6px',
                  color: isRightSidebarCollapsed ? 'var(--accent-purple)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                title={isRightSidebarCollapsed ? "展开右侧栏 (掷骰与战役日志)" : "折叠隐藏右侧栏"}
              >
                <span>{isRightSidebarCollapsed ? "显示右栏" : "隐藏右栏"}</span>
                {isRightSidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsSettingsModalOpen(true)} 
            className="btn btn-secondary"
            style={{ 
              fontSize: '11px', 
              padding: '4px 10px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px',
              border: '1px solid rgba(192, 132, 252, 0.3)',
              boxShadow: '0 0 6px rgba(192, 132, 252, 0.15)',
              height: '28px'
            }}
            title="打开全局战役与多端系统设置面板"
          >
            <span style={{ fontSize: '12px' }}>⚙️</span>
            <span>系统设置</span>
          </button>
        </div>
      </header>

      {/* 2. Main Columns Layout */}
      <div className="main-content">
        
        {/* Left column (hidden in Player View Mode for security) */}
        {!isPlayerViewMode && !isLeftSidebarCollapsed && (
          <aside className="sidebar-left" style={{ width: `${leftSidebarWidth}px`, minWidth: `${leftSidebarWidth}px` }}>
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

        {/* Drag handle for resizing left sidebar */}
        {!isPlayerViewMode && !isLeftSidebarCollapsed && (
          <div 
            className="resize-handle"
            onMouseDown={handleLeftMouseDown}
            title="拖拽调整左侧栏宽度"
          />
        )}

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

        {/* Drag handle for resizing right sidebar */}
        {!isPlayerViewMode && !isRightSidebarCollapsed && (
          <div 
            className="resize-handle"
            onMouseDown={handleRightMouseDown}
            title="拖拽调整右侧栏宽度"
          />
        )}

        {/* Right column (Dice roller & action log) (hidden in Player View Mode) */}
        {!isPlayerViewMode && !isRightSidebarCollapsed && (
          <aside className="sidebar-right" style={{ width: `${rightSidebarWidth}px`, minWidth: `${rightSidebarWidth}px`, gap: '16px', padding: '16px', overflowY: 'auto' }}>
            <DiceRoller addLog={addLog} />
            <div style={{ flex: 1 }}>
              <ActionLog 
                logs={logs} 
                setLogs={setLogs}
                floatingNotes={floatingNotes}
                addFloatingNote={addFloatingNote} 
                deleteFloatingNote={deleteFloatingNote}
                updateFloatingNote={updateFloatingNote}
              />
            </div>
          </aside>
        )}

        {/* Draggable Floating Notes Overlay (DM View Only) */}
        {!isPlayerViewMode && floatingNotes.filter(note => note.isOpen !== false).map(note => (
          <FloatingNote 
            key={note.id}
            note={note}
            onClose={(id) => updateFloatingNote(id, { isOpen: false })}
            onUpdate={updateFloatingNote}
          />
        ))}

        {/* Draggable Modal overlay (PC/NPC Creator Modal) at ROOT level */}
        {isAddCharModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 11, 16, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }} 
            onClick={() => setIsAddCharModalOpen(false)}
          >
            <div 
              style={{
                width: '540px',
                maxHeight: '85vh',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(192, 132, 252, 0.2)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 25px rgba(192, 132, 252, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }} 
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', padding: '16px 20px 12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserPlus size={20} style={{ color: 'var(--accent-purple)' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    {editingCharId ? '📝 修改角色属性 / 资源槽' : '新建战役角色 / 怪物 NPC'}
                  </h3>
                </div>
                <button 
                  onClick={() => {
                    setIsAddCharModalOpen(false);
                    setEditingCharId(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Form Scrollable Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* 1. Basic Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>1. 基础信息</span>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="角色名称 (如: 甘道夫)"
                    value={newChar.name}
                    onChange={e => setNewChar({...newChar, name: e.target.value})}
                  />
                  <select 
                    className="input-text" 
                    value={newChar.type}
                    onChange={e => setNewChar({...newChar, type: e.target.value})}
                  >
                    <option value="PC">PC (玩家角色)</option>
                    <option value="NPC">NPC (敌对/怪物)</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="职业 (如: 法师 / 战士)"
                    value={newChar.class}
                    onChange={e => setNewChar({...newChar, class: e.target.value})}
                  />
                  <input 
                    type="number" 
                    className="input-text" 
                    placeholder="初始生命 (Max HP)"
                    value={newChar.maxHp}
                    onChange={e => {
                      const val = Math.max(1, parseInt(e.target.value, 10) || 10);
                      setNewChar({...newChar, maxHp: val});
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>初始/当前等级 (Level)</label>
                    <input 
                      type="number" 
                      className="input-text" 
                      placeholder="等级"
                      value={newChar.level}
                      onChange={e => setNewChar({...newChar, level: Math.max(1, parseInt(e.target.value, 10) || 1)})}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>生命骰 (Hit Dice规格)</label>
                    <select 
                      className="input-text"
                      style={{ height: '32px', cursor: 'pointer', padding: '4px 8px', fontSize: '12px' }}
                      value={newChar.hitDice}
                      onChange={e => setNewChar({...newChar, hitDice: e.target.value})}
                    >
                      <option value="d6">d6 (如法师/术士)</option>
                      <option value="d8">d8 (如牧师/游侠/武僧)</option>
                      <option value="d10">d10 (如战士/圣骑士)</option>
                      <option value="d12">d12 (如野蛮人)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>初始临时生命 (Temp HP, 选填)</label>
                    <input 
                      type="number" 
                      className="input-text" 
                      placeholder="初始临时生命值"
                      value={newChar.tempHp || 0}
                      onChange={e => setNewChar({...newChar, tempHp: Math.max(0, parseInt(e.target.value, 10) || 0)})}
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Combat Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>2. 战斗物理指标</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>护甲值 (AC)</label>
                    <input 
                      type="number" 
                      className="input-text"
                      value={newChar.ac}
                      onChange={e => setNewChar({...newChar, ac: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>先攻加成 (Initiative)</label>
                    <input 
                      type="number" 
                      className="input-text"
                      value={newChar.initiative}
                      onChange={e => setNewChar({...newChar, initiative: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>移动速度 (Speed ft)</label>
                    <input 
                      type="number" 
                      className="input-text"
                      value={newChar.speed}
                      onChange={e => setNewChar({...newChar, speed: parseInt(e.target.value, 10) || 0})}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Core Stats 六维属性 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>3. 六维核心属性</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  {Object.entries(newChar.stats).map(([statKey, statVal]) => (
                    <div key={statKey} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={customAttributeLabels[statKey] || statKey}>
                        {customAttributeLabels[statKey] || statKey}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = { ...newChar.stats, [statKey]: Math.max(1, statVal - 1) };
                            setNewChar({ ...newChar, stats: updated });
                          }}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-primary)', width: '18px', height: '18px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}
                        >
                          -
                        </button>
                        <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{statVal}</span>
                        <button 
                          type="button" 
                          onClick={() => {
                            const updated = { ...newChar.stats, [statKey]: statVal + 1 };
                            setNewChar({ ...newChar, stats: updated });
                          }}
                          style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-primary)', width: '18px', height: '18px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Skill Resources Slots 技能资源槽 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed var(--border-light)', paddingTop: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>4. 技能资源槽预设 (如法术位、气、动作点)</span>
                
                {/* Dynamic adding sub-form */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: '6px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    className="input-text" 
                    placeholder="资源槽名称 (如: 1环法术位)"
                    value={tempResName}
                    onChange={e => setTempResName(e.target.value)}
                    style={{ fontSize: '11px', padding: '6px 8px' }}
                  />
                  <input 
                    type="number" 
                    className="input-text" 
                    placeholder="槽上限"
                    value={tempResMax}
                    onChange={e => setTempResMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    style={{ fontSize: '11px', padding: '6px 8px' }}
                  />
                  <select
                    className="input-text"
                    value={tempResResetType}
                    onChange={e => setTempResResetType(e.target.value)}
                    style={{ fontSize: '11px', padding: '6px 8px', height: '32px', cursor: 'pointer' }}
                  >
                    <option value="turn">每回合重置</option>
                    <option value="short_rest">每短休重置</option>
                    <option value="long_rest">每长休重置</option>
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!tempResName.trim()) return;
                      const newRes = { 
                        name: tempResName.trim(), 
                        max: tempResMax, 
                        value: tempResMax,
                        resetType: tempResResetType
                      };
                      setNewChar({ ...newChar, resources: [...newChar.resources, newRes] });
                      setTempResName('');
                      setTempResMax(4);
                      setTempResResetType('long_rest');
                    }}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '6px 12px', height: '32px' }}
                  >
                    ➕ 增设
                  </button>
                </div>

                {/* Current Resource List */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {newChar.resources.map((res, index) => (
                    <div 
                      key={index} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'rgba(192, 132, 252, 0.1)',
                        border: '1px solid rgba(192, 132, 252, 0.2)',
                        color: 'var(--accent-purple)',
                        padding: '3px 8px',
                        borderRadius: '16px',
                        fontSize: '11px'
                      }}
                    >
                      <span>{res.name} ({res.max}) <span style={{ fontSize: '9px', opacity: 0.75 }}>[{res.resetType === 'turn' ? '回合' : res.resetType === 'short_rest' ? '短休' : '长休'}]</span></span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const filtered = newChar.resources.filter((_, idx) => idx !== index);
                          setNewChar({ ...newChar, resources: filtered });
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {newChar.resources.length === 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      暂未配置动态消耗资源槽。
                    </span>
                  )}
                </div>
              </div>

              </div> {/* Close scrollable form body */}

              {/* Modal Controls */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', padding: '12px 20px 16px 20px', marginTop: '0' }}>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsAddCharModalOpen(false);
                    setEditingCharId(null);
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (!newChar.name.trim()) {
                      alert('请输入角色/怪物名称！');
                      return;
                    }
                    
                    if (editingCharId) {
                      // Update existing character
                      setCharacters(prev => {
                        const updated = prev.map(c => {
                          if (c.id === editingCharId) {
                            // Keep current HP within new Max HP boundaries
                            const newHp = Math.min(c.hp, newChar.maxHp);
                            return {
                              ...c,
                              name: newChar.name.trim(),
                              type: newChar.type,
                              class: newChar.class.trim() || '无职业',
                              maxHp: newChar.maxHp,
                              hp: newHp,
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
                          }
                          return c;
                        });
                        return sanitizeCharacters(updated);
                      });
                      
                      setIsAddCharModalOpen(false);
                      setEditingCharId(null);

                      if (addLog) {
                        addLog({
                          type: 'COMBAT',
                          content: `👤 **修改角色属性**: [${newChar.type}] **${newChar.name}** (职业: ${newChar.class || '无职业'}, HP上限: ${newChar.maxHp}, AC: ${newChar.ac})`,
                          timestamp: new Date().toLocaleTimeString()
                        });
                      }
                    } else {
                      // Create new character
                      const newCharacterData = {
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

                      setCharacters(prev => [...prev, sanitizeCharacters([newCharacterData])[0]]);
                      setIsAddCharModalOpen(false);

                      if (addLog) {
                        addLog({
                          type: 'COMBAT',
                          content: `👤 **新增角色/怪物**: [${newChar.type}] **${newChar.name}** (职业: ${newCharacterData.class}, HP: ${newChar.maxHp}, AC: ${newChar.ac})`,
                          timestamp: new Date().toLocaleTimeString()
                        });
                      }
                    }
                  }}
                  className="btn btn-primary"
                >
                  {editingCharId ? '💾 保存角色更改' : '💾 创建并召唤角色'}
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Draggable Rest Modal overlay at ROOT level */}
        {isRestModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(10, 11, 16, 0.75)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }} 
            onClick={() => setIsRestModalOpen(false)}
          >
            <div 
              style={{
                width: '460px',
                maxHeight: '80vh',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 25px rgba(168, 85, 247, 0.1)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                overflowY: 'auto'
              }} 
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{restModalType === 'short' ? '⏳ 战役休整：短休 (Short Rest)' : '💤 战役休整：长休 (Long Rest)'}</span>
                </h3>
                <button 
                  onClick={() => setIsRestModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>

              {/* Rest explanation */}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-light)', lineHeight: '1.4' }}>
                {restModalType === 'short' ? (
                  <span><strong>短休效果</strong>：被勾选的角色恢复其 <strong>50% 最大生命值</strong>，并全部充能重置所有<strong>每短休重置</strong>与<strong>每回合重置</strong>的技能资源槽。</span>
                ) : (
                  <span><strong>长休效果</strong>：被勾选的角色恢复其 <strong>100% 生命值</strong>，全部充能重置所有资源槽（含长休/短休/回合重置型），<strong>清除身上所有特殊负面状态</strong>，并复原战斗移动力。</span>
                )}
              </div>

              {/* Checklist of Characters */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--accent-purple)', fontWeight: 'bold' }}>选择参与休整的角色:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '35vh', overflowY: 'auto', paddingRight: '4px' }}>
                  {characters.map(c => {
                    const isChecked = !!restParticipants[c.id];
                    return (
                      <div 
                        key={c.id} 
                        onClick={() => setRestParticipants(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: isChecked ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                          border: `1px solid ${isChecked ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-light)'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // handled by parent div
                            style={{ accentColor: 'var(--accent-purple)', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: isChecked ? '#fff' : 'var(--text-primary)' }}>
                            {c.name}
                          </span>
                          <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: c.type === 'PC' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: c.type === 'PC' ? 'var(--accent-blue)' : 'var(--accent-red)', fontWeight: 'bold' }}>
                            {c.type}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          HP: {c.hp}/{c.maxHp}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Controls */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsRestModalOpen(false)}
                  className="btn btn-secondary"
                >
                  取消
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const selectedIds = Object.keys(restParticipants).filter(id => restParticipants[id]);
                    if (selectedIds.length === 0) {
                      alert('请至少勾选一位角色进行休整！');
                      return;
                    }
                    if (restModalType === 'short') {
                      handleShortRest(selectedIds);
                    } else {
                      handleLongRest(selectedIds);
                    }
                    setIsRestModalOpen(false);
                  }}
                  className="btn btn-primary"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #6b21a8)' }}
                >
                  {restModalType === 'short' ? '⏳ 确定进行短休' : '💤 确定进行长休'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Campaign System Settings Modal */}
      {isSettingsModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(5, 6, 10, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999, // Over everything, including build loaders
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-glass)',
            border: '1px solid rgba(192, 132, 252, 0.25)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(192, 132, 252, 0.15)',
            borderRadius: '12px',
            width: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: 'var(--text-primary)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚙️</span>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, letterSpacing: '0.5px' }}>战役系统设置 (Campaign Settings)</h3>
              </div>
              <button 
                onClick={() => setIsSettingsModalOpen(false)}
                className="btn-close" 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'var(--text-secondary)', 
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Section 1: Page Running Role */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>🎭 页面运行角色 (Page Running Role)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSetAppRole('DM')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: appRole === 'DM' ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                    background: appRole === 'DM' ? 'rgba(192, 132, 252, 0.12)' : 'rgba(255,255,255,0.02)',
                    boxShadow: appRole === 'DM' ? '0 0 10px rgba(192, 132, 252, 0.15)' : 'none',
                    color: appRole === 'DM' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease-out'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🧙</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>DM 掌控端 (Full Control)</span>
                  <span style={{ fontSize: '9px', opacity: 0.75, textAlign: 'center' }}>显示所有UI面板及编辑工具，修改将实时推送到局域网</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSetAppRole('PLAYER')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: appRole === 'PLAYER' ? '1px solid var(--accent-blue)' : '1px solid var(--border-light)',
                    background: appRole === 'PLAYER' ? 'rgba(96, 165, 250, 0.12)' : 'rgba(255,255,255,0.02)',
                    boxShadow: appRole === 'PLAYER' ? '0 0 10px rgba(96, 165, 250, 0.15)' : 'none',
                    color: appRole === 'PLAYER' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s ease-out'
                  }}
                >
                  <span style={{ fontSize: '18px' }}>👥</span>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>玩家展示端 (Read-Only)</span>
                  <span style={{ fontSize: '9px', opacity: 0.75, textAlign: 'center' }}>只读不改展示大地图，隐藏所有边栏，绝不篡改/覆写数据</span>
                </button>
              </div>
            </div>

            {/* Section 1.5: Screen Control */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>🖥️ 屏幕显示控制 (Screen Display Control)</label>
              <button
                type="button"
                onClick={() => {
                  if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                      alert(`进入全屏模式失败: ${err.message}`);
                    });
                  } else {
                    document.exitFullscreen();
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: isFullscreen ? 'rgba(192, 132, 252, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  border: isFullscreen ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                  color: isFullscreen ? '#fff' : 'var(--text-secondary)',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: isFullscreen ? '0 0 10px rgba(192, 132, 252, 0.15)' : 'none',
                  transition: 'all 0.2s ease-out'
                }}
              >
                <span>{isFullscreen ? '🖥️ 退出浏览器全屏模式 (Exit Fullscreen)' : '🖥️ 进入浏览器全屏模式 (Enter Fullscreen)'}</span>
              </button>
            </div>

            {/* Section 1.8: Custom Core Attributes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>📊 战役角色六维核心属性自定义更名</label>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
                您可以重命名六个核心属性的显示名称（如：力量 ➔ 体魄，敏捷 ➔ 反射等）。底层数据键名保持不变，完美兼容已有历史存档与导入数据。
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                {Object.entries(customAttributeLabels).map(([originalKey, customVal]) => (
                  <div key={originalKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }} title={originalKey}>
                      原键: {originalKey}
                    </span>
                    <input
                      type="text"
                      className="input-text"
                      style={{ padding: '6px 10px', fontSize: '11px', background: 'rgba(255,255,255,0.01)' }}
                      value={customVal}
                      onChange={(e) => {
                        const updated = { ...customAttributeLabels, [originalKey]: e.target.value };
                        setCustomAttributeLabels(updated);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: LAN Sync Engine */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>📡 局域网实时云同步 (LAN Data Sync)</label>
                <div 
                  onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: !isSyncEnabled ? 'rgba(255,255,255,0.05)' : isSyncConnected ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${!isSyncEnabled ? 'rgba(255,255,255,0.15)' : isSyncConnected ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    padding: '3px 8px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSyncEnabled}
                    onChange={() => {}}
                    style={{ cursor: 'pointer', accentColor: 'var(--accent-purple)' }}
                  />
                  <span style={{ fontSize: '10px', fontWeight: 'bold', color: !isSyncEnabled ? '#9ca3af' : isSyncConnected ? '#34d399' : '#fbbf24' }}>
                    {!isSyncEnabled ? '单机模式' : isSyncConnected ? '局域网同步' : '单机降级'}
                  </span>
                </div>
              </div>
              <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: 0 }}>
                {!isSyncEnabled
                  ? '已手动关闭同步，战役数据仅保存在当前设备。'
                  : isSyncConnected
                    ? '局域网同步可用：每 1.5 秒检查远端修改，本地修改会快速推送。'
                    : '同步服务或令牌不可用，已自动降级为单机使用；本地存档不受影响，连接恢复后会自动重试。'}
              </p>
              <input
                type="password"
                className="input-text"
                value={syncToken}
                onChange={event => setSyncToken(event.target.value)}
                placeholder="局域网同步令牌（与服务器 DMFORGE_SYNC_TOKEN 一致）"
                autoComplete="off"
                style={{ fontSize: '11px' }}
              />
            </div>

            <PresentationControls
              settings={presentationSettings}
              setSettings={setPresentationSettings}
              characters={characters}
              connected={presentationConnected}
              windowOpen={presentationWindowOpen}
              fallbackUrl={presentationFallbackUrl}
              onOpen={openPresentationWindow}
              onOpenTab={openPresentationTab}
              onFocus={focusPresentationWindow}
              onClose={closePresentationWindow}
              onRequestFullscreen={requestPresentationFullscreen}
            />

            {/* Section 3: Campaign Save Database File */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>💾 战役物理存档数据管理 (Campaign File Database)</label>
              <div style={{ fontSize: '10px', color: storageError ? '#f87171' : 'var(--text-secondary)', padding: '6px 8px', borderRadius: '6px', background: storageError ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.08)' }}>
                {storageError || `✓ ${storageStatus}（事务存档，自动保留上一版本）`}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                自动备份：每次内容变化后约 250ms 自动保存，本机保留上一版本；服务器保留近期 20 份、7 天每小时和 30 天每日版本。
              </div>
              {syncConflict && (
                <div style={{ padding: '8px', border: '1px solid #f59e0b', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', fontSize: '10px' }}>
                  <strong>检测到同步冲突，自动上传已暂停。</strong>
                  <p>服务器和本机都发生了修改，请明确选择保留哪个版本。选择前不会覆盖任何一方。</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={resolveConflictWithServer}>使用服务器版本</button>
                    <button className="btn btn-secondary" onClick={resolveConflictWithLocal}>使用本机版本</button>
                    <button className="btn btn-secondary" onClick={handleExportCampaign}>先导出本机版本</button>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleCreateManualBackup}
                  className="btn btn-secondary"
                  style={{ flex: '1 1 100%', fontSize: '11px', padding: '8px 12px', height: '32px' }}
                  title="立即创建本机恢复点；同步可用时同时创建服务器备份"
                >
                  <span>💾 立即手动备份</span>
                </button>
                <button
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    handleExportCampaign();
                  }}
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '11px', padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '32px' }}
                  title="导出整个战役推演进度为本地 JSON 文件备份存档"
                >
                  <span>📤 导出战役存档</span>
                </button>
                
                <label
                  className="btn btn-secondary"
                  style={{ flex: 1, fontSize: '11px', padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '32px', margin: 0 }}
                  title="从外部 JSON 文件恢复导入已存战役存档"
                >
                  <span>📥 导入外部存档</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      setIsSettingsModalOpen(false);
                      handleImportCampaign(e);
                    }}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  onClick={() => {
                    setIsSettingsModalOpen(false);
                    handleResetCampaign();
                  }}
                  className="btn btn-danger"
                  style={{ flex: '1 1 100%', fontSize: '11px', padding: '8px 12px', height: '32px', background: 'rgba(239,68,68,0.15)' }}
                  title="清空本地缓存，恢复酒馆/地底初始战术模板"
                >
                  <span>🔄 恢复出厂设置 (还原预设初始数据)</span>
                </button>
              </div>
              <details onToggle={event => event.currentTarget.open && refreshRecoveryPoints()} style={{ fontSize: '10px' }}>
                <summary style={{ cursor: 'pointer' }}>本机恢复点（{localRecoveryPoints.length}）</summary>
                <div style={{ maxHeight: '130px', overflow: 'auto', marginTop: '6px' }}>
                  {localRecoveryPoints.length === 0 && <div>暂无恢复点</div>}
                  {localRecoveryPoints.map(point => (
                    <div key={point.key} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '4px 0' }}>
                      <span>{point.label || point.key} · {point.savedAt ? new Date(point.savedAt).toLocaleString() : '旧版'}</span>
                      <button className="btn btn-secondary" onClick={() => handleRestoreLocal(point.key)}>恢复</button>
                    </div>
                  ))}
                </div>
              </details>
              {isSyncConnected && (
                <details onToggle={event => event.currentTarget.open && refreshServerBackups()} style={{ fontSize: '10px' }}>
                  <summary style={{ cursor: 'pointer' }}>服务器滚动备份（{serverBackups.length}）</summary>
                  <div style={{ maxHeight: '150px', overflow: 'auto', marginTop: '6px' }}>
                    {serverBackups.map(backup => (
                      <div key={backup.name} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '4px 0', color: backup.valid ? 'inherit' : '#f87171' }}>
                        <span>{backup.name} · {backup.valid ? new Date(backup.modifiedAt).toLocaleString() : '损坏'}</span>
                        {backup.valid && appRole !== 'PLAYER' && <button className="btn btn-secondary" onClick={() => handleRestoreServer(backup.name)}>恢复</button>}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>

            {/* Footer info */}
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px' }}>
              DMForge Campaign Assistant v1.0.0 • ClientID: {clientId.current.substring(0, 8)}...
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
