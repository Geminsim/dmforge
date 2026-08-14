let worker;
let nextId = 1;
const pending = new Map();

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/json.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      const request = pending.get(event.data.id);
      if (!request) return;
      pending.delete(event.data.id);
      if (event.data.error) request.reject(new Error(event.data.error));
      else request.resolve(event.data.text);
    };
    worker.onerror = error => {
      for (const request of pending.values()) request.reject(error);
      pending.clear();
      worker.terminate();
      worker = null;
    };
  }
  return worker;
}

export function serializeJsonOffThread(value, pretty = false) {
  if (!globalThis.Worker) return Promise.resolve(JSON.stringify(value, null, pretty ? 2 : 0));
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    getWorker().postMessage({ id, value, pretty });
  });
}
