import React from 'react';
import { X, Palette, Sun, Maximize2, Columns3, Type, RotateCcw, Check } from 'lucide-react';
import {
  UiCustomizationSettings,
  UiButtonSize,
  UiColumnsCount,
  UiThemeId,
  UI_THEME_PRESETS,
  DEFAULT_UI_SETTINGS,
} from '../data/uiThemes';

interface UiCustomizationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UiCustomizationSettings;
  onChange: (next: UiCustomizationSettings) => void;
  lang: 'ar' | 'en';
}

const BUTTON_SIZE_OPTIONS: Array<{ id: UiButtonSize; ar: string; en: string }> = [
  { id: 'small', ar: 'صغير', en: 'Small' },
  { id: 'medium', ar: 'متوسط', en: 'Medium' },
  { id: 'large', ar: 'كبير', en: 'Large' },
  { id: 'xl', ar: 'كبير جداً', en: 'XL' },
];

const FONT_SIZE_LABELS: Array<{ level: number; ar: string; en: string }> = [
  { level: 1, ar: 'صغير جداً', en: 'XS' },
  { level: 2, ar: 'صغير', en: 'Small' },
  { level: 3, ar: 'متوسط', en: 'Medium' },
  { level: 4, ar: 'كبير', en: 'Large' },
  { level: 5, ar: 'كبير جداً', en: 'XL' },
];

