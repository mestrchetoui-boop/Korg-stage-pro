import React, { useState } from 'react';
import { Crown, Lock, Copy, Check, MessageCircle, KeyRound, X, Sparkles } from 'lucide-react';
import { getDeviceId, activateProWithCode } from '../services/licenseService';

interface ProActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivated: () => void;
  lockedFeatureLabel?: string;
  lang: 'ar' | 'en';
}

export const ProActivationModal: React.FC<ProActivationModalProps> = ({
  isOpen,
  onClose,
  onActivated,
  lockedFeatureLabel,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [deviceId] = useState<string>(() => getDeviceId());
  const [codeInput, setCodeInput] = useState<string>('');
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successDone, setSuccessDone] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard?.writeText(deviceId).catch(() => {});
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const res = activateProWithCode(codeInput);
    if (res.ok) {
      setSuccessDone(true);
      onActivated();
      setTimeout(() => {
        setSuccessDone(false);
        setCodeInput('');
        onClose();
      }, 1200);
    } else {
      setErrorMsg(
        isAr
          ? 'كود التفعيل غير صحيح أو لا يطابق معرف هذا الجهاز.'
          : 'Invalid activation code for this Device ID.'
      );
    }
  };

  const whatsappHref = 'https://wa.me/21653291487';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gradient-to-b from-[#1a1329] to-[#0f0b18] border border-amber-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-transparent border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-1.5">
                <span>{isAr ? 'تفعيل النسخة الكاملة (PRO)' : 'Activate KORG Oriental PRO'}</span>
              </h3>
              <p className="text-[11px] text-amber-300/90">
                {isAr ? 'تفعيل دائم مدى الحياة — يعمل 100% بدون إنترنت' : 'Lifetime Offline Activation — No Internet Needed'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/70 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {lockedFeatureLabel && (
            <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                {isAr
                  ? `الميزة المطلوبة مقفلة في الوضع المجاني: ${lockedFeatureLabel}`
                  : `PRO Feature Locked: ${lockedFeatureLabel}`}
              </span>
            </div>
          )}

          {/* Pro Benefits */}
          <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 space-y-1.5 text-[11px] text-neutral-300">
            <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isAr ? 'مزايا النسخة الاحترافية المفتوحة:' : 'Included in PRO Version:'}</span>
            </div>
            <div>• {isAr ? 'فتح جميع أزرار الأصوات وصفحات المكتبة (المجاني: أول 3 أصوات فقط)' : 'Unlock all Sound Pads & Library pages (Free: first 3 only)'}</div>
            <div>• {isAr ? 'تعديل الأزرار وإضافة أصوات مخصصة (الاسم، MSB / LSB / PC)' : 'Edit & customize buttons (Name, MSB / LSB / PC)'}</div>
            <div>• {isAr ? 'فتح جميع المقامات وأزرار التشريق اليدوي المباشر' : 'Unlock all Maqamat & direct manual quarter-tone keys'}</div>
            <div>• {isAr ? 'فتح قناة Ch 16، جميع أزرار P0-P7 و SAVE، وتصدير/استيراد النسخ' : 'Unlock Ch 16, P0-P7 & SAVE, plus Backup Export/Import'}</div>
          </div>

          {/* Device ID Display */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400">
                {isAr ? 'معرف الجهاز الخاص بك (Device ID):' : 'Your Device ID:'}
              </span>
              <span className="text-[10px] text-neutral-500">
                {isAr ? 'ثابت لهذا الهاتف' : 'Fixed per device'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 bg-[#140e24] border border-[#3a275f] rounded-lg px-3 py-2">
              <code dir="ltr" className="text-lg font-mono font-black tracking-[0.25em] text-amber-300 select-all">
                {deviceId}
              </code>
              <button
                type="button"
                onClick={handleCopyDeviceId}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-100 text-[11px] font-bold transition-colors shrink-0"
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">{isAr ? 'تم النسخ' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isAr ? 'نسخ' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* WhatsApp Purchase CTA */}
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              window.open('https://wa.me', '_blank');
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isAr ? 'تواصل عبر واتساب لشراء كود التفعيل' : 'Contact via WhatsApp to Buy Code'}</span>
          </a>

          {/* Activation Code Form */}
          <form onSubmit={handleActivate} className="space-y-2.5 pt-1 border-t border-neutral-800">
            <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>{isAr ? 'أدخل كود التفعيل (Activation Code):' : 'Enter Activation Code:'}</span>
            </label>

            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="XXXX-XXXX"
                className="flex-1 bg-neutral-950 text-amber-300 font-mono font-bold text-sm tracking-widest text-center border border-neutral-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 uppercase"
              />
              <button
                type="submit"
                disabled={!codeInput.trim() || successDone}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-neutral-950 font-black text-xs transition-all active:scale-95 shrink-0"
              >
                {isAr ? 'تفعيل' : 'Unlock'}
              </button>
            </div>

            {errorMsg && (
              <div className="text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                {errorMsg}
              </div>
            )}

            {successDone && (
              <div className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'تم تفعيل النسخة الاحترافية بنجاح للأبد!' : 'PRO Version Activated Forever!'}</span>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
};
