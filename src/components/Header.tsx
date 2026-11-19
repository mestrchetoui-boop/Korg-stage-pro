import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  Sliders,
  Music,
  Radio,
  Piano,
  Settings,
  ShieldAlert,
  FolderCog,
  Lock,
  Crown,
  Palette,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Maximize2,
  Minimize2,
  MoveHorizontal,
  Wind,
} from 'lucide-react';
import { UiThemeId, UI_THEME_PRESETS } from '../data/uiThemes';
import { KeyboardEngineMode } from '../services/korgExtraMidi';
import { YAMAHA_MODELS, YamahaModelId } from '../services/yamahaMidi';

type AppTabId =
  | 'stage'
  | 'tashreeq'
  | 'pitch'
  | 'breath'
  | 'effects'
  | 'sounds'
  | 'styles'
  | 'keyboard'
  | 'pa_manager'
  | 'settings';

interface HeaderProps {
  activeTab: AppTabId;
  setActiveTab: (tab: AppTabId) => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  onPanic: () => void;
  onOpenUiSettings: () => void;
  onSignatureTap: () => void;
  onOpenPro: () => void;
  themeId: UiThemeId;
  isMidiConnected: boolean;
  selectedOutputName: string;
  isPro: boolean;
  activeBrand: 'korg' | 'yamaha';
  onSelectBrand: (brand: 'korg' | 'yamaha') => void;
  keyboardMode: KeyboardEngineMode;
  onChangeKeyboardMode: (mode: KeyboardEngineMode) => void;
  yamahaModel: YamahaModelId;
  onChangeYamahaModel: (model: YamahaModelId) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  lang,
  setLang,
  onPanic,
  onOpenUiSettings,
  onSignatureTap,
  onOpenPro,
  themeId,
  isMidiConnected,
  selectedOutputName,
  isPro,
  activeBrand,
  onSelectBrand,
  keyboardMode,
  onChangeKeyboardMode,
  yamahaModel,
  onChangeYamahaModel,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const isAr = lang === 'ar';
  const theme = UI_THEME_PRESETS[themeId] || UI_THEME_PRESETS.gold;

