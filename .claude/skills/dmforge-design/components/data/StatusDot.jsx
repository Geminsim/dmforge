import React from 'react';

const STATES = {
  synced: ['var(--pigment-verdigris)', '已同步'],
  local: ['var(--pigment-ochre)', '单机模式'],
  error: ['var(--pigment-madder)', '同步失败'],
  idle: ['var(--text-faint)', '空闲']
};

export function StatusDot({ state = 'synced', label, mono = true, style }) {
  const [color, fallback] = STATES[state] || STATES.idle;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)', ...style }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)', fontSize: 'var(--type-micro)', color: 'var(--text-muted)' }}>{label || fallback}</span>
    </span>
  );
}
