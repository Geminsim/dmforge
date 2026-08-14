const { Panel, Badge, Meter, Button, IconButton, SegmentedControl, StatusDot, MapToken, TerrainChip, Slider, Select, Checkbox, TextInput } = window.DMForgeDesignSystem_e4395c;
const P = window.DMF_DATA;
const PGRID = 36; /* presenter grid step, from PresenterPage.css */

const SCENES = [
  { id: 'battle', label: '战斗直播', icon: 'sword' },
  { id: 'map', label: '战术地图', icon: 'map-trifold' },
  { id: 'party', label: '队伍概览', icon: 'users-three' },
  { id: 'story', label: '剧情画面', icon: 'book-open-text' },
  { id: 'pause', label: '暂停画面', icon: 'pause' }
];

const vit = id => P.vitals[id] || { ac: 10, speed: 30 };
const activeOf = s => P.turnOrder[s.currentTurnIndex || 0];

function Key({ children }) {
  return <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--accent)' }}>{children}</span>;
}

function Vitals({ c, size = 'md' }) {
  const v = vit(c.id);
  const cell = (icon, value, sub, tone) => (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)' }}>
      <i className={'ph-fill ph-' + icon} style={{ fontSize: size === 'lg' ? 15 : 13, color: tone, transform: 'translateY(1px)' }} aria-hidden="true" />
      <b style={{ fontFamily: 'var(--font-mono)', fontSize: size === 'lg' ? 'var(--type-numeral-lg)' : 'var(--type-numeral)', fontWeight: 600 }}>{value}</b>
      {sub ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{sub}</span> : null}
    </span>
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {cell('heart', c.hp, '/' + c.maxHp, 'var(--pigment-madder)')}
      {cell('shield', v.ac, 'AC', 'var(--pigment-woad)')}
      {cell('person-simple-run', Math.round(c.speedRemaining ?? v.speed), '/' + v.speed + 'ft', 'var(--pigment-verdigris)')}
    </div>
  );
}

function Resources({ c, columns = 'repeat(auto-fit, minmax(8rem, 1fr))' }) {
  if (!c.resources || !c.resources.length) return null;
  return (
    <div style={{ display: 'grid', gap: 'var(--space-2)', gridTemplateColumns: columns }}>
      {c.resources.map(r => (
        <div key={r.name} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-raised)', boxShadow: 'inset 0 0 0 1px ' + (r.value <= 0 ? 'var(--pigment-madder-line)' : 'var(--line-hairline)'), opacity: r.value <= 0 ? 0.55 : 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-2)', minWidth: 0 }}>
            <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
            <span aria-hidden="true" style={{ flex: 1, minWidth: 6, borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
            <b style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', color: 'var(--accent)' }}>{r.value}/{r.max}</b>
          </span>
          <Meter value={r.value} max={r.max} tone="accent" showNumbers={false} segments={Math.max(4, Math.min(10, r.max))} height={5} />
        </div>
      ))}
    </div>
  );
}

function Conditions({ c }) {
  if (!c.conditions.length) return <i style={{ fontSize: 'var(--type-meta)', color: 'var(--pigment-verdigris)', fontStyle: 'italic' }}>状态正常</i>;
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>{c.conditions.map(x => <Badge key={x} tone="madder" size="md">{x} · ∞</Badge>)}</div>;
}

