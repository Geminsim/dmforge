import test from 'node:test';
import assert from 'node:assert/strict';
import { characterOwnsFlashlight, consumeLongRestRations, effectiveSpeed, getEncumbrance, getLongRestRations, isWorldInfiniteItem, syncCharacterEncumbrance } from '../src/utils/inventoryRules.js';

test('world consumables are infinite while character copies remain finite', () => {
  assert.equal(isWorldInfiniteItem({ ownerId: 'WORLD', category: '补给食品' }), true);
  assert.equal(isWorldInfiniteItem({ ownerId: 'pc', category: '补给食品', infinite: true }), false);
});

test('a flashlight is usable only when carried by that character', () => {
  const items = [
    { ownerId: 'WORLD', name: '战术手电筒', quantity: 99 },
    { ownerId: 'pc2', name: '手电筒', quantity: 1 },
    { ownerId: 'pc1', name: '备用手电筒', quantity: 0 }
  ];
  assert.equal(characterOwnsFlashlight(items, 'pc1'), false);
  assert.equal(characterOwnsFlashlight(items, 'pc2'), true);
});

test('long rest requires 1500 kcal per selected PC and consumes whole servings', () => {
  const items = [
    { id: 'a', ownerId: 'pc1', quantity: 1, calories: 1000 },
    { id: 'b', ownerId: 'pc2', quantity: 2, calories: 1200 },
    { id: 'world', ownerId: 'WORLD', quantity: 99, calories: 5000 }
  ];
  const plan = getLongRestRations(items, ['pc1', 'pc2']);
  assert.equal(plan.required, 3000);
  assert.equal(plan.available, 3400);
  assert.equal(plan.enough, true);
  const remaining = consumeLongRestRations(items, plan);
  assert.equal(remaining.some(item => item.id === 'world'), true);
  assert.equal(remaining.reduce((sum, item) => sum + (item.ownerId === 'WORLD' ? 0 : item.quantity * item.calories), 0), 0);
});

test('encumbrance uses endurance, marks 80 percent and applies the over-capacity penalty', () => {
  const character = { id: 'pc', type: 'PC', speed: 30, stats: { 耐力: 10 }, conditions: [] };
  const warning = getEncumbrance(character, [{ ownerId: 'pc', quantity: 1, weight: 40 }]);
  assert.equal(warning.capacity, 50);
  assert.equal(warning.warning, true);
  assert.equal(warning.overCapacity, false);
  const synced = syncCharacterEncumbrance([character], [{ ownerId: 'pc', quantity: 1, weight: 55 }]);
  assert.equal(synced[0].conditions.some(condition => condition.id === 'overburdened'), true);
  assert.equal(effectiveSpeed(synced[0]), 20);
});
