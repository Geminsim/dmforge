import { createSf6SheetData } from './sf6CharacterSheet.js';

const CORE_STATS = [
  ['力量 (Physical)', ['力量', 'strength', 'str', 'physical']],
  ['敏捷 (Agility)', ['速度', '敏捷', 'dexterity', 'dex', 'agility']],
  ['体质 (Fortitude)', ['耐力', '体质', 'constitution', 'con', 'fortitude']],
  ['智力 (Intellect)', ['控制', '智力', 'intelligence', 'int', 'intellect']],
  ['感知 (Perception)', ['精密', '感知', 'wisdom', 'wis', 'perception']],
  ['神秘 (Arcane)', ['魅力', '神秘', 'charisma', 'cha', 'arcane']]
];

const FIELD_ALIASES = {
  name: ['角色名', '角色名称', '人物名', '姓名', 'charactername', 'character'],
  className: ['职业', '职业名称', 'class', 'classname'],
  level: ['等级', '角色等级', 'level', 'lvl'],
  hp: ['当前生命值', '当前生命', '生命值', '生命', 'hitpoints', 'hp'],
  maxHp: ['最大生命值', '生命值上限', '最大生命', 'maxhitpoints', 'maxhp', 'hpmax'],
  ac: ['护甲等级', '护甲级别', '护甲', 'armorclass', 'ac'],
  speed: ['移动速度', '移动力', '速度', 'movementspeed', 'speed', 'movement'],
  initiative: ['先攻加值', '先攻值', '先攻', 'initiativebonus', 'initiative'],
  hitDice: ['生命骰', 'hitdice']
};

function normalizeLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s:：_—()（）[\]【】.-]/g, '');
}

function decodeAddress(address) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (!match) return null;
  let column = 0;
  for (const character of match[1].toUpperCase()) column = column * 26 + character.charCodeAt(0) - 64;
  return { c: column - 1, r: Number(match[2]) - 1 };
}

function visibleValue(cell) {
  if (!cell) return '';
  return cell.v ?? cell.w ?? '';
}

function collectSheets(workbook) {
  return (workbook?.SheetNames || []).map(name => {
    const cells = new Map();
    for (const [address, cell] of Object.entries(workbook.Sheets?.[name] || {})) {
      if (address.startsWith('!')) continue;
      const point = decodeAddress(address);
      if (point) cells.set(`${point.r}:${point.c}`, { ...point, value: visibleValue(cell) });
    }
    return { name, cells, values: [...cells.values()] };
  });
}

const at = (sheet, address) => {
  const point = decodeAddress(address);
  return point ? sheet?.cells.get(`${point.r}:${point.c}`)?.value : undefined;
};

function extractSf6Template(sheets, filename) {
  const card = sheets.find(sheet => sheet.name === '角色卡');
  const classes = sheets.find(sheet => sheet.name === '职业模板');
  if (!card || !classes) return null;
  const className = textFrom(at(card, 'E3'));
  const subclass = textFrom(at(card, 'E4'));
  const classRow = classes.values.find(cell => cell.c === 0 && normalizeLabel(cell.value) === normalizeLabel(className));
  const row = classRow?.r;
  const statNames = ['力量', '速度', '耐力', '控制', '精密', '魅力'];
  const stats = {};
  statNames.forEach((name, index) => {
    const base = row === undefined ? undefined : numberFrom(classes.cells.get(`${row}:${index + 1}`)?.value, { min: 0, max: 100 });
    const increase = numberFrom(at(card, `D${index + 10}`), { min: -100, max: 100 }) ?? 0;
    stats[name] = (base ?? numberFrom(at(card, `E${index + 10}`), { min: 0, max: 100 }) ?? 10) + increase;
  });
  const speedMod = Math.floor(((stats.速度 ?? 10) - 10) / 2);
  const baseAc = row === undefined ? 10 : numberFrom(classes.cells.get(`${row}:14`)?.value, { min: 0, max: 100 }) ?? 10;
  const baseSpeed = row === undefined ? 30 : numberFrom(classes.values.find(cell => cell.c === 22 && normalizeLabel(cell.value) === normalizeLabel(subclass || className)) ? classes.cells.get(`${classes.values.find(cell => cell.c === 22 && normalizeLabel(cell.value) === normalizeLabel(subclass || className)).r}:23`)?.value : 30, { min: 0, max: 1000 }) ?? 30;
  const hitDice = row === undefined ? 'd8' : textFrom(classes.cells.get(`${row}:13`)?.value) || 'd8';
  const maxHp = numberFrom(at(card, 'C19'), { min: 1, max: 1_000_000 }) ?? 1;
  const skillIds = ['acrobatics','animal-handling','arcana','athletics','deception','history','insight','intimidation','investigation','medicine','nature','perception','performance','persuasion','religion','sleight-of-hand','stealth','survival'];
  const sheet = createSf6SheetData({
    playerName: String(at(card, 'C4') || '').trim(), background: String(at(card, 'C5') || '').trim(),
    personality: String(at(card, 'C6') || '').trim(), gender: String(at(card, 'E5') || '').trim(),
    inventory: String(at(card, 'H3') || '').trim(), biography: String(at(card, 'H6') || '').trim(),
    statBonuses: Object.fromEntries(statNames.map((name, index) => [name, numberFrom(at(card, `D${index + 10}`), { min: -100, max: 100 }) ?? 0])),
    drive: ['C26','D26','E26','F26','H26','I26'].map(address => !['', '□', '0', 'false'].includes(String(at(card, address) ?? '').trim().toLowerCase())),
    attacks: Array.from({ length: 6 }, (_, index) => ({ name: String(at(card, `B${29 + index}`) || '').trim(), attackBonus: String(at(card, `D${29 + index}`) || '').trim(), damageType: String(at(card, `F${29 + index}`) || '').trim() })),
    attackNotes: String(at(card, 'H29') || '').trim(),
    skillProficiencies: Object.fromEntries(skillIds.map((id, index) => [id, at(card, `D${38 + index}`) === true || Number(at(card, `D${38 + index}`)) === 1])),
    selectedFeatNames: ['C68','C69','C70'].map(address => String(at(card, address) || '').trim())
  });
  return {
    character: { name: textFrom(at(card, 'C3')) || fallbackName(filename), type: 'PC', class: className || '未识别职业', subclass: subclass || '', level: numberFrom(at(card, 'E6'), { min: 1, max: 10 }) ?? 1, hp: numberFrom(at(card, 'E19'), { min: 0, max: 1_000_000 }) ?? maxHp, maxHp, tempHp: numberFrom(at(card, 'H19'), { min: 0, max: 1_000_000 }) ?? 0, ac: baseAc + speedMod, speed: baseSpeed, initiative: speedMod, hitDice, stats, sheet },
    found: className ? ['职业', ...(subclass ? ['子职业'] : []), '六维属性', '护甲', '速度', '先攻', '等级'] : ['角色卡模板'],
    warnings: [!className ? '尚未选择职业，已使用安全默认值' : '', !textFrom(at(card, 'C3')) ? '未填写姓名，已使用文件名' : '', '已忽略工作簿缓存的 #NAME?，所有派生数值由应用重新计算'].filter(Boolean),
    sheetCount: sheets.length
  };
}

