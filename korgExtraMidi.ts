import { midiEngine } from './midiEngine';

export type KeyboardEngineMode = 'pa_series' | 'kronos';
export const KEYBOARD_MODE_STORAGE_KEY = 'korg_stage_keyboard_mode_v1';

export type PitchBendRangeSemitones = 2 | 5 | 12;
export const PITCH_BEND_RANGE_STORAGE_KEY = 'korg_pitch_bend_range_v1';

/**
 * Sends KORG Kronos Program / Combi selection on MIDI Channel 1:
 *   CC#0 (MSB) = 0, CC#32 (LSB) = bankIndex (0..15), Program Change = pad - 1
 */
export function sendKronosProgramSelect(
  bankIndex: number,
  padNumber1Based: number,
  label?: string
): void {
  const safeBank = Math.max(0, Math.min(127, Math.round(bankIndex)));
  const safePad = Math.max(1, Math.min(128, Math.round(padNumber1Based)));
  const pc = (safePad - 1) & 0x7f;
  const tag = label || `Bank ${safeBank} · #${safePad}`;

  midiEngine.sendRaw([0xb0, 0x00, 0x00], `Kronos Bank MSB=0 (${tag})`, 'cc');
  midiEngine.sendRaw([0xb0, 0x20, safeBank & 0x7f], `Kronos Bank LSB=${safeBank} (${tag})`, 'cc');
  midiEngine.sendRaw([0xc0, pc], `Kronos Prog/Combi PC=${pc} (${tag})`, 'pc');
}

/**
 * Sends standard MIDI RPN Pitch Bend Sensitivity on Channel 1:
 *   CC 101 = 0 (RPN MSB), CC 100 = 0 (RPN LSB), CC 6 = range semitones, CC 38 = 0 cents
 */
export function sendPitchBendSensitivityRpn(rangeSemitones: PitchBendRangeSemitones): void {
  const rangeByte = Math.max(0, Math.min(127, Math.round(rangeSemitones)));
  midiEngine.sendRaw([0xb0, 101, 0], `Pitch Bend RPN MSB=0 (±${rangeByte} ST)`, 'cc');
  midiEngine.sendRaw([0xb0, 100, 0], `Pitch Bend RPN LSB=0 (±${rangeByte} ST)`, 'cc');
  midiEngine.sendRaw([0xb0, 6, rangeByte], `Pitch Bend Sensitivity = ±${rangeByte} semitones`, 'cc');
  midiEngine.sendRaw([0xb0, 38, 0], `Pitch Bend Fine = 0 cents`, 'cc');
}

/**
 * Sends Breath Controller (CC #2) and Expression (CC #11) on MIDI Channel 1
 * to smoothly swell and sustain wind/string notes.
 */
export function sendBreathControllerCh1(value0To127: number, label?: string): void {
  const safeVal = Math.max(0, Math.min(127, Math.round(value0To127)));
  const tag = label || `CC2/CC11=${safeVal}`;
  midiEngine.sendRaw([0xb0, 2, safeVal], `Breath CC2=${safeVal} (${tag})`, 'cc');
  midiEngine.sendRaw([0xb0, 11, safeVal], `Expression CC11=${safeVal} (${tag})`, 'cc');
}

