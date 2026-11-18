import React, { useState, useEffect } from 'react';
import { KorgSound, MixerPart, MidiChannelSettings } from '../types';
import { KORG_SOUND_LIBRARY } from '../data/korgPresets';
import { midiEngine } from '../services/midiEngine';
import { audioEngine } from '../services/audioEngine';
import { isSoundIndexUnlocked, canUseProFeature } from '../services/licenseService';
import { Sliders, Volume2, VolumeX, Radio, Send, Play, Music, Sparkles, Lock } from 'lucide-react';

interface SoundSectionProps {
  isPro: boolean;
  onRequirePro: (featureLabel?: string) => void;
  lang: 'ar' | 'en';
}

export const SoundSection: React.FC<SoundSectionProps> = ({ isPro, onRequirePro, lang }) => {
  const isAr = lang === 'ar';

  const [channels, setChannels] = useState<MidiChannelSettings>(() => midiEngine.getChannels());
  const [activeCategory, setActiveCategory] = useState<'all' | 'oriental' | 'synth' | 'strings' | 'brass' | 'keys'>(() => {
    if (!isPro) return 'oriental';
    try {
      const s = localStorage.getItem('korg_sound_category');
      if (s === 'all' || s === 'oriental' || s === 'synth' || s === 'strings' || s === 'brass' || s === 'keys') return s;
    } catch {}
    return 'oriental';
  });
  const [selectedSound, setSelectedSound] = useState<KorgSound>(() => {
    try {
      const id = localStorage.getItem('korg_sound_selected_id');
      return (id && KORG_SOUND_LIBRARY.find(s => s.id === id)) || KORG_SOUND_LIBRARY[0];
    } catch { return KORG_SOUND_LIBRARY[0]; }
  });
  const [targetChannel, setTargetChannel] = useState<number>(() => {
    try {
      const n = Number(localStorage.getItem('korg_sound_channel'));
      return n >= 1 && n <= 16 ? n : midiEngine.getChannels().upper1;
    } catch { return midiEngine.getChannels().upper1; }
  });
  const [activeSTS, setActiveSTS] = useState<1 | 2 | 3 | 4>(() => {
    try {
      const n = Number(localStorage.getItem('korg_sound_sts'));
      return n >= 1 && n <= 4 ? (n as 1 | 2 | 3 | 4) : 1;
    } catch { return 1; }
  });

  // 4 Performance Parts Mixer (Upper 1, Upper 2, Upper 3, Lower)
  const [mixerParts, setMixerParts] = useState<MixerPart[]>(() => {
    try {
      const saved = localStorage.getItem('korg_sound_mixer_parts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {}
    return [
      {
        id: 'upper1',
        nameAr: 'العازف الرئيسي 1 (Upper 1)',
        nameEn: 'Upper 1 (Lead)',
        channel: 1,
        sound: KORG_SOUND_LIBRARY[0],
        volume: 115,
        pan: 64,
        reverb: 45,
        chorus: 10,
        octave: 0,
        muted: false,
        solo: false,
      },
      {
        id: 'upper2',
        nameAr: 'المصاحب 2 (Upper 2)',
        nameEn: 'Upper 2 (Layer)',
        channel: 2,
        sound: KORG_SOUND_LIBRARY[11],
        volume: 85,
        pan: 48,
        reverb: 60,
        chorus: 30,
        octave: 0,
        muted: false,
        solo: false,
      },
      {
        id: 'upper3',
        nameAr: 'المصاحب 3 (Upper 3)',
        nameEn: 'Upper 3 (Synth/Pad)',
        channel: 3,
        sound: KORG_SOUND_LIBRARY[8],
        volume: 0,
        pan: 80,
        reverb: 40,
        chorus: 20,
        octave: 0,
        muted: true,
        solo: false,
      },
      {
        id: 'lower',
        nameAr: 'اليد اليسرى (Lower / Bass)',
        nameEn: 'Lower (Left Hand)',
        channel: 4,
        sound: KORG_SOUND_LIBRARY[12],
        volume: 95,
        pan: 64,
        reverb: 35,
        chorus: 0,
        octave: -1,
        muted: false,
        solo: false,
      },
    ];
  });

  useEffect(() => {
    const syncChannels = () => {
      const chs = midiEngine.getChannels();
      setChannels(chs);
      setMixerParts(prev =>
        prev.map(p => ({
          ...p,
          channel: chs[p.id],
        }))
      );
    };
    syncChannels();
    return midiEngine.subscribeState(syncChannels);
  }, []);

  React.useEffect(() => {
    try { localStorage.setItem('korg_sound_category', activeCategory); } catch {}
  }, [activeCategory]);
  React.useEffect(() => {
    try { localStorage.setItem('korg_sound_selected_id', selectedSound.id); } catch {}
  }, [selectedSound]);
  React.useEffect(() => {
    try { localStorage.setItem('korg_sound_channel', String(targetChannel)); } catch {}
  }, [targetChannel]);
  React.useEffect(() => {
    try { localStorage.setItem('korg_sound_sts', String(activeSTS)); } catch {}
  }, [activeSTS]);
  React.useEffect(() => {
    try { localStorage.setItem('korg_sound_mixer_parts', JSON.stringify(mixerParts)); } catch {}
  }, [mixerParts]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSelectSound = (sound: KorgSound, ch: number = targetChannel) => {
    setSelectedSound(sound);
    // Send MIDI Bank Select & PC to Korg
    midiEngine.sendSound(ch, sound.msb, sound.lsb, sound.pc, sound.nameAr);

    // Update the corresponding part in mixer
    setMixerParts(prev => prev.map(p => p.channel === ch ? { ...p, sound } : p));

    // Update Web Audio synthesizer sound simulation if Upper 1
    if (ch === channels.upper1) {
      if (sound.id.includes('nay')) audioEngine.setInstrument('nay');
      else if (sound.id.includes('oud')) audioEngine.setInstrument('oud');
      else if (sound.id.includes('qanun')) audioEngine.setInstrument('qanun');
      else if (sound.id.includes('accordion')) audioEngine.setInstrument('accordion');
      else if (sound.id.includes('lead') || sound.id.includes('synth')) audioEngine.setInstrument('lead');
      else audioEngine.setInstrument('strings');
    }

    showToast(isAr ? `تم إرسال الصوت [${sound.nameAr}] للقناة ${ch}` : `Sent ${sound.nameEn} to Ch ${ch}`);
  };

  const handleSelectSTS = (stsNum: 1 | 2 | 3 | 4) => {
    setActiveSTS(stsNum);
    midiEngine.sendSTS(stsNum);

    // Change sounds automatically based on STS preset
    const soundPresets: Record<number, KorgSound> = {
      1: KORG_SOUND_LIBRARY[0], // Oud
      2: KORG_SOUND_LIBRARY[1], // Nay
      3: KORG_SOUND_LIBRARY[3], // Oriental Violin
      4: KORG_SOUND_LIBRARY[8], // Triton Lead
    };

    if (soundPresets[stsNum]) {
      handleSelectSound(soundPresets[stsNum], channels.upper1);
    }
    showToast(isAr ? `تفعيل طقم STS ${stsNum} (Keyboard Set ${stsNum})` : `Activated STS ${stsNum}`);
  };

  const handlePartVolumeChange = (partIndex: number, vol: number) => {
    const updated = [...mixerParts];
    updated[partIndex].volume = vol;
    setMixerParts(updated);
    midiEngine.sendPartControl(updated[partIndex].channel, 'volume', vol);
  };

  const handlePartPanChange = (partIndex: number, pan: number) => {
    const updated = [...mixerParts];
    updated[partIndex].pan = pan;
    setMixerParts(updated);
    midiEngine.sendPartControl(updated[partIndex].channel, 'pan', pan);
  };

  const handlePartReverbChange = (partIndex: number, rev: number) => {
    const updated = [...mixerParts];
    updated[partIndex].reverb = rev;
    setMixerParts(updated);
    midiEngine.sendPartControl(updated[partIndex].channel, 'reverb', rev);
  };

  const handleToggleMute = (partIndex: number) => {
    const updated = [...mixerParts];
    const isMuted = !updated[partIndex].muted;
    updated[partIndex].muted = isMuted;
    setMixerParts(updated);
    // Send volume 0 when muted, restore volume when unmuted
    midiEngine.sendPartControl(updated[partIndex].channel, 'volume', isMuted ? 0 : updated[partIndex].volume);
  };

  const filteredSounds = activeCategory === 'all'
    ? KORG_SOUND_LIBRARY
    : KORG_SOUND_LIBRARY.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-6">

      {/* STS 1 - 4 Physical Quick Bar */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {isAr ? 'أزرار الأطقم السريعة (STS / Keyboard Sets)' : 'KORG STS & Keyboard Sets'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono">
              KORG Pa4X / Pa5X Style
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            {isAr
              ? 'تبديل فوري لتوليفة أصوات العزف الأربعة (Upper 1/2/3 + Lower) المتوافقة مع الإيقاع بنقرة زر واحدة.'
              : 'Instantly switches the 4 performance keyboard parts matching the active style.'}
          </p>
        </div>

        {/* 4 Big STS Buttons */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 shrink-0">
          {([1, 2, 3, 4] as const).map((sts) => {
            const isActive = activeSTS === sts;
            const stsNames = [
              isAr ? 'سولو عود وناي' : 'Oud Solo',
              isAr ? 'ناي وتقاسيم' : 'Nay Mood',
              isAr ? 'كمانجات وطرب' : 'Violin Tarab',
              isAr ? 'سولو ليد وسنث' : 'Triton Lead',
            ];

            return (
              <button
                key={sts}
                onClick={() => handleSelectSTS(sts)}
                className={`flex flex-col items-center justify-center py-2.5 px-3 sm:px-4 rounded-lg border transition-all active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-md ring-1 ring-amber-300'
                    : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-mono font-black">STS {sts}</span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isActive ? 'bg-neutral-950' : 'bg-neutral-700'
                    }`}
                  />
                </div>
                <span className="text-[10px] mt-0.5 opacity-90 truncate max-w-[70px]">
                  {stsNames[sts - 1]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Sound Selection & Sound Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Sound Library & Bank Browser (2 cols wide on desktop) */}
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'مكتبة أصوات وبرامج كورج (Factory & Oriental)' : 'KORG Sound & Program Library'}</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr ? 'اختر الصوت ثم اضغط على القناة المراد إرسال أوامر Bank Select و Program Change إليها' : 'Select sound and target MIDI channel to send Bank Select MSB/LSB and PC'}
              </p>
            </div>

            {/* Target MIDI Channel for Sound Selection */}
            <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 self-start sm:self-auto">
              <span className="text-xs text-neutral-400 whitespace-nowrap">{isAr ? 'القناة المستهدفة:' : 'Target Part:'}</span>
              <select
                value={targetChannel}
                onChange={(e) => setTargetChannel(Number(e.target.value))}
                className="bg-neutral-900 text-amber-400 font-mono font-bold text-xs border border-neutral-700 rounded px-2 py-1 focus:outline-none"
              >
                <option value={channels.upper1}>Upper 1 (قناة {channels.upper1})</option>
                <option value={channels.upper2}>Upper 2 (قناة {channels.upper2})</option>
                <option value={channels.upper3}>Upper 3 (قناة {channels.upper3})</option>
                <option value={channels.lower}>Lower (قناة {channels.lower})</option>
              </select>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs font-medium">
            {[
              { id: 'oriental', ar: 'شرقي سولو', en: 'Oriental Solo' },
              { id: 'synth', ar: 'سنث وسولو ليد', en: 'Synths & Leads' },
              { id: 'strings', ar: 'وتريات وأوركسترا', en: 'Strings' },
              { id: 'brass', ar: 'نفخيات وبراس', en: 'Brass & Reeds' },
              { id: 'keys', ar: 'بيانو ولوحات', en: 'Pianos & Keys' },
              { id: 'all', ar: 'جميع الأصوات', en: 'All Sounds' },
            ].map((cat) => {
              const isTabLocked = cat.id !== 'oriental' && !canUseProFeature('sound_pages', isPro);
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isTabLocked) {
                      onRequirePro(isAr ? `صفحة ${cat.ar}` : `${cat.en} Page`);
                      return;
                    }
                    setActiveCategory(cat.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                    isTabLocked
                      ? 'text-neutral-500 bg-neutral-950/60 border border-neutral-800/70 opacity-80'
                      : activeCategory === cat.id
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800 border border-transparent'
                  }`}
                >
                  <span>{isAr ? cat.ar : cat.en}</span>
                  {isTabLocked && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black">
                      <Lock className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sound Cards List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredSounds.map((s) => {
              const globalIdx = KORG_SOUND_LIBRARY.indexOf(s);
              const isLocked = !isSoundIndexUnlocked(globalIdx, isPro);
              const isSelected = selectedSound.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    if (isLocked) {
                      onRequirePro(isAr ? s.nameAr : s.nameEn);
                      return;
                    }
                    handleSelectSound(s, targetChannel);
                  }}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                    isLocked
                      ? 'bg-neutral-950/40 border-neutral-800/60 opacity-75 hover:border-amber-500/40'
                      : isSelected
                      ? 'bg-neutral-800 border-amber-500 shadow-md ring-1 ring-amber-500/30'
                      : 'bg-neutral-950/70 border-neutral-800/80 hover:bg-neutral-800/50 hover:border-neutral-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-bold flex items-center gap-1.5 ${isSelected ? 'text-amber-400' : 'text-neutral-100'}`}>
                        <span>{isAr ? s.nameAr : s.nameEn}</span>
                        {isLocked && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[9px] font-black">
                            <Lock className="w-2.5 h-2.5" />
                            PRO
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 shrink-0">
                        PC #{s.pc}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {isAr ? s.descriptionAr : s.descriptionEn}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                    <span className="text-amber-400/90">
                      MSB: {s.msb} · LSB: {s.lsb}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isLocked) {
                          onRequirePro(isAr ? s.nameAr : s.nameEn);
                          return;
                        }
                        handleSelectSound(s, targetChannel);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold text-neutral-900 bg-amber-400 hover:bg-amber-300 rounded flex items-center gap-1"
                    >
                      {isLocked ? <Lock className="w-2.5 h-2.5" /> : <Send className="w-2.5 h-2.5" />}
                      <span>{isLocked ? 'PRO' : (isAr ? 'إرسال' : 'Send')}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: 4-Part Mixer (Upper 1, Upper 2, Upper 3, Lower) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-neutral-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>{isAr ? 'ميكسر التراكات (Part Mixer)' : '4-Part Performance Mixer'}</span>
              </h3>
              <span className="text-xs text-neutral-400 font-mono">Ch 1-4</span>
            </div>

            {/* Mixer Strips */}
            <div className="space-y-4">
              {mixerParts.map((part, idx) => (
                <div
                  key={part.id}
                  className={`p-3 rounded-lg border transition-all ${
                    part.muted
                      ? 'bg-neutral-950/50 border-neutral-800/50 opacity-60'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {isAr ? part.nameAr : part.nameEn}
                      </span>
                      <span className="text-[11px] text-amber-400 truncate max-w-[150px] block">
                        {isAr ? part.sound.nameAr : part.sound.nameEn}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleMute(idx)}
                        className={`p-1 rounded text-xs transition-colors ${
                          part.muted
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                        title={part.muted ? 'Unmute' : 'Mute'}
                      >
                        {part.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                      <span>{isAr ? 'مستوى الصوت' : 'Volume'}</span>
                      <span className="text-amber-400 font-bold">{part.volume}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.volume}
                      disabled={part.muted}
                      onChange={(e) => handlePartVolumeChange(idx, Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Reverb Slider */}
                  <div className="space-y-1 mt-2">
                    <div className="flex justify-between text-[10px] font-mono text-neutral-400">
                      <span>{isAr ? 'صدى (Reverb)' : 'Reverb'}</span>
                      <span className="text-neutral-300 font-bold">{part.reverb}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="127"
                      value={part.reverb}
                      disabled={part.muted}
                      onChange={(e) => handlePartReverbChange(idx, Number(e.target.value))}
                      className="w-full accent-neutral-400 h-1 bg-neutral-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-800 text-[11px] text-neutral-400">
            {isAr
              ? 'تتحكم هذه القنوات في إرسال CC #7 (Volume) و CC #91 (Reverb) عبر الـ MIDI إلى أورغ كورج مباشرة.'
              : 'Directly transmits standard CC #7 and CC #91 messages to the hardware Korg engine.'}
          </div>
        </div>

      </div>

      {/* Floating notification feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 end-6 z-50 bg-neutral-900 border border-amber-500 text-amber-300 px-4 py-2.5 rounded-lg shadow-2xl text-xs font-semibold">
          {toastMessage}
        </div>
      )}

    </div>
  );
};
