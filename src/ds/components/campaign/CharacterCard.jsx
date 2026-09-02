import React from 'react';
import DmforgeIcon from '../../../components/DmforgeIcon';
import { Meter } from '../data/Meter.jsx';
import { Badge } from '../data/Badge.jsx';

const KIND = { PC: ['woad', 'PC'], NPC: ['verdigris', 'NPC'], MONSTER: ['madder', '怪物'] };

export function CharacterCard({ name, avatar = '', kind = 'PC', level, klass, hp = 0, maxHp = 1, tempHp = 0, conditions = [], speedRemaining, activeTurn = false, selected = false, onSelect, actions, children, style }) {
  const [hover, setHover] = React.useState(false);
  const [tone, kindLabel] = KIND[kind] || KIND.PC;
  return (
    <article
      onClick={onSelect}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-4)',
        background: activeTurn ? 'var(--accent-soft)' : hover && onSelect ? 'var(--surface-hover)' : 'var(--surface-raised)',
        boxShadow: 'inset 2px 0 0 ' + (activeTurn ? 'var(--accent)' : `var(--pigment-${tone})`) + ', inset 0 0 0 1px ' + (selected ? 'var(--line-strong)' : 'var(--line-hairline)'),
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'var(--motion-control)', ...style
      }}
    >
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
        {avatar ? <img src={avatar} alt="" style={{ width: 30, height: 30, flexShrink: 0, objectFit: 'cover', borderRadius: '50%', boxShadow: '0 0 0 1px var(--line-strong)' }} /> : <DmforgeIcon name="character-card" size={26} style={{ color: 'var(--accent)' }} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-sm)', letterSpacing: 'var(--display-tracking)', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</h4>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>
            <Badge tone={tone} size="sm">{kindLabel}</Badge>
            {level != null ? <span style={{ fontFamily: 'var(--font-mono)' }}>Lv{level}</span> : null}
            {klass ? <span>{klass}</span> : null}
            {activeTurn ? <span style={{ fontFamily: 'var(--font-label)', letterSpacing: 'var(--tracking-label)', color: 'var(--accent)' }}>ACTIVE</span> : null}
          </span>
        </div>
        {actions}
      </header>
      <Meter value={hp} max={maxHp} temp={tempHp} label="生命值" />
      {(conditions.length > 0 || speedRemaining != null) ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-2)' }}>
          {conditions.map(c => <Badge key={c} tone="ochre" size="sm">{c}</Badge>)}
          {speedRemaining != null ? <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>SPD {speedRemaining}ft</span> : null}
        </div>
      ) : null}
      {children}
    </article>
  );
}
