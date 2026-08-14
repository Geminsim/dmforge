import React from 'react';

const SIZES = {
  sm: { h: 'var(--control-h-sm)', px: '10px', fs: 'var(--type-meta)', icon: 12 },
  md: { h: 'var(--control-h)', px: 'var(--control-pad-x)', fs: 'var(--type-body-sm)', icon: 14 },
  lg: { h: 'var(--control-h-lg)', px: '20px', fs: 'var(--type-body)', icon: 16 }
};

function tone(variant, hover) {
  switch (variant) {
    case 'secondary':
      return { background: hover ? 'var(--surface-hover)' : 'transparent', color: 'var(--text-body)', boxShadow: 'inset 0 0 0 1px ' + (hover ? 'var(--line-strong)' : 'var(--line-hairline)') };
    case 'ghost':
      return { background: hover ? 'var(--surface-hover)' : 'transparent', color: hover ? 'var(--text-body)' : 'var(--text-muted)', boxShadow: 'none' };
    case 'danger':
      return { background: hover ? 'var(--pigment-madder-soft)' : 'transparent', color: 'var(--pigment-madder)', boxShadow: 'inset 0 0 0 1px var(--pigment-madder-line)' };
    case 'primary':
    default:
      return { background: hover ? 'var(--accent-hover)' : 'var(--accent)', color: 'var(--text-on-accent)', boxShadow: 'none' };
  }
}

export function Button({ variant = 'primary', size = 'md', icon, iconRight, children, disabled = false, fullWidth = false, onClick, title, type = 'button', style }) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  return (
    <button
      type={type} title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
        height: s.h, padding: `0 ${s.px}`, width: fullWidth ? '100%' : undefined,
        fontFamily: 'var(--font-sans)', fontSize: s.fs, fontWeight: 'var(--weight-medium)', letterSpacing: '.03em',
        border: 'none', borderRadius: 0, whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.42 : 1,
        transition: 'var(--motion-control)',
        ...tone(variant, hover && !disabled), ...style
      }}
    >
      {icon ? <i className={'ph-fill ph-' + icon} style={{ fontSize: s.icon, lineHeight: 1 }} aria-hidden="true" /> : null}
      {children ? <span>{children}</span> : null}
      {iconRight ? <i className={'ph-fill ph-' + iconRight} style={{ fontSize: s.icon, lineHeight: 1 }} aria-hidden="true" /> : null}
    </button>
  );
}
