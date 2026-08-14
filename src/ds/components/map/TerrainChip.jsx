import React from 'react';

export function TerrainChip({ name, shape = 'rect', tone = 'madder', secret = false, blocked = false, meta, onClick, style }) {
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-2) var(--space-3)', background: soft, minWidth: 0,
        boxShadow: 'inset 0 0 0 1px ' + (tone === 'accent' ? 'var(--accent-line)' : `var(--pigment-${tone}-line)`),
        cursor: onClick ? 'pointer' : 'default', ...style
      }}
    >
      <span aria-hidden="true" style={{
        width: 12, height: 12, flexShrink: 0, background: color, opacity: secret ? 0.35 : 1,
        borderRadius: shape === 'circle' ? '50%' : 0,
        border: secret ? '1px dashed ' + color : 'none'
      }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-meta)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {blocked ? <i className="ph-fill ph-wall" title="实体阻挡" style={{ fontSize: 12, color: 'var(--text-muted)' }} /> : null}
      {secret ? <i className="ph-fill ph-eye-closed" title="仅 DM 可见" style={{ fontSize: 12, color: 'var(--text-muted)' }} /> : null}
      {meta ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{meta}</span> : null}
    </div>
  );
}
