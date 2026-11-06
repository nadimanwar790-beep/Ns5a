// @ts-nocheck
import React, { useState, useEffect, lazy, Suspense } from "react";
import {
  getSchoolUserProfile,
  getLocalStudents,
  setLocalStudents,
  getTeachers,
  saveUserLinkedStudents,
  getUserLinkedStudents,
  getLocalUserLinkedStudents,
  getLocalLinkedTeacher,
  setLocalLinkedTeacher,
  getStudentLinkKey,
  findStudentInSchoolRemote,
  getSchool,
  subscribeToAllSchools,
  shouldUseDemoForSchool,
  getLocalSchools,
  getLocalClasses,
  isDemoRecord,
} from "../../school-firebase";
import { getDemoSchoolDataset, isDemoDataEnabled, setDemoDataEnabled } from "./demoDataStore";
import { syncLinkedStudentsToPushSubscription } from "../../utils/schoolPushClient";
import { QrScannerModal } from "../QrScannerModal";
import type { School, SchoolUserProfile } from "../../school-types";
import {
  Loader2,
  ShieldCheck,
  UserCheck,
  GraduationCap,
  ArrowLeft,
  RefreshCw,
  QrCode,
  ScanLine,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  School as SchoolIcon,
  ChevronRight,
  UserPlus,
  Users,
  X,
  Plus,
  Building2,
} from "lucide-react";

// Resilient dynamic import helper with automatic retry & fallback
function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<any>,
  moduleName: string = "Panel"
) {
  return lazy(async () => {
    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const m = await importer();
        const component =
          m?.default ||
          (m as any)?.[moduleName] ||
          (m as any)?.StudentSchoolPanel ||
          (m as any)?.SchoolAdminPanel ||
          (m as any)?.TeacherPanel ||
          (m as any)?.SuperAdminPanel;
        if (component) {
          return { default: component };
        }
        return m;
      } catch (err) {
        lastError = err;
        console.warn(`[lazyWithRetry] Attempt ${attempt + 1}/5 for ${moduleName} failed:`, err);
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    console.error(`[lazyWithRetry] All attempts failed for ${moduleName}:`, lastError);
    const FailureFallback: React.FC<any> = () => (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 text-amber-400">
          ⚠️
        </div>
        <h3 className="text-base font-bold text-white mb-2">Notice: {moduleName} Load Delay</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          The connection was briefly interrupted while loading this section. Tap below to reload.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg cursor-pointer inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Reload Portal
        </button>
      </div>
    );
    return { default: FailureFallback as any };
  });
}

const SuperAdminPanel = lazyWithRetry(() => import("./SuperAdminPanel"), "SuperAdminPanel");
const SchoolAdminPanel = lazyWithRetry(() => import("./SchoolAdminPanel"), "SchoolAdminPanel");
const TeacherPanel = lazyWithRetry(() => import("./TeacherPanel"), "TeacherPanel");
const StudentSchoolPanel = lazyWithRetry(() => import("./StudentSchoolPanel"), "StudentSchoolPanel");
const OnlineAdmissionManager = lazyWithRetry(
  () => import("./OnlineAdmissionManager").then(m => ({ default: m.OnlineAdmissionManager || (m as any).default })),
  "OnlineAdmissionManager"
);

interface PanelErrorBoundaryProps {
  fallbackTitle?: string;
  children: React.ReactNode;
}

interface PanelErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class PanelErrorBoundary extends React.Component<PanelErrorBoundaryProps, PanelErrorBoundaryState> {
  constructor(props: PanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[PanelErrorBoundary] Caught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-4 text-amber-400">
            ⚠️
          </div>
          <h3 className="text-base font-bold text-white mb-2">
            {this.props.fallbackTitle || "Portal Loading Notice"}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            A temporary issue occurred while rendering this portal view. Tap below to retry.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors shadow-lg cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface Props {
  uid: string;
  email: string;
  displayName: string;
  isSuperAdmin: boolean; // true if uid matches global super admin
  defaultSchoolId?: string;
  forceAdminView?: boolean;
  userRole?: string;
  user?: any;
  onBack?: () => void;
  onOpenPlatformContent?: () => void;
  onLogout?: () => void;
  onOpenAdminDashboard?: () => void;
}

const isSuperAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  return (
    clean === "nadimanwar794@gmail.com" ||
    clean === "nadimanwar794@gmsil.com" ||
    clean === "nsdimanwar794@gmail.com" ||
    clean === "nadiman0636indo@gmail.com" ||
    clean === "n44438403@gmail.com" ||
    clean === "fgkfgffhgg@gmail.com" ||
    clean === "ghduug6@gmail.com" ||
    clean.startsWith("nadimanwar794")
  );
};

const isSchoolAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  if (isSuperAdminEmail(clean)) return false;
  return (
    clean === "admin@dps.edu.in" ||
    clean === "dpsgurgaon45@dps.edu.in" ||
    clean === "principal@dps.edu.in"
  );
};

const PanelLoadingFallback = ({ title }: { title: string }) => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100">
    <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center mb-4">
      <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
    </div>
    <h3 className="text-base font-semibold text-slate-100 mb-1">Loading {title}...</h3>
    <p className="text-xs text-slate-400">Synchronizing school data</p>
  </div>
);

