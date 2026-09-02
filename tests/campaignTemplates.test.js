import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlankCampaign, createSf6Campaign, upgradeSf6BuiltInMaps } from '../src/data/campaignTemplates.js';
import { assertValidCampaign } from '../src/utils/campaignValidation.js';

test('built-in SF6 campaign is valid, empty of demo actors, and includes chapter one material', () => {
  const campaign = createSf6Campaign();
  assert.doesNotThrow(() => assertValidCampaign(campaign));
  assert.equal(campaign.characters.length, 0);
  assert.ok(campaign.itemPool.length >= 69);
  assert.ok(campaign.itemPool.some(item => item.name === '温热石吊坠'));
  assert.ok(campaign.itemPool.some(item => item.name === '所长的研究 U 盘'));
  assert.ok(campaign.floatingNotes.some(note => note.id === 'note_ch1_run_order'));
  assert.equal(campaign.metadata.contentVersion, 'chapter-1-v16-map-backgrounds');
  assert.equal(campaign.cutscenes.length, 12);
  assert.deepEqual(campaign.cutscenes.map(scene => scene.id), [
    'sf6_ch1_01_arrival', 'sf6_ch1_02_vr_prepare', 'sf6_ch1_03_vr_battle', 'sf6_ch1_04_awards',
    'sf6_ch1_05_offer', 'sf6_ch1_06_transit_accept', 'sf6_ch1_06_transit_refuse', 'sf6_ch1_07_awakening',
    'sf6_ch1_08_breakout', 'sf6_ch1_09_truth', 'sf6_ch1_10_finale', 'sf6_ch1_11_ending'
  ]);
  assert.ok(campaign.cutscenes.every(scene => scene.mediaType === 'image' && scene.mediaUrl.startsWith('/campaigns/sf6/chapter-1/cutscenes/')));
  assert.deepEqual(campaign.maps.map(map => map.id), ['map_sf6_vr_octagon', 'map_sf6_cryolab_2f', 'map_sf6_research_hall_1f']);
  assert.deepEqual(campaign.maps.map(map => map.bgUrl), [
    '/campaigns/sf6/chapter-1/maps/vr-octagon-background.png',
    '/campaigns/sf6/chapter-1/maps/cryolab-2f-background.png',
    '/campaigns/sf6/chapter-1/maps/research-hall-1f-background.png'
  ]);
  assert.equal(campaign.activeMapId, 'map_sf6_vr_octagon');
  assert.equal(campaign.maps[0].spawnPoints.length, 4);
  assert.deepEqual(campaign.maps[0].spawnPoints, [{ x: 14, y: 17 }, { x: 57, y: 17 }, { x: 14, y: 54 }, { x: 57, y: 54 }]);
  const arena = campaign.maps[0].terrainAreas.find(area => area.id === 'vr_ring');
  assert.deepEqual([arena.gridX, arena.gridY, arena.width, arena.height, arena.labelX, arena.labelY], [8, 22, 56, 28, 36, 36]);
  assert.ok(campaign.maps.every(map => Object.keys(map.blockedCells).length === 0));
  assert.equal(campaign.maps[0].terrainAreas.filter(area => area.id.startsWith('vr_cage_')).length, 8);
  assert.equal(campaign.maps[0].terrainAreas.filter(area => area.orientation === 'free').length, 4);
  assert.deepEqual(campaign.maps[0].terrainAreas.filter(area => area.id.startsWith('vr_cage_')).map(area => [area.gridX, area.gridY]), [[22,8],[50,8],[64,22],[64,50],[22,64],[22,64],[8,22],[8,22]]);
  assert.ok(campaign.maps.slice(1).flatMap(map => map.terrainAreas).filter(area => !area.featureType && !area.isSecret).every(area => Number.isFinite(area.labelX) && Number.isFinite(area.labelY)));
  assert.ok(campaign.maps.every(map => map.vision.enabled && map.vision.visionRangeCap === 180));
  assert.ok(campaign.maps.slice(1).every(map => map.terrainAreas.some(area => area.featureType === 'door')));
  assert.ok(campaign.maps[1].terrainAreas.some(area => area.featureType === 'window'));
  const cryolab = campaign.maps[1];
  assert.equal(cryolab.backgroundScaleY, 111.6);
  assert.equal(cryolab.backgroundPositionY, 93);
  const cryoRoom = cryolab.terrainAreas.find(area => area.id === 'cryo_room');
  assert.deepEqual([cryoRoom.gridX, cryoRoom.gridY, cryoRoom.width, cryoRoom.height, cryoRoom.labelX, cryoRoom.labelY], [4, 4, 33, 23, 20.5, 15.5]);
  const cryopods = cryolab.terrainAreas.filter(area => area.id.startsWith('cryo_pod_'));
  assert.equal(cryopods.length, 5);
  assert.ok(cryopods.every(area => area.movementMode === 'blocked' && area.visionMode === 'transparent' && area.transmitsLight && !area.blocksVision));
  const corridorTrap = cryolab.terrainAreas.find(area => area.id === 'cryo_alarm_sensor');
  assert.deepEqual([corridorTrap.labelX, corridorTrap.labelY], [46.5, 34.5]);
  assert.ok(Math.abs(corridorTrap.labelY - cryolab.terrainAreas.find(area => area.id === 'cryo_corridor').labelY) >= 3);
  assert.equal(campaign.maps[2].terrainAreas.some(area => ['hall_lockdown_left', 'hall_lockdown_right'].includes(area.id)), false);
  assert.deepEqual(
    ['hall_west_rooms1', 'hall_east_rooms1'].map(id => {
      const wall = campaign.maps[2].terrainAreas.find(area => area.id === id);
      return [wall.gridY, wall.gridY + wall.length];
    }),
    [[31, 43], [31, 43]]
  );
  assert.ok(campaign.maps[2].terrainAreas.filter(area => area.featureType === 'pillar').length === 6);
  assert.ok(campaign.maps.flatMap(map => map.terrainAreas).filter(area => area.featureType).every(area => area.movementMode && area.visionMode && area.coverLevel));
  assert.ok(campaign.maps[1].terrainAreas.some(area => area.name === '冷冻仓控制台'));
  assert.ok(campaign.maps[2].terrainAreas.some(area => area.name === '大型主控制台'));
  const furnishedAssets = new Set(campaign.maps.slice(1).flatMap(map => map.terrainAreas.map(area => area.assetKey).filter(Boolean)));
  for (const assetKey of ['lab-workstation', 'specimen-tank', 'server-rack', 'locker-bank', 'medical-cart', 'vending-machine', 'potted-plant', 'waiting-bench', 'generator', 'portable-barricade']) {
    assert.equal(furnishedAssets.has(assetKey), true, `${assetKey} should be placed on a built-in map`);
  }
  const triggeringTraps = campaign.maps.flatMap(map => map.terrainAreas).filter(area => area.isSecret && area.hazardLevel !== 'none');
  assert.equal(triggeringTraps.length, 4);
  assert.ok(triggeringTraps.every(area => ['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm'].every(key => area[key]?.trim())));
  assert.equal(campaign.maps[0].vision.enabled, true);
  assert.equal(campaign.maps[1].vision.ambientLight, 'dark');
  assert.equal(campaign.maps[2].vision.ambientLight, 'dim');
  assert.equal(campaign.itemPool.find(item => item.name === '手电筒')?.lightSource?.shape, 'cone');
  assert.ok(campaign.itemPool.filter(item => item.ownerId === 'WORLD').every(item => Number(item.weight) >= 0));
  assert.ok(campaign.itemPool.filter(item => item.category === '补给食品').every(item => item.calories >= 800 && item.infinite));
  assert.ok(campaign.itemPool.filter(item => item.category === '防具').every(item => item.acBonus > 0));
  assert.ok(campaign.itemPool.filter(item => item.category === '武器').every(item => item.damageDie));
  assert.equal(campaign.ruleset.classes.length, 7);
  assert.equal(campaign.ruleset.characterSheetTemplate, '/templates/角色卡.xlsx');
  assert.equal(campaign.ruleset.feats.length, 29);
  assert.equal(campaign.ruleset.classes.every(entry => entry.features.length > 0), true);
  assert.equal(campaign.ruleset.classes.every(entry => Object.keys(entry.subclassFeatures).length === entry.subclasses.length), true);
  assert.equal(campaign.ruleset.conditions.length >= 15, true);
  assert.deepEqual(campaign.ruleset.resources.map(resource => resource.name), ['动作', '附赠动作', '反应', '斗气', '超级必杀槽']);
  assert.equal(campaign.ruleset.resources.find(resource => resource.id === 'super').max, 1);
  assert.equal(campaign.ruleset.sourceDocumentUrl, '/templates/sf6-rulebook-v0.9.1.pdf');
  assert.equal(campaign.ruleset.version, '0.9.1');
  assert.equal(campaign.enemyBestiary.length, 21);
  assert.equal(campaign.metadata.bestiaryVersion, 'sf6-security-roster-v3-complete-loadouts');
  assert.ok(campaign.ruleset.sections.find(section => section.id === 'setting')?.details?.length >= 3);
  assert.ok(campaign.ruleset.feats.filter(feat => feat.minimumLevel === 5).every(feat => !/（[^）]+）\s*$/.test(feat.description)));
  assert.ok(campaign.ruleset.sections.filter(section => section.category !== '背景故事' && !['专长', '职业与子职业', '人物状态'].includes(section.category)).every(section => section.details?.length > 0));
  assert.match(campaign.ruleset.sections.find(section => section.id === 'normals')?.details?.find(detail => detail.title === '轻攻击')?.text || '', /1d4/);
  assert.match(campaign.ruleset.sections.find(section => section.id === 'turn-economy')?.details?.find(detail => detail.title === '斗气恢复')?.text || '', /3\s*格斗气/);
  assert.equal(campaign.ruleset.feats.some(feat => feat.name === '跑打' && feat.minimumLevel === 5), true);
  const allClassFeatures = campaign.ruleset.classes.flatMap(entry => [
    ...entry.features,
    ...Object.values(entry.subclassFeatures).flat()
  ]);
  assert.match(allClassFeatures.find(feature => feature.name.includes('走火入魔'))?.description || '', /所有以你为目标的攻击也会获得优势骰/);
  assert.match(campaign.ruleset.sections.find(section => section.id === 'setting')?.details?.find(detail => detail.title === '枪械与超常格斗')?.text || '', /不能简单跳过战斗并直接造成剧情性死亡/);
});

