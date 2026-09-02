import { footprintSweepOffsets } from './characterGeometry.js';

const LEGACY_HAZARD_BY_COLOR = Object.freeze({
  red: 'fire', emerald: 'toxic', green: 'toxic', blue: 'cold', amber: 'difficult', purple: 'arcane'
});

const terrainIndexCache = new WeakMap();
const terrainCellKey = (x, y) => `${x}_${y}`;

export const TERRAIN_HAZARDS = Object.freeze([
  { value: 'none', label: '无（仅地形标记）' },
  { value: 'fire', label: '烈火／熔岩' },
  { value: 'toxic', label: '剧毒／酸性' },
  { value: 'cold', label: '冰霜／深水' },
  { value: 'difficult', label: '碎石／困难地形' },
  { value: 'arcane', label: '法术／诅咒' }
]);

export const TERRAIN_HAZARD_EFFECTS = Object.freeze({
  fire: { trigger: '进入区域或在区域内结束移动', check: '敏捷豁免（DC 由 DM 决定）', effect: '受到火焰伤害；持续停留时可能再次结算。', duration: '即时；环境火焰可能持续', disarm: '灭火、隔绝燃料或绕行' },
  toxic: { trigger: '进入区域或在区域内结束移动', check: '耐力豁免（DC 由 DM 决定）', effect: '受到毒素影响；可能承受伤害或获得中毒状态。', duration: '依区域说明或直到成功豁免', disarm: '关闭源头、通风、防护或绕行' },
  cold: { trigger: '进入区域或在区域内移动', check: '耐力或敏捷判定（由 DM 决定）', effect: '移动受阻；严重时受到冰霜伤害或失去平衡。', duration: '离开区域或解除冻结', disarm: '加热、破冰或绕行' },
  difficult: { trigger: '在区域内移动', check: '无需判定', effect: '每移动 1ft 消耗 2ft 移动力。', duration: '处于区域内期间', disarm: '清理道路或绕行' },
  arcane: { trigger: '进入区域、跨越边界或满足机关条件', check: '对应豁免或技能判定（由 DM 决定）', effect: '触发机关的特殊效果，按地图标注结算。', duration: '依机关说明', disarm: '识别机关后解除、禁用或绕行' }
});

export function terrainTriggerDetails(area) {
  const fallback = TERRAIN_HAZARD_EFFECTS[terrainHazard(area)];
  const hasCustom = ['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm'].some(key => typeof area?.[key] === 'string' && area[key].trim());
  if (!fallback && !hasCustom) return null;
  return {
    trigger: area?.trapTrigger?.trim() || fallback?.trigger || '满足机关触发条件',
    check: area?.trapCheck?.trim() || fallback?.check || '无需判定',
    effect: area?.trapEffect?.trim() || fallback?.effect || '按 DM 说明结算。',
    duration: area?.trapDuration?.trim() || fallback?.duration || '即时',
    disarm: area?.trapDisarm?.trim() || fallback?.disarm || '由 DM 判定'
  };
}

export const TERRAIN_MOVEMENT_OPTIONS = Object.freeze([
  { value: 'walkable', label: '可直接穿越' },
  { value: 'blocked', label: '不可穿越' },
  { value: 'difficult', label: '可穿越，双倍移动力' },
  { value: 'climbable', label: '需要攀爬能力' }
]);

export const TERRAIN_VISION_OPTIONS = Object.freeze([
  { value: 'transparent', label: '完全允许视线' },
  { value: 'partial', label: '按高度部分遮挡' },
  { value: 'blocked', label: '阻挡视线' },
  { value: 'oneWay', label: '单向阻挡视线' }
]);

export const TERRAIN_COVER_OPTIONS = Object.freeze([
  { value: 'none', label: '无掩体' },
  { value: 'half', label: '半掩体' },
  { value: 'threeQuarters', label: '四分之三掩体' },
  { value: 'full', label: '全掩体' }
]);

export const DOOR_STATE_OPTIONS = Object.freeze([
  { value: 'closed', label: '关闭' },
  { value: 'open', label: '开启' },
  { value: 'ajar', label: '半开' },
  { value: 'locked', label: '锁定' },
  { value: 'broken', label: '破坏' }
]);

