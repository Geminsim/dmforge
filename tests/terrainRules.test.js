import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAttackThroughTerrain, canTraverseTerrainStep, changeTerrainShape, createTerrainFeature, isDifficultTerrain,
  setDoorState, terrainBlocksMovement, terrainBlocksVision, terrainCoverBetween, terrainHazard, toggleDoorState,
  TERRAIN_FEATURE_DESCRIPTIONS, terrainFeatureStateOptions, terrainTriggerDetails, updateExploredTerrainStates
} from '../src/utils/terrainRules.js';

test('neutral terrain has no hazard even when it uses a custom display colour', () => {
  const area = { color: 'custom', customColor: '#336699', hazardLevel: 'none' };
  assert.equal(terrainHazard(area), 'none');
  assert.equal(isDifficultTerrain(area), false);
});

test('legacy terrain colours retain their hazard meaning', () => {
  assert.equal(terrainHazard({ color: 'amber' }), 'difficult');
  assert.equal(terrainHazard({ color: 'red' }), 'fire');
});

test('triggering terrain always exposes a complete effect annotation', () => {
  const generic = terrainTriggerDetails({ hazardLevel: 'fire' });
  assert.match(generic.trigger, /进入/);
  assert.match(generic.effect, /火焰/);
  const scanner = terrainTriggerDetails(createTerrainFeature('scannerZone'));
  assert.match(scanner.trigger, /未授权/);
  assert.match(scanner.disarm, /凭证/);
});

test('terrain feature presets separate movement and vision blocking', () => {
  const wall = createTerrainFeature('wall');
  const window = createTerrainFeature('window');
  const table = createTerrainFeature('table');
  assert.equal(terrainBlocksMovement(wall), true);
  assert.equal(terrainBlocksVision(wall), true);
  assert.equal(terrainBlocksMovement(window), true);
  assert.equal(terrainBlocksVision(window), false);
  assert.equal(terrainBlocksMovement(table), true);
  assert.equal(terrainBlocksVision(table), false);
});

test('campaign furniture presets keep tactical rules and editable visual states', () => {
  const cryoPod = createTerrainFeature('cryoPod');
  assert.equal(cryoPod.assetKey, 'cryo-pod');
  assert.equal(cryoPod.featureCategory, '实验室');
  assert.equal(cryoPod.width, 4);
  assert.equal(cryoPod.height, 5);
  assert.equal(terrainBlocksMovement(cryoPod), true);
  assert.equal(terrainBlocksVision(cryoPod), false);
  assert.deepEqual(terrainFeatureStateOptions(cryoPod).slice(0, 2), [
    { value: 'closed', label: '关闭' },
    { value: 'open', label: '开启' }
  ]);

  const chair = createTerrainFeature('chair');
  assert.equal(isDifficultTerrain(chair), true);
  assert.equal(terrainBlocksVision(chair), false);

  const workstation = createTerrainFeature('labWorkstation');
  const medicalCart = createTerrainFeature('medicalCart');
  const serverRack = createTerrainFeature('serverRack');
  assert.equal(workstation.assetKey, 'lab-workstation');
  assert.equal(terrainBlocksMovement(workstation), true);
  assert.equal(isDifficultTerrain(medicalCart), true);
  assert.equal(terrainBlocksVision(serverRack), true);
  assert.match(TERRAIN_FEATURE_DESCRIPTIONS.specimenTank, /样本罐/);
});

test('opening and closing a door changes both traversal and vision', () => {
  const closed = createTerrainFeature('door');
  const open = toggleDoorState(closed);
  assert.equal(open.featureState, 'open');
  assert.equal(terrainBlocksMovement(open), false);
  assert.equal(terrainBlocksVision(open), false);
  const closedAgain = toggleDoorState(open);
  assert.equal(closedAgain.featureState, 'closed');
  assert.equal(terrainBlocksMovement(closedAgain), true);
  assert.equal(terrainBlocksVision(closedAgain), true);
});

