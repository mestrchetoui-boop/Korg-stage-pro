import React, { useState, useEffect, useRef } from 'react';
import {
  CustomPadButton,
  NoteName,
  NoteTuning,
  MidiChannelSettings,
} from '../types';
import { NOTE_NAMES, NOTE_ARABIC_NAMES } from '../data/korgPresets';
import { midiEngine } from '../services/midiEngine';
import { audioEngine } from '../services/audioEngine';
import { isSoundIndexUnlocked, canUseProFeature } from '../services/licenseService';
import { PitchRibbon } from './PitchRibbon';
import {
  UiCustomizationSettings,
  DEFAULT_UI_SETTINGS,
  UI_THEME_PRESETS,
  getButtonSizeClasses,
  getColumnsGridClass,
  getButtonFontClasses,
} from '../data/uiThemes';
import { Edit3, Check, X, Play, Square, Music, Radio, Volume2, VolumeX, Save, Sparkles, Smartphone, RotateCcw, Send, Usb, Lock, Trash2, SkipForward, Waves, Plus, ListMusic, Maximize2, Minimize2, Palette } from 'lucide-react';
import { KeyboardEngineMode, sendKronosProgramSelect } from '../services/korgExtraMidi';
import {
  YamahaModelId,
  getYamahaModelSpec,
  sendYamahaScaleTuning,
  sendYamahaStyleControl,
  sendYamahaStyleSelect,
  sendYamahaStyleStartStop,
  sendYamahaVoiceSelect,
} from '../services/yamahaMidi';

interface KorgStageViewProps {
  tunings: Record<NoteName, NoteTuning>;
  setTunings: React.Dispatch<React.SetStateAction<Record<NoteName, NoteTuning>>>;
  isPro: boolean;
  onRequirePro: (featureLabel?: string) => void;
  lang: 'ar' | 'en';
  uiSettings?: UiCustomizationSettings;
  keyboardMode?: KeyboardEngineMode;
  activeBrand?: 'korg' | 'yamaha';
  yamahaModel?: YamahaModelId;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const DEFAULT_LEFT_STYLES: CustomPadButton[] = [
  { id: 'sty_0', slotIndex: 0, page: 1, type: 'style', name: 'saidi 1', msb: 0, lsb: 1, pc: 11, color: 'purple' },
  { id: 'sty_1', slotIndex: 1, page: 1, type: 'style', name: 'wehda 1', msb: 0, lsb: 1, pc: 14, color: 'purple' },
  { id: 'sty_2', slotIndex: 2, page: 1, type: 'style', name: 'RUMBA', msb: 0, lsb: 3, pc: 31, color: 'orange' },
  
  { id: 'sty_3', slotIndex: 3, page: 1, type: 'style', name: 'BALADI', msb: 0, lsb: 1, pc: 15, color: 'red' },
  { id: 'sty_4', slotIndex: 4, page: 1, type: 'style', name: 'laff 1', msb: 0, lsb: 1, pc: 12, color: 'cyan' },
  { id: 'sty_5', slotIndex: 5, page: 1, type: 'style', name: 'DABKE', msb: 0, lsb: 2, pc: 20, color: 'blue' },
  
  { id: 'sty_6', slotIndex: 6, page: 1, type: 'style', name: 'laff 2', msb: 0, lsb: 1, pc: 13, color: 'emerald' },
  { id: 'sty_7', slotIndex: 7, page: 1, type: 'style', name: 'BALADI 2', msb: 0, lsb: 1, pc: 16, color: 'emerald' },
  { id: 'sty_8', slotIndex: 8, page: 1, type: 'style', name: 'HAJAA', msb: 0, lsb: 2, pc: 22, color: 'blue' },
  
  { id: 'sty_9', slotIndex: 9, page: 1, type: 'style', name: 'wehda k', msb: 0, lsb: 1, pc: 10, color: 'purple' },
  { id: 'sty_10', slotIndex: 10, page: 1, type: 'style', name: 'raiii 1', msb: 0, lsb: 4, pc: 40, color: 'pink' },
  { id: 'sty_11', slotIndex: 11, page: 1, type: 'style', name: 'chawii', msb: 0, lsb: 4, pc: 41, color: 'orange' },
];

const DEFAULT_RIGHT_SOUNDS: CustomPadButton[] = [
  { id: 'snd_0', slotIndex: 0, page: 1, type: 'sound', name: 'STRING 1', msb: 1, lsb: 0, pc: 0, bankNumber: 0, performanceNumber: 1, color: 'purple', channel: 'ch16' },
  { id: 'snd_1', slotIndex: 1, page: 1, type: 'sound', name: 'STRING 2', msb: 1, lsb: 0, pc: 1, bankNumber: 0, performanceNumber: 2, color: 'purple', channel: 'ch16' },
  { id: 'snd_2', slotIndex: 2, page: 1, type: 'sound', name: 'STRING 3', msb: 1, lsb: 0, pc: 2, bankNumber: 0, performanceNumber: 3, color: 'red', channel: 'ch16' },

  { id: 'snd_3', slotIndex: 3, page: 1, type: 'sound', name: 'STRING 4', msb: 1, lsb: 0, pc: 3, bankNumber: 0, performanceNumber: 4, color: 'blue', channel: 'ch16' },
  { id: 'snd_4', slotIndex: 4, page: 1, type: 'sound', name: 'STRING 5', msb: 1, lsb: 0, pc: 4, bankNumber: 0, performanceNumber: 5, color: 'cyan', channel: 'ch16' },
  { id: 'snd_5', slotIndex: 5, page: 1, type: 'sound', name: 'NAY 1', msb: 1, lsb: 0, pc: 5, bankNumber: 0, performanceNumber: 6, color: 'emerald', channel: 'ch16' },

  { id: 'snd_6', slotIndex: 6, page: 1, type: 'sound', name: 'STRING 7', msb: 1, lsb: 0, pc: 6, bankNumber: 0, performanceNumber: 7, color: 'blue', channel: 'ch16' },
  { id: 'snd_7', slotIndex: 7, page: 1, type: 'sound', name: 'TRITON LEAD', msb: 1, lsb: 0, pc: 7, bankNumber: 0, performanceNumber: 8, color: 'pink', channel: 'ch16' },
  { id: 'snd_8', slotIndex: 8, page: 1, type: 'sound', name: 'OUD 1', msb: 1, lsb: 0, pc: 8, bankNumber: 0, performanceNumber: 9, color: 'purple', channel: 'ch16' },

  { id: 'snd_9', slotIndex: 9, page: 1, type: 'sound', name: 'OUD elec 2', msb: 1, lsb: 0, pc: 9, bankNumber: 0, performanceNumber: 10, color: 'purple', channel: 'ch16' },
  { id: 'snd_10', slotIndex: 10, page: 1, type: 'sound', name: 'OUD trml 3', msb: 1, lsb: 0, pc: 10, bankNumber: 0, performanceNumber: 11, color: 'pink', channel: 'ch16' },
  { id: 'snd_11', slotIndex: 11, page: 1, type: 'sound', name: 'kamala', msb: 1, lsb: 0, pc: 11, bankNumber: 0, performanceNumber: 12, color: 'orange', channel: 'ch16' },
];

const TOTAL_STAGE_BANKS = 16;
const TOTAL_STYLE_BANKS = 6;
const SOUND_BANK_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
const BANK_COLORS_STORAGE_KEY = 'korg_stage_bank_colors_v1';

type BankColorId = 'gold' | 'cyan' | 'emerald' | 'crimson' | 'purple' | 'amber' | 'silver' | 'magenta';

interface BankColorTheme {
  id: BankColorId;
  labelAr: string;
  labelEn: string;
  swatchClass: string;
  dotClass: string;
  tabActive: string;
  tabInactive: string;
  padIdle: string;
  padActive: string;
  padTextIdle: string;
  padTextActive: string;
}

const BANK_COLOR_PALETTE: Record<BankColorId, BankColorTheme> = {
  gold: {
    id: 'gold',
    labelAr: 'ذهبي سائل 8K',
    labelEn: 'Liquid Gold 8K',
    swatchClass: 'bg-gradient-to-br from-[#FFF08A] via-[#FACC15] to-[#B45309] border-[#FEF9C3]',
    dotClass: 'bg-[#FACC15]',
    tabActive: 'hardware-keycap-gold-active text-[#030508]',
    tabInactive: 'bg-[#030508] text-[#FFF08A] border-[1.5px] border-white/15 hover:border-[#FACC15]/70',
    padIdle: 'hardware-keycap-gold border-[1.5px]',
    padActive: 'hardware-keycap-gold-active border-[1.5px]',
    padTextIdle: 'text-[#030508]',
    padTextActive: 'text-[#030508]',
  },
  cyan: {
    id: 'cyan',
    labelAr: 'سماوي',
    labelEn: 'Cyan',
    swatchClass: 'bg-[#38BDF8] border-sky-200',
    dotClass: 'bg-[#38BDF8]',
    tabActive: 'bg-[#38BDF8] text-[#070B14] border-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.6)]',
    tabInactive: 'bg-[#111827] text-sky-300 border-sky-500/45 hover:bg-sky-500/15',
    padIdle: 'bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] hover:from-[#38BDF8] hover:to-[#0369A1] border border-sky-300/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#BAE6FD] to-[#38BDF8] border-2 border-white ring-2 ring-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.85)]',
    padTextIdle: 'text-[#030712]',
    padTextActive: 'text-[#030712]',
  },
  emerald: {
    id: 'emerald',
    labelAr: 'أخضر زمردي',
    labelEn: 'Emerald Green',
    swatchClass: 'bg-[#10B981] border-emerald-200',
    dotClass: 'bg-[#10B981]',
    tabActive: 'bg-[#10B981] text-[#022C22] border-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.6)]',
    tabInactive: 'bg-[#111827] text-emerald-300 border-emerald-500/45 hover:bg-emerald-500/15',
    padIdle: 'bg-gradient-to-b from-[#10B981] to-[#059669] hover:from-[#34D399] hover:to-[#047857] border border-emerald-300/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#A7F3D0] to-[#34D399] border-2 border-white ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.85)]',
    padTextIdle: 'text-[#022C22]',
    padTextActive: 'text-[#022C22]',
  },
  crimson: {
    id: 'crimson',
    labelAr: 'أحمر قرمزي',
    labelEn: 'Crimson Red',
    swatchClass: 'bg-[#DC2626] border-rose-200',
    dotClass: 'bg-[#EF4444]',
    tabActive: 'bg-[#DC2626] text-white border-rose-200 shadow-[0_0_10px_rgba(239,68,68,0.6)]',
    tabInactive: 'bg-[#111827] text-rose-300 border-rose-500/45 hover:bg-rose-500/15',
    padIdle: 'bg-gradient-to-b from-[#DC2626] to-[#991B1B] hover:from-[#EF4444] hover:to-[#B91C1C] border border-rose-400/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#EF4444] to-[#DC2626] border-2 border-[#FDE047] ring-2 ring-white shadow-[0_0_18px_rgba(239,68,68,0.85)]',
    padTextIdle: 'text-white',
    padTextActive: 'text-white',
  },
  purple: {
    id: 'purple',
    labelAr: 'بنفسجي ملكي',
    labelEn: 'Royal Purple',
    swatchClass: 'bg-[#9333EA] border-purple-200',
    dotClass: 'bg-[#A855F7]',
    tabActive: 'bg-[#9333EA] text-white border-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.6)]',
    tabInactive: 'bg-[#111827] text-purple-300 border-purple-500/45 hover:bg-purple-500/15',
    padIdle: 'bg-gradient-to-b from-[#9333EA] to-[#6B21A8] hover:from-[#A855F7] hover:to-[#7E22CE] border border-purple-300/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#C084FC] to-[#9333EA] border-2 border-[#FFB703] ring-2 ring-white shadow-[0_0_18px_rgba(168,85,247,0.85)]',
    padTextIdle: 'text-white',
    padTextActive: 'text-white',
  },
  amber: {
    id: 'amber',
    labelAr: 'برتقالي عنبري',
    labelEn: 'Amber Orange',
    swatchClass: 'bg-[#F97316] border-orange-200',
    dotClass: 'bg-[#FB923C]',
    tabActive: 'bg-[#F97316] text-[#1C0A00] border-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.6)]',
    tabInactive: 'bg-[#111827] text-orange-300 border-orange-500/45 hover:bg-orange-500/15',
    padIdle: 'bg-gradient-to-b from-[#F97316] to-[#C2410C] hover:from-[#FB923C] hover:to-[#EA580C] border border-orange-300/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#FED7AA] to-[#FB923C] border-2 border-white ring-2 ring-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.85)]',
    padTextIdle: 'text-[#1C0A00]',
    padTextActive: 'text-[#1C0A00]',
  },
  silver: {
    id: 'silver',
    labelAr: 'فضي معدني',
    labelEn: 'Silver',
    swatchClass: 'bg-[#CBD5E1] border-white',
    dotClass: 'bg-[#CBD5E1]',
    tabActive: 'bg-[#E2E8F0] text-[#070B14] border-white shadow-[0_0_10px_rgba(226,232,240,0.55)]',
    tabInactive: 'bg-[#111827] text-slate-200 border-slate-400/50 hover:bg-slate-400/15',
    padIdle: 'bg-gradient-to-b from-[#CBD5E1] to-[#94A3B8] hover:from-[#E2E8F0] hover:to-[#CBD5E1] border border-white/60 shadow-md',
    padActive: 'bg-gradient-to-b from-[#F8FAFC] to-[#CBD5E1] border-2 border-[#38BDF8] ring-2 ring-white shadow-[0_0_18px_rgba(226,232,240,0.85)]',
    padTextIdle: 'text-[#070B14]',
    padTextActive: 'text-[#070B14]',
  },
  magenta: {
    id: 'magenta',
    labelAr: 'ماجنتا وردي',
    labelEn: 'Magenta',
    swatchClass: 'bg-[#DB2777] border-pink-200',
    dotClass: 'bg-[#EC4899]',
    tabActive: 'bg-[#DB2777] text-white border-pink-200 shadow-[0_0_10px_rgba(236,72,153,0.6)]',
    tabInactive: 'bg-[#111827] text-pink-300 border-pink-500/45 hover:bg-pink-500/15',
    padIdle: 'bg-gradient-to-b from-[#DB2777] to-[#9D174D] hover:from-[#EC4899] hover:to-[#BE185D] border border-pink-300/50 shadow-md',
    padActive: 'bg-gradient-to-b from-[#F472B6] to-[#DB2777] border-2 border-[#FDE047] ring-2 ring-white shadow-[0_0_18px_rgba(236,72,153,0.85)]',
    padTextIdle: 'text-white',
    padTextActive: 'text-white',
  },
};

const BANK_COLOR_OPTIONS = Object.values(BANK_COLOR_PALETTE);

type DroneRootKey = 'C' | 'D' | 'Eb' | 'E' | 'F' | 'G' | 'A' | 'Bb';

const DRONE_ROOT_OPTIONS: Array<{ key: DroneRootKey; label: string; midiNote: number }> = [
  { key: 'C', label: 'C', midiNote: 48 },
  { key: 'D', label: 'D', midiNote: 50 },
  { key: 'Eb', label: 'Eb', midiNote: 51 },
  { key: 'E', label: 'E', midiNote: 52 },
  { key: 'F', label: 'F', midiNote: 53 },
  { key: 'G', label: 'G', midiNote: 55 },
  { key: 'A', label: 'A', midiNote: 57 },
  { key: 'Bb', label: 'Bb', midiNote: 58 },
];

interface StageSetlistItem {
  id: string;
  title: string;
  soundId: string;
  styleId: string | null;
  memorySlot: string;
  droneRoot: DroneRootKey;
}

const DEFAULT_STAGE_SETLIST: StageSetlistItem[] = [
  { id: 'song_1', title: 'بياتي · Sayidi', soundId: 'snd_0', styleId: 'sty_0', memorySlot: 'P1', droneRoot: 'D' },
  { id: 'song_2', title: 'راست · Baladi', soundId: 'snd_5', styleId: 'sty_3', memorySlot: 'P3', droneRoot: 'C' },
  { id: 'song_3', title: 'صبا · Wehda', soundId: 'snd_8', styleId: 'sty_1', memorySlot: 'P2', droneRoot: 'D' },
  { id: 'song_4', title: 'حجاز · Dabke', soundId: 'snd_7', styleId: 'sty_5', memorySlot: 'P4', droneRoot: 'D' },
];

const STAGE_PAD_COLORS: CustomPadButton['color'][] = [
  'purple', 'blue', 'cyan', 'emerald', 'orange', 'red', 'pink', 'amber', 'green',
];

const buildExtraStyleBankDefaults = (): CustomPadButton[] => {
  const bankConfigs: Array<{ page: number; lsb: number; prefix: string; names?: string[] }> = [
    { page: 2, lsb: 27, prefix: 'U1', names: ['RAY RAY', 'STAIFI 1', 'MEZOUED', 'FEZZANI', 'ALLAOUY', 'REGGADA', 'SAIDI U1', 'MAQSOUM', 'WAHDA U1', 'CHAOUI 2', 'KHALIJI', 'MALOUF'] },
    { page: 3, lsb: 26, prefix: 'U2', names: ['MAGHREB', 'SAMAI', 'GNAWA', 'CHAABI', 'ZENDALI', 'LAFF U2', 'BALADI U2', 'DABKE U2', 'TARAB', 'WALTZ OR', 'SLOW 6/8', 'SIRTO'] },
    { page: 4, lsb: 29, prefix: 'U3' },
    { page: 5, lsb: 15, prefix: 'FAV1' },
    { page: 6, lsb: 16, prefix: 'FAV2' },
  ];
  const out: CustomPadButton[] = [];
  bankConfigs.forEach((cfg) => {
    for (let i = 0; i < 12; i++) {
      out.push({
        id: `sty_b${cfg.page}_${i}`,
        slotIndex: i,
        page: cfg.page,
        type: 'style',
        name: cfg.names ? cfg.names[i] : `${cfg.prefix} STY ${i + 1}`,
        msb: 0,
        lsb: cfg.lsb,
        pc: i,
        color: STAGE_PAD_COLORS[(i + cfg.page) % STAGE_PAD_COLORS.length],
        messageType: 'bank_pc',
      });
    }
  });
  return out;
};

const buildExtraSoundBankDefaults = (): CustomPadButton[] => {
  const bankNames: Array<{ page: number; names: string[] }> = [
    {
      page: 2,
      names: [
        'KANUN 1', 'BOUZOUK', 'ZOURNA', 'ACCORD 1',
        'KAWALA 2', 'MEJWEZ', 'VIOLIN OR', 'STRINGS U2',
        'LEAD U2', 'BRASS U2', 'SAX U2', 'PIANO U2',
      ],
    },
    {
      page: 3,
      names: Array.from({ length: 12 }, (_, i) => `PERF B2 · ${i + 1}`),
    },
    {
      page: 4,
      names: Array.from({ length: 12 }, (_, i) => `PERF B3 · ${i + 1}`),
    },
    {
      page: 5,
      names: [
        'BRASS 1', 'BRASS 2', 'TRUMPET 1', 'SAX 1',
        'SAX 2', 'ETHNIC 1', 'ETHNIC 2', 'ETHNIC 3',
        'GUITAR 1', 'GUITAR 2', 'ACCORD F1', 'ACCORD F2',
      ],
    },
    {
      page: 6,
      names: [
        'PIANO 1', 'PIANO 2', 'E.PIANO 1', 'E.PIANO 2',
        'ORGAN 1', 'ORGAN 2', 'SYN PAD 1', 'SYN PAD 2',
        'SYN LEAD 1', 'SYN LEAD 2', 'BASS 1', 'BELL 1',
      ],
    },
  ];
  for (let page = 7; page <= TOTAL_STAGE_BANKS; page++) {
    const bankNum = page - 1;
    bankNames.push({
      page,
      names: Array.from({ length: 8 }, (_, i) => `PERF B${bankNum} · ${i + 1}`),
    });
  }

  const out: CustomPadButton[] = [];
  bankNames.forEach((cfg) => {
    const bankNum = cfg.page - 1;
    cfg.names.forEach((name, i) => {
      out.push({
        id: `snd_b${cfg.page}_${i}`,
        slotIndex: i,
        page: cfg.page,
        type: 'sound',
        name,
        msb: 1,
        lsb: bankNum,
        pc: i,
        bankNumber: bankNum,
        performanceNumber: i + 1,
        color: STAGE_PAD_COLORS[(i + cfg.page) % STAGE_PAD_COLORS.length],
        channel: 'ch16',
      });
    });
  });
  return out;
};

const EXTRA_DEFAULT_STYLES: CustomPadButton[] = buildExtraStyleBankDefaults();
const EXTRA_DEFAULT_SOUNDS: CustomPadButton[] = buildExtraSoundBankDefaults();

const COLOR_CLASSES: Record<string, {
  bg: string;
  border: string;
  text: string;
  glow: string;
  accentBar: string;
  activeBg: string;
  activeBorder: string;
  activeGlow: string;
}> = {
  purple: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-purple-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-purple-500',
    activeBg: 'bg-purple-600/90',
    activeBorder: 'border-purple-300',
    activeGlow: 'shadow-[0_0_18px_rgba(168,85,247,0.55)]',
  },
  blue: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-sky-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-sky-500',
    activeBg: 'bg-sky-600/90',
    activeBorder: 'border-sky-300',
    activeGlow: 'shadow-[0_0_18px_rgba(56,189,248,0.55)]',
  },
  cyan: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-cyan-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-cyan-400',
    activeBg: 'bg-cyan-600/90',
    activeBorder: 'border-cyan-300',
    activeGlow: 'shadow-[0_0_18px_rgba(6,182,212,0.55)]',
  },
  emerald: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-emerald-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-emerald-400',
    activeBg: 'bg-emerald-600/95',
    activeBorder: 'border-emerald-300',
    activeGlow: 'shadow-[0_0_18px_rgba(16,185,129,0.55)]',
  },
  green: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-green-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-green-400',
    activeBg: 'bg-green-600/95',
    activeBorder: 'border-green-300',
    activeGlow: 'shadow-[0_0_18px_rgba(34,197,94,0.55)]',
  },
  red: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-rose-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-rose-500',
    activeBg: 'bg-rose-600/95',
    activeBorder: 'border-rose-300',
    activeGlow: 'shadow-[0_0_18px_rgba(244,63,94,0.55)]',
  },
  orange: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-orange-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-orange-500',
    activeBg: 'bg-orange-600/95',
    activeBorder: 'border-orange-300',
    activeGlow: 'shadow-[0_0_18px_rgba(249,115,22,0.55)]',
  },
  pink: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-pink-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-pink-500',
    activeBg: 'bg-pink-600/95',
    activeBorder: 'border-pink-300',
    activeGlow: 'shadow-[0_0_18px_rgba(236,72,153,0.55)]',
  },
  amber: {
    bg: 'bg-[#1C2128] hover:bg-[#232933]',
    border: 'border-[#30363D] hover:border-amber-500/60',
    text: 'text-[#F0F6FC]',
    glow: 'shadow-black/40',
    accentBar: 'bg-amber-400',
    activeBg: 'bg-amber-500/95',
    activeBorder: 'border-amber-200',
    activeGlow: 'shadow-[0_0_18px_rgba(245,158,11,0.55)]',
  },
};

