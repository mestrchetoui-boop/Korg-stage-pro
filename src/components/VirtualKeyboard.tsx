import React, { useState, useEffect, useCallback } from 'react';
import { NoteName, NoteTuning } from '../types';
import { NOTE_NAMES, NOTE_ARABIC_NAMES } from '../data/korgPresets';
import { audioEngine } from '../services/audioEngine';
import { midiEngine } from '../services/midiEngine';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface VirtualKeyboardProps {
  tunings: Record<NoteName, NoteTuning>;
  lang: 'ar' | 'en';
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ tunings, lang }) => {
  const isAr = lang === 'ar';

  const [octaveShift, setOctaveShift] = useState<number>(() => {
    try {
      const s = localStorage.getItem('korg_vkb_octave');
      const n = s ? Number(s) : 0;
      return !isNaN(n) ? Math.max(-2, Math.min(2, n)) : 0;
    } catch { return 0; }
  });
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const [instrument, setInstrument] = useState<'nay' | 'oud' | 'qanun' | 'accordion' | 'lead' | 'strings'>(() => {
    try {
      const s = localStorage.getItem('korg_vkb_instrument');
      if (s === 'nay' || s === 'oud' || s === 'qanun' || s === 'accordion' || s === 'lead' || s === 'strings') return s;
    } catch {}
    return 'nay';
  });
  const [sustain, setSustain] = useState<boolean>(() => {
    try { return localStorage.getItem('korg_vkb_sustain') === 'true'; } catch { return false; }
  });
  const [upper1Channel, setUpper1Channel] = useState<number>(() => midiEngine.getChannels().upper1);

  useEffect(() => {
    const unsub = midiEngine.subscribeState(() => {
      setUpper1Channel(midiEngine.getChannels().upper1);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try { localStorage.setItem('korg_vkb_octave', String(octaveShift)); } catch {}
  }, [octaveShift]);
  useEffect(() => {
    audioEngine.setInstrument(instrument);
    try { localStorage.setItem('korg_vkb_instrument', instrument); } catch {}
  }, [instrument]);
  useEffect(() => {
    try { localStorage.setItem('korg_vkb_sustain', String(sustain)); } catch {}
  }, [sustain]);

  // Base starting octave: MIDI note 48 (C3)
  const baseMidiNote = 48 + octaveShift * 12;
  const numOctaves = 2; // 24 keys: C3 to B4

  // Audio & MIDI note trigger
  const triggerNoteOn = useCallback((midiNote: number) => {
    setActiveNotes(prev => new Set(prev).add(midiNote));
    audioEngine.playNote(midiNote, 110);
    midiEngine.sendNoteOnWithMicrotune(upper1Channel, midiNote, 110);
  }, [upper1Channel]);

  const triggerNoteOff = useCallback((midiNote: number) => {
    if (!sustain) {
      setActiveNotes(prev => {
        const next = new Set(prev);
        next.delete(midiNote);
        return next;
      });
      audioEngine.stopNote(midiNote);
      // Send Note Off to KORG
      midiEngine.sendNoteOff(upper1Channel, midiNote);
    }
  }, [sustain, upper1Channel]);

  // Listen to incoming MIDI notes from connected physical Korg Keyboard!
  useEffect(() => {
    const unsub = midiEngine.subscribeNotes((note, vel, isNoteOn) => {
      if (isNoteOn) {
        setActiveNotes(prev => new Set(prev).add(note));
        audioEngine.playNote(note, vel);
      } else {
        setActiveNotes(prev => {
          const next = new Set(prev);
          next.delete(note);
          return next;
        });
        audioEngine.stopNote(note);
      }
    });
    return () => unsub();
  }, []);

  // Keyboard hotkeys mapping for desktop playing
  useEffect(() => {
    const keyMap: Record<string, number> = {
      'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5,
      't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11,
      'k': 12, 'o': 13, 'l': 14, 'p': 15, ';': 16, "'": 17,
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const note = baseMidiNote + offset;
        triggerNoteOn(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const offset = keyMap[e.key.toLowerCase()];
      if (offset !== undefined) {
        const note = baseMidiNote + offset;
        triggerNoteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [baseMidiNote, triggerNoteOn, triggerNoteOff]);

  const handleInstrumentChange = (inst: typeof instrument) => {
    setInstrument(inst);
    audioEngine.setInstrument(inst);
  };

  // Build key array (White and Black keys)
  const totalKeys = numOctaves * 12;
  const keys = Array.from({ length: totalKeys }).map((_, i) => {
    const midiNote = baseMidiNote + i;
    const noteName = NOTE_NAMES[midiNote % 12];
    const isBlack = noteName.includes('#');
    const isTuned = tunings[noteName]?.isQuarterTone;
    const isPressed = activeNotes.has(midiNote);

    return {
      midiNote,
      noteName,
      isBlack,
      isTuned,
      isPressed,
      arabicName: NOTE_ARABIC_NAMES[noteName].ar,
    };
  });

  // Split into white keys and position black keys over them
  const whiteKeys = keys.filter(k => !k.isBlack);

  return (
    <div className="space-y-6">

      {/* Top Toolbar: Instrument Voice, Octave Shift, Sustain */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: Instrument Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-neutral-400 font-medium whitespace-nowrap">
            {isAr ? 'صوت المحاكي:' : 'Synth Tone:'}
          </span>
          {[
            { id: 'nay', ar: 'ناي شرقي', en: 'Nay' },
            { id: 'oud', ar: 'عود سولو', en: 'Oud' },
            { id: 'qanun', ar: 'قانون', en: 'Qanun' },
            { id: 'accordion', ar: 'أكورديون', en: 'Accordion' },
            { id: 'lead', ar: 'سولو ليد', en: 'Triton Lead' },
            { id: 'strings', ar: 'وتريات', en: 'Strings' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => handleInstrumentChange(item.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                instrument === item.id
                  ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-300'
                  : 'bg-neutral-950 text-neutral-300 hover:text-white border border-neutral-800'
              }`}
            >
              {isAr ? item.ar : item.en}
            </button>
          ))}
        </div>

        {/* Right: Controls (Octave Shift & Sustain) */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          {/* Octave Shifter */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
            <span className="text-xs text-neutral-400 font-mono">OCT:</span>
            <button
              onClick={() => setOctaveShift(Math.max(-2, octaveShift - 1))}
              className="w-6 h-6 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="w-6 text-center font-mono font-bold text-amber-400 text-xs">
              {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
            </span>
            <button
              onClick={() => setOctaveShift(Math.min(2, octaveShift + 1))}
              className="w-6 h-6 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 text-white rounded text-xs"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sustain Pedal Toggle */}
          <button
            onClick={() => {
              const newSustain = !sustain;
              setSustain(newSustain);
              if (!newSustain) audioEngine.stopAllNotes();
              // Send Sustain CC #64 to KORG
              const chByte = Math.max(0, Math.min(15, upper1Channel - 1));
              midiEngine.sendRaw([0xB0 | chByte, 64, newSustain ? 127 : 0], `Sustain: ${newSustain ? 'ON' : 'OFF'}`, 'cc', upper1Channel);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              sustain
                ? 'bg-amber-500 text-neutral-950 border-amber-400 led-glow-amber'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            {isAr ? 'دواسة الاستمرار (Sustain)' : 'Sustain Pedal'}
          </button>
        </div>

      </div>

      {/* Main Playable Keyboard Surface */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-300 font-bold">
              {isAr ? 'لوحة المفاتيح التفاعلية (مع تمييز ربع التون)' : 'Interactive Quarter-Tone Keyboard'}
            </span>
            <span className="text-neutral-500">·</span>
            <span className="text-amber-400 font-mono">
              {isAr ? 'النغمات المشرّقة موضحة باللون الذهبي وعلامة (¼)' : 'Quarter-tone keys marked with (¼)'}
            </span>
          </div>

          <span className="text-neutral-500 font-mono hidden sm:inline">
            C{Math.floor(baseMidiNote / 12) - 1} - B{Math.floor((baseMidiNote + 23) / 12) - 1}
          </span>
        </div>

        {/* Keyboard Container (Forced LTR so C..B runs left-to-right in Arabic RTL mode) */}
        <div dir="ltr" className="relative w-full h-52 sm:h-64 select-none overflow-x-auto pb-2 scrollbar-thin">
          <div className="relative flex h-48 sm:h-60 min-w-[700px] w-full">
            
            {/* White Keys */}
            {whiteKeys.map((k) => (
              <div
                key={k.midiNote}
                onMouseDown={() => triggerNoteOn(k.midiNote)}
                onMouseUp={() => triggerNoteOff(k.midiNote)}
                onMouseLeave={() => triggerNoteOff(k.midiNote)}
                onTouchStart={(e) => { e.preventDefault(); triggerNoteOn(k.midiNote); }}
                onTouchEnd={(e) => { e.preventDefault(); triggerNoteOff(k.midiNote); }}
                onTouchCancel={() => triggerNoteOff(k.midiNote)}
                className={`relative flex-1 h-full rounded-b-md border border-neutral-400/30 flex flex-col justify-end pb-3 items-center cursor-pointer transition-all touch-none ${
                  k.isPressed
                    ? 'bg-amber-300 shadow-inner'
                    : k.isTuned
                    ? 'bg-amber-100 hover:bg-amber-200'
                    : 'bg-white hover:bg-neutral-100'
                }`}
              >
                {k.isTuned && (
                  <span className="absolute bottom-10 px-1 py-0.5 rounded bg-amber-500 text-[10px] font-mono font-black text-neutral-950 shadow-sm">
                    ¼
                  </span>
                )}
                <div className="text-center font-bold text-neutral-900 pointer-events-none">
                  <span className="text-xs sm:text-sm font-mono block">{k.noteName}</span>
                  <span className="text-[10px] text-neutral-600 block">{k.arabicName}</span>
                </div>
              </div>
            ))}

            {/* Black Keys Positioned Absolutely */}
            {keys.map((k) => {
              if (!k.isBlack) return null;
              
              // Find index of preceding white key to calculate absolute left position
              const whiteIndexBefore = whiteKeys.findIndex(wk => wk.midiNote === k.midiNote - 1);
              const leftPercent = ((whiteIndexBefore + 0.65) / whiteKeys.length) * 100;
              const widthPercent = (1 / whiteKeys.length) * 65;

              return (
                <div
                  key={k.midiNote}
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                  onMouseDown={() => triggerNoteOn(k.midiNote)}
                  onMouseUp={() => triggerNoteOff(k.midiNote)}
                  onMouseLeave={() => triggerNoteOff(k.midiNote)}
                  onTouchStart={(e) => { e.preventDefault(); triggerNoteOn(k.midiNote); }}
                  onTouchEnd={(e) => { e.preventDefault(); triggerNoteOff(k.midiNote); }}
                  onTouchCancel={() => triggerNoteOff(k.midiNote)}
                  className={`absolute top-0 h-[60%] rounded-b-md border border-neutral-900 z-10 flex flex-col justify-end pb-2 items-center cursor-pointer transition-all shadow-md touch-none ${
                    k.isPressed
                      ? 'bg-amber-500 ring-2 ring-amber-300'
                      : k.isTuned
                      ? 'bg-neutral-800 ring-1 ring-amber-400'
                      : 'bg-neutral-900 hover:bg-neutral-800'
                  }`}
                >
                  {k.isTuned && (
                    <span className="text-[9px] font-mono font-bold text-amber-400 mb-1">
                      ¼
                    </span>
                  )}
                  <span className="text-[9px] font-mono text-neutral-300 block pointer-events-none">
                    {k.noteName}
                  </span>
                </div>
              );
            })}

          </div>
        </div>

        {/* Pitch Bend & Modulation Bar */}
        <div className="pt-3 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-amber-400">{isAr ? 'عصا التحكم (Pitch Ribbon):' : 'Pitch Bend Ribbon:'}</span>
            <div className="flex items-center gap-1">
              <button
                onMouseDown={() => midiEngine.sendRaw([0xE0 | Math.max(0, Math.min(15, upper1Channel - 1)), 0x00, 0x20], 'Pitch Down', 'system', upper1Channel)}
                onMouseUp={() => midiEngine.sendRaw([0xE0 | Math.max(0, Math.min(15, upper1Channel - 1)), 0x00, 0x40], 'Pitch Center', 'system', upper1Channel)}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-mono"
              >
                ▼ BEND -
              </button>
              <button
                onMouseDown={() => midiEngine.sendRaw([0xE0 | Math.max(0, Math.min(15, upper1Channel - 1)), 0x00, 0x60], 'Pitch Up', 'system', upper1Channel)}
                onMouseUp={() => midiEngine.sendRaw([0xE0 | Math.max(0, Math.min(15, upper1Channel - 1)), 0x00, 0x40], 'Pitch Center', 'system', upper1Channel)}
                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded text-xs font-mono"
              >
                ▲ BEND +
              </button>
            </div>
          </div>

          <div className="text-[11px] text-neutral-500">
            {isAr 
              ? 'يمكنك أيضاً العزف مباشرة عبر لوحة مفاتيح الكمبيوتر (A, W, S, E, D, F, G...)'
              : 'You can also play using computer keyboard keys (A, W, S, E, D, F...)'}
          </div>
        </div>

      </div>

    </div>
  );
};
