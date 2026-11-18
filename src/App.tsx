// @ts-nocheck
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import {
  GraduationCap,
  School,
  Shield,
  Loader2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  LogOut,
  User as UserIcon,
  Globe
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
import { AppLoadingScreen } from './components/AppLoadingScreen';
import {
  getAllSchools,
  getLocalSchools,
  getClasses,
  getLocalClasses,
  getSessions,
  isDemoRecord,
  shouldUseDemoForSchool,
} from './school-firebase';
import { getDemoSchoolDataset } from './components/school/demoDataStore';
import type { School as SchoolEntity, SchoolClass, SchoolSession } from './school-types';
import { getUpcomingAdmissionSessionLabel } from './utils/safeBrowserActions';

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

const DocumentVerificationView = lazyWithRetry(
  () => import('./components/school/DocumentVerificationView').then(m => ({ default: m.DocumentVerificationView || (m as any).default })),
  'Document Verification Portal'
);

const DriverTripConsole = lazyWithRetry(
  () => import('./components/school/DriverTripConsole').then(m => ({ default: m.DriverTripConsole || (m as any).default })),
  'Driver GPS Dashboard'
);

const PublicSchoolWebsite = lazyWithRetry(
  () => import('./components/school/PublicSchoolWebsite').then(m => ({ default: m.PublicSchoolWebsite || (m as any).default })),
  'School Website'
);

const OnlineAdmissionManager = lazyWithRetry(
  () => import('./components/school/OnlineAdmissionManager').then(m => ({ default: m.OnlineAdmissionManager || (m as any).default })),
  'Online Admission 2027-28'
);

export type AppViewMode = 'STUDENT' | 'ADMIN' | 'SCHOOL_ERP' | 'DRIVER';
export type PublicRoutePath = '/' | '/admission' | '/login' | '/verify';

const normalizeRoutePath = (pathname?: string): PublicRoutePath => {
  const clean = (pathname || '/').trim().toLowerCase();
  if (clean.startsWith('/admission')) return '/admission';
  if (clean.startsWith('/login')) return '/login';
  if (clean.startsWith('/verify')) return '/verify';
  return '/';
};

const getSchoolParamFromUrl = (): string => {
  try {
    const p = new URLSearchParams(window.location.search);
    return (p.get('school') || p.get('schoolId') || p.get('s') || '').trim();
  } catch {
    return '';
  }
};

export const isSuperAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  return (
    clean === 'nsbdhdh70@gmail.com' ||
    clean === 'nadimanwar794@gmail.com' ||
    clean === 'nadimanwar794@gmsil.com' ||
    clean === 'nsdimanwar794@gmail.com' ||
    clean === 'nadiman0636indo@gmail.com' ||
    clean === 'n44438403@gmail.com' ||
    clean === 'fgkfgffhgg@gmail.com' ||
    clean === 'ghduug6@gmail.com' ||
    clean === 'nadim841414s@gmail.com' ||
    clean.startsWith('nadimanwar') ||
    clean.startsWith('nadim841414') ||
    clean.startsWith('nsbdhdh') ||
    clean === 'superadmin' ||
    clean === 'admin'
  );
};

export const isSchoolAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  if (isSuperAdminEmail(clean)) return false;
  return (
    clean === 'admin@dps.edu.in' ||
    clean === 'dpsgurgaon45@dps.edu.in' ||
    clean === 'principal@dps.edu.in' ||
    clean.includes('schooladmin') ||
    clean.includes('school_admin') ||
    clean.startsWith('school.') ||
    clean.startsWith('admin@')
  );
};

export const isSchoolAdminRole = (u?: any): boolean => {
  if (!u) return false;
  if (isSuperAdminEmail(u.email)) return false;
  const r = (u.role || '').toString().trim().toUpperCase();
  const sr = (u.schoolRole || '').toString().trim().toUpperCase();
  const ut = (u.userType || '').toString().trim().toUpperCase();
  return (
    r === 'SCHOOL_ADMIN' ||
    r === 'SCHOOLADMIN' ||
    r === 'PRINCIPAL' ||
    r === 'SCHOOL_SUB_ADMIN' ||
    sr === 'ADMIN' ||
    sr === 'SCHOOL_ADMIN' ||
    ut === 'SCHOOL_ADMIN' ||
    isSchoolAdminEmail(u.email) ||
    u.provider === 'admin_login' ||
    u.provider === 'school_admin_quick_login' ||
    u.provider === 'school_admin_direct_login' ||
    u.id === 'admin_uid' ||
    u.uid === 'admin_uid'
  );
};

