import { TERRAIN_FEATURE_PRESETS } from './terrainRules.js';

export const CURRENT_SCHEMA_VERSION = 2;
export const MAX_CAMPAIGN_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CAMPAIGN_COLLECTION_ITEMS = 10_000;

const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const ID_PATTERN = /^[\p{L}\p{N}_.:-]{1,160}$/u;

const error = (path, message) => { throw new Error(`${path}: ${message}`); };
const asObject = (value, path) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) error(path, '必须是对象');
  return value;
};
const asArray = (value, path, required = false) => {
  if (value === undefined && !required) return [];
  if (!Array.isArray(value)) error(path, '必须是数组');
  if (value.length > MAX_CAMPAIGN_COLLECTION_ITEMS) error(path, `超过 ${MAX_CAMPAIGN_COLLECTION_ITEMS} 项限制`);
  return value;
};
const asString = (value, path, required = false, max = 100_000) => {
  if (value === undefined || value === null) {
    if (required) error(path, '缺少必填字符串');
    return '';
  }
  if (typeof value !== 'string') error(path, '必须是字符串');
  if (value.length > max) error(path, `超过 ${max} 字符限制`);
  return value;
};
const asId = (value, path) => {
  const result = asString(value, path, true, 160);
  if (!ID_PATTERN.test(result)) error(path, 'ID 格式无效');
  return result;
};
const asNumber = (value, path, options = {}) => {
  const { required = false, min = -1e9, max = 1e9, integer = false } = options;
  if (value === undefined || value === null) {
    if (required) error(path, '缺少必填数字');
    return;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) error(path, '必须是有限数字');
  if (integer && !Number.isInteger(value)) error(path, '必须是整数');
  if (value < min || value > max) error(path, `超出 ${min}..${max} 范围`);
};
const asBoolean = (value, path) => {
  if (value !== undefined && typeof value !== 'boolean') error(path, '必须是布尔值');
};
const uniqueIds = (values, path) => {
  const ids = new Set();
  values.forEach((value, index) => {
    asObject(value, `${path}[${index}]`);
    const current = asId(value.id, `${path}[${index}].id`);
    if (ids.has(current)) error(`${path}[${index}].id`, `重复 ID: ${current}`);
    ids.add(current);
  });
  return ids;
};

function rejectDangerousKeys(value, path = 'campaign', depth = 0) {
  if (depth > 30) error(path, '嵌套过深');
  if (!value || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) error(`${path}.${key}`, '禁止字段');
    rejectDangerousKeys(value[key], `${path}.${key}`, depth + 1);
  }
}

