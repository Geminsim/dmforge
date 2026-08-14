import test from 'node:test';
import assert from 'node:assert/strict';
import { assertValidCampaign, prepareCampaign } from '../src/utils/campaignValidation.js';

const validCampaign = () => ({ characters: [], maps: [{ id: 'map-1', name: 'Map', width: 10, height: 10 }], floatingNotes: [] });

test('accepts a minimal valid campaign', () => {
  assert.equal(prepareCampaign(validCampaign()).maps[0].id, 'map-1');
});

test('rejects missing required collections', () => {
  assert.throws(() => prepareCampaign({ maps: [] }), /至少需要一张地图/);
});

test('rejects empty map collections', () => {
  assert.throws(() => prepareCampaign({ ...validCampaign(), maps: [] }), /至少需要一张地图/);
});

test('rejects prototype-manipulation keys', () => {
  const campaign = validCampaign();
  campaign.maps[0] = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => prepareCampaign(campaign), /禁止字段/);
});

test('rejects oversized collections', () => {
  const campaign = validCampaign();
  campaign.logs = new Array(10_001).fill(null);
  assert.throws(() => prepareCampaign(campaign), /项限制/);
});

test('rejects null entities, duplicate ids, and broken references', () => {
  assert.throws(() => prepareCampaign({ ...validCampaign(), characters: [null] }), /必须是对象/);
  assert.throws(() => prepareCampaign({ ...validCampaign(), characters: [{ id: 'x', name: 'A' }, { id: 'x', name: 'B' }] }), /重复 ID/);
  assert.throws(() => prepareCampaign({ ...validCampaign(), characters: [{ id: 'x', name: 'A', mapId: 'missing' }] }), /引用不存在的地图/);
});

test('migrates legacy saves to schema version 2', () => {
  assert.equal(prepareCampaign(validCampaign()).schemaVersion, 2);
  assert.throws(() => assertValidCampaign(validCampaign()), /schemaVersion/);
});
