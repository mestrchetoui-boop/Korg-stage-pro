import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Sparkles,
  Radio,
  RotateCcw,
  Send,
  Play,
  Square,
  Zap,
  Music,
  Check,
  Lock,
  Unlock,
} from 'lucide-react';
import { midiEngine } from '../services/midiEngine';

interface EffectsMixerSectionProps {
  lang: 'ar' | 'en';
}

type SoundTrackId = 'upper1' | 'upper2' | 'upper3' | 'lower';
type StyleTrackId = 'drums' | 'perc' | 'bass' | 'acc1' | 'acc2' | 'acc3' | 'acc4';

interface SoundFxTrackState {
  id: SoundTrackId;
  label: string;
  labelAr: string;
  channel: number;
  muted: boolean;
  volume: number;
  pan: number;
  expression: number;
  reverbSend: number;
  chorusSend: number;
  delaySend: number;
  cutoff: number;
  resonance: number;
  attack: number;
  decay: number;
  release: number;
  lfoDepth: number;
  lfoSpeed: number;
  lfoDelay: number;
  portamentoOn: boolean;
  portamentoTime: number;
  octTranspose: number;
  detune: number;
  pbSensitivity: number;
}

interface StyleFxTrackState {
  id: StyleTrackId;
  label: string;
  labelAr: string;
  channel: number;
  muted: boolean;
  volume: number;
  pan: number;
  reverbSend: number;
  chorusSend: number;
  delaySend: number;
  cutoff: number;
  resonance: number;
  release: number;
}

interface PersistedEffectsState {
  soundTracks: Record<SoundTrackId, SoundFxTrackState>;
  styleTracks: Record<StyleTrackId, StyleFxTrackState>;
  masterTranspose: number;
}

const STORAGE_KEY = 'korg_effects_mixer_v1';

const createDefaultSoundTracks = (): Record<SoundTrackId, SoundFxTrackState> => {
  const chs = midiEngine.getChannels();
  return {
    upper1: {
      id: 'upper1',
      label: 'Upper 1',
      labelAr: 'Upper 1 (الأساسي)',
      channel: chs.upper1 || 1,
      muted: false,
      volume: 110,
      pan: 64,
      expression: 127,
      reverbSend: 45,
      chorusSend: 25,
      delaySend: 20,
      cutoff: 0,
      resonance: 0,
      attack: 0,
      decay: 0,
      release: 0,
      lfoDepth: 0,
      lfoSpeed: 0,
      lfoDelay: 0,
      portamentoOn: false,
      portamentoTime: 20,
      octTranspose: 0,
      detune: 0,
      pbSensitivity: 2,
    },
    upper2: {
      id: 'upper2',
      label: 'Upper 2',
      labelAr: 'Upper 2 (الثاني)',
      channel: chs.upper2 || 2,
      muted: false,
      volume: 95,
      pan: 56,
      expression: 127,
      reverbSend: 45,
      chorusSend: 30,
      delaySend: 20,
      cutoff: 0,
      resonance: 0,
      attack: 0,
      decay: 0,
      release: 0,
      lfoDepth: 0,
      lfoSpeed: 0,
      lfoDelay: 0,
      portamentoOn: false,
      portamentoTime: 20,
      octTranspose: 0,
      detune: 0,
      pbSensitivity: 2,
    },
    upper3: {
      id: 'upper3',
      label: 'Upper 3',
      labelAr: 'Upper 3 (الثالث)',
      channel: chs.upper3 || 3,
      muted: false,
      volume: 85,
      pan: 72,
      expression: 127,
      reverbSend: 50,
      chorusSend: 35,
      delaySend: 25,
      cutoff: 0,
      resonance: 0,
      attack: 0,
      decay: 0,
      release: 0,
      lfoDepth: 0,
      lfoSpeed: 0,
      lfoDelay: 0,
      portamentoOn: false,
      portamentoTime: 20,
      octTranspose: 0,
      detune: 0,
      pbSensitivity: 2,
    },
    lower: {
      id: 'lower',
      label: 'Lower',
      labelAr: 'Lower (اليسار)',
      channel: chs.lower || 4,
      muted: false,
      volume: 90,
      pan: 64,
      expression: 127,
      reverbSend: 35,
      chorusSend: 20,
      delaySend: 0,
      cutoff: 0,
      resonance: 0,
      attack: 0,
      decay: 0,
      release: 0,
      lfoDepth: 0,
      lfoSpeed: 0,
      lfoDelay: 0,
      portamentoOn: false,
      portamentoTime: 0,
      octTranspose: 0,
      detune: 0,
      pbSensitivity: 2,
    },
  };
};

