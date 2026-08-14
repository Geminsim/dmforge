import React from 'react';

export function RollResult({ formula, total, detail, time, emphasis = false, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0,
      padding: emphasis ? 'var(--space-4)' : 'var(--space-3)',
      background: 'var(--surface-raised)',
      boxShadow: (emphasis ? 'inset 2px 0 0 var(--accent), ' : '') + 'inset 0 0 0 1px var(--line-hairline)',
      animation: 'dmf-fade-in var(--dur-fast) var(--ease-standard)', ...style
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-body-sm)', color: 'var(--text-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formula}</span>
        <span aria-hidden="true" style={{ flex: 1, minWidth: 'var(--space-3)', borderTop: 'var(--rule-dot)', transform: 'translateY(-4px)' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: emphasis ? 'var(--type-numeral-xl)' : 'var(--type-numeral-lg)', fontWeight: 700, color: 'var(--accent)', lineHeight: 1, flexShrink: 0 }}>{total}</span>
      </div>
      {detail ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', overflowWrap: 'anywhere', lineHeight: 'var(--type-body-lh)' }}>{detail}</span> : null}
      {time ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{time}</span> : null}
    </div>
  );
}
