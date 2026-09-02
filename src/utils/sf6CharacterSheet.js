export const SF6_STAT_ROWS = [
  { key: '力量', code: 'STR' }, { key: '速度', code: 'DEX' }, { key: '耐力', code: 'CON' },
  { key: '控制', code: 'INT' }, { key: '精密', code: 'WIS' }, { key: '魅力', code: 'CHA' }
];

export const SF6_SKILLS = [
  ['acrobatics', '特技', 'Acrobatics', '速度'], ['animal-handling', '动物驯养', 'Animal Handling', '精密'],
  ['arcana', '奥秘', 'Arcana', '控制'], ['athletics', '运动', 'Athletics', '力量'],
  ['deception', '欺瞒', 'Deception', '魅力'], ['history', '历史', 'History', '控制'],
  ['insight', '洞悉', 'Insight', '精密'], ['intimidation', '威吓', 'Intimidation', '魅力'],
  ['investigation', '调查', 'Investigation', '控制'], ['medicine', '医药', 'Medicine', '精密'],
  ['nature', '自然', 'Nature', '控制'], ['perception', '察觉', 'Perception', '精密'],
  ['performance', '表演', 'Performance', '魅力'], ['persuasion', '游说', 'Persuasion', '魅力'],
  ['religion', '宗教', 'Religion', '控制'], ['sleight-of-hand', '巧手', 'Sleight of Hand', '速度'],
  ['stealth', '隐匿', 'Stealth', '速度'], ['survival', '生存', 'Survival', '精密']
].map(([id, name, english, stat]) => ({ id, name, english, stat }));

const subclassSpeeds = {
  邪修派: 40, 灵动型: 40, 刺杀者: 35, 重炮手: 25, 速射手: 35,
  教头: 35, 影: 35
};

export function sf6ProficiencyBonus(level) {
  if (level >= 10) return 4;
  if (level >= 5) return 3;
  return 2;
}

export const sf6Modifier = value => Math.floor(((Number(value) || 0) - 10) / 2);

export function normalizeSf6ResourcesForLevel(resources = [], level = 1) {
  const normalizedLevel = Math.max(1, Number(level) || 1);
  const normalized = resources
    .filter(resource => resource?.name !== '超级必杀槽' || normalizedLevel >= 8)
    .map(resource => resource?.name === '超级必杀槽'
      ? { ...resource, max: 1, value: Math.min(1, resource.value ?? 1), resetType: 'long_rest' }
      : resource);
  if (normalizedLevel >= 8 && !normalized.some(resource => resource?.name === '超级必杀槽')) {
    normalized.push({ id: 'super', name: '超级必杀槽', max: 1, value: 1, resetType: 'long_rest' });
  }
  return normalized;
}

export function createSf6Attack(source = {}) {
  return Object.assign({}, source, {
    name: String(source.name || ''),
    attackBonus: String(source.attackBonus || ''),
    diceCount: Math.max(0, Math.min(20, Number(source.diceCount) || 0)),
    die: ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'].includes(source.die) ? source.die : 'd6',
    fixedDamage: Math.max(-100, Math.min(100, Number(source.fixedDamage) || 0)),
    damageType: String(source.damageType || ''),
    description: String(source.description || '')
  });
}

export function createSf6SheetData(source = {}) {
  const base = {
    playerName: '', background: '', personality: '', gender: '', inventory: '', biography: '', avatarImage: '', portraitImage: '', acOverride: null,
    statBonuses: Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, 0])),
    deathSaveSuccesses: 0, deathSaveFailures: 0, drive: [true, true, true, true, true, true],
    attacks: Array.from({ length: 6 }, () => createSf6Attack()),
    attackNotes: '', skillProficiencies: {}, selectedFeats: ['', '', ''],
    ...source
  };
  const attacks = Array.from({ length: 6 }, (_, index) => createSf6Attack(source.attacks?.[index]));
  if (source.attackNotes && attacks.every(attack => !attack.description)) {
    const target = Math.max(0, attacks.findIndex(attack => attack.name));
    attacks[target] = createSf6Attack({ ...attacks[target], description: source.attackNotes });
  }
  return {
    ...base,
    acOverride: source.acOverride === null || source.acOverride === '' || source.acOverride === undefined
      ? null
      : Math.max(0, Math.min(100, Number(source.acOverride) || 0)),
    statBonuses: { ...Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, 0])), ...(source.statBonuses || {}) },
    drive: Array.from({ length: 6 }, (_, index) => source.drive?.[index] ?? true),
    attacks,
    skillProficiencies: { ...(source.skillProficiencies || {}) },
    selectedFeats: Array.from({ length: 3 }, (_, index) => source.selectedFeats?.[index] || '')
  };
}

export function calculateSf6Character(draft, ruleset) {
  const definition = ruleset?.classes?.find(item => item.name === draft.class);
  const sheet = createSf6SheetData(draft.sheet);
  const baseStats = Object.fromEntries(SF6_STAT_ROWS.map((row, index) => [row.key, definition?.stats?.[index] ?? 10]));
  const stats = Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, baseStats[row.key] + (Number(sheet.statBonuses[row.key]) || 0)]));
  const modifiers = Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, sf6Modifier(stats[row.key])]));
  const proficiencyBonus = sf6ProficiencyBonus(Number(draft.level) || 1);
  const saves = Object.fromEntries(SF6_STAT_ROWS.map(row => [row.key, modifiers[row.key] + ((definition?.saves || []).includes(row.key) ? proficiencyBonus : 0)]));
  const skillTotals = Object.fromEntries(SF6_SKILLS.map(skill => [skill.id, modifiers[skill.stat] + (sheet.skillProficiencies[skill.id] ? proficiencyBonus : 0)]));
  const speed = subclassSpeeds[draft.subclass] ?? definition?.speed ?? 30;
  return {
    ...draft, sheet, stats, proficiencyBonus, savingThrows: saves, skillTotals,
    passivePerception: 10 + skillTotals.perception,
    ac: sheet.acOverride ?? ((definition?.ac ?? 10) + modifiers.速度),
    initiative: modifiers.速度,
    speed,
    hitDice: definition?.hitDice || draft.hitDice || 'd8',
    resources: normalizeSf6ResourcesForLevel((draft.resources?.length ? draft.resources : ruleset?.resources || []).map(resource => resource.name === '斗气'
      ? { ...resource, max: 6, value: sheet.drive.filter(Boolean).length }
      : { ...resource, value: resource.value ?? resource.max }), draft.level)
  };
}

export function sf6CharacterFeatureMap(draft, ruleset) {
  const definition = ruleset?.classes?.find(item => item.name === draft.class);
  const level = Number(draft.level) || 1;
  const featureLevel = feature => Number.parseInt(String(feature?.name || '').match(/\d+/)?.[0] || '1', 10);
  const classFeatures = [...(definition?.features || []), ...((definition?.subclassFeatures || {})[draft.subclass] || [])]
    .filter(feature => featureLevel(feature) <= level)
    .map(feature => [feature.name, feature.description]);
  const featFeatures = (draft.sheet?.selectedFeats || []).flatMap(id => {
    const feat = ruleset?.feats?.find(candidate => candidate.id === id);
    return feat ? [[feat.name, feat.description]] : [];
  });
  return Object.fromEntries([...classFeatures, ...featFeatures]);
}
