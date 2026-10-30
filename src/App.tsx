// @ts-nocheck
import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  GraduationCap,
  School,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';

// Direct static import for primary StudentDashboard to eliminate chunk loading failures
import { StudentDashboard } from './components/StudentDashboard';

// Dynamic lazy imports with automatic retry for secondary views
const retryDynamicImport = async (fn: () => Promise<any>, retriesLeft = 3, interval = 500): Promise<any> => {
  try {
    return await fn();
  } catch (error) {
    if (retriesLeft <= 0) {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
    return retryDynamicImport(fn, retriesLeft - 1, interval * 1.5);
  }
};

const AdminDashboard = lazy(() =>
  retryDynamicImport(() =>
    import('./components/AdminDashboard').then(m => ({
      default: m.AdminDashboard || (m as any).default,
    }))
  )
);

const SchoolEcosystem = lazy(() =>
  retryDynamicImport(() =>
    import('./components/school/SchoolEcosystem').then(m => ({
      default: m.SchoolEcosystem || (m as any).default,
    }))
  )
);

export type AppViewMode = 'STUDENT' | 'ADMIN' | 'SCHOOL_ERP';

const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('nst_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.uid)) return parsed;
    }
  } catch (e) {}

  return {
    id: 'student_demo_1',
    uid: 'student_demo_1',
    displayId: 'NSTA-STU-001',
    name: 'Student Demo',
    email: 'student@nsta.app',
    mobile: '9876543210',
    role: 'STUDENT',
    isGuest: false,
    board: 'CBSE',
    classLevel: '10',
    stream: 'Science',
    credits: 100,
    diamonds: 50,
    streak: 5,
    longestStreak: 14,
    totalScore: 1250,
    studyCoins: 350,
    studyMode: 'CREDIT',
    profileCompleted: true,
    createdAt: new Date().toISOString(),
    lastLoginDate: new Date().toISOString(),
    redeemedCodes: [],
    timedUnlocks: {},
    savedNotes: [],
    testResults: [],
  };
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

  const logActivity = (action: string, details: string) => {
    console.log(`[Activity Log] ${action}:`, details);
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${isDarkMode ? 'dark dark-mode' : ''}`}>
      {/* ── TOP PORTAL SWITCHER BAR ─────────────────────────────────────── */}
      {!isFullScreen && (
        <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shadow-lg">
          {/* Logo & Current Portal */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-600/30">
              NSTA
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-white">NSTA Learning Portal</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {view === 'STUDENT' ? 'Student Mode (Default)' : view === 'SCHOOL_ERP' ? 'School ERP' : 'Super Admin'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                {view === 'STUDENT' ? 'Study notes, MCQs, Video lessons & Leaderboard' : view === 'SCHOOL_ERP' ? '13 Classes, 910 Students, Fees, Attendance & HRM' : 'Super Admin System Controls'}
              </p>
            </div>
          </div>

          {/* Quick Portal Switcher Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setView('STUDENT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                view === 'STUDENT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
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
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
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
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin</span>
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

      <PwaInstallPrompt />
    </div>
  );
}

export default App;
