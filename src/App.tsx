// @ts-nocheck
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  GraduationCap,
  School,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { NotificationPrompt } from './components/NotificationPrompt';
import { NotificationPermissionGate } from './components/NotificationPermissionGate';
import { GlobalNotificationPopup } from './components/GlobalNotificationPopup';
import { subscribeToUserNotifications, listenToForegroundMessages } from './components/NotificationManager';
import { auth, logoutUser, getFreshUserData, getUserData } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { DeviceConflictModal } from './components/DeviceConflictModal';
import { GuestRoomJoinModal } from './components/GuestRoomJoinModal';
import { QrLoginApprovalModal } from './components/QrLoginApprovalModal';
import {
  initUserSession,
  listenToUserSession,
  clearLocalSession,
  listenToLoginChallenge,
  sendSessionHeartbeat,
  LoginChallengeData,
} from './services/sessionManager';
import { performDailyMasterSync, isDailySyncNeeded } from './services/dailySyncManager';

// Resilient dynamic import helper that retries transient network or dev-server warm-up blips
function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  moduleName: string = 'Module'
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastError = err;
        console.warn(`[lazyWithRetry] Attempt ${attempt + 1}/5 for ${moduleName} failed:`, err);
        await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1)));
      }
    }
    console.error(`[lazyWithRetry] All attempts failed for ${moduleName}:`, lastError);
    try {
      const reloadKey = '__nsta_lazy_chunk_reload';
      const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
      if (Date.now() - lastReload > 8000) {
        sessionStorage.setItem(reloadKey, String(Date.now()));
        window.location.reload();
      }
    } catch {}
    // Return a self-contained fallback screen instead of throwing to avoid crashing the whole root app
    const FailureFallback: React.FC<any> = (props) => (
      <div className="flex-1 min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-slate-100">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 text-amber-400">
          ⚠️
        </div>
        <h3 className="text-lg font-bold mb-2">Notice: {moduleName} Load Delay</h3>
        <p className="text-sm text-slate-400 max-w-sm mb-6">
          The connection was momentarily interrupted while fetching this section. Please retry or refresh.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-sm transition-colors shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            Reload Page
          </button>
          {props?.onBack && (
            <button
              onClick={props.onBack}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-sm transition-colors border border-slate-700 cursor-pointer"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
    return { default: FailureFallback as unknown as T };
  });
}

// Dynamic lazy imports for smooth chunk loading & performance
const StudentDashboard = lazyWithRetry(
  () => import('./components/StudentDashboard').then(m => ({ default: m.StudentDashboard || (m as any).default })),
  'Student Dashboard'
);

const AdminDashboard = lazyWithRetry(
  () => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard || (m as any).default })),
  'Admin Dashboard'
);

const SchoolEcosystem = lazyWithRetry(
  () => import('./components/school/SchoolEcosystem').then(m => ({ default: m.SchoolEcosystem || (m as any).default })),
  'School ERP'
);

const Auth = lazyWithRetry(
  () => import('./components/Auth').then(m => ({ default: m.Auth || (m as any).default })),
  'Auth Portal'
);

export type AppViewMode = 'STUDENT' | 'ADMIN' | 'SCHOOL_ERP';

export const isSuperAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  return (
    clean === 'nadimanwar794@gmail.com' ||
    clean === 'nadimanwar794@gmsil.com' ||
    clean === 'nsdimanwar794@gmail.com' ||
    clean === 'nadiman0636indo@gmail.com' ||
    clean === 'n44438403@gmail.com' ||
    clean === 'fgkfgffhgg@gmail.com' ||
    clean === 'ghduug6@gmail.com' ||
    clean.startsWith('nadimanwar794')
  );
};

export const isSchoolAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  if (isSuperAdminEmail(clean)) return false;
  return (
    clean === 'admin@dps.edu.in' ||
    clean === 'dpsgurgaon45@dps.edu.in' ||
    clean === 'principal@dps.edu.in'
  );
};

