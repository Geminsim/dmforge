import React from 'react';

export function StatPill({ label, value, sub, code, tone = 'neutral', variant = 'leader', size = 'md', style }) {
  const color = tone === 'accent' ? 'var(--accent)' : tone === 'madder' ? 'var(--pigment-madder)' : tone === 'woad' ? 'var(--pigment-woad)' : 'var(--text-body)';
  const val = (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: size === 'sm' ? 'var(--type-numeral-sm)' : 'var(--type-numeral)', fontWeight: 'var(--weight-semibold)', color, whiteSpace: 'nowrap' }}>{value}</span>
  );
  if (variant === 'plate') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)', minWidth: 0, ...style }}>
        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          {sub ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{sub}</span> : null}
        </span>
        {val}
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0, padding: '2px 0', ...style }}>
      <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span>
      {code ? <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{code}</span> : null}
      <span aria-hidden="true" style={{ flex: 1, minWidth: 'var(--space-3)', borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
      {val}
      {sub ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{sub}</span> : null}
    </div>
  );
}
