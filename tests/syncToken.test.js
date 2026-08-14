import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSyncToken } from '../src/utils/syncToken.js';

test('uses a valid paired token from the URL fragment', () => {
  const token = 'a'.repeat(64);
  assert.equal(resolveSyncToken(`#syncToken=${token}`, 'saved'), token);
});

test('falls back to the saved token when pairing data is missing or invalid', () => {
  assert.equal(resolveSyncToken('', 'saved'), 'saved');
  assert.equal(resolveSyncToken('#syncToken=short', 'saved'), 'saved');
});
