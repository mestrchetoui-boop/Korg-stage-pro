/**
 * Type definitions for Korg Oriental Commander
 */

export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B';

export interface NoteTuning {
  note: NoteName;
  nameAr: string;
  nameEn: string;
  isQuarterTone: boolean; // True when detuned by -50 cents
  cents: number;          // -99 to +99 cents, standard quarter tone is -50
}

export interface MaqamPreset {
  id: string;
  nameAr: string;
  nameEn: string;
  rootNote: NoteName;
  quarterNotes: NoteName[]; // Which notes receive -50 cents
  centsOverrides?: Partial<Record<NoteName, number>>;
  descriptionAr: string;
  descriptionEn: string;
  character: string; // Emotion / musical mood
}

export interface CustomPadButton {
  id: string;
  slotIndex: number;           // 0 to 11
  page: number;                // 1 to 16
  type: 'sound' | 'style';
  name: string;
  msb: number;                 // CC #0 (0 for Ch 16 Performance)
  lsb: number;                 // CC #32 (Bank Number 0-15 for Performance, or Style LSB)
  pc: number;                  // Program Change (0-31 for Performance, 0-127 for Style)
  bankNumber?: number;         // 0 to 15 (Ch 16 Bank Number)
  performanceNumber?: number;  // 1 to 32 (mapped to PC 0-31)
  color: 'green' | 'emerald' | 'orange' | 'red' | 'purple' | 'blue' | 'cyan' | 'pink' | 'amber';
  channel?: number | 'ch16';   // Sounds strictly use Ch 16 Performance; Styles use Ch 16
  messageType?: 'bank_pc' | 'pc_only';
  isEmpty?: boolean;
}

export interface KorgHardwarePad {
  id: 1 | 2 | 3 | 4;
  nameAr: string;
  nameEn: string;
  type: 'darbuka_roll' | 'zagharid' | 'clap' | 'riq_jingle';
  ccNumber: number;
}

export interface KorgSound {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'oriental' | 'strings' | 'synth' | 'brass' | 'keys' | 'percussion';
  msb: number; // Bank Select MSB (CC #0)
  lsb: number; // Bank Select LSB (CC #32)
  pc: number;  // Program Change (0-127)
  octave: number; // Default octave transposition
  volume: number; // 0-127
  reverb: number; // 0-127
  descriptionAr: string;
  descriptionEn: string;
}

export type StyleVariation = 1 | 2 | 3 | 4;
export type StyleFill = 1 | 2 | 3;
export type StyleIntro = 1 | 2 | 3;
export type StyleEnding = 1 | 2 | 3;

export interface KorgStyle {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'egyptian' | 'levantine' | 'gulf' | 'north_african' | 'modern';
  bpm: number;
  timeSignature: '4/4' | '2/4' | '6/8' | '10/8' | '3/4';
  msb: number;
  lsb: number;
  pc: number;
  descriptionAr: string;
  descriptionEn: string;
  pattern: {
    dum: number[]; // 16-step grid
    tak: number[];
    sak: number[];
    riq: number[];
  };
}

export interface KorgModelProfile {
  id: string;
  name: string;
  series: 'Pa' | 'Kronos' | 'Triton' | 'General';
  hasMicrotuningSysEx: boolean;
  scaleSysExType: 'korg_pa_native' | 'midi_tuning_standard' | 'cc_controller';
  description: string;
  arrangerChannel: number; // MIDI Channel for Arranger (typically 10 or 16)
  upper1Channel: number;   // Upper 1 (typically 1)
  upper2Channel: number;   // Upper 2 (typically 2)
  upper3Channel: number;   // Upper 3 (typically 3)
  lowerChannel: number;    // Lower (typically 4)
}

export interface MidiDeviceOption {
  id: string;
  name: string;
  manufacturer?: string;
  state: 'connected' | 'disconnected';
}

export interface MidiLogMessage {
  id: string;
  timestamp: string;
  type: 'sysex' | 'cc' | 'pc' | 'note_on' | 'note_off' | 'realtime' | 'system';
  direction: 'out' | 'in';
  channel?: number;
  description: string;
  hex: string;
}

export interface MixerPart {
  id: 'upper1' | 'upper2' | 'upper3' | 'lower';
  nameAr: string;
  nameEn: string;
  channel: number;
  sound: KorgSound;
  volume: number;     // 0-127
  pan: number;        // 0-127 (64 = center)
  reverb: number;     // 0-127
  chorus: number;     // 0-127
  octave: number;     // -2 to +2
  muted: boolean;
  solo: boolean;
}

export interface MidiChannelSettings {
  upper1: number;
  upper2: number;
  upper3: number;
  lower: number;
  arranger: number;
}


