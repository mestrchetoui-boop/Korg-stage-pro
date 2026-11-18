import React, { useState, useEffect, useRef } from 'react';
import { MidiDeviceOption, MidiLogMessage, KorgModelProfile, MidiChannelSettings } from '../types';
import { KORG_MODELS } from '../data/korgPresets';
import { midiEngine, TuningProtocol } from '../services/midiEngine';
import { downloadBackupFile, importBackupJson } from '../services/backupService';
import { canUseProFeature } from '../services/licenseService';
import {
  UiCustomizationSettings,
  UiThemeId,
  UI_THEME_PRESETS,
} from '../data/uiThemes';
import { Cpu, Terminal, RefreshCw, Send, AlertTriangle, ShieldCheck, Trash2, Sliders, Info, Radio, Play, Copy, Download, Upload, RotateCcw, Lock, Palette, Check } from 'lucide-react';

interface MidiSettingsSectionProps {
  currentModel: KorgModelProfile;
  setCurrentModel: (model: KorgModelProfile) => void;
  onBackupRestored?: () => void;
  isPro: boolean;
  onRequirePro: (featureLabel?: string) => void;
  lang: 'ar' | 'en';
  uiSettings?: UiCustomizationSettings;
  onChangeUiSettings?: (next: UiCustomizationSettings) => void;
  onOpenUiSettings?: () => void;
}

