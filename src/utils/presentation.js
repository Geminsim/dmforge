export const PRESENTATION_PROTOCOL = 'dmforge-presenter-v1';

import { publicCutscene } from './cutscenes.js';
import { computeVisibility, normalizeMapVision, serializeCells } from './visibility.js';
import { effectiveSpeed } from './inventoryRules.js';
import { TERRAIN_FEATURE_PRESETS, terrainBlocksVision, terrainCoverLevel, terrainMovementMode, terrainTouchesCells, terrainVisionMode } from './terrainRules.js';

export const DEFAULT_PRESENTATION_SETTINGS = Object.freeze({
  scene: 'battle',
  mapId: '',
  showInitiative: true,
  showCharacterPanel: true,
  showPublicEvents: true,
  showBlockedCells: true,
  hiddenCharacterIds: [],
  cameraMode: 'follow-dm',
  fontScale: 1,
  hideCursor: false,
  caption: '',
  storyTitle: '冒险仍在继续',
  storySubtitle: '',
  pausedMessage: '游戏暂停 · 请稍候',
  fullscreenRequest: 0
});

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const text = (value, fallback = '') => typeof value === 'string' ? value.slice(0, 500) : fallback;
const publicUrl = value => {
  const candidate = typeof value === 'string' && value.length <= 1_500_000 ? value : '';
  return /^(https?:|data:image\/|blob:)/i.test(candidate) ? candidate : '';
};

function revealMapForDirector(map, visibility, characters) {
  const hasPlayerViewer = characters.some(character => character?.type === 'PC' && (!character.mapId || character.mapId === map.id));
  const vision = normalizeMapVision(map);
  if (hasPlayerViewer || vision.enabled === false || vision.publicMode !== 'player') return visibility;
  const all = new Set();
  for (let y = 0; y < Number(map.height || 0); y += 1) for (let x = 0; x < Number(map.width || 0); x += 1) all.add(`${x}_${y}`);
  return { ...visibility, visible: all, bright: all, dim: new Set(), explored: all };
}

function publicResource(resource) {
  return {
    id: text(resource?.id),
    name: text(resource?.name, '资源'),
    value: Math.max(0, number(resource?.value)),
    max: Math.max(0, number(resource?.max)),
    resetType: ['turn', 'short_rest', 'long_rest', 'shortRest', 'longRest', 'manual', 'none'].includes(resource?.resetType) ? resource.resetType : 'manual'
  };
}

function publicCondition(condition) {
  return {
    id: text(condition?.id),
    name: text(condition?.name, '状态'),
    duration: condition?.duration === 'permanent' ? 'permanent' : Math.max(0, number(condition?.duration)),
    color: ['red', 'amber', 'blue', 'purple', 'emerald'].includes(condition?.color) ? condition.color : 'amber'
  };
}

function publicCharacter(character, inventoryItems = []) {
  const burnout = Array.isArray(character.conditions) && character.conditions.some(condition => condition?.id === 'burnout' || condition?.name === '斗气枯竭');
  const base = {
    id: text(character.id), name: text(character.name, '未命名角色'), type: character.type === 'PC' ? 'PC' : 'NPC',
    class: text(character.class, '无职业'), subclass: text(character.subclass), level: Math.max(1, number(character.level, 1)),
    hp: number(character.hp), maxHp: Math.max(1, number(character.maxHp, 1)), tempHp: Math.max(0, number(character.tempHp)),
    ac: number(character.ac, 10) - (burnout ? 3 : 0), speed: effectiveSpeed(character),
    combatSpeedRemaining: Math.max(0, number(character.combatSpeedRemaining, effectiveSpeed(character))),
    combatStartGridX: number(character.combatStartGridX, number(character.gridX)),
    combatStartGridY: number(character.combatStartGridY, number(character.gridY)),
    eyeHeight: Math.max(0.5, number(character.eyeHeight, 5.5)), elevation: Math.max(0, number(character.elevation)),
    footprintCells: Math.max(0.25, Math.min(8, number(character.footprintCells, 1))),
    ...(['minuscule', 'tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(character.sizeCategory)
      ? { sizeCategory: character.sizeCategory } : {}),
    avatarImage: publicUrl(character.avatarImage || character.sheet?.avatarImage),
    portraitImage: publicUrl(character.portraitImage || character.sheet?.portraitImage),
    gridX: number(character.gridX), gridY: number(character.gridY), mapId: text(character.mapId),
    resources: Array.isArray(character.resources) ? character.resources.map(publicResource) : [],
    conditions: Array.isArray(character.conditions) ? character.conditions.map(publicCondition) : []
  };
  if (character.type !== 'PC') return base;
  const record = value => Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {}).slice(0, 100).map(([key, item]) => [text(key), typeof item === 'number' ? number(item) : text(item)]));
  const attacks = Array.isArray(character.sheet?.attacks) ? character.sheet.attacks.filter(attack => attack?.name).slice(0, 20).map(attack => ({
    name: text(attack.name), attackBonus: text(attack.attackBonus), diceCount: Math.max(0, number(attack.diceCount)),
    die: text(attack.die), fixedDamage: number(attack.fixedDamage), damageType: text(attack.damageType), description: text(attack.description)
  })) : [];
  return { ...base, details: {
    initiative: number(character.initiative), hitDice: text(character.hitDice), proficiencyBonus: number(character.proficiencyBonus),
    passivePerception: number(character.passivePerception), stats: record(character.stats), savingThrows: record(character.savingThrows),
    skillTotals: record(character.skillTotals), feats: record(character.feats), attacks,
    background: text(character.sheet?.background), gender: text(character.sheet?.gender), personality: text(character.sheet?.personality),
    inventory: text(character.sheet?.inventory), biography: text(character.sheet?.biography),
    items: inventoryItems.slice(0, 50).map(item => ({
      name: text(item.name, '未命名物品'), quantity: Math.max(0, number(item.quantity, 1)), category: text(item.category, '其他'),
      ...(item.weight != null ? { weight: Math.max(0, number(item.weight)) } : {}),
      ...(item.calories != null ? { calories: Math.max(0, number(item.calories)) } : {}),
      ...(item.effectValue ? { effectValue: text(item.effectValue) } : {}),
      ...(item.usage ? { usage: text(item.usage) } : {})
    }))
  } };
}

