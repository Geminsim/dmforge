import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CampaignConflictError, CampaignStore } from './server/campaignStore.js';
import { MAX_CAMPAIGN_FILE_BYTES } from './src/utils/campaignValidation.js';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));
const isDevelopment = process.argv.includes('--dev');
const port = Number(process.env.DMFORGE_PORT || 5173);
const host = process.env.DMFORGE_HOST || '127.0.0.1';
const syncToken = process.env.DMFORGE_SYNC_TOKEN || '';
const store = new CampaignStore(rootDirectory);

if (host !== '127.0.0.1' && host !== 'localhost' && !syncToken) {
  throw new Error('DMFORGE_SYNC_TOKEN is required when listening beyond localhost.');
}

function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
  response.end(JSON.stringify(body));
}

function isAuthorized(request) {
  if (!syncToken) return true;
  const supplied = request.headers.authorization?.replace(/^Bearer\s+/i, '') || '';
  const suppliedBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(syncToken);
  return suppliedBytes.length === expectedBytes.length && suppliedBytes.length > 0 && crypto.timingSafeEqual(suppliedBytes, expectedBytes);
}

async function handleCampaign(request, response) {
  if (!isAuthorized(request)) return json(response, 401, { error: 'Unauthorized' }, { 'WWW-Authenticate': 'Bearer' });
  if (request.method === 'GET') {
    const current = store.read();
    return json(response, 200, current.data, { 'Cache-Control': 'no-store', ETag: current.revision });
  }
  if (request.method !== 'POST') return json(response, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });

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
    if (error instanceof CampaignConflictError) return json(response, 409, { error: 'Campaign was changed by another client' });
    console.error('Campaign write rejected:', error.message);
    return json(response, 400, { error: 'Invalid campaign payload' });
  }
}

let vite;
if (isDevelopment) {
  const { createServer } = await import('vite');
  vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
}

const server = http.createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname;
    if (pathname === '/api/health') return json(response, 200, { status: 'ok', authRequired: Boolean(syncToken) });
    if (pathname === '/api/campaign') return await handleCampaign(request, response);
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
});

server.listen(port, host, () => {
  console.log(`DMForge ${isDevelopment ? 'development' : 'production'} server: http://${host}:${port}`);
  console.log(syncToken ? 'Campaign API bearer authentication enabled.' : 'Campaign API is local-only without authentication.');
});
