import React from 'react';
import { Badge } from '../data/Badge.jsx';

const CATEGORY_TONE = { '武器': 'madder', '消耗品': 'verdigris', '护甲': 'woad', '法器': 'accent', '杂物': 'neutral' };

export function ItemRow({ name, category, quantity, description, owner, actions, style }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
        padding: 'var(--row-pad-y) var(--space-4)',
        background: hover ? 'var(--surface-hover)' : 'transparent',
        borderBottom: 'var(--rule-dot)', transition: 'var(--motion-control)', minWidth: 0, ...style
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--type-body-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-body)' }}>{name}</span>
          {category ? <Badge size="sm" tone={CATEGORY_TONE[category] || 'neutral'}>{category}</Badge> : null}
          {quantity != null ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>×{quantity}</span> : null}
        </div>
        {description ? <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{description}</p> : null}
        {owner ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>归属：{owner}</span> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, opacity: hover ? 1 : 0.55, transition: 'var(--motion-fade)' }}>{actions}</div> : null}
    </div>
  );
}
