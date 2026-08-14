import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CampaignConflictError, CampaignStore } from '../server/campaignStore.js';

const campaign = timestamp => ({ characters: [], maps: [{ id: 'map' }], floatingNotes: [], lastUpdated: timestamp });

test('writes atomically, creates backups, and rejects stale revisions', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dmforge-store-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const store = new CampaignStore(directory);

  const first = store.write(campaign(1), '"empty"');
  assert.equal(store.read().data.lastUpdated, 1);
  const second = store.write(campaign(2), first.revision);
  assert.notEqual(second.revision, first.revision);
  assert.equal(JSON.parse(fs.readFileSync(path.join(directory, 'campaign_state_backup.json'), 'utf8')).lastUpdated, 1);
  assert.throws(() => store.write(campaign(3), first.revision), CampaignConflictError);
  assert.equal(fs.existsSync(path.join(directory, 'campaign_state.tmp.json')), false);
});
