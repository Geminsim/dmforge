import React from 'react';

export function ResizeHandle({ orientation = 'vertical', onMouseDown, title = '拖动调整宽度' }) {
  const [hot, setHot] = React.useState(false);
  const vertical = orientation === 'vertical';
  return (
    <div
      role="separator" title={title} onMouseDown={onMouseDown}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        position: 'relative', flexShrink: 0,
        width: vertical ? 'var(--shell-resize-w)' : '100%', height: vertical ? '100%' : 'var(--shell-resize-w)',
        background: hot ? 'var(--accent)' : 'var(--line-hairline)',
        cursor: vertical ? 'col-resize' : 'row-resize', transition: 'background var(--dur-fast) var(--ease-standard)'
      }}
    >
      <span style={{ position: 'absolute', inset: vertical ? '0 -5px' : '-5px 0', cursor: 'inherit' }} />
    </div>
  );
}
