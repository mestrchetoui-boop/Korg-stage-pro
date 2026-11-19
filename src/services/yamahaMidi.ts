import { NoteName, NoteTuning } from '../types';
import { NOTE_NAMES } from '../data/korgPresets';
import { midiEngine } from './midiEngine';

export type YamahaStyleElement = 'variation' | 'fill' | 'break' | 'intro' | 'ending';
export type YamahaModelId = 'psr_a5000' | 'genos' | 'psr_sx' | 'psr_or700_a3000';

export const YAMAHA_MODEL_STORAGE_KEY = 'korg_yamaha_model_id_v1';

export interface YamahaModelSpec {
  id: YamahaModelId;
  label: string;
  shortLabel: string;
  defaultVoiceMsb: number;
}

export const YAMAHA_MODELS: YamahaModelSpec[] = [
  {
    id: 'psr_a5000',
    label: 'Yamaha PSR-A5000',
    shortLabel: 'PSR-A5000',
    defaultVoiceMsb: 0,
  },
  {
    id: 'genos',
    label: 'Yamaha Genos / Genos2',
    shortLabel: 'Genos / Genos2',
    defaultVoiceMsb: 0,
  },
  {
    id: 'psr_sx',
    label: 'Yamaha PSR-SX Series',
    shortLabel: 'PSR-SX Series',
    defaultVoiceMsb: 0,
  },
  {
    id: 'psr_or700_a3000',
    label: 'Yamaha PSR-OR700 / A3000',
    shortLabel: 'OR700 / A3000',
    defaultVoiceMsb: 0,
  },
];

export function getYamahaModelSpec(id: YamahaModelId): YamahaModelSpec {
  return YAMAHA_MODELS.find((m) => m.id === id) || YAMAHA_MODELS[0];
}

/**
 * Sends Yamaha XG/XF Bank Select (MSB, LSB) + Program Change on MIDI Channel 1..16 (0-indexed status byte).
 */
export function sendYamahaVoiceSelect(
  msb: number,
  lsb: number,
  pc: number,
  channel1To16: number = 1,
  label?: string
): void {
  const ch = Math.max(0, Math.min(15, Math.round(channel1To16) - 1));
  const safeMsb = msb & 0x7f;
  const safeLsb = lsb & 0x7f;
  const safePc = pc & 0x7f;
  const tag = label || `MSB=${safeMsb} LSB=${safeLsb} PC=${safePc}`;

  midiEngine.sendRaw([0xb0 | ch, 0x00, safeMsb], `Yamaha XG Bank MSB=${safeMsb} (${tag})`, 'cc');
  midiEngine.sendRaw([0xb0 | ch, 0x20, safeLsb], `Yamaha XG Bank LSB=${safeLsb} (${tag})`, 'cc');
  midiEngine.sendRaw([0xc0 | ch, safePc], `Yamaha XG Program PC=${safePc} (${tag})`, 'pc');
}

/**
 * Sends Yamaha Scale Tuning SysEx for all 12 notes:
 *   F0 43 10 4C 08 00 41 [note] [cents] F7
 * where note = 0..11 (C..B) and cents = 64 + detuneCents (0x40 = 0¢, 0x0E = -50¢).
 */
export function sendYamahaScaleTuning(
  tunings: Record<NoteName, NoteTuning>,
  modelId: YamahaModelId = 'psr_a5000'
): { sent: boolean; sysexBlocked: boolean } {
  if (midiEngine.hasConnectedOutput() && !midiEngine.isSysExEnabled()) {
    return { sent: false, sysexBlocked: true };
  }

  const modelName = getYamahaModelSpec(modelId).shortLabel;
  NOTE_NAMES.forEach((noteName, noteIdx) => {
    const tuning = tunings[noteName];
    const detune = tuning?.isQuarterTone ? tuning.cents : (tuning?.cents ?? 0);
    const centsByte = Math.max(0, Math.min(127, Math.round(64 + detune)));
    const packet = [0xf0, 0x43, 0x10, 0x4c, 0x08, 0x00, 0x41, noteIdx & 0x7f, centsByte, 0xf7];
    midiEngine.sendRaw(
      packet,
      `Yamaha ${modelName} Scale Tuning ${noteName} (${detune >= 0 ? `+${detune}` : detune}¢)`,
      'sysex'
    );
  });

  return { sent: true, sysexBlocked: false };
}

