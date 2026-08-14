import React from 'react';
import { Button, IconButton, EmptyState } from '../ds';
import { toneForNote } from '../utils/noteTone';

/**
 * The note list. The cards themselves float over the map (FloatingNote); this
 * pane is the index — create, show/hide, delete.
 */
function NotesPane({ notes = [], addFloatingNote, updateFloatingNote, deleteFloatingNote }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minHeight: 0, minWidth: 0, flex: 1 }}>
      <Button
        icon="plus"
        fullWidth
        onClick={() => addFloatingNote && addFloatingNote('新对话笔记', '在此输入对话提示、传闻或秘密描述...')}
        title="新建一张浮动对话笔记，创建后可拖拽到地图任意位置"
      >
        新建悬浮对话笔记
      </Button>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)'
        }}
      >
        {notes.length === 0 ? (
          <EmptyState compact icon="note" text="暂无保存的对话笔记" hint="可点击上方按钮创建。" />
        ) : (
          notes.map(note => {
            const isOpen = note.isOpen !== false;
            const tone = toneForNote(note);
            return (
              <div
                key={note.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-2) var(--space-3)',
                  minWidth: 0,
                  background: 'var(--surface-raised)',
                  boxShadow: `inset 2px 0 0 ${tone === 'accent' ? 'var(--accent)' : `var(--pigment-${tone})`}, inset 0 0 0 1px var(--line-hairline)`,
                  opacity: isOpen ? 1 : 0.55,
                  transition: 'var(--motion-control)'
                }}
              >
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontSize: 'var(--type-meta)',
                    color: 'var(--text-body)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {note.title || '无标题笔记'}
                </span>
                <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  <IconButton
                    icon={isOpen ? 'eye' : 'eye-closed'}
                    size="sm"
                    onClick={() => updateFloatingNote && updateFloatingNote(note.id, { isOpen: !isOpen })}
                    title={isOpen ? '点击隐藏浮动卡片' : '点击显示浮动卡片'}
                  />
                  <IconButton
                    icon="trash"
                    size="sm"
                    tone="danger"
                    onClick={() => {
                      if (window.confirm(`确定要永久删除笔记 [${note.title}] 吗？`)) {
                        deleteFloatingNote && deleteFloatingNote(note.id);
                      }
                    }}
                    title="永久删除"
                  />
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default React.memo(NotesPane);
