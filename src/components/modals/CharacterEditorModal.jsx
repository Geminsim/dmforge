import { useState } from 'react';
import { Modal, Button, IconButton, TextInput, Select, Badge, EmptyState } from '../../ds';
import Sf6CharacterSheetEditor from './Sf6CharacterSheetEditor';

/**
 * Create / edit a character, monster or NPC.
 *
 * Section keys are the plate grammar's bracket labels (mono, letterspaced Latin
 * over the Chinese title) rather than the numbered "1. 基础信息" headings the
 * old modal used.
 */

const TYPE_OPTIONS = [
  { value: 'PC', label: 'PC (玩家角色)' },
  { value: 'NPC', label: 'NPC (敌对/怪物)' }
];

const HIT_DICE_OPTIONS = [
  { value: 'd6', label: 'd6 (如法师/术士)' },
  { value: 'd8', label: 'd8 (如牧师/游侠/武僧)' },
  { value: 'd10', label: 'd10 (如战士/圣骑士)' },
  { value: 'd12', label: 'd12 (如野蛮人)' }
];

const RESET_OPTIONS = [
  { value: 'turn', label: '每回合重置' },
  { value: 'short_rest', label: '每短休重置' },
  { value: 'long_rest', label: '每长休重置' }
];

const RESET_LABEL = { turn: '回合', short_rest: '短休', long_rest: '长休' };

function SectionKey({ code, children }) {
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
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--type-display-sm)', fontWeight: 'var(--display-weight)' }}>
        {children}
      </span>
      <span aria-hidden="true" style={{ flex: 1, borderTop: 'var(--rule-dot)' }} />
    </div>
  );
}

/** Label over a mono value with a decrement/increment pair — the six core stats. */
function StatStepper({ label, value, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
        padding: 'var(--space-2) var(--space-3)',
        background: 'var(--surface-raised)',
        boxShadow: 'inset 0 0 0 1px var(--line-hairline)'
      }}
    >
      <span
        title={label}
        style={{
          fontSize: 'var(--type-micro)',
          color: 'var(--text-muted)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
        <IconButton icon="minus" size="sm" onClick={() => onChange(Math.max(1, value - 1))} title={`降低 ${label} 1 点`} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-numeral)', fontWeight: 'var(--weight-semibold)' }}>
          {value}
        </span>
        <IconButton icon="plus" size="sm" onClick={() => onChange(value + 1)} title={`提高 ${label} 1 点`} />
      </span>
    </div>
  );
}

