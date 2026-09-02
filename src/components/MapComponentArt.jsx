const componentModules = import.meta.glob('../assets/map-components/*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
});

const componentUrls = Object.fromEntries(Object.entries(componentModules).map(([path, url]) => [
  path.split('/').pop().replace(/\.svg$/, ''),
  url
]));

export default function MapComponentArt({ assetKey, state = 'normal', fit = 'fill', selected = false }) {
  const src = componentUrls[assetKey];
  if (!src) return null;
  return <img
    src={src}
    alt=""
    aria-hidden="true"
    draggable="false"
    data-component-state={state}
    style={{
      position: 'absolute',
      inset: 2,
      width: 'calc(100% - 4px)',
      height: 'calc(100% - 4px)',
      objectFit: fit,
      pointerEvents: 'none',
      userSelect: 'none',
      filter: selected ? 'drop-shadow(0 0 4px rgba(154, 108, 175, 0.7))' : 'none',
      transition: 'filter 140ms ease-out'
    }}
  />;
}
