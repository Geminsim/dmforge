export function resolveSyncToken(hash, savedToken = '') {
  const bootstrapToken = new URLSearchParams(String(hash || '').replace(/^#/, '')).get('syncToken');
  return bootstrapToken && /^[a-f0-9]{64}$/i.test(bootstrapToken) ? bootstrapToken : savedToken;
}
