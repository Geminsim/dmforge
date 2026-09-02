export default function BrandMark({ size = 28, framed = false, subtle = false, style, title = 'DMForge' }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        width: size,
        height: size,
        flex: `0 0 ${size}px`,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: framed ? Math.max(3, Math.round(size * .08)) : 0,
        borderRadius: framed ? Math.max(6, Math.round(size * .18)) : 0,
        background: framed ? 'var(--surface-raised)' : 'transparent',
        opacity: subtle ? .72 : 1,
        ...style
      }}
    >
      <span className="dmf-logo-adaptive" aria-hidden="true" style={{ width: '100%', height: '100%' }} />
    </span>
  );
}
