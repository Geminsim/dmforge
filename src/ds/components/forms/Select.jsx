import React from 'react';

export function Select({ label, value, onChange, options = [], size = 'md', hint, disabled = false, fullWidth = true, style }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  const grouped = options.some(option => option.group)
    ? Array.from(new Set(options.map(option => option.group || ''))).map(group => ({
        group,
        options: options.filter(option => (option.group || '') === group)
      }))
    : null;
  return (
    <label style={{ display: fullWidth ? 'flex' : 'inline-flex', flexDirection: 'column', gap: 'var(--space-2)', width: fullWidth ? '100%' : undefined, ...style }}>
      {label ? <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>{label}</span> : null}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            appearance: 'none', width: '100%', height: h, padding: '0 32px 0 var(--space-4)',
            background: 'var(--surface-sunken)', color: 'var(--text-body)',
            border: 'none', boxShadow: 'inset 0 0 0 1px ' + (focus ? 'var(--accent-line)' : 'var(--line-hairline)') + (focus ? ', var(--ring-focus)' : ''),
            fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? 'var(--type-meta)' : 'var(--type-body-sm)',
            cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'var(--motion-control)'
          }}
        >
          {grouped
            ? grouped.map(({ group, options: groupOptions }) => group
              ? <optgroup key={group} label={group}>{groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
              : groupOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>))
            : options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <i className="ph-fill ph-caret-down" aria-hidden="true" style={{ position: 'absolute', right: 'var(--space-4)', fontSize: 11, color: 'var(--text-faint)', pointerEvents: 'none' }} />
      </span>
      {hint ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{hint}</span> : null}
    </label>
  );
}
