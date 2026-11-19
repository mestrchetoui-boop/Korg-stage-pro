export type UiThemeId = 'gold' | 'cyan' | 'red' | 'emerald' | 'purple' | 'orange' | 'pink' | 'blue';
export type UiButtonSize = 'small' | 'medium' | 'large' | 'xl';
export type UiColumnsCount = 2 | 3 | 4;

export interface UiCustomizationSettings {
  buttonSize: UiButtonSize;
  columns: UiColumnsCount;
  fontSize: number; // 1 (XS) to 5 (XL), default 3
  brightness: number; // 30 to 120 (%), default 100
  theme: UiThemeId;
  soundColor: UiThemeId;
  styleColor: UiThemeId;
  useIndividualPadColors: boolean;
}

export const UI_SETTINGS_STORAGE_KEY = 'korg_ui_customization_v1';

export const DEFAULT_UI_SETTINGS: UiCustomizationSettings = {
  buttonSize: 'medium',
  columns: 3,
  fontSize: 3,
  brightness: 100,
  theme: 'gold',
  soundColor: 'gold',
  styleColor: 'cyan',
  useIndividualPadColors: false,
};

export interface UiThemePreset {
  id: UiThemeId;
  nameAr: string;
  nameEn: string;
  swatchColor: string;
  panelBorder: string;
  headerBorder: string;
  accentText: string;
  secondaryAccentText: string;
  buttonIdle: string;
  buttonActive: string;
  buttonTextIdle: string;
  buttonTextActive: string;
  tabActive: string;
  pillActive: string;
  glowBox: string;
}

