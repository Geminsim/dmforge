import { useRef } from 'react';
import { SegmentedControl, Select, Slider, Checkbox, TextInput, Button, StatusDot, MapToken } from '../ds';
import DmforgeIcon from './DmforgeIcon';

/**
 * DM-side control block for the /presenter live-stream surface. Lives inside
 * the campaign settings modal.
 */

const SCENES = [
  { id: 'battle', label: '战斗直播', icon: 'sword' },
  { id: 'map', label: '战术地图', icon: 'map-trifold' },
  { id: 'party', label: '队伍概览', icon: 'users-three' },
  { id: 'story', label: '剧情画面', icon: 'book-open-text' },
  { id: 'pause', label: '暂停画面', icon: 'pause' }
];

const CAMERA_OPTIONS = [
  { value: 'follow-dm', label: '跟随 DM 地图镜头' },
  { value: 'follow-active', label: '跟随当前行动角色' },
  { value: 'independent', label: '展示页独立镜头' }
];

export default function PresentationControls({
  settings,
  setSettings,
  characters = [],
  maps = [],
  connected,
  windowOpen,
  fallbackUrl,
  onOpen,
  onOpenTab,
  onFocus,
  onClose,
  onRefresh,
  onRequestFullscreen
}) {
  const update = patch => setSettings(current => ({ ...current, ...patch }));
  const hiddenIds = settings.hiddenCharacterIds || [];

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: 'var(--type-micro)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            whiteSpace: 'nowrap'
          }}
        >
          Stream
        </span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', fontWeight: 'var(--display-weight)', whiteSpace: 'nowrap' }}>
          Discord 直播展示窗口
        </span>
        <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
        <StatusDot
          state={connected ? 'synced' : windowOpen ? 'local' : 'idle'}
          label={connected ? '已连接' : windowOpen ? '正在连接' : '未打开'}
        />
      </div>

      <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
        战斗和地图场景直接复用完整玩家展示端，并同步镜头、棋子拖动路径和移动力估算；只接收过滤后的公开数据，不显示 DM 笔记、隐藏地形或同步令牌。
      </p>

      <SegmentedControl
        value={settings.scene}
        onChange={scene => update({ scene })}
        size="md"
        items={SCENES}
      />

      <Select
        label="直播画面地图"
        size="sm"
        value={settings.mapId || ''}
        onChange={e => update({ mapId: e.target.value })}
        options={[{ value: '', label: '跟随 DM 当前地图' }, ...maps.map(map => ({ value: map.id, label: map.name }))]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        <Select
          label="镜头模式"
          size="sm"
          value={settings.cameraMode}
          onChange={e => update({ cameraMode: e.target.value })}
          options={CAMERA_OPTIONS}
        />
        <Slider
          label="界面字号"
          min={0.75}
          max={1.5}
          step={0.05}
          value={settings.fontScale}
          onChange={e => update({ fontScale: Number(e.target.value) })}
          format={v => `${Math.round(v * 100)}%`}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-5)' }}>
        <Checkbox
          checked={Boolean(settings.showBlockedCells)}
          onChange={e => update({ showBlockedCells: e.target.checked })}
          label="显示玩家可见阻挡格"
        />
        <Checkbox
          checked={Boolean(settings.hideCursor)}
          onChange={e => update({ hideCursor: e.target.checked })}
          label="隐藏鼠标"
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: 'var(--type-micro)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-faint)'
          }}
        >
          直播角色可见性（默认全部公开）
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-2)',
            maxHeight: 120,
            overflowY: 'auto',
            padding: 'var(--space-3)',
            background: 'var(--surface-sunken)',
            boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
          }}
        >
          {characters.map(character => {
            const visible = !hiddenIds.includes(character.id);
            return (
              <Checkbox
                key={character.id}
                checked={visible}
                onChange={() =>
                  update({
                    hiddenCharacterIds: visible
                      ? [...hiddenIds, character.id]
                      : hiddenIds.filter(id => id !== character.id)
                  })
                }
                label={
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <MapToken kind={character.type === 'PC' ? 'PC' : 'MONSTER'} name={character.name} size={14} label="" />
                    {character.name}
                  </span>
                }
              />
            );
          })}
        </div>
      </div>

      <TextInput
        size="sm"
        label="字幕"
        value={settings.caption}
        onChange={e => update({ caption: e.target.value })}
        placeholder="直播字幕（留空则隐藏）"
      />

      {settings.scene === 'story' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          <TextInput size="sm" label="剧情标题" value={settings.storyTitle} onChange={e => update({ storyTitle: e.target.value })} placeholder="剧情标题" />
          <TextInput size="sm" label="剧情副标题" value={settings.storySubtitle} onChange={e => update({ storySubtitle: e.target.value })} placeholder="剧情副标题" />
        </div>
      )}

      {settings.scene === 'pause' && (
        <TextInput size="sm" label="暂停画面文字" value={settings.pausedMessage} onChange={e => update({ pausedMessage: e.target.value })} placeholder="暂停画面文字" />
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        {!windowOpen && !connected ? (
          <Button icon="monitor-play" onClick={onOpen} title="在新窗口打开直播展示端，用于 Discord 串流或投到电视">
            打开直播窗口
          </Button>
        ) : windowOpen ? (
          <>
            <Button variant="secondary" icon="crosshair" onClick={onFocus} title="把已打开的展示窗口带到最前">定位展示窗口</Button>
            <Button variant="secondary" icon="corners-out" onClick={onRequestFullscreen} title="请求展示窗口进入全屏">请求全屏</Button>
            <Button variant="secondary" icon="arrow-clockwise" onClick={onRefresh} title="重新载入并检测直播展示端">刷新直播端</Button>
            <Button variant="danger" icon="x" onClick={onClose} title="关闭直播展示窗口">关闭</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" icon="check" disabled>展示标签页已连接</Button>
            <Button variant="secondary" icon="corners-out" onClick={onRequestFullscreen} title="请求展示窗口进入全屏">请求全屏</Button>
            <Button variant="secondary" icon="arrow-clockwise" onClick={onRefresh} title="重新载入并检测直播展示端">刷新直播端</Button>
          </>
        )}
      </div>

      {fallbackUrl && !windowOpen && (
        <button
          type="button"
          onClick={onOpenTab}
          title="弹窗被浏览器拦截时，改为在新标签页打开展示页面"
          style={{
            alignSelf: 'flex-start',
            padding: 0,
            border: 0,
            background: 'transparent',
            color: 'var(--accent)',
            fontSize: 'var(--type-meta)',
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          弹窗被阻止？点击在新标签页打开展示页面
        </button>
      )}
    </section>
  );
}

/** Left-rail controls for the actions a DM needs while actively streaming. */
export function CompactPresentationControls({
  settings, setSettings, maps = [], cutscenes = [], activeCutsceneId,
  connected, windowOpen, onOpen, onFocus, onRequestFullscreen, onSelectCutscene
  ,onRefresh
}) {
  const resumeScene = useRef(settings.scene === 'pause' ? 'battle' : settings.scene);
  const update = patch => setSettings(current => ({ ...current, ...patch }));
  const selectScene = scene => {
    if (scene !== 'pause') resumeScene.current = scene;
    update({ scene });
  };
  const togglePause = () => {
    if (settings.scene === 'pause') update({ scene: resumeScene.current || 'battle' });
    else {
      resumeScene.current = settings.scene;
      update({ scene: 'pause' });
    }
  };

  return <section className="stream-quick-panel" aria-label="直播快速控制">
    <header>
      <span><DmforgeIcon name="broadcast" size={15} /> 直播导播</span>
      <StatusDot state={connected ? 'synced' : windowOpen ? 'local' : 'idle'} label={connected ? '已连接' : windowOpen ? '连接中' : '未打开'} />
    </header>
    <div className="stream-quick-scenes">
      <button type="button" className={settings.scene === 'map' ? 'active' : ''} onClick={() => selectScene('map')}><DmforgeIcon name="map" size={15} />地图</button>
      <button type="button" className={settings.scene === 'battle' ? 'active' : ''} onClick={() => selectScene('battle')}><DmforgeIcon name="sword" size={15} />战斗</button>
      <button type="button" className={settings.scene === 'story' ? 'active' : ''} onClick={() => selectScene('story')}><DmforgeIcon name="film-strip" size={15} />过场</button>
      <button type="button" className={settings.scene === 'pause' ? 'paused' : ''} onClick={togglePause}><DmforgeIcon name={settings.scene === 'pause' ? 'play' : 'pause'} size={15} />{settings.scene === 'pause' ? '继续' : '暂停'}</button>
    </div>
    <label>直播地图
      <select value={settings.mapId || ''} onChange={event => update({ mapId: event.target.value })}>
        <option value="">跟随 DM 当前地图</option>
        {maps.map(map => <option key={map.id} value={map.id}>{map.name}</option>)}
      </select>
    </label>
    <label>过场画面
      <select value={activeCutsceneId || ''} onChange={event => { onSelectCutscene?.(event.target.value); if (event.target.value) selectScene('story'); }}>
        <option value="">选择过场…</option>
        {cutscenes.map(scene => <option key={scene.id} value={scene.id}>{scene.name}</option>)}
      </select>
    </label>
    <div className="stream-quick-actions">
      {!windowOpen && !connected
        ? <><Button size="sm" icon="monitor-play" onClick={onOpen}>打开直播窗口</Button><Button size="sm" variant="secondary" icon="arrow-clockwise" onClick={onRefresh}>重新检测</Button></>
        : <>{windowOpen && <Button size="sm" variant="secondary" icon="crosshair" onClick={onFocus}>定位</Button>}<Button size="sm" variant="secondary" icon="arrow-clockwise" onClick={onRefresh}>刷新</Button><Button size="sm" variant="secondary" icon="corners-out" onClick={onRequestFullscreen}>全屏</Button></>}
    </div>
  </section>;
}
