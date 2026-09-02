import { createSf6SheetData } from './sf6CharacterSheet.js';
import { COMMON_ENEMY_NAMES } from '../data/enemyNames.js';

const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const DICE = new Set(['d4', 'd6', 'd8', 'd10', 'd12', 'd20']);
const STAT_NAMES = ['力量', '速度', '耐力', '控制', '精密', '魅力'];

export const ENEMY_CATEGORIES = [
  '普通战斗人员（杂兵）',
  '小型团队领袖（杂兵头领）',
  'Boss级别（章节Boss／剧情Boss）'
];

export const normalizeEnemyCategory = value => ENEMY_CATEGORIES.includes(value) ? value : ENEMY_CATEGORIES[0];

export function normalizeSkillDamage(skill = {}) {
  return {
    diceCount: Math.max(0, Math.min(20, Math.trunc(number(skill.diceCount, 0)))),
    die: DICE.has(skill.die) ? skill.die : 'd6',
    fixed: Math.max(-100, Math.min(100, Math.trunc(number(skill.fixed, 0)))),
    damageType: String(skill.damageType || '')
  };
}

export function formatSkillDamage(skill = {}) {
  const damage = normalizeSkillDamage(skill);
  const dice = damage.diceCount ? `${damage.diceCount}${damage.die}` : '';
  const fixed = damage.fixed ? `${damage.fixed > 0 && dice ? '+' : ''}${damage.fixed}` : '';
  return `${dice}${fixed}${damage.damageType ? ` ${damage.damageType}` : ''}`.trim() || '无伤害';
}

export function enemySkillLimits(level, category = ENEMY_CATEGORIES[0]) {
  const normalizedLevel = Math.max(1, Math.min(10, number(level, 1)));
  const normalizedCategory = normalizeEnemyCategory(category);
  if (normalizedCategory === ENEMY_CATEGORIES[2]) return normalizedLevel < 5 ? { min: 2, max: 4 } : { min: 4, max: 6 };
  if (normalizedCategory === ENEMY_CATEGORIES[1]) {
    if (normalizedLevel >= 7) return { min: 3, max: 4 };
    return { min: 2, max: 3 };
  }
  return normalizedLevel >= 5 ? { min: 2, max: 3 } : { min: 1, max: 2 };
}

export function enemyResourceDefaults(level) {
  const normalizedLevel = Math.max(1, Math.min(10, number(level, 1)));
  const resources = [
    { id: 'action', name: '动作', value: 1, max: 1, resetType: 'turn' },
    { id: 'bonus-action', name: '附赠动作', value: 1, max: 1, resetType: 'turn' },
    { id: 'reaction', name: '反应', value: 1, max: 1, resetType: 'turn' },
    { id: 'drive', name: '斗气', value: 6, max: 6, resetType: 'short_rest' }
  ];
  if (normalizedLevel >= 8) resources.push({ id: 'super', name: '超级必杀槽', value: 1, max: 1, resetType: 'long_rest' });
  return resources;
}

const normalizeInventoryEntry = (entry, index) => typeof entry === 'string'
  ? { id: `item_${index}`, name: entry, category: '装备', quantity: 1, description: '', usage: '由 DM 根据物品性质裁定使用方式。', weight: 0 }
  : {
      id: String(entry?.id || `item_${index}`), name: String(entry?.name || ''),
      category: String(entry?.category || '装备'), quantity: Math.max(1, Math.trunc(number(entry?.quantity, 1))),
      description: String(entry?.description || ''), usage: String(entry?.usage || ''),
      weight: Math.max(0, number(entry?.weight)), calories: Math.max(0, number(entry?.calories)),
      acBonus: number(entry?.acBonus), effectValue: String(entry?.effectValue || ''),
      damageDiceCount: Math.max(0, Math.trunc(number(entry?.damageDiceCount))),
      damageDie: DICE.has(entry?.damageDie) ? entry.damageDie : '',
      damageFixed: number(entry?.damageFixed), damageType: String(entry?.damageType || ''),
      consumable: Boolean(entry?.consumable), charges: Math.max(0, Math.trunc(number(entry?.charges))),
      ...(entry?.lightSource ? { lightSource: structuredClone(entry.lightSource) } : {})
    };

const normalizeFeat = (feat, index) => typeof feat === 'string'
  ? { id: `feat_${index}`, name: feat, description: '' }
  : { id: String(feat?.id || `feat_${index}`), name: String(feat?.name || ''), description: String(feat?.description || '') };

