import { StatusLine } from '../../ds';

/**
 * The bottom readout that closes every screen in the plate grammar. The source
 * app scattered these facts across the header and the map toolbar; collecting
 * them here frees the header and gives the DM one place to glance at.
 */

// StatusLine renders in mono and IBM Plex Mono has no Han glyphs, so the TOOL
// cell carries Latin codes; the tab itself already shows the Chinese name.
const TOOL_CODE = { map: 'MAP', items: 'ITEMS', excel: 'SHEETS' };

/** Chinese inside the mono strip needs the sans face to render at all. */
const cn = text => <span style={{ fontFamily: 'var(--font-sans)' }}>{text}</span>;

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
      value: isInCombat && activeTurnName ? cn(activeTurnName) : cn('自由行动'),
      tone: isInCombat && activeTurnName ? 'accent' : undefined
    });
  }
  items.push({ label: 'MAP', value: `${mapCells} · 1FT=${cellSize}PX` });
  if (!isPlayerViewMode) {
    items.push({ label: 'TOOL', value: TOOL_CODE[currentTab] || '—' });
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
    value: !isSyncEnabled ? cn('单机模式') : isSyncConnected ? (lanAddress || cn('已连接')) : cn('重试中'),
    tone: !isSyncEnabled ? undefined : isSyncConnected ? 'verdigris' : 'ochre'
  });

  return <StatusLine items={items} right={right} />;
}
