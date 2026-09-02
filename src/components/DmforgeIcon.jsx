const iconModules = import.meta.glob('../assets/dmforge-icons/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
});

const iconUrls = Object.fromEntries(Object.entries(iconModules).map(([path, url]) => [
  path.split('/').pop().replace(/\.svg$/, ''),
  url
]));

const ICON_ALIASES = Object.freeze({
  plus: 'add', 'file-plus': 'add', 'folder-plus': 'new-folder', minus: 'remove', x: 'close',
  trash: 'delete', 'pencil-simple': 'edit', 'floppy-disk': 'save', check: 'confirm', copy: 'copy',
  'arrow-u-up-left': 'undo', 'arrow-counter-clockwise': 'undo', 'arrow-clockwise': 'redo',
  'arrows-clockwise': 'refresh', 'magnifying-glass': 'search', 'magnifying-glass-plus': 'zoom-in',
  'magnifying-glass-minus': 'zoom-out', 'corners-out': 'fit-view', 'arrows-out-cardinal': 'fit-view',
  'gear-six': 'settings', 'folder-open': 'open-folder', 'download-simple': 'download',
  'file-xls': 'import-file', 'file-xls-fill': 'import-file', 'paper-plane-tilt': 'export-file',
  warning: 'warning', broadcast: 'broadcast', 'monitor-play': 'monitor', 'skip-forward': 'next-turn',
  sidebar: 'sidebar-left', 'sidebar-simple': 'sidebar-right', backpack: 'backpack', flashlight: 'flashlight',
  wall: 'wall', eye: 'vision', 'eye-closed': 'occlusion', trap: 'trap', 'identification-card': 'character-card',
  'note-pencil': 'biography', star: 'feat', 'seal-check': 'feat',
  'map-pin-simple-area': 'map-area', 'map-trifold': 'map'
});

function resolveDmforgeIcon(name) {
  const resolved = ICON_ALIASES[name] || name;
  return iconUrls[resolved] ? { name: resolved, url: iconUrls[resolved] } : null;
}

export default function DmforgeIcon({ name, size = 18, title, className = '', fallbackClass = '', style }) {
  const resolved = resolveDmforgeIcon(name);
  if (!resolved) return fallbackClass ? <i className={fallbackClass} aria-hidden="true" style={{ fontSize: size, lineHeight: 1, ...style }} /> : null;
  const { url } = resolved;
  return <span
    className={`dmforge-icon ${className}`}
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : 'true'}
    style={{
      width: size,
      height: size,
      flex: `0 0 ${size}px`,
      display: 'inline-block',
      backgroundColor: 'currentColor',
      WebkitMaskImage: `url("${url}")`,
      maskImage: `url("${url}")`,
      WebkitMaskPosition: 'center',
      maskPosition: 'center',
      WebkitMaskSize: 'contain',
      maskSize: 'contain',
      WebkitMaskRepeat: 'no-repeat',
      maskRepeat: 'no-repeat',
      ...style
    }}
  />;
}
