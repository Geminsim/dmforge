import React from 'react';

const TONES = {
  neutral: ['var(--text-muted)', 'transparent', 'var(--line-strong)'],
  accent: ['var(--accent)', 'var(--accent-soft)', 'var(--accent-line)'],
  madder: ['var(--pigment-madder)', 'var(--pigment-madder-soft)', 'var(--pigment-madder-line)'],
  verdigris: ['var(--pigment-verdigris)', 'var(--pigment-verdigris-soft)', 'var(--pigment-verdigris-line)'],
  woad: ['var(--pigment-woad)', 'var(--pigment-woad-soft)', 'var(--pigment-woad-line)'],
  ochre: ['var(--pigment-ochre)', 'var(--pigment-ochre-soft)', 'var(--pigment-ochre-line)']
};

export function Badge({ children, tone = 'neutral', variant = 'outline', icon, mono = false, size = 'md', onRemove, style }) {
  const [fg, soft, line] = TONES[tone] || TONES.neutral;
  const solid = variant === 'solid';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
      height: size === 'sm' ? 17 : 21, padding: size === 'sm' ? '0 5px' : '0 7px',
      background: solid ? fg : variant === 'soft' ? soft : 'transparent',
      color: solid ? 'var(--text-on-accent)' : fg,
      boxShadow: solid ? 'none' : 'inset 0 0 0 1px ' + line,
      fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
      fontSize: size === 'sm' ? 'var(--type-micro)' : 'var(--type-meta)',
      letterSpacing: '.04em', whiteSpace: 'nowrap', ...style
    }}>
      {icon ? <i className={'ph-fill ph-' + icon} style={{ fontSize: size === 'sm' ? 10 : 11, lineHeight: 1 }} aria-hidden="true" /> : null}
      {children}
      {onRemove ? (
        <button type="button" onClick={onRemove} title="清除状态" style={{ display: 'inline-flex', background: 'transparent', border: 'none', padding: 0, marginLeft: 1, color: 'inherit', cursor: 'pointer', opacity: 0.7 }}>
          <i className="ph-fill ph-x" style={{ fontSize: 9 }} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
