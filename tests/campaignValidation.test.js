import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidCampaign } from '../src/utils/campaignValidation.js';

const validCampaign = () => ({ characters: [], maps: [{ id: 'map-1' }], floatingNotes: [] });

test('accepts a minimal valid campaign', () => {
  assert.equal(assertValidCampaign(validCampaign()).maps[0].id, 'map-1');
});

test('rejects missing required collections', () => {
  assert.throws(() => assertValidCampaign({ maps: [] }), /characters/);
});

test('rejects empty map collections', () => {
  assert.throws(() => assertValidCampaign({ ...validCampaign(), maps: [] }), /至少需要一张地图/);
});

test('rejects prototype-manipulation keys', () => {
  const campaign = validCampaign();
  campaign.maps[0] = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => assertValidCampaign(campaign), /禁止字段/);
});

test('rejects oversized collections', () => {
  const campaign = validCampaign();
  campaign.logs = new Array(10_001).fill(null);
  assert.throws(() => assertValidCampaign(campaign), /安全数量上限/);
});
