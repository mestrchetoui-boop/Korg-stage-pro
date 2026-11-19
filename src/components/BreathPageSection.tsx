import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Wind, Mic, MicOff, RotateCcw, AlertCircle, SlidersHorizontal } from 'lucide-react';
import { sendBreathControllerCh1 } from '../services/korgExtraMidi';

interface BreathPageSectionProps {
  lang: 'ar' | 'en';
}

export const BreathPageSection: React.FC<BreathPageSectionProps> = ({ lang }) => {
  const isAr = lang === 'ar';

  const [breathValue, setBreathValue] = useState<number>(0); // 0..127
  const [breathMode, setBreathMode] = useState<'auto_zero' | 'hold'>(() => {
    try {
      const saved = localStorage.getItem('korg_breath_mode_v1');
      return saved === 'hold' ? 'hold' : 'auto_zero';
    } catch {
      return 'auto_zero';
    }
  });
  const [sensitivity, setSensitivity] = useState<number>(() => {
    try {
      const saved = Number(localStorage.getItem('korg_mic_breath_sens_v1'));
      return saved >= 1 && saved <= 5 ? saved : 2.6;
    } catch {
      return 2.6;
    }
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [micLevelPct, setMicLevelPct] = useState<number>(0);
  const [micError, setMicError] = useState<string | null>(null);

  const sliderRef = useRef<HTMLDivElement>(null);
  const currentValueRef = useRef<number>(0);
  const lastSentValueRef = useRef<number>(-1);
  const returnRafRef = useRef<number | null>(null);

  // Web Audio Mic Breath Sensor refs
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRafRef = useRef<number | null>(null);
  const smoothedMicValRef = useRef<number>(0);
  const sensitivityRef = useRef<number>(sensitivity);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
    try {
      localStorage.setItem('korg_mic_breath_sens_v1', String(sensitivity));
    } catch {}
  }, [sensitivity]);

  useEffect(() => {
    try {
      localStorage.setItem('korg_breath_mode_v1', breathMode);
    } catch {}
  }, [breathMode]);

  const cancelReturnAnim = useCallback(() => {
    if (returnRafRef.current !== null) {
      cancelAnimationFrame(returnRafRef.current);
      returnRafRef.current = null;
    }
  }, []);

  const transmitBreathValue = useCallback((rawVal: number, force: boolean = false) => {
    const clamped = Math.max(0, Math.min(127, Math.round(rawVal)));
    currentValueRef.current = clamped;
    setBreathValue(clamped);

    if (force || clamped !== lastSentValueRef.current) {
      lastSentValueRef.current = clamped;
      sendBreathControllerCh1(clamped);
    }
  }, []);

  const stopMicSensor = useCallback(
    (resetOutput: boolean = true) => {
      if (micRafRef.current !== null) {
        cancelAnimationFrame(micRafRef.current);
        micRafRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
      smoothedMicValRef.current = 0;
      setMicLevelPct(0);
      setIsMicActive(false);

      if (resetOutput && breathMode === 'auto_zero') {
        transmitBreathValue(0, true);
      }
    },
    [breathMode, transmitBreathValue]
  );

  useEffect(() => {
    return () => {
      cancelReturnAnim();
      stopMicSensor(false);
    };
  }, [cancelReturnAnim, stopMicSensor]);

  const handleResetZero = useCallback(() => {
    cancelReturnAnim();
    smoothedMicValRef.current = 0;
    transmitBreathValue(0, true);
  }, [cancelReturnAnim, transmitBreathValue]);

  const updateSliderFromClientX = useCallback(
    (clientX: number, forceSend: boolean = false) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relativeX = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
      const nextVal = Math.round(ratio * 127);
      transmitBreathValue(nextVal, forceSend);
    },
    [transmitBreathValue]
  );

  const handleReleaseSlider = useCallback(() => {
    setIsDragging(false);
    if (breathMode === 'hold' || isMicActive) return;

    const startVal = currentValueRef.current;
    if (startVal <= 0) {
      transmitBreathValue(0, true);
      return;
    }

    cancelReturnAnim();
    const durationMs = 180;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2);
      const nextVal = Math.round(startVal * (1 - eased));
      if (progress >= 1 || nextVal <= 1) {
        transmitBreathValue(0, true);
        return;
      }
      transmitBreathValue(nextVal, false);
      returnRafRef.current = requestAnimationFrame(step);
    };
    returnRafRef.current = requestAnimationFrame(step);
  }, [breathMode, isMicActive, cancelReturnAnim, transmitBreathValue]);

  const startMicSensor = async () => {
    setMicError(null);
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setMicError(
        isAr
          ? 'المتصفح أو الجهاز لا يدعم الوصول إلى الميكروفون.'
          : 'Microphone input is not supported in this browser or context.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      smoothedMicValRef.current = currentValueRef.current;
      setIsMicActive(true);

      const timeData = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(timeData);

        let sumSq = 0;
        for (let i = 0; i < timeData.length; i++) {
          const sample = (timeData[i] - 128) / 128;
          sumSq += sample * sample;
        }
        const rms = Math.sqrt(sumSq / timeData.length);

        // Noise floor gate + sensitivity scaling for blowing/airflow
        const noiseFloor = 0.015;
        const effective = Math.max(0, rms - noiseFloor);
        const scaled = Math.min(1, effective * sensitivityRef.current * 4.2);
        const targetMidi = Math.round(scaled * 127);

        // Fast attack for responsive swell, smooth release for natural wind/string sustain
        const prev = smoothedMicValRef.current;
        const coeff = targetMidi >= prev ? 0.42 : 0.14;
        const smoothed = prev + (targetMidi - prev) * coeff;
        smoothedMicValRef.current = smoothed;

        const outVal = smoothed < 1.5 ? 0 : Math.min(127, Math.round(smoothed));
        setMicLevelPct(Math.round((outVal / 127) * 100));
        transmitBreathValue(outVal, false);

        micRafRef.current = requestAnimationFrame(tick);
      };

      micRafRef.current = requestAnimationFrame(tick);
    } catch {
      stopMicSensor(false);
      setMicError(
        isAr
          ? 'تم رفض صلاحية الميكروفون أو تعذر تشغيله. يرجى السماح بالوصول للميكروفون من إعدادات التطبيق.'
          : 'Microphone permission denied or unavailable. Allow microphone access to use Mic Breath Control.'
      );
    }
  };

  const toggleMicSensor = () => {
    if (isMicActive) {
      stopMicSensor(true);
    } else {
      startMicSensor();
    }
  };

  const levelPct = Math.round((breathValue / 127) * 100);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl crystal-sapphire-jewel-active flex items-center justify-center text-[#030508] shrink-0 shadow-[0_0_16px_rgba(56,189,248,0.45)]">
            <Wind className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#F8FAFC]">
              {isAr ? 'النفخ والتحكم بالاستدامة (Breath / نفخ بالميكرو)' : 'Breath & Mic Sustain Controller (نفخ بالميكرو)'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {isAr
                ? 'سلايدر أفقي عريض وحساس نفخ عبر الميكروفون يرسل CC 2 و CC 11 على القناة 1 لإطالة الصوت وتنعيم النفخ في الناي والوتريات.'
                : 'Wide expressive touch slider & live Microphone Breath Sensor sending MIDI CC 2 (Breath) + CC 11 (Expression) on Channel 1.'}
            </p>
          </div>
        </div>

        <div dir="ltr" className="flex items-center gap-2 font-mono text-xs shrink-0">
          <span className="px-3 py-1.5 rounded-xl bg-[#030508] border-[1.5px] border-white/15 text-[#FFF08A] font-black">
            CC 2 &amp; CC 11: {breathValue} / 127
          </span>
        </div>
      </div>

      {/* Main Breath Touch Slider Panel */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4 select-none">
        {/* Top Controls Row: Auto-Zero vs Hold + Reset 0 + Mic Breath Sensor Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-Zero vs Hold Mode Toggle */}
            <div
              dir="ltr"
              className="inline-flex rounded-xl overflow-hidden border-[1.5px] border-white/15 bg-[#030508] p-0.5 text-xs font-mono font-black"
            >
              <button
                type="button"
                onClick={() => {
                  setBreathMode('auto_zero');
                  if (!isDragging && !isMicActive) {
                    handleResetZero();
                  }
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  breathMode === 'auto_zero'
                    ? 'hardware-keycap-gold text-[#030508] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Auto-Zero
              </button>
              <button
                type="button"
                onClick={() => setBreathMode('hold')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  breathMode === 'hold'
                    ? 'crystal-sapphire-jewel-active text-[#030508] shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hold
              </button>
            </div>

            {/* Reset 0 Button */}
            <button
              type="button"
              onClick={handleResetZero}
              className="px-3 py-1.5 rounded-xl bg-[#030508] hover:bg-[#111827] border-[1.5px] border-[#38BDF8]/55 text-[#38BDF8] font-mono font-black text-xs flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset 0</span>
            </button>
          </div>

          {/* Mic Breath Sensor Toggle */}
          <button
            type="button"
            onClick={toggleMicSensor}
            aria-pressed={isMicActive}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 ${
              isMicActive
                ? 'crystal-emerald-jewel-active text-[#030508]'
                : 'hardware-keycap-dark border-[1.5px] border-[#FACC15]/55 text-[#FFF08A]'
            }`}
          >
            {isMicActive ? <Mic className="w-4 h-4 animate-pulse" /> : <MicOff className="w-4 h-4" />}
            <span>
              {isMicActive
                ? (isAr ? 'حساس النفخ بالميكرو: يعمل' : 'Mic Breath Sensor: ON')
                : (isAr ? 'تفعيل النفخ بالميكرو' : 'Mic Breath Sensor: OFF')}
            </span>
          </button>
        </div>

        {/* Wide Horizontal Touch Slider (0–127) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#38BDF8] font-bold">
              {isAr ? 'شريط النفخ والاستدامة (0 - 127)' : 'Breath / Sustain Ribbon (0 - 127)'}
            </span>
            <span dir="ltr" className="text-[#FFF08A] font-black text-sm">
              {breathValue} <span className="text-slate-500 text-xs">({levelPct}%)</span>
            </span>
          </div>

          <div
            ref={sliderRef}
            dir="ltr"
            onPointerDown={(e) => {
              e.preventDefault();
              cancelReturnAnim();
              try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
              setIsDragging(true);
              updateSliderFromClientX(e.clientX, true);
            }}
            onPointerMove={(e) => {
              if (!isDragging) return;
              e.preventDefault();
              updateSliderFromClientX(e.clientX, false);
            }}
            onPointerUp={(e) => {
              if (!isDragging) return;
              try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
              handleReleaseSlider();
            }}
            onPointerCancel={() => {
              if (isDragging) handleReleaseSlider();
            }}
            className="relative w-full h-24 sm:h-28 oled-subpanel border-[1.5px] border-white/20 rounded-2xl cursor-ew-resize overflow-hidden flex items-center touch-none"
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 via-white/[0.03] to-transparent z-10" />

            {/* Active Breath Fill Gradient */}
            <div
              style={{ width: `${(breathValue / 127) * 100}%` }}
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-[#38BDF8]/30 via-[#0EA5E9]/35 to-[#FACC15]/45 border-r-2 border-[#FFF08A] pointer-events-none"
            />

            {/* Graduation Tick Marks (0, 32, 64, 96, 127) */}
            <div className="absolute inset-0 pointer-events-none">
              {[0, 32, 64, 96, 127].map((tick) => {
                const pct = (tick / 127) * 100;
                return (
                  <div
                    key={tick}
                    style={{ left: `${pct}%` }}
                    className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-between py-1.5"
                  >
                    <div className="w-px h-3 bg-slate-600/80" />
                    <span className="px-1.5 py-0.5 rounded bg-[#030508]/90 text-[10px] font-mono font-bold text-slate-400">
                      {tick}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Tactile Crystal Handle */}
            <div
              style={{ left: `${(breathValue / 127) * 100}%` }}
              className={`absolute top-2 bottom-2 w-12 sm:w-14 -translate-x-1/2 rounded-xl z-20 flex items-center justify-center gap-1 pointer-events-none hardware-wheel-knurl ${
                isDragging || isMicActive
                  ? 'border-[1.5px] border-[#BAE6FD] ring-2 ring-[#38BDF8]/70 led-glow-cyan'
                  : 'border-[1.5px] border-[#FACC15]/85 led-glow-gold'
              }`}
            >
              <div className="w-0.5 h-6 rounded-full bg-white/45" />
              <div className="w-1 h-9 rounded-full bg-[#FFF08A] shadow-[0_0_8px_#FACC15]" />
              <div className="w-0.5 h-6 rounded-full bg-white/45" />
            </div>
          </div>
        </div>

        {/* Mic Breath Sensitivity Control & Live Meter */}
        <div className="bg-[#030508] border-[1.5px] border-white/15 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>{isAr ? 'حساسية نفخ الميكروفون (Mic Sensitivity)' : 'Mic Breath Sensitivity'}</span>
              <span dir="ltr" className="font-mono text-[#FFB703]">
                {sensitivity.toFixed(1)}x
              </span>
            </div>

            <span dir="ltr" className="text-[11px] font-mono text-slate-400">
              {isMicActive ? `LIVE AIRFLOW: ${micLevelPct}%` : 'Ch 1 · [0xB0, 2, val] & [0xB0, 11, val]'}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full accent-[#FFB703] cursor-pointer"
          />

          {/* Live Mic Meter Bar */}
          <div className="w-full h-2 rounded-full bg-[#0B1120] border border-[#1E293B] overflow-hidden">
            <div
              style={{ width: `${isMicActive ? micLevelPct : levelPct}%` }}
              className={`h-full transition-all duration-75 ${
                isMicActive
                  ? 'bg-gradient-to-r from-[#38BDF8] via-emerald-400 to-[#FFB703]'
                  : 'bg-gradient-to-r from-[#38BDF8]/60 to-[#FFB703]/70'
              }`}
            />
          </div>

          {micError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-500/40 px-3 py-2 text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{micError}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
