import React from 'react';

export function Toolbar({ children, align = 'left', dense = false, sunken = false, wrap = true, style }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', flexWrap: wrap ? 'wrap' : 'nowrap',
      gap: dense ? 'var(--space-2)' : 'var(--space-3)',
      justifyContent: align === 'right' ? 'flex-end' : align === 'between' ? 'space-between' : 'flex-start',
      padding: dense ? 'var(--space-2) var(--space-3)' : 'var(--space-3) var(--space-4)',
      background: sunken ? 'var(--surface-sunken)' : 'transparent',
      border: sunken ? 'var(--border-hairline)' : 'none',
      borderRadius: sunken ? 'var(--radius-md)' : 0, ...style
    }}>{children}</div>
  );
}

export function ToolbarDivider() {
  return <span aria-hidden="true" style={{ width: '1px', alignSelf: 'stretch', margin: '0 var(--space-1)', background: 'var(--line-hairline)' }} />;
}

export function ToolbarLabel({ children }) {
  return <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-faint)' }}>{children}</span>;
}
