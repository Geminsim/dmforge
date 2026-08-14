const FORMAT = 'dmforge-campaign-export';
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function bytesToBase64(bytes) {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function base64ToBytes(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

export async function campaignChecksum(campaign) {
  const digest = await crypto.subtle.digest('SHA-256', textEncoder.encode(JSON.stringify(campaign)));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function deriveKey(password, salt, usage) {
  const material = await crypto.subtle.importKey('raw', textEncoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, [usage]);
}

export async function createCampaignExport(campaign, password = '') {
  const checksum = await campaignChecksum(campaign);
  const metadata = { format: FORMAT, exportVersion: 2, schemaVersion: campaign.schemaVersion, exportedAt: new Date().toISOString(), revision: checksum, checksum };
  if (!password) return { ...metadata, encrypted: false, campaign };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, textEncoder.encode(JSON.stringify(campaign)));
  return { ...metadata, encrypted: true, encryption: { algorithm: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 250_000, salt: bytesToBase64(salt), iv: bytesToBase64(iv) }, ciphertext: bytesToBase64(new Uint8Array(ciphertext)) };
}

export async function openCampaignExport(value, password = '') {
  if (!value || typeof value !== 'object') throw new Error('文件内容不是对象');
  if (value.format !== FORMAT) return value;
  let campaign;
  if (value.encrypted) {
    if (!password) throw new Error('该存档已加密，需要输入导出密码');
    try {
      const key = await deriveKey(password, base64ToBytes(value.encryption.salt), 'decrypt');
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(value.encryption.iv) }, key, base64ToBytes(value.ciphertext));
      campaign = JSON.parse(textDecoder.decode(plaintext));
    } catch {
      throw new Error('密码错误或加密存档已损坏');
    }
  } else {
    campaign = value.campaign;
  }
  if (await campaignChecksum(campaign) !== value.checksum) throw new Error('存档校验和不匹配，文件可能已损坏或被篡改');
  return campaign;
}
