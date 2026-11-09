import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, ExternalLink, Sparkles, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  type?: string;
  timestamp: number;
}

export const GlobalNotificationPopup: React.FC = () => {
  const [activeNotif, setActiveNotif] = useState<InAppNotificationItem | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const timerRef = useRef<any>(null);

  const playChimeSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Tone 2: 1174.66 Hz (D6) shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25);
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    } catch (_) {}
  };

  const showNotification = (item: InAppNotificationItem) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsClosing(false);
    setActiveNotif(item);
    playChimeSound();

    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (_) {}
    }

    // Auto dismiss after 8 seconds
    timerRef.current = setTimeout(() => {
      dismissNotification();
    }, 8000);
  };

  const dismissNotification = () => {
    setIsClosing(true);
    setTimeout(() => {
      setActiveNotif(null);
      setIsClosing(false);
    }, 280);
  };

  const handleOpen = () => {
    if (!activeNotif) return;
    const url = activeNotif.url || '/';
    dismissNotification();

    // If internal router navigation
    try {
      if (url.startsWith('/')) {
        window.location.hash = url;
        window.dispatchEvent(new CustomEvent('nst_navigate', { detail: { url } }));
      } else {
        window.open(url, '_blank');
      }
    } catch {
      window.location.href = url;
    }
  };

  useEffect(() => {
    const handleForeground = (e: any) => {
      const detail = e.detail || {};
      const payload = detail.payload || {};
      const item: InAppNotificationItem = {
        id: payload.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: detail.title || payload.title || 'NSTA Alert',
        body: detail.body || payload.body || 'New message or update received.',
        url: payload.url || detail.url || '/',
        icon: payload.icon || detail.icon,
        type: payload.type || detail.type || 'DEFAULT',
        timestamp: Date.now(),
      };
      showNotification(item);
    };

    const handleCustomTrigger = (e: any) => {
      const detail = e.detail || {};
      const item: InAppNotificationItem = {
        id: detail.id || `notif_${Date.now()}`,
        title: detail.title || 'Notification Alert',
        body: detail.body || 'You have a new update.',
        url: detail.url || '/',
        icon: detail.icon,
        type: detail.type || 'DEFAULT',
        timestamp: Date.now(),
      };
      showNotification(item);
    };

    window.addEventListener('nst_foreground_notification', handleForeground);
    window.addEventListener('nst_show_in_app_notification', handleCustomTrigger);

    return () => {
      window.removeEventListener('nst_foreground_notification', handleForeground);
      window.removeEventListener('nst_show_in_app_notification', handleCustomTrigger);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!activeNotif) return null;

  const isFee = activeNotif.type === 'MONTHLY_FEE' || activeNotif.type === 'FEE_RECEIPT';
  const isNotice = activeNotif.type === 'SCHOOL_NOTICE' || activeNotif.type === 'SCHOOL_HOLIDAY';
  const isMessage = activeNotif.type === 'CHAT' || activeNotif.type === 'DIRECT_MESSAGE';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed top-3 sm:top-5 left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-[999999] pointer-events-auto select-none transition-all duration-300 ease-out ${
        isClosing
          ? '-translate-y-8 opacity-0 scale-95 pointer-events-none'
          : 'translate-y-0 opacity-100 scale-100 animate-in slide-in-from-top-6 duration-300'
      }`}
    >
      <div className="relative rounded-2xl bg-slate-900/95 dark:bg-slate-900/95 text-white border border-slate-700/80 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.3)] backdrop-blur-xl p-3.5 sm:p-4 overflow-hidden">
        {/* Glow accent bar at top */}
        <div
          className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
            isFee
              ? 'from-emerald-400 via-teal-300 to-emerald-500'
              : isNotice
              ? 'from-amber-400 via-orange-400 to-amber-500'
              : isMessage
              ? 'from-blue-400 via-indigo-400 to-purple-500'
              : 'from-blue-500 via-cyan-400 to-blue-600'
          }`}
        />

        <div className="flex items-start gap-3">
          {/* Icon Badge */}
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
              isFee
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : isNotice
                ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                : isMessage
                ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-300'
                : 'bg-blue-500/20 border-blue-400/40 text-blue-300'
            }`}
          >
            {activeNotif.icon && !activeNotif.icon.endsWith('.svg') ? (
              <img
                src={activeNotif.icon}
                alt=""
                className="w-full h-full object-cover rounded-2xl"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : isFee ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : isNotice ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : isMessage ? (
              <MessageSquare className="w-5 h-5 text-indigo-400" />
            ) : (
              <Bell className="w-5 h-5 text-blue-400 animate-bounce" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isFee
                    ? 'bg-emerald-500/25 text-emerald-300'
                    : isNotice
                    ? 'bg-amber-500/25 text-amber-300'
                    : isMessage
                    ? 'bg-indigo-500/25 text-indigo-300'
                    : 'bg-blue-500/25 text-blue-300'
                }`}
              >
                {isFee ? '💰 Fee Alert' : isNotice ? '📢 School Notice' : isMessage ? '💬 Message' : '🔔 New Notification'}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">अभी (Just now)</span>
            </div>

            <h4 className="text-sm font-black text-white leading-snug line-clamp-1">{activeNotif.title}</h4>
            <p className="text-xs text-slate-300 line-clamp-2 mt-0.5 leading-relaxed">{activeNotif.body}</p>

            {/* Quick action buttons */}
            <div className="flex items-center gap-2 mt-2.5">
              <button
                type="button"
                onClick={handleOpen}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-blue-600/30 flex items-center gap-1"
              >
                <span>खोलें (Open)</span>
                <ExternalLink className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={dismissNotification}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-medium text-xs transition cursor-pointer"
              >
                हटाएं
              </button>
            </div>
          </div>

          {/* Close button top right */}
          <button
            type="button"
            onClick={dismissNotification}
            className="absolute top-2.5 right-2.5 p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 8s auto-dismiss progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-800">
          <div className="h-full bg-blue-500/80 animate-[progress_8s_linear]" />
        </div>
      </div>
    </div>
  );
};
