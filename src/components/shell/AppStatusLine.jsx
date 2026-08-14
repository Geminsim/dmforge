import { StatusLine } from '../../ds';

/**
 * The bottom readout that closes every screen in the plate grammar. The source
 * app scattered these facts across the header and the map toolbar; collecting
 * them here frees the header and gives the DM one place to glance at.
 */

const TAB_LABEL = { map: '战术地图', items: '物品流转', excel: '玩家卡导入' };

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '—';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

export default function AppStatusLine({
  isPlayerViewMode,
  isInCombat,
  combatRound,
  activeTurnName,
  activeMap,
  currentTab,
  saveBytes,
  saveLimitBytes,
  isSyncEnabled,
  isSyncConnected,
  lanAddress
}) {
  const mapCells = activeMap ? `${activeMap.width ?? '—'}×${activeMap.height ?? '—'}` : '—';
  const cellSize = activeMap?.cellSize ?? 40;

  const items = [];
  if (isPlayerViewMode) {
    items.push({ label: 'VIEW', value: 'PLAYER · READ-ONLY' });
  }
  items.push({
    label: 'ROUND',
    value: isInCombat ? String(combatRound).padStart(2, '0') : '—'
  });
  if (!isPlayerViewMode) {
    items.push({
      label: 'TURN',
      value: isInCombat && activeTurnName ? activeTurnName : '自由行动',
      tone: isInCombat && activeTurnName ? 'accent' : undefined
    });
  }
  items.push({ label: 'MAP', value: `${mapCells} · 1FT=${cellSize}PX` });
  if (!isPlayerViewMode) {
    items.push({ label: 'TOOL', value: (TAB_LABEL[currentTab] || currentTab || '—').toUpperCase() });
  }

  const right = [];
  if (!isPlayerViewMode) {
    right.push({
      label: 'SAVE',
      value: `${formatBytes(saveBytes)} / ${formatBytes(saveLimitBytes)}`
    });
  }
  right.push({
    label: 'LAN',
    value: !isSyncEnabled ? '单机模式' : isSyncConnected ? lanAddress || '已连接' : '重试中',
    tone: !isSyncEnabled ? undefined : isSyncConnected ? 'verdigris' : 'ochre'
  });

  return <StatusLine items={items} right={right} />;
}
