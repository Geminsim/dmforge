import React from 'react';

export const DMFORGE_THEMES = [
  { id: 'grimoire', label: '墨色典籍', swatch: '#c0503a', bg: '#1f1a17' },
  { id: 'slate', label: '石板烛火', swatch: '#c9a227', bg: '#1c1916' },
  { id: 'terminal', label: '战术终端', swatch: '#57cbdc', bg: '#0f1317' }
];

export function ThemeSwitcher({ value = 'grimoire', onChange, themes = DMFORGE_THEMES, compact = false, style }) {
  return (
    <div role="radiogroup" aria-label="主题" style={{ display: 'inline-flex', gap: '2px', padding: '2px', background: 'var(--surface-sunken)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)', ...style }}>
      {themes.map(t => {
        const on = t.id === value;
        return (
          <button
            key={t.id} type="button" role="radio" aria-checked={on} title={t.label}
            onClick={() => onChange && onChange(t.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
              height: 'var(--control-h-sm)', padding: compact ? '0 6px' : '0 var(--space-3)',
              background: on ? 'var(--surface-raised)' : 'transparent',
              border: '1px solid ' + (on ? 'var(--line-hairline)' : 'transparent'),
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              color: on ? 'var(--text-body)' : 'var(--text-muted)',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--type-micro)', fontWeight: on ? 'var(--weight-semibold)' : 'var(--weight-regular)',
              transition: 'var(--motion-control)'
            }}
          >
            <span aria-hidden="true" style={{ width: 11, height: 11, borderRadius: 'var(--radius-sm)', background: t.bg, border: '1px solid var(--line-strong)', position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', inset: '2px 2px auto auto', width: 5, height: 5, borderRadius: '50%', background: t.swatch }} />
            </span>
            {compact ? null : <span>{t.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
