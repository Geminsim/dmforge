const DS = window.DMForgeDesignSystem_e4395c;
const { Tabs, IconButton, Button, ThemeSwitcher, StatusDot, StatusLine, SegmentedControl, Badge, ResizeHandle } = DS;
const D = window.DMF_DATA;

/* Falls back to a local render if the compiled bundle predates StatusLine. */
const Status = StatusLine || function Status({ items = [], right = [] }) {
  const cell = (v, i) => (
    <span key={i} style={{ display: 'inline-flex', gap: 'var(--space-2)', whiteSpace: 'nowrap' }}>
      {v.label ? <span style={{ letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>{v.label}</span> : null}
      <span style={{ color: v.tone === 'accent' ? 'var(--accent)' : v.tone ? 'var(--pigment-' + v.tone + ')' : 'var(--text-muted)' }}>{v.value}</span>
    </span>
  );
  return (
    <div style={{ height: 26, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-6)', padding: '0 var(--space-5)', background: 'var(--surface-panel)', borderTop: 'var(--border-hairline)', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', overflow: 'hidden' }}>
      {items.map(cell)}<span style={{ flex: 1 }} />{right.map(cell)}
    </div>
  );
};

const THEME_KEY = 'dmforge-kit-theme';

function useTheme() {
  const [theme, setTheme] = React.useState(() => {
    try { return localStorage.getItem(THEME_KEY) || 'grimoire'; } catch { return 'grimoire'; }
  });
  const set = t => { setTheme(t); try { localStorage.setItem(THEME_KEY, t); } catch {} };
  return [theme, set];
}

const SCREENS = [
  { id: 'map', label: '战术地图主视图' },
  { id: 'roster', label: '角色名册与角色卡' },
  { id: 'dice', label: '掷骰器与战役日志' },
  { id: 'items', label: '物品流转中心' },
  { id: 'sheets', label: '玩家卡与规则书导入' },
  { id: 'settings', label: '战役系统设置' },
  { id: 'player', label: '玩家展示端（只读）' },
  { id: 'notes', label: '浮动笔记工作台' },
  { id: 'presenter', label: '直播展示端（Presenter）' }
];

function ScreenPicker({ value, onChange }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
      <select value={value} onChange={e => onChange(e.target.value)} aria-label="页面"
        style={{
          appearance: 'none', height: 'var(--control-h-sm)', padding: '0 26px 0 10px',
          background: 'var(--surface-sunken)', color: 'var(--text-body)', border: 'none',
          boxShadow: 'inset 0 0 0 1px var(--line-hairline)', borderRadius: 0,
          fontFamily: 'var(--font-sans)', fontSize: 'var(--type-meta)', cursor: 'pointer'
        }}>
        {SCREENS.map((s, i) => <option key={s.id} value={s.id}>{String(i + 1).padStart(2, '0')} · {s.label}</option>)}
      </select>
      <i className="ph-fill ph-caret-down" aria-hidden="true" style={{ position: 'absolute', right: 9, fontSize: 9, color: 'var(--text-faint)', pointerEvents: 'none' }} />
    </span>
  );
}

function Header({ theme, onTheme, playerView, onPlayerView, onSettings, screen, onScreen }) {
  return (
    <header style={{ height: 'var(--shell-header-h)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-5)', padding: '0 var(--space-6)', background: 'var(--surface-panel)', borderBottom: 'var(--border-hairline)' }}>
      <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 21, letterSpacing: '.02em', color: 'var(--text-body)' }}>D<span style={{ color: 'var(--accent)' }}>M</span>Forge</span>
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', letterSpacing: '.06em', color: 'var(--text-faint)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        CAMPAIGN / {D.campaign.name} · {D.campaign.chapter}
      </span>
      {playerView ? <Badge tone="woad" icon="eye">玩家展示端 (Read-Only)</Badge> : null}
      <span style={{ flex: 1 }} />
      {onScreen ? <ScreenPicker value={screen} onChange={onScreen} /> : null}
      <StatusDot state="synced" label="已同步 · 2 台设备" />
      <ThemeSwitcher value={theme} onChange={onTheme} />
      <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <IconButton icon="eye" title="切换玩家展示端" active={playerView} onClick={onPlayerView} />
        <IconButton icon="floppy-disk" title="导出完整 JSON 存档" />
        <IconButton icon="gear-six" title="打开全局战役与多端系统设置面板" onClick={onSettings} />
      </span>
    </header>
  );
}

const WORKSPACES = [
  { id: 'map', label: '1ft 战术地图', icon: 'map-trifold' },
  { id: 'items', label: '物品流转中心', icon: 'backpack' },
  { id: 'excel', label: '玩家卡与规则书导入', icon: 'table' }
];

/**
 * screen: map | roster | dice | items | sheets | settings | player | notes
 */