export default function CharacterEditorModal({
  open,
  editingCharId,
  newChar,
  setNewChar,
  customAttributeLabels,
  ruleset,
  onClose,
  onSave
}) {
  const [resName, setResName] = useState('');
  const [resMax, setResMax] = useState(4);
  const [resResetType, setResResetType] = useState('long_rest');

  if (!open) return null;

  if (ruleset?.id === 'sf6-v0.9') return (
    <Modal
      open
      onClose={onClose}
      icon="character-card"
      width={1180}
      title={editingCharId ? '编辑 SF6 角色卡' : '创建 SF6 角色卡'}
      footer={<><Button variant="secondary" onClick={onClose}>取消</Button><Button icon="check" onClick={onSave}>{editingCharId ? '保存角色卡' : '创建角色'}</Button></>}
    >
      <Sf6CharacterSheetEditor draft={newChar} setDraft={setNewChar} ruleset={ruleset} />
    </Modal>
  );

  const patch = fields => setNewChar({ ...newChar, ...fields });
  const classOptions = ruleset?.classes?.map(item => ({ value: item.name, label: item.name })) || [];
  const selectedClass = ruleset?.classes?.find(item => item.name === newChar.class);
  const chooseClass = value => {
    const definition = ruleset?.classes?.find(item => item.name === value);
    if (!definition) return patch({ class: value });
    const stats = Object.fromEntries(definition.attributeOrder.map((key, index) => [ruleset.attributes[key], definition.stats[index]]));
    const speedModifier = Math.floor(((stats.速度 ?? 10) - 10) / 2);
    patch({ class: value, subclass: '', stats, hitDice: definition.hitDice, ac: definition.ac + speedModifier, speed: definition.speed, initiative: speedModifier, resources: ruleset.resources.map(resource => ({ ...resource, value: resource.max })) });
  };

  const addResource = () => {
    if (!resName.trim()) return;
    patch({
      resources: [...newChar.resources, { name: resName.trim(), max: resMax, value: resMax, resetType: resResetType }]
    });
    setResName('');
    setResMax(4);
    setResResetType('long_rest');
  };

  return (
    <Modal
      open
      onClose={onClose}
      icon="character-card"
      width={620}
      title={editingCharId ? '修改角色属性 / 资源槽' : '新建战役角色 / 怪物 NPC'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button icon="check" onClick={onSave}>
            {editingCharId ? '保存角色更改' : '创建并召唤角色'}
          </Button>
        </>
      }
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="BASICS">基础信息</SectionKey>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-3)' }}>
          <TextInput
            label="角色名称"
            placeholder="角色名称 (如: 甘道夫)"
            value={newChar.name}
            onChange={e => patch({ name: e.target.value })}
          />
          <Select label="类型" value={newChar.type} onChange={e => patch({ type: e.target.value })} options={TYPE_OPTIONS} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {classOptions.length ? <Select label="职业" value={newChar.class} onChange={e => chooseClass(e.target.value)} options={[{ value: '', label: '选择职业' }, ...classOptions]} /> : <TextInput label="职业" placeholder="职业" value={newChar.class} onChange={e => patch({ class: e.target.value })} />}
          <TextInput
            label="初始生命 (Max HP)"
            mono
            type="number"
            value={newChar.maxHp}
            onChange={e => patch({ maxHp: Math.max(1, parseInt(e.target.value, 10) || 10) })}
          />
        </div>
        {selectedClass && <Select label="子职业" disabled={newChar.level < 3} value={newChar.subclass || ''} onChange={e => patch({ subclass: e.target.value })} options={[{ value: '', label: newChar.level >= 3 ? '选择子职业' : '3 级解锁' }, ...selectedClass.subclasses.map(value => ({ value, label: value }))]} />}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
          <TextInput
            label="初始/当前等级 (Level)"
            mono
            type="number"
            value={newChar.level}
            onChange={e => patch({ level: Math.max(1, parseInt(e.target.value, 10) || 1) })}
          />
          <Select
            label="生命骰 (Hit Dice规格)"
            value={newChar.hitDice}
            onChange={e => patch({ hitDice: e.target.value })}
            options={HIT_DICE_OPTIONS}
          />
          <TextInput
            label="初始临时生命 (Temp HP, 选填)"
            mono
            type="number"
            value={newChar.tempHp || 0}
            onChange={e => patch({ tempHp: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="COMBAT">战斗物理指标</SectionKey>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)' }}>
          <TextInput
            label="护甲值 (AC)"
            mono
            type="number"
            value={newChar.ac}
            onChange={e => patch({ ac: parseInt(e.target.value, 10) || 0 })}
          />
          <TextInput
            label="先攻加成 (Initiative)"
            mono
            type="number"
            value={newChar.initiative}
            onChange={e => patch({ initiative: parseInt(e.target.value, 10) || 0 })}
          />
          <TextInput
            label="移动速度 (Speed ft)"
            mono
            type="number"
            value={newChar.speed}
            onChange={e => patch({ speed: parseInt(e.target.value, 10) || 0 })}
          />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="STATS">六维核心属性</SectionKey>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 'var(--space-3)' }}>
          {Object.entries(newChar.stats).map(([statKey, statVal]) => (
            <StatStepper
              key={statKey}
              label={customAttributeLabels[statKey] || statKey}
              value={statVal}
              onChange={next => patch({ stats: { ...newChar.stats, [statKey]: next } })}
            />
          ))}
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <SectionKey code="SLOTS">技能资源槽预设</SectionKey>
        <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>
          如法术位、气、动作点。上限即初始值，休整时按所选重置方式充能。
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.5fr auto', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <TextInput
            size="sm"
            placeholder="资源槽名称 (如: 1环法术位)"
            value={resName}
            onChange={e => setResName(e.target.value)}
          />
          <TextInput
            size="sm"
            mono
            type="number"
            placeholder="槽上限"
            value={resMax}
            onChange={e => setResMax(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
          <Select size="sm" value={resResetType} onChange={e => setResResetType(e.target.value)} options={RESET_OPTIONS} />
          <Button size="sm" variant="secondary" icon="plus" onClick={addResource} title="增设一个资源槽">增设</Button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {newChar.resources.length === 0 ? (
            <EmptyState compact icon="flask" text="暂未配置动态消耗资源槽。" />
          ) : (
            newChar.resources.map((res, index) => (
              <Badge
                key={index}
                tone="accent"
                variant="soft"
                onRemove={() => patch({ resources: newChar.resources.filter((_, i) => i !== index) })}
              >
                {res.name} ({res.max}) [{RESET_LABEL[res.resetType] || res.resetType}]
              </Badge>
            ))
          )}
        </div>
      </section>
    </Modal>
  );
}
