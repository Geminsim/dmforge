import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVisibility, hasLineOfSight, lightLevelAt, mergeExploredCells, removeRectCells, revealRectCells, visionSelectionCells } from '../src/utils/visibility.js';

const map = (overrides = {}) => ({ id: 'm', width: 12, height: 12, blockedCells: {}, terrainAreas: [], vision: { ambientLight: 'bright', enabled: true, exploredCells: {}, lightSources: [] }, ...overrides });
const pc = (overrides = {}) => ({ id: 'pc', type: 'PC', mapId: 'm', gridX: 2, gridY: 2, vision: { darkvision: 0, normalVisionLimit: 30 }, ...overrides });

test('windows block movement data without blocking line of sight', () => {
  const windowMap = map({ terrainAreas: [{ id: 'window', name: '窗户', type: 'rect', gridX: 3, gridY: 2, width: 1, height: 1, isImpassable: true, blocksVision: false }] });
  assert.equal(hasLineOfSight(windowMap, 2, 2, 4, 2), true);
});

test('closed doors block sight and opened doors allow it', () => {
  const closed = map({ terrainAreas: [{ id: 'door', name: '门', type: 'rect', gridX: 3, gridY: 2, width: 1, height: 1, isImpassable: true, blocksVision: true }] });
  const open = map({ terrainAreas: [{ id: 'door', name: '门', type: 'rect', gridX: 3, gridY: 2, width: 1, height: 1, isImpassable: false, blocksVision: false }] });
  assert.equal(hasLineOfSight(closed, 2, 2, 4, 2), false);
  assert.equal(hasLineOfSight(open, 2, 2, 4, 2), true);
});

test('grid-line walls block rays without occupying either adjacent cell', () => {
  const edgeMap = map({ terrainAreas: [{ id: 'edge', name: '格线墙', placement: 'edge', orientation: 'horizontal', type: 'rect', gridX: 0, gridY: 3, length: 5, width: 5, height: 0.15, visionMode: 'blocked', obstacleHeight: 10 }] });
  assert.equal(hasLineOfSight(edgeMap, 2, 2, 2, 4), false);
  assert.equal(hasLineOfSight(edgeMap, 1, 2, 3, 2), true);
});

test('free-angle edges block diagonal rays without filling their bounding box', () => {
  const edgeMap = map({ terrainAreas: [{ id: 'diagonal', name: '斜墙', placement: 'edge', orientation: 'free', type: 'rect', gridX: 2, gridY: 2, endX: 6, endY: 6, length: 5.7, width: .15, height: .15, visionMode: 'blocked', obstacleHeight: 10 }] });
  assert.equal(hasLineOfSight(edgeMap, 2, 5, 5, 2), false);
  assert.equal(hasLineOfSight(edgeMap, 7, 2, 9, 2), true);
});

test('low obstacles block prone sight but not standing sight', () => {
  const lowMap = map({ terrainAreas: [{ id: 'desk', name: '桌子', type: 'rect', gridX: 3, gridY: 2, width: 1, height: 1, visionMode: 'partial', obstacleHeight: 3 }] });
  assert.equal(hasLineOfSight(lowMap, 2, 2, 4, 2, { eyeHeight: 5.5 }), true);
  assert.equal(hasLineOfSight(lowMap, 2, 2, 4, 2, { eyeHeight: 1.5 }), false);
});

test('walls block line of sight and prevent diagonal corner peeking', () => {
  const walled = map({ blockedCells: { '3_2': true, '2_3': true } });
  assert.equal(hasLineOfSight(walled, 2, 2, 4, 2), false);
  assert.equal(hasLineOfSight(walled, 2, 2, 3, 3), false);
  assert.equal(hasLineOfSight(walled, 2, 2, 4, 4), false);
});

test('ordinary characters cannot see in darkness without a light source', () => {
  const dark = map({ vision: { ambientLight: 'dark', enabled: true, exploredCells: {}, lightSources: [] } });
  const result = computeVisibility({ map: dark, characters: [pc()] });
  assert.equal(result.visible.has('2_2'), false);
});

test('darkvision treats nearby darkness as dim light', () => {
  const dark = map({ vision: { ambientLight: 'dark', enabled: true, exploredCells: {}, lightSources: [] } });
  const result = computeVisibility({ map: dark, characters: [pc({ vision: { darkvision: 4, normalVisionLimit: 30 } })] });
  assert.equal(result.dim.has('5_2'), true);
  assert.equal(result.visible.has('8_2'), false);
});

test('flashlight cone illuminates only its facing arc and respects walls', () => {
  const dark = map({ blockedCells: { '5_2': true }, vision: { ambientLight: 'dark', enabled: true, exploredCells: {}, lightSources: [] } });
  const source = { x: 2, y: 2, shape: 'cone', direction: 0, angle: 60, brightRange: 4, dimRange: 3 };
  assert.equal(lightLevelAt(dark, 4, 2, [source]), 2);
  assert.equal(lightLevelAt(dark, 2, 5, [source]), 0);
  assert.equal(lightLevelAt(dark, 7, 2, [source]), 0);
});

