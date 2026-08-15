import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCombatTurn, effectiveArmorClass, processTurnEndConditions, processTurnStartConditions, resetResourcesForRest, resetTurnResources, rollInitiative, spendResource, tickRoundConditions } from '../src/utils/combatRules.js';

test('wraps turn order and increments the round', () => {
  assert.deepEqual(advanceCombatTurn(2, 4, 3), { nextIndex: 0, nextRound: 5, wrapped: true });
});

test('resets movement and only turn resources', () => {
  const result = resetTurnResources({ speed: 25, gridX: 4, gridY: 5, resources: [
    { name: '动作', resetType: 'turn', value: 0, max: 1 },
    { name: '法术位', resetType: 'long_rest', value: 0, max: 2 }
  ] });
  assert.equal(result.combatSpeedRemaining, 25);
  assert.deepEqual(result.resources.map(resource => resource.value), [1, 0]);
});

test('ticks finite conditions and preserves permanent conditions', () => {
  const result = tickRoundConditions([{ id: 'a', name: 'A', conditions: [
    { name: '眩晕', duration: 1 }, { name: '祝福', duration: 'permanent' }
  ] }]);
  assert.equal(result.expired.length, 1);
  assert.deepEqual(result.characters[0].conditions, [{ name: '祝福', duration: 'permanent' }]);
});

test('initiative uses agility then PC as deterministic tie breakers', () => {
  const characters = [
    { id: 'npc', type: 'NPC', initiative: 0, stats: { '敏捷 (Agility)': 12 } },
    { id: 'pc', type: 'PC', initiative: 0, stats: { '敏捷 (Agility)': 12 } }
  ];
  assert.deepEqual(rollInitiative(characters, ['npc', 'pc'], () => 0).map(item => item.id), ['pc', 'npc']);
});

test('spending the last drive enters burnout and applies AC penalty', () => {
  const result = spendResource({ ac: 14, resources: [{ name: '斗气', value: 2, max: 6, resetType: 'short_rest' }], conditions: [] }, '斗气', 2);
  assert.equal(result.resources[0].value, 0);
  assert.equal(result.conditions[0].id, 'burnout');
  assert.equal(effectiveArmorClass(result), 11);
});

test('short rest restores drive and clears resource-created burnout', () => {
  const result = resetResourcesForRest({ resources: [{ name: '斗气', value: 0, max: 6, resetType: 'short_rest' }], conditions: [{ id: 'burnout', name: '斗气枯竭', duration: 'permanent' }] }, 'short');
  assert.equal(result.resources[0].value, 6);
  assert.deepEqual(result.conditions, []);
});

test('long rest restores the single super meter slot', () => {
  const character = { resources: [{ name: '超级必杀槽', value: 0, max: 1, resetType: 'long_rest' }], conditions: [] };
  assert.equal(resetResourcesForRest(character, 'long').resources[0].value, 1);
});

test('hard knockdown clears on turn start and halves that turn movement', () => {
  const result = processTurnStartConditions({ speed: 35, gridX: 2, gridY: 3, conditions: [{ id: 'hard-knockdown', name: '强制倒地', duration: 'permanent' }] });
  assert.equal(result.character.combatSpeedRemaining, 17);
  assert.deepEqual(result.character.conditions, []);
});

test('ground bounce becomes hard knockdown at turn end while transient hit states expire', () => {
  const result = processTurnEndConditions({ conditions: [{ id: 'ground-bounce', name: '弹地', duration: 'permanent' }, { id: 'punish-counter', name: '确反康', duration: 'permanent' }] });
  assert.deepEqual(result.character.conditions.map(condition => condition.id), ['hard-knockdown']);
});
