import { CURRENT_SCHEMA_VERSION } from '../utils/campaignValidation.js';
import { SF6_ATTRIBUTE_LABELS, SF6_RESOURCES, SF6_RULESET } from './sf6Ruleset.js';
import { SF6_ENEMY_BESTIARY_VERSION, SF6_STANDARD_ENEMIES } from './sf6EnemyBestiary.js';
import { SF6_GENERAL_ITEMS } from './sf6ItemCatalog.js';
import { createTerrainFeature } from '../utils/terrainRules.js';
import { createCutscene } from '../utils/cutscenes.js';

const groups = [{ id: 'group_pcs', name: '玩家成员' }, { id: 'group_npcs', name: '敌人与 NPC' }];
const blankMap = (id = 'map_blank_1', name = '未命名地图') => ({ id, name, width: 60, height: 40, bgUrl: '', blockedCells: {}, terrainAreas: [] });

const floorArea = (id, name, customColor, gridX, gridY, width, height, extra = {}) => ({
  id, name, type: 'rect', placement: 'area', color: 'custom', customColor, gridX, gridY, width, height,
  hazardLevel: 'none', movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none',
  baseHeight: 0, obstacleHeight: 0, transmitsLight: true, transmitsAttacks: true,
  isSecret: false, discoveredByParty: true, isImpassable: false, blocksVision: false, ...extra
});

const obstacle = (featureType, id, name, gridX, gridY, width, height, extra = {}) => ({
  ...createTerrainFeature(featureType, { id, gridX, gridY, color: 'custom', customColor: extra.customColor || '#64748b' }),
  id, name, gridX, gridY, width, height, type: 'rect', placement: 'area', ...extra
});

const edge = (featureType, id, name, x1, y1, x2, y2, extra = {}) => {
  const horizontal = y1 === y2;
  const vertical = x1 === x2;
  const length = Math.max(0.1, Math.hypot(x2 - x1, y2 - y1));
  const gridX = horizontal ? Math.min(x1, x2) : x1;
  const gridY = vertical ? Math.min(y1, y2) : y1;
  return {
    ...createTerrainFeature(featureType, { id, gridX, gridY, color: 'custom', customColor: extra.customColor || '#64748b' }),
    id, name, gridX, gridY, placement: 'edge', type: 'rect',
    orientation: horizontal ? 'horizontal' : vertical ? 'vertical' : 'free',
    length, width: horizontal ? length : 0.15, height: vertical ? length : 0.15,
    ...(!horizontal && !vertical ? { endX: x2, endY: y2 } : {}), ...extra
  };
};

const wall = (id, x1, y1, x2, y2, extra = {}) => edge('wall', id, extra.name || '墙体', x1, y1, x2, y2, extra);
const door = (id, name, x1, y1, x2, y2, extra = {}) => edge('door', id, name, x1, y1, x2, y2, extra);
const windowEdge = (id, name, x1, y1, x2, y2, extra = {}) => edge('window', id, name, x1, y1, x2, y2, extra);
const visionConfig = (ambientLight, lightSources = [], extra = {}) => ({
  enabled: true, ambientLight, visionRangeCap: 180, ceilingHeight: 12,
  publicMode: 'player', rememberExplored: true, exploredCells: {}, exploredTerrainStates: {},
  memoryInitialCells: {}, memoryInitialTerrainStates: {}, memoryCurrentCells: {}, memoryCurrentTerrainStates: {},
  manualVisibleCells: {}, manualHiddenCells: {}, visionBlockers: {}, lightSources, ...extra
});

