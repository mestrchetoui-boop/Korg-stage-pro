import React, { useState, useEffect, useRef } from 'react';
import { KorgStyle, StyleVariation, StyleFill, StyleIntro, StyleEnding } from '../types';
import { KORG_STYLE_LIBRARY } from '../data/korgPresets';
import { midiEngine } from '../services/midiEngine';
import { audioEngine } from '../services/audioEngine';
import { Play, Square, FastForward, Rewind, Radio, Volume2, Sparkles, Sliders } from 'lucide-react';

interface StyleSectionProps {
  lang: 'ar' | 'en';
}

export const StyleSection: React.FC<StyleSectionProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  const [selectedStyle, setSelectedStyle] = useState<KorgStyle>(() => {
    try {
      const id = localStorage.getItem('korg_style_selected_id');
      return (id && KORG_STYLE_LIBRARY.find(s => s.id === id)) || KORG_STYLE_LIBRARY[0];
    } catch { return KORG_STYLE_LIBRARY[0]; }
  });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [bpm, setBpm] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('korg_style_bpm'));
      return !isNaN(n) && n >= 40 && n <= 260 ? n : 118;
    } catch { return 118; }
  });
  const [activeVariation, setActiveVariation] = useState<StyleVariation>(() => {
    try {
      const n = Number(localStorage.getItem('korg_style_variation'));
      return n >= 1 && n <= 4 ? (n as StyleVariation) : 1;
    } catch { return 1; }
  });
  const [activeFill, setActiveFill] = useState<StyleFill | null>(null);
  const [activeIntro, setActiveIntro] = useState<StyleIntro | null>(null);
  const [activeEnding, setActiveEnding] = useState<StyleEnding | null>(null);
  const [isSynchroStart, setIsSynchroStart] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<'all' | 'egyptian' | 'levantine' | 'gulf' | 'north_african'>(() => {
    try {
      const s = localStorage.getItem('korg_style_category');
      if (s === 'all' || s === 'egyptian' || s === 'levantine' || s === 'gulf' || s === 'north_african') return s;
    } catch {}
    return 'all';
  });
  const [audioPreviewActive, setAudioPreviewActive] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('korg_style_audio_preview');
      return s !== null ? s === 'true' : true;
    } catch { return true; }
  });
  const [styleToast, setStyleToast] = useState<string | null>(null);

  useEffect(() => {
    try { localStorage.setItem('korg_style_selected_id', selectedStyle.id); } catch {}
  }, [selectedStyle]);
  useEffect(() => {
    try { localStorage.setItem('korg_style_bpm', String(bpm)); } catch {}
  }, [bpm]);
  useEffect(() => {
    try { localStorage.setItem('korg_style_variation', String(activeVariation)); } catch {}
  }, [activeVariation]);
  useEffect(() => {
    try { localStorage.setItem('korg_style_category', activeCategory); } catch {}
  }, [activeCategory]);
  useEffect(() => {
    try { localStorage.setItem('korg_style_audio_preview', String(audioPreviewActive)); } catch {}
  }, [audioPreviewActive]);

  // Tap tempo state
  const tapTimesRef = useRef<number[]>([]);

  const showToast = (msg: string) => {
    setStyleToast(msg);
    setTimeout(() => setStyleToast(null), 2500);
  };

  useEffect(() => {
    const unsub = audioEngine.subscribeStep((step) => {
      setCurrentStep(step);
    });
    return () => unsub();
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      // STOP
      setIsPlaying(false);
      audioEngine.stopRhythm();
      midiEngine.sendArrangerCommand('stop');
      showToast(isAr ? 'إيقاف الإيقاع (Stop)' : 'Arranger Stopped');
    } else {
      // START
      setIsPlaying(true);
      if (audioPreviewActive) {
        audioEngine.startRhythm(selectedStyle, bpm);
      }
      midiEngine.sendArrangerCommand('start');
      showToast(isAr ? `تشغيل الإيقاع: ${selectedStyle.nameAr}` : `Playing: ${selectedStyle.nameEn}`);
    }
  };

  const handleSelectStyle = (style: KorgStyle) => {
    setSelectedStyle(style);
    setBpm(style.bpm);
    midiEngine.sendStyleSelect(style.msb, style.lsb, style.pc, style.nameAr);

    if (isPlaying && audioPreviewActive) {
      audioEngine.startRhythm(style, style.bpm);
    }
    showToast(isAr ? `تم اختيار إيقاع: ${style.nameAr}` : `Selected: ${style.nameEn}`);
  };

  const handleVariationChange = (varNum: StyleVariation) => {
    setActiveVariation(varNum);
    midiEngine.sendStyleElement('variation', varNum);
    audioEngine.toggleVariation();
    showToast(isAr ? `تنويع الإيقاع Variation ${varNum}` : `Variation ${varNum}`);
  };

  const handleFillTrigger = (fillNum: StyleFill) => {
    setActiveFill(fillNum);
    midiEngine.sendStyleElement('fill', fillNum);
    audioEngine.triggerFill();
    showToast(isAr ? `قفلة إيقاعية Fill ${fillNum}` : `Fill In ${fillNum}`);
    setTimeout(() => setActiveFill(null), 1500);
  };

  const handleBreakTrigger = () => {
    midiEngine.sendStyleElement('break', 1);
    audioEngine.triggerFill();
    showToast(isAr ? 'سكتة / كسرة Break' : 'Break Triggered');
  };

  const handleIntroTrigger = (introNum: StyleIntro) => {
    setActiveIntro(introNum);
    midiEngine.sendStyleElement('intro', introNum);
    if (!isPlaying) {
      handleTogglePlay();
    }
    showToast(isAr ? `مقدمة Intro ${introNum}` : `Intro ${introNum}`);
    setTimeout(() => setActiveIntro(null), 3000);
  };

  const handleEndingTrigger = (endNum: StyleEnding) => {
    setActiveEnding(endNum);
    midiEngine.sendStyleElement('ending', endNum);
    showToast(isAr ? `خاتمة Ending ${endNum}` : `Ending ${endNum}`);
    setTimeout(() => {
      setActiveEnding(null);
      if (isPlaying) handleTogglePlay();
    }, 3500);
  };

  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.max(40, Math.min(260, newBpm));
    setBpm(clamped);
    audioEngine.setTempo(clamped);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const tapTimes = tapTimesRef.current;
    
    // Reset if last tap was more than 2 seconds ago
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
      tapTimesRef.current = [now];
      return;
    }

    tapTimes.push(now);
    if (tapTimes.length > 4) {
      tapTimes.shift();
    }

    if (tapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < tapTimes.length; i++) {
        intervals.push(tapTimes[i] - tapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      handleBpmChange(calculatedBpm);
      midiEngine.sendArrangerCommand('tap_tempo');
    }
  };

  const filteredStyles = activeCategory === 'all'
    ? KORG_STYLE_LIBRARY
    : KORG_STYLE_LIBRARY.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">

      {/* Main KORG Arranger Physical Hardware Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-2xl space-y-5">
        
        {/* Upper Arranger Status & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          
          <div className="flex items-center gap-4">
            {/* Illuminated Big START / STOP Button */}
            <button
              onClick={handleTogglePlay}
              className={`flex items-center gap-2.5 px-6 py-4 rounded-xl font-black text-sm tracking-wide transition-all shadow-lg active:scale-95 ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white led-glow-red'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-neutral-950 led-glow-emerald'
              }`}
            >
              {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              <span>{isPlaying ? (isAr ? 'إيقاف (STOP)' : 'STOP') : (isAr ? 'تشغيل (START)' : 'START')}</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold text-white">
                  {isAr ? selectedStyle.nameAr : selectedStyle.nameEn}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
                  {selectedStyle.timeSignature}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr ? selectedStyle.descriptionAr : selectedStyle.descriptionEn}
              </p>
            </div>
          </div>

          {/* Tempo BPM & Tap Tempo Module */}
          <div className="flex items-center gap-3 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 self-start lg:self-auto">
            <div className="text-center px-2">
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-mono">TEMPO</span>
              <span className="text-2xl font-black font-mono text-amber-400 tabular-nums">
                {bpm}
              </span>
              <span className="text-[9px] text-neutral-500 block">BPM</span>
            </div>

            {/* Stepper +/- */}
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleBpmChange(bpm + 1)}
                className="w-7 h-6 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-bold flex items-center justify-center"
              >
                +
              </button>
              <button
                onClick={() => handleBpmChange(bpm - 1)}
                className="w-7 h-6 bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs font-bold flex items-center justify-center"
              >
                -
              </button>
            </div>

            {/* Tap Tempo & Speed Multipliers */}
            <div className="flex flex-col gap-1 border-s border-neutral-800 ps-3">
              <button
                onClick={handleTapTempo}
                className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded text-xs font-bold transition-all active:scale-95"
              >
                TAP TEMPO
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleBpmChange(Math.round(bpm / 2))}
                  className="px-1.5 py-0.5 bg-neutral-800 text-[10px] text-neutral-400 hover:text-white rounded"
                  title="Half Time"
                >
                  ½x
                </button>
                <button
                  onClick={() => handleBpmChange(Math.round(bpm * 2))}
                  className="px-1.5 py-0.5 bg-neutral-800 text-[10px] text-neutral-400 hover:text-white rounded"
                  title="Double Time"
                >
                  2x
                </button>
              </div>
            </div>

            {/* Audio Preview Sound Switch */}
            <div className="border-s border-neutral-800 ps-3 flex flex-col items-center">
              <span className="text-[9px] text-neutral-400 whitespace-nowrap mb-1">
                {isAr ? 'صوت مباشر' : 'Audio Web'}
              </span>
              <button
                onClick={() => {
                  setAudioPreviewActive(!audioPreviewActive);
                  if (isPlaying && audioPreviewActive) audioEngine.stopRhythm();
                  if (isPlaying && !audioPreviewActive) audioEngine.startRhythm(selectedStyle, bpm);
                }}
                className={`p-1.5 rounded transition-colors ${
                  audioPreviewActive
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
                title={isAr ? 'تشغيل/كتم الصوت من المتصفح' : 'Toggle Browser Audio'}
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* Variations 1-4, Fills 1-3, Intro 1-3, Ending 1-3 Console */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Variations 1 - 4 */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 space-y-2">
            <span className="text-[11px] font-mono font-bold text-neutral-400 block text-center uppercase tracking-wider">
              {isAr ? 'تنويعات الإيقاع (Variations)' : 'Variations'}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3, 4] as const).map((v) => {
                const isActive = activeVariation === v;
                return (
                  <button
                    key={v}
                    onClick={() => handleVariationChange(v)}
                    className={`py-3 rounded font-mono font-black text-xs transition-all active:scale-95 flex flex-col items-center gap-1 ${
                      isActive
                        ? 'bg-amber-500 text-neutral-950 led-glow-amber'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <span>V{v}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-neutral-950' : 'bg-neutral-700'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fills 1 - 3 & Break */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 space-y-2">
            <span className="text-[11px] font-mono font-bold text-neutral-400 block text-center uppercase tracking-wider">
              {isAr ? 'القفلات والسكتات (Fills & Break)' : 'Fills & Break'}
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 2, 3] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => handleFillTrigger(f)}
                  className={`py-3 rounded font-mono font-bold text-xs transition-all active:scale-95 ${
                    activeFill === f
                      ? 'bg-cyan-500 text-neutral-950 led-glow-cyan'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  F{f}
                </button>
              ))}
              <button
                onClick={handleBreakTrigger}
                className="py-3 rounded font-mono font-bold text-[10px] bg-red-950/70 text-red-200 hover:bg-red-900 border border-red-800/80 transition-all active:scale-95"
              >
                BRK
              </button>
            </div>
          </div>

          {/* Intros 1 - 3 */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 space-y-2">
            <span className="text-[11px] font-mono font-bold text-neutral-400 block text-center uppercase tracking-wider">
              {isAr ? 'المقدمات (Intros)' : 'Intros'}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => handleIntroTrigger(i)}
                  className={`py-3 rounded font-mono font-bold text-xs transition-all active:scale-95 ${
                    activeIntro === i
                      ? 'bg-emerald-500 text-neutral-950 led-glow-emerald'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  IN{i}
                </button>
              ))}
            </div>
          </div>

          {/* Endings 1 - 3 */}
          <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/90 space-y-2">
            <span className="text-[11px] font-mono font-bold text-neutral-400 block text-center uppercase tracking-wider">
              {isAr ? 'الخاتمات (Endings)' : 'Endings'}
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {([1, 2, 3] as const).map((e) => (
                <button
                  key={e}
                  onClick={() => handleEndingTrigger(e)}
                  className={`py-3 rounded font-mono font-bold text-xs transition-all active:scale-95 ${
                    activeEnding === e
                      ? 'bg-amber-600 text-white led-glow-amber'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800'
                  }`}
                >
                  ED{e}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 16-Step Real-time Drum Rhythm Sequencer Visualizer */}
        <div className="bg-neutral-950 p-3.5 rounded-lg border border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span className="text-amber-400 font-bold">
              {isAr ? 'شريط نبضات الإيقاع المباشر (16-Step Grid):' : 'Live 16-Step Beat Tracker:'}
            </span>
            <span>
              {isAr ? `الخطوة: ${(currentStep + 1)} / 16` : `Step: ${currentStep + 1} / 16`}
            </span>
          </div>

          {/* 16-LED Grid */}
          <div className="grid grid-cols-16 gap-1 sm:gap-1.5 py-1">
            {Array.from({ length: 16 }).map((_, stepIdx) => {
              const isCurrent = isPlaying && currentStep === stepIdx;
              const hasDum = selectedStyle.pattern.dum.includes(stepIdx);
              const hasTak = selectedStyle.pattern.tak.includes(stepIdx);
              const isDownbeat = stepIdx % 4 === 0;

              return (
                <div
                  key={stepIdx}
                  className={`h-9 sm:h-11 rounded flex flex-col items-center justify-between py-1 transition-all text-[9px] font-mono font-bold ${
                    isCurrent
                      ? 'bg-amber-400 text-neutral-950 shadow-md ring-2 ring-amber-300 scale-105'
                      : isDownbeat
                      ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                      : 'bg-neutral-900 text-neutral-500 border border-neutral-800/80'
                  }`}
                >
                  <span>{stepIdx + 1}</span>
                  <div className="w-1.5 h-1.5 rounded-full">
                    {hasDum && <span className="block w-2 h-2 rounded-full bg-red-400" title="Dum (دم)" />}
                    {!hasDum && hasTak && <span className="block w-1.5 h-1.5 rounded-full bg-cyan-400" title="Tak (تك)" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[10px] text-neutral-400 pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>{isAr ? 'دم (Dum - ثقيل)' : 'Dum (Bass)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span>{isAr ? 'تك (Tak - حاد)' : 'Tak (Rim/Snare)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>{isAr ? 'رق وشخاليل (Riq / Jingles)' : 'Riq / Jingles'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Style Browser & Category Selector */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-amber-400" />
              <span>{isAr ? 'بنك الإيقاعات العربية والشرقية (Korg Style Library)' : 'KORG Oriental Style Library'}</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isAr ? 'اختر أي إيقاع ليتم تنشيطه على أورغ كورج مع مطابقة السرعة والميزان وتوزيع الآلات الإيقاعية' : 'Select a rhythm style to trigger on Korg Pa and play through web audio'}
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-medium self-start sm:self-auto">
            {[
              { id: 'all', ar: 'جميع الإيقاعات', en: 'All' },
              { id: 'egyptian', ar: 'مصري وشعبي', en: 'Egyptian' },
              { id: 'levantine', ar: 'شامي وعراقي', en: 'Levantine' },
              { id: 'gulf', ar: 'خليجي وحجازي', en: 'Gulf' },
              { id: 'north_african', ar: 'مغاربي وراي', en: 'Maghrebi' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 ${
                  activeCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {isAr ? cat.ar : cat.en}
              </button>
            ))}
          </div>
        </div>

        {/* Styles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredStyles.map((style) => {
            const isSelected = selectedStyle.id === style.id;
            return (
              <button
                key={style.id}
                onClick={() => handleSelectStyle(style)}
                className={`p-4 rounded-xl border text-start transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-neutral-800 border-amber-500 shadow-md ring-1 ring-amber-500/40'
                    : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-800/50 hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-neutral-100'}`}>
                      {isAr ? style.nameAr : style.nameEn}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-amber-400">
                      {style.bpm} BPM
                    </span>
                  </div>

                  <p className="mt-1.5 text-xs text-neutral-400 leading-relaxed">
                    {isAr ? style.descriptionAr : style.descriptionEn}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                  <span>{style.timeSignature}</span>
                  <span className="text-neutral-400">
                    MSB {style.msb} · PC {style.pc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>

      {/* Floating notification feedback */}
      {styleToast && (
        <div className="fixed bottom-6 end-6 z-50 bg-neutral-900 border border-amber-500 text-amber-300 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold">
          {styleToast}
        </div>
      )}

    </div>
  );
};