export const UI_THEME_PRESETS: Record<UiThemeId, UiThemePreset> = {
  gold: {
    id: 'gold',
    nameAr: 'ذهبي كريستال 8K (Liquid Gold)',
    nameEn: 'Liquid Gold Crystal 8K',
    swatchColor: 'bg-gradient-to-br from-[#FFF08A] via-[#FACC15] to-[#B45309]',
    panelBorder: 'border-[1.5px] border-white/15',
    headerBorder: 'border-white/15',
    accentText: 'text-[#FFF08A]',
    secondaryAccentText: 'text-[#38BDF8]',
    buttonIdle:
      'hardware-keycap-gold border-[1.5px] border-[#FDE047]/65',
    buttonActive:
      'hardware-keycap-gold-active border-[1.5px] border-[#FEF9C3] ring-2 ring-[#FACC15]/85',
    buttonTextIdle: 'text-[#030508]',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'crystal-emerald-jewel-active text-[#030508] font-bold',
    pillActive: 'hardware-keycap-gold-active text-[#030508] border-[#FEF9C3] led-glow-gold',
    glowBox: 'shadow-[0_0_24px_rgba(250,204,21,0.2)]',
  },
  cyan: {
    id: 'cyan',
    nameAr: 'سافاير سماوي (Crystal Cyan)',
    nameEn: 'Crystal Cyan',
    swatchColor: 'bg-gradient-to-br from-[#38BDF8] to-[#0284C7]',
    panelBorder: 'border-[1.5px] border-[#38BDF8]/40',
    headerBorder: 'border-[#38BDF8]/35',
    accentText: 'text-[#38BDF8]',
    secondaryAccentText: 'text-[#7DD3FC]',
    buttonIdle:
      'crystal-sapphire-jewel hover:brightness-110',
    buttonActive:
      'crystal-sapphire-jewel-active ring-1 ring-white',
    buttonTextIdle: 'text-[#E0F2FE]',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'bg-sky-500/20 text-sky-300 border-[1.5px] border-sky-400/70 font-bold shadow-[0_0_14px_rgba(56,189,248,0.3)]',
    pillActive: 'crystal-sapphire-jewel-active text-[#030508] led-glow-cyan',
    glowBox: 'shadow-[0_0_22px_rgba(56,189,248,0.2)]',
  },
  emerald: {
    id: 'emerald',
    nameAr: 'زمرد كريستال (Crystal Emerald)',
    nameEn: 'Crystal Emerald',
    swatchColor: 'bg-gradient-to-br from-[#10B981] to-[#047857]',
    panelBorder: 'border-[1.5px] border-[#10B981]/45',
    headerBorder: 'border-[#10B981]/40',
    accentText: 'text-[#34D399]',
    secondaryAccentText: 'text-[#6EE7B7]',
    buttonIdle:
      'crystal-emerald-jewel hover:brightness-110',
    buttonActive:
      'crystal-emerald-jewel-active ring-1 ring-white',
    buttonTextIdle: 'text-[#ECFDF5]',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'bg-emerald-500/20 text-emerald-300 border-[1.5px] border-emerald-400/70 font-bold shadow-[0_0_14px_rgba(16,185,129,0.3)]',
    pillActive: 'crystal-emerald-jewel-active text-[#030508] led-glow-emerald',
    glowBox: 'shadow-[0_0_22px_rgba(16,185,129,0.2)]',
  },
  purple: {
    id: 'purple',
    nameAr: 'بنفسجي ملكي (Crystal Purple)',
    nameEn: 'Crystal Purple',
    swatchColor: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]',
    panelBorder: 'border-[1.5px] border-[#A855F7]/45',
    headerBorder: 'border-[#A855F7]/40',
    accentText: 'text-[#C084FC]',
    secondaryAccentText: 'text-[#E9D5FF]',
    buttonIdle:
      'bg-gradient-to-b from-[#A855F7] to-[#7E22CE] hover:from-[#C084FC] hover:to-[#6B21A8] border-[1.5px] border-purple-300/45 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.42)]',
    buttonActive:
      'bg-gradient-to-b from-[#F3E8FF] to-[#A855F7] border-[1.5px] border-[#FFF08A] ring-1 ring-white shadow-[0_0_22px_rgba(168,85,247,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#1E0836]',
    tabActive:
      'bg-purple-500/20 text-purple-300 border-[1.5px] border-purple-400/70 font-bold shadow-[0_0_14px_rgba(168,85,247,0.3)]',
    pillActive: 'bg-[#A855F7] text-white border-[1.5px] border-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.65)]',
    glowBox: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]',
  },
  red: {
    id: 'red',
    nameAr: 'ياقوت أحمر (Crystal Ruby)',
    nameEn: 'Crystal Ruby',
    swatchColor: 'bg-gradient-to-br from-[#FB7185] to-[#881337]',
    panelBorder: 'border-[1.5px] border-[#F43F5E]/45',
    headerBorder: 'border-[#F43F5E]/40',
    accentText: 'text-[#FDA4AF]',
    secondaryAccentText: 'text-[#FECDD3]',
    buttonIdle:
      'crystal-ruby-jewel hover:brightness-110',
    buttonActive:
      'crystal-ruby-jewel-active ring-1 ring-white',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-white',
    tabActive:
      'bg-rose-500/20 text-rose-300 border-[1.5px] border-rose-400/70 font-bold shadow-[0_0_14px_rgba(244,63,94,0.3)]',
    pillActive: 'crystal-ruby-jewel-active text-white led-glow-red',
    glowBox: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]',
  },
  orange: {
    id: 'orange',
    nameAr: 'عنبري ناري (Amber Crystal)',
    nameEn: 'Amber Crystal',
    swatchColor: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C]',
    panelBorder: 'border-[1.5px] border-[#F97316]/45',
    headerBorder: 'border-[#F97316]/40',
    accentText: 'text-[#FB923C]',
    secondaryAccentText: 'text-[#FDBA74]',
    buttonIdle:
      'bg-gradient-to-b from-[#FB923C] to-[#B45309] hover:from-[#FDBA74] hover:to-[#9A3412] border-[1.5px] border-orange-300/50 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.45)]',
    buttonActive:
      'bg-gradient-to-b from-[#FFEDD5] to-[#F97316] border-[1.5px] border-white ring-1 ring-[#FB923C] shadow-[0_0_22px_rgba(249,115,22,0.85)]',
    buttonTextIdle: 'text-[#030508]',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'bg-orange-500/20 text-orange-300 border-[1.5px] border-orange-400/70 font-bold shadow-[0_0_14px_rgba(249,115,22,0.3)]',
    pillActive: 'bg-[#F97316] text-[#030508] border-[1.5px] border-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.65)]',
    glowBox: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]',
  },
  pink: {
    id: 'pink',
    nameAr: 'ماجنتا كريستال (Crystal Pink)',
    nameEn: 'Crystal Magenta',
    swatchColor: 'bg-gradient-to-br from-[#F472B6] to-[#DB2777]',
    panelBorder: 'border-[1.5px] border-[#EC4899]/45',
    headerBorder: 'border-[#EC4899]/40',
    accentText: 'text-[#F472B6]',
    secondaryAccentText: 'text-[#F9A8D4]',
    buttonIdle:
      'bg-gradient-to-b from-[#EC4899] to-[#BE185D] hover:from-[#F472B6] hover:to-[#9D174D] border-[1.5px] border-pink-300/45 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.42)]',
    buttonActive:
      'bg-gradient-to-b from-[#FCE7F3] to-[#EC4899] border-[1.5px] border-[#FFF08A] ring-1 ring-white shadow-[0_0_22px_rgba(236,72,153,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'bg-pink-500/20 text-pink-300 border-[1.5px] border-pink-400/70 font-bold shadow-[0_0_14px_rgba(236,72,153,0.3)]',
    pillActive: 'bg-[#EC4899] text-white border-[1.5px] border-pink-200 shadow-[0_0_18px_rgba(236,72,153,0.65)]',
    glowBox: 'shadow-[0_0_20px_rgba(236,72,153,0.2)]',
  },
  blue: {
    id: 'blue',
    nameAr: 'سافاير ملكي (Royal Sapphire)',
    nameEn: 'Royal Sapphire',
    swatchColor: 'bg-gradient-to-br from-[#60A5FA] to-[#1D4ED8]',
    panelBorder: 'border-[1.5px] border-[#3B82F6]/45',
    headerBorder: 'border-[#3B82F6]/40',
    accentText: 'text-[#60A5FA]',
    secondaryAccentText: 'text-[#93C5FD]',
    buttonIdle:
      'bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] hover:from-[#60A5FA] hover:to-[#1E40AF] border-[1.5px] border-blue-300/45 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.42)]',
    buttonActive:
      'bg-gradient-to-b from-[#DBEAFE] to-[#3B82F6] border-[1.5px] border-[#FFF08A] ring-1 ring-white shadow-[0_0_22px_rgba(59,130,246,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#030508]',
    tabActive:
      'bg-blue-500/20 text-blue-300 border-[1.5px] border-blue-400/70 font-bold shadow-[0_0_14px_rgba(59,130,246,0.3)]',
    pillActive: 'bg-[#3B82F6] text-white border-[1.5px] border-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.65)]',
    glowBox: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]',
  },
};

