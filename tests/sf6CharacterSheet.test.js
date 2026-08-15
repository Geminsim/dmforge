import test from 'node:test';
import assert from 'node:assert/strict';
import { SF6_RULESET } from '../src/data/sf6Ruleset.js';
import { calculateSf6Character, createSf6SheetData, sf6CharacterFeatureMap, sf6Modifier, sf6ProficiencyBonus } from '../src/utils/sf6CharacterSheet.js';

test('matches the first Excel sheet formulas for class stats, saves, skills and combat values', () => {
  const draft = { class: '武道者', subclass: '邪修派', level: 5, sheet: createSf6SheetData({ statBonuses: { 力量: 1 }, skillProficiencies: { athletics: true, perception: true } }), resources: [] };
  const result = calculateSf6Character(draft, SF6_RULESET);
  assert.equal(result.stats.力量, 16);
  assert.equal(sf6Modifier(result.stats.力量), 3);
  assert.equal(result.proficiencyBonus, 3);
  assert.equal(result.savingThrows.力量, 6);
  assert.equal(result.skillTotals.athletics, 6);
  assert.equal(result.passivePerception, 14);
  assert.equal(result.ac, 10);
  assert.equal(result.initiative, 0);
  assert.equal(result.speed, 40);
  assert.equal(result.hitDice, 'd8');
});

test('uses workbook proficiency progression and selected feat descriptions', () => {
  assert.deepEqual([1, 4, 5, 9, 10].map(sf6ProficiencyBonus), [2, 2, 3, 3, 4]);
  const feat = SF6_RULESET.feats.find(item => item.minimumLevel === 3);
  const features = sf6CharacterFeatureMap({ class: '', level: 3, sheet: createSf6SheetData({ selectedFeats: [feat.id] }) }, SF6_RULESET);
  assert.equal(features[feat.name], feat.description);
});
