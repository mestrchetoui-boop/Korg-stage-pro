const DEVICE_ID_KEY = 'korg_device_id';
const LICENSE_KEY = 'korg_pro_license';

// Safe alphanumeric alphabet avoiding visually ambiguous characters (0/O, 1/I)
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SECRET_PEPPER = 'WC#KORG-PA3X-9482-PRO!@ORIENTAL';

interface StoredLicense {
  deviceId: string;
  code: string;
  activatedAt: string;
}

export function normalizeDeviceId(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function normalizeActivationCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'WC0000';
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && /^[A-Z0-9]{6}$/.test(existing)) {
      return existing;
    }
    const bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 6; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += ID_ALPHABET[bytes[i] % ID_ALPHABET.length];
    }
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'PA3X01';
  }
}

/**
 * Deterministic offline cryptographic-style key derivation from Device ID.
 * Produces an 8-character formatted activation code: XXXX-XXXX.
 */
export function generateActivationCode(rawDeviceId: string): string {
  const cleanId = normalizeDeviceId(rawDeviceId);
  if (cleanId.length !== 6) return '';

  const seed = `${cleanId}::${SECRET_PEPPER}::${cleanId.split('').reverse().join('')}`;

  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;

  for (let round = 0; round < 4; round++) {
    for (let i = 0; i < seed.length; i++) {
      const c = seed.charCodeAt(i) ^ ((round + 1) * 31);
      h1 ^= c;
      h1 = Math.imul(h1, 0x01000193);
      h1 = (h1 << 13) | (h1 >>> 19);

      h2 = Math.imul(h2 ^ (c + i), 0x85ebca6b);
      h2 ^= h1 >>> 11;
      h2 = (h2 << 7) | (h2 >>> 25);
    }
  }

  h1 = (h1 ^ (h2 >>> 16)) >>> 0;
  h2 = (h2 ^ (h1 >>> 15)) >>> 0;

  let rawCode = '';
  let v1 = h1;
  let v2 = h2;

  for (let i = 0; i < 4; i++) {
    rawCode += ID_ALPHABET[v1 % ID_ALPHABET.length];
    v1 = Math.floor(v1 / ID_ALPHABET.length) ^ ((v2 >>> (i * 3)) & 0xff);
  }
  for (let i = 0; i < 4; i++) {
    rawCode += ID_ALPHABET[v2 % ID_ALPHABET.length];
    v2 = Math.floor(v2 / ID_ALPHABET.length) ^ ((h1 >>> (i * 5)) & 0xff);
  }

  return `${rawCode.slice(0, 4)}-${rawCode.slice(4, 8)}`;
}

export function verifyActivationCode(rawDeviceId: string, rawCode: string): boolean {
  const expected = normalizeActivationCode(generateActivationCode(rawDeviceId));
  const candidate = normalizeActivationCode(rawCode);
  if (!expected || candidate.length !== expected.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ candidate.charCodeAt(i);
  }
  return diff === 0;
}

export function isProActivated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredLicense>;
    const currentDeviceId = getDeviceId();
    if (!parsed.deviceId || !parsed.code) return false;
    if (normalizeDeviceId(parsed.deviceId) !== currentDeviceId) return false;
    return verifyActivationCode(currentDeviceId, parsed.code);
  } catch {
    return false;
  }
}

export function activateProWithCode(rawCode: string): { ok: boolean; error?: string } {
  const deviceId = getDeviceId();
  if (!verifyActivationCode(deviceId, rawCode)) {
    return { ok: false, error: 'INVALID_CODE' };
  }

  const formattedCode = generateActivationCode(deviceId);
  const record: StoredLicense = {
    deviceId,
    code: formattedCode,
    activatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(LICENSE_KEY, JSON.stringify(record));
    return { ok: true };
  } catch {
    return { ok: false, error: 'STORAGE_ERROR' };
  }
}

export function verifyDeveloperPin(pin: string): boolean {
  return pin.trim() === '26557';
}

export const FREE_TIER_LIMITS = {
  maxSoundButtons: 3, // First 3 sound buttons open (indices 0..2); 4th+ locked
  maxMaqamPresets: 2, // First 2 maqams open (indices 0..1); 3rd+ locked
} as const;

export type ProFeatureKey =
  | 'edit_sound'
  | 'add_sound'
  | 'channel_16'
  | 'preset_slots'
  | 'preset_save'
  | 'backup_export'
  | 'backup_import'
  | 'manual_tashreeq'
  | 'sound_pages';

export function isSoundIndexUnlocked(index: number, proActive: boolean): boolean {
  return proActive || (index >= 0 && index < FREE_TIER_LIMITS.maxSoundButtons);
}

export function isMaqamIndexUnlocked(index: number, proActive: boolean): boolean {
  return proActive || (index >= 0 && index < FREE_TIER_LIMITS.maxMaqamPresets);
}

export function canUseProFeature(_feature: ProFeatureKey, proActive: boolean): boolean {
  return proActive;
}
