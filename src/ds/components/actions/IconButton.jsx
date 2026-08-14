import React from 'react';

const SIZES = { sm: { box: 24, icon: 13 }, md: { box: 30, icon: 15 }, lg: { box: 38, icon: 18 } };

export function IconButton({ icon, size = 'md', tone = 'muted', active = false, disabled = false, onClick, title, shape = 'square', style }) {
  const [hover, setHover] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const toneColor = tone === 'danger' ? 'var(--pigment-madder)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-muted)';
  const on = active || hover;
  return (
    <button
      type="button" title={title} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      aria-pressed={active || undefined}
      style={{
        width: s.box, height: s.box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-hover)' : 'transparent',
        color: on ? (tone === 'muted' ? 'var(--text-body)' : toneColor) : toneColor,
        border: '1px solid ' + (active ? 'var(--accent-line)' : 'transparent'),
        borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        transition: 'var(--motion-control)', padding: 0, ...style
      }}
    >
      <i className={'ph-fill ph-' + icon} style={{ fontSize: s.icon, lineHeight: 1 }} aria-hidden="true" />
    </button>
  );
}
