const scenes = [
  ['battle', '⚔️ 战斗直播'], ['map', '🗺️ 战术地图'], ['party', '👥 队伍概览'], ['story', '🎭 剧情画面'], ['pause', '⏸️ 暂停画面']
];

export default function PresentationControls({ settings, setSettings, characters, connected, windowOpen, fallbackUrl, onOpen, onOpenTab, onFocus, onClose, onRequestFullscreen }) {
  const update = patch => setSettings(current => ({ ...current, ...patch }));
  return <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
      <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-purple)' }}>📺 Discord 直播展示窗口</label>
      <span style={{ fontSize: '9px', color: connected ? '#34d399' : windowOpen ? '#fbbf24' : '#94a3b8' }}>{connected ? '● 已连接' : windowOpen ? '● 正在连接' : '○ 未打开'}</span>
    </div>
    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '10px' }}>战斗和地图场景直接复用完整玩家展示端，并同步镜头、棋子拖动路径和移动力估算；只接收过滤后的公开数据，不显示 DM 笔记、隐藏地形或同步令牌。</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px' }}>
      {scenes.map(([value, label]) => <button key={value} type="button" className={`btn ${settings.scene === value ? 'btn-primary' : 'btn-secondary'}`} onClick={() => update({ scene: value })} style={{ minWidth: 0, height: '38px', padding: '4px 3px', fontSize: '9px' }}>{label}</button>)}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>镜头模式
        <select className="input-text" value={settings.cameraMode} onChange={event => update({ cameraMode: event.target.value })} style={{ width: '100%', marginTop: '4px', height: '30px', fontSize: '10px' }}>
          <option value="follow-active">跟随当前行动角色</option><option value="follow-dm">跟随 DM 地图镜头</option><option value="independent">展示页独立镜头</option>
        </select>
      </label>
      <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>界面字号：{Math.round(settings.fontScale * 100)}%
        <input type="range" min="0.75" max="1.5" step="0.05" value={settings.fontScale} onChange={event => update({ fontScale: Number(event.target.value) })} style={{ width: '100%', marginTop: '9px', accentColor: 'var(--accent-purple)' }} />
      </label>
    </div>
    <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap', fontSize: '10px' }}>
      {[['showBlockedCells', '显示玩家可见阻挡格'], ['hideCursor', '隐藏鼠标']].map(([key, label]) => <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)' }}><input type="checkbox" checked={Boolean(settings[key])} onChange={event => update({ [key]: event.target.checked })} />{label}</label>)}
    </div>
    <details style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
      <summary style={{ cursor: 'pointer' }}>直播角色可见性（默认全部公开）</summary>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', maxHeight: '110px', overflowY: 'auto', marginTop: '6px', padding: '6px', background: 'rgba(0,0,0,.15)', borderRadius: '6px' }}>
        {characters.map(character => { const hiddenIds = settings.hiddenCharacterIds || []; const visible = !hiddenIds.includes(character.id); return <label key={character.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={visible} onChange={() => update({ hiddenCharacterIds: visible ? [...hiddenIds, character.id] : hiddenIds.filter(id => id !== character.id) })} />{character.type === 'PC' ? '🔵' : '🔴'} {character.name}</label>; })}
      </div>
    </details>
    <input className="input-text" value={settings.caption} onChange={event => update({ caption: event.target.value })} placeholder="直播字幕（留空则隐藏）" maxLength={500} style={{ fontSize: '10px', height: '30px' }} />
    {settings.scene === 'story' && <><input className="input-text" value={settings.storyTitle} onChange={event => update({ storyTitle: event.target.value })} placeholder="剧情标题" maxLength={500} /><input className="input-text" value={settings.storySubtitle} onChange={event => update({ storySubtitle: event.target.value })} placeholder="剧情副标题" maxLength={500} /></>}
    {settings.scene === 'pause' && <input className="input-text" value={settings.pausedMessage} onChange={event => update({ pausedMessage: event.target.value })} placeholder="暂停画面文字" maxLength={500} />}
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {!windowOpen && !connected ? <button className="btn btn-primary" type="button" onClick={onOpen} style={{ flex: 1 }}>📺 打开直播窗口</button> : windowOpen ? <><button className="btn btn-secondary" type="button" onClick={onFocus} style={{ flex: 1 }}>定位展示窗口</button><button className="btn btn-secondary" type="button" onClick={onRequestFullscreen}>请求全屏</button><button className="btn btn-danger" type="button" onClick={onClose}>关闭</button></> : <><button className="btn btn-secondary" type="button" disabled style={{ flex: 1 }}>✓ 展示标签页已连接</button><button className="btn btn-secondary" type="button" onClick={onRequestFullscreen}>请求全屏</button></>}
    </div>
    {fallbackUrl && !windowOpen && <button type="button" onClick={onOpenTab} style={{ alignSelf: 'flex-start', border: 0, padding: 0, background: 'transparent', color: '#c4b5fd', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline' }}>弹窗被阻止？点击在新标签页打开展示页面</button>}
  </section>;
}
