import React from 'react';
import DmforgeIcon from '../../../components/DmforgeIcon';

function Brackets() {
  const s = { position: 'absolute', width: 'var(--bracket-size)', height: 'var(--bracket-size)', border: '1px solid var(--bracket-line)', pointerEvents: 'none' };
  return (
    <>
      <span aria-hidden="true" style={{ ...s, left: 0, top: 0, borderRight: 'none', borderBottom: 'none' }} />
      <span aria-hidden="true" style={{ ...s, right: 0, top: 0, borderLeft: 'none', borderBottom: 'none' }} />
      <span aria-hidden="true" style={{ ...s, left: 0, bottom: 0, borderRight: 'none', borderTop: 'none' }} />
      <span aria-hidden="true" style={{ ...s, right: 0, bottom: 0, borderLeft: 'none', borderTop: 'none' }} />
    </>
  );
}

export function Panel({ title, code, icon, meta, actions, footer, children, flush = false, tone = 'panel', scroll = false, textured = false, brackets = true, style, bodyStyle }) {
  const bg = tone === 'raised' ? 'var(--surface-raised)' : tone === 'sunken' ? 'var(--surface-sunken)' : 'var(--surface-panel)';
  return (
    <section style={{
      position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0,
      background: bg, backgroundImage: textured ? 'var(--texture-surface)' : undefined,
      borderRadius: 'var(--radius-panel)', boxShadow: 'var(--shadow-panel)', ...style
    }}>
      {brackets ? <Brackets /> : null}
      {(title || code || actions) ? (
        <header style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minHeight: 42, padding: '0 var(--space-4)', flexShrink: 0 }}>
          {icon ? <DmforgeIcon name={icon} size={15} fallbackClass={'ph-fill ph-' + icon} style={{ color: 'var(--accent)' }} /> : null}
          {code ? <span style={{ fontFamily: 'var(--font-label)', fontSize: 'var(--type-micro)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--accent)', whiteSpace: 'nowrap' }}>{code}</span> : null}
          {title ? <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 'var(--display-weight)', fontSize: 'var(--type-display-sm)', letterSpacing: 'var(--display-tracking)', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>{title}</h3> : null}
          {meta ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--type-micro)', color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{meta}</span> : null}
          <span aria-hidden="true" style={{ flex: 1, minWidth: 'var(--space-4)', borderTop: 'var(--rule-dot)' }} />
          {actions}
        </header>
      ) : null}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', minHeight: 0, minWidth: 0,
        padding: flush ? 0 : 'var(--panel-pad)', paddingTop: (title || code) && !flush ? 'var(--space-2)' : undefined,
        flex: scroll ? 1 : undefined, overflowY: scroll ? 'auto' : undefined, ...bodyStyle
      }}>{children}</div>
      {footer ? <footer style={{ padding: 'var(--space-3) var(--space-4)', borderTop: 'var(--border-hairline)', flexShrink: 0 }}>{footer}</footer> : null}
    </section>
  );
}
