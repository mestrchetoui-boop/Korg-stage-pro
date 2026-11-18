import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  lang: 'ar' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 border border-amber-300/60 px-3.5 py-2 text-xs font-bold text-neutral-950 shadow-xl backdrop-blur-sm"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        {lang === 'ar'
          ? 'وضع أوفلاين — التطبيق يعمل محلياً بدون إنترنت'
          : 'Offline Mode — Running locally with cached data'}
      </span>
    </div>
  );
};