function validateCharacter(character, path) {
  asObject(character, path);
  asId(character.id, `${path}.id`);
  asString(character.name, `${path}.name`, true, 500);
  if (character.type !== undefined && !['PC', 'NPC'].includes(character.type)) error(`${path}.type`, '必须是 PC 或 NPC');
  for (const key of ['hp', 'maxHp', 'tempHp', 'ac', 'initiative', 'speed', 'gridX', 'gridY', 'combatSpeedRemaining', 'combatStartGridX', 'combatStartGridY', 'level']) {
    asNumber(character[key], `${path}.${key}`, { min: -1e6, max: 1e6 });
  }
  asNumber(character.eyeHeight, `${path}.eyeHeight`, { min: 0.5, max: 1_000 });
  asNumber(character.elevation, `${path}.elevation`, { min: 0, max: 10_000 });
  asNumber(character.footprintCells, `${path}.footprintCells`, { min: 0.25, max: 8 });
  const sizeCategory = asString(character.sizeCategory, `${path}.sizeCategory`, false, 30);
  if (sizeCategory && !['minuscule', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(sizeCategory)) error(`${path}.sizeCategory`, '人物体型无效');
  if (character.mapId) asId(character.mapId, `${path}.mapId`);
  if (character.groupId) asId(character.groupId, `${path}.groupId`);
  asArray(character.resources, `${path}.resources`).forEach((resource, index) => {
    const itemPath = `${path}.resources[${index}]`;
    asObject(resource, itemPath);
    asString(resource.name, `${itemPath}.name`, true, 200);
    asNumber(resource.max, `${itemPath}.max`, { required: true, min: 0, max: 1e6 });
    asNumber(resource.value, `${itemPath}.value`, { required: true, min: -1e6, max: 1e6 });
    if (resource.resetType !== undefined && !['turn', 'short_rest', 'long_rest', 'none'].includes(resource.resetType)) error(`${itemPath}.resetType`, '未知恢复类型');
  });
  asArray(character.conditions, `${path}.conditions`).forEach((condition, index) => {
    const itemPath = `${path}.conditions[${index}]`;
    asObject(condition, itemPath);
    if (condition.id !== undefined) asId(condition.id, `${itemPath}.id`);
    asString(condition.name, `${itemPath}.name`, true, 200);
    if (condition.duration !== 'permanent') asNumber(condition.duration, `${itemPath}.duration`, { required: true, integer: true, min: 0, max: 100_000 });
  });
  if (character.stats !== undefined) {
    asObject(character.stats, `${path}.stats`);
    for (const [key, value] of Object.entries(character.stats)) asNumber(value, `${path}.stats.${key}`, { min: -1e6, max: 1e6 });
  }
  if (character.feats !== undefined) {
    asObject(character.feats, `${path}.feats`);
    for (const [key, value] of Object.entries(character.feats)) asString(value, `${path}.feats.${key}`, false, 20_000);
  }
}

function validateMap(map, path) {
  asObject(map, path);
  asId(map.id, `${path}.id`);
  asString(map.name, `${path}.name`, true, 500);
  asNumber(map.width, `${path}.width`, { required: true, min: 1, max: 2_000 });
  asNumber(map.height, `${path}.height`, { required: true, min: 1, max: 2_000 });
  asString(map.bgUrl, `${path}.bgUrl`, false, 3_000_000);
  if (map.blockedCells !== undefined) {
    asObject(map.blockedCells, `${path}.blockedCells`);
    for (const [key, value] of Object.entries(map.blockedCells)) {
      if (!/^-?\d+_-?\d+$/.test(key) || value !== true) error(`${path}.blockedCells.${key}`, '阻挡格格式无效');
    }
  }
  const terrains = asArray(map.terrainAreas, `${path}.terrainAreas`);
  terrains.forEach((terrain, index) => {
    const itemPath = `${path}.terrainAreas[${index}]`;
    asObject(terrain, itemPath);
    asId(terrain.id, `${itemPath}.id`);
    asString(terrain.name, `${itemPath}.name`, true, 500);
    if (!['rect', 'circle'].includes(terrain.type)) error(`${itemPath}.type`, '必须是 rect 或 circle');
    asNumber(terrain.gridX, `${itemPath}.gridX`, { required: true, min: -10_000, max: 10_000 });
    asNumber(terrain.gridY, `${itemPath}.gridY`, { required: true, min: -10_000, max: 10_000 });
    if (terrain.type === 'rect') {
      asNumber(terrain.width, `${itemPath}.width`, { required: true, min: 0.1, max: 10_000 });
      asNumber(terrain.height, `${itemPath}.height`, { required: true, min: 0.1, max: 10_000 });
    } else asNumber(terrain.radius, `${itemPath}.radius`, { required: true, min: 0.1, max: 10_000 });
    asBoolean(terrain.isSecret, `${itemPath}.isSecret`);
    asBoolean(terrain.isImpassable, `${itemPath}.isImpassable`);
    asBoolean(terrain.blocksVision, `${itemPath}.blocksVision`);
    asString(terrain.color, `${itemPath}.color`, false, 40);
    const customColor = asString(terrain.customColor, `${itemPath}.customColor`, false, 20);
    if (customColor && !/^#[0-9a-f]{6}$/i.test(customColor)) error(`${itemPath}.customColor`, '必须是六位十六进制颜色');
    const hazardLevel = asString(terrain.hazardLevel, `${itemPath}.hazardLevel`, false, 40);
    if (hazardLevel && !['none', 'fire', 'toxic', 'cold', 'difficult', 'arcane'].includes(hazardLevel)) error(`${itemPath}.hazardLevel`, '灾害级无效');
    const featureType = asString(terrain.featureType, `${itemPath}.featureType`, false, 40);
    if (featureType && !Object.hasOwn(TERRAIN_FEATURE_PRESETS, featureType)) error(`${itemPath}.featureType`, '构件类型无效');
    const featureState = asString(terrain.featureState, `${itemPath}.featureState`, false, 20);
    if (featureState && !['open', 'closed', 'ajar', 'locked', 'broken'].includes(featureState)) error(`${itemPath}.featureState`, '构件状态无效');
    const placement = asString(terrain.placement, `${itemPath}.placement`, false, 20);
    if (placement && !['area', 'edge'].includes(placement)) error(`${itemPath}.placement`, '构件放置类型无效');
    const orientation = asString(terrain.orientation, `${itemPath}.orientation`, false, 20);
    if (orientation && !['horizontal', 'vertical', 'free'].includes(orientation)) error(`${itemPath}.orientation`, '构件方向无效');
    if (placement === 'edge' && orientation === 'free') {
      asNumber(terrain.endX, `${itemPath}.endX`, { required: true, min: 0, max: 100_000 });
      asNumber(terrain.endY, `${itemPath}.endY`, { required: true, min: 0, max: 100_000 });
    }
    asNumber(terrain.length, `${itemPath}.length`, { min: 0.1, max: 10_000 });
    asNumber(terrain.thickness, `${itemPath}.thickness`, { min: 0.01, max: 100 });
    asNumber(terrain.baseHeight, `${itemPath}.baseHeight`, { min: 0, max: 10_000 });
    asNumber(terrain.obstacleHeight, `${itemPath}.obstacleHeight`, { min: 0, max: 10_000 });
    const movementMode = asString(terrain.movementMode, `${itemPath}.movementMode`, false, 30);
    if (movementMode && !['walkable', 'blocked', 'difficult', 'climbable'].includes(movementMode)) error(`${itemPath}.movementMode`, '穿越模式无效');
    const visionMode = asString(terrain.visionMode, `${itemPath}.visionMode`, false, 30);
    if (visionMode && !['transparent', 'partial', 'blocked', 'oneWay'].includes(visionMode)) error(`${itemPath}.visionMode`, '视野模式无效');
    const coverLevel = asString(terrain.coverLevel, `${itemPath}.coverLevel`, false, 30);
    if (coverLevel && !['none', 'half', 'threeQuarters', 'full'].includes(coverLevel)) error(`${itemPath}.coverLevel`, '掩体等级无效');
    asBoolean(terrain.transmitsLight, `${itemPath}.transmitsLight`);
    asBoolean(terrain.transmitsAttacks, `${itemPath}.transmitsAttacks`);
    asBoolean(terrain.destructible, `${itemPath}.destructible`);
    asBoolean(terrain.discoveredByParty, `${itemPath}.discoveredByParty`);
    asNumber(terrain.maxHp, `${itemPath}.maxHp`, { min: 1, max: 1_000_000 });
    asNumber(terrain.currentHp, `${itemPath}.currentHp`, { min: 0, max: 1_000_000 });
    asNumber(terrain.visionDirection, `${itemPath}.visionDirection`, { min: -3600, max: 3600 });
    asNumber(terrain.apertureAngle, `${itemPath}.apertureAngle`, { min: 5, max: 175 });
    asNumber(terrain.labelX, `${itemPath}.labelX`, { min: 0, max: 100_000 });
    asNumber(terrain.labelY, `${itemPath}.labelY`, { min: 0, max: 100_000 });
    asNumber(terrain.labelMaxWidth, `${itemPath}.labelMaxWidth`, { min: 4, max: 1000 });
    asBoolean(terrain.suppressLabel, `${itemPath}.suppressLabel`);
    asBoolean(terrain.suppressOutline, `${itemPath}.suppressOutline`);
    for (const key of ['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm']) {
      asString(terrain[key], `${itemPath}.${key}`, false, 2_000);
    }
  });
  uniqueIds(terrains, `${path}.terrainAreas`);
  const drawings = asArray(map.drawings, `${path}.drawings`);
  if (drawings.length > 500) error(`${path}.drawings`, '地图标注超过 500 笔限制');
  drawings.forEach((stroke, index) => {
    const itemPath = `${path}.drawings[${index}]`;
    asObject(stroke, itemPath);
    asId(stroke.id, `${itemPath}.id`);
    const color = asString(stroke.color, `${itemPath}.color`, true, 20);
    if (!/^#[0-9a-f]{6}$/i.test(color)) error(`${itemPath}.color`, '必须是六位十六进制颜色');
    asNumber(stroke.width, `${itemPath}.width`, { required: true, min: 1, max: 24 });
    const points = asArray(stroke.points, `${itemPath}.points`, true);
    if (!points.length || points.length > 2_000) error(`${itemPath}.points`, '每笔必须包含 1..2000 个点');
    points.forEach((point, pointIndex) => {
      const pointPath = `${itemPath}.points[${pointIndex}]`;
      asObject(point, pointPath);
      asNumber(point.x, `${pointPath}.x`, { required: true, min: 0, max: map.width });
      asNumber(point.y, `${pointPath}.y`, { required: true, min: 0, max: map.height });
    });
  });
  uniqueIds(drawings, `${path}.drawings`);
  if (map.vision !== undefined) {
    asObject(map.vision, `${path}.vision`);
    asBoolean(map.vision.enabled, `${path}.vision.enabled`);
    asBoolean(map.vision.rememberExplored, `${path}.vision.rememberExplored`);
    const publicMode = asString(map.vision.publicMode, `${path}.vision.publicMode`, false, 20);
    if (publicMode && !['player', 'bright', 'dark'].includes(publicMode)) error(`${path}.vision.publicMode`, '必须是 player、bright 或 dark');
    asNumber(map.vision.ceilingHeight, `${path}.vision.ceilingHeight`, { min: 1, max: 10_000 });
    asNumber(map.vision.visionRangeCap, `${path}.vision.visionRangeCap`, { min: 1, max: 180 });
    if (map.vision.exploredTerrainStates !== undefined) asObject(map.vision.exploredTerrainStates, `${path}.vision.exploredTerrainStates`);
    if (map.vision.memoryInitialCells !== undefined) asObject(map.vision.memoryInitialCells, `${path}.vision.memoryInitialCells`);
    if (map.vision.memoryInitialTerrainStates !== undefined) asObject(map.vision.memoryInitialTerrainStates, `${path}.vision.memoryInitialTerrainStates`);
    if (map.vision.memoryCurrentCells !== undefined) asObject(map.vision.memoryCurrentCells, `${path}.vision.memoryCurrentCells`);
    if (map.vision.memoryCurrentTerrainStates !== undefined) asObject(map.vision.memoryCurrentTerrainStates, `${path}.vision.memoryCurrentTerrainStates`);
    if (map.vision.manualVisibleCells !== undefined) asObject(map.vision.manualVisibleCells, `${path}.vision.manualVisibleCells`);
    if (map.vision.manualHiddenCells !== undefined) asObject(map.vision.manualHiddenCells, `${path}.vision.manualHiddenCells`);
  }
}

function validateNamedEntity(value, path, type) {
  asObject(value, path);
  if (type !== 'log' && type !== 'template') asId(value.id, `${path}.id`);
  if (type === 'log') {
    asString(value.type, `${path}.type`, false, 80);
    asString(value.content, `${path}.content`, true, 100_000);
    asString(value.timestamp, `${path}.timestamp`, false, 200);
    return;
  }
  asString(type === 'note' ? value.title : value.name ?? value.filename, `${path}.${type === 'note' ? 'title' : type === 'excel' ? 'filename' : 'name'}`, true, 1_000);
  if (type === 'item' || type === 'template') {
    asString(value.category, `${path}.category`, false, 200);
    asString(value.description, `${path}.description`, false, 50_000);
  }
  if (type === 'item') {
    asNumber(value.quantity, `${path}.quantity`, { min: 0, max: 1e6 });
    asString(value.ownerId, `${path}.ownerId`, false, 160);
  } else if (type === 'note') {
    asString(value.content, `${path}.content`, false, 1_000_000);
    for (const key of ['x', 'y', 'width', 'height']) asNumber(value[key], `${path}.${key}`, { min: -100_000, max: 100_000 });
  } else if (type === 'excel') {
    asString(value.fileData, `${path}.fileData`, true, 3_000_000);
    asNumber(value.sizeBytes, `${path}.sizeBytes`, { min: 0, max: 2 * 1024 * 1024 });
  }
}

export function migrateCampaign(value) {
  const source = asObject(value, 'campaign');
  const version = source.schemaVersion ?? 1;
  if (!Number.isInteger(version) || version < 1 || version > CURRENT_SCHEMA_VERSION) error('campaign.schemaVersion', `不支持版本 ${version}`);
  return {
    ...source,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    characters: source.characters ?? [], maps: source.maps ?? [], floatingNotes: source.floatingNotes ?? [],
    itemPool: source.itemPool ?? [], itemTemplates: source.itemTemplates ?? [], enemyBestiary: source.enemyBestiary ?? [], cutscenes: source.cutscenes ?? [], logs: source.logs ?? [],
    activeCutsceneId: source.activeCutsceneId ?? '', playerDisplayMode: source.playerDisplayMode === 'cutscene' ? 'cutscene' : 'map',
    excelCards: source.excelCards ?? [], groups: source.groups ?? [], combatParticipants: source.combatParticipants ?? [],
    combatTurnOrder: source.combatTurnOrder ?? [], customAttributeLabels: source.customAttributeLabels ?? {},
    isInCombat: source.isInCombat ?? false, combatRound: source.combatRound ?? 1, currentTurnIndex: source.currentTurnIndex ?? 0
  };
}

export function assertValidCampaign(campaign) {
  asObject(campaign, 'campaign');
  rejectDangerousKeys(campaign);
  asNumber(campaign.schemaVersion, 'campaign.schemaVersion', { required: true, integer: true, min: CURRENT_SCHEMA_VERSION, max: CURRENT_SCHEMA_VERSION });
  const characters = asArray(campaign.characters, 'campaign.characters', true);
  const maps = asArray(campaign.maps, 'campaign.maps', true);
  const notes = asArray(campaign.floatingNotes, 'campaign.floatingNotes', true);
  if (!maps.length) error('campaign.maps', '至少需要一张地图');
  characters.forEach((value, index) => validateCharacter(value, `campaign.characters[${index}]`));
  maps.forEach((value, index) => validateMap(value, `campaign.maps[${index}]`));
  notes.forEach((value, index) => validateNamedEntity(value, `campaign.floatingNotes[${index}]`, 'note'));
  const characterIds = uniqueIds(characters, 'campaign.characters');
  const mapIds = uniqueIds(maps, 'campaign.maps');
  uniqueIds(notes, 'campaign.floatingNotes');

  const groups = asArray(campaign.groups, 'campaign.groups');
  groups.forEach((value, index) => validateNamedEntity(value, `campaign.groups[${index}]`, 'group'));
  const groupIds = uniqueIds(groups, 'campaign.groups');
  const items = asArray(campaign.itemPool, 'campaign.itemPool');
  items.forEach((value, index) => validateNamedEntity(value, `campaign.itemPool[${index}]`, 'item'));
  uniqueIds(items, 'campaign.itemPool');
  asArray(campaign.itemTemplates, 'campaign.itemTemplates').forEach((value, index) => validateNamedEntity(value, `campaign.itemTemplates[${index}]`, 'template'));
  const enemies = asArray(campaign.enemyBestiary, 'campaign.enemyBestiary');
  enemies.forEach((value, index) => {
    validateNamedEntity(value, `campaign.enemyBestiary[${index}]`, 'enemy');
    asNumber(value.level, `campaign.enemyBestiary[${index}].level`, { integer: true, min: 1, max: 10 });
    asArray(value.skills, `campaign.enemyBestiary[${index}].skills`);
  });
  uniqueIds(enemies, 'campaign.enemyBestiary');
  const cutscenes = asArray(campaign.cutscenes, 'campaign.cutscenes');
  cutscenes.forEach((value, index) => {
    validateNamedEntity(value, `campaign.cutscenes[${index}]`, 'cutscene');
    asString(value.title, `campaign.cutscenes[${index}].title`, false, 500);
    asString(value.subtitle, `campaign.cutscenes[${index}].subtitle`, false, 1_000);
    asString(value.mediaUrl, `campaign.cutscenes[${index}].mediaUrl`, false, 8_000_000);
    asString(value.mediaType, `campaign.cutscenes[${index}].mediaType`, false, 20);
    asString(value.effect, `campaign.cutscenes[${index}].effect`, false, 30);
    asString(value.transition, `campaign.cutscenes[${index}].transition`, false, 30);
  });
  const cutsceneIds = uniqueIds(cutscenes, 'campaign.cutscenes');
  asArray(campaign.logs, 'campaign.logs').forEach((value, index) => validateNamedEntity(value, `campaign.logs[${index}]`, 'log'));
  const cards = asArray(campaign.excelCards, 'campaign.excelCards');
  cards.forEach((value, index) => validateNamedEntity(value, `campaign.excelCards[${index}]`, 'excel'));
  const cardIds = uniqueIds(cards, 'campaign.excelCards');

  if (campaign.activeMapId !== undefined && !mapIds.has(campaign.activeMapId)) error('campaign.activeMapId', '引用不存在的地图');
  if (campaign.activeExcelCardId && !cardIds.has(campaign.activeExcelCardId)) error('campaign.activeExcelCardId', '引用不存在的 Excel 卡片');
  if (campaign.activeCutsceneId && !cutsceneIds.has(campaign.activeCutsceneId)) error('campaign.activeCutsceneId', '引用不存在的过场');
  if (!['map', 'cutscene'].includes(campaign.playerDisplayMode)) error('campaign.playerDisplayMode', '未知玩家展示模式');
  characters.forEach((character, index) => {
    if (character.mapId && !mapIds.has(character.mapId)) error(`campaign.characters[${index}].mapId`, '引用不存在的地图');
    if (character.groupId && !groupIds.has(character.groupId)) error(`campaign.characters[${index}].groupId`, '引用不存在的分组');
  });
  items.forEach((item, index) => {
    if (item.ownerId && item.ownerId !== 'WORLD' && !characterIds.has(item.ownerId)) error(`campaign.itemPool[${index}].ownerId`, '引用不存在的角色');
  });
  const participantIds = new Set();
  asArray(campaign.combatParticipants, 'campaign.combatParticipants').forEach((value, index) => {
    asId(value, `campaign.combatParticipants[${index}]`);
    if (!characterIds.has(value)) error(`campaign.combatParticipants[${index}]`, '引用不存在的角色');
    if (participantIds.has(value)) error(`campaign.combatParticipants[${index}]`, '角色重复');
    participantIds.add(value);
  });
  const order = asArray(campaign.combatTurnOrder, 'campaign.combatTurnOrder');
  const orderIds = new Set();
  order.forEach((value, index) => {
    asObject(value, `campaign.combatTurnOrder[${index}]`);
    asId(value.id, `campaign.combatTurnOrder[${index}].id`);
    if (!characterIds.has(value.id)) error(`campaign.combatTurnOrder[${index}].id`, '引用不存在的角色');
    if (orderIds.has(value.id)) error(`campaign.combatTurnOrder[${index}].id`, '角色重复');
    orderIds.add(value.id);
    for (const key of ['roll', 'modifier', 'total']) asNumber(value[key], `campaign.combatTurnOrder[${index}].${key}`);
  });
  asBoolean(campaign.isInCombat, 'campaign.isInCombat');
  asNumber(campaign.combatRound, 'campaign.combatRound', { integer: true, min: 1, max: 1e6 });
  asNumber(campaign.currentTurnIndex, 'campaign.currentTurnIndex', { integer: true, min: 0, max: Math.max(0, order.length - 1) });
  asNumber(campaign.lastUpdated, 'campaign.lastUpdated', { min: 0, max: Number.MAX_SAFE_INTEGER });
  if (campaign.customAttributeLabels !== undefined) {
    asObject(campaign.customAttributeLabels, 'campaign.customAttributeLabels');
    for (const [key, value] of Object.entries(campaign.customAttributeLabels)) asString(value, `campaign.customAttributeLabels.${key}`, false, 300);
  }
  return campaign;
}

export function prepareCampaign(value) {
  const migrated = migrateCampaign(value);
  assertValidCampaign(migrated);
  return migrated;
}
