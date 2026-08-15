const DATABASE_NAME = 'dmforge-campaign';
const DATABASE_VERSION = 2;
const STORE_NAME = 'snapshots';
const CURRENT_KEY = 'current';
const PREVIOUS_KEY = 'previous';
const ACTIVE_CAMPAIGN_SETTING = 'dmforge_activeCampaignId';
const CATALOG_PREFIX = 'catalog:';
const CAMPAIGN_PREFIX = 'campaign:';
const LEGACY_CAMPAIGN_ID = 'legacy-current';

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

export function getActiveCampaignId() {
  try { return localStorage.getItem(ACTIVE_CAMPAIGN_SETTING) || ''; }
  catch { return ''; }
}

export function setActiveCampaignId(campaignId) {
  if (!campaignId) throw new Error('战役 ID 不能为空');
  localStorage.setItem(ACTIVE_CAMPAIGN_SETTING, campaignId);
}

const campaignKey = campaignId => `${CAMPAIGN_PREFIX}${campaignId}:current`;
const previousCampaignKey = campaignId => `${CAMPAIGN_PREFIX}${campaignId}:previous`;
const recoveryPrefix = campaignId => `${CAMPAIGN_PREFIX}${campaignId}:recovery:`;

async function allRows() {
  if (!globalThis.indexedDB) return [];
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    return await requestResult(transaction.objectStore(STORE_NAME).getAll());
  } finally { database.close(); }
}

export async function ensureLegacyCampaignMigration() {
  if (!globalThis.indexedDB || getActiveCampaignId()) return getActiveCampaignId();
  const legacy = await loadCampaignSnapshot(CURRENT_KEY);
  if (!legacy) return '';
  const id = LEGACY_CAMPAIGN_ID;
  const now = Date.now();
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key: campaignKey(id), campaign: legacy, savedAt: now, label: '迁移的旧存档' });
    store.put({ key: `${CATALOG_PREFIX}${id}`, metadata: { id, name: legacy.metadata?.name || '迁移的旧战役', templateId: 'legacy', createdAt: now, updatedAt: now }, savedAt: now });
    await transactionDone(transaction);
  } finally { database.close(); }
  setActiveCampaignId(id);
  return id;
}

export async function listCampaigns() {
  return (await allRows()).filter(row => row.key.startsWith(CATALOG_PREFIX)).map(row => row.metadata).filter(Boolean).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export async function listCampaignRecoveryPoints(campaignId) {
  if (!campaignId) return [];
  const previous = previousCampaignKey(campaignId);
  const prefix = recoveryPrefix(campaignId);
  return (await allRows()).filter(row => row.key === previous || row.key.startsWith(prefix)).map(row => ({ key: row.key, savedAt: row.savedAt, label: row.label })).sort((a, b) => b.savedAt - a.savedAt);
}

export async function restoreCampaignRecoveryPoint(campaignId, key) {
  const valid = key === previousCampaignKey(campaignId) || key.startsWith(recoveryPrefix(campaignId));
  if (!valid) throw new Error('无效的战役恢复点');
  const campaign = await loadCampaignSnapshot(key);
  if (!campaign) throw new Error('恢复点不存在');
  setActiveCampaignId(campaignId);
  await saveCampaignSnapshot(campaign);
  return campaign;
}

export async function createCampaign(campaign, metadata = {}) {
  if (!globalThis.indexedDB) throw new Error('当前浏览器不支持 IndexedDB');
  const id = metadata.id || `campaign-${crypto.randomUUID?.() || Date.now().toString(36)}`;
  const now = Date.now();
  const entry = { id, name: metadata.name || campaign.metadata?.name || '未命名战役', templateId: metadata.templateId || campaign.metadata?.templateId || 'blank', templateVersion: metadata.templateVersion || campaign.metadata?.templateVersion || '1', createdAt: metadata.createdAt || now, updatedAt: now };
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    store.put({ key: campaignKey(id), campaign: structuredClone(campaign), savedAt: now, label: entry.name });
    store.put({ key: `${CATALOG_PREFIX}${id}`, metadata: entry, savedAt: now });
    await transactionDone(transaction);
  } finally { database.close(); }
  setActiveCampaignId(id);
  return entry;
}

export async function deleteCampaign(campaignId) {
  if (!campaignId) throw new Error('战役 ID 不能为空');
  const rows = await allRows();
  const keys = rows.map(row => row.key).filter(key => key === `${CATALOG_PREFIX}${campaignId}` || key.startsWith(`${CAMPAIGN_PREFIX}${campaignId}:`));
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    keys.forEach(key => store.delete(key));
    await transactionDone(transaction);
  } finally { database.close(); }
  if (getActiveCampaignId() === campaignId) localStorage.removeItem(ACTIVE_CAMPAIGN_SETTING);
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

export async function loadActiveCampaignSnapshot() {
  const id = getActiveCampaignId();
  return id ? loadCampaignSnapshot(campaignKey(id)) : null;
}

export async function saveCampaignSnapshot(campaign) {
  if (!globalThis.indexedDB) throw new Error('当前浏览器不支持 IndexedDB，无法可靠保存大型战役存档');
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    const id = getActiveCampaignId();
    const currentKey = id ? campaignKey(id) : CURRENT_KEY;
    const previousKey = id ? previousCampaignKey(id) : PREVIOUS_KEY;
    const current = await requestResult(store.get(currentKey));
    if (current) store.put({ ...current, key: previousKey, label: '自动保存前版本' });
    const now = Date.now();
    store.put({ key: currentKey, campaign, savedAt: now, label: '当前存档' });
    if (id) {
      const catalogKey = `${CATALOG_PREFIX}${id}`;
      const catalog = await requestResult(store.get(catalogKey));
      store.put({ key: catalogKey, metadata: { ...(catalog?.metadata || { id, createdAt: now }), name: campaign.metadata?.name || catalog?.metadata?.name || '未命名战役', updatedAt: now }, savedAt: now });
    }
    await transactionDone(transaction);
  } finally {
    database.close();
  }
}

export async function createLocalRecoveryPoint(campaign, label = '手动恢复点') {
  const database = await openDatabase();
  const id = getActiveCampaignId();
  const key = id ? `${recoveryPrefix(id)}${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}` : `recovery-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  try {
    const transaction = database.transaction(STORE_NAME, 'readwrite', { durability: 'strict' });
    const store = transaction.objectStore(STORE_NAME);
    const rows = await requestResult(store.getAll());
    const prefix = id ? recoveryPrefix(id) : 'recovery-';
    rows.filter(row => row.key.startsWith(prefix)).sort((a, b) => b.savedAt - a.savedAt).slice(9).forEach(row => store.delete(row.key));
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
    const id = getActiveCampaignId();
    const allowed = id ? [previousCampaignKey(id), recoveryPrefix(id)] : [PREVIOUS_KEY, 'recovery-'];
    return rows.filter(row => row.key === allowed[0] || row.key.startsWith(allowed[1])).map(row => ({ key: row.key, savedAt: row.savedAt, label: row.label })).sort((a, b) => b.savedAt - a.savedAt);
  } finally {
    database.close();
  }
}

export async function restoreLocalRecoveryPoint(key) {
  const id = getActiveCampaignId();
  const valid = id ? key === previousCampaignKey(id) || key.startsWith(recoveryPrefix(id)) : key === PREVIOUS_KEY || key.startsWith('recovery-');
  if (!valid) throw new Error('无效的本地恢复点');
  const campaign = await loadCampaignSnapshot(key);
  if (!campaign) throw new Error('本地恢复点不存在');
  await saveCampaignSnapshot(campaign);
  return campaign;
}
