import { effectiveSpeed } from './inventoryRules.js';

export function resetTurnResources(character) {
  return {
    ...character,
    combatSpeedRemaining: effectiveSpeed(character),
    combatStartGridX: character.gridX ?? 2,
    combatStartGridY: character.gridY ?? 2,
    resources: (character.resources || []).map(resource =>
      resource.resetType === 'turn' ? { ...resource, value: resource.max } : resource
    )
  };
}

export function prepareCharacterForCombat(character) {
  const prepared = resetTurnResources(character);
  if ((Number(character.level) || 1) < 6) return prepared;
  return {
    ...prepared,
    resources: (prepared.resources || []).map(resource => resource.name === '斗气'
      ? { ...resource, value: Math.min(resource.max, (resource.value || 0) + 3) }
      : resource)
  };
}

export function resetResourcesForRest(character, restType) {
  const allowed = restType === 'long' ? new Set(['turn', 'short_rest', 'long_rest']) : new Set(['turn', 'short_rest']);
  const resources = (character.resources || []).map(resource => {
    if (!allowed.has(resource.resetType)) return resource;
    if (restType === 'short' && resource.name === '斗气') return { ...resource, value: Math.min(resource.max, (resource.value || 0) + 3) };
    return { ...resource, value: resource.max };
  });
  const drive = resources.find(resource => resource.name === '斗气');
  return { ...character, resources, conditions: (character.conditions || []).filter(condition => !(condition.id === 'burnout' && (!drive || drive.value > 0))) };
}

export function spendResource(character, resourceName, amount = 1) {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('资源消耗必须是非负数');
  const resources = (character.resources || []).map(resource => {
    if (resource.name !== resourceName) return resource;
    if (resource.value < amount) throw new Error(`${resourceName}不足`);
    return { ...resource, value: resource.value - amount };
  });
  if (!resources.some(resource => resource.name === resourceName)) throw new Error(`未找到资源：${resourceName}`);
  const drive = resources.find(resource => resource.name === '斗气');
  let conditions = [...(character.conditions || [])];
  if (resourceName === '斗气' && drive?.value === 0 && !conditions.some(condition => condition.id === 'burnout')) conditions.push({ id: 'burnout', name: '斗气枯竭', duration: 'permanent', source: 'resource' });
  return { ...character, resources, conditions };
}

export function effectiveArmorClass(character) {
  return (character.ac ?? 10) - ((character.conditions || []).some(condition => condition.id === 'burnout' || condition.name === '斗气枯竭') ? 3 : 0);
}

const conditionMatches = (condition, ids, names) => ids.includes(condition.id) || names.includes(condition.name);

export function processTurnStartConditions(character) {
  const removed = [];
  let movementMultiplier = 1;
  const conditions = (character.conditions || []).filter(condition => {
    if (conditionMatches(condition, ['knockdown'], ['倒地'])) { removed.push(condition); return false; }
    if (conditionMatches(condition, ['hard-knockdown'], ['强制倒地'])) { removed.push(condition); movementMultiplier = 0.5; return false; }
    return true;
  });
  const speed = effectiveSpeed(character);
  return { character: { ...character, conditions, combatSpeedRemaining: Math.floor(speed * movementMultiplier), combatStartGridX: character.gridX ?? 2, combatStartGridY: character.gridY ?? 2 }, removed, movementMultiplier };
}

export function processTurnEndConditions(character) {
  const removed = [];
  const added = [];
  const transientIds = ['wall-bounce', 'crumple', 'counter-hit', 'punish-counter'];
  const transientNames = ['弹墙', '跪倒', '打康', '确反康'];
  const conditions = [];
  for (const condition of character.conditions || []) {
    if (conditionMatches(condition, ['ground-bounce'], ['弹地'])) {
      removed.push(condition);
      added.push({ id: 'hard-knockdown', name: '强制倒地', duration: 'permanent', source: 'ground-bounce' });
    } else if (conditionMatches(condition, transientIds, transientNames)) removed.push(condition);
    else conditions.push(condition);
  }
  return { character: { ...character, conditions: [...conditions, ...added] }, removed, added };
}

export function tickRoundConditions(characters) {
  const expired = [];
  const updatedCharacters = characters.map(character => {
    const conditions = character.conditions || [];
    const active = [];
    for (const condition of conditions) {
      if (condition.duration === 'permanent') {
        active.push(condition);
        continue;
      }
      const updated = { ...condition, duration: condition.duration - 1 };
      if (updated.duration > 0) active.push(updated);
      else expired.push({ characterId: character.id, characterName: character.name, condition: updated });
    }
    return conditions.length ? { ...character, conditions: active } : character;
  });
  return { characters: updatedCharacters, expired };
}

export function advanceCombatTurn(currentTurnIndex, combatRound, orderLength) {
  if (orderLength <= 0) return { nextIndex: 0, nextRound: combatRound, wrapped: false };
  const nextIndex = (currentTurnIndex + 1) % orderLength;
  const wrapped = nextIndex === 0;
  return { nextIndex, nextRound: wrapped ? combatRound + 1 : combatRound, wrapped };
}

export function removeCombatantFromState(characterId, combatParticipants = [], combatTurnOrder = [], currentTurnIndex = 0) {
  const removedIndex = combatTurnOrder.findIndex(entry => (typeof entry === 'string' ? entry : entry?.id) === characterId);
  const nextOrder = combatTurnOrder.filter(entry => (typeof entry === 'string' ? entry : entry?.id) !== characterId);
  const nextParticipants = combatParticipants.filter(entry => (typeof entry === 'string' ? entry : entry?.id) !== characterId);
  let nextIndex = Math.max(0, Number(currentTurnIndex) || 0);
  if (removedIndex >= 0 && removedIndex < nextIndex) nextIndex -= 1;
  if (nextIndex >= nextOrder.length) nextIndex = 0;
  return { combatParticipants: nextParticipants, combatTurnOrder: nextOrder, currentTurnIndex: nextIndex };
}

export function rollInitiative(characters, participantIds, random = Math.random) {
  return participantIds.flatMap(id => {
    const character = characters.find(candidate => candidate.id === id);
    if (!character) return [];
    const roll = Math.floor(random() * 20) + 1;
    return [{ id, roll, modifier: character.initiative ?? 0, total: roll + (character.initiative ?? 0) }];
  }).sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    const characterA = characters.find(character => character.id === a.id);
    const characterB = characters.find(character => character.id === b.id);
    const agilityA = characterA?.stats?.速度 ?? characterA?.stats?.['敏捷 (Agility)'] ?? 10;
    const agilityB = characterB?.stats?.速度 ?? characterB?.stats?.['敏捷 (Agility)'] ?? 10;
    if (agilityB !== agilityA) return agilityB - agilityA;
    return Number(characterB?.type === 'PC') - Number(characterA?.type === 'PC');
  });
}
