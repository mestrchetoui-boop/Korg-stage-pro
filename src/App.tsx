/**
 * KORG Oriental Commander (متحكم كورج الشرقي)
 * Professional Web MIDI Controller for Korg Arranger & Synthesizer Workstations
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { KorgStageView } from './components/KorgStageView';
import { TashreeqSection } from './components/TashreeqSection';
import { PitchPageSection } from './components/PitchPageSection';
import { BreathPageSection } from './components/BreathPageSection';
import { SoundSection } from './components/SoundSection';
import { StyleSection } from './components/StyleSection';
import { VirtualKeyboard } from './components/VirtualKeyboard';
import { MidiSettingsSection } from './components/MidiSettingsSection';
import { PaManagerSection } from './components/PaManagerSection';
import { EffectsMixerSection } from './components/EffectsMixerSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProActivationModal } from './components/ProActivationModal';
import { DeveloperKeygenModal } from './components/DeveloperKeygenModal';
import { UiCustomizationDrawer } from './components/UiCustomizationDrawer';
import {
  UiCustomizationSettings,
  UI_THEME_PRESETS,
  loadUiSettings,
  saveUiSettings,
} from './data/uiThemes';

import { NoteName, NoteTuning, KorgModelProfile, MidiChannelSettings } from './types';
import { NOTE_NAMES, NOTE_ARABIC_NAMES, KORG_MODELS } from './data/korgPresets';
import { midiEngine } from './services/midiEngine';
import { audioEngine } from './services/audioEngine';
import { isProActivated } from './services/licenseService';
import { KeyboardEngineMode, KEYBOARD_MODE_STORAGE_KEY } from './services/korgExtraMidi';
import {
  YamahaModelId,
  YAMAHA_MODEL_STORAGE_KEY,
  getYamahaModelSpec,
} from './services/yamahaMidi';
import { ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('korg_lang');
      return saved === 'ar' ? 'ar' : 'en';
    } catch {
      return 'en';
    }
  });

  const [activeTab, setActiveTab] = useState<'stage' | 'tashreeq' | 'pitch' | 'breath' | 'effects' | 'sounds' | 'styles' | 'keyboard' | 'pa_manager' | 'settings'>(() => {
    try {
      const saved = localStorage.getItem('korg_active_tab');
      if (saved === 'stage' || saved === 'tashreeq' || saved === 'pitch' || saved === 'breath' || saved === 'effects' || saved === 'sounds' || saved === 'styles' || saved === 'keyboard' || saved === 'pa_manager' || saved === 'settings') {
        return saved;
      }
    } catch {}
    return 'stage';
  });

  const [currentModel, setCurrentModel] = useState<KorgModelProfile>(() => {
    const pa600Default = KORG_MODELS.find(m => m.id === 'pa600') || KORG_MODELS[3];
    try {
      const savedId = localStorage.getItem('korg_selected_model_id');
      return (savedId && KORG_MODELS.find(m => m.id === savedId)) || pa600Default;
    } catch {
      return pa600Default;
    }
  });

  const [channels, setChannels] = useState<MidiChannelSettings>(() => midiEngine.getChannels());
  const [restoreRevision, setRestoreRevision] = useState<number>(0);

  const [isPro, setIsPro] = useState<boolean>(() => isProActivated());
  const [proModal, setProModal] = useState<{ open: boolean; feature?: string }>({ open: false });
  const [devModalOpen, setDevModalOpen] = useState<boolean>(false);
  const devTapTimestampsRef = React.useRef<number[]>([]);

  const [isMidiConnected, setIsMidiConnected] = useState<boolean>(false);
  const [selectedOutputName, setSelectedOutputName] = useState<string>('KORG Workstation');
  const [panicToast, setPanicToast] = useState<boolean>(false);
  const [isUiDrawerOpen, setIsUiDrawerOpen] = useState<boolean>(false);
  const [uiSettings, setUiSettings] = useState<UiCustomizationSettings>(() => loadUiSettings());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const wakeLockRef = React.useRef<{ release: () => Promise<void> } | null>(null);
  const [activeBrand, setActiveBrand] = useState<'korg' | 'yamaha'>(() => {
    try {
      const saved = localStorage.getItem('korg_active_brand');
      return saved === 'yamaha' ? 'yamaha' : 'korg';
    } catch {
      return 'korg';
    }
  });
  const [keyboardMode, setKeyboardMode] = useState<KeyboardEngineMode>(() => {
    try {
      const saved = localStorage.getItem(KEYBOARD_MODE_STORAGE_KEY);
      return saved === 'kronos' ? 'kronos' : 'pa_series';
    } catch {
      return 'pa_series';
    }
  });
  const [yamahaModel, setYamahaModel] = useState<YamahaModelId>(() => {
    try {
      const saved = localStorage.getItem(YAMAHA_MODEL_STORAGE_KEY);
      if (saved === 'psr_a5000' || saved === 'genos' || saved === 'psr_sx' || saved === 'psr_or700_a3000') {
        return saved;
      }
    } catch {}
    return 'psr_a5000';
  });

  // Always start in Equal Temperament (0 cents) on open without sending any SysEx automatically
  const [tunings, setTunings] = useState<Record<NoteName, NoteTuning>>(() => {
    const initial: Record<NoteName, NoteTuning> = {} as Record<NoteName, NoteTuning>;
    NOTE_NAMES.forEach(note => {
      initial[note] = {
        note,
        nameAr: NOTE_ARABIC_NAMES[note].ar,
        nameEn: note,
        isQuarterTone: false,
        cents: 0,
      };
    });
    return initial;
  });

  // Persist user settings automatically
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    try { localStorage.setItem('korg_lang', lang); } catch {}
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem('korg_active_tab', activeTab); } catch {}
  }, [activeTab]);

  useEffect(() => {
    try { localStorage.setItem('korg_selected_model_id', currentModel.id); } catch {}
  }, [currentModel]);

  useEffect(() => {
    try { localStorage.setItem('korg_active_tunings', JSON.stringify(tunings)); } catch {}
  }, [tunings]);

  useEffect(() => {
    saveUiSettings(uiSettings);
    document.documentElement.style.setProperty('--ui-brightness', `${uiSettings.brightness}%`);
  }, [uiSettings]);

  useEffect(() => {
    try { localStorage.setItem('korg_active_brand', activeBrand); } catch {}
  }, [activeBrand]);

  useEffect(() => {
    try { localStorage.setItem(KEYBOARD_MODE_STORAGE_KEY, keyboardMode); } catch {}
  }, [keyboardMode]);

  useEffect(() => {
    try { localStorage.setItem(YAMAHA_MODEL_STORAGE_KEY, yamahaModel); } catch {}
  }, [yamahaModel]);

  // Sync browser Fullscreen state
  useEffect(() => {
    const syncFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    syncFullscreen();
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);
    };
  }, []);

  // Keep screen awake during Stage performance or Fullscreen fixation
  useEffect(() => {
    let active = true;
    const requestWakeLock = async () => {
      try {
        const nav = navigator as Navigator & {
          wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
        };
        if (!nav.wakeLock || (!isFullscreen && activeTab !== 'stage')) return;
        if (document.visibilityState !== 'visible') return;
        const lock = await nav.wakeLock.request('screen');
        if (!active) {
          lock.release().catch(() => {});
          return;
        }
        wakeLockRef.current = lock;
      } catch {}
    };

    if (activeTab === 'stage' || isFullscreen) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && (activeTab === 'stage' || isFullscreen)) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [activeTab, isFullscreen]);

  const toggleFullscreen = async () => {
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
      } else {
        if (el.requestFullscreen) {
          await el.requestFullscreen({ navigationUI: 'hide' } as FullscreenOptions);
        } else if (el.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        }
      }
    } catch {}
  };

  // Initialize MIDI & Audio engines (NO SysEx sent on open or MIDI connect)
  useEffect(() => {
    audioEngine.setTunings(tunings);
    midiEngine.setInitialTunings(tunings);

    const syncMidiState = () => {
      setIsMidiConnected(midiEngine.hasConnectedOutput());
      setChannels(midiEngine.getChannels());
      setCurrentModel(midiEngine.getModel());
      const outName = midiEngine.getSelectedOutputName();
      if (outName) {
        setSelectedOutputName(outName);
      } else {
        setSelectedOutputName('KORG Workstation');
      }
    };

    const unsubState = midiEngine.subscribeState(syncMidiState);

    midiEngine.initialize().then(() => {
      syncMidiState();
    });

    return () => unsubState();
  }, []);

  const handleBackupRestored = () => {
    try {
      const savedLang = localStorage.getItem('korg_lang');
      if (savedLang === 'ar' || savedLang === 'en') {
        setLang(savedLang);
      }
    } catch {}
    setCurrentModel(midiEngine.getModel());
    setChannels(midiEngine.getChannels());
    setIsPro(isProActivated());
    setRestoreRevision(r => r + 1);
  };

  const openProModal = (featureLabel?: string) => {
    setProModal({ open: true, feature: featureLabel });
  };

  const handleDevSignatureTap = () => {
    const now = Date.now();
    const recentTaps = devTapTimestampsRef.current.filter(ts => now - ts <= 3000);
    recentTaps.push(now);
    if (recentTaps.length >= 5) {
      devTapTimestampsRef.current = [];
      setDevModalOpen(true);
    } else {
      devTapTimestampsRef.current = recentTaps;
    }
  };

  const handlePanic = () => {
    midiEngine.sendPanic();
    audioEngine.stopAllNotes();
    audioEngine.stopRhythm();
    setPanicToast(true);
    setTimeout(() => setPanicToast(false), 2500);
  };

  const isAr = lang === 'ar';
  const activeQuarterNotes = NOTE_NAMES.filter(n => tunings[n].isQuarterTone);
  const activeTheme = UI_THEME_PRESETS[uiSettings.theme] || UI_THEME_PRESETS.gold;

  return (
    <div
      onContextMenu={(e) => {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
          e.preventDefault();
        }
      }}
      className="min-h-[100dvh] overscroll-none bg-[#030508] text-[#F8FAFC] flex flex-col font-sans selection:bg-[#FACC15]/30 selection:text-amber-100"
    >
      <div className="flex-1 flex flex-col ui-brightness-target">
      
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        onPanic={handlePanic}
        onOpenUiSettings={() => setIsUiDrawerOpen(true)}
        onSignatureTap={handleDevSignatureTap}
        onOpenPro={() => openProModal()}
        themeId={uiSettings.theme}
        isMidiConnected={isMidiConnected}
        selectedOutputName={selectedOutputName}
        isPro={isPro}
        activeBrand={activeBrand}
        onSelectBrand={setActiveBrand}
        keyboardMode={keyboardMode}
        onChangeKeyboardMode={setKeyboardMode}
        yamahaModel={yamahaModel}
        onChangeYamahaModel={setYamahaModel}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Slim Pro Studio Hardware Status Strip */}
      <section className="bg-[#030508]/95 backdrop-blur-md border-b-[1.5px] border-white/15 px-3 sm:px-5 py-1">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Active Model & Scale */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-neutral-300 font-mono">
              <Cpu className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="font-bold text-[#F8FAFC] leading-tight">
                {activeBrand === 'yamaha'
                  ? getYamahaModelSpec(yamahaModel).label
                  : currentModel.name}
              </span>
            </div>
            <span className="text-[#1F2937] hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">{isAr ? 'التشريق:' : 'Scale:'}</span>
              <span className="font-mono font-bold text-[#FDE047]">
                {activeQuarterNotes.length > 0
                  ? `${activeQuarterNotes.map(n => NOTE_ARABIC_NAMES[n].ar).join(' · ')} (-50¢)`
                  : (isAr ? 'طبيعي (0¢)' : 'Natural (0¢)')}
              </span>
            </div>
          </div>

          {/* Quick Arranger & Midi Connection State */}
          <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
            <span>
              {isAr ? 'العزف:' : 'Upper 1:'} <strong className="text-[#F8FAFC]">Ch {channels.upper1}</strong>
            </span>
            <span>
              {isAr ? 'الإيقاع:' : 'Arr:'} <strong className="text-[#F8FAFC]">Ch {channels.arranger}</strong>
            </span>
            <span className={`hidden sm:inline-flex items-center gap-1 font-bold ${isMidiConnected ? 'text-emerald-400' : 'text-neutral-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isMidiConnected ? 'bg-emerald-400 shadow-[0_0_6px_#10B981]' : 'bg-neutral-500'}`} />
              <span>
                {isMidiConnected
                  ? activeBrand === 'yamaha'
                    ? 'YAMAHA ONLINE'
                    : 'KORG ONLINE'
                  : 'AUDIO SYNTH'}
              </span>
            </span>
          </div>

        </div>
      </section>

      {/* Main Workspace Stage */}
      <main key={restoreRevision} className="flex-1 max-w-[1440px] w-full mx-auto px-2.5 sm:px-4 py-2">
        {activeTab === 'stage' && (
          <KorgStageView
            tunings={tunings}
            setTunings={setTunings}
            isPro={isPro}
            onRequirePro={openProModal}
            lang={lang}
            uiSettings={uiSettings}
            keyboardMode={keyboardMode}
            activeBrand={activeBrand}
            yamahaModel={yamahaModel}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        )}

        {activeTab === 'tashreeq' && (
          <TashreeqSection
            tunings={tunings}
            setTunings={setTunings}
            isPro={isPro}
            onRequirePro={openProModal}
            lang={lang}
            activeBrand={activeBrand}
            yamahaModel={yamahaModel}
          />
        )}

        {activeTab === 'pitch' && (
          <PitchPageSection
            channel={channels.upper1}
            lang={lang}
          />
        )}

        {activeTab === 'breath' && (
          <BreathPageSection
            lang={lang}
          />
        )}

        {activeTab === 'effects' && (
          <EffectsMixerSection lang={lang} />
        )}

        {activeTab === 'sounds' && (
          <SoundSection
            isPro={isPro}
            onRequirePro={openProModal}
            lang={lang}
            activeBrand={activeBrand}
            yamahaModel={yamahaModel}
          />
        )}

        {activeTab === 'styles' && (
          <StyleSection
            lang={lang}
            activeBrand={activeBrand}
            yamahaModel={yamahaModel}
          />
        )}

        {activeTab === 'keyboard' && (
          <VirtualKeyboard
            tunings={tunings}
            lang={lang}
          />
        )}

        {activeTab === 'pa_manager' && (
          <PaManagerSection
            isPro={isPro}
            onRequirePro={openProModal}
            onPadsImported={() => setRestoreRevision(r => r + 1)}
            onGoToStage={() => setActiveTab('stage')}
            lang={lang}
            activeBrand={activeBrand}
            yamahaModel={yamahaModel}
          />
        )}

        {activeTab === 'settings' && (
          <MidiSettingsSection
            currentModel={currentModel}
            setCurrentModel={setCurrentModel}
            onBackupRestored={handleBackupRestored}
            isPro={isPro}
            onRequirePro={openProModal}
            lang={lang}
            uiSettings={uiSettings}
            onChangeUiSettings={setUiSettings}
            onOpenUiSettings={() => setIsUiDrawerOpen(true)}
          />
        )}
      </main>

      {/* Panic Feedback Toast */}
      {panicToast && (
        <div className="fixed top-20 start-1/2 -translate-x-1/2 z-50 bg-red-950 border border-red-500 text-red-200 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-bounce">
          <ShieldAlert className="w-5 h-5 text-red-400" />
          <span>
            {isAr 
              ? 'تم تنفيذ أمر الطوارئ: إيقاف جميع الأصوات وإعادة ضبط لوحة المفاتيح!' 
              : 'PANIC EXECUTED: All notes muted and controllers reset!'}
          </span>
        </div>
      )}

      {/* Subtle Hardware Footer (hidden in fullscreen Stage mode for clean screen lock) */}
      {!(isFullscreen && activeTab === 'stage') && (
        <footer className="border-t-[1.5px] border-white/15 bg-[#030508] py-4 px-4 sm:px-6 mt-auto">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
            <div>
              <span className="font-bold text-[#FFF08A]">Korg &amp; Yamaha Pro</span>
              <span className="mx-1.5 text-neutral-600">·</span>
              <span className="font-black bg-gradient-to-r from-[#FFF08A] via-[#FACC15] to-[#B45309] bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(250,204,21,0.45)]">Wael Chetoui</span>
              <span className="mx-2">·</span>
              <span>{isAr ? 'التحكم الاحترافي في أورجات KORG و Yamaha' : 'Pro Workstation Controller for KORG & Yamaha'}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('keyboard')}
                className="hover:text-neutral-200 transition-colors"
              >
                {isAr ? 'الكلافيي (الأورج)' : 'Organ Keyboard'}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="hover:text-neutral-200 transition-colors"
              >
                {isAr ? 'إعدادات MIDI' : 'MIDI Log'}
              </button>
              <span>v2.4 Pro</span>
            </div>
          </div>
        </footer>
      )}
      </div>

      {/* Collapsible Side Display & Theme Settings Drawer */}
      <UiCustomizationDrawer
        isOpen={isUiDrawerOpen}
        onClose={() => setIsUiDrawerOpen(false)}
        settings={uiSettings}
        onChange={setUiSettings}
        lang={lang}
      />

      {/* Offline Pro Version Activation Modal */}
      <ProActivationModal
        isOpen={proModal.open}
        onClose={() => setProModal({ open: false })}
        onActivated={() => setIsPro(true)}
        lockedFeatureLabel={proModal.feature}
        lang={lang}
      />

      {/* Secret Developer Key Generator Modal (5 rapid taps within 3s on signature + PIN 1234) */}
      <DeveloperKeygenModal
        isOpen={devModalOpen}
        onClose={() => setDevModalOpen(false)}
        onActivatedThisDevice={() => setIsPro(true)}
        lang={lang}
      />

      {/* Offline connectivity badge */}
      <OfflineIndicator lang={lang} />

    </div>
  );
}
