import React from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';

function FloatingNote({ note, onClose, onUpdate }) {
  const containerRef = React.useRef(null);
  
  const handleDragStart = (e) => {
    // Prevent dragging if the user is typing inside the inputs
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
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      currentX = initialX + dx;
      currentY = initialY + dy;
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
    const startWidth = note.width || (note.isRulebook ? 380 : 260);
    const startHeight = note.height || (note.isRulebook ? 320 : 180);
    let currentWidth = startWidth;
    let currentHeight = startHeight;

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      currentWidth = Math.max(200, Math.min(800, startWidth + dx));
      currentHeight = Math.max(120, Math.min(600, startHeight + dy));
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

  const colors = [
    { name: 'purple', value: 'var(--accent-purple)', bg: 'rgba(192, 132, 252, 0.1)' },
    { name: 'blue', value: 'var(--accent-blue)', bg: 'rgba(96, 165, 250, 0.1)' },
    { name: 'emerald', value: 'var(--accent-emerald)', bg: 'rgba(52, 211, 153, 0.1)' },
    { name: 'amber', value: 'var(--accent-amber)', bg: 'rgba(251, 191, 36, 0.1)' },
    { name: 'red', value: 'var(--accent-red)', bg: 'rgba(248, 113, 113, 0.1)' }
  ];

  const activeColor = colors.find(c => c.name === note.color) || colors[0];

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left: `${note.x}px`,
        top: `${note.y}px`,
        width: `${note.width || (note.isRulebook ? 380 : 260)}px`,
        height: note.isMinimized ? 'auto' : `${note.height || (note.isRulebook ? 320 : 180)}px`,
        zIndex: 1000,
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--border-light)',
        borderLeft: `4px solid ${activeColor.value}`,
        borderRadius: '8px',
        boxShadow: 'var(--shadow-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Draggable Header */}
      <div
        onMouseDown={handleDragStart}
        style={{
          padding: '8px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: note.isMinimized ? 'none' : '1px solid var(--border-light)',
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none'
        }}
      >
        <input
          type="text"
          value={note.title}
          onChange={(e) => onUpdate(note.id, { title: e.target.value })}
          placeholder="笔记标题..."
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontWeight: 'bold',
            width: '150px',
            outline: 'none',
            padding: 0
          }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => onUpdate(note.id, { isMinimized: !note.isMinimized })}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            title={note.isMinimized ? '展开' : '折叠'}
          >
            {note.isMinimized ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
          <button
            type="button"
            onClick={() => onClose(note.id)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-red)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 0
            }}
            title="关闭笔记 (可在列表重新打开)"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Editable Body */}
      {!note.isMinimized && (
        <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', background: activeColor.bg, flex: 1, overflow: 'hidden', position: 'relative' }}>
          <textarea
            value={note.content}
            onChange={(e) => onUpdate(note.id, { content: e.target.value })}
            placeholder="输入对话、描述、秘密或事件笔记..."
            style={{
              width: '100%',
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '12px',
              lineHeight: '140%',
              resize: 'none',
              outline: 'none',
              padding: 0
            }}
          />

          {/* Color Selector Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', marginTop: 'auto' }}>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>分类标记:</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {colors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => onUpdate(note.id, { color: c.name })}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: c.value,
                    border: note.color === c.name ? '2px solid #fff' : 'none',
                    cursor: 'pointer',
                    padding: 0,
                    boxShadow: note.color === c.name ? '0 0 4px rgba(255,255,255,0.8)' : 'none'
                  }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Drag Resize Handle */}
          <div
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              right: '2px',
              bottom: '2px',
              width: '12px',
              height: '12px',
              cursor: 'se-resize',
              zIndex: 1010,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end'
            }}
            title="拖动右下角调整大小"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" style={{ opacity: 0.5, color: activeColor.value }}>
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
