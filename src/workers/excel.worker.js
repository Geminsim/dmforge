import * as XLSX from 'xlsx';

const MAX_WORKBOOK_SHEETS = 50;
const MAX_TOTAL_CELLS = 50_000;

function sanitizeSheet(sheet, budget) {
  const safe = Object.create(null);
  for (const [key, cell] of Object.entries(sheet)) {
    if (key.startsWith('!')) continue;
    const match = /^([A-Z]+)(\d+)$/i.exec(key);
    if (!match || Number(match[2]) > 501) continue;
    let column = 0;
    for (const character of match[1].toUpperCase()) column = column * 26 + character.charCodeAt(0) - 64;
    if (column > 101) continue;
    budget.count += 1;
    if (budget.count > MAX_TOTAL_CELLS) throw new Error(`工作簿有效单元格超过安全上限 ${MAX_TOTAL_CELLS}。`);
    safe[key.toUpperCase()] = { v: cell?.v, w: cell?.w, f: cell?.f, s: cell?.s };
  }
  safe['!merges'] = (sheet['!merges'] || []).slice(0, 2_000).map(merge => ({ s: merge.s, e: merge.e }));
  safe['!cols'] = (sheet['!cols'] || []).slice(0, 101);
  safe['!rows'] = (sheet['!rows'] || []).slice(0, 501);
  return safe;
}

self.onmessage = event => {
  try {
    const workbook = XLSX.read(event.data.base64, {
      type: 'base64',
      cellFormula: true,
      cellNF: true,
      cellText: true,
      cellStyles: true
    });
    if (!Array.isArray(workbook.SheetNames)) throw new Error('工作簿缺少有效的工作表目录。');
    if (workbook.SheetNames.length > MAX_WORKBOOK_SHEETS) {
      throw new Error(`工作簿包含 ${workbook.SheetNames.length} 个工作表，超过安全上限 ${MAX_WORKBOOK_SHEETS}。`);
    }
    const sheets = Object.create(null);
    const budget = { count: 0 };
    workbook.SheetNames.forEach(name => {
      if (['__proto__', 'prototype', 'constructor'].includes(name)) throw new Error(`工作表名称 ${name} 不安全。`);
      sheets[name] = sanitizeSheet(workbook.Sheets[name] || {}, budget);
    });
    self.postMessage({ ok: true, workbook: { SheetNames: workbook.SheetNames, Sheets: sheets } });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
