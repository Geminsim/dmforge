export const LONG_REST_CALORIES_PER_PC = 1500;

export const ITEM_CATEGORIES = [
  '恢复消耗品', '战术消耗品', '补给食品', '防具', '衣装', '武器', '饰品', '工具',
  '任务道具', '赛事奖励', '束缚工具', '杂物', '消耗品', '装备及服装', '装备', '服装', '补给'
];

export const CATEGORY_TONES = {
  恢复消耗品: 'verdigris', 战术消耗品: 'ochre', 补给食品: 'amber',
  防具: 'woad', 衣装: 'accent', 武器: 'madder', 饰品: 'accent', 工具: 'ochre',
  任务道具: 'woad', 赛事奖励: 'accent', 束缚工具: 'madder', 杂物: 'neutral',
  消耗品: 'verdigris', 装备及服装: 'woad', 装备: 'woad', 服装: 'accent', 补给: 'amber'
};

const CONSUMABLE_CATEGORIES = new Set(['恢复消耗品', '战术消耗品', '补给食品', '消耗品', '补给']);

export const isConsumableItem = item => Boolean(item?.consumable || CONSUMABLE_CATEGORIES.has(item?.category));
export const isWorldInfiniteItem = item => item?.ownerId === 'WORLD' && (item?.infinite || isConsumableItem(item));
export const characterOwnsFlashlight = (itemPool = [], characterId) => itemPool.some(item => item?.ownerId === characterId
  && Number(item.quantity) > 0 && String(item.name || '').includes('手电筒'));
export const itemUnitWeight = item => Math.max(0, Number(item?.weight) || 0);
export const itemStackWeight = item => itemUnitWeight(item) * Math.max(0, Number(item?.quantity) || 0);

export function enduranceScore(character) {
  return Math.max(1, Number(character?.stats?.耐力 ?? character?.stats?.['体质 (Fortitude)'] ?? 10) || 10);
}

export function getEncumbrance(character, itemPool = []) {
  const capacity = enduranceScore(character) * 5;
  const warningAt = capacity * 0.8;
  const carried = itemPool.filter(item => item.ownerId === character?.id).reduce((sum, item) => sum + itemStackWeight(item), 0);
  const ratio = capacity > 0 ? carried / capacity : 0;
  const overCapacity = carried > capacity;
  return {
    carried: Math.round(carried * 100) / 100,
    capacity,
    warningAt,
    ratio,
    warning: ratio >= 0.8,
    overCapacity,
    speedPenalty: overCapacity ? 10 : 0,
    penaltyText: overCapacity ? '移动速度 −10ft；力量、速度与耐力相关检定处于劣势，无法冲刺。' : ''
  };
}

export const effectiveSpeed = character => Math.max(5, (Number(character?.speed) || 30) - (Number(character?.encumbrance?.speedPenalty) || 0));

export function syncCharacterEncumbrance(characters = [], itemPool = []) {
  let changed = false;
  const next = characters.map(character => {
    if (character.type !== 'PC') return character;
    const encumbrance = getEncumbrance(character, itemPool);
    const old = character.encumbrance || {};
    const same = old.carried === encumbrance.carried && old.capacity === encumbrance.capacity && old.warning === encumbrance.warning && old.overCapacity === encumbrance.overCapacity;
    const conditions = character.conditions || [];
    const withoutOld = conditions.filter(condition => condition.id !== 'overburdened');
    const nextConditions = encumbrance.overCapacity
      ? [...withoutOld, { id: 'overburdened', name: '超重', duration: 'permanent', source: 'encumbrance', description: encumbrance.penaltyText }]
      : withoutOld;
    const conditionSame = nextConditions.length === conditions.length && nextConditions.every((condition, index) => condition.id === conditions[index]?.id && condition.description === conditions[index]?.description);
    if (same && conditionSame) return character;
    changed = true;
    return { ...character, encumbrance, conditions: nextConditions };
  });
  return changed ? next : characters;
}

export function getLongRestRations(itemPool = [], characterIds = [], caloriesPerCharacter = LONG_REST_CALORIES_PER_PC) {
  const owners = new Set(characterIds);
  const eligible = itemPool.filter(item => owners.has(item.ownerId) && Number(item.calories) > 0 && Number(item.quantity) > 0);
  const required = characterIds.length * caloriesPerCharacter;
  const available = eligible.reduce((sum, item) => sum + Number(item.calories) * Number(item.quantity), 0);
  let remaining = required;
  const consumption = [];
  for (const item of eligible) {
    if (remaining <= 0) break;
    const unitCalories = Number(item.calories);
    const quantity = Math.min(Number(item.quantity), Math.ceil(remaining / unitCalories));
    consumption.push({ id: item.id, quantity, calories: quantity * unitCalories });
    remaining -= quantity * unitCalories;
  }
  return { required, available, shortage: Math.max(0, required - available), enough: available >= required, consumption };
}

export function consumeLongRestRations(itemPool = [], plan) {
  const quantities = new Map((plan?.consumption || []).map(entry => [entry.id, entry.quantity]));
  return itemPool.map(item => quantities.has(item.id) ? { ...item, quantity: item.quantity - quantities.get(item.id) } : item).filter(item => Number(item.quantity) > 0);
}
