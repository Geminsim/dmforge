import React from 'react';

const polygonPoints = {
  4: '12,3 22,21 2,21',
  6: '4,4 20,4 20,20 4,20',
  8: '12,2 22,12 12,22 2,12',
  10: '12,2 21,9 18,21 6,21 3,9',
  12: '12,2 20,7 22,15 16,22 8,22 2,15 4,7',
  20: '12,2 21,7 22,16 16,22 8,22 2,16 3,7',
  100: '12,2 20,5 22,12 20,19 12,22 4,19 2,12 4,5'
};

export function DiceButton({ sides, onClick, size = 'md', title, style, count = 0 }) {
  const [hover, setHover] = React.useState(false);
  const box = size === 'sm' ? 40 : 50;
  return (
    <button
      type="button" onClick={onClick} title={title || `投掷 1d${sides}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', minWidth: 0, height: box, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, position: 'relative',
        background: hover ? 'var(--accent)' : 'var(--surface-raised)',
        color: hover ? 'var(--text-on-accent)' : 'var(--text-body)',
        boxShadow: hover ? 'none' : 'inset 0 0 0 1px var(--line-hairline)',
        border: 'none', borderRadius: 0, cursor: 'pointer', padding: 0,
        fontFamily: 'var(--font-mono)', fontSize: size === 'sm' ? 'var(--type-numeral-sm)' : 'var(--type-numeral)',
        fontWeight: 'var(--weight-semibold)', letterSpacing: '.03em',
        transition: 'var(--motion-control)', ...style
      }}
    >
      <svg width="25" height="25" viewBox="0 0 24 24" aria-hidden="true" style={{ overflow: 'visible' }}>
        <polygon points={polygonPoints[sides] || polygonPoints[20]} fill="none" stroke="currentColor" strokeWidth="1.5" />
        {sides >= 8 && <><line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth=".65" opacity=".7" /><line x1="3" y1="8" x2="21" y2="16" stroke="currentColor" strokeWidth=".65" opacity=".55" /><line x1="21" y1="8" x2="3" y2="16" stroke="currentColor" strokeWidth=".65" opacity=".55" /></>}
      </svg>
      <span style={{ fontSize: 11, lineHeight: 1 }}>d{sides}</span>
      {count > 0 ? <span aria-label={`已选择 ${count} 个 d${sides}`} style={{ position: 'absolute', top: 3, right: 3, minWidth: 15, height: 15, padding: '0 3px', borderRadius: 8, background: hover ? 'var(--surface-panel)' : 'var(--accent)', color: hover ? 'var(--accent)' : 'var(--text-on-accent)', fontSize: 10, lineHeight: '15px' }}>{count}</span> : null}
    </button>
  );
}
