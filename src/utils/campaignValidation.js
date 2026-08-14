const REQUIRED_ARRAY_FIELDS = ['characters', 'maps', 'floatingNotes'];
const COLLECTION_FIELDS = [
  'characters', 'maps', 'floatingNotes', 'itemPool', 'itemTemplates', 'logs',
  'excelCards', 'groups', 'combatParticipants', 'combatTurnOrder'
];
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const MAX_CAMPAIGN_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CAMPAIGN_COLLECTION_ITEMS = 10_000;

function assertNoDangerousKeys(value, depth = 0) {
  if (depth > 20) throw new Error('存档嵌套层级超过安全上限。');
  if (!value || typeof value !== 'object') return;

  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error(`存档包含禁止字段：${key}`);
    assertNoDangerousKeys(value[key], depth + 1);
  }
}

export function assertValidCampaign(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('战役存档必须是 JSON 对象。');
  }

  for (const field of REQUIRED_ARRAY_FIELDS) {
    if (!Array.isArray(value[field])) throw new Error(`战役存档缺少有效字段：${field}`);
  }
  if (value.maps.length === 0) throw new Error('战役存档至少需要一张地图。');

  for (const field of COLLECTION_FIELDS) {
    if (value[field] !== undefined && !Array.isArray(value[field])) {
      throw new Error(`战役存档字段 ${field} 必须是数组。`);
    }
    if (value[field]?.length > MAX_CAMPAIGN_COLLECTION_ITEMS) {
      throw new Error(`战役存档字段 ${field} 超过安全数量上限。`);
    }
  }

  assertNoDangerousKeys(value);
  return value;
}
