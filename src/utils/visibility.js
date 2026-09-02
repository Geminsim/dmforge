import {
  getTerrainSpatialIndex, segmentsIntersect, terrainAreasAtCell, terrainBlocksVision,
  terrainEdgeSegment, terrainEdgesBetween, viewerEyeHeight
} from './terrainRules.js';
import { clampCharacterCenterToMap } from './characterGeometry.js';

const keyOf = (x, y) => `${x}_${y}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const visibilityCache = new WeakMap();
const lightMapCache = new WeakMap();

export const DEFAULT_MAP_VISION = Object.freeze({
  ambientLight: 'bright', ceilingHeight: 10, visionRangeCap: 180, enabled: false,
  publicMode: 'player', rememberExplored: true, exploredCells: {}, exploredTerrainStates: {},
  memoryInitialCells: {}, memoryInitialTerrainStates: {}, memoryCurrentCells: {}, memoryCurrentTerrainStates: {},
  manualVisibleCells: {}, manualHiddenCells: {}, visionBlockers: {}, lightSources: []
});
export const DEFAULT_CHARACTER_VISION = Object.freeze({ darkvision: 0, normalVisionLimit: 180, sharedWithParty: true });

export function normalizeMapVision(map) {
  const source = map?.vision || {};
  return {
    ...DEFAULT_MAP_VISION,
    ...source,
    publicMode: ['player', 'bright', 'dark'].includes(source.publicMode) ? source.publicMode : 'player',
    rememberExplored: source.rememberExplored !== false,
    exploredCells: { ...(source.exploredCells || {}) },
    exploredTerrainStates: { ...(source.exploredTerrainStates || {}) },
    memoryInitialCells: { ...(source.memoryInitialCells || {}) },
    memoryInitialTerrainStates: { ...(source.memoryInitialTerrainStates || {}) },
    memoryCurrentCells: { ...(source.memoryCurrentCells || {}) },
    memoryCurrentTerrainStates: { ...(source.memoryCurrentTerrainStates || {}) },
    manualVisibleCells: { ...(source.manualVisibleCells || {}) },
    manualHiddenCells: { ...(source.manualHiddenCells || {}) },
    visionBlockers: { ...(source.visionBlockers || {}) },
    lightSources: Array.isArray(source.lightSources) ? source.lightSources : []
  };
}

export function blocksVision(map, x, y, options = {}) {
  const key = keyOf(x, y);
  const visionBlockers = map?.vision?.visionBlockers || {};
  if (visionBlockers[key] === false) return false; // glass/waist-high obstacle override
  if (visionBlockers[key] === true || map?.blockedCells?.[key] === true) return true;
  const spatialIndex = options.spatialIndex || getTerrainSpatialIndex(map);
  return terrainAreasAtCell(map, x, y, spatialIndex).some(area => terrainBlocksVision(area, options));
}

export function cellInArea(x, y, area) {
  if (area.type === 'circle') return Math.hypot(x - area.gridX, y - area.gridY) <= Number(area.radius || 0);
  return x >= Number(area.gridX || 0) && x < Number(area.gridX || 0) + Number(area.width || 0)
    && y >= Number(area.gridY || 0) && y < Number(area.gridY || 0) + Number(area.height || 0);
}

// Supercover traversal prevents diagonal peeking through wall corners.
function edgeBlocksLine(map, fromX, fromY, toX, toY, options) {
  const ray = { x1: fromX + 0.5, y1: fromY + 0.5, x2: toX + 0.5, y2: toY + 0.5 };
  const spatialIndex = options.spatialIndex || getTerrainSpatialIndex(map);
  for (const area of spatialIndex.edgeAreas || terrainEdgesBetween(map, fromX, fromY, toX, toY, spatialIndex)) {
    const edge = terrainEdgeSegment(area);
    if (edge && terrainBlocksVision(area, { ...options, fromX, fromY, toX, toY }) && segmentsIntersect(edge, ray)) return true;
  }
  return false;
}

export function hasLineOfSight(map, fromX, fromY, toX, toY, options = {}) {
  if (edgeBlocksLine(map, fromX, fromY, toX, toY, options)) return false;
  let x = fromX;
  let y = fromY;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const nx = Math.abs(dx);
  const ny = Math.abs(dy);
  const signX = dx > 0 ? 1 : -1;
  const signY = dy > 0 ? 1 : -1;
  let ix = 0;
  let iy = 0;
  while (ix < nx || iy < ny) {
    const left = (1 + 2 * ix) * ny;
    const right = (1 + 2 * iy) * nx;
    if (left === right) {
      const sideA = { x: x + signX, y };
      const sideB = { x, y: y + signY };
      x += signX;
      y += signY;
      ix += 1;
      iy += 1;
      if ((sideA.x !== toX || sideA.y !== toY) && (sideB.x !== toX || sideB.y !== toY)
        && blocksVision(map, sideA.x, sideA.y, options) && blocksVision(map, sideB.x, sideB.y, options)) return false;
    } else if (left < right) {
      x += signX;
      ix += 1;
    } else {
      y += signY;
      iy += 1;
    }
    if (x === toX && y === toY) return true; // the face of a wall remains visible
    if (blocksVision(map, x, y, options)) return false;
  }
  return true;
}

const FOV_OCTANTS = [
  [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
  [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1]
];

// Recursive shadowcasting visits each candidate cell roughly once. Area
// blockers cast shadows here; edge features are filtered by exact segment
// intersection afterwards, preserving doors/windows/free-angle walls.
function visibleCellsFromOrigin(map, originX, originY, radius, options) {
  originX = Math.round(originX);
  originY = Math.round(originY);
  const result = new Set([keyOf(originX, originY)]);
  const spatialIndex = options.spatialIndex || getTerrainSpatialIndex(map);
  const isOpaque = (x, y) => x < 0 || y < 0 || x >= Number(map.width || 0) || y >= Number(map.height || 0)
    || blocksVision(map, x, y, { ...options, spatialIndex });
  const cast = (row, startSlope, endSlope, xx, xy, yx, yy) => {
    if (startSlope < endSlope) return;
    let nextStart = startSlope;
    for (let distance = row; distance <= radius; distance += 1) {
      let blocked = false;
      let deltaY = -distance;
      for (let deltaX = -distance; deltaX <= 0; deltaX += 1) {
        const leftSlope = (deltaX - 0.5) / (deltaY + 0.5);
        const rightSlope = (deltaX + 0.5) / (deltaY - 0.5);
        if (startSlope < rightSlope) continue;
        if (endSlope > leftSlope) break;
        const x = originX + deltaX * xx + deltaY * xy;
        const y = originY + deltaX * yx + deltaY * yy;
        if (x >= 0 && y >= 0 && x < Number(map.width || 0) && y < Number(map.height || 0)
          && Math.hypot(x - originX, y - originY) <= radius) result.add(keyOf(x, y));
        const opaque = isOpaque(x, y);
        if (blocked) {
          if (opaque) nextStart = rightSlope;
          else { blocked = false; startSlope = nextStart; }
        } else if (opaque && distance < radius) {
          blocked = true;
          cast(distance + 1, startSlope, leftSlope, xx, xy, yx, yy);
          nextStart = rightSlope;
        }
      }
      if (blocked) break;
    }
  };
  for (const [xx, xy, yx, yy] of FOV_OCTANTS) cast(1, 1, 0, xx, xy, yx, yy);
  for (const key of [...result]) {
    const [x, y] = key.split('_').map(Number);
    if (x === originX && y === originY) continue;
    if (edgeBlocksLine(map, originX, originY, x, y, { ...options, spatialIndex })) result.delete(key);
  }
  return result;
}

function angleDelta(a, b) {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function sourceReaches(source, x, y) {
  const dx = x - Number(source.x || 0);
  const dy = y - Number(source.y || 0);
  const distance = Math.hypot(dx, dy);
  const totalRange = Number(source.brightRange || 0) + Number(source.dimRange || 0);
  if (distance > totalRange) return 0;
  if (source.shape === 'cone') {
    const direction = Number(source.direction || 0);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    if (angleDelta(angle, direction) > Number(source.angle || 60) / 2) return 0;
  }
  return distance <= Number(source.brightRange || 0) ? 2 : 1;
}

export function collectLightSources(map, characters = []) {
  const fixed = normalizeMapVision(map).lightSources.filter(source => source?.enabled !== false);
  const carried = characters.flatMap(character => {
    const source = character.lightSource;
    if (!source?.enabled) return [];
    return [{ ...source, id: source.id || `character-light-${character.id}`, x: character.gridX, y: character.gridY, height: source.height ?? viewerEyeHeight(character), direction: character.facing ?? source.direction ?? 0 }];
  });
  return [...fixed, ...carried];
}

export function lightLevelAt(map, x, y, sources) {
  const ambient = map?.vision?.ambientLight || 'bright';
  let level = ambient === 'bright' ? 2 : ambient === 'dim' ? 1 : 0;
  for (const source of sources) {
    const sourceLevel = sourceReaches(source, x, y);
    if (sourceLevel > level && hasLineOfSight(map, Number(source.x || 0), Number(source.y || 0), x, y, { purpose: 'light', eyeHeight: Number(source.height || 5) })) level = sourceLevel;
    if (level === 2) break;
  }
  return level;
}

export function isHiddenCharacter(character, viewerIds = []) {
  if (character?.revealedToParty === true || (character?.detectedBy || []).some(id => viewerIds.includes(id))) return false;
  if (character?.isHidden === true || character?.visibility === 'hidden' || character?.visibility === 'invisible') return true;
  return (character?.conditions || []).some(condition => ['隐身', '隐藏', 'invisible', 'hidden'].includes(String(condition.id || condition.name || '').toLowerCase()));
}

function visionOrigins(character, width, height) {
  const center = clampCharacterCenterToMap(character.gridX, character.gridY, { footprintCells: 1 }, width, height);
  return [{ x: center.x, y: center.y }];
}

export function computeVisibility({ map, characters = [], viewerIds, previewPosition, isInCombat = false, combatTurnOrder = [], ignorePublicMode = false }) {
  const width = Number(map?.width || 0);
  const height = Number(map?.height || 0);
  const vision = normalizeMapVision(map);
  const publicMode = vision.enabled === false ? 'bright' : ignorePublicMode ? 'player' : vision.publicMode;
  const spatialIndex = getTerrainSpatialIndex(map);
  const cacheOwner = Array.isArray(map?.terrainAreas) ? map.terrainAreas : null;
  const fingerprint = JSON.stringify({
    width, height,
    vision: {
      enabled: vision.enabled, ambientLight: vision.ambientLight, ceilingHeight: vision.ceilingHeight,
      visionRangeCap: vision.visionRangeCap, publicMode: vision.publicMode, rememberExplored: vision.rememberExplored,
      manualVisibleCells: vision.manualVisibleCells, manualHiddenCells: vision.manualHiddenCells,
      blockers: map?.vision?.visionBlockers || {}, lights: vision.lightSources
    },
    blockedCells: map?.blockedCells || {}, viewerIds: viewerIds || [], previewPosition: previewPosition || null,
    isInCombat, ignorePublicMode, combatTurnOrder: combatTurnOrder.map(entry => typeof entry === 'string' ? entry : entry?.id),
    characters: characters.map(character => ({
      id: character.id, mapId: character.mapId, type: character.type, x: character.gridX, y: character.gridY,
      footprintWidth: character.footprintWidth, footprintHeight: character.footprintHeight,
      footprintCells: character.footprintCells, sizeCategory: character.sizeCategory,
      elevation: character.elevation, eyeHeight: character.eyeHeight, facing: character.facing,
      vision: character.vision, lightSource: character.lightSource, isHidden: character.isHidden,
      visibility: character.visibility, revealedToParty: character.revealedToParty,
      detectedBy: character.detectedBy, conditions: character.conditions
    }))
  });
  const cache = cacheOwner ? visibilityCache.get(cacheOwner) : null;
  const cached = cache?.get(fingerprint);
  if (cached) {
    const explored = vision.rememberExplored && publicMode !== 'dark'
      ? new Set(Object.keys(vision.exploredCells || {}).filter(key => vision.exploredCells[key]))
      : new Set();
    cached.visible.forEach(key => explored.add(key));
    for (const key of Object.keys(vision.manualHiddenCells || {})) explored.delete(key);
    return { ...cached, explored };
  }
  const viewers = characters.filter(character => (!character.mapId || character.mapId === map?.id) && character.type === 'PC'
    && (!viewerIds?.length || viewerIds.includes(character.id)));
  const positioned = viewers.map(character => character.id === previewPosition?.id
    ? { ...character, gridX: previewPosition.x, gridY: previewPosition.y }
    : character);
  const sources = collectLightSources(map, characters.map(character => character.id === previewPosition?.id
    ? { ...character, gridX: previewPosition.x, gridY: previewPosition.y }
    : character));
  const visible = new Set();
  const bright = new Set();
  const dim = new Set();
  const ambientLevel = vision.ambientLight === 'bright' ? 2 : vision.ambientLight === 'dim' ? 1 : 0;
  const lightFingerprint = JSON.stringify({ ambientLevel, sources });
  let lightCache = cacheOwner ? lightMapCache.get(cacheOwner) : null;
  let lightLevels = lightCache?.get(lightFingerprint);
  if (!lightLevels) lightLevels = new Map();
  // Only visit cells inside actual light radii. The old implementation traced a
  // ray from every source to every map cell, including cells the source could
  // never reach.
  if (!lightCache?.has(lightFingerprint) && ambientLevel < 2) for (const source of sources) {
    const range = Math.max(0, Number(source.brightRange || 0) + Number(source.dimRange || 0));
    const sourceX = Number(source.x || 0);
    const sourceY = Number(source.y || 0);
    const minX = Math.max(0, Math.floor(sourceX - range));
    const maxX = Math.min(width - 1, Math.ceil(sourceX + range));
    const minY = Math.max(0, Math.floor(sourceY - range));
    const maxY = Math.min(height - 1, Math.ceil(sourceY + range));
    const sourceVisible = visibleCellsFromOrigin(map, sourceX, sourceY, range, {
      purpose: 'light', eyeHeight: Number(source.height || 5), spatialIndex
    });
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
      const level = sourceReaches(source, x, y);
      if (level <= ambientLevel || level <= (lightLevels.get(keyOf(x, y)) || ambientLevel)) continue;
      if (sourceVisible.has(keyOf(x, y))) {
        lightLevels.set(keyOf(x, y), level);
      }
    }
  }
  if (cacheOwner && !lightCache?.has(lightFingerprint)) {
    lightCache ||= new Map();
    if (lightCache.size >= 8) lightCache.delete(lightCache.keys().next().value);
    lightCache.set(lightFingerprint, lightLevels);
    lightMapCache.set(cacheOwner, lightCache);
  }

  if (vision.enabled !== false) {
    for (const viewer of positioned) {
      const viewerVision = { ...DEFAULT_CHARACTER_VISION, ...(viewer.vision || {}) };
      const configuredRange = Math.max(Number(viewerVision.normalVisionLimit || 180), Number(viewerVision.darkvision || 0));
      const maxRange = Math.min(180, Math.max(1, Number(vision.visionRangeCap || 180)), configuredRange);
      const eyeHeight = Math.min(viewerEyeHeight(viewer), Math.max(1, Number(vision.ceilingHeight || 10)));
      for (const origin of visionOrigins(viewer, width, height)) {
        const minX = Math.max(0, Math.floor(origin.x - maxRange));
        const maxX = Math.min(width - 1, Math.ceil(origin.x + maxRange));
        const minY = Math.max(0, Math.floor(origin.y - maxRange));
        const maxY = Math.min(height - 1, Math.ceil(origin.y + maxRange));
        const originVisible = visibleCellsFromOrigin(map, origin.x, origin.y, maxRange, { eyeHeight, spatialIndex });
        for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
          const distance = Math.hypot(x - origin.x, y - origin.y);
          if (distance > maxRange || !originVisible.has(keyOf(x, y))) continue;
          let level = lightLevels.get(keyOf(x, y)) ?? ambientLevel;
          const darkvision = Number(viewerVision.darkvision || 0);
          if (level === 0 && darkvision > 0 && distance <= darkvision) level = 1;
          if (level > 0) {
            const key = keyOf(x, y);
            visible.add(key);
            (level === 2 ? bright : dim).add(key);
          }
        }
      }
    }
  } else {
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { visible.add(keyOf(x, y)); bright.add(keyOf(x, y)); }
  }

  if (publicMode === 'bright') {
    visible.clear(); bright.clear(); dim.clear();
    for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
      const key = keyOf(x, y);
      visible.add(key);
      bright.add(key);
    }
  } else if (publicMode === 'dark') {
    visible.clear(); bright.clear(); dim.clear();
  }

  for (const key of Object.keys(vision.manualVisibleCells || {})) {
    if (!vision.manualVisibleCells[key]) continue;
    const [x, y] = key.split('_').map(Number);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= width || y >= height) continue;
    visible.add(key);
    bright.add(key);
    dim.delete(key);
  }
  for (const key of Object.keys(vision.manualHiddenCells || {})) {
    if (!vision.manualHiddenCells[key]) continue;
    visible.delete(key);
    bright.delete(key);
    dim.delete(key);
  }

  const explored = vision.rememberExplored && publicMode !== 'dark'
    ? new Set(Object.keys(vision.exploredCells || {}).filter(key => vision.exploredCells[key]))
    : new Set();
  visible.forEach(key => explored.add(key));
  for (const key of Object.keys(vision.manualHiddenCells || {})) explored.delete(key);
  const combatIds = new Set(combatTurnOrder.map(entry => typeof entry === 'string' ? entry : entry?.id));
  const visibleCharacterIds = new Set(characters.filter(character => {
    if ((character.mapId && character.mapId !== map?.id) || isHiddenCharacter(character, positioned.map(viewer => viewer.id))) return false;
    const characterCell = keyOf(character.gridX || 0, character.gridY || 0);
    if (vision.manualHiddenCells?.[characterCell]) return false;
    if (publicMode === 'dark') return visible.has(characterCell);
    if (character.type === 'PC') return true;
    if (visible.has(characterCell)) return true;
    return isInCombat && combatIds.has(character.id);
  }).map(character => character.id));
  const sensedCombatIds = new Set(characters.filter(character => visibleCharacterIds.has(character.id)
    && isInCombat && combatIds.has(character.id)
    && !visible.has(keyOf(character.gridX || 0, character.gridY || 0))).map(character => character.id));
  const result = { visible, bright, dim, explored, visibleCharacterIds, sensedCombatIds };
  if (cacheOwner) {
    const targetCache = cache || new Map();
    if (targetCache.size >= 24) targetCache.delete(targetCache.keys().next().value);
    targetCache.set(fingerprint, { visible, bright, dim, visibleCharacterIds, sensedCombatIds });
    if (!cache) visibilityCache.set(cacheOwner, targetCache);
  }
  return result;
}

export function serializeCells(cells) {
  return Object.fromEntries([...cells].map(key => [key, true]));
}

export function mergeExploredCells(existing = {}, visible = []) {
  const merged = { ...existing };
  for (const key of visible) merged[key] = true;
  return merged;
}

export function revealRectCells(existing = {}, selection, width, height) {
  const revealed = { ...existing };
  if (!selection) return revealed;
  const minX = clamp(Math.min(selection.startX, selection.endX), 0, Math.max(0, width - 1));
  const maxX = clamp(Math.max(selection.startX, selection.endX), 0, Math.max(0, width - 1));
  const minY = clamp(Math.min(selection.startY, selection.endY), 0, Math.max(0, height - 1));
  const maxY = clamp(Math.max(selection.startY, selection.endY), 0, Math.max(0, height - 1));
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) revealed[keyOf(x, y)] = true;
  return revealed;
}

export function removeRectCells(existing = {}, selection, width, height) {
  const remaining = { ...existing };
  if (!selection) return remaining;
  const minX = clamp(Math.min(selection.startX, selection.endX), 0, Math.max(0, width - 1));
  const maxX = clamp(Math.max(selection.startX, selection.endX), 0, Math.max(0, width - 1));
  const minY = clamp(Math.min(selection.startY, selection.endY), 0, Math.max(0, height - 1));
  const maxY = clamp(Math.max(selection.startY, selection.endY), 0, Math.max(0, height - 1));
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) delete remaining[keyOf(x, y)];
  return remaining;
}

export function visionSelectionCells(selection, width, height) {
  const cells = new Set();
  if (!selection || width <= 0 || height <= 0) return cells;
  const shape = ['cell', 'rect', 'circle', 'cone'].includes(selection.shape) ? selection.shape : 'rect';
  const startX = clamp(Math.round(Number(selection.startX) || 0), 0, width - 1);
  const startY = clamp(Math.round(Number(selection.startY) || 0), 0, height - 1);
  const endX = clamp(Math.round(Number(selection.endX) || 0), 0, width - 1);
  const endY = clamp(Math.round(Number(selection.endY) || 0), 0, height - 1);
  if (shape === 'cell') {
    cells.add(keyOf(startX, startY));
    return cells;
  }
  if (shape === 'rect') return new Set(Object.keys(revealRectCells({}, { startX, startY, endX, endY }, width, height)));

  const radius = Math.max(0.5, Math.hypot(endX - startX, endY - startY) + 0.5);
  const direction = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
  const coneAngle = clamp(Number(selection.angle) || 60, 15, 180);
  const minX = Math.max(0, Math.floor(startX - radius));
  const maxX = Math.min(width - 1, Math.ceil(startX + radius));
  const minY = Math.max(0, Math.floor(startY - radius));
  const maxY = Math.min(height - 1, Math.ceil(startY + radius));
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    const dx = x - startX;
    const dy = y - startY;
    const distance = Math.hypot(dx, dy);
    if (distance > radius) continue;
    if (shape === 'circle' || distance === 0 || angleDelta(Math.atan2(dy, dx) * 180 / Math.PI, direction) <= coneAngle / 2) cells.add(keyOf(x, y));
  }
  return cells;
}

export function mergeCellRecords(existing = {}, cells = []) {
  const merged = { ...existing };
  for (const key of cells) merged[key] = true;
  return merged;
}

export function removeCellRecords(existing = {}, cells = []) {
  const remaining = { ...existing };
  for (const key of cells) delete remaining[key];
  return remaining;
}
