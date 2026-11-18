import React, { useState } from 'react';
import { ShieldCheck, KeyRound, Copy, Check, X, Sparkles } from 'lucide-react';
import {
  getDeviceId,
  normalizeDeviceId,
  generateActivationCode,
  verifyDeveloperPin,
  activateProWithCode,
} from '../services/licenseService';

interface DeveloperKeygenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivatedThisDevice: () => void;
  lang: 'ar' | 'en';
}

export const DeveloperKeygenModal: React.FC<DeveloperKeygenModalProps> = ({
  isOpen,
  onClose,
  onActivatedThisDevice,
  lang,
}) => {
  const isAr = lang === 'ar';
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);

  const [customerDeviceId, setCustomerDeviceId] = useState<string>(() => getDeviceId());
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [selfActivatedToast, setSelfActivatedToast] = useState<boolean>(false);

  if (!isOpen) return null;

  const cleanTargetId = normalizeDeviceId(customerDeviceId);
  const generatedCode = cleanTargetId.length === 6 ? generateActivationCode(cleanTargetId) : '';

  const handleClose = () => {
    setPinInput('');
    setPinError(false);
    setIsUnlocked(false);
    onClose();
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyDeveloperPin(pinInput)) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const handleCopyGenerated = () => {
    if (!generatedCode) return;
    navigator.clipboard?.writeText(generatedCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const handleActivateCurrentDevice = () => {
    const localId = getDeviceId();
    const localCode = generateActivationCode(localId);
    const res = activateProWithCode(localCode);
    if (res.ok) {
      setSelfActivatedToast(true);
      onActivatedThisDevice();
      setTimeout(() => setSelfActivatedToast(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#120d1f] border border-cyan-500/40 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 bg-cyan-950/40 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-black text-white">
                {isAr ? 'لوحة المطور السرية · Wael Chetoui' : 'Developer Keygen · Wael Chetoui'}
              </h3>
              <p className="text-[10px] text-cyan-300/80">
                {isAr ? 'توليد أكواد التفعيل بدون إنترنت' : 'Offline Activation Code Generator'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800/70"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {!isUnlocked ? (
            <form onSubmit={handlePinSubmit} className="space-y-3">
              <label className="block font-bold text-neutral-200">
                {isAr ? 'أدخل الرقم السري للمطور:' : 'Enter Developer PIN:'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  dir="ltr"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(false);
                  }}
                  placeholder="•••••"
                  className="flex-1 bg-neutral-950 text-cyan-300 font-mono text-center text-lg tracking-[0.4em] border border-neutral-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-black text-xs transition-all active:scale-95"
                >
                  {isAr ? 'دخول' : 'Open'}
                </button>
              </div>
              {pinError && (
                <div className="text-[11px] font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 rounded-lg px-3 py-2">
                  {isAr ? 'الرقم السري غير صحيح.' : 'Incorrect developer PIN.'}
                </div>
              )}
            </form>
          ) : (
            <div className="space-y-4">
              {/* Target Customer Device ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-neutral-200">
                    {isAr ? 'معرف جهاز الزبون (Device ID - 6 خانات):' : 'Customer Device ID (6 chars):'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomerDeviceId(getDeviceId())}
                    className="text-[10px] text-cyan-300 hover:text-cyan-200 underline"
                  >
                    {isAr ? 'معرف هذا الجهاز' : 'Use This Device'}
                  </button>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={6}
                  value={customerDeviceId}
                  onChange={(e) => setCustomerDeviceId(normalizeDeviceId(e.target.value))}
                  placeholder="A7K9P2"
                  className="w-full bg-neutral-950 text-white font-mono font-black text-lg tracking-[0.3em] text-center border border-neutral-700 rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-400 uppercase"
                />
              </div>

              {/* Generated Code */}
              <div className="bg-neutral-950 border border-amber-500/40 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="flex items-center gap-1 font-bold text-amber-300">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>{isAr ? 'كود التفعيل المُولّد:' : 'Generated Activation Code:'}</span>
                  </span>
                  <span className="font-mono">{cleanTargetId.length}/6</span>
                </div>

                {generatedCode ? (
                  <div className="flex items-center justify-between gap-2 bg-[#1a1329] border border-amber-500/40 rounded-lg px-3 py-2.5">
                    <code dir="ltr" className="text-lg font-mono font-black tracking-[0.2em] text-amber-300 select-all">
                      {generatedCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyGenerated}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-black transition-colors shrink-0"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? 'نُسخ' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{isAr ? 'نسخ الكود' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2.5 text-neutral-500 font-mono border border-dashed border-neutral-800 rounded-lg">
                    {isAr ? 'أدخل 6 أحرف/أرقام لمعرف الجهاز' : 'Enter 6-character Device ID'}
                  </div>
                )}
              </div>

              {/* Quick Activate Own Device for Testing */}
              <button
                type="button"
                onClick={handleActivateCurrentDevice}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAr ? 'تفعيل النسخة الكاملة على هذا الجهاز فوراً' : 'Activate PRO on This Device Now'}</span>
              </button>

              {selfActivatedToast && (
                <div className="text-center text-emerald-300 font-bold text-[11px]">
                  {isAr ? 'تم تفعيل هذا الجهاز بنجاح!' : 'This device is now PRO!'}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
