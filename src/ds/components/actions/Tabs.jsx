import React from 'react';

export function Tabs({ items = [], value, onChange, style }) {
  const [hover, setHover] = React.useState(null);
  return (
    <div role="tablist" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', height: 'var(--shell-tabbar-h)', padding: '0 var(--space-5)', background: 'var(--surface-panel)', borderBottom: 'var(--border-hairline)', ...style }}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <button
            key={it.id} role="tab" aria-selected={on} type="button"
            onClick={() => onChange && onChange(it.id)}
            onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', padding: '2px 8px', margin: '0 -8px',
              background: on ? 'var(--accent)' : 'transparent', border: 'none',
              color: on ? 'var(--text-on-accent)' : hover === it.id ? 'var(--text-body)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-sm)', letterSpacing: '.04em',
              cursor: 'pointer', transition: 'var(--motion-control)', whiteSpace: 'nowrap'
            }}
          >
            {it.icon ? <i className={'ph-fill ph-' + it.icon} style={{ fontSize: 14, lineHeight: 1 }} aria-hidden="true" /> : null}
            <span style={{ opacity: on ? 1 : 0.55, fontFamily: 'var(--font-mono)' }}>[</span>
            <span>{it.label}</span>
            <span style={{ opacity: on ? 1 : 0.55, fontFamily: 'var(--font-mono)' }}>]</span>
          </button>
        );
      })}
    </div>
  );
}
