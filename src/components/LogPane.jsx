import React, { useState } from 'react';
import { SegmentedControl, LogEntry, EmptyState } from '../ds';
import { stripEmoji } from '../utils/logText';

const CATEGORIES = [
  { id: 'ALL', label: '全部', icon: 'stack' },
  { id: 'COMBAT', label: '战斗', icon: 'sword' },
  { id: 'ITEMS', label: '物品', icon: 'backpack' },
  { id: 'DICE', label: '掷骰', icon: 'dice-six' }
];

/**
 * Campaign history. LogEntry derives the rule colour and the icon from the
 * entry type, so the old per-entry emoji sniffing (`content.includes('🎁')`)
 * is gone — the type is the source of truth and the content is just the line.
 */
function LogPane({ logs = [] }) {
  const [category, setCategory] = useState('ALL');
  const filtered = logs.filter(log => category === 'ALL' || log.type === category);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 0, minWidth: 0, flex: 1 }}>
      <SegmentedControl value={category} onChange={setCategory} items={CATEGORIES} />
      <div
        style={{
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState compact icon="scroll" text="该分类下暂无记录发生。" />
        ) : (
          filtered.map((log, index) => (
            <LogEntry
              key={index}
              type={log.type}
              timestamp={log.timestamp}
              content={stripEmoji(log.content)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default React.memo(LogPane);
