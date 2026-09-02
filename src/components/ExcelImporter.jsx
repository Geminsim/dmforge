import { useState, useEffect } from 'react';
import {
  Button, IconButton, TextInput, Tabs, Toolbar, ToolbarDivider, ToolbarLabel, EmptyState
} from '../ds';
import { extractCharacterSheet, extractPlayerCharacterExport, mergeImportedCharacter } from '../utils/characterSheetImport';
import { calculateSf6Character, createSf6SheetData, sf6CharacterFeatureMap } from '../utils/sf6CharacterSheet';

const MAX_EXCEL_FILE_BYTES = 6 * 1024 * 1024;
const MAX_WORKBOOK_SHEETS = 50;
const ALLOWED_EXCEL_EXTENSIONS = new Set(['xlsx', 'xls', 'xlsm', 'xlsb']);
const ALLOWED_CHARACTER_EXTENSIONS = new Set([...ALLOWED_EXCEL_EXTENSIONS, 'json']);

function validateWorkbook(wb) {
  if (!wb || !Array.isArray(wb.SheetNames)) {
    throw new Error('工作簿缺少有效的工作表目录。');
  }
  if (wb.SheetNames.length > MAX_WORKBOOK_SHEETS) {
    throw new Error(`工作簿包含 ${wb.SheetNames.length} 个工作表，超过安全上限 ${MAX_WORKBOOK_SHEETS}。`);
  }
}

function parseCellAddress(address) {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (!match) throw new Error('Invalid cell address');
  let column = 0;
  for (const character of match[1].toUpperCase()) column = column * 26 + character.charCodeAt(0) - 64;
  return { c: column - 1, r: Number(match[2]) - 1 };
}

function parseWorkbookInWorker(base64, timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/excel.worker.js', import.meta.url), { type: 'module' });
    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Excel 解析超过 8 秒安全时限，任务已终止。'));
    }, timeoutMs);
    worker.onmessage = event => {
      clearTimeout(timeout);
      worker.terminate();
      if (event.data.ok) resolve(event.data.workbook);
      else reject(new Error(event.data.error || 'Excel Worker 解析失败。'));
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error('Excel 隔离解析进程异常退出。'));
    };
    worker.postMessage({ base64 });
  });
}

