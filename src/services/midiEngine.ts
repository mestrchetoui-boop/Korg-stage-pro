import {
  MidiDeviceOption,
  MidiLogMessage,
  NoteName,
  NoteTuning,
  KorgModelProfile,
  MidiChannelSettings,
} from '../types';
import { NOTE_NAMES, KORG_MODELS } from '../data/korgPresets';

export type TuningProtocol =
  | 'korg_pa3x_gs'
  | 'pitch_bend_only';

export interface ManualTrackControls {
  easyEdit?: {
    enabled?: boolean;
    attack?: number;
    decay?: number;
    release?: number;
    cutoff?: number;
    resonance?: number;
    lfoDepth?: number;
    lfoSpeed?: number;
    lfoDelay?: number;
    portamentoOn?: boolean;
    portamentoTime?: number;
  };
  tuning?: {
    enabled?: boolean;
    pbSensitivity?: number;
    octTranspose?: number;
    detune?: number;
    muted?: boolean;
  };
  mixerFx?: {
    enabled?: boolean;
    volume?: number;
    pan?: number;
    reverbSend?: number;
    chorusSend?: number;
    delaySend?: number;
  };
}

const STORAGE_KEYS = {
  MODEL_ID: 'korg_selected_model_id',
  PROTOCOL: 'korg_tuning_protocol',
  OUT_ID: 'korg_midi_out_id',
  IN_ID: 'korg_midi_in_id',
  CHANNELS: 'korg_midi_channels',
};

const KORG_PA3X_RESET_SYSEX = [
  0xF0, 0x42, 0x7F, 0x60, 0x01, 0x01, 0x00, 0x7D,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF7,
];

type MidiLogCallback = (message: MidiLogMessage) => void;
type NoteEventCallback = (note: number, velocity: number, isNoteOn: boolean) => void;
type StateChangeCallback = () => void;

class MidiEngine {
  private midiAccess: MIDIAccess | null = null;
  private selectedOutput: MIDIOutput | null = null;
  private selectedInput: MIDIInput | null = null;
  private isSupported: boolean = false;
  private sysexEnabled: boolean = false;
  private logCallbacks: Set<MidiLogCallback> = new Set();
  private noteCallbacks: Set<NoteEventCallback> = new Set();
  private stateCallbacks: Set<StateChangeCallback> = new Set();
  private isSimulationMode: boolean = false;
  private korgModel: KorgModelProfile | null = null;
  private tuningProtocol: TuningProtocol = 'korg_pa3x_gs';
  private channels: MidiChannelSettings = {
    upper1: 1,
    upper2: 2,
    upper3: 3,
    lower: 4,
    arranger: 16,
  };
  private lastTunings: Record<NoteName, NoteTuning> | null = null;
  private sysexTimers: number[] = [];
  private soundTimers: number[] = [];
  private styleTimers: number[] = [];
  private pendingOpenPromise: Promise<void> | null = null;
  private openQueuedMessages: Array<{ output: MIDIOutput; bytes: number[] }> = [];
  private stateChangeTimer: number | null = null;
  private isAutoConnecting: boolean = false;
  private lastCapturedSysEx: string[] = [];
  private recentLogs: MidiLogMessage[] = [];

  constructor() {
    this.checkMidiSupport();
    this.loadSavedSettings();
  }

