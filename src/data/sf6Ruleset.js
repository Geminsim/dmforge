import { SF6_WORKBOOK_DATA } from './sf6WorkbookData.js';

export const SF6_ATTRIBUTE_LABELS = {
  strength: '力量', speed: '速度', endurance: '耐力', control: '控制', precision: '精密', charisma: '魅力'
};

export const SF6_RESOURCES = [
  { id: 'action', name: '动作', max: 1, resetType: 'turn' },
  { id: 'bonus-action', name: '附赠动作', max: 1, resetType: 'turn' },
  { id: 'reaction', name: '反应', max: 1, resetType: 'turn' },
  { id: 'drive', name: '斗气', max: 6, resetType: 'short_rest' },
  { id: 'super', name: '超级必杀槽', max: 1, resetType: 'long_rest', ruling: '共 1 格，长休后恢复。' }
];

export const SF6_CONDITIONS = [
  ['knockdown', '倒地', 'turn-start', '回合开始时选择起身位置；起身不消耗动作。'],
  ['hard-knockdown', '强制倒地', 'turn-start', '只能原地起身；仅下段普通技可追击；起身后移动力减半。'],
  ['launch', '浮空', 'round-end', '不受下段攻击；可被符合条件的后续招式追击。'],
  ['ground-bounce', '弹地', 'turn-end', '持续至受击回合结束；结束时转为强制倒地。'],
  ['wall-bounce', '弹墙', 'turn-end', '与墙面互动后弹回，后续追击条件参照浮空。'],
  ['crumple', '跪倒', 'turn-end', '受击回合结束前保持跪地，可触发特定追击。'],
  ['counter-hit', '打康', 'turn-end', '抢招成功造成的受击状态。'],
  ['punish-counter', '确反康', 'turn-end', '挥空或特殊条件触发；损失 1 格斗气。'],
  ['armor', '霸体', 'duration', '行动无法被反应，强制位移显著降低。'],
  ['burnout', '斗气枯竭', 'drive-restored', 'AC -3，且必杀技更容易受到反制。'],
  ['rage', '狂暴', 'conditional', '蛮勇斗士职业状态；眩晕、强制倒地或一轮无伤害互动时结束。'],
  ['invisible', '隐身', 'conditional', '发动攻击、受到范围伤害或被隐身感知发现时结束。'],
  ['psycho-debuff', '精神萎靡', 'stack', '每层使攻击伤害修正 -1；普通上限 5，特定领域内可至 10。'],
  ['poison', '中毒', 'stack', '每回合造成毒伤害，5 层触发毒爆。'],
  ['ice', '冰冻', 'stack', '每层移动距离 -20%，5 层触发冰暴。'],
  ['fire', '燃烧', 'stack', '移动路径留下火焰并造成环境伤害。'],
  ['electric', '电击', 'stack', '叠层产生电击相关附加效果。']
].map(([id, name, timing, description]) => ({ id, name, timing, description, source: '规则书 v0.9', automation: 'basic' }));

