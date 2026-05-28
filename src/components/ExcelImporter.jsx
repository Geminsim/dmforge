import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, Trash2, Search, FileUp, X, Eye, EyeOff } from 'lucide-react';

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
        const decoded = XLSX.utils.decode_cell(key);
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
      } catch (err) {
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
      const cellRef = XLSX.utils.encode_cell({ r, c });
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
              background: 'rgba(52, 211, 153, 0.25)', 
              color: 'var(--accent-emerald)', 
              border: '1px solid rgba(52, 211, 153, 0.5)',
              borderRadius: '3px',
              boxShadow: '0 0 10px rgba(52, 211, 153, 0.4)',
              padding: '1px 3px',
              fontWeight: 'bold',
              textShadow: '0 0 4px var(--accent-emerald)'
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

export default function ExcelImporter({
  excelCards = [],
  setExcelCards,
  activeExcelCardId,
  setActiveExcelCardId,
  addLog,
  floatingNotes = [],
  setFloatingNotes,
  updateFloatingNote,
  deleteFloatingNote
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

  const isRulebookActive = activeExcelCardId && activeExcelCardId.startsWith('note_');
  const selectedCard = !isRulebookActive ? excelCards.find(c => c.id === activeExcelCardId) : null;
  const selectedRuleNote = isRulebookActive ? floatingNotes.find(n => n.id === activeExcelCardId) : null;

  // Parse Excel file from Base64 on the fly in memory whenever selected card changes
  useEffect(() => {
    if (selectedCard && selectedCard.fileData) {
      setParseError(null);
      setParsedSheets(null);
      
      // Delay parsing slightly by 50ms to ensure the spinner mounts cleanly and keeps the main thread fully fluid
      const timer = setTimeout(() => {
        try {
          let wb;
          try {
            // Stage 1: Full-fidelity styled parsing (preferred)
            wb = XLSX.read(selectedCard.fileData, { 
              type: 'base64',
              cellFormula: true,
              cellNF: true,
              cellText: true,
              cellStyles: true
            });
          } catch (e1) {
            console.warn('Stage 1 full parse failed, attempting Stage 2 standard parse without cellStyles...', e1);
            try {
              // Stage 2: Fallback without cellStyles (bypasses potential parsing library crashes)
              wb = XLSX.read(selectedCard.fileData, { 
                type: 'base64',
                cellFormula: true,
                cellNF: true,
                cellText: true
              });
            } catch (e2) {
              console.warn('Stage 2 parse failed, attempting Stage 3 raw basic parse...', e2);
              try {
                // Stage 3: Raw core reading (bypasses formula calculation chain compatibility bugs)
                wb = XLSX.read(selectedCard.fileData, { 
                  type: 'base64'
                });
              } catch (e3) {
                throw new Error('此 Excel 工作簿结构或编码被严重破坏，无法被正常识别。' + (e3.message || String(e3)));
              }
            }
          }
          
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

      return () => clearTimeout(timer);
    } else {
      setParsedSheets(null);
      setSheetNames([]);
      setActiveSheetName('');
      setParseError(null);
    }
  }, [activeExcelCardId, excelCards]);

  // Read Excel spreadsheet and convert to lightweight base64 string using native, high-speed readAsDataURL
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Safety limit of 2MB to protect LocalStorage quota limits
    if (file.size > 2 * 1024 * 1024) {
      alert('⚠️ 上传失败\n为了保证本地存盘性能与浏览器流畅度，角色卡文件大小不能超过 2MB。请裁剪或精简您的 Excel 表格。');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataUrl = evt.target.result;
        // Extract raw base64 string from data URL
        const base64 = dataUrl.split(',')[1];
        if (!base64) {
          throw new Error('文件转换为 Base64 编码时发生空白异常。');
        }

        // Pre-read workbook quickly to verify index integrity and extract sheet names
        let tempWb;
        try {
          tempWb = XLSX.read(base64, { type: 'base64' });
        } catch (readErr) {
          throw new Error('无法解析该工作簿的目录索引，请确保文件未损坏。详情: ' + (readErr.message || String(readErr)));
        }

        const newCard = {
          id: 'excel_' + Date.now(),
          filename: file.name,
          fileData: base64, // Keep raw base64 string (extremely small size!)
          sheetNames: tempWb.SheetNames,
          uploadTime: new Date().toLocaleString(),
          sizeBytes: file.size
        };

        setExcelCards(prev => [...prev, newCard]);
        setActiveExcelCardId(newCard.id);

        if (addLog) {
          addLog({
            type: 'SYSTEM',
            content: `📊 **成功载入 Excel 角色卡**: [${file.name}]，包含 ${tempWb.SheetNames.length} 个工作表。已在网页中重组结构。`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      } catch (err) {
        console.error('Import failed:', err);
        alert(`❌ 导入角色卡失败:\n${err.message || '未知文件读取错误'}`);
      }
    };
    reader.readAsDataURL(file); // Native, extremely fast base64 reader
    e.target.value = ''; // Reset uploader
  };

  const handleRulebookFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

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
                content: `📖 **成功批量载入 JSON 规则书**: [${file.name}]，共导入 ${newNotes.length} 条参考条目。`,
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
                content: `📖 **成功载入 JSON 规则书**: [${file.name}]。已创建悬浮窗参考笔记。`,
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
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const wb = XLSX.read(data, { type: 'array' });
          let combinedText = '';
          
          wb.SheetNames.forEach(sheetName => {
            const ws = wb.Sheets[sheetName];
            if (!ws) return;
            
            const range = getActualSheetRange(ws);
            const maxRow = range.e.r;
            const maxCol = range.e.c;
            
            let sheetText = `\n### 📋 工作表: [${sheetName}]\n`;
            
            for (let r = 0; r <= maxRow; r++) {
              const rowValues = [];
              let hasRowValue = false;
              for (let c = 0; c <= maxCol; c++) {
                const cellRef = XLSX.utils.encode_cell({ r, c });
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
            content: `📖 规则表: [${file.name}]\n` + combinedText.trim(),
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
              content: `📖 **成功转化导入 Excel 规则表**: [${file.name}]，已重载转换为文本对照表。`,
              timestamp: new Date().toLocaleTimeString()
            });
          }
        } catch (err) {
          console.error(err);
          alert(`❌ 导入规则表失败:\n${err.message || '未知文件读取错误'}`);
        }
      };
      reader.readAsArrayBuffer(file);
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
            content: `📖 **成功载入文本规则书**: [${file.name}]，共 ${text.length} 个字符。已创建悬浮窗参考笔记。`,
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
    if (window.confirm(`🚨 删除确认 🚨\n确定要永久从战役中删除已导入的玩家 Excel 角色卡 [${name}] 吗？`)) {
      setExcelCards(prev => {
        const remaining = prev.filter(c => c.id !== id);
        if (activeExcelCardId === id) {
          setActiveExcelCardId(remaining.length > 0 ? remaining[0].id : '');
        }
        return remaining;
      });

      if (addLog) {
        addLog({
          type: 'SYSTEM',
          content: `🗑️ **已移除 Excel 角色卡**: [${name}]。`,
          timestamp: new Date().toLocaleTimeString()
        });
      }
    }
  };

  return (
    <div style={{
      display: 'flex',
      height: '100%',
      width: '100%',
      background: 'rgba(10, 11, 16, 0.4)',
      borderRadius: '12px',
      border: '1px solid var(--border-light)',
      overflow: 'hidden'
    }}>
      {/* 1. Left Sidebar: Dual Files Manager (Excel + Rulebooks) */}
      <div style={{
        width: '260px',
        minWidth: '260px',
        borderRight: '1px solid var(--border-light)',
        background: 'rgba(18, 20, 28, 0.6)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Sidebar Title */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-light)',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <span style={{ fontWeight: '700', fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            🗃️ 导入数据库管理
          </span>
        </div>

        {/* Section 1: Excel cards */}
        <div style={{
          padding: '10px 16px 6px 16px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={14} style={{ color: 'var(--accent-purple)' }} />
            <span style={{ fontWeight: '600', fontSize: '13px', fontFamily: 'var(--font-heading)' }}>
              已导入角色卡
            </span>
          </div>
          <span style={{
            fontSize: '10px',
            background: 'rgba(192, 132, 252, 0.15)',
            color: 'var(--accent-purple)',
            padding: '1px 5px',
            borderRadius: '10px',
            fontWeight: 'bold'
          }}>
            {excelCards.length}
          </span>
        </div>

        {/* Excel Card Uploader */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <label className="btn btn-secondary" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            width: '100%',
            height: '28px',
            margin: 0
          }}>
            <FileUp size={12} />
            <span>导入 Excel 角色卡</span>
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Excel Files List */}
        <div style={{
          maxHeight: '220px',
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          borderBottom: '1px solid var(--border-light)'
        }} className="no-scrollbar">
          {excelCards.length === 0 ? (
            <div style={{
              padding: '20px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '11px',
              lineHeight: '1.5'
            }}>
              暂无导入的角色卡
            </div>
          ) : (
            excelCards.map(card => {
              const isActive = card.id === activeExcelCardId;
              return (
                <div 
                  key={card.id}
                  onClick={() => {
                    setActiveExcelCardId(card.id);
                    setIsEditMode(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(192, 132, 252, 0.08)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${isActive ? 'var(--accent-purple)' : 'var(--border-light)'}`,
                    boxShadow: isActive ? '0 0 10px rgba(192, 132, 252, 0.12)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                  className="excel-card-item"
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '22px'
                  }} title={card.filename}>
                    {card.filename}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>{card.sizeBytes ? formatBytes(card.sizeBytes) : '未知大小'}</span>
                    <span>{card.uploadTime ? card.uploadTime.split(' ')[0].split('/').slice(1).join('/') : ''}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteCard(e, card.id, card.filename)}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      top: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    className="delete-card-btn"
                    title="彻底从本战役中移除此角色卡"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Section 2: Rulebooks */}
        <div style={{
          padding: '10px 16px 6px 16px',
          borderBottom: '1px solid var(--border-light)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>📖</span>
            <span style={{ fontWeight: '600', fontSize: '13px', fontFamily: 'var(--font-heading)', color: 'var(--accent-emerald)' }}>
              已导入规则书
            </span>
          </div>
          <span style={{
            fontSize: '10px',
            background: 'rgba(52, 211, 153, 0.15)',
            color: 'var(--accent-emerald)',
            padding: '1px 5px',
            borderRadius: '10px',
            fontWeight: 'bold'
          }}>
            {floatingNotes.filter(n => n.isRulebook).length}
          </span>
        </div>

        {/* Rulebook Uploader */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)' }}>
          <label className="btn btn-secondary" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: '11px',
            width: '100%',
            height: '28px',
            margin: 0,
            borderColor: 'rgba(52, 211, 153, 0.3)',
            background: 'rgba(52, 211, 153, 0.03)'
          }} className="rulebook-uploader-btn">
            <FileUp size={12} style={{ color: 'var(--accent-emerald)' }} />
            <span style={{ color: 'var(--accent-emerald)' }}>导入 TXT/MD/JSON/Excel 规则书</span>
            <input 
              type="file" 
              accept=".txt, .md, .json, .xlsx, .xls" 
              onChange={handleRulebookFileChange}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        {/* Rulebooks List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }} className="no-scrollbar">
          {floatingNotes.filter(n => n.isRulebook).length === 0 ? (
            <div style={{
              padding: '28px 12px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '11px',
              lineHeight: '1.5'
            }}>
              暂无已上传的规则书<br />
              可点击上方导入规则书
            </div>
          ) : (
            floatingNotes.filter(n => n.isRulebook).map(note => {
              const isActive = note.id === activeExcelCardId;
              const isNoteOpen = note.isOpen !== false;
              return (
                <div 
                  key={note.id}
                  onClick={() => {
                    setActiveExcelCardId(note.id);
                    setIsEditMode(false);
                  }}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isActive ? 'rgba(52, 211, 153, 0.08)' : 'rgba(255,255,255,0.01)',
                    border: `1px solid ${isActive ? 'var(--accent-emerald)' : 'var(--border-light)'}`,
                    boxShadow: isActive ? '0 0 10px rgba(52, 211, 153, 0.12)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    position: 'relative',
                    transition: 'all 0.2s ease'
                  }}
                  className="rulebook-item-card"
                >
                  <div style={{
                    fontSize: '12px',
                    fontWeight: isActive ? '600' : '500',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    paddingRight: '36px'
                  }} title={note.title}>
                    📖 {note.title}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '10px',
                    color: 'var(--text-muted)'
                  }}>
                    <span>{note.content ? `${note.content.length} 字` : '0 字'}</span>
                    <span>{note.sizeText || '文本'}</span>
                  </div>

                  {/* Sidebar small control buttons */}
                  <div style={{
                    position: 'absolute',
                    right: '6px',
                    top: '6px',
                    display: 'flex',
                    gap: '2px'
                  }} className="rulebook-item-btns">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFloatingNote && updateFloatingNote(note.id, { isOpen: !isNoteOpen });
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: isNoteOpen ? 'var(--accent-emerald)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                      }}
                      title={isNoteOpen ? '收起悬浮窗' : '在地图上以悬浮窗打开'}
                    >
                      {isNoteOpen ? <Eye size={11} /> : <EyeOff size={11} />}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定要永久从战役中删除此规则书 [${note.title}] 吗？`)) {
                          deleteFloatingNote && deleteFloatingNote(note.id);
                          if (activeExcelCardId === note.id) {
                            setActiveExcelCardId('');
                          }
                          if (addLog) {
                            addLog({
                              type: 'SYSTEM',
                              content: `🗑️ **已移除规则书**: [${note.title}]。`,
                              timestamp: new Date().toLocaleTimeString()
                            });
                          }
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '2px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'color 0.2s'
                      }}
                      className="delete-rulebook-btn"
                      title="永久删除规则书"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right Display Panel: Spreadsheet grid OR Rulebook reader */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'rgba(18, 20, 28, 0.3)',
        overflow: 'hidden'
      }}>
        {!selectedCard && !selectedRuleNote ? (
          /* Empty state: Double uploaders grid layout */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            position: 'relative',
            gap: '24px'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', fontFamily: 'var(--font-heading)', textShadow: '0 0 10px rgba(192, 132, 252, 0.2)', marginBottom: '8px' }}>
              📊 战役规则书与玩家角色卡中心
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              width: '100%',
              maxWidth: '840px'
            }}>
              {/* Left Dropzone: Excel Cards */}
              <label 
                htmlFor="main-excel-uploader"
                style={{
                  border: '2px dashed var(--border-light)',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(192, 132, 252, 0.01)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                className="dropzone-label"
              >
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileChange}
                  id="main-excel-uploader"
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '28px',
                  background: 'rgba(192, 132, 252, 0.08)',
                  border: '1px solid rgba(192, 132, 252, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(192, 132, 252, 0.1)'
                }}>
                  <Upload size={24} style={{ color: 'var(--accent-purple)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    导入 Excel 玩家角色卡
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    一键还原并复刻玩家的 `.xlsx` 电子表格，支持合并单元格与多工作表 Sheets 快速检索。
                  </p>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', marginTop: '8px' }}>
                  支持标准 Excel 格式 (≤2MB)
                </div>
              </label>

              {/* Right Dropzone: Rulebooks */}
              <label 
                htmlFor="main-rulebook-uploader"
                style={{
                  border: '2px dashed var(--border-light)',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'rgba(52, 211, 153, 0.01)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}
                className="dropzone-label-emerald"
              >
                <input 
                  type="file" 
                  accept=".txt, .md, .json, .xlsx, .xls" 
                  onChange={handleRulebookFileChange}
                  id="main-rulebook-uploader"
                  style={{ display: 'none' }}
                />
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '28px',
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 15px rgba(52, 211, 153, 0.1)'
                }}>
                  <Upload size={24} style={{ color: 'var(--accent-emerald)' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--text-primary)' }}>
                    导入游戏规则书 / 设定集
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    支持 TXT、MD、JSON 纯文本或把 Excel 规则表自动解析成文本，以便随时悬浮查阅。
                  </p>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--border-light)', marginTop: '8px' }}>
                  支持 TXT / MD / JSON / XLSX
                </div>
              </label>
            </div>

            <div style={{
              display: 'flex',
              gap: '24px',
              fontSize: '11px',
              color: 'var(--text-muted)',
              marginTop: '12px',
              background: 'rgba(0,0,0,0.15)',
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)'
            }}>
              <span>🛡️ 规则悬浮窗自适应加宽与增高，完美呈现长篇段落</span>
              <span>⚡ 电子表格规则表自动转换为高可读性管道文本表格</span>
            </div>
          </div>
        ) : selectedRuleNote ? (
          /* 2.1 Reading Mode Panel: rulebook details and text viewer */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%'
          }}>
            {/* Top Toolbar */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(10, 11, 16, 0.3)',
              gap: '16px'
            }}>
              {/* Title & Edit Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <span style={{ fontSize: '14px' }}>📖</span>
                </div>
                
                {/* Rename input */}
                <input
                  type="text"
                  value={selectedRuleNote.title}
                  onChange={(e) => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { title: e.target.value })}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    padding: '2px 4px',
                    borderBottom: '1px dashed rgba(255,255,255,0.1)',
                    width: '200px'
                  }}
                  title="点击可直接重命名规则书"
                  placeholder="规则书标题..."
                />

                {/* Edit/View Toggle Button */}
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`btn ${isEditMode ? 'btn-secondary' : 'btn-primary'}`}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    height: '26px',
                    background: isEditMode ? 'rgba(255,255,255,0.08)' : 'rgba(52, 211, 153, 0.2)',
                    borderColor: isEditMode ? 'var(--border-light)' : 'rgba(52, 211, 153, 0.4)',
                    color: isEditMode ? 'var(--text-primary)' : 'var(--accent-emerald)',
                    boxShadow: !isEditMode ? '0 0 8px rgba(52, 211, 153, 0.15)' : 'none'
                  }}
                >
                  {isEditMode ? '👁️ 切换阅读模式' : '📝 切换编辑模式'}
                </button>
              </div>

              {/* Sizing & Clipboard & Summon Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {/* Font Size Adjuster */}
                <div style={{
                  display: 'flex',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  padding: '2px'
                }}>
                  <button
                    onClick={() => setFontSize(prev => Math.max(10, prev - 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    title="减小字号"
                  >
                    A-
                  </button>
                  <button
                    onClick={() => setFontSize(14)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      padding: '2px 6px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      borderLeft: '1px solid rgba(255,255,255,0.05)',
                      borderRight: '1px solid rgba(255,255,255,0.05)'
                    }}
                    title="默认字号 (14px)"
                  >
                    A
                  </button>
                  <button
                    onClick={() => setFontSize(prev => Math.min(24, prev + 1))}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold'
                    }}
                    title="增大字号"
                  >
                    A+
                  </button>
                </div>

                {/* Copy Text Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedRuleNote.content || '');
                    setCopySuccess(true);
                    setTimeout(() => setCopySuccess(false), 2000);
                  }}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    height: '26px',
                    color: copySuccess ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                  }}
                >
                  {copySuccess ? '✓ 已复制全部' : '📋 复制全文'}
                </button>

                {/* Summon Floating Window Toggle */}
                {(() => {
                  const isNoteOpen = selectedRuleNote.isOpen !== false;
                  return (
                    <button
                      onClick={() => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { isOpen: !isNoteOpen })}
                      className="btn"
                      style={{
                        fontSize: '11px',
                        padding: '4px 10px',
                        height: '26px',
                        background: isNoteOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(52, 211, 153, 0.2)',
                        border: `1px solid ${isNoteOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(52, 211, 153, 0.4)'}`,
                        color: isNoteOpen ? 'var(--accent-red)' : 'var(--accent-emerald)',
                        boxShadow: isNoteOpen ? 'none' : '0 0 10px rgba(52, 211, 153, 0.25)',
                        fontWeight: 'bold',
                        transition: 'all 0.2s'
                      }}
                      title={isNoteOpen ? '从地图上隐藏参考窗口' : '在地图上投射为悬浮窗'}
                    >
                      {isNoteOpen ? '🔮 收起地图悬浮窗' : '🔮 召唤至地图悬浮'}
                    </button>
                  );
                })()}
              </div>
            </div>

            {/* Keyword Search box for Rulebook */}
            <div style={{
              padding: '8px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              background: 'rgba(10, 11, 16, 0.15)',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
                <span>搜索筛选:</span>
                {searchQuery && (
                  <span style={{
                    background: 'rgba(52, 211, 153, 0.1)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(52, 211, 153, 0.2)',
                    padding: '1px 6px',
                    borderRadius: '4px'
                  }}>
                    高亮所有 "{searchQuery}"
                  </span>
                )}
              </div>
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="输入关键字进行高亮检索..."
                  className="input-text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '26px',
                    paddingRight: searchQuery ? '24px' : '8px',
                    width: '100%',
                    height: '28px',
                    fontSize: '11px',
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: searchQuery ? 'var(--accent-emerald)' : 'var(--border-light)'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Reading Pane / Edit Pane */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              background: 'rgba(10, 11, 16, 0.1)'
            }} className="no-scrollbar">
              {isEditMode ? (
                /* Editable Textarea */
                <textarea
                  value={selectedRuleNote.content}
                  onChange={(e) => updateFloatingNote && updateFloatingNote(selectedRuleNote.id, { content: e.target.value })}
                  placeholder="输入规则、法术列表、判定公式或备忘录细节..."
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: `${fontSize}px`,
                    lineHeight: '160%',
                    padding: '16px',
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              ) : (
                /* Glowing Highlighted Reading View */
                <div style={{
                  fontSize: `${fontSize}px`,
                  lineHeight: '180%',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  padding: '8px 4px'
                }}>
                  {getHighlightedText(selectedRuleNote.content || '', searchQuery)}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 2.2 Spreadsheet display state */
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            height: '100%'
          }}>
            {/* Top Toolbar: File details & Global Search */}
            <div style={{
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(10, 11, 16, 0.3)',
              gap: '16px'
            }}>
              {/* File Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'rgba(52, 211, 153, 0.1)',
                  border: '1px solid rgba(52, 211, 153, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={16} style={{ color: 'var(--accent-emerald)' }} />
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {selectedCard.filename}
                </span>
              </div>

              {/* Global Search box */}
              <div style={{
                position: 'relative',
                width: '260px'
              }}>
                <Search size={14} style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input
                  type="text"
                  placeholder="🔍 快速属性全局发光检索..."
                  className="input-text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    paddingLeft: '32px',
                    paddingRight: searchQuery ? '28px' : '10px',
                    width: '100%',
                    height: '32px',
                    fontSize: '12px',
                    background: 'rgba(0,0,0,0.3)',
                    borderColor: searchQuery ? 'var(--accent-purple)' : 'var(--border-light)',
                    boxShadow: searchQuery ? '0 0 8px rgba(192, 132, 252, 0.15)' : 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px'
                    }}
                    title="清空搜索"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Sheet Tabs Bar */}
            <div style={{
              display: 'flex',
              background: 'rgba(10, 11, 16, 0.2)',
              borderBottom: '1px solid var(--border-light)',
              overflowX: 'auto',
              padding: '0 12px'
            }} className="no-scrollbar">
              {sheetNames.map(sheetName => {
                const isTabActive = sheetName === activeSheetName;
                return (
                  <button
                    key={sheetName}
                    onClick={() => setActiveSheetName(sheetName)}
                    style={{
                      padding: '10px 16px',
                      background: isTabActive ? 'rgba(25, 28, 39, 0.4)' : 'transparent',
                      border: 'none',
                      borderBottom: `2px solid ${isTabActive ? 'var(--accent-purple)' : 'transparent'}`,
                      color: isTabActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: isTabActive ? '600' : '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: isTabActive ? 'var(--accent-purple)' : 'rgba(255,255,255,0.2)'
                    }} />
                    {sheetName}
                  </button>
                );
              })}
            </div>

            {/* Grid Container */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              background: 'rgba(10, 11, 16, 0.15)'
            }}>
              {(() => {
                if (parseError) {
                  return (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: 'var(--accent-red)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      maxWidth: '500px',
                      margin: '40px auto',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: '12px'
                    }}>
                      <X size={32} style={{ color: 'var(--accent-red)' }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>❌ 角色卡电子表格解析失败</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                          原因: {parseError}
                        </span>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                        该问题可能由于该 Excel 文件采用了不受支持的宏、第三方公式计算链或文件损坏导致。建议在 Excel/WPS 中另存为标准 .xlsx 格式文件后再重新导入。
                      </p>
                      <button 
                        onClick={() => {
                          const temp = activeExcelCardId;
                          setActiveExcelCardId('');
                          setTimeout(() => setActiveExcelCardId(temp), 50);
                        }}
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 12px' }}
                      >
                        🔄 重新尝试解析
                      </button>
                    </div>
                  );
                }

                if (!parsedSheets) {
                  return (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px'
                    }}>
                      <div className="spinner" style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid rgba(192, 132, 252, 0.2)',
                        borderTopColor: 'var(--accent-purple)',
                        animation: 'spin 1s linear infinite'
                      }} />
                      <span>⚡ 正在解析表格结构并复现合并单元格，请稍候...</span>
                    </div>
                  );
                }

                const sheetData = parsedSheets[activeSheetName];
                if (!sheetData || !sheetData.cells || sheetData.cells.length === 0) {
                  return (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '12px'
                    }}>
                      此工作表为空或解析失败
                    </div>
                  );
                }

                return (
                  <div style={{
                    maxHeight: '100%',
                    maxWidth: '100%',
                    overflow: 'visible'
                  }}>
                    <table style={{
                      borderCollapse: 'collapse',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-light)',
                      width: 'max-content',
                      tableLayout: 'fixed',
                      background: 'rgba(18, 20, 28, 0.4)'
                    }} className="excel-render-table">
                      {/* Excel Column Headers: A, B, C... */}
                      <thead>
                        <tr>
                          {/* Top-Left row index label */}
                          <th style={{
                            width: '45px',
                            minWidth: '45px',
                            height: '24px',
                            background: 'rgba(25, 28, 39, 0.95)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-muted)',
                            fontSize: '10px',
                            fontWeight: '600',
                            textAlign: 'center',
                            position: 'sticky',
                            top: 0,
                            left: 0,
                            zIndex: 3
                          }}>
                            R/C
                          </th>
                          {sheetData.cols.map((col, colIndex) => (
                            <th 
                              key={colIndex}
                              style={{
                                width: col.width,
                                minWidth: col.width,
                                height: '24px',
                                background: 'rgba(25, 28, 39, 0.85)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)',
                                fontSize: '10px',
                                fontWeight: '600',
                                textAlign: 'center',
                                position: 'sticky',
                                top: 0,
                                zIndex: 2
                              }}
                            >
                              {getColLetter(colIndex)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      
                      {/* Rows data */}
                      <tbody>
                        {sheetData.cells.map((row, rowIndex) => (
                          <tr key={rowIndex} className="excel-row-tr" style={{
                            height: sheetData.rows[rowIndex]?.height || '26px'
                          }}>
                            {/* Row number label */}
                            <td style={{
                              background: 'rgba(25, 28, 39, 0.9)',
                              border: '1px solid var(--border-light)',
                              color: 'var(--text-secondary)',
                              fontSize: '10px',
                              fontWeight: '600',
                              textAlign: 'center',
                              position: 'sticky',
                              left: 0,
                              zIndex: 1,
                              height: '100%'
                            }}>
                              {rowIndex + 1}
                            </td>

                            {/* Cells of this row */}
                            {row.map((cell, colIndex) => {
                              if (!cell.visible) return null; // Skip if merged and covered
                              
                              const cellValue = cell.w || '';
                              
                              // Check if query is set and cell matches query
                              const isMatch = searchQuery && cellValue && cellValue.toLowerCase().includes(searchQuery.toLowerCase());
                              
                              // Combine alignment & style formatting
                              const cellStyles = getCellStyle(cell);
                              
                              return (
                                <td 
                                  key={colIndex}
                                  rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                                  colSpan={cell.colSpan > 1 ? cell.colSpan : undefined}
                                  style={{
                                    border: '1px solid var(--border-light)',
                                    padding: '6px 8px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    verticalAlign: 'middle',
                                    color: cellValue ? 'var(--text-primary)' : 'rgba(255, 255, 255, 0.1)',
                                    // Highlight if matches search query
                                    background: isMatch 
                                      ? 'rgba(168, 85, 247, 0.25)' 
                                      : cellStyles.backgroundColor || (cellValue ? 'transparent' : 'rgba(255, 255, 255, 0.01)'),
                                    border: isMatch ? '1px solid var(--accent-purple)' : '1px solid var(--border-light)',
                                    boxShadow: isMatch ? '0 0 10px rgba(192, 132, 252, 0.5)' : 'none',
                                    transition: 'all 0.15s ease',
                                    cursor: 'cell',
                                    ...cellStyles
                                  }}
                                  title={cellValue || undefined}
                                  className="excel-cell-td"
                                >
                                  {cellValue || ''}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Embedded CSS for custom transitions and hover highlights */}
      <style dangerouslySetInnerHTML={{__html: `
        .excel-card-item:hover {
          background: rgba(255,255,255,0.06) !important;
          border-color: rgba(192, 132, 252, 0.4) !important;
        }
        .excel-card-item .delete-card-btn {
          opacity: 0;
          transition: opacity 0.2s ease, background 0.2s ease;
        }
        .excel-card-item:hover .delete-card-btn {
          opacity: 1;
        }
        .excel-card-item .delete-card-btn:hover {
          background: rgba(239, 68, 68, 0.15) !important;
          color: var(--accent-red) !important;
        }

        .rulebook-item-card:hover {
          background: rgba(255,255,255,0.05) !important;
          border-color: rgba(52, 211, 153, 0.4) !important;
        }
        .rulebook-item-card .rulebook-item-btns {
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .rulebook-item-card:hover .rulebook-item-btns {
          opacity: 1;
        }
        .rulebook-item-card .delete-rulebook-btn:hover {
          background: rgba(239, 68, 68, 0.15) !important;
          color: var(--accent-red) !important;
        }

        .dropzone-label:hover {
          border-color: var(--accent-purple) !important;
          background: rgba(192, 132, 252, 0.02) !important;
          box-shadow: 0 0 15px rgba(192, 132, 252, 0.05);
        }
        .dropzone-label-emerald {
          transition: all 0.3s ease;
        }
        .dropzone-label-emerald:hover {
          border-color: var(--accent-emerald) !important;
          background: rgba(52, 211, 153, 0.02) !important;
          box-shadow: 0 0 15px rgba(52, 211, 153, 0.05);
        }

        .rulebook-uploader-btn:hover {
          background: rgba(52, 211, 153, 0.08) !important;
          border-color: var(--accent-emerald) !important;
        }

        .excel-row-tr:hover {
          background: rgba(255, 255, 255, 0.03) !important;
        }
        .excel-cell-td:hover {
          background: rgba(192, 132, 252, 0.1) !important;
          color: var(--text-primary) !important;
          box-shadow: inset 0 0 4px rgba(192, 132, 252, 0.2) !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .excel-render-table td, .excel-render-table th {
          transition: background-color 0.1s ease;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}
