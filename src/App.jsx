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
import { createLocalRecoveryPoint, describeStorageError, getActiveCampaignId, listLocalRecoveryPoints, loadActiveCampaignSnapshot, restoreLocalRecoveryPoint, safeWriteSetting, saveCampaignSnapshot } from './utils/campaignSnapshotStore';
import { createCampaignExport, openCampaignExport } from './utils/campaignExport';
import { serializeJsonOffThread } from './utils/jsonSerialization';
import { decideInitialSync, decidePollingSync } from './utils/syncDecision';
import { buildPublicPresentationSnapshot, DEFAULT_PRESENTATION_SETTINGS, normalizePresentationSettings, PRESENTATION_PROTOCOL } from './utils/presentation';
import { CompactPresentationControls } from './components/PresentationControls';
import { resetResourcesForRest } from './utils/combatRules';
import { consumeLongRestRations, effectiveSpeed, getLongRestRations, syncCharacterEncumbrance } from './utils/inventoryRules';
import { SF6_RULESET } from './data/sf6Ruleset';
import {
  createBlankCampaign,
  createSf6Campaign,
  SF6_CHAPTER_ONE_CONTENT_VERSION,
  SF6_CHAPTER_ONE_CUTSCENES,
  SF6_CHAPTER_ONE_ITEMS,
  SF6_CHAPTER_ONE_MAPS,
  SF6_CHAPTER_ONE_NOTES,
  upgradeSf6BuiltInMaps
} from './data/campaignTemplates';
import { SF6_ENEMY_BESTIARY_VERSION, SF6_STANDARD_ENEMIES } from './data/sf6EnemyBestiary';
import { calculateSf6Character, createSf6SheetData, normalizeSf6ResourcesForLevel, sf6CharacterFeatureMap } from './utils/sf6CharacterSheet';
import { createEnemyTemplate, normalizeEnemyBestiary } from './utils/enemyBestiary';
import { normalizeCutscenes } from './utils/cutscenes';

