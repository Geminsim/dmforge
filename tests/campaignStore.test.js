import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignConflictError, CampaignStore } from '../server/campaignStore.js';

const campaign = timestamp => ({ characters: [], maps: [{ id: 'map', name: 'Map', width: 10, height: 10 }], floatingNotes: [], lastUpdated: timestamp });

test('writes atomically, creates backups, and rejects stale revisions', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-store-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new CampaignStore(directory);

  const first = store.write(campaign(1), '"empty"');
  assert.equal(store.read().data.lastUpdated, 1);
  const second = store.write(campaign(2), first.revision);
  assert.notEqual(second.revision, first.revision);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'campaign_state_backup.json'), 'utf8')).lastUpdated, 1);
  assert.ok(store.listBackups().some(backup => backup.valid));
  assert.throws(() => store.write(campaign(3), first.revision), CampaignConflictError);
  assert.equal(fs.readdirSync(directory).some(name => name.endsWith('.tmp')), false);
});

test('quarantines a corrupt primary and restores the newest valid backup', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-recovery-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new CampaignStore(directory);
  const first = store.write(campaign(1), '"empty"');
  store.write(campaign(2), first.revision);
  fs.writeFileSync(path.join(directory, 'campaign_state.json'), '{broken', 'utf8');
  const recovered = store.read();
  assert.equal(recovered.data.lastUpdated, 1);
  assert.ok(recovered.recoveredFrom);
  assert.ok(fs.readdirSync(directory).some(name => name.startsWith('campaign_state.corrupt-')));
});

test('restores a selected backup while creating a pre-restore recovery point', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-restore-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new CampaignStore(directory);
  const first = store.write(campaign(1), '"empty"');
  const second = store.write(campaign(2), first.revision);
  const backup = store.listBackups().find(entry => entry.valid && entry.name !== 'campaign_state_backup.json');
  const restored = store.restoreBackup(backup.name, second.revision);
  assert.equal(store.read().data.lastUpdated, 1);
  assert.ok(restored.revision);
});

test('preserves the prior campaign when a simulated crash happens after backup', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-fault-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const stableStore = new CampaignStore(directory);
  const first = stableStore.write(campaign(1), '"empty"');
  const crashingStore = new CampaignStore(directory, {
    faultInjector(stage) {
      if (stage === 'after-backup-before-primary-write') throw new Error('simulated power loss');
    }
  });
  assert.throws(() => crashingStore.write(campaign(2), first.revision), /simulated power loss/);
  assert.equal(stableStore.read().data.lastUpdated, 1);
  assert.ok(stableStore.listBackups().some(backup => backup.valid));
});

test('creates a named manual backup without changing the campaign revision', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-manual-backup-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new CampaignStore(directory);
  const current = store.write(campaign(1), '"empty"');
  const manual = store.createManualBackup(current.revision);
  assert.match(manual.backupName, /-manual-/);
  assert.equal(manual.revision, current.revision);
  assert.equal(store.read().data.lastUpdated, 1);
  assert.throws(() => store.createManualBackup('"stale"'), CampaignConflictError);
});
