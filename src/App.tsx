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

// Dynamic lazy imports for smooth chunk loading & performance
const StudentDashboard = lazy(() =>
  import('./components/StudentDashboard').then(m => ({
    default: m.StudentDashboard || (m as any).default,
  }))
);

const AdminDashboard = lazy(() =>
  import('./components/AdminDashboard').then(m => ({
    default: m.AdminDashboard || (m as any).default,
  }))
);

const SchoolEcosystem = lazy(() =>
  import('./components/school/SchoolEcosystem').then(m => ({
    default: m.SchoolEcosystem || (m as any).default,
  }))
);

const Auth = lazy(() =>
  import('./components/Auth').then(m => ({
    default: m.Auth || (m as any).default,
  }))
);

export type AppViewMode = 'STUDENT' | 'ADMIN' | 'SCHOOL_ERP';

const getInitialUser = () => {
  try {
    if (localStorage.getItem('nst_logged_out') === 'true') {
      return null;
    }
    const raw = localStorage.getItem('nst_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.uid)) return parsed;
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
  // DEFAULT VIEW IS STUDENT DASHBOARD (As requested by user!)
  const [view, setView] = useState<AppViewMode>('STUDENT');
  const [user, setUser] = useState<any>(getInitialUser);
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
    setView('STUDENT');
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
          handleLogin(parsedCached);
        } else {
          const googleUser = {
            id: firebaseUser.uid,
            uid: firebaseUser.uid,
            displayId: `NSTA-${firebaseUser.uid.slice(-6).toUpperCase()}`,
            name: firebaseUser.displayName || 'Student',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'STUDENT',
            isGuest: false,
            provider: 'google',
            credits: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            board: 'CBSE',
            classLevel: '10',
            subscriptionTier: 'FREE',
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
      {/* ── TOP PORTAL SWITCHER BAR — Only shown in Admin & School ERP modes, NEVER on Student portal ────── */}
      {!isFullScreen && view !== 'STUDENT' && (
        <header className={`sticky top-0 z-40 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-2 shadow-sm transition-colors ${
          isDarkMode
            ? 'bg-slate-900/95 border-b border-slate-800 text-white shadow-slate-950/50'
            : 'bg-white/95 border-b border-slate-200 text-slate-800 shadow-slate-100'
        }`}>
          {/* Logo & Current Portal */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/30">
              NSTA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>NSTA Learning Portal</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  {view === 'STUDENT' ? 'Student Mode (Default)' : view === 'SCHOOL_ERP' ? 'School ERP' : 'Super Admin'}
                </span>
              </div>
              <p className={`text-[10px] hidden sm:block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {view === 'STUDENT' ? 'Study notes, MCQs, Video lessons & Leaderboard' : view === 'SCHOOL_ERP' ? '13 Classes, 910 Students, Fees, Attendance & HRM' : 'Super Admin System Controls'}
              </p>
            </div>
          </div>

          {/* Right side: Portal Switcher Pills & Logout Action */}
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${
              isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <button
                onClick={() => setView('STUDENT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  view === 'STUDENT'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Student</span>
              </button>

              <button
                onClick={() => setView('SCHOOL_ERP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  view === 'SCHOOL_ERP'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <School className="w-3.5 h-3.5" />
                <span>School ERP</span>
              </button>

              <button
                onClick={() => setView('ADMIN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  view === 'ADMIN'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-slate-900'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={handleLogout}
              title="Logout Account (लॉगआउट)"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-500 hover:text-white hover:bg-rose-600 border border-rose-400/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>
      )}

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
              email={user.email || 'admin@dps.edu.in'}
              displayName={user.name || 'School Administrator'}
              isSuperAdmin={false}
              defaultSchoolId="dps_gurgaon_sector45"
              forceAdminView={true}
              onBack={() => setView('STUDENT')}
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

