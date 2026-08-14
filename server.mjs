import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CampaignBackupError, CampaignConflictError, CampaignStore } from './server/campaignStore.js';
import { MAX_CAMPAIGN_FILE_BYTES } from './src/utils/campaignValidation.js';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.argv.includes('--dev');
const port = Number(process.env.DMFORGE_PORT || 5173);
const host = process.env.DMFORGE_HOST || '127.0.0.1';
const syncToken = process.env.DMFORGE_SYNC_TOKEN || '';
const readToken = process.env.DMFORGE_READ_TOKEN || '';
const tlsCertPath = process.env.DMFORGE_TLS_CERT || '';
const tlsKeyPath = process.env.DMFORGE_TLS_KEY || '';
const dataDirectory = path.resolve(process.env.DMFORGE_DATA_DIR || rootDirectory);
fs.mkdirSync(dataDirectory, { recursive: true });
const store = new CampaignStore(dataDirectory);

if (host !== '127.0.0.1' && host !== 'localhost' && !syncToken) {
  throw new Error('DMFORGE_SYNC_TOKEN is required when listening beyond localhost.');
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

function tokenMatches(supplied, expected) {
  if (!expected) return false;
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return suppliedBytes.length === expectedBytes.length && suppliedBytes.length > 0 && crypto.timingSafeEqual(suppliedBytes, expectedBytes);
}

function authorizationRole(request) {
  if (!syncToken && !readToken) return 'write';
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  if (tokenMatches(supplied, syncToken)) return 'write';
  if (tokenMatches(supplied, readToken)) return 'read';
  return null;
}

async function handleCampaign(request, response) {
  const role = authorizationRole(request);
  if (!role) return json(response, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
  if (request.method === 'GET') {
    const current = store.read();
    return json(response, 200, current.data, {
      'Cache-Control': 'no-store', ETag: current.revision,
      ...(current.recoveredFrom ? { 'X-DMForge-Recovered-From': current.recoveredFrom } : {})
    });
  }
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  if (role !== 'write') return json(response, 403, { error: 'Read-only token cannot modify campaign data' });

  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_CAMPAIGN_FILE_BYTES) return json(response, 413, { error: 'Campaign payload is too large' });
    chunks.push(chunk);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    const result = store.write(data, request.headers['if-match'] || '"missing"');
    return json(response, 200, { success: true }, { ETag: result.revision });
  } catch (error) {
    if (error instanceof CampaignConflictError) {
      const current = store.read();
      return json(response, 409, { error: 'Campaign was changed by another client', campaign: current.data, revision: current.revision }, { ETag: current.revision });
    }
    console.error('Campaign write rejected:', error.message);
    return json(response, 400, { error: 'Invalid campaign payload' });
  }
}

async function readJsonBody(request, response) {
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 64 * 1024) {
      json(response, 413, { error: 'Request payload is too large' });
      return null;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { json(response, 400, { error: 'Invalid JSON payload' }); return null; }
}

async function handleBackups(request, response, pathname) {
  const role = authorizationRole(request);
  if (!role) return json(response, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
  if (pathname === '/api/backups' && request.method === 'GET') {
    return json(response, 200, { backups: store.listBackups() }, { 'Cache-Control': 'no-store' });
  }
  if (pathname === '/api/backups' && request.method === 'POST') {
    if (role !== 'write') return json(response, 403, { error: 'Read-only token cannot create backups' });
    try {
      const result = store.createManualBackup(request.headers['if-match'] || '"missing"');
      return json(response, 201, { success: true, backup: result.backupName }, { ETag: result.revision });
    } catch (error) {
      if (error instanceof CampaignConflictError) {
        const current = store.read();
        return json(response, 409, { error: 'Campaign changed before backup', campaign: current.data, revision: current.revision }, { ETag: current.revision });
      }
      if (error instanceof CampaignBackupError) return json(response, 400, { error: error.message });
      throw error;
    }
  }
  if (pathname === '/api/backups/restore' && request.method === 'POST') {
    if (role !== 'write') return json(response, 403, { error: 'Read-only token cannot restore backups' });
    const body = await readJsonBody(request, response);
    if (!body) return;
    try {
      const result = store.restoreBackup(body.name, request.headers['if-match'] || '"missing"');
      const current = store.read();
      return json(response, 200, { success: true, campaign: current.data }, { ETag: result.revision });
    } catch (error) {
      if (error instanceof CampaignConflictError) {
        const current = store.read();
        return json(response, 409, { error: 'Campaign was changed before restore', campaign: current.data, revision: current.revision }, { ETag: current.revision });
      }
      if (error instanceof CampaignBackupError) return json(response, 400, { error: error.message });
      throw error;
    }
  }
  return json(response, 405, { error: 'Method not allowed' }, { Allow: pathname === '/api/backups' ? 'GET, POST' : 'POST' });
}

let vite;
if (isDevelopment) {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
}

const requestHandler = async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname === '/api/health') return json(response, 200, { status: 'ok', authRequired: Boolean(syncToken || readToken), readOnlySupported: Boolean(readToken), transport: tlsCertPath ? 'https' : 'http' });
    if (pathname === '/api/campaign') return await handleCampaign(request, response);
    if (pathname === '/api/backups' || pathname === '/api/backups/restore') return await handleBackups(request, response, pathname);
    if (vite) return vite.middlewares(request, response, error => error && json(response, 500, { error: 'Development server error' }));

    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(rootDirectory, 'dist', requested);
    const distRoot = path.resolve(rootDirectory, 'dist');
    if (!filePath.startsWith(distRoot + path.sep) && filePath !== path.join(distRoot, 'index.html')) return json(response, 403, { error: 'Forbidden' });
    const target = fs.existsSync(filePath) && fs.statSync(filePath).isFile() ? filePath : path.join(distRoot, 'index.html');
    const extension = path.extname(target);
    const contentType = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' }[extension] || 'application/octet-stream';
    response.writeHead(200, {
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self'",
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(target).pipe(response);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(response, 500, { error: 'Internal server error' });
    else response.end();
  }
};

if (Boolean(tlsCertPath) !== Boolean(tlsKeyPath)) throw new Error('DMFORGE_TLS_CERT and DMFORGE_TLS_KEY must be configured together.');
const server = tlsCertPath
  ? https.createServer({ cert: fs.readFileSync(tlsCertPath), key: fs.readFileSync(tlsKeyPath) }, requestHandler)
  : http.createServer(requestHandler);

server.listen(port, host, () => {
  console.log(`DMForge ${isDevelopment ? 'development' : 'production'} server: ${tlsCertPath ? 'https' : 'http'}://${host}:${port}`);
  console.log(syncToken ? `Campaign API authentication enabled${readToken ? ' (writer + read-only roles)' : ''}.` : 'Campaign API is local-only without authentication.');
});
