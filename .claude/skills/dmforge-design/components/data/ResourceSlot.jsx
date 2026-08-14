import React from 'react';

const RESET = { turn: '每回合', short: '短休', long: '长休' };

export function ResourceSlot({ name, value = 0, max = 1, resetType = 'turn', onSpend, onRestore, onDelete, style }) {
  const pips = max <= 8;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', minWidth: 0,
      boxShadow: 'inset 0 0 0 1px var(--line-hairline)', ...style
    }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{RESET[resetType] || resetType}重置</span>
      </span>
      {pips ? (
        <span style={{ display: 'flex', gap: '3px' }} aria-hidden="true">
          {Array.from({ length: max }).map((_, i) => (
            <span key={i} style={{ width: 8, height: 8, background: i < value ? 'var(--accent)' : 'transparent', boxShadow: 'inset 0 0 0 1px ' + (i < value ? 'var(--accent)' : 'var(--meter-empty)') }} />
          ))}
        </span>
      ) : (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', color: 'var(--accent)' }}>{value}<span style={{ color: 'var(--text-faint)' }}>/{max}</span></span>
      )}
      <span style={{ display: 'flex', gap: '2px' }}>
        <button type="button" onClick={onSpend} title="消耗 1 次" style={btn}><i className="ph-fill ph-minus" style={{ fontSize: 10 }} /></button>
        <button type="button" onClick={onRestore} title="恢复 1 次" style={btn}><i className="ph-fill ph-plus" style={{ fontSize: 10 }} /></button>
        {onDelete ? <button type="button" onClick={onDelete} title="删除此资源槽" style={{ ...btn, color: 'var(--pigment-madder)' }}><i className="ph-fill ph-trash" style={{ fontSize: 10 }} /></button> : null}
      </span>
    </div>
  );
}

const btn = {
  width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: '1px solid var(--line-hairline)', borderRadius: 'var(--radius-sm)',
  color: 'var(--text-muted)', cursor: 'pointer', padding: 0
};
