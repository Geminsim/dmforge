import { SegmentedControl, Select, Slider, Checkbox, TextInput, Button, StatusDot, MapToken } from '../ds';

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
  { value: 'follow-active', label: '跟随当前行动角色' },
  { value: 'follow-dm', label: '跟随 DM 地图镜头' },
  { value: 'independent', label: '展示页独立镜头' }
];

export default function PresentationControls({
  settings,
  setSettings,
  characters = [],
  connected,
  windowOpen,
  fallbackUrl,
  onOpen,
  onOpenTab,
  onFocus,
  onClose,
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
            <Button variant="danger" icon="x" onClick={onClose} title="关闭直播展示窗口">关闭</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" icon="check" disabled>展示标签页已连接</Button>
            <Button variant="secondary" icon="corners-out" onClick={onRequestFullscreen} title="请求展示窗口进入全屏">请求全屏</Button>
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