// SF6 rules and the native SF6 sheet belong to the bundled default campaign.
// Do not enable them merely because an imported/legacy payload happens to carry
// a rulesetId: the campaign template is the authority for feature isolation.
const isSf6Campaign = data => data?.metadata?.templateId === SF6_RULESET.id;
const resolveCampaignRuleset = data => isSf6Campaign(data) ? structuredClone(SF6_RULESET) : null;
const withoutSf6Sheet = character => {
  const copy = { ...character };
  delete copy.sheet;
  return copy;
};
const hydrateSf6ChapterOne = data => {
  if (!isSf6Campaign(data) || data.metadata?.contentVersion === SF6_CHAPTER_ONE_CONTENT_VERSION) return data;
  const noteIds = new Set((data.floatingNotes || []).map(note => note.id));
  const itemIds = new Set((data.itemPool || []).map(item => item.id));
  const templateNames = new Set((data.itemTemplates || []).map(item => item.name));
  const cutsceneIds = new Set((data.cutscenes || []).map(scene => scene.id));
  const retainedMaps = (data.maps || []).filter(map => !(map.id === 'map_montpellier_arrival'
    && Object.keys(map.blockedCells || {}).length === 0
    && (map.terrainAreas || []).length === 0
    && !map.bgUrl));
  const maps = upgradeSf6BuiltInMaps(retainedMaps);
  const activeMapId = maps.some(map => map.id === data.activeMapId) ? data.activeMapId : SF6_CHAPTER_ONE_MAPS[0].id;
  return {
    ...data,
    metadata: { ...data.metadata, contentVersion: SF6_CHAPTER_ONE_CONTENT_VERSION },
    floatingNotes: [...(data.floatingNotes || []), ...structuredClone(SF6_CHAPTER_ONE_NOTES.filter(note => !noteIds.has(note.id)))],
    itemPool: [
      ...(data.itemPool || []).map(item => {
        const definition = SF6_CHAPTER_ONE_ITEMS.find(candidate => candidate.id === item.id);
        return definition ? { ...structuredClone(definition), ...item } : item;
      }),
      ...structuredClone(SF6_CHAPTER_ONE_ITEMS.filter(item => !itemIds.has(item.id)))
    ],
    maps,
    activeMapId,
    cutscenes: [...(data.cutscenes || []), ...structuredClone(SF6_CHAPTER_ONE_CUTSCENES.filter(scene => !cutsceneIds.has(scene.id)))],
    itemTemplates: [
      ...(data.itemTemplates || []),
      ...SF6_CHAPTER_ONE_ITEMS.filter(item => !templateNames.has(item.name)).map(item => {
        const copy = structuredClone(item);
        delete copy.id;
        delete copy.ownerId;
        delete copy.quantity;
        return copy;
      })
    ]
  };
};
const hydrateSf6Bestiary = data => {
  if (!isSf6Campaign(data) || data.metadata?.bestiaryVersion === SF6_ENEMY_BESTIARY_VERSION) return data;
  const existingIds = new Set((data.enemyBestiary || []).map(entry => entry.id));
  const builtInById = new Map(SF6_STANDARD_ENEMIES.map(entry => [entry.id, entry]));
  const upgradedCharacters = (data.characters || []).map(character => {
    const definition = builtInById.get(character.enemyTemplateId);
    if (!definition) return character;
    const builtInInventory = createEnemyTemplate(definition).inventory;
    const existingById = new Map((character.inventory || []).map(item => [item.id, item]));
    return {
      ...character,
      inventory: builtInInventory.map(item => ({ ...structuredClone(item), ...(existingById.get(item.id) || {}) }))
    };
  });
  const inventoryByCharacter = new Map(upgradedCharacters.filter(character => builtInById.has(character.enemyTemplateId)).map(character => [character.id, character.inventory || []]));
  const existingPool = data.itemPool || [];
  const addedInventoryItems = [];
  for (const [characterId, inventory] of inventoryByCharacter) {
    for (const item of inventory) {
      const existing = existingPool.find(candidate => candidate.ownerId === characterId && (candidate.templateItemId === item.id || candidate.name === item.name));
      if (!existing) addedInventoryItems.push({ ...structuredClone(item), id: `item_${characterId}_${item.id}`, templateItemId: item.id, ownerId: characterId, infinite: false });
    }
  }
  return {
    ...data,
    metadata: { ...data.metadata, bestiaryVersion: SF6_ENEMY_BESTIARY_VERSION },
    characters: upgradedCharacters,
    itemPool: [...existingPool.map(item => {
      const inventory = inventoryByCharacter.get(item.ownerId);
      const definition = inventory?.find(candidate => candidate.id === item.templateItemId || candidate.name === item.name);
      return definition ? { ...structuredClone(definition), ...item, infinite: false } : item;
    }), ...addedInventoryItems],
    enemyBestiary: [
      ...(data.enemyBestiary || []).map(entry => builtInById.has(entry.id) ? structuredClone(builtInById.get(entry.id)) : entry),
      ...structuredClone(SF6_STANDARD_ENEMIES.filter(entry => !existingIds.has(entry.id)))
    ]
  };
};
const hydrateSf6Campaign = data => hydrateSf6Bestiary(hydrateSf6ChapterOne(data));
const upgradeSf6Notes = (notes, data) => {
  if (!isSf6Campaign(data)) return notes || [];
  const content = SF6_RULESET.rulings.map(item => `• ${item.text}`).join('\n');
  return (notes || []).map(note => note.id === 'note_dm_rulings' ? { ...note, title: `DM：v${SF6_RULESET.version} 规则说明`, content } : note);
};
const upgradeSf6Characters = (characters, data) => {
  const sanitized = sanitizeCharacters(characters || []);
  if (!isSf6Campaign(data)) return sanitized.map(withoutSf6Sheet);
  return sanitized.map(character => ({
    ...character,
    resources: normalizeSf6ResourcesForLevel(character.resources, character.level)
  }));
};


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

    if (!resources.some(r => r.name === '反应')) resources.push({ name: '反应', max: 1, value: 1, resetType: 'turn' });

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
      tempHp: c.tempHp !== undefined ? c.tempHp : 0,
      vision: { darkvision: 0, normalVisionLimit: 180, sharedWithParty: true, ...(c.vision || {}) },
      facing: Number(c.facing || 0)
    };
  });
};

const featureLevel = feature => Number.parseInt(String(feature?.name || '').match(/\d+/)?.[0] || '1', 10);
const buildRulesetFeatures = (classDefinition, subclass, level) => {
  if (!classDefinition) return { '特质': '新录入的角色' };
  const available = [
    ...(classDefinition.features || []),
    ...((classDefinition.subclassFeatures || {})[subclass] || [])
  ].filter(feature => featureLevel(feature) <= level);
  return Object.fromEntries(available.map(feature => [feature.name, feature.description]));
};

// --- Campaign Initial Fallback Templates (Out of the Box) ---
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

const INITIAL_CHARACTERS = [];
const INITIAL_ITEM_TEMPLATES = [];
const INITIAL_ITEM_POOL = [];
const INITIAL_FLOATING_NOTES = [];
const INITIAL_MAPS = [{ id: 'map_blank_1', name: '未命名地图', width: 60, height: 40, bgUrl: '', blockedCells: {}, terrainAreas: [] }];

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