export function createEnemyTemplate(source = {}) {
  const level = Math.max(1, Math.min(10, number(source.level, 1)));
  const category = normalizeEnemyCategory(source.category);
  const limits = enemySkillLimits(level, category);
  const skills = Array.isArray(source.skills) ? source.skills.slice(0, limits.max).map((skill, index) => ({
    id: String(skill?.id || `skill_${Date.now()}_${index}`),
    name: String(skill?.name || ''),
    description: String(skill?.description || ''),
    cost: String(skill?.cost || ''),
    ...normalizeSkillDamage(skill)
  })) : [];
  return {
    id: String(source.id || `enemy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
    name: String(source.name || ''), category,
    level, class: String(source.class || ''), subclass: String(source.subclass || ''),
    classDescription: String(source.classDescription || ''), subclassDescription: String(source.subclassDescription || ''),
    description: String(source.description || ''),
    maxHp: Math.max(1, number(source.maxHp, 10 + level * 5)),
    ac: number(source.ac, 10), initiative: number(source.initiative, 0), speed: Math.max(0, number(source.speed, 30)),
    driveSlots: 6,
    normalAttack: {
      id: String(source.normalAttack?.id || 'normal_attack'), name: String(source.normalAttack?.name || '普通攻击'),
      cost: String(source.normalAttack?.cost || '动作'), description: String(source.normalAttack?.description || ''),
      ...normalizeSkillDamage(source.normalAttack || { diceCount: 1, die: 'd4' })
    },
    skills,
    stats: Object.fromEntries(STAT_NAMES.map(name => [name, Math.max(1, Math.min(30, number(source.stats?.[name], 10)))])),
    saveProficiencies: Array.isArray(source.saveProficiencies) ? source.saveProficiencies.filter(name => STAT_NAMES.includes(name)) : [],
    feats: Array.isArray(source.feats) ? source.feats.map(normalizeFeat).filter(feat => feat.name) : [],
    inventory: Array.isArray(source.inventory) ? source.inventory.map(normalizeInventoryEntry).filter(item => item.name) : [],
    notes: String(source.notes || '')
  };
}

export function normalizeEnemyBestiary(value) {
  return Array.isArray(value) ? value.filter(entry => entry && typeof entry === 'object').map(createEnemyTemplate) : [];
}

const ENEMY_IDENTITY_KEYWORDS = ['特工', '警卫', '安保', '士兵', '教官', '射手', '警戒员', '护卫', '拘束员', '督战官', '指挥官', '队长', '组长', '主管', '武术家', '斗士'];

export function inferEnemyIdentity(template = {}) {
  const source = `${template.name || ''} ${template.description || ''}`;
  return ENEMY_IDENTITY_KEYWORDS.find(keyword => source.includes(keyword))
    || (normalizeEnemyCategory(template.category) === ENEMY_CATEGORIES[1] ? '小队头领' : '战斗人员');
}

export function randomEnemyInstanceName(template, existingNames = [], random = Math.random) {
  if (normalizeEnemyCategory(template?.category) === ENEMY_CATEGORIES[2]) return String(template?.name || '未命名 Boss');
  const used = new Set(existingNames.map(name => String(name || '').replace(/（.*$/, '').trim()));
  const available = COMMON_ENEMY_NAMES.filter(name => !used.has(name));
  const pool = available.length ? available : COMMON_ENEMY_NAMES;
  const roll = Math.max(0, Math.min(0.999999999, Number(random()) || 0));
  const personalName = pool[Math.floor(roll * pool.length)];
  return `${personalName}（${inferEnemyIdentity(template)}）`;
}

export function enemyTemplateToCharacter(template, { mapId, gridX = 2, gridY = 2, instanceName } = {}) {
  const enemy = createEnemyTemplate(template);
  const attacks = [enemy.normalAttack, ...enemy.skills].filter(skill => skill.name);
  const proficiencyBonus = enemy.level >= 5 ? 3 : 2;
  const statModifiers = Object.fromEntries(STAT_NAMES.map(name => [name, Math.floor((enemy.stats[name] - 10) / 2)]));
  const savingThrows = Object.fromEntries(STAT_NAMES.map(name => [name, statModifiers[name] + (enemy.saveProficiencies.includes(name) ? proficiencyBonus : 0)]));
  const inventoryText = enemy.inventory.map(item => `${item.category}｜${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ''}${item.description ? `：${item.description}` : ''}`).join('\n');
  const sheet = createSf6SheetData({
    inventory: inventoryText,
    selectedFeatNames: enemy.feats.map(feat => feat.name),
    attacks: attacks.map(skill => ({ name: skill.name, attackBonus: skill.cost, diceCount: skill.diceCount, die: skill.die, fixedDamage: skill.fixed, damageType: skill.damageType, description: skill.description }))
  });
  const placement = mapId === undefined || mapId === null || mapId === '' ? {} : {
    gridX,
    gridY,
    combatStartGridX: gridX,
    combatStartGridY: gridY,
    mapId
  };
  return {
    id: `char_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    enemyTemplateId: enemy.id,
    name: instanceName || enemy.name || '未命名敌人', type: 'NPC', groupId: 'group_npcs',
    class: enemy.class || '无职业', subclass: enemy.subclass, level: enemy.level,
    classDescription: enemy.classDescription, subclassDescription: enemy.subclassDescription,
    hp: enemy.maxHp, maxHp: enemy.maxHp, tempHp: 0, ac: enemy.ac,
    initiative: enemy.initiative, speed: enemy.speed, combatSpeedRemaining: enemy.speed,
    ...placement,
    stats: { ...enemy.stats }, savingThrows, proficiencyBonus, conditions: [], inventory: enemy.inventory,
    sheet,
    feats: Object.fromEntries([
      ...enemy.feats.map(feat => [feat.name, feat.description]),
      ...enemy.skills.filter(skill => skill.name).map(skill => [skill.name, `${formatSkillDamage(skill)}${skill.description ? `｜${skill.description}` : ''}`])
    ]),
    attacks: attacks.map(skill => ({ name: skill.name, cost: skill.cost, damage: normalizeSkillDamage(skill), description: skill.description })),
    resources: enemyResourceDefaults(enemy.level),
    vision: { darkvision: 0, normalVisionLimit: 180, sharedWithParty: false }, facing: 0
  };
}

export function enemyInventoryToItemPool(character) {
  return (character?.inventory || []).map((item, index) => ({
    ...structuredClone(item),
    id: `item_${character.id}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    ownerId: character.id,
    infinite: false
  }));
}
