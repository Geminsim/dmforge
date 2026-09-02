class MinHeap {
  constructor() { this.items = []; }
  get length() { return this.items.length; }
  push(node) {
    this.items.push(node);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].f <= node.f) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = node;
  }
  pop() {
    const root = this.items[0];
    const tail = this.items.pop();
    if (this.items.length && tail) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.items.length) break;
        const child = right < this.items.length && this.items[right].f < this.items[left].f ? right : left;
        if (this.items[child].f >= tail.f) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = tail;
    }
    return root;
  }
}

const octile = (x, y, endX, endY) => {
  const dx = Math.abs(endX - x);
  const dy = Math.abs(endY - y);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
};

export function findShortestPath(startX, startY, endX, endY, mapWidth, mapHeight, isBlocked, isDifficult, canTraverse = () => true) {
  if (startX === endX && startY === endY) return [{ x: startX, y: startY }];
  if (startX < 0 || startX >= mapWidth || startY < 0 || startY >= mapHeight) return null;
  if (endX < 0 || endX >= mapWidth || endY < 0 || endY >= mapHeight) return null;

  const toKey = (x, y) => `${x}_${y}`;
  const startKey = toKey(startX, startY);
  const openSet = new MinHeap();
  openSet.push({ x: startX, y: startY, f: octile(startX, startY, endX, endY), g: 0 });
  const closedSet = new Set();
  const gScore = { [startKey]: 0 };
  const cameFrom = {};

  while (openSet.length > 0) {
    const current = openSet.pop();
    const currentKey = toKey(current.x, current.y);
    if (closedSet.has(currentKey) || current.g !== gScore[currentKey]) continue;

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
        if (closedSet.has(key) || isBlocked(x, y) || !canTraverse(current.x, current.y, x, y)) continue;
        if (dx !== 0 && dy !== 0 && isBlocked(current.x + dx, current.y) && isBlocked(current.x, current.y + dy)) continue;

        let cost = dx !== 0 && dy !== 0 ? Math.SQRT2 : 1;
        if (isDifficult?.(x, y)) cost *= 2;
        const candidate = gScore[currentKey] + cost;
        if (gScore[key] !== undefined && candidate >= gScore[key]) continue;

        cameFrom[key] = currentKey;
        gScore[key] = candidate;
        const f = candidate + octile(x, y, endX, endY);
        openSet.push({ x, y, f, g: candidate });
      }
    }
  }
  return null;
}

const pathCache = new WeakMap();

/** Keep the most recent drag routes for one immutable terrain/actor query. */
export function findShortestPathCached(startX, startY, endX, endY, mapWidth, mapHeight, isBlocked, isDifficult, canTraverse) {
  let cache = pathCache.get(isBlocked);
  if (!cache || cache.isDifficult !== isDifficult || cache.canTraverse !== canTraverse
    || cache.mapWidth !== mapWidth || cache.mapHeight !== mapHeight) {
    cache = { isDifficult, canTraverse, mapWidth, mapHeight, entries: new Map() };
    pathCache.set(isBlocked, cache);
  }
  const key = `${startX}_${startY}_${endX}_${endY}`;
  if (cache.entries.has(key)) return cache.entries.get(key);
  const path = findShortestPath(startX, startY, endX, endY, mapWidth, mapHeight, isBlocked, isDifficult, canTraverse);
  if (cache.entries.size >= 128) cache.entries.delete(cache.entries.keys().next().value);
  cache.entries.set(key, path);
  return path;
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
