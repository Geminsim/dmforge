import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicPresentationSnapshot, normalizePresentationSettings } from '../src/utils/presentation.js';

test('removes secret terrain and private campaign fields from presentation snapshots', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1',
    maps: [{ id: 'm1', name: 'Map', width: 10, height: 10, terrainAreas: [{ id: 'visible', name: 'Fog' }, { id: 'secret', name: 'Trap', isSecret: true }] }],
    characters: [{ id: 'c1', name: 'Hero', type: 'PC', mapId: 'm1', hp: 5, maxHp: 10, stats: { secret: 99 }, feats: { hidden: 'text' }, notes: 'secret' }],
    logs: [{ type: 'NOTE', content: 'DM secret' }, { type: 'COMBAT', content: 'Public hit', visibility: 'public' }],
    combatTurnOrder: [{ id: 'c1', total: 15 }], syncToken: 'never-leak', floatingNotes: [{ content: 'secret' }]
  }, {}, {});
  const serialized = JSON.stringify(snapshot);
  assert.equal(snapshot.campaign.map.terrainAreas.length, 1);
  assert.equal(snapshot.campaign.publicEvents.length, 1);
  for (const secret of ['never-leak', 'DM secret', 'floatingNotes', 'stats', 'feats', 'notes', 'Trap']) assert.equal(serialized.includes(secret), false);
});

test('normalizes unsafe presentation settings', () => {
  const settings = normalizePresentationSettings({ scene: 'invalid', cameraMode: 'hack', fontScale: 99, caption: 'x'.repeat(1000) });
  assert.equal(settings.scene, 'battle');
  assert.equal(settings.cameraMode, 'follow-active');
  assert.equal(settings.fontScale, 1.5);
  assert.equal(settings.caption.length, 500);
});

test('hides selected characters and lets the DM hide player-visible blocked cells', () => {
  const campaign = {
    activeMapId: 'm1',
    maps: [{ id: 'm1', blockedCells: { '1,1': true, '2,2': false } }],
    characters: [
      { id: 'shown', name: 'Shown', type: 'PC', mapId: 'm1' },
      { id: 'hidden-by-setting', name: 'Hidden', type: 'NPC', mapId: 'm1' },
      { id: 'hidden-by-record', name: 'Secret', type: 'NPC', mapId: 'm1', presentationVisible: false }
    ],
    combatTurnOrder: [{ id: 'shown', total: 20 }, { id: 'hidden-by-setting', total: 19 }]
  };
  const privateSnapshot = buildPublicPresentationSnapshot(campaign, { hiddenCharacterIds: ['hidden-by-setting'], showBlockedCells: false }, {});
  assert.deepEqual(privateSnapshot.campaign.characters.map(character => character.id), ['shown']);
  assert.deepEqual(privateSnapshot.campaign.combatTurnOrder.map(entry => entry.id), ['shown']);
  assert.deepEqual(privateSnapshot.campaign.map.blockedCells, {});

  const publicSnapshot = buildPublicPresentationSnapshot(campaign, {}, {});
  assert.deepEqual(publicSnapshot.campaign.map.blockedCells, { '1,1': true });
});

test('publishes map collections and only public token drag previews', () => {
  const campaign = {
    activeMapId: 'm2',
    maps: [{ id: 'm1', name: 'One' }, { id: 'm2', name: 'Two' }],
    characters: [
      { id: 'public', name: 'Hero', type: 'PC', mapId: 'm2', gridX: 2, gridY: 3 },
      { id: 'secret', name: 'Hidden monster', type: 'NPC', mapId: 'm2', isHidden: true }
    ]
  };
  const publicDrag = buildPublicPresentationSnapshot(campaign, {}, {}, {
    draggedToken: { id: 'public', name: 'Hero', startX: 2, startY: 3 },
    dragHoverCoords: { x: 6, y: 7 }, isForced: false
  });
  assert.equal(publicDrag.campaign.maps.length, 2);
  assert.equal(publicDrag.campaign.activeMapId, 'm2');
  assert.equal(publicDrag.interaction.draggedToken.id, 'public');

  const secretDrag = buildPublicPresentationSnapshot(campaign, {}, {}, {
    draggedToken: { id: 'secret', name: 'Hidden monster', startX: 2, startY: 3 },
    dragHoverCoords: { x: 6, y: 7 }, isForced: false
  });
  assert.equal(secretDrag.interaction, null);
  assert.equal(JSON.stringify(secretDrag).includes('Hidden monster'), false);
});

test('presentation reflects burnout AC and preserves SF6 resource reset types', () => {
  const snapshot = buildPublicPresentationSnapshot({
    maps: [{ id: 'map', name: 'Map', width: 10, height: 10 }], activeMapId: 'map',
    characters: [{ id: 'pc', name: 'PC', type: 'PC', ac: 14, resources: [{ name: '斗气', value: 0, max: 6, resetType: 'short_rest' }], conditions: [{ id: 'burnout', name: '斗气枯竭', duration: 'permanent' }] }],
    combatTurnOrder: []
  }, {});
  assert.equal(snapshot.campaign.characters[0].ac, 11);
  assert.equal(snapshot.campaign.characters[0].resources[0].resetType, 'short_rest');
});
