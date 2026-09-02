import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPublicPresentationSnapshot, normalizePresentationSettings } from '../src/utils/presentation.js';
import { createCutscene, publicCutscene } from '../src/utils/cutscenes.js';

test('cutscenes accept bundled campaign art and normalize transitions', () => {
  const scene = publicCutscene(createCutscene({
    id: 'intro', mediaType: 'image', mediaUrl: '/campaigns/sf6/chapter-1/cutscenes/intro.webp',
    effect: 'frost', transition: 'cinematic'
  }));
  assert.equal(scene.mediaUrl, '/campaigns/sf6/chapter-1/cutscenes/intro.webp');
  assert.equal(scene.effect, 'frost');
  assert.equal(scene.transition, 'cinematic');
  assert.equal(publicCutscene({ mediaType: 'image', mediaUrl: '//untrusted.example/image.webp' }).mediaUrl, '');
});

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
  for (const secret of ['never-leak', 'DM secret', 'floatingNotes', 'notes', 'Trap']) assert.equal(serialized.includes(secret), false);
});

test('preserves free-angle terrain endpoints for presenter rendering', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1',
    maps: [{ id: 'm1', width: 20, height: 20, vision: { enabled: false }, terrainAreas: [{ id: 'diagonal', name: '斜墙', placement: 'edge', orientation: 'free', type: 'rect', gridX: 2, gridY: 3, endX: 8, endY: 9, length: 8.49, width: .15, height: .15, movementMode: 'blocked', visionMode: 'blocked' }] }],
    characters: [], combatTurnOrder: [], logs: []
  }, {}, {});
  const terrain = snapshot.campaign.map.terrainAreas[0];
  assert.equal(terrain.orientation, 'free');
  assert.deepEqual([terrain.gridX, terrain.gridY, terrain.endX, terrain.endY], [2, 3, 8, 9]);
});

test('preserves safe map component artwork and state for presenter rendering', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', characters: [], combatTurnOrder: [], logs: [],
    maps: [{ id: 'm1', width: 20, height: 20, vision: { enabled: false }, terrainAreas: [{
      id: 'server', name: '服务器', type: 'rect', placement: 'area', gridX: 2, gridY: 3, width: 2, height: 3,
      featureType: 'serverRack', assetKey: 'server-rack', visualState: 'active', movementMode: 'blocked', visionMode: 'blocked'
    }] }]
  }, {}, {});
  const terrain = snapshot.campaign.map.terrainAreas[0];
  assert.deepEqual([terrain.featureType, terrain.assetKey, terrain.visualState], ['serverRack', 'server-rack', 'active']);
});

test('publishes complete trap annotations only after a secret trap is revealed', () => {
  const trap = {
    id: 'trap', name: '电击门槛', type: 'rect', placement: 'area', gridX: 2, gridY: 3, width: 2, height: 1,
    isSecret: true, hazardLevel: 'arcane', trapTrigger: '跨越门槛', trapCheck: '敏捷 DC 13', trapEffect: '2d6 电击伤害',
    trapDuration: '即时', trapDisarm: '切断电源'
  };
  const base = { activeMapId: 'm1', characters: [], combatTurnOrder: [], logs: [] };
  const hidden = buildPublicPresentationSnapshot({ ...base, maps: [{ id: 'm1', width: 20, height: 20, vision: { enabled: false }, terrainAreas: [trap] }] }, {}, {});
  assert.equal(hidden.campaign.map.terrainAreas.length, 0);
  const revealed = buildPublicPresentationSnapshot({ ...base, maps: [{ id: 'm1', width: 20, height: 20, vision: { enabled: false }, terrainAreas: [{ ...trap, discoveredByParty: true }] }] }, {}, {});
  assert.deepEqual(
    ['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm'].map(key => revealed.campaign.map.terrainAreas[0][key]),
    ['跨越门槛', '敏捷 DC 13', '2d6 电击伤害', '即时', '切断电源']
  );
});

