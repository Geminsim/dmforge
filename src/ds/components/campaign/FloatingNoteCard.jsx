import React from 'react';

const TONES = ['madder', 'verdigris', 'woad', 'ochre', 'accent'];

export function FloatingNoteCard({ title, content, tone = 'ochre', minimized = false, width = 280, height = 190, onClose, onToggle, onToneChange, style }) {
  const color = tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`;
  const soft = tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`;
  return (
    <div style={{
      width, height: minimized ? 'auto' : height, display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: 'var(--surface-overlay)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
      boxShadow: 'inset 0 2px 0 ' + color + ', inset 0 0 0 1px var(--bracket-line), var(--shadow-float)',
      ...style
    }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderBottom: minimized ? 'none' : 'var(--border-hairline)', cursor: 'move', userSelect: 'none' }}>
        <i className="ph-fill ph-note" style={{ fontSize: 12, color }} aria-hidden="true" />
        <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-body-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <button type="button" onClick={onToggle} title={minimized ? '展开' : '折叠'} style={iconBtn}><i className={'ph-fill ph-' + (minimized ? 'arrows-out-simple' : 'minus')} style={{ fontSize: 11 }} /></button>
        <button type="button" onClick={onClose} title="关闭笔记 (可在列表重新打开)" style={{ ...iconBtn, color: 'var(--pigment-madder)' }}><i className="ph-fill ph-x" style={{ fontSize: 11 }} /></button>
      </header>
      {!minimized ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-3)', background: soft, minHeight: 0 }}>
          <p style={{ flex: 1, overflowY: 'auto', fontSize: 'var(--type-meta)', color: 'var(--text-body)', lineHeight: 'var(--type-body-lh)' }}>{content}</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', paddingTop: 'var(--space-2)', borderTop: 'var(--border-hairline)' }}>
            <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>分类标记</span>
            <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {TONES.map(t => (
                <button key={t} type="button" onClick={() => onToneChange && onToneChange(t)} title={t}
                  style={{ width: 11, height: 11, padding: 0, borderRadius: 'var(--radius-pill)', background: t === 'accent' ? 'var(--accent)' : `var(--pigment-${t})`, border: t === tone ? '2px solid var(--text-body)' : '1px solid var(--line-hairline)', cursor: 'pointer' }} />
              ))}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const iconBtn = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, background: 'transparent', border: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer' };
