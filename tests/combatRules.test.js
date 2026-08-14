import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceCombatTurn, resetTurnResources, rollInitiative, tickRoundConditions } from '../src/utils/combatRules.js';

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
