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
  Sliders,
  Smartphone,
  ChevronRight,
  Send,
  X,
  Volume2,
} from 'lucide-react';
import {
  requestNotificationPermission,
  subscribeUserToPush,
  dispatchSmartNotification,
} from './NotificationManager';
import { enableSchoolPushForUser, sendSchoolPushNotification } from '../utils/schoolPushClient';

interface Props {
  userId?: string;
  onUnlocked?: () => void;
}

export const NotificationPermissionGate: React.FC<Props> = ({ userId, onUnlocked }) => {
  const [permission, setPermission] = useState<string>('default');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isRequesting, setIsRequesting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isHeadsUpVerified, setIsHeadsUpVerified] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nst_popup_heads_up_verified') === 'true';
    } catch {
      return false;
    }
  });

  // Bypass Mode State — Default is TRUE ("defuot me bypass rahega", managed by Super Admin)
  const [bypassAllowed, setBypassAllowed] = useState<boolean>(() => {
    try {
      const sysRaw = localStorage.getItem('nst_system_settings');
      if (sysRaw) {
        const parsed = JSON.parse(sysRaw);
        if (typeof parsed?.notificationGateBypass === 'boolean') {
          return parsed.notificationGateBypass;
        }
      }
      const direct = localStorage.getItem('nst_notification_gate_bypass');
      if (direct !== null) return direct === 'true';
    } catch {}
    return true; // Default is bypass enabled
  });

  // Skipped State — Allows user to skip and turn on later
  const [isSkipped, setIsSkipped] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem('nst_notif_gate_skipped') === 'true' ||
        sessionStorage.getItem('nst_notif_gate_skipped') === 'true'
      );
    } catch {
      return false;
    }
  });

  const [forceShowGuide, setForceShowGuide] = useState<boolean>(false);
  const [activeBrandTab, setActiveBrandTab] = useState<'samsung' | 'redmi' | 'vivo' | 'oppo' | 'chrome'>('samsung');
  const [testSent, setTestSent] = useState<boolean>(false);
  const [schoolName, setSchoolName] = useState<string>('');
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any)?.standalone === true
    );
  });
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(display-mode: standalone)');
    const check = () => {
      setIsStandalone(mql.matches || (window.navigator as any)?.standalone === true);
    };
    mql.addEventListener?.('change', check);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      mql.removeEventListener?.('change', check);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (_) {}
    } else {
      alert('NSTA को होम स्क्रीन पर ऐप की तरह इंस्टॉल करने के लिए:\n1. Chrome में ऊपर दाएँ कोने में ⋮ (3 डॉट्स) दबाएँ।\n2. "Install app" या "Add to Home screen" चुनें।\n3. फिर होम स्क्रीन पर बने NSTA आइकन से ऐप खोलें!');
    }
  };

  // Sync Super Admin policy changes in real time
  useEffect(() => {
    const handleSettingsUpdated = () => {
      try {
        const sysRaw = localStorage.getItem('nst_system_settings');
        if (sysRaw) {
          const parsed = JSON.parse(sysRaw);
          if (typeof parsed?.notificationGateBypass === 'boolean') {
            setBypassAllowed(parsed.notificationGateBypass);
          }
        }
        const direct = localStorage.getItem('nst_notification_gate_bypass');
        if (direct !== null) {
          setBypassAllowed(direct === 'true');
        }
      } catch {}
    };
    window.addEventListener('nst_system_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('nst_system_settings_updated', handleSettingsUpdated);
  }, []);

  useEffect(() => {
    // 1. Detect if Notification API is supported
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setIsSupported(false);
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    if (currentPerm === 'granted') {
      subscribeUserToPush(userId).catch(() => {});
      if (isHeadsUpVerified && onUnlocked) {
        onUnlocked();
      }
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

    // 3. Listen for manual reopen event (e.g. user or Super Admin wants to turn on or test)
    const handleReopen = () => {
      setForceShowGuide(true);
    };
    window.addEventListener('open-popup-settings-guide', handleReopen);
    window.addEventListener('request-notification-permission', handleReopen);
    return () => {
      window.removeEventListener('open-popup-settings-guide', handleReopen);
      window.removeEventListener('request-notification-permission', handleReopen);
    };
  }, [userId, onUnlocked, isHeadsUpVerified]);

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

        // Proceed to Heads-up / Show as Pop-up guide
        try {
          localStorage.removeItem('nst_notif_gate_skipped');
          sessionStorage.removeItem('nst_notif_gate_skipped');
        } catch {}
        setIsSkipped(false);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('nst_notification_skipped_updated', { detail: { skipped: false } }));
        }

        setTimeout(() => {
          setIsSuccess(false);
          setPermission('granted');
        }, 1200);
      }
    } catch (err) {
      console.warn('[NotificationGate] Permission request error:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  // Handle Skip Button — Bypass mode allows users to freely skip and turn on later
  const handleSkip = () => {
    try {
      localStorage.setItem('nst_notif_gate_skipped', 'true');
      sessionStorage.setItem('nst_notif_gate_skipped', 'true');
    } catch {}
    setIsSkipped(true);
    setForceShowGuide(false);
    if (onUnlocked) onUnlocked();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nst_notification_skipped_updated', {
          detail: { skipped: true },
        })
      );
    }
  };

  // Handle Test Pop-up Button (Sends a real heads-up test notification)
  const handleSendTestPopUp = async () => {
    setTestSent(true);
    try {
      // 1. Dispatch high-priority local test notification
      dispatchSmartNotification({
        title: '🔔 NSTA टेस्ट पॉप-अप अलर्ट',
        body: isStandalone
          ? 'शानदार! NSTA ऐप से स्क्रीन पर पॉप-अप सफलतापूर्वक काम कर रहा है।'
          : 'अगर यह मैसेज स्क्रीन के ऊपर तैरता हुआ (Pop-up) आया है, तो आपकी सेटिंग 100% सही है!',
        category: 'CHAT',
        url: '/',
      });

      // 2. Also dual-trigger push router if connected
      await sendSchoolPushNotification({
        userId: userId || 'guest',
        title: '🔔 NSTA टेस्ट पॉप-अप अलर्ट',
        body: isStandalone
          ? 'शानदार! NSTA ऐप के अपने लोगो और नाम के साथ नोटिफिकेशन चालू है।'
          : 'शानदार! स्क्रीन पर नोटिफिकेशन पॉप-अप सफलतापूर्वक काम कर रहा है।',
        type: 'SCHOOL_NOTICE',
        urgent: true,
        icon: '/icons/icon-192.png?v=3',
        senderPhoto: '/icons/icon-192.png?v=3',
      }).catch(() => {});
    } catch (e) {
      console.warn('Test pop up dispatch error:', e);
    }
    setTimeout(() => setTestSent(false), 4000);
  };

  // Finish Setup & Unlock
  const handleCompleteSetup = () => {
    try {
      localStorage.setItem('nst_popup_heads_up_verified', 'true');
      localStorage.removeItem('nst_notif_gate_skipped');
      sessionStorage.removeItem('nst_notif_gate_skipped');
    } catch {}
    setIsSkipped(false);
    setIsHeadsUpVerified(true);
    setForceShowGuide(false);
    if (onUnlocked) onUnlocked();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nst_notification_skipped_updated', { detail: { skipped: false } }));
    }
  };

  // Re-check permission if user went to phone settings
  const handleVerifySettings = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const p = Notification.permission;
      setPermission(p);
      if (p === 'granted') {
        subscribeUserToPush(userId).catch(() => {});
        try {
          localStorage.removeItem('nst_notif_gate_skipped');
          sessionStorage.removeItem('nst_notif_gate_skipped');
        } catch {}
        setIsSkipped(false);
      }
    }
  };

  // If not supported, do not block
  if (!isSupported) {
    return null;
  }

  // If permission granted AND user already verified pop-up setup (and not explicitly reopened), don't block
  if (permission === 'granted' && isHeadsUpVerified && !forceShowGuide) {
    return null;
  }

  // If bypass is allowed AND user chose to skip (and not explicitly reopened), do not block!
  if (bypassAllowed && isSkipped && !forceShowGuide) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-4 text-white overflow-y-auto select-none animate-in fade-in duration-300"
    >
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden my-auto text-center">
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500" />

        {/* Close / Skip Button: Available if bypass is active or manually reopened */}
        {(bypassAllowed || forceShowGuide) && (
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-4 right-4 py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-bold border border-slate-700/60 shadow-sm"
            title="अभी छोड़ें • बाद में चालू कर सकते हैं (Skip for now)"
          >
            <span>छोड़ें (Skip)</span>
            <X className="w-4 h-4" />
          </button>
        )}

        {/* ── STAGE 1: SUCCESS FLASH ────────────────────────────────────── */}
        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/60 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4 animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-white">नोटिफिकेशन अनुमति मिल गई! 🎉</h3>
            <p className="text-xs text-emerald-300 mt-2 max-w-xs leading-relaxed">
              अब अंतिम चरण: स्क्रीन पर तैरता हुआ (Show as pop-up) चालू करें...
            </p>
          </div>
        ) : permission === 'denied' ? (
          /* ── STAGE 2: PERMISSION BLOCKED / DENIED ─────────────────────── */
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
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifySettings}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>मैंने चालू कर दिया, पुनः जाँचें (Verify &amp; Open)</span>
            </button>

            {bypassAllowed ? (
              <button
                type="button"
                onClick={handleSkip}
                className="w-full mt-3 py-2.5 text-center text-xs font-bold text-slate-400 hover:text-amber-300 rounded-xl hover:bg-slate-800/60 transition cursor-pointer"
              >
                बाद में चालू करेंगे • अभी छोड़ें (Skip for now)
              </button>
            ) : (
              <div className="w-full mt-3 py-2 text-center text-[11px] text-amber-400 font-semibold">
                🔒 सुपर एडमिन नीति: ऐप का उपयोग करने के लिए नोटिफिकेशन अनुमति अनिवार्य है
              </div>
            )}
          </div>
        ) : permission !== 'granted' ? (
          /* ── STAGE 3: INITIAL NOTIFICATION ALLOW PROMPT ───────────────── */
          <>
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

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{bypassAllowed ? "स्मार्ट लाइव सूचनाएँ" : "सूचना अनुमति अनिवार्य है"}</span>
            </div>

            <h2 className="text-xl font-black text-white leading-tight mb-2">
              {schoolName ? `${schoolName} लाइव अलर्ट चालू करें 🔔` : 'NSTA लाइव अलर्ट चालू करें 🔔'}
            </h2>
            <p className="text-xs text-slate-300 max-w-sm mx-auto mb-4 leading-relaxed">
              ऐप शुरू करने के लिए नोटिफिकेशन अनुमति दें, ताकि नया संदेश, होमवर्क या फीस रसीद आते ही तुरंत पता चले।
            </p>

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

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% सुरक्षित एवं स्पैम-मुक्त लाइव अपडेट्स।</span>
            </div>

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
                  <span>🔔 अनुमति दें और आगे बढ़ें (Allow)</span>
                </>
              )}
            </button>

            {bypassAllowed ? (
              <button
                type="button"
                onClick={handleSkip}
                className="mt-3 w-full py-2.5 px-3 rounded-xl text-xs font-bold text-slate-400 hover:text-amber-300 hover:bg-slate-800/70 transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>बाद में चालू करेंगे • अभी छोड़ें (Skip for now)</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            ) : (
              <div className="mt-3 w-full py-2 px-3 rounded-xl text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/30 flex items-center justify-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>सुपर एडमिन नीति: बिना नोटिफिकेशन अनुमति के आगे नहीं बढ़ा जा सकता</span>
              </div>
            )}
          </>
        ) : (
          /* ── STAGE 4: SHOW AS POP-UP / FLOATING NOTIFICATION SETUP ────── */
          <div className="text-left animate-in fade-in duration-300">
            {/* Header Badge */}
            <div className="flex items-center justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>अनुमति सक्रिय (Permission Allowed)</span>
              </div>
              <span className="text-[11px] text-amber-400 font-bold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5" /> अंतिम चरण (Step 2 of 2)
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-black text-white leading-snug mb-1">
              स्क्रीन पर पॉप-अप (Show as pop-up) चालू करें 📲
            </h2>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              सारे मोबाइलों में नोटिफिकेशन स्क्रीन पर तैरता हुआ (Banner / Pop-up) आने के लिए यह सेटिंग ऑन करना ज़रूरी है:
            </p>

            {/* Mobile Brand Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none text-xs">
              {[
                { id: 'samsung', label: 'Samsung (One UI)' },
                { id: 'redmi', label: 'Redmi / Xiaomi' },
                { id: 'vivo', label: 'Vivo / iQOO' },
                { id: 'oppo', label: 'Oppo / Realme' },
                { id: 'chrome', label: 'Google Chrome' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveBrandTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap text-[11px] transition cursor-pointer ${
                    activeBrandTab === tab.id
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20 font-black'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Step-by-Step Instructions by Phone OS */}
            <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-4 text-xs space-y-3 mb-4">
              {activeBrandTab === 'samsung' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Samsung One UI (Notification Categories):</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>ऊपर एड्रेस बार में <strong>🔒 (ताला)</strong> या <strong>⚙️</strong> दबाकर <strong>&lsquo;Notifications&rsquo;</strong> पर जाएँ।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span><strong>&lsquo;Notification categories&rsquo; ➔ &lsquo;General&rsquo;</strong> पर टैप करें।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[11px]">3</span>
                      <span><strong>&lsquo;Show as pop-up&rsquo;</strong> वाले बटन को <strong>चालू (ON 🔵)</strong> करें।</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[11px] text-amber-300/90 leading-relaxed">
                    💡 <strong>अगर &lsquo;Notification categories&rsquo; न दिखे:</strong> फोन Settings ➔ Notifications ➔ Advanced settings ➔ <em>&lsquo;Manage notification categories for each app&rsquo;</em> को ON करें।
                  </div>
                </div>
              )}

              {activeBrandTab === 'redmi' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Xiaomi / Redmi / Poco (MIUI &amp; HyperOS):</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>फोन <strong>Settings ➔ Apps ➔ Manage Apps ➔ Chrome / NSTA</strong> खोलें।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span><strong>&lsquo;Floating notifications&rsquo; (फ्लोटिंग नोटिफिकेशन)</strong> को <strong>चालू (Allow 🔵)</strong> करें।</span>
                    </div>
                  </div>
                </div>
              )}

              {activeBrandTab === 'vivo' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Vivo / iQOO (Funtouch OS):</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>फोन <strong>Settings ➔ Notifications &amp; status bar</strong> में जाएँ।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span>Chrome / NSTA चुनकर <strong>&lsquo;Top preview / Floating notification&rsquo;</strong> चालू करें।</span>
                    </div>
                  </div>
                </div>
              )}

              {activeBrandTab === 'oppo' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Oppo / Realme / OnePlus (ColorOS):</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>फोन <strong>Settings ➔ Notification &amp; status bar ➔ Manage notifications</strong> खोलें।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span>Chrome / NSTA में <strong>&lsquo;Banner&rsquo;</strong> को चेक / Allow करें।</span>
                    </div>
                  </div>
                </div>
              )}

              {activeBrandTab === 'chrome' && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-slate-800 pb-1.5">
                    <Smartphone className="w-4 h-4" />
                    <span>Chrome Browser Direct Shortcut:</span>
                  </div>
                  <div className="space-y-2 text-slate-200">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 font-bold text-[11px]">1</span>
                      <span>ऊपर एड्रेस बार में <strong>🔒 लॉक आइकॉन</strong> पर टैप करें।</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-[11px]">2</span>
                      <span><strong>&lsquo;Permissions&rsquo; ➔ &lsquo;Notifications&rsquo;</strong> खोलें। यहाँ से डायरेक्ट Android Notification Categories स्क्रीन खुल जाएगी।</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Standalone vs Browser Attribution Banner */}
            {isStandalone ? (
              <div className="mb-3.5 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-left flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-200 leading-relaxed">
                  <span className="font-bold text-white block">✅ NSTA होम-स्क्रीन ऐप मोड सक्रिय!</span>
                  सभी नोटिफिकेशन अब <strong>NSTA के अपने ऐप लोगो</strong> और NSTA नाम से आएंगे।
                </div>
              </div>
            ) : (
              <div className="mb-3.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-left space-y-2">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-200 leading-relaxed">
                    <span className="font-bold text-amber-300 block">💡 ध्यान दें: आप अभी Chrome ब्राउज़र में हैं</span>
                    Android के सुरक्षा नियम के तहत, ब्राउज़र के अंदर से आने वाले नोटिफिकेशन पर <strong>Chrome</strong> का लोगो दिखता है।<br />
                    नोटिफिकेशन को <strong>NSTA के अपने ऐप लोगो</strong> से पाने के लिए ऐप को होम स्क्रीन पर इंस्टॉल करके होम स्क्रीन से खोलें।
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerInstall}
                  className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>📲 NSTA ऐप को होम स्क्रीन पर इंस्टॉल करें (Install App)</span>
                </button>
              </div>
            )}

            {/* Live Test Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleSendTestPopUp}
                disabled={testSent}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 hover:text-white border border-sky-500/30 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                {testSent ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>टेस्ट पॉप-अप भेज दिया गया! स्क्रीन के ऊपर देखें...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>🧪 टेस्ट पॉप-अप भेजकर देखें (Test Pop-up Now)</span>
                  </>
                )}
              </button>
            </div>

            {/* Confirm & Unlock Button */}
            <button
              type="button"
              onClick={handleCompleteSetup}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 hover:from-emerald-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 active:scale-95 transition cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>✅ हाँ, पॉप-अप चालू हो गया! ऐप खोलें</span>
            </button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full mt-2.5 text-center text-xs text-slate-400 hover:text-amber-300 transition cursor-pointer font-bold py-1.5 rounded-lg hover:bg-slate-800/60"
            >
              बाद में सेट करेंगे • अभी छोड़ें (Skip for now)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
