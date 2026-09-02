import { Modal, Button, Checkbox, Badge, Meter } from '../../ds';
import { getLongRestRations, LONG_REST_CALORIES_PER_PC } from '../../utils/inventoryRules';

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
        <strong>短休效果</strong>：被勾选的角色恢复其 <strong>50% 最大生命值</strong>，斗气恢复 <strong>3 格</strong>；
        其他<strong>每短休重置</strong>与<strong>每回合重置</strong>资源按各自规则恢复。
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

export default function RestModal({ open, restType, characters, itemPool = [], participants, setParticipants, onClose, onConfirm }) {
  if (!open) return null;
  const copy = COPY[restType] || COPY.short;
  const selectedCount = Object.values(participants).filter(Boolean).length;
  const selectedPcIds = characters.filter(character => character.type === 'PC' && participants[character.id]).map(character => character.id);
  const rationPlan = getLongRestRations(itemPool, selectedPcIds);
  const rationBlocked = restType === 'long' && !rationPlan.enough;

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
          <Button icon="check" disabled={selectedCount === 0 || rationBlocked} onClick={onConfirm}>{copy.confirm}</Button>
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

      {restType === 'long' && (
        <div style={{ padding: 'var(--space-3) var(--space-4)', background: rationBlocked ? 'var(--pigment-madder-soft)' : 'var(--pigment-verdigris-soft)', boxShadow: `inset 3px 0 0 ${rationBlocked ? 'var(--pigment-madder)' : 'var(--pigment-verdigris)'}`, fontSize: 'var(--type-meta)', color: 'var(--text-body)', lineHeight: 'var(--type-body-lh)' }}>
          <strong>长休口粮：</strong>{rationPlan.available} / {rationPlan.required} kcal
          <span style={{ color: 'var(--text-muted)' }}>（每名玩家角色 {LONG_REST_CALORIES_PER_PC} kcal；从已勾选玩家的背包共享扣除）</span>
          {rationBlocked && <div style={{ color: 'var(--pigment-madder)', marginTop: 'var(--space-1)' }}>还缺少 {rationPlan.shortage} kcal，补足食物后才能进行长休。</div>}
        </div>
      )}

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
