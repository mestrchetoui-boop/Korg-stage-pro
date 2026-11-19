import React from 'react';
import { MoveHorizontal, Sparkles } from 'lucide-react';
import { PitchRibbon } from './PitchRibbon';

interface PitchPageSectionProps {
  channel?: number;
  lang: 'ar' | 'en';
}

export const PitchPageSection: React.FC<PitchPageSectionProps> = ({ channel = 1, lang }) => {
  const isAr = lang === 'ar';

  return (
    <div className="space-y-4">
      {/* Standalone Pitch Page Header */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl hardware-keycap-gold border-[1.5px] border-[#FEF9C3] flex items-center justify-center text-[#030508] shrink-0 shadow-[0_0_16px_rgba(250,204,21,0.45)]">
            <MoveHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-[#F8FAFC] flex items-center gap-2">
              <span>{isAr ? 'وحدة التحكم المستقلة في البيتش (Pitch / بيتش)' : 'Standalone Pitch Bend & Ribbon (بيتش)'}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              {isAr
                ? 'تحكم واسع ودقيق في البيتش بيند بمدى ±2 / ±5 / ±12 نصف تون (RPN) مع وضع Spring للرجوع التلقائي أو Ribbon لتثبيت الدرجة وزر Reset 0.'
                : 'Full-width expressive Pitch Bend & Oriental Ribbon controller with ±2 / ±5 / ±12 RPN range selector, Spring vs Ribbon Hold mode, and Reset 0.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono shrink-0">
          <span className="px-2.5 py-1 rounded-lg bg-[#030508] border-[1.5px] border-white/15 text-[#38BDF8] font-bold inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#FACC15]" />
            <span>{isAr ? `القناة النشطة: Ch ${channel}` : `Active Upper: Ch ${channel}`}</span>
          </span>
        </div>
      </div>

      {/* Full-Size PitchRibbon Controller */}
      <PitchRibbon channel={channel} lang={lang} />

      {/* Quick Hardware Guide */}
      <div className="oled-metal-panel border-[1.5px] border-white/15 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <span>
          {isAr
            ? 'نصيحة: اختيار المدى (±2 / ±5 / ±12) يرسل رسالة MIDI RPN القياسية (CC 101=0 · CC 100=0 · CC 6=Range) على القناة 1 لضبط حساسية الأورج تلقائياً.'
            : 'Tip: Selecting ±2, ±5, or ±12 transmits standard MIDI RPN Pitch Bend Sensitivity (CC 101=0, CC 100=0, CC 6=Range, CC 38=0) on Channel 1.'}
        </span>
        <span dir="ltr" className="font-mono text-[#FFF08A] font-bold">
          RPN 00/00 · Pitch Bend + CC#1 Mod
        </span>
      </div>
    </div>
  );
};