function Initiative({ inCombat = true, activeIndex = 0 }) {
  if (!inCombat) return <div style={{ padding: 'var(--space-5)', color: 'var(--text-faint)', fontStyle: 'italic' }}>自由行动</div>;
  return (
    <div style={{ flex: '0 0 5.5rem', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3) var(--space-5)', borderBottom: 'var(--border-hairline)', background: 'var(--surface-panel)', overflowX: 'auto' }}>
      <span style={{ minWidth: '5rem', alignSelf: 'stretch', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2, paddingRight: 'var(--space-4)', borderRight: 'var(--border-hairline)' }}>
        <Key>ROUND</Key>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-numeral-xl)', fontWeight: 700, lineHeight: 1, color: 'var(--text-body)' }}>03</strong>
      </span>
      {P.turnOrder.map((entry, i) => {
        const c = P.characters.find(x => x.id === entry.id);
        if (!c) return null;
        const on = i === activeIndex;
        return (
          <div key={entry.id} style={{ position: 'relative', minWidth: '11rem', height: '3.8rem', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: on ? 'var(--accent-soft)' : 'var(--surface-raised)', boxShadow: 'inset 0 0 0 1px ' + (on ? 'var(--accent-line)' : 'var(--line-hairline)') }}>
            <MapToken kind={c.kind} name={c.name} size={34} active={on} />
            <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <b style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--type-body-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</b>
              <small style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>先攻 {entry.total} · 顺位 {i + 1}</small>
            </span>
            {on ? <span style={{ position: 'absolute', top: -8, right: 6, padding: '1px 5px', background: 'var(--accent)', color: 'var(--text-on-accent)', fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)' }}>行动中</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function PresenterMap({ showBlocked = true, dim = false }) {
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden', background: 'var(--surface-sunken)', backgroundImage: 'linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)', backgroundSize: PGRID + 'px ' + PGRID + 'px', opacity: dim ? 0.5 : 1 }}>
      <div style={{ position: 'absolute', zIndex: 10, top: 'var(--space-4)', left: 'var(--space-4)', padding: 'var(--space-2) var(--space-4)', background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line)', backdropFilter: 'blur(8px)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-sm)' }}>{P.campaign.name}</div>
        <small style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>镜头跟随当前角色</small>
      </div>
      {[0, 4, 8, 12].map(n => (
        <React.Fragment key={n}>
          <span style={{ position: 'absolute', left: 5, top: n * PGRID + 3, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>{'Y' + String(n).padStart(2, '0')}</span>
          <span style={{ position: 'absolute', left: n * PGRID + 5, bottom: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)' }}>{'X' + String(n).padStart(2, '0')}</span>
        </React.Fragment>
      ))}
      {P.terrain.filter(t => !t.secret).map(t => {
        const circle = t.shape === 'circle';
        return (
          <div key={t.id} style={{
            position: 'absolute', left: (t.gridX - (circle ? t.r : 0)) * PGRID, top: (t.gridY - (circle ? t.r : 0)) * PGRID,
            width: (circle ? t.r * 2 : t.w) * PGRID, height: (circle ? t.h ? t.h : t.r * 2 : t.h) * PGRID,
            borderRadius: circle ? '50%' : 0, border: '1px dashed var(--pigment-' + t.tone + '-line)',
            backgroundImage: 'repeating-linear-gradient(45deg, var(--pigment-' + t.tone + '-soft) 0 3px, transparent 3px 7px)',
            display: 'grid', placeContent: 'center'
          }}>
            <span style={{ padding: '2px 6px', background: 'var(--surface-overlay)', fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: '.06em', color: 'var(--pigment-' + t.tone + ')', whiteSpace: 'nowrap' }}>{t.name}</span>
          </div>
        );
      })}
      {showBlocked ? P.blockedCells.map(k => {
        const [x, y] = k.split('_').map(Number);
        return <span key={k} style={{ position: 'absolute', left: x * PGRID, top: y * PGRID, width: PGRID, height: PGRID, backgroundImage: 'repeating-linear-gradient(45deg, var(--pigment-madder-soft) 0 4px, transparent 4px 9px)', boxShadow: 'inset 0 0 0 1px var(--pigment-madder-line)' }} />;
      }) : null}
      {P.characters.map(c => {
        const on = c.id === activeOf(P.presentation).id;
        return (
          <span key={c.id} style={{ position: 'absolute', left: c.gridX * PGRID + 2, top: c.gridY * PGRID + 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <MapToken kind={c.kind} name={c.name} size={PGRID - 4} active={on} conditions={c.conditions.length} />
            <span style={{ marginTop: 2, padding: '0 3px', background: 'var(--surface-overlay)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>{c.hp}/{c.maxHp}</span>
          </span>
        );
      })}
    </div>
  );
}

function CharacterPanel({ c }) {
  if (!c) return <aside style={{ display: 'grid', placeContent: 'center', color: 'var(--text-faint)' }}>等待当前角色…</aside>;
  return (
    <aside style={{ minWidth: 0, overflowY: 'auto', padding: 'var(--space-5)', background: 'var(--surface-panel)', borderLeft: 'var(--border-hairline)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <MapToken kind={c.kind} name={c.name} size={54} active />
        <div style={{ minWidth: 0 }}>
          <Key>当前行动角色</Key>
          <h2 style={{ margin: '2px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-md)', fontWeight: 'var(--display-weight)', letterSpacing: 'var(--display-tracking)' }}>{c.name}</h2>
        </div>
      </header>
      <Vitals c={c} size="lg" />
      <Meter value={c.hp} max={c.maxHp} temp={c.tempHp} label="生命值" />
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Key>状态效果</Key>
        <Conditions c={c} />
      </section>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <Key>动作与资源</Key>
        <Resources c={c} columns="1fr" />
      </section>
    </aside>
  );
}

function PartyScene() {
  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '5vh 5vw' }}>
      <header style={{ textAlign: 'center' }}>
        <Key>ADVENTURING PARTY</Key>
        <h1 style={{ margin: '6px 0 0', fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-lg)', fontWeight: 'var(--display-weight)', letterSpacing: 'var(--display-tracking)' }}>队伍状态</h1>
      </header>
      <div style={{ marginTop: '3vh', display: 'grid', gap: 'var(--space-5)', gridTemplateColumns: 'repeat(auto-fit, minmax(19rem, 1fr))' }}>
        {P.characters.filter(c => c.kind === 'PC').map(c => (
          <article key={c.id} style={{ position: 'relative', padding: 'var(--space-6)', background: 'var(--surface-panel)', boxShadow: 'inset 2px 0 0 var(--pigment-woad), inset 0 0 0 1px var(--line-hairline)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              <MapToken kind={c.kind} name={c.name} size={50} />
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', fontWeight: 'var(--display-weight)' }}>{c.name}</h2>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>LV{c.level} · {c.klass}</span>
              </div>
            </div>
            <Vitals c={c} />
            <Meter value={c.hp} max={c.maxHp} temp={c.tempHp} showNumbers={false} />
            <Conditions c={c} />
            <Resources c={c} />
          </article>
        ))}
      </div>
    </div>
  );
}

function StoryScene({ settings }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeContent: 'center', textAlign: 'center', padding: '8vw', background: 'var(--surface-app)', backgroundImage: 'var(--texture-surface)' }}>
      <div>
        <Key>STORY SCENE</Key>
        <h1 style={{ margin: 'var(--space-4) 0', fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', letterSpacing: 'var(--display-tracking)', fontSize: 'clamp(2.5rem, 7vw, 6rem)', lineHeight: 1.1 }}>{settings.storyTitle}</h1>
        <p style={{ margin: 0, fontSize: 'var(--type-display-md)', color: 'var(--text-muted)' }}>{settings.storySubtitle}</p>
      </div>
    </div>
  );
}

function PauseScene({ settings }) {
  return (
    <div style={{ height: '100%', display: 'grid', placeContent: 'center', textAlign: 'center', padding: '8vw' }}>
      <div>
        <i className="ph-fill ph-pause" style={{ fontSize: '4rem', color: 'var(--text-faint)' }} aria-hidden="true" />
        <h1 style={{ margin: 'var(--space-4) 0', fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'clamp(2rem, 5vw, 4rem)' }}>{settings.pausedMessage}</h1>
        <p style={{ margin: 0, fontFamily: 'var(--font-label)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>DMFORGE · 战役直播展示</p>
      </div>
    </div>
  );
}

function PresenterContent({ settings }) {
  const active = P.characters.find(c => c.id === activeOf(settings).id);
  if (settings.scene === 'pause') return <PauseScene settings={settings} />;
  if (settings.scene === 'story') return <StoryScene settings={settings} />;
  if (settings.scene === 'party') return <PartyScene />;
  if (settings.scene === 'map') {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {settings.showInitiative ? <Initiative /> : null}
        <PresenterMap showBlocked={settings.showBlockedCells} />
      </div>
    );
  }
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {settings.showInitiative ? <Initiative /> : null}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: settings.showCharacterPanel ? 'minmax(0,1fr) minmax(18rem,25%)' : '1fr' }}>
        <PresenterMap showBlocked={settings.showBlockedCells} />
        {settings.showCharacterPanel ? <CharacterPanel c={active} /> : null}
      </div>
      {settings.showPublicEvents ? (
        <div style={{ flex: '0 0 auto', display: 'flex', gap: 'var(--space-5)', padding: 'var(--space-3) var(--space-5)', borderTop: 'var(--border-hairline)', background: 'var(--surface-panel)', overflow: 'hidden' }}>
          {P.publicEvents.slice(0, 3).map((e, i) => (
            <span key={i} style={{ flex: 1, minWidth: 0, display: 'flex', gap: 'var(--space-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{e.timestamp}</span>{e.content}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** The /presenter route: audience-facing, so it runs in the player type register. */
function PresenterPage({ theme = 'grimoire', scene, onScene }) {
  const [state, setState] = React.useState(P.presentation);
  const set = patch => setState(s => ({ ...s, ...patch }));
  const settings = scene ? { ...state, scene } : state;
  return (
    <div data-theme={theme} data-view="player" style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'var(--surface-app)', fontSize: 'calc(var(--type-body) * ' + settings.fontScale + ')' }}>
      <PresenterContent settings={settings} />
      {settings.caption ? (
        <div style={{ position: 'absolute', zIndex: 40, left: '50%', bottom: '5%', transform: 'translateX(-50%)', maxWidth: '85%', padding: 'var(--space-4) var(--space-6)', background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line), var(--shadow-float)', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', fontWeight: 'var(--display-weight)' }}>{settings.caption}</div>
      ) : null}
      {onScene ? null : (
        <div style={{ position: 'absolute', zIndex: 60, right: 'var(--space-4)', bottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--surface-overlay)', boxShadow: 'inset 0 0 0 1px var(--bracket-line)', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>控制端模拟</span>
          <div style={{ width: 420 }}>
            <SegmentedControl value={settings.scene} onChange={s => set({ scene: s })} items={SCENES.map(s => ({ id: s.id, label: s.label, icon: s.icon }))} />
          </div>
        </div>
      )}
      <button type="button" title="切换全屏" style={{ position: 'absolute', zIndex: 50, right: 'var(--space-4)', bottom: 'var(--space-4)', width: 34, height: 34, display: 'grid', placeContent: 'center', opacity: 0.25, background: 'var(--surface-panel)', border: 'none', boxShadow: 'inset 0 0 0 1px var(--bracket-line)', color: 'var(--text-body)', cursor: 'pointer' }}>
        <i className="ph-fill ph-corners-out" style={{ fontSize: 14 }} aria-hidden="true" />
      </button>
    </div>
  );
}

/** DM-side block, lives in the campaign settings modal. */
function PresentationControls({ settings, onChange }) {
  const set = patch => onChange({ ...settings, ...patch });
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <h3 style={{ fontSize: 'var(--type-display-sm)' }}>Discord 直播展示窗口</h3>
        <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
        <StatusDot state="synced" label="已连接" />
      </div>
      <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
        战斗和地图场景直接复用完整玩家展示端，并同步镜头、棋子拖动路径和移动力估算；只接收过滤后的公开数据，不显示 DM 笔记、隐藏地形或同步令牌。
      </p>
      <SegmentedControl value={settings.scene} onChange={scene => set({ scene })} items={SCENES.map(s => ({ id: s.id, label: s.label, icon: s.icon }))} size="md" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Select label="镜头模式" size="sm" value={settings.cameraMode} onChange={e => set({ cameraMode: e.target.value })} options={[
          { value: 'follow-active', label: '跟随当前行动角色' },
          { value: 'follow-dm', label: '跟随 DM 地图镜头' },
          { value: 'independent', label: '展示页独立镜头' }
        ]} />
        <Slider label="界面字号" min={0.75} max={1.5} step={0.05} value={settings.fontScale}
          onChange={e => set({ fontScale: Number(e.target.value) })} format={v => Math.round(v * 100) + '%'} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)' }}>
        <Checkbox checked={settings.showInitiative} onChange={() => set({ showInitiative: !settings.showInitiative })} label="显示先攻队列" />
        <Checkbox checked={settings.showCharacterPanel} onChange={() => set({ showCharacterPanel: !settings.showCharacterPanel })} label="显示角色面板" />
        <Checkbox checked={settings.showPublicEvents} onChange={() => set({ showPublicEvents: !settings.showPublicEvents })} label="显示公开事件" />
        <Checkbox checked={settings.showBlockedCells} onChange={() => set({ showBlockedCells: !settings.showBlockedCells })} label="显示玩家可见阻挡格" />
        <Checkbox checked={settings.hideCursor} onChange={() => set({ hideCursor: !settings.hideCursor })} label="隐藏鼠标" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', color: 'var(--text-faint)' }}>直播角色可见性（默认全部公开）</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', maxHeight: 110, overflowY: 'auto', padding: 'var(--space-3)', background: 'var(--surface-sunken)', boxShadow: 'inset 0 0 0 1px var(--line-hairline)' }}>
          {P.characters.map(c => {
            const hidden = (settings.hiddenCharacterIds || []).includes(c.id);
            return <Checkbox key={c.id} checked={!hidden} onChange={() => set({ hiddenCharacterIds: hidden ? settings.hiddenCharacterIds.filter(id => id !== c.id) : [...settings.hiddenCharacterIds, c.id] })}
              label={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}><span style={{ width: 8, height: 8, background: c.kind === 'PC' ? 'var(--pigment-woad)' : 'var(--pigment-madder)' }} />{c.name}</span>} />;
          })}
        </div>
      </div>
      <TextInput size="sm" value={settings.caption} onChange={e => set({ caption: e.target.value })} placeholder="直播字幕（留空则隐藏）" label="字幕" />
      {settings.scene === 'story' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextInput size="sm" label="剧情标题" value={settings.storyTitle} onChange={e => set({ storyTitle: e.target.value })} />
          <TextInput size="sm" label="剧情副标题" value={settings.storySubtitle} onChange={e => set({ storySubtitle: e.target.value })} placeholder="剧情副标题" />
        </div>
      ) : null}
      {settings.scene === 'pause' ? <TextInput size="sm" label="暂停画面文字" value={settings.pausedMessage} onChange={e => set({ pausedMessage: e.target.value })} /> : null}
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <Button icon="monitor-play">打开直播窗口</Button>
        <Button variant="secondary" icon="crosshair">定位展示窗口</Button>
        <Button variant="secondary" icon="corners-out">请求全屏</Button>
        <Button variant="danger" icon="x">关闭</Button>
      </div>
      <p style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>弹窗被阻止？可在新标签页打开 <code>/presenter?session={settings.sessionId}</code></p>
    </section>
  );
}

Object.assign(window, { PresenterPage, PresentationControls, PresenterScenes: SCENES });
