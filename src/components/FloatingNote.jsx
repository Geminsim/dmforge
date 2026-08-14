import React from 'react';
import { NOTE_TONES, colorForTone, toneForNote } from '../utils/noteTone';

/**
 * A note the DM drags around on top of the map.
 *
 * This deliberately does not use the design system's FloatingNoteCard: that
 * component is presentational (fixed title and body), while this one is an
 * editor the DM types into mid-session and drags and resizes. What it does do
 * is match FloatingNoteCard exactly — same overlay surface, same 2px tone rule
 * along the top, same bracket ring and float shadow — so the two are
 * indistinguishable on screen. Keep them in step if either changes.
 *
 * Notes and modals are the only surfaces in the system allowed to blur, because
 * they sit above live content.
 */

const TONE_VAR = tone => (tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`);
const TONE_SOFT = tone => (tone === 'accent' ? 'var(--accent-soft)' : `var(--pigment-${tone}-soft)`);

function FloatingNote({ note, onClose, onUpdate }) {
  const containerRef = React.useRef(null);
  const tone = toneForNote(note);

  const handleDragStart = (e) => {
    // Don't start a drag when the DM is typing or clicking a control.
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') {
      return;
    }

    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = note.x;
    const initialY = note.y;
    let currentX = initialX;
    let currentY = initialY;

    const handleMouseMove = (moveEvent) => {
      currentX = initialX + (moveEvent.clientX - startX);
      currentY = initialY + (moveEvent.clientY - startY);
      if (containerRef.current) {
        containerRef.current.style.left = `${currentX}px`;
        containerRef.current.style.top = `${currentY}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onUpdate(note.id, { x: currentX, y: currentY });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = note.width || (note.isRulebook ? 380 : 280);
    const startHeight = note.height || (note.isRulebook ? 320 : 190);
    let currentWidth = startWidth;
    let currentHeight = startHeight;

    const handleMouseMove = (moveEvent) => {
      currentWidth = Math.max(200, Math.min(800, startWidth + (moveEvent.clientX - startX)));
      currentHeight = Math.max(120, Math.min(600, startHeight + (moveEvent.clientY - startY)));
      if (containerRef.current) {
        containerRef.current.style.width = `${currentWidth}px`;
        containerRef.current.style.height = `${currentHeight}px`;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      onUpdate(note.id, { width: currentWidth, height: currentHeight });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const iconBtn = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 18,
    height: 18,
    background: 'transparent',
    border: 'none',
    padding: 0,
    color: 'var(--text-muted)',
    cursor: 'pointer'
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width || (note.isRulebook ? 380 : 280)}px`,
        height: note.isMinimized ? 'auto' : `${note.height || (note.isRulebook ? 320 : 190)}px`,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'var(--surface-overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: `inset 0 2px 0 ${TONE_VAR(tone)}, inset 0 0 0 1px var(--bracket-line), var(--shadow-float)`
      }}
    >
      <header
        onMouseDown={handleDragStart}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: 'var(--space-2) var(--space-3)',
          borderBottom: note.isMinimized ? 'none' : 'var(--border-hairline)',
          cursor: 'move',
          userSelect: 'none'
        }}
      >
        <i className="ph-fill ph-note" style={{ fontSize: 12, color: TONE_VAR(tone) }} aria-hidden="true" />
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          placeholder="笔记标题..."
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            padding: 0,
            color: 'var(--text-body)',
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--display-weight)',
            fontSize: 'var(--type-body-sm)'
          }}
        />
        <button
          type="button"
          onClick={() => onUpdate(note.id, { isMinimized: !note.isMinimized })}
          style={iconBtn}
          title={note.isMinimized ? '展开' : '折叠'}
        >
          <i className={`ph-fill ph-${note.isMinimized ? 'arrows-out-simple' : 'minus'}`} style={{ fontSize: 11 }} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onClose(note.id)}
          style={{ ...iconBtn, color: 'var(--pigment-madder)' }}
          title="关闭笔记 (可在列表重新打开)"
        >
          <i className="ph-fill ph-x" style={{ fontSize: 11 }} aria-hidden="true" />
        </button>
      </header>

      {!note.isMinimized && (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            background: TONE_SOFT(tone)
          }}
        >
          <textarea
            value={note.content}
            onChange={(e) => onUpdate(note.id, { content: e.target.value })}
            placeholder="输入对话、描述、秘密或事件笔记..."
            style={{
              flex: 1,
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: 0,
              color: 'var(--text-body)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--type-meta)',
              lineHeight: 'var(--type-body-lh)'
            }}
          />

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 'var(--space-3)',
              paddingTop: 'var(--space-2)',
              borderTop: 'var(--border-hairline)'
            }}
          >
            <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>分类标记</span>
            <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {NOTE_TONES.map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onUpdate(note.id, { color: colorForTone(t) })}
                  title={`将此笔记标记为${t === tone ? '（当前）' : ''}此分类颜色`}
                  style={{
                    width: 11,
                    height: 11,
                    padding: 0,
                    borderRadius: 'var(--radius-pill)',
                    background: TONE_VAR(t),
                    border: t === tone ? '2px solid var(--text-body)' : '1px solid var(--line-hairline)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </span>
          </div>

          <div
            onMouseDown={handleResizeStart}
            title="拖动右下角调整大小"
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 12,
              height: 12,
              cursor: 'se-resize',
              zIndex: 1010,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end'
            }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.6, color: TONE_VAR(tone) }} aria-hidden="true">
              <line x1="6" y1="0" x2="0" y2="6" stroke="currentColor" strokeWidth="1.2" />
              <line x1="6" y1="3" x2="3" y2="6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(FloatingNote);