export const isAdminUser = (u?: any): boolean => {
  if (!u) return false;
  const r = (u.role || '').toString().trim().toUpperCase();
  // School Admin is STRICTLY restricted to School ERP, NEVER NSTA Main Admin
  if (r === 'SCHOOL_ADMIN' || r === 'SCHOOLADMIN' || r === 'PRINCIPAL' || r === 'TEACHER') {
    return false;
  }
  if (isSchoolAdminEmail(u.email)) return false;
  if (u.email && u.email.toLowerCase().endsWith('.edu.in')) return false;

  if (isSuperAdminEmail(u.email)) return true;
  if (r === 'SUPERADMIN' || r === 'SUPER_ADMIN' || r === 'ADMIN') return true;
  if (u.isAdmin === true || u.isSuperAdmin === true || u.userType === 'ADMIN') return true;
  if (
    u.provider === 'superadmin_master_login' ||
    u.provider === 'superadmin_login' ||
    u.provider === 'firebase_admin_login' ||
    u.provider === 'admin_console_login'
  ) return true;
  if (u.id === 'super_admin_nadim' || u.uid === 'super_admin_nadim') return true;
  return false;
};

export const DEFAULT_SUPERADMIN_USER = {
  id: 'super_admin_nadim',
  uid: 'super_admin_nadim',
  displayId: 'SUPERADMIN',
  name: 'Nadim Anwar (Super Admin)',
  email: 'ghduug6@gmail.com',
  mobile: '9811023450',
  role: 'SUPERADMIN',
  schoolId: '',
  credits: 99999,
  diamonds: 99999,
  streak: 100,
  totalScore: 9999,
  profileCompleted: true,
  subscriptionTier: 'PRO',
  provider: 'superadmin_master_login',
  isAdmin: true,
  isSuperAdmin: true,
};

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('nst_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      // If the saved user was the auto-seeded mock super admin default, purge it so default is user auth screen
      if (
        parsed &&
        (parsed.id === 'super_admin_nadim' ||
         parsed.uid === 'super_admin_nadim' ||
         parsed.provider === 'superadmin_master_login' ||
         parsed.provider === 'superadmin_login' ||
         parsed.email === 'ghduug6@gmail.com')
      ) {
        localStorage.removeItem('nst_current_user');
        localStorage.removeItem('nsta_cached_user');
        return null;
      }
      if (parsed && (parsed.id || parsed.uid)) {
        if (isAdminUser(parsed) || isSuperAdminEmail(parsed.email)) {
          parsed.role = 'SUPERADMIN';
          parsed.isAdmin = true;
          parsed.isSuperAdmin = true;
          // Super Admin is never tied to any school by default!
          parsed.schoolId = '';
          parsed.schoolName = null;
          parsed.schoolRole = null;
          parsed.schoolCode = null;
        } else if (isSchoolAdminEmail(parsed.email)) {
          parsed.role = 'SCHOOL_ADMIN';
        }
        return parsed;
      }
    }
  } catch (e) {}

  // If no user is logged in, default to null so the user authentication screen is shown
  return null;
};

const getInitialSettings = () => {
  try {
    const raw = localStorage.getItem('nst_system_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed) return parsed;
    }
  } catch (e) {}

  return {
    appName: 'NSTA',
    appShortName: 'NSTA',
    appVersion: '2.0',
    contactNumber: '9876543210',
    contactEmail: 'support@nsta.app',
    websiteUrl: 'https://nsta.app',
    maintenanceMode: false,
    hiddenFeatures: [],
    splashFontId: 'default',
  };
};