function publicTerrain(area) {
  const base = {
    id: text(area.id), name: text(area.name, '地形'), type: area.type === 'circle' ? 'circle' : 'rect',
    color: ['red', 'amber', 'blue', 'purple', 'emerald', 'green', 'custom'].includes(area.color) ? area.color : 'purple',
    gridX: number(area.gridX), gridY: number(area.gridY), isImpassable: Boolean(area.isImpassable),
    blocksVision: terrainBlocksVision(area),
    movementMode: terrainMovementMode(area), visionMode: terrainVisionMode(area), coverLevel: terrainCoverLevel(area),
    baseHeight: Math.max(0, number(area.baseHeight)), obstacleHeight: Math.max(0, number(area.obstacleHeight, 10)),
    transmitsLight: area.transmitsLight === true, transmitsAttacks: area.transmitsAttacks === true,
    ...(Number.isFinite(Number(area.labelX)) ? { labelX: number(area.labelX) } : {}),
    ...(Number.isFinite(Number(area.labelY)) ? { labelY: number(area.labelY) } : {}),
    ...(Number.isFinite(Number(area.labelMaxWidth)) ? { labelMaxWidth: Math.max(4, number(area.labelMaxWidth, 18)) } : {}),
    ...(area.suppressLabel === true ? { suppressLabel: true } : {}),
    ...(area.suppressOutline === true ? { suppressOutline: true } : {}),
    destructible: area.destructible === true,
    ...(area.destructible === true ? { currentHp: Math.max(0, number(area.currentHp)), maxHp: Math.max(1, number(area.maxHp, 1)) } : {}),
    ...(area.placement === 'edge' ? {
      placement: 'edge', orientation: ['horizontal', 'vertical', 'free'].includes(area.orientation) ? area.orientation : 'horizontal',
      length: Math.max(0.1, number(area.length, 1)), thickness: Math.max(0.05, number(area.thickness, 0.15)),
      ...(area.orientation === 'free' ? { endX: number(area.endX), endY: number(area.endY) } : {})
    } : { placement: 'area' }),
    ...(area.color === 'custom' && /^#[0-9a-f]{6}$/i.test(area.customColor || '') ? { customColor: area.customColor } : {}),
    ...(['none', 'fire', 'toxic', 'cold', 'difficult', 'arcane'].includes(area.hazardLevel) ? { hazardLevel: area.hazardLevel } : {}),
    ...(Object.hasOwn(TERRAIN_FEATURE_PRESETS, area.featureType) ? { featureType: area.featureType } : {}),
    ...(/^[a-z0-9-]{1,48}$/i.test(area.assetKey || '') ? { assetKey: area.assetKey } : {}),
    ...(/^[a-z][a-z0-9-]{0,31}$/i.test(area.visualState || '') ? { visualState: area.visualState } : {}),
    ...(['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm'].reduce((fields, key) => {
      if (typeof area[key] === 'string' && area[key].trim()) fields[key] = text(area[key]);
      return fields;
    }, {})),
    ...(['open', 'closed', 'ajar', 'locked', 'broken'].includes(area.featureState) ? { featureState: area.featureState } : {}),
    ...(area.featureState === 'ajar' ? { apertureAngle: Math.max(5, Math.min(175, number(area.apertureAngle, 70))) } : {})
  };
  return area.type === 'circle'
    ? { ...base, radius: Math.max(0, number(area.radius)) }
    : { ...base, width: Math.max(1, number(area.width, 1)), height: Math.max(1, number(area.height, 1)) };
}

function exploredTerrain(area, revealed) {
  return terrainTouchesCells(area, revealed);
}

function publicMap(map, settings, visibility = null) {
  const vision = normalizeMapVision(map);
  const revealed = visibility?.explored || new Set(Object.keys(vision.exploredCells || {}).filter(key => vision.exploredCells[key]));
  const visibleNow = visibility?.visible || new Set();
  const fogEnabled = vision.enabled !== false;
  const terrainAreas = (map.terrainAreas || []).flatMap(area => {
    if (!area || (area.isSecret && area.discoveredByParty !== true)) return [];
    if (!fogEnabled || terrainTouchesCells(area, visibleNow)) return [publicTerrain(area)];
    const remembered = vision.exploredTerrainStates?.[area.id];
    if (remembered) return [publicTerrain(remembered)];
    const dynamic = area.featureState || area.destructible === true;
    return !dynamic && exploredTerrain(area, revealed) ? [publicTerrain(area)] : [];
  });
  return {
    id: text(map.id), name: text(map.name, '战术地图'), width: Math.max(1, number(map.width, 60)),
    height: Math.max(1, number(map.height, 40)), bgUrl: publicUrl(map.bgUrl),
    backgroundScaleX: Math.max(50, Math.min(200, number(map.backgroundScaleX, 100))),
    backgroundScaleY: Math.max(50, Math.min(200, number(map.backgroundScaleY, 100))),
    backgroundPositionX: Math.max(0, Math.min(100, number(map.backgroundPositionX, 50))),
    backgroundPositionY: Math.max(0, Math.min(100, number(map.backgroundPositionY, 50))),
    blockedCells: settings.showBlockedCells === true ? Object.fromEntries(Object.entries(map.blockedCells || {}).filter(([key, blocked]) => blocked === true && (!fogEnabled || revealed.has(key))).slice(0, 20_000)) : {},
    terrainAreas,
    drawings: (map.drawings || []).slice(0, 500).map(stroke => ({
      id: text(stroke?.id),
      color: /^#[0-9a-f]{6}$/i.test(stroke?.color || '') ? stroke.color : '#f6c453',
      width: Math.max(1, Math.min(24, number(stroke?.width, 4))),
      points: (Array.isArray(stroke?.points) ? stroke.points : []).slice(0, 2_000).map(point => ({
        x: Math.max(0, Math.min(number(map.width, 60), number(point?.x))),
        y: Math.max(0, Math.min(number(map.height, 40), number(point?.y)))
      }))
    })).filter(stroke => stroke.id && stroke.points.length),
    vision: {
      enabled: fogEnabled,
      ambientLight: ['bright', 'dim', 'dark'].includes(vision.ambientLight) ? vision.ambientLight : 'bright',
      ceilingHeight: Math.max(1, number(vision.ceilingHeight, 10)),
      visionRangeCap: Math.min(180, Math.max(1, number(vision.visionRangeCap, 180))),
      publicMode: vision.publicMode,
      rememberExplored: vision.rememberExplored,
      visibleCells: visibility ? serializeCells(visibility.visible) : {},
      dimCells: visibility ? serializeCells(visibility.dim) : {},
      exploredCells: serializeCells(revealed)
    }
  };
}

export function normalizePresentationSettings(value = {}) {
  const scene = ['map', 'battle', 'party', 'story', 'pause'].includes(value.scene) ? value.scene : DEFAULT_PRESENTATION_SETTINGS.scene;
  const cameraMode = ['follow-dm', 'follow-active', 'independent'].includes(value.cameraMode) ? value.cameraMode : DEFAULT_PRESENTATION_SETTINGS.cameraMode;
  return {
    ...DEFAULT_PRESENTATION_SETTINGS,
    scene, cameraMode,
    mapId: text(value.mapId),
    showInitiative: value.showInitiative !== false,
    showCharacterPanel: value.showCharacterPanel !== false,
    showPublicEvents: value.showPublicEvents !== false,
    showBlockedCells: value.showBlockedCells !== false,
    hiddenCharacterIds: Array.isArray(value.hiddenCharacterIds) ? value.hiddenCharacterIds.filter(id => typeof id === 'string').slice(0, 10_000) : [],
    fontScale: Math.min(1.5, Math.max(.75, number(value.fontScale, 1))),
    hideCursor: Boolean(value.hideCursor),
    caption: text(value.caption), storyTitle: text(value.storyTitle, DEFAULT_PRESENTATION_SETTINGS.storyTitle),
    storySubtitle: text(value.storySubtitle), pausedMessage: text(value.pausedMessage, DEFAULT_PRESENTATION_SETTINGS.pausedMessage),
    fullscreenRequest: Math.max(0, number(value.fullscreenRequest))
  };
}

export function buildPublicPresentationSnapshot(campaign, settings, camera = {}, interaction = null) {
  const normalized = normalizePresentationSettings(settings);
  const campaignCharacters = campaign.characters || [];
  const maps = campaign.maps || [];
  const map = maps.find(item => item.id === normalized.mapId)
    || maps.find(item => item.id === campaign.activeMapId)
    || maps[0];
  const computedVisibility = map ? computeVisibility({
    // Token drag coordinates are a public movement preview, not a committed
    // observer position. Reveal fog only after the DM completes the drop.
    map, characters: campaignCharacters,
    isInCombat: Boolean(campaign.isInCombat), combatTurnOrder: campaign.combatTurnOrder || []
  }) : null;
  const visibility = map ? revealMapForDirector(map, computedVisibility, campaignCharacters) : null;
  const publicCharacters = campaignCharacters
    .filter(character => character && visibility?.visibleCharacterIds.has(character.id) && character.presentationVisible !== false && !normalized.hiddenCharacterIds.includes(character.id))
    .map(character => ({
      ...publicCharacter(character, (campaign.itemPool || []).filter(item => item?.ownerId === character.id && number(item.quantity, 0) > 0)),
      combatSensed: visibility.sensedCombatIds.has(character.id)
    }));
  const publicIds = new Set(publicCharacters.map(character => character.id));
  const order = (campaign.combatTurnOrder || []).filter(entry => publicIds.has(entry.id)).map(entry => ({
    id: text(entry.id), roll: number(entry.roll), modifier: number(entry.modifier), total: number(entry.total)
  }));
  const hiddenNames = campaignCharacters.filter(character => !publicIds.has(character.id)).map(character => character.name).filter(Boolean);
  const publicEvents = normalized.showPublicEvents
    ? (campaign.logs || []).filter(log => {
      if (!log || log.visibility === 'private') return false;
      if (log.visibility !== 'public' && !['COMBAT', 'DICE'].includes(log.type)) return false;
      return !hiddenNames.some(name => String(log.content || '').includes(name));
    }).slice(0, 12).map(log => ({ type: text(log.type), content: text(log.content, '').replace(/\*\*/g, ''), timestamp: text(log.timestamp) }))
    : [];
  const activeCutscene = (campaign.cutscenes || []).find(scene => scene?.id === campaign.activeCutsceneId) || null;
  return {
    protocol: PRESENTATION_PROTOCOL,
    generatedAt: Date.now(),
    settings: normalized,
    camera: {
      scale: Math.min(4, Math.max(.2, number(camera.scale, 1))), x: number(camera.x), y: number(camera.y),
      centerX: Number.isFinite(Number(camera.centerX)) ? number(camera.centerX) : null,
      centerY: Number.isFinite(Number(camera.centerY)) ? number(camera.centerY) : null
    },
    interaction: interaction?.draggedToken && interaction?.dragHoverCoords && publicIds.has(interaction.draggedToken.id) ? {
      draggedToken: {
        id: text(interaction.draggedToken.id),
        startX: number(interaction.draggedToken.startX), startY: number(interaction.draggedToken.startY),
        name: text(interaction.draggedToken.name, '角色')
      },
      dragHoverCoords: { x: number(interaction.dragHoverCoords.x), y: number(interaction.dragHoverCoords.y) },
      isForced: Boolean(interaction.isForced)
    } : null,
    campaign: {
      map: map ? publicMap(map, normalized, visibility) : null,
      // Only the selected map needs a live FOV calculation. Other maps keep
      // their persisted exploration memory and are recalculated when selected.
      maps: (campaign.maps || []).map(item => publicMap(item, normalized, item.id === map?.id ? visibility : null)),
      activeMapId: map?.id || '',
      characters: publicCharacters,
      isInCombat: Boolean(campaign.isInCombat), combatRound: Math.max(1, number(campaign.combatRound, 1)),
      currentTurnIndex: Math.max(0, number(campaign.currentTurnIndex)), combatTurnOrder: order,
      publicEvents,
      cutscene: publicCutscene(activeCutscene),
      playerDisplayMode: campaign.playerDisplayMode === 'cutscene' ? 'cutscene' : 'map'
    }
  };
}
