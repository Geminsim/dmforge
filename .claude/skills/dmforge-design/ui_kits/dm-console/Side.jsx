const { Panel, Button, IconButton, SegmentedControl, TextInput, Badge, StatPill, Meter, ResourceSlot, EmptyState, CharacterCard, LogEntry, DiceButton, RollResult, Toolbar, ToolbarDivider } = window.DMForgeDesignSystem_e4395c;
const DD = window.DMF_DATA;

function GroupHeading({ name, count, tone = 'neutral' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-sunken)', borderTop: 'var(--border-hairline)', borderBottom: 'var(--border-hairline)' }}>
      <i className="ph-fill ph-folder" style={{ fontSize: 12, color: 'var(--text-faint)' }} aria-hidden="true" />
      <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', fontWeight: 'var(--weight-medium)' }}>{name}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{count}</span>
      <span style={{ flex: 1 }} />
      <IconButton icon="pencil-simple" size="sm" title="更名与改色" />
      <IconButton icon="trash" size="sm" tone="danger" title="删除分组" />
    </div>
  );
}

function CharacterSheet({ c }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: 'var(--border-hairline)' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {Object.entries(c.stats).map(([k, v]) => <StatPill key={k} label={k} value={v} size="sm" />)}
      </div>
      {c.resources.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <span style={{ fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>资源槽</span>
          {c.resources.map(r => <ResourceSlot key={r.name} {...r} onSpend={() => {}} onRestore={() => {}} onDelete={() => {}} />)}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <TextInput size="sm" placeholder="新增槽名 (如: 法术位)" />
            <TextInput size="sm" mono placeholder="上限" style={{ width: 68 }} fullWidth={false} />
            <Button size="sm" variant="secondary" icon="plus" title="新增资源槽" />
          </div>
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={{ fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>特质与技能</span>
        {Object.entries(c.feats).map(([name, desc]) => (
          <div key={name} style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-panel)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--type-body-sm)', fontWeight: 'var(--weight-medium)' }}>{name}</div>
              <div style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{desc}</div>
            </div>
            <IconButton icon="trash" size="sm" tone="danger" title="删除此特质/技能" />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        <Button size="sm" variant="secondary" icon="campfire" title="对选中的角色进行短休（恢复50%生命值，充能重置短休/回合资源）">短休</Button>
        <Button size="sm" variant="secondary" icon="moon-stars" title="对选中的角色进行长休（恢复全部生命值/资源槽，重置移动力，且彻底清除负面状态）">长休</Button>
        <Button size="sm" variant="ghost" icon="copy" title="快速复制此角色及所有当前属性和技能资源槽">复制角色</Button>
      </div>
    </div>
  );
}

function RosterPanel({ activeId, expandedId, onExpand, onSelect }) {
  const [filter, setFilter] = React.useState('ALL');
  const list = DD.characters.filter(c => filter === 'ALL' || (filter === 'PC' ? c.kind === 'PC' : c.kind !== 'PC'));
  return (
    <>
      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', borderBottom: 'var(--border-hairline)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--accent)' }}>ROSTER</span>
          <h3 style={{ fontSize: 'var(--type-display-sm)' }}>角色与分组</h3>
          <span style={{ flex: 1 }} />
          <Button size="sm" icon="plus">新建角色</Button>
        </div>
        <SegmentedControl value={filter} onChange={setFilter} items={[
          { id: 'ALL', label: '全部', count: DD.characters.length },
          { id: 'PC', label: '玩家', count: DD.characters.filter(c => c.kind === 'PC').length },
          { id: 'NPC', label: '怪物与NPC', count: DD.characters.filter(c => c.kind !== 'PC').length }
        ]} />
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <TextInput size="sm" icon="folder-plus" placeholder="新建分组名称 (如: 地牢伏兵)..." />
          <Button size="sm" variant="secondary" icon="check" title="创建新角色分组" />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {DD.groups.map(g => {
          const members = list.filter(c => c.group === g.id);
          if (!members.length) return null;
          return (
            <React.Fragment key={g.id}>
              <GroupHeading name={g.name} count={members.length} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                {members.map(c => (
                  <CharacterCard key={c.id} name={c.name} kind={c.kind} level={c.level} klass={c.klass}
                    hp={c.hp} maxHp={c.maxHp} tempHp={c.tempHp} conditions={c.conditions}
                    speedRemaining={c.speedRemaining} activeTurn={c.id === activeId}
                    onSelect={() => { onSelect(c.id); onExpand(c.id); }}
                    actions={<IconButton icon={expandedId === c.id ? 'caret-up' : 'caret-down'} size="sm" title="展开角色卡" />}>
                    {expandedId === c.id ? <CharacterSheet c={c} /> : null}
                  </CharacterCard>
                ))}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
}

function PlayerRoster({ activeId }) {
  return (
    <Panel code="PARTY" title="队伍状态" tone="panel">
      {DD.characters.filter(c => c.kind === 'PC').map(c => (
        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', paddingBottom: 'var(--space-3)', borderBottom: 'var(--border-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ flex: 1, fontSize: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{c.name}</span>
            {c.id === activeId ? <Badge tone="accent" size="sm">行动中</Badge> : null}
          </div>
          <Meter value={c.hp} max={c.maxHp} temp={c.tempHp} />
          {c.conditions.length ? <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>{c.conditions.map(x => <Badge key={x} tone="ochre" size="sm">{x}</Badge>)}</div> : null}
        </div>
      ))}
      <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-faint)', fontStyle: 'italic', lineHeight: 'var(--type-body-lh)' }}>玩家展示端为只读视图：隐藏 DM 私密地形、笔记与怪物属性。</p>
    </Panel>
  );
}

function DicePane() {
  const [formula, setFormula] = React.useState('2d20kh1+5');
  const [open, setOpen] = React.useState(false);
  const history = open ? DD.rolls.slice(1) : DD.rolls.slice(1, 2);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
        {[4, 6, 8, 10, 12, 20, 100].map(s => <DiceButton key={s} sides={s} />)}
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', minWidth: 0 }}>
        <TextInput mono value={formula} onChange={e => setFormula(e.target.value)} placeholder="2d6+4 或 2d20kh1+5" />
        <Button icon="dice-six" title="投掷自定义公式" />
      </div>
      <RollResult emphasis {...DD.rolls[0]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 0, background: 'transparent', border: 'none', color: 'var(--text-faint)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', cursor: 'pointer' }}>
          <i className={'ph-fill ph-caret-' + (open ? 'down' : 'right')} style={{ fontSize: 10 }} />历史 {DD.rolls.length - 1}
        </button>
        {history.map((r, i) => <RollResult key={i} {...r} />)}
      </div>
    </div>
  );
}

function LogPane() {
  const [cat, setCat] = React.useState('ALL');
  const logs = DD.logs.filter(l => cat === 'ALL' || l.type === cat).slice().reverse();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 0, minWidth: 0, flex: 1 }}>
      <SegmentedControl value={cat} onChange={setCat} items={[
        { id: 'ALL', label: '全部', icon: 'stack' },
        { id: 'COMBAT', label: '战斗', icon: 'sword' },
        { id: 'ITEMS', label: '物品', icon: 'backpack' },
        { id: 'DICE', label: '掷骰', icon: 'dice-six' }
      ]} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
        {logs.length ? logs.map((l, i) => <LogEntry key={i} {...l} />) : <EmptyState compact icon="scroll" text="该分类下暂无记录发生。" />}
      </div>
    </div>
  );
}

function NotesPane({ notes, onToggle }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minHeight: 0, minWidth: 0, flex: 1 }}>
      <Button icon="plus" fullWidth>新建悬浮对话笔记</Button>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0 }}>
        {notes.length ? notes.map(n => (
          <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', border: 'var(--border-hairline)', borderLeft: '2px solid var(--pigment-' + n.tone + ')', borderRadius: 'var(--radius-md)', opacity: n.open ? 1 : 0.55, minWidth: 0 }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-meta)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
            <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
              <IconButton icon={n.open ? 'eye' : 'eye-closed'} size="sm" title={n.open ? '点击隐藏浮动卡片' : '点击显示浮动卡片'} onClick={() => onToggle(n.id)} />
              <IconButton icon="trash" size="sm" tone="danger" title="永久删除" />
            </span>
          </div>
        )) : <EmptyState compact icon="note" text="暂无保存的对话笔记" hint="可点击上方按钮创建。" />}
      </div>
    </div>
  );
}

