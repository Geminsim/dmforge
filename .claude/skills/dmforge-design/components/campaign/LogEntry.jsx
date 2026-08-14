import React from 'react';

const TYPES = {
  SYSTEM: ['accent', 'scroll', 'SYSTEM'],
  COMBAT: ['madder', 'sword', 'COMBAT'],
  ITEMS: ['ochre', 'backpack', 'ITEMS'],
  DICE: ['woad', 'dice-six', 'DICE']
};

function renderBold(content) {
  return String(content ?? '').split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} style={{ fontFamily: 'var(--font-mono)', fontWeight: 'var(--weight-semibold)', color: 'var(--accent)' }}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{part}</React.Fragment>
  );
}

export function LogEntry({ type = 'SYSTEM', content, timestamp, style }) {
  const [tone, icon, label] = TYPES[type] || TYPES.SYSTEM;
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  return (
    <article style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: 'var(--space-3) 0', minWidth: 0, borderBottom: 'var(--rule-dot)', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{timestamp}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color }}>
          <i className={'ph-fill ph-' + icon} style={{ fontSize: 10 }} aria-hidden="true" />{label}
        </span>
      </div>
      <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)', overflowWrap: 'anywhere' }}>{renderBold(content)}</p>
    </article>
  );
}
