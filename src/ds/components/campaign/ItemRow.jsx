import React from 'react';
import { Badge } from '../data/Badge.jsx';
import { CATEGORY_TONES } from '../../../utils/inventoryRules.js';

const TONE_COLORS = { madder: 'var(--pigment-madder)', verdigris: 'var(--pigment-verdigris)', woad: 'var(--pigment-woad)', accent: 'var(--accent)', ochre: 'var(--pigment-ochre)', amber: 'var(--pigment-ochre)', neutral: 'var(--text-body)' };

export function ItemRow({ name, category, quantity, description, usage, details, owner, actions, style }) {
  const [hover, setHover] = React.useState(false);
  const tone = CATEGORY_TONES[category] || 'neutral';
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
          <span style={{ fontSize: 'var(--type-body-sm)', fontWeight: 'var(--weight-medium)', color: TONE_COLORS[tone] }}>{name}</span>
          {category ? <Badge size="sm" tone={tone}>{category}</Badge> : null}
          {quantity != null ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-meta)', color: 'var(--text-muted)' }}>×{quantity}</span> : null}
        </div>
        {description ? <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-muted)', lineHeight: 'var(--type-body-lh)' }}>{description}</p> : null}
        {usage ? <p style={{ fontSize: 'var(--type-meta)', color: 'var(--text-body)', lineHeight: 'var(--type-body-lh)' }}><strong>使用：</strong>{usage}</p> : null}
        {details ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>{details}</span> : null}
        {owner ? <span style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)' }}>归属：{owner}</span> : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0, opacity: hover ? 1 : 0.55, transition: 'var(--motion-fade)' }}>{actions}</div> : null}
    </div>
  );
}