export const isAdminUser = (u?: any): boolean => {
  if (!u) return false;
  if (isSchoolAdminRole(u)) return false;
  const r = (u.role || '').toString().trim().toUpperCase();
  // School Admin is STRICTLY restricted to School ERP, NEVER NSTA Main Admin
  if (r === 'SCHOOL_ADMIN' || r === 'SCHOOLADMIN' || r === 'PRINCIPAL' || r === 'TEACHER' || r === 'ACCOUNTANT') {
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

export const isSchoolPortalUser = (u?: any): boolean => {
  if (!u) return false;
  if (isSuperAdminEmail(u.email) || u.id === 'super_admin_nadim' || u.uid === 'super_admin_nadim') return false;
  if (isSchoolAdminRole(u)) return true;
  const r = (u.role || '').toString().trim().toUpperCase();
  const sr = (u.schoolRole || '').toString().trim().toUpperCase();
  const ut = (u.userType || '').toString().trim().toUpperCase();
  const prov = (u.provider || '').toString().trim().toLowerCase();
  const emailLower = (u.email || '').toString().trim().toLowerCase();
  if (r === 'DRIVER' || isAdminUser(u)) return false;
  return Boolean(
    ut === 'SCHOOL_STUDENT' ||
    r === 'SCHOOL_STUDENT' ||
    r === 'TEACHER' ||
    r === 'ACCOUNTANT' ||
    sr === 'TEACHER' ||
    sr === 'ACCOUNTANT' ||
    sr === 'STUDENT' ||
    Boolean(u.schoolRole) ||
    Boolean(u.admissionNo) ||
    Boolean(u.studentId) ||
    Boolean(u.teacherId) ||
    emailLower.endsWith('.edu.in') ||
    emailLower.includes('@student.') ||
    emailLower.includes('@teacher.') ||
    prov === 'qr_student_id' ||
    prov === 'qr_teacher_id' ||
    prov === 'face_recognition_login' ||
    prov === 'student_record' ||
    prov === 'teacher_record' ||
    prov === 'accountant_record' ||
    (Boolean(u.schoolId) && String(u.schoolId).trim() !== '')
  );
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
    if (localStorage.getItem('nst_logged_out') === 'true') {
      return null;
    }
    const raw = localStorage.getItem('nst_current_user');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.uid)) {
        if (isSuperAdminEmail(parsed.email) || parsed.id === 'super_admin_nadim' || parsed.uid === 'super_admin_nadim') {
          parsed.role = 'SUPERADMIN';
          parsed.isAdmin = true;
          parsed.isSuperAdmin = true;
          // Super Admin is never tied to any school by default!
          parsed.schoolId = '';
          parsed.schoolName = null;
          parsed.schoolRole = null;
          parsed.schoolCode = null;
        } else if (isSchoolAdminRole(parsed)) {
          parsed.role = 'SCHOOL_ADMIN';
          parsed.schoolRole = 'SCHOOL_ADMIN';
          if (!parsed.schoolId) {
            parsed.schoolId = localStorage.getItem('nst_active_school_id') || 'dps_gurgaon_sector45';
          }
        } else if (isAdminUser(parsed)) {
          parsed.role = 'ADMIN';
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
        if ((u?.role || '').toString().trim().toUpperCase() === 'DRIVER') return 'DRIVER';
        if (isSchoolAdminRole(u)) return 'SCHOOL_ERP';
        if (isAdminUser(u)) return 'ADMIN';
        if (isSchoolPortalUser(u) || localStorage.getItem('nst_active_school_id')) {
          return 'SCHOOL_ERP';
        }
      }

      const saved = localStorage.getItem('nst_app_view_mode') as AppViewMode;
      if (saved === 'ADMIN' || saved === 'STUDENT' || saved === 'SCHOOL_ERP' || saved === 'DRIVER') {
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

    // School students, teachers, accountants, and school admins stay strictly inside their School Portal (never NSTA Main StudentDashboard)
    if (newView === 'STUDENT' && isSchoolPortalUser(user)) {
      setView('SCHOOL_ERP');
      try {
        localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
      } catch {}
      return;
    }

    if (newView === 'STUDENT' && view !== 'STUDENT') {
      setShowBootSplash(true);
    }
    setView(newView);
    try {
      localStorage.setItem('nst_app_view_mode', newView);
    } catch {}
  };
  const [settings, setSettings] = useState<any>(getInitialSettings);
  const [studentTab, setStudentTab] = useState<any>('HOME');
  const [dailyStudySeconds, setDailyStudySeconds] = useState<number>(180);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nst_dark_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [erpTheme, setErpTheme] = useState<'white' | 'black' | 'current'>(() => {
    try {
      const t = localStorage.getItem('nst_app_theme') || localStorage.getItem('nst_student_theme');
      if (t === 'white' || t === 'black' || t === 'current') return t;
    } catch {}
    return 'current';
  });
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [gmpQuotaExceeded, setGmpQuotaExceeded] = useState<boolean>(false);
  const [routePath, setRoutePath] = useState<PublicRoutePath>(() => {
    try {
      return normalizeRoutePath(window.location.pathname);
    } catch {
      return '/';
    }
  });
  const [urlSchoolParam, setUrlSchoolParam] = useState<string>(() => getSchoolParamFromUrl());
  const [showPublicWebsite, setShowPublicWebsite] = useState<boolean>(() => {
    try {
      const path = normalizeRoutePath(window.location.pathname);
      const p = new URLSearchParams(window.location.search);
      if (p.get('studyRoom') || path === '/login') return false;
      return true;
    } catch {
      return true;
    }
  });
  const [publicSchools, setPublicSchools] = useState<SchoolEntity[]>(() => {
    try {
      const local = getLocalSchools();
      return Array.isArray(local) ? local : [];
    } catch {
      return [];
    }
  });
  const [selectedPublicSchoolId, setSelectedPublicSchoolId] = useState<string>(() => {
    try {
      return getSchoolParamFromUrl() || localStorage.getItem('selectedPublicSchoolId') || '';
    } catch {
      return '';
    }
  });
  const [publicAdmClasses, setPublicAdmClasses] = useState<SchoolClass[]>([]);
  const [publicAdmSessions, setPublicAdmSessions] = useState<SchoolSession[]>([]);

  const navigateToPath = (
    targetPath: PublicRoutePath,
    options?: { searchParams?: Record<string, string>; clearSearch?: boolean }
  ) => {
    try {
      const url = new URL(window.location.href);
      url.pathname = targetPath;
      if (options?.clearSearch) {
        url.search = '';
        url.hash = '';
      }
      if (options?.searchParams) {
        Object.entries(options.searchParams).forEach(([k, v]) => {
          if (v) url.searchParams.set(k, v);
          else url.searchParams.delete(k);
        });
      }
      const nextRelative = `${url.pathname}${url.search}${url.hash}`;
      if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextRelative) {
        window.history.pushState({ routePath: targetPath }, '', nextRelative);
      }
      setUrlSchoolParam(url.searchParams.get('school') || url.searchParams.get('schoolId') || url.searchParams.get('s') || '');
    } catch {}
    setRoutePath(targetPath);
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  useEffect(() => {
    const onPopState = () => {
      const nextRoute = normalizeRoutePath(window.location.pathname);
      setRoutePath(nextRoute);
      setUrlSchoolParam(getSchoolParamFromUrl());
      if (nextRoute === '/login') {
        setShowPublicWebsite(false);
        setShowBootSplash(true);
      } else if (nextRoute === '/admission') {
        setShowBootSplash(false);
        setShowPublicWebsite(true);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    const loadSchools = async () => {
      try {
        const list = await getAllSchools();
        if (active && Array.isArray(list) && list.length > 0) {
          setPublicSchools(list);
        }
      } catch {}
    };
    loadSchools();
    const onSchoolListRefresh = () => {
      loadSchools();
    };
    window.addEventListener('nst_school_identity_updated', onSchoolListRefresh);
    return () => {
      active = false;
      window.removeEventListener('nst_school_identity_updated', onSchoolListRefresh);
    };
  }, []);

  const visiblePublicSchools = useMemo(() => {
    const activeList = (publicSchools || []).filter(
      (s: any) => s && s.status !== 'ARCHIVED' && s.status !== 'DELETED'
    );
    const nonDemo = activeList.filter((s: any) => !isDemoRecord(s) && s.id !== 'dps_gurgaon_sector45');
    if (nonDemo.length > 0) return nonDemo;
    if (activeList.length > 0) return activeList;
    const demoSchool = getDemoSchoolDataset()?.school;
    return demoSchool
      ? [demoSchool as SchoolEntity]
      : [
          {
            id: 'dps_gurgaon_sector45',
            name: 'Life Maker Public School',
            code: 'LMPS',
            address: 'Institutional Academic Campus, Educational Zone',
            tagline: 'Knowledge & Excellence',
            createdAt: new Date().toISOString(),
            status: 'ACTIVE',
          } as SchoolEntity,
        ];
  }, [publicSchools]);

  const activePublicSchool: SchoolEntity = useMemo(() => {
    const matchSchool = (query?: string) => {
      const q = (query || '').trim().toLowerCase();
      if (!q) return undefined;
      return visiblePublicSchools.find(
        (s) =>
          (s.id || '').toLowerCase() === q ||
          (s.code || '').toLowerCase() === q ||
          (s.websiteConfig?.customSlug || '').toLowerCase() === q
      );
    };

    // Priority: URL ?school= > localStorage/selectedPublicSchoolId > isDefaultPublicWebsite > Life Maker Public School > first active school
    if (urlSchoolParam) {
      const fromUrl = matchSchool(urlSchoolParam);
      if (fromUrl) return fromUrl;
    }
    const fromSelected = matchSchool(selectedPublicSchoolId);
    if (fromSelected) return fromSelected;

    try {
      const storedId = localStorage.getItem('selectedPublicSchoolId');
      if (storedId && storedId.toLowerCase() !== 'nstz') {
        const fromStorage = matchSchool(storedId);
        if (fromStorage) return fromStorage;
      }
    } catch {}

    const explicitDefault = visiblePublicSchools.find((s) => s.isDefaultPublicWebsite === true);
    if (explicitDefault) return explicitDefault;

    const lifeMakerDefault = visiblePublicSchools.find(
      (s) =>
        (s.name || '').toLowerCase().includes('life maker') ||
        (s.code || '').toUpperCase() === 'LMPS'
    );
    if (lifeMakerDefault) return lifeMakerDefault;

    return visiblePublicSchools[0];
  }, [visiblePublicSchools, urlSchoolParam, selectedPublicSchoolId]);

  const handleSelectPublicSchool = (schoolId: string) => {
    setSelectedPublicSchoolId(schoolId);
    try {
      localStorage.setItem('selectedPublicSchoolId', schoolId);
      const url = new URL(window.location.href);
      if (url.searchParams.has('school') || url.searchParams.has('schoolId') || url.searchParams.has('s')) {
        url.searchParams.set('school', schoolId);
        url.searchParams.delete('schoolId');
        url.searchParams.delete('s');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
        setUrlSchoolParam(schoolId);
      }
    } catch {}
  };

  useEffect(() => {
    if (!activePublicSchool?.id) return;
    let active = true;
    const sid = activePublicSchool.id;
    const localCls = getLocalClasses(sid).filter((c: any) => !isDemoRecord(c));
    setPublicAdmClasses(localCls);
    getClasses(sid)
      .then((cls) => {
        if (!active) return;
        const real = (cls || []).filter((c: any) => !isDemoRecord(c));
        if (real.length > 0) {
          setPublicAdmClasses(real);
        } else if (shouldUseDemoForSchool(sid)) {
          setPublicAdmClasses(getDemoSchoolDataset()?.classes || []);
        } else {
          setPublicAdmClasses([]);
        }
      })
      .catch(() => {});
    getSessions(sid)
      .then((sess) => {
        if (!active) return;
        if (Array.isArray(sess) && sess.length > 0) {
          setPublicAdmSessions(sess);
        } else {
          setPublicAdmSessions(getDemoSchoolDataset()?.sessions || []);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [activePublicSchool?.id]);

  const [showBootSplash, setShowBootSplash] = useState<boolean>(() => {
    try {
      const path = normalizeRoutePath(window.location.pathname);
      const p = new URLSearchParams(window.location.search);
      const docTypeParam = p.get('type') || '';
      const isPublicVerify = Boolean(
        p.get('verify') ||
        p.get('verify-certificate') ||
        p.get('cNo') ||
        p.get('certNo') ||
        p.get('dispatchNo') ||
        p.get('v') === 'id' ||
        ['certificate', 'marksheet', 'idcard', 'driver_id', 'fee_receipt', 'admit_card', 'admission', 'gate_pass'].includes(docTypeParam) ||
        path === '/verify'
      );
      const isStandaloneDriver = p.get('driverConsole') === '1' || p.get('driver') === '1';
      return path === '/login' && !getInitialUser() && !isPublicVerify && !isStandaloneDriver;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onQuotaExceeded = () => setGmpQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
  }, []);

  // Listen for direct navigation events to Main Student Dashboard
  useEffect(() => {
    const handleOpenStudent = (e?: any) => {
      if (isSchoolPortalUser(user)) {
        handleSetView('SCHOOL_ERP');
        return;
      }
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
  }, [user]);

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
    const splash = document.getElementById('pre-react-splash');
    if (splash) {
      try { splash.remove(); } catch {}
    }
    if (typeof (window as any).hidePreReactSplash === 'function') {
      (window as any).hidePreReactSplash();
    }
  }, []);

  const [schoolIdentityRev, setSchoolIdentityRev] = useState(0);

  useEffect(() => {
    const bumpIdentity = () => setSchoolIdentityRev((r) => r + 1);
    window.addEventListener('nst_school_identity_updated', bumpIdentity);
    window.addEventListener('storage', bumpIdentity);
    return () => {
      window.removeEventListener('nst_school_identity_updated', bumpIdentity);
      window.removeEventListener('storage', bumpIdentity);
    };
  }, []);

  // Automatic Web Push Registration & Re-sync (Chrome Browser + Installed PWA):
  // Whenever Notification.permission === 'granted', silently ensure the device's
  // Web Push subscription & school/class metadata stay registered on the server.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const rebindTimer = setTimeout(() => {
      import('./utils/schoolPushClient').then(({ autoSyncSchoolPushIfPermitted }) => {
        const studentList: any[] = [];
        let resolvedSchoolId = '';
        try {
          resolvedSchoolId = localStorage.getItem('nst_active_school_id') || '';
          const activeStdRaw =
            localStorage.getItem('nst_active_student') || localStorage.getItem('nst_cached_student');
          if (activeStdRaw) {
            const parsed = JSON.parse(activeStdRaw);
            if (parsed?.id) {
              studentList.push(parsed);
              if (!resolvedSchoolId && parsed.schoolId) resolvedSchoolId = String(parsed.schoolId);
            }
          }
          const linkedRaw = localStorage.getItem('nst_linked_students');
          if (linkedRaw) {
            const parsedLinked = JSON.parse(linkedRaw);
            if (Array.isArray(parsedLinked)) {
              parsedLinked.forEach((st: any) => {
                if (st?.id && !studentList.some((s) => s.id === st.id)) {
                  studentList.push(st);
                  if (!resolvedSchoolId && st.schoolId) resolvedSchoolId = String(st.schoolId);
                }
              });
            }
          }
          const curUserRaw = localStorage.getItem('nst_current_user');
          if (curUserRaw) {
            const cu = JSON.parse(curUserRaw);
            if (!resolvedSchoolId && cu?.schoolId) resolvedSchoolId = String(cu.schoolId);
          }
        } catch (_) {}

        autoSyncSchoolPushIfPermitted({
          userId: user?.uid || user?.id || studentList[0]?.id || 'guest',
          schoolId: resolvedSchoolId || undefined,
          students: studentList,
        }).catch(() => {});
      });
    }, 1200);
    return () => clearTimeout(rebindTimer);
  }, [user?.id, user?.uid, schoolIdentityRev]);

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

  const handleLogin = (newUser: any, options?: { keepWebsiteOpen?: boolean }) => {
    if (!options?.keepWebsiteOpen) {
      setShowPublicWebsite(false);
      setShowBootSplash(false);
      try {
        const curPath = normalizeRoutePath(window.location.pathname);
        if (curPath === '/login' || curPath === '/admission') {
          navigateToPath('/', { clearSearch: true });
        }
      } catch {}
    }
    // 0. Bus Driver: DIRECT TO DEDICATED DRIVER GPS DASHBOARD!
    if (newUser && (newUser.role || '').toString().trim().toUpperCase() === 'DRIVER') {
      newUser.role = 'DRIVER';
      try {
        localStorage.removeItem('nst_logged_out');
        localStorage.setItem('nst_current_user', JSON.stringify(newUser));
        localStorage.setItem('nst_app_view_mode', 'DRIVER');
        if (newUser.schoolId) {
          localStorage.setItem('nst_active_school_id', newUser.schoolId);
        }
      } catch (e) {}
      setUser(newUser);
      setView('DRIVER');
      return;
    }

    // 1. Super Admin: direct to Main NSTA Platform Admin Console
    if (newUser && (isSuperAdminEmail(newUser.email) || newUser.id === 'super_admin_nadim' || newUser.uid === 'super_admin_nadim' || newUser.role === 'SUPERADMIN')) {
      newUser.role = 'SUPERADMIN';
      newUser.isAdmin = true;
      newUser.isSuperAdmin = true;
      newUser.schoolId = '';
      try {
        localStorage.removeItem('nst_logged_out');
        localStorage.setItem('nst_current_user', JSON.stringify(newUser));
        localStorage.setItem('nst_app_view_mode', 'ADMIN');
      } catch (e) {}
      setUser(newUser);
      setView('ADMIN');
      return;
    }

    // 2. School Admin (Principal / School Incharge): DIRECT TO SCHOOL ADMIN DASHBOARD!
    if (isSchoolAdminRole(newUser)) {
      newUser.role = 'SCHOOL_ADMIN';
      newUser.schoolRole = 'SCHOOL_ADMIN';
      const targetSchool = newUser.schoolId || localStorage.getItem('nst_active_school_id') || 'dps_gurgaon_sector45';
      newUser.schoolId = targetSchool;
      try {
        localStorage.removeItem('nst_logged_out');
        localStorage.setItem('nst_current_user', JSON.stringify(newUser));
        localStorage.setItem('nst_active_school_id', targetSchool);
        localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
        localStorage.setItem('nst_school_admin_active_tab', 'home');
      } catch (e) {}
      setUser(newUser);
      setView('SCHOOL_ERP');
      return;
    }

    // 3. Platform Admin (Staff): direct to Admin Dashboard
    if (isAdminUser(newUser)) {
      newUser.role = 'ADMIN';
      try {
        localStorage.removeItem('nst_logged_out');
        localStorage.setItem('nst_current_user', JSON.stringify(newUser));
        localStorage.setItem('nst_app_view_mode', 'ADMIN');
      } catch (e) {}
      setUser(newUser);
      setView('ADMIN');
      return;
    }

    // 4. Other School Roles (School Student, Teacher, Accountant): direct to School ERP Portal
    if (isSchoolPortalUser(newUser)) {
      try {
        localStorage.removeItem('nst_logged_out');
        localStorage.setItem('nst_current_user', JSON.stringify(newUser));
        localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
        if (newUser?.schoolId) {
          localStorage.setItem('nst_active_school_id', newUser.schoolId);
        }
      } catch (e) {}
      setUser(newUser);
      setView('SCHOOL_ERP');
      return;
    }

    // 5. Default: Regular Student Dashboard
    try {
      localStorage.removeItem('nst_logged_out');
      localStorage.setItem('nst_current_user', JSON.stringify(newUser));
      localStorage.setItem('nst_app_view_mode', 'STUDENT');
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
      document.documentElement.classList.remove(
        'student-theme-white', 'student-theme-black', 'student-theme-current',
        'admin-theme-white', 'admin-theme-black', 'admin-theme-current',
        'teacher-theme-white', 'teacher-theme-black', 'teacher-theme-current',
        'app-theme-white', 'app-theme-black', 'app-theme-current',
        'dark-mode-black', 'dark-mode-blue'
      );
      delete document.documentElement.dataset.nstErpTheme;
    } catch (e) {}
    setUser(null);
    setShowBootSplash(false);
    setShowPublicWebsite(true);
    navigateToPath('/', { clearSearch: true });
  };

  const logActivity = (action: string, details: string) => {
    console.log(`[Activity Log] ${action}:`, details);
  };

  useEffect(() => {
    const syncThemeFromStorage = () => {
      try {
        const t = localStorage.getItem('nst_app_theme') || localStorage.getItem('nst_student_theme');
        if (t === 'white' || t === 'black' || t === 'current') {
          setErpTheme(t);
        }
        const dm = localStorage.getItem('nst_dark_mode');
        if (dm === 'true' || dm === 'false') {
          setIsDarkMode(dm === 'true');
        }
      } catch {}
    };
    window.addEventListener('nst-dark-theme-change', syncThemeFromStorage);
    window.addEventListener('storage', syncThemeFromStorage);
    return () => {
      window.removeEventListener('nst-dark-theme-change', syncThemeFromStorage);
      window.removeEventListener('storage', syncThemeFromStorage);
    };
  }, []);

  const isSchoolErpActive = Boolean(
    user &&
      (view === 'SCHOOL_ERP' ||
        (view === 'ADMIN' &&
          (user?.role === 'SCHOOL_ADMIN' ||
            user?.role === 'SCHOOLADMIN' ||
            user?.role === 'PRINCIPAL' ||
            isSchoolAdminEmail(user?.email) ||
            user?.email?.toLowerCase()?.endsWith('.edu.in'))))
  );

  // Dynamic theme classes synced with active view (ERP 3-theme vs Main App Light/Dark)
  const appBgClass = isSchoolErpActive
    ? erpTheme === 'white'
      ? 'bg-[#eef2f7] text-slate-900'
      : erpTheme === 'black'
      ? 'bg-black text-white dark dark-mode'
      : 'bg-[#08142c] text-slate-100 dark dark-mode'
    : isDarkMode
    ? 'bg-slate-950 text-slate-100 dark dark-mode'
    : 'bg-slate-50 text-slate-900';

  useEffect(() => {
    if (isSchoolErpActive) {
      return;
    }
    document.documentElement.classList.remove(
      'student-theme-white', 'student-theme-black', 'student-theme-current',
      'admin-theme-white', 'admin-theme-black', 'admin-theme-current',
      'teacher-theme-white', 'teacher-theme-black', 'teacher-theme-current',
      'app-theme-white', 'app-theme-black', 'app-theme-current',
      'dark-mode-black', 'dark-mode-blue'
    );
    try { delete document.documentElement.dataset.nstErpTheme; } catch {}
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
  }, [isDarkMode, isSchoolErpActive]);

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
        // If explicitly logged out recently, don't auto re-login unless actively on /login
        const isLoginRoute = normalizeRoutePath(window.location.pathname) === '/login';
        if (localStorage.getItem('nst_logged_out') === 'true' && !isLoginRoute) {
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
          handleLogin(adminUser, { keepWebsiteOpen: !isLoginRoute });
          return;
        }

        if (parsedCached && (parsedCached.uid === firebaseUser.uid || parsedCached.id === firebaseUser.uid)) {
          if (isSchoolAdminEmail(parsedCached.email)) {
            parsedCached.role = 'SCHOOL_ADMIN';
          }
          handleLogin(parsedCached, { keepWebsiteOpen: !isLoginRoute });
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
          handleLogin(resolvedUser, { keepWebsiteOpen: !isLoginRoute });
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

    let activeStudentId = '';
    let activeSchoolId = '';
    try {
      activeSchoolId = localStorage.getItem('nst_active_school_id') || '';
      const stRaw = localStorage.getItem('nst_active_student') || localStorage.getItem('nst_cached_student');
      if (stRaw) {
        const parsed = JSON.parse(stRaw);
        if (parsed?.id) activeStudentId = String(parsed.id);
        if (!activeSchoolId && parsed?.schoolId) activeSchoolId = String(parsed.schoolId);
      }
    } catch {}

    const uid = user?.uid || user?.id || activeStudentId;
    if (uid) {
      unsubUserNotifs = subscribeToUserNotifications(
        uid,
        (notif) => {
          console.log('[App] Received RTDB notification:', notif);
        },
        {
          studentId: activeStudentId || undefined,
          schoolId: activeSchoolId || undefined,
        }
      );
    }

    return () => {
      if (typeof unsubForeground === 'function') unsubForeground();
      if (typeof unsubUserNotifs === 'function') unsubUserNotifs();
    };
  }, [user?.uid, user?.id, schoolIdentityRev]);

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

  // Public QR Document Verification Route (Live check for TC, Marksheet & ID Card scans without requiring login)
  const isPublicDocVerify = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const docTypeParam = p.get('type') || '';
      return Boolean(
        p.get('verify') ||
        p.get('verify-certificate') ||
        p.get('cNo') ||
        p.get('certNo') ||
        p.get('dispatchNo') ||
        (p.get('v') === 'id') ||
        ['certificate', 'marksheet', 'idcard', 'driver_id', 'fee_receipt', 'admit_card', 'admission', 'gate_pass'].includes(docTypeParam) ||
        routePath === '/verify' ||
        window.location.pathname.startsWith('/verify')
      );
    } catch {
      return false;
    }
  })();

  if (isPublicDocVerify) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8 text-center text-white">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-sm font-bold">Verifying Official Document...</p>
          </div>
        }
      >
        <DocumentVerificationView
          onBack={() => {
            navigateToPath('/', { clearSearch: true });
          }}
        />
      </Suspense>
    );
  }

  // Dedicated Standalone Driver GPS Dashboard (?driverConsole=1&schoolId=...&busId=...)
  const driverConsoleParams = (() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get('driverConsole') === '1' || p.get('driver') === '1') {
        return {
          schoolId: (p.get('schoolId') || '').trim(),
          schoolCode: (p.get('schoolCode') || '').trim(),
          schoolName: (p.get('schoolName') || 'School Bus Fleet').trim(),
          busId: (p.get('busId') || '').trim(),
          busNumber: (p.get('busNumber') || '').trim(),
          route: (p.get('route') || '').trim(),
          driverName: (p.get('driverName') || '').trim(),
          driverPhone: (p.get('driverPhone') || '').trim(),
        };
      }
      return null;
    } catch {
      return null;
    }
  })();

  if (driverConsoleParams) {
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col bg-slate-950">
        {gmpQuotaExceeded && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
            <span>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-950 hover:text-amber-800"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </span>
          </div>
        )}
        <Suspense
          fallback={
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center text-white">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400 mb-3" />
              <p className="text-sm font-bold">Loading Driver GPS Dashboard...</p>
            </div>
          }
        >
          <DriverTripConsole
            school={{
              id: driverConsoleParams.schoolId,
              code: driverConsoleParams.schoolCode,
              name: driverConsoleParams.schoolName,
            } as any}
            initialBusId={driverConsoleParams.busId || undefined}
            initialBusMeta={
              driverConsoleParams.busId || driverConsoleParams.busNumber
                ? {
                    id: driverConsoleParams.busId || 'bus_direct',
                    busNumber: driverConsoleParams.busNumber || 'School Bus',
                    route: driverConsoleParams.route || 'School Bus Route',
                    driverName: driverConsoleParams.driverName || 'Driver',
                    driverPhone: driverConsoleParams.driverPhone || '',
                  }
                : undefined
            }
            standaloneMode={true}
          />
        </Suspense>
      </div>
    );
  }

  const renderBootSplash = () =>
    showBootSplash && !isPublicDocVerify && !driverConsoleParams ? (
      <AppLoadingScreen
        onComplete={() => setShowBootSplash(false)}
        userId={user?.uid || user?.id}
        userRole={user?.role}
        loadingScreenSlotAssignments={user?.loadingScreenSlotAssignments}
        loadingScreenSlotUnlocks={user?.loadingScreenSlotUnlocks}
        loadingScreenUnlocks={user?.loadingScreenUnlocks}
        loadingScreenVideoUrl={settings?.loadingScreenVideoUrl}
      />
    ) : null;

  const handleVisitWebsiteFromPortal = (targetSchoolId?: string) => {
    if (targetSchoolId) {
      handleSelectPublicSchool(targetSchoolId);
    }
    setShowBootSplash(false);
    setShowPublicWebsite(true);
    navigateToPath('/');
  };

  const handleOpenAccountSection = () => {
    setShowPublicWebsite(false);
    setShowBootSplash(true);
    navigateToPath('/login');
  };

  const renderPublicAdmissionShell = (loggedInMode: boolean) => {
    const portalBtnLabel =
      user && (isSchoolAdminRole(user) || isAdminUser(user) || ['TEACHER', 'ACCOUNTANT'].includes((user.role || '').toString().toUpperCase()))
        ? 'Switch to ERP Portal'
        : 'Switch to Student Portal';
    const activeAdmSessObj = publicAdmSessions.find((s: any) => s?.active) || publicAdmSessions[0] || null;
    const rawCurrentSess = activeAdmSessObj?.name || '';
    const nextYearNum = getUpcomingAdmissionSessionLabel(rawCurrentSess, publicAdmSessions);
    return (
      <div className="min-h-screen min-h-[100dvh] bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200/90 dark:border-slate-800 shadow-xs">
          <div className="h-0.5 w-full bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500" />
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigateToPath('/')}
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0 whitespace-nowrap"
                title="Back to School Website"
              >
                <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">Website</span>
              </button>

              {activePublicSchool?.logoUrl ? (
                <img
                  src={activePublicSchool.logoUrl}
                  alt={activePublicSchool?.name || 'School Logo'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain bg-white border border-slate-200 dark:border-slate-700 p-0.5 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate leading-tight">
                  {activePublicSchool?.name || 'School Campus'}
                </p>
                <p className="text-[10.5px] sm:text-[11px] font-bold text-indigo-700 dark:text-indigo-300 truncate leading-tight mt-0.5">
                  अभिभावक ऑनलाइन प्रवेश पोर्टल • Session {nextYearNum}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {visiblePublicSchools.length > 1 && (
                <select
                  value={activePublicSchool?.id || ''}
                  onChange={(e) => handleSelectPublicSchool(e.target.value)}
                  aria-label="Select School for Admission"
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 max-w-[130px] sm:max-w-[180px] truncate cursor-pointer"
                >
                  {visiblePublicSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {loggedInMode ? (
                <button
                  type="button"
                  onClick={() => {
                    const isErpRole = Boolean(
                      user && (isSchoolAdminRole(user) || isAdminUser(user) || ['TEACHER', 'ACCOUNTANT'].includes((user.role || '').toString().toUpperCase()))
                    );
                    setShowPublicWebsite(false);
                    if (!isErpRole) {
                      setShowBootSplash(true);
                    }
                    navigateToPath('/');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs font-extrabold shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  {portalBtnLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAccountSection}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer whitespace-nowrap"
                >
                  <UserIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Account</span>
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="flex-1">
          <Suspense
            fallback={
              <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
                <p className="text-sm font-bold text-slate-700 dark:text-white">Loading Online Admission {nextYearNum}...</p>
              </div>
            }
          >
            <OnlineAdmissionManager
              key={activePublicSchool?.id || 'public-adm'}
              school={activePublicSchool}
              classes={publicAdmClasses}
              sessions={publicAdmSessions}
              activeSession={activeAdmSessObj}
              admissionSessionLabel={nextYearNum}
              isAdmin={false}
              viewMode="admissions_only"
              hideTopNavbar={true}
              onBack={() => navigateToPath('/')}
            />
          </Suspense>
        </div>
      </div>
    );
  };

  // If user is logged out, render Website-First Public Experience (/ , /admission , /login)
  if (!user) {
    if (routePath === '/login') {
      return (
        <>
          <div className={`min-h-screen min-h-[100dvh] w-full flex flex-col ${appBgClass}`}>
            {gmpQuotaExceeded && (
              <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
                <span>
                  Google Maps Platform quota reached. If you are the app owner, visit{' '}
                  <a
                    href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold text-amber-950 hover:text-amber-800"
                  >
                    maps developer site
                  </a>{' '}
                  for instructions to update your account.
                </span>
              </div>
            )}
            <Suspense
              fallback={
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[60vh]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <Loader2 className={`w-6 h-6 animate-spin ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                  </div>
                  <h3 className={`text-base font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Loading Account Portal...</h3>
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Please wait a moment</p>
                </div>
              }
            >
              <Auth
                onLogin={handleLogin}
                appSettings={settings}
                logActivity={logActivity}
                onOpenGuestStudyRoom={() => setShowGuestStudyJoin(true)}
                onBackToWebsite={() => {
                  setShowBootSplash(false);
                  setShowPublicWebsite(true);
                  navigateToPath('/');
                }}
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
          {renderBootSplash()}
        </>
      );
    }

    if (routePath === '/admission') {
      return renderPublicAdmissionShell(false);
    }

    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col bg-[#F8F9FB]">
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh] bg-slate-950 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm font-bold">Loading School Website...</p>
            </div>
          }
        >
          <PublicSchoolWebsite
            school={activePublicSchool}
            schools={visiblePublicSchools}
            selectedSchoolId={activePublicSchool?.id}
            onSelectSchool={handleSelectPublicSchool}
            classes={publicAdmClasses}
            sessions={publicAdmSessions}
            isAuthenticated={false}
            onOpenAccount={handleOpenAccountSection}
            onOpenAdmission={() => {
              setShowBootSplash(false);
              setShowPublicWebsite(true);
              navigateToPath('/admission');
            }}
            onOpenVerification={(type, data) => {
              navigateToPath('/verify', {
                searchParams: {
                  ...(type ? { type } : {}),
                  ...(data ? { data } : {}),
                  ...(activePublicSchool?.id ? { school: activePublicSchool.id } : {}),
                },
              });
            }}
          />
        </Suspense>
      </div>
    );
  }

  // Logged-in user browsing Public School Website or Online Admission (/admission)
  if (showPublicWebsite || routePath === '/admission') {
    if (routePath === '/admission') {
      return renderPublicAdmissionShell(true);
    }
    const portalLabel =
      isSchoolAdminRole(user) || isAdminUser(user) || ['TEACHER', 'ACCOUNTANT'].includes((user.role || '').toString().toUpperCase())
        ? 'Switch to ERP Portal'
        : 'Switch to Student Portal';
    return (
      <div className="min-h-screen min-h-[100dvh] w-full flex flex-col bg-[#F8F9FB]">
        <Suspense
          fallback={
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[70vh] bg-slate-950 text-white">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
              <p className="text-sm font-bold">Loading School Website...</p>
            </div>
          }
        >
          <PublicSchoolWebsite
            school={activePublicSchool}
            schools={visiblePublicSchools}
            selectedSchoolId={activePublicSchool?.id}
            onSelectSchool={handleSelectPublicSchool}
            classes={publicAdmClasses}
            sessions={publicAdmSessions}
            isAuthenticated={true}
            portalButtonLabel={portalLabel}
            onSwitchToPortal={() => {
              const isErpRole = Boolean(
                isSchoolAdminRole(user) || isAdminUser(user) || ['TEACHER', 'ACCOUNTANT'].includes((user.role || '').toString().toUpperCase())
              );
              if (isSchoolPortalUser(user)) {
                setView('SCHOOL_ERP');
                try {
                  localStorage.setItem('nst_app_view_mode', 'SCHOOL_ERP');
                } catch {}
              }
              setShowPublicWebsite(false);
              if (!isErpRole) {
                setShowBootSplash(true);
              }
              navigateToPath('/');
            }}
            onOpenAdmission={() => {
              setShowBootSplash(false);
              setShowPublicWebsite(true);
              navigateToPath('/admission');
            }}
            onOpenVerification={(type, data) => {
              navigateToPath('/verify', {
                searchParams: {
                  ...(type ? { type } : {}),
                  ...(data ? { data } : {}),
                  ...(activePublicSchool?.id ? { school: activePublicSchool.id } : {}),
                },
              });
            }}
          />
        </Suspense>
      </div>
    );
  }

  return (
    <>
    <div className={`min-h-screen min-h-[100dvh] w-full flex flex-col ${appBgClass}`}>
      {gmpQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
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
          {view === 'STUDENT' && !isSchoolPortalUser(user) && (
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
              onVisitWebsite={() => handleVisitWebsiteFromPortal(user?.schoolId)}
              onOpenCoaching={() => console.log('Open coaching')}
              isDarkMode={isDarkMode}
              onToggleDarkMode={setIsDarkMode}
              onUpdateUser={handleUpdateUser}
              onUpdateSettings={handleUpdateSettings}
            />
          )}

          {view === 'DRIVER' && (
            <DriverTripConsole
              school={{
                id: user.schoolId || '',
                code: user.schoolCode || '',
                name: user.schoolName || 'School Bus Fleet',
              } as any}
              initialBusId={user.busId || undefined}
              initialBusMeta={
                user.busId || user.busNumber
                  ? {
                      id: user.busId || 'bus_driver',
                      busNumber: user.busNumber || 'School Bus',
                      route: user.busRoute || 'School Bus Route',
                      driverName: user.name || 'Driver',
                      driverPhone: user.mobile || '',
                      stops: Array.isArray(user.busStops) ? user.busStops : undefined,
                    }
                  : undefined
              }
              standaloneMode={true}
              onLogout={handleLogout}
            />
          )}

          {(view === 'SCHOOL_ERP' || (view === 'STUDENT' && isSchoolPortalUser(user))) && (
            <SchoolEcosystem
              uid={user.uid || user.id || 'admin_uid'}
              email={user.email || ''}
              displayName={user.name || (user.role === 'TEACHER' ? 'Teacher' : isSchoolAdminEmail(user.email) || user.role === 'SCHOOL_ADMIN' ? 'Dr. Arvind Swaminathan (School Admin)' : 'Student')}
              isSuperAdmin={Boolean(isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN')}
              userRole={user.role || (isSchoolAdminEmail(user.email) ? 'SCHOOL_ADMIN' : 'STUDENT')}
              user={user}
              defaultSchoolId={user.schoolId || ''}
              forceAdminView={isSchoolAdminEmail(user.email) || user.role === 'SCHOOL_ADMIN' || user.role === 'ADMIN' || user.role === 'SUPERADMIN' || user.role === 'PRINCIPAL'}
              onBack={isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN' ? () => handleSetView('ADMIN') : undefined}
              onOpenAdminDashboard={isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN' ? () => handleSetView('ADMIN') : undefined}
              onOpenPlatformContent={
                isSuperAdminEmail(user.email) || user.role === 'SUPERADMIN'
                  ? (targetClass?: string) => {
                      if (targetClass) {
                        try {
                          localStorage.setItem('nst_active_session_class', targetClass);
                          localStorage.setItem('nst_academic_selected_class', targetClass);
                          localStorage.setItem('nst_syllabus_mode', targetClass === 'COMPETITION' ? 'COMPETITION' : 'SCHOOL');
                        } catch {}
                      }
                      setStudentTab('COURSES');
                      handleSetView('STUDENT');
                    }
                  : undefined
              }
              onVisitWebsite={handleVisitWebsiteFromPortal}
              onOpenPublicAdmission={(sid) => {
                if (sid) handleSelectPublicSchool(sid);
                setShowBootSplash(false);
                setShowPublicWebsite(true);
                navigateToPath('/admission');
              }}
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
                onVisitWebsite={handleVisitWebsiteFromPortal}
                onOpenPublicAdmission={(sid) => {
                  if (sid) handleSelectPublicSchool(sid);
                  setShowBootSplash(false);
                  setShowPublicWebsite(true);
                  navigateToPath('/admission');
                }}
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
    {renderBootSplash()}
    </>
  );
}

export default App;

