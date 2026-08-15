export const PRESENTATION_PROTOCOL = 'dmforge-presenter-v1';

export const DEFAULT_PRESENTATION_SETTINGS = Object.freeze({
  scene: 'battle',
  showInitiative: true,
  showCharacterPanel: true,
  showPublicEvents: true,
  showBlockedCells: true,
  hiddenCharacterIds: [],
  cameraMode: 'follow-active',
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
  const candidate = text(value, '');
  return /^(https?:|data:image\/|blob:)/i.test(candidate) ? candidate : '';
};

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

function publicCharacter(character) {
  const burnout = Array.isArray(character.conditions) && character.conditions.some(condition => condition?.id === 'burnout' || condition?.name === '斗气枯竭');
  return {
    id: text(character.id), name: text(character.name, '未命名角色'), type: character.type === 'PC' ? 'PC' : 'NPC',
    hp: number(character.hp), maxHp: Math.max(1, number(character.maxHp, 1)), tempHp: Math.max(0, number(character.tempHp)),
    ac: number(character.ac, 10) - (burnout ? 3 : 0), speed: Math.max(0, number(character.speed, 30)),
    combatSpeedRemaining: Math.max(0, number(character.combatSpeedRemaining, number(character.speed, 30))),
    combatStartGridX: number(character.combatStartGridX, number(character.gridX)),
    combatStartGridY: number(character.combatStartGridY, number(character.gridY)),
    gridX: number(character.gridX), gridY: number(character.gridY), mapId: text(character.mapId),
    resources: Array.isArray(character.resources) ? character.resources.map(publicResource) : [],
    conditions: Array.isArray(character.conditions) ? character.conditions.map(publicCondition) : []
  };
}

function publicTerrain(area) {
  const base = {
    id: text(area.id), name: text(area.name, '地形'), type: area.type === 'circle' ? 'circle' : 'rect',
    color: ['red', 'amber', 'blue', 'purple', 'emerald', 'green'].includes(area.color) ? area.color : 'purple',
    gridX: number(area.gridX), gridY: number(area.gridY), isImpassable: Boolean(area.isImpassable)
  };
  return area.type === 'circle'
    ? { ...base, radius: Math.max(0, number(area.radius)) }
    : { ...base, width: Math.max(1, number(area.width, 1)), height: Math.max(1, number(area.height, 1)) };
}

function publicMap(map, settings) {
  return {
    id: text(map.id), name: text(map.name, '战术地图'), width: Math.max(1, number(map.width, 60)),
    height: Math.max(1, number(map.height, 40)), bgUrl: publicUrl(map.bgUrl),
    blockedCells: settings.showBlockedCells === true ? Object.fromEntries(Object.entries(map.blockedCells || {}).filter(([, blocked]) => blocked === true).slice(0, 20_000)) : {},
    terrainAreas: (map.terrainAreas || []).filter(area => area && !area.isSecret).map(publicTerrain)
  };
}

export function normalizePresentationSettings(value = {}) {
  const scene = ['map', 'battle', 'party', 'story', 'pause'].includes(value.scene) ? value.scene : DEFAULT_PRESENTATION_SETTINGS.scene;
  const cameraMode = ['follow-dm', 'follow-active', 'independent'].includes(value.cameraMode) ? value.cameraMode : DEFAULT_PRESENTATION_SETTINGS.cameraMode;
  return {
    ...DEFAULT_PRESENTATION_SETTINGS,
    scene, cameraMode,
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
  const map = (campaign.maps || []).find(item => item.id === campaign.activeMapId) || campaign.maps?.[0];
  const publicCharacters = (campaign.characters || [])
    .filter(character => character && character.presentationVisible !== false && character.isHidden !== true && !normalized.hiddenCharacterIds.includes(character.id))
    .map(publicCharacter);
  const publicIds = new Set(publicCharacters.map(character => character.id));
  const order = (campaign.combatTurnOrder || []).filter(entry => publicIds.has(entry.id)).map(entry => ({
    id: text(entry.id), roll: number(entry.roll), modifier: number(entry.modifier), total: number(entry.total)
  }));
  const publicEvents = normalized.showPublicEvents
    ? (campaign.logs || []).filter(log => log?.visibility === 'public').slice(0, 6).map(log => ({ type: text(log.type), content: text(log.content, '').replace(/\*\*/g, ''), timestamp: text(log.timestamp) }))
    : [];
  return {
    protocol: PRESENTATION_PROTOCOL,
    generatedAt: Date.now(),
    settings: normalized,
    camera: { scale: Math.min(4, Math.max(.2, number(camera.scale, 1))), x: number(camera.x), y: number(camera.y) },
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
      map: map ? publicMap(map, normalized) : null,
      maps: (campaign.maps || []).map(item => publicMap(item, normalized)),
      activeMapId: map?.id || '',
      characters: publicCharacters,
      isInCombat: Boolean(campaign.isInCombat), combatRound: Math.max(1, number(campaign.combatRound, 1)),
      currentTurnIndex: Math.max(0, number(campaign.currentTurnIndex)), combatTurnOrder: order,
      publicEvents
    }
  };
}