const createDefaultStyleTracks = (): Record<StyleTrackId, StyleFxTrackState> => ({
  drums: {
    id: 'drums',
    label: 'Drums',
    labelAr: 'الطبول (Drums)',
    channel: 10,
    muted: false,
    volume: 115,
    pan: 64,
    reverbSend: 25,
    chorusSend: 0,
    delaySend: 0,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  perc: {
    id: 'perc',
    label: 'Percussion',
    labelAr: 'الإيقاع الشرقي (Perc)',
    channel: 9,
    muted: false,
    volume: 112,
    pan: 64,
    reverbSend: 30,
    chorusSend: 10,
    delaySend: 10,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  bass: {
    id: 'bass',
    label: 'Bass',
    labelAr: 'الباص (Bass)',
    channel: 11,
    muted: false,
    volume: 108,
    pan: 64,
    reverbSend: 10,
    chorusSend: 0,
    delaySend: 0,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  acc1: {
    id: 'acc1',
    label: 'Acc 1',
    labelAr: 'مصاحبة 1 (Acc 1)',
    channel: 12,
    muted: false,
    volume: 92,
    pan: 52,
    reverbSend: 45,
    chorusSend: 25,
    delaySend: 15,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  acc2: {
    id: 'acc2',
    label: 'Acc 2',
    labelAr: 'مصاحبة 2 (Acc 2)',
    channel: 13,
    muted: false,
    volume: 88,
    pan: 76,
    reverbSend: 45,
    chorusSend: 30,
    delaySend: 20,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  acc3: {
    id: 'acc3',
    label: 'Acc 3',
    labelAr: 'مصاحبة 3 (Acc 3)',
    channel: 14,
    muted: false,
    volume: 85,
    pan: 44,
    reverbSend: 50,
    chorusSend: 30,
    delaySend: 20,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
  acc4: {
    id: 'acc4',
    label: 'Acc 4 / 5',
    labelAr: 'مصاحبة 4–5 (Acc 4–5)',
    channel: 15,
    muted: false,
    volume: 85,
    pan: 84,
    reverbSend: 50,
    chorusSend: 35,
    delaySend: 25,
    cutoff: 0,
    resonance: 0,
    release: 0,
  },
});

const SOUND_TRACK_ORDER: SoundTrackId[] = ['upper1', 'upper2', 'upper3', 'lower'];
const STYLE_TRACK_ORDER: StyleTrackId[] = ['drums', 'perc', 'bass', 'acc1', 'acc2', 'acc3', 'acc4'];

const clampMidi = (v: number) => Math.max(0, Math.min(127, Math.round(v)));
const clampSigned = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v)));

export const EffectsMixerSection: React.FC<EffectsMixerSectionProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  const [sectionMode, setSectionMode] = useState<'sounds' | 'styles'>('sounds');
  const [selectedSoundTrack, setSelectedSoundTrack] = useState<SoundTrackId>('upper1');
  const [selectedStyleTrack, setSelectedStyleTrack] = useState<StyleTrackId>('drums');
  const [soundSubTab, setSoundSubTab] = useState<'mixer' | 'easyEdit' | 'tuning'>('mixer');

  const [soundTracks, setSoundTracks] = useState<Record<SoundTrackId, SoundFxTrackState>>(() => {
    const def = createDefaultSoundTracks();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedEffectsState>;
        if (parsed.soundTracks) {
          return {
            upper1: { ...def.upper1, ...parsed.soundTracks.upper1 },
            upper2: { ...def.upper2, ...parsed.soundTracks.upper2 },
            upper3: { ...def.upper3, ...parsed.soundTracks.upper3 },
            lower: { ...def.lower, ...parsed.soundTracks.lower },
          };
        }
      }
    } catch {}
    return def;
  });

  const [styleTracks, setStyleTracks] = useState<Record<StyleTrackId, StyleFxTrackState>>(() => {
    const def = createDefaultStyleTracks();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedEffectsState>;
        if (parsed.styleTracks) {
          return {
            drums: { ...def.drums, ...parsed.styleTracks.drums },
            perc: { ...def.perc, ...parsed.styleTracks.perc },
            bass: { ...def.bass, ...parsed.styleTracks.bass },
            acc1: { ...def.acc1, ...parsed.styleTracks.acc1 },
            acc2: { ...def.acc2, ...parsed.styleTracks.acc2 },
            acc3: { ...def.acc3, ...parsed.styleTracks.acc3 },
            acc4: { ...def.acc4, ...parsed.styleTracks.acc4 },
          };
        }
      }
    } catch {}
    return def;
  });

  const [masterTranspose, setMasterTranspose] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedEffectsState>;
        if (typeof parsed.masterTranspose === 'number') {
          return clampSigned(parsed.masterTranspose, -12, 12);
        }
      }
    } catch {}
    return 0;
  });

  // Strictly muted/locked by default on every load until manually unlocked
  const [mixerAuthorized, setMixerAuthorized] = useState<boolean>(false);
  const isPageLocked = !mixerAuthorized;

  const [activeVar, setActiveVar] = useState<1 | 2 | 3 | 4>(1);
  const [toast, setToast] = useState<string | null>(null);
  const [masterStyleReverb, setMasterStyleReverb] = useState<number>(35);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    const syncFromEngine = () => {
      const chs = midiEngine.getChannels();
      setSoundTracks((prev) => {
        const u1 = chs.upper1 || 1;
        const u2 = chs.upper2 || 2;
        const u3 = chs.upper3 || 3;
        const lw = chs.lower || 4;
        if (
          prev.upper1.channel === u1 &&
          prev.upper2.channel === u2 &&
          prev.upper3.channel === u3 &&
          prev.lower.channel === lw
        ) {
          return prev;
        }
        return {
          upper1: { ...prev.upper1, channel: u1 },
          upper2: { ...prev.upper2, channel: u2 },
          upper3: { ...prev.upper3, channel: u3 },
          lower: { ...prev.lower, channel: lw },
        };
      });
    };
    syncFromEngine();
    const unsub = midiEngine.subscribeState(syncFromEngine);
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      const payload: PersistedEffectsState = { soundTracks, styleTracks, masterTranspose };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [soundTracks, styleTracks, masterTranspose]);

  const togglePageLock = () => {
    setMixerAuthorized((prev) => {
      const nextAuthorized = !prev;
      showToast(
        !nextAuthorized
          ? (isAr ? 'تم تفعيل القفل الكامل لباج الميكسر (لا يمكن إرسال أي تعديل بالخطأ)' : 'Mixer & FX Page LOCKED — accidental edits blocked')
          : (isAr ? 'تم تفعيل باج الميكسر والمؤثرات بنجاح' : 'Mixer & FX Page ACTIVATED')
      );
      return nextAuthorized;
    });
  };

  const sendCC = (channel: number, ccNum: number, val: number, desc: string) => {
    if (isPageLocked) return;
    const chIdx = Math.max(0, Math.min(15, channel - 1));
    midiEngine.sendRaw([0xB0 | chIdx, ccNum, clampMidi(val)], `[Ch ${channel}] ${desc}`, 'cc', channel);
  };

  const updateSoundTrack = (id: SoundTrackId, patch: Partial<SoundFxTrackState>, sendLiveFn?: (next: SoundFxTrackState) => void) => {
    if (isPageLocked) return;
    setSoundTracks((prev) => {
      const nextTrack = { ...prev[id], ...patch };
      if (sendLiveFn) sendLiveFn(nextTrack);
      return { ...prev, [id]: nextTrack };
    });
  };

  const updateStyleTrack = (id: StyleTrackId, patch: Partial<StyleFxTrackState>, sendLiveFn?: (next: StyleFxTrackState) => void) => {
    if (isPageLocked) return;
    setStyleTracks((prev) => {
      const nextTrack = { ...prev[id], ...patch };
      if (sendLiveFn) sendLiveFn(nextTrack);
      return { ...prev, [id]: nextTrack };
    });
  };

  const applyAllSoundTracks = () => {
    if (isPageLocked) return;
    SOUND_TRACK_ORDER.forEach((id) => {
      const t = soundTracks[id];
      midiEngine.applyTrackControlsNow(
        t.channel,
        {
          mixerFx: {
            enabled: true,
            volume: t.volume,
            pan: t.pan,
            reverbSend: t.reverbSend,
            chorusSend: t.chorusSend,
            delaySend: t.delaySend,
          },
          easyEdit: {
            enabled: true,
            attack: t.attack,
            decay: t.decay,
            release: t.release,
            cutoff: t.cutoff,
            resonance: t.resonance,
            lfoDepth: t.lfoDepth,
            lfoSpeed: t.lfoSpeed,
            lfoDelay: t.lfoDelay,
            portamentoOn: t.portamentoOn,
            portamentoTime: t.portamentoTime,
          },
          tuning: {
            enabled: true,
            muted: t.muted,
            octTranspose: t.octTranspose,
            detune: t.detune,
            pbSensitivity: t.pbSensitivity,
          },
        },
        t.label
      );
      if (!t.muted) {
        sendCC(t.channel, 11, t.expression, `${t.label} Expression=${t.expression}`);
      }
    });
    showToast(isAr ? 'تم إرسال جميع مؤثرات وإعدادات الأصوات إلى Korg PA' : 'Applied all Sound FX & Mixer to Korg PA');
  };

  const applyAllStyleTracks = () => {
    if (isPageLocked) return;
    STYLE_TRACK_ORDER.forEach((id) => {
      const t = styleTracks[id];
      midiEngine.applyTrackControlsNow(
        t.channel,
        {
          mixerFx: {
            enabled: true,
            volume: t.volume,
            pan: t.pan,
            reverbSend: t.reverbSend,
            chorusSend: t.chorusSend,
            delaySend: t.delaySend,
          },
          easyEdit: {
            enabled: true,
            cutoff: t.cutoff,
            resonance: t.resonance,
            release: t.release,
          },
          tuning: {
            enabled: false,
            muted: t.muted,
          },
        },
        t.label
      );
    });
    showToast(isAr ? 'تم إرسال جميع مؤثرات وميكسر الإيقاعات إلى Korg PA' : 'Applied all Style Track FX to Korg PA');
  };

  const resetCurrentSection = () => {
    if (isPageLocked) return;
    if (sectionMode === 'sounds') {
      const def = createDefaultSoundTracks();
      setSoundTracks(def);
      SOUND_TRACK_ORDER.forEach((id) => {
        const t = def[id];
        midiEngine.applyTrackControlsNow(
          t.channel,
          {
            mixerFx: {
              enabled: true,
              volume: t.volume,
              pan: t.pan,
              reverbSend: t.reverbSend,
              chorusSend: t.chorusSend,
              delaySend: t.delaySend,
            },
            easyEdit: {
              enabled: true,
              attack: 0,
              decay: 0,
              release: 0,
              cutoff: 0,
              resonance: 0,
              lfoDepth: 0,
              lfoSpeed: 0,
              lfoDelay: 0,
              portamentoOn: false,
              portamentoTime: 20,
            },
            tuning: {
              enabled: true,
              muted: false,
              octTranspose: 0,
              detune: 0,
              pbSensitivity: 2,
            },
          },
          t.label
        );
      });
      showToast(isAr ? 'تم تصفير مؤثرات الأصوات واستعادة الوضع الافتراضي' : 'Sound FX reset to defaults');
    } else {
      const def = createDefaultStyleTracks();
      setStyleTracks(def);
      STYLE_TRACK_ORDER.forEach((id) => {
        const t = def[id];
        midiEngine.applyTrackControlsNow(
          t.channel,
          {
            mixerFx: {
              enabled: true,
              volume: t.volume,
              pan: t.pan,
              reverbSend: t.reverbSend,
              chorusSend: t.chorusSend,
              delaySend: t.delaySend,
            },
            easyEdit: { enabled: true, cutoff: 0, resonance: 0, release: 0 },
            tuning: { enabled: false, muted: false },
          },
          t.label
        );
      });
      showToast(isAr ? 'تم تصفير مؤثرات الإيقاعات واستعادة الوضع الافتراضي' : 'Style FX reset to defaults');
    }
  };

  const applyUpperGroupCC = (ccNum: number, val: number, label: string, field: keyof SoundFxTrackState) => {
    if (isPageLocked) return;
    const safeVal = ccNum >= 71 && ccNum <= 78 ? clampSigned(val, -64, 63) : clampMidi(val);
    const midiVal = ccNum >= 71 && ccNum <= 78 ? 64 + safeVal : safeVal;
    setSoundTracks((prev) => {
      const next = { ...prev };
      (['upper1', 'upper2', 'upper3'] as SoundTrackId[]).forEach((uid) => {
        next[uid] = { ...next[uid], [field]: safeVal };
        sendCC(next[uid].channel, ccNum, midiVal, `All Upper ${label}=${safeVal}`);
      });
      return next;
    });
  };

  const activeSound = soundTracks[selectedSoundTrack];
  const activeStyle = styleTracks[selectedStyleTrack];

  return (
    <div className="space-y-4 pb-8 max-w-7xl mx-auto">
      {/* Workstation Page Header Card */}
      <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#38BDF8]/20 to-[#FFB703]/20 border border-[#38BDF8]/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-[#FFB703]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#F0F6FC] tracking-tight">
                {isAr ? 'مؤثرات وميكسر الأورج · Korg PA' : 'Korg PA Effects & Mixer'}
              </h1>
              <p className="text-xs text-slate-400">
                {isAr
                  ? 'تحكم حي ومباشر في الميكسر، FX A/B، الفلتر، الإيفيكت، وجميع مسارات الأصوات والإيقاعات'
                  : 'Real-time Mixer, FX A/B, Easy Edit Filters, Tuning & Style Track Controls'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={togglePageLock}
              className={`min-h-[44px] px-4 py-2 rounded-xl border text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition-all active:scale-95 ${
                isPageLocked
                  ? 'bg-rose-600 hover:bg-rose-500 border-rose-300 text-white shadow-rose-950/60'
                  : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-200 text-[#070B14] shadow-emerald-950/50'
              }`}
            >
              {isPageLocked ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
              <span>
                {isPageLocked
                  ? (isAr ? 'مقفول · اضغط للتفعيل' : 'LOCKED · Tap to Enable')
                  : (isAr ? 'شغّال · قفل كامل للباج' : 'ACTIVE · Lock Full Page')}
              </span>
            </button>

            <button
              type="button"
              disabled={isPageLocked}
              onClick={resetCurrentSection}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#070B14] hover:bg-[#111827] disabled:opacity-40 disabled:pointer-events-none border border-[#1E293B] text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>{isAr ? 'تصفير' : 'Reset'}</span>
            </button>
            <button
              type="button"
              disabled={isPageLocked}
              onClick={sectionMode === 'sounds' ? applyAllSoundTracks : applyAllStyleTracks}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#38BDF8] hover:bg-sky-300 disabled:opacity-40 disabled:pointer-events-none text-[#070B14] text-xs font-black flex items-center gap-1.5 shadow-lg shadow-sky-950/50 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{isAr ? 'إرسال الكل للأورج' : 'Send All'}</span>
            </button>
          </div>
        </div>

        {isPageLocked && (
          <div className="bg-rose-950/50 border border-rose-500/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-rose-200 font-bold">
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                {isAr
                  ? 'باج الميكسر والمؤثرات مقفولة بالكامل — لن يتم إرسال أي أزرار أو سلايدرات للأورج حتى تقوم بإعادة التفعيل.'
                  : 'Mixer & Effects page is completely LOCKED — all sliders and buttons are protected until unlocked.'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => togglePageLock()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#070B14] font-black text-xs shrink-0 self-start sm:self-center"
            >
              {isAr ? 'فك القفل والتفعيل' : 'Unlock Now'}
            </button>
          </div>
        )}

        {/* Two Main Big Mode Switch Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={isPageLocked}
            onClick={() => setSectionMode('sounds')}
            className={`min-h-[50px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none ${
              sectionMode === 'sounds'
                ? 'bg-[#FFB703] text-[#070B14] border-amber-200 shadow-lg shadow-amber-950/40'
                : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-600'
            }`}
          >
            <Music className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'مؤثرات الأصوات (Upper / Lower)' : 'Sound Effects (Upper 1–3)'}</span>
          </button>
          <button
            type="button"
            disabled={isPageLocked}
            onClick={() => setSectionMode('styles')}
            className={`min-h-[50px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-45 disabled:pointer-events-none ${
              sectionMode === 'styles'
                ? 'bg-[#38BDF8] text-[#070B14] border-sky-200 shadow-lg shadow-sky-950/40'
                : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-600'
            }`}
          >
            <Radio className="w-4 h-4 shrink-0" />
            <span>{isAr ? 'مؤثرات الإيقاعات والأرانجر (Style)' : 'Style & Rhythm Effects'}</span>
          </button>
        </div>
      </div>

      <fieldset disabled={isPageLocked} className={`space-y-4 border-0 p-0 m-0 transition-opacity ${isPageLocked ? 'opacity-45 pointer-events-none select-none' : ''}`}>
      {sectionMode === 'sounds' ? (
        <div className="space-y-4">

          {/* Quick Master All Upper (1-3) FX Bar */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-black text-[#FFB703] flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{isAr ? 'تحكم سريع مشترك (Upper 1 + 2 + 3 معاً)' : 'Master All Upper (UP1–UP3 Linked)'}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Ch {soundTracks.upper1.channel} · {soundTracks.upper2.channel} · {soundTracks.upper3.channel}
              </span>
            </div>

            <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: 'All Upper FX A (Rev CC#91)', cc: 91, field: 'reverbSend' as const, min: 0, max: 127, val: soundTracks.upper1.reverbSend, accent: 'accent-[#38BDF8]' },
                { label: 'All Upper FX B (Cho CC#93)', cc: 93, field: 'chorusSend' as const, min: 0, max: 127, val: soundTracks.upper1.chorusSend, accent: 'accent-[#38BDF8]' },
                { label: 'All Upper Delay (CC#94)', cc: 94, field: 'delaySend' as const, min: 0, max: 127, val: soundTracks.upper1.delaySend, accent: 'accent-[#FFB703]' },
                { label: 'All Upper Cutoff (CC#74)', cc: 74, field: 'cutoff' as const, min: -64, max: 63, val: soundTracks.upper1.cutoff, accent: 'accent-emerald-400' },
              ].map((ctrl) => (
                <div key={ctrl.label} className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-200 font-bold truncate">{ctrl.label}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0B1120] border border-[#1E293B] text-[#FFB703] font-black">
                      {ctrl.min < 0 && ctrl.val > 0 ? `+${ctrl.val}` : ctrl.val}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    value={ctrl.val}
                    onChange={(e) => applyUpperGroupCC(ctrl.cc, Number(e.target.value), ctrl.label, ctrl.field)}
                    className={`w-full h-2.5 cursor-pointer ${ctrl.accent}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 4 Hardware Channel Strips (UP1, UP2, UP3, LOWER) */}
          <div dir="ltr" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {SOUND_TRACK_ORDER.map((id) => {
              const tr = soundTracks[id];
              const isSelected = selectedSoundTrack === id;
              return (
                <div
                  key={id}
                  className={`rounded-2xl border p-3.5 transition-all space-y-3 ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#38BDF8] shadow-lg shadow-sky-950/40'
                      : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSoundTrack(id)}
                      className="text-start flex-1 min-h-[44px] flex flex-col justify-center"
                    >
                      <span className={`text-sm font-black ${isSelected ? 'text-[#38BDF8]' : 'text-white'}`}>
                        {tr.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Ch {tr.channel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !tr.muted;
                        updateSoundTrack(id, { muted: nextMuted }, (n) => {
                          sendCC(n.channel, 7, nextMuted ? 0 : n.volume, `${n.label} ${nextMuted ? 'MUTE' : `PLAY Vol=${n.volume}`}`);
                        });
                      }}
                      className={`min-h-[44px] min-w-[68px] px-2.5 rounded-xl font-black text-xs border flex items-center justify-center gap-1 transition-all active:scale-95 ${
                        tr.muted
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      }`}
                    >
                      {tr.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{tr.muted ? 'MUTE' : 'PLAY'}</span>
                    </button>
                  </div>

                  {/* Quick Channel Volume Slider */}
                  <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Vol (CC#7)</span>
                      <span className="text-[#FFB703] font-black">{tr.volume}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={tr.volume}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateSoundTrack(id, { volume: v, muted: false }, (n) => {
                          sendCC(n.channel, 7, v, `${n.label} Volume=${v}`);
                        });
                      }}
                      className="w-full h-2.5 accent-[#FFB703] cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedSoundTrack(id)}
                    className={`w-full min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-[#38BDF8] text-[#070B14] border-sky-200 font-black'
                        : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    {isAr ? (isSelected ? 'قيد التعديل الآن' : 'فتح المؤثرات') : (isSelected ? 'Editing Now' : 'Edit FX')}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Sound Track Detailed Korg Workstation Console */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#F0F6FC]">
                  {isAr ? `تعديل مؤثرات التراك: ${activeSound.labelAr}` : `Editing Track: ${activeSound.label}`}
                </h2>
                <span className="text-xs font-mono text-[#38BDF8]">MIDI Channel {activeSound.channel}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'mixer' as const, labelAr: 'الميكسر و FX', labelEn: 'Mixer / FX' },
                  { id: 'easyEdit' as const, labelAr: 'الفلتر و Edit', labelEn: 'Easy Edit' },
                  { id: 'tuning' as const, labelAr: 'الضبط والأوكتاف', labelEn: 'Tuning −/+' },
                ]).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSoundSubTab(t.id)}
                    className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                      soundSubTab === t.id
                        ? 'bg-[#FFB703] text-[#070B14] border-amber-200 shadow'
                        : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    {isAr ? t.labelAr : t.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {soundSubTab === 'mixer' && (
              <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {([
                  { key: 'volume' as const, cc: 7, label: 'Volume (CC#7)', min: 0, max: 127 },
                  { key: 'pan' as const, cc: 10, label: 'Pan L/R (CC#10)', min: 0, max: 127 },
                  { key: 'expression' as const, cc: 11, label: 'Expression (CC#11)', min: 0, max: 127 },
                  { key: 'reverbSend' as const, cc: 91, label: 'FX A / Reverb (CC#91)', min: 0, max: 127 },
                  { key: 'chorusSend' as const, cc: 93, label: 'FX B / Chorus (CC#93)', min: 0, max: 127 },
                  { key: 'delaySend' as const, cc: 94, label: 'Delay Send (CC#94)', min: 0, max: 127 },
                ]).map((sl) => {
                  const val = activeSound[sl.key];
                  return (
                    <div key={sl.key} className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-200 font-bold">{sl.label}</span>
                        <span className="px-2.5 py-1 rounded-lg bg-[#0B1120] border border-[#1E293B] text-[#38BDF8] font-black text-sm">
                          {val}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={sl.min}
                        max={sl.max}
                        value={val}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateSoundTrack(selectedSoundTrack, { [sl.key]: v }, (n) => {
                            sendCC(n.channel, sl.cc, v, `${n.label} ${sl.label}=${v}`);
                          });
                        }}
                        className="w-full h-3 accent-[#38BDF8] cursor-pointer"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {soundSubTab === 'easyEdit' && (
              <div className="space-y-3">
                <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {([
                    { key: 'cutoff' as const, cc: 74, label: 'Filter Cutoff (CC#74)' },
                    { key: 'resonance' as const, cc: 71, label: 'Resonance (CC#71)' },
                    { key: 'attack' as const, cc: 73, label: 'Attack (CC#73)' },
                    { key: 'decay' as const, cc: 75, label: 'Decay (CC#75)' },
                    { key: 'release' as const, cc: 72, label: 'Release (CC#72)' },
                    { key: 'lfoDepth' as const, cc: 77, label: 'LFO Depth (CC#77)' },
                    { key: 'lfoSpeed' as const, cc: 76, label: 'LFO Speed (CC#76)' },
                    { key: 'lfoDelay' as const, cc: 78, label: 'LFO Delay (CC#78)' },
                  ]).map((knob) => {
                    const val = activeSound[knob.key];
                    return (
                      <div key={knob.key} className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-200 font-bold">{knob.label}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-[#0B1120] border border-[#1E293B] text-[#FFB703] font-black text-sm">
                            {val > 0 ? `+${val}` : val}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-64}
                          max={63}
                          value={val}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateSoundTrack(selectedSoundTrack, { [knob.key]: v }, (n) => {
                              sendCC(n.channel, knob.cc, 64 + v, `${n.label} ${knob.label}=${v}`);
                            });
                          }}
                          className="w-full h-3 accent-[#FFB703] cursor-pointer"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Portamento / Glide Control */}
                <div dir="ltr" className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const nextOn = !activeSound.portamentoOn;
                      updateSoundTrack(selectedSoundTrack, { portamentoOn: nextOn }, (n) => {
                        sendCC(n.channel, 65, nextOn ? 127 : 0, `${n.label} Portamento ${nextOn ? 'ON' : 'OFF'}`);
                      });
                    }}
                    className={`min-h-[44px] px-4 rounded-xl text-xs font-black border transition-all ${
                      activeSound.portamentoOn
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-[#0B1120] border-[#1E293B] text-slate-300'
                    }`}
                  >
                    Portamento / Glide: {activeSound.portamentoOn ? 'ON' : 'OFF'}
                  </button>

                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-300 shrink-0">
                      Time (CC#5): <strong className="text-[#38BDF8]">{activeSound.portamentoTime}</strong>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={127}
                      value={activeSound.portamentoTime}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateSoundTrack(selectedSoundTrack, { portamentoOn: true, portamentoTime: v }, (n) => {
                          sendCC(n.channel, 65, 127, `${n.label} Portamento ON`);
                          sendCC(n.channel, 5, v, `${n.label} Glide Time=${v}`);
                        });
                      }}
                      className="w-full h-3 accent-[#38BDF8] cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {soundSubTab === 'tuning' && (
              <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* PB Sensitivity */}
                <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 space-y-3">
                  <span className="text-xs text-slate-300 font-mono font-bold block">PB Sensitivity (0–24)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.max(0, activeSound.pbSensitivity - 1);
                        updateSoundTrack(selectedSoundTrack, { pbSensitivity: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, pbSensitivity: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      −
                    </button>
                    <div className="flex-1 h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] flex items-center justify-center font-mono font-black text-lg text-[#FFB703]">
                      {activeSound.pbSensitivity}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.min(24, activeSound.pbSensitivity + 1);
                        updateSoundTrack(selectedSoundTrack, { pbSensitivity: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, pbSensitivity: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Octave Transpose */}
                <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 space-y-3">
                  <span className="text-xs text-slate-300 font-mono font-bold block">Octave (-2..+2)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.max(-2, activeSound.octTranspose - 1);
                        updateSoundTrack(selectedSoundTrack, { octTranspose: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, octTranspose: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#38BDF8] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      −
                    </button>
                    <div className="flex-1 h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] flex items-center justify-center font-mono font-black text-lg text-[#38BDF8]">
                      {activeSound.octTranspose > 0 ? `+${activeSound.octTranspose}` : activeSound.octTranspose}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.min(2, activeSound.octTranspose + 1);
                        updateSoundTrack(selectedSoundTrack, { octTranspose: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, octTranspose: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#38BDF8] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Fine Detune */}
                <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-4 space-y-2.5">
                  <span className="text-xs text-slate-300 font-mono font-bold block">Detune (-50..+50¢)</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.max(-50, activeSound.detune - 1);
                        updateSoundTrack(selectedSoundTrack, { detune: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, detune: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      −
                    </button>
                    <div className="flex-1 h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] flex items-center justify-center font-mono font-black text-lg text-[#FFB703]">
                      {activeSound.detune > 0 ? `+${activeSound.detune}` : activeSound.detune}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const nextVal = Math.min(50, activeSound.detune + 1);
                        updateSoundTrack(selectedSoundTrack, { detune: nextVal }, (n) => {
                          midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, detune: nextVal } }, n.label);
                        });
                      }}
                      className="min-w-[48px] h-12 rounded-xl bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-xl flex items-center justify-center active:scale-95"
                    >
                      +
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-50}
                    max={50}
                    value={activeSound.detune}
                    onChange={(e) => {
                      const nextVal = Number(e.target.value);
                      updateSoundTrack(selectedSoundTrack, { detune: nextVal }, (n) => {
                        midiEngine.applyTrackControlsNow(n.channel, { tuning: { enabled: true, detune: nextVal } }, n.label);
                      });
                    }}
                    className="w-full h-2.5 accent-[#FFB703] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STYLE & RHYTHM TRACKS FX MODE */
        <div className="space-y-4">
          {/* Quick Arranger Transport, Variation & Transpose Strip */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-black text-[#38BDF8] flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                <span>{isAr ? 'تحكم الإيقاع والأرانجر المباشر (Arranger Live)' : 'Live Arranger & Transpose Controls'}</span>
              </span>

              {/* Master Transpose - / + */}
              <div dir="ltr" className="flex items-center gap-1.5 bg-[#070B14] border border-[#1E293B] rounded-xl p-1">
                <span className="text-[11px] font-mono text-slate-400 px-2">Transpose:</span>
                <button
                  type="button"
                  onClick={() => {
                    if (isPageLocked) return;
                    const next = Math.max(-12, masterTranspose - 1);
                    setMasterTranspose(next);
                    midiEngine.sendTranspose(next);
                  }}
                  className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-lg"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono font-black text-sm text-[#FFB703]">
                  {masterTranspose > 0 ? `+${masterTranspose}` : masterTranspose}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (isPageLocked) return;
                    const next = Math.min(12, masterTranspose + 1);
                    setMasterTranspose(next);
                    midiEngine.sendTranspose(next);
                  }}
                  className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#1E293B] hover:border-[#FFB703] text-white font-black text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div dir="ltr" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              <button
                type="button"
                onClick={() => !isPageLocked && midiEngine.sendArrangerCommand('start')}
                className="min-h-[46px] rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500 text-emerald-300 text-xs font-black flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>START</span>
              </button>
              <button
                type="button"
                onClick={() => !isPageLocked && midiEngine.sendArrangerCommand('stop')}
                className="min-h-[46px] rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500 text-rose-300 text-xs font-black flex items-center justify-center gap-1.5"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>STOP</span>
              </button>
              {([1, 2, 3, 4] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    if (isPageLocked) return;
                    setActiveVar(v);
                    midiEngine.sendStyleElement('variation', v);
                  }}
                  className={`min-h-[46px] rounded-xl border text-xs font-black transition-all ${
                    activeVar === v
                      ? 'bg-[#FFB703] text-[#070B14] border-amber-200'
                      : 'bg-[#070B14] text-slate-200 border-[#1E293B] hover:border-slate-500'
                  }`}
                >
                  VAR {v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => !isPageLocked && midiEngine.sendStyleElement('break', 1)}
                className="min-h-[46px] rounded-xl bg-[#070B14] hover:bg-[#111827] border border-[#38BDF8]/50 text-[#38BDF8] text-xs font-black"
              >
                BREAK
              </button>
              <button
                type="button"
                onClick={() => !isPageLocked && midiEngine.sendArrangerCommand('fade')}
                className="min-h-[46px] rounded-xl bg-[#070B14] hover:bg-[#111827] border border-amber-500/40 text-amber-300 text-xs font-black"
              >
                FADE IN/OUT
              </button>
            </div>

            {/* Master Style FX A (Effect 1 CC#91 across all Ch 9-15 tracks) */}
            <div dir="ltr" className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#38BDF8] font-bold">
                  Master All Style FX A / Effect 1 (CC#91 · Ch 9–15)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0B1120] border border-[#1E293B] text-[#FFB703] font-black">
                  {masterStyleReverb}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={127}
                value={masterStyleReverb}
                onChange={(e) => {
                  if (isPageLocked) return;
                  const v = clampMidi(Number(e.target.value));
                  setMasterStyleReverb(v);
                  setStyleTracks((prev) => {
                    const next = { ...prev };
                    STYLE_TRACK_ORDER.forEach((sid) => {
                      next[sid] = { ...next[sid], reverbSend: v };
                      sendCC(next[sid].channel, 91, v, `All Style FX A (CC#91)=${v}`);
                    });
                    return next;
                  });
                }}
                className="w-full h-2.5 accent-[#38BDF8] cursor-pointer"
              />
            </div>
          </div>

          {/* 7 Rhythm / Style Channel Strips */}
          <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STYLE_TRACK_ORDER.map((id) => {
              const tr = styleTracks[id];
              const isSelected = selectedStyleTrack === id;
              return (
                <div
                  key={id}
                  className={`rounded-2xl border p-3.5 space-y-3 transition-all ${
                    isSelected
                      ? 'bg-[#0F172A] border-[#38BDF8] shadow-lg shadow-sky-950/40'
                      : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedStyleTrack(id)}
                      className="text-start flex-1 min-h-[44px] flex flex-col justify-center"
                    >
                      <span className={`text-sm font-black ${isSelected ? 'text-[#38BDF8]' : 'text-white'}`}>
                        {isAr ? tr.labelAr : tr.label}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">Ch {tr.channel}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !tr.muted;
                        updateStyleTrack(id, { muted: nextMuted }, (n) => {
                          sendCC(n.channel, 7, nextMuted ? 0 : n.volume, `${n.label} ${nextMuted ? 'MUTE' : `PLAY Vol=${n.volume}`}`);
                        });
                      }}
                      className={`min-h-[44px] min-w-[68px] px-2.5 rounded-xl font-black text-xs border flex items-center justify-center gap-1 transition-all active:scale-95 ${
                        tr.muted
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                      }`}
                    >
                      {tr.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      <span>{tr.muted ? 'MUTE' : 'PLAY'}</span>
                    </button>
                  </div>

                  {/* Volume + FX A Reverb Quick Controls */}
                  <div className="space-y-2">
                    <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">Vol (CC#7)</span>
                        <span className="text-[#FFB703] font-black">{tr.volume}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={127}
                        value={tr.volume}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateStyleTrack(id, { volume: v, muted: false }, (n) => {
                            sendCC(n.channel, 7, v, `${n.label} Volume=${v}`);
                          });
                        }}
                        className="w-full h-2.5 accent-[#FFB703] cursor-pointer"
                      />
                    </div>

                    <div className="bg-[#070B14] border border-[#1E293B] rounded-xl p-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400">FX A / Rev (CC#91)</span>
                        <span className="text-[#38BDF8] font-black">{tr.reverbSend}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={127}
                        value={tr.reverbSend}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          updateStyleTrack(id, { reverbSend: v }, (n) => {
                            sendCC(n.channel, 91, v, `${n.label} Reverb=${v}`);
                          });
                        }}
                        className="w-full h-2.5 accent-[#38BDF8] cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedStyleTrack(id)}
                    className={`w-full min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                      isSelected
                        ? 'bg-[#38BDF8] text-[#070B14] border-sky-200 font-black'
                        : 'bg-[#070B14] text-slate-300 border-[#1E293B] hover:border-slate-500'
                    }`}
                  >
                    {isAr ? (isSelected ? 'تفاصيل المؤثرات بالأسفل' : 'مؤثرات المسار') : (isSelected ? 'Editing Below' : 'Track FX Details')}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Selected Style Track Deep FX + Channel Mapper */}
          <div className="bg-[#0B1120] border border-[#1E293B] rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E293B] pb-3">
              <div>
                <h2 className="text-sm sm:text-base font-black text-[#F0F6FC]">
                  {isAr ? `تفاصيل مؤثرات مسار الإيقاع: ${activeStyle.labelAr}` : `Style Track FX: ${activeStyle.label}`}
                </h2>
                <p className="text-xs text-slate-400">
                  {isAr
                    ? 'يمكنك ضبط قناة MIDI (Ch 5–16) لكل مسار حسب إعدادات Global في Korg PA'
                    : 'Adjust MIDI Channel (Ch 5–16) to match your Korg PA Global Style MIDI IN setup'}
                </p>
              </div>

              <div dir="ltr" className="flex items-center gap-2 bg-[#070B14] border border-[#1E293B] rounded-xl p-1.5">
                <span className="text-xs font-mono text-slate-400 px-2">MIDI Ch:</span>
                <button
                  type="button"
                  onClick={() => updateStyleTrack(selectedStyleTrack, { channel: Math.max(5, activeStyle.channel - 1) })}
                  className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#1E293B] text-white font-black text-lg"
                >
                  −
                </button>
                <span className="w-10 text-center font-mono font-black text-sm text-[#38BDF8]">
                  {activeStyle.channel}
                </span>
                <button
                  type="button"
                  onClick={() => updateStyleTrack(selectedStyleTrack, { channel: Math.min(16, activeStyle.channel + 1) })}
                  className="w-10 h-10 rounded-lg bg-[#0B1120] border border-[#1E293B] text-white font-black text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <div dir="ltr" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {([
                { key: 'pan' as const, cc: 10, label: 'Pan L/R (CC#10)', min: 0, max: 127, signed: false },
                { key: 'chorusSend' as const, cc: 93, label: 'FX B / Chorus (CC#93)', min: 0, max: 127, signed: false },
                { key: 'delaySend' as const, cc: 94, label: 'Delay Send (CC#94)', min: 0, max: 127, signed: false },
                { key: 'cutoff' as const, cc: 74, label: 'Brightness / Cutoff (CC#74)', min: -64, max: 63, signed: true },
                { key: 'resonance' as const, cc: 71, label: 'Resonance (CC#71)', min: -64, max: 63, signed: true },
                { key: 'release' as const, cc: 72, label: 'Decay / Release (CC#72)', min: -64, max: 63, signed: true },
              ]).map((sl) => {
                const val = activeStyle[sl.key];
                return (
                  <div key={sl.key} className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-bold">{sl.label}</span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#0B1120] border border-[#1E293B] text-[#FFB703] font-black text-sm">
                        {sl.signed && val > 0 ? `+${val}` : val}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={sl.min}
                      max={sl.max}
                      value={val}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        updateStyleTrack(selectedStyleTrack, { [sl.key]: v }, (n) => {
                          sendCC(n.channel, sl.cc, sl.signed ? 64 + v : v, `${n.label} ${sl.label}=${v}`);
                        });
                      }}
                      className="w-full h-3 accent-[#38BDF8] cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      </fieldset>

      {toast && (
        <div className="fixed bottom-6 end-6 z-50 bg-[#0B1120] border border-[#38BDF8]/70 text-[#38BDF8] px-4 py-3 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-[#38BDF8]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
