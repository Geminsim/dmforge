import React from 'react';

export function Slider({ label, value = 0, min = 0, max = 100, step = 1, onChange, format, suffix, disabled = false, style }) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const shown = format ? format(value) : String(value) + (suffix || '');
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0, opacity: disabled ? 0.5 : 1, ...style }}>
      {(label || shown) ? (
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
          {label ? <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span> : null}
          <span aria-hidden="true" style={{ flex: 1, minWidth: 'var(--space-3)', borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{shown}</span>
        </span>
      ) : null}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', height: 18 }}>
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'var(--surface-sunken)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', left: 0, width: pct + '%', height: 4, background: 'var(--accent)' }} />
        <span aria-hidden="true" style={{ position: 'absolute', left: 'calc(' + pct + '% - 4px)', width: 8, height: 16, background: 'var(--accent)', boxShadow: 'inset 0 0 0 1px var(--surface-panel)' }} />
        <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={onChange}
          style={{ position: 'relative', width: '100%', margin: 0, opacity: 0, height: 18, cursor: disabled ? 'not-allowed' : 'pointer' }} />
      </span>
    </label>
  );
}