test('an ajar door permits a narrow view angle but blocks oblique sight', () => {
  const ajar = setDoorState(createTerrainFeature('door'), 'ajar');
  assert.equal(terrainBlocksMovement(ajar), false);
  assert.equal(terrainBlocksVision(ajar, { fromX: 0, fromY: -1, toX: 0, toY: 1 }), false);
  assert.equal(terrainBlocksVision(ajar, { fromX: -1, fromY: 0, toX: 1, toY: 0 }), true);
});

test('terrain shapes can be converted without losing rule fields', () => {
  const table = createTerrainFeature('table');
  const circle = changeTerrainShape(table, 'circle');
  assert.equal(circle.type, 'circle');
  assert.ok(circle.radius >= 1);
  assert.equal(circle.blocksVision, false);
  const rectangle = changeTerrainShape(circle, 'rect');
  assert.equal(rectangle.type, 'rect');
  assert.ok(rectangle.width >= 2);
  assert.equal(rectangle.isImpassable, true);
});

test('edge walls block only movement that crosses their grid line', () => {
  const wall = { ...createTerrainFeature('wall', { gridX: 0, gridY: 2 }), length: 4 };
  const map = { terrainAreas: [wall] };
  assert.equal(canTraverseTerrainStep(map, 1, 1, 1, 2), false);
  assert.equal(canTraverseTerrainStep(map, 1, 1, 2, 1), true);
  assert.equal(canTraverseTerrainStep({ terrainAreas: [toggleDoorState({ ...createTerrainFeature('door', { gridX: 0, gridY: 2 }), length: 4 })] }, 1, 1, 1, 2), true);
});

test('free-angle walls block a crossing step and allow a nearby parallel step', () => {
  const diagonal = { ...createTerrainFeature('wall', { gridX: 1, gridY: 1 }), orientation: 'free', endX: 5, endY: 5 };
  const map = { terrainAreas: [diagonal] };
  assert.equal(canTraverseTerrainStep(map, 2, 3, 3, 2), false);
  assert.equal(canTraverseTerrainStep(map, 6, 2, 7, 2), true);
});

test('partial-height obstacles depend on observer eye height', () => {
  const halfWall = createTerrainFeature('halfWall');
  assert.equal(terrainBlocksVision(halfWall, { eyeHeight: 5.5 }), false);
  assert.equal(terrainBlocksVision(halfWall, { eyeHeight: 1.5 }), true);
  assert.equal(terrainBlocksVision({ ...halfWall, baseHeight: 7 }, { eyeHeight: 5.5 }), false);
});

test('cover and attack transmission are independent from sight', () => {
  const window = { ...createTerrainFeature('window', { gridX: 0, gridY: 2 }), length: 4 };
  const console = { ...createTerrainFeature('console', { gridX: 1, gridY: 1 }), width: 2, height: 2 };
  assert.equal(terrainCoverBetween({ terrainAreas: [window] }, 1, 1, 1, 2), 'half');
  assert.equal(canAttackThroughTerrain({ terrainAreas: [window] }, 1, 1, 1, 2), true);
  assert.equal(canAttackThroughTerrain({ terrainAreas: [console] }, 0, 1, 3, 1), false);
});

test('destroyed features stop blocking movement and sight', () => {
  const wall = { ...createTerrainFeature('wall'), currentHp: 0 };
  assert.equal(terrainBlocksMovement(wall), false);
  assert.equal(terrainBlocksVision(wall), false);
});

test('exploration memory changes only while the feature is visible', () => {
  const closed = createTerrainFeature('door', { id: 'door-memory', gridX: 2, gridY: 2 });
  const first = updateExploredTerrainStates({}, [closed], new Set(['2_1']));
  assert.equal(first['door-memory'].featureState, 'closed');
  const opened = toggleDoorState(closed);
  const hiddenUpdate = updateExploredTerrainStates(first, [opened], new Set(['9_9']));
  assert.equal(hiddenUpdate['door-memory'].featureState, 'closed');
  const visibleUpdate = updateExploredTerrainStates(hiddenUpdate, [opened], new Set(['2_1']));
  assert.equal(visibleUpdate['door-memory'].featureState, 'open');
});
