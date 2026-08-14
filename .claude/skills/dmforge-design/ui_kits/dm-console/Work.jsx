const { Panel, Button, IconButton, SegmentedControl, TextInput, Select, Checkbox, Badge, StatPill, EmptyState, Modal, Toolbar, ToolbarDivider, ToolbarLabel, MapToken, TerrainChip, ItemRow, InitiativeTrack, FloatingNoteCard, SheetTable, StatusDot } = window.DMForgeDesignSystem_e4395c;
const W = window.DMF_DATA;
const CELL = 40;

function TerrainShape({ t }) {
  const hatch = 'repeating-linear-gradient(45deg, var(--pigment-' + t.tone + '-soft) 0 3px, transparent 3px 7px)';
  const base = { position: 'absolute', backgroundImage: hatch, border: (t.secret ? '1px dashed ' : '1px solid ') + 'var(--pigment-' + t.tone + '-line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', padding: '3px 5px' };
  const label = <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', letterSpacing: '.05em', color: 'var(--pigment-' + t.tone + ')' }}>{t.name}</span>;
  if (t.shape === 'circle') {
    const d = t.r * 2 * CELL;
    return <div style={{ ...base, left: (t.gridX - t.r) * CELL, top: (t.gridY - t.r) * CELL, width: d, height: d, borderRadius: '50%', alignItems: 'center', justifyContent: 'center' }}>{label}</div>;
  }
  return <div style={{ ...base, left: t.gridX * CELL, top: t.gridY * CELL, width: t.w * CELL, height: t.h * CELL }}>{label}</div>;
}

