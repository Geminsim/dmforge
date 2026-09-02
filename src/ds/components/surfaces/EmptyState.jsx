import React from 'react';
import DmforgeIcon from '../../../components/DmforgeIcon';

export function EmptyState({ icon, text, hint, action, compact = false, style }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)',
      padding: compact ? 'var(--space-5) var(--space-4)' : 'var(--space-8) var(--space-5)',
      textAlign: 'center', ...style
    }}>
      {React.isValidElement(icon) ? icon : icon ? <DmforgeIcon name={icon} size={compact ? 18 : 26} fallbackClass={'ph-fill ph-' + icon} style={{ color: 'var(--text-faint)', opacity: 0.7 }} /> : null}
      <p style={{ fontSize: compact ? 'var(--type-meta)' : 'var(--type-body-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>{text}</p>
      {hint ? <p style={{ fontSize: 'var(--type-micro)', color: 'var(--text-faint)', maxWidth: '34ch' }}>{hint}</p> : null}
      {action}
    </div>
  );
}