export const MidiSettingsSection: React.FC<MidiSettingsSectionProps> = ({
  currentModel,
  setCurrentModel,
  onBackupRestored,
  isPro,
  onRequirePro,
  lang,
  uiSettings,
  onChangeUiSettings,
  onOpenUiSettings,
}) => {
  const isAr = lang === 'ar';

  const [outputs, setOutputs] = useState<MidiDeviceOption[]>(() => midiEngine.getOutputs());
  const [inputs, setInputs] = useState<MidiDeviceOption[]>(() => midiEngine.getInputs());
  const [selectedOutId, setSelectedOutId] = useState<string>(() => midiEngine.getSelectedOutputId());
  const [selectedInId, setSelectedInId] = useState<string>(() => midiEngine.getSelectedInputId());
  const [logs, setLogs] = useState<MidiLogMessage[]>(() => midiEngine.getRecentLogs());
  const [customHex, setCustomHex] = useState<string>(
    'F0 42 7F 60 01 01 01 7D 00 00 00 00 00 4E 01 00 00 00 00 00 00 4E F7'
  );
  const [isSimMode, setIsSimMode] = useState<boolean>(midiEngine.getIsSimulationMode());
  const [sysexEnabled, setSysexEnabled] = useState<boolean>(midiEngine.isSysExEnabled());
  const [hasConnectedOut, setHasConnectedOut] = useState<boolean>(midiEngine.hasConnectedOutput());
  const [protocol, setProtocol] = useState<TuningProtocol>(() => midiEngine.getTuningProtocol());
  const [channels, setChannels] = useState<MidiChannelSettings>(() => midiEngine.getChannels());
  const [capturedSysEx, setCapturedSysEx] = useState<string[]>(() => midiEngine.getCapturedSysEx());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusIsError, setStatusIsError] = useState<boolean>(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const showStatus = (msg: string, isError: boolean = false) => {
    setStatusIsError(isError);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const syncFromEngine = () => {
    setOutputs(midiEngine.getOutputs());
    setInputs(midiEngine.getInputs());
    setSelectedOutId(midiEngine.getSelectedOutputId());
    setSelectedInId(midiEngine.getSelectedInputId());
    setIsSimMode(midiEngine.getIsSimulationMode());
    setSysexEnabled(midiEngine.isSysExEnabled());
    setHasConnectedOut(midiEngine.hasConnectedOutput());
    setProtocol(midiEngine.getTuningProtocol());
    setChannels(midiEngine.getChannels());
    setCapturedSysEx(midiEngine.getCapturedSysEx());
    setLogs(midiEngine.getRecentLogs());
  };

  const refreshDevices = () => {
    midiEngine.initialize().then(() => {
      syncFromEngine();
    });
  };

  useEffect(() => {
    syncFromEngine();
    const unsubLog = midiEngine.subscribeLog((msg) => {
      setLogs(prev => [msg, ...prev.slice(0, 79)]);
    });
    const unsubState = midiEngine.subscribeState(syncFromEngine);
    return () => {
      unsubLog();
      unsubState();
    };
  }, []);

  const handleSelectOutput = async (id: string) => {
    setSelectedOutId(id);
    await midiEngine.selectOutput(id, true);
    syncFromEngine();
    showStatus(isAr ? 'تم حفظ وضبط منفذ الإخراج بنجاح' : 'Output port saved & configured');
  };

  const handleSelectInput = async (id: string) => {
    setSelectedInId(id);
    await midiEngine.selectInput(id, true);
    syncFromEngine();
    showStatus(isAr ? 'تم حفظ وضبط منفذ الإدخال بنجاح' : 'Input port saved & configured');
  };

  const handleModelChange = (modelId: string) => {
    const found = KORG_MODELS.find(m => m.id === modelId);
    if (found) {
      setCurrentModel(found);
      try {
        localStorage.setItem('korg_selected_model_id', found.id);
      } catch (_) {}
      midiEngine.setModel(found, true);
      if (found.id === 'pa600') {
        setProtocol('korg_pa3x_gs');
        midiEngine.setTuningProtocol('korg_pa3x_gs');
      }
      setChannels(midiEngine.getChannels());
      showStatus(isAr ? `تم حفظ الطراز: ${found.name}` : `Saved model: ${found.name}`);
    }
  };

  const handleProtocolChange = (nextProto: TuningProtocol) => {
    setProtocol(nextProto);
    midiEngine.setTuningProtocol(nextProto);
    showStatus(isAr ? 'تم حفظ بروتوكول التشريق بنجاح' : 'Tuning protocol saved');
  };

  const handleChannelChange = (key: keyof MidiChannelSettings, value: number) => {
    if (value === 16 && !canUseProFeature('channel_16', isPro)) {
      onRequirePro(isAr ? 'قناة Ch 16 (الأداء كامل - 3 طبقات)' : 'Ch 16 (3-Layer Performance)');
      return;
    }
    const next: MidiChannelSettings = {
      ...channels,
      [key]: Math.max(1, Math.min(16, value)),
    };
    setChannels(next);
    midiEngine.setChannels(next);
    showStatus(isAr ? 'تم حفظ إعدادات القنوات تلقائياً' : 'Channel settings auto-saved');
  };

  const handleResetChannels = () => {
    const defaults: MidiChannelSettings = {
      upper1: currentModel.upper1Channel,
      upper2: currentModel.upper2Channel,
      upper3: currentModel.upper3Channel,
      lower: currentModel.lowerChannel,
      arranger: currentModel.arrangerChannel,
    };
    setChannels(defaults);
    midiEngine.setChannels(defaults);
    showStatus(isAr ? 'تمت استعادة القنوات الافتراضية للطراز' : 'Restored default model channels');
  };

  const handleExportBackup = () => {
    if (!canUseProFeature('backup_export', isPro)) {
      onRequirePro(isAr ? 'تصدير النسخة الاحتياطية' : 'Export Backup');
      return;
    }
    try {
      const { filename, keyCount } = downloadBackupFile();
      showStatus(
        isAr
          ? `تم تصدير النسخة الاحتياطية (${keyCount} إعداد): ${filename}`
          : `Backup exported (${keyCount} settings): ${filename}`
      );
    } catch {
      showStatus(isAr ? 'تعذر تصدير النسخة الاحتياطية' : 'Failed to export backup', true);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!canUseProFeature('backup_import', isPro)) {
      onRequirePro(isAr ? 'استيراد النسخة الاحتياطية' : 'Import Backup');
      return;
    }
    if (!file) return;

    try {
      const text = await file.text();
      const result = importBackupJson(text);
      if (result.ok) {
        syncFromEngine();
        setCurrentModel(midiEngine.getModel());
        onBackupRestored?.();
        showStatus(
          isAr
            ? `تم استيراد واسترجاع ${result.count} إعداداً بنجاح!`
            : `Successfully imported & restored ${result.count} settings!`
        );
      } else {
        showStatus(
          isAr ? 'ملف النسخة الاحتياطية غير صالح' : 'Invalid backup JSON file',
          true
        );
      }
    } catch {
      showStatus(isAr ? 'فشل قراءة ملف النسخة الاحتياطية' : 'Failed to read backup file', true);
    }
  };

  const handleSendCustomHex = () => {
    try {
      const clean = customHex.replace(/[^0-9A-Fa-f]/g, ' ').trim();
      const bytes = clean.split(/\s+/).map(h => parseInt(h, 16));
      if (bytes.some(isNaN)) {
        return;
      }
      midiEngine.sendRaw(bytes, isAr ? 'أمر SysEx يدوي مخصص' : 'Manual Custom SysEx', 'sysex');
    } catch {
      // ignore invalid hex
    }
  };

  return (
    <div className="space-y-6">

      {/* Sound vs Style Colors Card in Settings */}
      {uiSettings && onChangeUiSettings && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <span>{isAr ? 'ألوان أزرار الأصوات والإيقاعات (Stage Colors)' : 'Sound & Style Button Colors'}</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isAr
                  ? 'اختر لوناً مستقلاً لأزرار الأصوات ولوناً مختلفاً لأزرار الإيقاعات لتمييزهما بسهولة على المسرح.'
                  : 'Pick distinct studio colors for Sound buttons vs Style buttons.'}
              </p>
            </div>
            {onOpenUiSettings && (
              <button
                type="button"
                onClick={onOpenUiSettings}
                className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-amber-300 flex items-center gap-1.5"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>{isAr ? 'كل إعدادات الواجهة والحجم' : 'Full UI Settings'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sound Buttons Color */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">
                  {isAr ? 'لون أزرار الأصوات (SOUNDS):' : 'Sound Buttons Color:'}
                </span>
                <span className={`font-bold text-[11px] ${(UI_THEME_PRESETS[uiSettings.soundColor] || UI_THEME_PRESETS.gold).accentText}`}>
                  {isAr
                    ? (UI_THEME_PRESETS[uiSettings.soundColor] || UI_THEME_PRESETS.gold).nameAr
                    : (UI_THEME_PRESETS[uiSettings.soundColor] || UI_THEME_PRESETS.gold).nameEn}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(UI_THEME_PRESETS) as UiThemeId[]).map((colorId) => {
                  const preset = UI_THEME_PRESETS[colorId];
                  const selected = uiSettings.soundColor === colorId && !uiSettings.useIndividualPadColors;
                  return (
                    <button
                      key={`settings_snd_${colorId}`}
                      type="button"
                      onClick={() =>
                        onChangeUiSettings({
                          ...uiSettings,
                          soundColor: colorId,
                          useIndividualPadColors: false,
                        })
                      }
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        selected
                          ? 'bg-neutral-800 border-white ring-1 ring-white/70'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md ${preset.swatchColor} border border-white/25 flex items-center justify-center`}>
                        {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 truncate w-full text-center">
                        {isAr ? preset.nameAr.split(' (')[0] : preset.nameEn.split(' ')[1] || preset.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Buttons Color */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200">
                  {isAr ? 'لون أزرار الإيقاعات (STYLES):' : 'Style Buttons Color:'}
                </span>
                <span className={`font-bold text-[11px] ${(UI_THEME_PRESETS[uiSettings.styleColor] || UI_THEME_PRESETS.cyan).accentText}`}>
                  {isAr
                    ? (UI_THEME_PRESETS[uiSettings.styleColor] || UI_THEME_PRESETS.cyan).nameAr
                    : (UI_THEME_PRESETS[uiSettings.styleColor] || UI_THEME_PRESETS.cyan).nameEn}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(UI_THEME_PRESETS) as UiThemeId[]).map((colorId) => {
                  const preset = UI_THEME_PRESETS[colorId];
                  const selected = uiSettings.styleColor === colorId && !uiSettings.useIndividualPadColors;
                  return (
                    <button
                      key={`settings_sty_${colorId}`}
                      type="button"
                      onClick={() =>
                        onChangeUiSettings({
                          ...uiSettings,
                          styleColor: colorId,
                          useIndividualPadColors: false,
                        })
                      }
                      className={`p-1.5 rounded-lg border flex flex-col items-center gap-1 transition-all active:scale-95 ${
                        selected
                          ? 'bg-neutral-800 border-white ring-1 ring-white/70'
                          : 'bg-neutral-900 border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md ${preset.swatchColor} border border-white/25 flex items-center justify-center`}>
                        {selected && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300 truncate w-full text-center">
                        {isAr ? preset.nameAr.split(' (')[0] : preset.nameEn.split(' ')[1] || preset.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800 text-xs">
            <span className="text-neutral-300">
              {isAr
                ? 'أو فعّل ألوان مختلفة لكل زر على حدة (من نافذة تعديل الزر):'
                : 'Or enable individual color per button (from Button Edit modal):'}
            </span>
            <button
              type="button"
              onClick={() =>
                onChangeUiSettings({
                  ...uiSettings,
                  useIndividualPadColors: !uiSettings.useIndividualPadColors,
                })
              }
              className={`px-3 py-1.5 rounded-lg font-black border transition-all ${
                uiSettings.useIndividualPadColors
                  ? 'bg-emerald-500 text-neutral-950 border-emerald-300'
                  : 'bg-neutral-800 text-slate-300 border-neutral-700'
              }`}
            >
              {uiSettings.useIndividualPadColors
                ? (isAr ? 'ألوان فردية لكل زر: مفعّل ✓' : 'Individual Pad Colors: ON ✓')
                : (isAr ? 'ألوان فردية لكل زر: معطّل' : 'Individual Pad Colors: OFF')}
            </button>
          </div>
        </div>
      )}

      {/* Hardware Connection Card */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              <span>{isAr ? 'إعدادات أجهزة MIDI وأورغات KORG' : 'KORG & Web MIDI Hardware Setup'}</span>
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              {isAr
                ? 'الحفظ التلقائي مفعل دائماً لجميع الإعدادات (الطراز، التشريق، الأصوات، P0-P7، والقنوات) ويمكنك تصدير أو استيراد نسخة احتياطية.'
                : 'Auto-save is active for all settings (Model, Protocol, Pads, P0-P7, Channels). Export or import a backup anytime.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 rounded-lg transition-all active:scale-95"
            >
              {isPro ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAr ? 'تصدير نسخة احتياطية' : 'Export Backup'}</span>
              {!isPro && (
                <span className="px-1 py-0.2 rounded bg-amber-500/30 text-[9px] font-black">PRO</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                if (!canUseProFeature('backup_import', isPro)) {
                  onRequirePro(isAr ? 'استيراد النسخة الاحتياطية' : 'Import Backup');
                  return;
                }
                importInputRef.current?.click();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 rounded-lg transition-all active:scale-95"
            >
              {isPro ? <Upload className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isAr ? 'استيراد نسخة' : 'Import Backup'}</span>
              {!isPro && (
                <span className="px-1 py-0.2 rounded bg-amber-500/30 text-amber-300 text-[9px] font-black">PRO</span>
              )}
            </button>
            <button
              type="button"
              onClick={refreshDevices}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{isAr ? 'تحديث المنافذ' : 'Rescan Ports'}</span>
            </button>
          </div>
        </div>

        {/* Status Alert Banner */}
        <div className={`p-3.5 rounded-lg border text-xs flex items-start gap-3 ${
          isSimMode
            ? 'bg-amber-950/30 border-amber-500/40 text-amber-300'
            : hasConnectedOut
            ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
            : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300'
        }`}>
          {isSimMode ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          )}
          <div className="space-y-1">
            <div className="font-bold">
              {isSimMode
                ? (isAr ? 'وضع المحاكاة والصوت المباشر نشط (لم يتم العثور على Web MIDI أو جهاز متصل):' : 'Simulation & Audio Synthesis Active:')
                : hasConnectedOut
                ? (isAr ? 'محرك Web MIDI متصل بالكامل بأورغ الكورج:' : 'Web MIDI Connected to KORG Hardware:')
                : (isAr ? 'محرك Web MIDI جاهز للتوصيل:' : 'Web MIDI Engine Ready:')}
            </div>
            <div className="text-neutral-300 leading-relaxed">
              {isSimMode
                ? (isAr
                    ? 'يمكنك العزف على الكلافيي وسماع الأصوات والإيقاعات مباشرة في المتصفح. لتوصيل الكورج بالهاتف استخدم متصفحاً يدعم Web MIDI على أندرويد مع كابل USB OTG.'
                    : 'Playing directly via built-in synthesizer. On Android, use a Web MIDI compatible browser with a USB OTG MIDI cable.')
                : hasConnectedOut
                ? (isAr
                    ? `يتم إرسال النوتات والأصوات والإيقاعات مباشرة إلى الأورغ${sysexEnabled ? ' (مع صلاحية SysEx كاملة)' : ''}.`
                    : `Notes, sounds, and styles are streaming directly to your KORG${sysexEnabled ? ' (Full SysEx enabled)' : ''}.`)
                : (isAr
                    ? 'أوصل كابل USB-MIDI بمنفذ USB DEVICE في الأورغ ليتم الربط تلقائياً.'
                    : 'Plug your USB-MIDI cable into the KORG USB DEVICE port to auto-connect.')}
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className={`px-3 py-2 rounded-lg border text-xs font-bold ${
            statusIsError
              ? 'bg-red-900/40 border-red-500/40 text-red-200'
              : 'bg-emerald-900/40 border-emerald-500/40 text-emerald-200'
          }`}>
            {statusMessage}
          </div>
        )}

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* 1. Target KORG Model */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-white block">
              {isAr ? 'طراز أورغ كورج (KORG Model):' : 'Target KORG Model:'}
            </span>
            <select
              value={currentModel.id}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full bg-neutral-900 text-amber-400 text-xs font-bold border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              {KORG_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400">
              {currentModel.description}
            </p>
          </div>

          {/* 2. Tashreeq Tuning Protocol */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'بروتوكول إرسال التشريق:' : 'Tashreeq Protocol:'}</span>
            </span>
            <select
              value={protocol}
              onChange={(e) => handleProtocolChange(e.target.value as TuningProtocol)}
              className="w-full bg-neutral-900 text-cyan-300 text-xs font-bold border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="korg_pa3x_gs">
                {isAr ? 'Korg PA Native SysEx (الملتقط من الأورج)' : 'Korg PA Native SysEx (Hardware Capture)'}
              </option>
              <option value="pitch_bend_only">
                {isAr ? 'Pitch-Bend تلقائي (عند حجب SysEx)' : 'Auto Pitch-Bend (No SysEx)'}
              </option>
            </select>
            <p className="text-[11px] text-neutral-400">
              {isAr
                ? 'يرسل تشريق KORG PA بنظام 12 نغمة مضبوطة بدقة عند الضغط اليدوي فقط دون إرسال تلقائي.'
                : 'Sends exact 12-note KORG PA quarter-tone SysEx on manual press only.'}
            </p>
          </div>

          {/* 3. MIDI Output Port */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-white block">
              {isAr ? 'مخرج MIDI (إرسال إلى كورج):' : 'MIDI Output (Send to Korg):'}
            </span>
            <select
              value={selectedOutId}
              onChange={(e) => handleSelectOutput(e.target.value)}
              className="w-full bg-neutral-900 text-neutral-200 text-xs border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">{isAr ? '-- اختر مخرج MIDI --' : '-- Select MIDI Output --'}</option>
              {outputs.map(out => (
                <option key={out.id} value={out.id}>
                  {out.name} ({out.manufacturer})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400">
              {outputs.length > 0
                ? (isAr ? `متوفر ${outputs.length} منفذ مخرج` : `${outputs.length} output ports found`)
                : (isAr ? 'لم يتم العثور على أجهزة (وضع المحاكاة يعمل)' : 'No devices found (using simulation)')}
            </p>
          </div>

          {/* 4. MIDI Input Port */}
          <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-2">
            <span className="text-xs font-bold text-white block">
              {isAr ? 'مدخل MIDI (استقبال من الكورج):' : 'MIDI Input (Receive from Korg):'}
            </span>
            <select
              value={selectedInId}
              onChange={(e) => handleSelectInput(e.target.value)}
              className="w-full bg-neutral-900 text-neutral-200 text-xs border border-neutral-700 rounded-lg p-2.5 focus:outline-none focus:border-amber-500"
            >
              <option value="">{isAr ? '-- اختر مدخل MIDI --' : '-- Select MIDI Input --'}</option>
              {inputs.map(inp => (
                <option key={inp.id} value={inp.id}>
                  {inp.name} ({inp.manufacturer})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-neutral-400">
              {inputs.length > 0
                ? (isAr ? `متوفر ${inputs.length} منفذ مدخل` : `${inputs.length} input ports found`)
                : (isAr ? 'لم يتم العثور على مدخل' : 'No input ports found')}
            </p>
          </div>

        </div>

        {/* MIDI Channels Assignment (Auto-Saved) */}
        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-white">
              {isAr ? 'إعدادات قنوات MIDI (تُحفظ تلقائياً):' : 'MIDI Channel Routing (Auto-Saved):'}
            </span>
            <button
              type="button"
              onClick={handleResetChannels}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isAr ? 'الافتراضي للطراز' : 'Model Defaults'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {(
              [
                { key: 'upper1', labelAr: 'Upper 1 (الرئيسي)', labelEn: 'Upper 1' },
                { key: 'upper2', labelAr: 'Upper 2 (مصاحب)', labelEn: 'Upper 2' },
                { key: 'upper3', labelAr: 'Upper 3 (طبقة)', labelEn: 'Upper 3' },
                { key: 'lower', labelAr: 'Lower (يسار)', labelEn: 'Lower' },
                { key: 'arranger', labelAr: 'Arranger (الإيقاع)', labelEn: 'Arranger' },
              ] as { key: keyof MidiChannelSettings; labelAr: string; labelEn: string }[]
            ).map(item => (
              <div key={item.key} className="space-y-1">
                <label className="text-[11px] text-neutral-400 block">
                  {isAr ? item.labelAr : item.labelEn}
                </label>
                <select
                  value={channels[item.key]}
                  onChange={(e) => handleChannelChange(item.key, Number(e.target.value))}
                  className="w-full bg-neutral-900 text-amber-400 font-mono font-bold text-xs border border-neutral-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-amber-500"
                >
                  {Array.from({ length: 16 }, (_, idx) => idx + 1).map(ch => (
                    <option key={ch} value={ch}>
                      {ch === 16 && !isPro ? 'Ch 16 🔒 PRO' : `Ch ${ch}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* KORG Keyboard Connection Checklist */}
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3.5 text-xs space-y-1.5">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            <span>{isAr ? 'إعدادات توصيل أورغ كورج بالكابل:' : 'KORG USB-MIDI Connection Checklist:'}</span>
          </div>
          <ul className="list-disc list-inside text-neutral-300 space-y-1 text-[11px] leading-relaxed">
            <li>
              {isAr
                ? 'الكابل في الأورغ: صل الكابل بمنفذ USB DEVICE المربع خلف الكورج (وليس منفذ USB HOST)، وعلى هاتف أندرويد اختر وضع USB: MIDI وافتح التطبيق في المتصفح الداعم.'
                : 'Cable port: Plug into the square USB DEVICE port on KORG (NOT USB HOST). On Android set USB mode to MIDI and open in your MIDI browser.'}
            </li>
            <li>
              {isAr
                ? 'في GLOBAL ← MIDI ← تبويب MIDI IN CHANNELS: اضبط القنوات Ch 01 = Upper 1، Ch 02 = Upper 2، Ch 03 = Upper 3 لتلعب مباشرة من الكلافيي.'
                : 'In GLOBAL -> MIDI -> MIDI IN CHANNELS: set Ch 01=Upper 1, Ch 02=Upper 2, Ch 03=Upper 3 for live keyboard play.'}
            </li>
          </ul>
        </div>

      </div>

      {/* Manual SysEx Sender + Live Capture */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'مختبر أوامر MIDI / SysEx المخصصة' : 'Manual MIDI / SysEx Command Sender'}</span>
          </h3>
          <p className="text-xs text-neutral-400">
            {isAr
              ? 'أدخل بايتات Hex مفصولة بمسافات لاختبار التوافق مباشرة، أو راقب الرسائل الواردة من الأورغ.'
              : 'Enter space-separated hex bytes to test directly, or monitor incoming SysEx from your KORG below.'}
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              dir="ltr"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="flex-1 bg-neutral-950 text-amber-400 font-mono text-xs border border-neutral-700 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500"
              placeholder="F0 7E 7F 06 01 F7"
            />
            <button
              onClick={handleSendCustomHex}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isAr ? 'إرسال' : 'Send Hex'}</span>
            </button>
          </div>
        </div>

        {/* Live Korg SysEx Capture */}
        <div className="bg-neutral-950/90 border border-neutral-800 rounded-lg p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span>{isAr ? 'التقاط أوامر SysEx الواردة من الأورغ' : 'Live Incoming KORG SysEx Capture'}</span>
            </div>
            {capturedSysEx.length > 0 && (
              <button
                onClick={() => midiEngine.clearCapturedSysEx()}
                className="px-2 py-1 text-[11px] text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded transition-colors"
              >
                {isAr ? 'مسح الملتقط' : 'Clear'}
              </button>
            )}
          </div>
          <p className="text-[11px] text-neutral-400 leading-relaxed">
            {isAr
              ? 'أي رسالة SysEx يرسلها الأورغ أثناء ربط الكابل ستظهر هنا فوراً للمعاينة أو إعادة الإرسال.'
              : 'Any incoming SysEx sent by your physical KORG while connected appears here for inspection or replay.'}
          </p>

          {capturedSysEx.length === 0 ? (
            <div className="text-[11px] text-neutral-600 font-mono py-2 text-center border border-dashed border-neutral-800 rounded">
              {isAr ? 'في انتظار استقبال SysEx من منفذ MIDI IN...' : 'Waiting for incoming SysEx on MIDI IN...'}
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {capturedSysEx.map((hex, idx) => (
                <div
                  key={`${idx}-${hex.slice(0, 16)}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5"
                >
                  <code dir="ltr" className="text-[11px] font-mono text-cyan-300 break-all">
                    {hex}
                  </code>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setCustomHex(hex);
                        setStatusMessage(isAr ? 'تم نسخ الأمر لمختبر SysEx' : 'Loaded into SysEx tester');
                        setTimeout(() => setStatusMessage(null), 1500);
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isAr ? 'نسخ للاختبار' : 'Load'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const bytes = hex.split(/\s+/).map(h => parseInt(h, 16)).filter(n => !isNaN(n));
                        if (bytes.length > 0) {
                          midiEngine.sendRaw(bytes, isAr ? 'إعادة إرسال SysEx الملتقط' : 'Replay Captured SysEx', 'sysex');
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      <span>{isAr ? 'إعادة إرسال' : 'Replay'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live MIDI Event Monitor Log */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-xl space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">
              {isAr ? 'شاشة مراقبة أوامر MIDI الحية (MIDI Event Monitor)' : 'Live MIDI Event Monitor'}
            </span>
            <span className="text-xs font-mono text-amber-400">
              ({logs.length} {isAr ? 'رسالة' : 'events'})
            </span>
          </div>

          <button
            onClick={() => {
              midiEngine.clearLogs();
              setLogs([]);
            }}
            className="p-1.5 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded transition-colors text-xs flex items-center gap-1"
            title="Clear Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isAr ? 'مسح السجل' : 'Clear'}</span>
          </button>
        </div>

        {/* Log Viewer Console */}
        <div className="bg-neutral-950 rounded-lg p-3 font-mono text-xs h-64 overflow-y-auto border border-neutral-800/80 space-y-1.5 scrollbar-thin">
          {logs.length === 0 ? (
            <div className="text-neutral-600 text-center py-10">
              {isAr ? 'السجل فارغ. سيتم إظهار جميع أوامر MIDI المرسلة والمستقبلة هنا فوراً.' : 'No events yet. Sent and received MIDI data will stream here in real time.'}
            </div>
          ) : (
            logs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-2 text-[11px] py-0.5 border-b border-neutral-900/60 last:border-b-0"
              >
                <span className="text-neutral-500 shrink-0">{log.timestamp}</span>
                <span className={`px-1 rounded text-[9px] font-bold shrink-0 ${
                  log.direction === 'out'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {log.direction.toUpperCase()}
                </span>
                <span className={`px-1 rounded text-[9px] font-bold shrink-0 ${
                  log.type === 'sysex' ? 'bg-purple-500/20 text-purple-300' :
                  log.type === 'note_on' ? 'bg-emerald-500/20 text-emerald-300' :
                  log.type === 'note_off' ? 'bg-neutral-800 text-neutral-400' :
                  log.type === 'pc' ? 'bg-blue-500/20 text-blue-300' :
                  log.type === 'cc' ? 'bg-amber-600/20 text-amber-300' :
                  'bg-neutral-800 text-neutral-300'
                }`}>
                  {log.type.toUpperCase()}
                </span>
                {log.channel !== undefined && (
                  <span className={`px-1.5 rounded text-[9px] font-mono font-black shrink-0 ${
                    log.channel === 16
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-300'
                  }`}>
                    [Ch {log.channel}]
                  </span>
                )}
                <span className="text-neutral-300 flex-1 truncate">
                  {log.description}
                </span>
                <span className="text-neutral-400 font-mono text-[10px] shrink-0">
                  [{log.hex}]
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