const PANES = [
  { id: 'dice', code: 'DICE', label: '掷骰', icon: 'dice-six', title: '核心掷骰器', meta: 'd4 – d100' },
  { id: 'log', code: 'LOG', label: '日志', icon: 'scroll', title: '战役历史记录', meta: DD.logs.length + ' 条' },
  { id: 'notes', code: 'NOTES', label: '笔记', icon: 'note', title: '对话笔记', meta: null }
];

/** One right-hand rail, one pane at a time — replaces the old three stacked panels. */
function RightRail({ defaultPane = 'dice', notes = [], onToggleNote }) {
  const [pane, setPane] = React.useState(defaultPane);
  const active = PANES.find(p => p.id === pane) || PANES[0];
  const meta = pane === 'notes' ? notes.length + ' 条' : active.meta;
  return (
    <Panel code={active.code} title={active.title} meta={meta}
      style={{ flex: 1, minHeight: 0, border: 'none', borderRadius: 0, background: 'transparent', boxShadow: 'none' }}
      bodyStyle={{ padding: 'var(--space-4)', gap: 'var(--space-4)', flex: 1, minHeight: 0, minWidth: 0, overflowY: 'auto' }}
      actions={pane === 'log'
        ? <Button size="sm" variant="danger" icon="trash" title="清空所有战役历史记录">清空</Button>
        : pane === 'dice' ? <IconButton icon="arrow-counter-clockwise" size="sm" title="清空投掷历史" /> : null}>
      <SegmentedControl value={pane} onChange={setPane} items={PANES.map(p => ({ id: p.id, label: p.label, icon: p.icon }))} size="md" />
      {pane === 'dice' ? <DicePane /> : pane === 'log' ? <LogPane /> : <NotesPane notes={notes} onToggle={onToggleNote} />}
    </Panel>
  );
}

Object.assign(window, { RosterPanel, PlayerRoster, RightRail, DicePane, LogPane, NotesPane, CharacterSheet });
