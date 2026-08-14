import React from 'react';

export function TextInput({ label, value, defaultValue, placeholder, onChange, mono = false, size = 'md', icon, suffix, hint, invalid = false, disabled = false, multiline = false, rows = 4, fullWidth = true, type = 'text', style, inputStyle }) {
  const [focus, setFocus] = React.useState(false);
  const h = size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  const border = invalid ? 'var(--pigment-madder-line)' : focus ? 'var(--accent-line)' : 'var(--line-hairline)';
  const field = {
    flex: 1, minWidth: 0, width: '100%', background: 'transparent', border: 'none', outline: 'none',
    color: 'var(--text-body)', fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
    fontSize: size === 'sm' ? 'var(--type-meta)' : 'var(--type-body-sm)', padding: 0, resize: multiline ? 'vertical' : undefined,
    lineHeight: multiline ? 'var(--type-body-lh)' : undefined, ...inputStyle
  };
  return (
    <label style={{ display: fullWidth ? 'flex' : 'inline-flex', flexDirection: 'column', gap: 'var(--space-2)', width: fullWidth ? '100%' : undefined, ...style }}>
      {label ? <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>{label}</span> : null}
      <span style={{
        display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: 'var(--space-3)',
        minHeight: multiline ? undefined : h, padding: multiline ? 'var(--space-3) var(--space-4)' : '0 var(--space-4)',
        background: 'var(--surface-sunken)', minWidth: 0,
        boxShadow: 'inset 0 0 0 1px ' + border + (focus ? ', var(--ring-focus)' : ''),
        opacity: disabled ? 0.5 : 1, transition: 'var(--motion-control)'
      }}>
        {icon ? <i className={'ph-fill ph-' + icon} style={{ fontSize: 14, lineHeight: 1, color: 'var(--text-faint)' }} aria-hidden="true" /> : null}
        {multiline
          ? <textarea rows={rows} value={value} defaultValue={defaultValue} placeholder={placeholder} disabled={disabled} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field} />
          : <input type={type} value={value} defaultValue={defaultValue} placeholder={placeholder} disabled={disabled} onChange={onChange} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={field} />}
        {suffix ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{suffix}</span> : null}
      </span>
      {hint ? <span style={{ fontSize: 'var(--type-micro)', color: invalid ? 'var(--pigment-madder)' : 'var(--text-faint)' }}>{hint}</span> : null}
    </label>
  );
}
