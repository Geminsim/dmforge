import React from 'react';

export function SegmentedControl({ items = [], value, onChange, size = 'sm', fullWidth = true, style }) {
  const h = size === 'md' ? 'var(--control-h)' : 'var(--control-h-sm)';
  return (
    <div style={{ display: fullWidth ? 'grid' : 'inline-grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(0, 1fr)', gap: '1px', background: 'var(--line-hairline)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)', ...style }}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <button
            key={it.id} type="button" onClick={() => onChange && onChange(it.id)} title={it.title}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
              height: h, padding: '0 var(--space-2)', minWidth: 0, overflow: 'hidden',
              background: on ? 'var(--accent)' : 'var(--surface-panel)',
              color: on ? 'var(--text-on-accent)' : 'var(--text-muted)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-meta)',
              fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              transition: 'var(--motion-control)'
            }}
          >
            {it.icon ? <i className={'ph-fill ph-' + it.icon} style={{ fontSize: 12, lineHeight: 1, flexShrink: 0 }} aria-hidden="true" /> : null}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.label}</span>
            {it.count != null ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', opacity: 0.7, flexShrink: 0 }}>{it.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
