import { midiEngine } from './midiEngine';

export interface KorgBackupPayload {
  app: 'KORG Oriental Commander';
  version: number;
  exportedAt: string;
  settings: Record<string, string>;
}

const BACKUP_KEY_PREFIX = 'korg_';
const EXCLUDED_KEYS = new Set(['korg_device_id', 'korg_pro_license']);

export function createBackupPayload(): KorgBackupPayload {
  const settings: Record<string, string> = {};

  if (typeof window !== 'undefined' && window.localStorage) {
    // Ensure core MIDI engine state is flushed to localStorage before collecting
    try {
      const model = midiEngine.getModel();
      const protocol = midiEngine.getTuningProtocol();
      const channels = midiEngine.getChannels();
      if (!localStorage.getItem('korg_selected_model_id')) {
        localStorage.setItem('korg_selected_model_id', model.id);
      }
      if (!localStorage.getItem('korg_tuning_protocol')) {
        localStorage.setItem('korg_tuning_protocol', protocol);
      }
      if (!localStorage.getItem('korg_midi_channels')) {
        localStorage.setItem('korg_midi_channels', JSON.stringify(channels));
      }
    } catch (_) {}

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(BACKUP_KEY_PREFIX) && !EXCLUDED_KEYS.has(key)) {
        const value = localStorage.getItem(key);
        if (value !== null) {
          settings[key] = value;
        }
      }
    }
  }

  return {
    app: 'KORG Oriental Commander',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings,
  };
}

export function downloadBackupFile(): { filename: string; keyCount: number } {
  const payload = createBackupPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `korg-commander-backup-${datePart}.json`;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    filename,
    keyCount: Object.keys(payload.settings).length,
  };
}

export function importBackupJson(rawText: string): { ok: boolean; count: number; error?: string } {
  try {
    const parsed = JSON.parse(rawText) as Partial<KorgBackupPayload> | Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, count: 0, error: 'INVALID_JSON_OBJECT' };
    }

    const rawSettings =
      'settings' in parsed && parsed.settings && typeof parsed.settings === 'object'
        ? (parsed.settings as Record<string, unknown>)
        : (parsed as Record<string, unknown>);

    const entries = Object.entries(rawSettings).filter(
      ([key, val]) =>
        key.startsWith(BACKUP_KEY_PREFIX) &&
        !EXCLUDED_KEYS.has(key) &&
        typeof val === 'string'
    ) as [string, string][];

    if (entries.length === 0) {
      return { ok: false, count: 0, error: 'NO_SETTINGS_FOUND' };
    }

    // Clear existing non-license korg_* keys so deleted/changed presets match the backup accurately
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(BACKUP_KEY_PREFIX) && !EXCLUDED_KEYS.has(k)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    entries.forEach(([key, val]) => {
      localStorage.setItem(key, val);
    });

    // Reload MIDI engine config without emitting any automatic Tashreeq SysEx
    midiEngine.reloadFromStorage();

    return { ok: true, count: entries.length };
  } catch {
    return { ok: false, count: 0, error: 'PARSE_ERROR' };
  }
}