export const TERRAIN_FEATURE_STATE_LABELS = Object.freeze({
  closed: '关闭', open: '开启', occupied: '占用', empty: '空置', broken: '损坏', frosted: '结霜',
  normal: '正常', alert: '警报', locked: '锁定', offline: '离线', powered: '供电', repairing: '维修',
  full: '满载', half: '半满', collapsed: '倒塌', sealed: '封闭', overturned: '倾倒', damaged: '损伤',
  made: '整理完毕', used: '使用过', running: '运行中', active: '已启用', idle: '待机', scanning: '扫描中',
  denied: '已拒绝', disabled: '已禁用', hidden: '隐藏', residual: '残留',
  overgrown: '茂盛', stocked: '有库存', depleted: '耗尽'
});

export const TERRAIN_FEATURE_DESCRIPTIONS = Object.freeze({
  wall: '完整墙体，会阻挡移动、视线、光照与远程攻击。',
  door: '可开启、锁定或破坏的通道；关闭时阻挡移动与视线。',
  window: '允许观察与光照穿过，但会阻挡移动并提供半掩体。',
  pillar: '承重柱或大型立柱，阻挡移动与视线并提供全掩体。',
  halfWall: '低矮栏杆或半墙，阻挡移动并为单位提供半掩体。',
  table: '可作为临时掩体的桌面家具，会占据通行空间。',
  console: '用于操作设施的控制台，能提供较稳定的战术掩体。',
  cryoPod: '透明冷冻舱；可看清内部，但舱体会阻挡移动与攻击。',
  mainConsole: '大型中央控制设备，占据较大空间并提供四分之三掩体。',
  maintenanceBench: '带工具与设备的维护工作台，会阻挡通行并提供掩体。',
  shelf: '高货架，阻挡移动和视线，可作为完整掩体。',
  cabinet: '立式储物设施，会阻挡移动并部分遮蔽视线。',
  crate: '可破坏货箱，会阻挡移动并提供半掩体。',
  chair: '轻型座椅；可穿越但按困难地形计算，不会遮挡视线。',
  sofa: '低矮休息家具，阻挡移动并提供半掩体。',
  bed: '低矮床铺，阻挡移动但不会完全遮断视线。',
  sink: '固定洗手设施，阻挡移动并提供少量掩体。',
  toilet: '固定卫生设施，占据一格但不会阻断视线。',
  securityCamera: '壁挂安保摄像头，不占据地面通行空间。',
  alarmLight: '高处警报灯，不占据地面通行空间。',
  scannerZone: '地面身份扫描区；可直接穿越，触发效果由 DM 判定。',
  gasVent: '隐藏式气体喷口；可直接穿越，启用后可能释放危险气体。',
  labWorkstation: '实验工作站，阻挡通行并提供半掩体。',
  specimenTank: '透明样本罐，可观察内部但会阻挡移动与攻击。',
  serverRack: '高服务器机柜，阻挡移动、视线并提供完整掩体。',
  lockerBank: '成排储物柜，阻挡移动并提供四分之三掩体。',
  medicalCart: '可推动的医疗车；可穿越但按困难地形计算。',
  vendingMachine: '大型自动售货机，阻挡移动并部分遮蔽视线。',
  pottedPlant: '装饰盆栽；可穿越但按困难地形计算。',
  waitingBench: '候诊长椅；可跨越，但会消耗额外移动力。',
  generator: '重型发电机组，阻挡移动并提供四分之三掩体。',
  portableBarricade: '可移动战术路障，阻挡移动并提供半掩体。'
});