export function loadUiSettings(): UiCustomizationSettings {
  try {
    const raw = localStorage.getItem(UI_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_UI_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UiCustomizationSettings>;
    const buttonSize: UiButtonSize =
      parsed.buttonSize === 'small' ||
      parsed.buttonSize === 'medium' ||
      parsed.buttonSize === 'large' ||
      parsed.buttonSize === 'xl'
        ? parsed.buttonSize
        : DEFAULT_UI_SETTINGS.buttonSize;
    const columns: UiColumnsCount =
      parsed.columns === 2 || parsed.columns === 3 || parsed.columns === 4
        ? parsed.columns
        : DEFAULT_UI_SETTINGS.columns;
    const fontSize =
      typeof parsed.fontSize === 'number' && Number.isFinite(parsed.fontSize)
        ? Math.max(1, Math.min(5, Math.round(parsed.fontSize)))
        : DEFAULT_UI_SETTINGS.fontSize;
    const brightness =
      typeof parsed.brightness === 'number' && Number.isFinite(parsed.brightness)
        ? Math.max(30, Math.min(120, Math.round(parsed.brightness)))
        : DEFAULT_UI_SETTINGS.brightness;
    const theme: UiThemeId =
      parsed.theme && parsed.theme in UI_THEME_PRESETS
        ? (parsed.theme as UiThemeId)
        : DEFAULT_UI_SETTINGS.theme;
    const soundColor: UiThemeId =
      parsed.soundColor && parsed.soundColor in UI_THEME_PRESETS
        ? (parsed.soundColor as UiThemeId)
        : parsed.theme && parsed.theme in UI_THEME_PRESETS
        ? (parsed.theme as UiThemeId)
        : DEFAULT_UI_SETTINGS.soundColor;
    const styleColor: UiThemeId =
      parsed.styleColor && parsed.styleColor in UI_THEME_PRESETS
        ? (parsed.styleColor as UiThemeId)
        : DEFAULT_UI_SETTINGS.styleColor;
    const useIndividualPadColors = Boolean(parsed.useIndividualPadColors);
    return {
      buttonSize,
      columns,
      fontSize,
      brightness,
      theme,
      soundColor,
      styleColor,
      useIndividualPadColors,
    };
  } catch {
    return DEFAULT_UI_SETTINGS;
  }
}

export function saveUiSettings(settings: UiCustomizationSettings): void {
  try {
    localStorage.setItem(UI_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function getButtonSizeClasses(size: UiButtonSize, isPortrait: boolean): string {
  if (isPortrait) {
    switch (size) {
      case 'small':
        return 'min-h-[44px] p-1.5';
      case 'medium':
        return 'min-h-[60px] p-2';
      case 'large':
        return 'min-h-[76px] p-2.5';
      case 'xl':
        return 'min-h-[94px] p-3';
    }
  }
  switch (size) {
    case 'small':
      return 'min-h-[38px] px-1.5 py-0.5';
    case 'medium':
      return 'min-h-[46px] px-1.5 py-1';
    case 'large':
      return 'min-h-[60px] px-2 py-1.5';
    case 'xl':
      return 'min-h-[76px] px-2.5 py-2';
  }
}

export function getColumnsGridClass(columns: UiColumnsCount): string {
  switch (columns) {
    case 2:
      return 'grid-cols-2';
    case 4:
      return 'grid-cols-4';
    default:
      return 'grid-cols-3';
  }
}

export function getButtonFontClasses(fontSize: number): { title: string; subtitle: string } {
  switch (fontSize) {
    case 1:
      return { title: 'text-[10px]', subtitle: 'text-[7px]' };
    case 2:
      return { title: 'text-[11px]', subtitle: 'text-[8px]' };
    case 3:
      return { title: 'text-xs', subtitle: 'text-[9px]' };
    case 4:
      return { title: 'text-sm', subtitle: 'text-[10px]' };
    case 5:
      return { title: 'text-base', subtitle: 'text-[11px]' };
    default:
      return { title: 'text-xs', subtitle: 'text-[9px]' };
  }
}