const createVrArenaMap = () => {
  // Edge features live on grid intersections (0..width), so the arena is centred on (36,36).
  const vertices = [[22, 8], [50, 8], [64, 22], [64, 50], [50, 64], [22, 64], [8, 50], [8, 22]];
  const cage = vertices.map((point, index) => {
    const next = vertices[(index + 1) % vertices.length];
    return edge('window', `vr_cage_${index + 1}`, '八角笼围网', point[0], point[1], next[0], next[1], {
      customColor: '#a78bfa', movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'half',
      obstacleHeight: 12, transmitsLight: true, transmitsAttacks: false, maxHp: 60, currentHp: 60
    });
  });
  return {
    id: 'map_sf6_vr_octagon', name: '第一章 · VR 八角笼', width: 72, height: 72, bgUrl: '/campaigns/sf6/chapter-1/maps/vr-octagon-background.png', blockedCells: {},
    vision: visionConfig('bright', [], { ceilingHeight: 30 }),
    spawnPoints: [{ x: 14, y: 17 }, { x: 57, y: 17 }, { x: 14, y: 54 }, { x: 57, y: 54 }],
    terrainAreas: [
      floorArea('vr_ring', '大型四人混战区', '#172554', 8, 22, 56, 28, { labelX: 36, labelY: 36, suppressOutline: true }),
      floorArea('vr_floor_n1', '擂台地面', '#172554', 22, 8, 28, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_n2', '擂台地面', '#172554', 18, 12, 36, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_n3', '擂台地面', '#172554', 14, 16, 44, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_n4', '擂台地面', '#172554', 10, 20, 52, 2, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_s1', '擂台地面', '#172554', 10, 50, 52, 2, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_s2', '擂台地面', '#172554', 14, 52, 44, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_s3', '擂台地面', '#172554', 18, 56, 36, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_floor_s4', '擂台地面', '#172554', 22, 60, 28, 4, { suppressLabel: true, suppressOutline: true }),
      floorArea('vr_spawn_a', '选手出生点 A', '#581c87', 13, 16, 3, 3),
      floorArea('vr_spawn_b', '选手出生点 B', '#581c87', 56, 16, 3, 3),
      floorArea('vr_spawn_c', '选手出生点 C', '#581c87', 13, 53, 3, 3),
      floorArea('vr_spawn_d', '选手出生点 D', '#581c87', 56, 53, 3, 3),
      ...cage
    ]
  };
};

const createCryolabMap = () => {
  const walls = [
    wall('cryo_outer_n', 4, 4, 91, 4), wall('cryo_outer_s', 4, 59, 91, 59), wall('cryo_outer_w', 4, 4, 4, 59), wall('cryo_outer_e', 91, 4, 91, 59),
    wall('cryo_corr_n1', 4, 27, 18, 27), wall('cryo_corr_n2', 22, 27, 73, 27), wall('cryo_corr_n3', 77, 27, 91, 27),
    wall('cryo_corr_s1', 4, 36, 17, 36), wall('cryo_corr_s2', 21, 36, 57, 36), wall('cryo_corr_s3', 61, 36, 91, 36),
    wall('cryo_obs_w1', 37, 4, 37, 16), wall('cryo_obs_w2', 37, 19, 37, 27),
    wall('cryo_obs_split1', 37, 13, 41, 13), wall('cryo_obs_split2', 44, 13, 48, 13),
    wall('cryo_obs_e1', 48, 4, 48, 19), wall('cryo_obs_e2', 48, 22, 48, 27),
    wall('cryo_east_w1', 66, 4, 66, 18), wall('cryo_east_w2', 66, 22, 66, 27),
    wall('cryo_toilet_e1', 82, 4, 82, 15), wall('cryo_toilet_e2', 82, 18, 82, 27),
    wall('cryo_toilet_s1', 66, 17, 73, 17), wall('cryo_toilet_s2', 76, 17, 82, 17),
    wall('cryo_storage_e1', 31, 36, 31, 47), wall('cryo_storage_e2', 31, 51, 31, 59),
    wall('cryo_gear_e1', 48, 36, 48, 45), wall('cryo_gear_e2', 48, 49, 48, 59),
    wall('cryo_service_e1', 72, 36, 72, 47), wall('cryo_service_e2', 72, 51, 72, 59)
  ];
  const doors = [
    door('cryo_door_lab', '冷冻研究室门', 18, 27, 22, 27), door('cryo_door_east_lab', '东研究室门', 73, 27, 77, 27),
    door('cryo_door_storage', '储藏室门', 17, 36, 21, 36, { featureState: 'locked' }), door('cryo_door_service', '维护区门', 57, 36, 61, 36),
    door('cryo_door_observation', '观察间门', 37, 16, 37, 19), door('cryo_door_record', '记录间门', 41, 13, 44, 13),
    door('cryo_door_obs_corridor', '观察区走廊门', 48, 19, 48, 22), door('cryo_door_toilet_lobby', '东区门', 66, 18, 66, 22),
    door('cryo_door_toilet', '洗手间门', 73, 17, 76, 17), door('cryo_door_east_stair', '东楼梯门', 82, 15, 82, 18),
    door('cryo_door_storage_inner', '储藏区侧门', 31, 47, 31, 51), door('cryo_door_gear', '装备间门', 48, 45, 48, 49),
    door('cryo_door_guard', '安保休息室门', 72, 47, 72, 51)
  ];
  const fixtures = [
    ...[[9,9],[17,9],[25,9],[9,19],[25,19]].map(([x, y], i) => obstacle('cryoPod', `cryo_pod_${i + 1}`, `冷冻仓 ${i + 1}`, x, y, 4, 5, {
      customColor: '#38bdf8', obstacleHeight: 7,
      movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'threeQuarters',
      transmitsLight: true, transmitsAttacks: false, isImpassable: true, blocksVision: false,
      maxHp: 20, currentHp: 20
    })),
    obstacle('console', 'cryo_console', '冷冻仓控制台', 17, 20, 6, 3, { customColor: '#f59e0b' }),
    obstacle('table', 'cryo_obs_desk', '观察记录桌', 40, 8, 5, 2, { customColor: '#22c55e' }),
    windowEdge('cryo_obs_window', '强化观察窗', 37, 7, 37, 12, { customColor: '#67e8f9' }),
    obstacle('shelf', 'cryo_storage_shelf_a', '储藏货架 A', 8, 42, 8, 2, { customColor: '#84cc16', obstacleHeight: 6, visionMode: 'blocked', coverLevel: 'full' }),
    obstacle('shelf', 'cryo_storage_shelf_b', '储藏货架 B', 8, 51, 8, 2, { customColor: '#84cc16', obstacleHeight: 6, visionMode: 'blocked', coverLevel: 'full' }),
    obstacle('maintenanceBench', 'cryo_maintenance_console', '设备维护台', 54, 51, 10, 3, { customColor: '#0ea5e9' }),
    obstacle('table', 'cryo_guard_table', '安保休息桌', 78, 45, 6, 3, { customColor: '#ef4444' }),
    obstacle('serverRack', 'cryo_record_server', '观察记录服务器', 45, 5, 2, 3),
    obstacle('sink', 'cryo_toilet_sink', '洗手间洗手台', 68, 5, 4, 1),
    obstacle('toilet', 'cryo_toilet_a', '卫生设施 A', 68, 13, 1, 1),
    obstacle('toilet', 'cryo_toilet_b', '卫生设施 B', 78, 13, 1, 1),
    obstacle('labWorkstation', 'cryo_secondary_workstation', '第二研究室工作站', 68, 19, 6, 2),
    obstacle('specimenTank', 'cryo_secondary_specimen', '实验样本罐', 86, 22, 3, 3),
    obstacle('crate', 'cryo_storage_crate_a', '补给货箱 A', 23, 39, 2, 2),
    obstacle('crate', 'cryo_storage_crate_b', '补给货箱 B', 27, 39, 2, 2),
    obstacle('lockerBank', 'cryo_equipment_lockers', '安保储物柜组', 33, 38, 6, 1),
    obstacle('portableBarricade', 'cryo_equipment_barricade', '折叠安保路障', 42, 56, 4, 1),
    obstacle('generator', 'cryo_service_generator', '应急发电机组', 66, 38, 4, 2),
    obstacle('vendingMachine', 'cryo_guard_vending', '休息室补给机', 87, 38, 2, 1),
    obstacle('waitingBench', 'cryo_guard_bench', '安保休息长椅', 74, 55, 6, 1),
    obstacle('medicalCart', 'cryo_guard_medical_cart', '急救推车', 87, 54, 2, 1),
    obstacle('securityCamera', 'cryo_corridor_camera_w', '西走廊摄像头', 6, 29, 1, 1),
    obstacle('securityCamera', 'cryo_corridor_camera_e', '东走廊摄像头', 89, 34, 1, 1)
  ];
  return {
    id: 'map_sf6_cryolab_2f', name: '第一章 · 研究所二楼（冷冻仓）', width: 96, height: 64, bgUrl: '/campaigns/sf6/chapter-1/maps/cryolab-2f-background.png', backgroundScaleY: 111.6, backgroundPositionY: 93, blockedCells: {},
    vision: visionConfig('dark', [
      { id: 'cryo_emergency_light', name: '冷冻室应急灯', enabled: true, shape: 'circle', x: 21, y: 16, height: 9, brightRange: 18, dimRange: 12 },
      { id: 'corridor_west_light', name: '西走廊顶灯', enabled: true, shape: 'circle', x: 29, y: 32, height: 9, brightRange: 16, dimRange: 10 },
      { id: 'corridor_east_light', name: '东走廊顶灯', enabled: true, shape: 'circle', x: 67, y: 32, height: 9, brightRange: 16, dimRange: 10 },
      { id: 'service_light', name: '维护区工作灯', enabled: true, shape: 'circle', x: 59, y: 47, height: 8, brightRange: 12, dimRange: 8 }
    ]),
    spawnPoints: [{ x: 11, y: 12 }, { x: 19, y: 12 }, { x: 27, y: 12 }, { x: 11, y: 22 }],
    terrainAreas: [
      floorArea('cryo_room', '冷冻睡眠研究室', '#0c4a6e', 4, 4, 33, 23, { labelX: 20.5, labelY: 15.5 }), floorArea('cryo_observation', '观察与记录间', '#14532d', 37, 4, 11, 23, { labelX: 42.5, labelY: 15.5 }),
      floorArea('cryo_corridor', '安保巡逻长走廊', '#312e81', 4, 27, 87, 9, { labelX: 47.5, labelY: 31.5 }), floorArea('cryo_west_stairs', '西侧楼梯 → 一楼', '#1e3a8a', 4, 27, 11, 9, { labelX: 9.5, labelY: 31.5 }),
      floorArea('cryo_east_stairs', '东侧楼梯 → 一楼', '#1e3a8a', 82, 27, 9, 9, { labelX: 86.5, labelY: 31.5 }), floorArea('cryo_storage', '储藏室', '#14532d', 4, 36, 27, 23, { labelX: 17.5, labelY: 47.5 }),
      floorArea('cryo_equipment', '安保装备间', '#713f12', 31, 36, 17, 23, { labelX: 39.5, labelY: 47.5 }), floorArea('cryo_service', '设备维护间', '#0c4a6e', 48, 36, 24, 23, { labelX: 60, labelY: 47.5 }),
      floorArea('cryo_guard_room', '拐角安保休息室', '#7f1d1d', 72, 36, 19, 23, { labelX: 81.5, labelY: 47.5 }), floorArea('cryo_toilet', '洗手间', '#164e63', 66, 4, 16, 13, { labelX: 74, labelY: 10.5 }),
      floorArea('cryo_secondary_lab', '第二研究室', '#581c87', 66, 17, 25, 10, { labelX: 78.5, labelY: 22 }),
      floorArea('cryo_alarm_sensor', '走廊静默警报感应带', '#991b1b', 45, 28, 3, 8, {
        hazardLevel: 'arcane', isSecret: true, discoveredByParty: false,
        labelX: 46.5, labelY: 34.5, labelMaxWidth: 12,
        trapTrigger: '未授权单位进入感应带或在区域内结束移动',
        trapCheck: '感知检定 DC 14 可提前发现；技术检定 DC 13 可干扰',
        trapEffect: '静默通知安保系统；1 轮后锁定二楼主要通道，并使后续安保单位进入警戒状态。',
        trapDuration: '警报持续到安保终端被关闭',
        trapDisarm: '关闭安保终端、切断感应带供电或成功完成技术检定'
      }),
      floorArea('cryo_electric_door', '储藏室电击门槛', '#92400e', 17, 36, 4, 2, {
        hazardLevel: 'arcane', isSecret: true, discoveredByParty: false,
        trapTrigger: '未解除机关时跨越储藏室门槛',
        trapCheck: '敏捷豁免 DC 13；感知检定 DC 12 可提前发现',
        trapEffect: '失败受到 2d6 电击伤害，并在下一回合开始前无法使用反应；成功则伤害减半且不失去反应。',
        trapDuration: '即时；未解除时再次跨越会重新触发',
        trapDisarm: '技术检定 DC 13、切断门槛供电或破坏控制盒'
      }),
      ...walls, ...doors, ...fixtures
    ]
  };
};

const createResearchHallMap = () => {
  const walls = [
    wall('hall_outer_n', 4, 4, 105, 4), wall('hall_outer_s1', 4, 71, 50, 71), wall('hall_outer_s2', 60, 71, 105, 71), wall('hall_outer_w', 4, 4, 4, 71), wall('hall_outer_e', 105, 4, 105, 71),
    wall('hall_lab_s1', 16, 31, 50, 31), wall('hall_lab_s2', 60, 31, 93, 31), wall('hall_lab_w1', 16, 4, 16, 18), wall('hall_lab_w2', 16, 22, 16, 31), wall('hall_lab_e1', 93, 4, 93, 18), wall('hall_lab_e2', 93, 22, 93, 31),
    wall('hall_west_rooms1', 25, 31, 25, 43), wall('hall_west_rooms2', 25, 47, 25, 58), wall('hall_east_rooms1', 84, 31, 84, 43), wall('hall_east_rooms2', 84, 47, 84, 58),
    wall('hall_archive_n1', 4, 58, 17, 58), wall('hall_archive_n2', 21, 58, 42, 58), wall('hall_power_n1', 67, 58, 89, 58), wall('hall_power_n2', 93, 58, 105, 58),
    wall('hall_archive_e1', 42, 58, 42, 63), wall('hall_archive_e2', 42, 67, 42, 71), wall('hall_power_w1', 67, 58, 67, 63), wall('hall_power_w2', 67, 67, 67, 71)
  ];
  const doors = [
    door('hall_main_lab_door', '主研究室双开门', 50, 31, 60, 31, { featureState: 'locked', maxHp: 30, currentHp: 30 }),
    door('hall_lab_west_door', '主研究室西门', 16, 18, 16, 22), door('hall_lab_east_door', '主研究室东门', 93, 18, 93, 22),
    door('hall_break_door', '休息区门', 25, 43, 25, 47), door('hall_security_door', '安保值班室门', 84, 43, 84, 47, { featureState: 'locked' }),
    door('hall_archive_door', '档案室门', 17, 58, 21, 58, { featureState: 'locked' }), door('hall_power_door', '门禁机房门', 89, 58, 93, 58, { featureState: 'locked' }),
    door('hall_archive_side', '档案室侧门', 42, 63, 42, 67), door('hall_power_side', '供电室侧门', 67, 63, 67, 67),
    windowEdge('hall_main_gate', '研究所强化玻璃正门', 50, 71, 60, 71, { featureType: 'door', featureState: 'locked', movementMode: 'blocked', coverLevel: 'threeQuarters', maxHp: 35, currentHp: 35 })
  ];
  const fixtures = [
    obstacle('mainConsole', 'hall_main_console', '大型主控制台', 45, 12, 20, 7, { customColor: '#a855f7', obstacleHeight: 5, coverLevel: 'threeQuarters', maxHp: 35, currentHp: 35 }),
    obstacle('halfWall', 'hall_command_dais', '所长指挥台', 49, 23, 12, 5, { placement: 'area', type: 'rect', customColor: '#f59e0b', obstacleHeight: 3, visionMode: 'partial', coverLevel: 'half' }),
    ...[[34,40],[55,40],[77,40],[34,53],[55,53],[77,53]].map(([x, y], i) => ({ ...createTerrainFeature('pillar', { id: `hall_column_${i + 1}`, gridX: x, gridY: y, color: 'custom', customColor: '#94a3b8' }), name: `承重柱 ${i + 1}`, radius: 1.5 })),
    obstacle('table', 'hall_break_table', '研究员休息桌', 10, 48, 8, 3, { customColor: '#22c55e' }),
    obstacle('console', 'hall_security_console', '安保监控台', 89, 48, 9, 3, { customColor: '#ef4444' }),
    obstacle('shelf', 'hall_archive_shelf_a', '档案货架 A', 9, 63, 10, 2, { customColor: '#d97706', obstacleHeight: 7, visionMode: 'blocked', coverLevel: 'full' }),
    obstacle('shelf', 'hall_archive_shelf_b', '档案货架 B', 25, 63, 10, 2, { customColor: '#d97706', obstacleHeight: 7, visionMode: 'blocked', coverLevel: 'full' }),
    obstacle('console', 'hall_power_bank', '供电与门禁机组', 76, 62, 18, 4, { customColor: '#0284c7', obstacleHeight: 6, visionMode: 'blocked', coverLevel: 'full' }),
    obstacle('labWorkstation', 'hall_lab_workstation_w', '西侧实验工作站', 20, 8, 8, 2),
    obstacle('labWorkstation', 'hall_lab_workstation_e', '东侧实验工作站', 81, 8, 8, 2),
    obstacle('specimenTank', 'hall_specimen_w', '西侧样本罐', 22, 23, 3, 3),
    obstacle('specimenTank', 'hall_specimen_e', '东侧样本罐', 84, 23, 3, 3),
    obstacle('serverRack', 'hall_lab_server_w', '西侧数据机柜', 18, 27, 2, 3),
    obstacle('serverRack', 'hall_lab_server_e', '东侧数据机柜', 90, 27, 2, 3),
    obstacle('pottedPlant', 'hall_plant_nw', '大厅盆栽 A', 28, 34, 1, 1),
    obstacle('pottedPlant', 'hall_plant_ne', '大厅盆栽 B', 81, 34, 1, 1),
    obstacle('waitingBench', 'hall_waiting_bench_w', '西侧候诊长椅', 40, 56, 6, 1),
    obstacle('waitingBench', 'hall_waiting_bench_e', '东侧候诊长椅', 64, 56, 6, 1),
    obstacle('vendingMachine', 'hall_break_vending', '休息区补给机', 6, 44, 2, 1),
    obstacle('sofa', 'hall_break_sofa', '研究员休息沙发', 19, 52, 4, 2),
    obstacle('lockerBank', 'hall_security_lockers', '安保储物柜组', 99, 44, 4, 1),
    obstacle('serverRack', 'hall_security_server', '安保记录机柜', 101, 52, 2, 3),
    obstacle('crate', 'hall_archive_crate', '待归档资料箱', 37, 67, 2, 2),
    obstacle('generator', 'hall_power_generator_a', '备用发电机 A', 70, 67, 4, 2),
    obstacle('generator', 'hall_power_generator_b', '备用发电机 B', 98, 67, 4, 2),
    obstacle('portableBarricade', 'hall_gate_barricade_w', '正门路障 A', 43, 68, 4, 1),
    obstacle('portableBarricade', 'hall_gate_barricade_e', '正门路障 B', 63, 68, 4, 1),
    obstacle('medicalCart', 'hall_lab_medical_cart', '主研究室急救推车', 30, 28, 2, 1)
  ];
  return {
    id: 'map_sf6_research_hall_1f', name: '第一章 · 研究所一楼（中央大厅）', width: 110, height: 76, bgUrl: '/campaigns/sf6/chapter-1/maps/research-hall-1f-background.png', blockedCells: {},
    vision: visionConfig('dim', [
      { id: 'main_lab_light', name: '主研究室照明', enabled: true, shape: 'circle', x: 55, y: 18, height: 10, brightRange: 28, dimRange: 12 },
      { id: 'hall_light', name: '中央大厅照明', enabled: true, shape: 'circle', x: 55, y: 45, height: 10, brightRange: 25, dimRange: 15 },
      { id: 'main_gate_light', name: '正门探照灯', enabled: true, shape: 'cone', x: 55, y: 69, height: 10, direction: -90, angle: 70, brightRange: 22, dimRange: 12 }
    ], { ceilingHeight: 16 }),
    spawnPoints: [{ x: 10, y: 37 }, { x: 13, y: 37 }, { x: 96, y: 37 }, { x: 99, y: 37 }],
    terrainAreas: [
      floorArea('hall_main_lab', '主研究室／中央控制室', '#581c87', 17, 5, 75, 26, { labelX: 55, labelY: 8 }), floorArea('hall_central', '研究所中央大厅', '#172554', 26, 32, 57, 25, { labelX: 55, labelY: 35 }),
      floorArea('hall_west_stairs', '西楼梯 ← 二楼', '#1e3a8a', 5, 33, 19, 9, { labelX: 14.5, labelY: 37.5 }), floorArea('hall_east_stairs', '东楼梯 ← 二楼', '#1e3a8a', 85, 33, 19, 9, { labelX: 94.5, labelY: 37.5 }),
      floorArea('hall_break_room', '研究员休息区', '#14532d', 5, 43, 19, 14, { labelX: 14.5, labelY: 55 }), floorArea('hall_security', '安保值班室', '#7f1d1d', 85, 43, 19, 14, { labelX: 94.5, labelY: 55 }),
      floorArea('hall_archive', '研究档案室', '#78350f', 5, 59, 36, 11, { labelX: 23, labelY: 68 }), floorArea('hall_power', '供电与门禁机房', '#0c4a6e', 68, 59, 36, 11, { labelX: 86, labelY: 68 }),
      obstacle('scannerZone', 'hall_gate_scanner', '大门身份扫描区', 47, 61, 16, 6, {
        customColor: '#991b1b', hazardLevel: 'arcane', isSecret: true, discoveredByParty: false,
        trapTrigger: '没有有效身份凭证的单位进入扫描区或尝试开启研究所正门',
        trapCheck: '伪造凭证或技术检定 DC 15',
        trapEffect: '扫描失败：正门保持锁定，主研究室进入警戒状态，并将闯入者位置广播给安保人员。',
        trapDuration: '警戒持续到门禁终端被解除',
        trapDisarm: '有效凭证、技术检定 DC 15，或破坏两侧扫描节点'
      }),
      obstacle('gasVent', 'hall_gas_vents', '大厅镇静气体喷口', 43, 44, 24, 6, {
        customColor: '#92400e', hazardLevel: 'toxic', isSecret: true, discoveredByParty: false,
        trapTrigger: '大厅进入封锁状态后，单位进入喷放区或在区域内开始回合',
        trapCheck: '耐力豁免 DC 14',
        trapEffect: '失败获得“镇静”状态：速度减半且不能使用反应；连续两次失败则昏迷。成功时本轮不受影响。',
        trapDuration: '镇静持续到离开气体区后成功完成一次耐力豁免；昏迷由救助或短休解除',
        trapDisarm: '关闭供气终端、封堵喷口或破坏通风控制装置'
      }),
      ...walls, ...doors, ...fixtures
    ]
  };
};

export const SF6_CHAPTER_ONE_MAPS = [createVrArenaMap(), createCryolabMap(), createResearchHallMap()];
export const SF6_CHAPTER_ONE_CONTENT_VERSION = 'chapter-1-v16-map-backgrounds';

export function upgradeSf6BuiltInMaps(maps = []) {
  const builtInById = new Map(SF6_CHAPTER_ONE_MAPS.map(map => [map.id, map]));
  const upgraded = maps.map(map => {
    const builtIn = builtInById.get(map.id);
    return builtIn ? {
      ...map,
      ...structuredClone(builtIn),
      name: map.name || builtIn.name,
      bgUrl: map.bgUrl || builtIn.bgUrl
    } : map;
  });
  const ids = new Set(upgraded.map(map => map.id));
  return [...upgraded, ...structuredClone(SF6_CHAPTER_ONE_MAPS.filter(map => !ids.has(map.id)))];
}

export const SF6_CHAPTER_ONE_NOTES = [
  {
    id: 'note_ch1_run_order', title: 'DM 第一章流程', color: 'purple', x: 80, y: 100, width: 430, height: 330, isMinimized: false, isOpen: true,
    content: '第一幕｜VR 赛场\n让玩家依次介绍性格、门派风格与格斗目标，再开始自由模拟战。\n\n第二幕｜赛后邀约\n巨型西装男子要求众人无理由退赛，以秘密训练与解除限制的承诺换取合作。接受则在货车中被迷晕；拒绝或争执则遭 8 级男子与 6 级全甲士兵压制。剧情目标是送入研究所，不以击杀玩家为结果。\n\n第三幕｜冷冻仓\n冠军先醒，脱困、救人并决定潜行或突围。\n\n第四幕｜研究所\n经过研究室、二楼走廊、一楼大厅与中央控制室/正门分支，揭露改造士兵计划。\n\n终幕｜荒野\n击败所长后离开围墙，发现研究所远离城市，第一章结束。'
  },
  {
    id: 'note_ch1_vr', title: 'DM：VR 模拟战与奖励', color: 'blue', x: 540, y: 100, width: 430, height: 360, isMinimized: true, isOpen: false,
    content: '环境：霓虹大屏、高饱和电子粒子、虚拟观众与八角擂台。强调这是一场纯数据切磋。\n\n规则：角色可使用除超级必杀技外的全部特性与技能；不消耗现实资源，离开 VR 后恢复所有长休能力。被击败者不要描述为死亡，而是化作蓝色流光并在场边重组。\n\n冠军：温热石吊坠，并同时获得亚军、季军奖励。\n亚军：肾上腺素 ×2，并同时获得季军奖励。\n季军：能量饮料 ×3。\n其他参赛者：赛事周边毛巾 ×1。\n\n温热石吊坠触发间隔：战斗中随机 1–10 回合。触发时获得 5 点临时生命并清除全部负面状态；倒地可立刻起身，濒死恢复至 1 HP。'
  },
  {
    id: 'note_ch1_cryolab', title: 'DM：冷冻仓与警报', color: 'amber', x: 80, y: 460, width: 430, height: 390, isMinimized: true, isOpen: false,
    content: '时间：深夜 1 点。研究室无人值班；走廊有安保巡逻，大厅有少量加班研究员。\n\n冠军脱困（三选一）：力量 DC 11 直接破开；智力 DC 8 找开关；巧手 DC 15 拆接缝/螺丝。全部失败后舱门松动，再进行 DC 2 判定即可踹开。\n\n控制台：察觉成功直接发现密码便利贴；失败只知道需要密码，继续搜索可在台子上的大量便利贴中找到。\n\n逐个蛮力开仓：每个冷冻仓都需力量 DC 14。若全部用蛮力开启，最后一人出来时引来 4 人守卫小队。3 回合内未全部击败则呼叫增援并触发全局警报。\n\n密码救人不会立即引来守卫。离开时可潜行或强行突围；走廊先有一支 4 人小队，拐角房间另有一队。走廊遭遇结束后全员升至 4 级。'
  },
  {
    id: 'note_ch1_lab_finale', title: 'DM：大厅、支线与终战', color: 'red', x: 540, y: 500, width: 450, height: 420, isMinimized: true, isOpen: false,
    content: '大厅：只有无战斗能力的加班研究员。善于社交的角色可接到支线——从中央控制室找回被所长窃取的研究成果。奖励为过去一名格斗家的技艺“特殊技：滑铲”。\n\n控制室路线：门口 2 名安保不会主动进攻。进入后遭遇 5 级所长；所长呼叫 3 名警卫、2 名保镖级警卫，杂兵数量可按玩家人数调整。\n\n正门路线：玻璃门外有哨塔及 10 名以上安保，部分携带防暴装备。出门触发全局警报；若警报此前已触发，则队伍进入大厅时直接遭遇大队警卫与随后出现的所长。\n\n终战后：全员升至 5 级。所长身上有支线任务 U 盘。研究所是改造士兵基地，目标是把新人格斗家变成无思考能力的杀戮机器。所长倒下后外围只剩 5 名安保，其余人已前往总部；他们不会主动死战，可被击败或威吓以获得情报。'
  }
];

const cutsceneImage = name => `/campaigns/sf6/chapter-1/cutscenes/${name}.webp`;

export const SF6_CHAPTER_ONE_CUTSCENES = [
  createCutscene({ id: 'sf6_ch1_01_arrival', name: '01｜序幕 · 格斗之都', title: '世界格斗大赛', subtitle: '蒙彼利埃。来自不同道路的格斗家，在五年一度的赛事前夜抵达同一座城市。', mediaType: 'image', mediaUrl: cutsceneImage('01-montpellier-arrival'), mediaName: '蒙彼利埃赛事前夜', effect: 'rain', effectIntensity: 1, transition: 'cinematic' }),
  createCutscene({ id: 'sf6_ch1_02_vr_prepare', name: '02｜准备 · 连接 VR', title: '模拟竞技准备', subtitle: '这里不会留下真正的伤口。介绍你的流派、目标，以及你想让对手记住的名字。', mediaType: 'image', mediaUrl: cutsceneImage('02-vr-octagon'), mediaName: 'VR 八角笼', effect: 'neon-grid', effectIntensity: 2, transition: 'glitch' }),
  createCutscene({ id: 'sf6_ch1_03_vr_battle', name: '03｜开战 · 巨型八角笼', title: '自由模拟战', subtitle: '所有现实资源将在离开 VR 后恢复。被击败者化作流光，在场边重新构成。', mediaType: 'image', mediaUrl: cutsceneImage('02-vr-octagon'), mediaName: 'VR 八角笼', effect: 'neon-grid', effectIntensity: 3, transition: 'flash' }),
  createCutscene({ id: 'sf6_ch1_04_awards', name: '04｜赛后 · 胜负与奖励', title: '模拟战结束', subtitle: '胜负已经记录。奖励被交到各位手中，而真正的比赛尚未开始。', mediaType: 'image', mediaUrl: cutsceneImage('02-vr-octagon'), mediaName: 'VR 八角笼', effect: 'signal-glitch', effectIntensity: 1, transition: 'fade' }),
  createCutscene({ id: 'sf6_ch1_05_offer', name: '05｜转场 · 陌生邀约', title: '赛场之后', subtitle: '昏暗通道尽头，巨型西装男子提出条件：退出比赛，换取一场无人知晓的秘密训练。', mediaType: 'image', mediaUrl: cutsceneImage('03-backstage-offer'), mediaName: '赛后通道邀约', effect: 'smoke', effectIntensity: 1, transition: 'cinematic' }),
  createCutscene({ id: 'sf6_ch1_06_transit_accept', name: '06A｜转场 · 接受合作', title: '封闭运输', subtitle: '车厢里没有窗。城市的灯光逐渐远去，困意比预想中来得更快。', mediaType: 'image', mediaUrl: cutsceneImage('04-abduction-transit'), mediaName: '夜间运输', effect: 'signal-glitch', effectIntensity: 2, transition: 'glitch' }),
  createCutscene({ id: 'sf6_ch1_06_transit_refuse', name: '06B｜转场 · 拒绝之后', title: '信号中断', subtitle: '最后的记忆是全甲士兵逼近，以及那个男人压倒性的力量。随后，一切归于黑暗。', mediaType: 'image', mediaUrl: cutsceneImage('04-abduction-transit'), mediaName: '夜间运输', effect: 'signal-glitch', effectIntensity: 3, transition: 'flash' }),
  createCutscene({ id: 'sf6_ch1_07_awakening', name: '07｜苏醒 · 凌晨一点', title: '冷冻睡眠研究室', subtitle: '温热石吊坠在冰冷舱体中发出微光。某个冷冻仓的锁扣，第一次松动。', mediaType: 'image', mediaUrl: cutsceneImage('05-cryolab-awakening'), mediaName: '冷冻仓苏醒', effect: 'frost', effectIntensity: 2, transition: 'cinematic' }),
  createCutscene({ id: 'sf6_ch1_08_breakout', name: '08｜转场 · 二楼突围', title: '警报正在扩散', subtitle: '走廊、储藏室、研究室与两侧楼梯。选择一条路线，在增援封锁楼层之前抵达一楼。', mediaType: 'image', mediaUrl: cutsceneImage('05-cryolab-awakening'), mediaName: '冷冻仓苏醒', effect: 'alarm', effectIntensity: 2, transition: 'glitch' }),
  createCutscene({ id: 'sf6_ch1_09_truth', name: '09｜真相 · 中央控制室', title: '改造士兵计划', subtitle: '这里研究的不是治疗，而是如何夺走格斗家的意志，把天赋改造成服从命令的武器。', mediaType: 'image', mediaUrl: cutsceneImage('07-central-control-room'), mediaName: '中央控制室', effect: 'alarm', effectIntensity: 2, transition: 'cinematic' }),
  createCutscene({ id: 'sf6_ch1_10_finale', name: '10｜收尾 · 所长倒下', title: '封锁解除', subtitle: '警报仍在回响，但指挥台已经沉默。所长倒下，研究数据与那枚 U 盘成为最后的证据。', mediaType: 'image', mediaUrl: cutsceneImage('07-central-control-room'), mediaName: '中央控制室', effect: 'embers', effectIntensity: 1, transition: 'fade' }),
  createCutscene({ id: 'sf6_ch1_11_ending', name: '11｜结局 · 围墙之外', title: '远离城市的荒野', subtitle: '跨过研究所围墙后，众人才发现城市早已消失在地平线外。第一章结束，而赛事仍在继续。', mediaType: 'image', mediaUrl: cutsceneImage('06-wilderness-escape'), mediaName: '荒野黎明', effect: 'dawn-rays', effectIntensity: 2, transition: 'cinematic' })
];

const chapterItem = (id, name, category, quantity, description) => ({ id, name, category, quantity, description, ownerId: 'WORLD' });
const chapterItemTemplate = item => {
  const copy = structuredClone(item);
  delete copy.id;
  delete copy.ownerId;
  delete copy.quantity;
  return copy;
};

const SF6_STORY_ITEMS = [
  chapterItem('ch1_prize_warm_stone', '温热石吊坠', '赛事奖励', 1, 'VR 模拟战冠军奖励。战斗中每隔随机 1–10 回合触发：获得 5 点临时生命值并清除全部负面效果；倒地者立刻起身，濒死者恢复至 1 HP。'),
  chapterItem('ch1_prize_adrenaline', '肾上腺素', '赛事奖励', 4, '亚军奖励共 2 支；冠军也获得同等奖励。附赠动作使用。此后每次轮到自己时回复已失去生命值的 50%（向上取整）直到战斗结束，清除肉体疲惫造成的负面效果，且使用回合的攻击不受伤害修正；战后晕倒并暂时无法单独行动。'),
  chapterItem('ch1_prize_energy_drink', '能量饮料（赛事奖励）', '赛事奖励', 9, '季军获得 3 瓶，冠军与亚军也各获得同等奖励。战斗中以附赠动作饮用，恢复 1 格斗气。'),
  chapterItem('ch1_prize_towel', '赛事周边毛巾', '赛事奖励', 29, '前三名之外的参赛者每人一条。战斗中可随时擦汗，不消耗动作；持有者不容易受到挑衅与恐吓。'),
  chapterItem('ch1_lab_keycard', '研究所门禁卡', '任务道具', 1, '研究室内可找到的门禁卡，用于通过研究所内部受限门扉。安保人员也可能随身携带。'),
  chapterItem('ch1_lab_energy_drink', '能量饮料（研究所）', '消耗品', 9, '研究室 4 瓶、储藏室 5 瓶。战斗中以附赠动作饮用，恢复 1 格斗气。'),
  chapterItem('ch1_lab_first_aid', '急救包', '消耗品', 6, '研究室 1 个、储藏室 5 个。具体恢复量与使用动作由 DM 按现场伤势裁定。'),
  chapterItem('ch1_lab_coat', '研究员外套', '服装', 7, '研究室 2 件、储藏室 5 件。可用于伪装研究人员；是否骗过安保取决于行为、证件与检定。'),
  chapterItem('ch1_lab_snacks', '零食', '补给', 8, '研究室内的普通补给。'),
  chapterItem('ch1_storage_noodles', '速食面', '补给', 10, '储藏室内的普通补给。'),
  { ...chapterItem('ch1_storage_flashlight', '手电筒', '工具', 3, '便携照明工具。装备并开启后，向角色朝向投射 30ft 明亮光与额外 30ft 微光。'), lightSource: { shape: 'cone', angle: 60, brightRange: 30, dimRange: 30, requiresEquipped: true } },
  chapterItem('ch1_storage_fighting_gear', '格斗服装套件', '服装', 3, '储藏室内各 1 件格斗拳套、格斗短裤与紧身连体衣。'),
  chapterItem('ch1_storage_bulb', '灯泡', '杂物', 5, '储藏室内的备用灯泡，可作为临时照明配件或环境互动道具。'),
  chapterItem('ch1_storage_riot_shield', '防爆盾', '装备', 1, '储藏室内的防暴装备；防护收益与携带限制由 DM 裁定。'),
  chapterItem('ch1_storage_bolt_cutter', '防爆钳', '工具', 1, '可用于剪断链条或处理部分金属障碍。'),
  chapterItem('ch1_storage_baton', '保安警棍', '武器', 1, '储藏室内的制式警棍；走廊安保也可能携带。'),
  chapterItem('ch1_storage_hand_chain', '手部锁链', '束缚工具', 1, '用于限制手部活动的锁链。'),
  chapterItem('ch1_storage_foot_chain', '脚部锁链', '束缚工具', 1, '用于限制移动的脚部锁链。'),
  chapterItem('ch1_sidequest_usb', '所长的研究 U 盘', '任务道具', 1, '终战后可从所长身上搜得，包含被窃取的研究成果，用于完成研究员支线。')
];

const STORY_ITEM_RULES = {
  ch1_prize_warm_stone: { weight: 0.08, usage: '被动生效；触发时按描述恢复并清除状态，不需消耗。', effectValue: '每 1–10 回合随机触发：5 临时 HP + 状态清除' },
  ch1_prize_adrenaline: { weight: 0.1, consumable: true, infinite: true, usage: '附赠动作注射；从角色背包扣除 1 支，战斗结束后承受描述中的昏厥后果。', effectValue: '每回合恢复已失去 HP 的 50%' },
  ch1_prize_energy_drink: { weight: 0.45, consumable: true, infinite: true, usage: '附赠动作饮用；恢复 1 格斗气并扣除 1 瓶。', effectValue: '斗气 +1' },
  ch1_prize_towel: { weight: 0.25, usage: '持有时被动生效；擦汗不消耗动作。', effectValue: '抵抗挑衅与恐吓 +1' },
  ch1_lab_keycard: { weight: 0.03, usage: '在相邻门禁处出示或刷卡；权限不足的区域仍可能拒绝。', effectValue: '研究所内部基础门禁权限' },
  ch1_lab_energy_drink: { weight: 0.45, consumable: true, infinite: true, usage: '附赠动作饮用；恢复 1 格斗气并扣除 1 瓶。', effectValue: '斗气 +1' },
  ch1_lab_first_aid: { weight: 1.2, consumable: true, infinite: true, usage: '动作使用并接触目标；恢复 1d8+2 HP，结算后扣除 1 份。', effectValue: '恢复 1d8+2 HP' },
  ch1_lab_coat: { weight: 0.8, usage: '穿戴需要 1 分钟；冒充研究人员的魅力检定 +1。', effectValue: '研究所伪装 +1' },
  ch1_lab_snacks: { category: '补给食品', weight: 0.45, calories: 1600, consumable: true, infinite: true, usage: '长休时作为共享口粮消耗；每份提供 1600 kcal。' },
  ch1_storage_noodles: { category: '补给食品', weight: 0.25, calories: 1200, consumable: true, infinite: true, usage: '需要热水；长休时作为共享口粮消耗，每份提供 1200 kcal。' },
  ch1_storage_flashlight: { weight: 0.45, usage: '附赠动作开关；装备并开启后产生 30ft 明亮锥形光和额外 30ft 微光。', effectValue: '30ft 明亮光 + 30ft 微光' },
  ch1_storage_fighting_gear: { category: '衣装', weight: 1.5, usage: '穿戴后格斗训练相关的耐力检定 +1；不提供 AC。', effectValue: '训练耐力检定 +1' },
  ch1_storage_bulb: { weight: 0.12, usage: '安装至兼容灯具后恢复该灯具照明；也可由 DM 作为脆弱投掷物裁定。', effectValue: '灯具维修材料' },
  ch1_storage_riot_shield: { category: '防具', weight: 7.5, acBonus: 2, usage: '单手装备时 AC +2；持盾手不能使用双手武器。' },
  ch1_storage_bolt_cutter: { weight: 4.2, usage: '动作使用；剪断普通锁链自动成功，强化金属需力量检定。', effectValue: '破坏锁链与金属障碍 +2' },
  ch1_storage_baton: { weight: 0.9, damageDiceCount: 1, damageDie: 'd6', damageFixed: 0, damageType: '钝击', usage: '单手近战攻击造成 1d6 钝击伤害，默认可声明非致命。' },
  ch1_storage_hand_chain: { weight: 1.4, usage: '对失去反抗能力或成功擒抱的目标用动作安装；挣脱力量 DC 13。', effectValue: '限制双手；挣脱 DC 13' },
  ch1_storage_foot_chain: { weight: 2, usage: '对失去反抗能力或成功擒抱的目标用动作安装；移动速度降至 5ft，挣脱力量 DC 13。', effectValue: '速度降至 5ft；挣脱 DC 13' },
  ch1_sidequest_usb: { weight: 0.02, usage: '插入隔离终端读取；直接连接不可信设备可能触发安全风险。', effectValue: '研究员支线关键证据' }
};

export const SF6_CHAPTER_ONE_ITEMS = [
  ...SF6_STORY_ITEMS.map(item => ({ ...item, ...(STORY_ITEM_RULES[item.id] || {}) })),
  ...SF6_GENERAL_ITEMS
];

const baseCampaign = ({ name, templateId, map }) => ({
  schemaVersion: CURRENT_SCHEMA_VERSION, metadata: { name, templateId, templateVersion: templateId === 'sf6-v0.9' ? SF6_RULESET.version : '1', contentVersion: templateId === 'sf6-v0.9' ? SF6_CHAPTER_ONE_CONTENT_VERSION : undefined, bestiaryVersion: templateId === 'sf6-v0.9' ? SF6_ENEMY_BESTIARY_VERSION : undefined, createdAt: Date.now() },
  rulesetId: templateId === 'sf6-v0.9' ? SF6_RULESET.id : null,
  ruleset: templateId === 'sf6-v0.9' ? structuredClone(SF6_RULESET) : null,
  characters: [], maps: [map], activeMapId: map.id, floatingNotes: [], itemPool: [], itemTemplates: [], enemyBestiary: [], cutscenes: [], activeCutsceneId: '', playerDisplayMode: 'map', logs: [
    { type: 'SYSTEM', content: `**${name}** 已创建。`, timestamp: new Date().toLocaleTimeString() }
  ], excelCards: [], activeExcelCardId: '', groups, combatParticipants: [], combatTurnOrder: [],
  customAttributeLabels: templateId === 'sf6-v0.9' ? Object.fromEntries(Object.values(SF6_ATTRIBUTE_LABELS).map(value => [value, value])) : {},
  isInCombat: false, combatRound: 1, currentTurnIndex: 0, lastUpdated: Date.now()
});

export function createBlankCampaign(name = '空白战役') {
  return baseCampaign({ name, templateId: 'blank', map: blankMap() });
}

export function createSf6Campaign(name = '世界格斗大赛') {
  const campaign = baseCampaign({ name, templateId: 'sf6-v0.9', map: structuredClone(SF6_CHAPTER_ONE_MAPS[0]) });
  campaign.maps = structuredClone(SF6_CHAPTER_ONE_MAPS);
  campaign.activeMapId = SF6_CHAPTER_ONE_MAPS[0].id;
  campaign.floatingNotes = [
    ...structuredClone(SF6_CHAPTER_ONE_NOTES),
    { id: 'note_dm_rulings', title: 'DM：v0.9.1 规则说明', content: SF6_RULESET.rulings.map(item => `• ${item.text}`).join('\n'), x: 1020, y: 100, width: 380, height: 280, color: 'amber', isMinimized: true, isOpen: false }
  ];
  campaign.itemPool = structuredClone(SF6_CHAPTER_ONE_ITEMS);
  campaign.itemTemplates = SF6_CHAPTER_ONE_ITEMS.map(chapterItemTemplate);
  campaign.enemyBestiary = structuredClone(SF6_STANDARD_ENEMIES);
  campaign.cutscenes = structuredClone(SF6_CHAPTER_ONE_CUTSCENES);
  campaign.characterDefaults = { resources: SF6_RESOURCES.map(resource => ({ ...resource, value: resource.max })) };
  return campaign;
}

export const CAMPAIGN_TEMPLATES = [
  { id: 'sf6-v0.9', name: '世界格斗大赛', description: '内置完整 SF6 v0.9.1 规则资料、职业、状态与战斗资源。', create: createSf6Campaign },
  { id: 'blank', name: '空白战役', description: '保留地图、存档、备份和同步能力，不预置剧情或角色。', create: createBlankCampaign }
];
