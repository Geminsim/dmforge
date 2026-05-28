import React, { useState } from 'react';
import { History, MessageSquare, Swords, Package, Dices, Layers, Eye, EyeOff, Trash2 } from 'lucide-react';

export default function ActionLog({ logs, floatingNotes = [], addFloatingNote, deleteFloatingNote, updateFloatingNote }) {
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, COMBAT, ITEMS, DICE

  const handleCreateEmptyNote = () => {
    if (addFloatingNote) {
      addFloatingNote('新对话笔记', '在此输入对话提示、传闻或秘密描述...');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (activeTab === 'ALL') return true;
    return log.type === activeTab;
  });

  return (
    <div className="glass-panel panel-content" style={{ height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* Dialogue Notes Manager */}
      <div style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={handleCreateEmptyNote} 
          className="btn btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
        >
          <MessageSquare size={16} />
          <span>+ 新建悬浮对话笔记</span>
        </button>
        
        {/* Notes list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px', padding: '0 4px' }}>
            <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>📋 对话笔记列表 ({floatingNotes.length})</span>
          </div>
          
          {floatingNotes.length === 0 ? (
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontStyle: 'italic' }}>
              暂无保存的对话笔记，可点击上方按钮创建。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {floatingNotes.map(note => {
                const colorMap = {
                  purple: 'var(--accent-purple)',
                  blue: 'var(--accent-blue)',
                  emerald: 'var(--accent-emerald)',
                  amber: 'var(--accent-amber)',
                  red: 'var(--accent-red)'
                };
                const noteColor = colorMap[note.color] || colorMap.purple;
                const isNoteOpen = note.isOpen !== false;

                return (
                  <div 
                    key={note.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      background: isNoteOpen ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid var(--border-light)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      gap: '6px',
                      opacity: isNoteOpen ? 1 : 0.6,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Color dot & title */}
                    <div 
                      onClick={() => updateFloatingNote && updateFloatingNote(note.id, { isOpen: !isNoteOpen })}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        flex: 1, 
                        minWidth: 0,
                        cursor: 'pointer' 
                      }}
                      title={isNoteOpen ? '点击隐藏浮动卡片' : '点击显示浮动卡片'}
                    >
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: noteColor, flexShrink: 0 }} />
                      <span style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-primary)', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        fontWeight: isNoteOpen ? '500' : 'normal'
                      }}>
                        {note.title || '无标题笔记'}
                      </span>
                    </div>

                    {/* Toggle and delete buttons */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => updateFloatingNote && updateFloatingNote(note.id, { isOpen: !isNoteOpen })}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isNoteOpen ? 'var(--accent-purple)' : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          transition: 'color 0.2s'
                        }}
                        title={isNoteOpen ? '隐藏浮动框' : '显示浮动框'}
                      >
                        {isNoteOpen ? <Eye size={12} /> : <EyeOff size={12} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`确定要永久删除笔记 [${note.title}] 吗？`)) {
                            deleteFloatingNote && deleteFloatingNote(note.id);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: '2px',
                          transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-red)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="永久删除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* History Log Title */}
      <div className="panel-title" style={{ marginBottom: '4px' }}>
        <History size={18} style={{ color: 'var(--accent-purple)' }} />
        <span>📜 战役历史记录</span>
      </div>

      {/* Log Tabs Category Filter */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, 1fr)', 
          gap: '4px', 
          background: 'rgba(0,0,0,0.15)', 
          padding: '2px', 
          borderRadius: '6px',
          border: '1px solid var(--border-light)'
        }}
      >
        <button 
          onClick={() => setActiveTab('ALL')} 
          className={`tab-btn`} 
          style={{ 
            padding: '6px 2px', 
            fontSize: '11px', 
            borderRadius: '4px',
            background: activeTab === 'ALL' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'ALL' ? 'var(--accent-purple)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            fontWeight: activeTab === 'ALL' ? 'bold' : 'normal'
          }}
        >
          <Layers size={10} />
          <span>全部</span>
        </button>
        <button 
          onClick={() => setActiveTab('COMBAT')} 
          className={`tab-btn`} 
          style={{ 
            padding: '6px 2px', 
            fontSize: '11px', 
            borderRadius: '4px',
            background: activeTab === 'COMBAT' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'COMBAT' ? 'var(--accent-purple)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            fontWeight: activeTab === 'COMBAT' ? 'bold' : 'normal'
          }}
        >
          <Swords size={10} />
          <span>战斗</span>
        </button>
        <button 
          onClick={() => setActiveTab('ITEMS')} 
          className={`tab-btn`} 
          style={{ 
            padding: '6px 2px', 
            fontSize: '11px', 
            borderRadius: '4px',
            background: activeTab === 'ITEMS' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'ITEMS' ? 'var(--accent-purple)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            fontWeight: activeTab === 'ITEMS' ? 'bold' : 'normal'
          }}
        >
          <Package size={10} />
          <span>物品</span>
        </button>
        <button 
          onClick={() => setActiveTab('DICE')} 
          className={`tab-btn`} 
          style={{ 
            padding: '6px 2px', 
            fontSize: '11px', 
            borderRadius: '4px',
            background: activeTab === 'DICE' ? 'var(--bg-tertiary)' : 'transparent',
            color: activeTab === 'DICE' ? 'var(--accent-purple)' : 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
            fontWeight: activeTab === 'DICE' ? 'bold' : 'normal'
          }}
        >
          <Dices size={10} />
          <span>掷骰</span>
        </button>
      </div>

      {/* Log Feed Feed */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '6px', 
        maxHeight: '450px',
        paddingRight: '4px'
      }}>
        {filteredLogs.length === 0 ? (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '36px 0' }}>
            该分类下暂无记录发生。
          </span>
        ) : (
          filteredLogs.map((log, index) => {
            let borderLeftColor = 'var(--accent-purple)';
            let iconText = '📜';
            if (log.type === 'DICE') {
              borderLeftColor = 'var(--accent-purple)';
              iconText = '🎲';
            } else if (log.type === 'COMBAT') {
              borderLeftColor = 'var(--accent-red)';
              if (log.content.includes('👤')) iconText = '👤';
              else if (log.content.includes('❤️')) iconText = '❤️';
              else if (log.content.includes('📍')) iconText = '📍';
              else iconText = '⚔️';
            } else if (log.type === 'ITEMS') {
              borderLeftColor = 'var(--accent-amber)';
              if (log.content.includes('🎁')) iconText = '🎁';
              else if (log.content.includes('🔄')) iconText = '🔄';
              else if (log.content.includes('🧪')) iconText = '🧪';
              else iconText = '📦';
            }

            return (
              <div 
                key={index} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-light)',
                  borderLeft: `3px solid ${borderLeftColor}`,
                  borderRadius: '6px',
                  padding: '8px 10px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px', color: 'var(--text-muted)' }}>
                  <span style={{ fontWeight: 'bold', color: borderLeftColor }}>{iconText} {log.type}</span>
                  <span>{log.timestamp}</span>
                </div>
                <div 
                  style={{ color: 'var(--text-primary)', wordBreak: 'break-all', lineHeight: '140%' }}
                  dangerouslySetInnerHTML={{ __html: log.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
