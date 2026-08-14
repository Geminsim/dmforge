export function findShortestPath(startX, startY, endX, endY, mapWidth, mapHeight, isBlocked, isDifficult) {
  if (startX === endX && startY === endY) return [{ x: startX, y: startY }];
  if (startX < 0 || startX >= mapWidth || startY < 0 || startY >= mapHeight) return null;
  if (endX < 0 || endX >= mapWidth || endY < 0 || endY >= mapHeight) return null;

  const toKey = (x, y) => `${x}_${y}`;
  const startKey = toKey(startX, startY);
  const openSet = [{ x: startX, y: startY, f: Math.hypot(endX - startX, endY - startY) }];
  const closedSet = new Set();
  const gScore = { [startKey]: 0 };
  const cameFrom = {};

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    const currentKey = toKey(current.x, current.y);

    if (current.x === endX && current.y === endY) {
      const path = [];
      let key = currentKey;
      while (key in cameFrom) {
        const [x, y] = key.split('_').map(Number);
        path.push({ x, y });
        key = cameFrom[key];
      }
      path.push({ x: startX, y: startY });
      return path.reverse();
    }

    closedSet.add(currentKey);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const x = current.x + dx;
        const y = current.y + dy;
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) continue;
        const key = toKey(x, y);
        if (closedSet.has(key) || isBlocked(x, y)) continue;
        if (dx !== 0 && dy !== 0 && isBlocked(current.x + dx, current.y) && isBlocked(current.x, current.y + dy)) continue;

        let cost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
        if (isDifficult?.(x, y)) cost *= 2;
        const candidate = gScore[currentKey] + cost;
        if (gScore[key] !== undefined && candidate >= gScore[key]) continue;

        cameFrom[key] = currentKey;
        gScore[key] = candidate;
        const f = candidate + Math.hypot(endX - x, endY - y);
        const existing = openSet.find(node => node.x === x && node.y === y);
        if (existing) existing.f = f;
        else openSet.push({ x, y, f });
      }
    }
  }
  return null;
}

export function measurePath(path, isDifficult) {
  if (!path || path.length < 2) return 0;
  let distance = 0;
  for (let index = 1; index < path.length; index++) {
    const previous = path[index - 1];
    const current = path[index];
    let step = previous.x !== current.x && previous.y !== current.y ? Math.SQRT2 : 1;
    if (isDifficult?.(current.x, current.y)) step *= 2;
    distance += step;
  }
  return distance;
}