  const [isNavExpanded, setIsNavExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('korg_header_nav_expanded');
      return saved === 'false' ? false : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('korg_header_nav_expanded', String(isNavExpanded));
    } catch {}
  }, [isNavExpanded]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;

    if (Math.abs(dy) >= 22 && Math.abs(dy) > Math.abs(dx) * 1.25) {
      if (dy < 0) {
        setIsNavExpanded(false);
      } else {
        setIsNavExpanded(true);
      }
    }
  };

  const navItems: Array<{
    id: string;
    labelAr: string;
    labelEn: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    badge?: React.ReactNode;
    tooltip?: string;
  }> = [
    {
      id: 'stage',
      labelAr: 'شاشة المسرح',
      labelEn: 'Stage (Arbec)',
      icon: <LayoutGrid className="w-5 h-5" />,
      isActive: activeTab === 'stage',
      onClick: () => setActiveTab('stage'),
    },
    {
      id: 'tashreeq',
      labelAr: 'تشريق المقامات',
      labelEn: 'Scale Tuning',
      icon: <Sliders className="w-5 h-5" />,
      isActive: activeTab === 'tashreeq',
      onClick: () => setActiveTab('tashreeq'),
    },
    {
      id: 'pitch',
      labelAr: 'بيتش (Pitch)',
      labelEn: 'Pitch (بيتش)',
      icon: <MoveHorizontal className="w-5 h-5 text-[#FDE047]" />,
      isActive: activeTab === 'pitch',
      onClick: () => setActiveTab('pitch'),
    },
    {
      id: 'breath',
      labelAr: 'نفخ بالميكرو',
      labelEn: 'Breath (نفخ)',
      icon: <Wind className="w-5 h-5 text-[#38BDF8]" />,
      isActive: activeTab === 'breath',
      onClick: () => setActiveTab('breath'),
    },
    {
      id: 'effects',
      labelAr: 'المؤثرات والميكسر',
      labelEn: 'FX & Mixer',
      icon: <Sparkles className="w-5 h-5 text-[#FDE047]" />,
      isActive: activeTab === 'effects',
      onClick: () => setActiveTab('effects'),
    },
    {
      id: 'sounds',
      labelAr: 'الأصوات والبرامج',
      labelEn: 'Sounds & STS',
      icon: <Music className="w-5 h-5" />,
      isActive: activeTab === 'sounds',
      onClick: () => setActiveTab('sounds'),
    },
    {
      id: 'styles',
      labelAr: 'الإيقاعات والأرانجر',
      labelEn: 'Styles & Arranger',
      icon: <Radio className="w-5 h-5" />,
      isActive: activeTab === 'styles',
      onClick: () => setActiveTab('styles'),
    },
    {
      id: 'keyboard',
      labelAr: 'لوحة العزف',
      labelEn: 'Play Keys',
      icon: <Piano className="w-5 h-5" />,
      isActive: activeTab === 'keyboard',
      onClick: () => setActiveTab('keyboard'),
    },
    {
      id: 'pa_manager',
      labelAr: 'إدارة السيتات',
      labelEn: 'PA Manager',
      icon: <FolderCog className="w-5 h-5" />,
      isActive: activeTab === 'pa_manager',
      onClick: () => setActiveTab('pa_manager'),
      badge: !isPro ? (
        <span className="absolute -top-1 -end-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-[#030508] border-[1.5px] border-[#FACC15]/75 text-[#FFF08A] text-[8px] font-black leading-none shadow">
          <Lock className="w-2 h-2" />
          PRO
        </span>
      ) : undefined,
    },
    {
      id: 'theme',
      labelAr: 'تخصيص الواجهة',
      labelEn: 'Theme UI',
      icon: <Palette className={`w-5 h-5 ${theme.accentText}`} />,
      isActive: false,
      onClick: onOpenUiSettings,
    },
    {
      id: 'settings',
      labelAr: 'إعدادات MIDI',
      labelEn: 'MIDI Setup',
      icon: <Settings className="w-5 h-5" />,
      isActive: activeTab === 'settings',
      onClick: () => setActiveTab('settings'),
      tooltip: isMidiConnected ? selectedOutputName : undefined,
      badge: (
        <span
          className={`absolute top-0.5 end-0.5 w-2.5 h-2.5 rounded-full border border-[#030508] ${
            isMidiConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.95)]'
              : 'bg-neutral-500'
          }`}
        />
      ),
    },
  ];

  return (
    <header
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      className={`border-b-[1.5px] ${theme.headerBorder} bg-[#030508]/95 oled-metal-panel sticky top-0 z-40 backdrop-blur-xl select-none touch-manipulation`}
    >
      {/* Row 1: Fixed Top OLED Hardware Branding, Mode Switcher & Controls */}
      <div className="w-full max-w-[1440px] mx-auto px-2.5 sm:px-5 py-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-3">
        {/* Start: Brand Title + Signature */}
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <div className="flex flex-col leading-none">
            <h1 className="text-[12px] sm:text-sm md:text-[15px] font-black tracking-tight text-white whitespace-nowrap drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
              Korg <span className="text-[#FFF08A]">&amp;</span> Yamaha{' '}
              <span className="bg-gradient-to-b from-[#FEF9C3] via-[#FACC15] to-[#B45309] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(250,204,21,0.45)]">
                Pro
              </span>
            </h1>
            <button
              type="button"
              onClick={onSignatureTap}
              onContextMenu={(e) => e.preventDefault()}
              className="text-start text-[9px] sm:text-[10px] font-black tracking-[0.16em] uppercase bg-gradient-to-r from-[#FFF08A] via-[#FACC15] to-[#B45309] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] select-none touch-manipulation cursor-default whitespace-nowrap mt-0.5"
            >
              Wael Chetoui
            </button>
          </div>
        </div>

        {/* Center: Hardware Mode Switcher [KORG PA] vs [YAMAHA] + Sub-Model Selector */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 min-w-0">
          <div
            dir="ltr"
            className="inline-flex items-center rounded-xl border-[1.5px] border-white/15 bg-[#030508] p-0.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.9)] shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                onSelectBrand('korg');
                onChangeKeyboardMode('pa_series');
              }}
              aria-pressed={activeBrand === 'korg' && keyboardMode === 'pa_series'}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-black tracking-wide transition-all active-press flex items-center gap-1.5 whitespace-nowrap ${
                activeBrand === 'korg' && keyboardMode === 'pa_series'
                  ? 'hardware-keycap-gold text-[#030508] border-[1.5px] border-[#FEF9C3] shadow-[0_0_16px_rgba(250,204,21,0.65)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="KORG PA Arranger Mode (Channel 16 Performance & Style)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeBrand === 'korg' && keyboardMode === 'pa_series'
                    ? 'bg-emerald-500 shadow-[0_0_6px_#10B981]'
                    : 'bg-slate-600'
                }`}
              />
              <span>KORG PA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectBrand('korg');
                onChangeKeyboardMode('kronos');
              }}
              aria-pressed={activeBrand === 'korg' && keyboardMode === 'kronos'}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-black tracking-wide transition-all active-press flex items-center gap-1 whitespace-nowrap ${
                activeBrand === 'korg' && keyboardMode === 'kronos'
                  ? 'crystal-sapphire-jewel-active text-[#030508] shadow-[0_0_16px_rgba(56,189,248,0.65)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="KORG Synth Mode (Channel 1 Prog/Combi)"
            >
              <span>Synth</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectBrand('yamaha')}
              aria-pressed={activeBrand === 'yamaha'}
              className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-mono font-black tracking-wide transition-all active-press flex items-center gap-1.5 whitespace-nowrap ${
                activeBrand === 'yamaha'
                  ? 'hardware-keycap-gold text-[#030508] border-[1.5px] border-[#FEF9C3] shadow-[0_0_16px_rgba(250,204,21,0.65)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Yamaha Workstation Mode (XG Bank Select & SysEx)"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  activeBrand === 'yamaha'
                    ? 'bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]'
                    : 'bg-slate-600'
                }`}
              />
              <span>YAMAHA</span>
            </button>
          </div>

          {/* Yamaha Workstation Model Selector */}
          <div dir="ltr" className="inline-flex items-center shrink-0">
            <select
              value={yamahaModel}
              onChange={(e) => {
                onChangeYamahaModel(e.target.value as YamahaModelId);
                if (activeBrand !== 'yamaha') {
                  onSelectBrand('yamaha');
                }
              }}
              aria-label={isAr ? 'موديل أورج ياماها' : 'Yamaha Workstation Model'}
              className={`px-2.5 py-1 rounded-xl border-[1.5px] text-[10px] sm:text-[11px] font-mono font-bold outline-none transition-all cursor-pointer backdrop-blur-md ${
                activeBrand === 'yamaha'
                  ? 'bg-[#070B12] border-[#FACC15]/85 text-[#FFF08A] shadow-[0_0_14px_rgba(250,204,21,0.32),inset_0_1px_0_rgba(255,255,255,0.2)]'
                  : 'bg-[#030508] border-white/15 text-slate-300 hover:text-white hover:border-white/30'
              }`}
            >
              {YAMAHA_MODELS.map((ym) => (
                <option key={ym.id} value={ym.id} className="bg-[#030508] text-white">
                  {ym.label}
                </option>
              ))}
            </select>
          </div>

          {isPro ? (
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border-[1.5px] border-emerald-400/50 text-emerald-300 text-[9px] font-black tracking-wider inline-flex items-center gap-0.5 shrink-0 leading-none shadow-[0_0_10px_rgba(16,185,129,0.25)]">
              <Crown className="w-2.5 h-2.5" />
              PRO
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenPro}
              className="px-2 py-0.5 rounded-md bg-[#070B12] hover:bg-[#111827] border-[1.5px] border-[#FACC15]/60 text-[#FFF08A] text-[9px] font-black inline-flex items-center gap-0.5 transition-colors shrink-0 leading-none"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>{isAr ? 'تفعيل PRO' : 'PRO'}</span>
            </button>
          )}
        </div>

        {/* End: Compact Fullscreen Fixation + PANIC + AR/EN Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border-[1.5px] transition-all active:scale-95 whitespace-nowrap ${
                isFullscreen
                  ? 'crystal-sapphire-jewel-active text-[#030508]'
                  : 'hardware-keycap-dark border-white/15 text-neutral-200 hover:text-white'
              }`}
              title={isAr ? 'تثبيت ملء الشاشة وإخفاء شريط المتصفح' : 'Lock Fullscreen Mode'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? (isAr ? 'خروج' : 'EXIT') : (isAr ? 'تثبيت' : 'FULL')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPanic}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-black text-white crystal-ruby-jewel hover:brightness-110 rounded-lg transition-all active:scale-95 whitespace-nowrap"
            title={isAr ? 'كتم فوري لجميع الأصوات (Panic)' : 'Mute all sounds immediately (Panic)'}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-100" />
            <span>PANIC</span>
          </button>

          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-2 py-1 text-[11px] font-semibold text-neutral-200 hover:text-white border-[1.5px] border-white/15 hover:border-white/35 rounded-lg hardware-keycap-dark transition-colors whitespace-nowrap"
            title="Switch Language / تغيير اللغة"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>

      {/* Row 2: Collapsible Circular Navigation Carousel Drawer */}
      <div
        aria-hidden={!isNavExpanded}
        className={`w-full bg-[#030508]/90 overflow-hidden transition-all duration-200 ease-out will-change-[max-height,transform,opacity] ${
          isNavExpanded
            ? 'max-h-[108px] opacity-100 translate-y-0 border-t-[1.5px] border-white/10'
            : 'max-h-0 opacity-0 -translate-y-3 border-t-0 pointer-events-none'
        }`}
      >
        <nav
          aria-label={isAr ? 'القائمة الرئيسية' : 'Main Navigation'}
          className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          <div className="flex items-start justify-start md:justify-center gap-4 px-4 py-2 w-max min-w-full">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                tabIndex={isNavExpanded ? 0 : -1}
                onClick={item.onClick}
                title={item.tooltip || (isAr ? item.labelAr : item.labelEn)}
                className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
              >
                <span
                  className={`relative w-[52px] h-[52px] rounded-full border-[1.5px] flex items-center justify-center transition-all active:scale-95 ${
                    item.isActive
                      ? theme.tabActive
                      : 'hardware-keycap-dark border-white/15 text-neutral-300 group-hover:text-white group-hover:border-white/35'
                  }`}
                >
                  {item.icon}
                  {item.badge}
                </span>
                <span
                  className={`text-[11px] leading-tight text-center whitespace-nowrap transition-colors ${
                    item.isActive
                      ? 'text-[#F8FAFC] font-bold'
                      : 'text-neutral-400 group-hover:text-neutral-200 font-medium'
                  }`}
                >
                  {isAr ? item.labelAr : item.labelEn}
                </span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* Centered Sleek Pull-Tab Handle (Tap or Swipe Up/Down) */}
      <div className="w-full flex items-center justify-center bg-[#030508]/95 border-t-[1.5px] border-white/10">
        <button
          type="button"
          onClick={() => setIsNavExpanded((prev) => !prev)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-expanded={isNavExpanded}
          aria-label={
            isNavExpanded
              ? isAr
                ? 'إخفاء شريط الأيقونات'
                : 'Collapse navigation icons'
              : isAr
                ? 'إظهار شريط الأيقونات'
                : 'Expand navigation icons'
          }
          title={
            isNavExpanded
              ? isAr
                ? 'اضغط أو اسحب للأعلى لإخفاء القائمة'
                : 'Tap or swipe up to hide menu'
              : isAr
                ? 'اضغط أو اسحب للأسفل لإظهار القائمة'
                : 'Tap or swipe down to show menu'
          }
          className="touch-none group flex items-center justify-center gap-1.5 px-6 py-0.5 my-[2px] rounded-full bg-[#070B12]/90 hover:bg-[#111827] border-[1.5px] border-white/15 hover:border-white/35 transition-all active:scale-95 cursor-pointer select-none"
        >
          <span className="w-7 h-1 rounded-full bg-slate-500/70 group-hover:bg-slate-300 transition-colors" />
          {isNavExpanded ? (
            <ChevronUp className={`w-3.5 h-3.5 ${theme.accentText} transition-transform`} />
          ) : (
            <ChevronDown className={`w-3.5 h-3.5 ${theme.accentText} transition-transform`} />
          )}
        </button>
      </div>
    </header>
  );
};
