import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

interface OfflineIndicatorProps {
  language: 'hi' | 'en';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ language }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-xl bg-slate-900/95 border border-amber-500/60 px-3.5 py-2 text-xs font-semibold text-amber-300 shadow-2xl backdrop-blur-md animate-bounce">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
      </span>
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        {language === 'hi'
          ? '100% ऑफ़लाइन मोड — सभी 3D विज़ुअल टूल्स बिना इंटरनेट के काम कर रहे हैं'
          : '100% Offline Mode — All 3D tools & solver working offline'}
      </span>
    </div>
  );
};