export const SchoolEcosystem: React.FC<Props> = ({
  uid,
  email,
  displayName,
  isSuperAdmin,
  defaultSchoolId = "dps_gurgaon_sector45",
  forceAdminView = false,
  userRole = "STUDENT",
  user,
  onBack,
  onOpenPlatformContent,
  onLogout,
  onOpenAdminDashboard
}) => {
  const [profile, setProfile] = useState<SchoolUserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [adminPreviewRole, setAdminPreviewRole] = useState<"ADMIN" | "TEACHER" | "STUDENT">("ADMIN");
  const [demoEnabled, setDemoEnabled] = useState<boolean>(() => isDemoDataEnabled());
  const [allSchools, setAllSchools] = useState<School[]>(() => {
    try {
      const list = getLocalSchools();
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  });
  const [selectedAdminSchoolId, setSelectedAdminSchoolId] = useState<string>("");
  const [showSuperAdminHub, setShowSuperAdminHub] = useState<boolean>(false);

  // Keep demo toggle state in sync across components
  useEffect(() => {
    const handleDemoChange = (e: any) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setDemoEnabled(e.detail.enabled);
      }
    };
    window.addEventListener("nst_demo_toggle_changed", handleDemoChange);
    return () => window.removeEventListener("nst_demo_toggle_changed", handleDemoChange);
  }, []);

  const handleToggleDemo = (newVal: boolean) => {
    setDemoDataEnabled(newVal);
    setDemoEnabled(newVal);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  // QR Modal and Gateway Linker States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrScanMode, setQrScanMode] = useState<"AUTO" | "STUDENT" | "TEACHER">("AUTO");
  const [manualInput, setManualInput] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [showOnlineAdmission, setShowOnlineAdmission] = useState(false);

  const effectiveEmail = (email || user?.email || "").trim().toLowerCase();
  const rawRole = (userRole || user?.role || "").toUpperCase();

  // ── PRECISE ROLE DETECTION ──────────────────────────────────────────────────
  // 1. IS ADMIN CHECK:
  const isExplicitAdmin =
    isSuperAdmin ||
    forceAdminView ||
    rawRole === "ADMIN" ||
    rawRole === "SUPERADMIN" ||
    rawRole === "SCHOOL_ADMIN" ||
    rawRole === "PRINCIPAL" ||
    rawRole === "SCHOOL_SUB_ADMIN" ||
    profile?.role === "SCHOOL_ADMIN" ||
    profile?.role === "SCHOOL_SUB_ADMIN" ||
    profile?.role === "PRINCIPAL" ||
    isSchoolAdminEmail(effectiveEmail) ||
    uid === "admin_uid" ||
    (typeof uid === "string" && uid.toLowerCase().includes("admin") && !uid.toLowerCase().includes("adm-"));

  // 2. IS TEACHER CHECK:
  const isTeacherRole =
    !isExplicitAdmin &&
    (rawRole === "TEACHER" ||
    rawRole === "STAFF" ||
    profile?.role === "TEACHER" ||
    profile?.role === "STAFF" ||
    user?.provider === "qr_teacher_id");

  // Helper to sanitize a linked student record
  const sanitizeStudentLink = (rec: any) => {
    if (!rec) return null;
    const copy = { ...rec, type: "STUDENT" };
    if (copy.admissionNo && (copy.admissionNo.startsWith("NSTA-") || copy.admissionNo.includes(":"))) {
      copy.admissionNo = copy.id ? `ADM-${String(copy.id).slice(-6).toUpperCase()}` : `ADM-ROLL-${copy.rollNo || "01"}`;
    }
    if (copy.className && (copy.className === copy.rollNo || /^0\d+$/.test(String(copy.className).trim()))) {
      delete copy.className;
    }
    return copy;
  };

  // URL Deep-Link params from Lock Screen Push Notifications (?studentId=...&schoolTab=fees|notices|homework|exams)
  const [requestedTab, setRequestedTab] = useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("schoolTab") || undefined;
  });

  const [studentActiveTab, setStudentActiveTab] = useState<string>("overview");

  // 3. PERSISTENT MULTI-STUDENT LINKED LIST + TEACHER ENTITY
  const [linkedStudents, setLinkedStudents] = useState<any[]>(() => {
    if (user?.provider === "qr_student_id") {
      const cleanClsName =
        user.className && user.className !== user.rollNo && !/^0\d+$/.test(String(user.className).trim())
          ? user.className
          : undefined;
      const qrSingle = sanitizeStudentLink({
        type: "STUDENT",
        id: user.id || user.uid,
        name: user.name || "Student",
        classId: user.classId || user.classLevel || "cls_nursery",
        className: cleanClsName,
        rollNo: user.rollNo || "01",
        admissionNo:
          user.admissionNo && !user.admissionNo.startsWith("NSTA-") && !user.admissionNo.includes(":")
            ? user.admissionNo
            : `ADM-${String(user.id || user.uid || "26").slice(-6).toUpperCase()}`,
        fatherName: user.fatherName || "",
        motherName: user.motherName || "",
        bloodGroup: user.bloodGroup || "",
        dateOfBirth: user.dateOfBirth || "",
        address: user.address || "",
        phone: user.mobile || user.phone || "",
        monthlyFee: user.monthlyFee,
        schoolId: user.schoolId || defaultSchoolId,
        schoolName: user.schoolName || "",
      });
      return qrSingle ? [qrSingle] : [];
    }
    try {
      const localBundle = getLocalUserLinkedStudents(uid);
      if (localBundle && Array.isArray(localBundle.students) && localBundle.students.length > 0) {
        return localBundle.students.map(sanitizeStudentLink).filter(Boolean);
      }
    } catch {}
    return [];
  });

  const [activeStudentKey, setActiveStudentKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const urlStudentId = sp.get("studentId");
      const urlSchoolId = sp.get("schoolId");
      if (urlStudentId && urlSchoolId) return `${urlSchoolId}__${urlStudentId}`;
      if (urlStudentId) return urlStudentId;
    }
    try {
      const localBundle = getLocalUserLinkedStudents(uid);
      if (localBundle) {
        if (localBundle.activeStudentKey) return localBundle.activeStudentKey;
        if (localBundle.activeStudentId) return localBundle.activeStudentId;
        if (localBundle.students?.[0]) return getStudentLinkKey(localBundle.students[0], defaultSchoolId);
      }
    } catch {}
    return user?.id || user?.uid || "";
  });

  const [linkedTeacher, setLinkedTeacher] = useState<any>(() => {
    if (user?.provider === "qr_teacher_id") {
      return {
        type: "TEACHER",
        id: user.id || user.uid,
        name: user.name || "Teacher",
        schoolId: user.schoolId || defaultSchoolId,
      };
    }
    try {
      const saved = getLocalLinkedTeacher(uid);
      if (saved) return saved;
    } catch {}
    return null;
  });

  // Re-sync from IndexedDB if IndexedDB finishes hydrating after initial mount
  useEffect(() => {
    if (typeof window === "undefined" || !uid) return;
    const handleIdbHydrated = () => {
      if (user?.provider !== "qr_student_id") {
        const localBundle = getLocalUserLinkedStudents(uid);
        if (localBundle && Array.isArray(localBundle.students) && localBundle.students.length > 0) {
          const cleaned = localBundle.students.map(sanitizeStudentLink).filter(Boolean);
          setLinkedStudents((prev) => (prev.length === 0 ? cleaned : prev));
          setActiveStudentKey((cur) =>
            cur || localBundle.activeStudentKey || localBundle.activeStudentId || getStudentLinkKey(cleaned[0], defaultSchoolId)
          );
        }
      }
      if (user?.provider !== "qr_teacher_id") {
        const savedTeacher = getLocalLinkedTeacher(uid);
        if (savedTeacher) {
          setLinkedTeacher((prev: any) => prev || savedTeacher);
        }
      }
    };
    window.addEventListener("school-idb-hydrated", handleIdbHydrated);
    return () => window.removeEventListener("school-idb-hydrated", handleIdbHydrated);
  }, [uid, defaultSchoolId]);

  // Active student derived from multi-school + multi-student composite key
  const linkedEntity =
    linkedTeacher ||
    linkedStudents.find((s) => getStudentLinkKey(s, defaultSchoolId) === activeStudentKey) ||
    linkedStudents.find((s) => s.id === activeStudentKey) ||
    linkedStudents[0] ||
    null;

  // Hydrate permanently linked students from Firebase whenever user logs in with their User ID!
  useEffect(() => {
    if (!uid || isExplicitAdmin || isTeacherRole || user?.provider === "qr_teacher_id") return;
    let mounted = true;
    getUserLinkedStudents(uid)
      .then((bundle) => {
        if (!mounted || !bundle || !Array.isArray(bundle.students) || bundle.students.length === 0) return;
        const cleanedRemote = bundle.students.map(sanitizeStudentLink).filter(Boolean);
        setLinkedStudents((prev) => {
          const mergedMap = new Map<string, any>();
          cleanedRemote.forEach((s: any) => mergedMap.set(getStudentLinkKey(s, defaultSchoolId), s));
          prev.forEach((s: any) => {
            const k = getStudentLinkKey(s, defaultSchoolId);
            if (!mergedMap.has(k)) mergedMap.set(k, s);
          });
          return Array.from(mergedMap.values());
        });
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          const urlSid = sp.get("studentId");
          const urlSchId = sp.get("schoolId");
          if (urlSid) {
            const foundUrl = cleanedRemote.find(
              (s: any) => s.id === urlSid && (!urlSchId || s.schoolId === urlSchId)
            );
            if (foundUrl) {
              setActiveStudentKey(getStudentLinkKey(foundUrl, defaultSchoolId));
              return;
            }
          } else if (urlSchId) {
            const foundBySchool = cleanedRemote.find((s: any) => s.schoolId === urlSchId);
            if (foundBySchool) {
              setActiveStudentKey(getStudentLinkKey(foundBySchool, defaultSchoolId));
            }
          }
        }
        if (bundle.activeStudentKey || bundle.activeStudentId) {
          setActiveStudentKey((cur) => cur || bundle.activeStudentKey || bundle.activeStudentId || getStudentLinkKey(cleanedRemote[0], defaultSchoolId));
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [uid, isExplicitAdmin, isTeacherRole]);

  // Listen for ServiceWorker Lock Screen notification click navigation while app is open
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const handleSwMsg = (event: MessageEvent) => {
      const data = event.data;
      if (data?.type === "SCHOOL_PUSH_NAVIGATE") {
        if (data.studentId && data.schoolId) {
          setActiveStudentKey(`${data.schoolId}__${data.studentId}`);
        } else if (data.studentId) {
          setActiveStudentKey(data.studentId);
        } else if (data.schoolId) {
          const matchBySchool = linkedStudents.find((s) => s.schoolId === data.schoolId);
          if (matchBySchool) setActiveStudentKey(getStudentLinkKey(matchBySchool, defaultSchoolId));
        }
        if (typeof data.url === "string" && data.url.includes("schoolTab=")) {
          try {
            const u = new URL(data.url, window.location.origin);
            const t = u.searchParams.get("schoolTab");
            if (t) setRequestedTab(t);
          } catch {}
        } else if (data.notifType === "MONTHLY_FEE" || data.notifType === "FEE_RECEIPT") {
          setRequestedTab("fees");
        } else if (data.notifType === "SCHOOL_NOTICE" || data.notifType === "SCHOOL_HOLIDAY") {
          setRequestedTab("community");
        }
      }
    };
    navigator.serviceWorker.addEventListener("message", handleSwMsg);
    return () => navigator.serviceWorker.removeEventListener("message", handleSwMsg);
  }, [linkedStudents]);

  const isRealSchoolAdmin = isExplicitAdmin;
  const isRealTeacher = isTeacherRole || linkedEntity?.type === "TEACHER";
  const isRealStudent = !isExplicitAdmin && !isRealTeacher && !!linkedEntity;

  const canManageMultiSchools =
    Boolean(forceAdminView || isSuperAdmin || rawRole === "ADMIN" || rawRole === "SUPERADMIN" || uid === "admin_uid");

  useEffect(() => {
    const unsub = subscribeToAllSchools((list) => {
      const arr = Array.isArray(list) ? list : [];
      if (arr.length > 0) {
        setAllSchools(arr);
      } else {
        const local = getLocalSchools();
        if (local.length > 0) setAllSchools(local);
      }
    });
    return () => unsub();
  }, []);

  const fetchProfile = () => {
    if (isSuperAdmin || user?.provider === "qr_teacher_id") {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSchoolUserProfile(uid, effectiveEmail)
      .then(p => {
        setProfile(p);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchProfile();
  }, [uid, isSuperAdmin, effectiveEmail]);

  const effectiveSchoolId =
    (isExplicitAdmin && selectedAdminSchoolId)
      ? selectedAdminSchoolId
      : (linkedEntity?.schoolId || profile?.schoolId || user?.schoolId || defaultSchoolId || "dps_gurgaon_sector45");

  // ── QR SCAN & MANUAL INPUT HANDLER ──────────────────────────────────────────
  const handleLinkSuccess = (decodedRaw: string, targetType: "AUTO" | "STUDENT" | "TEACHER" = "AUTO") => {
    setLinkError(null);
    const raw = (decodedRaw || "").trim();
    if (!raw) return;

    try {
      // 1. Staff / Teacher Detection
      const isExplicitTeacher = targetType === "TEACHER";
      const hasTeacherQrPrefix =
        raw.startsWith("NSTA-SCHOOL-STAFF:") ||
        raw.includes("NSTA-SCHOOL-STAFF:") ||
        raw.startsWith("STAFF:") ||
        raw.startsWith("TEACHER:") ||
        raw.includes("TEACHER") ||
        raw.toUpperCase().startsWith("TEA-") ||
        raw.toUpperCase().startsWith("EMP-");

      // Check whether entered text / code matches an existing teacher in cache
      let matchedTeacher: any = null;
      if (
        !hasTeacherQrPrefix &&
        targetType !== "STUDENT" &&
        !raw.startsWith("NSTA-SCHOOL:") &&
        !raw.startsWith("DPS-RECEIPT") &&
        !raw.includes("AdmNo:")
      ) {
        const qClean = raw.toLowerCase().trim();
        const cleanDigits = qClean.replace(/\D/g, "");
        try {
          const cachedT: any[] = JSON.parse(localStorage.getItem(`nst_school_teachers_${effectiveSchoolId}`) || "[]");
          const cachedS: any[] = JSON.parse(localStorage.getItem(`nst_school_staff_${effectiveSchoolId}`) || "[]");
          const pool = [...cachedT, ...cachedS];
          matchedTeacher = pool.find((t: any) => {
            if (!t) return false;
            const tPhone = (t.phone || "").replace(/\D/g, "");
            return (
              (t.id && t.id.toLowerCase() === qClean) ||
              (t.employeeId && t.employeeId.toLowerCase() === qClean) ||
              (t.name && t.name.toLowerCase() === qClean) ||
              (cleanDigits.length >= 10 && tPhone && (tPhone === cleanDigits || tPhone.endsWith(cleanDigits.slice(-10))))
            );
          });
        } catch {}
      }

      if (isExplicitTeacher || hasTeacherQrPrefix || matchedTeacher) {
        let teacherId = matchedTeacher?.id || `staff_${Date.now()}`;
        let teacherName = matchedTeacher?.name || "Teacher";
        let schId = matchedTeacher?.schoolId || effectiveSchoolId;

        if (raw.startsWith("NSTA-SCHOOL-STAFF:") || raw.includes("NSTA-SCHOOL-STAFF:")) {
          const token = raw.includes("NSTA-SCHOOL-STAFF:") ? raw.split("NSTA-SCHOOL-STAFF:")[1] : raw;
          const clean = token.split("\n")[0].split("\r")[0];
          const parts = clean.split(":").map(decodeURIComponent);
          if (parts[0]) schId = parts[0];
          if (parts[1]) teacherId = parts[1];
          if (parts[4]) teacherName = parts[4];
          else if (parts[2]) teacherName = parts[2];
        } else if (raw.includes(":") && !raw.startsWith("DPS-RECEIPT")) {
          const parts = raw.split(":").map(decodeURIComponent);
          if (parts[1]) schId = parts[1];
          if (parts[2]) teacherId = parts[2];
          if (parts[4]) teacherName = parts[4];
          else if (parts[3]) teacherName = parts[3];
        } else if (matchedTeacher) {
          teacherId = matchedTeacher.id;
          teacherName = matchedTeacher.name;
          if (matchedTeacher.schoolId) schId = matchedTeacher.schoolId;
        } else {
          // Manual input: Mobile number, Emp ID, or Teacher Name
          const qClean = raw.toLowerCase().trim();
          const cleanDigits = qClean.replace(/\D/g, "");
          try {
            const cachedT: any[] = JSON.parse(localStorage.getItem(`nst_school_teachers_${schId}`) || "[]");
            const cachedS: any[] = JSON.parse(localStorage.getItem(`nst_school_staff_${schId}`) || "[]");
            const pool = [...cachedT, ...cachedS];
            const found = pool.find((t: any) => {
              if (!t) return false;
              const tPhone = (t.phone || "").replace(/\D/g, "");
              return (
                (t.id && t.id.toLowerCase() === qClean) ||
                (t.employeeId && t.employeeId.toLowerCase() === qClean) ||
                (t.name && t.name.toLowerCase() === qClean) ||
                (cleanDigits.length >= 10 && tPhone && (tPhone === cleanDigits || tPhone.endsWith(cleanDigits.slice(-10))))
              );
            });
            if (found) {
              teacherId = found.id;
              teacherName = found.name;
              if (found.schoolId) schId = found.schoolId;
            }
          } catch {}
        }

        const teacherRecord = {
          type: "TEACHER",
          id: teacherId,
          name: teacherName,
          schoolId: schId,
          linkedAt: new Date().toISOString(),
        };

        setLocalLinkedTeacher(uid, teacherRecord);
        setLinkedTeacher(teacherRecord);
        setIsQrModalOpen(false);
        return;
      }

      // 2. Student Detection (ID Card QR, DPS-RECEIPT, or Admission No)
      let studentId = "";
      let studentName = "";
      let admNo = "";
      let rollNo = "01";
      let classId = "";
      let extractedClassName = "";
      let schId = effectiveSchoolId;
      let extractedSchoolName = "";
      let extractedPhone = "";
      let extractedFather = "";
      let extractedMother = "";
      let extractedBlood = "";
      let extractedDob = "";
      let extractedAddress = "";
      let extractedFee: number | undefined = undefined;

      if (raw.startsWith("NSTA-SCHOOL") || raw.includes("NSTA-SCHOOL")) {
        const token = raw.includes("NSTA-SCHOOL:") ? raw.split("NSTA-SCHOOL:")[1] : raw;
        const clean = token.split("\n")[0].split("\r")[0];
        const parts = clean.split(":").map(decodeURIComponent);
        if (parts[0]) schId = parts[0];
        if (parts[1]) studentId = parts[1];
        if (parts[2]) rollNo = parts[2];
        if (parts[3]) classId = parts[3];
        if (parts[4]) studentName = parts[4];
        if (parts[5] && !parts[5].startsWith("NSTA-") && !parts[5].includes(":")) admNo = parts[5];
        if (parts[6]) extractedPhone = parts[6];

        if (parts.length >= 14) {
          extractedFather = parts[7] || "";
          extractedMother = parts[8] || "";
          extractedBlood = parts[9] || "";
          extractedDob = parts[10] || "";
          extractedAddress = parts[11] || "";
          if (parts[12] && !isNaN(Number(parts[12])) && Number(parts[12]) > 0) {
            extractedFee = Number(parts[12]);
          }
          extractedClassName = (parts[13] || "").trim();
          extractedSchoolName = (parts[14] || "").trim();
        } else {
          // Legacy shorter QR format fallback — NEVER inspect parts[0..2] (schoolId, studentId, rollNo)
          for (let i = 3; i < parts.length; i++) {
            if (i === 4 || i === 5 || i === 6) continue;
            const p = parts[i]?.trim();
            if (!p) continue;
            if (/^Class\s*\d+/i.test(p) || /^(Nursery|LKG|UKG|KG|Play|Prep)/i.test(p) || /^\d+(st|nd|rd|th)(\s*[A-Z])?$/i.test(p)) {
              extractedClassName = p;
              break;
            }
          }
          if (parts[9] && !isNaN(Number(parts[9])) && Number(parts[9]) > 0) {
            extractedFee = Number(parts[9]);
          }
          const lastPart = parts[parts.length - 1]?.trim();
          if (lastPart && lastPart.length >= 3 && isNaN(Number(lastPart)) && lastPart !== extractedClassName) {
            extractedSchoolName = lastPart;
          }
        }
      } else if (raw.includes("AdmNo:") || raw.includes("ReceiptNo:") || raw.startsWith("DPS-RECEIPT")) {
        const lines = raw.split(/\r?\n/);
        const map: Record<string, string> = {};
        lines.forEach(l => {
          const idx = l.indexOf(":");
          if (idx !== -1) map[l.slice(0, idx).trim().toLowerCase()] = l.slice(idx + 1).trim();
        });
        if (map["schoolid"]) schId = map["schoolid"];
        if (map["school"] || map["schoolname"]) extractedSchoolName = map["school"] || map["schoolname"] || "";
        admNo = map["admno"] || map["admissionno"] || "";
        studentName = map["student"] || "Student";
        classId = map["classid"] || map["class"] || "";
        extractedClassName = map["class"] || "";
        studentId = map["studentid"] || (admNo ? `std_${admNo.replace(/[^a-zA-Z0-9]/g, "_")}` : `std_${Date.now()}`);
      } else {
        // Plain text admission no or roll no entered manually
        admNo = raw;
        studentId = `std_${raw.replace(/[^a-zA-Z0-9]/g, "_")}`;
        studentName = "Student";
      }

      // Enrich with authentic student data STRICTLY scoped to schId (never leak data across schools!)
      const localStudents = getLocalStudents(schId).filter(s => !s.schoolId || s.schoolId === schId);
      const demoStudents = shouldUseDemoForSchool(schId)
        ? (getDemoSchoolDataset()?.students || [])
        : [];
      const allKnown = [...localStudents, ...demoStudents];
      const found =
        (studentId ? allKnown.find(s => s.id === studentId && (!s.schoolId || s.schoolId === schId)) : undefined) ||
        (admNo ? allKnown.find(s => s.admissionNo && s.admissionNo.toLowerCase() === admNo.toLowerCase() && (!s.schoolId || s.schoolId === schId)) : undefined) ||
        (!studentId && !admNo
          ? allKnown.find(s =>
              (raw && s.admissionNo && s.admissionNo.toLowerCase() === raw.toLowerCase()) ||
              (raw && s.rollNo && s.rollNo === raw) ||
              (studentName && s.name && s.name.toLowerCase() === studentName.toLowerCase())
            )
          : undefined);

      const cleanAdmNo =
        (admNo && !admNo.startsWith("NSTA-") && !admNo.includes(":") ? admNo : "") ||
        found?.admissionNo ||
        `ADM-${(studentId || "26").slice(-6).toUpperCase()}`;

      const safeFoundClassName =
        (found as any)?.className &&
        (found as any).className !== found?.rollNo &&
        !/^0\d+$/.test(String((found as any).className).trim())
          ? (found as any).className
          : "";

      const resolvedSchoolId = found?.schoolId || schId;
      const finalRecord = {
        type: "STUDENT",
        id: found?.id || studentId || `std_${Date.now()}`,
        name: studentName || found?.name || "Student",
        admissionNo: cleanAdmNo,
        rollNo: rollNo || found?.rollNo || "01",
        classId: classId || found?.classId || "cls_nursery",
        className: extractedClassName || safeFoundClassName || undefined,
        fatherName: extractedFather || found?.fatherName || "",
        motherName: extractedMother || found?.motherName || "",
        bloodGroup: extractedBlood || found?.bloodGroup || "",
        dateOfBirth: extractedDob || found?.dateOfBirth || "",
        address: extractedAddress || found?.address || "",
        phone: extractedPhone || found?.phone || "",
        monthlyFee: found?.monthlyFee ?? extractedFee,
        photoUrl: found?.photoUrl || "",
        schoolId: resolvedSchoolId,
        schoolName: extractedSchoolName || (found as any)?.schoolName || "",
        linkedAt: new Date().toISOString()
      };

      const recordCompositeKey = getStudentLinkKey(finalRecord, resolvedSchoolId);

      // Register into THAT school's isolated IndexedDB students cache without clobbering existing live database fields
      try {
        const curLocals = getLocalStudents(resolvedSchoolId);
        const existingLocal = curLocals.find(s => s.id === finalRecord.id || (s.admissionNo && s.admissionNo === finalRecord.admissionNo));
        const mergedStudent = {
          ...(existingLocal || {}),
          ...finalRecord,
          className: extractedClassName || safeFoundClassName || (existingLocal as any)?.className,
          monthlyFee: existingLocal?.monthlyFee ?? finalRecord.monthlyFee,
        };
        const updatedLocals = [mergedStudent, ...curLocals.filter(s => s.id !== mergedStudent.id)];
        setLocalStudents(resolvedSchoolId, updatedLocals as any);
      } catch {}

      // Append or update in multi-school + multi-student list using strict composite key (schoolId__studentId)
      setLinkedStudents((prev) => {
        const filtered = prev.filter((item) => {
          const itemSchool = item.schoolId || defaultSchoolId;
          if (itemSchool !== resolvedSchoolId) return true; // NEVER collide across different schools!
          if (item.id === finalRecord.id) return false;
          if (item.admissionNo && finalRecord.admissionNo && item.admissionNo.toLowerCase() === finalRecord.admissionNo.toLowerCase()) {
            return false;
          }
          return true;
        });
        const updatedList = [...filtered, finalRecord];
        void saveUserLinkedStudents(uid, updatedList, recordCompositeKey);
        void syncLinkedStudentsToPushSubscription(uid, updatedList);
        return updatedList;
      });
      setActiveStudentKey(recordCompositeKey);
      setIsQrModalOpen(false);

      if (finalRecord.schoolName) {
        localStorage.setItem('nst_last_school_name', finalRecord.schoolName);
      }
      try {
        window.dispatchEvent(new CustomEvent('user-signed-up-prompt-notifications'));
      } catch {}

      // Live Remote Enrichment from Firebase (if scanned on a fresh phone with empty local cache)
      void Promise.all([
        findStudentInSchoolRemote(resolvedSchoolId, finalRecord.id, finalRecord.admissionNo),
        !finalRecord.schoolName ? getSchool(resolvedSchoolId) : Promise.resolve(null),
      ]).then(([remoteSt, remoteSch]) => {
        if (!remoteSt && !remoteSch) return;
        setLinkedStudents((prev) => {
          const enrichedList = prev.map((item) => {
            if (getStudentLinkKey(item, defaultSchoolId) !== recordCompositeKey) return item;
            return {
              ...item,
              ...(remoteSt || {}),
              id: remoteSt?.id || item.id,
              schoolId: resolvedSchoolId,
              schoolName: item.schoolName || remoteSch?.name || (remoteSt as any)?.schoolName || "",
              className: item.className || (remoteSt as any)?.className,
              monthlyFee: remoteSt?.monthlyFee ?? item.monthlyFee,
            };
          });
          void saveUserLinkedStudents(uid, enrichedList, recordCompositeKey);
          void syncLinkedStudentsToPushSubscription(uid, enrichedList);
          return enrichedList;
        });
      }).catch(() => {});
    } catch (err: any) {
      setLinkError("QR code decode nahi ho saka. Sahi QR image chunein ya Admission No dalein.");
    }
  };

  const handleSelectLinkedStudent = (studentKeyToActivate: string) => {
    setActiveStudentKey(studentKeyToActivate);
    void saveUserLinkedStudents(uid, linkedStudents, studentKeyToActivate);
  };

  const handleRemoveLinkedStudent = (studentKeyToRemove: string) => {
    setLinkedStudents((prev) => {
      const remaining = prev.filter((s) => getStudentLinkKey(s, defaultSchoolId) !== studentKeyToRemove);
      const nextActive = remaining[0] ? getStudentLinkKey(remaining[0], defaultSchoolId) : "";
      setActiveStudentKey(nextActive);
      void saveUserLinkedStudents(uid, remaining, nextActive);
      void syncLinkedStudentsToPushSubscription(uid, remaining);
      return remaining;
    });
  };

  const handleUnlinkTeacher = () => {
    setLocalLinkedTeacher(uid, null);
    setLinkedTeacher(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm font-medium">Verifying school credentials...</p>
        </div>
      </div>
    );
  }

  // 1. SUPER ADMIN ACCESS ONLY (or when Platform Owner opens Multi-School Hub)
  const isSuperAdminUser = isSuperAdmin || rawRole === "SUPERADMIN" || isSuperAdminEmail(effectiveEmail);
  if (isSuperAdminUser || (canManageMultiSchools && showSuperAdminHub)) {
    return (
      <PanelErrorBoundary fallbackTitle="Super Admin Panel">
        <Suspense fallback={<PanelLoadingFallback title="Super Admin Panel" />}>
          <SuperAdminPanel
            adminUid={uid}
            onBack={showSuperAdminHub ? () => setShowSuperAdminHub(false) : (onOpenAdminDashboard || onBack)}
          />
        </Suspense>
      </PanelErrorBoundary>
    );
  }

  // 2. SCHOOL ADMIN / PRINCIPAL ACCESS (TOP PRIORITY FOR ADMIN LOGINS)
  if (isRealSchoolAdmin) {
    if (adminPreviewRole === "STUDENT") {
      return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <div className="sticky top-0 z-50 px-4 py-2 bg-indigo-950/90 border-b border-indigo-700/50 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
              <GraduationCap className="w-4 h-4 text-indigo-400" />
              <span>Admin Preview Mode: Student View</span>
            </div>
            <button
              onClick={() => setAdminPreviewRole("ADMIN")}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Back to School Admin ERP
            </button>
          </div>
          <PanelErrorBoundary fallbackTitle="Student Portal (Preview)">
            <Suspense fallback={<PanelLoadingFallback title="Student Portal" />}>
              <StudentSchoolPanel
                schoolId={effectiveSchoolId}
                studentId={profile?.studentRef || user?.studentId || uid}
                studentName={profile?.name || user?.name || displayName}
                classId={profile?.classId || user?.classLevel || "cls_10"}
                sessionId={profile?.sessionId || "2026-27"}
                onOpenPlatformContent={onOpenPlatformContent}
                onBack={() => setAdminPreviewRole("ADMIN")}
              />
            </Suspense>
          </PanelErrorBoundary>
        </div>
      );
    }

    if (adminPreviewRole === "TEACHER") {
      return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
          <div className="sticky top-0 z-50 px-4 py-2 bg-purple-950/90 border-b border-purple-700/50 backdrop-blur-md flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Admin Preview Mode: Teacher View</span>
            </div>
            <button
              onClick={() => setAdminPreviewRole("ADMIN")}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Back to School Admin ERP
            </button>
          </div>
          <PanelErrorBoundary fallbackTitle="Teacher Portal (Preview)">
            <Suspense fallback={<PanelLoadingFallback title="Teacher Portal" />}>
              <TeacherPanel
                schoolId={effectiveSchoolId}
                teacherId={profile?.teacherRef || uid}
                teacherName={profile?.name || user?.name || displayName}
                onBack={() => setAdminPreviewRole("ADMIN")}
              />
            </Suspense>
          </PanelErrorBoundary>
        </div>
      );
    }

    // Default: Render SchoolAdminPanel with multi-school switcher & preview switchers
    const isDefaultDemoSchool = effectiveSchoolId === "dps_gurgaon_sector45" || effectiveSchoolId === "demo_school";
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        {/* Top Multi-School Switcher Bar - only shown if multi-schools available */}
        {canManageMultiSchools && (
          <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold flex-wrap">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Multi-School Hub</span>
              <div className="flex items-center gap-1.5 ml-1">
                {allSchools.length > 0 && (
                  <div className="inline-flex items-center gap-1 bg-slate-950 border border-emerald-600/40 rounded-lg px-2 py-1">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <select
                      value={effectiveSchoolId}
                      onChange={(e) => setSelectedAdminSchoolId(e.target.value)}
                      className="bg-transparent text-emerald-200 font-bold text-[11px] focus:outline-none cursor-pointer max-w-[190px] truncate"
                      title="Active School badlein (Multi-School Switcher)"
                    >
                      {!allSchools.some((s) => s.id === effectiveSchoolId) && (
                        <option value={effectiveSchoolId} className="bg-slate-900 text-white">
                          {effectiveSchoolId === "dps_gurgaon_sector45" ? "Default School (DPS)" : effectiveSchoolId}
                        </option>
                      )}
                      {allSchools.map((sch) => (
                        <option key={sch.id} value={sch.id} className="bg-slate-900 text-white">
                          {sch.name} {sch.code ? `(${sch.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowSuperAdminHub(true)}
                  className="px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50 text-blue-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                  title="Naya School add karein ya sabhi schools manage karein"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-300" />
                  <span>Add / All Schools ({Math.max(1, allSchools.length)})</span>
                </button>
              </div>
            </div>
            {onOpenAdminDashboard && isSuperAdmin && (
              <button
                type="button"
                onClick={onOpenAdminDashboard}
                className="px-3 py-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-lg font-bold text-[11px] transition-all shadow-md shadow-indigo-900/40 flex items-center gap-1.5 cursor-pointer border border-indigo-400/40 hover:scale-105 active:scale-95 ml-1"
                title="NSTA Main App Admin Dashboard (Notes, MCQs, Books, Users, System Settings) par jayein"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>NSTA App Admin</span>
              </button>
            )}
          </div>
        )}

        <PanelErrorBoundary fallbackTitle="School Admin ERP">
          <Suspense fallback={<PanelLoadingFallback title="School Admin ERP" />}>
            <SchoolAdminPanel
              key={effectiveSchoolId}
              schoolId={effectiveSchoolId}
              adminUid={uid}
              onBack={isSuperAdmin ? (onOpenAdminDashboard || onBack) : undefined}
              onOpenPlatformContent={onOpenPlatformContent}
              onLogout={onLogout}
              onPreviewTeacher={() => setAdminPreviewRole("TEACHER")}
              onPreviewStudent={() => setAdminPreviewRole("STUDENT")}
            />
          </Suspense>
        </PanelErrorBoundary>
      </div>
    );
  }

  // ── 2.5 ONLINE ADMISSION VIEW (FOR NEW APPLICANTS) ──
  if (showOnlineAdmission) {
    const demoData = getDemoSchoolDataset();
    const currentSchool =
      allSchools.find((s) => s.id === effectiveSchoolId) ||
      getLocalSchools().find((s) => s.id === effectiveSchoolId) ||
      allSchools[0] ||
      getLocalSchools()[0] ||
      demoData?.school || { id: effectiveSchoolId, name: "School" };

    const schoolClasses = getLocalClasses(currentSchool.id);
    const realClasses = schoolClasses.filter((c: any) => !isDemoRecord(c));
    const activeClasses = realClasses.length > 0
      ? realClasses
      : (shouldUseDemoForSchool(currentSchool.id) ? (schoolClasses.length > 0 ? schoolClasses : (demoData?.classes || [])) : []);

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Suspense fallback={<PanelLoadingFallback title="Online Admission Form" />}>
          <OnlineAdmissionManager
            school={currentSchool as any}
            classes={activeClasses}
            sessions={demoData?.sessions || []}
            activeSession={demoData?.sessions?.[0] || null}
            isAdmin={false}
            onBack={() => setShowOnlineAdmission(false)}
          />
        </Suspense>
      </div>
    );
  }

  // ── 3. IF NON-ADMIN USER HAS NOT LINKED AN ID CARD YET: SHOW SCAN/CONNECT GATEWAY ──
  if (!linkedEntity) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to App</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <SchoolIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="font-bold text-sm text-slate-200">School ERP Portal</span>
          </div>
          {onLogout ? (
            <button
              onClick={onLogout}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
            >
              Logout
            </button>
          ) : <div className="w-10" />}
        </div>

        {/* Content Container */}
        <div className="flex-1 max-w-lg w-full mx-auto p-5 flex flex-col justify-center space-y-6 animate-in fade-in">
          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500/20 via-indigo-500/20 to-violet-500/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <QrCode className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              School ID Card से जुड़ें
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              अपना Live Student या Teacher Dashboard देखने के लिए अपना ID Card या फीस रसीद QR कोड स्कैन करें।
            </p>
          </div>

          {linkError && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{linkError}</span>
            </div>
          )}

          {/* Action Cards */}
          <div className="space-y-3">
            {/* Unified Scan ID Card / Fees QR Button for Both Student & Teacher */}
            <button
              onClick={() => {
                setQrScanMode("AUTO");
                setIsQrModalOpen(true);
              }}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 border border-emerald-500/50 hover:border-emerald-400 hover:bg-slate-900/90 transition-all text-left flex items-center justify-between group shadow-xl cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 to-indigo-500/25 border border-emerald-400/40 flex items-center justify-center group-hover:scale-105 transition-transform shadow-inner">
                  <QrCode className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Scan Student / Teacher ID Card
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    ID Card, फीस रसीद या Teacher Card का QR कोड कैमरा से स्कैन करें
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* Apply for Online Admission */}
            <button
              type="button"
              onClick={() => setShowOnlineAdmission(true)}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-orange-950/30 border border-amber-600/40 hover:border-amber-400 hover:bg-slate-900/90 transition-all text-left flex items-center justify-between group shadow-lg cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform text-amber-400">
                  <UserPlus className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                    Apply for Online Admission
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      New
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    नया दाखिला / ऑनलाइन एडमिशन फॉर्म भरें व रसीद पाएं
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
            </button>

            {/* Manual Roll No / Employee ID / Mobile Input Fallback */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-bold flex items-center gap-1.5 text-slate-300">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  कैमरा काम न करे तो ID या मोबाइल नंबर से जुड़ें
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && manualInput.trim()) {
                      handleLinkSuccess(manualInput.trim(), "AUTO");
                    }
                  }}
                  placeholder="Mobile / Teacher ID / Roll No / Admission No"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!manualInput.trim()) return;
                    handleLinkSuccess(manualInput.trim(), "AUTO");
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer active:scale-95 shrink-0"
                >
                  जुड़ें
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* QR Scanner Modal */}
        <QrScannerModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          mode="LOGIN"
          onScanSuccess={(decodedText) => handleLinkSuccess(decodedText, qrScanMode)}
          title={
            qrScanMode === "TEACHER"
              ? "Scan Teacher / Staff Card"
              : qrScanMode === "STUDENT"
              ? "Scan Student ID Card"
              : "Scan Student / Teacher ID Card"
          }
        />
      </div>
    );
  }

  // ── 4. TEACHER PANEL (FOR LINKED TEACHERS) ──
  if (isRealTeacher) {
    const handleTeacherExit = () => {
      handleUnlinkTeacher();
      if (onLogout) onLogout();
      else if (onBack) onBack();
    };

    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <PanelErrorBoundary fallbackTitle="Teacher Portal">
          <Suspense fallback={<PanelLoadingFallback title="Teacher Portal" />}>
            <TeacherPanel
              schoolId={effectiveSchoolId}
              teacherId={linkedEntity?.id || profile?.teacherRef || uid}
              teacherName={linkedEntity?.name || profile?.name || user?.name || displayName}
              onLogout={handleTeacherExit}
            />
          </Suspense>
        </PanelErrorBoundary>
      </div>
    );
  }

  // ── 5. STUDENT PANEL (PERMANENT MULTI-STUDENT FAMILY MODE) ──
  // IMPORTANT: Logging out keeps linkedStudents bound to this User ID in Firebase so next login opens them automatically!
  const handleStudentExit = () => {
    if (onLogout) onLogout();
    else if (onBack) onBack();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <PanelErrorBoundary fallbackTitle="Student Portal">
        <Suspense fallback={<PanelLoadingFallback title="Student Portal" />}>
          <StudentSchoolPanel
            key={getStudentLinkKey(linkedEntity, defaultSchoolId) || "active-student"}
            uid={uid}
            schoolId={linkedEntity?.schoolId || effectiveSchoolId}
            studentId={linkedEntity?.id || user?.studentId || user?.id || uid}
            studentName={linkedEntity?.name || user?.name || displayName}
            classId={linkedEntity?.classId || user?.classId || user?.classLevel || "cls_nursery"}
            sessionId={profile?.sessionId || "2026-27"}
            linkedStudent={linkedEntity}
            allLinkedStudents={linkedStudents}
            initialTab={requestedTab as any}
            onTabChange={(tab) => setStudentActiveTab(tab)}
            onAddAnotherStudentQr={() => {
              setQrScanMode("STUDENT");
              setIsQrModalOpen(true);
            }}
            onOpenPlatformContent={onOpenPlatformContent}
            onLogout={handleStudentExit}
          />
        </Suspense>
      </PanelErrorBoundary>

      {/* QR Scanner Modal for adding additional sibling Student ID Cards */}
      <QrScannerModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        mode="LOGIN"
        onScanSuccess={(decodedText) => handleLinkSuccess(decodedText, "STUDENT")}
        title="Add Another Student ID Card (QR Scan)"
      />
    </div>
  );
};

export default SchoolEcosystem;
