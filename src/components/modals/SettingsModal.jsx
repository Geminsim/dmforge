import { Modal, Button, IconButton, TextInput, Checkbox, StatusDot, StatPill } from '../../ds';
import PresentationControls from '../PresentationControls';

/**
 * Campaign settings. Sections are separated by bracket labels and a dotted
 * leader rather than the old horizontal rules, and every destructive action
 * keeps the tooltip that states what it actually does.
 */

function SectionKey({ code, children, status }) {
  return (
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
        {code}
      </span>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', fontWeight: 'var(--display-weight)', whiteSpace: 'nowrap' }}>
        {children}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
      {status}
    </div>
  );
}

/** Two-up role picker — each option states what it does to the UI and to the data. */
function RoleCard({ active, icon, title, detail, onClick, tooltip }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 'var(--space-2)',
        padding: 'var(--space-4)',
        textAlign: 'left',
        cursor: 'pointer',
        border: 'none',
        background: active ? 'var(--accent-soft)' : 'var(--surface-raised)',
        boxShadow: `inset 0 0 0 1px ${active ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
        transition: 'var(--motion-control)'
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <i className={`ph-fill ph-${icon}`} style={{ fontSize: 16, color: active ? 'var(--accent)' : 'var(--text-muted)' }} aria-hidden="true" />
        <span style={{ fontSize: 'var(--type-body-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)' }}>{title}</span>
      </span>
      <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{detail}</span>
    </button>
  );
}

export default function SettingsModal({
  open,
  onClose,
  appRole,
  onSetAppRole,
  isFullscreen,
  onToggleFullscreen,
  customAttributeLabels,
  setCustomAttributeLabels,
  isSyncEnabled,
  setIsSyncEnabled,
  isSyncConnected,
  syncToken,
  setSyncToken,
  syncConflict,
  resolveConflictWithServer,
  resolveConflictWithLocal,
  storageError,
  storageStatus,
  characterCount,
  mapCount,
  localRecoveryPoints,
  refreshRecoveryPoints,
  onRestoreLocal,
  serverBackups,
  refreshServerBackups,
  onRestoreServer,
  onCreateManualBackup,
  onExportCampaign,
  onImportCampaign,
  onResetCampaign,
  clientId,
  presentationProps
}) {
  if (!open) return null;

  return (
    <Modal
      open
      onClose={onClose}
      icon="gear-six"
      width={680}
      title="战役系统设置 (Campaign Settings)"
      footer={<Button variant="secondary" onClick={onClose}>关闭</Button>}
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="ROLE">页面运行角色</SectionKey>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <RoleCard
            active={appRole === 'DM'}
            icon="crown-simple"
            title="DM 掌控端 (Full Control)"
            detail="显示所有 UI 面板及编辑工具，修改将实时推送到局域网"
            tooltip="切换为 DM 掌控端：显示全部面板与编辑工具，本机修改会推送到局域网其他设备"
            onClick={() => onSetAppRole('DM')}
          />
          <RoleCard
            active={appRole === 'PLAYER'}
            icon="users-three"
            title="玩家展示端 (Read-Only)"
            detail="只读不改展示大地图，隐藏所有边栏，绝不篡改/覆写数据"
            tooltip="切换为玩家展示端：只读展示大地图，隐藏侧栏与 DM 私密内容，绝不写回任何数据"
            onClick={() => onSetAppRole('PLAYER')}
          />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="SCREEN">屏幕显示控制</SectionKey>
        <Button
          variant="secondary"
          icon={isFullscreen ? 'corners-in' : 'corners-out'}
          fullWidth
          onClick={onToggleFullscreen}
          title={isFullscreen ? '退出浏览器全屏模式' : '让浏览器进入全屏，隐藏地址栏以获得完整的战术地图可视面积'}
        >
          {isFullscreen ? '退出浏览器全屏模式 (Exit Fullscreen)' : '进入浏览器全屏模式 (Enter Fullscreen)'}
        </Button>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="ATTRS">六维核心属性自定义更名</SectionKey>
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
          您可以重命名六个核心属性的显示名称（如：力量 ➔ 体魄，敏捷 ➔ 反射等）。底层数据键名保持不变，完美兼容已有历史存档与导入数据。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {Object.entries(customAttributeLabels).map(([originalKey, customVal]) => (
            <TextInput
              key={originalKey}
              size="sm"
              label={`原键: ${originalKey}`}
              value={customVal}
              onChange={e => setCustomAttributeLabels({ ...customAttributeLabels, [originalKey]: e.target.value })}
            />
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey
          code="LAN"
          status={<StatusDot state={!isSyncEnabled ? 'idle' : isSyncConnected ? 'synced' : 'local'} label={!isSyncEnabled ? '单机模式' : isSyncConnected ? '局域网同步' : '单机降级'} />}
        >
          局域网实时云同步
        </SectionKey>
        <Checkbox
          checked={isSyncEnabled}
          onChange={() => setIsSyncEnabled(!isSyncEnabled)}
          label="启用局域网实时同步"
          hint={
            !isSyncEnabled
              ? '已手动关闭同步，战役数据仅保存在当前设备。'
              : isSyncConnected
                ? '局域网同步可用：每 1.5 秒检查远端修改，本地修改会快速推送。'
                : '同步服务或令牌不可用，已自动降级为单机使用；本地存档不受影响，连接恢复后会自动重试。'
          }
        />
        <TextInput
          label="同步令牌 (Bearer Token)"
          mono
          type="password"
          value={syncToken}
          onChange={e => setSyncToken(e.target.value)}
          placeholder="局域网同步令牌（与服务器 DMFORGE_SYNC_TOKEN 一致）"
          hint="请勿分享给不受信任的人；令牌无效时应用自动降级为单机模式。"
        />
      </section>

      <PresentationControls {...presentationProps} />

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="SAVE">战役物理存档数据管理</SectionKey>

        <p
          style={{
            fontSize: 'var(--type-meta)',
            lineHeight: 'var(--type-body-lh)',
            padding: 'var(--space-3) var(--space-4)',
            color: storageError ? 'var(--pigment-madder)' : 'var(--text-muted)',
            background: storageError ? 'var(--pigment-madder-soft)' : 'var(--surface-sunken)',
            boxShadow: `inset 0 0 0 1px ${storageError ? 'var(--pigment-madder-line)' : 'var(--line-hairline)'}`
          }}
        >
          {storageError || `${storageStatus}（事务存档，自动保留上一版本）`}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          <StatPill variant="plate" size="sm" label="战役上限" value="10MB" sub="超出将拒绝写入" />
          <StatPill variant="plate" size="sm" label="角色" value={characterCount} />
          <StatPill variant="plate" size="sm" label="地图" value={mapCount} />
        </div>

        <p style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)', lineHeight: 'var(--type-body-lh)' }}>
          自动备份：每次内容变化后约 250ms 自动保存，本机保留上一版本；服务器保留近期 20 份、7 天每小时和 30 天每日版本。
        </p>

        {syncConflict && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)',
              padding: 'var(--space-4)',
              background: 'var(--pigment-ochre-soft)',
              boxShadow: 'inset 0 0 0 1px var(--pigment-ochre-line)'
            }}
          >
            <strong style={{ fontSize: 'var(--type-body-sm)', color: 'var(--pigment-ochre)' }}>
              检测到同步冲突，自动上传已暂停。
            </strong>
            <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
              服务器和本机都发生了修改，请明确选择保留哪个版本。选择前不会覆盖任何一方。
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <Button size="sm" variant="secondary" onClick={resolveConflictWithServer} title="丢弃本机修改，采用服务器上的版本">使用服务器版本</Button>
              <Button size="sm" variant="secondary" onClick={resolveConflictWithLocal} title="覆盖服务器版本，采用本机的版本">使用本机版本</Button>
              <Button size="sm" variant="secondary" onClick={onExportCampaign} title="先把本机版本导出为 JSON 文件，再决定保留哪一方">先导出本机版本</Button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            icon="floppy-disk"
            onClick={onCreateManualBackup}
            title="立即创建本机恢复点；同步可用时同时创建服务器备份"
          >
            立即手动备份
          </Button>
          <Button
            variant="secondary"
            icon="download-simple"
            onClick={() => { onClose(); onExportCampaign(); }}
            title="导出整个战役推演进度为本地 JSON 文件备份存档"
          >
            导出战役存档
          </Button>
          <label
            title="从外部 JSON 文件恢复导入已存战役存档"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              height: 'var(--control-h)',
              padding: '0 var(--control-pad-x)',
              cursor: 'pointer',
              color: 'var(--text-body)',
              fontSize: 'var(--type-body-sm)',
              fontWeight: 'var(--weight-medium)',
              letterSpacing: '.03em',
              boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
            }}
          >
            <i className="ph-fill ph-upload-simple" style={{ fontSize: 14 }} aria-hidden="true" />
            导入外部存档
            <input
              type="file"
              accept=".json"
              onChange={e => { onClose(); onImportCampaign(e); }}
              style={{ display: 'none' }}
            />
          </label>
          <Button
            variant="danger"
            icon="warning"
            onClick={() => { onClose(); onResetCampaign(); }}
            title="清空本地缓存，恢复酒馆/地底初始战术模板"
          >
            恢复出厂设置
          </Button>
        </div>

        <details onToggle={e => e.currentTarget.open && refreshRecoveryPoints()}>
          <summary style={{ cursor: 'pointer', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>
            本机恢复点（{localRecoveryPoints.length}）
          </summary>
          <div style={{ maxHeight: 140, overflowY: 'auto', marginTop: 'var(--space-3)' }}>
            {localRecoveryPoints.length === 0 ? (
              <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-faint)', fontStyle: 'italic' }}>暂无恢复点</p>
            ) : (
              localRecoveryPoints.map(point => (
                <div key={point.key} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: 'var(--rule-dot)' }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 'var(--type-meta)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {point.label || point.key}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>
                    {point.savedAt ? new Date(point.savedAt).toLocaleString() : '旧版'}
                  </span>
                  <IconButton icon="arrow-counter-clockwise" size="sm" onClick={() => onRestoreLocal(point.key)} title="回滚到这个本机恢复点" />
                </div>
              ))
            )}
          </div>
        </details>

        {isSyncConnected && (
          <details onToggle={e => e.currentTarget.open && refreshServerBackups()}>
            <summary style={{ cursor: 'pointer', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>
              服务器滚动备份（{serverBackups.length}）
            </summary>
            <div style={{ maxHeight: 160, overflowY: 'auto', marginTop: 'var(--space-3)' }}>
              {serverBackups.map(backup => (
                <div key={backup.name} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: 'var(--rule-dot)' }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--type-micro)',
                      color: backup.valid ? 'var(--text-muted)' : 'var(--pigment-madder)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {backup.name} · {backup.valid ? new Date(backup.modifiedAt).toLocaleString() : '损坏'}
                  </span>
                  {backup.valid && appRole !== 'PLAYER' && (
                    <IconButton icon="arrow-counter-clockwise" size="sm" onClick={() => onRestoreServer(backup.name)} title="从服务器备份回滚整个战役" />
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </section>

      <p
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--type-micro)',
          color: 'var(--text-faint)',
          textAlign: 'center',
          paddingTop: 'var(--space-3)',
          borderTop: 'var(--border-hairline)'
        }}
      >
        DMForge Campaign Assistant v1.0.0 · CLIENT {clientId.substring(0, 8)}
      </p>
    </Modal>
  );
}
