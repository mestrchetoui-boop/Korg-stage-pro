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
    nameAr: 'ذهبي ملكي (Pa4X Gold)',
    nameEn: 'Pa4X Gold',
    swatchColor: 'bg-gradient-to-br from-[#FACC15] to-[#D97706]',
    panelBorder: 'border-[#1E293B]',
    headerBorder: 'border-[#1E293B]',
    accentText: 'text-[#FFB703]',
    secondaryAccentText: 'text-[#38BDF8]',
    buttonIdle:
      'bg-[#EAB308] bg-gradient-to-b from-[#EAB308] to-[#D97706] hover:from-[#F59E0B] hover:to-[#B45309] border border-[#92400E] shadow-md',
    buttonActive:
      'bg-[#FACC15] bg-gradient-to-b from-[#FDE047] to-[#FACC15] border-2 border-[#38BDF8] ring-1 ring-white shadow-[0_0_18px_rgba(250,204,21,0.75)]',
    buttonTextIdle: 'text-[#000000]',
    buttonTextActive: 'text-[#000000]',
    tabActive:
      'bg-emerald-500/15 text-emerald-300 border-emerald-500/60 font-bold shadow-[0_0_12px_rgba(16,185,129,0.2)]',
    pillActive: 'bg-[#FFB703] text-[#070B14] border-amber-200 led-glow-gold',
    glowBox: 'shadow-[0_0_16px_rgba(255,183,3,0.12)]',
  },
  cyan: {
    id: 'cyan',
    nameAr: 'أزرق سماوي (Kronos Cyan)',
    nameEn: 'Kronos Cyan',
    swatchColor: 'bg-gradient-to-br from-[#38BDF8] to-[#0284C7]',
    panelBorder: 'border-[#0EA5E9]/45',
    headerBorder: 'border-[#0EA5E9]/40',
    accentText: 'text-[#38BDF8]',
    secondaryAccentText: 'text-[#7DD3FC]',
    buttonIdle:
      'bg-[#0EA5E9] bg-gradient-to-b from-[#38BDF8] to-[#0284C7] hover:from-[#7DD3FC] hover:to-[#0369A1] border border-[#075985] shadow-md',
    buttonActive:
      'bg-[#7DD3FC] bg-gradient-to-b from-[#BAE6FD] to-[#38BDF8] border-2 border-white ring-1 ring-[#38BDF8] shadow-[0_0_20px_rgba(56,189,248,0.85)]',
    buttonTextIdle: 'text-[#030712]',
    buttonTextActive: 'text-[#030712]',
    tabActive:
      'bg-sky-500/20 text-sky-300 border-sky-400/70 font-bold shadow-[0_0_14px_rgba(56,189,248,0.3)]',
    pillActive: 'bg-[#38BDF8] text-[#070B14] border-sky-200 led-glow-cyan',
    glowBox: 'shadow-[0_0_18px_rgba(56,189,248,0.18)]',
  },
  emerald: {
    id: 'emerald',
    nameAr: 'أخضر زمردي (Studio Emerald)',
    nameEn: 'Studio Emerald',
    swatchColor: 'bg-gradient-to-br from-[#10B981] to-[#047857]',
    panelBorder: 'border-[#10B981]/45',
    headerBorder: 'border-[#10B981]/40',
    accentText: 'text-[#34D399]',
    secondaryAccentText: 'text-[#6EE7B7]',
    buttonIdle:
      'bg-[#10B981] bg-gradient-to-b from-[#34D399] to-[#059669] hover:from-[#6EE7B7] hover:to-[#047857] border border-[#065F46] shadow-md',
    buttonActive:
      'bg-[#6EE7B7] bg-gradient-to-b from-[#A7F3D0] to-[#10B981] border-2 border-white ring-1 ring-[#34D399] shadow-[0_0_20px_rgba(16,185,129,0.85)]',
    buttonTextIdle: 'text-[#022C22]',
    buttonTextActive: 'text-[#022C22]',
    tabActive:
      'bg-emerald-500/20 text-emerald-300 border-emerald-400/70 font-bold shadow-[0_0_14px_rgba(16,185,129,0.3)]',
    pillActive: 'bg-[#10B981] text-[#022C22] border-emerald-200 led-glow-emerald',
    glowBox: 'shadow-[0_0_18px_rgba(16,185,129,0.18)]',
  },
  purple: {
    id: 'purple',
    nameAr: 'بنفسجي ملكي (Royal Purple)',
    nameEn: 'Royal Purple',
    swatchColor: 'bg-gradient-to-br from-[#A855F7] to-[#7E22CE]',
    panelBorder: 'border-[#A855F7]/45',
    headerBorder: 'border-[#A855F7]/40',
    accentText: 'text-[#C084FC]',
    secondaryAccentText: 'text-[#E9D5FF]',
    buttonIdle:
      'bg-[#9333EA] bg-gradient-to-b from-[#A855F7] to-[#7E22CE] hover:from-[#C084FC] hover:to-[#6B21A8] border border-[#581C87] shadow-md',
    buttonActive:
      'bg-[#D8B4FE] bg-gradient-to-b from-[#F3E8FF] to-[#A855F7] border-2 border-[#FFB703] ring-1 ring-white shadow-[0_0_20px_rgba(168,85,247,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#1E0836]',
    tabActive:
      'bg-purple-500/20 text-purple-300 border-purple-400/70 font-bold shadow-[0_0_14px_rgba(168,85,247,0.3)]',
    pillActive: 'bg-[#A855F7] text-white border-purple-200 shadow-[0_0_18px_rgba(168,85,247,0.65)]',
    glowBox: 'shadow-[0_0_18px_rgba(168,85,247,0.18)]',
  },
  red: {
    id: 'red',
    nameAr: 'أحمر نورد (Nord Red)',
    nameEn: 'Nord Red',
    swatchColor: 'bg-gradient-to-br from-[#EF4444] to-[#B91C1C]',
    panelBorder: 'border-[#EF4444]/45',
    headerBorder: 'border-[#EF4444]/40',
    accentText: 'text-[#F87171]',
    secondaryAccentText: 'text-[#FCA5A5]',
    buttonIdle:
      'bg-[#DC2626] bg-gradient-to-b from-[#EF4444] to-[#B91C1C] hover:from-[#F87171] hover:to-[#991B1B] border border-[#7F1D1D] shadow-md',
    buttonActive:
      'bg-[#FCA5A5] bg-gradient-to-b from-[#FECACA] to-[#EF4444] border-2 border-[#FDE047] ring-1 ring-white shadow-[0_0_20px_rgba(239,68,68,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#111827]',
    tabActive:
      'bg-red-500/20 text-red-300 border-red-400/70 font-bold shadow-[0_0_14px_rgba(239,68,68,0.3)]',
    pillActive: 'bg-[#EF4444] text-white border-red-200 led-glow-red',
    glowBox: 'shadow-[0_0_18px_rgba(239,68,68,0.18)]',
  },
  orange: {
    id: 'orange',
    nameAr: 'برتقالي ناري (Stage Orange)',
    nameEn: 'Stage Orange',
    swatchColor: 'bg-gradient-to-br from-[#FB923C] to-[#EA580C]',
    panelBorder: 'border-[#F97316]/45',
    headerBorder: 'border-[#F97316]/40',
    accentText: 'text-[#FB923C]',
    secondaryAccentText: 'text-[#FDBA74]',
    buttonIdle:
      'bg-[#EA580C] bg-gradient-to-b from-[#FB923C] to-[#C2410C] hover:from-[#FDBA74] hover:to-[#9A3412] border border-[#7C2D12] shadow-md',
    buttonActive:
      'bg-[#FDBA74] bg-gradient-to-b from-[#FFEDD5] to-[#F97316] border-2 border-white ring-1 ring-[#FB923C] shadow-[0_0_20px_rgba(249,115,22,0.85)]',
    buttonTextIdle: 'text-[#1C0A00]',
    buttonTextActive: 'text-[#1C0A00]',
    tabActive:
      'bg-orange-500/20 text-orange-300 border-orange-400/70 font-bold shadow-[0_0_14px_rgba(249,115,22,0.3)]',
    pillActive: 'bg-[#F97316] text-[#1C0A00] border-orange-200 shadow-[0_0_18px_rgba(249,115,22,0.65)]',
    glowBox: 'shadow-[0_0_18px_rgba(249,115,22,0.18)]',
  },
  pink: {
    id: 'pink',
    nameAr: 'وردي فوشيا (Magenta Pink)',
    nameEn: 'Magenta Pink',
    swatchColor: 'bg-gradient-to-br from-[#F472B6] to-[#DB2777]',
    panelBorder: 'border-[#EC4899]/45',
    headerBorder: 'border-[#EC4899]/40',
    accentText: 'text-[#F472B6]',
    secondaryAccentText: 'text-[#F9A8D4]',
    buttonIdle:
      'bg-[#DB2777] bg-gradient-to-b from-[#EC4899] to-[#BE185D] hover:from-[#F472B6] hover:to-[#9D174D] border border-[#831843] shadow-md',
    buttonActive:
      'bg-[#F9A8D4] bg-gradient-to-b from-[#FCE7F3] to-[#EC4899] border-2 border-[#FDE047] ring-1 ring-white shadow-[0_0_20px_rgba(236,72,153,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#2D0518]',
    tabActive:
      'bg-pink-500/20 text-pink-300 border-pink-400/70 font-bold shadow-[0_0_14px_rgba(236,72,153,0.3)]',
    pillActive: 'bg-[#EC4899] text-white border-pink-200 shadow-[0_0_18px_rgba(236,72,153,0.65)]',
    glowBox: 'shadow-[0_0_18px_rgba(236,72,153,0.18)]',
  },
  blue: {
    id: 'blue',
    nameAr: 'أزرق كوبالت (Cobalt Blue)',
    nameEn: 'Cobalt Blue',
    swatchColor: 'bg-gradient-to-br from-[#60A5FA] to-[#1D4ED8]',
    panelBorder: 'border-[#3B82F6]/45',
    headerBorder: 'border-[#3B82F6]/40',
    accentText: 'text-[#60A5FA]',
    secondaryAccentText: 'text-[#93C5FD]',
    buttonIdle:
      'bg-[#2563EB] bg-gradient-to-b from-[#3B82F6] to-[#1D4ED8] hover:from-[#60A5FA] hover:to-[#1E40AF] border border-[#1E3A8A] shadow-md',
    buttonActive:
      'bg-[#93C5FD] bg-gradient-to-b from-[#DBEAFE] to-[#3B82F6] border-2 border-[#FFB703] ring-1 ring-white shadow-[0_0_20px_rgba(59,130,246,0.85)]',
    buttonTextIdle: 'text-white',
    buttonTextActive: 'text-[#071433]',
    tabActive:
      'bg-blue-500/20 text-blue-300 border-blue-400/70 font-bold shadow-[0_0_14px_rgba(59,130,246,0.3)]',
    pillActive: 'bg-[#3B82F6] text-white border-blue-200 shadow-[0_0_18px_rgba(59,130,246,0.65)]',
    glowBox: 'shadow-[0_0_18px_rgba(59,130,246,0.18)]',
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
