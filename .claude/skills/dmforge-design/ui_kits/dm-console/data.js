window.DMF_DATA = {
  presentation: {
    scene: 'battle', showInitiative: true, showCharacterPanel: true, showPublicEvents: true,
    showBlockedCells: true, hiddenCharacterIds: [], cameraMode: 'follow-active', fontScale: 1,
    hideCursor: false, caption: '第三通道 · 飞矢陷阱已触发',
    storyTitle: '冒险仍在继续', storySubtitle: '北山矿井 · 第三日黄昏',
    pausedMessage: '游戏暂停 · 请稍候', sessionId: 'a7f3c1'
  },
  vitals: {
    char_player_a: { ac: 18, speed: 30 },
    char_player_b: { ac: 14, speed: 40 },
    char_player_c: { ac: 13, speed: 25 },
    char_goblin_squad: { ac: 12, speed: 30 },
    char_village_elder: { ac: 10, speed: 20 }
  },
  publicEvents: [
    { type: 'COMBAT', content: '奥利奥（战士）对哥布林斥候 x3 发动横扫攻击，命中 2 个目标。', timestamp: '21:03:20' },
    { type: 'DICE', content: '莉拉（游荡者）先攻 21，本轮首先行动。', timestamp: '21:02:58' },
    { type: 'COMBAT', content: '巴克（牧师）进入濒死状态，需要一次医疗检定。', timestamp: '21:08:39' }
  ],
  turnOrder: [
    { id: 'char_player_b', roll: 20, modifier: 1, total: 21 },
    { id: 'char_player_a', roll: 17, modifier: 1, total: 18 },
    { id: 'char_goblin_squad', roll: 12, modifier: 2, total: 14 },
    { id: 'char_village_elder', roll: 5, modifier: 0, total: 5 }
  ],
  campaign: { name: '村口酒馆大厅 (地上)', chapter: '第 3 章 · 北山矿井', maps: 2, cell: 40, width: 60, height: 40 },
  groups: [
    { id: 'group_pcs', name: '玩家成员' },
    { id: 'group_npcs', name: '怪物与NPC' }
  ],
  characters: [
    { id: 'char_player_a', name: '奥利奥 (战士)', kind: 'PC', group: 'group_pcs', level: 1, klass: '战士', hitDice: 'd8',
      hp: 45, maxHp: 55, tempHp: 4, gridX: 5, gridY: 5, speedRemaining: 30, initiative: 18,
      conditions: ['重甲防护'],
      stats: { '力量 (Physical)': 16, '敏捷 (Agility)': 12, '体质 (Fortitude)': 14, '感知 (Perception)': 10, '智力 (Intellect)': 8, '神秘 (Arcane)': 6 },
      feats: { '重甲防护': '受到物理伤害减少3点', '横扫攻击': '一次攻击同时打击两个紧挨着的目标' },
      resources: [ { name: '动作', value: 1, max: 1, resetType: 'turn' }, { name: '附赠动作', value: 1, max: 1, resetType: 'turn' }, { name: '生命骰 (d8)', value: 1, max: 1, resetType: 'long' } ] },
    { id: 'char_player_b', name: '莉拉 (游荡者)', kind: 'PC', group: 'group_pcs', level: 1, klass: '游荡者',
      hp: 28, maxHp: 34, tempHp: 0, gridX: 6, gridY: 7, speedRemaining: 40, initiative: 21, conditions: [],
      stats: { '力量 (Physical)': 9, '敏捷 (Agility)': 17, '体质 (Fortitude)': 11, '感知 (Perception)': 14, '智力 (Intellect)': 12, '神秘 (Arcane)': 8 },
      feats: { '暗影潜行': '在阴影中移动不触发被动感知检定' },
      resources: [ { name: '动作', value: 1, max: 1, resetType: 'turn' }, { name: '偷袭', value: 0, max: 1, resetType: 'turn' } ] },
    { id: 'char_player_c', name: '巴克 (牧师)', kind: 'PC', group: 'group_pcs', level: 1, klass: '牧师',
      hp: 9, maxHp: 30, tempHp: 0, gridX: 4, gridY: 6, speedRemaining: 25, initiative: 7, conditions: ['流血', '恐慌'],
      stats: { '力量 (Physical)': 11, '敏捷 (Agility)': 10, '体质 (Fortitude)': 13, '感知 (Perception)': 15, '智力 (Intellect)': 12, '神秘 (Arcane)': 16 },
      feats: { '战地祝祷': '一次长休内可为全队追加 1d4 命中加值' },
      resources: [ { name: '法术位 (1环)', value: 2, max: 4, resetType: 'long' }, { name: '引导神力', value: 1, max: 1, resetType: 'short' } ] },
    { id: 'char_goblin_squad', name: '哥布林斥候 x3', kind: 'MONSTER', group: 'group_npcs', level: 1,
      hp: 15, maxHp: 15, tempHp: 0, gridX: 12, gridY: 10, speedRemaining: 30, initiative: 14, conditions: ['潜伏优势'],
      stats: { '力量 (Physical)': 8, '敏捷 (Agility)': 14, '体质 (Fortitude)': 10, '感知 (Perception)': 12, '智力 (Intellect)': 6, '神秘 (Arcane)': 2 },
      feats: { '潜伏优势': '在草丛/阴影处具有伏击优势加成。' },
      resources: [ { name: '动作', value: 1, max: 1, resetType: 'turn' } ] },
    { id: 'char_village_elder', name: '独眼老汉 (村民)', kind: 'NPC', group: 'group_npcs', level: 1,
      hp: 6, maxHp: 6, tempHp: 0, gridX: 9, gridY: 4, speedRemaining: 20, initiative: 5, conditions: [],
      stats: { '力量 (Physical)': 7, '敏捷 (Agility)': 8, '体质 (Fortitude)': 9, '感知 (Perception)': 13, '智力 (Intellect)': 11, '神秘 (Arcane)': 4 },
      feats: { '旧矿图': '持有一张北山废弃矿井的手绘地图。' }, resources: [] }
  ],
  terrain: [
    { id: 't1', name: '烈焰熔岩深渊', shape: 'rect', tone: 'madder', gridX: 15, gridY: 8, w: 8, h: 4, blocked: true, secret: false },
    { id: 't2', name: '剧毒腐蚀气溶胶', shape: 'circle', tone: 'verdigris', gridX: 28, gridY: 12, r: 5, blocked: false, secret: false },
    { id: 't3', name: '隐藏针刺陷阱', shape: 'rect', tone: 'ochre', gridX: 5, gridY: 14, w: 2, h: 2, blocked: false, secret: true }
  ],
  blockedCells: ['8_7', '8_8', '8_9', '9_7', '9_9'],
  items: [
    { id: 'i1', name: '远古圣水', category: '消耗品', quantity: 3, owner: '世界物品池', description: '饮用后回复20点生命，并对不死生物产生5d6的真实灼烧伤害。' },
    { id: 'i2', name: '魔岩大剑', category: '武器', quantity: 1, owner: '世界物品池', description: '需要力量15以上。攻击伤害为 2d8+3 物理碎甲伤害。' },
    { id: 'i3', name: '初级治疗药水', category: '消耗品', quantity: 2, owner: '奥利奥 (战士)', description: '饮用回复1d8+2点生命值。' },
    { id: 'i4', name: '矿工皮甲', category: '护甲', quantity: 1, owner: '莉拉 (游荡者)', description: '护甲等级 12 + 敏捷调整值，潜行不受惩罚。' },
    { id: 'i5', name: '旧矿图残页', category: '杂物', quantity: 1, owner: '世界物品池', description: '标注了三条通往矿井下层的路径，其中一条已塌方。' }
  ],
  templates: ['远古圣水', '魔岩大剑', '初级治疗药水'],
  logs: [
    { type: 'SYSTEM', content: '**DMForge 战役辅助系统** 已成功初始化。', timestamp: '20:56:01' },
    { type: 'DICE', content: '掷骰 [2d20kh1+5] 结果: **24** (2d20kh1: [7, 18 → Keep High: 18] = 18)', timestamp: '21:03:12' },
    { type: 'COMBAT', content: '奥利奥 (战士) 对 哥布林斥候 x3 发动横扫攻击，命中 **2** 个目标。', timestamp: '21:03:20' },
    { type: 'COMBAT', content: '哥布林斥候 x3 受到 **8** 点物理伤害，剩余 **7/15**。', timestamp: '21:03:21' },
    { type: 'ITEMS', content: '奥利奥 (战士) 获得 **初级治疗药水 ×2**。', timestamp: '21:05:44' },
    { type: 'DICE', content: '掷骰 [2d6+4] 结果: **13** (2d6: [3 + 6] = 9)', timestamp: '21:07:02' },
    { type: 'COMBAT', content: '巴克 (牧师) 进入 **濒死** 状态，需要一次医疗检定。', timestamp: '21:08:39' }
  ],
  rolls: [
    { formula: '2d20kh1+5', total: 24, detail: '[7, 18 → Keep High: 18] (Mod: 18+5)', time: '21:03:12' },
    { formula: '2d6+4', total: 13, detail: '2d6: [3 + 6] = 9', time: '21:07:02' },
    { formula: '1d8+2', total: 7, detail: '1d8: [5]', time: '21:09:50' }
  ],
  notes: [
    { id: 'n1', title: '酒馆传闻与秘密', tone: 'ochre', x: 40, y: 40, open: true, minimized: false,
      content: '听酒馆老板娘提起，北山废弃矿井深处，每到月圆之夜就会传出低沉的龙吼声。另外，村口的独眼老汉似乎藏有一张旧矿图...' },
    { id: 'n2', title: '地牢隐藏陷阱提示', tone: 'madder', x: 40, y: 268, open: true, minimized: false,
      content: '注意：第三通道的转角处，第4块和第7块地砖下装有重力压敏机关，踏入会触发两侧墙壁的飞矢陷阱，伤害为 2d6 穿刺。' },
    { id: 'n3', title: '哥布林首领台词', tone: 'verdigris', x: 40, y: 500, open: true, minimized: true,
      content: '“你们的火把在我的矿洞里烧不了多久。”' }
  ],
  sheet: {
    title: '玩家卡 · 奥利奥 (战士).xlsx',
    columns: ['属性', '数值', '调整值', '备注'],
    rows: [
      ['力量 (Physical)', 16, '+3', '重甲防护 / 横扫攻击'],
      ['敏捷 (Agility)', 12, '+1', ''],
      ['体质 (Fortitude)', 14, '+2', '长休恢复全部生命'],
      ['感知 (Perception)', 10, '0', ''],
      ['智力 (Intellect)', 8, '-1', ''],
      ['神秘 (Arcane)', 6, '-2', '不可施法'],
      ['护甲等级', 18, '', '链甲 + 盾牌'],
      ['先攻', 18, '+1', '本轮已行动'],
      ['移动力', 30, '', '剩余 30ft'],
      ['生命骰', 'd8', '', '1 / 1']
    ]
  }
};