export const SF6_CLASSES = [
  { id: 'martial-artist', name: '武道者', stats: [15,10,14,12,13,8], saves: ['力量','速度'], hitDice: 'd8', ac: 10, speed: 30, subclasses: ['正统派','邪修派','隐士'] },
  { id: 'soldier', name: '军士', stats: [13,14,10,15,12,8], saves: ['力量','耐力'], hitDice: 'd10', ac: 13, speed: 30, subclasses: ['技巧型','力量型','灵动型'] },
  { id: 'brute', name: '蛮勇斗士', stats: [14,10,15,13,12,8], saves: ['力量','耐力'], hitDice: 'd12', ac: 10, speed: 30, subclasses: ['摔角手','丛林猎手','推土机'] },
  { id: 'executioner', name: '刽子手', stats: [12,13,8,15,14,10], saves: ['速度','控制'], hitDice: 'd8', ac: 11, speed: 30, subclasses: ['刺杀者','荣誉行刑官'], aliases: ['荣耀行刑官'] },
  { id: 'zoner', name: '牵制者', stats: [8,12,10,14,15,13], saves: ['精密','魅力'], hitDice: 'd8', ac: 10, speed: 30, subclasses: ['重炮手','速射手'] },
  { id: 'shadaloo', name: '影罗残党', stats: [13,8,10,15,14,12], saves: ['速度','精密'], hitDice: 'd10', ac: 11, speed: 30, subclasses: ['统领','教头','黑手'] },
  { id: 'item-user', name: '道具师', stats: [12,14,10,8,15,13], saves: ['耐力','控制'], hitDice: 'd8', ac: 10, speed: 30, subclasses: ['特工','影'] }
].map(entry => {
  const authored = SF6_WORKBOOK_DATA.classes[entry.name] || { baseFeatures: [], subclasses: {} };
  const subclassFeatures = entry.id === 'executioner'
    ? { ...authored.subclasses, 荣誉行刑官: authored.subclasses['荣誉行刑官'] || authored.subclasses['荣耀行刑官'] }
    : authored.subclasses;
  if (entry.id === 'executioner') delete subclassFeatures['荣耀行刑官'];
  return { ...entry, attributeOrder: Object.keys(SF6_ATTRIBUTE_LABELS), features: authored.baseFeatures, subclassFeatures, source: '角色卡/规则书 v0.9' };
});

export const SF6_FEATS = SF6_WORKBOOK_DATA.feats.map(feat => ({
  ...feat,
  description: feat.minimumLevel === 5 ? feat.description.replace(/\s*（[^）]+）\s*$/, '').trim() : feat.description,
  source: '角色卡/规则书 v0.9'
}));

