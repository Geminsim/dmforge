import test from 'node:test';
import assert from 'node:assert/strict';
import {
  characterCenter, characterFootprintCells, clampCharacterCenterToMap, footprintCoveredCells
} from '../src/utils/characterGeometry.js';
import { canTraverseTerrainStep, createTerrainFeature } from '../src/utils/terrainRules.js';

test('characters use the centre of their selected grid as the world anchor', () => {
  assert.deepEqual(characterCenter({ gridX: 4, gridY: 7 }), { x: 4.5, y: 7.5 });
  assert.deepEqual(footprintCoveredCells(4, 7, { sizeCategory: 'medium' }), [{ x: 4, y: 7 }]);
});

test('large and tiny forms remain symmetric around the same centre grid', () => {
  assert.equal(characterFootprintCells({ sizeCategory: 'minuscule' }), 0.25);
  assert.equal(characterFootprintCells({ sizeCategory: 'tiny' }), 0.5);
  assert.equal(characterFootprintCells({ sizeCategory: 'large' }), 3);
  const cells = footprintCoveredCells(5, 5, { sizeCategory: 'large' });
  assert.equal(cells.length, 9);
  assert.deepEqual(cells[0], { x: 4, y: 4 });
  assert.deepEqual(cells.at(-1), { x: 6, y: 6 });
  assert.deepEqual(clampCharacterCenterToMap(0, 0, { sizeCategory: 'large' }, 20, 20), { x: 1, y: 1 });
});

test('edge traversal checks a large token footprint from its centre path', () => {
  const wall = { ...createTerrainFeature('wall', { gridX: 3, gridY: 0 }), orientation: 'vertical', length: 10 };
  const map = { terrainAreas: [wall] };
  assert.equal(canTraverseTerrainStep(map, 1, 5, 2, 5, { sizeCategory: 'medium' }), true);
  assert.equal(canTraverseTerrainStep(map, 1, 5, 2, 5, { sizeCategory: 'large' }), false);
});
