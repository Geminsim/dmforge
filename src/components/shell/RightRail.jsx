import React, { useState } from 'react';
import { Panel, SegmentedControl, Button } from '../../ds';
import DicePane from '../DicePane';
import LogPane from '../LogPane';
import NotesPane from '../NotesPane';

/**
 * One rail, one pane at a time.
 *
 * The source app stacked the dice roller, the log feed and the note list in
 * this column simultaneously, which left all three fighting for height in the
 * densest part of the product — the log in particular was capped at 450px and
 * scrolled inside a panel that was itself scrolling. Showing one at a time
 * gives whichever the DM is actually using the full column and its own scroll.
 */

const PANES = [
  { id: 'character', code: 'CHAR', label: '角色', icon: 'identification-card', title: '角色完整信息' },
  { id: 'dice', code: 'DICE', label: '掷骰', icon: 'dice-six', title: '核心掷骰器', meta: 'd4 – d100' },
  { id: 'log', code: 'LOG', label: '日志', icon: 'scroll', title: '战役历史记录' },
  { id: 'notes', code: 'NOTES', label: '笔记', icon: 'note', title: '对话笔记' }
];

function RightRail({
  addLog,
  logs,
  setLogs,
  floatingNotes,
  addFloatingNote,
  updateFloatingNote,
  deleteFloatingNote,
  selectedCharacter
}) {
  const [pane, setPane] = useState('dice');
  React.useEffect(() => { if (selectedCharacter?.id) setPane('character'); }, [selectedCharacter?.id]);
  const active = PANES.find(p => p.id === pane) || PANES[0];

  const meta =
    pane === 'character' ? (selectedCharacter ? `Lv.${selectedCharacter.level || 1} · ${selectedCharacter.type === 'PC' ? '玩家角色' : '敌对角色'}` : '未选择')
      : pane === 'log' ? `${logs.length} 条`
      : pane === 'notes' ? `${floatingNotes.length} 条`
        : active.meta;

  const actions =
    pane === 'log' ? (
      <Button
        size="sm"
        variant="danger"
        icon="trash"
        title="清空所有战役历史记录"
        onClick={() => {
          if (window.confirm('确定要清空所有战役历史记录吗？（此操作不可撤销）')) {
            setLogs && setLogs([]);
          }
        }}
      >
        清空
      </Button>
    ) : null;

  return (
    <Panel
      code={active.code}
      title={active.title}
      meta={meta}
      actions={actions}
      brackets={false}
      style={{ flex: 1, minHeight: 0, minWidth: 0, background: 'transparent' }}
      bodyStyle={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflowY: 'auto',
        padding: 'var(--space-4)',
        gap: 'var(--space-4)'
      }}
    >
      <SegmentedControl
        value={pane}
        onChange={setPane}
        size="md"
        items={PANES.map(p => ({ id: p.id, label: p.label, icon: p.icon }))}
      />

      <div id="dmforge-character-detail-portal" style={{ display: pane === 'character' ? 'block' : 'none', minWidth: 0 }}>
        {pane === 'character' && !selectedCharacter ? <p style={{ color: 'var(--text-faint)', textAlign: 'center' }}>点击左侧角色卡以查看完整信息。</p> : null}
      </div>

      {pane === 'dice' ? <DicePane addLog={addLog} /> : null}
      {pane === 'log' ? <LogPane logs={logs} /> : null}
      {pane === 'notes' ? (
        <NotesPane
          notes={floatingNotes}
          addFloatingNote={addFloatingNote}
          updateFloatingNote={updateFloatingNote}
          deleteFloatingNote={deleteFloatingNote}
        />
      ) : null}
    </Panel>
  );
}

export default React.memo(RightRail);
