import test from 'node:test';
import assert from 'node:assert/strict';
import { SF6_STANDARD_ENEMIES } from '../src/data/sf6EnemyBestiary.js';
import { COMMON_ENEMY_NAMES, FRENCH_ENEMY_NAMES, JAPANESE_ENEMY_NAMES, KOREAN_ENEMY_NAMES } from '../src/data/enemyNames.js';
import { createEnemyTemplate, ENEMY_CATEGORIES, enemyInventoryToItemPool, enemyResourceDefaults, enemySkillLimits, enemyTemplateToCharacter, formatSkillDamage, inferEnemyIdentity, randomEnemyInstanceName } from '../src/utils/enemyBestiary.js';

test('enemy tiers enforce the requested skill and resource ranges', () => {
  assert.deepEqual(enemySkillLimits(4, ENEMY_CATEGORIES[0]), { min: 1, max: 2 });
  assert.deepEqual(enemySkillLimits(5, ENEMY_CATEGORIES[0]), { min: 2, max: 3 });
  assert.deepEqual(enemySkillLimits(7, ENEMY_CATEGORIES[1]), { min: 3, max: 4 });
  assert.equal(enemyResourceDefaults(3).find(resource => resource.name === '斗气').max, 6);
  assert.deepEqual(enemyResourceDefaults(5).map(resource => resource.name), ['动作', '附赠动作', '反应', '斗气']);
  assert.deepEqual(enemyResourceDefaults(8).map(resource => resource.name), ['动作', '附赠动作', '反应', '斗气', '超级必杀槽']);
});

test('bestiary templates can spawn complete hostile map characters', () => {
  const template = createEnemyTemplate({ id: 'guard', name: '警卫', category: ENEMY_CATEGORIES[2], level: 8, class: '军士', subclass: '技巧型', normalAttack: { name: '警棍', diceCount: 1, die: 'd6', fixed: 2, damageType: '钝击' }, skills: Array.from({ length: 8 }, (_, index) => ({ name: `技能${index}`, diceCount: 2, die: 'd8', fixed: 3, damageType: '冲击' })), feats: [{ name: '不动如山', description: '获得霸体。' }], inventory: [{ name: '急救包', category: '消耗品', quantity: 1 }] });
  assert.equal(template.skills.length, 6);
  const character = enemyTemplateToCharacter(template, { mapId: 'lab', gridX: 4, gridY: 5 });
  assert.equal(character.type, 'NPC');
  assert.equal(character.enemyTemplateId, 'guard');
  assert.equal(character.mapId, 'lab');
  assert.equal(character.resources.find(resource => resource.name === '超级必杀槽').max, 1);
  assert.deepEqual(character.resources.slice(0, 4).map(resource => resource.name), ['动作', '附赠动作', '反应', '斗气']);
  assert.equal(character.attacks[0].name, '警棍');
  assert.equal(character.attacks[1].damage.diceCount, 2);
  assert.equal(character.sheet.inventory.includes('急救包'), true);
  const poolItems = enemyInventoryToItemPool(character);
  assert.equal(poolItems.length, 1);
  assert.equal(poolItems[0].ownerId, character.id);
  assert.equal(poolItems[0].infinite, false);
  assert.equal(character.feats['不动如山'], '获得霸体。');
  assert.equal(formatSkillDamage(template.skills[0]), '2d8+3 冲击');
});

test('bestiary templates can create an unplaced roster character', () => {
  const character = enemyTemplateToCharacter(createEnemyTemplate({ id: 'reserve', name: '待命警卫' }));
  assert.equal(character.name, '待命警卫');
  assert.equal(character.groupId, 'group_npcs');
  assert.equal('mapId' in character, false);
  assert.equal('gridX' in character, false);
  assert.equal('gridY' in character, false);
});

