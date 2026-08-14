import React from 'react';

export function DiceButton({ sides, onClick, size = 'md', title, style }) {
  const [hover, setHover] = React.useState(false);
  const box = size === 'sm' ? 40 : 50;
  return (
    <button
      type="button" onClick={onClick} title={title || `投掷 1d${sides}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', minWidth: 0, height: box, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? 'var(--accent)' : 'var(--surface-raised)',
        color: hover ? 'var(--text-on-accent)' : 'var(--text-body)',
        boxShadow: hover ? 'none' : 'inset 0 0 0 1px var(--line-hairline)',
        border: 'none', borderRadius: 0, cursor: 'pointer', padding: 0,
        fontFamily: 'var(--font-mono)', fontSize: size === 'sm' ? 'var(--type-numeral-sm)' : 'var(--type-numeral)',
        fontWeight: 'var(--weight-semibold)', letterSpacing: '.03em',
        transition: 'var(--motion-control)', ...style
      }}
    >d{sides}</button>
  );
}
