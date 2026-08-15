import { IconButton, StatusDot, ThemeSwitcher, Badge } from '../../ds';

/**
 * Fixed 56px app chrome. Left: the wordmark (the product has no logo — the
 * accent-coloured M *is* the mark) and the campaign key. Right: sync state,
 * theme, and the window-level actions.
 *
 * Tooltip copy is carried over verbatim from the previous header: in this
 * product the tooltip is where the rule lives, so shortening one loses
 * information the DM relies on mid-session.
 */

function syncStatus({ syncConflict, isSyncEnabled, isSyncConnected }) {
  if (syncConflict) {
    return {
      state: 'error',
      label: '同步冲突待处理',
      title: '需要处理同步冲突；点击打开设置选择保留版本。'
    };
  }
  if (!isSyncEnabled) {
    return {
      state: 'local',
      label: '同步已关闭',
      title: '局域网实时数据同步已关闭（单机离线模式，完全无网络请求消耗）。点击开启局域网同步'
    };
  }
  if (isSyncConnected) {
    return {
      state: 'synced',
      label: '局域网同步中',
      title: '局域网实时数据同步开启中，其他设备更改会秒级在此拉取。点击关闭局域网同步'
    };
  }
  return {
    state: 'local',
    label: '自动单机使用',
    title: '同步暂不可用，应用已自动使用本地存档并继续重试。'
  };
}

export default function AppHeader({
  campaignName,
  chapter,
  theme,
  onTheme,
  isPlayerViewMode,
  onTogglePlayerView,
  syncConflict,
  isSyncEnabled,
  isSyncConnected,
  onToggleSync,
  presentationConnected,
  isLeftSidebarCollapsed,
  onToggleLeftSidebar,
  isRightSidebarCollapsed,
  onToggleRightSidebar,
  onOpenSettings,
  onOpenCampaigns
}) {
  const sync = syncStatus({ syncConflict, isSyncEnabled, isSyncConnected });

  return (
    <header
      style={{
        height: 'var(--shell-header-h)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-5)',
        padding: '0 var(--space-6)',
        background: 'var(--surface-panel)',
        borderBottom: 'var(--border-hairline)'
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 21,
          letterSpacing: '.02em',
          color: 'var(--text-body)',
          flexShrink: 0
        }}
      >
        D<span style={{ color: 'var(--accent)' }}>M</span>Forge
      </span>

      {/* Latin section key in the label face; the campaign name is Chinese, and
          IBM Plex Mono has no Han glyphs — setting it in mono would fall back to
          whatever the OS supplies and break the line. */}
      <span
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-label)',
            fontSize: 'var(--type-micro)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-faint)',
            flexShrink: 0
          }}
        >
          Campaign
        </span>
        <span
          style={{
            fontSize: 'var(--type-meta)',
            color: 'var(--text-muted)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {campaignName}{chapter ? ` · ${chapter}` : ''}
        </span>
      </span>

      {isPlayerViewMode ? <Badge tone="woad" icon="eye">玩家展示端 (Read-Only)</Badge> : null}

      <span style={{ flex: 1 }} />

      <button
        type="button"
        onClick={onToggleSync}
        title={sync.title}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          height: 'var(--control-h-sm)',
          padding: '0 var(--space-3)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0
        }}
      >
        <StatusDot state={sync.state} label={sync.label} mono={false} />
      </button>

      <ThemeSwitcher value={theme} onChange={onTheme} compact />

      <span style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
        {!isPlayerViewMode ? <IconButton icon="folder-open" onClick={onOpenCampaigns} title="保存并返回战役选择" /> : null}
        {!isPlayerViewMode ? (
          <IconButton
            icon="monitor-play"
            tone={presentationConnected ? 'accent' : 'muted'}
            active={presentationConnected}
            onClick={onOpenSettings}
            title="打开直播展示控制面板"
          />
        ) : null}

        <IconButton
          icon={isPlayerViewMode ? 'eye' : 'eye-closed'}
          active={isPlayerViewMode}
          onClick={onTogglePlayerView}
          title={isPlayerViewMode ? '返回 DM 掌控端' : '切换到玩家展示端（只读，隐藏 DM 私密地形与笔记）'}
        />

        {!isPlayerViewMode ? (
          <>
            <IconButton
              icon="sidebar-simple"
              active={isLeftSidebarCollapsed}
              onClick={onToggleLeftSidebar}
              title={isLeftSidebarCollapsed ? '展开左侧栏 (角色与NPC列表)' : '折叠隐藏左侧栏'}
            />
            <IconButton
              icon="sidebar"
              active={isRightSidebarCollapsed}
              onClick={onToggleRightSidebar}
              title={isRightSidebarCollapsed ? '展开右侧栏 (掷骰与战役日志)' : '折叠隐藏右侧栏'}
            />
          </>
        ) : null}

        <IconButton
          icon="gear-six"
          onClick={onOpenSettings}
          title="打开全局战役与多端系统设置面板"
        />
      </span>
    </header>
  );
}