test('non-boss instances receive common personal names and concise identities', () => {
  assert.ok(COMMON_ENEMY_NAMES.length > 200);
  assert.equal(new Set(COMMON_ENEMY_NAMES).size, COMMON_ENEMY_NAMES.length);
  const guard = createEnemyTemplate({ name: '研究所巡逻警卫', category: ENEMY_CATEGORIES[0] });
  assert.equal(inferEnemyIdentity(guard), '警卫');
  assert.equal(randomEnemyInstanceName(guard, [], () => 0), `${COMMON_ENEMY_NAMES[0]}（警卫）`);
  assert.equal(randomEnemyInstanceName(guard, [COMMON_ENEMY_NAMES[0]], () => 0), `${COMMON_ENEMY_NAMES[1]}（警卫）`);
  const boss = createEnemyTemplate({ name: '实验室所长', category: ENEMY_CATEGORIES[2] });
  assert.equal(randomEnemyInstanceName(boss, [], () => 0), '实验室所长');
});

test('name pool includes at least two hundred Japanese, Korean, and French names', () => {
  assert.ok(JAPANESE_ENEMY_NAMES.length >= 60);
  assert.ok(KOREAN_ENEMY_NAMES.length >= 60);
  assert.ok(FRENCH_ENEMY_NAMES.length >= 60);
  assert.ok(JAPANESE_ENEMY_NAMES.length + KOREAN_ENEMY_NAMES.length + FRENCH_ENEMY_NAMES.length >= 200);
  assert.equal(KOREAN_ENEMY_NAMES.every(name => /^[A-Za-z-]+ [A-Za-z]+$/.test(name)), true);
  assert.equal(new Set(COMMON_ENEMY_NAMES).size, COMMON_ENEMY_NAMES.length);
});

test('standard laboratory roster covers minions and leaders without prebuilt bosses', () => {
  const normalized = SF6_STANDARD_ENEMIES.map(createEnemyTemplate);
  const minions = normalized.filter(enemy => enemy.category === ENEMY_CATEGORIES[0]);
  const leaders = normalized.filter(enemy => enemy.category === ENEMY_CATEGORIES[1]);
  assert.equal(minions.length, 12);
  assert.equal(leaders.length, 9);
  assert.equal(normalized.some(enemy => enemy.category === ENEMY_CATEGORIES[2]), false);
  assert.deepEqual([...new Set(minions.map(enemy => enemy.level))].sort(), [3, 4, 5]);
  assert.deepEqual([...new Set(leaders.map(enemy => enemy.level))].sort(), [4, 5, 6, 7]);
  assert.equal(normalized.every(enemy => enemy.normalAttack.name && enemy.skills.length >= enemySkillLimits(enemy.level, enemy.category).min), true);
  assert.equal(normalized.filter(enemy => enemy.level < 5).every(enemy => enemy.feats.length === 0), true);
  assert.equal(normalized.filter(enemy => enemy.level >= 5).every(enemy => enemy.feats.length >= 1), true);
  assert.equal(normalized.every(enemy => enemy.inventory.some(item => ['武器', '防具'].includes(item.category)) && enemy.inventory.some(item => item.consumable)), true);
  assert.equal(normalized.every(enemy => enemy.inventory.every(item => item.weight > 0 && item.usage && item.effectValue)), true);
  assert.equal(normalized.flatMap(enemy => enemy.inventory).filter(item => item.category === '武器').every(item => item.damageDie && item.damageDiceCount > 0), true);
  assert.equal(normalized.flatMap(enemy => enemy.inventory).filter(item => item.category === '防具').every(item => item.acBonus > 0), true);
  const firearmUsers = normalized.filter(enemy => /手枪|磁轨铳/.test(`${enemy.normalAttack.name} ${enemy.inventory.map(item => item.name).join(' ')}`));
  assert.equal(firearmUsers.length, 2);
  assert.equal(firearmUsers.every(enemy => /无法直接造成剧情性死亡/.test(`${enemy.description} ${enemy.normalAttack.description}`)), true);
});