export const KorgStageView: React.FC<KorgStageViewProps> = ({
  tunings,
  setTunings,
  isPro,
  onRequirePro,
  lang,
  uiSettings = DEFAULT_UI_SETTINGS,
  keyboardMode = 'pa_series',
  activeBrand = 'korg',
  yamahaModel = 'psr_a5000',
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const isAr = lang === 'ar';
  const theme = UI_THEME_PRESETS[uiSettings.theme] || UI_THEME_PRESETS.gold;
  const soundTheme = UI_THEME_PRESETS[uiSettings.soundColor] || theme;
  const styleTheme = UI_THEME_PRESETS[uiSettings.styleColor] || theme;
  const colsClass = getColumnsGridClass(uiSettings.columns);
  const landscapeBtnSize = getButtonSizeClasses(uiSettings.buttonSize, false);
  const portraitBtnSize = getButtonSizeClasses(uiSettings.buttonSize, true);
  const btnFonts = getButtonFontClasses(uiSettings.fontSize);

  const [bankColors, setBankColors] = useState<Record<number, BankColorId>>(() => {
    try {
      const raw = localStorage.getItem(BANK_COLORS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        const clean: Record<number, BankColorId> = {};
        for (const [k, v] of Object.entries(parsed)) {
          const bankIdx = Number(k);
          if (Number.isFinite(bankIdx) && bankIdx >= 1 && bankIdx <= TOTAL_STAGE_BANKS && v in BANK_COLOR_PALETTE) {
            clean[bankIdx] = v as BankColorId;
          }
        }
        return clean;
      }
    } catch {}
    return {};
  });
  const [isBankColorPickerOpen, setIsBankColorPickerOpen] = useState<boolean>(false);

  const setCustomBankColor = (bankPage: number, colorId: BankColorId | null) => {
    setBankColors((prev) => {
      const next = { ...prev };
      if (colorId === null) {
        delete next[bankPage];
      } else {
        next[bankPage] = colorId;
      }
      try {
        localStorage.setItem(BANK_COLORS_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const getPadButtonClasses = (pad: CustomPadButton, isActive: boolean) => {
    if (pad.type === 'sound') {
      const bankColorId = bankColors[pad.page ?? 1];
      if (bankColorId && BANK_COLOR_PALETTE[bankColorId]) {
        const bt = BANK_COLOR_PALETTE[bankColorId];
        return isActive ? `${bt.padActive} ${bt.padTextActive}` : `${bt.padIdle} ${bt.padTextIdle}`;
      }
    }
    if (uiSettings.useIndividualPadColors) {
      const c = COLOR_CLASSES[pad.color] || COLOR_CLASSES.purple;
      return isActive
        ? `${c.activeBg} border-2 ${c.activeBorder} ${c.activeGlow} text-white`
        : `${c.bg} border ${c.border} ${c.text}`;
    }
    const sectionTheme = pad.type === 'sound' ? soundTheme : styleTheme;
    return isActive
      ? `${sectionTheme.buttonActive} ${sectionTheme.buttonTextActive}`
      : `${sectionTheme.buttonIdle} ${sectionTheme.buttonTextIdle}`;
  };

  const getPadTextColor = (pad: CustomPadButton, isActive: boolean) => {
    if (pad.type === 'sound') {
      const bankColorId = bankColors[pad.page ?? 1];
      if (bankColorId && BANK_COLOR_PALETTE[bankColorId]) {
        const bt = BANK_COLOR_PALETTE[bankColorId];
        return isActive ? bt.padTextActive : bt.padTextIdle;
      }
    }
    if (uiSettings.useIndividualPadColors) {
      return isActive ? 'text-white' : (COLOR_CLASSES[pad.color] || COLOR_CLASSES.purple).text;
    }
    const sectionTheme = pad.type === 'sound' ? soundTheme : styleTheme;
    return isActive ? sectionTheme.buttonTextActive : sectionTheme.buttonTextIdle;
  };

  // Active Sound Bank (B1..B16) & Style Bank (B1..B6)
  const [activeSoundBank, setActiveSoundBank] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('korg_stage_active_sound_bank'));
      if (Number.isFinite(n) && n >= 1 && n <= TOTAL_STAGE_BANKS) return Math.round(n);
    } catch {}
    return 1;
  });
  const [activeStyleBank, setActiveStyleBank] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('korg_stage_active_style_bank'));
      if (Number.isFinite(n) && n >= 1 && n <= TOTAL_STYLE_BANKS) return Math.round(n);
    } catch {}
    return 1;
  });

  // Orientation and Layout Management
  const [layoutMode, setLayoutMode] = useState<'portrait' | 'landscape'>('portrait');

  // Vertical phone mode active tab: 'sounds' | 'styles' | 'all'
  const [portraitSection, setPortraitSection] = useState<'sounds' | 'styles' | 'all'>(() => {
    try {
      const s = localStorage.getItem('korg_stage_portrait_section');
      if (s === 'sounds' || s === 'styles' || s === 'all') return s;
    } catch {}
    return 'sounds';
  });

  const [activePreset, setActivePreset] = useState<'P1' | 'P2' | 'P3' | 'P4'>(() => {
    try {
      const s = localStorage.getItem('korg_stage_active_preset');
      if (s === 'P1' || s === 'P2' || s === 'P3' || s === 'P4') return s;
    } catch {}
    return 'P1';
  });
  const [transpose, setTranspose] = useState<number>(() => {
    try {
      const s = localStorage.getItem('korg_stage_transpose');
      const n = s ? Number(s) : 0;
      return !isNaN(n) ? Math.max(-12, Math.min(12, n)) : 0;
    } catch {}
    return 0;
  });
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [activeMemorySlot, setActiveMemorySlot] = useState<string>(() => {
    try {
      return localStorage.getItem('korg_stage_active_memory_slot') || 'P1';
    } catch {}
    return 'P1';
  });
  const [soundPreviewEnabled, setSoundPreviewEnabled] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('korg_stage_sound_preview');
      return s !== null ? s === 'true' : true;
    } catch {}
    return true;
  });
  const [isCableConnected, setIsCableConnected] = useState<boolean>(
    () => midiEngine.hasConnectedOutput()
  );
  const [isSysExBlocked, setIsSysExBlocked] = useState<boolean>(
    () => midiEngine.hasConnectedOutput() && !midiEngine.isSysExEnabled()
  );
  const [channels, setChannels] = useState<MidiChannelSettings>(() => midiEngine.getChannels());

  // Memory Slots P0 - P7 persisted in localStorage
  const [memorySlots, setMemorySlots] = useState<Record<string, NoteName[]>>(() => {
    const defaults: Record<string, NoteName[]> = {
      P0: [],
      P1: ['E', 'B'],
      P2: ['E'],
      P3: ['E', 'A'],
      P4: ['C#', 'F#'],
      P5: ['D', 'A'],
      P6: ['B', 'F#'],
      P7: ['F#', 'B'],
    };
    try {
      const saved = localStorage.getItem('korg_tashreeq_slots');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Active playing sound and style
  const [activeSoundId, setActiveSoundId] = useState<string>(() => {
    try {
      return localStorage.getItem('korg_stage_active_sound_id') || 'snd_0';
    } catch {}
    return 'snd_0';
  });
  const [activeStyleId, setActiveStyleId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('korg_stage_active_style_id');
    } catch {}
    return null;
  });
  const [isPlayingRhythm, setIsPlayingRhythm] = useState<boolean>(false);
  const [activeVariation, setActiveVariation] = useState<1 | 2 | 3 | 4>(1);

  // Feature #2: Maqam Drone (Ch 3 / Pad) & Live Stage Setlist ("Next Song")
  const [droneRoot, setDroneRoot] = useState<DroneRootKey>(() => {
    try {
      const saved = localStorage.getItem('korg_stage_drone_root');
      if (saved && DRONE_ROOT_OPTIONS.some((o) => o.key === saved)) {
        return saved as DroneRootKey;
      }
    } catch {}
    return 'D';
  });
  const [isDroneActive, setIsDroneActive] = useState<boolean>(false);
  const activeDroneMidiRef = useRef<number | null>(null);

  const [stageSetlist, setStageSetlist] = useState<StageSetlistItem[]>(() => {
    try {
      const saved = localStorage.getItem('korg_stage_setlist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_STAGE_SETLIST;
  });
  const [activeSetlistIdx, setActiveSetlistIdx] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('korg_stage_setlist_idx'));
      if (Number.isFinite(n) && n >= 0) return Math.round(n);
    } catch {}
    return 0;
  });
  const [isSetlistModalOpen, setIsSetlistModalOpen] = useState<boolean>(false);
  const [newSongTitle, setNewSongTitle] = useState<string>('');

  useEffect(() => {
    try { localStorage.setItem('korg_stage_active_sound_bank', String(activeSoundBank)); } catch {}
  }, [activeSoundBank]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_active_style_bank', String(activeStyleBank)); } catch {}
  }, [activeStyleBank]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_portrait_section', portraitSection); } catch {}
  }, [portraitSection]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_active_preset', activePreset); } catch {}
  }, [activePreset]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_transpose', String(transpose)); } catch {}
  }, [transpose]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_active_memory_slot', activeMemorySlot); } catch {}
  }, [activeMemorySlot]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_sound_preview', String(soundPreviewEnabled)); } catch {}
  }, [soundPreviewEnabled]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_active_sound_id', activeSoundId); } catch {}
  }, [activeSoundId]);
  useEffect(() => {
    try {
      if (activeStyleId) localStorage.setItem('korg_stage_active_style_id', activeStyleId);
      else localStorage.removeItem('korg_stage_active_style_id');
    } catch {}
  }, [activeStyleId]);
  useEffect(() => {
    try { localStorage.setItem('korg_tashreeq_slots', JSON.stringify(memorySlots)); } catch {}
  }, [memorySlots]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_drone_root', droneRoot); } catch {}
  }, [droneRoot]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_setlist', JSON.stringify(stageSetlist)); } catch {}
  }, [stageSetlist]);
  useEffect(() => {
    try { localStorage.setItem('korg_stage_setlist_idx', String(activeSetlistIdx)); } catch {}
  }, [activeSetlistIdx]);

  useEffect(() => {
    return () => {
      if (activeDroneMidiRef.current !== null) {
        midiEngine.sendNoteOff(3, activeDroneMidiRef.current);
        activeDroneMidiRef.current = null;
      }
      audioEngine.stopDrone();
    };
  }, []);

  const mergeMissingBanks = (
    existing: CustomPadButton[],
    allDefaults: CustomPadButton[]
  ): CustomPadButton[] => {
    const withPage = existing.map((p, idx) => ({
      ...p,
      page: typeof p.page === 'number' && p.page >= 1 ? p.page : 1,
      slotIndex: typeof p.slotIndex === 'number' ? p.slotIndex : idx % 12,
    }));
    const presentPages = new Set(withPage.map((p) => p.page));
    const missing = allDefaults.filter((d) => !presentPages.has(d.page));
    return missing.length > 0 ? [...withPage, ...missing] : withPage;
  };

  // Pads Data (6 Banks x 12 Pads = 72 Styles & 72 Sounds)
  const [stylesPads, setStylesPads] = useState<CustomPadButton[]>(() => {
    const allDefaults = [...DEFAULT_LEFT_STYLES, ...EXTRA_DEFAULT_STYLES];
    try {
      const saved = localStorage.getItem('korg_arabscale_styles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((p: CustomPadButton, idx: number) => ({
            ...p,
            type: 'style' as const,
            page: typeof p.page === 'number' && p.page >= 1 ? p.page : 1,
            slotIndex: typeof p.slotIndex === 'number' ? p.slotIndex : idx % 12,
            messageType: p.messageType === 'pc_only' ? ('pc_only' as const) : ('bank_pc' as const),
            msb: Number.isFinite(Number(p.msb)) ? Math.max(0, Math.min(127, Math.round(Number(p.msb)))) : 0,
            lsb: Number.isFinite(Number(p.lsb)) ? Math.max(0, Math.min(127, Math.round(Number(p.lsb)))) : 0,
            pc: Number.isFinite(Number(p.pc)) ? Math.max(0, Math.min(127, Math.round(Number(p.pc)))) : 0,
          }));
          return mergeMissingBanks(cleaned, allDefaults);
        }
      }
      return allDefaults;
    } catch {
      return allDefaults;
    }
  });

  const clampMidi = (v: unknown, fallback: number): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(127, Math.round(n)));
  };

  const clampBankNumber = (v: unknown, fallback: number = 0): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(15, Math.round(n)));
  };

  const clampPerfNumber = (v: unknown, fallback: number = 1): number => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(1, Math.min(32, Math.round(n)));
  };

  const normalizeSoundPad = (p: CustomPadButton): CustomPadButton => {
    const fallbackBank = Math.max(0, Math.min(15, (Number(p.page) || 1) - 1));
    const bankNumber =
      typeof p.bankNumber === 'number' && Number.isFinite(p.bankNumber)
        ? clampBankNumber(p.bankNumber, fallbackBank)
        : p.channel === 'ch16' && (Number(p.msb) === 0 || Number(p.msb) === 1) && Number(p.lsb) >= 0 && Number(p.lsb) <= 15
        ? clampBankNumber(p.lsb, fallbackBank)
        : fallbackBank;

    const rawPc = Number.isFinite(Number(p.pc)) ? Math.max(0, Math.round(Number(p.pc))) : 0;
    const performanceNumber =
      typeof p.performanceNumber === 'number' && Number.isFinite(p.performanceNumber)
        ? clampPerfNumber(p.performanceNumber, 1)
        : clampPerfNumber((rawPc % 32) + 1, 1);

    return {
      id: p.id,
      slotIndex: p.slotIndex,
      page: p.page,
      type: 'sound',
      name: p.name,
      msb: 1,
      lsb: bankNumber,
      pc: performanceNumber - 1,
      bankNumber,
      performanceNumber,
      color: p.color,
      channel: 'ch16',
      ...(p.isEmpty !== undefined ? { isEmpty: p.isEmpty } : {}),
    };
  };

  const normalizeStylePad = (p: CustomPadButton): CustomPadButton => ({
    ...p,
    type: 'style',
    messageType: p.messageType === 'pc_only' ? 'pc_only' : 'bank_pc',
    msb: clampMidi(p.msb, 0),
    lsb: clampMidi(p.lsb, 0),
    pc: clampMidi(p.pc, 0),
  });

  const [soundsPads, setSoundsPads] = useState<CustomPadButton[]>(() => {
    const allDefaults = [...DEFAULT_RIGHT_SOUNDS, ...EXTRA_DEFAULT_SOUNDS];
    try {
      const saved = localStorage.getItem('korg_arabscale_sounds');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((p: CustomPadButton, idx: number) =>
            normalizeSoundPad({
              ...p,
              page: typeof p.page === 'number' && p.page >= 1 ? p.page : 1,
              slotIndex: typeof p.slotIndex === 'number' ? p.slotIndex : idx % 12,
            })
          );
          return mergeMissingBanks(normalized, allDefaults);
        }
      }
      return allDefaults;
    } catch {
      return allDefaults;
    }
  });

  const visibleSoundPads = soundsPads.filter((p) => (p.page ?? 1) === activeSoundBank);
  const visibleStylePads = stylesPads.filter((p) => (p.page ?? 1) === activeStyleBank);

  // Editor Modal
  const [editingPad, setEditingPad] = useState<CustomPadButton | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const cancelSoundLongPress = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openPadEditorModal = (pad: CustomPadButton) => {
    setEditingPad(pad.type === 'sound' ? normalizeSoundPad(pad) : normalizeStylePad(pad));
  };

  const startSoundLongPress = (pad: CustomPadButton) => {
    cancelSoundLongPress();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      longPressTriggeredRef.current = true;
      if (!canUseProFeature('edit_sound', isPro)) {
        onRequirePro(isAr ? 'تعديل الأزرار والأصوات' : 'Edit Sound Buttons');
        return;
      }
      openPadEditorModal(pad);
    }, 500);
  };

  useEffect(() => {
    return () => cancelSoundLongPress();
  }, []);

  useEffect(() => {
    const unsub = midiEngine.subscribeState(() => {
      const connected = midiEngine.hasConnectedOutput();
      setIsCableConnected(connected);
      setIsSysExBlocked(connected && !midiEngine.isSysExEnabled());
      setChannels(midiEngine.getChannels());
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isPro) {
      setIsEditMode(false);
      setEditingPad(null);
    }
  }, [isPro]);

  // Detect physical phone rotation (orientation change)
  useEffect(() => {
    const handleOrientation = () => {
      // Automatically switch layout when the phone is flipped/rotated
      if (window.innerWidth > window.innerHeight) {
        setLayoutMode('landscape');
      } else {
        setLayoutMode('portrait');
      }
    };

    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
    
    // Also listen to screen.orientation API if available
    if (window.screen && window.screen.orientation) {
      window.screen.orientation.addEventListener('change', handleOrientation);
    }

    return () => {
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
      if (window.screen && window.screen.orientation) {
        window.screen.orientation.removeEventListener('change', handleOrientation);
      }
    };
  }, []);

  // Active orientation state
  const effectiveIsLandscape = layoutMode === 'landscape';

  const saveStyles = (pads: CustomPadButton[]) => {
    const normalized = pads.map(p => normalizeStylePad(p));
    setStylesPads(normalized);
    try { localStorage.setItem('korg_arabscale_styles', JSON.stringify(normalized)); } catch (_) {}
  };

  const saveSounds = (pads: CustomPadButton[]) => {
    const normalized = pads.map(p => normalizeSoundPad(p));
    setSoundsPads(normalized);
    try { localStorage.setItem('korg_arabscale_sounds', JSON.stringify(normalized)); } catch (_) {}
  };

  const sendSoundPadToKorg = (pad: CustomPadButton) => {
    const norm = normalizeSoundPad(pad);
    const bankNumber = norm.bankNumber ?? 0;
    const performanceNumber = norm.performanceNumber ?? 1;
    if (activeBrand === 'yamaha') {
      const ch = channels.upper1 || 1;
      const spec = getYamahaModelSpec(yamahaModel);
      sendYamahaVoiceSelect(spec.defaultVoiceMsb, bankNumber, performanceNumber - 1, ch, norm.name);
      showToast(
        isAr
          ? `${spec.shortLabel} Ch ${ch} · بنك ${bankNumber} · PC ${performanceNumber - 1}: ${norm.name}`
          : `${spec.shortLabel} Ch ${ch} · Bank ${bankNumber} · PC ${performanceNumber - 1}: ${norm.name}`
      );
      return;
    }
    if (keyboardMode === 'kronos') {
      sendKronosProgramSelect(bankNumber, performanceNumber, norm.name);
      showToast(
        isAr
          ? `Kronos Ch 1 · بنك ${bankNumber} · رقم ${performanceNumber - 1}: ${norm.name}`
          : `Kronos Ch 1 · Bank ${bankNumber} · PC ${performanceNumber - 1}: ${norm.name}`
      );
      return;
    }
    midiEngine.sendPerformanceCh16(bankNumber, performanceNumber, norm.name);
    showToast(
      isAr
        ? `أداء Ch 16 · بنك ${bankNumber} · رقم ${performanceNumber}: ${norm.name}`
        : `Ch 16 Perf · Bank ${bankNumber} · #${performanceNumber}: ${norm.name}`
    );
  };

  const stopMaqamDrone = (autoFromRhythm: boolean = false) => {
    const prevMidi = activeDroneMidiRef.current;
    if (prevMidi !== null) {
      midiEngine.sendNoteOff(3, prevMidi);
      activeDroneMidiRef.current = null;
    }
    audioEngine.stopDrone();
    if (isDroneActive || prevMidi !== null) {
      setIsDroneActive(false);
      if (autoFromRhythm) {
        showToast(
          isAr
            ? 'تم إيقاف أرضية التقاسيم تلقائياً مع بدء الإيقاع'
            : 'Maqam Drone stopped on Rhythm Start'
        );
      }
    }
  };

  const startMaqamDrone = (root: DroneRootKey) => {
    const entry = DRONE_ROOT_OPTIONS.find((o) => o.key === root) || DRONE_ROOT_OPTIONS[1];
    if (activeDroneMidiRef.current !== null && activeDroneMidiRef.current !== entry.midiNote) {
      midiEngine.sendNoteOff(3, activeDroneMidiRef.current);
    }
    midiEngine.sendNoteOn(3, entry.midiNote, 75);
    if (!midiEngine.hasConnectedOutput()) {
      audioEngine.setTunings(tunings);
      audioEngine.startDrone(entry.midiNote);
    }
    activeDroneMidiRef.current = entry.midiNote;
    setIsDroneActive(true);
    showToast(
      isAr
        ? `تفعيل أرضية التقاسيم: ${entry.label} (Ch 3 / Pad)`
        : `Maqam Drone ON: ${entry.label} (Ch 3 / Pad)`
    );
  };

  const toggleMaqamDrone = () => {
    if (isDroneActive) {
      stopMaqamDrone(false);
      showToast(isAr ? 'إيقاف أرضية التقاسيم' : 'Maqam Drone OFF');
    } else {
      startMaqamDrone(droneRoot);
    }
  };

  const handleSelectDroneRoot = (root: DroneRootKey) => {
    setDroneRoot(root);
    if (isDroneActive) {
      startMaqamDrone(root);
    }
  };

  const sendStylePadToKorg = (pad: CustomPadButton, autoStart: boolean = true) => {
    const normalizedStyle = normalizeStylePad(pad);
    const isSingleNumber = normalizedStyle.messageType === 'pc_only';
    if (autoStart) {
      stopMaqamDrone(true);
      setIsPlayingRhythm(true);
    }
    if (activeBrand === 'yamaha') {
      sendYamahaStyleSelect(
        normalizedStyle.msb,
        normalizedStyle.lsb,
        normalizedStyle.pc,
        normalizedStyle.name,
        yamahaModel
      );
      if (autoStart) {
        sendYamahaStyleStartStop('start', yamahaModel);
      }
      const spec = getYamahaModelSpec(yamahaModel);
      showToast(
        isAr
          ? `إيقاع ${spec.shortLabel}: ${normalizedStyle.name}`
          : `${spec.shortLabel} Style: ${normalizedStyle.name}`
      );
      return;
    }
    midiEngine.sendStyleSelect(normalizedStyle.msb, normalizedStyle.lsb, normalizedStyle.pc, normalizedStyle.name, {
      singleNumberOnly: isSingleNumber,
      forceCh16: true,
      autoStart,
    });
    showToast(
      isSingleNumber
        ? (isAr ? `إيقاع مباشر (PC ${normalizedStyle.pc}): ${normalizedStyle.name}` : `Direct Style (PC ${normalizedStyle.pc}): ${normalizedStyle.name}`)
        : (isAr ? `تغيير الإيقاع: ${normalizedStyle.name}` : `Style: ${normalizedStyle.name}`)
    );
  };

  const handlePadClick = (pad: CustomPadButton) => {
    if (isEditMode) {
      if (!canUseProFeature('edit_sound', isPro)) {
        onRequirePro(isAr ? 'تعديل الأزرار والأصوات (MSB / LSB / PC)' : 'Edit Sound Buttons');
        return;
      }
      openPadEditorModal(pad);
      return;
    }

    if (pad.type === 'sound') {
      const padPage = pad.page ?? 1;
      const pagePads = soundsPads.filter((p) => (p.page ?? 1) === padPage);
      const idxInPage = pagePads.findIndex((p) => p.id === pad.id);
      const tierIdx = padPage === 1 ? idxInPage : 99 + Math.max(0, idxInPage);
      if (!isSoundIndexUnlocked(tierIdx, isPro)) {
        onRequirePro(pad.name);
        return;
      }
    }

    if (pad.type === 'sound') {
      const lower = pad.name.toLowerCase();
      if (lower.includes('oud')) audioEngine.setInstrument('oud');
      else if (lower.includes('nay')) audioEngine.setInstrument('nay');
      else if (lower.includes('triton') || lower.includes('lead')) audioEngine.setInstrument('lead');
      else if (lower.includes('kamala') || lower.includes('accord')) audioEngine.setInstrument('accordion');
      else audioEngine.setInstrument('strings');

      setActiveSoundId(pad.id);
      sendSoundPadToKorg(pad);
    } else {
      setActiveStyleId(pad.id);
      sendStylePadToKorg(pad, true);
    }
  };

  const handleSaveEdit = (updated: CustomPadButton) => {
    if (!canUseProFeature('edit_sound', isPro)) {
      onRequirePro(isAr ? 'تعديل الأزرار والأصوات (MSB / LSB / PC)' : 'Edit Sound Buttons');
      setEditingPad(null);
      return;
    }
    if (updated.type === 'sound') {
      const normalizedSound: CustomPadButton = {
        ...normalizeSoundPad(updated),
        isEmpty: false,
      };
      const res = soundsPads.map(p => p.id === updated.id ? normalizedSound : p);
      saveSounds(res);
    } else {
      const normalizedStyle: CustomPadButton = {
        ...normalizeStylePad(updated),
        isEmpty: false,
      };
      const res = stylesPads.map(p => p.id === updated.id ? normalizedStyle : p);
      saveStyles(res);
    }
    setEditingPad(null);
    showToast(isAr ? 'تم حفظ التعديل' : 'Saved');
  };

  const buildTuningsFromNotes = (quarterNotes: NoteName[]): Record<NoteName, NoteTuning> => {
    const updated: Record<NoteName, NoteTuning> = {} as Record<NoteName, NoteTuning>;
    NOTE_NAMES.forEach(n => {
      const isTuned = quarterNotes.includes(n);
      updated[n] = {
        note: n,
        nameAr: NOTE_ARABIC_NAMES[n].ar,
        nameEn: n,
        isQuarterTone: isTuned,
        cents: isTuned ? -50 : 0,
      };
    });
    return updated;
  };

  const sendScaleAndToast = (updated: Record<NoteName, NoteTuning>, normalMsg: string) => {
    const res = activeBrand === 'yamaha'
      ? sendYamahaScaleTuning(updated, yamahaModel)
      : midiEngine.sendQuarterToneScale(updated);
    if (res.sysexBlocked) {
      showToast(
        isAr
          ? 'تحذير: المتصفح يمنع SysEx! افتح الرابط في المتصفح مباشرة واضغط السماح بـ SysEx.'
          : 'SysEx blocked by browser! Open directly in your browser and allow MIDI SysEx.'
      );
    } else {
      showToast(normalMsg);
    }
  };

  const toggleQuarterNote = (note: NoteName) => {
    if (!canUseProFeature('manual_tashreeq', isPro)) {
      onRequirePro(isAr ? 'أزرار التشريق اليدوي المباشر' : 'Direct Manual Quarter-Tone Keys');
      return;
    }
    const current = tunings[note];
    const isQuarter = !current.isQuarterTone;
    const updated: Record<NoteName, NoteTuning> = {
      ...tunings,
      [note]: {
        ...current,
        isQuarterTone: isQuarter,
        cents: isQuarter ? -50 : 0,
      },
    };
    setTunings(updated);
    audioEngine.setTunings(updated);
    if (soundPreviewEnabled) {
      const midiNote = 60 + NOTE_NAMES.indexOf(note);
      audioEngine.playPreviewNote(midiNote, 420);
    }
    sendScaleAndToast(
      updated,
      isQuarter
        ? (isAr ? `تم تشريق ${NOTE_ARABIC_NAMES[note].ar} (-50¢)` : `Tuned ${note} (-50¢)`)
        : (isAr ? `إلغاء تشريق ${NOTE_ARABIC_NAMES[note].ar} (0¢)` : `Reset ${note} (0¢)`)
    );
  };

  const applyCombo = (notes: NoteName[], label: string) => {
    const updated = buildTuningsFromNotes(notes);
    setTunings(updated);
    audioEngine.setTunings(updated);
    if (soundPreviewEnabled && notes.length > 0) {
      const midiNote = 60 + NOTE_NAMES.indexOf(notes[0]);
      audioEngine.playPreviewNote(midiNote, 420);
    }
    sendScaleAndToast(updated, isAr ? `تفعيل ${label}` : `Applied ${label}`);
  };

  const resetTashreeq = () => {
    const updated = buildTuningsFromNotes([]);
    setTunings(updated);
    audioEngine.setTunings(updated);
    sendScaleAndToast(updated, isAr ? 'تم تصفير التشريق (سلم طبيعي)' : 'Scale Reset (Equal Temp)');
  };

  const recallMemorySlot = (slot: string) => {
    if (!canUseProFeature('preset_slots', isPro)) {
      onRequirePro(isAr ? `أزرار البريسيت (${slot})` : `Preset Slot (${slot})`);
      return;
    }
    setActiveMemorySlot(slot);
    const notes = memorySlots[slot] || [];
    const updated = buildTuningsFromNotes(notes);
    setTunings(updated);
    audioEngine.setTunings(updated);
    if (soundPreviewEnabled) {
      audioEngine.playScaleAudition(60);
    }
    sendScaleAndToast(
      updated,
      notes.length > 0
        ? (isAr ? `استدعاء ${slot}: ${notes.join(' + ')}` : `Recalled ${slot}: ${notes.join('+')}`)
        : (isAr ? `استدعاء ${slot}: سلم طبيعي` : `Recalled ${slot}: Natural`)
    );
  };

  const saveMemorySlot = () => {
    if (!isPro) {
      onRequirePro(isAr ? 'حفظ البريسيت P0-P7' : 'Save Preset P0-P7');
      return;
    }
    const activeNotes = NOTE_NAMES.filter(n => tunings[n]?.isQuarterTone);
    const nextSlots = { ...memorySlots, [activeMemorySlot]: activeNotes };
    setMemorySlots(nextSlots);
    try {
      localStorage.setItem('korg_tashreeq_slots', JSON.stringify(nextSlots));
    } catch (_) {}
    showToast(isAr ? `تم حفظ التشريق في ${activeMemorySlot}` : `Saved to ${activeMemorySlot}`);
  };

  const handleTranspose = (delta: number) => {
    const next = delta === 0 ? 0 : Math.max(-12, Math.min(12, transpose + delta));
    setTranspose(next);
    midiEngine.sendTranspose(next);
    showToast(`Transpose: ${next > 0 ? '+' : ''}${next}`);
  };

  const handleKorgPadPress = (padNum: 1 | 2 | 3 | 4) => {
    midiEngine.sendPadTrigger(padNum, true);
    audioEngine.playPadSound(padNum);
    setTimeout(() => midiEngine.sendPadTrigger(padNum, false), 300);
  };

  const applyStageSetlistItem = (item: StageSetlistItem, idx: number) => {
    setActiveSetlistIdx(idx);

    // 1. Recall Scale Memory Slot
    const slotKey = item.memorySlot || 'P1';
    setActiveMemorySlot(slotKey);
    if (slotKey === 'P1' || slotKey === 'P2' || slotKey === 'P3' || slotKey === 'P4') {
      setActivePreset(slotKey);
    }
    const notes = memorySlots[slotKey] || [];
    const updatedTunings = buildTuningsFromNotes(notes);
    setTunings(updatedTunings);
    audioEngine.setTunings(updatedTunings);
    if (activeBrand === 'yamaha') {
      sendYamahaScaleTuning(updatedTunings, yamahaModel);
    } else {
      midiEngine.sendQuarterToneScale(updatedTunings);
    }

    // 2. Recall Sound Button & Switch Bank if needed
    const sndPad = soundsPads.find((p) => p.id === item.soundId);
    if (sndPad) {
      setActiveSoundBank(sndPad.page ?? 1);
      setActiveSoundId(sndPad.id);
      sendSoundPadToKorg(sndPad);
    }

    // 3. Recall Style Button (without auto-start so musician controls intro/start)
    if (item.styleId) {
      const styPad = stylesPads.find((p) => p.id === item.styleId);
      if (styPad) {
        setActiveStyleBank(styPad.page ?? 1);
        setActiveStyleId(styPad.id);
        sendStylePadToKorg(styPad, false);
      }
    }

    // 4. Sync Drone Root
    if (item.droneRoot) {
      setDroneRoot(item.droneRoot);
      if (isDroneActive) {
        startMaqamDrone(item.droneRoot);
      }
    }

    showToast(
      isAr
        ? `الأغنية (${idx + 1}/${stageSetlist.length}): ${item.title} [${slotKey}]`
        : `Next Song (${idx + 1}/${stageSetlist.length}): ${item.title} [${slotKey}]`
    );
  };

  const handleNextSong = () => {
    if (stageSetlist.length === 0) return;
    const nextIdx = (activeSetlistIdx + 1) % stageSetlist.length;
    applyStageSetlistItem(stageSetlist[nextIdx], nextIdx);
  };

  const handleSaveCurrentToSetlist = () => {
    const activeSnd = soundsPads.find((p) => p.id === activeSoundId);
    const activeSty = stylesPads.find((p) => p.id === activeStyleId);
    const fallbackTitle = [
      activeSnd?.name || 'Sound',
      activeSty?.name || '',
      activeMemorySlot,
    ]
      .filter(Boolean)
      .join(' · ');
    const title = newSongTitle.trim() || fallbackTitle;
    const entry: StageSetlistItem = {
      id: `song_${Date.now()}`,
      title,
      soundId: activeSoundId,
      styleId: activeStyleId,
      memorySlot: activeMemorySlot,
      droneRoot,
    };
    const nextList = [...stageSetlist, entry];
    setStageSetlist(nextList);
    setActiveSetlistIdx(nextList.length - 1);
    setNewSongTitle('');
    showToast(isAr ? `تمت إضافة "${title}" إلى قائمة الحفلة` : `Added "${title}" to Setlist`);
  };

  const activeTunedNotes = NOTE_NAMES.filter(n => tunings[n]?.isQuarterTone);

  const tunerKeys: { note: NoteName; label: string; isBlack: boolean }[] = [
    { note: 'C', label: 'DO', isBlack: false },
    { note: 'C#', label: 'DO#', isBlack: true },
    { note: 'D', label: 'RE', isBlack: false },
    { note: 'D#', label: 'RE#', isBlack: true },
    { note: 'E', label: 'MI', isBlack: false },
    { note: 'F', label: 'FA', isBlack: false },
    { note: 'F#', label: 'FA#', isBlack: true },
    { note: 'G', label: 'SOL', isBlack: false },
    { note: 'G#', label: 'SOL#', isBlack: true },
    { note: 'A', label: 'LA', isBlack: false },
    { note: 'A#', label: 'LA#', isBlack: true },
    { note: 'B', label: 'SI', isBlack: false },
  ];

  // Reusable 12-Key 8K Crystal Scale Box (Blue Crystal Naturals + Obsidian-Black Sharps, Active Liquid Gold -50¢)
  const renderBlueBlackScaleKeys = (heightClass: string, blackHeightClass: string) => (
    <div
      dir="ltr"
      className={`relative ${heightClass} w-full select-none oled-subpanel border-[1.5px] border-white/15 rounded-xl p-1.5 overflow-hidden shadow-[inset_0_3px_12px_rgba(0,0,0,0.95)]`}
    >
      {!isPro && (
        <button
          type="button"
          onClick={() => onRequirePro(isAr ? 'أزرار التشريق اليدوي المباشر' : 'Direct Manual Quarter-Tone Keys')}
          className="absolute top-1.5 end-1.5 z-20 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#030508]/95 border border-[#FACC15]/70 text-[#FFF08A] text-[9px] font-black shadow"
        >
          <Lock className="w-2.5 h-2.5" />
          <span>PRO</span>
        </button>
      )}

      {/* 7 Natural Keys (Crystal Piano Blue -> Active Liquid Gold -50¢) */}
      <div className="flex h-full w-full gap-1">
        {tunerKeys.filter(k => !k.isBlack).map(k => {
          const isTuned = tunings[k.note]?.isQuarterTone;
          return (
            <button
              key={k.note}
              onClick={() => toggleQuarterNote(k.note)}
              className={`relative flex-1 h-full rounded-b-lg rounded-t-sm border-[1.5px] flex flex-col justify-end pb-1.5 items-center active-press ${
                !isPro
                  ? 'crystal-piano-blue opacity-70 text-blue-100/80'
                  : isTuned
                  ? 'crystal-piano-gold border-[#FEF9C3] ring-1 ring-[#FACC15] text-[#030508] led-glow-gold'
                  : 'crystal-piano-blue text-white'
              }`}
            >
              {isTuned && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 border border-[#030508] shadow-[0_0_6px_#10B981] mb-auto mt-1" />
              )}
              {!isPro ? (
                <Lock className="w-2.5 h-2.5 text-[#FFF08A] mb-0.5" />
              ) : isTuned ? (
                <span className="text-[9px] font-mono font-black bg-[#030508] text-[#FFF08A] px-1 rounded mb-0.5 shadow">
                  -50
                </span>
              ) : null}
              <span className={`font-black text-[10px] sm:text-xs font-mono block leading-none ${isTuned && isPro ? 'text-[#030508]' : 'text-white'}`}>
                {k.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5 Sharp / Flat Keys overlapping at top (Obsidian Crystal -> Active Liquid Gold -50¢) */}
      <div className={`absolute inset-x-1.5 top-1.5 ${blackHeightClass} pointer-events-none`}>
        {[
          { note: 'C#' as NoteName, label: 'DO#', boundary: 1 },
          { note: 'D#' as NoteName, label: 'RE#', boundary: 2 },
          { note: 'F#' as NoteName, label: 'FA#', boundary: 4 },
          { note: 'G#' as NoteName, label: 'SOL#', boundary: 5 },
          { note: 'A#' as NoteName, label: 'LA#', boundary: 6 },
        ].map(bk => {
          const isTuned = tunings[bk.note]?.isQuarterTone;
          return (
            <button
              key={bk.note}
              onClick={() => toggleQuarterNote(bk.note)}
              style={{ left: `${(bk.boundary / 7) * 100}%`, width: '10.5%' }}
              className={`pointer-events-auto absolute top-0 -translate-x-1/2 h-full rounded-b-md border-[1.5px] flex flex-col justify-end pb-1 items-center z-10 active-press ${
                !isPro
                  ? 'crystal-piano-obsidian text-slate-400'
                  : isTuned
                  ? 'crystal-piano-gold text-[#030508] border-[#FEF9C3] ring-1 ring-[#FACC15] led-glow-gold'
                  : 'crystal-piano-obsidian hover:brightness-125 text-slate-100'
              }`}
            >
              {!isPro ? (
                <Lock className="w-2 h-2 text-[#FFF08A] mb-0.5" />
              ) : isTuned ? (
                <span className="text-[8px] font-mono font-black bg-[#030508] text-[#FFF08A] px-0.5 rounded mb-0.5 shadow">
                  -50
                </span>
              ) : null}
              <span className={`text-[8px] sm:text-[9px] font-mono font-black leading-none ${isTuned && isPro ? 'text-[#030508]' : 'text-slate-100'}`}>
                {bk.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
        }
      }}
      className="stage-smooth-surface space-y-2.5 w-full max-w-[1440px] mx-auto select-none font-sans text-[#F8FAFC]"
    >
      
      {/* Slim Top Control Bar */}
      <div className={`oled-metal-panel border ${theme.panelBorder} ${theme.glowBox} rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 transition-colors`}>
        
        {/* Left: Brand & Transpose */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-md bg-[#05070B] border ${theme.panelBorder} flex items-center justify-center text-[11px] ${theme.secondaryAccentText} font-black`}>
              &lt;
            </div>
            <span className="text-xs sm:text-sm font-black tracking-wider text-[#F8FAFC] font-mono">
              {activeBrand === 'yamaha' ? (
                <>YAMAHA <span className={theme.accentText}>PRO</span></>
              ) : (
                <>KORG &amp; YAMAHA <span className={theme.accentText}>PRO</span></>
              )}
            </span>
          </div>

          {/* TRANSPOSE b | 0 | # */}
          <div className="flex items-center gap-1 bg-[#070B14] px-2 py-1 rounded-lg border border-[#1E293B]">
            <span className="text-[10px] font-mono text-neutral-400 font-bold uppercase">
              TRANS
            </span>
            <button
              onClick={() => handleTranspose(-1)}
              className="w-6 h-6 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#334155] text-pink-300 font-mono font-bold text-xs flex items-center justify-center active:scale-90"
              title="Transpose -1"
            >
              b
            </button>
            <button
              onClick={() => handleTranspose(0)}
              className="w-6 h-6 rounded bg-[#0B1120] text-[#FFB703] font-mono font-black text-xs flex items-center justify-center"
              title="Reset Transpose"
            >
              {transpose}
            </button>
            <button
              onClick={() => handleTranspose(1)}
              className="w-6 h-6 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#334155] text-[#38BDF8] font-mono font-bold text-xs flex items-center justify-center active:scale-90"
              title="Transpose +1"
            >
              #
            </button>
          </div>

          {/* Presets: P1 - P4 */}
          <div className="flex items-center gap-1">
            {(['P1', 'P2', 'P3', 'P4'] as const).map(p => {
              const isLocked = !canUseProFeature('preset_slots', isPro);
              return (
                <button
                  key={p}
                  onClick={() => {
                    if (isLocked) {
                      onRequirePro(isAr ? `أزرار البريسيت (${p})` : `Preset ${p}`);
                      return;
                    }
                    setActivePreset(p);
                    recallMemorySlot(p);
                  }}
                  className={`px-2 h-6 rounded-md font-mono font-bold text-[11px] transition-all flex items-center justify-center gap-0.5 border ${
                    isLocked
                      ? 'bg-[#070B14] text-neutral-500 border-[#1E293B]'
                      : activePreset === p
                      ? 'bg-[#38BDF8] text-[#070B14] border-sky-200 font-black shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                      : 'bg-[#111827] text-neutral-300 hover:bg-[#1E293B] border-[#1E293B]'
                  }`}
                >
                  <span>{p}</span>
                  {isLocked && <Lock className="w-2.5 h-2.5 text-[#FFB703]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: USB Cable Connect, Orientation Switcher & Edit Mode */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={async () => {
              const res = await midiEngine.initialize();
              const connected = midiEngine.hasConnectedOutput();
              setIsCableConnected(connected);
              setIsSysExBlocked(connected && !midiEngine.isSysExEnabled());
              if (connected) {
                showToast(
                  res.sysex
                    ? (isAr ? `متصل بـ SysEx: ${midiEngine.getSelectedOutputName()}` : `Connected (SysEx): ${midiEngine.getSelectedOutputName()}`)
                    : (isAr ? 'الكابل متصل لكن SysEx محظور! افتح الرابط في المتصفح مباشرة واضغط السماح بـ SysEx.' : 'USB connected, SysEx blocked by browser!')
                );
              } else {
                showToast(isAr ? 'أوصل كابل USB-MIDI بمنفذ USB DEVICE في الأورغ ثم اضغط هنا' : 'Plug USB-MIDI cable into USB DEVICE port then tap');
              }
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
              isCableConnected && !isSysExBlocked
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : isCableConnected && isSysExBlocked
                ? 'bg-amber-500/20 border-[#FFB703] text-amber-200 animate-pulse'
                : 'bg-[#111827] border-rose-500/60 text-rose-300'
            }`}
            title={
              isCableConnected
                ? `${midiEngine.getSelectedOutputName()} (${isSysExBlocked ? 'SysEx Blocked' : 'SysEx OK'})`
                : (isAr ? 'حالة كابل MIDI والربط الفوري' : 'USB-MIDI Cable Status & Connect')
            }
          >
            <Usb className="w-3.5 h-3.5" />
            <span>
              {isCableConnected
                ? isSysExBlocked
                  ? (isAr ? 'SysEx محظور!' : 'No SysEx!')
                  : (isAr ? 'كابل متصل' : 'USB OK')
                : (isAr ? 'ربط الكابل' : 'Connect USB')}
            </span>
          </button>

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                isFullscreen
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : 'bg-[#111827] border-[#1E293B] text-slate-200 hover:border-[#38BDF8]/60'
              }`}
              title={isAr ? 'تثبيت الشاشة كاملة للمسرح ومنع خروج أشرطة المتصفح' : 'Lock Fullscreen Stage View'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5 text-[#38BDF8]" />}
              <span className="hidden sm:inline">
                {isFullscreen ? (isAr ? 'تصغير' : 'Exit Full') : (isAr ? 'تثبيت الشاشة' : 'Full Screen')}
              </span>
            </button>
          )}

          <button
            onClick={() => setLayoutMode(layoutMode === 'portrait' ? 'landscape' : 'portrait')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
              effectiveIsLandscape
                ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8]'
                : 'bg-[#111827] border-[#1E293B] text-[#FFB703] hover:border-[#FFB703]/60'
            }`}
            title={isAr ? 'تدوير الشاشة بين الوضع العامودي والأفقي' : 'Rotate screen between Portrait and Landscape'}
          >
            {effectiveIsLandscape ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-[#38BDF8]" />
                <span>{isAr ? 'عامودي' : 'Portrait'}</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-3.5 h-3.5 text-[#FFB703]" />
                <span>{isAr ? 'أفقي 3 أعمدة' : '3-Col Stage'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (!canUseProFeature('edit_sound', isPro)) {
                onRequirePro(isAr ? 'تعديل الأزرار والأصوات (MSB / LSB / PC)' : 'Edit Sound Buttons');
                return;
              }
              setIsEditMode(!isEditMode);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              !isPro
                ? 'bg-[#070B14] text-amber-300/80 border-amber-500/30'
                : isEditMode
                ? 'bg-[#FFB703] text-[#070B14] border-amber-200 ring-2 ring-amber-300'
                : 'bg-[#111827] text-amber-300 hover:bg-[#1E293B] border-[#1E293B]'
            }`}
          >
            {isPro ? <Edit3 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-[#FFB703]" />}
            <span className="hidden sm:inline">{isAr ? 'تعديل' : 'Edit'}</span>
            {!isPro && (
              <span className="px-1 py-0.2 rounded bg-amber-500/20 text-[9px] font-black text-[#FFB703]">PRO</span>
            )}
          </button>
        </div>

      </div>

      {/* Compact Stage Performance Bar: Maqam Drone (Ch 3) & Next Song Setlist Control */}
      <div className={`oled-metal-panel border ${theme.panelBorder} rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2`}>
        {/* Maqam Drone Pill */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleMaqamDrone}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black border flex items-center gap-1.5 transition-all active:scale-95 ${
              isDroneActive
                ? 'bg-emerald-500 text-[#070B14] border-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.55)] animate-pulse'
                : 'bg-[#070B14] hover:bg-[#111827] text-emerald-300 border-emerald-500/40'
            }`}
            title={isAr ? 'أرضية تقاسيم مستمرة على القناة 3 وتتوقف تلقائياً عند تشغيل الإيقاع' : 'Sustained Ch 3/Pad drone (auto-stops on Rhythm Start)'}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>{isAr ? `أرضية تقاسيم (${droneRoot})` : `Maqam Drone (${droneRoot})`}</span>
            <span className={`px-1 rounded text-[9px] font-mono ${isDroneActive ? 'bg-[#070B14] text-emerald-300' : 'bg-[#111827] text-slate-400'}`}>
              {isDroneActive ? 'ON · Ch3' : 'OFF'}
            </span>
          </button>

          <div dir="ltr" className="flex items-center gap-0.5 bg-[#070B14] p-0.5 rounded-lg border border-[#1E293B]">
            {DRONE_ROOT_OPTIONS.map((opt) => {
              const selected = droneRoot === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => handleSelectDroneRoot(opt.key)}
                  className={`px-1.5 py-0.5 rounded font-mono font-black text-[10px] transition-all ${
                    selected
                      ? isDroneActive
                        ? 'bg-emerald-500 text-[#070B14]'
                        : 'bg-[#FFB703] text-[#070B14]'
                      : 'text-slate-400 hover:text-white hover:bg-[#111827]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Stage Setlist & Next Song Quick-Step */}
        <div className="flex items-center gap-1.5 ms-auto">
          <button
            type="button"
            onClick={() => setIsSetlistModalOpen(true)}
            className="px-2 py-1 rounded-lg bg-[#070B14] hover:bg-[#111827] border border-[#1E293B] text-[11px] text-slate-200 font-bold flex items-center gap-1.5 max-w-[180px] transition-all"
            title={isAr ? 'عرض وتعديل قائمة الحفلة' : 'Manage Live Stage Setlist'}
          >
            <ListMusic className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
            <span className="truncate">
              {stageSetlist[activeSetlistIdx]
                ? `${(activeSetlistIdx % stageSetlist.length) + 1}/${stageSetlist.length} · ${stageSetlist[activeSetlistIdx].title}`
                : (isAr ? 'قائمة الحفلة' : 'Setlist')}
            </span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentToSetlist}
            className="p-1.5 rounded-lg bg-[#070B14] hover:bg-[#1E293B] border border-[#FFB703]/40 text-[#FFB703] active:scale-95"
            title={isAr ? 'حفظ الصوت والإيقاع والمقام الحالي في قائمة الحفلة' : 'Save current Sound + Style + Scale to Setlist'}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNextSong}
            className="px-3 py-1 rounded-lg bg-gradient-to-r from-[#38BDF8] to-[#2563EB] hover:from-sky-300 hover:to-blue-500 text-white font-black text-[11px] flex items-center gap-1 shadow-md active:scale-95 shrink-0"
            title={isAr ? 'الانتقال السريع للأغنية / البريسيت التالي' : 'Step sequentially to next saved stage preset'}
          >
            <span>{isAr ? 'الأغنية التالية' : 'Next Song'}</span>
            <SkipForward className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LAYOUT 1: HORIZONTAL 3-COLUMN STAGE (NO SCROLL - شاشة واحدة 3 أعمدة)      */}
      {/* [ LEFT: SOUNDS ] | [ CENTER: BLUE/BLACK SCALE BOX + MAQAMS ] | [ RIGHT: STYLES ] */}
      {/* ========================================================================= */}
      {effectiveIsLandscape ? (
        <div dir="ltr" className="grid grid-cols-12 gap-2.5 items-stretch">

          {/* LEFT COLUMN: SOUNDS (أزرار الأصوات B1-B16) */}
          <div className={`col-span-4 oled-metal-panel border ${soundTheme.panelBorder} ${soundTheme.glowBox} rounded-2xl p-2.5 flex flex-col justify-between space-y-2 transition-colors`}>
            <div className={`flex items-center justify-between pb-1.5 border-b ${soundTheme.panelBorder}`}>
              <span className={`font-mono font-black text-xs ${soundTheme.accentText} uppercase tracking-wider flex items-center gap-1.5`}>
                <Music className={`w-3.5 h-3.5 ${soundTheme.accentText}`} />
                <span>{isAr ? `الأصـوات (B${activeSoundBank})` : `SOUNDS (B${activeSoundBank})`}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsBankColorPickerOpen((prev) => !prev)}
                  className={`px-1.5 py-0.5 rounded-md border text-[9px] font-bold flex items-center gap-1 transition-all ${
                    isBankColorPickerOpen
                      ? 'bg-white/15 border-white/60 text-white'
                      : 'bg-[#090D16] border-[#334155] text-slate-300 hover:border-slate-500'
                  }`}
                  title={isAr ? `تلوين بنك B${activeSoundBank}` : `Pick color for Bank B${activeSoundBank}`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full border border-white/60 ${
                      bankColors[activeSoundBank]
                        ? BANK_COLOR_PALETTE[bankColors[activeSoundBank]].dotClass
                        : 'bg-[#FDE047]'
                    }`}
                  />
                  <Palette className="w-2.5 h-2.5" />
                </button>
                <span className="text-[10px] font-mono text-slate-400">
                  {activeBrand === 'yamaha'
                    ? `XG · Ch${channels.upper1 || 1}`
                    : keyboardMode === 'kronos'
                    ? 'Ch 1 · Prog'
                    : 'Ch 16 · Perf'}
                </span>
              </div>
            </div>

            {isBankColorPickerOpen && (
              <div className="flex flex-wrap items-center justify-between gap-1 bg-[#05070B] border border-[#1F2937] rounded-lg px-2 py-1.5">
                <span className="text-[9px] font-bold text-slate-300">
                  {isAr ? `لون B${activeSoundBank}:` : `B${activeSoundBank} Color:`}
                </span>
                <div className="flex items-center gap-1">
                  {BANK_COLOR_OPTIONS.map((opt) => {
                    const isPicked = bankColors[activeSoundBank] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCustomBankColor(activeSoundBank, opt.id)}
                        title={isAr ? opt.labelAr : opt.labelEn}
                        className={`w-4 h-4 rounded-full border transition-transform ${opt.swatchClass} ${
                          isPicked ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                  {bankColors[activeSoundBank] && (
                    <button
                      type="button"
                      onClick={() => setCustomBankColor(activeSoundBank, null)}
                      className="px-1.5 py-0.5 rounded bg-[#090D16] border border-[#334155] text-[9px] text-slate-300 hover:text-white"
                      title={isAr ? 'استعادة الافتراضي' : 'Reset'}
                    >
                      ↺
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sound Banks Switcher (B1–B16 in clean 2-row grid of 8 tabs) */}
            <div dir="ltr" className="grid grid-cols-8 gap-1">
              {SOUND_BANK_NUMBERS.map((bankNum) => {
                const isSelected = activeSoundBank === bankNum;
                const customColor = bankColors[bankNum] ? BANK_COLOR_PALETTE[bankColors[bankNum]] : null;
                return (
                  <button
                    key={`snd_bank_l_${bankNum}`}
                    type="button"
                    onClick={() => setActiveSoundBank(bankNum)}
                    className={`relative py-1 rounded-md font-mono font-black text-[10px] border active-press ${
                      customColor
                        ? isSelected
                          ? customColor.tabActive
                          : customColor.tabInactive
                        : isSelected
                        ? `${soundTheme.pillActive} font-black`
                        : 'hardware-keycap-dark text-slate-300 hover:text-[#FDE047]'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-400 border border-[#05070B] shadow-[0_0_6px_#10B981]'
                          : 'bg-slate-600/40'
                      }`}
                    />
                    B{bankNum}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Grid Sound Buttons */}
            <div className={`grid ${colsClass} gap-1.5 flex-1`}>
              {visibleSoundPads.map((pad, idx) => {
                const tierIdx = activeSoundBank === 1 ? idx : 99 + idx;
                const isLocked = !isSoundIndexUnlocked(tierIdx, isPro);
                const isActive = activeSoundId === pad.id;
                const txtColor = getPadTextColor(pad, isActive);
                const perfNum = pad.performanceNumber ?? ((pad.pc % 32) + 1);
                return (
                  <button
                    key={pad.id}
                    onPointerDown={() => startSoundLongPress(pad)}
                    onPointerUp={cancelSoundLongPress}
                    onPointerLeave={cancelSoundLongPress}
                    onPointerCancel={cancelSoundLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      handlePadClick(pad);
                    }}
                    className={`relative ${landscapeBtnSize} rounded-xl flex flex-col justify-between items-center text-center active-press ${getPadButtonClasses(pad, isActive)} ${isLocked ? 'opacity-75' : ''}`}
                  >
                    <span
                      className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full border border-[#05070B]/70 ${
                        isActive
                          ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                          : 'bg-[#05070B]/35'
                      }`}
                    />
                    {isLocked && (
                      <span className="absolute top-0.5 end-0.5 inline-flex items-center gap-0.5 px-1 rounded bg-[#05070B] border border-[#FDE047]/60 text-[#FDE047] text-[7px] font-black shadow">
                        <Lock className="w-2 h-2" />
                        PRO
                      </span>
                    )}
                    <span className={`font-black ${btnFonts.title} tracking-wide truncate w-full text-center leading-tight mt-0.5 ${txtColor}`}>
                      {pad.name}
                    </span>
                    <span className={`${btnFonts.subtitle} font-mono uppercase tracking-wider font-bold opacity-85 ${txtColor}`}>
                      {activeBrand === 'yamaha'
                        ? `B${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · XG`
                        : keyboardMode === 'kronos'
                        ? `B${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · Ch1`
                        : `B${pad.bankNumber ?? pad.lsb} · P${perfNum} · Ch16`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* STS 1 - 4 */}
            <div className={`pt-1.5 border-t ${theme.panelBorder} flex items-center justify-between gap-1 text-[10px] font-mono`}>
              {[1, 2, 3, 4].map(sts => (
                <button
                  key={sts}
                  onClick={() => {
                    midiEngine.sendSTS(sts as any);
                    showToast(`STS ${sts}`);
                  }}
                  className={`flex-1 py-1 rounded-lg hardware-keycap-dark hover:border-[#FDE047]/50 ${theme.secondaryAccentText} font-bold text-center active-press`}
                >
                  STS {sts}
                </button>
              ))}
            </div>
          </div>

          {/* CENTER COLUMN: REAL BLUE/BLACK SCALE BOX & MAQAM PRESETS */}
          <div className={`col-span-4 oled-metal-panel border ${theme.panelBorder} ${theme.glowBox} rounded-2xl p-2.5 flex flex-col justify-between space-y-1.5 transition-colors`}>
            {/* LCD Readout + Quick Hear/Send/Reset */}
            <div className={`bg-[#070B14] border ${theme.panelBorder} rounded-xl py-1 px-2 flex items-center justify-between gap-1 text-xs`}>
              <span className={`text-[10px] font-mono ${theme.accentText} font-bold truncate`}>
                {activeTunedNotes.length > 0 ? `TUNED: ${activeTunedNotes.join(', ')} (-50)` : 'SCALE: NATURAL (0¢)'}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSoundPreviewEnabled(!soundPreviewEnabled)}
                  className={`p-1 rounded border text-[9px] transition-all ${
                    soundPreviewEnabled
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8]'
                      : 'bg-[#111827] border-[#1E293B] text-neutral-400'
                  }`}
                  title={isAr ? 'تشغيل/كتم صوت النغمة عند الضغط' : 'Toggle tap preview audio'}
                >
                  {soundPreviewEnabled ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                </button>
                <button
                  onClick={() => {
                    audioEngine.setTunings(tunings);
                    audioEngine.playScaleAudition(60);
                  }}
                  className="px-1.5 py-0.5 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-[#FFB703] text-[9px] font-bold flex items-center gap-0.5"
                  title={isAr ? 'سماع السلم المشرق' : 'Audition scale'}
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{isAr ? 'سماع' : 'Hear'}</span>
                </button>
                <button
                  onClick={() => sendScaleAndToast(tunings, isAr ? 'تم إرسال التشريق للكورج' : 'Tashreeq Sent')}
                  className="px-1.5 py-0.5 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-[#38BDF8] text-[9px] font-bold flex items-center gap-0.5"
                  title={isAr ? 'إعادة إرسال SysEx للكورج' : 'Send SysEx'}
                >
                  <Send className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={resetTashreeq}
                  className="px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-500/60 text-rose-200 text-[9px] font-black"
                  title={isAr ? 'تصفير التشريق' : 'Reset'}
                >
                  0¢
                </button>
              </div>
            </div>

            {isSysExBlocked && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-lg px-2 py-1 text-[9px] text-red-100 space-y-1">
                <div>
                  {isAr
                    ? 'صلاحية SysEx محجوبة في المتصفح (لن يستجيب التشريق في الكورج). افتح الرابط مباشرة في متصفح يدعم Web MIDI واضغط "سماح".'
                    : 'SysEx is blocked by browser (KORG cannot receive scale tuning). Open the app URL directly in a Web MIDI browser and Allow MIDI SysEx.'}
                </div>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={async () => {
                      const res = await midiEngine.initialize();
                      setIsSysExBlocked(midiEngine.hasConnectedOutput() && !res.sysex);
                      sendScaleAndToast(tunings, isAr ? 'تمت إعادة المحاولة وإرسال التشريق' : 'Retried & sent');
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#FFB703] text-[#070B14] font-bold"
                  >
                    {isAr ? 'طلب صلاحية SysEx' : 'Allow SysEx'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href).catch(() => {});
                      showToast(isAr ? 'تم نسخ الرابط' : 'URL copied');
                    }}
                    className="px-1.5 py-0.5 rounded bg-[#111827] text-[#FFB703] border border-[#FFB703]/40 font-bold"
                  >
                    {isAr ? 'نسخ الرابط' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            {/* 12-Key Blue & Black Scale Box */}
            {renderBlueBlackScaleKeys('h-32 sm:h-36', 'h-20 sm:h-22')}

            {/* Ready Maqam Combos */}
            <div dir="ltr" className="grid grid-cols-5 gap-1">
              {[
                { id: 'do_fa', label: 'DO#+FA#', notes: ['C#', 'F#'] as NoteName[] },
                { id: 'mi_la', label: 'MI+LA', notes: ['E', 'A'] as NoteName[] },
                { id: 'si_mi', label: 'SI+MI', notes: ['B', 'E'] as NoteName[] },
                { id: 're_la', label: 'RE+LA', notes: ['D', 'A'] as NoteName[] },
                { id: 'si_fa', label: 'SI+FA#', notes: ['B', 'F#'] as NoteName[] },
              ].map((c, idx) => {
                const isLocked = !isPro && idx >= 2;
                const isComboActive = c.notes.every(n => tunings[n]?.isQuarterTone) && activeTunedNotes.length === c.notes.length;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (isLocked) {
                        onRequirePro(c.label);
                        return;
                      }
                      applyCombo(c.notes, c.label);
                    }}
                    className={`relative py-1 rounded-md font-mono font-black text-[9px] transition-all border flex items-center justify-center gap-0.5 ${
                      isLocked
                        ? 'bg-[#070B14] text-neutral-500 border-[#1E293B] opacity-75'
                        : isComboActive
                        ? theme.pillActive
                        : 'bg-[#111827] hover:bg-[#1E293B] text-slate-200 border-[#1E293B]'
                    }`}
                  >
                    {isLocked && <Lock className="w-2 h-2 text-[#FFB703] shrink-0" />}
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Memory P0 - P7 + SAVE */}
            <div dir="ltr" className="flex items-center gap-1">
              <div className="grid grid-cols-8 gap-0.5 flex-1">
                {['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map((p) => {
                  const isLocked = !canUseProFeature('preset_slots', isPro);
                  return (
                    <button
                      key={p}
                      onClick={() => recallMemorySlot(p)}
                      className={`py-1 rounded font-mono font-bold text-[9px] border transition-all flex items-center justify-center gap-0.5 ${
                        isLocked
                          ? 'bg-[#070B14] text-neutral-500 border-[#1E293B]'
                          : activeMemorySlot === p
                          ? 'bg-[#38BDF8] text-[#070B14] font-black border-sky-200 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                          : 'bg-[#111827] text-slate-300 border-[#1E293B]'
                      }`}
                    >
                      <span>{p}</span>
                      {isLocked && <Lock className="w-2 h-2 text-[#FFB703]" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={saveMemorySlot}
                className="px-2 py-1 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#FFB703]/50 text-[#FFB703] font-mono font-bold text-[9px] flex items-center gap-0.5 shrink-0"
                title={isAr ? `حفظ التشريق في ${activeMemorySlot}` : `Save to ${activeMemorySlot}`}
              >
                {isPro ? <Save className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5 text-[#FFB703]" />}
                <span>SAVE</span>
              </button>
            </div>

            {/* Percussion Pads 1-4 */}
            <div className="grid grid-cols-4 gap-1 pt-1 border-t border-[#1E293B]">
              {[
                { id: 1, label: 'دربوكة' },
                { id: 2, label: 'زغاريد' },
                { id: 3, label: 'صقفة' },
                { id: 4, label: 'رق' },
              ].map(pad => (
                <button
                  key={pad.id}
                  onClick={() => handleKorgPadPress(pad.id as any)}
                  className="py-1 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#38BDF8]/50 text-slate-200 font-bold text-[9px] active:scale-95"
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: STYLES (أزرار الإيقاعات) */}
          <div className={`col-span-4 oled-metal-panel border ${styleTheme.panelBorder} ${styleTheme.glowBox} rounded-2xl p-2.5 flex flex-col justify-between space-y-2 transition-colors`}>
            <div className={`flex items-center justify-between pb-1.5 border-b ${styleTheme.panelBorder}`}>
              <span className={`font-mono font-black text-xs ${styleTheme.accentText} uppercase tracking-wider flex items-center gap-1.5`}>
                <Radio className={`w-3.5 h-3.5 ${styleTheme.accentText}`} />
                <span>{isAr ? `الإيقاعات (B${activeStyleBank})` : `STYLES (B${activeStyleBank})`}</span>
              </span>
              <button
                onClick={() => {
                  const next = !isPlayingRhythm;
                  if (next) stopMaqamDrone(true);
                  setIsPlayingRhythm(next);
                  if (activeBrand === 'yamaha') {
                    sendYamahaStyleStartStop(next ? 'start' : 'stop', yamahaModel);
                  } else {
                    midiEngine.sendArrangerCommand(next ? 'start' : 'stop');
                  }
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 border-[1.5px] active-press text-white ${
                  isPlayingRhythm
                    ? 'crystal-ruby-jewel-active animate-pulse'
                    : 'crystal-ruby-jewel'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isPlayingRhythm ? 'bg-white shadow-[0_0_6px_#fff]' : 'bg-rose-200/80'}`} />
                {isPlayingRhythm ? <Square className="w-2.5 h-2.5 fill-current" /> : <Play className="w-2.5 h-2.5 fill-current" />}
                <span>{isPlayingRhythm ? 'STOP' : 'START'}</span>
              </button>
            </div>

            {/* Style Banks Switcher (B1 - B6) */}
            <div className="grid grid-cols-6 gap-1">
              {[1, 2, 3, 4, 5, 6].map((bankNum) => {
                const isSelected = activeStyleBank === bankNum;
                return (
                  <button
                    key={`sty_bank_l_${bankNum}`}
                    type="button"
                    onClick={() => setActiveStyleBank(bankNum)}
                    className={`relative py-1 rounded-md font-mono font-black text-[10px] border active-press ${
                      isSelected
                        ? `${styleTheme.pillActive} font-black`
                        : 'hardware-keycap-dark text-slate-300 hover:text-white'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full ${
                        isSelected
                          ? 'bg-emerald-400 border border-[#05070B] shadow-[0_0_6px_#10B981]'
                          : 'bg-slate-600/40'
                      }`}
                    />
                    B{bankNum}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Grid Style Buttons */}
            <div className={`grid ${colsClass} gap-1.5 flex-1`}>
              {visibleStylePads.map(pad => {
                const isActive = activeStyleId === pad.id;
                const txtColor = getPadTextColor(pad, isActive);
                return (
                  <button
                    key={pad.id}
                    onPointerDown={() => startSoundLongPress(pad)}
                    onPointerUp={cancelSoundLongPress}
                    onPointerLeave={cancelSoundLongPress}
                    onPointerCancel={cancelSoundLongPress}
                    onContextMenu={(e) => e.preventDefault()}
                    onClick={() => {
                      if (longPressTriggeredRef.current) {
                        longPressTriggeredRef.current = false;
                        return;
                      }
                      handlePadClick(pad);
                    }}
                    className={`relative ${landscapeBtnSize} rounded-xl flex flex-col justify-between items-center text-center active-press ${getPadButtonClasses(pad, isActive)}`}
                  >
                    <span
                      className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full border border-[#05070B]/70 ${
                        isActive
                          ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                          : 'bg-[#05070B]/35'
                      }`}
                    />
                    <span className={`font-black ${btnFonts.title} tracking-wide truncate w-full text-center leading-tight mt-0.5 ${txtColor}`}>
                      {pad.name}
                    </span>
                    <span className={`${btnFonts.subtitle} font-mono uppercase tracking-wider font-bold opacity-85 ${txtColor}`}>
                      {pad.messageType === 'pc_only' ? `PC · ${pad.pc}` : `STY · ${pad.pc}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Variations / Main A-D (Sapphire Crystal Glow) & Break (Cyan Crystal Glow) */}
            <div className={`pt-1.5 border-t ${theme.panelBorder} flex items-center justify-between gap-1 text-[10px] font-mono`}>
              {([1, 2, 3, 4] as const).map(v => {
                const isVarActive = activeVariation === v;
                const varLabel = activeBrand === 'yamaha' ? ['A', 'B', 'C', 'D'][v - 1] : `V${v}`;
                return (
                  <button
                    key={v}
                    onClick={() => {
                      setActiveVariation(v);
                      if (activeBrand === 'yamaha') {
                        sendYamahaStyleControl('variation', v, yamahaModel);
                        showToast(`Main ${['A', 'B', 'C', 'D'][v - 1]}`);
                      } else {
                        midiEngine.sendStyleElement('variation', v);
                        showToast(`Variation ${v}`);
                      }
                    }}
                    className={`relative flex-1 py-1 rounded-lg font-black border-[1.5px] text-center active-press ${
                      isVarActive
                        ? 'crystal-sapphire-jewel-active text-[#030508]'
                        : 'crystal-sapphire-jewel text-sky-100'
                    }`}
                  >
                    {varLabel}
                  </button>
                );
              })}
              <button
                onClick={() => {
                  if (activeBrand === 'yamaha') {
                    sendYamahaStyleControl('break', 1, yamahaModel);
                  } else {
                    midiEngine.sendStyleElement('break', 1);
                  }
                  showToast('Break');
                }}
                className="px-2.5 py-1 rounded-lg crystal-cyan-jewel text-cyan-100 font-black border-[1.5px] text-center active-press shadow"
              >
                BRK
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* ========================================================================= */
        /* LAYOUT 2: VERTICAL PHONE VIEW (الهاتف عامودياً)                            */
        /* Preserved tabs: Sounds | Styles | All-in-One + Blue/Black Scale Box      */
        /* ========================================================================= */
        <div className="space-y-3 max-w-lg mx-auto">
          
          {/* Vertical Phone Section Switcher */}
          <div className={`grid grid-cols-3 gap-1.5 p-1 oled-metal-panel rounded-xl border ${theme.panelBorder}`}>
            <button
              onClick={() => setPortraitSection('sounds')}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active-press border ${
                portraitSection === 'sounds'
                  ? `${soundTheme.pillActive} font-black`
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>{isAr ? `الأصـوات B${activeSoundBank}` : `Sounds B${activeSoundBank}`}</span>
            </button>

            <button
              onClick={() => setPortraitSection('styles')}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active-press border ${
                portraitSection === 'styles'
                  ? `${styleTheme.pillActive} font-black`
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{isAr ? `الإيقاعات B${activeStyleBank}` : `Styles B${activeStyleBank}`}</span>
            </button>

            <button
              onClick={() => setPortraitSection('all')}
              className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 active-press ${
                portraitSection === 'all'
                  ? 'hardware-keycap-blue text-white font-black led-glow-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'الكل معاً' : 'All-in-One'}</span>
            </button>
          </div>

          {/* Sound / Style Button Matrix */}
          <div className={`oled-metal-panel border ${
            portraitSection === 'sounds'
              ? `${soundTheme.panelBorder} ${soundTheme.glowBox}`
              : portraitSection === 'styles'
              ? `${styleTheme.panelBorder} ${styleTheme.glowBox}`
              : `${theme.panelBorder} ${theme.glowBox}`
          } rounded-2xl p-3 space-y-2 transition-colors`}>
            
            <div className={`flex items-center justify-between text-xs pb-1.5 border-b ${theme.panelBorder}`}>
              <span className="font-bold text-[#F8FAFC] flex items-center gap-1.5">
                {portraitSection === 'sounds' ? (
                  <>
                    <Music className={`w-3.5 h-3.5 ${soundTheme.accentText}`} />
                    <span className={soundTheme.accentText}>{isAr ? `أزرار الأصوات · بنك B${activeSoundBank}` : `Sounds · Bank B${activeSoundBank}`}</span>
                  </>
                ) : portraitSection === 'styles' ? (
                  <>
                    <Radio className={`w-3.5 h-3.5 ${styleTheme.accentText}`} />
                    <span className={styleTheme.accentText}>{isAr ? `أزرار الإيقاعات · بنك B${activeStyleBank}` : `Styles · Bank B${activeStyleBank}`}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className={`w-3.5 h-3.5 ${theme.secondaryAccentText}`} />
                    <span>{isAr ? `الأصوات (B${activeSoundBank}) والإيقاعات (B${activeStyleBank})` : `Sounds B${activeSoundBank} & Styles B${activeStyleBank}`}</span>
                  </>
                )}
              </span>

              <div className="flex items-center gap-1.5">
                {(portraitSection === 'sounds' || portraitSection === 'all') && (
                  <button
                    type="button"
                    onClick={() => setIsBankColorPickerOpen((prev) => !prev)}
                    className={`px-2 py-1 rounded-md border text-[10px] font-bold flex items-center gap-1 transition-all ${
                      isBankColorPickerOpen
                        ? 'bg-white/15 border-white/60 text-white'
                        : 'bg-[#090D16] border-[#334155] text-slate-300 hover:border-slate-500'
                    }`}
                    title={isAr ? `تلوين بنك B${activeSoundBank}` : `Color Bank B${activeSoundBank}`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border border-white/60 ${
                        bankColors[activeSoundBank]
                          ? BANK_COLOR_PALETTE[bankColors[activeSoundBank]].dotClass
                          : 'bg-[#FDE047]'
                      }`}
                    />
                    <Palette className="w-3 h-3" />
                    <span className="hidden sm:inline">{isAr ? 'لون البنك' : 'Color'}</span>
                  </button>
                )}

                {(portraitSection === 'styles' || portraitSection === 'all') && (
                  <button
                    onClick={() => {
                      const next = !isPlayingRhythm;
                      if (next) stopMaqamDrone(true);
                      setIsPlayingRhythm(next);
                      if (activeBrand === 'yamaha') {
                        sendYamahaStyleStartStop(next ? 'start' : 'stop', yamahaModel);
                      } else {
                        midiEngine.sendArrangerCommand(next ? 'start' : 'stop');
                      }
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1.5 border-[1.5px] active-press text-white ${
                      isPlayingRhythm
                        ? 'crystal-ruby-jewel-active animate-pulse'
                        : 'crystal-ruby-jewel'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isPlayingRhythm ? 'bg-white shadow-[0_0_6px_#fff]' : 'bg-rose-200/80'}`} />
                    {isPlayingRhythm ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                    <span>{isPlayingRhythm ? 'STOP' : 'START'}</span>
                  </button>
                )}
              </div>
            </div>

            {isBankColorPickerOpen && (portraitSection === 'sounds' || portraitSection === 'all') && (
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#05070B] border border-[#1F2937] rounded-lg px-2.5 py-2">
                <span className="text-[11px] font-bold text-slate-200">
                  {isAr ? `لون بنك الأصوات B${activeSoundBank}:` : `Sound Bank B${activeSoundBank} Color:`}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {BANK_COLOR_OPTIONS.map((opt) => {
                    const isPicked = bankColors[activeSoundBank] === opt.id;
                    return (
                      <button
                        key={`p_clr_${opt.id}`}
                        type="button"
                        onClick={() => setCustomBankColor(activeSoundBank, opt.id)}
                        title={isAr ? opt.labelAr : opt.labelEn}
                        className={`w-5 h-5 rounded-full border transition-transform ${opt.swatchClass} ${
                          isPicked ? 'scale-125 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                        }`}
                      />
                    );
                  })}
                  {bankColors[activeSoundBank] && (
                    <button
                      type="button"
                      onClick={() => setCustomBankColor(activeSoundBank, null)}
                      className="px-2 py-0.5 rounded bg-[#090D16] border border-[#334155] text-[10px] font-bold text-slate-300 hover:text-white"
                    >
                      {isAr ? 'افتراضي' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Bank Switcher Bar(s) in Portrait Mode */}
            {portraitSection === 'sounds' && (
              <div dir="ltr" className="grid grid-cols-8 gap-1">
                {SOUND_BANK_NUMBERS.map((bankNum) => {
                  const isSelected = activeSoundBank === bankNum;
                  const customColor = bankColors[bankNum] ? BANK_COLOR_PALETTE[bankColors[bankNum]] : null;
                  return (
                    <button
                      key={`p_snd_bank_${bankNum}`}
                      type="button"
                      onClick={() => setActiveSoundBank(bankNum)}
                      className={`relative py-1.5 rounded-lg font-mono font-black text-[11px] border active-press ${
                        customColor
                          ? isSelected
                            ? customColor.tabActive
                            : customColor.tabInactive
                          : isSelected
                          ? `${soundTheme.pillActive} font-black`
                          : 'hardware-keycap-dark text-slate-300 hover:text-[#FDE047]'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? 'bg-emerald-400 border border-[#05070B] shadow-[0_0_6px_#10B981]'
                            : 'bg-slate-600/40'
                        }`}
                      />
                      B{bankNum}
                    </button>
                  );
                })}
              </div>
            )}

            {portraitSection === 'styles' && (
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((bankNum) => {
                  const isSelected = activeStyleBank === bankNum;
                  return (
                    <button
                      key={`p_sty_bank_${bankNum}`}
                      type="button"
                      onClick={() => setActiveStyleBank(bankNum)}
                      className={`relative py-1.5 rounded-lg font-mono font-black text-[11px] border active-press ${
                        isSelected
                          ? `${styleTheme.pillActive} font-black`
                          : 'hardware-keycap-dark text-slate-300 hover:text-white'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 end-0.5 w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? 'bg-emerald-400 border border-[#05070B] shadow-[0_0_6px_#10B981]'
                            : 'bg-slate-600/40'
                        }`}
                      />
                      {isAr ? `بنك ${bankNum}` : `B${bankNum}`}
                    </button>
                  );
                })}
              </div>
            )}

            {portraitSection === 'all' && (
              <div className="space-y-1.5">
                <div dir="ltr" className="oled-subpanel rounded-lg p-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[9px] font-black px-0.5">
                    <span className={soundTheme.accentText}>SOUNDS BANKS (B1–B16)</span>
                    <span className="text-slate-400 font-mono">B{activeSoundBank}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1">
                    {SOUND_BANK_NUMBERS.map((b) => {
                      const customColor = bankColors[b] ? BANK_COLOR_PALETTE[bankColors[b]] : null;
                      const isSel = activeSoundBank === b;
                      return (
                        <button
                          key={`all_snd_b_${b}`}
                          type="button"
                          onClick={() => setActiveSoundBank(b)}
                          className={`relative py-1 rounded font-mono font-black text-[9px] border active-press ${
                            customColor
                              ? isSel
                                ? customColor.tabActive
                                : customColor.tabInactive
                              : isSel
                              ? `${soundTheme.pillActive} font-black`
                              : 'hardware-keycap-dark text-slate-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 end-0.5 w-1 h-1 rounded-full ${
                              isSel ? 'bg-emerald-400 shadow-[0_0_5px_#10B981]' : 'bg-slate-600/40'
                            }`}
                          />
                          B{b}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1 oled-subpanel rounded-lg p-1">
                  <span className={`text-[9px] font-black px-1 ${styleTheme.accentText}`}>STY</span>
                  <div className="grid grid-cols-6 gap-0.5 flex-1">
                    {[1, 2, 3, 4, 5, 6].map((b) => {
                      const isSel = activeStyleBank === b;
                      return (
                        <button
                          key={`all_sty_b_${b}`}
                          type="button"
                          onClick={() => setActiveStyleBank(b)}
                          className={`relative py-0.5 rounded font-mono font-black text-[9px] border active-press ${
                            isSel
                              ? styleTheme.pillActive
                              : 'hardware-keycap-dark text-slate-300'
                          }`}
                        >
                          B{b}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className={`grid ${colsClass} gap-2`}>
              {portraitSection === 'sounds' && (
                visibleSoundPads.map((pad, idx) => {
                  const tierIdx = activeSoundBank === 1 ? idx : 99 + idx;
                  const isLocked = !isSoundIndexUnlocked(tierIdx, isPro);
                  const isActive = activeSoundId === pad.id;
                  const txtColor = getPadTextColor(pad, isActive);
                  const perfNum = pad.performanceNumber ?? ((pad.pc % 32) + 1);
                  return (
                    <button
                      key={pad.id}
                      onPointerDown={() => startSoundLongPress(pad)}
                      onPointerUp={cancelSoundLongPress}
                      onPointerLeave={cancelSoundLongPress}
                      onPointerCancel={cancelSoundLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        handlePadClick(pad);
                      }}
                      className={`relative ${portraitBtnSize} rounded-xl flex flex-col justify-between items-center text-center active-press ${getPadButtonClasses(pad, isActive)} ${isLocked ? 'opacity-75' : ''}`}
                    >
                      <span
                        className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full border border-[#05070B]/70 ${
                          isActive
                            ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                            : 'bg-[#05070B]/35'
                        }`}
                      />
                      {isLocked && (
                        <span className="absolute top-1 end-1 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#05070B] border border-[#FDE047]/60 text-[#FDE047] text-[8px] font-black shadow">
                          <Lock className="w-2 h-2" />
                          PRO
                        </span>
                      )}
                      <span className={`font-black ${btnFonts.title} tracking-wide truncate w-full ${txtColor}`}>
                        {pad.name}
                      </span>
                      <span className={`${btnFonts.subtitle} font-mono font-bold opacity-85 ${txtColor}`}>
                        {activeBrand === 'yamaha'
                          ? `Bank ${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · XG`
                          : keyboardMode === 'kronos'
                          ? `Bank ${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · Ch1`
                          : `Bank ${pad.bankNumber ?? pad.lsb} · Perf ${perfNum} · Ch16`}
                      </span>
                    </button>
                  );
                })
              )}

              {portraitSection === 'styles' && (
                visibleStylePads.map(pad => {
                  const isActive = activeStyleId === pad.id;
                  const txtColor = getPadTextColor(pad, isActive);
                  return (
                    <button
                      key={pad.id}
                      onPointerDown={() => startSoundLongPress(pad)}
                      onPointerUp={cancelSoundLongPress}
                      onPointerLeave={cancelSoundLongPress}
                      onPointerCancel={cancelSoundLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        handlePadClick(pad);
                      }}
                      className={`relative ${portraitBtnSize} rounded-xl flex flex-col justify-between items-center text-center active-press ${getPadButtonClasses(pad, isActive)}`}
                    >
                      <span
                        className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full border border-[#05070B]/70 ${
                          isActive
                            ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                            : 'bg-[#05070B]/35'
                        }`}
                      />
                      <span className={`font-black ${btnFonts.title} tracking-wide truncate w-full ${txtColor}`}>
                        {pad.name}
                      </span>
                      <span className={`${btnFonts.subtitle} font-mono font-bold opacity-85 ${txtColor}`}>
                        {pad.messageType === 'pc_only' ? `PC · ${pad.pc}` : `STY · ${pad.pc}`}
                      </span>
                    </button>
                  );
                })
              )}

              {portraitSection === 'all' && (
                [...visibleSoundPads.slice(0, 6), ...visibleStylePads.slice(0, 6)].map((pad, idx) => {
                  const tierIdx = pad.type === 'sound' ? (activeSoundBank === 1 ? idx : 99 + idx) : 0;
                  const isLocked = pad.type === 'sound' && !isSoundIndexUnlocked(tierIdx, isPro);
                  const isCurrent = pad.type === 'sound' ? activeSoundId === pad.id : activeStyleId === pad.id;
                  const txtColor = getPadTextColor(pad, isCurrent);
                  const perfNum = pad.performanceNumber ?? ((pad.pc % 32) + 1);
                  return (
                    <button
                      key={pad.id}
                      onPointerDown={() => startSoundLongPress(pad)}
                      onPointerUp={cancelSoundLongPress}
                      onPointerLeave={cancelSoundLongPress}
                      onPointerCancel={cancelSoundLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={() => {
                        if (longPressTriggeredRef.current) {
                          longPressTriggeredRef.current = false;
                          return;
                        }
                        handlePadClick(pad);
                      }}
                      className={`relative ${portraitBtnSize} rounded-xl flex flex-col justify-between items-center text-center active-press ${getPadButtonClasses(pad, isCurrent)} ${isLocked ? 'opacity-75' : ''}`}
                    >
                      <span
                        className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full border border-[#05070B]/70 ${
                          isCurrent
                            ? 'bg-emerald-400 shadow-[0_0_8px_#10B981]'
                            : 'bg-[#05070B]/35'
                        }`}
                      />
                      {isLocked && (
                        <span className="absolute top-1 end-1 inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-[#05070B] border border-[#FDE047]/60 text-[#FDE047] text-[8px] font-black shadow">
                          <Lock className="w-2 h-2" />
                          PRO
                        </span>
                      )}
                      <span className={`font-black ${btnFonts.title} tracking-wide truncate w-full ${txtColor}`}>
                        {pad.name}
                      </span>
                      <span className={`${btnFonts.subtitle} font-mono font-bold opacity-85 ${txtColor} uppercase`}>
                        {pad.type === 'sound'
                          ? activeBrand === 'yamaha'
                            ? `B${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · XG`
                            : keyboardMode === 'kronos'
                            ? `B${pad.bankNumber ?? pad.lsb} · PC ${perfNum - 1} · Ch1`
                            : `B${pad.bankNumber ?? pad.lsb} · P${perfNum} · Ch16`
                          : pad.messageType === 'pc_only'
                          ? `PC · ${pad.pc}`
                          : `STY · ${pad.pc}`}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

          </div>

          {/* Real Blue/Black Scale Box & Presets in Vertical Mode */}
          <div className={`oled-metal-panel border ${theme.panelBorder} ${theme.glowBox} rounded-2xl p-3 space-y-2.5 transition-colors`}>
            <div className={`flex flex-wrap items-center justify-between gap-2 text-xs pb-1.5 border-b ${theme.panelBorder}`}>
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">
                  {isAr ? 'علبة التشريق (أزرق للأساسية · أسود للدييز)' : 'KORG Hardware Scale Box'}
                </span>
                <span className={`text-[10px] font-mono ${theme.accentText} font-bold`}>
                  {activeTunedNotes.length > 0
                    ? `${activeTunedNotes.map(n => `${n} (${NOTE_ARABIC_NAMES[n].ar})`).join(' · ')} -50`
                    : (isAr ? 'سلم طبيعي (Equal Temp 0¢)' : 'Equal Temp (0¢)')}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSoundPreviewEnabled(!soundPreviewEnabled)}
                  className={`p-1.5 rounded-lg border text-xs transition-all ${
                    soundPreviewEnabled
                      ? 'bg-[#38BDF8]/20 border-[#38BDF8]/50 text-[#38BDF8]'
                      : 'bg-[#111827] border-[#1E293B] text-slate-400'
                  }`}
                  title={isAr ? 'تشغيل/كتم صوت النغمة عند الضغط' : 'Toggle tap preview audio'}
                >
                  {soundPreviewEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => {
                    audioEngine.setTunings(tunings);
                    audioEngine.playScaleAudition(60);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#FFB703]/50 text-[#FFB703] text-[11px] font-bold flex items-center gap-1 active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>{isAr ? 'سماع' : 'Hear'}</span>
                </button>
                <button
                  onClick={() => sendScaleAndToast(tunings, isAr ? 'تم إرسال التشريق للكورج' : 'SysEx Sent')}
                  className="px-2 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#38BDF8]/50 text-[#38BDF8] text-[11px] font-bold flex items-center gap-1 active:scale-95"
                >
                  <Send className="w-3 h-3" />
                  <span>{isAr ? 'إرسال' : 'Send'}</span>
                </button>
                <button
                  onClick={resetTashreeq}
                  className="px-2 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-500/60 text-rose-200 text-[11px] font-bold flex items-center gap-1 active:scale-95"
                  title={isAr ? 'تصفير التشريق' : 'Reset'}
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {isSysExBlocked && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-lg px-2.5 py-2 text-[10px] text-red-100 leading-relaxed space-y-1.5">
                <div>
                  {isAr
                    ? 'تحذير مهم: المتصفح منع صلاحية SysEx (لذلك لا يصل التشريق لأورغ كورج!). افتح رابط التطبيق مباشرة في متصفح يدعم Web MIDI واسمح بـ "التحكم في أجهزة MIDI".'
                    : 'Important: Browser blocked SysEx permission so Tashreeq cannot reach your KORG. Open the standalone URL directly in a Web MIDI browser and allow MIDI control.'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={async () => {
                      const res = await midiEngine.initialize();
                      setIsSysExBlocked(midiEngine.hasConnectedOutput() && !res.sysex);
                      sendScaleAndToast(tunings, isAr ? 'تم تفعيل SysEx وإرسال التشريق!' : 'SysEx enabled & sent!');
                    }}
                    className="px-2 py-1 rounded bg-[#FFB703] text-[#070B14] font-bold text-[10px]"
                  >
                    {isAr ? 'طلب صلاحية SysEx الآن' : 'Request SysEx Now'}
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href).catch(() => {});
                      showToast(isAr ? 'تم نسخ الرابط' : 'URL copied');
                    }}
                    className="px-2 py-1 rounded bg-[#111827] text-[#FFB703] border border-[#FFB703]/40 font-bold text-[10px]"
                  >
                    {isAr ? 'نسخ الرابط' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            {/* Vertical Mode Blue & Black Scale Box */}
            {renderBlueBlackScaleKeys('h-40', 'h-24')}

            {/* Combos */}
            <div dir="ltr" className="grid grid-cols-5 gap-1.5">
              {[
                { id: 'do_fa', label: 'DO#+FA#', notes: ['C#', 'F#'] as NoteName[] },
                { id: 'mi_la', label: 'MI+LA', notes: ['E', 'A'] as NoteName[] },
                { id: 'si_mi', label: 'SI+MI', notes: ['B', 'E'] as NoteName[] },
                { id: 're_la', label: 'RE+LA', notes: ['D', 'A'] as NoteName[] },
                { id: 'si_fa', label: 'SI+FA#', notes: ['B', 'F#'] as NoteName[] },
              ].map((c, idx) => {
                const isLocked = !isPro && idx >= 2;
                const isComboActive = c.notes.every(n => tunings[n]?.isQuarterTone) && activeTunedNotes.length === c.notes.length;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (isLocked) {
                        onRequirePro(c.label);
                        return;
                      }
                      applyCombo(c.notes, c.label);
                    }}
                    className={`py-1.5 rounded-lg font-mono font-black text-[10px] sm:text-[11px] transition-all border flex items-center justify-center gap-0.5 ${
                      isLocked
                        ? 'bg-[#070B14] text-neutral-500 border-[#1E293B] opacity-75'
                        : isComboActive
                        ? theme.pillActive
                        : 'bg-[#111827] hover:bg-[#1E293B] text-slate-200 border-[#1E293B]'
                    }`}
                  >
                    {isLocked && <Lock className="w-2.5 h-2.5 text-[#FFB703] shrink-0" />}
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Memory Slots P0 - P7 + SAVE */}
            <div dir="ltr" className="flex items-center gap-1">
              <div className="grid grid-cols-8 gap-1 flex-1">
                {['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7'].map((p) => {
                  const isLocked = !canUseProFeature('preset_slots', isPro);
                  return (
                    <button
                      key={p}
                      onClick={() => recallMemorySlot(p)}
                      className={`py-1 rounded font-mono font-bold text-[10px] border transition-all flex items-center justify-center gap-0.5 ${
                        isLocked
                          ? 'bg-[#070B14] text-neutral-500 border-[#1E293B]'
                          : activeMemorySlot === p
                          ? 'bg-[#38BDF8] text-[#070B14] font-black border-sky-200'
                          : 'bg-[#111827] text-slate-300 border-[#1E293B]'
                      }`}
                    >
                      <span>{p}</span>
                      {isLocked && <Lock className="w-2 h-2 text-[#FFB703]" />}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={saveMemorySlot}
                className="px-2.5 py-1 rounded bg-[#111827] hover:bg-[#1E293B] border border-[#FFB703]/50 text-[#FFB703] font-mono font-bold text-[10px] flex items-center gap-1 shrink-0"
              >
                {isPro ? <Save className="w-3 h-3" /> : <Lock className="w-3 h-3 text-[#FFB703]" />}
                <span>SAVE</span>
              </button>
            </div>

            {/* Pads 1-4 */}
            <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-[#1E293B]">
              {[
                { id: 1, label: 'دربوكة' },
                { id: 2, label: 'زغاريد' },
                { id: 3, label: 'صقفة' },
                { id: 4, label: 'رق' },
              ].map(pad => (
                <button
                  key={pad.id}
                  onClick={() => handleKorgPadPress(pad.id as any)}
                  className="py-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#38BDF8]/50 text-slate-200 font-bold text-[10px] active:scale-95 shadow-sm"
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Bottom Pitch Ribbon & Modulation Ribbon (بيتش روبن) */}
      <PitchRibbon channel={channels.upper1} lang={lang} compact />

      {/* Custom Button Editor Modal */}
      {editingPad && (() => {
        const bankNum = clampBankNumber(editingPad.bankNumber ?? editingPad.lsb, 0);
        const perfNum = clampPerfNumber(
          editingPad.performanceNumber ?? (typeof editingPad.pc === 'number' ? editingPad.pc + 1 : 1),
          1
        );

        const updatePerformanceFields = (nextBank: number, nextPerf: number) => {
          const b = clampBankNumber(nextBank, 0);
          const p = clampPerfNumber(nextPerf, 1);
          setEditingPad({
            ...editingPad,
            channel: 'ch16',
            msb: 1,
            lsb: b,
            pc: p - 1,
            bankNumber: b,
            performanceNumber: p,
          });
        };

        return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4">
          <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-5 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-3.5">

            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <h3 className="font-bold text-[#F0F6FC] text-base flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#FFB703]" />
                <span>
                  {editingPad.type === 'sound'
                    ? (isAr ? 'تعديل الصوت (Performance · Ch 16)' : 'Edit Sound Performance (Ch 16)')
                    : (isAr ? 'تعديل زر الإيقاع' : 'Edit STYLE Button')}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-neutral-300 font-bold block mb-1">
                  {editingPad.type === 'sound'
                    ? (isAr ? 'اسم الصوت / البيرفورمانس:' : 'Button / Performance Name:')
                    : (isAr ? 'الاسم المعروض على الزر:' : 'Button Name:')}
                </label>
                <input
                  type="text"
                  value={editingPad.name}
                  onChange={(e) => setEditingPad({ ...editingPad, name: e.target.value })}
                  placeholder={editingPad.type === 'sound' ? 'Strings, Oud, Mjwez...' : 'Saidi, Maqsoum, Malfuf...'}
                  className="w-full bg-[#070B14] text-[#F0F6FC] font-bold p-2.5 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              {editingPad.type === 'sound' ? (
                <div className="space-y-3 bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5">
                  <div>
                    <label className="text-neutral-300 font-bold block mb-1.5">
                      {isAr ? 'رقم البنك (0 – 15):' : 'Bank Number (0 – 15):'}
                    </label>
                    <div dir="ltr" className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePerformanceFields(bankNum - 1, perfNum)}
                        className="min-w-[44px] h-11 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#38BDF8] text-white font-black text-xl flex items-center justify-center active:scale-95"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={15}
                        value={bankNum}
                        onChange={(e) => updatePerformanceFields(clampBankNumber(e.target.value, 0), perfNum)}
                        className="flex-1 h-11 bg-[#0B1120] text-[#38BDF8] font-mono font-black text-base text-center rounded-xl border border-[#1E293B] focus:outline-none focus:border-[#38BDF8]"
                      />
                      <button
                        type="button"
                        onClick={() => updatePerformanceFields(bankNum + 1, perfNum)}
                        className="min-w-[44px] h-11 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#38BDF8] text-white font-black text-xl flex items-center justify-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
              

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-neutral-300 font-bold">
                        {isAr ? 'رقم البيرفورمانس (1 – 40):' : 'Performance Number (1 – 32):'}
                      </label>
                      <span dir="ltr" className="font-mono text-[11px] font-bold text-slate-400">
                        {keyboardMode === 'kronos'
                          ? `Kronos Ch 1 · PC ${perfNum - 1}`
                          : `Ch 16 · PC ${perfNum - 1}`}
                      </span>
                    </div>
                    <div dir="ltr" className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePerformanceFields(bankNum, perfNum - 1)}
                        className="min-w-[44px] h-11 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={40}
                        value={perfNum}
                        onChange={(e) => updatePerformanceFields(bankNum, clampPerfNumber(e.target.value, 1))}
                        className="flex-1 h-11 bg-[#0B1120] text-[#FFB703] font-mono font-black text-base text-center rounded-xl border border-[#1E293B] focus:outline-none focus:border-[#FFB703]"
                      />
                      <button
                        type="button"
                        onClick={() => updatePerformanceFields(bankNum, perfNum + 1)}
                        className="min-w-[44px] h-11 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Per-Bank Custom Color Picker inside Edit Modal */}
                  <div className="pt-2 border-t border-[#1E293B] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-neutral-200 font-bold flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#FFB703]" />
                        <span>
                          {isAr
                            ? `لون البنك B${editingPad.page ?? 1} (تلوين التبويب والأزرار):`
                            : `Bank B${editingPad.page ?? 1} Color (Tab & Pads):`}
                        </span>
                      </label>
                      {bankColors[editingPad.page ?? 1] && (
                        <button
                          type="button"
                          onClick={() => setCustomBankColor(editingPad.page ?? 1, null)}
                          className="text-[10px] font-bold text-slate-400 hover:text-white underline"
                        >
                          {isAr ? 'استعادة الافتراضي' : 'Reset Default'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BANK_COLOR_OPTIONS.map((opt) => {
                        const targetBankPage = editingPad.page ?? 1;
                        const isPicked = bankColors[targetBankPage] === opt.id;
                        return (
                          <button
                            key={`modal_clr_${opt.id}`}
                            type="button"
                            onClick={() => setCustomBankColor(targetBankPage, opt.id)}
                            className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                              isPicked
                                ? 'bg-white/15 border-white text-white ring-1 ring-white/70'
                                : 'bg-[#0B1120] border-[#1E293B] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <span className={`w-3 h-3 rounded-full border shrink-0 ${opt.swatchClass}`} />
                            <span className="truncate">{isAr ? opt.labelAr : opt.labelEn}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                  {(() => {
                  const styleMode: 'pc_only' | 'bank_pc' =
                    editingPad.messageType === 'pc_only' ? 'pc_only' : 'bank_pc';
                  const safeMsb = clampMidi(editingPad.msb, 0);
                  const safeLsb = clampMidi(editingPad.lsb, 0);
                  const safePc = clampMidi(editingPad.pc, 0);

                  const isUserStyleBank =
                    safeMsb === 0 &&
                    ((safeLsb >= 15 && safeLsb <= 21) ||
                      safeLsb === 24 ||
                      safeLsb === 25 ||
                      safeLsb === 26 ||
                      safeLsb === 27 ||
                      safeLsb === 28 ||
                      safeLsb === 29);

                  const userBankOptions = [
                    { id: 'user1', lsb: 27, labelAr: 'User 1 (يوزر 1 · LSB 27)', labelEn: 'User 1 (LSB 27)' },
                    { id: 'user2', lsb: 26, labelAr: 'User 2 (يوزر 2 · LSB 26)', labelEn: 'User 2 (LSB 26)' },
                    { id: 'user3', lsb: 29, labelAr: 'User 3 (يوزر 3 · LSB 29)', labelEn: 'User 3 (LSB 29)' },
                    { id: 'fav1', lsb: 15, labelAr: 'Favorite 1 (LSB 15)', labelEn: 'Favorite 1 (LSB 15)' },
                    { id: 'fav2', lsb: 16, labelAr: 'Favorite 2 (LSB 16)', labelEn: 'Favorite 2 (LSB 16)' },
                    { id: 'fav3', lsb: 17, labelAr: 'Favorite 3 (LSB 17)', labelEn: 'Favorite 3 (LSB 17)' },
                    { id: 'fav4', lsb: 18, labelAr: 'Favorite 4 (LSB 18)', labelEn: 'Favorite 4 (LSB 18)' },
                    { id: 'fav5', lsb: 19, labelAr: 'Favorite 5 (LSB 19)', labelEn: 'Favorite 5 (LSB 19)' },
                    { id: 'fav6', lsb: 20, labelAr: 'Favorite 6 (LSB 20)', labelEn: 'Favorite 6 (LSB 20)' },
                    { id: 'fav7', lsb: 21, labelAr: 'Favorite 7 (LSB 21)', labelEn: 'Favorite 7 (LSB 21)' },
                    { id: 'fav8', lsb: 28, labelAr: 'Favorite 8 (LSB 28)', labelEn: 'Favorite 8 (LSB 28)' },
                    { id: 'fav9', lsb: 24, labelAr: 'Favorite 9 (LSB 24)', labelEn: 'Favorite 9 (LSB 24)' },
                    { id: 'fav10', lsb: 25, labelAr: 'Favorite 10 (LSB 25)', labelEn: 'Favorite 10 (LSB 25)' },
                  ];

                  return (
                    <div className="space-y-3 bg-[#070B14] border border-[#1E293B] rounded-xl p-3">

                      {/* Two Crystal-Clear Style Modes */}
                      <div className="space-y-1.5">
                        <label className="text-neutral-300 font-bold block text-[11px]">
                          {isAr ? 'طريقة استدعاء الإيقاع (Ch 16 Control):' : 'Style Selection Mode (Ch 16 Control):'}
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingPad({
                                ...editingPad,
                                messageType: 'pc_only',
                              })
                            }
                            className={`p-2.5 rounded-lg border text-start transition-all ${
                              styleMode === 'pc_only'
                                ? 'bg-[#FFB703]/15 border-[#FFB703] text-[#FFB703] shadow-sm'
                                : 'bg-[#0B1120] border-[#1E293B] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-xs">
                                {isAr ? 'رقم واحد مباشر' : 'Single Number Only'}
                              </span>
                              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                styleMode === 'pc_only' ? 'border-[#FFB703]' : 'border-slate-500'
                              }`}>
                                {styleMode === 'pc_only' && <span className="w-1.5 h-1.5 rounded-full bg-[#FFB703]" />}
                              </span>
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">
                              {isAr ? 'يرسل [0xCF, PC] فقط بدون تغيير البنك' : 'Sends ONLY [0xCF, PC] (same active bank)'}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setEditingPad({
                                ...editingPad,
                                messageType: 'bank_pc',
                                msb: 0,
                              })
                            }
                            className={`p-2.5 rounded-lg border text-start transition-all ${
                              styleMode === 'bank_pc'
                                ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] shadow-sm'
                                : 'bg-[#0B1120] border-[#1E293B] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-black text-xs">
                                {isAr ? 'مسجل في اليوزر أو الشركة' : 'Factory / User Bank + Number'}
                              </span>
                              <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                styleMode === 'bank_pc' ? 'border-[#38BDF8]' : 'border-slate-500'
                              }`}>
                                {styleMode === 'bank_pc' && <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />}
                              </span>
                            </div>
                            <div className="text-[10px] opacity-80 mt-0.5">
                              {isAr ? 'بنوك الشركة أو اليوزر + رقم الإيقاع' : 'Factory or User 1–3 / Favorite + PC'}
                            </div>
                          </button>
                        </div>
                      </div>

                      {styleMode === 'pc_only' ? (
                        <div className="space-y-2.5 bg-[#0B1120] border border-[#1E293B] rounded-lg p-3">
                          <div>
                            <label className="text-neutral-300 font-bold block mb-1">
                              {isAr ? 'رقم الإيقاع المباشر (PC: 0–127):' : 'Direct Rhythm Number (PC: 0–127):'}
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={127}
                              value={editingPad.pc}
                              onChange={(e) =>
                                setEditingPad({
                                  ...editingPad,
                                  messageType: 'pc_only',
                                  pc: clampMidi(e.target.value, 0),
                                })
                              }
                              className="w-full bg-[#070B14] text-[#FFB703] font-mono font-black text-base p-2.5 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#FFB703]"
                            />
                          </div>
                          <div dir="ltr" className="bg-[#070B14] border border-[#1E293B] rounded-lg px-2.5 py-2 font-mono text-[10px] flex items-center justify-between">
                            <span className="text-neutral-400">Ch 16 MIDI Out:</span>
                            <span className="text-[#FFB703] font-bold">[0xCF, {safePc}]</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2.5 bg-[#0B1120] border border-[#1E293B] rounded-lg p-3">
                          {/* Clean Radio Toggle: Factory vs User / Favorite */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPad({
                                  ...editingPad,
                                  messageType: 'bank_pc',
                                  msb: 0,
                                  lsb: isUserStyleBank || safeLsb > 14 ? 0 : safeLsb,
                                })
                              }
                              className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                !isUserStyleBank
                                  ? 'bg-[#38BDF8] text-[#070B14] border-sky-200 font-black'
                                  : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                              }`}
                            >
                              <span>{isAr ? 'بنوك الشركة (Factory)' : 'Factory Banks'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingPad({
                                  ...editingPad,
                                  messageType: 'bank_pc',
                                  msb: 0,
                                  lsb: isUserStyleBank ? safeLsb : 27,
                                })
                              }
                              className={`py-2 px-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                                isUserStyleBank
                                  ? 'bg-[#FFB703] text-[#070B14] border-amber-200 font-black'
                                  : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                              }`}
                            >
                              <span>{isAr ? 'بنوك اليوزر (User / Fav)' : 'User / Favorite Banks'}</span>
                            </button>
                          </div>

                          {!isUserStyleBank ? (
                            <div>
                              <label className="text-neutral-300 text-[11px] font-bold block mb-1">
                                {isAr ? 'اختر بنك الشركة (Factory Styles LSB 0–14):' : 'Select Factory Bank (LSB 0–14):'}
                              </label>
                              <select
                                value={safeLsb <= 14 ? safeLsb : 0}
                                onChange={(e) =>
                                  setEditingPad({
                                    ...editingPad,
                                    messageType: 'bank_pc',
                                    msb: 0,
                                    lsb: clampMidi(e.target.value, 0),
                                  })
                                }
                                className="w-full bg-[#070B14] text-[#38BDF8] font-mono font-bold text-xs p-2.5 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#38BDF8]"
                              >
                                {Array.from({ length: 15 }).map((_, idx) => (
                                  <option key={idx} value={idx}>
                                    {isAr ? `Factory ${idx + 1} (مصنع · LSB ${idx})` : `Factory ${idx + 1} (LSB ${idx})`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="text-neutral-300 text-[11px] font-bold block mb-1">
                                {isAr ? 'اختر بنك اليوزر أو المفضلة (User / Favorite):' : 'Select User / Favorite Bank:'}
                              </label>
                              <select
                                value={safeLsb}
                                onChange={(e) =>
                                  setEditingPad({
                                    ...editingPad,
                                    messageType: 'bank_pc',
                                    msb: 0,
                                    lsb: clampMidi(e.target.value, 27),
                                  })
                                }
                                className="w-full bg-[#070B14] text-[#FFB703] font-mono font-bold text-xs p-2.5 rounded-lg border border-[#1E293B] focus:outline-none focus:border-[#FFB703]"
                              >
                                {userBankOptions.map((opt) => (
                                  <option key={opt.id} value={opt.lsb}>
                                    {isAr ? opt.labelAr : opt.labelEn}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-neutral-400 block mb-1 font-mono text-[10px]">MSB (CC#0)</label>
                              <input
                                type="number"
                                min={0}
                                max={127}
                                value={editingPad.msb}
                                onChange={(e) =>
                                  setEditingPad({
                                    ...editingPad,
                                    messageType: 'bank_pc',
                                    msb: clampMidi(e.target.value, 0),
                                  })
                                }
                                className="w-full bg-[#070B14] text-slate-300 font-mono font-bold p-2 rounded-lg border border-[#1E293B] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-neutral-400 block mb-1 font-mono text-[10px]">LSB (CC#32)</label>
                              <input
                                type="number"
                                min={0}
                                max={127}
                                value={editingPad.lsb}
                                onChange={(e) =>
                                  setEditingPad({
                                    ...editingPad,
                                    messageType: 'bank_pc',
                                    lsb: clampMidi(e.target.value, 0),
                                  })
                                }
                                className="w-full bg-[#070B14] text-[#38BDF8] font-mono font-bold p-2 rounded-lg border border-[#1E293B] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-neutral-400 block mb-1 font-mono text-[10px]">
                                {isAr ? 'الرقم (PC 0–127)' : 'Number (PC)'}
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={127}
                                value={editingPad.pc}
                                onChange={(e) =>
                                  setEditingPad({
                                    ...editingPad,
                                    messageType: 'bank_pc',
                                    pc: clampMidi(e.target.value, 0),
                                  })
                                }
                                className="w-full bg-[#070B14] text-[#FFB703] font-mono font-bold p-2 rounded-lg border border-[#1E293B] focus:outline-none"
                              />
                            </div>
                          </div>

                          <div dir="ltr" className="bg-[#070B14] border border-[#1E293B] rounded-lg px-2.5 py-2 font-mono text-[10px] flex items-center justify-between">
                            <span className="text-neutral-400">Ch 16 MIDI Out:</span>
                            <span className="text-[#38BDF8] font-bold">
                              [0xBF, 0, {safeMsb}] → [0xBF, 32, {safeLsb}] → [0xCF, {safePc}]
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
                  })

              
                <div>
                  <label className="text-neutral-300 block mb-1.5">
                    {isAr ? 'لون الزر:' : 'Button Color:'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['purple', 'blue', 'cyan', 'emerald', 'green', 'red', 'orange', 'pink', 'amber'] as const).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingPad({ ...editingPad, color: c })}
                        className={`w-8 h-8 rounded-lg ${COLOR_CLASSES[c].activeBg} border-2 transition-all ${
                          editingPad.color === c ? 'border-white scale-110 shadow-lg' : 'border-[#1E293B] opacity-75'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                      
    

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setEditingPad(null)}
                className="px-3 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-[#111827] border border-[#1E293B] rounded-lg"
              >
                {isAr ? 'إلغاء' : 'Cancel'}
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    editingPad.type === 'sound'
                      ? sendSoundPadToKorg(normalizeSoundPad(editingPad))
                      : sendStylePadToKorg(normalizeStylePad(editingPad), false)
                  }
                  className="px-3 py-2 text-xs font-bold text-[#FFB703] bg-[#111827] hover:bg-[#1E293B] border border-[#FFB703]/50 rounded-lg flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>{isAr ? 'اختبار للأورج' : 'Test'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveEdit(editingPad)}
                  className="px-4 py-2 text-xs font-bold text-[#070B14] bg-[#38BDF8] hover:bg-sky-300 rounded-lg shadow-md"
                >
                  {isAr ? 'حفظ التعديل' : 'Save'}
                </button>
              </div>
            </div>

                </div>       
      
     )}   


      {/* Live Stage Setlist Manager Modal */}
      {isSetlistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-5 max-w-md w-full max-h-[88vh] overflow-y-auto shadow-2xl space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <h3 className="font-black text-[#F0F6FC] text-sm flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-[#38BDF8]" />
                <span>{isAr ? 'قائمة أغاني الحفلة (Live Setlist)' : 'Live Stage Setlist'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSetlistModalOpen(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newSongTitle}
                onChange={(e) => setNewSongTitle(e.target.value)}
                placeholder={isAr ? 'اسم الأغنية (أو اتركه فارغاً للتسمية التلقائية)...' : 'Song title (optional)...'}
                className="flex-1 bg-[#070B14] border border-[#1E293B] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#38BDF8]"
              />
              <button
                type="button"
                onClick={handleSaveCurrentToSetlist}
                className="px-3 py-2 rounded-lg bg-[#FFB703] hover:bg-amber-300 text-[#070B14] font-black flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAr ? 'حفظ الحالية' : 'Save Current'}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {stageSetlist.map((song, idx) => {
                const isCurrent = idx === activeSetlistIdx % stageSetlist.length;
                return (
                  <div
                    key={song.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-colors ${
                      isCurrent
                        ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-white'
                        : 'bg-[#070B14] border-[#1E293B] text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        applyStageSetlistItem(song, idx);
                        setIsSetlistModalOpen(false);
                      }}
                      className="flex-1 text-start min-w-0"
                    >
                      <div className="font-bold truncate">
                        {idx + 1}. {song.title}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {song.memorySlot} · Drone {song.droneRoot}
                      </div>
                    </button>

                    {stageSetlist.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextList = stageSetlist.filter((s) => s.id !== song.id);
                          setStageSetlist(nextList);
                          if (activeSetlistIdx >= nextList.length) {
                            setActiveSetlistIdx(Math.max(0, nextList.length - 1));
                          }
                        }}
                        className="p-1.5 rounded-lg bg-[#111827] hover:bg-rose-950 text-rose-300 shrink-0"
                        title={isAr ? 'حذف' : 'Remove'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating feedback toast */}
      {toast && (
        <div className="fixed bottom-6 end-6 z-50 bg-[#0B1120] border border-[#38BDF8]/70 text-[#38BDF8] px-4 py-2.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-[#38BDF8]" />
          <span>{toast}</span>
        </div>
      )}

    </div>
  );
};