/**
 * Sends Yamaha Style Start / Stop control SysEx (+ standard MIDI Realtime Start/Stop).
 */
export function sendYamahaStyleStartStop(
  action: 'start' | 'stop',
  modelId: YamahaModelId = 'psr_a5000'
): void {
  const modelName = getYamahaModelSpec(modelId).shortLabel;
  if (action === 'start') {
    midiEngine.sendRaw([0xf0, 0x43, 0x7e, 0x00, 0x00, 0x01, 0xf7], `Yamaha ${modelName} Style Start`, 'sysex');
    midiEngine.sendRaw([0xfa], `MIDI Start (${modelName})`, 'cc');
  } else {
    midiEngine.sendRaw([0xf0, 0x43, 0x7e, 0x00, 0x7f, 0x00, 0xf7], `Yamaha ${modelName} Style Stop`, 'sysex');
    midiEngine.sendRaw([0xfc], `MIDI Stop (${modelName})`, 'cc');
  }
}

/**
 * Sends Yamaha Style Control SysEx for Main A/B/C/D, Fill-In, Break, Intro, and Ending.
 */
export function sendYamahaStyleControl(
  element: YamahaStyleElement,
  number: number = 1,
  modelId: YamahaModelId = 'psr_a5000'
): void {
  const modelName = getYamahaModelSpec(modelId).shortLabel;
  const idx = Math.max(0, Math.min(3, Math.round(number) - 1));
  let sectionCode = 0x08;
  let label = 'Main A';

  switch (element) {
    case 'variation': {
      sectionCode = 0x08 + idx; // 0x08..0x0B = Main A..D
      label = `Main ${['A', 'B', 'C', 'D'][idx]}`;
      break;
    }
    case 'fill': {
      sectionCode = 0x10 + idx; // 0x10..0x13 = Fill In A..D
      label = `Fill-In ${['A', 'B', 'C', 'D'][idx]}`;
      break;
    }
    case 'break': {
      sectionCode = 0x18; // Break
      label = 'Break';
      break;
    }
    case 'intro': {
      const i = Math.min(2, idx);
      sectionCode = 0x00 + i; // 0x00..0x02 = Intro 1..3
      label = `Intro ${i + 1}`;
      break;
    }
    case 'ending': {
      const e = Math.min(2, idx);
      sectionCode = 0x20 + e; // 0x20..0x22 = Ending 1..3
      label = `Ending ${e + 1}`;
      break;
    }
  }

  midiEngine.sendRaw(
    [0xf0, 0x43, 0x7e, 0x00, sectionCode & 0x7f, 0x01, 0xf7],
    `Yamaha ${modelName} Style Control: ${label}`,
    'sysex'
  );
}

/**
 * Sends Yamaha XG Style Bank Select + Program Change on Channel 16 (or standard XG Style Select).
 */
export function sendYamahaStyleSelect(
  msb: number,
  lsb: number,
  pc: number,
  name: string,
  modelId: YamahaModelId = 'psr_a5000'
): void {
  const modelName = getYamahaModelSpec(modelId).shortLabel;
  const safeMsb = msb & 0x7f;
  const safeLsb = lsb & 0x7f;
  const safePc = pc & 0x7f;
  midiEngine.sendRaw([0xbf, 0x00, safeMsb], `Yamaha ${modelName} Style MSB=${safeMsb} (${name})`, 'cc');
  midiEngine.sendRaw([0xbf, 0x20, safeLsb], `Yamaha ${modelName} Style LSB=${safeLsb} (${name})`, 'cc');
  midiEngine.sendRaw([0xcf, safePc], `Yamaha ${modelName} Style PC=${safePc} (${name})`, 'pc');
}
