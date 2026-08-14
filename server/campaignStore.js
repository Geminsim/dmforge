import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { assertValidCampaign } from '../src/utils/campaignValidation.js';

export class CampaignConflictError extends Error {}

function revisionFor(text) {
  return `"${crypto.createHash('sha256').update(text).digest('hex').slice(0, 24)}"`;
}

export class CampaignStore {
  constructor(rootDirectory) {
    this.filePath = path.join(rootDirectory, 'campaign_state.json');
    this.backupPath = path.join(rootDirectory, 'campaign_state_backup.json');
    this.temporaryPath = path.join(rootDirectory, 'campaign_state.tmp.json');
  }

  read() {
    if (!fs.existsSync(this.filePath)) return { data: {}, revision: '"empty"' };
    const text = fs.readFileSync(this.filePath, 'utf8');
    return { data: JSON.parse(text), revision: revisionFor(text) };
  }

  write(data, expectedRevision) {
    assertValidCampaign(data);
    const current = this.read();
    if (expectedRevision !== '*' && expectedRevision !== current.revision) {
      throw new CampaignConflictError('Campaign revision is stale');
    }
    const text = JSON.stringify(data);
    fs.writeFileSync(this.temporaryPath, text, 'utf8');
    if (fs.existsSync(this.filePath)) fs.copyFileSync(this.filePath, this.backupPath);
    fs.renameSync(this.temporaryPath, this.filePath);
    return { revision: revisionFor(text) };
  }
}