  private clampChannel(val: unknown, fallback: number): number {
    const n = Number(val);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(16, Math.round(n)));
  }

  private getModelDefaultChannels(model: KorgModelProfile): MidiChannelSettings {
    return {
      upper1: model.upper1Channel,
      upper2: model.upper2Channel,
      upper3: model.upper3Channel,
      lower: model.lowerChannel,
      arranger: model.arrangerChannel,
    };
  }

  private loadSavedSettings() {
    if (typeof window === 'undefined') return;
    try {
      const savedModelId = localStorage.getItem(STORAGE_KEYS.MODEL_ID);
      const defaultModel = KORG_MODELS.find(m => m.id === 'pa600') || KORG_MODELS[3];
      this.korgModel = (savedModelId && KORG_MODELS.find(m => m.id === savedModelId)) || defaultModel;
      if (!savedModelId) {
        localStorage.setItem(STORAGE_KEYS.MODEL_ID, this.korgModel.id);
      }

      const savedProto = localStorage.getItem(STORAGE_KEYS.PROTOCOL) as TuningProtocol | null;
      if (savedProto === 'korg_pa3x_gs' || savedProto === 'pitch_bend_only') {
        this.tuningProtocol = savedProto;
      } else {
        this.tuningProtocol = 'korg_pa3x_gs';
        localStorage.setItem(STORAGE_KEYS.PROTOCOL, this.tuningProtocol);
      }

      const defaults = this.getModelDefaultChannels(this.korgModel);
      const savedChannelsRaw = localStorage.getItem(STORAGE_KEYS.CHANNELS);
      if (savedChannelsRaw) {
        const parsed = JSON.parse(savedChannelsRaw) as Partial<MidiChannelSettings>;
        this.channels = {
          upper1: this.clampChannel(parsed.upper1, defaults.upper1),
          upper2: this.clampChannel(parsed.upper2, defaults.upper2),
          upper3: this.clampChannel(parsed.upper3, defaults.upper3),
          lower: this.clampChannel(parsed.lower, defaults.lower),
          arranger: this.clampChannel(parsed.arranger, defaults.arranger),
        };
      } else {
        this.channels = defaults;
        localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(this.channels));
      }
    } catch (_) {
      this.korgModel = KORG_MODELS.find(m => m.id === 'pa600') || KORG_MODELS[3];
      this.tuningProtocol = 'korg_pa3x_gs';
      this.channels = this.getModelDefaultChannels(this.korgModel);
    }
  }

  public reloadFromStorage() {
    this.loadSavedSettings();
    this.notifyStateCallbacks();
  }

  public checkMidiSupport(): boolean {
    if (typeof window !== 'undefined' && 'navigator' in window && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
      return true;
    }
    this.isSupported = false;
    this.isSimulationMode = true;
    return false;
  }

  private scorePort(port: MIDIPort): number {
    const name = (port.name || '').toLowerCase();
    const mfg = (port.manufacturer || '').toLowerCase();
    const combined = `${name} ${mfg}`;

    if (/through|microsoft|gs wavetable|wavetable|virtual|dummy|loopback|iac|android usb peripheral/i.test(combined)) {
      return -200;
    }
    if (/korg|pa3x|pa4x|pa5x|pa600|pa700|pa800|pa900|pa1000|kronos|triton|nautilus|pa\d/i.test(combined)) {
      return 200;
    }
    if (/usb|otg|ch345|qinheng|roland|yamaha|focusrite|m-audio|steinberg|midisport|esi|icon|mio|cable|interface/i.test(combined)) {
      return 100;
    }
    if (/midi/i.test(combined)) {
      return 20;
    }
    return 10;
  }

  private pickBestPort<T extends MIDIPort>(ports: Iterable<T>, preferredId?: string | null): T | null {
    const connected: T[] = [];
    for (const p of ports) {
      if (p.state === 'connected') {
        connected.push(p);
      }
    }
    if (connected.length === 0) return null;

    const sorted = [...connected].sort((a, b) => this.scorePort(b) - this.scorePort(a));

    if (preferredId) {
      const preferred = connected.find(p => p.id === preferredId);
      // Use saved port if connected and not a degraded virtual/through port when real hardware exists
      if (preferred && (this.scorePort(preferred) >= 0 || this.scorePort(sorted[0]) < 0)) {
        return preferred;
      }
    }

    return sorted[0];
  }

  public async initialize(): Promise<{ success: boolean; sysex: boolean; error?: string }> {
    if (!this.checkMidiSupport()) {
      this.isSimulationMode = true;
      this.sysexEnabled = false;
      this.log('system', 'out', 'Web MIDI API غير مدعوم في هذا المتصفح. تم تفعيل وضع المحاكاة الداخلي الكامل.', 'SIMULATOR_ACTIVE');
      this.notifyStateCallbacks();
      return { success: false, sysex: false, error: 'Web MIDI API not supported in this browser' };
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      this.sysexEnabled = true;
      this.isSimulationMode = false;
      this.log('system', 'in', 'تم تهيئة اتصال MIDI بنجاح مع صلاحية SysEx الكاملة!', 'INIT_SYSEX_OK');
    } catch (sysexErr: unknown) {
      try {
        this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
        this.sysexEnabled = false;
        this.isSimulationMode = false;
        const msg = sysexErr instanceof Error ? sysexErr.message : String(sysexErr);
        this.log(
          'system',
          'out',
          `تم الاتصال بـ MIDI بنجاح (الأصوات والإيقاعات والكلافيي تعمل بشكل طبيعي، SysEx غير مفعل: ${msg}).`,
          'INIT_NO_SYSEX'
        );
      } catch (err: unknown) {
        this.sysexEnabled = false;
        this.isSimulationMode = true;
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.log('system', 'out', `تعذر الوصول لأجهزة MIDI (${errorMsg}). تم تفعيل المحاكاة الصوتية.`, 'SYS_FALLBACK');
        this.notifyStateCallbacks();
        return { success: false, sysex: false, error: errorMsg };
      }
    }

    await this.autoConnectPorts(true);

    this.midiAccess.onstatechange = () => {
      if (this.stateChangeTimer !== null) {
        clearTimeout(this.stateChangeTimer);
      }
      this.stateChangeTimer = window.setTimeout(async () => {
        this.stateChangeTimer = null;
        await this.autoConnectPorts(false);
        this.log('system', 'in', 'تم اكتشاف تغيير في كابل/أجهزة MIDI المتصلة.', 'STATE_CHANGE');
        this.notifyStateCallbacks();
      }, 120);
    };

    this.notifyStateCallbacks();
    return { success: true, sysex: this.sysexEnabled };
  }

  private async autoConnectPorts(forceResync: boolean) {
    if (!this.midiAccess || this.isAutoConnecting) return;
    this.isAutoConnecting = true;
    try {
      let savedOutId: string | null = null;
      let savedInId: string | null = null;
      try {
        savedOutId = localStorage.getItem(STORAGE_KEYS.OUT_ID);
        savedInId = localStorage.getItem(STORAGE_KEYS.IN_ID);
      } catch (_) {}

      const currentOutputs = Array.from(this.midiAccess.outputs.values());
      const stillValidOut = this.selectedOutput && currentOutputs.some(
        o => o.id === this.selectedOutput?.id && o.state === 'connected'
      );

      if (!stillValidOut) {
        this.selectedOutput = null;
        const bestOut = this.pickBestPort(currentOutputs, savedOutId);
        if (bestOut) {
          await this.selectOutput(bestOut.id, false);
        }
      } else if (forceResync && this.selectedOutput) {
        try {
          if (this.selectedOutput.connection !== 'open') {
            await this.selectedOutput.open();
          }
        } catch (_) {}
      }

      const currentInputs = Array.from(this.midiAccess.inputs.values());
      const stillValidIn = this.selectedInput && currentInputs.some(
        i => i.id === this.selectedInput?.id && i.state === 'connected'
      );

      if (!stillValidIn) {
        this.selectedInput = null;
        const bestIn = this.pickBestPort(currentInputs, savedInId);
        if (bestIn) {
          await this.selectInput(bestIn.id, false);
        }
      } else if (forceResync && this.selectedInput) {
        try {
          if (this.selectedInput.connection !== 'open') {
            await this.selectedInput.open();
          }
        } catch (_) {}
      }
    } finally {
      this.isAutoConnecting = false;
    }
  }

  public setModel(model: KorgModelProfile, applyModelChannels: boolean = false) {
    this.korgModel = model;
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_ID, model.id);
    } catch (_) {}
    if (applyModelChannels) {
      this.channels = this.getModelDefaultChannels(model);
      try {
        localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(this.channels));
      } catch (_) {}
    }
    this.log('system', 'out', `تم اختيار وحفظ طراز كورج: ${model.name}`, `MODEL:${model.id}`);
    this.notifyStateCallbacks();
  }

  public getModel(): KorgModelProfile {
    return this.korgModel || KORG_MODELS.find(m => m.id === 'pa600') || KORG_MODELS[3];
  }

  public getChannels(): MidiChannelSettings {
    return { ...this.channels };
  }

  public setChannels(next: MidiChannelSettings) {
    const model = this.getModel();
    const defaults = this.getModelDefaultChannels(model);
    this.channels = {
      upper1: this.clampChannel(next.upper1, defaults.upper1),
      upper2: this.clampChannel(next.upper2, defaults.upper2),
      upper3: this.clampChannel(next.upper3, defaults.upper3),
      lower: this.clampChannel(next.lower, defaults.lower),
      arranger: this.clampChannel(next.arranger, defaults.arranger),
    };
    try {
      localStorage.setItem(STORAGE_KEYS.CHANNELS, JSON.stringify(this.channels));
    } catch (_) {}
    this.log(
      'system',
      'out',
      `تم حفظ إعدادات القنوات: U1=${this.channels.upper1}, U2=${this.channels.upper2}, U3=${this.channels.upper3}, Low=${this.channels.lower}, Arr=${this.channels.arranger}`,
      'CHANNELS_SAVED'
    );
    this.notifyStateCallbacks();
  }

  public setTuningProtocol(protocol: TuningProtocol) {
    this.tuningProtocol = protocol;
    try {
      localStorage.setItem(STORAGE_KEYS.PROTOCOL, protocol);
    } catch (_) {}
    this.log('system', 'out', `تم تغيير وحفظ بروتوكول التشريق: ${protocol}`, `PROTO:${protocol}`);
    this.notifyStateCallbacks();
  }

  public getTuningProtocol(): TuningProtocol {
    return this.tuningProtocol;
  }

  public isSysExEnabled(): boolean {
    return this.sysexEnabled;
  }

  public hasConnectedOutput(): boolean {
    return this.selectedOutput !== null && this.selectedOutput.state === 'connected';
  }

  public getSelectedOutputName(): string {
    return this.selectedOutput?.name || '';
  }

  public getSelectedOutputId(): string {
    return this.selectedOutput?.id || '';
  }

  public getSelectedInputId(): string {
    return this.selectedInput?.id || '';
  }

  public setInitialTunings(tunings: Record<NoteName, NoteTuning>) {
    this.lastTunings = tunings;
  }

  public getCapturedSysEx(): string[] {
    return this.lastCapturedSysEx;
  }

  public clearCapturedSysEx() {
    this.lastCapturedSysEx = [];
    this.notifyStateCallbacks();
  }

  public getRecentLogs(): MidiLogMessage[] {
    return this.recentLogs;
  }

  public clearLogs() {
    this.recentLogs = [];
  }

  public getOutputs(): MidiDeviceOption[] {
    if (!this.midiAccess) return [];
    const list: MidiDeviceOption[] = [];
    this.midiAccess.outputs.forEach((output) => {
      list.push({
        id: output.id,
        name: output.name || `MIDI Output (${output.id})`,
        manufacturer: output.manufacturer || 'Unknown',
        state: output.state as 'connected' | 'disconnected',
      });
    });
    return list;
  }

  public getInputs(): MidiDeviceOption[] {
    if (!this.midiAccess) return [];
    const list: MidiDeviceOption[] = [];
    this.midiAccess.inputs.forEach((input) => {
      list.push({
        id: input.id,
        name: input.name || `MIDI Input (${input.id})`,
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
      });
    });
    return list;
  }

  public async selectOutput(id: string, persistSelection: boolean = true): Promise<boolean> {
    if (!this.midiAccess) return false;
    const output = this.midiAccess.outputs.get(id);
    if (output) {
      try {
        if (output.connection !== 'open') {
          await output.open();
        }
      } catch (_) {}
      this.selectedOutput = output;
      if (persistSelection) {
        try { localStorage.setItem(STORAGE_KEYS.OUT_ID, id); } catch (_) {}
      }
      this.log('system', 'out', `تم ربط مخرج MIDI: ${output.name}`, `OUT_SELECT:${id}`);
      this.notifyStateCallbacks();
      return true;
    }
    return false;
  }

  public async selectInput(id: string, persistSelection: boolean = true): Promise<boolean> {
    if (!this.midiAccess) return false;
    if (this.selectedInput) {
      this.selectedInput.onmidimessage = null;
    }
    const input = this.midiAccess.inputs.get(id);
    if (input) {
      try {
        if (input.connection !== 'open') {
          await input.open();
        }
      } catch (_) {}
      this.selectedInput = input;
      this.selectedInput.onmidimessage = (e) => this.handleIncomingMidi(e);
      if (persistSelection) {
        try { localStorage.setItem(STORAGE_KEYS.IN_ID, id); } catch (_) {}
      }
      this.log('system', 'in', `تم ربط مدخل MIDI: ${input.name}`, `IN_SELECT:${id}`);
      this.notifyStateCallbacks();
      return true;
    }
    return false;
  }

  private handleIncomingMidi(e: MIDIMessageEvent) {
    if (!e.data || e.data.length === 0) return;
    const status = e.data[0];
    const channel = (status & 0x0f) + 1;
    const command = status & 0xf0;
    const data1 = e.data[1];
    const data2 = e.data[2];

    const hex = Array.from(e.data).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    if (status === 0xF0) {
      // Capture incoming SysEx for inspection ONLY — never update tuning UI or echo back (prevents MIDI Loopback)
      this.lastCapturedSysEx = [hex, ...this.lastCapturedSysEx.filter(h => h !== hex)].slice(0, 12);
      this.log('sysex', 'in', `SysEx وارد من الأورغ (${e.data.length} bytes)`, hex);
      this.notifyStateCallbacks();
    } else if (command === 0x90 && data2 > 0) {
      this.log('note_on', 'in', `Note On [Ch ${channel}]: Key ${data1} Vel ${data2}`, hex, channel);
      this.notifyNoteCallbacks(data1, data2, true);
    } else if (command === 0x80 || (command === 0x90 && data2 === 0)) {
      this.log('note_off', 'in', `Note Off [Ch ${channel}]: Key ${data1}`, hex, channel);
      this.notifyNoteCallbacks(data1, 0, false);
    } else if (command === 0xB0) {
      this.log('cc', 'in', `CC [Ch ${channel}]: #${data1} = ${data2}`, hex, channel);
    } else if (command === 0xC0) {
      this.log('pc', 'in', `Program Change [Ch ${channel}]: ${data1}`, hex, channel);
    }
  }

  public subscribeLog(cb: MidiLogCallback): () => void {
    this.logCallbacks.add(cb);
    return () => this.logCallbacks.delete(cb);
  }

  public subscribeNotes(cb: NoteEventCallback): () => void {
    this.noteCallbacks.add(cb);
    return () => this.noteCallbacks.delete(cb);
  }

  public subscribeState(cb: StateChangeCallback): () => void {
    this.stateCallbacks.add(cb);
    return () => this.stateCallbacks.delete(cb);
  }

  private notifyNoteCallbacks(note: number, velocity: number, isNoteOn: boolean) {
    this.noteCallbacks.forEach(cb => {
      try { cb(note, velocity, isNoteOn); } catch (e) { console.error(e); }
    });
  }

  private notifyStateCallbacks() {
    this.stateCallbacks.forEach(cb => {
      try { cb(); } catch (e) { console.error(e); }
    });
  }

  private log(type: MidiLogMessage['type'], direction: 'out' | 'in', description: string, hex: string, channel?: number) {
    const now = new Date();
    const time = now.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '.' + String(now.getMilliseconds()).padStart(3, '0');

    const msg: MidiLogMessage = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: time,
      type,
      direction,
      channel,
      description,
      hex,
    };

    this.recentLogs = [msg, ...this.recentLogs.slice(0, 79)];

    this.logCallbacks.forEach(cb => {
      try { cb(msg); } catch (e) { console.error(e); }
    });
  }

  public sendRaw(bytes: number[], description: string, type: MidiLogMessage['type'] = 'sysex', channel?: number): boolean {
    if (!Array.isArray(bytes) || bytes.length === 0) return false;
    const isSysExMsg = bytes[0] === 0xF0;
    const clamp7 = (val: unknown): number => Math.max(0, Math.min(127, Math.round(Number(val) || 0)));
    const sanitized = bytes.map((b, idx) => {
      if (idx === 0) {
        const status = Math.round(Number(b) || 0);
        return Math.max(0x80, Math.min(0xFF, status));
      }
      if (isSysExMsg && idx === bytes.length - 1) {
        return 0xF7;
      }
      return clamp7(b);
    });
    const hex = sanitized.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');

    if (this.selectedOutput && this.selectedOutput.state === 'connected') {
      if (isSysExMsg && !this.sysexEnabled) {
        this.log(
          type,
          'out',
          `[SysEx محظور في المتصفح] ${description}`,
          hex,
          channel
        );
        return false;
      }

      const targetOutput = this.selectedOutput;
      try {
        if (targetOutput.connection !== 'open') {
          this.openQueuedMessages.push({ output: targetOutput, bytes: sanitized });
          if (!this.pendingOpenPromise) {
            this.pendingOpenPromise = targetOutput
              .open()
              .then(() => {
                const queued = this.openQueuedMessages.splice(0);
                for (const item of queued) {
                  if (item.output.state === 'connected') {
                    item.output.send(item.bytes);
                  }
                }
              })
              .catch(() => {
                this.openQueuedMessages = [];
              })
              .finally(() => {
                this.pendingOpenPromise = null;
              });
          }
          this.log(type, 'out', description, hex, channel);
          return true;
        }
        targetOutput.send(sanitized);
        this.log(type, 'out', description, hex, channel);
        return true;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.log(type, 'out', `فشل الإرسال: ${errorMsg}`, hex, channel);
        return false;
      }
    } else {
      this.log(type, 'out', `[محاكاة KORG] ${description}`, hex, channel);
      return true;
    }
  }

  public clearPendingSoundQueues() {
    this.soundTimers.forEach(t => clearTimeout(t));
    this.soundTimers = [];
  }

  public clearPendingStyleQueues() {
    this.styleTimers.forEach(t => clearTimeout(t));
    this.styleTimers = [];
  }

  public scheduleSoundAction(delayMs: number, fn: () => void) {
    const t = window.setTimeout(fn, delayMs);
    this.soundTimers.push(t);
  }

  public scheduleStyleAction(delayMs: number, fn: () => void) {
    const t = window.setTimeout(fn, delayMs);
    this.styleTimers.push(t);
  }

  /**
   * Sends Bank Select MSB (CC#0), Bank Select LSB (CC#32), and Program Change (PC)
   * with safe 4ms USB-OTG pacing so hardware & CH345/Android cables never drop or swap banks.
   */
  private sendBankAndProgramOrdered(
    targetCh: number,
    msb: number,
    lsb: number,
    pc: number,
    soundName: string,
    bucket: 'sound' | 'style' = 'sound',
    baseDelayMs: number = 0,
    channelMax16: boolean = false
  ) {
    const maxOffset = channelMax16 ? 15 : 14;
    const chOffset = Math.max(0, Math.min(maxOffset, targetCh - 1));
    const ccStatus = 0xB0 | chOffset;
    const pcStatus = 0xC0 | chOffset;
    const safeMsb = Math.max(0, Math.min(127, Math.round(Number(msb) || 0)));
    const safeLsb = Math.max(0, Math.min(127, Math.round(Number(lsb) || 0)));
    const safePc = Math.max(0, Math.min(127, Math.round(Number(pc) || 0)));

    const schedule = (delay: number, fn: () => void) => {
      if (delay <= 0) {
        fn();
      } else if (bucket === 'style') {
        this.scheduleStyleAction(delay, fn);
      } else {
        this.scheduleSoundAction(delay, fn);
      }
    };

    const prefix = bucket === 'style' ? `Style [Ch ${targetCh}]` : `[Ch ${targetCh}]`;
    schedule(baseDelayMs, () => {
      this.sendRaw([ccStatus, 0, safeMsb], `${prefix} Bank Select MSB #${safeMsb}`, 'cc', targetCh);
    });
    schedule(baseDelayMs + 4, () => {
      this.sendRaw([ccStatus, 32, safeLsb], `${prefix} Bank Select LSB #${safeLsb}`, 'cc', targetCh);
    });
    schedule(baseDelayMs + 8, () => {
      this.sendRaw([pcStatus, safePc], `${prefix} ${soundName} (PC #${safePc})`, 'pc', targetCh);
    });
  }

  public sendQuarterToneScale(tunings: Record<NoteName, NoteTuning>): { sent: boolean; sysexBlocked: boolean } {
    this.lastTunings = tunings;

    this.sysexTimers.forEach(t => clearTimeout(t));
    this.sysexTimers = [];

    const activeNotes = NOTE_NAMES.filter(n => tunings[n]?.isQuarterTone);
    const quarterTunedList = activeNotes
      .map(n => `${tunings[n].nameAr} (${n})`)
      .join('، ');

    const descSummary = quarterTunedList.length > 0
      ? `تشريق المقامات [ربع تون]: ${quarterTunedList}`
      : 'إلغاء التشريق (استعادة السلم الطبيعي Equal Temperament)';

    if (this.tuningProtocol === 'pitch_bend_only') {
      this.log('system', 'out', `[وضع Pitch-Bend] ${descSummary}`, 'PB_MICROTUNE');
      return { sent: true, sysexBlocked: false };
    }

    if (this.hasConnectedOutput() && !this.sysexEnabled) {
      this.log(
        'system',
        'out',
        `[تحذير: SysEx محظور في المتصفح] ${descSummary} — افتح التطبيق في متصفح يدعم MIDI مباشرة أو فعّل وضع Pitch-Bend`,
        'SYSEX_BLOCKED'
      );
      return { sent: false, sysexBlocked: true };
    }

    let sysexBytes: number[];
    if (activeNotes.length === 0) {
      // Exact Reset / Natural SysEx (all 12 notes = 0x00)
      sysexBytes = [...KORG_PA3X_RESET_SYSEX];
    } else {
      // Unified 12-note Korg PA 7-bit packed mapping:
      // NOTE_NAMES order: C=0, C#=1, D=2, D#=3, E/MI=4, F/FA=5, F#=6, G=7, G#=8, A/LA=9, A#=10, B/SI=11
      // Block 1 (bytes 6..13): [msb1, 0x7D, 0x00, C, C#, D, D#, E]
      // Block 2 (bytes 14..21): [msb2, F, F#, G, G#, A, A#, B]
      const noteBytes12 = NOTE_NAMES.map((note) =>
        tunings[note]?.isQuarterTone ? 0xCE : 0x00
      );

      const block1Raw = [
        0x7D,
        0x00,
        noteBytes12[0], // C  (DO)
        noteBytes12[1], // C# (DO#)
        noteBytes12[2], // D  (RE)
        noteBytes12[3], // D# (RE#)
        noteBytes12[4], // E  (MI)
      ];
      const block2Raw = [
        noteBytes12[5],  // F  (FA)
        noteBytes12[6],  // F# (FA#)
        noteBytes12[7],  // G  (SOL)
        noteBytes12[8],  // G# (SOL#)
        noteBytes12[9],  // A  (LA)
        noteBytes12[10], // A# (LA#)
        noteBytes12[11], // B  (SI)
      ];

      let msb1 = 0;
      const group1: number[] = [];
      for (let i = 0; i < 7; i++) {
        if (block1Raw[i] & 0x80) msb1 |= 1 << (6 - i);
        group1.push(block1Raw[i] & 0x7F);
      }

      let msb2 = 0;
      const group2: number[] = [];
      for (let j = 0; j < 7; j++) {
        if (block2Raw[j] & 0x80) msb2 |= 1 << (6 - j);
        group2.push(block2Raw[j] & 0x7F);
      }

      sysexBytes = [
        0xF0, 0x42, 0x7F, 0x60, 0x01, 0x01,
        msb1, ...group1,
        msb2, ...group2,
        0xF7,
      ];
    }

    const sent = this.sendRaw(sysexBytes, descSummary, 'sysex');
    return { sent, sysexBlocked: false };
  }

  public sendNoteOn(channel: number, midiNote: number, velocity: number = 110) {
    const ch = Math.max(0, Math.min(15, channel - 1));
    this.sendRaw([0x90 | ch, midiNote, velocity], `Note On: Key ${midiNote} Vel ${velocity}`, 'note_on', channel);
  }

  public sendNoteOnWithMicrotune(channel: number, midiNote: number, velocity: number = 110) {
    const ch = Math.max(0, Math.min(15, channel - 1));
    const usePitchBendMicrotune =
      this.tuningProtocol === 'pitch_bend_only' || (!this.sysexEnabled && this.hasConnectedOutput());

    if (usePitchBendMicrotune && this.lastTunings) {
      const noteName = NOTE_NAMES[midiNote % 12];
      const t = this.lastTunings[noteName];
      const cents = t?.isQuarterTone ? (t.cents ?? -50) : 0;
      const normalized = Math.max(-1, Math.min(1, cents / 200));
      const rawVal = Math.round(8192 + normalized * 8191);
      this.sendRaw([0xE0 | ch, rawVal & 0x7F, (rawVal >> 7) & 0x7F], `Microtune PitchBend (${cents}¢)`, 'system', channel);
    }

    this.sendRaw([0x90 | ch, midiNote, velocity], `Note On: Key ${midiNote} Vel ${velocity}`, 'note_on', channel);
  }

  public sendNoteOff(channel: number, midiNote: number) {
    const ch = Math.max(0, Math.min(15, channel - 1));
    this.sendRaw([0x80 | ch, midiNote, 0], `Note Off: Key ${midiNote}`, 'note_off', channel);
  }

  public applyTrackControlsNow(
    targetCh: number,
    controls?: ManualTrackControls,
    label: string = 'Track'
  ) {
    this.emitTrackControls(targetCh, controls, label);
  }

  private emitTrackControls(
    targetCh: number,
    controls?: ManualTrackControls,
    label: string = 'Track'
  ) {
    if (!controls) return;
    const chIdx = Math.max(0, Math.min(15, targetCh - 1));
    const ccStatus = 0xB0 | chIdx;
    const clamp7 = (v: unknown, def: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? Math.max(0, Math.min(127, Math.round(n))) : def;
    };
    const offsetToMidi = (offset: unknown) => clamp7(64 + (Number(offset) || 0), 64);

    if (controls.mixerFx?.enabled) {
      const mf = controls.mixerFx;
      if (!controls.tuning?.muted && mf.volume !== undefined) {
        const v = clamp7(mf.volume, 100);
        this.sendRaw([ccStatus, 7, v], `[Ch ${targetCh}] ${label} Volume CC#7=${v}`, 'cc', targetCh);
      }
      if (mf.pan !== undefined) {
        const p = clamp7(mf.pan, 64);
        this.sendRaw([ccStatus, 10, p], `[Ch ${targetCh}] ${label} Pan CC#10=${p}`, 'cc', targetCh);
      }
      if (mf.reverbSend !== undefined) {
        const r = clamp7(mf.reverbSend, 40);
        this.sendRaw([ccStatus, 91, r], `[Ch ${targetCh}] ${label} FX 1 (Rev) CC#91=${r}`, 'cc', targetCh);
      }
      if (mf.chorusSend !== undefined) {
        const c = clamp7(mf.chorusSend, 0);
        this.sendRaw([ccStatus, 93, c], `[Ch ${targetCh}] ${label} FX 2 (Cho) CC#93=${c}`, 'cc', targetCh);
      }
      if (mf.delaySend !== undefined) {
        const d = clamp7(mf.delaySend, 0);
        this.sendRaw([ccStatus, 94, d], `[Ch ${targetCh}] ${label} Delay CC#94=${d}`, 'cc', targetCh);
      }
    }

    if (controls.tuning?.muted) {
      this.sendRaw([ccStatus, 7, 0], `[Ch ${targetCh}] ${label} Mute (CC#7=0)`, 'cc', targetCh);
    }

    if (controls.tuning?.enabled) {
      const t = controls.tuning;
      if (t.pbSensitivity !== undefined) {
        const pb = Math.max(0, Math.min(24, Math.round(Number(t.pbSensitivity) || 0)));
        this.sendRaw([ccStatus, 101, 0], `[Ch ${targetCh}] RPN MSB (PB Sens)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 100, 0], `[Ch ${targetCh}] RPN LSB (PB Sens)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 6, pb], `[Ch ${targetCh}] ${label} PB Sens=${pb}`, 'cc', targetCh);
      }
      if (t.octTranspose !== undefined) {
        const oct = Math.max(-2, Math.min(2, Math.round(Number(t.octTranspose) || 0)));
        const coarse = clamp7(64 + oct * 12, 64);
        this.sendRaw([ccStatus, 101, 0], `[Ch ${targetCh}] RPN MSB (Octave)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 100, 2], `[Ch ${targetCh}] RPN LSB (Octave)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 6, coarse], `[Ch ${targetCh}] ${label} Oct=${oct > 0 ? `+${oct}` : oct}`, 'cc', targetCh);
      }
      if (t.detune !== undefined) {
        const cents = Math.max(-50, Math.min(50, Math.round(Number(t.detune) || 0)));
        const raw14 = Math.max(0, Math.min(16383, Math.round(8192 + (cents / 100) * 8192)));
        this.sendRaw([ccStatus, 101, 0], `[Ch ${targetCh}] RPN MSB (Detune)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 100, 1], `[Ch ${targetCh}] RPN LSB (Detune)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 6, (raw14 >> 7) & 0x7F], `[Ch ${targetCh}] ${label} Detune MSB (${cents}¢)`, 'cc', targetCh);
        this.sendRaw([ccStatus, 38, raw14 & 0x7F], `[Ch ${targetCh}] ${label} Detune LSB`, 'cc', targetCh);
      }
      this.sendRaw([ccStatus, 101, 127], `[Ch ${targetCh}] RPN Null MSB`, 'cc', targetCh);
      this.sendRaw([ccStatus, 100, 127], `[Ch ${targetCh}] RPN Null LSB`, 'cc', targetCh);
    }

    if (controls.easyEdit?.enabled) {
      const ee = controls.easyEdit;
      if (ee.attack !== undefined) this.sendRaw([ccStatus, 73, offsetToMidi(ee.attack)], `[Ch ${targetCh}] Attack (${ee.attack})`, 'cc', targetCh);
      if (ee.decay !== undefined) this.sendRaw([ccStatus, 75, offsetToMidi(ee.decay)], `[Ch ${targetCh}] Decay (${ee.decay})`, 'cc', targetCh);
      if (ee.release !== undefined) this.sendRaw([ccStatus, 72, offsetToMidi(ee.release)], `[Ch ${targetCh}] Release (${ee.release})`, 'cc', targetCh);
      if (ee.cutoff !== undefined) this.sendRaw([ccStatus, 74, offsetToMidi(ee.cutoff)], `[Ch ${targetCh}] Cutoff (${ee.cutoff})`, 'cc', targetCh);
      if (ee.resonance !== undefined) this.sendRaw([ccStatus, 71, offsetToMidi(ee.resonance)], `[Ch ${targetCh}] Resonance (${ee.resonance})`, 'cc', targetCh);
      if (ee.lfoDepth !== undefined) this.sendRaw([ccStatus, 77, offsetToMidi(ee.lfoDepth)], `[Ch ${targetCh}] LFO Depth (${ee.lfoDepth})`, 'cc', targetCh);
      if (ee.lfoSpeed !== undefined) this.sendRaw([ccStatus, 76, offsetToMidi(ee.lfoSpeed)], `[Ch ${targetCh}] LFO Speed (${ee.lfoSpeed})`, 'cc', targetCh);
      if (ee.lfoDelay !== undefined) this.sendRaw([ccStatus, 78, offsetToMidi(ee.lfoDelay)], `[Ch ${targetCh}] LFO Delay (${ee.lfoDelay})`, 'cc', targetCh);
      if (ee.portamentoOn !== undefined) {
        this.sendRaw([ccStatus, 65, ee.portamentoOn ? 127 : 0], `[Ch ${targetCh}] Portamento ${ee.portamentoOn ? 'ON' : 'OFF'}`, 'cc', targetCh);
      }
      if (ee.portamentoTime !== undefined) {
        const pt = clamp7(ee.portamentoTime, 0);
        this.sendRaw([ccStatus, 5, pt], `[Ch ${targetCh}] Portamento Time=${pt}`, 'cc', targetCh);
      }
    }
  }

  /**
   * Pure Channel 16 (Control) Performance transmission.
   * Sends ONLY 3 clean MIDI messages with 3ms spacing:
   * 1. [0xBF, 0, 1] (Bank Select MSB = 1)
   * 2. [0xBF, 32, bankNumber] (Bank Select LSB = Bank 0..15)
   * 3. [0xCF, performanceNumber - 1] (Program Change = 0..31)
   * Zero messages on Ch 1-3.
   */
  public sendPerformanceCh16(
    bankNumber: number,
    performanceNumber: number,
    perfName: string = 'Performance'
  ) {
    this.clearPendingSoundQueues();

    const safeBank = Math.max(0, Math.min(15, Math.round(Number(bankNumber) || 0)));
    const safePerf = Math.max(1, Math.min(32, Math.round(Number(performanceNumber) || 1)));
    const safePc = safePerf - 1;

    this.sendRaw(
      [0xBF, 0, 1],
      `[Ch 16 Perf] Bank Select MSB = 1`,
      'cc',
      16
    );
    this.scheduleSoundAction(3, () => {
      this.sendRaw(
        [0xBF, 32, safeBank],
        `[Ch 16 Perf] Bank Select LSB = ${safeBank}`,
        'cc',
        16
      );
    });
    this.scheduleSoundAction(6, () => {
      this.sendRaw(
        [0xCF, safePc],
        `[Ch 16 Perf] ${perfName} (Bank ${safeBank} · #${safePerf} → PC ${safePc})`,
        'pc',
        16
      );
    });
  }

  public sendSound(
    channel: number | string,
    msb: number,
    lsb: number,
    pc: number,
    soundName: string
  ) {
    this.clearPendingSoundQueues();

    const normalizedStr = typeof channel === 'string'
      ? channel.trim().toLowerCase().replace(/\s+/g, '')
      : '';
    const isCh16Requested =
      channel === 16 ||
      normalizedStr === '16' ||
      normalizedStr === 'ch16';

    const targetCh = isCh16Requested
      ? (this.channels.upper1 || 1)
      : this.clampChannel(channel, this.channels.upper1 || 1);

    this.sendBankAndProgramOrdered(
      targetCh,
      msb,
      lsb,
      pc,
      `تغيير الصوت: ${soundName}`,
      'sound',
      0,
      false
    );
  }

  public sendProgramChange(channel: number | string, msb: number, lsb: number, pc: number, soundName: string = 'Sound') {
    this.sendSound(channel, msb, lsb, pc, soundName);
  }

  public sendSTS(stsNumber: 1 | 2 | 3 | 4, forceCh16: boolean = false) {
    const safeSts = Math.max(1, Math.min(4, Math.round(Number(stsNumber) || 1)));
    const controlCh = forceCh16 ? 16 : this.clampChannel(this.channels.arranger, 16);
    const chIdx = controlCh - 1;
    // Official Korg PA Control Channel: PC 64 = STS 1, PC 65 = STS 2, PC 66 = STS 3, PC 67 = STS 4
    const pc = 63 + safeSts;
    this.sendRaw([0xC0 | chIdx, pc], `[Ch ${controlCh} Control] تفعيل STS ${safeSts} (PC #${pc})`, 'pc', controlCh);
  }

  public sendArrangerCommand(command: 'start' | 'stop' | 'continue' | 'synchro_start' | 'synchro_stop' | 'tap_tempo' | 'fade') {
    switch (command) {
      case 'start':
        this.sendRaw([0xFA], 'تشغيل الإيقاع (Arranger Start)', 'realtime');
        break;
      case 'stop':
        this.sendRaw([0xFC], 'إيقاف الإيقاع (Arranger Stop)', 'realtime');
        break;
      case 'continue':
        this.sendRaw([0xFB], 'متابعة الإيقاع (Arranger Continue)', 'realtime');
        break;
      case 'synchro_start': {
        const ch = this.channels.arranger - 1;
        this.sendRaw([0xB0 | ch, 82, 127], 'تفعيل المزامنة التلقائية (Synchro Start)', 'cc', ch + 1);
        break;
      }
      case 'synchro_stop': {
        const ch = this.channels.arranger - 1;
        this.sendRaw([0xB0 | ch, 83, 127], 'إيقاف المزامنة (Synchro Stop)', 'cc', ch + 1);
        break;
      }
      case 'fade': {
        const ch = this.channels.arranger - 1;
        this.sendRaw([0xB0 | ch, 84, 127], 'تلاشي الصوت تدريجياً (Fade In / Out)', 'cc', ch + 1);
        break;
      }
      case 'tap_tempo': {
        const ch = this.channels.arranger - 1;
        this.sendRaw([0xB0 | ch, 85, 127], 'تحديد السرعة باللمس (Tap Tempo)', 'cc', ch + 1);
        break;
      }
    }
  }

  public sendStyleElement(type: 'variation' | 'fill' | 'intro' | 'ending' | 'break', index: number) {
    const ch = this.channels.arranger - 1;
    let label = '';
    let ccNum = 86;
    let ccVal = 0;

    if (type === 'variation') {
      label = `تنويع الإيقاع Variation ${index}`;
      ccNum = 86;
      ccVal = (index - 1) * 32;
    } else if (type === 'fill') {
      label = `قفلة إيقاعية Fill In ${index}`;
      ccNum = 87;
      ccVal = (index - 1) * 40;
    } else if (type === 'intro') {
      label = `مقدمة Intro ${index}`;
      ccNum = 88;
      ccVal = (index - 1) * 40;
    } else if (type === 'ending') {
      label = `خاتمة Ending ${index}`;
      ccNum = 89;
      ccVal = (index - 1) * 40;
    } else if (type === 'break') {
      label = `كسرة / سكتة Break`;
      ccNum = 90;
      ccVal = 127;
    }

    this.sendRaw([0xB0 | ch, ccNum, ccVal], label, 'cc', ch + 1);
  }

  public sendStyleSelect(
    msb: number,
    lsb: number,
    pc: number,
    styleName: string,
    options?: { singleNumberOnly?: boolean; forceCh16?: boolean; autoStart?: boolean }
  ) {
    this.clearPendingStyleQueues();

    const targetCh = options?.forceCh16 ? 16 : this.clampChannel(this.channels.arranger, 16);
    const chIdx = Math.max(0, Math.min(15, targetCh - 1));
    const safePc = Math.max(0, Math.min(127, Math.round(Number(pc) || 0)));

    if (options?.singleNumberOnly) {
      // Mode 1 (Single Number Only): send ONLY [0xCF, pc] on Ch 16 without altering banks
      this.sendRaw(
        [0xC0 | chIdx, safePc],
        `تغيير الإيقاع مباشرة: ${styleName} (PC #${safePc} [Ch ${targetCh}])`,
        'pc',
        targetCh
      );
      if (options?.autoStart) {
        this.scheduleStyleAction(35, () => {
          this.sendArrangerCommand('start');
        });
      }
      return;
    }

    // Mode 2 (Factory / User Bank + Number): ordered MSB -> +4ms LSB -> +8ms PC
    this.sendBankAndProgramOrdered(
      targetCh,
      msb,
      lsb,
      safePc,
      `تغيير الإيقاع: ${styleName}`,
      'style',
      0,
      true
    );

    if (options?.autoStart) {
      this.scheduleStyleAction(48, () => {
        this.sendArrangerCommand('start');
      });
    }
  }

  public sendPartControl(channel: number, type: 'volume' | 'pan' | 'reverb' | 'chorus' | 'expression', value: number) {
    const ch = Math.max(0, Math.min(15, channel - 1));
    const val = Math.max(0, Math.min(127, Math.round(value)));
    let ccNum = 7;
    let name = 'Volume';

    switch (type) {
      case 'volume': ccNum = 7; name = 'مستوى الصوت (Volume)'; break;
      case 'pan': ccNum = 10; name = 'الموازنة الصوتية (Pan)'; break;
      case 'reverb': ccNum = 91; name = 'الصدى (Reverb)'; break;
      case 'chorus': ccNum = 93; name = 'الكورس (Chorus)'; break;
      case 'expression': ccNum = 11; name = 'التعبير الديناميكي (Expression)'; break;
    }

    this.sendRaw([0xB0 | ch, ccNum, val], `${name}: ${val} [قناة ${channel}]`, 'cc', channel);
  }

  public sendPitchBend(normalized: number, channel: number = this.channels.upper1, sendAllUpper: boolean = true) {
    const clamped = Math.max(-1, Math.min(1, normalized));
    const rawVal = Math.round(8192 + clamped * 8191);
    const lsb = Math.max(0, Math.min(127, Number(rawVal & 0x7F) || 0));
    const msb = Math.max(0, Math.min(127, Number((rawVal >> 7) & 0x7F) || 0));

    const channels = sendAllUpper
      ? [
          this.channels.upper1,
          this.channels.upper2,
          this.channels.upper3,
        ]
      : [channel];

    const uniqueChannels = Array.from(new Set(channels));
    uniqueChannels.forEach((chNum, i) => {
      const ch = Math.max(0, Math.min(15, chNum - 1));
      if (i === 0) {
        this.sendRaw([0xE0 | ch, lsb, msb], `Pitch Bend: ${(normalized * 100).toFixed(0)}% [Ch ${chNum}]`, 'system', chNum);
      } else if (this.selectedOutput && this.selectedOutput.state === 'connected') {
        try {
          this.selectedOutput.send([0xE0 | ch, lsb, msb]);
        } catch (_) {}
      }
    });
  }

  public sendModulation(value: number, channel: number = this.channels.upper1, sendAllUpper: boolean = true) {
    const val = Math.max(0, Math.min(127, Math.round(Number(value) || 0)));
    const channels = sendAllUpper
      ? [
          this.channels.upper1,
          this.channels.upper2,
          this.channels.upper3,
        ]
      : [channel];

    const uniqueChannels = Array.from(new Set(channels));
    uniqueChannels.forEach((chNum, i) => {
      const ch = Math.max(0, Math.min(15, chNum - 1));
      if (i === 0) {
        this.sendRaw([0xB0 | ch, 1, val], `Modulation: ${val} [Ch ${chNum}]`, 'cc', chNum);
      } else if (this.selectedOutput && this.selectedOutput.state === 'connected') {
        try {
          this.selectedOutput.send([0xB0 | ch, 1, val]);
        } catch (_) {}
      }
    });
  }

  public sendPadTrigger(padNum: 1 | 2 | 3 | 4, isDown: boolean = true) {
    const arrangerCh = this.channels.arranger - 1;
    const padCCVal = isDown ? padNum * 30 : 0;
    this.sendRaw([0xB0 | arrangerCh, 84, padCCVal], `KORG Pad ${padNum} ${isDown ? 'ON' : 'OFF'}`, 'cc', arrangerCh + 1);

    const padNote = 35 + padNum;
    if (isDown) {
      this.sendRaw([0x90 | arrangerCh, padNote, 120], `Pad ${padNum} Note On`, 'note_on', arrangerCh + 1);
    } else {
      this.sendRaw([0x80 | arrangerCh, padNote, 0], `Pad ${padNum} Note Off`, 'note_off', arrangerCh + 1);
    }
  }

  public sendTranspose(semitones: number) {
    const uniqueChs = Array.from(new Set([
      this.channels.upper1 - 1,
      this.channels.upper2 - 1,
      this.channels.upper3 - 1,
      this.channels.lower - 1,
    ]));
    for (const ch of uniqueChs) {
      this.sendRaw([0xB0 | ch, 101, 0], `RPN MSB (Coarse Tune)`, 'cc', ch + 1);
      this.sendRaw([0xB0 | ch, 100, 2], `RPN LSB (Coarse Tune)`, 'cc', ch + 1);
      this.sendRaw([0xB0 | ch, 6, 64 + semitones], `Transpose: ${semitones > 0 ? '+' : ''}${semitones} st`, 'cc', ch + 1);
    }
  }

  public sendPanic() {
    for (let ch = 0; ch < 16; ch++) {
      this.sendRaw([0xB0 | ch, 123, 0], `All Notes Off [Ch ${ch + 1}]`, 'cc', ch + 1);
    }
    this.log('system', 'out', 'تم تنفيذ أمر الطوارئ (Panic): كتم جميع الأصوات وإيقاف النوتات العالقة.', 'PANIC_ALL');
  }

  public getIsSimulationMode(): boolean {
    return this.isSimulationMode;
  }
}

export const midiEngine = new MidiEngine();
// === التحكم المستقل في الأورج 1 (البنوك 1-4) والأورج 2 (البنوك 5-8) بدون لمس القنوات ===
const _origSendRaw = midiEngine.sendRaw.bind(midiEngine);
midiEngine.sendRaw = function (data: number[], label?: string, type?: any) {
  const engineAny = midiEngine as any;
  const outputs: MIDIOutput[] = engineAny.midiAccess
    ? Array.from(engineAny.midiAccess.outputs.values())
    : [];

  if (outputs.length >= 2 && data.length >= 3 && (data[0] & 0xf0) === 0xb0 && data[1] === 0x20) {
    const bankNum = data[2];
    const targetPort = bankNum >= 4 ? outputs[1] : outputs[0];
    if (targetPort) {
      engineAny.activeOutput = targetPort;
      engineAny.output = targetPort;
    }
  }
  return _origSendRaw(data, label, type);
};
