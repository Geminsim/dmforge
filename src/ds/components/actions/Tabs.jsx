import React from 'react';
import DmforgeIcon from '../../../components/DmforgeIcon';

export function Tabs({ items = [], value, onChange, style }) {
  const [hover, setHover] = React.useState(null);
  return (
    <div role="tablist" className="no-scrollbar" style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--space-2)', height: 'var(--shell-tabbar-h)', padding: '0 var(--space-3)', overflowX: 'auto', background: 'var(--surface-panel)', borderBottom: 'var(--border-hairline)', ...style }}>
      {items.map(it => {
        const on = it.id === value;
        return (
          <button
            key={it.id} role="tab" aria-selected={on} type="button" title={it.title || it.label}
            onClick={() => onChange && onChange(it.id)}
            onMouseEnter={() => setHover(it.id)} onMouseLeave={() => setHover(null)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', minWidth: 76, padding: '0 var(--space-4)', flexShrink: 0,
              background: on ? 'var(--accent-soft)' : hover === it.id ? 'var(--surface-hover)' : 'transparent', border: 'none',
              boxShadow: on ? 'inset 0 -2px 0 var(--accent)' : 'none',
              color: on ? 'var(--accent)' : hover === it.id ? 'var(--text-body)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-body-sm)', letterSpacing: '.02em',
              cursor: 'pointer', transition: 'var(--motion-control)', whiteSpace: 'nowrap'
            }}
          >
            {it.icon ? <DmforgeIcon name={it.icon} size={15} fallbackClass={'ph-fill ph-' + it.icon} /> : null}
            <span>{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