const EDGE = { placement: 'edge', type: 'rect', orientation: 'horizontal', thickness: 0.15 };
export const TERRAIN_FEATURE_PRESETS = Object.freeze({
  wall: { ...EDGE, label: '完整墙体', name: '墙体', length: 6, movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', obstacleHeight: 10, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 30 },
  door: { ...EDGE, label: '门（关闭）', name: '门', length: 2, movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', obstacleHeight: 8, transmitsLight: false, transmitsAttacks: false, featureState: 'closed', destructible: true, maxHp: 15 },
  window: { ...EDGE, label: '窗户', name: '窗户', length: 3, movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'half', obstacleHeight: 8, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 8 },
  pillar: { label: '柱子', name: '柱子', placement: 'area', type: 'circle', radius: 1, movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', obstacleHeight: 12, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 40 },
  halfWall: { ...EDGE, label: '半高墙／栏杆', name: '半高墙', length: 4, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 18 },
  table: { label: '桌子', name: '桌子', placement: 'area', type: 'rect', width: 4, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 10 },
  console: { label: '操作台', name: '操作台', category: '实验室', assetKey: 'main-console', states: ['normal', 'alert', 'locked', 'offline', 'broken'], placement: 'area', type: 'rect', width: 5, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'threeQuarters', obstacleHeight: 4, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 16 },
  cryoPod: { label: '冷冻仓', name: '冷冻仓', category: '实验室', assetKey: 'cryo-pod', states: ['closed', 'open', 'occupied', 'empty', 'broken', 'frosted'], placement: 'area', type: 'rect', width: 4, height: 5, movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'threeQuarters', obstacleHeight: 5.5, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 24 },
  mainConsole: { label: '大型主控制台', name: '主控制台', category: '实验室', assetKey: 'main-console', states: ['normal', 'alert', 'locked', 'offline', 'broken'], placement: 'area', type: 'rect', width: 12, height: 5, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'threeQuarters', obstacleHeight: 4, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 30 },
  maintenanceBench: { label: '维护工作台', name: '维护台', category: '工业', assetKey: 'maintenance-bench', states: ['powered', 'offline', 'repairing', 'broken'], placement: 'area', type: 'rect', width: 8, height: 3, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'threeQuarters', obstacleHeight: 4, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 22 },
  shelf: { label: '货架', name: '货架', category: '储藏', assetKey: 'shelf', states: ['full', 'half', 'collapsed'], placement: 'area', type: 'rect', width: 8, height: 2, movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', obstacleHeight: 8, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 18 },
  cabinet: { label: '储物柜', name: '储物柜', category: '储藏', assetKey: 'cabinet', states: ['locked', 'open', 'empty', 'broken'], placement: 'area', type: 'rect', width: 2, height: 1, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 6, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 12 },
  crate: { label: '货箱', name: '货箱', category: '储藏', assetKey: 'crate', states: ['sealed', 'open', 'empty', 'broken'], placement: 'area', type: 'rect', width: 2, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 10 },
  chair: { label: '椅子', name: '椅子', category: '家具', assetKey: 'chair', states: ['normal', 'occupied', 'overturned'], placement: 'area', type: 'rect', width: 1, height: 1, movementMode: 'difficult', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 4 },
  sofa: { label: '沙发', name: '沙发', category: '家具', assetKey: 'sofa', states: ['normal', 'damaged'], placement: 'area', type: 'rect', width: 4, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 9 },
  bed: { label: '床铺', name: '床铺', category: '家具', assetKey: 'bed', states: ['made', 'used', 'damaged'], placement: 'area', type: 'rect', width: 4, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 2.5, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 8 },
  sink: { label: '洗手台', name: '洗手台', category: '设施', assetKey: 'sink', states: ['normal', 'running', 'broken'], placement: 'area', type: 'rect', width: 2, height: 1, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 8 },
  toilet: { label: '卫生设施', name: '卫生设施', category: '设施', assetKey: 'toilet', states: ['normal', 'broken'], placement: 'area', type: 'rect', width: 1, height: 1, movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 2.5, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 6 },
  securityCamera: { label: '安保摄像头', name: '摄像头', category: '安保', assetKey: 'security-camera', states: ['active', 'offline', 'alert', 'broken'], placement: 'area', type: 'circle', radius: 0.4, movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 9, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 4 },
  alarmLight: { label: '警报灯', name: '警报灯', category: '安保', assetKey: 'alarm-light', states: ['idle', 'alert', 'offline', 'broken'], placement: 'area', type: 'circle', radius: 0.4, movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 9, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 3 },
  scannerZone: { label: '身份扫描区', name: '扫描区', category: '机关', assetKey: 'scanner-zone', states: ['idle', 'scanning', 'denied', 'disabled'], placement: 'area', type: 'rect', width: 8, height: 4, movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 0, transmitsLight: true, transmitsAttacks: true, destructible: false, maxHp: 1, trapTrigger: '未授权单位进入或在扫描区内结束移动', trapCheck: '身份凭证或技术检定（DC 由 DM 决定）', trapEffect: '扫描失败并触发区域安保响应。', trapDuration: '直到安保系统被解除', trapDisarm: '使用有效凭证、关闭扫描器或通过技术检定' },
  gasVent: { label: '气体喷口', name: '气体喷口', category: '机关', assetKey: 'gas-vent', states: ['hidden', 'active', 'residual', 'disabled'], placement: 'area', type: 'rect', width: 1, height: 1, movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 0, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 5, trapTrigger: '单位进入喷口区域或机关被远程启动', trapCheck: '耐力豁免（DC 由 DM 决定）', trapEffect: '吸入气体并承受地图标注的毒素或镇静效果。', trapDuration: '依地图说明或直到成功豁免', trapDisarm: '封堵喷口、关闭供气或破坏装置' },
  labWorkstation: { label: '实验工作站', name: '实验工作站', category: '实验室', assetKey: 'lab-workstation', states: ['normal', 'active', 'offline', 'broken'], placement: 'area', type: 'rect', width: 4, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3.5, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 12 },
  specimenTank: { label: '样本罐', name: '样本罐', category: '实验室', assetKey: 'specimen-tank', states: ['occupied', 'empty', 'frosted', 'broken'], placement: 'area', type: 'circle', radius: 1.5, movementMode: 'blocked', visionMode: 'transparent', coverLevel: 'threeQuarters', obstacleHeight: 7, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 18 },
  serverRack: { label: '服务器机柜', name: '服务器机柜', category: '设备', assetKey: 'server-rack', states: ['active', 'alert', 'offline', 'broken'], placement: 'area', type: 'rect', width: 2, height: 3, movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', obstacleHeight: 8, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 16 },
  lockerBank: { label: '储物柜组', name: '储物柜组', category: '储藏', assetKey: 'locker-bank', states: ['locked', 'open', 'empty', 'broken'], placement: 'area', type: 'rect', width: 4, height: 1, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'threeQuarters', obstacleHeight: 7, transmitsLight: false, transmitsAttacks: false, destructible: true, maxHp: 14 },
  medicalCart: { label: '医疗推车', name: '医疗推车', category: '设施', assetKey: 'medical-cart', states: ['normal', 'stocked', 'empty', 'overturned'], placement: 'area', type: 'rect', width: 2, height: 1, movementMode: 'difficult', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 6 },
  vendingMachine: { label: '自动售货机', name: '自动售货机', category: '家具', assetKey: 'vending-machine', states: ['normal', 'stocked', 'empty', 'broken'], placement: 'area', type: 'rect', width: 2, height: 1, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 7, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 12 },
  pottedPlant: { label: '盆栽', name: '盆栽', category: '家具', assetKey: 'potted-plant', states: ['normal', 'overgrown', 'damaged'], placement: 'area', type: 'rect', width: 1, height: 1, movementMode: 'difficult', visionMode: 'transparent', coverLevel: 'none', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 3 },
  waitingBench: { label: '候诊长椅', name: '候诊长椅', category: '家具', assetKey: 'waiting-bench', states: ['normal', 'occupied', 'damaged'], placement: 'area', type: 'rect', width: 4, height: 1, movementMode: 'difficult', visionMode: 'transparent', coverLevel: 'half', obstacleHeight: 2.5, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 8 },
  generator: { label: '发电机组', name: '发电机组', category: '设备', assetKey: 'generator', states: ['powered', 'offline', 'broken'], placement: 'area', type: 'rect', width: 4, height: 2, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'threeQuarters', obstacleHeight: 4, transmitsLight: true, transmitsAttacks: false, destructible: true, maxHp: 18 },
  portableBarricade: { label: '便携路障', name: '便携路障', category: '安保', assetKey: 'portable-barricade', states: ['normal', 'overturned', 'broken'], placement: 'area', type: 'rect', width: 4, height: 1, movementMode: 'blocked', visionMode: 'partial', coverLevel: 'half', obstacleHeight: 3, transmitsLight: true, transmitsAttacks: true, destructible: true, maxHp: 10 }
});

export const TERRAIN_FEATURE_OPTIONS = Object.freeze(Object.entries(TERRAIN_FEATURE_PRESETS)
  .map(([value, preset]) => ({ value, label: preset.label, group: preset.category || '基础构件' })));

export function terrainFeatureStateOptions(area) {
  return (area?.availableStates || []).map(value => ({
    value,
    label: TERRAIN_FEATURE_STATE_LABELS[value] || value
  }));
}

export function terrainHazard(area) {
  if (TERRAIN_HAZARDS.some(option => option.value === area?.hazardLevel)) return area.hazardLevel;
  return LEGACY_HAZARD_BY_COLOR[area?.color] || 'none';
}

export function terrainMovementMode(area) {
  if (TERRAIN_MOVEMENT_OPTIONS.some(option => option.value === area?.movementMode)) return area.movementMode;
  return area?.isImpassable === true ? 'blocked' : isDifficultTerrain(area) ? 'difficult' : 'walkable';
}

export function terrainVisionMode(area) {
  if (TERRAIN_VISION_OPTIONS.some(option => option.value === area?.visionMode)) return area.visionMode;
  return area?.blocksVision === true || (area?.blocksVision !== false && terrainMovementMode(area) === 'blocked') ? 'blocked' : 'transparent';
}

export function terrainCoverLevel(area) {
  return TERRAIN_COVER_OPTIONS.some(option => option.value === area?.coverLevel) ? area.coverLevel : terrainVisionMode(area) === 'blocked' ? 'full' : 'none';
}

export function isDifficultTerrain(area) {
  return terrainHazard(area) === 'difficult' || area?.movementMode === 'difficult';
}

export function terrainIsDestroyed(area) {
  return area?.destructible === true && Number(area.currentHp ?? area.maxHp ?? 1) <= 0;
}

export function terrainBlocksMovement(area, actor = {}) {
  if (terrainIsDestroyed(area) || area?.featureState === 'open') return false;
  const mode = terrainMovementMode(area);
  if (mode === 'climbable') return !(actor?.traversalAbilities || []).includes('climb');
  return mode === 'blocked';
}

export function terrainTop(area) {
  return Number(area?.baseHeight || 0) + Math.max(0, Number(area?.obstacleHeight ?? 10));
}

export function viewerEyeHeight(character = {}) {
  const prone = (character.conditions || []).some(condition => ['倒地', '趴伏', 'prone', 'knocked_down'].includes(String(condition?.id || condition?.name || '').toLowerCase()));
  return Number(character.elevation || 0) + Number(character.eyeHeight || (prone ? 1.5 : 5.5));
}

function oneWayBlocks(area, fromX, fromY, toX, toY) {
  const direction = Number(area.visionDirection ?? (area.orientation === 'vertical' ? 0 : 90));
  const nx = Math.cos(direction * Math.PI / 180);
  const ny = Math.sin(direction * Math.PI / 180);
  return (toX - fromX) * nx + (toY - fromY) * ny > 0;
}

function ajarDoorBlocks(area, fromX, fromY, toX, toY) {
  const rayAngle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  const normal = area.orientation === 'vertical' ? 0 : 90;
  const delta = Math.min(
    Math.abs((((rayAngle - normal) % 360) + 540) % 360 - 180),
    Math.abs((((rayAngle - normal - 180) % 360) + 540) % 360 - 180)
  );
  return delta > Number(area.apertureAngle || 70) / 2;
}

export function terrainBlocksVision(area, { eyeHeight = 5.5, purpose = 'vision', fromX = 0, fromY = 0, toX = 0, toY = 0 } = {}) {
  if (terrainIsDestroyed(area) || area?.featureState === 'open') return false;
  if (purpose === 'light' && area?.transmitsLight === true) return false;
  if (Number(area?.baseHeight || 0) >= eyeHeight || terrainTop(area) < eyeHeight) return false;
  if (area?.featureState === 'ajar') return ajarDoorBlocks(area, fromX, fromY, toX, toY);
  const mode = terrainVisionMode(area);
  if (mode === 'transparent') return false;
  if (mode === 'oneWay') return oneWayBlocks(area, fromX, fromY, toX, toY);
  return true;
}

export function toggleDoorState(area) {
  if (area?.featureType !== 'door') return area;
  return setDoorState(area, area.featureState === 'open' ? 'closed' : 'open');
}

export function setDoorState(area, state) {
  if (area?.featureType !== 'door' || !DOOR_STATE_OPTIONS.some(option => option.value === state)) return area;
  const rules = {
    open: { movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'none', isImpassable: false, blocksVision: false },
    ajar: { movementMode: 'walkable', visionMode: 'partial', coverLevel: 'threeQuarters', apertureAngle: 70, isImpassable: false, blocksVision: false },
    broken: { movementMode: 'walkable', visionMode: 'transparent', coverLevel: 'half', isImpassable: false, blocksVision: false },
    closed: { movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', isImpassable: true, blocksVision: true },
    locked: { movementMode: 'blocked', visionMode: 'blocked', coverLevel: 'full', isImpassable: true, blocksVision: true }
  };
  return {
    ...area,
    featureState: state,
    ...rules[state]
  };
}

export function createTerrainFeature(featureType, { id, gridX, gridY, color = 'custom', customColor = '#6b7280' } = {}) {
  const preset = TERRAIN_FEATURE_PRESETS[featureType] || TERRAIN_FEATURE_PRESETS.wall;
  return {
    id: id || `terrain_${Date.now()}`,
    name: preset.name,
    featureType: TERRAIN_FEATURE_PRESETS[featureType] ? featureType : 'wall',
    placement: preset.placement,
    orientation: preset.orientation,
    thickness: preset.thickness,
    type: preset.type,
    color,
    customColor,
    hazardLevel: 'none',
    gridX: Number(gridX || 0),
    gridY: Number(gridY || 0),
    ...(preset.placement === 'edge'
      ? { length: preset.length, width: preset.length, height: preset.thickness }
      : preset.type === 'circle' ? { radius: preset.radius } : { width: preset.width, height: preset.height }),
    baseHeight: 0,
    obstacleHeight: preset.obstacleHeight,
    movementMode: preset.movementMode,
    visionMode: preset.visionMode,
    coverLevel: preset.coverLevel,
    transmitsLight: preset.transmitsLight,
    transmitsAttacks: preset.transmitsAttacks,
    destructible: preset.destructible,
    maxHp: preset.maxHp,
    currentHp: preset.maxHp,
    isSecret: false,
    discoveredByParty: true,
    isImpassable: preset.movementMode === 'blocked',
    blocksVision: preset.visionMode === 'blocked',
    ...(preset.featureState ? { featureState: preset.featureState } : {}),
    ...(preset.category ? { featureCategory: preset.category } : {}),
    ...(preset.assetKey ? { assetKey: preset.assetKey } : {}),
    ...(preset.states ? { availableStates: [...preset.states], visualState: preset.states[0] } : {}),
    ...(['trapTrigger', 'trapCheck', 'trapEffect', 'trapDuration', 'trapDisarm'].reduce((fields, key) => {
      if (preset[key]) fields[key] = preset[key];
      return fields;
    }, {}))
  };
}

export function changeTerrainShape(area, type) {
  if (type === area?.type || area?.placement === 'edge') return area;
  if (type === 'circle') {
    const radius = Math.max(1, Math.ceil(Math.max(Number(area?.width || 1), Number(area?.height || 1)) / 2));
    const next = { ...area, type: 'circle', radius };
    delete next.width;
    delete next.height;
    return next;
  }
  const radius = Math.max(1, Number(area?.radius || 1));
  const next = { ...area, type: 'rect', width: radius * 2, height: radius * 2 };
  delete next.radius;
  return next;
}

export function terrainEdgeSegment(area) {
  if (area?.placement !== 'edge') return null;
  const x1 = Number(area.gridX || 0);
  const y1 = Number(area.gridY || 0);
  if (area.orientation === 'free') {
    const x2 = Number.isFinite(Number(area.endX)) ? Number(area.endX) : x1 + 1;
    const y2 = Number.isFinite(Number(area.endY)) ? Number(area.endY) : y1;
    return { x1, y1, x2, y2 };
  }
  const length = Math.max(0.1, Number(area.length || area.width || area.height || 1));
  return area.orientation === 'vertical'
    ? { x1, y1, x2: x1, y2: y1 + length }
    : { x1, y1, x2: x1 + length, y2: y1 };
}

function addToBucket(buckets, key, area) {
  const bucket = buckets.get(key);
  if (bucket) bucket.push(area);
  else buckets.set(key, [area]);
}

/**
 * Build a reusable cell/edge lookup for dense maps. The cache is keyed by the
 * immutable terrainAreas array, so fog-memory updates do not rebuild it.
 */
export function getTerrainSpatialIndex(map) {
  const areas = Array.isArray(map?.terrainAreas) ? map.terrainAreas : [];
  const cached = terrainIndexCache.get(areas);
  if (cached) return cached;
  const cells = new Map();
  const edges = new Map();
  const edgeAreas = [];
  for (const area of areas) {
    const edge = terrainEdgeSegment(area);
    if (edge) {
      edgeAreas.push(area);
      const minX = Math.floor(Math.min(edge.x1, edge.x2) - 1);
      const maxX = Math.ceil(Math.max(edge.x1, edge.x2) + 1);
      const minY = Math.floor(Math.min(edge.y1, edge.y2) - 1);
      const maxY = Math.ceil(Math.max(edge.y1, edge.y2) + 1);
      for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
        addToBucket(edges, terrainCellKey(x, y), area);
      }
      continue;
    }
    // Pure decorative walkable/transparent regions never affect movement,
    // sight, or path cost and need not occupy the hot lookup table.
    if (terrainMovementMode(area) === 'walkable' && terrainVisionMode(area) === 'transparent' && !isDifficultTerrain(area)) continue;
    if (area.type === 'circle') {
      const radius = Math.max(0, Number(area.radius || 0));
      for (let y = Math.floor(Number(area.gridY || 0) - radius); y <= Math.ceil(Number(area.gridY || 0) + radius); y += 1) {
        for (let x = Math.floor(Number(area.gridX || 0) - radius); x <= Math.ceil(Number(area.gridX || 0) + radius); x += 1) {
          if (Math.hypot(x - Number(area.gridX || 0), y - Number(area.gridY || 0)) <= radius) addToBucket(cells, terrainCellKey(x, y), area);
        }
      }
    } else {
      const startX = Math.floor(Number(area.gridX || 0));
      const startY = Math.floor(Number(area.gridY || 0));
      const endX = Math.ceil(Number(area.gridX || 0) + Math.max(1, Number(area.width || 1)));
      const endY = Math.ceil(Number(area.gridY || 0) + Math.max(1, Number(area.height || 1)));
      for (let y = startY; y < endY; y += 1) for (let x = startX; x < endX; x += 1) addToBucket(cells, terrainCellKey(x, y), area);
    }
  }
  const index = { areas, cells, edges, edgeAreas };
  terrainIndexCache.set(areas, index);
  return index;
}

export function terrainAreasAtCell(map, x, y, index = getTerrainSpatialIndex(map)) {
  return index.cells.get(terrainCellKey(x, y)) || [];
}

export function terrainEdgesBetween(map, fromX, fromY, toX, toY, index = getTerrainSpatialIndex(map)) {
  const candidates = new Set();
  const minX = Math.floor(Math.min(fromX, toX) - 1);
  const maxX = Math.ceil(Math.max(fromX, toX) + 1);
  const minY = Math.floor(Math.min(fromY, toY) - 1);
  const maxY = Math.ceil(Math.max(fromY, toY) + 1);
  for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
    for (const area of index.edges.get(terrainCellKey(x, y)) || []) candidates.add(area);
  }
  return candidates;
}

function orientation(ax, ay, bx, by, cx, cy) {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

function pointOnSegment(segment, x, y) {
  return x >= Math.min(segment.x1, segment.x2) - 1e-8 && x <= Math.max(segment.x1, segment.x2) + 1e-8
    && y >= Math.min(segment.y1, segment.y2) - 1e-8 && y <= Math.max(segment.y1, segment.y2) + 1e-8;
}

export function segmentsIntersect(a, b) {
  const o1 = orientation(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
  const o2 = orientation(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);
  const o3 = orientation(b.x1, b.y1, b.x2, b.y2, a.x1, a.y1);
  const o4 = orientation(b.x1, b.y1, b.x2, b.y2, a.x2, a.y2);
  if (((o1 > 1e-8 && o2 < -1e-8) || (o1 < -1e-8 && o2 > 1e-8))
    && ((o3 > 1e-8 && o4 < -1e-8) || (o3 < -1e-8 && o4 > 1e-8))) return true;
  if (Math.abs(o1) <= 1e-8 && pointOnSegment(a, b.x1, b.y1)) return true;
  if (Math.abs(o2) <= 1e-8 && pointOnSegment(a, b.x2, b.y2)) return true;
  if (Math.abs(o3) <= 1e-8 && pointOnSegment(b, a.x1, a.y1)) return true;
  return Math.abs(o4) <= 1e-8 && pointOnSegment(b, a.x2, a.y2);
}

function pointSegmentDistance(x, y, segment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 1e-8) return Math.hypot(x - segment.x1, y - segment.y1);
  const t = Math.max(0, Math.min(1, ((x - segment.x1) * dx + (y - segment.y1) * dy) / lengthSquared));
  return Math.hypot(x - (segment.x1 + t * dx), y - (segment.y1 + t * dy));
}

export function terrainBlocksStep(area, fromX, fromY, toX, toY, actor = {}) {
  if (!terrainBlocksMovement(area, actor)) return false;
  const edge = terrainEdgeSegment(area);
  if (!edge) return false;
  return segmentsIntersect(edge, { x1: fromX + 0.5, y1: fromY + 0.5, x2: toX + 0.5, y2: toY + 0.5 });
}

export function canTraverseTerrainStep(map, fromX, fromY, toX, toY, actor = {}, index = getTerrainSpatialIndex(map)) {
  for (const offset of footprintSweepOffsets(actor)) {
    const sampleFromX = fromX + offset.x;
    const sampleFromY = fromY + offset.y;
    const sampleToX = toX + offset.x;
    const sampleToY = toY + offset.y;
    const candidates = terrainEdgesBetween(map, sampleFromX, sampleFromY, sampleToX, sampleToY, index);
    for (const area of candidates) if (terrainBlocksStep(area, sampleFromX, sampleFromY, sampleToX, sampleToY, actor)) return false;
  }
  return true;
}

function areaContainsPoint(area, x, y) {
  if (area.type === 'circle') return Math.hypot(x - Number(area.gridX || 0), y - Number(area.gridY || 0)) <= Number(area.radius || 0);
  return x >= Number(area.gridX || 0) && x <= Number(area.gridX || 0) + Number(area.width || 0)
    && y >= Number(area.gridY || 0) && y <= Number(area.gridY || 0) + Number(area.height || 0);
}

function terrainIntersectsLine(area, fromX, fromY, toX, toY) {
  const edge = terrainEdgeSegment(area);
  const ray = { x1: fromX + 0.5, y1: fromY + 0.5, x2: toX + 0.5, y2: toY + 0.5 };
  if (edge) return segmentsIntersect(edge, ray);
  const steps = Math.max(1, Math.ceil(Math.hypot(toX - fromX, toY - fromY) * 2));
  for (let index = 1; index < steps; index += 1) {
    const ratio = index / steps;
    if (areaContainsPoint(area, fromX + 0.5 + (toX - fromX) * ratio, fromY + 0.5 + (toY - fromY) * ratio)) return true;
  }
  return false;
}

export function terrainCoverBetween(map, fromX, fromY, toX, toY) {
  const ranks = { none: 0, half: 1, threeQuarters: 2, full: 3 };
  let result = 'none';
  for (const area of map?.terrainAreas || []) {
    if (terrainIsDestroyed(area) || area.featureState === 'open' || !terrainIntersectsLine(area, fromX, fromY, toX, toY)) continue;
    const cover = terrainCoverLevel(area);
    if (ranks[cover] > ranks[result]) result = cover;
  }
  return result;
}

export function canAttackThroughTerrain(map, fromX, fromY, toX, toY) {
  return !(map?.terrainAreas || []).some(area => !terrainIsDestroyed(area)
    && area.featureState !== 'open' && area.transmitsAttacks !== true
    && terrainIntersectsLine(area, fromX, fromY, toX, toY));
}

export function terrainTouchesCells(area, cells) {
  if (!area || !cells?.size) return false;
  const edge = terrainEdgeSegment(area);
  if (edge) {
    const minX = Math.floor(Math.min(edge.x1, edge.x2) - 1);
    const maxX = Math.ceil(Math.max(edge.x1, edge.x2));
    const minY = Math.floor(Math.min(edge.y1, edge.y2) - 1);
    const maxY = Math.ceil(Math.max(edge.y1, edge.y2));
    for (let y = minY; y <= maxY; y += 1) for (let x = minX; x <= maxX; x += 1) {
      if (cells.has(`${x}_${y}`) && pointSegmentDistance(x + 0.5, y + 0.5, edge) <= 0.8) return true;
    }
    return false;
  }
  if (area.type === 'circle') {
    const radius = Math.max(0, Number(area.radius || 0));
    for (let y = Math.floor(area.gridY - radius); y <= Math.ceil(area.gridY + radius); y += 1) {
      for (let x = Math.floor(area.gridX - radius); x <= Math.ceil(area.gridX + radius); x += 1) {
        if (Math.hypot(x - area.gridX, y - area.gridY) <= radius && cells.has(`${x}_${y}`)) return true;
      }
    }
    return false;
  }
  for (let y = Math.floor(area.gridY); y < area.gridY + Math.max(1, Number(area.height || 1)); y += 1) {
    for (let x = Math.floor(area.gridX); x < area.gridX + Math.max(1, Number(area.width || 1)); x += 1) if (cells.has(`${x}_${y}`)) return true;
  }
  return false;
}

export function terrainMemorySnapshot(area) {
  return structuredClone({ ...area, rememberedAt: Date.now() });
}

export function updateExploredTerrainStates(existing = {}, areas = [], visibleCells = new Set()) {
  let next = existing;
  for (const area of areas) {
    if (!terrainTouchesCells(area, visibleCells) || (area.isSecret && area.discoveredByParty !== true)) continue;
    const previous = existing[area.id];
    const previousComparable = previous ? { ...previous, rememberedAt: undefined } : null;
    const currentComparable = { ...area, rememberedAt: undefined };
    if (JSON.stringify(previousComparable) !== JSON.stringify(currentComparable)) {
      if (next === existing) next = { ...existing };
      next[area.id] = terrainMemorySnapshot(area);
    }
  }
  return next;
}

export function safeTerrainColor(area, fallback = '#6b7280') {
  const value = String(area?.customColor || '');
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
