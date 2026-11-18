import React, { useState, useRef, useCallback, useEffect } from 'react';
import { midiEngine } from '../services/midiEngine';
import { audioEngine } from '../services/audioEngine';
import {
  PitchBendRangeSemitones,
  PITCH_BEND_RANGE_STORAGE_KEY,
  sendPitchBendSensitivityRpn,
} from '../services/korgExtraMidi';
import { Waves, MoveHorizontal, RotateCcw } from 'lucide-react';

interface PitchRibbonProps {
  channel?: number;
  lang: 'ar' | 'en';
  compact?: boolean;
}

type ReturnSpeedMode = 'fast' | 'medium' | 'slow';

const RETURN_SPEED_MS: Record<ReturnSpeedMode, number> = {
  fast: 0,
  medium: 160,
  slow: 360,
};

const PITCH_BEND_RANGES: PitchBendRangeSemitones[] = [2, 5, 12];

export const PitchRibbon: React.FC<PitchRibbonProps> = ({ channel = 1, lang, compact = false }) => {
  const isAr = lang === 'ar';
  const [pitchBend, setPitchBend] = useState<number>(0); // -1.0 to +1.0
  const [modulation, setModulation] = useState<number>(0); // 0 to 127
  const [isPitchDragging, setIsPitchDragging] = useState<boolean>(false);
  const [isModDragging, setIsModDragging] = useState<boolean>(false);

  const [wheelMode, setWheelMode] = useState<'pitch' | 'ribbon'>(() => {
    try {
      const s = localStorage.getItem('korg_pitch_wheel_mode');
      return s === 'ribbon' ? 'ribbon' : 'pitch';
    } catch { return 'pitch'; }
  });

  const [pbRange, setPbRange] = useState<PitchBendRangeSemitones>(() => {
    try {
      const raw = Number(localStorage.getItem(PITCH_BEND_RANGE_STORAGE_KEY));
      return raw === 5 || raw === 12 ? raw : 2;
    } catch { return 2; }
  });

  const [returnSpeed, setReturnSpeed] = useState<ReturnSpeedMode>(() => {
    try {
      const s = localStorage.getItem('korg_pitch_return_speed');
      return s === 'medium' || s === 'slow' ? s : 'fast';
    } catch { return 'fast'; }
  });

  const [sendAllUpper, setSendAllUpper] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem('korg_pitch_all_upper');
      return s !== null ? s === 'true' : true;
    } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem('korg_pitch_wheel_mode', wheelMode); } catch {}
  }, [wheelMode]);

  useEffect(() => {
    try { localStorage.setItem(PITCH_BEND_RANGE_STORAGE_KEY, String(pbRange)); } catch {}
  }, [pbRange]);

  useEffect(() => {
    try { localStorage.setItem('korg_pitch_return_speed', returnSpeed); } catch {}
  }, [returnSpeed]);

  useEffect(() => {
    try { localStorage.setItem('korg_pitch_all_upper', String(sendAllUpper)); } catch {}
  }, [sendAllUpper]);

  const pitchRef = useRef<HTMLDivElement>(null);
  const modRef = useRef<HTMLDivElement>(null);
  const lastPitchStepRef = useRef<number>(8192);
  const lastModStepRef = useRef<number>(0);
  const currentPitchRef = useRef<number>(0);
  const returnRafRef = useRef<number | null>(null);

  const cancelReturnAnim = useCallback(() => {
    if (returnRafRef.current !== null) {
      cancelAnimationFrame(returnRafRef.current);
      returnRafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cancelReturnAnim();
  }, [cancelReturnAnim]);

  const updatePitchFromClientX = useCallback((clientX: number, forceSend: boolean = false) => {
    if (!pitchRef.current) return;
    const rect = pitchRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, relativeX));
    const normalized = (clampedX / rect.width) * 2 - 1;
    const raw14 = Math.round(8192 + normalized * 8191);

    currentPitchRef.current = normalized;
    setPitchBend(normalized);
    audioEngine.setPitchBend(normalized);

    if (forceSend || Math.abs(raw14 - lastPitchStepRef.current) >= 48) {
      lastPitchStepRef.current = raw14;
      midiEngine.sendPitchBend(normalized, channel, sendAllUpper);
    }
  }, [channel, sendAllUpper]);

  const snapPitchToZero = useCallback(() => {
    cancelReturnAnim();
    currentPitchRef.current = 0;
    setPitchBend(0);
    lastPitchStepRef.current = 8192;
    midiEngine.sendPitchBend(0, channel, sendAllUpper);
    audioEngine.setPitchBend(0);
  }, [cancelReturnAnim, channel, sendAllUpper]);

  const releasePitch = useCallback(() => {
    setIsPitchDragging(false);
    if (wheelMode === 'ribbon') {
      // Ribbon mode holds current position until tapped/reset
      return;
    }

    const durationMs = RETURN_SPEED_MS[returnSpeed];
    const startVal = currentPitchRef.current;
    if (durationMs <= 0 || Math.abs(startVal) < 0.015) {
      snapPitchToZero();
      return;
    }

    cancelReturnAnim();
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2);
      const nextVal = startVal * (1 - eased);

      if (progress >= 1 || Math.abs(nextVal) < 0.008) {
        snapPitchToZero();
        return;
      }

      currentPitchRef.current = nextVal;
      setPitchBend(nextVal);
      audioEngine.setPitchBend(nextVal);
      const raw14 = Math.round(8192 + nextVal * 8191);
      if (Math.abs(raw14 - lastPitchStepRef.current) >= 64) {
        lastPitchStepRef.current = raw14;
        midiEngine.sendPitchBend(nextVal, channel, sendAllUpper);
      }
      returnRafRef.current = requestAnimationFrame(step);
    };
    returnRafRef.current = requestAnimationFrame(step);
  }, [wheelMode, returnSpeed, snapPitchToZero, cancelReturnAnim, channel, sendAllUpper]);

  const cycleReturnSpeed = () => {
    setReturnSpeed((prev) => (prev === 'fast' ? 'medium' : prev === 'medium' ? 'slow' : 'fast'));
  };

  const handleSelectPbRange = (nextRange: PitchBendRangeSemitones) => {
    setPbRange(nextRange);
    sendPitchBendSensitivityRpn(nextRange);
  };

  const updateModFromClientX = useCallback((clientX: number, forceSend: boolean = false) => {
    if (!modRef.current) return;
    const rect = modRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const relativeX = clientX - rect.left;
    const clampedX = Math.max(0, Math.min(rect.width, relativeX));
    const val = Math.round((clampedX / rect.width) * 127);

    setModulation(val);
    if (forceSend || val !== lastModStepRef.current) {
      lastModStepRef.current = val;
      midiEngine.sendModulation(val, channel, sendAllUpper);
    }
  }, [channel, sendAllUpper]);

  const returnSpeedLabel =
    returnSpeed === 'fast'
      ? (isAr ? 'الرجوع: سريع' : 'Return: Fast')
      : returnSpeed === 'medium'
      ? (isAr ? 'الرجوع: وسط' : 'Return: Med')
      : (isAr ? 'الرجوع: بطيء' : 'Return: Slow');

  const semitoneSteps = Array.from({ length: pbRange * 2 + 1 }, (_, i) => i - pbRange);
  const currentSemitones = pitchBend * pbRange;

  return (
    <div className={`w-full bg-[#0B1120] rounded-xl border border-[#1E293B] select-none ${compact ? 'px-2.5 py-2 space-y-1.5' : 'px-3.5 py-3 space-y-2.5'}`}>

      {/* 1. Upgraded Oriental Pitch Bend / Ribbon Controller */}
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <div className="flex flex-wrap items-center justify-between text-xs gap-1.5">
          <span className="font-bold text-[#FFB703] flex items-center gap-1.5">
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>
              {wheelMode === 'ribbon'
                ? (isAr ? 'شريط البيتش ريبون (Ribbon Hold)' : 'Oriental Ribbon (Hold)')
                : (isAr ? 'بيتش بيند زنبركي (Spring Pitch Bend)' : 'Oriental Pitch Bend (Spring)')}
            </span>
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Pitch Bend Range Selector (±2, ±5, ±12 semitones) via MIDI RPN */}
            <div
              dir="ltr"
              className="inline-flex items-center rounded-md overflow-hidden border border-[#1E293B] bg-[#070B14] text-[10px] font-mono font-black"
              title={isAr ? 'مدى البيتش بيند (يرسل RPN CC101/100/6/38 على القناة 1)' : 'Pitch Bend Range (sends RPN on Ch 1)'}
            >
              <span className="px-1.5 py-0.5 text-slate-500 border-e border-[#1E293B]">RNG</span>
              {PITCH_BEND_RANGES.map((rng) => (
                <button
                  key={rng}
                  type="button"
                  onClick={() => handleSelectPbRange(rng)}
                  className={`px-2 py-0.5 transition-colors ${
                    pbRange === rng
                      ? 'bg-[#38BDF8] text-[#070B14]'
                      : 'text-slate-300 hover:text-white hover:bg-[#111827]'
                  }`}
                >
                  ±{rng}
                </button>
              ))}
            </div>

            {/* Spring / Ribbon Mode Toggle */}
            <div dir="ltr" className="inline-flex rounded-md overflow-hidden border border-[#1E293B] bg-[#070B14] text-[10px] font-mono font-black">
              <button
                type="button"
                onClick={() => {
                  setWheelMode('pitch');
                  snapPitchToZero();
                }}
                className={`px-2.5 py-0.5 transition-colors ${
                  wheelMode === 'pitch'
                    ? 'bg-[#FFB703] text-[#070B14]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Spring
              </button>
              <button
                type="button"
                onClick={() => setWheelMode('ribbon')}
                className={`px-2.5 py-0.5 transition-colors ${
                  wheelMode === 'ribbon'
                    ? 'bg-[#38BDF8] text-[#070B14]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ribbon
              </button>
            </div>

            {/* Reset 0 button */}
            <button
              type="button"
              onClick={snapPitchToZero}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border flex items-center gap-1 active:scale-95 transition-colors ${
                wheelMode === 'ribbon' || Math.abs(pitchBend) > 0.01
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 border-[#38BDF8]/70 text-[#38BDF8]'
                  : 'bg-[#070B14] hover:bg-[#111827] border-[#1E293B] text-slate-300 hover:text-white'
              }`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset 0</span>
            </button>

            {/* Return Speed Control (for Spring mode) */}
            <button
              type="button"
              onClick={cycleReturnSpeed}
              disabled={wheelMode === 'ribbon'}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                wheelMode === 'ribbon'
                  ? 'bg-[#070B14] border-[#1E293B] text-slate-600 cursor-not-allowed'
                  : returnSpeed === 'fast'
                  ? 'bg-[#111827] border-[#38BDF8]/50 text-[#38BDF8]'
                  : 'bg-[#FFB703]/15 border-[#FFB703]/50 text-[#FFB703]'
              }`}
              title={isAr ? 'سرعة رجوع البيتش للمركز' : 'Spring Return Speed'}
            >
              {returnSpeedLabel}
            </button>

            <button
              type="button"
              onClick={() => setSendAllUpper(!sendAllUpper)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-all ${
                sendAllUpper
                  ? 'bg-[#FFB703]/20 border-[#FFB703]/50 text-[#FFB703]'
                  : 'bg-[#111827] border-[#1E293B] text-neutral-400'
              }`}
              title={isAr ? 'إرسال البيتش لقنوات Upper 1-3 معاً أو القناة 1 فقط' : 'Send to Upper 1-3 or Ch 1 only'}
            >
              {sendAllUpper ? 'Ch 1-3 (Upper)' : `Ch ${channel}`}
            </button>

            <span dir="ltr" className="font-mono text-[11px] font-bold text-amber-300 min-w-[66px] text-end">
              {currentSemitones > 0.02
                ? `+${currentSemitones.toFixed(1)} ST`
                : currentSemitones < -0.02
                ? `${currentSemitones.toFixed(1)} ST`
                : '0.0 ST'}
            </span>
          </div>
        </div>

        {/* Taller & Wider Tactile Touch Strip with Semitone & Center Ticks */}
        <div
          ref={pitchRef}
          dir="ltr"
          onPointerDown={(e) => {
            e.preventDefault();
            cancelReturnAnim();
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
            setIsPitchDragging(true);
            updatePitchFromClientX(e.clientX, true);
          }}
          onPointerMove={(e) => {
            if (!isPitchDragging) return;
            e.preventDefault();
            updatePitchFromClientX(e.clientX, false);
          }}
          onPointerUp={(e) => {
            if (!isPitchDragging) return;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
            releasePitch();
          }}
          onPointerCancel={() => {
            if (isPitchDragging) releasePitch();
          }}
          className={`relative w-full ${compact ? 'h-14 sm:h-16' : 'h-28 sm:h-32'} bg-[#070B14] border border-[#1E293B] rounded-xl cursor-ew-resize overflow-hidden flex items-center shadow-inner touch-none`}
        >
          {/* Active deflection fill from Center (0) to current touch position */}
          <div
            style={{
              left: pitchBend >= 0 ? '50%' : `${((pitchBend + 1) / 2) * 100}%`,
              width: `${Math.abs(pitchBend) * 50}%`,
            }}
            className={`absolute top-0 bottom-0 pointer-events-none transition-colors ${
              wheelMode === 'ribbon' ? 'bg-[#38BDF8]/15' : 'bg-[#FFB703]/15'
            }`}
          />

          {/* Horizontal ruler baseline */}
          <div className="absolute inset-x-0 top-1/2 h-px bg-[#1E293B] pointer-events-none" />

          {/* Clear Semitone Step Tick Marks & Center (0) Marker */}
          <div className="absolute inset-0 pointer-events-none">
            {semitoneSteps.map((step) => {
              const pct = ((step + pbRange) / (pbRange * 2)) * 100;
              const isCenter = step === 0;
              const isEdge = Math.abs(step) === pbRange;
              const showLabel =
                isCenter ||
                isEdge ||
                (!compact && pbRange <= 5) ||
                (pbRange === 12 && step % (compact ? 6 : 3) === 0);

              return (
                <div
                  key={step}
                  style={{ left: `${pct}%` }}
                  className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center justify-between py-0.5"
                >
                  <div
                    className={
                      isCenter
                        ? 'w-0.5 h-full bg-[#FFB703]/70'
                        : isEdge
                        ? 'w-px h-full bg-slate-600/70'
                        : pbRange === 12 && step % 3 !== 0
                        ? `w-px ${compact ? 'h-1.5' : 'h-2.5'} bg-slate-700/80`
                        : `w-px ${compact ? 'h-2.5' : 'h-4'} bg-slate-500/80`
                    }
                  />
                  {showLabel && (
                    <span
                      className={`px-1 rounded font-mono leading-none ${compact ? 'text-[8px]' : 'text-[9px] sm:text-[10px]'} ${
                        isCenter
                          ? 'bg-[#0B1120] text-[#FFB703] font-black border border-[#FFB703]/40 py-0.5'
                          : 'bg-[#070B14]/85 text-slate-400 font-bold'
                      }`}
                    >
                      {step > 0 ? `+${step}` : step}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Touch Slider Handle */}
          <div
            style={{ left: `${((pitchBend + 1) / 2) * 100}%` }}
            className={`absolute ${compact ? 'top-1.5 bottom-1.5 w-10 sm:w-12 rounded-lg' : 'top-2 bottom-2 w-12 sm:w-14 rounded-xl'} -translate-x-1/2 z-20 flex items-center justify-center gap-1 pointer-events-none ${
              isPitchDragging
                ? 'bg-gradient-to-b from-[#FDE047] to-[#FFB703] border-2 border-amber-100 ring-2 ring-[#FFB703]/70 shadow-[0_0_24px_rgba(255,183,3,0.85)]'
                : wheelMode === 'ribbon'
                ? 'bg-gradient-to-b from-[#38BDF8] to-[#0284C7] border-2 border-sky-200 shadow-[0_0_16px_rgba(56,189,248,0.5)]'
                : 'bg-gradient-to-b from-[#334155] to-[#1E293B] border-2 border-[#FFB703]/85 shadow-[0_0_14px_rgba(255,183,3,0.4)]'
            }`}
          >
            <div className={`w-0.5 ${compact ? 'h-3.5' : 'h-6'} rounded-full ${isPitchDragging ? 'bg-[#070B14]/45' : 'bg-[#FFB703]/50'}`} />
            <div className={`w-1 ${compact ? 'h-5' : 'h-9'} rounded-full ${isPitchDragging ? 'bg-[#070B14]/90' : 'bg-[#FFB703]'}`} />
            <div className={`w-0.5 ${compact ? 'h-3.5' : 'h-6'} rounded-full ${isPitchDragging ? 'bg-[#070B14]/45' : 'bg-[#FFB703]/50'}`} />
          </div>

          {/* Floating Reset 0 inside Ribbon strip when deflected */}
          {wheelMode === 'ribbon' && Math.abs(pitchBend) > 0.02 && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                snapPitchToZero();
              }}
              className="absolute top-2 right-2 z-30 px-2.5 py-1 rounded-lg bg-[#0B1120]/95 hover:bg-[#1E293B] border border-[#38BDF8] text-[#38BDF8] font-mono font-black text-[10px] shadow-lg pointer-events-auto"
            >
              Reset 0
            </button>
          )}
        </div>
      </div>

      {/* 2. Modulation Wheel / Ribbon */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#38BDF8] flex items-center gap-1.5">
            <Waves className="w-3.5 h-3.5" />
            <span>{isAr ? 'مودوليشن واهتزاز (Modulation CC#1)' : 'Modulation Ribbon'}</span>
          </span>
          <span className="font-mono text-[11px] text-neutral-400">
            {modulation} / 127
          </span>
        </div>

        <div
          ref={modRef}
          dir="ltr"
          onPointerDown={(e) => {
            e.preventDefault();
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
            setIsModDragging(true);
            updateModFromClientX(e.clientX, true);
          }}
          onPointerMove={(e) => {
            if (!isModDragging) return;
            e.preventDefault();
            updateModFromClientX(e.clientX, false);
          }}
          onPointerUp={(e) => {
            if (!isModDragging) return;
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
            setIsModDragging(false);
          }}
          onPointerCancel={() => {
            setIsModDragging(false);
          }}
          className="relative h-7 bg-[#070B14] border border-[#1E293B] rounded-lg cursor-ew-resize overflow-hidden flex items-center shadow-inner touch-none"
        >
          {/* Active Fill Bar */}
          <div
            style={{ width: `${(modulation / 127) * 100}%` }}
            className="absolute left-0 top-0 bottom-0 bg-[#38BDF8]/25 border-r-2 border-[#38BDF8] pointer-events-none"
          />

          <div
            style={{ left: `${(modulation / 127) * 100}%` }}
            className={`absolute top-0.5 bottom-0.5 w-6 -translate-x-1/2 rounded-md flex items-center justify-center pointer-events-none ${
              isModDragging
                ? 'bg-cyan-400 ring-2 ring-cyan-200'
                : 'bg-neutral-600 border border-neutral-400'
            }`}
          >
            <div className="w-0.5 h-3 bg-neutral-950/70 rounded-full" />
          </div>

          <div className="w-full flex justify-between px-3 text-[9px] font-mono text-neutral-500 pointer-events-none">
            <span>0</span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setModulation(0);
                lastModStepRef.current = 0;
                midiEngine.sendModulation(0, channel, sendAllUpper);
              }}
              className="text-[10px] text-neutral-400 hover:text-white pointer-events-auto"
            >
              Reset
            </button>
            <span>MAX</span>
          </div>
        </div>
      </div>

    </div>
  );
};
