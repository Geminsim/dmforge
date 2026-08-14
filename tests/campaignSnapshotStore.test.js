import test from 'node:test';
import assert from 'node:assert/strict';
import { describeStorageError, safeWriteSetting } from '../src/utils/campaignSnapshotStore.js';

test('reports quota exhaustion instead of throwing through the UI', () => {
  const original = globalThis.localStorage;
  globalThis.localStorage = { setItem() { throw new DOMException('full', 'QuotaExceededError'); } };
  let message = '';
  try {
    assert.equal(safeWriteSetting('key', { large: true }, value => { message = value; }), false);
    assert.match(message, /存储空间不足/);
  } finally {
    globalThis.localStorage = original;
  }
});

test('provides useful detail for non-quota storage failures', () => {
  assert.match(describeStorageError(new Error('disk unavailable')), /disk unavailable/);
});