test('preserves independent room-label anchors in presenter snapshots', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', maps: [{ id: 'm1', width: 20, height: 20, vision: { enabled: false }, terrainAreas: [{ id: 'room', name: '房间', type: 'rect', gridX: 2, gridY: 3, width: 10, height: 8, labelX: 6, labelY: 5, labelMaxWidth: 12 }] }], characters: [], logs: [], combatTurnOrder: []
  }, {}, {});
  assert.deepEqual([snapshot.campaign.map.terrainAreas[0].labelX, snapshot.campaign.map.terrainAreas[0].labelY], [6, 5]);
});

test('publishes safe map drawing strokes to the presenter', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', characters: [], logs: [], combatTurnOrder: [],
    maps: [{
      id: 'm1', name: 'Drawing map', width: 20, height: 10, terrainAreas: [], blockedCells: {},
      drawings: [{ id: 'stroke-1', color: '#ffcc33', width: 7, points: [{ x: 1, y: 2 }, { x: 30, y: -5 }] }]
    }]
  }, {}, {});
  assert.deepEqual(snapshot.campaign.map.drawings, [{
    id: 'stroke-1', color: '#ffcc33', width: 7, points: [{ x: 1, y: 2 }, { x: 20, y: 0 }]
  }]);
});

test('publishes full sheet details only for player characters', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', maps: [{ id: 'm1', width: 4, height: 4 }], combatTurnOrder: [], logs: [],
    characters: [
      { id: 'pc', name: 'Hero', type: 'PC', mapId: 'm1', class: '军士', stats: { 力量: 15 }, feats: { 反击: '受到攻击后反击' }, sheet: { inventory: '格斗服', attacks: [{ name: '重拳', diceCount: 2, die: 'd6', description: '击退目标' }] } },
      { id: 'npc', name: 'Guard', type: 'NPC', mapId: 'm1', class: '军士', stats: { 力量: 99 }, feats: { 秘密能力: '不可公开' }, sheet: { biography: 'DM secret' } }
    ], itemPool: [{ id: 'glove', name: '强化拳套', category: '装备及服装', ownerId: 'pc', quantity: 1 }, { id: 'secret-item', name: '敌方密钥', category: '工具', ownerId: 'npc', quantity: 1 }]
  }, {}, {});
  const pc = snapshot.campaign.characters.find(character => character.id === 'pc');
  const npc = snapshot.campaign.characters.find(character => character.id === 'npc');

  assert.equal(pc.details.stats.力量, 15);
  assert.equal(pc.details.attacks[0].name, '重拳');
  assert.equal(pc.details.feats.反击, '受到攻击后反击');
  assert.deepEqual(pc.details.items, [{ name: '强化拳套', quantity: 1, category: '装备及服装' }]);
  assert.equal(pc.details.inventory, '格斗服');
  assert.equal(npc.class, '军士');
  assert.equal(npc.details, undefined);
  assert.equal(JSON.stringify(npc).includes('秘密能力'), false);
});

test('publishes short combat and dice history but filters private and hidden-character events', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', maps: [{ id: 'm1', width: 4, height: 4 }], combatTurnOrder: [],
    characters: [{ id: 'pc', name: 'Hero', type: 'PC', mapId: 'm1' }, { id: 'hidden', name: 'Secret Guard', type: 'NPC', mapId: 'm1', presentationVisible: false }],
    logs: [
      { type: 'DICE', content: 'Hero 掷骰 1d20 = 18' },
      { type: 'COMBAT', content: 'Hero 移动 5ft' },
      { type: 'COMBAT', content: 'Secret Guard 发动伏击' },
      { type: 'DICE', content: 'private roll', visibility: 'private' }
    ]
  }, {}, {});

  assert.deepEqual(snapshot.campaign.publicEvents.map(event => event.content), ['Hero 掷骰 1d20 = 18', 'Hero 移动 5ft']);
});

