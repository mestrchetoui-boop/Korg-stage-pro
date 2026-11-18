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
      icon: <MoveHorizontal className="w-5 h-5 text-[#FFB703]" />,
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
      icon: <Sparkles className="w-5 h-5 text-[#FFB703]" />,
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
        <span className="absolute -top-1 -end-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-[#0D1117] border border-amber-500/60 text-amber-300 text-[8px] font-black leading-none shadow">
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
          className={`absolute top-0.5 end-0.5 w-2.5 h-2.5 rounded-full border border-[#0B1120] ${
            isMidiConnected
              ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
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
      className={`border-b ${theme.headerBorder} bg-[#0B1120]/95 sticky top-0 z-40 backdrop-blur-md select-none touch-manipulation`}
    >
      {/* Row 1: Fixed Top Brand & Status Bar */}
      <div className="w-full max-w-[1440px] mx-auto px-2.5 sm:px-5 py-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-1.5 sm:gap-4">
        {/* Right (RTL) / Start: Side-by-Side Interactive KORG & YAMAHA Brand Icon-Pills */}
        <div dir="ltr" className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* KORG Icon Pill */}
          <button
            type="button"
            onClick={() => onSelectBrand('korg')}
            aria-pressed={activeBrand === 'korg'}
            className={`px-1.5 sm:px-2 py-1 rounded-lg border flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 shrink-0 ${
              activeBrand === 'korg'
                ? 'border-[#D4AF37] bg-[#D4AF37]/12 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.32)]'
                : 'border-[#1E293B] bg-[#0F172A]/90 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
            title="KORG"
          >
            <span
              className={`w-4 h-4 sm:w-5 sm:h-5 rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                activeBrand === 'korg'
                  ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37]'
                  : 'border-slate-700 bg-[#070B14] text-slate-400'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M5 4h3.4v6.8L14.6 4H19l-6.6 7.4L19.4 20h-4.5l-5.3-6.8-1.2 1.3V20H5V4z"
                />
              </svg>
            </span>
            <svg viewBox="0 0 58 15" className="h-2.5 sm:h-3 w-auto shrink-0" aria-label="KORG">
              <text
                x="0"
                y="12.5"
                fill="currentColor"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
                fontWeight="900"
                fontSize="13.5"
                letterSpacing="2.4"
              >
                KORG
              </text>
            </svg>
          </button>

          {/* YAMAHA Icon Pill */}
          <button
            type="button"
            onClick={() => onSelectBrand('yamaha')}
            aria-pressed={activeBrand === 'yamaha'}
            className={`px-1.5 sm:px-2 py-1 rounded-lg border flex items-center gap-1 sm:gap-1.5 transition-all active:scale-95 shrink-0 ${
              activeBrand === 'yamaha'
                ? 'border-[#D4AF37] bg-[#D4AF37]/12 text-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.32)]'
                : 'border-[#1E293B] bg-[#0F172A]/90 text-slate-400 hover:border-slate-600 hover:text-slate-200'
            }`}
            title="YAMAHA"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
              <circle cx="12" cy="12" r="1.35" fill="currentColor" />
              <g transform="rotate(0 12 12)">
                <path
                  fill="currentColor"
                  d="M11.4 12V8.3c-1-.3-1.3-1.1-1.3-2.2V3.4h1.05v2.8c0 .6.3.9.85.9s.85-.3.85-.9V3.4H13.9v2.7c0 1.1-.3 1.9-1.3 2.2V12h-1.2z"
                />
              </g>
              <g transform="rotate(120 12 12)">
                <path
                  fill="currentColor"
                  d="M11.4 12V8.3c-1-.3-1.3-1.1-1.3-2.2V3.4h1.05v2.8c0 .6.3.9.85.9s.85-.3.85-.9V3.4H13.9v2.7c0 1.1-.3 1.9-1.3 2.2V12h-1.2z"
                />
              </g>
              <g transform="rotate(240 12 12)">
                <path
                  fill="currentColor"
                  d="M11.4 12V8.3c-1-.3-1.3-1.1-1.3-2.2V3.4h1.05v2.8c0 .6.3.9.85.9s.85-.3.85-.9V3.4H13.9v2.7c0 1.1-.3 1.9-1.3 2.2V12h-1.2z"
                />
              </g>
            </svg>
            <svg viewBox="0 0 74 15" className="h-2.5 sm:h-3 w-auto shrink-0" aria-label="YAMAHA">
              <text
                x="0"
                y="12.5"
                fill="currentColor"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
                fontWeight="900"
                fontSize="12.8"
                letterSpacing="1.2"
              >
                YAMAHA
              </text>
            </svg>
          </button>
        </div>

        {/* Center: Signature + Universal Korg Model Toggle + PRO Badge */}
        <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 min-w-0">
          <span
            onClick={onSignatureTap}
            onContextMenu={(e) => e.preventDefault()}
            className="text-[10px] sm:text-xs font-sans font-extrabold tracking-wider bg-gradient-to-r from-[#B8860B] via-[#9E7006] to-[#7A5901] bg-clip-text text-transparent select-none touch-manipulation cursor-default whitespace-nowrap"
          >
            By Wael Chetoui
          </span>

          {/* Universal Korg Model Toggle: KORG PA vs KORG Synth */}
          <div
            dir="ltr"
            className="inline-flex items-center rounded-lg border border-[#1E293B] bg-[#070B14] p-0.5 text-[9px] sm:text-[10px] font-mono font-black shrink-0"
            title={isAr ? 'تبديل نظام الإرسال: KORG PA (Ch 16) أو KORG Synth (Ch 1)' : 'KORG MIDI Mode: KORG PA (Ch 16) or KORG Synth (Ch 1)'}
          >
            <button
              type="button"
              onClick={() => onChangeKeyboardMode('pa_series')}
              aria-pressed={keyboardMode === 'pa_series'}
              className={`px-2 py-0.5 rounded-md transition-all whitespace-nowrap ${
                keyboardMode === 'pa_series'
                  ? 'bg-[#FFB703] text-[#070B14] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KORG PA
            </button>
            <button
              type="button"
              onClick={() => onChangeKeyboardMode('kronos')}
              aria-pressed={keyboardMode === 'kronos'}
              className={`px-2 py-0.5 rounded-md transition-all whitespace-nowrap ${
                keyboardMode === 'kronos'
                  ? 'bg-[#38BDF8] text-[#070B14] shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              KORG Synth
            </button>
          </div>

          {isPro ? (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-[9px] font-black tracking-wider inline-flex items-center gap-0.5 shrink-0 leading-none">
              <Crown className="w-2.5 h-2.5" />
              PRO
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenPro}
              className="px-1.5 py-0.5 rounded bg-[#111827] hover:bg-[#1E293B] border border-amber-500/40 text-amber-300 text-[9px] font-bold inline-flex items-center gap-0.5 transition-colors shrink-0 leading-none"
            >
              <Lock className="w-2.5 h-2.5" />
              <span>{isAr ? 'تفعيل PRO' : 'PRO'}</span>
            </button>
          )}
        </div>

        {/* Left (RTL) / End: Compact Fullscreen Fixation + PANIC + AR/EN Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-lg border transition-all active:scale-95 whitespace-nowrap ${
                isFullscreen
                  ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8] shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                  : 'bg-[#1C2128] hover:bg-[#232933] border-[#30363D] text-neutral-300 hover:text-white'
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
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-black text-red-200 bg-red-950/70 hover:bg-red-900 border border-red-500/60 rounded-lg transition-all active:scale-95 shadow-sm whitespace-nowrap"
            title={isAr ? 'كتم فوري لجميع الأصوات في الكورج (Panic)' : 'Mute all sounds immediately (Panic)'}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>PANIC</span>
          </button>

          <button
            type="button"
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-2 py-1 text-[11px] font-semibold text-neutral-300 hover:text-white border border-[#30363D] hover:border-[#484F58] rounded-lg bg-[#1C2128] transition-colors whitespace-nowrap"
            title="Switch Language / تغيير اللغة"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>

      {/* Row 2: Collapsible Circular Navigation Carousel Drawer */}
      <div
        aria-hidden={!isNavExpanded}
        className={`w-full bg-[#080D1A]/85 overflow-hidden transition-all duration-300 ease-out will-change-[max-height,transform,opacity] ${
          isNavExpanded
            ? 'max-h-[108px] opacity-100 translate-y-0 border-t border-[#1E293B]/80'
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
                  className={`relative w-[52px] h-[52px] rounded-full border flex items-center justify-center transition-all active:scale-95 ${
                    item.isActive
                      ? theme.tabActive
                      : 'bg-[#111827] border-[#1E293B] text-neutral-300 group-hover:text-white group-hover:border-slate-500 group-hover:bg-[#1C2128]'
                  }`}
                >
                  {item.icon}
                  {item.badge}
                </span>
                <span
                  className={`text-[11px] leading-tight text-center whitespace-nowrap transition-colors ${
                    item.isActive
                      ? 'text-[#F0F6FC] font-bold'
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
      <div className="w-full flex items-center justify-center bg-[#080D1A]/90 border-t border-[#1E293B]/60">
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
          className="touch-none group flex items-center justify-center gap-1.5 px-6 py-0.5 my-[2px] rounded-full bg-[#0F172A]/90 hover:bg-[#1E293B] border border-[#1E293B] hover:border-slate-500/70 transition-all active:scale-95 cursor-pointer select-none"
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
