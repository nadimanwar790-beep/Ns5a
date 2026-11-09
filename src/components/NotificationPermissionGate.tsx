import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Megaphone,
  BookOpenCheck,
  ReceiptText,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeUserToPush,
} from './NotificationManager';
import { enableSchoolPushForUser } from '../utils/schoolPushClient';

interface Props {
  userId?: string;
  onUnlocked?: () => void;
}

export const NotificationPermissionGate: React.FC<Props> = ({ userId, onUnlocked }) => {
  const [permission, setPermission] = useState<string>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [schoolName, setSchoolName] = useState<string>('');

  useEffect(() => {
    // 1. Detect if Notification API is supported
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    // If already granted, sync tokens in background and proceed immediately
    if (currentPerm === 'granted') {
      subscribeUserToPush(userId).catch(() => {});
      if (onUnlocked) onUnlocked();
    }

    // 2. Detect linked school name if any
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
  }, [userId, onUnlocked]);

  // Handle 1-Click Allow Button
  const handleAllowClick = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestNotificationPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermission(Notification.permission);
      }

      if (granted) {
        setIsSuccess(true);
        // Register Push subscriptions
        await subscribeUserToPush(userId).catch(() => {});

        try {
          const studentList: any[] = [];
          const activeStdRaw =
            localStorage.getItem('nst_active_student') || localStorage.getItem('nst_cached_student');
          if (activeStdRaw) {
            const parsed = JSON.parse(activeStdRaw);
            if (parsed?.id) studentList.push(parsed);
          }
          await enableSchoolPushForUser({
            userId: userId || 'guest',
            students: studentList,
          }).catch(() => {});
        } catch (_) {}

        // Small joyful delay then unlock screen into app
        setTimeout(() => {
          setPermission('granted');
          if (onUnlocked) onUnlocked();
        }, 1200);
      }
    } catch (err) {
      console.warn('[NotificationGate] Permission request error:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  // Re-check permission if user went to phone settings
  const handleVerifySettings = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      setPermission(p);
      if (p === 'granted') {
        setIsSuccess(true);
        subscribeUserToPush(userId).catch(() => {});
        setTimeout(() => {
          if (onUnlocked) onUnlocked();
        }, 800);
      }
    }
  };

  // If permission is already granted or device lacks notifications entirely, do not block
  if (!isSupported || permission === 'granted') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-white overflow-y-auto select-none animate-in fade-in duration-300"
    >
      <div className="w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center my-auto">
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* Success State */}
        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white">नोटिफिकेशन सक्रिय हो गया! 🎉</h3>
            <p className="text-xs text-emerald-300 mt-2 max-w-xs leading-relaxed">
              स्कूल नोटिस, फीस रसीद व सभी महत्वपूर्ण अपडेट अब आपके फ़ोन पर सीधे मिलेंगे।
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>ऐप लोड हो रही है...</span>
            </div>
          </div>
        ) : permission === 'denied' ? (
          /* Denied / Blocked State: Guide user to enable in settings */
          <div className="py-2 text-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-base text-white">नोटिफिकेशन अनुमति ब्लॉक है</h3>
                <p className="text-xs text-amber-300">ऐप शुरू करने के लिए इसे चालू करना अनिवार्य है</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-2.5 text-slate-300 mb-5">
              <p className="font-bold text-white">फोन या Chrome में अनुमति कैसे चालू करें:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-black text-amber-400">1.</span>
                  <span>ऊपर एड्रेस बार में <strong>🔒 (ताला)</strong> या <strong>⚙️</strong> आइकॉन दबाएँ।</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-amber-400">2.</span>
                  <span><strong>&lsquo;Permissions&rsquo; ➔ &lsquo;Notifications&rsquo;</strong> पर जाकर <strong>&lsquo;Allow&rsquo;</strong> चुनें।</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-black text-amber-400">3.</span>
                  <span>(Redmi/Vivo/Oppo के लिए) <strong>&lsquo;Pop on screen / Floating alerts&rsquo;</strong> ऑन करें।</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifySettings}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>मैंने चालू कर दिया, ऐप खोलें (Verify &amp; Open)</span>
            </button>

            {/* Test/Preview Bypass for environments where browser notification dialog is suppressed */}
            <button
              type="button"
              onClick={() => {
                setPermission('granted');
                if (onUnlocked) onUnlocked();
              }}
              className="w-full mt-3 py-2 text-center text-[11px] text-slate-500 hover:text-slate-400 transition cursor-pointer"
            >
              परीक्षण मोड में जारी रखें (Continue in Preview Mode)
            </button>
          </div>
        ) : (
          /* Default State: Prompt right on app startup */
          <>
            {/* App Logo & Pulsing Bell */}
            <div className="relative mx-auto w-20 h-20 mb-4 flex items-center justify-center">
              <img
                src="/icons/icon-192.png"
                alt="NSTA Logo"
                className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/40 shadow-xl shadow-amber-500/20 bg-slate-900"
              />
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 rounded-full bg-amber-500 border-2 border-slate-900 items-center justify-center text-slate-950 shadow-md">
                <Bell className="w-3.5 h-3.5 animate-[wiggle_1s_ease-in-out_infinite]" />
              </span>
            </div>

            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>सूचना अनुमति अनिवार्य है</span>
            </div>

            {/* Headline */}
            <h2 className="text-xl font-black text-white leading-tight mb-2">
              {schoolName ? `${schoolName} लाइव अलर्ट चालू करें 🔔` : 'NSTA लाइव अलर्ट चालू करें 🔔'}
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4 leading-relaxed">
              ऐप शुरू करने के लिए नोटिफिकेशन की अनुमति देना अनिवार्य है, ताकि कोई भी महत्वपूर्ण अपडेट न छूटे।
            </p>

            {/* Benefit Points */}
            <div className="space-y-2 text-left bg-slate-950/70 border border-slate-800 p-3 rounded-2xl mb-5 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-200 font-medium">स्कूल नोटिस व अचानक अवकाश की घोषणाएँ</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                  <BookOpenCheck className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-200 font-medium">डेली होमवर्क, क्लास टेस्ट रिजल्ट व मार्क्स</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                  <ReceiptText className="w-3.5 h-3.5" />
                </div>
                <span className="text-slate-200 font-medium">आधिकारिक फीस रसीद व एग्जाम हॉल टिकट</span>
              </div>
            </div>

            {/* Safe & Secure Guarantee */}
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% सुरक्षित एवं स्पैम-मुक्त लाइव अपडेट्स।</span>
            </div>

            {/* Main Action Button */}
            <button
              type="button"
              onClick={handleAllowClick}
              disabled={isRequesting}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/30 active:scale-95 transition cursor-pointer disabled:opacity-60"
            >
              {isRequesting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>अनुमति जाँची जा रही है...</span>
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5" />
                  <span>🔔 अनुमति दें और ऐप शुरू करें (Allow)</span>
                </>
              )}
            </button>

            {/* Developer/Preview fallback */}
            <button
              type="button"
              onClick={() => {
                setPermission('granted');
                if (onUnlocked) onUnlocked();
              }}
              className="mt-3 text-[11px] text-slate-500 hover:text-slate-400 transition cursor-pointer"
            >
              डेमो / प्रीव्यू मोड में जारी रखें
            </button>
          </>
        )}
      </div>
    </div>
  );
};
