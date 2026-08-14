const DATABASE_NAME = 'dmforge-campaign';
const DATABASE_VERSION = 1;
const STORE_NAME = 'snapshots';
const CURRENT_KEY = 'current';
const PREVIOUS_KEY = 'previous';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开浏览器存档数据库'));
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('浏览器存档数据库操作失败'));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error('浏览器存档事务失败'));
    transaction.onabort = () => reject(transaction.error || new Error('浏览器存档事务已中止'));
  });
}

export function describeStorageError(error) {
  if (error?.name === 'QuotaExceededError') return '浏览器存储空间不足。请导出备份后删除不再需要的大型 Excel 卡片或旧站点数据。';
  return `本地存档失败：${error?.message || '未知存储错误'}`;
}

export function safeWriteSetting(key, value, onError) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    onError?.(describeStorageError(error));
    return false;
  }
}

export async function loadCampaignSnapshot(key = CURRENT_KEY) {
  if (!globalThis.indexedDB) return null;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    return (await requestResult(transaction.objectStore(STORE_NAME).get(key)))?.campaign || null;
  } finally {
    database.close();
  }
}

export async function saveCampaignSnapshot(campaign) {
  if (!globalThis.indexedDB) throw new Error('当前浏览器不支持 IndexedDB，无法可靠保存大型战役存档');
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    const current = await requestResult(store.get(CURRENT_KEY));
    if (current) store.put({ ...current, key: PREVIOUS_KEY, label: '自动保存前版本' });
    store.put({ key: CURRENT_KEY, campaign, savedAt: Date.now(), label: '当前存档' });
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function createLocalRecoveryPoint(campaign, label = '手动恢复点') {
  const database = await openDatabase();
  const key = `recovery-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    const rows = await requestResult(store.getAll());
    rows.filter(row => row.key.startsWith('recovery-')).sort((a, b) => b.savedAt - a.savedAt).slice(9).forEach(row => store.delete(row.key));
    store.put({ key, campaign, savedAt: Date.now(), label });
    await transactionDone(transaction);
    return key;
  } finally {
    database.close();
  }
}

export async function listLocalRecoveryPoints() {
  if (!globalThis.indexedDB) return [];
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const rows = await requestResult(transaction.objectStore(STORE_NAME).getAll());
    return rows.filter(row => row.key !== CURRENT_KEY).map(row => ({ key: row.key, savedAt: row.savedAt, label: row.label })).sort((a, b) => b.savedAt - a.savedAt);
  } finally {
    database.close();
  }
}

export async function restoreLocalRecoveryPoint(key) {
  if (key === CURRENT_KEY || (!key.startsWith('recovery-') && key !== PREVIOUS_KEY)) throw new Error('无效的本地恢复点');
  const campaign = await loadCampaignSnapshot(key);
  if (!campaign) throw new Error('本地恢复点不存在');
  await saveCampaignSnapshot(campaign);
  return campaign;
}
