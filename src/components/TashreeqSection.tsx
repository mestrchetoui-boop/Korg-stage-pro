import React, { useState } from 'react';
import { NoteName, NoteTuning, MaqamPreset } from '../types';
import { NOTE_NAMES, NOTE_ARABIC_NAMES, MAQAMAT_PRESETS } from '../data/korgPresets';
import { midiEngine } from '../services/midiEngine';
import { audioEngine } from '../services/audioEngine';
import { sendYamahaScaleTuning, YamahaModelId, getYamahaModelSpec } from '../services/yamahaMidi';
import { isMaqamIndexUnlocked, canUseProFeature } from '../services/licenseService';
import { Sliders, RotateCcw, Play, Sparkles, Volume2, AlertTriangle, Send, Usb, Lock } from 'lucide-react';

interface TashreeqSectionProps {
  tunings: Record<NoteName, NoteTuning>;
  setTunings: React.Dispatch<React.SetStateAction<Record<NoteName, NoteTuning>>>;
  isPro: boolean;
  onRequirePro: (featureLabel?: string) => void;
  lang: 'ar' | 'en';
  activeBrand?: 'korg' | 'yamaha';
  yamahaModel?: YamahaModelId;
}

export const TashreeqSection: React.FC<TashreeqSectionProps> = ({
  tunings,
  setTunings,
  isPro,
  onRequirePro,
  lang,
  activeBrand = 'korg',
  yamahaModel = 'psr_a5000',
}) => {
  const isAr = lang === 'ar';

  const [selectedMaqamId, setSelectedMaqamId] = useState<string>('equal');
  const [selectedRoot, setSelectedRoot] = useState<NoteName>('D');
  const [sysexBlocked, setSysexBlocked] = useState<boolean>(
    () => midiEngine.hasConnectedOutput() && !midiEngine.isSysExEnabled()
  );
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 2600);
  };

  const buildTuningsFromNotes = (quarterNotes: NoteName[]): Record<NoteName, NoteTuning> => {
    const next: Record<NoteName, NoteTuning> = {} as Record<NoteName, NoteTuning>;
    NOTE_NAMES.forEach((n) => {
      const isTuned = quarterNotes.includes(n);
      next[n] = {
        note: n,
        nameAr: NOTE_ARABIC_NAMES[n].ar,
        nameEn: n,
        isQuarterTone: isTuned,
        cents: isTuned ? -50 : 0,
      };
    });
    return next;
  };

  const applyAndSendTunings = (next: Record<NoteName, NoteTuning>, label: string, previewMidi?: number) => {
    setTunings(next);
    audioEngine.setTunings(next);
    if (previewMidi !== undefined) {
      audioEngine.playPreviewNote(previewMidi, 420);
    }
    const res =
      activeBrand === 'yamaha'
        ? sendYamahaScaleTuning(next, yamahaModel)
        : midiEngine.sendQuarterToneScale(next);
    setSysexBlocked(res.sysexBlocked);
    if (res.sysexBlocked) {
      showToast(
        isAr
          ? 'صلاحية SysEx محظورة! افتح التطبيق في متصفح يدعم Web MIDI مباشرة أو فعّل وضع Pitch-Bend.'
          : 'SysEx blocked by browser! Open directly in a Web MIDI browser or switch to Pitch-Bend mode.'
      );
    } else {
      showToast(
        activeBrand === 'yamaha'
          ? `${label} · ${getYamahaModelSpec(yamahaModel).shortLabel}`
          : label
      );
    }
  };

  const handleSelectMaqam = (maqam: MaqamPreset) => {
    setSelectedMaqamId(maqam.id);
    setSelectedRoot(maqam.rootNote);
    const next = buildTuningsFromNotes(maqam.quarterNotes);
    const rootIdx = NOTE_NAMES.indexOf(maqam.rootNote);
    applyAndSendTunings(
      next,
      isAr ? `تم تفعيل مقام: ${maqam.nameAr}` : `Activated: ${maqam.nameEn}`,
      60 + (rootIdx >= 0 ? rootIdx : 0)
    );
  };

  const handleToggleNote = (note: NoteName) => {
    if (!canUseProFeature('manual_tashreeq', isPro)) {
      onRequirePro(isAr ? 'أزرار التشريق اليدوي المباشر' : 'Direct Manual Quarter-Tone Tuning');
      return;
    }
    setSelectedMaqamId('custom');
    const current = tunings[note];
    const nextIsQuarter = !current.isQuarterTone;
    const next: Record<NoteName, NoteTuning> = {
      ...tunings,
      [note]: {
        ...current,
        isQuarterTone: nextIsQuarter,
        cents: nextIsQuarter ? -50 : 0,
      },
    };
    const midiNote = 60 + NOTE_NAMES.indexOf(note);
    applyAndSendTunings(
      next,
      nextIsQuarter
        ? (isAr ? `تشريق ${NOTE_ARABIC_NAMES[note].ar} (-50¢)` : `Tuned ${note} (-50¢)`)
        : (isAr ? `إلغاء تشريق ${NOTE_ARABIC_NAMES[note].ar} (0¢)` : `Reset ${note} (0¢)`),
      midiNote
    );
  };

  const handleReset = () => {
    setSelectedMaqamId('equal');
    const next = buildTuningsFromNotes([]);
    applyAndSendTunings(
      next,
      isAr ? 'تمت إعادة الضبط إلى السلم الطبيعي (Equal Temp)' : 'Reset to Natural Scale (Equal Temp)'
    );
  };

  const handleAudition = () => {
    audioEngine.setTunings(tunings);
    const rootOffset = NOTE_NAMES.indexOf(selectedRoot);
    audioEngine.playScaleAudition(60 + (rootOffset >= 0 ? rootOffset : 0));
  };

  const activeNotes = NOTE_NAMES.filter((n) => tunings[n]?.isQuarterTone);
  const whiteKeys = NOTE_NAMES.filter((n) => !n.includes('#'));
  const blackKeys: { note: NoteName; boundary: number }[] = [
    { note: 'C#', boundary: 1 },
    { note: 'D#', boundary: 2 },
    { note: 'F#', boundary: 4 },
    { note: 'G#', boundary: 5 },
    { note: 'A#', boundary: 6 },
  ];

  return (
    <div className="space-y-6">

      {/* Top Controls Card */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/15">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#FACC15]" />
              <span>{isAr ? 'تشريق المقامات الشرقية (Quarter-Tone Scale)' : 'Oriental Quarter-Tone Scale Tuning'}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {activeBrand === 'yamaha'
                ? (isAr
                    ? `وضع ${getYamahaModelSpec(yamahaModel).label}: يرسل أوامر Yamaha Scale Tuning SysEx (F0 43 10 4C 08 00 41).`
                    : `${getYamahaModelSpec(yamahaModel).label} mode: sends Yamaha Scale Tuning SysEx (F0 43 10 4C 08 00 41).`)
                : (isAr
                    ? 'اضغط على أي مقام أو نوتة لإرسال التشريق مباشرة إلى أورغ KORG (لا يتم إرسال أي تشريق تلقائياً عند فتح التطبيق).'
                    : 'Tap any Maqam or note key to send tuning directly to your KORG (nothing is sent automatically on startup).')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleAudition}
              className="px-3 py-1.5 rounded-lg hardware-keycap-gold text-[#030508] border-[1.5px] border-[#FFF08A]/80 text-xs font-black flex items-center gap-1.5 active-press"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isAr ? 'سماع السلم' : 'Audition'}</span>
            </button>

            <button
              onClick={() => applyAndSendTunings(tunings, isAr ? 'تم إرسال التشريق الحالي للأورج' : 'Sent current tuning to KORG')}
              className="px-3 py-1.5 rounded-lg crystal-sapphire-jewel text-sky-100 border-[1.5px] text-xs font-bold flex items-center gap-1.5 active-press"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال للأورج' : 'Send SysEx'}</span>
            </button>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg hardware-keycap-dark border-[1.5px] text-neutral-200 text-xs font-bold flex items-center gap-1.5 active-press"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة ضبط (طبيعي)' : 'Reset (Natural)'}</span>
            </button>
          </div>
        </div>

        {/* Active Scale Summary */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#030508] border-[1.5px] border-white/15 rounded-xl px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#FACC15] shrink-0" />
            <span className="text-neutral-400">{isAr ? 'النغمات المشرّقة حالياً:' : 'Active Quarter-Tones:'}</span>
            <span className="font-mono font-bold text-[#FFF08A]">
              {activeNotes.length > 0
                ? activeNotes.map((n) => `${NOTE_ARABIC_NAMES[n].ar} (${n}) -50¢`).join(' · ')
                : (isAr ? 'سلم طبيعي (Equal Temperament - 0¢)' : 'Natural (Equal Temperament - 0¢)')}
            </span>
          </div>

          {statusToast && (
            <span className="text-emerald-300 font-bold text-xs">
              {statusToast}
            </span>
          )}
        </div>

        {sysexBlocked && (
          <div className="bg-red-950/50 border border-red-500/50 rounded-lg p-3 text-xs text-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>
                {isAr
                  ? 'صلاحية SysEx محجوبة في المتصفح. افتح الرابط مباشرة في متصفح يدعم Web MIDI واضغط السماح بـ MIDI SysEx.'
                  : 'SysEx permission is blocked in this browser context. Open directly in a Web MIDI browser and allow MIDI SysEx.'}
              </span>
            </div>
            <button
              onClick={async () => {
                const res = await midiEngine.initialize();
                setSysexBlocked(midiEngine.hasConnectedOutput() && !res.sysex);
              }}
              className="px-3 py-1.5 rounded bg-amber-500 text-neutral-950 font-bold text-xs flex items-center gap-1 self-start shrink-0"
            >
              <Usb className="w-3.5 h-3.5" />
              <span>{isAr ? 'طلب صلاحية SysEx' : 'Allow SysEx'}</span>
            </button>
          </div>
        )}

        {/* Interactive 12-Note Quarter-Tone 8K Crystal Keys */}
        <div dir="ltr" className="relative h-48 sm:h-56 w-full select-none oled-subpanel rounded-xl p-2 border-[1.5px] border-white/15">
          {!isPro && (
            <button
              type="button"
              onClick={() => onRequirePro(isAr ? 'أزرار التشريق اليدوي المباشر' : 'Direct Manual Quarter-Tone Tuning')}
              className="absolute top-3 end-3 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#030508]/90 border-[1.5px] border-[#FACC15]/70 text-[#FFF08A] text-[10px] font-black shadow-lg"
            >
              <Lock className="w-3 h-3" />
              <span>PRO</span>
            </button>
          )}
          <div className="flex h-full w-full gap-1">
            {whiteKeys.map((note) => {
              const isTuned = tunings[note]?.isQuarterTone;
              return (
                <button
                  key={note}
                  onClick={() => handleToggleNote(note)}
                  className={`flex-1 h-full rounded-b-lg border-[1.5px] flex flex-col justify-end pb-3 items-center active-press ${
                    !isPro
                      ? 'crystal-piano-blue opacity-70 text-white'
                      : isTuned
                      ? 'crystal-piano-gold border-[#FEF9C3] text-[#030508] led-glow-gold'
                      : 'crystal-piano-blue text-white'
                  }`}
                >
                  {!isPro ? (
                    <Lock className="w-3 h-3 text-[#FFF08A] mb-1" />
                  ) : isTuned ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#030508] text-[#FFF08A] text-[10px] font-mono font-black mb-1 shadow">
                      -50¢
                    </span>
                  ) : null}
                  <span className="font-black text-sm font-mono">{note}</span>
                  <span className="text-[11px] font-bold opacity-90">{NOTE_ARABIC_NAMES[note].ar}</span>
                </button>
              );
            })}
          </div>

          <div className="absolute inset-x-2 top-2 h-28 sm:h-32 pointer-events-none">
            {blackKeys.map((bk) => {
              const isTuned = tunings[bk.note]?.isQuarterTone;
              return (
                <button
                  key={bk.note}
                  onClick={() => handleToggleNote(bk.note)}
                  style={{ left: `${(bk.boundary / 7) * 100}%`, width: '9.5%' }}
                  className={`pointer-events-auto absolute top-0 -translate-x-1/2 h-full rounded-b-md border-[1.5px] flex flex-col justify-end pb-2 items-center z-10 active-press ${
                    !isPro
                      ? 'crystal-piano-obsidian text-neutral-400'
                      : isTuned
                      ? 'crystal-piano-gold text-[#030508] border-[#FEF9C3] led-glow-gold'
                      : 'crystal-piano-obsidian hover:brightness-125 text-white'
                  }`}
                >
                  {!isPro ? (
                    <Lock className="w-2.5 h-2.5 text-[#FFF08A] mb-0.5" />
                  ) : isTuned ? (
                    <span className="px-1 rounded bg-[#030508] text-[#FFF08A] text-[9px] font-mono font-black mb-0.5">
                      -50
                    </span>
                  ) : null}
                  <span className="text-[10px] font-mono font-bold">{bk.note}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Maqamat Presets Grid */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FACC15]" />
            <span>{isAr ? 'مكتبة المقامات الشرقية الجاهزة' : 'Oriental Maqamat Presets'}</span>
          </h3>
          <span className="text-xs text-neutral-400 font-mono">
            {MAQAMAT_PRESETS.length} {isAr ? 'مقام' : 'Maqams'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MAQAMAT_PRESETS.map((maqam, idx) => {
            const isLocked = !isMaqamIndexUnlocked(idx, isPro);
            const isSelected = selectedMaqamId === maqam.id;
            return (
              <button
                key={maqam.id}
                onClick={() => {
                  if (isLocked) {
                    onRequirePro(isAr ? maqam.nameAr : maqam.nameEn);
                    return;
                  }
                  handleSelectMaqam(maqam);
                }}
                className={`relative text-start p-3.5 rounded-xl border-[1.5px] transition-all active:scale-[0.98] space-y-1.5 ${
                  isLocked
                    ? 'bg-[#030508]/70 border-white/10 opacity-75 hover:border-[#FACC15]/40'
                    : isSelected
                    ? 'bg-[#FACC15]/15 border-[#FACC15] ring-1 ring-[#FFF08A]/50 shadow-[0_0_20px_rgba(250,204,21,0.3)]'
                    : 'bg-[#030508]/90 border-white/15 hover:border-white/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{isAr ? maqam.nameAr : maqam.nameEn}</span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#FACC15]/20 border border-[#FACC15]/45 text-[#FFF08A] text-[9px] font-black">
                        <Lock className="w-2.5 h-2.5" />
                        PRO
                      </span>
                    )}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#030508] border border-white/15 text-[10px] font-mono text-[#FACC15] shrink-0">
                    {maqam.quarterNotes.length > 0 ? maqam.quarterNotes.join(' + ') : '0¢'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {isAr ? maqam.descriptionAr : maqam.descriptionEn}
                </p>
                <div className="text-[10px] font-bold text-cyan-300">
                  {maqam.character}
                </div>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
};
