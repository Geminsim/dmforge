import React from 'react';

export function Checkbox({ label, checked = false, onChange, hint, disabled = false, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <label
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}
    >
      <span style={{
        width: 16, height: 16, flexShrink: 0, marginTop: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? 'var(--accent)' : 'var(--surface-sunken)',
        border: '1px solid ' + (checked ? 'var(--accent)' : hover ? 'var(--line-strong)' : 'var(--line-hairline)'),
        borderRadius: 'var(--radius-sm)', transition: 'var(--motion-control)'
      }}>
        <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />
        {checked ? <i className="ph-fill ph-check" style={{ fontSize: 11, color: 'var(--text-on-accent)', lineHeight: 1 }} aria-hidden="true" /> : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{ fontSize: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{label}</span>
        {hint ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{hint}</span> : null}
      </span>
    </label>
  );
}
