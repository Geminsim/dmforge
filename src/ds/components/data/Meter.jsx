import React from 'react';

export function Meter({ value = 0, max = 1, temp = 0, tone = 'auto', label, showNumbers = true, segments = 13, height = 9, style }) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const auto = ratio > 0.5 ? 'var(--pigment-verdigris)' : ratio > 0.25 ? 'var(--pigment-ochre)' : 'var(--pigment-madder)';
  const fill = tone === 'auto' ? auto : tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const filled = Math.round(ratio * segments);
  const tempCount = max > 0 ? Math.min(segments - filled, Math.round((temp / max) * segments)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0, ...style }}>
      {(label || showNumbers) ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
          {label ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{label}</span> : null}
          <span aria-hidden="true" style={{ flex: 1, minWidth: 'var(--space-3)', borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
          {showNumbers ? (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
              {value}<span style={{ color: 'var(--text-faint)', fontWeight: 'var(--weight-regular)' }}>/{max}</span>
              {temp > 0 ? <span style={{ color: 'var(--pigment-woad)' }}> +{temp}</span> : null}
            </span>
          ) : null}
        </div>
      ) : null}
      <span style={{ display: 'flex', gap: '2px' }} role="meter" aria-valuenow={value} aria-valuemax={max}>
        {Array.from({ length: segments }).map((_, i) => {
          const on = i < filled;
          const isTemp = !on && i < filled + tempCount;
          return <i key={i} style={{ flex: 1, minWidth: 4, height, background: on ? fill : isTemp ? 'var(--pigment-woad)' : 'transparent', opacity: isTemp ? 0.5 : 1, boxShadow: on || isTemp ? 'none' : 'inset 0 0 0 1px var(--meter-empty)' }} />;
        })}
      </span>
    </div>
  );
}
