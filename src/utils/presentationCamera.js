const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export function capturePresentationCamera(transform = {}, viewport = {}) {
  const scale = Math.max(.01, finite(transform.scale, 1));
  const x = finite(transform.positionX ?? transform.x);
  const y = finite(transform.positionY ?? transform.y);
  return {
    scale, x, y,
    centerX: (finite(viewport.width) / 2 - x) / scale,
    centerY: (finite(viewport.height) / 2 - y) / scale
  };
}

export function projectPresentationCamera(camera = {}, viewport = {}) {
  const scale = Math.max(.01, finite(camera.scale, 1));
  const hasCenter = Number.isFinite(Number(camera.centerX)) && Number.isFinite(Number(camera.centerY));
  return {
    scale,
    x: hasCenter ? finite(viewport.width) / 2 - Number(camera.centerX) * scale : finite(camera.x),
    y: hasCenter ? finite(viewport.height) / 2 - Number(camera.centerY) * scale : finite(camera.y)
  };
}

export const samePresentationCamera = (a, b) => Boolean(a && b)
  && Math.abs(a.scale - b.scale) < .002
  && Math.abs(a.x - b.x) < .25
  && Math.abs(a.y - b.y) < .25;
