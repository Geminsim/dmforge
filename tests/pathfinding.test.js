import test from 'node:test';
import assert from 'node:assert/strict';
import { findShortestPath, measurePath } from '../src/utils/pathfinding.js';

test('finds a direct path and measures diagonal movement', () => {
  const path = findShortestPath(0, 0, 2, 2, 5, 5, () => false);
  assert.deepEqual(path, [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }]);
  assert.ok(Math.abs(measurePath(path) - Math.SQRT2 * 2) < 0.0001);
});

test('does not cut diagonally through two blocked corners', () => {
  const blocked = new Set(['1_0', '0_1']);
  assert.equal(findShortestPath(0, 0, 1, 1, 3, 3, (x, y) => blocked.has(`${x}_${y}`)), null);
});

test('charges double movement for difficult destination cells', () => {
  const path = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  assert.equal(measurePath(path, x => x === 1), 3);
});

test('supports edge traversal rules without treating walls as filled cells', () => {
  const blockedEdge = (fromX, fromY, toX, toY) => !(fromY === 0 && toY === 1 && fromX === 1 && toX === 1);
  const path = findShortestPath(1, 0, 1, 1, 3, 3, () => false, null, blockedEdge);
  assert.notDeepEqual(path, [{ x: 1, y: 0 }, { x: 1, y: 1 }]);
  assert.deepEqual(path.at(-1), { x: 1, y: 1 });
});