export const UiCustomizationDrawer: React.FC<UiCustomizationDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onChange,
  lang,
}) => {
  if (!isOpen) return null;

  const isAr = lang === 'ar';
  const activeTheme = UI_THEME_PRESETS[settings.theme] || UI_THEME_PRESETS.gold;
  const sizeIndex = Math.max(
    0,
    BUTTON_SIZE_OPTIONS.findIndex((o) => o.id === settings.buttonSize)
  );
  const activeFontLabel =
    FONT_SIZE_LABELS.find((f) => f.level === settings.fontSize) || FONT_SIZE_LABELS[2];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
      />

      {/* Side Drawer Panel */}
      <aside
        className={`relative z-10 w-80 sm:w-96 max-w-[92vw] h-full bg-[#0B1120] border-s ${activeTheme.panelBorder} shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="px-4 py-3.5 bg-[#070B14] border-b border-[#1E293B] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111827] border border-[#1E293B] flex items-center justify-center">
              <Palette className={`w-4 h-4 ${activeTheme.accentText}`} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#F0F6FC]">
                {isAr ? 'قائمة تخصيص الواجهة' : 'Display & Theme Settings'}
              </h2>
              <p className="text-[10px] text-neutral-400">
                {isAr ? 'تخصيص الأزرار والألوان وسطوع الشاشة' : 'Buttons, Brightness & Studio Themes'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1E293B] transition-colors"
            title={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
          {/* 1. Layout & Button Scaling Controls */}
          <section className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-4">
            <div className="flex items-center gap-1.5 font-black text-slate-200 border-b border-[#1E293B] pb-2">
              <Maximize2 className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
              <span>{isAr ? 'التحكم في الحجم والأزرار' : 'Layout & Button Scaling'}</span>
            </div>

            {/* Button Size Slider & Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">
                  {isAr ? 'حجم وارتفاع الأزرار:' : 'Button Size / Height:'}
                </span>
                <span className={`font-mono font-black ${activeTheme.accentText}`}>
                  {isAr ? BUTTON_SIZE_OPTIONS[sizeIndex].ar : BUTTON_SIZE_OPTIONS[sizeIndex].en}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3}
                step={1}
                value={sizeIndex}
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  const chosen = BUTTON_SIZE_OPTIONS[idx]?.id || 'medium';
                  onChange({ ...settings, buttonSize: chosen });
                }}
                className="w-full accent-[#FFB703] h-1.5 bg-[#111827] rounded-lg cursor-pointer"
              />
              <div className="grid grid-cols-4 gap-1">
                {BUTTON_SIZE_OPTIONS.map((opt) => {
                  const active = settings.buttonSize === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ ...settings, buttonSize: opt.id })}
                      className={`py-1 rounded-md text-[10px] font-bold border transition-all ${
                        active
                          ? activeTheme.pillActive
                          : 'bg-[#111827] text-slate-300 border-[#1E293B] hover:border-slate-500'
                      }`}
                    >
                      {isAr ? opt.ar : opt.en}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Columns per Row */}
            <div className="space-y-2 pt-2 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Columns3 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'عدد الأعمدة في الصف:' : 'Columns per Row:'}</span>
                </span>
                <span className={`font-mono font-black ${activeTheme.accentText}`}>
                  {settings.columns} {isAr ? 'أعمدة' : 'cols'}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={4}
                step={1}
                value={settings.columns}
                onChange={(e) =>
                  onChange({ ...settings, columns: Number(e.target.value) as UiColumnsCount })
                }
                className="w-full accent-[#38BDF8] h-1.5 bg-[#111827] rounded-lg cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1.5">
                {([2, 3, 4] as UiColumnsCount[]).map((col) => {
                  const active = settings.columns === col;
                  return (
                    <button
                      key={col}
                      type="button"
                      onClick={() => onChange({ ...settings, columns: col })}
                      className={`py-1.5 rounded-md font-mono font-bold text-[11px] border transition-all ${
                        active
                          ? activeTheme.pillActive
                          : 'bg-[#111827] text-slate-300 border-[#1E293B] hover:border-slate-500'
                      }`}
                    >
                      {col} {isAr ? 'أعمدة' : 'Cols'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Size Slider */}
            <div className="space-y-2 pt-2 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isAr ? 'حجم خط الأزرار:' : 'Button Font Size:'}</span>
                </span>
                <span className={`font-mono font-black ${activeTheme.accentText}`}>
                  {isAr ? activeFontLabel.ar : activeFontLabel.en}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={settings.fontSize}
                onChange={(e) =>
                  onChange({ ...settings, fontSize: Number(e.target.value) })
                }
                className="w-full accent-[#FFB703] h-1.5 bg-[#111827] rounded-lg cursor-pointer"
              />
            </div>
          </section>

          {/* 2. Screen Brightness Control */}
          <section className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
              <span className="font-black text-slate-200 flex items-center gap-1.5">
                <Sun className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
                <span>{isAr ? 'إضاءة / سطوع الواجهة' : 'Screen Brightness'}</span>
              </span>
              <span className={`font-mono font-black ${activeTheme.accentText}`}>
                {settings.brightness}%
              </span>
            </div>

            <input
              type="range"
              min={30}
              max={120}
              step={5}
              value={settings.brightness}
              onChange={(e) =>
                onChange({ ...settings, brightness: Number(e.target.value) })
              }
              className="w-full accent-[#FFB703] h-1.5 bg-[#111827] rounded-lg cursor-pointer"
            />
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
              <button
                type="button"
                onClick={() => onChange({ ...settings, brightness: 50 })}
                className="px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] hover:text-white"
              >
                {isAr ? 'مسرح مظلم 50%' : 'Dark Stage 50%'}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...settings, brightness: 100 })}
                className="px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] hover:text-white"
              >
                {isAr ? 'قياسي 100%' : 'Normal 100%'}
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...settings, brightness: 120 })}
                className="px-2 py-0.5 rounded bg-[#111827] border border-[#1E293B] hover:text-white"
              >
                {isAr ? 'ساطع 120%' : 'Bright 120%'}
              </button>
            </div>
          </section>

          {/* 3. Separate Sound vs Style Button Colors */}
          <section className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-3.5">
            <div className="flex items-center gap-1.5 font-black text-slate-200 border-b border-[#1E293B] pb-2">
              <Palette className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
              <span>{isAr ? 'ألوان الأصوات والإيقاعات' : 'Sound & Style Colors'}</span>
            </div>

            {/* Sound Buttons Color */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  {isAr ? 'لون أزرار الأصوات (Sounds):' : 'Sound Buttons Color:'}
                </span>
                <span className={`text-[10px] font-bold ${(UI_THEME_PRESETS[settings.soundColor] || activeTheme).accentText}`}>
                  {isAr
                    ? (UI_THEME_PRESETS[settings.soundColor] || activeTheme).nameAr
                    : (UI_THEME_PRESETS[settings.soundColor] || activeTheme).nameEn}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(UI_THEME_PRESETS) as UiThemeId[]).map((colorId) => {
                  const preset = UI_THEME_PRESETS[colorId];
                  const selected = settings.soundColor === colorId && !settings.useIndividualPadColors;
                  return (
                    <button
                      key={`snd_${colorId}`}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          soundColor: colorId,
                          useIndividualPadColors: false,
                        })
                      }
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        selected
                          ? 'bg-[#111827] border-white ring-1 ring-white/70 shadow-md'
                          : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-500'
                      }`}
                      title={isAr ? preset.nameAr : preset.nameEn}
                    >
                      <span className={`w-6 h-6 rounded-md ${preset.swatchColor} border border-white/25 flex items-center justify-center`}>
                        {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                        {isAr ? preset.nameAr.split(' (')[0] : preset.nameEn.split(' ')[1] || preset.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Buttons Color */}
            <div className="space-y-2 pt-2.5 border-t border-[#1E293B]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  {isAr ? 'لون أزرار الإيقاعات (Styles):' : 'Style Buttons Color:'}
                </span>
                <span className={`text-[10px] font-bold ${(UI_THEME_PRESETS[settings.styleColor] || activeTheme).accentText}`}>
                  {isAr
                    ? (UI_THEME_PRESETS[settings.styleColor] || activeTheme).nameAr
                    : (UI_THEME_PRESETS[settings.styleColor] || activeTheme).nameEn}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(UI_THEME_PRESETS) as UiThemeId[]).map((colorId) => {
                  const preset = UI_THEME_PRESETS[colorId];
                  const selected = settings.styleColor === colorId && !settings.useIndividualPadColors;
                  return (
                    <button
                      key={`sty_${colorId}`}
                      type="button"
                      onClick={() =>
                        onChange({
                          ...settings,
                          styleColor: colorId,
                          useIndividualPadColors: false,
                        })
                      }
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        selected
                          ? 'bg-[#111827] border-white ring-1 ring-white/70 shadow-md'
                          : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-500'
                      }`}
                      title={isAr ? preset.nameAr : preset.nameEn}
                    >
                      <span className={`w-6 h-6 rounded-md ${preset.swatchColor} border border-white/25 flex items-center justify-center`}>
                        {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 truncate w-full text-center">
                        {isAr ? preset.nameAr.split(' (')[0] : preset.nameEn.split(' ')[1] || preset.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Individual Pad Colors Toggle */}
            <div className="pt-2.5 border-t border-[#1E293B] flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-bold text-slate-200 text-[11px]">
                  {isAr ? 'لون مختلف لكل زر فردي' : 'Per-Button Individual Colors'}
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isAr
                    ? 'يستعمل اللون المحفوظ داخل كل زر عند تعديله'
                    : 'Uses each button custom color from Edit modal'}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...settings,
                    useIndividualPadColors: !settings.useIndividualPadColors,
                  })
                }
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border shrink-0 transition-all ${
                  settings.useIndividualPadColors
                    ? 'bg-emerald-500 text-[#070B14] border-emerald-300'
                    : 'bg-[#111827] text-slate-300 border-[#1E293B]'
                }`}
              >
                {settings.useIndividualPadColors
                  ? (isAr ? 'مفعّل ✓' : 'ON ✓')
                  : (isAr ? 'معطّل' : 'OFF')}
              </button>
            </div>
          </section>

          {/* 4. Multi-Theme Frame Color Selector */}
          <section className="bg-[#070B14] border border-[#1E293B] rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 font-black text-slate-200 border-b border-[#1E293B] pb-2">
              <Palette className={`w-3.5 h-3.5 ${activeTheme.accentText}`} />
              <span>{isAr ? 'ثيم الإطار والواجهة العام' : 'Overall Frame Theme'}</span>
            </div>

            <div className="space-y-2">
              {(Object.keys(UI_THEME_PRESETS) as UiThemeId[]).map((themeId) => {
                const preset = UI_THEME_PRESETS[themeId];
                const isSelected = settings.theme === themeId;
                return (
                  <button
                    key={themeId}
                    type="button"
                    onClick={() => onChange({ ...settings, theme: themeId })}
                    className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
                      isSelected
                        ? `bg-[#111827] ${preset.panelBorder} ring-1 ring-white/50 shadow-lg`
                        : 'bg-[#0B1120] border-[#1E293B] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-5 h-5 rounded-md ${preset.swatchColor} border border-white/25 shadow-inner shrink-0`}
                      />
                      <span className="font-bold text-xs text-slate-100 text-start">
                        {isAr ? preset.nameAr : preset.nameEn}
                      </span>
                    </div>
                    {isSelected && (
                      <span className={`p-1 rounded-full bg-[#070B14] ${preset.accentText}`}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#070B14] border-t border-[#1E293B] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onChange(DEFAULT_UI_SETTINGS)}
            className="px-3 py-2 rounded-lg bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-slate-300 text-xs font-bold flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isAr ? 'الافتراضي' : 'Reset'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#38BDF8] hover:bg-sky-300 text-[#070B14] text-xs font-black"
          >
            {isAr ? 'تم' : 'Done'}
          </button>
        </div>
      </aside>
    </div>
  );
};