function aliasMatches(label, alias) {
  const normalizedAlias = normalizeLabel(alias);
  return label === normalizedAlias || (normalizedAlias.length >= 4 && label.startsWith(normalizedAlias));
}

function candidateAfterLabel(sheet, cell) {
  const inline = String(cell.value ?? '').match(/[:：]\s*(.+)$/);
  if (inline?.[1]?.trim()) return inline[1].trim();
  for (const [rowOffset, columnOffset] of [[0, 1], [0, 2], [0, 3], [1, 0], [2, 0]]) {
    const candidate = sheet.cells.get(`${cell.r + rowOffset}:${cell.c + columnOffset}`)?.value;
    if (candidate !== undefined && candidate !== null && String(candidate).trim() !== '') return candidate;
  }
  return undefined;
}

function findValue(sheets, aliases) {
  for (const sheet of sheets) {
    for (const cell of sheet.values) {
      const raw = String(cell.value ?? '').trim();
      const labelPart = raw.split(/[:：]/, 1)[0];
      const label = normalizeLabel(labelPart);
      if (aliases.some(alias => aliasMatches(label, alias))) {
        const value = candidateAfterLabel(sheet, cell);
        if (value !== undefined) return value;
      }
    }
  }
  return undefined;
}

function numberFrom(value, { min = -1_000_000, max = 1_000_000 } = {}) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(max, Math.max(min, value));
  const match = String(value ?? '').replace(/,/g, '').match(/[+-]?\d+(?:\.\d+)?/);
  if (!match) return undefined;
  const number = Number(match[0]);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : undefined;
}

function textFrom(value) {
  const text = String(value ?? '').trim();
  return text && !/^[-+]?\d+(?:\.\d+)?$/.test(text) ? text.slice(0, 200) : undefined;
}

function hpPair(value) {
  const matches = String(value ?? '').replace(/,/g, '').match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return {};
  if (matches.length === 1) return { hp: Number(matches[0]) };
  return { hp: Number(matches[0]), maxHp: Number(matches[1]) };
}

function fallbackName(filename) {
  return String(filename || '未命名角色卡').replace(/\.(xlsx|xls|xlsm|xlsb)$/i, '').trim() || '未命名角色卡';
}