export default function App({ onExitToCampaigns }) {
  const apiPath = React.useCallback(path => `${path}?campaignId=${encodeURIComponent(getActiveCampaignId() || 'legacy-current')}`, []);
  const lastUpdatedSettingKey = `dmforge_lastUpdated:${getActiveCampaignId() || 'legacy-current'}`;
  // --- LAN Sync System States ---
  const clientId = React.useRef(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
  const lastUpdatedRef = React.useRef(0);
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
  const [presentationCamera, setPresentationCamera] = useState({ scale: 1, x: 0, y: 0, centerX: null, centerY: null });
  const [presentationInteraction, setPresentationInteraction] = useState(null);
  const [presentationSettings, setPresentationSettings] = useState(() => normalizePresentationSettings(getSavedState(
    'dmforge_presentationSettingsV3',
    { ...getSavedState('dmforge_presentationSettingsV2', getSavedState('dmforge_presentationSettings', DEFAULT_PRESENTATION_SETTINGS)), cameraMode: 'follow-dm', showBlockedCells: true }
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
  const [campaignMetadata, setCampaignMetadata] = useState({ name: '未命名战役', templateId: 'blank', templateVersion: '1' });
  const [ruleset, setRuleset] = useState(null);

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
    const rawChars = INITIAL_CHARACTERS;
    const sanitized = rawChars.map(c => ({
      ...c,
      conditions: c.conditions || [],
      combatSpeedRemaining: c.combatSpeedRemaining !== undefined ? c.combatSpeedRemaining : (c.speed !== undefined ? c.speed : 30),
      combatStartGridX: c.combatStartGridX !== undefined ? c.combatStartGridX : (c.gridX || 0),
      combatStartGridY: c.combatStartGridY !== undefined ? c.combatStartGridY : (c.gridY || 0)
    }));
    return sanitizeCharacters(sanitized);
  });
  const [itemPool, setItemPool] = useState(INITIAL_ITEM_POOL);
  const [itemTemplates, setItemTemplates] = useState(INITIAL_ITEM_TEMPLATES);
  const [enemyBestiary, setEnemyBestiary] = useState([]);
  const [cutscenes, setCutscenes] = useState([]);
  const [activeCutsceneId, setActiveCutsceneId] = useState('');
  const [playerDisplayMode, setPlayerDisplayMode] = useState('map');
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [floatingNotes, setFloatingNotes] = useState(INITIAL_FLOATING_NOTES);
  const [maps, setMaps] = useState(INITIAL_MAPS);
  const encumbranceCharacterSignature = characters.map(character => `${character.id}:${character.type}:${character.stats?.耐力 ?? character.stats?.['体质 (Fortitude)'] ?? 10}`).join('|');

  useEffect(() => {
    setCharacters(previous => syncCharacterEncumbrance(previous, itemPool));
  }, [itemPool, encumbranceCharacterSignature]);
  const [activeMapId, setActiveMapId] = useState('map_blank_1');
  
  // Global turn-based combat states
  const [isInCombat, setIsInCombat] = useState(false);
  const [combatRound, setCombatRound] = useState(1);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [combatParticipants, setCombatParticipants] = useState([]);
  const [combatTurnOrder, setCombatTurnOrder] = useState([]);
  
  // High-fidelity Excel Spreadsheets database
  const [excelCards, setExcelCards] = useState([]);
  const [activeExcelCardId, setActiveExcelCardId] = useState('');

  // Custom Groups state
  const [groups, setGroups] = useState(INITIAL_GROUPS);

  // Custom Core Attribute display labels state
  const [customAttributeLabels, setCustomAttributeLabels] = useState({
    '力量 (Physical)': '力量 (Physical)',
    '敏捷 (Agility)': '敏捷 (Agility)',
    '体质 (Fortitude)': '体质 (Fortitude)',
    '感知 (Perception)': '感知 (Perception)',
    '智力 (Intellect)': '智力 (Intellect)',
    '神秘 (Arcane)': '神秘 (Arcane)'
  });
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  useEffect(() => {
    let active = true;
    loadActiveCampaignSnapshot().then(snapshot => {
      if (!active || !snapshot) return;
      const data = hydrateSf6Campaign(prepareCampaign(snapshot));
      setCharacters(upgradeSf6Characters(data.characters, data));
      setItemPool(data.itemPool);
      setItemTemplates(data.itemTemplates);
      setEnemyBestiary(normalizeEnemyBestiary(data.enemyBestiary));
      setCutscenes(normalizeCutscenes(data.cutscenes));
      setActiveCutsceneId(data.activeCutsceneId || '');
      setPlayerDisplayMode(data.playerDisplayMode === 'cutscene' ? 'cutscene' : 'map');
      setLogs(data.logs);
      setFloatingNotes(upgradeSf6Notes(data.floatingNotes, data));
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
      setCampaignMetadata(data.metadata || { name: '未命名战役', templateId: 'legacy', templateVersion: '1' });
      setRuleset(resolveCampaignRuleset(data));
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
      setCurrentTab(playerDisplayMode === 'cutscene' ? 'cutscene' : 'map');
    }
  };

  useEffect(() => {
    if (appRole === 'PLAYER') setCurrentTab(playerDisplayMode === 'cutscene' ? 'cutscene' : 'map');
  }, [appRole, playerDisplayMode]);

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
    const emptyDraft = {
      name: '',
      type: ruleset?.id === SF6_RULESET.id ? 'PC' : 'NPC',
      class: '',
      maxHp: 30,
      hp: 30,
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
      level: ruleset?.id === SF6_RULESET.id ? 3 : 1,
      hitDice: 'd8',
      levelHpIncreases: [],
      tempHp: 0,
      sheet: ruleset?.id === SF6_RULESET.id ? createSf6SheetData() : undefined
    };
    setNewChar(ruleset?.id === SF6_RULESET.id ? calculateSf6Character(emptyDraft, ruleset) : emptyDraft);
    // The resource sub-form lives in CharacterEditorModal and unmounts with it,
    // so it resets itself every time the modal opens.
    setIsAddCharModalOpen(true);
  }, [ruleset]);

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
          return {
            ...resetResourcesForRest(c, 'short'),
            hp: newHp,
          };
        }
        return c;
      });
      return sanitizeCharacters(updated);
    });

    addLog({
      type: 'COMBAT',
      content: `**战役短休**: 角色 [${restingNames.join(',')}] 完成短休：生命值恢复 50%，斗气恢复 3 格，其他短休与回合资源按规则恢复。`,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleLongRest = (selectedIds) => {
    const selectedPcIds = selectedIds.filter(id => characters.some(character => character.id === id && character.type === 'PC'));
    const rationPlan = getLongRestRations(itemPool, selectedPcIds);
    if (!rationPlan.enough) return false;
    const restingNames = [];
    setCharacters(prev => {
      const updated = prev.map(c => {
        if (selectedIds.includes(c.id)) {
          restingNames.push(c.name);
          
          // 1. Recover 100% max HP
          // 2. Reset ALL resources to max
          return {
            ...resetResourcesForRest(c, 'long'),
            hp: c.maxHp,
            conditions: [], // encumbrance-derived conditions are restored by the inventory synchronizer
            combatSpeedRemaining: effectiveSpeed(c)
          };
        }
        return c;
      });
      return sanitizeCharacters(updated);
    });

    setItemPool(previous => consumeLongRestRations(previous, rationPlan));

    addLog({
      type: 'COMBAT',
      content: `**战役长休**: 角色 [${restingNames.join(',')}] 完成长休，消耗队伍口粮 ${rationPlan.required} kcal；生命恢复 100%，资源槽重置并清除特殊负面状态。`,
      timestamp: new Date().toLocaleTimeString()
    });
    return true;
  };

  const handleOpenEditCharModal = React.useCallback((char) => {
    setEditingCharId(char.id);
    setNewChar({
      name: char.name || '',
      type: char.type || 'NPC',
      class: char.class || '',
      subclass: char.subclass || '',
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
      ,sheet: ruleset?.id === SF6_RULESET.id ? createSf6SheetData(char.sheet) : undefined
    });
    // The resource sub-form lives in CharacterEditorModal and unmounts with it,
    // so it resets itself every time the modal opens.
    setIsAddCharModalOpen(true);
  }, [ruleset]);


  // --- LAN Sync Engine ---
  
  // Pack current campaign state to JSON payload
  const getCampaignPayload = (timestamp) => {
    const hasBundledRules = campaignMetadata?.templateId === SF6_RULESET.id;
    return {
      metadata: campaignMetadata,
      rulesetId: hasBundledRules ? SF6_RULESET.id : null,
      ruleset: hasBundledRules ? ruleset : null,
      characters: hasBundledRules ? characters : characters.map(withoutSf6Sheet),
      itemPool,
      itemTemplates,
      enemyBestiary,
      cutscenes,
      activeCutsceneId,
      playerDisplayMode,
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
  const presentationSnapshot = React.useMemo(() => (!presentationWindowOpen && !presentationConnected) ? null : buildPublicPresentationSnapshot(
    getCampaignPayload(lastUpdatedRef.current || Date.now()), presentationSettings, presentationCamera, presentationInteraction
  // getCampaignPayload captures the campaign fields listed in this dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [presentationWindowOpen, presentationConnected, characters, itemPool, itemTemplates, enemyBestiary, cutscenes, activeCutsceneId, playerDisplayMode, logs, floatingNotes, maps, activeMapId, excelCards, activeExcelCardId, groups, isInCombat, combatRound, currentTurnIndex, combatParticipants, combatTurnOrder, customAttributeLabels, presentationSettings, presentationCamera, presentationInteraction]);
  const presentationChannelRef = React.useRef(null);
  const presentationSnapshotRef = React.useRef(presentationSnapshot);
  presentationSnapshotRef.current = presentationSnapshot;

  const sendPresentationSnapshot = React.useCallback((targetWindow = presenterWindowRef.current) => {
    if (!presentationSnapshotRef.current) return;
    const message = { protocol: PRESENTATION_PROTOCOL, sessionId: presentationSessionRef.current, type: 'SNAPSHOT', snapshot: presentationSnapshotRef.current };
    try { if (targetWindow && !targetWindow.closed) targetWindow.postMessage(message, presentationOrigin); } catch { /* the window may be navigating */ }
    presentationChannelRef.current?.postMessage(message);
  }, [presentationOrigin]);

  useEffect(() => {
    safeWriteSetting('dmforge_presentationSettingsV3', normalizePresentationSettings(presentationSettings), setStorageError);
  }, [presentationSettings]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel(`${PRESENTATION_PROTOCOL}:${presentationSessionRef.current}`);
    presentationChannelRef.current = channel;
    channel.onmessage = event => {
      if (event.data?.protocol !== PRESENTATION_PROTOCOL || event.data.sessionId !== presentationSessionRef.current) return;
      if (event.data.type === 'READY') { presentationLastSeenRef.current = Date.now(); setPresentationConnected(true); sendPresentationSnapshot(); }
      if (event.data.type === 'PONG') { presentationLastSeenRef.current = Date.now(); setPresentationConnected(true); }
      if (event.data.type === 'CLOSED') {
        presentationLastSeenRef.current = 0;
        presenterWindowRef.current = null;
        setPresentationWindowOpen(false);
        setPresentationConnected(false);
      }
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
      if (data.type === 'CLOSED' && (!presenterWindowRef.current || event.source === presenterWindowRef.current)) {
        presentationLastSeenRef.current = 0;
        presenterWindowRef.current = null;
        setPresentationWindowOpen(false);
        setPresentationConnected(false);
      }
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
        if (!presentationLastSeenRef.current || Date.now() - presentationLastSeenRef.current > 5000) setPresentationConnected(false);
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
  const refreshPresentationWindow = () => {
    const target = presenterWindowRef.current;
    const recentlySeen = presentationLastSeenRef.current > 0 && Date.now() - presentationLastSeenRef.current < 5000;
    if ((!target || target.closed) && !recentlySeen) {
      presenterWindowRef.current = null;
      presentationLastSeenRef.current = 0;
      setPresentationWindowOpen(false);
      setPresentationConnected(false);
      return;
    }
    const message = { protocol: PRESENTATION_PROTOCOL, sessionId: presentationSessionRef.current, type: 'RELOAD' };
    try { if (target && !target.closed) target.postMessage(message, presentationOrigin); } catch { /* presenter may be navigating */ }
    presentationChannelRef.current?.postMessage(message);
    setPresentationWindowOpen(Boolean(target && !target.closed));
    setPresentationConnected(false);
  };
  const requestPresentationFullscreen = () => setPresentationSettings(current => ({ ...current, fullscreenRequest: (current.fullscreenRequest || 0) + 1 }));
  const handlePresentationCameraChange = React.useCallback(camera => {
    setPresentationCamera(previous => Math.abs(previous.scale - camera.scale) < .002
      && Math.abs(previous.x - camera.x) < .5 && Math.abs(previous.y - camera.y) < .5
      && Math.abs((previous.centerX || 0) - (camera.centerX || 0)) < .02
      && Math.abs((previous.centerY || 0) - (camera.centerY || 0)) < .02 ? previous : camera);
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
    fetch(apiPath('/api/campaign'), {
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
  const applyServerState = (incomingData) => {
    const data = hydrateSf6Campaign(incomingData);
    if (storageReady && appRole !== 'PLAYER') {
      createLocalRecoveryPoint(getCampaignPayload(lastUpdatedRef.current || Date.now()), '局域网同步覆盖前自动恢复点')
        .then(() => listLocalRecoveryPoints().then(setLocalRecoveryPoints))
        .catch(error => setStorageError(describeStorageError(error)));
    }
    isServerUpdateInProgress.current = true;
    localDirtyRef.current = false;
    
    if (data.characters) setCharacters(upgradeSf6Characters(data.characters, data));
    if (data.itemPool) setItemPool(data.itemPool);
    if (data.itemTemplates) setItemTemplates(data.itemTemplates);
    if (data.enemyBestiary) setEnemyBestiary(normalizeEnemyBestiary(data.enemyBestiary));
    if (data.cutscenes) setCutscenes(normalizeCutscenes(data.cutscenes));
    if (data.activeCutsceneId !== undefined) setActiveCutsceneId(data.activeCutsceneId || '');
    if (data.playerDisplayMode) setPlayerDisplayMode(data.playerDisplayMode === 'cutscene' ? 'cutscene' : 'map');
    if (data.logs) setLogs(data.logs);
    if (data.floatingNotes) setFloatingNotes(upgradeSf6Notes(data.floatingNotes, data));
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
    if (data.metadata) setCampaignMetadata(data.metadata);
    setRuleset(resolveCampaignRuleset(data));
    
    lastUpdatedRef.current = data.lastUpdated;
    safeWriteSetting(lastUpdatedSettingKey, data.lastUpdated, setStorageError);

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
    safeWriteSetting(lastUpdatedSettingKey, now, setStorageError);

    const handler = setTimeout(() => {
      pushCampaignToServer(now);
    }, 150);

    return () => clearTimeout(handler);
  // pushCampaignToServer intentionally captures the same state listed below;
  // adding its changing identity would retrigger this debounce on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    characters, itemPool, itemTemplates, enemyBestiary, cutscenes, activeCutsceneId, playerDisplayMode, logs, floatingNotes, maps, activeMapId,
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
      fetch(apiPath('/api/campaign'), { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} })
        .then(async res => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return { data: await res.json(), revision: res.headers.get('ETag') || '"empty"' };
        })
        .then(({ data, revision }) => {
          if (!active) return;
          setIsSyncConnected(true);

          if (data && data.lastUpdated !== undefined) {
            const localLU = getSavedState(lastUpdatedSettingKey, 0);
            const action = decideInitialSync({ role: appRole, serverHasState: true, serverTimestamp: data.lastUpdated, localTimestamp: localLU });
            if (action === 'pull-server') applyServerState(data);
            if (action === 'conflict') setSyncConflict({ local: getCampaignPayload(localLU || Date.now()), server: data, revision });
            if (action === 'matched') localDirtyRef.current = false;
            serverRevisionRef.current = revision;
            isSyncInitialized.current = true;
          } else {
            const action = decideInitialSync({ role: appRole, serverHasState: false, serverTimestamp: 0, localTimestamp: getSavedState(lastUpdatedSettingKey, 0) });
            if (action === 'initialize-server') {
              const localLU = getSavedState(lastUpdatedSettingKey, 0) || Date.now();
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

      fetch(apiPath('/api/campaign'), { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} })
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
  }, [storageReady, campaignMetadata, ruleset, characters, itemPool, itemTemplates, enemyBestiary, cutscenes, activeCutsceneId, playerDisplayMode, logs, floatingNotes, maps, activeMapId, excelCards, activeExcelCardId, groups, isInCombat, combatRound, currentTurnIndex, combatParticipants, combatTurnOrder, customAttributeLabels]);

  // --- Campaign Import / Export / Reset Functions ---
  const handleExportCampaign = async () => {
    const hasBundledRules = campaignMetadata?.templateId === SF6_RULESET.id;
    const campaignData = {
      metadata: campaignMetadata,
      rulesetId: hasBundledRules ? SF6_RULESET.id : null,
      ruleset: hasBundledRules ? ruleset : null,
      characters: hasBundledRules ? characters : characters.map(withoutSf6Sheet),
      itemPool,
      itemTemplates,
      enemyBestiary,
      cutscenes,
      activeCutsceneId,
      playerDisplayMode,
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
        const data = hydrateSf6Campaign(prepareCampaign(await openCampaignExport(parsed, password)));
        await createLocalRecoveryPoint(getCampaignPayload(lastUpdatedRef.current || Date.now()), '导入前自动恢复点');

        setCharacters(upgradeSf6Characters(data.characters, data));
        setItemPool(data.itemPool || []);
        setItemTemplates(data.itemTemplates || INITIAL_ITEM_TEMPLATES);
        setEnemyBestiary(normalizeEnemyBestiary(data.enemyBestiary));
        setCutscenes(normalizeCutscenes(data.cutscenes));
        setActiveCutsceneId(data.activeCutsceneId || '');
        setPlayerDisplayMode(data.playerDisplayMode === 'cutscene' ? 'cutscene' : 'map');
        setLogs(data.logs || []);
        setFloatingNotes(upgradeSf6Notes(data.floatingNotes, data));
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
        setCampaignMetadata(data.metadata || { name: '导入的战役', templateId: 'imported', templateVersion: '1' });
        setRuleset(resolveCampaignRuleset(data));

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
        const response = await fetch(apiPath('/api/backups'), {
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
      const response = await fetch(apiPath('/api/backups'), { headers: syncToken ? { Authorization: `Bearer ${syncToken}` } : {} });
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
      const response = await fetch(apiPath('/api/backups/restore'), {
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

        const resetData = campaignMetadata.templateId === SF6_RULESET.id ? createSf6Campaign(campaignMetadata.name) : createBlankCampaign(campaignMetadata.name);
        setCharacters([]);
        setItemPool(resetData.itemPool);
        setItemTemplates(resetData.itemTemplates);
        setEnemyBestiary(normalizeEnemyBestiary(resetData.enemyBestiary));
        setCutscenes(normalizeCutscenes(resetData.cutscenes));
        setActiveCutsceneId(resetData.activeCutsceneId || '');
        setPlayerDisplayMode('map');
        setLogs(resetData.logs);
        setFloatingNotes(resetData.floatingNotes);
        setMaps(resetData.maps);
        setActiveMapId(resetData.activeMapId);
        setLeftSidebarWidth(320);
        setRightSidebarWidth(320);
        setAppRole('DM');
        setIsLeftSidebarCollapsed(false);
        setIsRightSidebarCollapsed(false);
        setExcelCards([]);
        setActiveExcelCardId('');
        setGroups(resetData.groups);
        setIsInCombat(false);
        setCombatRound(1);
        setCurrentTurnIndex(0);
        setCombatParticipants([]);
        setCombatTurnOrder([]);
        setCustomAttributeLabels(resetData.customAttributeLabels);
        setCampaignMetadata(resetData.metadata);
        setRuleset(resolveCampaignRuleset(resetData));

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
      sheet: char.sheet ? createSf6SheetData(structuredClone(char.sheet)) : undefined,
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
    const saveDraft = ruleset?.id === SF6_RULESET.id ? calculateSf6Character(newChar, ruleset) : newChar;
    if (!saveDraft.name.trim()) {
      alert('请输入角色/怪物名称！');
      return;
    }
    const timestamp = new Date().toLocaleTimeString();

    if (editingCharId) {
      const selectedClass = ruleset?.classes?.find(entry => entry.name === saveDraft.class.trim());
      setCharacters(prev => sanitizeCharacters(prev.map(c => {
        if (c.id !== editingCharId) return c;
        return {
          ...c,
          name: saveDraft.name.trim(),
          type: saveDraft.type,
          class: saveDraft.class.trim() || '无职业',
          subclass: saveDraft.subclass || '',
          maxHp: saveDraft.maxHp,
          hp: Math.min(saveDraft.hp ?? c.hp, saveDraft.maxHp),
          ac: saveDraft.ac,
          initiative: saveDraft.initiative,
          speed: saveDraft.speed,
          stats: saveDraft.stats,
          savingThrows: saveDraft.savingThrows,
          skillTotals: saveDraft.skillTotals,
          passivePerception: saveDraft.passivePerception,
          proficiencyBonus: saveDraft.proficiencyBonus,
          feats: ruleset?.id === SF6_RULESET.id ? sf6CharacterFeatureMap(saveDraft, ruleset) : selectedClass ? buildRulesetFeatures(selectedClass, saveDraft.subclass, saveDraft.level || 1) : c.feats,
          resources: saveDraft.resources,
          sheet: saveDraft.sheet,
          conditions: c.conditions || [],
          level: saveDraft.level !== undefined ? saveDraft.level : (c.level || 1),
          hitDice: saveDraft.hitDice !== undefined ? saveDraft.hitDice : (c.hitDice || 'd8'),
          levelHpIncreases: saveDraft.levelHpIncreases ? [...saveDraft.levelHpIncreases] : (c.levelHpIncreases || []),
          tempHp: saveDraft.tempHp !== undefined ? saveDraft.tempHp : (c.tempHp || 0)
        };
      })));

      setIsAddCharModalOpen(false);
      setEditingCharId(null);
      addLog?.({
        type: 'COMBAT',
        content: `**修改角色属性**: [${saveDraft.type}] **${saveDraft.name}** (职业: ${saveDraft.class || '无职业'}, HP上限: ${saveDraft.maxHp}, AC: ${saveDraft.ac})`,
        timestamp
      });
      return;
    }

    const selectedClass = ruleset?.classes?.find(entry => entry.name === saveDraft.class.trim());
    const defaultResources = ruleset?.resources?.map(resource => ({ ...resource, value: resource.max })) || [];
    const availableSpawnPoints = ruleset?.id === SF6_RULESET.id ? (activeMap?.spawnPoints || []) : [];
    const spawn = availableSpawnPoints.find(point => !characters.some(character => character.mapId === activeMapId && character.gridX === point.x && character.gridY === point.y))
      || availableSpawnPoints[characters.filter(character => character.mapId === activeMapId).length % Math.max(availableSpawnPoints.length, 1)]
      || { x: 2, y: 2 };
    const created = {
      id: 'char_' + Date.now(),
      name: saveDraft.name.trim(),
      type: saveDraft.type,
      class: saveDraft.class.trim() || '无职业',
      hp: Math.min(saveDraft.hp ?? saveDraft.maxHp, saveDraft.maxHp),
      maxHp: saveDraft.maxHp,
      ac: saveDraft.ac,
      initiative: saveDraft.initiative,
      speed: saveDraft.speed,
      gridX: spawn.x,
      gridY: spawn.y,
      mapId: activeMapId,
      stats: saveDraft.stats,
      savingThrows: saveDraft.savingThrows,
      skillTotals: saveDraft.skillTotals,
      passivePerception: saveDraft.passivePerception,
      proficiencyBonus: saveDraft.proficiencyBonus,
      feats: ruleset?.id === SF6_RULESET.id ? sf6CharacterFeatureMap(saveDraft, ruleset) : buildRulesetFeatures(selectedClass, saveDraft.subclass, saveDraft.level || 1),
      resources: saveDraft.resources.length ? saveDraft.resources : defaultResources,
      sheet: saveDraft.sheet,
      subclass: saveDraft.subclass || '',
      rulesetClassId: selectedClass?.id,
      groupId: saveDraft.type === 'PC' ? 'group_pcs' : 'group_npcs',
      conditions: [],
      combatSpeedRemaining: saveDraft.speed !== undefined ? saveDraft.speed : 30,
      combatStartGridX: spawn.x,
      combatStartGridY: spawn.y,
      level: saveDraft.level !== undefined ? saveDraft.level : 1,
      hitDice: saveDraft.hitDice !== undefined ? saveDraft.hitDice : 'd8',
      levelHpIncreases: saveDraft.levelHpIncreases ? [...saveDraft.levelHpIncreases] : [],
      tempHp: saveDraft.tempHp !== undefined ? saveDraft.tempHp : 0
      ,vision: { darkvision: 0, normalVisionLimit: 180, sharedWithParty: true }
      ,facing: 0
    };

    setCharacters(prev => [...prev, sanitizeCharacters([created])[0]]);
    setIsAddCharModalOpen(false);
    addLog?.({
      type: 'COMBAT',
      content: `**新增角色/怪物**: [${saveDraft.type}] **${saveDraft.name}** (职业: ${created.class}, HP: ${saveDraft.maxHp}, AC: ${saveDraft.ac})`,
      timestamp
    });
  };

  const handleConfirmRest = () => {
    const selectedIds = Object.keys(restParticipants).filter(id => restParticipants[id]);
    if (selectedIds.length === 0) return;
    if (restModalType === 'short') handleShortRest(selectedIds);
    else if (!handleLongRest(selectedIds)) return;
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

  const exitToCampaignChooser = async () => {
    try { await saveCampaignSnapshot(getCampaignPayload(Date.now())); }
    catch (error) { setStorageError(describeStorageError(error)); return; }
    onExitToCampaigns?.();
  };

  const showLeftSidebar = !isPlayerViewMode && !isLeftSidebarCollapsed;
  const showRightRail = !isPlayerViewMode && !isRightSidebarCollapsed;

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', overflow: 'hidden' }}>
      <AppHeader
        campaignName={campaignMetadata.name || '未命名战役'}
        chapter={`${activeMap?.name || '未命名地图'} · ${maps.length} 张地图 · ${characters.length} 名角色`}
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
        onOpenCampaigns={exitToCampaignChooser}
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
              setItemPool={setItemPool}
              addLog={addLog}
              onOpenAddCharModal={handleOpenAddCharModal}
              onOpenEditCharModal={handleOpenEditCharModal}
              onDuplicateChar={handleDuplicateChar}
              groups={groups}
              setGroups={setGroups}
              isInCombat={isInCombat}
              combatParticipants={combatParticipants}
              combatTurnOrder={combatTurnOrder}
              currentTurnIndex={currentTurnIndex}
              setCombatParticipants={setCombatParticipants}
              setCombatTurnOrder={setCombatTurnOrder}
              setCurrentTurnIndex={setCurrentTurnIndex}
              onOpenRestModal={handleOpenRestModal}
              customAttributeLabels={customAttributeLabels}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={(id) => {
                setSelectedCharacterId(id);
                if (id) setIsRightSidebarCollapsed(false);
              }}
            />
            <CompactPresentationControls
              settings={presentationSettings}
              setSettings={setPresentationSettings}
              maps={maps}
              cutscenes={cutscenes}
              activeCutsceneId={activeCutsceneId}
              connected={presentationConnected}
              windowOpen={presentationWindowOpen}
              onOpen={openPresentationWindow}
              onFocus={focusPresentationWindow}
              onRequestFullscreen={requestPresentationFullscreen}
              onRefresh={refreshPresentationWindow}
              onSelectCutscene={(id) => {
                setActiveCutsceneId(id);
                if (id) setPlayerDisplayMode('cutscene');
              }}
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
          setItemTemplates, enemyBestiary, setEnemyBestiary, cutscenes, setCutscenes, activeCutsceneId,
          setActiveCutsceneId, playerDisplayMode, setPlayerDisplayMode, groups, excelCards, setExcelCards, activeExcelCardId,
          setActiveExcelCardId, floatingNotes, setFloatingNotes, updateFloatingNote,
          deleteFloatingNote, onPresentationCameraChange: handlePresentationCameraChange,
          onPresentationInteractionChange: setPresentationInteraction, ruleset
          ,onPresentCutscene: (id) => {
            setActiveCutsceneId(id);
            setPlayerDisplayMode('cutscene');
            setPresentationSettings(current => ({ ...current, scene: 'story' }));
          }
          ,onPresentMap: () => {
            setPlayerDisplayMode('map');
            setPresentationSettings(current => ({ ...current, scene: isInCombat ? 'battle' : 'map' }));
          }
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
              selectedCharacter={characters.find(character => character.id === selectedCharacterId) || null}
            />
          </aside>
        )}

        {!isPlayerViewMode && currentTab === 'map' && floatingNotes.filter(note => note.isOpen !== false).map(note => (
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
        ruleset={ruleset}
        onClose={() => { setIsAddCharModalOpen(false); setEditingCharId(null); }}
        onSave={handleSaveCharacter}
      />

      <RestModal
        open={isRestModalOpen}
        restType={restModalType}
        characters={characters}
        itemPool={itemPool}
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
        campaignShareUrl={`${window.location.origin}/#campaignId=${encodeURIComponent(getActiveCampaignId())}${syncToken ? `&syncToken=${encodeURIComponent(syncToken)}` : ''}`}
        presentationProps={{
          settings: presentationSettings,
          setSettings: setPresentationSettings,
          characters,
          maps,
          connected: presentationConnected,
          windowOpen: presentationWindowOpen,
          fallbackUrl: presentationFallbackUrl,
          onOpen: openPresentationWindow,
          onOpenTab: openPresentationTab,
          onFocus: focusPresentationWindow,
          onClose: closePresentationWindow,
          onRequestFullscreen: requestPresentationFullscreen
          ,onRefresh: refreshPresentationWindow
        }}
      />
    </div>
  );
}
