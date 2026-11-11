import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, Check, Clock, Settings, X, Smartphone, ShieldCheck, AlertCircle, Play, Volume2, VolumeX } from 'lucide-react';
import {
  hydrateNotificationPreferences,
  loadNotificationPreferences,
  NOTIFICATION_CATEGORY_DEFINITIONS,
  requestNotificationPermission,
  saveNotificationPreferences,
  subscribeUserToPush,
  testDelayedBackgroundNotification,
  type NotificationPreferences,
} from './NotificationManager';
import {
  getVoiceNotifyConfig,
  saveVoiceNotifyConfig,
  testVoiceNotificationSample,
  type VoiceNotifyConfig,
} from '../utils/voiceNotifyEngine';

interface Props {
  userId: string;
  placement?: 'floating' | 'topbar';
}

export const NotificationSettings: React.FC<Props> = ({ userId, placement = 'floating' }) => {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(() => loadNotificationPreferences(userId));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testCountdown, setTestCountdown] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [voiceConfig, setVoiceConfig] = useState<VoiceNotifyConfig>(() => getVoiceNotifyConfig());
  const isTopbar = placement === 'topbar';

  useEffect(() => {
    let active = true;
    hydrateNotificationPreferences(userId).then((next) => {
      if (active) setPreferences(next);
    });
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
    return () => { active = false; };
  }, [userId]);

  const update = (next: Partial<NotificationPreferences>) => {
    setPreferences((current) => ({ ...current, ...next }));
    setSaved(false);
  };

  const handleTestNotification = async () => {
    const success = await testDelayedBackgroundNotification(5);
    if (success) {
      setTestCountdown(5);
      const interval = setInterval(() => {
        setTestCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const granted = await requestNotificationPermission();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        setPermissionStatus(Notification.permission);
      }
      const next = await saveNotificationPreferences(userId, preferences);
      if (granted) await subscribeUserToPush(userId);
      setPreferences(next);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={isTopbar
          ? "relative p-1.5 rounded-xl transition-all text-white hover:bg-white/10 active:scale-95 shrink-0"
          : "fixed bottom-28 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-700 shadow-lg transition hover:scale-105 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"}
        aria-label="Notification settings"
        title={permissionStatus === 'granted' && preferences.enabled ? "नोटिफिकेशन सेटिंग्स" : "नोटिफिकेशन बंद है • चालू करने के लिए क्लिक करें"}
      >
        {preferences.enabled && permissionStatus === 'granted'
          ? <Bell size={17} className={isTopbar ? "text-amber-200" : undefined} />
          : <BellOff size={17} className={isTopbar ? "text-slate-300" : undefined} />}
        {(!preferences.enabled || permissionStatus !== 'granted') && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
          </span>
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/50 p-3 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600">
                  <Settings size={14} /> Smart alerts
                </p>
                <h2 className="text-xl font-black text-slate-900 dark:text-white">Notification settings</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Lock screen alerts, routine reminders aur private messages ko control karein.
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {/* Quick Turn ON Banner if notification is not granted or skipped */}
            {permissionStatus !== 'granted' && (
              <div className="mb-5 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 p-4 text-slate-800 dark:text-slate-100 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                    <Bell size={20} className="animate-bounce" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-slate-950 dark:text-white">
                        नोटिफिकेशन अभी बंद (ऑफ) है
                      </h3>
                      <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black px-2 py-0.5 rounded-full border border-amber-500/30">
                        {permissionStatus === 'denied' ? 'ब्लॉक' : 'स्किप मोड'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {permissionStatus === 'denied'
                        ? 'ब्राउज़र में सूचना अनुमति ब्लॉक है। सेटिंग्स गाइड देखकर इसे 1 मिनट में चालू करें।'
                        : 'स्कूल नोटिस, होमवर्क, अटेंडेंस व फीस रसीद के लाइव अलर्ट पाने के लिए अभी चालू करें।'}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (permissionStatus === 'denied') {
                            setOpen(false);
                            window.dispatchEvent(new CustomEvent('open-popup-settings-guide'));
                          } else {
                            setSaving(true);
                            try {
                              const granted = await requestNotificationPermission();
                              if (typeof window !== 'undefined' && 'Notification' in window) {
                                setPermissionStatus(Notification.permission);
                              }
                              if (granted) {
                                await subscribeUserToPush(userId);
                                try {
                                  localStorage.removeItem('nst_notif_gate_skipped');
                                  sessionStorage.removeItem('nst_notif_gate_skipped');
                                } catch {}
                                update({ enabled: true });
                                setSaved(true);
                                window.dispatchEvent(new CustomEvent('nst_notification_skipped_updated', { detail: { skipped: false } }));
                              } else {
                                setOpen(false);
                                window.dispatchEvent(new CustomEvent('open-popup-settings-guide'));
                              }
                            } finally {
                              setSaving(false);
                            }
                          }
                        }}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md shadow-amber-500/20 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Bell size={14} />
                        <span>{permissionStatus === 'denied' ? '⚙️ सेटिंग्स गाइड खोलें' : '🔔 1-क्लिक में अभी चालू करें (Turn ON)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <label className="mb-4 flex cursor-pointer items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <span>
                <span className="block text-sm font-bold text-slate-900 dark:text-white">All notifications</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">Ek switch se push alerts pause karein</span>
              </span>
              <input
                type="checkbox"
                checked={preferences.enabled}
                onChange={(event) => update({ enabled: event.target.checked })}
                className="h-5 w-5 accent-indigo-600"
              />
            </label>

            {/* Voice Notification Card */}
            <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    {voiceConfig.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                      Voice Notification (बोलकर सुनाएं)
                    </span>
                    <span className="block text-xs text-slate-600 dark:text-slate-300">
                      नोटिफिकेशन आने पर हिंदी/इंग्लिश में पढ़कर सुनाएं
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={voiceConfig.enabled}
                  onChange={(e) => {
                    const next = saveVoiceNotifyConfig({ enabled: e.target.checked });
                    setVoiceConfig(next);
                  }}
                  className="h-5 w-5 accent-emerald-600 cursor-pointer"
                />
              </div>

              {voiceConfig.enabled && (
                <div className="mt-3 pt-3 border-t border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-300 font-medium">बोलने की गति (Speed):</span>
                    <div className="flex items-center gap-1.5">
                      {[0.8, 1.0, 1.2].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => {
                            const next = saveVoiceNotifyConfig({ rate });
                            setVoiceConfig(next);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                            voiceConfig.rate === rate
                              ? "bg-emerald-600 text-white shadow-sm"
                              : "bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/20"
                          }`}
                        >
                          {rate === 0.8 ? "धीमी" : rate === 1.0 ? "सामान्य (1x)" : "तेज़"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => testVoiceNotificationSample()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Play size={12} fill="currentColor" /> टेस्ट आवाज़ सुनें
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><Clock size={14} /> Morning routine</span>
                <input type="time" value={preferences.morningRoutineTime} onChange={(event) => update({ morningRoutineTime: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700 dark:text-white" />
              </label>
              <label className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
                <span className="mb-2 flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200"><Clock size={14} /> Streak saver</span>
                <input type="time" value={preferences.streakSaverTime} onChange={(event) => update({ streakSaverTime: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700 dark:text-white" />
              </label>
            </div>
            <div className="mb-5 rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">Routine slot reminders</p>
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400">Apne do daily study slots ke time set karein. Blank time par reminder off rahega.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {['slot-1', 'slot-2'].map((slotId, index) => (
                  <label key={slotId} className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Slot {index + 1}
                    <input
                      type="time"
                      value={preferences.routineSlotTimes[slotId] || ''}
                      onChange={(event) => update({ routineSlotTimes: { ...preferences.routineSlotTimes, [slotId]: event.target.value } })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700 dark:text-white"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {NOTIFICATION_CATEGORY_DEFINITIONS.map((category) => (
                <label key={category.key} className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-100 px-3 py-3 dark:border-slate-800">
                  <span>
                    <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{category.label}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">{category.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.categories[category.key]}
                    onChange={(event) => update({ categories: { ...preferences.categories, [category.key]: event.target.checked } })}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              ))}
            </div>

            {/* Background Notification Test Card */}
            <div className="mt-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Smartphone size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Background Push Test
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  permissionStatus === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}>
                  {permissionStatus === 'granted' ? '✅ Permission Allowed' : '⚠️ Permission Required'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                App band hone ya phone lock hone par notification test karein. Button dabakar 5 second ke andar phone lock ya app band karein:
              </p>
              <button
                type="button"
                onClick={handleTestNotification}
                disabled={testCountdown !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition disabled:opacity-75 cursor-pointer shadow-sm"
              >
                {testCountdown !== null ? (
                  <>
                    <span className="animate-pulse">⏳ App band karein... ({testCountdown}s)</span>
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    <span>Test Background Notification (5s Timer)</span>
                  </>
                )}
              </button>
              {testCountdown !== null && (
                <p className="mt-2 text-[11px] text-amber-400 font-semibold text-center animate-bounce">
                  👉 Abhi apna phone lock karein ya doosra app kholein!
                </p>
              )}
            </div>

            {/* Background push tips */}
            <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3 text-[11px] text-slate-500 dark:text-slate-400 space-y-1.5">
              <p className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-indigo-400" />
                Doosra app use karte waqt screen par Pop-Up aane ke liye:
              </p>
              <p>1. Chrome popup aane par <strong>&quot;Allow&quot;</strong> par click karein.</p>
              <p>2. <strong>Screen Pop-up ON karein:</strong> Android Settings &gt; Apps &gt; Chrome &gt; Notifications me jakar <strong>&quot;Pop on screen&quot; / &quot;Floating notifications&quot; (Banners)</strong> ko ON karein taki WhatsApp/YouTube chalate waqt upar pop-up dikhe.</p>
              <p>3. Chrome menu (⋮) me jakar <strong>&quot;Install app&quot;</strong> ya <strong>&quot;Add to Home screen&quot;</strong> karein aur Battery ko <strong>&quot;Unrestricted&quot;</strong> set karein.</p>
            </div>

            <button type="button" disabled={saving} onClick={save} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60">
              {saved ? <Check size={16} /> : <Bell size={16} />}
              {saving ? 'Saving...' : saved ? 'Saved' : 'Save notification settings'}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};