test('normalizes unsafe presentation settings', () => {
  const settings = normalizePresentationSettings({ scene: 'invalid', cameraMode: 'hack', fontScale: 99, caption: 'x'.repeat(1000) });
  assert.equal(settings.scene, 'battle');
  assert.equal(settings.cameraMode, 'follow-dm');
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

test('drag previews do not reveal destination fog before the token is dropped', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1', logs: [], combatTurnOrder: [],
    maps: [{
      id: 'm1', name: 'Fog map', width: 12, height: 4, blockedCells: {}, terrainAreas: [],
      vision: { enabled: true, ambientLight: 'bright', exploredCells: {}, lightSources: [] }
    }],
    characters: [{
      id: 'pc', name: 'Hero', type: 'PC', mapId: 'm1', gridX: 1, gridY: 1,
      vision: { normalVisionLimit: 1, darkvision: 0 }
    }]
  }, {}, {}, {
    draggedToken: { id: 'pc', name: 'Hero', startX: 1, startY: 1 },
    dragHoverCoords: { x: 9, y: 1 }, isForced: false
  });

  assert.equal(snapshot.interaction.dragHoverCoords.x, 9);
  assert.equal(snapshot.campaign.map.vision.visibleCells['1_1'], true);
  assert.equal(snapshot.campaign.map.vision.visibleCells['9_1'], undefined);
});

test('lets the director choose a presentation map without changing the DM active map', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'dm-map',
    maps: [{ id: 'dm-map', name: 'DM workspace' }, { id: 'stream-map', name: 'Stream view' }],
    characters: [{ id: 'viewer', name: 'Viewer', type: 'PC', mapId: 'stream-map', gridX: 0, gridY: 0 }],
    combatTurnOrder: []
  }, { scene: 'map', mapId: 'stream-map' }, {});

  assert.equal(snapshot.campaign.map.id, 'stream-map');
  assert.equal(snapshot.campaign.activeMapId, 'stream-map');
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

test('fog-of-war snapshots omit out-of-sight characters and unexplored map data', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'm1',
    maps: [{
      id: 'm1', width: 12, height: 12,
      vision: { enabled: true, ambientLight: 'bright', exploredCells: { '1_1': true } },
      blockedCells: { '1_1': true, '9_9': true },
      terrainAreas: [
        { id: 'near', name: 'Visible debris', gridX: 1, gridY: 1 },
        { id: 'far', name: 'Unseen laboratory', gridX: 9, gridY: 9 }
      ]
    }],
    characters: [
      { id: 'pc', name: 'Hero', type: 'PC', mapId: 'm1', gridX: 1, gridY: 1, vision: { normalVisionLimit: 2 } },
      { id: 'near-npc', name: 'Near target', type: 'NPC', mapId: 'm1', gridX: 2, gridY: 1 },
      { id: 'far-npc', name: 'Secret target', type: 'NPC', mapId: 'm1', gridX: 9, gridY: 9 }
    ],
    combatTurnOrder: []
  }, {}, {});

  assert.deepEqual(snapshot.campaign.characters.map(character => character.id), ['pc', 'near-npc']);
  assert.deepEqual(snapshot.campaign.map.blockedCells, { '1_1': true });
  assert.deepEqual(snapshot.campaign.map.terrainAreas.map(area => area.id), ['near']);
  assert.equal(JSON.stringify(snapshot).includes('Secret target'), false);
  assert.equal(JSON.stringify(snapshot).includes('Unseen laboratory'), false);
});

