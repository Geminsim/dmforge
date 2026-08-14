import React from 'react';

function mark(text, term) {
  const s = String(text ?? '');
  if (!term) return s;
  const i = s.toLowerCase().indexOf(String(term).toLowerCase());
  if (i < 0) return s;
  return <>{s.slice(0, i)}<mark style={{ background: 'var(--accent-soft)', color: 'var(--accent)', padding: '0 2px', borderRadius: '1px' }}>{s.slice(i, i + term.length)}</mark>{s.slice(i + term.length)}</>;
}

export function SheetTable({ columns = [], rows = [], highlight, fontSize = 13, maxHeight, style }) {
  return (
    <div style={{ overflow: 'auto', maxHeight, background: 'var(--surface-panel)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', ...style }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize, fontFamily: 'var(--font-sans)' }}>
        <thead>
          <tr>
            <th style={{ ...cellBase, position: 'sticky', top: 0, left: 0, zIndex: 2, width: 40, background: 'var(--surface-sunken)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-medium)' }} />
            {columns.map((c, i) => (
              <th key={i} style={{ ...cellBase, position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-sunken)', color: 'var(--text-muted)', fontWeight: 'var(--weight-semibold)', textAlign: 'left', whiteSpace: 'nowrap' }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ ...cellBase, position: 'sticky', left: 0, background: 'var(--surface-sunken)', color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', textAlign: 'right' }}>{ri + 1}</td>
              {r.map((cell, ci) => {
                const numeric = typeof cell === 'number' || (typeof cell === 'string' && /^[-+]?[\d.]+$/.test(cell.trim()));
                return (
                  <td key={ci} style={{ ...cellBase, color: 'var(--text-body)', fontFamily: numeric ? 'var(--font-mono)' : 'var(--font-sans)', textAlign: numeric ? 'right' : 'left', whiteSpace: 'nowrap' }}>{mark(cell, highlight)}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellBase = { padding: '6px 10px', border: '1px solid var(--line-hairline)', lineHeight: 1.5 };
