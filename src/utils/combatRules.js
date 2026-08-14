export function resetTurnResources(character) {
  return {
    ...character,
    combatSpeedRemaining: character.speed ?? 30,
    combatStartGridX: character.gridX ?? 2,
    combatStartGridY: character.gridY ?? 2,
    resources: (character.resources || []).map(resource =>
      resource.resetType === 'turn' ? { ...resource, value: resource.max } : resource
    )
  };
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
    const agilityA = characterA?.stats?.['敏捷 (Agility)'] ?? 10;
    const agilityB = characterB?.stats?.['敏捷 (Agility)'] ?? 10;
    if (agilityB !== agilityA) return agilityB - agilityA;
    return Number(characterB?.type === 'PC') - Number(characterA?.type === 'PC');
  });
}
