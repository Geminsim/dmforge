import React from 'react';

export function StatusLine({ items = [], right = [], style }) {
  const cell = (v, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', whiteSpace: 'nowrap' }}>
      {v.label ? <span style={{ fontFamily: 'var(--font-label)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>{v.label}</span> : null}
      <span style={{ color: v.tone === 'accent' ? 'var(--accent)' : v.tone ? `var(--pigment-${v.tone})` : 'var(--text-muted)' }}>{v.value}</span>
    </span>
  );
  return (
    <div style={{
      height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
      padding: '0 var(--space-5)', background: 'var(--surface-panel)', borderTop: 'var(--border-hairline)',
      fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', overflow: 'hidden', ...style
    }}>
      {items.map(cell)}
      <span style={{ flex: 1 }} />
      {right.map(cell)}
    </div>
  );
}
