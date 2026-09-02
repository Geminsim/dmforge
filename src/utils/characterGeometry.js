export const CHARACTER_SIZE_OPTIONS = Object.freeze([
  { value: 'minuscule', label: '超微型（0.25 格）', footprint: 0.25 },
  { value: 'tiny', label: '微型（0.5 格）', footprint: 0.5 },
  { value: 'small', label: '小型（0.75 格）', footprint: 0.75 },
  { value: 'medium', label: '标准（1 格）', footprint: 1 },
  // Centre-anchored tokens use odd whole-cell spans so their occupied cells
  // remain symmetric around the selected centre grid.
  { value: 'large', label: '大型（3 格）', footprint: 3 },
  { value: 'huge', label: '巨型（5 格）', footprint: 5 },
  { value: 'gargantuan', label: '超巨型（7 格）', footprint: 7 }
]);

const sizeById = new Map(CHARACTER_SIZE_OPTIONS.map(option => [option.value, option]));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function characterFootprintCells(character = {}) {
  const configured = sizeById.get(character.sizeCategory)?.footprint;
  const legacyFootprint = Math.max(Number(character.footprintWidth || 0), Number(character.footprintHeight || 0));
  return clamp(Number(configured ?? character.footprintCells ?? (legacyFootprint || 1)) || 1, 0.25, 8);
}

export function characterCenter(character = {}) {
  return {
    x: Number(character.gridX || 0) + 0.5,
    y: Number(character.gridY || 0) + 0.5
  };
}

/** Grid cells whose open area overlaps a centre-anchored square footprint. */
export function footprintCoveredCells(gridX, gridY, character = {}) {
  const size = characterFootprintCells(character);
  const centerX = Number(gridX || 0) + 0.5;
  const centerY = Number(gridY || 0) + 0.5;
  const half = size / 2;
  const epsilon = 1e-7;
  const minX = Math.floor(centerX - half + epsilon);
  const maxX = Math.ceil(centerX + half - epsilon) - 1;
  const minY = Math.floor(centerY - half + epsilon);
  const maxY = Math.ceil(centerY + half - epsilon) - 1;
  const cells = [];
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) cells.push({ x, y });
  return cells;
}

/** Sample centre and corners when sweeping a large token across edge walls. */
export function footprintSweepOffsets(character = {}) {
  const half = characterFootprintCells(character) / 2;
  if (half <= 0.5) return [{ x: 0, y: 0 }];
  const edge = Math.max(0, half - 0.05);
  return [
    { x: 0, y: 0 },
    { x: -edge, y: -edge }, { x: edge, y: -edge },
    { x: -edge, y: edge }, { x: edge, y: edge }
  ];
}

export function clampCharacterCenterToMap(gridX, gridY, character, mapWidth, mapHeight) {
  const half = characterFootprintCells(character) / 2;
  const minX = Math.ceil(half - 0.5);
  const minY = Math.ceil(half - 0.5);
  const maxX = Math.floor(Number(mapWidth || 1) - half - 0.5);
  const maxY = Math.floor(Number(mapHeight || 1) - half - 0.5);
  return {
    x: clamp(Math.round(Number(gridX || 0)), Math.min(minX, maxX), Math.max(minX, maxX)),
    y: clamp(Math.round(Number(gridY || 0)), Math.min(minY, maxY), Math.max(minY, maxY))
  };
}

export function sizeCategoryForFootprint(value) {
  const footprint = Number(value || 1);
  return CHARACTER_SIZE_OPTIONS.reduce((best, option) => (
    Math.abs(option.footprint - footprint) < Math.abs(best.footprint - footprint) ? option : best
  ), CHARACTER_SIZE_OPTIONS[3]).value;
}