function KitPage({ screen: initialScreen = 'map', picker = false }) {
  const [theme, setTheme] = useTheme();
  const [screen, setScreenState] = React.useState(initialScreen);
  const [tab, setTab] = React.useState(initialScreen === 'items' ? 'items' : initialScreen === 'sheets' ? 'excel' : 'map');
  const [playerView, setPlayerView] = React.useState(initialScreen === 'player');
  const [settingsOpen, setSettingsOpen] = React.useState(initialScreen === 'settings');
  const [activeId, setActiveId] = React.useState('char_player_a');
  const [expandedId, setExpandedId] = React.useState(initialScreen === 'roster' ? 'char_player_a' : null);
  const [notes, setNotes] = React.useState(D.notes);
  const [scene, setScene] = React.useState('battle');

  const setScreen = next => {
    setScreenState(next);
    setTab(next === 'items' ? 'items' : next === 'sheets' ? 'excel' : 'map');
    setPlayerView(next === 'player');
    setSettingsOpen(next === 'settings');
    setExpandedId(next === 'roster' ? 'char_player_a' : null);
  };
  const pickerProps = picker ? { screen, onScreen: setScreen } : {};

  const leftWidth = screen === 'roster' ? 440 : 360;
  const rightWidth = screen === 'dice' ? 400 : 360;
  const showNotes = screen === 'notes' || screen === 'map';

  React.useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  React.useEffect(() => { window.__dmfSetTheme = setTheme; return () => { delete window.__dmfSetTheme; }; }, []);

  if (screen === 'presenter') {
    return (
      <div style={{ height: '100%', minWidth: 1360, display: 'flex', flexDirection: 'column', background: 'var(--surface-app)' }}>
        <div data-theme={theme} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', height: 40, flexShrink: 0, padding: '0 var(--space-5)', background: 'var(--surface-panel)', borderBottom: 'var(--border-hairline)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>D<span style={{ color: 'var(--accent)' }}>M</span>Forge</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', letterSpacing: '.06em', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>/presenter · session a7f3c1</span>
          <span style={{ width: 540, flexShrink: 0 }}>
            <SegmentedControl value={scene} onChange={setScene} items={PresenterScenes.map(s => ({ id: s.id, label: s.label, icon: s.icon }))} />
          </span>
          <StatusDot state="synced" label="控制端已连接" style={{ flexShrink: 0, whiteSpace: 'nowrap' }} />
          <span style={{ flex: 1 }} />
          {picker ? <ScreenPicker value={screen} onChange={setScreen} /> : null}
          <ThemeSwitcher value={theme} onChange={setTheme} />
        </div>
        <div style={{ flex: 1, minHeight: 0 }}><PresenterPage theme={theme} scene={scene} onScene={setScene} /></div>
      </div>
    );
  }

  const center = (
    <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', position: 'relative', overflow: 'hidden' }}>
      {!playerView ? <Tabs value={tab} onChange={setTab} items={WORKSPACES} /> : null}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'map' ? (
          <MapWorkspace activeId={activeId} onActive={setActiveId} playerView={playerView}
            notes={showNotes ? notes.filter(n => n.open) : []}
            onNote={(id, patch) => setNotes(ns => ns.map(n => n.id === id ? { ...n, ...patch } : n))}
            focusNotes={screen === 'notes'} />
        ) : tab === 'items' ? <ItemsWorkspace /> : <SheetsWorkspace />}
      </div>
    </main>
  );

  if (playerView) {
    return (
      <div data-theme={theme} data-view="player" style={shellStyle}>
        <Header theme={theme} onTheme={setTheme} playerView onPlayerView={() => setPlayerView(false)} onSettings={() => setSettingsOpen(true)} {...pickerProps} />
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {center}
          <ResizeHandle />
          <aside style={{ width: 300, flexShrink: 0, background: 'var(--surface-panel)', borderLeft: 'var(--border-hairline)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', overflowY: 'auto' }}>
            <PlayerRoster activeId={activeId} />
          </aside>
        </div>
        <Status items={[{ label: 'VIEW', value: 'PLAYER · READ-ONLY' }, { label: 'ROUND', value: '03' }, { label: 'MAP', value: D.campaign.width + '×' + D.campaign.height + ' · 1FT=' + D.campaign.cell + 'PX' }]}
          right={[{ label: 'LAN', value: '192.168.1.24', tone: 'verdigris' }]} />
      </div>
    );
  }

  return (
    <div data-theme={theme} style={shellStyle}>
      <Header theme={theme} onTheme={setTheme} playerView={false} onPlayerView={() => setPlayerView(true)} onSettings={() => setSettingsOpen(true)} {...pickerProps} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <aside style={{ width: leftWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-panel)', borderRight: 'var(--border-hairline)' }}>
          <RosterPanel activeId={activeId} expandedId={expandedId} onExpand={id => setExpandedId(e => e === id ? null : id)} onSelect={setActiveId} />
        </aside>
        <ResizeHandle />
        {center}
        <ResizeHandle />
        <aside style={{ width: rightWidth, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, overflow: 'hidden', background: 'var(--surface-panel)', borderLeft: 'var(--border-hairline)' }}>
          <RightRail defaultPane={screen === 'notes' ? 'notes' : screen === 'dice' ? 'dice' : screen === 'map' ? 'dice' : 'log'}
            notes={notes} onToggleNote={id => setNotes(ns => ns.map(n => n.id === id ? { ...n, open: !n.open } : n))} />
        </aside>
      </div>
      <Status
        items={[
          { label: 'ROUND', value: '03' },
          { label: 'TURN', value: (D.characters.find(c => c.id === activeId) || {}).name, tone: 'accent' },
          { label: 'MAP', value: D.campaign.width + '×' + D.campaign.height + ' · 1FT=' + D.campaign.cell + 'PX' },
          { label: 'TOOL', value: 'ROAM' }
        ]}
        right={[{ label: 'SAVE', value: '1.2MB / 10MB' }, { label: 'LAN', value: '192.168.1.24', tone: 'verdigris' }]} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

const shellStyle = { height: '100%', minWidth: 1360, display: 'flex', flexDirection: 'column', background: 'var(--surface-app)', overflow: 'hidden' };

Object.assign(window, { KitPage, Header, ScreenPicker, SCREENS, useTheme });