test('fog remembers the last observed door state until the door is seen again', () => {
  const rememberedClosed = {
    id: 'door', name: '隔离门', featureType: 'door', featureState: 'closed', placement: 'edge', orientation: 'vertical',
    type: 'rect', gridX: 10, gridY: 4, length: 2, width: 0.15, height: 2, movementMode: 'blocked', visionMode: 'blocked',
    isImpassable: true, blocksVision: true, color: 'custom', customColor: '#886622'
  };
  const actualOpen = { ...rememberedClosed, featureState: 'open', movementMode: 'walkable', visionMode: 'transparent', isImpassable: false, blocksVision: false };
  const campaign = {
    activeMapId: 'm1', logs: [], combatTurnOrder: [],
    maps: [{
      id: 'm1', width: 16, height: 10, terrainAreas: [actualOpen], blockedCells: {},
      vision: { enabled: true, ambientLight: 'bright', exploredCells: { '9_4': true, '10_4': true }, exploredTerrainStates: { door: rememberedClosed } }
    }],
    characters: [{ id: 'pc', name: 'Hero', type: 'PC', mapId: 'm1', gridX: 1, gridY: 1, vision: { normalVisionLimit: 2 } }]
  };
  const hiddenSnapshot = buildPublicPresentationSnapshot(campaign, {}, {});
  assert.equal(hiddenSnapshot.campaign.map.terrainAreas[0].featureState, 'closed');
  campaign.characters[0].gridX = 9;
  campaign.characters[0].gridY = 4;
  const visibleSnapshot = buildPublicPresentationSnapshot(campaign, {}, {});
  assert.equal(visibleSnapshot.campaign.map.terrainAreas[0].featureState, 'open');
});

test('publishes only the active cutscene including safe looping video media', () => {
  const snapshot = buildPublicPresentationSnapshot({
    maps: [], characters: [], logs: [], combatTurnOrder: [],
    activeCutsceneId: 'active', playerDisplayMode: 'cutscene',
    cutscenes: [
      { id: 'active', name: '研究所警报', title: '警报已触发', mediaType: 'video', mediaUrl: 'data:video/mp4;base64,AAAA', effect: 'rain', effectIntensity: 3 },
      { id: 'secret', name: '尚未揭示的结局', title: '秘密' }
    ]
  }, { scene: 'story' }, {});

  assert.equal(snapshot.campaign.playerDisplayMode, 'cutscene');
  assert.equal(snapshot.campaign.cutscene.id, 'active');
  assert.equal(snapshot.campaign.cutscene.effect, 'rain');
  assert.match(snapshot.campaign.cutscene.mediaUrl, /^data:video\/mp4/);
  assert.equal(JSON.stringify(snapshot).includes('尚未揭示的结局'), false);
});

test('director renders a fog-enabled map when no player observer is placed on it', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'dark-map', characters: [], logs: [], combatTurnOrder: [],
    maps: [{ id: 'dark-map', name: 'Dark laboratory', width: 4, height: 3, vision: { enabled: true, ambientLight: 'dark', exploredCells: {} } }]
  }, { scene: 'map' }, {});

  assert.equal(Object.keys(snapshot.campaign.map.vision.visibleCells).length, 12);
  assert.equal(Object.keys(snapshot.campaign.map.vision.exploredCells).length, 12);
});

test('director keeps normal fog rules once a player observer is on the map', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'dark-map', logs: [], combatTurnOrder: [],
    maps: [{ id: 'dark-map', name: 'Dark laboratory', width: 4, height: 3, vision: { enabled: true, ambientLight: 'dark', exploredCells: {} } }],
    characters: [{ id: 'pc', name: 'Hero', type: 'PC', mapId: 'dark-map', gridX: 1, gridY: 1 }]
  }, { scene: 'map' }, {});

  assert.equal(Object.keys(snapshot.campaign.map.vision.visibleCells).length, 0);
});

test('explicit public blackout remains dark even when no player observer is placed', () => {
  const snapshot = buildPublicPresentationSnapshot({
    activeMapId: 'dark-map', characters: [], logs: [], combatTurnOrder: [],
    maps: [{ id: 'dark-map', name: 'Dark laboratory', width: 4, height: 3, vision: { enabled: true, publicMode: 'dark', rememberExplored: true, ambientLight: 'bright', exploredCells: { '1_1': true } } }]
  }, { scene: 'map' }, {});

  assert.equal(Object.keys(snapshot.campaign.map.vision.visibleCells).length, 0);
  assert.equal(Object.keys(snapshot.campaign.map.vision.exploredCells).length, 0);
  assert.equal(snapshot.campaign.map.vision.publicMode, 'dark');
});