export function App() {
  const [user, setUser] = useState<any>(getInitialUser);
  // Default view mode: School accounts direct to SCHOOL_ERP ("School wala account direct login hoga to school profile pe open hoga")
  const [view, setView] = useState<AppViewMode>(() => {
    try {
      const u = getInitialUser();
      if (u) {
        if (isAdminUser(u)) return 'ADMIN';
        const r = (u?.role || '').toString().trim().toUpperCase();
        const isSchoolAccount = Boolean(
          u?.schoolId ||
          u?.userType === 'SCHOOL_STUDENT' ||
          u?.admissionNo ||
          r === 'SCHOOL_ADMIN' ||
          r === 'SCHOOLADMIN' ||
          r === 'TEACHER' ||
          r === 'PRINCIPAL' ||
          r === 'ACCOUNTANT' ||
          isSchoolAdminEmail(u?.email) ||
          (u?.email && u.email.toLowerCase().endsWith('.edu.in')) ||
          localStorage.getItem('nst_active_school_id')
        );
        if (isSchoolAccount) {
          return 'SCHOOL_ERP';
        }
      }

      const saved = localStorage.getItem('nst_app_view_mode') as AppViewMode;
      if (saved === 'ADMIN' || saved === 'STUDENT' || saved === 'SCHOOL_ERP') {
        return saved;
      }
    } catch {}
    return 'STUDENT';
  });

  const handleSetView = (newView: AppViewMode) => {
    // School Admin is STRICTLY locked out of NSTA Main Admin Dashboard
    const r = (user?.role || '').toString().trim().toUpperCase();
    const isSchoolAdmin =
      r === 'SCHOOL_ADMIN' ||
      r === 'SCHOOLADMIN' ||
      r === 'PRINCIPAL' ||
      isSchoolAdminEmail(user?.email) ||
      (user?.email && user.email.toLowerCase().endsWith('.edu.in'));

    if (newView === 'ADMIN' && isSchoolAdmin) {
      setView('SCHOOL_ERP');
      try {
        localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
      } catch {}
      return;
    }

    setView(newView);
    try {
      localStorage.setItem('nst_app_view_mode', newView);
    } catch {}
  };
  const [settings, setSettings] = useState<any>(getInitialSettings);
  const [studentTab, setStudentTab] = useState<any>('HOME');
  const [dailyStudySeconds, setDailyStudySeconds] = useState<number>(180);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Listen for direct navigation events to Main Student Dashboard
  useEffect(() => {
    const handleOpenStudent = (e?: any) => {
      if (e?.detail?.tab) {
        setStudentTab(e.detail.tab);
      }
      if (e?.detail?.targetClass) {
        try {
          localStorage.setItem('nst_active_session_class', e.detail.targetClass);
          localStorage.setItem('nst_academic_selected_class', e.detail.targetClass);
          localStorage.setItem('nst_syllabus_mode', e.detail.targetClass === 'COMPETITION' ? 'COMPETITION' : 'SCHOOL');
        } catch {}
      }
      handleSetView('STUDENT');
    };
    window.addEventListener('nst_open_student_dashboard', handleOpenStudent);
    return () => window.removeEventListener('nst_open_student_dashboard', handleOpenStudent);
  }, []);

  // Real-time synchronization when school notes or settings are updated
  useEffect(() => {
    const handleSettingsUpdated = () => {
      try {
        const raw = localStorage.getItem('nst_system_settings');
        if (raw) setSettings(JSON.parse(raw));
      } catch {}
    };
    window.addEventListener('nst_system_settings_updated', handleSettingsUpdated);
    window.addEventListener('nst-school-curriculum-notes-updated', handleSettingsUpdated);
    window.addEventListener('storage', handleSettingsUpdated);
    return () => {
      window.removeEventListener('nst_system_settings_updated', handleSettingsUpdated);
      window.removeEventListener('nst-school-curriculum-notes-updated', handleSettingsUpdated);
      window.removeEventListener('storage', handleSettingsUpdated);
    };
  }, []);

  // Guarantee pre-react splash screen dismissal immediately
  useEffect(() => {
    if (typeof (window as any).hidePreReactSplash === 'function') {
      (window as any).hidePreReactSplash();
    } else {
      const splash = document.getElementById('pre-react-splash');
      if (splash) splash.remove();
    }
  }, []);

  // Study timer tracker
  useEffect(() => {
    const timer = setInterval(() => {
      setDailyStudySeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync user updates to storage
  const handleUpdateUser = (updatedUser: any) => {
    setUser(updatedUser);
    try {
      localStorage.setItem('nst_current_user', JSON.stringify(updatedUser));
    } catch (e) {}
  };

  // Sync settings updates to storage
  const handleUpdateSettings = (updatedSettings: any) => {
    setSettings(updatedSettings);
    try {
      localStorage.setItem('nst_system_settings', JSON.stringify(updatedSettings));
    } catch (e) {}
  };

  const handleLogin = (newUser: any) => {
    if (newUser && (isSuperAdminEmail(newUser.email) || newUser.id === 'super_admin_nadim' || newUser.uid === 'super_admin_nadim')) {
      newUser.role = 'SUPERADMIN';
    } else if (newUser && (newUser.role === 'ADMIN' || newUser.isAdmin === true || newUser.userType === 'ADMIN')) {
      newUser.role = 'ADMIN';
    }
    try {
      localStorage.removeItem('nst_logged_out');
      localStorage.setItem('nst_current_user', JSON.stringify(newUser));
    } catch (e) {}
    setUser(newUser);
    // Direct Role Routing:
    // 1. App ka Super Admin / Admin -> Direct to Admin Dashboard ("Admin Console")
    if (isAdminUser(newUser)) {
      setView('ADMIN');
      try {
        localStorage.setItem('nst_app_view_mode', 'ADMIN');
      } catch {}
      return;
    }

    // 2. Direct Routing: School Account check
    const r = (newUser?.role || '').toString().trim().toUpperCase();
    const isSchoolAccount = Boolean(
      newUser?.schoolId ||
      newUser?.userType === 'SCHOOL_STUDENT' ||
      newUser?.admissionNo ||
      r === 'SCHOOL_ADMIN' ||
      r === 'SCHOOLADMIN' ||
      r === 'TEACHER' ||
      r === 'PRINCIPAL' ||
      r === 'ACCOUNTANT' ||
      isSchoolAdminEmail(newUser?.email) ||
      (newUser?.email && newUser.email.toLowerCase().endsWith('.edu.in')) ||
      localStorage.getItem('nst_active_school_id')
    );

    if (isSchoolAccount) {
      setView('SCHOOL_ERP');
      try {
        localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
      } catch {}
      return;
    }

    setView('STUDENT');
    try {
      localStorage.setItem('nst_app_view_mode', 'STUDENT');
    } catch {}
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('[App] logoutUser error:', e);
    }
    try {
      localStorage.removeItem('nst_current_user');
      localStorage.removeItem('nsta_cached_user');
      localStorage.removeItem('nst_is_guest');
      localStorage.setItem('nst_logged_out', 'true');
    } catch (e) {}
    setUser(null);
  };

  const logActivity = (action: string, details: string) => {
    console.log(`[Activity Log] ${action}:`, details);
  };

  // Dynamic theme classes based on isDarkMode
  const appBgClass = isDarkMode
    ? 'bg-slate-950 text-slate-100 dark dark-mode'
    : 'bg-slate-50 text-slate-900';

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = '#020617';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = '#f8fafc';
    }
    try {
      localStorage.setItem('nst_dark_mode', String(isDarkMode));
    } catch {}
  }, [isDarkMode]);

  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [remoteDeviceName, setRemoteDeviceName] = useState('Dusra Mobile / Device');
  const [incomingLoginChallenge, setIncomingLoginChallenge] = useState<LoginChallengeData | null>(null);
  const [studyRoomCodeFromUrl, setStudyRoomCodeFromUrl] = useState<string | null>(null);
  const [showGuestStudyJoin, setShowGuestStudyJoin] = useState(false);

  // Sync with Firebase Auth state so Google / Redirect sign-ins immediately transition to Dashboard
  useEffect(() => {
    if (user && !user.isGuest) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && !firebaseUser.isAnonymous) {
        // If explicitly logged out recently, don't auto re-login unless newly authenticated
        if (localStorage.getItem('nst_logged_out') === 'true' && !firebaseUser.metadata?.lastSignInTime) {
          return;
        }

        const cachedRaw = localStorage.getItem('nst_current_user');
        let parsedCached: any = null;
        if (cachedRaw) {
          try { parsedCached = JSON.parse(cachedRaw); } catch {}
        }

        // Query Firestore for fresh user data including role & isAdmin flags
        let fresh: any = null;
        try {
          fresh = await getFreshUserData(firebaseUser.uid);
          if (!fresh) fresh = await getUserData(firebaseUser.uid);
        } catch (e) {
          console.warn('[App] Error getting fresh user data on auth change:', e);
        }

        const cleanEmail = (firebaseUser.email || parsedCached?.email || fresh?.email || '').toLowerCase().trim();
        const isSuperAdm = isSuperAdminEmail(cleanEmail);
        const isFbAdmin =
          fresh?.role === 'ADMIN' ||
          fresh?.role === 'SUPERADMIN' ||
          fresh?.isAdmin === true ||
          fresh?.userType === 'ADMIN' ||
          parsedCached?.role === 'ADMIN' ||
          parsedCached?.role === 'SUPERADMIN' ||
          parsedCached?.isAdmin === true;

        if (isSuperAdm || isFbAdmin) {
          const adminUser = {
            ...(parsedCached || {}),
            ...(fresh || {}),
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            displayId: isSuperAdm ? 'SUPERADMIN' : 'ADMIN',
            name: fresh?.name || parsedCached?.name || firebaseUser.displayName || (isSuperAdm ? 'Nadim Anwar (Super Admin)' : 'Admin User'),
            email: firebaseUser.email || cleanEmail,
            photoURL: firebaseUser.photoURL || fresh?.photoURL || '',
            role: isSuperAdm ? 'SUPERADMIN' : 'ADMIN',
            schoolId: '',
            isGuest: false,
            credits: 99999,
            diamonds: 99999,
            streak: fresh?.streak || 1,
            totalScore: fresh?.totalScore || 0,
            profileCompleted: true,
            subscriptionTier: 'PRO',
            provider: isSuperAdm ? 'superadmin_login' : 'firebase_admin_login'
          };
          handleLogin(adminUser);
          return;
        }

        if (parsedCached && (parsedCached.uid === firebaseUser.uid || parsedCached.id === firebaseUser.uid)) {
          if (isSchoolAdminEmail(parsedCached.email)) {
            parsedCached.role = 'SCHOOL_ADMIN';
          }
          handleLogin(parsedCached);
        } else {
          const isSuperAdm = isSuperAdminEmail(cleanEmail);
          const isSchoolAdm = !isSuperAdm && isSchoolAdminEmail(cleanEmail);
          const resolvedUser = {
            ...(fresh || {}),
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            displayId: isSuperAdm ? 'SUPERADMIN' : isSchoolAdm ? 'ADMIN-DPS' : (fresh?.displayId || `NSTA-${firebaseUser.uid.slice(-6).toUpperCase()}`),
            name: fresh?.name || firebaseUser.displayName || (isSuperAdm ? 'Super Admin' : isSchoolAdm ? 'Dr. Arvind Swaminathan (School Admin)' : 'Student'),
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: isSuperAdm ? 'SUPERADMIN' : isSchoolAdm ? 'SCHOOL_ADMIN' : (fresh?.role || 'STUDENT'),
            schoolId: isSuperAdm ? '' : (isSchoolAdm ? 'dps_gurgaon_sector45' : (fresh?.schoolId || '')),
            isGuest: false,
            provider: isSuperAdm ? 'superadmin_login' : isSchoolAdm ? 'admin_login' : (fresh?.provider || 'google'),
            credits: isSuperAdm ? 99999 : isSchoolAdm ? 10000 : (fresh?.credits || 50),
            diamonds: isSuperAdm ? 99999 : (fresh?.diamonds || 0),
            streak: fresh?.streak || 1,
            totalScore: fresh?.totalScore || 0,
            profileCompleted: true,
            board: fresh?.board || 'CBSE',
            classLevel: fresh?.classLevel || '10',
            subscriptionTier: isSuperAdm ? 'PRO' : isSchoolAdm ? 'PRO' : (fresh?.subscriptionTier || 'FREE'),
            studyMode: fresh?.studyMode || 'CREDIT'
          };
          handleLogin(resolvedUser);
        }
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Check URL for direct Study Room QR invite (?studyRoom=CODE)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('studyRoom');
      if (roomParam) {
        setStudyRoomCodeFromUrl(roomParam);
        if (!user) {
          setShowGuestStudyJoin(true);
        } else {
          setUser((prev: any) => ({ ...prev, targetStudyRoomCode: roomParam }));
        }
      }
    } catch {}
  }, []);

  // Daily Master Pack 1st-Login Sync (Runs once per day, 0 reads for rest of the day!)
  useEffect(() => {
    if (!user || user.isGuest) return;
    if (isDailySyncNeeded()) {
      performDailyMasterSync(user).then((res) => {
        if (res.success && res.bundle?.userSnapshot) {
          setUser((prev: any) => ({ ...prev, ...res.bundle.userSnapshot }));
        }
      });
    }
  }, [user?.uid, user?.id, user?.isGuest]);

  // 1-Device Enforcement & Cross-Device QR Challenge Listener
  useEffect(() => {
    if (!user || user.isGuest) return;
    const uid = user.uid || user.id;
    if (!uid) return;

    initUserSession(user);

    // Heartbeat throttled to 5 minutes & only pings when tab is actively visible!
    const heartbeatInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        sendSessionHeartbeat(uid);
      }
    }, 300000);

    const unsubscribeSession = listenToUserSession(uid, (remote) => {
      // Immediate lockdown: wipe local session immediately so no background requests succeed
      clearLocalSession();
      try {
        localStorage.removeItem('nst_current_user');
      } catch {}
      setRemoteDeviceName(remote.device || 'Dusra Mobile / Device');
      setConflictModalOpen(true);
    });

    const unsubscribeChallenge = listenToLoginChallenge(uid, (challenge) => {
      setIncomingLoginChallenge(challenge);
    });

    return () => {
      clearInterval(heartbeatInterval);
      unsubscribeSession();
      unsubscribeChallenge();
    };
  }, [user?.uid, user?.id, user?.isGuest]);

  // Real-time Push & In-App Notification Listeners (Heads-Up Pop-Up Banner)
  useEffect(() => {
    let unsubForeground: any = null;
    let unsubUserNotifs: any = null;

    listenToForegroundMessages((payload) => {
      console.log('[App] Received FCM foreground message:', payload);
    }).then((unsub) => {
      unsubForeground = unsub;
    }).catch(() => {});

    const uid = user?.uid || user?.id;
    if (uid) {
      unsubUserNotifs = subscribeToUserNotifications(uid, (notif) => {
        console.log('[App] Received RTDB user notification:', notif);
      });
    }

    return () => {
      if (typeof unsubForeground === 'function') unsubForeground();
      if (typeof unsubUserNotifs === 'function') unsubUserNotifs();
    };
  }, [user?.uid, user?.id]);

  const handleAcknowledgeConflict = () => {
    setConflictModalOpen(false);
    clearLocalSession();
    handleLogout();
  };

  const handleGuestJoinStudyRoom = (guestName: string, roomCode?: string) => {
    const guestUser = {
      id: `guest_${Date.now()}`,
      uid: `guest_${Date.now()}`,
      name: guestName,
      isGuest: true,
      role: 'STUDENT',
      targetStudyRoomCode: roomCode || studyRoomCodeFromUrl || undefined,
      credits: 10,
      streak: 1,
      totalScore: 0,
      profileCompleted: true,
      provider: 'guest_study'
    };
    handleLogin(guestUser);
    setShowGuestStudyJoin(false);
  };

  // If user is logged out, render the authentication screen
  if (!user) {
    return (
      <div className={`min-h-screen min-h-[100dvh] w-full flex flex-col ${appBgClass}`}>
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
              </div>
              <h3 className={`text-base font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loading Login Portal...</h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Please wait a moment</p>
            </div>
          }
        >
          <Auth
            onLogin={handleLogin}
            appSettings={settings}
            logActivity={logActivity}
            onOpenGuestStudyRoom={() => setShowGuestStudyJoin(true)}
          />
        </Suspense>

        <GuestRoomJoinModal
          isOpen={showGuestStudyJoin}
          onClose={() => setShowGuestStudyJoin(false)}
          roomCode={studyRoomCodeFromUrl || undefined}
          onSubmitName={handleGuestJoinStudyRoom}
          appName={settings?.appName || 'NSTA'}
        />

        <NotificationPermissionGate userId="" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen min-h-[100dvh] w-full flex flex-col ${appBgClass}`}>
      {/* ── MAIN DASHBOARD VIEWPORT WITH SUSPENSE ───────────────────────── */}
      <div className="flex-1 flex flex-col">
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Loading {view === 'STUDENT' ? 'Student Dashboard' : view === 'SCHOOL_ERP' ? 'School ERP' : 'Admin Panel'}...</h3>
              <p className="text-xs text-slate-400">Please wait a moment</p>
            </div>
          }
        >
          {view === 'STUDENT' && (
            <StudentDashboard
              user={user}
              dailyStudySeconds={dailyStudySeconds}
              onSubjectSelect={(subject: any) => console.log('Selected subject:', subject)}
              onRedeemSuccess={handleUpdateUser}
              settings={settings}
              activeTab={studentTab}
              onTabChange={setStudentTab}
              setFullScreen={setIsFullScreen}
              onNavigate={(navTarget: any) => {
                if (navTarget === 'ADMIN_DASHBOARD' || navTarget === 'ADMIN') {
                  handleSetView('ADMIN');
                }
              }}
              onLogout={handleLogout}
              onOpenSchool={() => handleSetView('SCHOOL_ERP')}
              onOpenCoaching={() => console.log('Open coaching')}
              isDarkMode={isDarkMode}
              onToggleDarkMode={setIsDarkMode}
              onUpdateUser={handleUpdateUser}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {view === 'SCHOOL_ERP' && (
            <SchoolEcosystem
              uid={user.uid || user.id || 'admin_uid'}
              email={user.email || ''}
              displayName={user.name || (user.role === 'TEACHER' ? 'Teacher' : isSchoolAdminEmail(user.email) || user.role === 'SCHOOL_ADMIN' ? 'Dr. Arvind Swaminathan (School Admin)' : 'Student')}
              isSuperAdmin={Boolean(isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN')}
              userRole={user.role || (isSchoolAdminEmail(user.email) ? 'SCHOOL_ADMIN' : 'STUDENT')}
              user={user}
              defaultSchoolId={user.schoolId || ''}
              forceAdminView={isSchoolAdminEmail(user.email) || user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'PRINCIPAL'}
              onBack={isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN' ? () => handleSetView('ADMIN') : () => handleSetView('STUDENT')}
              onOpenAdminDashboard={isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN' ? () => handleSetView('ADMIN') : undefined}
              onOpenPlatformContent={(targetClass?: string) => {
                if (targetClass) {
                  try {
                    localStorage.setItem('nst_active_session_class', targetClass);
                    localStorage.setItem('nst_academic_selected_class', targetClass);
                    localStorage.setItem('nst_syllabus_mode', targetClass === 'COMPETITION' ? 'COMPETITION' : 'SCHOOL');
                  } catch {}
                }
                setStudentTab('COURSES');
                handleSetView('STUDENT');
              }}
              onOpenStudentDashboard={() => handleSetView('STUDENT')}
              onLogout={handleLogout}
            />
          )}

          {view === 'ADMIN' && (
            (user?.role === 'SCHOOL_ADMIN' || user?.role === 'SCHOOLADMIN' || user?.role === 'PRINCIPAL' || isSchoolAdminEmail(user?.email) || user?.email?.toLowerCase()?.endsWith('.edu.in')) ? (
              <SchoolEcosystem
                uid={user.uid || user.id || 'admin_uid'}
                email={user.email || ''}
                displayName={user.name || 'School Admin'}
                isSuperAdmin={false}
                userRole="SCHOOL_ADMIN"
                user={user}
                defaultSchoolId={user.schoolId || ''}
                forceAdminView={true}
                onOpenPlatformContent={() => handleSetView('STUDENT')}
                onOpenStudentDashboard={() => handleSetView('STUDENT')}
                onLogout={handleLogout}
              />
            ) : (
              <AdminDashboard
                user={user}
                isDarkMode={isDarkMode}
                onToggleDarkMode={setIsDarkMode}
                onNavigate={(navTarget: any) => {
                  if (navTarget === 'STUDENT_DASHBOARD' || navTarget === 'STUDENT') {
                    handleSetView('STUDENT');
                  } else if (navTarget === 'SCHOOL_ECOSYSTEM' || navTarget === 'SCHOOL_ERP' || navTarget === 'SCHOOL') {
                    handleSetView('SCHOOL_ERP');
                  }
                }}
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onImpersonate={(impersonatedUser: any) => {
                  handleUpdateUser(impersonatedUser);
                  handleSetView('STUDENT');
                }}
                logActivity={logActivity}
                onOpenSchool={() => handleSetView('SCHOOL_ERP')}
              />
            )
          )}
        </Suspense>
      </div>

      <DeviceConflictModal
        isOpen={conflictModalOpen}
        deviceName={remoteDeviceName}
        onAcknowledge={handleAcknowledgeConflict}
      />

      <QrLoginApprovalModal
        challenge={incomingLoginChallenge}
        userId={user?.uid || user?.id || ''}
        onDismiss={() => setIncomingLoginChallenge(null)}
      />

      <GuestRoomJoinModal
        isOpen={showGuestStudyJoin}
        onClose={() => setShowGuestStudyJoin(false)}
        roomCode={studyRoomCodeFromUrl || undefined}
        onSubmitName={handleGuestJoinStudyRoom}
        appName={settings?.appName || 'NSTA'}
      />

      <GlobalNotificationPopup />
      <PwaInstallPrompt />
      <NotificationPrompt userId={user?.uid || user?.id || ''} />
      <NotificationPermissionGate userId={user?.uid || user?.id || ''} />
    </div>
  );
}

export default App;