export function extractCharacterSheet(workbook, filename = '') {
  const sheets = collectSheets(workbook);
  const sf6 = extractSf6Template(sheets, filename);
  if (sf6) return sf6;
  const found = [];
  const warnings = [];
  const result = {
    name: textFrom(findValue(sheets, FIELD_ALIASES.name)) || fallbackName(filename),
    type: 'PC',
    class: textFrom(findValue(sheets, FIELD_ALIASES.className)) || '未识别职业',
    level: numberFrom(findValue(sheets, FIELD_ALIASES.level), { min: 1, max: 100 }) ?? 1,
    hp: 1,
    maxHp: 1,
    ac: numberFrom(findValue(sheets, FIELD_ALIASES.ac), { min: 0, max: 100 }) ?? 10,
    speed: numberFrom(findValue(sheets, FIELD_ALIASES.speed), { min: 0, max: 1_000 }) ?? 30,
    initiative: numberFrom(findValue(sheets, FIELD_ALIASES.initiative), { min: -100, max: 100 }) ?? 0,
    hitDice: textFrom(findValue(sheets, FIELD_ALIASES.hitDice)) || 'd8',
    stats: {}
  };

  const explicitName = textFrom(findValue(sheets, FIELD_ALIASES.name));
  if (explicitName) found.push('姓名');
  else warnings.push('未识别姓名，已使用文件名');
  if (result.class !== '未识别职业') found.push('职业');

  const hpValue = findValue(sheets, FIELD_ALIASES.hp);
  const maxHpValue = findValue(sheets, FIELD_ALIASES.maxHp);
  const parsedHp = hpPair(hpValue);
  const explicitMaxHp = numberFrom(maxHpValue, { min: 1, max: 1_000_000 });
  result.hp = numberFrom(parsedHp.hp, { min: 0, max: 1_000_000 }) ?? explicitMaxHp ?? 1;
  result.maxHp = explicitMaxHp ?? numberFrom(parsedHp.maxHp, { min: 1, max: 1_000_000 }) ?? Math.max(1, result.hp);
  result.hp = Math.min(result.hp, result.maxHp);
  if (hpValue !== undefined || maxHpValue !== undefined) found.push('生命值');
  else warnings.push('未识别生命值，已使用默认值 1');

  for (const [target, aliases] of CORE_STATS) {
    const value = numberFrom(findValue(sheets, aliases), { min: 0, max: 100 });
    result.stats[target] = value ?? 10;
    if (value !== undefined) found.push(target.split(' ')[0]);
  }
  if (result.ac !== 10 || findValue(sheets, FIELD_ALIASES.ac) !== undefined) found.push('护甲');
  if (result.speed !== 30 || findValue(sheets, FIELD_ALIASES.speed) !== undefined) found.push('速度');
  if (result.initiative !== 0 || findValue(sheets, FIELD_ALIASES.initiative) !== undefined) found.push('先攻');
  if (result.level !== 1 || findValue(sheets, FIELD_ALIASES.level) !== undefined) found.push('等级');

  return { character: result, found: [...new Set(found)], warnings, sheetCount: sheets.length };
}

export function mergeImportedCharacter(existing, imported, { cardId, mapId, now = Date.now() } = {}) {
  const base = existing || {};
  const maxHp = Math.max(1, imported.maxHp ?? base.maxHp ?? 1);
  return {
    ...base,
    id: base.id || `char_${now}`,
    name: imported.name || base.name || '未命名角色',
    type: imported.type || base.type || 'PC',
    class: imported.class || base.class || '未识别职业',
    subclass: imported.subclass || base.subclass || '',
    hp: Math.min(maxHp, Math.max(0, imported.hp ?? base.hp ?? maxHp)),
    maxHp,
    ac: imported.ac ?? base.ac ?? 10,
    initiative: imported.initiative ?? base.initiative ?? 0,
    speed: imported.speed ?? base.speed ?? 30,
    gridX: base.gridX ?? 2,
    gridY: base.gridY ?? 2,
    mapId: base.mapId || mapId,
    stats: { ...(base.stats || {}), ...(imported.stats || {}) },
    feats: imported.feats || base.feats || { '角色卡导入': '由 Excel 角色卡自动建立，可在角色编辑器中继续调整。' },
    resources: imported.resources || base.resources || [
      { name: '动作', max: 1, value: 1, resetType: 'turn' },
      { name: '附赠动作', max: 1, value: 1, resetType: 'turn' },
      { name: '反应', max: 1, value: 1, resetType: 'turn' },
      { name: '斗气', max: 6, value: 6, resetType: 'short_rest' },
      { name: '超级必杀槽', max: 1, value: 1, resetType: 'long_rest' }
    ],
    conditions: base.conditions || [],
    groupId: base.groupId || 'group_pcs',
    combatSpeedRemaining: imported.speed ?? base.combatSpeedRemaining ?? base.speed ?? 30,
    combatStartGridX: base.combatStartGridX ?? base.gridX ?? 2,
    combatStartGridY: base.combatStartGridY ?? base.gridY ?? 2,
    level: imported.level ?? base.level ?? 1,
    hitDice: imported.hitDice || base.hitDice || 'd8',
    levelHpIncreases: base.levelHpIncreases || [],
    tempHp: imported.tempHp ?? base.tempHp ?? 0,
    sheet: imported.sheet || base.sheet,
    savingThrows: imported.savingThrows || base.savingThrows,
    skillTotals: imported.skillTotals || base.skillTotals,
    passivePerception: imported.passivePerception ?? base.passivePerception,
    proficiencyBonus: imported.proficiencyBonus ?? base.proficiencyBonus,
    sourceExcelCardId: cardId,
    sourceExcelImportedAt: now
  };
}
