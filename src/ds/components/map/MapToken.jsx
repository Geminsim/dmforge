import React from 'react';

const KIND = { PC: 'var(--pigment-woad)', NPC: 'var(--pigment-verdigris)', MONSTER: 'var(--pigment-madder)' };

export function MapToken({ kind = 'PC', name = '', label, size = 32, active = false, selected = false, conditions = 0, dimmed = false, onClick, style }) {
  const color = KIND[kind] || KIND.PC;
  const text = label != null ? label : String(name).slice(0, 2);
  return (
    <span
      onClick={onClick} title={name}
      style={{
        position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: color, color: 'var(--surface-panel)',
        boxShadow: '0 0 0 1px var(--bracket-line)',
        outline: active ? '1px solid var(--accent)' : selected ? '1px solid var(--text-body)' : 'none',
        outlineOffset: 2,
        fontFamily: 'var(--font-display)', fontSize: Math.round(size * 0.36), fontWeight: 700,
        cursor: onClick ? 'grab' : 'default', opacity: dimmed ? 0.45 : 1,
        userSelect: 'none', transition: 'opacity var(--dur-fast) var(--ease-standard)', ...style
      }}
    >
      {text}
      {conditions > 0 ? (
        <span style={{ position: 'absolute', top: -1, right: -1, minWidth: 12, height: 12, padding: '0 2px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--pigment-ochre)', color: 'var(--surface-panel)', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600 }}>{conditions}</span>
      ) : null}
    </span>
  );
}