export const SF6_RULE_SECTIONS = [
  { id: 'setting', category: '背景故事', title: '世界格斗大赛', pages: [1], summary: '2–4 名格斗家来到蒙彼利埃参加五年一度的世界格斗大赛，并被卷入赛事之外的事件。' },
  { id: 'turn-economy', category: '战斗方式', title: '回合资源', pages: [1,2], summary: '角色通过动作、附赠动作、反应、移动力、斗气与超级必杀槽安排每轮行动。', details: [
    { title: '动作与附赠动作', text: '每名角色通常拥有 1 个动作与 1 个附赠动作，并在自己的回合开始时恢复。动作主要用于普通技、必杀技与其他主要行动；轻攻击等明确注明的动作可以由附赠动作执行。已经消耗的资源不会在同一回合自然再次获得，除非能力明确返还。' },
    { title: '反应', text: '每名角色通常拥有 1 个反应，并在自己的回合开始时恢复。完美防御、斗气反攻、抢招等能力会消耗反应。反应发生在触发事件满足时，不需要等到自己的回合。' },
    { title: '移动力', text: '移动与动作资源分别计算。角色可以在行动前后分段移动；绿冲、起身和特殊地形可能改变本回合可用移动距离。强制倒地起身会损失 50% 移动力。' },
    { title: '斗气与超级必杀槽', text: '斗气上限默认为 6 格，用于 OD 必杀技和斗气系统能力，短休后恢复。超级必杀槽独立于斗气，共 1 格，长休后恢复；释放超级必杀技时消耗该槽。' }
  ] },
  { id: 'normals', category: '战斗方式', title: '普通技与攻击判定', pages: [2,3], summary: '普通技分为轻、中、重与空中攻击，并具有上段、下段和中段判定。', details: [
    { title: '判定类型', text: '上段是无额外效果的基础判定。下段针对敌人下半身：若目标本回合移动过，命中检定具有优势。中段从目标头顶攻击：若目标本回合没有移动过，命中检定具有优势。' },
    { title: '轻攻击', text: '距离 1 尺，伤害 1d4，可由附赠动作执行。无论命中与否都可取消为必杀技，并承受“1d4－速度熟练调整”的伤害修正惩罚。轻攻击始终视为上段，不能自行造成倒地，但后续必杀技仍可造成状态。' },
    { title: '中攻击', text: '距离 2 尺，伤害 1d6。无论命中与否都可取消为必杀技，并承受“1d6－力量熟练调整”的伤害修正惩罚。拳技无特殊判定但可由附赠动作执行；踢技可依动作设计为中段或下段。' },
    { title: '重攻击', text: '距离 3 尺，伤害 1d10，取消必杀技时承受 1d6 伤害修正惩罚。重攻击可以采用特殊判定；下段重攻击命中时会使目标强制倒地。' },
    { title: '空中攻击', text: '从高处跳下发动，视为中段攻击。命中后可消耗全部剩余移动力接续一次普通技；若空中攻击未命中，后续攻击仍需重新进行命中判定。' },
    { title: '取消与连段', text: '每个角色初始拥有轻、中、重普通技各一个。由已经命中的普通技取消出的必杀技无需再次进行命中判定；具体伤害修正、资源消耗和状态仍按对应招式结算。' }
  ] },
  { id: 'specials', category: '战斗方式', title: '特殊技、必杀技、OD 与超级必杀', pages: [3], summary: '角色以特殊技扩展普通攻击，并通过必杀技、OD 和超级必杀构成连段。', details: [
    { title: '特殊技', text: '角色可随等级、探索或人物交流获得滑铲、TC 技、空中连段、霸体技等特殊技。特殊技按强度归入轻、中或重类别，并必须明确标注能否取消为必杀技。' },
    { title: '必杀技', text: '每名角色初始可设计 3 个必杀技，之后可通过成长与剧情获得更多。必杀技默认消耗 1 个动作；所有普通技都可以取消为必杀技。不同必杀技可在命中后造成强制倒地、跪倒、浮空、贴墙等状态。' },
    { title: 'OD 必杀技', text: '角色可用斗气代替动作释放必杀技，包括用于取消普通技。这样释放的招式视为 OD 版本，默认消耗 2 格斗气，并应具有比普通版本更强的效果。招式若有不同消耗或取消条件，以招式自身说明为准。' },
    { title: '超级必杀技', text: '游戏中后期解锁，可在自己回合的任意时间释放，消耗独立的 1 格超级必杀槽。基础伤害为目标最大生命值的 50%，仍受伤害修正衰减；命中必定造成强制倒地。目标在同一场战斗中不能再次成为其他超级必杀技的目标。' }
  ] },
  { id: 'drive-system', category: '资源', title: '斗气系统', pages: [4,5], summary: '斗气用于绿冲、斗气迸发、完美防御、斗气反攻和 OD 必杀技；耗尽后进入斗气枯竭。', details: [
    { title: '绿冲（Drive Dash）', text: '消耗 1 格斗气并替代疾走，使本次移动距离翻倍；下一次普通技获得优势，并可命中特殊状态中的敌人。也可消耗 3 格斗气取消普通技或可取消的特殊技，并返还该招式消耗的动作或附赠动作。' },
    { title: '斗气迸发（Drive Impact）', text: '消耗 2 格斗气和 1 个动作。未命中仍将目标击退 8 尺但不造成伤害；命中将目标击退 15 尺并使其损失 2 格斗气。大成功触发确反康迸发并返还全部消耗；大失败则自己受到确反康、额外损失 1 格斗气、不产生击退，并立即进入受击者回合。迸发击退会与环境互动。' },
    { title: '完美防御（Perfect Parry）', text: '对手命中检定成功后，以反应发动并消耗 2 格斗气。若防御掷骰大于对方命中结果＋5，防御攻击并返还 1 格斗气；若骰面数字与对手命中骰一致，则触发完美防御：伤害归零、返还全部斗气，并立即获得一次可移动最多 50% 移动力的临时回合。该临时回合造成的总伤害带有 1d8 伤害修正。' },
    { title: '斗气反攻（Drive Reversal）', text: '对手命中检定失败后，以反应发动并消耗 2 格斗气。将对手推开 8 尺并造成 1d4 伤害；该位移不会与地形产生互动。' },
    { title: '斗气枯竭（Burnout）', text: '斗气降至 0 时进入枯竭状态：AC 降低 3 点，且必杀技无论命中与否都会造成额外 1d4 伤害。短休恢复斗气后，资源造成的枯竭状态解除。' }
  ] },
  { id: 'throws', category: '战斗方式', title: '投技、指令投与康', pages: [5], summary: '普通投技使用固定检定；指令投具有独立的命中、伤害和落空惩罚。', details: [
    { title: '普通投技', text: '角色开局拥有正投和背投各一个，只能选择 1 尺内目标，同时消耗 1 个动作与 1 个附赠动作。命中率固定为 50%，即投掷结果大于 10 时命中。大成功返还附赠动作；大失败使自己在一回合内进入受击确反康。正投保持双方方向，背投交换双方站位方向；普通投技不与地形互动。' },
    { title: '指令投类必杀技', text: '不能用来取消普通技，也不能被超级必杀技取消。对正常目标的命中阈值为 10；对跪倒、倒地等特定状态可必中，最终由 DM 根据场景判断。命中造成徒手或武器攻击的最大伤害并使目标倒地；未命中则本回合受到的下一次攻击触发确反康。某些特殊移动可以躲避指令投。' },
    { title: '打康', text: '角色可能通过“抢招”反应截断对手行动。抢招成功后，受击者进入打康状态，抢招方立即获得一次攻击机会。' },
    { title: '确反康', text: '攻击挥空或特殊规则触发时，角色进入受击确反康状态，由 DM 根据现场引导后续连段。进入确反康的受击者损失 1 格斗气。' }
  ] },
  { id: 'combat-states', category: '人物状态', title: '倒地与连段状态', pages: [5,6], summary: '定义倒地、强制倒地、浮空、弹地、弹墙、跪倒、打康与确反康。' },
  { id: 'progression', category: '角色成长', title: '1–10 级成长', pages: [7], summary: '推荐从 3 级开始；成长同时提供熟练加值、属性、专长、子职业和终极能力。', stages: [
    { levels: 'Lv.1–3', name: '格斗高手', description: '锦标赛夺冠热门或潜在黑马；已经拥有鲜明的个人流派。本战役建议从 3 级开始。' },
    { levels: 'Lv.4–7', name: '顶尖格斗家', description: '冠军级选手，能够熟练驾驭自身招式体系，并开始形成明确的子职业方向。' },
    { levels: 'Lv.8–9', name: '门派宗师', description: '连冠擂主级人物，完全掌握个人风格，足以轻松击败绝大多数普通人类。' },
    { levels: 'Lv.10', name: '武神／传说', description: '抵达凡人格斗领域的顶点，成为前所未有、足以被世界铭记的格斗传说。' }
  ], levels: [
    { level: 3, proficiency: '+2', reward: '获得 1 个核心专长；建议战役起始等级。' },
    { level: 4, proficiency: '+2', reward: '增加 1 点属性。' },
    { level: 5, proficiency: '+3', reward: '获得 1 个新的 5 级专长。' },
    { level: 6, proficiency: '+3', reward: '选择子职业，并获得相应子职业能力。' },
    { level: 7, proficiency: '+3', reward: '增加 1 点属性。' },
    { level: 8, proficiency: '+3', reward: '解锁超级必杀 CA，并获得 1 个新的 8 级专长。' },
    { level: 9, proficiency: '+3', reward: '增加 1 点属性。' },
    { level: 10, proficiency: '+4', reward: '增加 1 点属性，并获得 1 个额外动作。' }
  ], details: [
    { title: '成长来源', text: '除等级奖励外，角色还可能通过地图探索、人物交流和剧情成果获得特殊技或新的必杀技。新增能力仍需遵循职业定位、招式创建限制并由 DM 做最终平衡。' }
  ] },
  { id: 'attributes', category: '角色创建', title: '六维属性', pages: [8], summary: '力量、速度、耐力、控制、精密和魅力共同决定角色的战斗与非战斗表现。', details: [
    { title: '力量', text: '直接修正大多数物理伤害，也用于跳跃高度、破坏场景、搬运或推动重物等身体力量相关判定。' },
    { title: '速度', text: '影响先攻顺序、倒地起身时可选择的位置范围、躲避飞行道具以及复杂的穿插移动。' },
    { title: '耐力', text: '影响生命值、负重和各类身体素质判定，是承受伤害与长时间行动的重要属性。' },
    { title: '精密', text: '影响飞行道具命中、完美防御时机和陷阱成功率，适用于需要准确控制落点与时机的能力。' },
    { title: '控制', text: '直接修正法术或能量类伤害，也代表角色的头脑与心智控制，例如是否容易受到挑衅或精神干扰。' },
    { title: '魅力', text: '用于人际互动，包括挑衅、说服、表演、威慑以及建立社会关系等非战斗场景。' },
    { title: '角色创建原则', text: '玩家可以自行拟定普通技、必杀技与超级必杀演出，并选择职业和子职业。角色默认种族为人类。完成设计后由 DM 根据队伍强度与规则限制进行二次平衡，双方确认后投入战役。' }
  ] },
  { id: 'feats', category: '专长', title: '专长列表', pages: [9,10,11,12], summary: '包含核心与高级专长；复杂触发效果默认由 DM 确认。' },
  { id: 'classes', category: '职业与子职业', title: '职业总览', pages: [13,14], summary: '七个职业及各自子职业的定位与风格。' },
  { id: 'class-details', category: '职业与子职业', title: '职业详细规则', pages: [15,25], summary: '职业基础能力、子职业能力、元素、领域与道具机制。' },
  { id: 'move-builder', category: '角色创建', title: '自定义招式限制', pages: [27], summary: '自定义普通技与飞行道具必须遵守基础距离、速度和命中时机限制。', details: [
    { title: '普通技距离', text: '轻攻击初始距离不得超过 1 尺，中攻击不得超过 2 尺，重攻击不得超过 3 尺。玩家可以自由描述动作表现，但选定的基础动作将伴随角色整个游戏；后续变化应通过特殊技、职业能力或剧情成长获得。' },
    { title: '飞行道具距离', text: '飞行道具类必杀技的最大距离等于角色移动距离的 2 倍。例如基础移动力为 30 尺时，飞行道具最大射程为 60 尺。' },
    { title: '速度与延迟命中', text: '玩家可以自定义飞行道具速度，例如立刻结算、下个回合开始时抵达，或在特定秒数后命中。命中检定在飞行道具实际抵达目标时进行，延迟期间的位置变化与阻挡由 DM 按场景裁定。' },
    { title: 'OD 版本', text: 'OD 飞行道具的速度可以不同于普通版本，也可以通过强化改变抵达时间或效果；仍应遵循资源消耗和整体平衡要求。' },
    { title: '提交与平衡', text: '自定义招式应明确名称、动作类型、判定类型、距离、伤害、资源消耗、可否取消、命中与未命中效果、附加状态及持续时间。完成后交由 DM 二次平衡。' }
  ] }
];

export const SF6_RULESET = {
  id: 'sf6-v0.9', name: 'SF6 风格回合制 TRPG', version: '0.9', status: 'draft',
  sourceDocument: '（sf6）dnd跑团 v 0.9.pdf', attributes: SF6_ATTRIBUTE_LABELS,
  sourceDocumentUrl: '/templates/sf6-rulebook-v0.9.pdf',
  characterSheetTemplate: '/templates/角色卡.xlsx',
  resources: SF6_RESOURCES, conditions: SF6_CONDITIONS, classes: SF6_CLASSES,
  feats: SF6_FEATS, sections: SF6_RULE_SECTIONS,
  rulings: [
    { id: 'super-meter', severity: 'normalized', text: '超级必杀槽统一为 1 格，每次长休恢复。' },
    { id: 'round-wording', severity: 'normalized', text: '原文“回合/轮次”混用时：角色行动用回合，全部单位行动完毕用轮次。' },
    { id: 'honor-executioner', severity: 'normalized', text: '统一使用“荣誉行刑官”，“荣耀行刑官”仅作为导入别名。' },
    { id: 'terrain-ruling', severity: 'needs-dm', text: '体型、击退与复杂地形互动保留 DM 裁定，不做自动伤害推断。' }
  ]
};
