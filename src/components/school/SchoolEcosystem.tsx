// @ts-nocheck
import React, { useState, useEffect, lazy, Suspense } from "react";
import { getSchoolUserProfile } from "../../school-firebase";
import type { SchoolUserProfile } from "../../school-types";
import { Loader2, ShieldCheck, UserCheck, GraduationCap, ArrowLeft, RefreshCw } from "lucide-react";

// Lazy load individual role panels for fast, isolated chunk downloads
const SuperAdminPanel = lazy(() =>
  import("./SuperAdminPanel").then(m => ({
    default: m.SuperAdminPanel || (m as any).default,
  }))
);

const SchoolAdminPanel = lazy(() =>
  import("./SchoolAdminPanel").then(m => ({
    default: m.SchoolAdminPanel || (m as any).default,
  }))
);

const TeacherPanel = lazy(() =>
  import("./TeacherPanel").then(m => ({
    default: m.TeacherPanel || (m as any).default,
  }))
);

const StudentSchoolPanel = lazy(() =>
  import("./StudentSchoolPanel").then(m => ({
    default: m.StudentSchoolPanel || (m as any).default,
  }))
);

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
}

const isSchoolAdminEmail = (emailStr?: string | null): boolean => {
  if (!emailStr) return false;
  const clean = emailStr.trim().toLowerCase();
  return (
    clean === "n44438403@gmail.com" ||
    clean === "nadimanwar794@gmail.com" ||
    clean === "nadiman0636indo@gmail.com" ||
    clean === "admin@dps.edu.in" ||
    clean === "dpsgurgaon45@dps.edu.in" ||
    clean.startsWith("admin@") ||
    clean.includes("schooladmin") ||
    clean.includes("principal")
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
  onOpenPlatformContent
}) => {
  const [profile, setProfile] = useState<SchoolUserProfile | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [adminPreviewRole, setAdminPreviewRole] = useState<"ADMIN" | "TEACHER" | "STUDENT">("ADMIN");

  const effectiveEmail = (email || user?.email || "").trim().toLowerCase();
  const rawRole = (userRole || user?.role || "").toUpperCase();

  // ── PRECISE ROLE DETECTION ──────────────────────────────────────────────────
  // 1. IS ADMIN CHECK:
  // If forceAdminView is true, or user has an admin role/email/uid, they are unconditionally School Admin.
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

  // 3. FINAL ROLES:
  // If isExplicitAdmin is true -> ALWAYS School Admin ERP Panel!
  const isRealSchoolAdmin = isExplicitAdmin;
  const isRealTeacher = isTeacherRole;
  const isRealStudent = !isExplicitAdmin && !isTeacherRole;

  const fetchProfile = () => {
    if (isSuperAdmin || isSchoolAdminEmail(effectiveEmail) || user?.provider === "qr_teacher_id" || isTeacherRole) {
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

  // 1. SUPER ADMIN ACCESS ONLY
  if (isSuperAdmin || rawRole === "SUPERADMIN") {
    return (
      <Suspense fallback={<PanelLoadingFallback title="Super Admin Panel" />}>
        <SuperAdminPanel adminUid={uid} onBack={onBack} />
      </Suspense>
    );
  }

  const effectiveSchoolId =
    profile?.schoolId || user?.schoolId || defaultSchoolId || "dps_gurgaon_sector45";

  // 2. SCHOOL ADMIN / PRINCIPAL ACCESS (TOP PRIORITY FOR ADMIN LOGINS)
  if (isRealSchoolAdmin) {
    // If Admin wants to preview Teacher or Student view:
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
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Back to School Admin ERP
            </button>
          </div>
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
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Back to School Admin ERP
            </button>
          </div>
          <Suspense fallback={<PanelLoadingFallback title="Teacher Portal" />}>
            <TeacherPanel
              schoolId={effectiveSchoolId}
              teacherId={profile?.teacherRef || uid}
              teacherName={profile?.name || user?.name || displayName}
              onBack={() => setAdminPreviewRole("ADMIN")}
            />
          </Suspense>
        </div>
      );
    }

    // Default: Render SchoolAdminPanel with preview switchers
    return (
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-800/40 flex items-center justify-between text-xs flex-wrap gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>School Admin ERP Active • {displayName || "Dr. Arvind Swaminathan (Principal)"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Preview Portal:</span>
            <button
              onClick={() => setAdminPreviewRole("TEACHER")}
              className="px-2.5 py-1 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-300 rounded-md font-medium text-[11px] transition-colors"
              title="Preview how teachers see the school portal"
            >
              Teacher View
            </button>
            <button
              onClick={() => setAdminPreviewRole("STUDENT")}
              className="px-2.5 py-1 bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700/50 text-indigo-300 rounded-md font-medium text-[11px] transition-colors"
              title="Preview how students see the school portal"
            >
              Student View
            </button>
          </div>
        </div>

        <Suspense fallback={<PanelLoadingFallback title="School Admin ERP" />}>
          <SchoolAdminPanel
            schoolId={effectiveSchoolId}
            adminUid={uid}
            onBack={onBack}
            onOpenPlatformContent={onOpenPlatformContent}
          />
        </Suspense>
      </div>
    );
  }

  // 3. STRICT TEACHER ROLE ISOLATION
  if (isRealTeacher) {
    return (
      <Suspense fallback={<PanelLoadingFallback title="Teacher Portal" />}>
        <TeacherPanel
          schoolId={effectiveSchoolId}
          teacherId={profile?.teacherRef || uid}
          teacherName={profile?.name || user?.name || displayName}
          onBack={onBack}
        />
      </Suspense>
    );
  }

  // 4. STRICT STUDENT ROLE ISOLATION (QR CODE & AUTHENTICATED STUDENTS)
  if (isRealStudent) {
    return (
      <Suspense fallback={<PanelLoadingFallback title="Student Portal" />}>
        <StudentSchoolPanel
          schoolId={effectiveSchoolId}
          studentId={user?.studentId || user?.id || user?.uid || profile?.studentRef || uid}
          studentName={user?.name || profile?.name || displayName}
          classId={user?.classLevel || profile?.classId || "cls_10"}
          sessionId={profile?.sessionId || "2026-27"}
          onOpenPlatformContent={onOpenPlatformContent}
          onBack={onBack}
        />
      </Suspense>
    );
  }

  // 5. Fallback: Default to School Admin ERP so admins never get locked into student mode
  return (
    <Suspense fallback={<PanelLoadingFallback title="School Admin ERP" />}>
      <SchoolAdminPanel
        schoolId={effectiveSchoolId}
        adminUid={uid}
        onBack={onBack}
        onOpenPlatformContent={onOpenPlatformContent}
      />
    </Suspense>
  );
};

export default SchoolEcosystem;
