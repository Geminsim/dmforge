import test from 'node:test';
import assert from 'node:assert/strict';
import { SF6_RULESET } from '../src/data/sf6Ruleset.js';
import { calculateSf6Character, createSf6SheetData, normalizeSf6ResourcesForLevel, sf6CharacterFeatureMap, sf6Modifier, sf6ProficiencyBonus } from '../src/utils/sf6CharacterSheet.js';

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

test('normalizes structured attack damage fields', () => {
  const sheet = createSf6SheetData({ attacks: [{ name: '重拳', diceCount: 2, die: 'd10', fixedDamage: 4, damageType: '钝击' }] });
  assert.deepEqual(sheet.attacks[0], { name: '重拳', attackBonus: '', diceCount: 2, die: 'd10', fixedDamage: 4, damageType: '钝击', description: '' });
  assert.equal(sheet.attacks.length, 6);
});

test('only grants the super meter from level 8 onward', () => {
  const resources = [
    { name: '斗气', max: 6, value: 6, resetType: 'short_rest' },
    { name: '超级必杀槽', max: 1, value: 1, resetType: 'long_rest' }
  ];
  assert.deepEqual(normalizeSf6ResourcesForLevel(resources, 3).map(resource => resource.name), ['斗气']);
  assert.deepEqual(normalizeSf6ResourcesForLevel(resources.slice(0, 1), 8).map(resource => resource.name), ['斗气', '超级必杀槽']);
  const levelThree = calculateSf6Character({ type: 'PC', class: '武道者', level: 3, sheet: createSf6SheetData(), resources: [] }, SF6_RULESET);
  assert.equal(levelThree.resources.some(resource => resource.name === '超级必杀槽'), false);
});

test('honors an editable armor class override while retaining derived defaults', () => {
  const derived = calculateSf6Character({ class: '军士', level: 3, sheet: createSf6SheetData(), resources: [] }, SF6_RULESET);
  const overridden = calculateSf6Character({ class: '军士', level: 3, sheet: createSf6SheetData({ acOverride: 19 }), resources: [] }, SF6_RULESET);
  assert.equal(derived.ac, 15);
  assert.equal(overridden.ac, 19);
});
