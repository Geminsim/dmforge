import { ENEMY_CATEGORIES } from '../utils/enemyBestiary.js';

export const SF6_ENEMY_BESTIARY_VERSION = 'sf6-security-roster-v3-complete-loadouts';

const [MINION, LEADER] = ENEMY_CATEGORIES;
const inferItemRules = (name, requestedCategory) => {
  if (/急救包/.test(name)) return {
    category: '恢复消耗品', consumable: true, weight: name.includes('高级') ? 1.4 : 0.8,
    effectValue: name.includes('高级') ? '恢复 2d6+2 HP' : '恢复 1d6+1 HP',
    usage: `动作使用并接触目标；${name.includes('高级') ? '恢复 2d6+2 HP' : '恢复 1d6+1 HP'}，结算后扣除 1 份。`
  };
  if (/能量饮料/.test(name)) return { category: '恢复消耗品', consumable: true, weight: 0.45, effectValue: '斗气 +1', usage: '附赠动作饮用，恢复 1 格斗气并扣除 1 瓶。' };
  if (/稳定剂|注射剂|安瓿/.test(name)) return { category: '恢复消耗品', consumable: true, weight: 0.12, effectValue: name.includes('复合') ? '清除 1 个肉体负面状态并恢复 1d6 HP' : '恢复 1d6 HP；耐力检定 +1，持续 1 场战斗', usage: '附赠动作注射；仅限一个目标，效果结算后扣除 1 支。' };
  if (/烟幕珠/.test(name)) return { category: '战术消耗品', consumable: true, weight: 0.15, effectValue: '半径 10ft 重度遮蔽，持续 2 轮', usage: '动作投掷至 30ft 内；落点周围形成烟雾并扣除 1 颗。' };
  if (/束缚网/.test(name)) return { category: '战术消耗品', consumable: true, weight: 0.65, effectValue: '速度 DC 12；失败时移动力 −10ft，持续 1 轮', usage: '动作发射至 15ft；目标进行速度豁免，结算后扣除 1 份。' };
  if (/炫光刃芯/.test(name)) return { category: '战术消耗品', consumable: true, weight: 0.08, effectValue: '下一次刃轮攻击命中 +1，并使目标目盲至其回合开始', usage: '附赠动作安装到对应刃轮；下一次攻击结算后扣除 1 枚。' };
  if (/自锁束缚环/.test(name)) return { category: '束缚工具', consumable: true, weight: 0.5, effectValue: '限制双手；挣脱力量 DC 13', usage: '对失去行动能力或成功擒抱的相邻目标使用动作安装。' };
  if (/压缩斗气匣/.test(name)) return { category: '战术消耗品', consumable: true, weight: 0.35, effectValue: '磁轨铳攻击次数 +1', usage: '附赠动作装填到收容用磁轨铳；发射后扣除 1 匣，不能直接造成剧情性死亡。' };
  if (requestedCategory === '工具') return { category: '工具', weight: /终端/.test(name) ? 1.2 : 0.25, effectValue: /门禁卡/.test(name) ? '研究所门禁权限' : '相关检定 +1', usage: /门禁卡/.test(name) ? '在相邻门禁处刷卡；实际权限以名称和区域为准。' : '动作使用；对与该工具直接相关的一次检定提供 +1。' };
  if (/护甲|防暴甲|臂甲|护具|防暴盾|调节器/.test(name)) return { category: '防具', weight: /重型|强化防暴盾/.test(name) ? 8 : 4, acBonus: /重型|强化/.test(name) ? 2 : 1, effectValue: /重型/.test(name) ? '速度 −5ft' : '无额外移动惩罚', usage: `装备后 AC +${/重型|强化/.test(name) ? 2 : 1}${/重型/.test(name) ? '，移动速度降低 5ft' : ''}；同名防具不叠加。` };
  if (/手枪|磁轨铳|刃|锁链|拳套|手甲|护臂|手环|腕带|腰带|臂环/.test(name)) {
    const heavy = /长刃|锁链刃|磁轨铳|刃轮/.test(name);
    const ranged = /手枪|磁轨铳|飞刃|刃轮/.test(name);
    const damage = `1${heavy ? 'd8+1' : 'd6'} ${/电|震荡|脉冲|磁轨|聚气|斗气/.test(name) ? '能量' : '钝击'}`;
    return { category: '武器', weight: heavy ? 3.2 : 1.4, damageDiceCount: 1, damageDie: heavy ? 'd8' : 'd6', damageFixed: heavy ? 1 : 0, damageType: /电|震荡|脉冲|磁轨|聚气|斗气/.test(name) ? '能量' : '钝击', effectValue: `默认伤害 ${damage}`, usage: `${ranged ? '远程' : '近战'}攻击默认造成 ${damage}伤害；具体招式仍使用敌人角色卡上的伤害。` };
  }
  return { category: requestedCategory || '杂物', weight: 0.5, effectValue: '由 DM 按场景裁定', usage: '动作使用；具体效果由 DM 根据描述裁定。' };
};
const item = (id, name, category, description, quantity = 1, mechanics = {}) => ({ id, name, description, quantity, ...inferItemRules(name, category), ...mechanics });
const skill = (id, name, diceCount, die, fixed, damageType, description, cost = '动作') => ({ id, name, diceCount, die, fixed, damageType, description, cost });
const attack = (name, diceCount, die, fixed, damageType, description = '') => ({ name, diceCount, die, fixed, damageType, description, cost: '动作' });
const feat = (id, name, description) => ({ id, name, description });
const loadout = (prefix, equipment, consumable = '能量饮料（研究所）') => [
  item(`${prefix}_equipment`, equipment, '装备', '研究所制式装备；击败后可作为战利品获取，玩家使用时采用物品上的默认数值，DM 可随时调整。'),
  item(`${prefix}_keycard`, '研究所低权限门禁卡', '工具', '可开启普通安保门，无法进入最高权限区域。'),
  item(`${prefix}_consumable`, consumable, '消耗品', consumable.includes('急救') ? '用于基础止血与急救，击败携带者后可作为战利品获得。' : '恢复少量斗气的个人补给，击败携带者后可作为战利品获得。')
];

