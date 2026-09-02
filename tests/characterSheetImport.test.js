import test from 'node:test';
import assert from 'node:assert/strict';
import { extractCharacterSheet, extractPlayerCharacterExport, mergeImportedCharacter } from '../src/utils/characterSheetImport.js';

function workbook(cells, name = '角色卡') {
  return { SheetNames: [name], Sheets: { [name]: cells } };
}

function workbookFrom(sheets) {
  return { SheetNames: Object.keys(sheets), Sheets: sheets };
}

test('extracts Chinese character fields and six core stats', () => {
  const result = extractCharacterSheet(workbook({
    A1: { v: '角色名' }, B1: { v: '夜鸦' },
    A2: { v: '职业' }, B2: { v: '游侠' },
    A3: { v: '生命值' }, B3: { v: '27 / 35' },
    A4: { v: '护甲等级' }, B4: { v: 16 },
    A5: { v: '移动力' }, B5: { v: 30 },
    A6: { v: '先攻' }, B6: { v: 3 },
    A7: { v: '等级' }, B7: { v: 5 },
    D1: { v: '力量' }, E1: { v: 12 },
    D2: { v: '敏捷' }, E2: { v: 18 },
    D3: { v: '体质' }, E3: { v: 14 },
    D4: { v: '感知' }, E4: { v: 15 },
    D5: { v: '智力' }, E5: { v: 10 },
    D6: { v: '神秘' }, E6: { v: 8 }
  }), 'night-raven.xlsx');

  assert.equal(result.character.name, '夜鸦');
  assert.equal(result.character.class, '游侠');
  assert.equal(result.character.hp, 27);
  assert.equal(result.character.maxHp, 35);
  assert.equal(result.character.ac, 16);
  assert.equal(result.character.stats['敏捷 (Agility)'], 18);
  assert.ok(result.found.includes('生命值'));
});

test('supports English labels, inline values, and filename fallback', () => {
  const result = extractCharacterSheet(workbook({
    A1: { v: 'Class: Wizard' },
    A2: { v: 'HP: 12/18' },
    A3: { v: 'Armor Class' }, B3: { v: 13 },
    A4: { v: 'STR' }, B4: { v: 8 },
    A5: { v: 'DEX' }, B5: { v: 14 }
  }, 'Sheet1'), 'Mira.xlsx');

  assert.equal(result.character.name, 'Mira');
  assert.equal(result.character.class, 'Wizard');
  assert.equal(result.character.hp, 12);
  assert.equal(result.character.maxHp, 18);
  assert.equal(result.character.ac, 13);
  assert.match(result.warnings[0], /文件名/);
});

test('re-import updates sheet-owned fields while preserving tactical state', () => {
  const existing = {
    id: 'char-1', name: '旧名称', hp: 5, maxHp: 10, gridX: 9, gridY: 4,
    mapId: 'map-a', resources: [{ name: '法术位', value: 2, max: 3 }], conditions: [{ name: '祝福' }]
  };
  const merged = mergeImportedCharacter(existing, {
    name: '新名称', type: 'PC', class: '牧师', hp: 20, maxHp: 20, ac: 17,
    initiative: 1, speed: 25, level: 4, hitDice: 'd8', stats: { '感知 (Perception)': 18 }
  }, { cardId: 'excel-1', mapId: 'map-b', now: 123 });

  assert.equal(merged.id, 'char-1');
  assert.equal(merged.name, '新名称');
  assert.equal(merged.gridX, 9);
  assert.equal(merged.mapId, 'map-a');
  assert.deepEqual(merged.resources, existing.resources);
  assert.deepEqual(merged.conditions, existing.conditions);
  assert.equal(merged.sourceExcelCardId, 'excel-1');
});

