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
import { auth, logoutUser } from './firebase';
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

const isSchoolAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  return (
    clean === 'n44438403@gmail.com' ||
    clean === 'nadimanwar794@gmail.com' ||
    clean === 'nadiman0636indo@gmail.com' ||
    clean === 'admin@dps.edu.in' ||
    clean === 'dpsgurgaon45@dps.edu.in' ||
    clean.startsWith('admin@') ||
    clean.includes('schooladmin') ||
    clean.includes('principal')
  );
};

const getInitialUser = () => {
  try {
    if (localStorage.getItem('nst_logged_out') === 'true') {
      return null;
    }
    const raw = localStorage.getItem('nst_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.uid)) {
        if (isSchoolAdminEmail(parsed.email) && parsed.role !== 'SUPERADMIN') {
          parsed.role = 'SCHOOL_ADMIN';
        }
        return parsed;
      }
    }
  } catch (e) {}

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
  // Auto route based on user role:
  // - App Super Admin / Admin -> Direct to Admin Dashboard (ADMIN)
  // - School Admin / Principal -> School Admin Portal (SCHOOL_ERP)
  // - Teacher -> Teacher Portal (SCHOOL_ERP)
  // - School Student (QR / School ID) -> Student Portal (SCHOOL_ERP)
  // - General Student -> Student Dashboard (STUDENT)
  const [view, setView] = useState<AppViewMode>(() => {
    const initial = getInitialUser();
    if (initial?.role === 'SUPERADMIN' || initial?.role === 'ADMIN') {
      return 'ADMIN';
    }
    // Direct default view is School ERP (School ID Card se judein gateway)
    return 'SCHOOL_ERP';
  });
  const [settings, setSettings] = useState<any>(getInitialSettings);
  const [studentTab, setStudentTab] = useState<any>('HOME');
  const [dailyStudySeconds, setDailyStudySeconds] = useState<number>(180);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

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
    try {
      localStorage.removeItem('nst_logged_out');
      localStorage.setItem('nst_current_user', JSON.stringify(newUser));
    } catch (e) {}
    setUser(newUser);
    // Direct Role Routing:
    // 1. App ka Super Admin / Admin -> Direct to Admin Dashboard
    if (newUser?.role === 'SUPERADMIN' || newUser?.role === 'ADMIN') {
      setView('ADMIN');
      return;
    }

    // 2. Direct Routing: User jab login kare ya account create kare, to seedhe School ERP (School ID Card se judein gateway) par le jana hai
    setView('SCHOOL_ERP');
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

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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

        if (parsedCached && (parsedCached.uid === firebaseUser.uid || parsedCached.id === firebaseUser.uid)) {
          if (isSchoolAdminEmail(parsedCached.email) && parsedCached.role !== 'SUPERADMIN') {
            parsedCached.role = 'SCHOOL_ADMIN';
          }
          handleLogin(parsedCached);
        } else {
          const isAdm = isSchoolAdminEmail(firebaseUser.email);
          const googleUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            displayId: isAdm ? 'ADMIN-DPS' : `NSTA-${firebaseUser.uid.slice(-6).toUpperCase()}`,
            name: firebaseUser.displayName || (isAdm ? 'Dr. Arvind Swaminathan (School Admin & Principal)' : 'Student'),
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: isAdm ? 'SCHOOL_ADMIN' : 'STUDENT',
            schoolId: 'dps_gurgaon_sector45',
            isGuest: false,
            provider: isAdm ? 'admin_login' : 'google',
            credits: isAdm ? 10000 : 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            board: 'CBSE',
            classLevel: '10',
            subscriptionTier: isAdm ? 'PRO' : 'FREE',
            studyMode: 'CREDIT'
          };
          handleLogin(googleUser);
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
                  setView('ADMIN');
                }
              }}
              onLogout={handleLogout}
              onOpenSchool={() => setView('SCHOOL_ERP')}
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
              isSuperAdmin={user.role === 'SUPERADMIN'}
              userRole={user.role || (isSchoolAdminEmail(user.email) ? 'SCHOOL_ADMIN' : 'STUDENT')}
              user={user}
              defaultSchoolId={user.schoolId || 'dps_gurgaon_sector45'}
              forceAdminView={isSchoolAdminEmail(user.email) || user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'PRINCIPAL'}
              onBack={() => setView('STUDENT')}
              onLogout={handleLogout}
            />
          )}

          {view === 'ADMIN' && (
            <AdminDashboard
              onNavigate={(navTarget: any) => {
                if (navTarget === 'STUDENT_DASHBOARD' || navTarget === 'STUDENT') {
                  setView('STUDENT');
                }
              }}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onImpersonate={(impersonatedUser: any) => {
                handleUpdateUser(impersonatedUser);
                setView('STUDENT');
              }}
              logActivity={logActivity}
              onOpenSchool={() => setView('SCHOOL_ERP')}
            />
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

      <PwaInstallPrompt />
    </div>
  );
}

export default App;

