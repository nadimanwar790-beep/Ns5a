import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Megaphone,
  BookOpenCheck,
  ReceiptText,
  Volume2,
} from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeUserToPush,
  dispatchSmartNotification,
} from './NotificationManager';
import { enableSchoolPushForUser } from '../utils/schoolPushClient';

interface Props {
  userId?: string;
}

export const NotificationPrompt: React.FC<Props> = ({ userId }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [enabledSuccess, setEnabledSuccess] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const [schoolName, setSchoolName] = useState<string>('');

  useEffect(() => {
    // Detect linked school name if any
    try {
      const activeSchoolRaw = localStorage.getItem('nst_active_school_data');
      if (activeSchoolRaw) {
        const parsed = JSON.parse(activeSchoolRaw);
        if (parsed?.name) setSchoolName(parsed.name);
      } else {
        const lastSchool = localStorage.getItem('nst_last_school_name');
        if (lastSchool) setSchoolName(lastSchool);
      }
    } catch {}

    // 1. If permission already granted, sync token silently
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      subscribeUserToPush(userId).catch(() => {});
      return;
    }

    const checkShouldPrompt = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      if (Notification.permission !== 'default') return false;

      // Check snooze timestamp (3 days)
      const snoozedUntil = localStorage.getItem('nst_push_prompt_snoozed_until');
      if (snoozedUntil && Number(snoozedUntil) > Date.now()) {
        return false;
      }
      return true;
    };

    // 2. Gentle prompt on first open / install
    const timer = setTimeout(() => {
      if (checkShouldPrompt()) {
        setShowPrompt(true);
      }
    }, 2500);

    // 3. Listen for immediate triggers on PWA Install or User Signup
    const handleImmediateTrigger = () => {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        setShowPrompt(true);
      }
    };

    window.addEventListener('app-installed-prompt-notifications', handleImmediateTrigger);
    window.addEventListener('user-signed-up-prompt-notifications', handleImmediateTrigger);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('app-installed-prompt-notifications', handleImmediateTrigger);
      window.removeEventListener('user-signed-up-prompt-notifications', handleImmediateTrigger);
    };
  }, [userId]);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        await subscribeUserToPush(userId);

        // Also register WebPush subscription for lock-screen alerts & fee demand slips
        try {
          const studentList: any[] = [];
          const activeStdRaw = localStorage.getItem('nst_active_student') || localStorage.getItem('nst_cached_student');
          if (activeStdRaw) {
            const parsed = JSON.parse(activeStdRaw);
            if (parsed?.id) studentList.push(parsed);
          }
          await enableSchoolPushForUser({
            userId: userId || 'guest',
            students: studentList,
          });
        } catch (_) {}

        setEnabledSuccess(true);

        const targetTitle = schoolName
          ? `🔔 ${schoolName} अलर्ट सक्रिय!`
          : '🔔 स्मार्ट स्कूल अलर्ट सक्रिय!';
        const targetBody = schoolName
          ? `${schoolName} के सभी नोटिस, होमवर्क, फीस रसीद व एग्जाम अपडेट अब आपको तुरंत मिलेंगे।`
          : 'आपके स्कूल, क्लास और पढ़ाई के महत्वपूर्ण अपडेट अब सीधे आपके फोन पर आएँगे।';

        // Dispatch immediate real test push notification
        dispatchSmartNotification({
          title: targetTitle,
          body: targetBody,
          category: 'DEFAULT',
          url: '/',
        });

        // Vibrate for haptic feedback if supported
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([100, 50, 100]);
          } catch {}
        }

        // Smoothly close after user sees success badge
        setTimeout(() => {
          setShowPrompt(false);
          setEnabledSuccess(false);
          setIsEnabling(false);
        }, 1800);
      } else {
        setShowPrompt(false);
        setIsEnabling(false);
      }
    } catch (e) {
      console.warn('[NotificationPrompt] Enable error:', e);
      setShowPrompt(false);
      setIsEnabling(false);
    }
    // Record that user answered
    localStorage.setItem('nst_push_prompt_dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Snooze for 3 days so we don't pester, but allow future re-prompting
    localStorage.setItem('nst_push_prompt_snoozed_until', String(Date.now() + 3 * 24 * 60 * 60 * 1000));
  };

  if (!showPrompt) return null;

  // Success State: Sleek feedback toast
  if (enabledSuccess) {
    return (
      <div className="fixed inset-x-4 bottom-20 sm:bottom-8 sm:left-auto sm:right-8 sm:w-96 z-[9999] bg-slate-950/95 backdrop-blur-xl border border-emerald-500/50 rounded-3xl p-5 shadow-2xl text-white flex items-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h4 className="font-black text-sm text-emerald-300 flex items-center gap-1.5">
            <span>नोटिफिकेशन चालू हो गया!</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-snug">
            {schoolName
              ? `${schoolName} के सभी जरूरी नोटिस अब आपको फोन पर मिलेंगे।`
              : 'स्कूल नोटिस, होमवर्क व क्लास अपडेट अब सीधे आपके फोन पर आएँगे।'}
          </p>
        </div>
      </div>
    );
  }

  // Professional Pre-Permission Card / Modal
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl sm:rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-white relative overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
        {/* Glow Accent at Top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title="बंद करें"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Pulsing Bell */}
        <div className="flex items-start gap-3.5 mb-4 pr-6">
          <div className="relative">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
              <Bell className="w-6 h-6 animate-[wiggle_1s_ease-in-out_infinite]" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Smart Live Alerts</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              {schoolName ? `${schoolName} के अलर्ट पाएँ 🔔` : 'स्कूल व क्लास के जरूरी अलर्ट चालू करें 🔔'}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              महत्वपूर्ण सूचनाएँ, छुट्टी और होमवर्क कभी न चूकें।
            </p>
          </div>
        </div>

        {/* Feature Benefits List */}
        <div className="space-y-2.5 my-4 bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl">
          <div className="flex items-start gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white">स्कूल नोटिस व छुट्टी की घोषणाएँ</p>
              <p className="text-[11px] text-slate-400">अचानक अवकाश, परीक्षा शेड्यूल और जरूरी सर्कुलर सबसे पहले</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpenCheck className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white">डेली होमवर्क व क्लास टेस्ट रिजल्ट</p>
              <p className="text-[11px] text-slate-400">टीचर द्वारा दिया गया नया होमवर्क व मार्क्स अपडेट</p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <ReceiptText className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="font-bold text-white">फीस रसीद व एडमिट कार्ड अलर्ट</p>
              <p className="text-[11px] text-slate-400">फीस भुगतान रसीद और वार्षिक परीक्षा हॉल टिकट</p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-4 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>सुरक्षित एवं स्पैम-मुक्त। आप इसे कभी भी सेटिंग्स से बंद कर सकते हैं।</span>
        </div>

        {/* Action Buttons: 1-Click Allow & Maybe Later */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={isEnabling}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer disabled:opacity-60"
          >
            {isEnabling ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                <span>चालू किया जा रहा है...</span>
              </>
            ) : (
              <>
                <Bell className="w-4.5 h-4.5" />
                <span>हाँ, 1-क्लिक में अलर्ट चालू करें (Enable)</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2.5 px-3 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/60 transition cursor-pointer text-center"
          >
            बाद में (Maybe Later)
          </button>
        </div>
      </div>
    </div>
  );
};
