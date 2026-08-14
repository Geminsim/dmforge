export function decideInitialSync({ role, serverHasState, serverTimestamp, localTimestamp }) {
  if (!serverHasState) return role === 'PLAYER' ? 'noop' : 'initialize-server';
  if (role === 'PLAYER') return serverTimestamp === localTimestamp ? 'matched' : 'pull-server';
  return serverTimestamp === localTimestamp ? 'matched' : 'conflict';
}

export function decidePollingSync({ role, revisionChanged, localDirty, conflictOpen }) {
  if (!revisionChanged) return role !== 'PLAYER' && localDirty && !conflictOpen ? 'retry-push' : 'noop';
  if (role === 'PLAYER') return 'pull-server';
  return localDirty ? 'conflict' : 'pull-server';
}
