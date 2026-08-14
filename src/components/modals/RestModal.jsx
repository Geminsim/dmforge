import { Modal, Button, Checkbox, Badge, Meter } from '../../ds';

/**
 * Short / long rest. The explanation block spells out the mechanical
 * consequence before the DM commits, the way the product's tooltips do.
 */

const COPY = {
  short: {
    title: '战役休整：短休 (Short Rest)',
    icon: 'campfire',
    confirm: '确定进行短休',
    effect: (
      <>
        <strong>短休效果</strong>：被勾选的角色恢复其 <strong>50% 最大生命值</strong>，并全部充能重置所有
        <strong>每短休重置</strong>与<strong>每回合重置</strong>的技能资源槽。
      </>
    )
  },
  long: {
    title: '战役休整：长休 (Long Rest)',
    icon: 'moon-stars',
    confirm: '确定进行长休',
    effect: (
      <>
        <strong>长休效果</strong>：被勾选的角色恢复其 <strong>100% 生命值</strong>，全部充能重置所有资源槽（含长休/短休/回合重置型），
        <strong>清除身上所有特殊负面状态</strong>，并复原战斗移动力。
      </>
    )
  }
};

export default function RestModal({ open, restType, characters, participants, setParticipants, onClose, onConfirm }) {
  if (!open) return null;
  const copy = COPY[restType] || COPY.short;
  const selectedCount = Object.values(participants).filter(Boolean).length;

  return (
    <Modal
      open
      onClose={onClose}
      icon={copy.icon}
      title={copy.title}
      width={520}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button icon="check" disabled={selectedCount === 0} onClick={onConfirm}>{copy.confirm}</Button>
        </>
      }
    >
      <p
        style={{
          fontSize: 'var(--type-body-sm)',
          color: 'var(--text-muted)',
          lineHeight: 'var(--type-body-lh)',
          padding: 'var(--space-4)',
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
        }}
      >
        {copy.effect}
      </p>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-3)' }}>
          <span
            style={{
              fontFamily: 'var(--font-label)',
              fontSize: 'var(--type-micro)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              color: 'var(--accent)'
            }}
          >
            Participants
          </span>
          <span style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>选择参与休整的角色</span>
          <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)', transform: 'translateY(-3px)' }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral-sm)', color: 'var(--text-body)' }}>
            {selectedCount}/{characters.length}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-2)',
            maxHeight: '38vh',
            overflowY: 'auto'
          }}
        >
          {characters.map(c => {
            const checked = !!participants[c.id];
            return (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-3) var(--space-4)',
                  minWidth: 0,
                  background: checked ? 'var(--accent-soft)' : 'var(--surface-raised)',
                  boxShadow: `inset 0 0 0 1px ${checked ? 'var(--accent-line)' : 'var(--line-hairline)'}`,
                  transition: 'var(--motion-control)'
                }}
              >
                <Checkbox
                  checked={checked}
                  onChange={() => setParticipants(prev => ({ ...prev, [c.id]: !prev[c.id] }))}
                  label={c.name}
                />
                <Badge size="sm" tone={c.type === 'PC' ? 'woad' : 'madder'}>{c.type}</Badge>
                <span style={{ flex: 1, minWidth: 'var(--space-5)' }} />
                <span style={{ width: 120, flexShrink: 0 }}>
                  <Meter value={c.hp} max={c.maxHp} temp={c.tempHp} segments={8} height={7} />
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </Modal>
  );
}