test('recognizes the bundled SF6 template layout and recalculates formula-owned fields', () => {
  const workbook = workbookFrom({
    角色卡: {
      C3: { v: '春丽' }, E3: { v: '军士' }, E4: { v: '灵动型' }, E6: { v: 6 },
      C4: { v: '玩家A' }, C5: { v: '巡回格斗家' }, H3: { v: '拳套' }, H6: { v: '蓝色服装' },
      D10: { v: 1 }, D11: { v: 0 }, D12: { v: 0 }, D13: { v: 0 }, D14: { v: 0 }, D15: { v: 0 },
      C26: { v: '■' }, D26: { v: '□' }, B29: { v: '百裂脚' }, D29: { v: '+5' }, F29: { v: '1d6/物理' },
      D41: { v: true }, C68: { v: '波动之拳' },
      C10: { v: '#NAME?' }, C18: { v: '#NAME?' }
    },
    职业模板: {
      A2: { v: '军士' }, B2: { v: 13 }, C2: { v: 14 }, D2: { v: 10 }, E2: { v: 15 }, F2: { v: 12 }, G2: { v: 8 }, N2: { v: 'd10' }, O2: { v: 13 },
      W2: { v: '灵动型' }, X2: { v: 40 }
    },
    专长参考: {}, 职业特性: {}
  });
  const result = extractCharacterSheet(workbook, '角色卡.xlsx');
  assert.equal(result.character.class, '军士');
  assert.equal(result.character.subclass, '灵动型');
  assert.equal(result.character.stats.力量, 14);
  assert.equal(result.character.speed, 40);
  assert.equal(result.character.hitDice, 'd10');
  assert.equal(result.character.sheet.playerName, '玩家A');
  assert.equal(result.character.sheet.inventory, '拳套');
  assert.equal(result.character.sheet.drive[0], true);
  assert.equal(result.character.sheet.drive[1], false);
  assert.equal(result.character.sheet.attacks[0].name, '百裂脚');
  assert.equal(result.character.sheet.attacks[0].diceCount, 1);
  assert.equal(result.character.sheet.attacks[0].die, 'd6');
  assert.equal(result.character.sheet.attacks[0].damageType, '物理');
  assert.equal(result.character.sheet.skillProficiencies.athletics, true);
  assert.equal(result.character.sheet.selectedFeatNames[0], '波动之拳');
  assert.match(result.warnings.join(' '), /#NAME/);
});

test('imports a standalone DMForge player card and rejects unrelated JSON', () => {
  const result = extractPlayerCharacterExport({
    format: 'dmforge-player-character-v1',
    character: {
      name: '嘉米', class: '军士', subclass: '灵动型', level: 5, race: '人类', alignment: '中立', hp: 21, maxHp: 30, ac: 18,
      sheet: {
        playerName: '玩家B', avatarImage: 'data:image/png;base64,YQ==', portraitImage: 'javascript:alert(1)', statBonuses: { 力量: 2, 速度: 3 }, drive: [true, true, false, false, false, false],
        attacks: [{ name: '螺旋箭', diceCount: 2, die: 'd6', fixedDamage: 1, damageType: '物理', description: '推进攻击' }],
        skillProficiencies: { acrobatics: true, athletics: true, stealth: true, survival: true, perception: true, insight: true }, selectedFeats: ['feat-a', '', '']
      }
    }
  }, 'cammy.json');
  assert.equal(result.character.name, '嘉米');
  assert.equal(result.character.level, 5);
  assert.equal(result.character.race, '人类');
  assert.equal(result.character.sheet.acOverride, 18);
  assert.equal(Object.values(result.character.sheet.skillProficiencies).filter(Boolean).length, 5);
  assert.equal(result.character.sheet.attacks[0].description, '推进攻击');
  assert.equal(result.character.sheet.drive.filter(Boolean).length, 2);
  assert.equal(result.character.sheet.avatarImage, 'data:image/png;base64,YQ==');
  assert.equal(result.character.sheet.portraitImage, '');
  assert.throws(() => extractPlayerCharacterExport({ format: 'some-other-json', character: {} }), /不是 DMForge/);
});
