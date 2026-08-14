import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { prepareCampaign } from '../src/utils/campaignValidation.js';

export class CampaignConflictError extends Error {}
export class CampaignBackupError extends Error {}

const revisionFor = text => `"${crypto.createHash('sha256').update(text).digest('hex')}"`;
const fileStamp = date => date.toISOString().replace(/[:.]/g, '-');

export class CampaignStore {
  constructor(rootDirectory, options = {}) {
    this.rootDirectory = rootDirectory;
    this.filePath = path.join(rootDirectory, 'campaign_state.json');
    this.legacyBackupPath = path.join(rootDirectory, 'campaign_state_backup.json');
    this.backupDirectory = path.join(rootDirectory, 'backups');
    this.maxRecentBackups = options.maxRecentBackups ?? 20;
    this.faultInjector = options.faultInjector || (() => {});
    fs.mkdirSync(this.backupDirectory, { recursive: true });
  }

  parseFile(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const data = prepareCampaign(JSON.parse(text));
    const normalizedText = JSON.stringify(data);
    return { data, text: normalizedText, revision: revisionFor(normalizedText) };
  }

  syncDirectory(directory) {
    try {
      const descriptor = fs.openSync(directory, 'r');
      try { fs.fsyncSync(descriptor); } finally { fs.closeSync(descriptor); }
    } catch {
      // Windows does not allow opening directories for fsync. File fsync still applies.
    }
  }

  atomicWrite(filePath, text) {
    const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    let descriptor;
    try {
      descriptor = fs.openSync(temporaryPath, 'wx');
      fs.writeFileSync(descriptor, text, 'utf8');
      fs.fsyncSync(descriptor);
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.renameSync(temporaryPath, filePath);
      this.syncDirectory(path.dirname(filePath));
    } catch (error) {
      if (descriptor !== undefined) {
        try { fs.closeSync(descriptor); } catch { /* best effort */ }
      }
      try { fs.rmSync(temporaryPath, { force: true }); } catch { /* best effort */ }
      throw error;
    }
  }

  quarantineCorruptPrimary() {
    if (!fs.existsSync(this.filePath)) return null;
    const target = path.join(this.rootDirectory, `campaign_state.corrupt-${fileStamp(new Date())}.json`);
    fs.renameSync(this.filePath, target);
    return target;
  }

  backupCandidates() {
    const versions = fs.readdirSync(this.backupDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && /^campaign-.*\.json$/.test(entry.name))
      .map(entry => path.join(this.backupDirectory, entry.name))
      .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
    if (fs.existsSync(this.legacyBackupPath)) versions.push(this.legacyBackupPath);
    return versions;
  }

  read() {
    if (!fs.existsSync(this.filePath)) return { data: {}, revision: '"empty"', recoveredFrom: null };
    try {
      return { ...this.parseFile(this.filePath), recoveredFrom: null };
    } catch (primaryError) {
      const quarantinedPath = this.quarantineCorruptPrimary();
      for (const candidate of this.backupCandidates()) {
        try {
          const recovered = this.parseFile(candidate);
          this.atomicWrite(this.filePath, recovered.text);
          return { ...recovered, recoveredFrom: path.basename(candidate), quarantinedPath, primaryError: primaryError.message };
        } catch {
          // Continue until a valid backup is found.
        }
      }
      throw new CampaignBackupError(`主存档损坏且没有可恢复备份：${primaryError.message}`);
    }
  }

  createBackup(current, reason = 'autosave') {
    if (!current?.data?.maps) return null;
    const name = `campaign-${fileStamp(new Date())}-${reason}-${current.revision.replaceAll('"', '').slice(0, 12)}-${crypto.randomBytes(3).toString('hex')}.json`;
    const destination = path.join(this.backupDirectory, name);
    this.atomicWrite(destination, current.text);
    this.atomicWrite(this.legacyBackupPath, current.text);
    this.rotateBackups();
    return name;
  }

  rotateBackups() {
    const files = fs.readdirSync(this.backupDirectory, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => ({ name: entry.name, path: path.join(this.backupDirectory, entry.name), date: fs.statSync(path.join(this.backupDirectory, entry.name)).mtime }))
      .sort((a, b) => b.date - a.date);
    const keep = new Set(files.slice(0, this.maxRecentBackups).map(file => file.name));
    const hourly = new Set();
    const daily = new Set();
    const now = Date.now();
    for (const file of files.slice(this.maxRecentBackups)) {
      const ageDays = (now - file.date.getTime()) / 86_400_000;
      const hourKey = file.date.toISOString().slice(0, 13);
      const dayKey = file.date.toISOString().slice(0, 10);
      if (ageDays <= 7 && !hourly.has(hourKey)) {
        hourly.add(hourKey); keep.add(file.name);
      } else if (ageDays <= 30 && !daily.has(dayKey)) {
        daily.add(dayKey); keep.add(file.name);
      }
    }
    files.filter(file => !keep.has(file.name)).forEach(file => fs.rmSync(file.path, { force: true }));
  }

  write(data, expectedRevision, reason = 'autosave') {
    const prepared = prepareCampaign(data);
    const current = this.read();
    if (expectedRevision !== '*' && expectedRevision !== current.revision) throw new CampaignConflictError('Campaign revision is stale');
    const text = JSON.stringify(prepared);
    const backupName = this.createBackup(current, reason);
    this.faultInjector('after-backup-before-primary-write');
    this.atomicWrite(this.filePath, text);
    this.faultInjector('after-primary-write-before-verify');
    const verified = this.parseFile(this.filePath);
    return { revision: verified.revision, backupName };
  }

  listBackups() {
    return this.backupCandidates().map(filePath => {
      try {
        const parsed = this.parseFile(filePath);
        const stat = fs.statSync(filePath);
        return { name: path.basename(filePath), size: stat.size, modifiedAt: stat.mtime.toISOString(), revision: parsed.revision, valid: true };
      } catch (error) {
        return { name: path.basename(filePath), valid: false, error: error.message };
      }
    });
  }

  createManualBackup(expectedRevision) {
    const current = this.read();
    if (expectedRevision !== '*' && expectedRevision !== current.revision) throw new CampaignConflictError('Campaign revision is stale');
    const backupName = this.createBackup(current, 'manual');
    if (!backupName) throw new CampaignBackupError('当前没有可备份的有效存档');
    return { backupName, revision: current.revision };
  }

  restoreBackup(name, expectedRevision) {
    if (!/^(campaign-.*\.json|campaign_state_backup\.json)$/.test(name)) throw new CampaignBackupError('Invalid backup name');
    const backupPath = name === 'campaign_state_backup.json' ? this.legacyBackupPath : path.join(this.backupDirectory, name);
    if (!fs.existsSync(backupPath)) throw new CampaignBackupError('Backup not found');
    const backup = this.parseFile(backupPath);
    return this.write(backup.data, expectedRevision, 'pre-restore');
  }
}
