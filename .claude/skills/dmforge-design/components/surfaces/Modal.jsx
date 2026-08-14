import React from 'react';

export function Modal({ open = true, title, icon, onClose, footer, children, width = 560, style }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--space-7)', background: 'var(--surface-scrim)', backdropFilter: 'blur(2px)',
      WebkitBackdropFilter: 'blur(2px)', animation: 'dmf-fade-in var(--dur-fast) var(--ease-standard)'
    }}>
      <div style={{
        width: '100%', maxWidth: width, maxHeight: '86vh', display: 'flex', flexDirection: 'column',
        background: 'var(--surface-panel)', boxShadow: 'inset 0 0 0 1px var(--bracket-line), var(--shadow-modal)', animation: 'dmf-rise-in var(--dur-base) var(--ease-out)', ...style
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderBottom: 'var(--border-hairline)' }}>
          {icon ? <i className={'ph-fill ph-' + icon} style={{ fontSize: 18, lineHeight: 1, color: 'var(--accent)' }} aria-hidden="true" /> : null}
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-md)', letterSpacing: 'var(--display-tracking)' }}>{title}</h2>
          <span style={{ flex: 1 }} />
          {onClose ? (
            <button type="button" onClick={onClose} title="关闭面板" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, background: 'transparent', border: 'none', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <i className="ph-fill ph-x" style={{ fontSize: 14 }} aria-hidden="true" />
            </button>
          ) : null}
        </header>
        <div style={{ padding: 'var(--space-5)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>{children}</div>
        {footer ? <footer style={{ padding: 'var(--space-4) var(--space-5)', borderTop: 'var(--border-hairline)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>{footer}</footer> : null}
      </div>
    </div>
  );
}
