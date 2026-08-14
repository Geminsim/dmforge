import React from 'react';
import { MapToken } from '../map/MapToken.jsx';

export function InitiativeTrack({ round = 1, participants = [], activeId, onSelect, actions, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
      padding: 'var(--space-3) var(--space-4)', background: 'var(--surface-panel)',
      border: 'var(--border-hairline)', borderRadius: 'var(--radius-panel)', ...style
    }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>Round</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--accent)', lineHeight: 1 }}>{round}</span>
      </span>
      <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: 'var(--line-hairline)' }} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', overflowX: 'auto' }}>
        {participants.map(p => {
          const on = p.id === activeId;
          return (
            <button key={p.id} type="button" onClick={() => onSelect && onSelect(p.id)} title={p.name}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0,
                padding: 'var(--space-2) var(--space-3)',
                background: on ? 'var(--accent-soft)' : 'transparent',
                border: '1px solid ' + (on ? 'var(--accent-line)' : 'var(--line-hairline)'),
                borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'var(--motion-control)'
              }}>
              <MapToken kind={p.kind} name={p.name} size={24} active={on} />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                <span style={{ fontSize: 'var(--type-meta)', color: on ? 'var(--text-body)' : 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>先攻 {p.initiative}</span>
              </span>
            </button>
          );
        })}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 'var(--space-3)', flexShrink: 0 }}>{actions}</div> : null}
    </div>
  );
}
