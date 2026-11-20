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
    
