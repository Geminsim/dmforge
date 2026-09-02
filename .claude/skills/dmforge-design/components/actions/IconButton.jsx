import React from 'react';
import DmforgeIcon from '../../../../../src/components/DmforgeIcon';

const SIZES = { sm: { box: 30, icon: 14 }, md: { box: 36, icon: 17 }, lg: { box: 44, icon: 20 } };

export function IconButton({ icon, size = 'md', tone = 'muted', active = false, disabled = false, onClick, title, shape = 'square', style }) {
  const [hover, setHover] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const toneColor = tone === 'danger' ? 'var(--pigment-madder)' : tone === 'accent' ? 'var(--accent)' : 'var(--text-muted)';
  const on = active || hover;
  return (
    <button
      type="button" title={title} aria-label={title || icon} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)}
      aria-pressed={active || undefined}
      style={{
        width: s.box, height: s.box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--accent-soft)' : hover ? 'var(--surface-hover)' : 'var(--surface-raised)',
        color: on ? (tone === 'muted' ? 'var(--text-body)' : toneColor) : toneColor,
        border: '1px solid ' + (active ? 'var(--accent-line)' : 'transparent'),
        borderRadius: shape === 'circle' ? 'var(--radius-pill)' : 0,
        boxShadow: active ? 'inset 0 1px 0 var(--accent-line), 0 1px 0 var(--surface-sunken)' : 'inset 0 1px 0 var(--line-strong), 0 1px 0 var(--surface-sunken)',
        transform: pressed && !disabled ? 'translateY(1px)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        transition: 'var(--motion-control), transform var(--dur-instant) var(--ease-standard)', padding: 0, ...style
      }}
    >
      <DmforgeIcon name={icon} size={s.icon} fallbackClass={'ph-fill ph-' + icon} />
    </button>
  );
}
