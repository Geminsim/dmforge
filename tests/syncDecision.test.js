import test from 'node:test';
import assert from 'node:assert/strict';
import { decideInitialSync, decidePollingSync } from '../src/utils/syncDecision.js';

test('never auto-overwrites a nonempty server when DM timestamps differ', () => {
  assert.equal(decideInitialSync({ role: 'DM', serverHasState: true, serverTimestamp: 10, localTimestamp: 20 }), 'conflict');
  assert.equal(decideInitialSync({ role: 'DM', serverHasState: true, serverTimestamp: 30, localTimestamp: 20 }), 'conflict');
});

test('pulls or conflicts based on revision changes and unsaved local edits', () => {
  assert.equal(decidePollingSync({ role: 'DM', revisionChanged: true, localDirty: false, conflictOpen: false }), 'pull-server');
  assert.equal(decidePollingSync({ role: 'DM', revisionChanged: true, localDirty: true, conflictOpen: false }), 'conflict');
  assert.equal(decidePollingSync({ role: 'PLAYER', revisionChanged: true, localDirty: true, conflictOpen: false }), 'pull-server');
  assert.equal(decidePollingSync({ role: 'DM', revisionChanged: false, localDirty: true, conflictOpen: false }), 'retry-push');
});
