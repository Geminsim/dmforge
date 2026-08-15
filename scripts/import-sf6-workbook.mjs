import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const input = process.argv[2] || 'C:/gamesavings/跑团材料/角色卡.xlsx';
const output = path.resolve('src/data/sf6WorkbookData.js');
const workbook = XLSX.readFile(input, { cellFormula: true, cellStyles: false });
const rows = name => XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '', raw: false });

const featRows = rows('专长参考');
const feats = featRows.slice(1).filter(row => /^\d+级/.test(String(row[0] || '').trim()) && String(row[1] || '').trim()).map((row, index) => ({
  id: `feat-${index + 1}`,
  minimumLevel: Number.parseInt(String(row[0]).match(/\d+/)?.[0] || '3', 10),
  name: String(row[1]).trim(),
  description: String(row[2] || '').trim(),
  sourceSheet: '专长参考', sourceRow: index + 2
}));

const featureRows = rows('职业特性');
const classes = {};
let currentClass = '';
let currentSubclass = '';
for (let index = 1; index < featureRows.length; index += 1) {
  const row = featureRows[index];
  if (String(row[0] || '').trim()) {
    currentClass = String(row[0]).trim();
    currentSubclass = '';
    classes[currentClass] ||= { baseFeatures: [], subclasses: {} };
  }
  const baseName = String(row[1] || '').trim();
  const baseDescription = String(row[2] || '').trim();
  if (currentClass && baseName) classes[currentClass].baseFeatures.push({ name: baseName, description: baseDescription, sourceSheet: '职业特性', sourceRow: index + 1 });
  if (String(row[3] || '').trim()) {
    currentSubclass = String(row[3]).trim();
    classes[currentClass] ||= { baseFeatures: [], subclasses: {} };
    classes[currentClass].subclasses[currentSubclass] ||= [];
  }
  const subclassName = String(row[4] || '').trim();
  const subclassDescription = String(row[5] || '').trim();
  if (currentClass && currentSubclass && subclassName) classes[currentClass].subclasses[currentSubclass].push({ name: subclassName, description: subclassDescription, sourceSheet: '职业特性', sourceRow: index + 1 });
}

const templateRows = rows('职业模板');
const templates = templateRows.slice(1, 8).filter(row => row[0]).map((row, index) => ({
  name: String(row[0]).trim(), stats: row.slice(1, 7).map(value => Number(value)),
  savingThrows: ['力量', '速度', '耐力', '控制', '精密', '魅力'].filter((_, statIndex) => Number(row[7 + statIndex]) === 1),
  hitDice: String(row[13]), ac: Number(row[14]), subclasses: row.slice(15, 18).filter(Boolean).map(String),
  sourceSheet: '职业模板', sourceRow: index + 2
}));

const payload = { generatedFrom: path.basename(input), generatedAt: new Date().toISOString(), feats, classes, templates };
fs.writeFileSync(output, `// Generated from the bundled authoring workbook. Re-run scripts/import-sf6-workbook.mjs after source edits.\nexport const SF6_WORKBOOK_DATA = ${JSON.stringify(payload, null, 2)};\n`, 'utf8');
console.log(`Generated ${path.relative(process.cwd(), output)}: ${feats.length} feats, ${Object.keys(classes).length} classes.`);