// Convert column index (e.g. 0, 1, 2) to Excel column letters (A, B, C... Z, AA, AB...)
function getColLetter(index) {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Convert bytes count to a premium human-readable file size format
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Dynamically scan worksheet keys to determine the ACTUAL active data bounds.
// Excel files often have full-column styles causing '!ref' to span up to A1:XFD1048576,
// which causes browser out-of-memory freeze. Scanning keys solves this 100% reliably!
function getActualSheetRange(ws) {
  let minRow = 0;
  let minCol = 0;
  let maxRow = 0;
  let maxCol = 0;
  let hasCells = false;

  // Scan all keys in worksheet
  for (const key in ws) {
    if (key.startsWith('!')) continue; // Skip metadata keys
    
    const cell = ws[key];
    // Count cell if it contains a value, formatted text, or formula
    if (cell && ((cell.v !== undefined && cell.v !== null && cell.v !== '') || cell.f)) {
      try {
        const decoded = parseCellAddress(key);
        if (decoded && typeof decoded.r === 'number' && typeof decoded.c === 'number') {
          if (!hasCells) {
            minRow = decoded.r;
            minCol = decoded.c;
            maxRow = decoded.r;
            maxCol = decoded.c;
            hasCells = true;
          } else {
            minRow = Math.min(minRow, decoded.r);
            minCol = Math.min(minCol, decoded.c);
            maxRow = Math.max(maxRow, decoded.r);
            maxCol = Math.max(maxCol, decoded.c);
          }
        }
      } catch {
        // Skip invalid keys gracefully
      }
    }
  }

  // Scan merges configuration to expand the bounds if merged cells stretch beyond the data bounds
  const merges = ws['!merges'] || [];
  merges.forEach(merge => {
    if (merge && merge.s && merge.e) {
      const sr = merge.s.r;
      const sc = merge.s.c;
      const er = merge.e.r;
      const ec = merge.e.c;

      if (hasCells) {
        // If the merge root overlaps our active region, expand to fit the merge boundary
        if (sr <= maxRow && sc <= maxCol) {
          maxRow = Math.max(maxRow, er);
          maxCol = Math.max(maxCol, ec);
        }
      }
    }
  });

  // Apply reasonable safety ceiling limits (500 rows, 100 cols) to absolutely prevent tab freezing
  if (hasCells) {
    maxRow = Math.min(maxRow, 500);
    maxCol = Math.min(maxCol, 100);
  } else {
    // Default grid dimension if worksheet is completely empty
    maxRow = 20;
    maxCol = 10;
  }

  return {
    s: { r: 0, c: 0 },
    e: { r: maxRow, c: maxCol }
  };
}

// High-fidelity custom worksheet parser to preserve merges, heights, widths, and cell values
function parseWorksheet(ws) {
  // Determine ACTUAL range bounds using scan to avoid standard ref overflows
  const range = getActualSheetRange(ws);
  const maxRow = range.e.r;
  const maxCol = range.e.c;

  // 1. Initialize a grid of cell descriptor objects with standard formats
  const grid = [];
  for (let r = 0; r <= maxRow; r++) {
    const row = [];
    for (let c = 0; c <= maxCol; c++) {
      row.push({
        val: '',
        w: '',
        formula: '',
        rowSpan: 1,
        colSpan: 1,
        visible: true,
        isMerged: false,
        style: null
      });
    }
    grid.push(row);
  }

  // 2. Parse merged cells metadata (colspan & rowspan support) with index protections
  const merges = ws['!merges'] || [];
  merges.forEach(merge => {
    if (merge && merge.s && merge.e) {
      const startRow = merge.s.r;
      const startCol = merge.s.c;
      const endRow = merge.e.r;
      const endCol = merge.e.c;

      // Boundary protection
      if (startRow <= maxRow && startCol <= maxCol) {
        const rootCell = grid[startRow] ? grid[startRow][startCol] : null;
        if (rootCell) {
          rootCell.rowSpan = Math.min(endRow, maxRow) - startRow + 1;
          rootCell.colSpan = Math.min(endCol, maxCol) - startCol + 1;
          rootCell.isMerged = true;
        }

        // Mark all other covered cells in the merge range as invisible with out-of-bounds guards
        for (let r = startRow; r <= Math.min(endRow, maxRow); r++) {
          for (let c = startCol; c <= Math.min(endCol, maxCol); c++) {
            if (r !== startRow || c !== startCol) {
              if (grid[r] && grid[r][c]) {
                grid[r][c].visible = false;
                grid[r][c].isMerged = true;
              }
            }
          }
        }
      }
    }
  });

  // 3. Fill in cell values with strict fallbacks & boundary protection to avoid any data loss
  for (let r = 0; r <= maxRow; r++) {
    for (let c = 0; c <= maxCol; c++) {
      const cellRef = `${getColLetter(c)}${r + 1}`;
      const cell = ws[cellRef];
      if (cell) {
        const gridCell = grid[r] ? grid[r][c] : null;
        if (gridCell) {
          gridCell.val = cell.v !== undefined && cell.v !== null ? cell.v : '';
          // CRITICAL FALLBACK: Use formatted text .w. If not available, fall back to raw value .v
          // This ensures calculated cells and unformatted formula values are NEVER lost!
          gridCell.w = cell.w !== undefined ? cell.w.toString() : (cell.v !== undefined && cell.v !== null ? cell.v.toString() : '');
          gridCell.formula = cell.f || '';
          
          // Retain styles metadata if parsed
          if (cell.s) {
            gridCell.style = cell.s;
          }
        }
      }
    }
  }

  // 4. Parse column widths
  const colsConfig = ws['!cols'] || [];
  const cols = [];
  for (let c = 0; c <= maxCol; c++) {
    const col = colsConfig[c];
    let width = '120px'; // default fallback width
    if (col) {
      if (col.wpx) {
        width = `${col.wpx}px`;
      } else if (col.wch) {
        width = `${col.wch * 8 + 12}px`; // scale character width to pixels
      }
    }
    cols.push({ width });
  }

  // 5. Parse row heights
  const rowsConfig = ws['!rows'] || [];
  const rows = [];
  for (let r = 0; r <= maxRow; r++) {
    const row = rowsConfig[r];
    let height = '26px'; // default row height
    if (row && row.hpx) {
      height = `${row.hpx}px`;
    }
    rows.push({ height });
  }

  return {
    cells: grid,
    cols,
    rows
  };
}

// Generate styles based on cell value type and styling metadata
function getCellStyle(cell) {
  const styles = {};
  
  // Natural text alignment
  if (cell.val !== '') {
    if (typeof cell.val === 'number') {
      styles.textAlign = 'right';
    } else {
      styles.textAlign = 'left';
    }
  }

  // Preserve styles if present in the spreadsheet structure
  if (cell.style) {
    const s = cell.style;
    if (s.alignment) {
      if (s.alignment.horizontal) styles.textAlign = s.alignment.horizontal;
      if (s.alignment.vertical) styles.verticalAlign = s.alignment.vertical;
    }
    if (s.font) {
      if (s.font.bold) styles.fontWeight = 'bold';
      if (s.font.italic) styles.fontStyle = 'italic';
      if (s.font.color && s.font.color.rgb) {
        styles.color = `#${s.font.color.rgb}`;
      }
    }
    if (s.fill && s.fill.fgColor && s.fill.fgColor.rgb) {
      const hex = s.fill.fgColor.rgb;
      // Convert fill background hex to translucent color for optimal dark mode integration
      styles.backgroundColor = `rgba(${parseInt(hex.slice(0,2), 16)}, ${parseInt(hex.slice(2,4), 16)}, ${parseInt(hex.slice(4,6), 16)}, 0.15)`;
    }
  }

  return styles;
}

const sheetHeadCell = {
  position: 'sticky',
  top: 0,
  height: 24,
  background: 'var(--surface-sunken)',
  border: '1px solid var(--line-hairline)',
  color: 'var(--text-muted)',
  fontFamily: 'var(--font-mono)',
  fontSize: 'var(--type-micro)',
  fontWeight: 'var(--weight-medium)',
  textAlign: 'center'
};

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const getHighlightedText = (text, highlight) => {
  if (!highlight.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(highlight)})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              boxShadow: 'inset 0 0 0 1px var(--accent-line)',
              padding: '1px 3px',
              fontWeight: 'var(--weight-semibold)'
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

function SideKey({ code, title, count, tone = 'accent' }) {
  return (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-4)',
      background: 'var(--surface-sunken)',
      borderTop: 'var(--border-hairline)',
      borderBottom: 'var(--border-hairline)'
    }}
  >
    <span
      style={{
        fontFamily: 'var(--font-label)',
        fontSize: 'var(--type-micro)',
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`
      }}
    >
      {code}
    </span>
    <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-body)' }}>{title}</span>
    <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{count}</span>
  </div>
  );
}

/** File-picker styled as a secondary button; <input type=file> needs a label. */
function UploadLabel({ accept, onChange, icon, children, title, multiple = false }) {
  return (
  <label
    title={title}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--space-2)',
      height: 'var(--control-h-sm)',
      cursor: 'pointer',
      color: 'var(--text-body)',
      fontSize: 'var(--type-meta)',
      fontWeight: 'var(--weight-medium)',
      letterSpacing: '.03em',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
      transition: 'var(--motion-control)'
    }}
  >
    <i className={`ph-fill ph-${icon}`} style={{ fontSize: 13 }} aria-hidden="true" />
    {children}
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} style={{ display: 'none' }} />
  </label>
  );
}

function Dropzone({ id, accept, onChange, icon, title, body, note, multiple = false }) {
  return (
  <label
    htmlFor={id}
    className="dmf-dropzone"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-4)',
      padding: 'var(--space-9) var(--space-6)',
      textAlign: 'center',
      cursor: 'pointer',
      background: 'var(--surface-panel)',
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
      transition: 'var(--motion-control)'
    }}
  >
    <input type="file" accept={accept} multiple={multiple} onChange={onChange} id={id} style={{ display: 'none' }} />
    <i className={`ph-fill ph-${icon}`} style={{ fontSize: 26, color: 'var(--accent)' }} aria-hidden="true" />
    <div>
      <h3 style={{ fontSize: 'var(--type-display-sm)', marginBottom: 'var(--space-2)' }}>{title}</h3>
      <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)', maxWidth: '34ch' }}>{body}</p>
    </div>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{note}</span>
  </label>
  );
}

export default function ExcelImporter({
  excelCards = [],
  setExcelCards,
  activeExcelCardId,
  setActiveExcelCardId,
  addLog,
  floatingNotes = [],
  setFloatingNotes,
  updateFloatingNote,
  deleteFloatingNote,
  characters = [],
  setCharacters,
  activeMapId,
  ruleset
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSheetName, setActiveSheetName] = useState('');
  
  // IN-MEMORY Spreadsheets cache to keep LocalStorage extremely small and prevent QuotaExceededError crashes
  const [parsedSheets, setParsedSheets] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [parseError, setParseError] = useState(null);

  // Sizing & edit states for rulebooks
  const [fontSize, setFontSize] = useState(14);
  const [isEditMode, setIsEditMode] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [importingCount, setImportingCount] = useState(0);

  const isRulebookActive = activeExcelCardId && activeExcelCardId.startsWith('note_');
  const selectedCard = !isRulebookActive ? excelCards.find(c => c.id === activeExcelCardId) : null;
  const selectedRuleNote = isRulebookActive ? floatingNotes.find(n => n.id === activeExcelCardId) : null;

  // Parse Excel file from Base64 on the fly in memory whenever selected card changes
  useEffect(() => {
    let active = true;
    if (selectedCard?.kind === 'player-json') {
      setParsedSheets(null);
      setSheetNames([]);
      setActiveSheetName('');
      setParseError(null);
    } else if (selectedCard && selectedCard.fileData) {
      setParseError(null);
      setParsedSheets(null);
      
      // Delay parsing slightly by 50ms to ensure the spinner mounts cleanly and keeps the main thread fully fluid
      const timer = setTimeout(async () => {
        try {
          const wb = await parseWorkbookInWorker(selectedCard.fileData);
          if (!active) return;

          validateWorkbook(wb);
          
          const sheets = {};
          wb.SheetNames.forEach(name => {
            const ws = wb.Sheets[name];
            if (ws) {
              sheets[name] = parseWorksheet(ws);
            } else {
              sheets[name] = { cells: [], cols: [], rows: [] };
            }
          });

          setParsedSheets(sheets);
          setSheetNames(wb.SheetNames);
          
          // Auto-select the first sheet or keep current if valid
          if (!wb.SheetNames.includes(activeSheetName)) {
            setActiveSheetName(wb.SheetNames[0] || '');
          }
        } catch (err) {
          console.error('In-memory Excel parsing failed:', err);
          setParseError(err.message || String(err));
          setParsedSheets(null);
          setSheetNames([]);
          setActiveSheetName('');
        }
      }, 50);

      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      setParsedSheets(null);
      setSheetNames([]);
      setActiveSheetName('');
      setParseError(null);
    }
  // The card id/list are the parse triggers. activeSheetName is deliberately
  // excluded because selecting a sheet must not reparse the workbook.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeExcelCardId, excelCards]);

  const readFileAsBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('浏览器无法读取该文件。'));
    reader.onload = event => {
      const base64 = String(event.target.result || '').split(',')[1];
      if (base64) resolve(base64);
      else reject(new Error('文件转换为 Base64 编码时发生空白异常。'));
    };
    reader.readAsDataURL(file);
  });

  const validateCharacterCardFile = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_CHARACTER_EXTENSIONS.has(extension)) {
      throw new Error('仅允许导入 DMForge 玩家角色卡 .json 或 .xlsx、.xls、.xlsm、.xlsb 工作簿。');
    }
    if (file.size > MAX_EXCEL_FILE_BYTES) {
      throw new Error('角色卡文件大小不能超过 6MB，请裁剪图片或精简 Excel 表格。');
    }
  };

  const makeId = (prefix) => `${prefix}_${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`}`;

  const importCharacterCard = async (file, replaceCard = null) => {
    validateCharacterCardFile(file);
    const extension = file.name.split('.').pop()?.toLowerCase();
    const base64 = await readFileAsBase64(file);
    let workbook = null;
    let extracted;
    if (extension === 'json') {
      extracted = extractPlayerCharacterExport(await file.text(), file.name);
    } else {
      workbook = await parseWorkbookInWorker(base64);
      validateWorkbook(workbook);
      extracted = extractCharacterSheet(workbook, file.name);
    }
    if (ruleset?.id === 'sf6-v0.9') {
      const selectedFeatNames = extracted.character.sheet?.selectedFeatNames || [];
      const selectedFeats = selectedFeatNames.map(name => ruleset.feats.find(feat => feat.name === name)?.id || '');
      extracted.character.sheet = createSf6SheetData({ ...extracted.character.sheet, selectedFeats });
      extracted.character = calculateSf6Character(extracted.character, ruleset);
      extracted.character.feats = sf6CharacterFeatureMap(extracted.character, ruleset);
    } else if (extracted.character.sheet) {
      // The bundled workbook can still be viewed/imported in a blank campaign,
      // but its native SF6 editor data must not leak outside the default campaign.
      delete extracted.character.sheet;
    }
    const cardId = replaceCard?.id || makeId('excel');
    const linked = characters.find(character => character.sourceExcelCardId === cardId)
      || (replaceCard?.characterId ? characters.find(character => character.id === replaceCard.characterId) : null);
    const characterId = linked?.id || makeId('char');
    const importedCharacter = mergeImportedCharacter(linked ? { ...linked } : { id: characterId }, extracted.character, {
      cardId,
      mapId: activeMapId
    });

    setCharacters?.(previous => {
      const index = previous.findIndex(character => character.id === characterId || character.sourceExcelCardId === cardId);
      if (index < 0) return [...previous, importedCharacter];
      const current = previous[index];
      const updated = mergeImportedCharacter(current, extracted.character, { cardId, mapId: activeMapId });
      return previous.map((character, characterIndex) => characterIndex === index ? updated : character);
    });

    const now = new Date();
    const card = {
      ...(replaceCard || {}),
      id: cardId,
      filename: file.name,
      fileData: base64,
      kind: extension === 'json' ? 'player-json' : 'excel',
      sheetNames: workbook?.SheetNames || [],
      uploadTime: now.toLocaleString(),
      lastImportedAt: now.toISOString(),
      sizeBytes: file.size,
      characterId,
      characterName: extracted.character.name,
      autoImport: {
        found: extracted.found,
        warnings: extracted.warnings,
        sheetCount: extracted.sheetCount
      }
    };

    setExcelCards(previous => replaceCard
      ? previous.map(existing => existing.id === replaceCard.id ? card : existing)
      : [...previous, card]);
    setActiveExcelCardId(card.id);
    addLog?.({
      type: 'SYSTEM',
      content: `**${replaceCard ? '更新' : '导入'}角色卡**: [${file.name}] → **${extracted.character.name}**。自动识别 ${extracted.found.length} 项字段，${replaceCard ? '已同步更新关联角色并保留地图位置与战斗状态' : '已创建关联角色'}。`,
      timestamp: now.toLocaleTimeString()
    });
    return card;
  };

  // Each selected workbook is parsed independently and creates one linked character.
  const handleFileChange = async (e, replaceCard = null) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setImportingCount(files.length);
    const failures = [];
    for (const file of files) {
      try {
        await importCharacterCard(file, replaceCard);
      } catch (error) {
        console.error('Character card import failed:', error);
        failures.push(`${file.name}: ${error.message || '未知文件读取错误'}`);
      } finally {
        setImportingCount(count => Math.max(0, count - 1));
      }
    }
    if (failures.length) alert(`以下角色卡导入失败：\n${failures.join('\n')}`);
  };

  const handleRulebookFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_EXCEL_FILE_BYTES) {
      alert('规则书文件不能超过 2MB。');
      e.target.value = '';
      return;
    }

    const fileExt = file.name.split('.').pop().toLowerCase();
    
    if (fileExt === 'json') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const newNotes = parsed.map((item, idx) => ({
              id: 'note_rule_' + Date.now() + '_' + idx,
              title: item.title || `${file.name.replace(/\.[^/.]+$/, "")} #${idx + 1}`,
              content: typeof item.content === 'string' ? item.content : JSON.stringify(item, null, 2),
              x: 120 + ((floatingNotes.length + idx) * 30) % 210,
              y: 120 + ((floatingNotes.length + idx) * 30) % 210,
              color: 'emerald',
              isMinimized: false,
              isOpen: true,
              isRulebook: true,
              sizeText: 'JSON条目'
            }));
            setFloatingNotes(prev => [...prev, ...newNotes]);
            if (newNotes.length > 0) {
              setActiveExcelCardId(newNotes[0].id);
            }
            if (addLog) {
              addLog({
                type: 'SYSTEM',
                content: `**成功批量载入 JSON 规则书**: [${file.name}]，共导入 ${newNotes.length} 条参考条目。`,
                timestamp: new Date().toLocaleTimeString()
              });
            }
          } else {
            const newNote = {
              id: 'note_rule_' + Date.now(),
              title: parsed.title || file.name.replace(/\.[^/.]+$/, ""),
              content: parsed.content || JSON.stringify(parsed, null, 2),
              x: 120 + (floatingNotes.length * 30) % 210,
              y: 120 + (floatingNotes.length * 30) % 210,
              color: 'emerald',
              isMinimized: false,
              isOpen: true,
              isRulebook: true,
              sizeText: formatBytes(file.size)
            };
            setFloatingNotes(prev => [...prev, newNote]);
            setActiveExcelCardId(newNote.id);
            if (addLog) {
              addLog({
                type: 'SYSTEM',
                content: `**成功载入 JSON 规则书**: [${file.name}]。已创建悬浮窗参考笔记。`,
                timestamp: new Date().toLocaleTimeString()
              });
            }
          }
        } catch (err) {
          console.error(err);
          alert('解析 JSON 规则书失败！请检查文件格式。详情: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else if (fileExt === 'xlsx' || fileExt === 'xls') {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const base64 = String(evt.target.result).split(',')[1];
          if (!base64) throw new Error('规则书工作簿编码为空。');
          const wb = await parseWorkbookInWorker(base64);
          let combinedText = '';
          
          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            if (!ws) return;
            
            const range = getActualSheetRange(ws);
            const maxRow = range.e.r;
            const maxCol = range.e.c;
            
 let sheetText =`\n### 工作表: [${sheetName}]\n`;
            
            for (let r = 0; r <= maxRow; r++) {
              const rowValues = [];
              let hasRowValue = false;
              for (let c = 0; c <= maxCol; c++) {
                const cellRef = `${getColLetter(c)}${r + 1}`;
                const cell = ws[cellRef];
                let val = '';
                if (cell && cell.v !== undefined && cell.v !== null) {
                  val = cell.w !== undefined ? cell.w.toString() : cell.v.toString();
                  hasRowValue = true;
                }
                rowValues.push(val.trim());
              }
              if (hasRowValue) {
                sheetText += `| ${rowValues.join(' | ')} |\n`;
                if (r === 0) {
                  sheetText += `| ${rowValues.map(() => '---').join(' | ')} |\n`;
                }
              }
            }
            combinedText += sheetText;
          });
          
          const newNote = {
            id: 'note_rule_' + Date.now(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            content: `规则表: [${file.name}]\n`+ combinedText.trim(),
            x: 120 + (floatingNotes.length * 30) % 210,
            y: 120 + (floatingNotes.length * 30) % 210,
            color: 'emerald',
            isMinimized: false,
            isOpen: true,
            isRulebook: true,
            sizeText: formatBytes(file.size)
          };
          
          setFloatingNotes(prev => [...prev, newNote]);
          setActiveExcelCardId(newNote.id);
          
          if (addLog) {
            addLog({
              type: 'SYSTEM',
              content: `**成功转化导入 Excel 规则表**: [${file.name}]，已重载转换为文本对照表。`,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        } catch (err) {
          console.error(err);
          alert(`导入规则表失败:\n${err.message ||'未知文件读取错误'}`);
        }
      };
      reader.readAsDataURL(file);
    } else {
      // txt, md and standard fallbacks
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target.result;
        const newNote = {
          id: 'note_rule_' + Date.now(),
          title: file.name.replace(/\.[^/.]+$/, ""),
          content: text,
          x: 120 + (floatingNotes.length * 30) % 210,
          y: 120 + (floatingNotes.length * 30) % 210,
          color: 'emerald',
          isMinimized: false,
          isOpen: true,
          isRulebook: true,
          sizeText: formatBytes(file.size)
        };
        
        setFloatingNotes(prev => [...prev, newNote]);
        setActiveExcelCardId(newNote.id);
        
        if (addLog) {
          addLog({
            type: 'SYSTEM',
            content: `**成功载入文本规则书**: [${file.name}]，共 ${text.length} 个字符。已创建悬浮窗参考笔记。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      };
      reader.readAsText(file);
    }
    e.target.value = ''; // Reset
  };

  const handleDeleteCard = (e, id, name) => {
    e.stopPropagation(); // Avoid activating the card upon deletion click
    if (window.confirm(`删除确认\n确定要从战役中删除 Excel 角色卡 [${name}] 吗？关联角色会保留，但不再自动同步。`)) {
      setExcelCards(prev => {
        const remaining = prev.filter(c => c.id !== id);
        if (activeExcelCardId === id) {
          setActiveExcelCardId(remaining.length > 0 ? remaining[0].id : '');
        }
        return remaining;
      });
      setCharacters?.(previous => previous.map(character => character.sourceExcelCardId === id
        ? { ...character, sourceExcelCardId: undefined, sourceExcelImportedAt: undefined }
        : character));

      if (addLog) {
        addLog({
          type: 'SYSTEM',
          content: `**已移除 Excel 角色卡**: [${name}]。关联角色已保留并解除自动同步。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  const rulebooks = floatingNotes.filter(n => n.isRulebook);

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', background: 'var(--surface-app)' }}>
      <aside
        style={{
          width: 280,
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--surface-panel)',
          borderRight: 'var(--border-hairline)'
        }}
      >
        <SideKey code="Sheets" title= "已导入角色卡" count={excelCards.length} />
        <div style={{ padding: 'var(--space-3)' }}>
          <UploadLabel
            accept=".json,.xlsx,.xls,.xlsm,.xlsb"
            onChange={handleFileChange}
            icon="file-xls"
            title="可一次选择多张角色卡；每个文件自动建立一个关联角色（单文件最大 2MB，最多 50 个工作表）"
            multiple
          >
            {importingCount ? `正在导入 ${importingCount} 张…` : '导入玩家角色卡'}
          </UploadLabel>
          {ruleset?.id === 'sf6-v0.9' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <a href="/player-character-sheet.html" target="_blank" rel="noreferrer" className="dmf-btn dmf-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', textDecoration: 'none', fontSize: 'var(--type-meta)' }}>
                <i className="ph-fill ph-user-square" aria-hidden="true" />
                独立玩家页
              </a>
              <a href="/player-character-sheet.html" download="DMForge-玩家角色卡.html" className="dmf-btn dmf-btn-secondary" title="下载可直接发送给玩家的单文件离线版" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                <i className="ph-fill ph-download-simple" aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </div>

        <div className="no-scrollbar" style={{ maxHeight: 220, overflowY: 'auto', padding: '0 var(--space-3) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {excelCards.length === 0 ? (
            <EmptyState compact icon="file-plus" text= "暂无导入的角色卡" />
          ) : (
            excelCards.map(card => {
              const isActive = card.id === activeExcelCardId;
              return (
                <div
                  key={card.id}
                  className="dmf-file-row"
                  onClick={() => { setActiveExcelCardId(card.id); setIsEditMode(false); }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: 'var(--space-2) var(--space-3)',
                    minWidth: 0,
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-soft)' : 'var(--surface-raised)',
                    boxShadow: `inset 0 0 0 1px ${isActive ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
                    transition: 'var(--motion-control)'
                  }}
                >
                  <span title={card.filename} style={{ paddingRight: 22, fontSize: 'var(--type-meta)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {card.filename}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                    <span>{card.sizeBytes ? formatBytes(card.sizeBytes) : '未知大小'}</span>
                    <span>{card.characterName ? `→ ${card.characterName}` : (card.uploadTime ? card.uploadTime.split(' ')[0].split('/').slice(1).join('/') : '')}</span>
                  </span>
                  {card.autoImport ? (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: card.autoImport.warnings?.length ? 'var(--text-muted)' : 'var(--accent)' }}>
                      自动识别 {card.autoImport.found?.length || 0} 项{card.autoImport.warnings?.length ? ` · ${card.autoImport.warnings.length} 条提示` : ' · 已关联'}
                    </span>
                  ) : null}
                  <span className="dmf-row-actions" style={{ position: 'absolute', right: 4, top: 4, display: 'flex', gap: 2 }}>
                    <input
                      id={`replace-${card.id}`}
                      type="file"
                      accept=".json,.xlsx,.xls,.xlsm,.xlsb"
                      onChange={event => handleFileChange(event, card)}
                      style={{ display: 'none' }}
                    />
                    <IconButton
                      icon="arrows-clockwise"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        document.getElementById(`replace-${card.id}`)?.click();
                      }}
                      title="重新选择文件并自动更新关联角色（保留地图位置、资源和状态）"
                    />
                    <IconButton
                      icon="trash"
                      size="sm"
                      tone="danger"
                      onClick={(e) => handleDeleteCard(e, card.id, card.filename)}
                      title= "彻底从本战役中移除此角色卡"
                    />
                  </span>
                </div>
              );
            })
          )}
        </div>

        <SideKey code="Rulebooks" title= "已导入规则书" count={rulebooks.length} tone="verdigris" />
        <div style={{ padding: 'var(--space-3)' }}>
          <UploadLabel
            accept=".txt, .md, .json, .xlsx, .xls"
            onChange={handleRulebookFileChange}
            icon="book-open-text"
            title= "导入 TXT / MD / JSON 纯文本，或把 Excel 规则表自动解析为文本规则书"
          >
            导入规则书
          </UploadLabel>
        </div>

        <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 var(--space-3) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {rulebooks.length === 0 ? (
            <EmptyState compact icon="book-open-text" text= "暂无已上传的规则书" hint= "可点击上方导入规则书。" />
          ) : (
            rulebooks.map(note => {
              const isActive = note.id === activeExcelCardId;
              const isNoteOpen = note.isOpen !== false;
              return (
                <div
                  key={note.id}
                  className="dmf-file-row"
                  onClick={() => { setActiveExcelCardId(note.id); setIsEditMode(false); }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: 'var(--space-2) var(--space-3)',
                    minWidth: 0,
                    cursor: 'pointer',
                    background: isActive ? 'var(--pigment-verdigris-soft)' : 'var(--surface-raised)',
                    boxShadow: `inset 0 0 0 1px ${isActive ? 'var(--pigment-verdigris-line)' : 'var(--line-hairline)'}`,
                    transition: 'var(--motion-control)'
                  }}
                >
                  <span title={note.title} style={{ paddingRight: 44, fontSize: 'var(--type-meta)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {note.title}
                  </span>
                  <span style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
                    <span>{note.content ? `${note.content.length} 字` : '0 字'}</span>
                    <span>{note.sizeText || '文本'}</span>
                  </span>
                  <span className="dmf-row-actions" style={{ position: 'absolute', right: 4, top: 4, display: 'flex', gap: 1 }}>
                    <IconButton
                      icon={isNoteOpen ? 'eye' : 'eye-closed'}
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateFloatingNote && updateFloatingNote(note.id, { isOpen: !isNoteOpen }); }}
                      title={isNoteOpen ? '收起悬浮窗' : '在地图上以悬浮窗打开'}
                    />
                    <IconButton
                      icon="trash"
                      size="sm"
                      tone="danger"
                      title= "永久删除规则书"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定要永久从战役中删除此规则书 [${note.title}] 吗？`)) {
                          deleteFloatingNote && deleteFloatingNote(note.id);
                          if (activeExcelCardId === note.id) setActiveExcelCardId('');
                          addLog?.({
                            type: 'SYSTEM',
                            content: `**已移除规则书**: [${note.title}]。`,
                            timestamp: new Date().toLocaleTimeString()
                          });
                        }
                      }}
                    />
                  </span>
                </div>
              );
            })
          )}
        </div>
      </aside>

      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedCard && !selectedRuleNote ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-7)', padding: 'var(--space-9)' }}>
            <h2 style={{ fontSize: 'var(--type-display-md)' }}>战役规则书与玩家角色卡中心</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', width: '100%', maxWidth: 840 }}>
              <Dropzone
                id="main-excel-uploader"
                accept=".json,.xlsx,.xls,.xlsm,.xlsb"
                onChange={handleFileChange}
                icon="file-xls"
                title="导入 DMForge / Excel 玩家角色卡"
                body="独立玩家页导出的 JSON 可直接建立角色；Excel 工作簿仍会保留原表格和多工作表查看。"
                note="支持 JSON / XLSX / XLS / XLSM / XLSB，单文件最大 2MB"
                multiple
              />
              <Dropzone
                id="main-rulebook-uploader"
                accept=".txt, .md, .json, .xlsx, .xls"
                onChange={handleRulebookFileChange}
                icon="book-open-text"
                title= "导入游戏规则书 / 设定集"
                body="支持 TXT、MD、JSON 纯文本或把 Excel 规则表自动解析成文本，以便随时悬浮查阅。"
                note="支持 TXT / MD / JSON / XLSX"
              />
            </div>
            {ruleset?.characterSheetTemplate && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 'var(--space-3)' }}>
                <a href="/player-character-sheet.html" target="_blank" rel="noreferrer" className="dmf-btn dmf-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
                  <i className="ph-fill ph-user-square" aria-hidden="true" />
                  打开独立玩家角色卡
                </a>
                <a href="/player-character-sheet.html" download="DMForge-玩家角色卡.html" className="dmf-btn dmf-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
                  <i className="ph-fill ph-download-simple" aria-hidden="true" />
                  下载离线单文件
                </a>
                <a href={ruleset.characterSheetTemplate} download="DMForge-SF6-v0.9-角色卡.xlsx" className="dmf-btn dmf-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none' }}>
                  <i className="ph-fill ph-file-xls" aria-hidden="true" />
                  下载 Excel 版
                </a>
              </div>
            )}
            <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-faint)', textAlign: 'center', lineHeight: 'var(--type-body-lh)', maxWidth: '60ch' }}>
              规则悬浮窗自适应加宽与增高，完美呈现长篇段落；电子表格规则表自动转换为高可读性管道文本表格。
            </p>
          </div>
        ) : selectedRuleNote ? (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Toolbar style={{ borderBottom: 'var(--border-hairline)', background: 'var(--surface-panel)' }} dense wrap={false}>
              <i className="ph-fill ph-book-open-text" style={{ fontSize: 15, color: 'var(--pigment-verdigris)' }} aria-hidden="true" />
              <input
                type="text"
                value={selectedRuleNote.title}
                onChange={(e) => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { title: e.target.value })}
                title= "点击可直接重命名规则书"
                placeholder= "规则书标题..."
                style={{
                  width: 220,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  padding: '2px 0',
                  borderBottom: 'var(--rule-dot)',
                  color: 'var(--text-body)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 'var(--display-weight)',
                  fontSize: 'var(--type-body-sm)'
                }}
              />
              <Button
                size="sm"
                variant={isEditMode ? 'secondary' : 'primary'}
                icon={isEditMode ? 'eye' : 'pencil-simple'}
                onClick={() => setIsEditMode(!isEditMode)}
                title={isEditMode ? '切回只读阅读模式' : '切到编辑模式，可直接改写规则书正文'}
              >
                {isEditMode ? '切换阅读模式' : '切换编辑模式'}
              </Button>
              <ToolbarDivider />
              <ToolbarLabel>Size</ToolbarLabel>
              <IconButton icon="minus" size="sm" onClick={() => setFontSize(prev => Math.max(10, prev - 1))} title= "减小字号" />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', minWidth: 30, textAlign: 'center' }}>{fontSize}px</span>
              <IconButton icon="plus" size="sm" onClick={() => setFontSize(prev => Math.min(24, prev + 1))} title= "增大字号" />
              <IconButton icon="arrow-counter-clockwise" size="sm" onClick={() => setFontSize(14)} title= "默认字号 (14px)" />
              <span style={{ flex: 1 }} />
              <Button
                size="sm"
                variant="secondary"
                icon={copySuccess ? 'check' : 'copy'}
                title= "复制规则书全文到剪贴板"
                onClick={() => {
                  navigator.clipboard.writeText(selectedRuleNote.content || '');
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 2000);
                }}
              >
                {copySuccess ? '已复制全部' : '复制全文'}
              </Button>
              <Button
                size="sm"
                variant={selectedRuleNote.isOpen !== false ? 'danger' : 'secondary'}
                icon="note"
                onClick={() => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { isOpen: !(selectedRuleNote.isOpen !== false) })}
                title={selectedRuleNote.isOpen !== false ? '从地图上隐藏参考窗口' : '在地图上投射为悬浮窗'}
              >
                {selectedRuleNote.isOpen !== false ? '收起地图悬浮窗' : '召唤至地图悬浮'}
              </Button>
            </Toolbar>

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)', borderBottom: 'var(--border-hairline)' }}>
              <TextInput
                size="sm"
                icon="magnifying-glass"
                placeholder= "输入关键字进行高亮检索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && <Button size="sm" variant="secondary" icon="x" onClick={() => setSearchQuery('')} title= "清空搜索" />}
            </div>

            <div className="no-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-7)' }}>
              {isEditMode ? (
                <textarea
                  value={selectedRuleNote.content}
                  onChange={(e) => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { content: e.target.value })}
                  placeholder= "输入规则、法术列表、判定公式或备忘录细节..."
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: 'var(--space-5)',
                    background: 'var(--surface-sunken)',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    boxShadow: 'inset 0 0 0 1px var(--line-hairline)',
                    color: 'var(--text-body)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.6
                  }}
                />
              ) : (
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.8,
                    color: 'var(--text-body)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}
                >
                  {getHighlightedText(selectedRuleNote.content || '', searchQuery)}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Toolbar style={{ borderBottom: 'var(--border-hairline)', background: 'var(--surface-panel)' }} dense wrap={false}>
              <i className="ph-fill ph-file-xls" style={{ fontSize: 15, color: 'var(--accent)' }} aria-hidden="true" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-body-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedCard.filename}
              </span>
              <span style={{ flex: 1 }} />
              {selectedCard.autoImport ? (
                <span
                  title={selectedCard.autoImport.warnings?.join('；') || `已识别：${selectedCard.autoImport.found?.join('、')}`}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: selectedCard.autoImport.warnings?.length ? 'var(--text-muted)' : 'var(--accent)', whiteSpace: 'nowrap' }}
                >
                  关联角色：{selectedCard.characterName || '未命名'} · 识别 {selectedCard.autoImport.found?.length || 0} 项
                </span>
              ) : null}
              <span style={{ width: 260 }}>
                <TextInput
                  size="sm"
                  icon="magnifying-glass"
                  placeholder= "输入关键字进行高亮检索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </span>
              {searchQuery && <IconButton icon="x" size="sm" onClick={() => setSearchQuery('')} title= "清空搜索" />}
            </Toolbar>

            <div className="no-scrollbar" style={{ flexShrink: 0, overflowX: 'auto' }}>
              <Tabs
                value={activeSheetName}
                onChange={setActiveSheetName}
                items={sheetNames.map(name => ({ id: name, label: name }))}
              />
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 'var(--space-5)', background: 'var(--surface-app)' }}>
              {selectedCard.kind === 'player-json' ? (
                <div style={{ maxWidth: 620, margin: 'var(--space-9) auto', padding: 'var(--space-8)', background: 'var(--surface-panel)', boxShadow: 'inset 0 0 0 1px var(--accent-line)', display: 'grid', gap: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <i className="ph-fill ph-check-circle" style={{ fontSize: 30, color: 'var(--accent)' }} aria-hidden="true" />
                    <div>
                      <h3 style={{ fontSize: 'var(--type-display-sm)' }}>独立玩家角色卡已导入</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--type-meta)' }}>角色已建立在 DM 角色列表中；此 JSON 不包含需要预览的电子表格页面。</p>
                    </div>
                  </div>
                  <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-2) var(--space-4)', fontSize: 'var(--type-body-sm)' }}>
                    <dt style={{ color: 'var(--text-faint)' }}>关联角色</dt><dd>{selectedCard.characterName || '未命名'}</dd>
                    <dt style={{ color: 'var(--text-faint)' }}>识别内容</dt><dd>{selectedCard.autoImport?.found?.join('、') || '基础角色数据'}</dd>
                    <dt style={{ color: 'var(--text-faint)' }}>导入时间</dt><dd>{selectedCard.uploadTime}</dd>
                  </dl>
                  <p style={{ color: 'var(--text-muted)', fontSize: 'var(--type-meta)', lineHeight: 1.7 }}>后续玩家再次发来更新后的 JSON 时，点击左侧该角色卡的刷新按钮即可覆盖角色卡字段，同时保留地图坐标、战斗状态与当前资源。</p>
                </div>
              ) : parseError ? (
                <div
                  style={{
                    maxWidth: 520,
                    margin: 'var(--space-9) auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                    padding: 'var(--space-8)',
                    textAlign: 'center',
                    background: 'var(--pigment-madder-soft)',
                    boxShadow: 'inset 0 0 0 1px var(--pigment-madder-line)'
                  }}
                >
                  <i className="ph-fill ph-warning-octagon" style={{ fontSize: 28, color: 'var(--pigment-madder)' }} aria-hidden="true" />
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', color: 'var(--pigment-madder)' }}>
                    角色卡电子表格解析失败
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                    原因: {parseError}
                  </span>
                  <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
                    该问题可能由于该 Excel 文件采用了不受支持的宏、第三方公式计算链或文件损坏导致。建议在 Excel/WPS 中另存为标准 .xlsx 格式文件后再重新导入。
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="arrow-counter-clockwise"
                    title= "重新解析这份表格"
                    onClick={() => {
                      const temp = activeExcelCardId;
                      setActiveExcelCardId('');
                      setTimeout(() => setActiveExcelCardId(temp), 50);
                    }}
                  >
                    重新尝试解析
                  </Button>
                </div>
              ) : !parsedSheets ? (
                <EmptyState icon="hourglass-medium" text= "正在解析表格结构并复现合并单元格，请稍候…" />
              ) : (() => {
                const sheetData = parsedSheets[activeSheetName];
                if (!sheetData || !sheetData.cells || sheetData.cells.length === 0) {
                  return <EmptyState icon="table" text= "此工作表为空或解析失败" />;
                }
                return (
                  <table
                    className="dmf-sheet"
                    style={{
                      borderCollapse: 'collapse',
                      tableLayout: 'fixed',
                      width: 'max-content',
                      background: 'var(--surface-panel)',
                      color: 'var(--text-body)',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--type-meta)'
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ ...sheetHeadCell, width: 45, minWidth: 45, left: 0, zIndex: 3 }}>R/C</th>
                        {sheetData.cols.map((col, colIndex) => (
                          <th key={colIndex} style={{ ...sheetHeadCell, width: col.width, minWidth: col.width, zIndex: 2 }}>
                            {getColLetter(colIndex)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheetData.cells.map((row, rowIndex) => (
                        <tr key={rowIndex} style={{ height: sheetData.rows[rowIndex]?.height || '26px' }}>
                          <td style={{ ...sheetHeadCell, position: 'sticky', left: 0, zIndex: 1, top: 'auto' }}>{rowIndex + 1}</td>
                          {row.map((cell, colIndex) => {
                            if (!cell.visible) return null; // merged and covered by another cell
                            const cellValue = cell.w || '';
                            const isMatch = searchQuery && cellValue && cellValue.toLowerCase().includes(searchQuery.toLowerCase());
                            const cellStyles = getCellStyle(cell);
                            return (
                              <td
                                key={colIndex}
                                rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                                colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                                title={cellValue || undefined}
                                style={{
                                  padding: '6px 8px',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  verticalAlign: 'middle',
                                  color: cellValue ? 'var(--text-body)' : 'var(--text-faint)',
                                  background: isMatch ? 'var(--accent-soft)' : cellStyles.backgroundColor || 'transparent',
                                  border: `1px solid ${isMatch ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
                                  ...cellStyles
                                }}
                              >
                                {cellValue}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      <style>{`
        .dmf-file-row:hover { background: var(--surface-hover) !important; }
        .dmf-file-row .dmf-row-actions { opacity: 0; transition: var(--motion-fade); }
        .dmf-file-row:hover .dmf-row-actions { opacity: 1; }
        .dmf-dropzone:hover { box-shadow: inset 0 0 0 1px var(--accent-line) !important; background: var(--accent-soft) !important; }
        .dmf-sheet tr:hover td { background: var(--surface-hover); }
        .dmf-sheet td:hover { box-shadow: inset 0 0 0 1px var(--accent-line); }
      `}</style>
    </div>
  );
}