function MapWorkspace({ activeId, onActive, playerView, notes = [], onNote, focusNotes }) {
  const [tool, setTool] = React.useState('roam');
  const [inCombat, setInCombat] = React.useState(true);
  const visibleTerrain = playerView ? W.terrain.filter(t => !t.secret) : W.terrain;
  const participants = W.characters.filter(c => c.initiative).slice().sort((a, b) => b.initiative - a.initiative)
    .map(c => ({ id: c.id, name: c.name, kind: c.kind, initiative: c.initiative }));

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      {!playerView ? (
        <Toolbar style={{ borderBottom: 'var(--border-hairline)', background: 'var(--surface-panel)' }} dense>
          <Select size="sm" fullWidth={false} options={[{ value: 'm1', label: '村口酒馆大厅 (地上)' }, { value: 'm2', label: '地底秘境遗迹 (地下)' }]} style={{ width: 210 }} />
          <Button size="sm" variant="secondary" icon="plus" title="新建一张空白推演地图">新建地图</Button>
          <Button size="sm" variant="ghost" icon="sliders-horizontal" title="配置当前激活地图的名字、背景图片 URL 与网格尺幅">地图配置</Button>
          <ToolbarDivider />
          <ToolbarLabel>Tools</ToolbarLabel>
          <IconButton icon="hand" active={tool === 'roam'} onClick={() => setTool('roam')} title="选择/漫游模式（在地图上直接拖动区域更改位置，或拖拽边缘边角缩放大小）" />
          <IconButton icon="selection" active={tool === 'select'} onClick={() => setTool('select')} title="框选区域模式（在地图上拖拽出选区，框内阻挡格可进行平移或消除）" />
          <IconButton icon="wall" active={tool === 'wall'} onClick={() => setTool('wall')} title="绘制实体阻挡格" />
          <ToolbarDivider />
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
            <span>{W.campaign.width}×{W.campaign.height}</span><span>1ft = {CELL}px</span>
          </span>
          <span style={{ flex: 1 }} />
          {inCombat
            ? <Button size="sm" variant="danger" icon="flag-checkered" title="退出当前战斗模式，清除先攻行动队列" onClick={() => setInCombat(false)}>结束战斗</Button>
            : <Button size="sm" icon="sword" title="发起战斗回合，选择参战角色投先攻" onClick={() => setInCombat(true)}>发起战斗</Button>}
        </Toolbar>
      ) : null}

      {inCombat && !playerView ? (
        <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: 'var(--border-hairline)', background: 'var(--surface-app)' }}>
          <InitiativeTrack round={3} activeId={activeId} participants={participants} onSelect={onActive}
            actions={<>
              <Button size="sm" variant="secondary" icon="arrow-u-up-left" title="撤销当前回合的棋子移动，返回本回合行动起点，并完全复原移动力">撤销移动</Button>
              <Button size="sm" icon="skip-forward" title="结束该角色当前回合，移交行动权给下一位角色">结束回合</Button>
            </>} />
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', background: 'var(--surface-sunken)', backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)', backgroundSize: CELL + 'px ' + CELL + 'px', cursor: tool === 'roam' ? 'grab' : 'crosshair' }}>
        {[0, 4, 8, 12, 16].map(n => (
          <React.Fragment key={'g' + n}>
            <span style={{ position: 'absolute', left: 5, top: n * CELL + 3, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--text-faint)', pointerEvents: 'none' }}>{'Y' + String(n).padStart(2, '0')}</span>
            <span style={{ position: 'absolute', left: n * CELL + 5, bottom: 4, fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.1em', color: 'var(--text-faint)', pointerEvents: 'none' }}>{'X' + String(n).padStart(2, '0')}</span>
          </React.Fragment>
        ))}
        {(() => {
          const a = W.characters.find(c => c.id === activeId);
          if (!a) return null;
          return (
            <>
              <span style={{ position: 'absolute', left: 0, right: 0, top: a.gridY * CELL + CELL / 2, height: 1, background: 'var(--accent-line)', pointerEvents: 'none' }} />
              <span style={{ position: 'absolute', top: 0, bottom: 0, left: a.gridX * CELL + CELL / 2, width: 1, background: 'var(--accent-line)', pointerEvents: 'none' }} />
            </>
          );
        })()}
        {visibleTerrain.map(t => <TerrainShape key={t.id} t={t} />)}
        {!playerView ? W.blockedCells.map(k => {
          const [x, y] = k.split('_').map(Number);
          return <div key={k} style={{ position: 'absolute', left: x * CELL, top: y * CELL, width: CELL, height: CELL, background: 'var(--surface-hover)', border: '1px solid var(--line-strong)' }} />;
        }) : null}
        {W.characters.map(c => (
          <span key={c.id} style={{ position: 'absolute', left: c.gridX * CELL + 4, top: c.gridY * CELL + 4 }}>
            <MapToken kind={c.kind} name={c.name} size={CELL - 8} active={c.id === activeId}
              conditions={c.conditions.length} onClick={() => onActive && onActive(c.id)} />
          </span>
        ))}
        {notes.map(n => (
          <FloatingNoteCard key={n.id} title={n.title} content={n.content} tone={n.tone} minimized={n.minimized}
            width={focusNotes ? 300 : 280} height={focusNotes ? 210 : 180}
            onToggle={() => onNote && onNote(n.id, { minimized: !n.minimized })}
            onClose={() => onNote && onNote(n.id, { open: false })}
            onToneChange={tone => onNote && onNote(n.id, { tone })}
            style={{ position: 'absolute', left: n.x, top: n.y, zIndex: 20 }} />
        ))}
        {!playerView ? (
          <div style={{ position: 'absolute', right: 'var(--space-4)', bottom: 'var(--space-4)', width: 240, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <Panel code="TERRAIN" title="地形区域" style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(8px)' }} bodyStyle={{ padding: 'var(--space-3)', gap: 'var(--space-2)' }}>
              {W.terrain.map(t => <TerrainChip key={t.id} name={t.name} shape={t.shape} tone={t.tone} secret={t.secret} blocked={t.blocked} meta={t.shape === 'circle' ? 'r' + t.r : t.w + '×' + t.h} />)}
            </Panel>
          </div>
        ) : null}
        {playerView ? (
          <div style={{ position: 'absolute', left: 'var(--space-5)', bottom: 'var(--space-5)' }}>
            <Badge tone="woad" icon="eye">只读展示 · DM 私密内容已隐藏</Badge>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ItemsWorkspace() {
  const [q, setQ] = React.useState('');
  const [cat, setCat] = React.useState('ALL');
  const items = W.items.filter(i => (cat === 'ALL' || i.category === cat) && (!q || i.name.includes(q)));
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-5)', padding: 'var(--space-5)', overflow: 'hidden' }}>
      <Panel code="ITEMS" title="物品流转中心" meta={W.items.length + ' 件'} flush scroll
        actions={<Button size="sm" icon="plus">入库</Button>}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: 'var(--border-hairline)' }}>
          <TextInput size="sm" icon="magnifying-glass" value={q} onChange={e => setQ(e.target.value)} placeholder="物品名称 (自动匹配已存模板)" style={{ flex: '1 1 220px', width: 'auto' }} />
          <div style={{ flex: '1 1 380px', minWidth: 340 }}>
            <SegmentedControl value={cat} onChange={setCat} items={[{ id: 'ALL', label: '全部' }, { id: '武器', label: '武器' }, { id: '消耗品', label: '消耗品' }, { id: '护甲', label: '护甲' }, { id: '杂物', label: '杂物' }]} />
          </div>
        </div>
        {items.length ? items.map(i => (
          <ItemRow key={i.id} {...i} actions={<>
            <IconButton icon="hand-arrow-down" size="sm" title="消耗1个物品" />
            <IconButton icon="arrows-left-right" size="sm" title="转移归属" />
            <IconButton icon="trash" size="sm" tone="danger" title="彻底删除物品" />
          </>} />
        )) : <EmptyState icon="backpack" text="没有匹配的物品" hint="换个关键字，或从右侧模板快速入库。" />}
      </Panel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 0 }}>
        <Panel code="NEW" title="快速入库">
          <TextInput size="sm" label="物品名称" placeholder="物品名称 (自动匹配已存模板)" />
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <TextInput size="sm" mono label="数量" placeholder="数量" defaultValue="1" />
            <Select size="sm" label="分类" options={[{ value: 'c', label: '消耗品' }, { value: 'w', label: '武器' }, { value: 'a', label: '护甲' }]} />
          </div>
          <TextInput size="sm" multiline rows={2} label="描述效果" placeholder="描述效果" />
          <Select size="sm" label="归属" options={[{ value: 'WORLD', label: '世界物品池' }, ...W.characters.map(c => ({ value: c.id, label: c.name }))]} />
          <Button icon="check" fullWidth>入库</Button>
        </Panel>
        <Panel code="TEMPLATES" title="物品模板" meta={W.templates.length + ' 个'} scroll>
          {W.templates.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <span style={{ flex: 1, fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>{t}</span>
              <IconButton icon="arrow-fat-line-down" size="sm" title="从模板入库" />
              <IconButton icon="trash" size="sm" tone="danger" title="删除此物品模板" />
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function SheetsWorkspace() {
  const [q, setQ] = React.useState('护甲');
  const [size, setSize] = React.useState(14);
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px 1fr', gap: 'var(--space-5)', padding: 'var(--space-5)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 0 }}>
        <Panel code="SHEETS" title="已导入卡片" meta="1 / 50 表">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', borderRadius: 'var(--radius-md)' }}>
            <i className="ph-fill ph-file-xls" style={{ fontSize: 15, color: 'var(--accent)' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-meta)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{W.sheet.title}</span>
            <IconButton icon="trash" size="sm" tone="danger" title="彻底从本战役中移除此角色卡" />
          </div>
          <EmptyState compact icon="file-plus" text="拖入 .xlsx / .xls / .xlsm / .xlsb"
            hint="单文件最大 2MB，最多 50 个工作表；仅导入可信来源的工作簿。"
            action={<Button size="sm" variant="secondary" icon="upload-simple">选择文件</Button>} />
        </Panel>
        <Panel code="RULEBOOK" title="规则书">
          <EmptyState compact icon="book-open-text" text="暂无规则书" hint="导入后可点击标题直接重命名。" />
        </Panel>
      </div>
      <Panel code="TABLE" title={W.sheet.title} flush
        actions={<>
          <IconButton icon="minus" size="sm" title="减小字号" onClick={() => setSize(s => Math.max(11, s - 1))} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', minWidth: 30, textAlign: 'center' }}>{size}px</span>
          <IconButton icon="plus" size="sm" title="增大字号" onClick={() => setSize(s => Math.min(18, s + 1))} />
          <IconButton icon="arrow-counter-clockwise" size="sm" title="默认字号 (14px)" onClick={() => setSize(14)} />
        </>}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', padding: 'var(--space-4)', borderBottom: 'var(--border-hairline)' }}>
          <TextInput size="sm" icon="magnifying-glass" value={q} onChange={e => setQ(e.target.value)} placeholder="输入关键字进行高亮检索..." />
          <Button size="sm" variant="secondary" icon="x" title="清空搜索" onClick={() => setQ('')} />
          <Button size="sm" variant="secondary" icon="note" title="以浮动笔记形式钉在地图上">钉为笔记</Button>
        </div>
        <div style={{ padding: 'var(--space-4)', overflow: 'auto' }}>
          <SheetTable columns={W.sheet.columns} rows={W.sheet.rows} highlight={q} fontSize={size} />
        </div>
      </Panel>
    </div>
  );
}

function SettingsModal({ open, onClose }) {
  const [lan, setLan] = React.useState(true);
  const [pres, setPres] = React.useState(W.presentation);
  return (
    <Modal open={open} onClose={onClose} title="战役系统设置 (Campaign Settings)" icon="gear-six" width={680}
      footer={<><Button variant="secondary" onClick={onClose}>关闭</Button><Button icon="check" onClick={onClose}>保存设置</Button></>}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--type-display-sm)' }}>局域网同步</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-raised)', border: 'var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
          <StatusDot state={lan ? 'synced' : 'local'} label={lan ? '已同步 · 2 台设备' : '单机模式 · 仅本地存档'} />
          <span style={{ flex: 1 }} />
          <Checkbox checked={lan} onChange={() => setLan(!lan)} label="启用局域网能力" />
        </div>
        <TextInput label="同步令牌 (Bearer Token)" mono type="password" defaultValue="dmforge-lan-9f2c71a4e8" hint="请勿分享给不受信任的人；令牌无效时应用自动降级为单机模式。" />
        <TextInput label="配对链接 (Paired LAN URL)" mono defaultValue="http://192.168.1.24:5173/#syncToken=…" suffix="复制" />
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--type-display-sm)' }}>存档</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          <StatPill label="战役大小" value="1.2MB" sub="上限 10MB" size="sm" tone="neutral" />
          <StatPill label="角色" value={W.characters.length} size="sm" />
          <StatPill label="地图" value={W.campaign.maps} size="sm" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button variant="secondary" icon="upload-simple">导入 JSON 存档</Button>
          <Button variant="secondary" icon="download-simple">导出 JSON 存档</Button>
          <Button variant="danger" icon="warning">重置本地战役</Button>
        </div>
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>覆盖前会将旧状态复制到 <code>campaign_state_backup.json</code>；写入使用 ETag / If-Match 检测并发冲突。</p>
      </section>
      <PresentationControls settings={pres} onChange={setPres} />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <h3 style={{ fontSize: 'var(--type-display-sm)' }}>玩家展示端</h3>
        <Checkbox checked label="隐藏标记为“仅 DM 可见”的地形与笔记" hint="玩家展示端 (Read-Only) 永远无法编辑角色、物品或地图。" />
        <Checkbox label="在展示端隐藏怪物具体生命值，仅显示状态条" />
      </section>
    </Modal>
  );
}

Object.assign(window, { MapWorkspace, ItemsWorkspace, SheetsWorkspace, SettingsModal, TerrainShape });