test('combat exposes non-hidden participants without revealing surrounding cells', () => {
  const dark = map({ vision: { ambientLight: 'dark', enabled: true, exploredCells: {}, lightSources: [] } });
  const enemy = { id: 'enemy', type: 'NPC', mapId: 'm', gridX: 9, gridY: 9, conditions: [] };
  const hidden = { id: 'hidden', type: 'NPC', mapId: 'm', gridX: 8, gridY: 8, conditions: [{ id: '隐身', name: '隐身' }] };
  const result = computeVisibility({ map: dark, characters: [pc(), enemy, hidden], isInCombat: true, combatTurnOrder: [{ id: 'pc' }, { id: 'enemy' }, { id: 'hidden' }] });
  assert.equal(result.visibleCharacterIds.has('enemy'), true);
  assert.equal(result.sensedCombatIds.has('enemy'), true);
  assert.equal(result.visible.has('9_9'), false);
  assert.equal(result.visibleCharacterIds.has('hidden'), false);
  const detected = computeVisibility({ map: dark, characters: [pc(), { ...hidden, detectedBy: ['pc'] }], isInCombat: true, combatTurnOrder: [{ id: 'pc' }, { id: 'hidden' }] });
  assert.equal(detected.visibleCharacterIds.has('hidden'), true);
});

test('exploration memory accumulates visible terrain instead of forgetting cells behind the viewer', () => {
  const first = mergeExploredCells({}, new Set(['1_1', '2_1']));
  const second = mergeExploredCells(first, new Set(['3_1']));
  assert.deepEqual(second, { '1_1': true, '2_1': true, '3_1': true });
});

test('DM rectangle reveal adds only the selected room and preserves prior exploration', () => {
  const revealed = revealRectCells({ '0_0': true }, { startX: 2, startY: 3, endX: 4, endY: 4 }, 10, 10);
  assert.equal(revealed['0_0'], true);
  assert.equal(revealed['2_3'], true);
  assert.equal(revealed['4_4'], true);
  assert.equal(revealed['5_4'], undefined);
  assert.equal(Object.keys(revealed).length, 7);
});

test('DM rectangle removal forgets only the selected cells', () => {
  const remaining = removeRectCells({ '0_0': true, '2_3': true, '3_3': true, '8_8': true }, { startX: 2, startY: 3, endX: 4, endY: 4 }, 10, 10);
  assert.deepEqual(remaining, { '0_0': true, '8_8': true });
});

test('public vision modes and manual rectangle overrides compose predictably', () => {
  const fullDark = map({ vision: { enabled: true, publicMode: 'dark', rememberExplored: true, exploredCells: { '0_0': true }, manualVisibleCells: { '4_4': true }, manualHiddenCells: {}, ambientLight: 'bright' } });
  const darkResult = computeVisibility({ map: fullDark, characters: [pc()] });
  assert.deepEqual([...darkResult.visible], ['4_4']);
  assert.equal(darkResult.explored.has('0_0'), false);
  assert.equal(darkResult.explored.has('4_4'), true);

  const fullBright = map({ vision: { enabled: true, publicMode: 'bright', rememberExplored: true, exploredCells: {}, manualVisibleCells: {}, manualHiddenCells: { '5_5': true }, ambientLight: 'dark' } });
  const brightResult = computeVisibility({ map: fullBright, characters: [pc()] });
  assert.equal(brightResult.visible.has('0_0'), true);
  assert.equal(brightResult.visible.has('5_5'), false);
});

test('disabled exploration memory exposes only cells visible now', () => {
  const noMemory = map({ vision: { enabled: true, publicMode: 'player', rememberExplored: false, exploredCells: { '11_11': true }, manualVisibleCells: {}, manualHiddenCells: {}, ambientLight: 'bright', visionRangeCap: 1 } });
  const result = computeVisibility({ map: noMemory, characters: [pc({ vision: { normalVisionLimit: 1 } })] });
  assert.equal(result.explored.has('11_11'), false);
  assert.equal(result.explored.has('2_2'), true);
});

test('vision selection supports cells, rectangles, circles and directional cones', () => {
  assert.deepEqual([...visionSelectionCells({ shape: 'cell', startX: 3, startY: 4 }, 12, 12)], ['3_4']);
  assert.equal(visionSelectionCells({ shape: 'rect', startX: 1, startY: 1, endX: 2, endY: 3 }, 12, 12).size, 6);
  const circle = visionSelectionCells({ shape: 'circle', startX: 5, startY: 5, endX: 7, endY: 5 }, 12, 12);
  assert.equal(circle.has('5_5'), true);
  assert.equal(circle.has('7_5'), true);
  assert.equal(circle.has('8_5'), false);
  const cone = visionSelectionCells({ shape: 'cone', angle: 60, startX: 5, startY: 5, endX: 8, endY: 5 }, 12, 12);
  assert.equal(cone.has('8_5'), true);
  assert.equal(cone.has('5_8'), false);
  assert.equal(cone.has('3_5'), false);
});

test('indoor vision never exceeds the 180ft map cap', () => {
  const longMap = { id: 'm', width: 220, height: 3, blockedCells: {}, terrainAreas: [], vision: { ambientLight: 'bright', enabled: true, visionRangeCap: 180, exploredCells: {}, lightSources: [] } };
  const result = computeVisibility({ map: longMap, characters: [pc({ gridX: 1, gridY: 1, vision: { darkvision: 999, normalVisionLimit: 999 } })] });
  assert.equal(result.visible.has('181_1'), true);
  assert.equal(result.visible.has('182_1'), false);
});
