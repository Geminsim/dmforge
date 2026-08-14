import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

globalThis.crypto ??= webcrypto;
globalThis.btoa ??= value => Buffer.from(value, 'binary').toString('base64');
globalThis.atob ??= value => Buffer.from(value, 'base64').toString('binary');

const { createCampaignExport, openCampaignExport } = await import('../src/utils/campaignExport.js');
const campaign = { schemaVersion: 2, maps: [{ id: 'm1' }], secret: 'dragon' };

test('round-trips and detects tampering in a plain campaign export', async () => {
  const exported = await createCampaignExport(campaign);
  assert.deepEqual(await openCampaignExport(exported), campaign);
  exported.campaign.secret = 'tampered';
  await assert.rejects(() => openCampaignExport(exported), /校验和/);
});

test('encrypts campaign exports with authenticated AES-GCM', async () => {
  const exported = await createCampaignExport(campaign, 'correct horse battery staple');
  assert.equal(exported.encrypted, true);
  assert.equal(JSON.stringify(exported).includes('dragon'), false);
  assert.deepEqual(await openCampaignExport(exported, 'correct horse battery staple'), campaign);
  await assert.rejects(() => openCampaignExport(exported, 'wrong'), /密码错误/);
});