export const SF6_STANDARD_ENEMIES = [
  {
    id: 'sf6_enemy_patrol_guard_l3', name: '研究所巡逻警卫', category: MINION, level: 3,
    class: '军士', subclass: '技巧型', classDescription: '受过标准协同作战训练的前线战斗人员。', subclassDescription: '依靠简洁连段与队友夹击，不使用复杂招式。',
    description: '最常见的实验室安保。适合成组出现，主要负责封锁走廊和拖延入侵者。',
    maxHp: 17, ac: 11, speed: 30, initiative: 1, driveSlots: 3,
    stats: { 力量: 12, 速度: 12, 耐力: 11, 控制: 10, 精密: 10, 魅力: 8 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('制式震掌', 1, 'd4', 1, '冲击', '将斗气压入手掌的基础近战普通技，射程 1 尺。'),
    skills: [skill('guard_shield_push', '防暴推击', 1, 'd4', 1, '钝击', '命中后将目标推开 5 尺；目标撞到墙壁时不会额外受伤。')],
    inventory: loadout('patrol_guard', '安保震荡护臂')
  },
  {
    id: 'sf6_enemy_security_shooter_l3', name: '低致死脉冲射手', category: MINION, level: 3,
    class: '牵制者', subclass: '速射手', classDescription: '以远距离脉冲限制玩家移动。', subclassDescription: '射速快但单发威力较低，脱离掩体后很脆弱。',
    description: '少数保留枪形武器的安保。脉冲手枪发射的是压缩斗气与止动弹，只用于打散架势和压制移动；面对超常格斗家无法直接造成剧情性死亡。',
    maxHp: 14, ac: 10, speed: 30, initiative: 2, driveSlots: 3,
    stats: { 力量: 8, 速度: 13, 耐力: 10, 控制: 11, 精密: 12, 魅力: 8 }, saveProficiencies: ['精密', '魅力'],
    normalAttack: attack('脉冲手枪点射', 1, 'd4', 1, '斗气', '射程 30 尺的低致死性普通飞行道具。'),
    skills: [skill('shooter_suppress', '止动脉冲', 1, 'd6', 0, '冲击', '射程 30 尺；命中后目标下次移动减少 5 尺。')],
    inventory: loadout('security_shooter', '低致死脉冲手枪')
  },
  {
    id: 'sf6_enemy_containment_guard_l3', name: '收容区警戒员', category: MINION, level: 3,
    class: '道具师', subclass: '特工', classDescription: '携带针对实验体的简易控制道具。', subclassDescription: '依靠一次性装备制造短暂控制窗口。',
    description: '在冷冻仓和收容室附近值勤，擅长阻止目标逃离。',
    maxHp: 16, ac: 11, speed: 30, initiative: 1, driveSlots: 2,
    stats: { 力量: 10, 速度: 12, 耐力: 11, 控制: 10, 精密: 13, 魅力: 8 }, saveProficiencies: ['耐力', '控制'],
    normalAttack: attack('拘束手甲', 1, 'd4', 1, '电击', '以导电手甲强化拳击的近战普通技。'),
    skills: [skill('containment_net', '束缚网发射', 0, 'd6', 0, '控制', '射程 15 尺；目标进行速度豁免，失败则本回合移动力减少 10 尺。')],
    inventory: [...loadout('containment_guard', '导电拘束手甲', '简易急救包'), item('containment_net_item', '斗气束缚网', '消耗品', '展开后形成短暂能量网，限制一名近距离目标的移动。')]
  },
  {
    id: 'sf6_enemy_riot_guard_l4', name: '重装防暴警卫', category: MINION, level: 4,
    class: '蛮勇斗士', subclass: '推土机', classDescription: '生命与力量略高，以正面冲撞打乱站位。', subclassDescription: '强调简单的击退与地形封锁。',
    description: '穿着实验室防暴装备的重型杂兵，通常与射手混编。',
    maxHp: 24, ac: 13, speed: 25, initiative: 0, driveSlots: 4,
    stats: { 力量: 14, 速度: 9, 耐力: 13, 控制: 9, 精密: 10, 魅力: 8 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('护体肩撞', 1, 'd6', 2, '冲击', '将斗气覆盖上半身后发动的重型普通技。'),
    skills: [skill('riot_charge', '盾牌冲撞', 1, 'd6', 2, '钝击', '直线移动最多 10 尺后攻击；命中将目标推开 8 尺。')],
    inventory: loadout('riot_guard', '动能偏转臂甲', '简易急救包')
  },
  {
    id: 'sf6_enemy_tactical_shooter_l4', name: '战术震波师', category: MINION, level: 4,
    class: '牵制者', subclass: '重炮手', classDescription: '以较慢但更强的斗气波守住直线通道。', subclassDescription: '擅长高威力单发波动和轻度击退。',
    description: '通常驻守长走廊或主研究室控制台附近，以双掌压缩空气形成远程震波。',
    maxHp: 19, ac: 11, speed: 25, initiative: 1, driveSlots: 4,
    stats: { 力量: 9, 速度: 11, 耐力: 12, 控制: 12, 精密: 14, 魅力: 8 }, saveProficiencies: ['精密', '魅力'],
    normalAttack: attack('压缩空气掌', 1, 'd6', 1, '冲击', '射程 40 尺的普通气功波。'),
    skills: [skill('tactical_impact_round', '走廊震波', 1, 'd6', 1, '冲击', '射程 35 尺；命中后将目标推开 8 尺。')],
    inventory: loadout('tactical_shooter', '聚气增幅手环')
  },
  {
    id: 'sf6_enemy_response_agent_l4', name: '快速反应特勤', category: MINION, level: 4,
    class: '道具师', subclass: '影', classDescription: '移动快、承伤低，负责从侧翼切入。', subclassDescription: '借助烟雾和闪光快速改变站位。',
    description: '警报升级后少量出现的机动安保，适合绕开前排干扰后排角色。',
    maxHp: 20, ac: 12, speed: 35, initiative: 2, driveSlots: 4,
    stats: { 力量: 10, 速度: 14, 耐力: 10, 控制: 9, 精密: 13, 魅力: 9 }, saveProficiencies: ['耐力', '控制'],
    normalAttack: attack('流光带刃', 1, 'd6', 1, '切割', '挥动软质带刃形成弧形斩击的轻型普通技。'),
    skills: [skill('response_flash', '流光突进', 1, 'd4', 1, '光能', '沿带刃光轨移动最多 10 尺且不触发借机攻击；命中后目标下一次攻击 -2。')],
    inventory: [...loadout('response_agent', '折叠式流光带刃'), item('response_smoke', '斗气烟幕珠', '消耗品', '破碎后制造一小片短暂烟雾遮挡。')]
  },
  {
    id: 'sf6_enemy_advanced_assault_l5', name: '高级突击安保', category: MINION, level: 5,
    class: '军士', subclass: '力量型', classDescription: '小队中的高威胁前排，具备较稳定的回合伤害。', subclassDescription: '使用强化身体与直线冲击推进。',
    description: '前期遭遇战最多配置 1 名；与普通警卫同时行动时会明显提升压力。',
    maxHp: 32, ac: 14, speed: 30, initiative: 1,
    stats: { 力量: 14, 速度: 12, 耐力: 14, 控制: 11, 精密: 12, 魅力: 9 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('强化直拳', 1, 'd8', 2, '冲击', '射程 2 尺的中型普通技，出拳时护臂会放大冲击。'),
    skills: [
      skill('advanced_breach', '破阵震拳', 1, 'd8', 2, '冲击', '拳劲向前延伸 8 尺；命中后将目标推开 6 尺并标记至本回合结束。'),
      skill('advanced_stock', '踏地追拳', 1, 'd6', 2, '钝击', '仅能对本回合被自己推动的目标使用；踏碎地面追近后以附赠动作攻击。', '附赠动作')
    ],
    feats: [feat('feat-scatter', '散打者', '不能取消必杀技的普通技与特殊技额外造成 1d4 + 力量调整伤害。')],
    inventory: [...loadout('advanced_assault', '冲击增幅拳甲'), item('advanced_armor', '轻型斗气护甲', '装备', '将使用者斗气扩散到身体表面的快速反应部队护甲。')]
  },
  {
    id: 'sf6_enemy_infiltration_response_l5', name: '渗透应对特工', category: MINION, level: 5,
    class: '道具师', subclass: '特工', classDescription: '依靠消耗品和短距离位移制造夹击。', subclassDescription: '技能直接、连携短，不需要复杂状态追踪。',
    description: '前期遭遇战最多出现 1–2 名，通常负责追击脱离主队的玩家。',
    maxHp: 28, ac: 13, speed: 35, initiative: 3,
    stats: { 力量: 10, 速度: 15, 耐力: 11, 控制: 12, 精密: 14, 魅力: 9 }, saveProficiencies: ['耐力', '控制'],
    normalAttack: attack('回旋飞刃', 1, 'd6', 2, '切割', '射程 20 尺；掷出后沿斗气轨迹返回手中。'),
    skills: [
      skill('infiltration_flash', '炫光刃阵', 1, 'd4', 1, '光能', '将数枚飞刃悬停成10尺刃阵；命中目标下一次攻击具有劣势。'),
      skill('infiltration_crossfire', '换位交叉斩', 1, 'd8', 2, '切割', '使用前可移动 8 尺；若目标受炫光刃阵影响，命中 +2。')
    ],
    feats: [feat('feat-slide', '我建议，滑着走!', '每回合一次，可滑步移动 5 尺且不触发借机攻击。')],
    inventory: [...loadout('infiltration_response', '回旋飞刃组'), item('infiltration_flash_item', '炫光刃芯', '消耗品', '为飞刃注入一次额外的高亮斗气。', 2)]
  },
  {
    id: 'sf6_enemy_wave_trainee_l3', name: '波动拳安保学员', category: MINION, level: 3,
    class: '武道者', subclass: '正统派', classDescription: '接受过统一气功训练的基础安保格斗家。', subclassDescription: '招式稳定易懂，以短距离波动拳支援前排。',
    description: '刚完成超常格斗训练的实验室安保；常与巡逻警卫成组出现。',
    maxHp: 16, ac: 11, speed: 30, initiative: 1,
    stats: { 力量: 12, 速度: 12, 耐力: 11, 控制: 13, 精密: 10, 魅力: 8 }, saveProficiencies: ['力量', '速度'],
    normalAttack: attack('聚气直拳', 1, 'd4', 1, '冲击', '拳峰附着一层微弱斗气。'),
    skills: [skill('wave_trainee_palm', '训练式波动掌', 1, 'd6', 0, '斗气', '射程 20 尺；命中后目标后退 3 尺。')],
    inventory: [...loadout('wave_trainee', '聚气训练腕带'), item('wave_manual', '波动呼吸训练卡', '工具', '记录最基础的聚气呼吸节奏。')]
  },
  {
    id: 'sf6_enemy_magnetic_binder_l3', name: '磁力拘束员', category: MINION, level: 3,
    class: '道具师', subclass: '特工', classDescription: '使用磁力锁链捕获逃脱目标。', subclassDescription: '不追求伤害，只进行拉扯和减速。',
    description: '负责收回失控实验体的轻装安保，技能非常直接。',
    maxHp: 15, ac: 11, speed: 30, initiative: 2,
    stats: { 力量: 11, 速度: 13, 耐力: 10, 控制: 11, 精密: 13, 魅力: 8 }, saveProficiencies: ['耐力', '控制'],
    normalAttack: attack('磁链横扫', 1, 'd4', 1, '钝击', '射程 3 尺的冷兵器普通技。'),
    skills: [skill('magnetic_binder_pull', '回收牵引', 1, 'd4', 1, '磁力', '射程 15 尺；命中后将目标向自己拉近 5 尺。')],
    inventory: [...loadout('magnetic_binder', '伸缩磁力锁链'), item('binder_cuff', '自锁束缚环', '消耗品', '套住失去行动能力的目标后自动收紧。')]
  },
  {
    id: 'sf6_enemy_chakram_guard_l4', name: '刃轮护卫', category: MINION, level: 4,
    class: '刽子手', subclass: '荣誉行刑官', classDescription: '使用大型回旋刃轮守卫宽阔房间。', subclassDescription: '攻击动作醒目，但能够从意外角度返回。',
    description: '主研究室和贵重设备区的仪仗型护卫，战斗风格华丽但生命值不高。',
    maxHp: 20, ac: 12, speed: 30, initiative: 2,
    stats: { 力量: 11, 速度: 14, 耐力: 10, 控制: 12, 精密: 14, 魅力: 10 }, saveProficiencies: ['速度', '控制'],
    normalAttack: attack('半月刃轮', 1, 'd6', 1, '切割', '射程 15 尺；刃轮沿弧线返回。'),
    skills: [skill('chakram_return', '回环二段', 1, 'd6', 1, '切割', '若普通技本回合未命中，可从目标身后再进行一次命中 -2 的返回攻击。', '附赠动作')],
    inventory: [...loadout('chakram_guard', '月银回旋刃轮'), item('chakram_core', '刃轮回收磁芯', '工具', '帮助刃轮沿预设轨迹返回。')]
  },
  {
    id: 'sf6_enemy_bio_enhanced_l5', name: '生化强化安保兵', category: MINION, level: 5,
    class: '蛮勇斗士', subclass: '丛林猎手', classDescription: '通过短效实验药剂强化身体与元素斗气。', subclassDescription: '先附着元素，再用身体冲撞触发额外伤害。',
    description: '前期最多出现 1 名。药剂效果不稳定，但足以让普通安保短暂获得超常体魄。',
    maxHp: 34, ac: 13, speed: 30, initiative: 1,
    stats: { 力量: 15, 速度: 11, 耐力: 15, 控制: 12, 精密: 11, 魅力: 7 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('强化臂锤', 1, 'd8', 2, '钝击', '手臂在攻击瞬间膨胀并覆盖元素斗气。'),
    skills: [
      skill('bio_element_mark', '元素烙印', 1, 'd6', 2, '元素', '命中后选择火、电、冰之一，给目标留下对应烙印至本回合结束。'),
      skill('bio_body_crash', '兽性冲撞', 1, 'd8', 2, '冲击', '命中有元素烙印的目标时额外造成 1d4 对应元素伤害并推开 6 尺。')
    ],
    feats: [feat('feat-five-poisons', '五毒不侵', '受到燃烧、中毒、电击等特殊状态伤害时，伤害骰具有劣势。')],
    inventory: [...loadout('bio_enhanced', '生化强化臂环', '稳定剂'), item('bio_ampoule', '短效强化安瓿', '消耗品', '只适配经过实验室预处理的安保人员。')]
  },
  {
    id: 'sf6_enemy_shift_captain_l4', name: '安保值班队长', category: LEADER, level: 4,
    class: '军士', subclass: '技巧型', classDescription: '负责维持三到五人安保小队的协同行动。', subclassDescription: '通过口令和短连段强化普通杂兵。',
    description: '最基础的杂兵头领。适合作为普通警卫战斗中的单一指挥单位。',
    maxHp: 31, ac: 13, speed: 30, initiative: 2, driveSlots: 4,
    stats: { 力量: 13, 速度: 13, 耐力: 12, 控制: 13, 精密: 12, 魅力: 11 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('队长震拳连击', 1, 'd6', 2, '冲击'),
    skills: [
      skill('captain_order', '集火口令', 0, 'd6', 0, '指挥', '选择 30 尺内一名敌人；一名安保盟友对其下一次攻击命中 +2。', '附赠动作'),
      skill('captain_drive', '驱离重击', 1, 'd6', 2, '钝击', '命中后将目标推开 8 尺。')
    ],
    inventory: [...loadout('shift_captain', '队长级聚气拳套'), item('captain_radio', '安保通讯器', '工具', '用于接收警报和下达小队指令。')]
  },
  {
    id: 'sf6_enemy_martial_instructor_l4', name: '安保武术教官', category: LEADER, level: 4,
    class: '武道者', subclass: '正统派', classDescription: '负责把研究所制式气功教授给普通安保。', subclassDescription: '以稳健的波动掌和上升拳保护身边学员。',
    description: '低等级小队的格斗导师，本身并非精英，但能让波动拳学员更好地站住阵线。',
    maxHp: 30, ac: 13, speed: 30, initiative: 2,
    stats: { 力量: 14, 速度: 13, 耐力: 13, 控制: 14, 精密: 12, 魅力: 11 }, saveProficiencies: ['力量', '速度'],
    normalAttack: attack('教官寸劲', 1, 'd6', 2, '冲击', '射程 1 尺，命中动作简短而稳定。'),
    skills: [
      skill('instructor_wave', '制式波动掌', 1, 'd6', 2, '斗气', '射程 25 尺；命中后推开 5 尺。'),
      skill('instructor_upper', '护阵上升拳', 1, 'd8', 2, '冲击', '对刚移动到自己或盟友 2 尺内的目标命中 +2，并造成强制倒地。', '反应')
    ],
    inventory: [...loadout('martial_instructor', '教官聚气腰带'), item('instructor_whistle', '斗气共鸣哨', '工具', '发出的高频声帮助学员同步呼吸节奏。')]
  },
  {
    id: 'sf6_enemy_riot_chief_l5', name: '防暴小队长', category: LEADER, level: 5,
    class: '军士', subclass: '力量型', classDescription: '能独立守住狭窄通道的耐久型头领。', subclassDescription: '先架盾承伤，再用撞击迫使玩家离开有利位置。',
    description: '建议与 2–3 名普通射手搭配；前期一场战斗最多出现 1 名。',
    maxHp: 42, ac: 15, speed: 25, initiative: 0,
    stats: { 力量: 15, 速度: 10, 耐力: 15, 控制: 12, 精密: 11, 魅力: 10 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('重型盾击', 1, 'd8', 2, '钝击'),
    skills: [
      skill('riot_chief_brace', '架盾推进', 0, 'd6', 0, '防御', '本回合 AC +2，并可向前移动 10 尺；移动不触发借机攻击。'),
      skill('riot_chief_crush', '壁面压制', 1, 'd8', 3, '钝击', '将目标推开 10 尺；若目标被地形阻挡，额外造成 1d4 伤害。')
    ],
    feats: [feat('feat-immovable', '不动如山', '一轮内没有移动或攻击时获得霸体。')],
    inventory: [...loadout('riot_chief', '强化防暴盾', '高级急救包'), item('riot_chief_armor', '重型防暴甲', '装备', '厚重护甲，会限制移动速度。')]
  },
  {
    id: 'sf6_enemy_pursuit_chief_l5', name: '追捕组长', category: LEADER, level: 5,
    class: '影罗残党', subclass: '教头', classDescription: '受过旧式影罗战斗训练的实验室追捕负责人。', subclassDescription: '先标记位置，再驱使队员和自己追击。',
    description: '适合在长走廊或多出口房间中率领快速反应特勤。',
    maxHp: 37, ac: 14, speed: 35, initiative: 3,
    stats: { 力量: 13, 速度: 15, 耐力: 12, 控制: 14, 精密: 13, 魅力: 10 }, saveProficiencies: ['速度', '精密'],
    normalAttack: attack('追捕踢击', 1, 'd6', 3, '钝击'),
    skills: [
      skill('pursuit_mark', '追猎标记', 0, 'd6', 0, '标记', '标记 30 尺内目标至下一回合结束；安保单位向该目标移动时额外获得 5 尺移动。', '附赠动作'),
      skill('pursuit_finish', '拦截飞踢', 1, 'd8', 3, '钝击', '若攻击已标记目标，命中 +2，并将其推开 8 尺。')
    ],
    feats: [feat('feat-interrupt', '抢比', '敌人使用重攻击或近战必杀技时，可用反应进行一次普通技抢招。')],
    inventory: [...loadout('pursuit_chief', '追捕组战术护具'), item('pursuit_tracker', '短程追踪器', '工具', '可在研究所内部追踪安保标记。')]
  },
  {
    id: 'sf6_enemy_chainblade_leader_l6', name: '锁链刃小队长', category: LEADER, level: 6,
    class: '刽子手', subclass: '荣誉行刑官', classDescription: '使用华丽长锁链刃封锁走廊与门口。', subclassDescription: '以虚影和锁链轨迹误导敌人，再从侧面完成收束。',
    description: '擅长控制中距离空间的冷兵器头领；适合与磁力拘束员组成主题小队。',
    maxHp: 45, ac: 15, speed: 35, initiative: 4,
    stats: { 力量: 13, 速度: 16, 耐力: 12, 控制: 14, 精密: 15, 魅力: 12 }, saveProficiencies: ['速度', '控制'],
    normalAttack: attack('紫电链刃', 1, 'd8', 3, '切割', '射程 5 尺，刃节间有斗气丝线连接。'),
    skills: [
      skill('chainblade_snare', '蛇行缠刃', 1, 'd6', 3, '切割', '射程 15 尺；命中后把目标拉近 5 尺并留下“缠线”标记。'),
      skill('chainblade_mirage', '镜影错步', 1, 'd4', 2, '光能', '移动 10 尺并在原地留下虚影；攻击缠线目标时不触发借机攻击。', '附赠动作'),
      skill('chainblade_finish', '圆月收链', 2, 'd6', 3, '切割', '10 尺范围横扫；缠线目标额外受到 2 点伤害并倒地，然后移除标记。')
    ],
    feats: [feat('feat-slide-chain', '我建议，滑着走!', '每回合一次，可沿锁链轨迹滑步 5 尺且不触发借机攻击。')],
    inventory: [...loadout('chainblade_leader', '紫电节式锁链刃', '战斗注射剂'), item('chainblade_reel', '斗气收链轮', '工具', '控制链刃展开长度与回收轨迹。')]
  },
  {
    id: 'sf6_enemy_black_ops_leader_l6', name: '黑衣行动组长', category: LEADER, level: 6,
    class: '刽子手', subclass: '刺杀者', classDescription: '专门处理严重泄密和高危险逃脱事件。', subclassDescription: '先制造破绽，再以高伤害单发攻击收尾。',
    description: '中期使用的精锐头领；应避免与另一名同级头领同时出现。',
    maxHp: 47, ac: 15, speed: 35, initiative: 4,
    stats: { 力量: 13, 速度: 16, 耐力: 12, 控制: 14, 精密: 15, 魅力: 10 }, saveProficiencies: ['速度', '控制'],
    normalAttack: attack('战术刃快速斩', 1, 'd8', 3, '切割'),
    skills: [
      skill('black_ops_smoke', '烟幕切入', 1, 'd6', 2, '切割', '移动最多 10 尺且不触发借机攻击；命中后目标获得“破绽”标记。'),
      skill('black_ops_execute', '月弧处决斩', 1, 'd10', 3, '切割', '挥出射程 25 尺的月牙刃气；攻击有“破绽”的目标时具有优势，命中后移除标记。'),
      skill('black_ops_retreat', '战术撤步', 0, 'd6', 0, '位移', '受到近战攻击后以反应移动 5 尺。', '反应')
    ],
    feats: [feat('feat-footsies', '立回专家', '严重挥空的敌人会暴露确反机会；近距离重攻击对你更难命中。')],
    inventory: [...loadout('black_ops_leader', '黑衣行动组月弧长刃', '战斗注射剂'), item('black_ops_sheath', '聚气刀鞘', '工具', '帮助长刃在收刀时重新积蓄刃气。')]
  },
  {
    id: 'sf6_enemy_containment_commander_l6', name: '收容火力指挥官', category: LEADER, level: 6,
    class: '牵制者', subclass: '重炮手', classDescription: '利用收容用磁轨铳切割战场的少数远程武器头领。', subclassDescription: '先打散护体斗气，再以爆裂脉冲进行直接连携。',
    description: '适合放置在大型研究室或主控制台后方，由普通警卫阻止玩家贴身。',
    maxHp: 44, ac: 14, speed: 25, initiative: 2,
    stats: { 力量: 10, 速度: 12, 耐力: 14, 控制: 15, 精密: 16, 魅力: 10 }, saveProficiencies: ['精密', '魅力'],
    normalAttack: attack('磁轨铳脉冲', 1, 'd8', 3, '冲击', '射程 50 尺。枪械发射压缩斗气而非致死弹头，无法直接造成剧情性死亡。'),
    skills: [
      skill('commander_armor_break', '散气脉冲', 1, 'd8', 3, '斗气', '命中后打散护体斗气，使目标 AC -1，持续到指挥官本回合结束。'),
      skill('commander_blast', '爆裂追射', 2, 'd6', 2, '冲击', '10 尺小范围；对本回合被散气脉冲命中的目标额外造成 2 点固定伤害。'),
      skill('commander_reposition', '后坐位移', 1, 'd4', 1, '冲击', '命中后目标与自己分别向相反方向移动 5 尺。', '附赠动作')
    ],
    feats: [feat('feat-projectile', '波动之拳', '回合内第一次飞行道具未命中时不消耗资源，飞行道具伤害提高。')],
    inventory: [...loadout('containment_commander', '收容用磁轨铳'), item('commander_ammo', '压缩斗气匣', '消耗品', '储存用于磁轨铳的压缩斗气；无法作为常规致死弹药使用。', 2)]
  },
  {
    id: 'sf6_enemy_enhanced_overseer_l7', name: '实验强化督战官', category: LEADER, level: 7,
    class: '蛮勇斗士', subclass: '丛林猎手', classDescription: '能够稳定承受多种强化药剂的高级安保。', subclassDescription: '在火、电两种元素之间切换，以强化身体完成短连携。',
    description: '杂兵头领中的重型威胁，但仍不是剧情 Boss；建议搭配少量3级安保而非其他头领。',
    maxHp: 60, ac: 15, speed: 30, initiative: 1,
    stats: { 力量: 17, 速度: 11, 耐力: 17, 控制: 14, 精密: 12, 魅力: 9 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('强化巨臂重拳', 1, 'd10', 3, '钝击', '手臂覆盖浓厚斗气的重型普通技。'),
    skills: [
      skill('overseer_fire', '赤热覆体', 1, 'd6', 3, '燃烧', '进入赤热状态；本回合近战命中额外造成 2 点燃烧伤害。', '附赠动作'),
      skill('overseer_electric', '雷光覆体', 1, 'd6', 3, '电击', '进入雷光状态；本回合移动增加 10 尺，第一次攻击命中 +2。', '附赠动作'),
      skill('overseer_lariat', '元素巨臂回旋', 2, 'd6', 3, '冲击', '10 尺范围横扫并推开 8 尺；额外附带当前覆体元素伤害。'),
      skill('overseer_crash', '督战坠击', 1, 'd10', 4, '冲击', '跳跃到 15 尺内位置攻击；命中处于元素状态的目标时强制倒地。')
    ],
    feats: [feat('feat-rage-overseer', '不动如山', '一轮内没有移动或攻击时获得霸体；进入覆体状态时可主动结束该等待。')],
    inventory: [...loadout('enhanced_overseer', '双元素增幅臂环', '复合稳定剂'), item('overseer_regulator', '生化调节器', '装备', '维持强化身体不发生失控。')]
  },
  {
    id: 'sf6_enemy_security_deputy_l7', name: '研究所安保副主管', category: LEADER, level: 7,
    class: '军士', subclass: '技巧型', classDescription: '能够独立指挥整层安保力量的高级头领。', subclassDescription: '技能围绕标记、队友命中和收尾攻击形成三段式连携。',
    description: '杂兵头领的最高规格，不属于剧情 Boss；建议单独搭配 2–4 名低级杂兵。',
    maxHp: 57, ac: 16, speed: 30, initiative: 3,
    stats: { 力量: 15, 速度: 14, 耐力: 15, 控制: 15, 精密: 13, 魅力: 13 }, saveProficiencies: ['力量', '耐力'],
    normalAttack: attack('主管制式组合拳', 1, 'd8', 3, '钝击'),
    skills: [
      skill('deputy_designate', '威胁指定', 0, 'd6', 0, '指挥', '选择 40 尺内目标；本轮第一名命中该目标的安保单位将其推开 5 尺。', '附赠动作'),
      skill('deputy_breach', '协同破阵', 1, 'd8', 3, '钝击', '若目标本轮已被其他安保命中，本次攻击具有优势并造成跪倒。'),
      skill('deputy_finish', '终止行动', 2, 'd6', 3, '钝击', '仅对特殊受击状态目标使用；命中后强制倒地。'),
      skill('deputy_command', '紧急调度', 0, 'd6', 0, '指挥', '一名 30 尺内杂兵立即移动最多 10 尺，不触发借机攻击。', '反应')
    ],
    feats: [feat('feat-team-combo', '热血沸腾的组合技!', '首次命中队友造成特殊状态的敌人时延长该状态并增加伤害。')],
    inventory: [...loadout('security_deputy', '主管级战术护具', '高级急救包'), item('deputy_master_key', '安保主管门禁卡', '工具', '可开启研究所大部分安保区域。'), item('deputy_radio', '加密指挥终端', '工具', '连接研究所内部安保频道。')]
  }
];