test('built-in map migration replaces legacy cell walls while preserving custom maps and backgrounds', () => {
  const legacy = [
    { id: 'map_sf6_cryolab_2f', name: '自定义名称', bgUrl: '/custom-floor.png', blockedCells: { '1_1': true }, terrainAreas: [] },
    { id: 'custom-map', name: '自制地图', width: 20, height: 20, blockedCells: { '2_2': true }, terrainAreas: [] }
  ];
  const migrated = upgradeSf6BuiltInMaps(legacy);
  const cryolab = migrated.find(map => map.id === 'map_sf6_cryolab_2f');
  assert.equal(cryolab.name, '自定义名称');
  assert.equal(cryolab.bgUrl, '/custom-floor.png');
  assert.deepEqual(cryolab.blockedCells, {});
  assert.ok(cryolab.terrainAreas.some(area => area.featureType === 'door'));
  assert.equal(migrated.find(map => map.id === 'custom-map').blockedCells['2_2'], true);
  assert.equal(migrated.filter(map => map.id.startsWith('map_sf6_')).length, 3);
});

test('templates create independent mutable saves', () => {
  const first = createSf6Campaign();
  const second = createSf6Campaign();
  first.ruleset.classes[0].name = 'changed';
  assert.equal(second.ruleset.classes[0].name, '武道者');
  assert.doesNotThrow(() => assertValidCampaign(createBlankCampaign()));
});
