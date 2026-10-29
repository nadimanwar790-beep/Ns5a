// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  subscribeToSessions, subscribeToClasses, subscribeToSubjects, subscribeToTeachers,
  subscribeToAllStudents, saveSession, saveClass, saveSubject, saveTeacher, saveStudent,
  deleteClass, deleteSubject, deleteTeacher, deleteStudent, updateStudent,
  updateSchool, updateSession, updateClass, updateTeacher,
  generateId, getSchool, getSessions, setSchoolLockCode,
  assignSchoolSubAdminByEmail, getSchoolAdmins, removeSchoolUserByUid,
  getAllMonthlyFees, currentMonthStr, saveFee, markFeePaid
} from "../../school-firebase";
import type { SchoolUserProfile } from "../../school-types";
import type {
  School, SchoolSession, SchoolClass, SchoolSubject, SchoolTeacher, SchoolStudent
} from "../../school-types";
import { BLOOD_GROUPS } from "../../school-types";
import { DEMO_SESSION_ID, seedDemoSchoolData } from "./demoSchoolData";
import { ContentManager } from "./ContentManager";
import { SmartClass } from "./SmartClass";
import { AttendanceManager } from "./AttendanceManager";
import { FeeManager } from "./FeeManager";
import { ReportCard } from "./ReportCard";
import { MarksManager } from "./MarksManager";
import { ExamResultsPanel } from "./ExamResultsPanel";
import { DirectUploadButton } from "../DirectUploadButton";
import { IdCardManager } from "./IdCardManager";
import { AdmitCardManager } from "./AdmitCardManager";
import { CertificateManager } from "./CertificateManager";
import { MarksheetGenerator } from "./MarksheetGenerator";
import { StudentPromotionManager } from "./StudentPromotionManager";
import { NoticeBoardManager } from "./NoticeBoardManager";
import { StaffHRMManager } from "./StaffHRMManager";
import { SchoolReportsHub } from "./SchoolReportsHub";
import { PublicSchoolWebsite } from "./PublicSchoolWebsite";
import { OnlineAdmissionManager } from "./OnlineAdmissionManager";
import { getStaffEmployees } from "../../school-firebase";
import type { MonthlyFee, StaffEmployee } from "../../school-types";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { DigitalSignatureModal } from "./DigitalSignatureModal";
import {
  Users, BookOpen, Calendar, IndianRupee, Plus, Trash2, Settings,
  ChevronRight, ChevronLeft, X, Edit3, FileText, Award,
  MapPin, Phone, User, ChevronDown, ChevronUp, Save, Building2,
  Lock, Eye, EyeOff, Shield, ArrowLeft, ShoppingBag, AlertTriangle, Crown,
  CreditCard, Megaphone, TrendingUp, Briefcase, FileSpreadsheet,
  ClipboardList, Globe, UserPlus, QrCode, GraduationCap, CheckCircle2,
  Printer, Search, Sparkles, Mail, PenTool, Loader2, AlertCircle
} from "lucide-react";
import { SchoolStore } from "./SchoolStore";
import { SchoolPlanView } from "./SchoolPlanView";
import { ClassQrCodeModal } from "./ClassQrCodeModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { ClassFeeStructureSection } from "./ClassFeeStructureSection";

interface Props {
  schoolId: string;
  adminUid: string;
  onBack?: () => void;
}

type AdminView =
  | "dashboard"
  | "sessions" | "classes" | "subjects" | "teachers" | "students"
  | "content" | "attendance" | "fees" | "fee_class" | "fee_all" | "fee_structure" | "report_card" | "marks" | "results"
  | "store" | "subscription"
  | "id_cards" | "admit_cards" | "certificates" | "marksheet_hub" | "promotion" | "notices" | "staff_hrm" | "reports_hub"
  | "public_website" | "online_admissions";


export const SchoolAdminPanel: React.FC<Props> = ({ schoolId, adminUid, onBack }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [sessions, setSessions] = useState<SchoolSession[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [staffList, setStaffList] = useState<StaffEmployee[]>([]);
  const [activeSession, setActiveSession] = useState<SchoolSession | null>(null);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<SchoolSubject | null>(null);
  const [view, setView] = useState<AdminView>("dashboard");
  const [smartClassLesson, setSmartClassLesson] = useState<any>(null);
  const [smartClassMode, setSmartClassMode] = useState<"reading" | "writing" | "pdf" | "mcq">("reading");
  const [saving, setSaving] = useState(false);
  const [showExpiryPopup, setShowExpiryPopup] = useState(false);
  const [expiryPopupExpired, setExpiryPopupExpired] = useState(false);

  // School info card
  const [schoolCardExpanded, setSchoolCardExpanded] = useState(false);
  const [editingSchoolInfo, setEditingSchoolInfo] = useState(false);
  const [showFullSchoolProfileEditor, setShowFullSchoolProfileEditor] = useState(false);
  const [showDigitalSignatureModal, setShowDigitalSignatureModal] = useState(false);
  const [schoolInfoForm, setSchoolInfoForm] = useState({
    principalName: "", principalPhone: "", directorName: "", directorPhone: "", mobile: "", address: "",
    tagline: "", bannerColor: ""
  });
  const [savingSchoolInfo, setSavingSchoolInfo] = useState(false);

  // Lock code
  const [lockCodeInput, setLockCodeInput]     = useState('');
  const [lockCodeActive, setLockCodeActive]   = useState(false);
  const [showLockCode, setShowLockCode]       = useState(false);
  const [savingLockCode, setSavingLockCode]   = useState(false);
  const [lockCodeSaved, setLockCodeSaved]     = useState(false);

  // Sub-admin management
  const [subAdmins, setSubAdmins]             = useState<SchoolUserProfile[]>([]);
  const [subAdminEmail, setSubAdminEmail]     = useState('');
  const [assigningSubAdmin, setAssigningSubAdmin] = useState(false);
  const [subAdminResult, setSubAdminResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [quickActionStudent, setQuickActionStudent] = useState<SchoolStudent | null>(null);
  const [quickActionInitialTab, setQuickActionInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");

  // Forms
  const [sessionForm, setSessionForm] = useState({ name: "", startDate: "", endDate: "" });
  const [classForm, setClassForm] = useState({ name: "", section: "", defaultFee: 0 });
  const [subjectForm, setSubjectForm] = useState({ name: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", email: "", phone: "", employeeId: "" });
  const [studentForm, setStudentForm] = useState<any>({
    name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "",
    phone: "", dateOfBirth: "", monthlyFee: 0, bloodGroup: ""
  });
  const [showForm, setShowForm] = useState<string | null>(null);

  // Edit states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({ name: "", startDate: "", endDate: "" });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassForm, setEditClassForm] = useState({ name: "", section: "", defaultFee: 0 });
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({ name: "", email: "", phone: "", employeeId: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentForm, setEditStudentForm] = useState<any>({ name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "", phone: "", dateOfBirth: "", monthlyFee: 0, photoUrl: "", bloodGroup: "", chargePhotoFee: false });

  // Fee summary state
  const [feeMonth, setFeeMonth] = useState(currentMonthStr());
  const [allFees, setAllFees] = useState<MonthlyFee[]>([]);
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false);
  const [feeClassSelected, setFeeClassSelected] = useState<SchoolClass | null>(null);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");

  // Advanced Class Card states
  const [expandedToolsClassId, setExpandedToolsClassId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [qrModalClass, setQrModalClass] = useState<SchoolClass | null>(null);

  // Class preset names
  const CLASS_PRESETS = ["Play", "Nursery", "KG-1", "KG-2", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];

  // 48-hour expiry warning — shown once per login session
  useEffect(() => {
    if (!school) return;
    const sessionKey = `iic_expiry_warned_${schoolId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    const expIso = school.subscription?.expiresAt || school.subscription?.paidUntil;
    if (!expIso) return;
    const msLeft = new Date(expIso).getTime() - Date.now();
    const hoursLeft = msLeft / 3600000;
    if (hoursLeft <= 48) {
      sessionStorage.setItem(sessionKey, '1');
      setExpiryPopupExpired(hoursLeft <= 0);
      setShowExpiryPopup(true);
    }
  }, [school]);

  useEffect(() => {
    loadSubAdmins();
    getStaffEmployees(schoolId).then(setStaffList).catch(() => {});
    const unsubSessions = subscribeToSessions(schoolId, (sess) => {
      setSessions(sess);
      const active = sess.find(s => s.active) || sess[0] || null;
      setActiveSession(active);
    });
    const unsubTeachers = subscribeToTeachers(schoolId, setTeachers);
    const unsubStudents = subscribeToAllStudents(schoolId, setStudents);
    return () => { unsubSessions(); unsubTeachers(); unsubStudents(); };
  }, [schoolId]);

  useEffect(() => {
    let isCurrentView = true;
    if (!school) setSchoolLoading(true);
    getSchool(schoolId).then(s => {
      if (!isCurrentView) return;
      setSchool(s);
      if (s) {
        setLockCodeInput(s.lockCode || "");
        setLockCodeActive(s.lockCodeActive ?? false);
      }
    }).catch(() => {
      if (isCurrentView) setSchool(null);
    }).finally(() => {
      if (isCurrentView) setSchoolLoading(false);
    });
    return () => {
      isCurrentView = false;
    };
  }, [schoolId, view]);

  useEffect(() => {
    if (!activeSession) return;
    const unsubClasses = subscribeToClasses(schoolId, activeSession.id, setClasses);
    return unsubClasses;
  }, [activeSession]);

  useEffect(() => {
    // If active session is the demo session and classes still have old split classes (_a or _b), auto re-seed to 13 classes x 70 students
    if (activeSession?.id === DEMO_SESSION_ID && classes.length > 0) {
      const hasOldSplit = classes.some(c => c.id.includes("_a") || c.id.includes("_b"));
      if (hasOldSplit && !demoGenerating) {
        seedDemoSchoolData(schoolId, adminUid).catch(err => console.warn("Auto demo upgrade:", err));
      }
    }
  }, [activeSession, classes, demoGenerating, schoolId, adminUid]);

  useEffect(() => {
    if (!selectedClass) return;
    const unsubSubjects = subscribeToSubjects(schoolId, selectedClass.id, setSubjects);
    return unsubSubjects;
  }, [selectedClass]);

  const addSession = async () => {
    if (!sessionForm.name.trim()) return;
    setSaving(true);
    const id = generateId();
    await saveSession({
      id, schoolId, name: sessionForm.name,
      startDate: sessionForm.startDate, endDate: sessionForm.endDate, active: true,
      createdAt: new Date().toISOString()
    });
    setSessionForm({ name: "", startDate: "", endDate: "" });
    setShowForm(null);
    setSaving(false);
  };

  const addClass = async () => {
    if (!classForm.name.trim() || !activeSession) return;
    setSaving(true);
    const id = generateId();
    await saveClass({
      id, schoolId, sessionId: activeSession.id,
      name: classForm.name, section: classForm.section,
      defaultFee: Number(classForm.defaultFee) || 0,
      createdAt: new Date().toISOString()
    });
    setClassForm({ name: "", section: "", defaultFee: 0 });
    setShowForm(null);
    setSaving(false);
  };

  const addSubject = async () => {
    if (!subjectForm.name.trim() || !selectedClass || !activeSession) return;
    setSaving(true);
    const id = generateId();
    await saveSubject({
      id, schoolId, sessionId: activeSession.id, classId: selectedClass.id,
      name: subjectForm.name, createdAt: new Date().toISOString()
    });
    setSubjectForm({ name: "" });
    setShowForm(null);
    setSaving(false);
  };

  const addTeacher = async () => {
    if (!teacherForm.name.trim()) return;
    setSaving(true);
    const id = generateId();
    await saveTeacher({
      id, schoolId, name: teacherForm.name, email: teacherForm.email,
      phone: teacherForm.phone, employeeId: teacherForm.employeeId,
      subjects: [], classes: [], active: true,
      joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });
    setTeacherForm({ name: "", email: "", phone: "", employeeId: "" });
    setShowForm(null);
    setSaving(false);
  };

  const addStudent = async () => {
    if (!studentForm.name.trim() || !selectedClass || !activeSession) return;
    setSaving(true);
    const id = generateId();
    await saveStudent({
      id, schoolId, sessionId: activeSession.id, classId: selectedClass.id,
      name: studentForm.name, rollNo: studentForm.rollNo,
      admissionNo: studentForm.admissionNo, fatherName: studentForm.fatherName,
      motherName: studentForm.motherName, phone: studentForm.phone,
      dateOfBirth: studentForm.dateOfBirth,
      bloodGroup: studentForm.bloodGroup || "",
      monthlyFee: Number(studentForm.monthlyFee) || 0,
      active: true, joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    });
    setStudentForm({ name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "", phone: "", dateOfBirth: "", bloodGroup: "", monthlyFee: (selectedClass as any)?.defaultFee || 0 });
    setShowForm(null);
    setSaving(false);
  };

  // ── Edit handlers ─────────────────────────────────────────────────────────
  const saveEditSession = async () => {
    if (!editingSessionId || !editSessionForm.name.trim()) return;
    setSaving(true);
    await updateSession(schoolId, editingSessionId, {
      name: editSessionForm.name.trim(),
      startDate: editSessionForm.startDate,
      endDate: editSessionForm.endDate,
    });
    setEditingSessionId(null);
    setSaving(false);
  };

  const saveEditClass = async () => {
    if (!editingClassId || !editClassForm.name.trim()) return;
    setSaving(true);
    const previousClass = classes.find(cls => cls.id === editingClassId);
    const updatedDefaultFee = Number(editClassForm.defaultFee) || 0;
    const feeChanged = Number(previousClass?.defaultFee || 0) !== updatedDefaultFee;
    await updateClass(schoolId, editingClassId, {
      name: editClassForm.name.trim(),
      section: editClassForm.section,
      defaultFee: updatedDefaultFee,
    });
    if (feeChanged) {
      const classStudents = students.filter(student =>
        student.classId === editingClassId &&
        (!previousClass?.sessionId || student.sessionId === previousClass.sessionId)
      );
      await Promise.all(classStudents.map(student =>
        updateStudent(schoolId, student.id, { monthlyFee: updatedDefaultFee })
      ));
      setStudents(current => current.map(student =>
        classStudents.some(classStudent => classStudent.id === student.id)
          ? { ...student, monthlyFee: updatedDefaultFee }
          : student
      ));
    }
    setEditingClassId(null);
    setSaving(false);
  };

  const handleActivateSession = async (session: SchoolSession) => {
    setSaving(true);
    await Promise.all(sessions.map(item =>
      updateSession(schoolId, item.id, { active: item.id === session.id })
    ));
    setActiveSession(session);
    setSaving(false);
  };

  const handleGenerateDemoData = async () => {
    if (demoGenerating) return;
    const isRefresh = sessions.some(session => session.id === DEMO_SESSION_ID);
    const confirmation = isRefresh
      ? "Demo session ke 13 classes (Nursery to 10), 70 students per class (Sections A & B), 1:35 teacher ratio, 6 exams (PA1-4 40M, Half/Final 100M), 1-year fee receipts with 3-12 month dues, month-wise notices aur festival holidays refresh honge. Continue?"
      : "Full 1-Year CBSE Demo Setup create hoga: 13 Classes (Nursery to 10), har class me 70 students (Sec A: 35, Sec B: 35), 1:35 teacher ratio (Salaries ₹5K-₹15K, Principal ₹25K, 3-day late cut), 6 exams (2-month cycle, PA 40M, Half/Final 100M), 1-year fee receipts with 3-12 month dues, month-wise notices aur festival holidays. Continue?";
    if (!window.confirm(confirmation)) return;
    setDemoGenerating(true);
    setDemoMessage("");
    try {
      const result = await seedDemoSchoolData(schoolId, adminUid);
      setSessions(current => [
        ...current.filter(session => session.id !== result.session.id),
        result.session,
      ]);
      setDemoMessage(
        `✅ Demo Complete: ${result.classes} sections, ${result.students} students (70/class), ${result.staff} staff (1:35 ratio), ${result.exams} exams (PA 40M / Term 100M), 1-year fee dues (3-12 months), ${result.notices} monthly notices aur ${result.holidays} festival holidays tayyar hain!`
      );
    } catch (error: any) {
      setDemoMessage(`Demo data poora nahi bana: ${error?.message || "Dobara try karein."}`);
    } finally {
      setDemoGenerating(false);
    }
  };

  const saveEditTeacher = async () => {
    if (!editingTeacherId || !editTeacherForm.name.trim()) return;
    setSaving(true);
    await updateTeacher(schoolId, editingTeacherId, {
      name: editTeacherForm.name.trim(),
      email: editTeacherForm.email,
      phone: editTeacherForm.phone,
      employeeId: editTeacherForm.employeeId,
    });
    setEditingTeacherId(null);
    setSaving(false);
  };

  const saveEditStudent = async () => {
    if (!editingStudentId || !editStudentForm.name.trim()) return;
    setSaving(true);
    const student = students.find(s => s.id === editingStudentId);
    const oldPhoto = (student as any)?.photoUrl || "";
    const newPhoto = editStudentForm.photoUrl || "";
    const photoChanged = newPhoto !== oldPhoto;
    await updateStudent(schoolId, editingStudentId, {
      name: editStudentForm.name.trim(),
      rollNo: editStudentForm.rollNo,
      fatherName: editStudentForm.fatherName,
      motherName: editStudentForm.motherName,
      phone: editStudentForm.phone,
      bloodGroup: editStudentForm.bloodGroup || "",
      monthlyFee: Number(editStudentForm.monthlyFee) || 0,
      photoUrl: newPhoto || undefined,
    });
    // If photo was updated and charge is enabled, add ₹50 fee
    if (photoChanged && newPhoto && editStudentForm.chargePhotoFee && activeSession) {
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const feeRecord: any = {
        schoolId, sessionId: activeSession.id,
        studentId: editingStudentId,
        studentName: student?.name || editStudentForm.name,
        rollNo: editStudentForm.rollNo,
        classId: student?.classId || "",
        month,
        amount: 50,
        paid: false,
        note: "Photo update charge"
      };
      await saveFee(feeRecord);
    }
    setEditingStudentId(null);
    setSaving(false);
  };

  const saveSchoolInfo = async () => {
    setSavingSchoolInfo(true);
    await updateSchool(schoolId, {
      principalName: schoolInfoForm.principalName,
      principalPhone: schoolInfoForm.principalPhone,
      directorName: schoolInfoForm.directorName,
      directorPhone: schoolInfoForm.directorPhone,
      mobile: schoolInfoForm.mobile,
      address: schoolInfoForm.address,
      tagline: schoolInfoForm.tagline,
      bannerColor: schoolInfoForm.bannerColor,
    });
    setSchool(prev => prev ? {
      ...prev,
      principalName: schoolInfoForm.principalName,
      principalPhone: schoolInfoForm.principalPhone,
      directorName: schoolInfoForm.directorName,
      directorPhone: schoolInfoForm.directorPhone,
      mobile: schoolInfoForm.mobile,
      address: schoolInfoForm.address,
      tagline: schoolInfoForm.tagline,
      bannerColor: schoolInfoForm.bannerColor,
    } : prev);
    setEditingSchoolInfo(false);
    setSavingSchoolInfo(false);
  };

  const saveLockCode = async () => {
    setSavingLockCode(true);
    await setSchoolLockCode(schoolId, lockCodeInput.trim(), lockCodeActive);
    setSchool(prev => prev ? { ...prev, lockCode: lockCodeInput.trim(), lockCodeActive } : prev);
    setSavingLockCode(false);
    setLockCodeSaved(true);
    setTimeout(() => setLockCodeSaved(false), 2000);
  };

  const loadSubAdmins = () => {
    getSchoolAdmins(schoolId).then(list => setSubAdmins(list)).catch(() => {});
  };

  const handleAssignSubAdmin = async () => {
    if (!subAdminEmail.trim()) return;
    setAssigningSubAdmin(true);
    setSubAdminResult(null);
    try {
      const profile = await assignSchoolSubAdminByEmail(schoolId, subAdminEmail.trim());
      setSubAdminResult({ ok: true, msg: `✅ ${profile.name} ab is school ka sub-admin hai!` });
      setSubAdminEmail('');
      loadSubAdmins();
    } catch (e: any) {
      setSubAdminResult({ ok: false, msg: `❌ ${e.message || 'Error aaya, dobara try karo.'}` });
    }
    setAssigningSubAdmin(false);
  };

  const handleRemoveSubAdmin = async (uid: string) => {
    await removeSchoolUserByUid(uid);
    loadSubAdmins();
  };

  const openEditSchoolInfo = () => {
    setSchoolInfoForm({
      principalName: school?.principalName || "",
      principalPhone: school?.principalPhone || "",
      directorName: school?.directorName || "",
      directorPhone: school?.directorPhone || "",
      mobile: school?.mobile || school?.phone || "",
      address: school?.address || "",
      tagline: school?.tagline || "",
      bannerColor: school?.bannerColor || "",
    });
    setEditingSchoolInfo(true);
    setSchoolCardExpanded(true);
  };

  // ── Subscription access helpers ─────────────────────────────────────────
  const subStatus  = school?.subscription?.status;
  const subTier    = school?.subscription?.tier;
  const _expiresAt = school?.subscription?.expiresAt || school?.subscription?.paidUntil;
  const planExpired = _expiresAt ? new Date(_expiresAt) < new Date() : false;
  const subscriptionActive = subStatus === "active" && !planExpired;
  // Full tier (or legacy schools with no tier set — backwards compat) can manage content
  const canManageContent  = subscriptionActive && (subTier === "full" || subTier === undefined);
  // Both lite and full need an active (non-expired) subscription for data management
  const canManageStudents = subscriptionActive;

  if (view !== "dashboard" && !school) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-3 p-6 text-center">
        {schoolLoading ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-slate-500">Loading school details...</p>
          </>
        ) : (
          <>
            <AlertCircle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-slate-600 dark:text-slate-300">School details could not be loaded.</p>
            <button
              onClick={() => setView("dashboard")}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"
            >
              Back to dashboard
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Store view ─────────────────────────────────────────────────────────
  if (view === "store" && school) {
    return <SchoolStore school={school} onBack={() => setView("dashboard")} />;
  }

  // ── School Plan view ─────────────────────────────────────────────────────
  if (view === "subscription") {
    return (
      <SchoolPlanView
        school={school}
        schoolId={schoolId}
        adminUid={adminUid}
        onBack={() => setView("dashboard")}
      />
    );
  }

  // Smart class handler
  if (smartClassLesson) {
    return (
      <SmartClass
        lesson={smartClassLesson}
        initialMode={smartClassMode}
        schoolId={schoolId}
        isAdmin={true}
        onBack={() => setSmartClassLesson(null)}
      />
    );
  }

  // Sub-panels
  if (view === "content" && selectedClass && selectedSubject) {
    if (!canManageContent) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-5">
            <button onClick={() => setView("subjects")} className="flex items-center gap-1 text-blue-300 text-sm mb-2 hover:text-white">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-xl font-bold text-white">Content Manager</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Content Feature Locked</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                {!subscriptionActive
                  ? "Aapka subscription inactive hai. Content manage karne ke liye Pro Plan lo."
                  : "Content manage karne ke liye Pro Plan chahiye. Abhi Lite Plan active hai."}
              </p>
            </div>
            <button
              onClick={() => setView("store")}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              <Crown className="w-4 h-4" /> Pro Plan Lo
            </button>
          </div>
        </div>
      );
    }
    return (
      <ContentManager
        schoolId={schoolId}
        sessionId={activeSession?.id || ""}
        classId={selectedClass.id}
        subjectId={selectedSubject.id}
        subjectName={selectedSubject.name}
        className={selectedClass.name}
        authorId={adminUid}
        subscription={school?.subscription || { reading: true, writing: true, pdf: true, mcq: true }}
        onBack={() => { setView("subjects"); }}
        onOpenLesson={(lesson, mode) => { setSmartClassLesson(lesson); setSmartClassMode(mode); }}
      />
    );
  }

  if (view === "attendance" && selectedClass) {
    return (
      <AttendanceManager
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        teacherId={adminUid}
        onBack={() => setView("classes")}
      />
    );
  }

  if (view === "fee_class" && feeClassSelected) {
    return (
      <FeeManager
        schoolId={schoolId}
        classId={feeClassSelected.id}
        className={feeClassSelected.name}
        schoolName={school?.name}
        school={school || undefined}
        sessionId={activeSession?.id || ""}
        adminId={adminUid}
        onBack={() => setView("fees")}
      />
    );
  }

  if (view === "fee_all") {
    return (
      <FeeManager
        schoolId={schoolId}
        className="All Classes"
        schoolName={school?.name}
        school={school || undefined}
        sessionId={activeSession?.id || ""}
        adminId={adminUid}
        onBack={() => setView("fees")}
      />
    );
  }

  if (view === "results" && selectedClass) {
    return (
      <ExamResultsPanel
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        sessionId={activeSession?.id || ""}
        subjects={subjects.filter(s => s.classId === selectedClass.id)}
        adminId={adminUid}
        schoolName={school?.name}
        onBack={() => setView("classes")}
      />
    );
  }

  if (view === "report_card" && selectedClass) {
    return (
      <ReportCard
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        sessionId={activeSession?.id || ""}
        onBack={() => setView("classes")}
      />
    );
  }

  if (view === "marks" && selectedClass) {
    return (
      <MarksManager
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        sessionId={activeSession?.id || ""}
        teacherId={adminUid}
        subjectId={selectedSubject?.id}
        subjectName={selectedSubject?.name}
        onBack={() => setView("classes")}
      />
    );
  }

  // ── 9-MODULE ENTERPRISE VIEWS ──
  if (view === "id_cards") {
    return (
      <IdCardManager
        school={school!}
        classes={classes}
        students={students}
        staff={staffList}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "admit_cards") {
    return (
      <AdmitCardManager
        school={school!}
        classes={classes}
        students={students}
        activeSession={activeSession}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "certificates") {
    return (
      <CertificateManager
        school={school!}
        classes={classes}
        students={students}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "marksheet_hub") {
    return (
      <MarksheetGenerator
        school={school!}
        classes={classes}
        students={students}
        activeSession={activeSession}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "promotion") {
    return (
      <StudentPromotionManager
        schoolId={schoolId}
        sessions={sessions}
        classes={classes}
        students={students}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "notices") {
    return (
      <NoticeBoardManager
        schoolId={schoolId}
        adminUid={adminUid}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "staff_hrm") {
    return (
      <StaffHRMManager
        school={school!}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "reports_hub") {
    return (
      <SchoolReportsHub
        school={school!}
        classes={classes}
        students={students}
        teachers={teachers}
        fees={[]}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "public_website") {
    return (
      <PublicSchoolWebsite
        school={school!}
        classes={classes}
        sessions={sessions}
        onBack={() => setView("dashboard")}
        onOpenAdmission={() => setView("online_admissions")}
        onOpenVerification={(type) => {
          if (type === "marksheet") setView("marksheet_hub");
          else if (type === "certificate") setView("certificates");
          else if (type === "idcard") setView("id_cards");
        }}
      />
    );
  }

  if (view === "online_admissions") {
    return (
      <OnlineAdmissionManager
        school={school!}
        classes={classes}
        sessions={sessions}
        activeSession={activeSession}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "fee_structure") {
    return (
      <ClassFeeStructureSection
        schoolId={schoolId}
        sessionId={activeSession?.id}
        classes={classes}
        onBack={() => setView("dashboard")}
        onClassesUpdated={() => {}}
      />
    );
  }

  const menuItems = [
    { label: "Sessions", icon: <Calendar className="w-5 h-5 text-blue-500" />, view: "sessions", count: sessions.length, locked: false },
    { label: "Classes", icon: <BookOpen className="w-5 h-5 text-purple-500" />, view: "classes", count: classes.length, locked: false },
    { label: "Class Fee Setup", icon: <IndianRupee className="w-5 h-5 text-emerald-600" />, view: "fee_structure", count: "5 Heads", locked: false },
    { label: "Teachers", icon: <Users className="w-5 h-5 text-green-500" />, view: "teachers", count: teachers.length, locked: false },
    { label: "Students", icon: <Users className="w-5 h-5 text-orange-500" />, view: "students", count: students.length, locked: false },
    { label: "Fee Collection", icon: <IndianRupee className="w-5 h-5 text-emerald-500" />, view: "fees", count: null, locked: false },
    // 9-MODULE EXTENSIONS
    { label: "QR ID Cards", icon: <CreditCard className="w-5 h-5 text-indigo-500" />, view: "id_cards", count: "Live QR", locked: false },
    { label: "Admit Cards", icon: <FileText className="w-5 h-5 text-rose-500" />, view: "admit_cards", count: "Hall Ticket", locked: false },
    { label: "Certificates", icon: <Award className="w-5 h-5 text-amber-500" />, view: "certificates", count: "TC & Merit", locked: false },
    { label: "Marksheet (रिजल्ट)", icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />, view: "marksheet_hub", count: "Official Print", locked: false },
    { label: "Class Promotion", icon: <TrendingUp className="w-5 h-5 text-blue-600" />, view: "promotion", count: "Promote", locked: false },
    { label: "Notice Board", icon: <Megaphone className="w-5 h-5 text-purple-600" />, view: "notices", count: "Circulars", locked: false },
    { label: "Staff HRM & Leaves", icon: <Briefcase className="w-5 h-5 text-teal-600" />, view: "staff_hrm", count: "Salaries", locked: false },
    { label: "Reports & Print", icon: <FileSpreadsheet className="w-5 h-5 text-cyan-600" />, view: "reports_hub", count: "40+ Reports", locked: false },
    { label: "Public Website & Portal", icon: <Globe className="w-5 h-5 text-indigo-500" />, view: "public_website", count: "Live", locked: false },
    { label: "Online Admissions", icon: <UserPlus className="w-5 h-5 text-amber-500" />, view: "online_admissions", count: "Portal", locked: false },
    {
      label: "Mera Plan",
      icon: <Crown className="w-5 h-5 text-amber-500" />,
      view: "subscription",
      count: null,
      locked: false,
    },
    {
      label: "Store / Plans",
      icon: <ShoppingBag className="w-5 h-5 text-violet-500" />,
      view: "store",
      count: null,
      locked: false,
    },
  ];

  // List views
  const renderListView = () => {
    if (view === "sessions") {
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <button
            onClick={handleGenerateDemoData}
            disabled={demoGenerating}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {demoGenerating ? "Creating demo data..." : sessions.some(session => session.id === DEMO_SESSION_ID) ? "Refresh Demo Session" : "Create Demo Session"}
          </button>
          <p className="text-xs text-slate-500 px-1">Play se Class 10 tak 11 classes; har class mein 10 students aur 10 subjects. Demo records alag session mein rehte hain.</p>
          {demoMessage && (
            <p role="status" className="rounded-lg bg-violet-50 p-3 text-xs text-violet-800 dark:bg-violet-900/20 dark:text-violet-200">
              {demoMessage}
            </p>
          )}
          <button onClick={() => { setShowForm("session"); setEditingSessionId(null); }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Session
          </button>
          {showForm === "session" && !editingSessionId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <input value={sessionForm.name} onChange={e => setSessionForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Session Name (e.g. 2026-27)"
                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white" />
              <div className="flex gap-2">
                <input type="date" value={sessionForm.startDate} onChange={e => setSessionForm(p => ({ ...p, startDate: e.target.value }))}
                  className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                <input type="date" value={sessionForm.endDate} onChange={e => setSessionForm(p => ({ ...p, endDate: e.target.value }))}
                  className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
              </div>
              <div className="flex gap-2">
                <button onClick={addSession} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Save</button>
                <button onClick={() => setShowForm(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          {sessions.map((s, idx) => (
            <div key={s.id || `session-${s.name || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              {editingSessionId === s.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider">Edit Session</p>
                  <input value={editSessionForm.name} onChange={e => setEditSessionForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Session Name" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  <div className="flex gap-2">
                    <input type="date" value={editSessionForm.startDate} onChange={e => setEditSessionForm(p => ({ ...p, startDate: e.target.value }))}
                      className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                    <input type="date" value={editSessionForm.endDate} onChange={e => setEditSessionForm(p => ({ ...p, endDate: e.target.value }))}
                      className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEditSession} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingSessionId(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-white">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.startDate} → {s.endDate}</p>
                  </div>
                  {s.active && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>}
                  {!s.active && (
                    <button
                      onClick={() => handleActivateSession(s)}
                      disabled={saving}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold disabled:opacity-50"
                    >
                      Use this session
                    </button>
                  )}
                  <button onClick={() => { setEditingSessionId(s.id); setEditSessionForm({ name: s.name, startDate: s.startDate || "", endDate: s.endDate || "" }); setShowForm(null); }}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500">
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (view === "classes") {
      const sortedClasses = [...classes].sort((a, b) => {
        const na = parseInt(a.name.replace(/\D+/g, '')) || 0;
        const nb = parseInt(b.name.replace(/\D+/g, '')) || 0;
        return na !== nb ? na - nb : a.name.localeCompare(b.name);
      });

      const filteredClasses = sortedClasses.filter(cls => {
        if (!classSearchQuery.trim()) return true;
        const q = classSearchQuery.toLowerCase();
        return (
          cls.name.toLowerCase().includes(q) ||
          (cls.section && cls.section.toLowerCase().includes(q))
        );
      });

      return (
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
          {!activeSession && (
            <div className="text-center py-10 text-slate-400 text-sm bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-6">
              <p className="font-bold text-slate-600 dark:text-slate-300 text-base mb-1">Session Not Selected</p>
              <p className="text-xs">Classes create karne se pehle kripya ek Academic Session select ya create karein.</p>
            </div>
          )}

          {activeSession && (
            <>
              {/* Header Banner & Global Actions */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <span>Class Management</span>
                    </h2>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/30">
                      {activeSession.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{classes.length} Total Classes</span>
                    <span>•</span>
                    <span>{students.length} Enrolled Students</span>
                    <span>•</span>
                    <span>{subjects.length} Subjects</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("fee_structure")}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                    title="Admission Fee, Tuition Fee, Caution Money, Annual Charges, Bus Fee edit karein"
                  >
                    <IndianRupee className="w-4 h-4" />
                    <span>Class Fee Setup (5 Heads)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(showForm === "class" ? null : "class"); setEditingClassId(null); }}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Class</span>
                  </button>
                </div>
              </div>

              {/* Class Search Bar */}
              {classes.length > 0 && (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={classSearchQuery}
                    onChange={e => setClassSearchQuery(e.target.value)}
                    placeholder="Search class by name or section (e.g. Class 10, Nursery, A)..."
                    className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition shadow-2xs"
                  />
                  {classSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setClassSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Add Class Form Modal / Collapsible */}
              {showForm === "class" && !editingClassId && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-blue-500/30 shadow-lg space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-blue-600" />
                      <span>Create New Class</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForm(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-bold mb-1.5">Quick Grade Presets:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CLASS_PRESETS.map((preset, idx) => (
                        <button
                          key={`quick-preset-${preset}-${idx}`}
                          type="button"
                          onClick={() => setClassForm(p => ({ ...p, name: preset }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                            classForm.name === preset
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-400'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Class Name *
                      </label>
                      <input
                        value={classForm.name}
                        onChange={e => setClassForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="e.g. Class 10"
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                        Section (Optional)
                      </label>
                      <input
                        value={classForm.section}
                        onChange={e => setClassForm(p => ({ ...p, section: e.target.value }))}
                        placeholder="e.g. A, B, Science"
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      Default Monthly Fee (₹):
                    </label>
                    <input
                      type="number"
                      value={(classForm as any).defaultFee || ""}
                      placeholder="0"
                      onChange={e => setClassForm(p => ({ ...p, defaultFee: Number(e.target.value) } as any))}
                      className="flex-1 max-w-[200px] px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm font-bold"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={addClass}
                      disabled={saving}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black disabled:opacity-60 shadow-md active:scale-95 transition"
                    >
                      {saving ? "Saving Class..." : "Create Class"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(null)}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Class Cards List */}
              {filteredClasses.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                    {classSearchQuery ? "Koi class match nahi hui" : "Abhi koi class nahi bani"}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {classSearchQuery ? `"${classSearchQuery}" se match hone wali koi class nahi hai.` : "Upar diye '+ Add New Class' button se apni pehli class banayein."}
                  </p>
                </div>
              ) : (
                filteredClasses.map((cls, idx) => {
                  const classStudents = students.filter(s => s.classId === cls.id);
                  const classSubjects = subjects.filter(s => s.classId === cls.id);
                  const defaultFee = Number((cls as any).defaultFee) || 0;
                  const isToolsExpanded = expandedToolsClassId === cls.id;

                  // Grade badge text: e.g. "10", "9", "KG", "NUR", "PL"
                  const cleanName = cls.name.trim();
                  const numMatch = cleanName.match(/\d+/);
                  const badgeNumber = numMatch ? numMatch[0] : cleanName.slice(0, 3).toUpperCase();

                  return (
                    <div
                      key={cls.id || `cls-${cls.name}-${idx}`}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all overflow-hidden"
                    >
                      {editingClassId === cls.id ? (
                        <div className="p-5 space-y-3.5 bg-slate-50/50 dark:bg-slate-800/80">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Edit Class Settings</span>
                            </p>
                            <span className="text-[10px] text-slate-400 font-bold">ID: #{cls.id.slice(0, 6)}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {CLASS_PRESETS.map((preset, pIdx) => (
                              <button
                                key={`edit-preset-${cls.id || idx}-${preset}-${pIdx}`}
                                type="button"
                                onClick={() => setEditClassForm(p => ({ ...p, name: preset }))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                                  editClassForm.name === preset
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                                }`}
                              >
                                {preset}
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              value={editClassForm.name}
                              onChange={e => setEditClassForm(p => ({ ...p, name: e.target.value }))}
                              placeholder="Class Name"
                              className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                            />
                            <input
                              value={editClassForm.section}
                              onChange={e => setEditClassForm(p => ({ ...p, section: e.target.value }))}
                              placeholder="Section (optional)"
                              className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Default Fee (₹/mo):</label>
                            <input
                              type="number"
                              value={editClassForm.defaultFee || ""}
                              onChange={e => setEditClassForm(p => ({ ...p, defaultFee: Number(e.target.value) }))}
                              className="flex-1 max-w-[200px] px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-bold"
                            />
                          </div>

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={saveEditClass}
                              disabled={saving}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black disabled:opacity-60 shadow-md transition active:scale-95"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>{saving ? "Saving..." : "Save Changes"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingClassId(null)}
                              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Card Header & Identity */}
                          <div className="flex items-start justify-between gap-3 p-4 sm:p-5 pb-3">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 text-white flex flex-col items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 border border-white/20 select-none">
                                <span className="text-base font-black tracking-tight leading-none">{badgeNumber}</span>
                                <span className="text-[9px] font-bold text-indigo-200 uppercase tracking-widest leading-none mt-1">Grade</span>
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                                    {cls.name}
                                  </h3>
                                  {cls.section && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                                      Section {cls.section}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>{classStudents.length} Students</span>
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span>{classSubjects.length} Subjects</span>
                                  </span>
                                  {defaultFee > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                        <IndianRupee className="w-3.5 h-3.5" />
                                        <span>₹{defaultFee}/mo</span>
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setQrModalClass(cls)}
                                title="Class Attendance QR Code"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <QrCode className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">QR Code</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClass(cls);
                                  setShowForm("student");
                                  setEditingStudentId(null);
                                  setStudentForm({
                                    name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "",
                                    phone: "", dateOfBirth: "", monthlyFee: defaultFee
                                  });
                                  setView("students");
                                }}
                                title="Add Student directly to this class"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">+ Student</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditingClassId(cls.id);
                                  setEditClassForm({ name: cls.name, section: cls.section || "", defaultFee });
                                  setShowForm(null);
                                }}
                                title="Edit Class Name & Fees"
                                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Kya aap "${cls.name}" ko sachme delete karna chahte hain? Is class ke sabhi records par asar pad sakta hai.`)) {
                                    deleteClass(schoolId, cls.id);
                                  }
                                }}
                                title="Delete Class"
                                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Upgraded 8-Tile Academic Action Grid */}
                          <div className="px-4 sm:px-5 pb-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {/* 1. Students */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("students"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <Users className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Students</p>
                                  <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                    {classStudents.length} Enrolled
                                  </p>
                                </div>
                              </button>

                              {/* 2. Subjects */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("subjects"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-purple-500/20 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-50 dark:hover:bg-purple-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <BookOpen className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Subjects</p>
                                  <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 truncate mt-0.5">
                                    {classSubjects.length} Courses
                                  </p>
                                </div>
                              </button>

                              {/* 3. Attendance */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("attendance"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <CheckCircle2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Attendance</p>
                                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate mt-0.5">
                                    Daily Haziri & QR
                                  </p>
                                </div>
                              </button>

                              {/* 4. Marks */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("marks"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <Edit3 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Marks</p>
                                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
                                    Exam Grades Entry
                                  </p>
                                </div>
                              </button>

                              {/* 5. Report Cards */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("report_card"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Report</p>
                                  <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                                    Marksheets PDF
                                  </p>
                                </div>
                              </button>

                              {/* 6. Results */}
                              <button
                                type="button"
                                onClick={() => { setSelectedClass(cls); setView("results"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Results</p>
                                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">
                                    Merit & Toppers
                                  </p>
                                </div>
                              </button>

                              {/* 7. Fees */}
                              <button
                                type="button"
                                onClick={() => { setFeeClassSelected(cls); setView("fee_class"); }}
                                className="group p-2.5 sm:p-3 rounded-xl border border-teal-500/20 bg-teal-50/40 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <IndianRupee className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">Fees</p>
                                  <p className="text-[10px] font-bold text-teal-600 dark:text-teal-400 truncate mt-0.5">
                                    ₹{defaultFee}/mo Ledger
                                  </p>
                                </div>
                              </button>

                              {/* 8. Class QR */}
                              <button
                                type="button"
                                onClick={() => setQrModalClass(cls)}
                                className="group p-2.5 sm:p-3 rounded-xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-left transition-all active:scale-[0.98] flex items-center gap-2.5 cursor-pointer"
                              >
                                <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                                  <QrCode className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">QR Code</p>
                                  <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 truncate mt-0.5">
                                    Project & Print
                                  </p>
                                </div>
                              </button>
                            </div>
                          </div>

                          {/* More Advanced Academic Tools Accordion */}
                          <div className="border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-900/30 px-4 sm:px-5 py-2 flex flex-col">
                            <button
                              type="button"
                              onClick={() => setExpandedToolsClassId(isToolsExpanded ? null : cls.id)}
                              className="flex items-center justify-between text-xs font-black text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors py-1 cursor-pointer"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>Advanced Tools & Printouts</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                                  ID Cards • Admit Cards • Promotion
                                </span>
                              </div>
                              {isToolsExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                              )}
                            </button>

                            {isToolsExpanded && (
                              <div className="pt-2.5 pb-1 grid grid-cols-2 sm:grid-cols-4 gap-2 animate-in fade-in duration-150">
                                {/* ID Cards */}
                                <button
                                  type="button"
                                  onClick={() => { setSelectedClass(cls); setView("id_cards"); }}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition text-left flex items-center gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <CreditCard className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">ID Cards</p>
                                    <p className="text-[10px] text-slate-400 truncate">Print Badges</p>
                                  </div>
                                </button>

                                {/* Admit Cards */}
                                <button
                                  type="button"
                                  onClick={() => { setSelectedClass(cls); setView("admit_cards"); }}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-amber-400 dark:hover:border-amber-500 transition text-left flex items-center gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">Admit Cards</p>
                                    <p className="text-[10px] text-slate-400 truncate">Exam Tickets</p>
                                  </div>
                                </button>

                                {/* Student Promotion */}
                                <button
                                  type="button"
                                  onClick={() => { setSelectedClass(cls); setView("promotion"); }}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-400 dark:hover:border-emerald-500 transition text-left flex items-center gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                    <GraduationCap className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">Promotion</p>
                                    <p className="text-[10px] text-slate-400 truncate">Next Session</p>
                                  </div>
                                </button>

                                {/* Certificates */}
                                <button
                                  type="button"
                                  onClick={() => { setSelectedClass(cls); setView("certificates"); }}
                                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-purple-400 dark:hover:border-purple-500 transition text-left flex items-center gap-2.5 group cursor-pointer"
                                >
                                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400 flex items-center justify-center shrink-0">
                                    <Award className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black text-slate-800 dark:text-white leading-tight">Certificates</p>
                                    <p className="text-[10px] text-slate-400 truncate">Character/Transfer</p>
                                  </div>
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </>
          )}
        </div>
      );
    }

    if (view === "subjects") {
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {!selectedClass && <div className="text-slate-400 text-center py-8">Select a class first</div>}
          {selectedClass && (
            <>
              <p className="text-sm text-slate-500">Subjects for <strong className="text-slate-700 dark:text-slate-200">{selectedClass.name}</strong></p>
              <button onClick={() => setShowForm("subject")}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Add Subject
              </button>
              {showForm === "subject" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
                  <input value={subjectForm.name} onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Subject Name (e.g. Mathematics)" className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white" />
                  <div className="flex gap-2">
                    <button onClick={addSubject} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Save</button>
                    <button onClick={() => setShowForm(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
              {subjects.map((sub, idx) => (
                <div key={sub.id || `subject-${sub.name || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 dark:text-white">{sub.name}</p>
                  </div>
                  <button onClick={() => { setSelectedSubject(sub); setView("content"); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">
                    <BookOpen className="w-3.5 h-3.5" /> Lessons
                  </button>
                  <button onClick={() => deleteSubject(schoolId, sub.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      );
    }

    if (view === "teachers") {
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <button onClick={() => { setShowForm("teacher"); setEditingTeacherId(null); }}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Teacher
          </button>
          {showForm === "teacher" && !editingTeacherId && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              {[
                ["name", "Full Name *", "text"], ["email", "Email", "email"],
                ["phone", "Phone", "tel"], ["employeeId", "Employee ID", "text"]
              ].map(([k, label, type], idx) => (
                <input key={`teacher-field-${k}-${idx}`} type={type} value={(teacherForm as any)[k]}
                  onChange={e => setTeacherForm(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={label}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
              ))}
              <div className="flex gap-2">
                <button onClick={addTeacher} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Save</button>
                <button onClick={() => setShowForm(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}
          {teachers.map((t, idx) => (
            <div key={t.id || `teacher-${t.name || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              {editingTeacherId === t.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-green-500 uppercase tracking-wider">Edit Teacher</p>
                  {[
                    ["name", "Full Name *", "text"], ["email", "Email", "email"],
                    ["phone", "Phone", "tel"], ["employeeId", "Employee ID", "text"]
                  ].map(([k, label, type], idx) => (
                    <input key={`edit-teacher-field-${k}-${idx}`} type={type} value={(editTeacherForm as any)[k]}
                      onChange={e => setEditTeacherForm(p => ({ ...p, [k]: e.target.value }))}
                      placeholder={label}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  ))}
                  <div className="flex gap-2">
                    <button onClick={saveEditTeacher} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingTeacherId(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center font-bold text-green-700 flex-shrink-0">
                    {t.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 dark:text-white">{t.name}</p>
                    <p className="text-xs text-slate-400 truncate">{t.email || "No email"} • {t.employeeId || "No ID"}</p>
                  </div>
                  <button onClick={() => { setEditingTeacherId(t.id); setEditTeacherForm({ name: t.name, email: t.email || "", phone: t.phone || "", employeeId: t.employeeId || "" }); setShowForm(null); }}
                    className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteTeacher(schoolId, t.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (view === "students") {
      const classStudents = selectedClass ? students.filter(s => s.classId === selectedClass.id) : students;
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          {selectedClass && <p className="text-sm text-slate-500">Students in <strong className="text-slate-700 dark:text-slate-200">{selectedClass.name}</strong></p>}
          {selectedClass && (
            <>
              <button onClick={() => {
                setShowForm("student");
                setEditingStudentId(null);
                setStudentForm({ name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "", phone: "", dateOfBirth: "", bloodGroup: "", monthlyFee: (selectedClass as any)?.defaultFee || 0 });
              }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 shadow-sm transition">
                <Plus className="w-4 h-4" /> Add Student
              </button>
              {showForm === "student" && !editingStudentId && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Naya Student Registration</p>
                  {[
                    ["name", "Full Name *", "text"], ["rollNo", "Roll Number *", "text"],
                    ["admissionNo", "Admission No", "text"], ["fatherName", "Father's Name", "text"],
                    ["motherName", "Mother's Name", "text"], ["phone", "Phone / Mobile", "tel"],
                  ].map(([k, label, type], idx) => (
                    <input key={`student-field-${k}-${idx}`} type={type} value={(studentForm as any)[k]}
                      onChange={e => setStudentForm(p => ({ ...p, [k]: e.target.value }))}
                      placeholder={label}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  ))}

                  {/* DOB & Blood Group Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Date of Birth</label>
                      <input type="date" value={studentForm.dateOfBirth}
                        onChange={e => setStudentForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-bold text-rose-600 dark:text-rose-400">🩸 Blood Group</label>
                      <select
                        value={studentForm.bloodGroup || ""}
                        onChange={e => setStudentForm(p => ({ ...p, bloodGroup: e.target.value }))}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold"
                      >
                        <option value="">Select Blood Group (Optional)</option>
                        {BLOOD_GROUPS.map((bg, idx) => (
                          <option key={`student-bg-${bg}-${idx}`} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-500 whitespace-nowrap">Monthly Fee (₹):</label>
                      <input type="number" value={studentForm.monthlyFee}
                        onChange={e => setStudentForm(p => ({ ...p, monthlyFee: Number(e.target.value) }))}
                        className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                    </div>
                    {(selectedClass as any)?.defaultFee > 0 && (
                      <p className="text-[11px] text-blue-500 pl-1">
                        {selectedClass.name} ka default fee: ₹{(selectedClass as any).defaultFee}/mo
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={addStudent} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Save</button>
                    <button onClick={() => setShowForm(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </>
          )}
          {classStudents.map((s, idx) => (
            <div key={s.id || `student-${s.rollNo || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
              {editingStudentId === s.id ? (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Edit Student Details</p>
                  {[
                    ["name", "Full Name *", "text"], ["rollNo", "Roll Number", "text"],
                    ["fatherName", "Father's Name", "text"], ["motherName", "Mother's Name", "text"],
                    ["phone", "Phone", "tel"]
                  ].map(([k, label, type], idx) => (
                    <input key={`edit-student-field-${k}-${idx}`} type={type} value={(editStudentForm as any)[k]}
                      onChange={e => setEditStudentForm(p => ({ ...p, [k]: e.target.value }))}
                      placeholder={label}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  ))}

                  {/* Blood Group in Edit Form */}
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block font-bold text-rose-600 dark:text-rose-400">🩸 Blood Group</label>
                    <select
                      value={editStudentForm.bloodGroup || ""}
                      onChange={e => setEditStudentForm(p => ({ ...p, bloodGroup: e.target.value }))}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg, idx) => (
                        <option key={`edit-student-bg-${bg}-${idx}`} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Monthly Fee (₹):</label>
                    <input type="number" value={editStudentForm.monthlyFee}
                      onChange={e => setEditStudentForm(p => ({ ...p, monthlyFee: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  </div>
                  <div className="space-y-1.5 p-2.5 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Student Photo (Phone se Direct Upload):</label>
                      <DirectUploadButton
                        kind="image"
                        compact
                        currentUrl={editStudentForm.photoUrl}
                        onUploaded={(url) => setEditStudentForm(p => ({ ...p, photoUrl: url }))}
                        onClear={() => setEditStudentForm(p => ({ ...p, photoUrl: '' }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Photo marksheet aur profile par dikhegi.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" checked={editStudentForm.chargePhotoFee || false}
                      onChange={e => setEditStudentForm(p => ({ ...p, chargePhotoFee: e.target.checked }))}
                      className="w-4 h-4 accent-orange-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-300">Photo update ke liye ₹50 charge karo student ko</span>
                  </label>
                  <div className="flex gap-2">
                    <button onClick={saveEditStudent} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-60">
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingStudentId(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0">
                    {s.rollNo || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionStudent(s);
                          setQuickActionInitialTab("id_card");
                        }}
                        className="group text-left font-bold text-slate-800 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                        title="Tap to view ID Card, Fee Details & Attendance"
                      >
                        <span className="underline decoration-dotted decoration-slate-300 group-hover:decoration-blue-500">{s.name}</span>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold opacity-70 group-hover:opacity-100">
                          Options
                        </span>
                      </button>
                      {s.bloodGroup && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                          🩸 {s.bloodGroup}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{s.admissionNo || "No Adm No"} • Fee: ₹{s.monthlyFee}/mo</p>
                  </div>
                  <button onClick={() => { setEditingStudentId(s.id); setEditStudentForm({ name: s.name, rollNo: s.rollNo || "", fatherName: s.fatherName || "", motherName: s.motherName || "", phone: s.phone || "", monthlyFee: s.monthlyFee || 0, photoUrl: (s as any).photoUrl || "", bloodGroup: (s as any).bloodGroup || "", chargePhotoFee: false }); setShowForm(null); }}
                    className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteStudent(schoolId, s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
          {classStudents.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No students yet</p>
            </div>
          )}
        </div>
      );
    }
    if (view === "fees") {
      const sortedClasses = [...classes].sort((a, b) => {
        const na = parseInt(a.name.replace(/\D+/g, '')) || 0;
        const nb = parseInt(b.name.replace(/\D+/g, '')) || 0;
        return na !== nb ? na - nb : a.name.localeCompare(b.name);
      });
      const changeMonth = (delta: number) => {
        const [y, m] = feeMonth.split("-").map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        setFeeMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      };
      const loadFeeSummary = async () => {
        setFeeSummaryLoading(true);
        const fees = await getAllMonthlyFees(schoolId, feeMonth);
        setAllFees(fees);
        setFeeSummaryLoading(false);
      };
      if (allFees.length === 0 && !feeSummaryLoading) { loadFeeSummary(); }

      const schoolTotal = students.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
      const schoolCollected = allFees.filter(f => f.paid).reduce((sum, f) => sum + (f.amount || 0), 0);
      const schoolDue = allFees.filter(f => !f.paid).reduce((sum, f) => sum + (f.amount || 0), 0);

      return (
        <div className="p-4 max-w-2xl mx-auto space-y-3">
          {/* Month selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 flex items-center gap-3 shadow-sm">
            <button onClick={() => { changeMonth(-1); setAllFees([]); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="flex-1 text-center font-bold text-slate-800 dark:text-white text-sm">
              {new Date(feeMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => { changeMonth(1); setAllFees([]); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* School-wide totals */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-slate-400 mb-0.5">Expected</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">₹{schoolTotal.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-green-600 mb-0.5">Collected</p>
              <p className="font-bold text-green-700 text-sm">₹{schoolCollected.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 shadow-sm text-center">
              <p className="text-xs text-red-500 mb-0.5">Due</p>
              <p className="font-bold text-red-600 text-sm">₹{schoolDue.toLocaleString()}</p>
            </div>
          </div>

          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1">Class-wise Summary</p>

          {feeSummaryLoading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading fees...</div>
          ) : sortedClasses.map((cls, idx) => {
            const classStudents = students.filter(s => s.classId === cls.id);
            const classFees = allFees.filter(f => f.classId === cls.id);
            const expected = classStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
            const collected = classFees.filter(f => f.paid).reduce((sum, f) => sum + (f.amount || 0), 0);
            const due = classFees.filter(f => !f.paid).reduce((sum, f) => sum + (f.amount || 0), 0);
            const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
            return (
              <button key={cls.id || `fee-cls-${cls.name}-${idx}`} onClick={() => { setFeeClassSelected(cls); setView("fee_class"); }}
                className="w-full bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm text-left hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-slate-800 dark:text-white text-sm">{cls.name}</p>
                  <p className="text-xs text-slate-400">{classStudents.length} students</p>
                </div>
                <div className="flex gap-3 text-xs mb-2">
                  <span className="text-slate-500">Expected: <strong>₹{expected.toLocaleString()}</strong></span>
                  <span className="text-green-600">Paid: <strong>₹{collected.toLocaleString()}</strong></span>
                  <span className="text-red-500">Due: <strong>₹{due.toLocaleString()}</strong></span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 flex justify-between">
                  <span>{pct}% collected</span>
                  <span className="text-blue-500">Tap to manage →</span>
                </p>
              </button>
            );
          })}
          {sortedClasses.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <IndianRupee className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p>Koi class nahi mili</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-5">
        {view === "dashboard" && onBack ? (
          <button onClick={onBack} className="flex items-center gap-1.5 text-blue-300 hover:text-white text-sm font-medium mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Student Dashboard
          </button>
        ) : view !== "dashboard" ? (
          <button onClick={() => {
            if (view === "subjects" || view === "students" || view === "attendance" || view === "marks" || view === "report_card") setView("classes");
            else if (view === "content") { setView("subjects"); }
            else setView("dashboard");
          }} className="flex items-center gap-1 text-blue-300 text-sm mb-2 hover:text-white">
            <ChevronLeft className="w-4 h-4" /> {view === "store" ? "Dashboard" : "Back"}
          </button>
        ) : null}
        <p className="text-blue-300 text-xs font-medium uppercase tracking-wider mb-1">School Admin</p>
        <h1 className="text-xl font-bold text-white">{school?.name || "Loading..."}</h1>
        {activeSession && <p className="text-slate-300 text-sm mt-0.5">Session: {activeSession.name}</p>}
      </div>

      {view === "dashboard" ? (
        <div className="p-4 max-w-2xl mx-auto">

          {/* ── PROFESSIONAL INSTITUTIONAL IDENTITY HERO CARD ─────────────────────────────── */}
          {school && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl border border-indigo-500/25 mb-5 transition-all">
              {/* Decorative ambient background glows */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

              <div className="relative p-5 sm:p-6 space-y-4">
                {/* Top Row: School Badge & Identity */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    {/* Logo / Crest frame */}
                    <div className="relative group flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-inner overflow-hidden">
                        {school.logoUrl ? (
                          <img
                            src={school.logoUrl}
                            alt={school.name}
                            className="w-full h-full object-contain rounded-xl bg-white"
                          />
                        ) : (
                          <div className="w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex flex-col items-center justify-center text-slate-950 font-black shadow">
                            <Building2 className="w-6 h-6 text-slate-950 mb-0.5" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              {(school.name || "SC").slice(0, 3)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        title="Change Logo"
                        className="absolute -bottom-1 -right-1 p-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow text-[10px] border border-white/40"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* School titles, code & affiliation */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-sm truncate">
                          {school.name || "Institutional Campus"}
                        </h2>
                        {school.code && (
                          <span className="px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-[11px] font-mono font-semibold tracking-wide text-blue-200">
                            CODE: {school.code}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[11px] font-medium text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Institute
                        </span>
                      </div>

                      {/* Tagline / Motto */}
                      {school.tagline ? (
                        <p className="text-xs sm:text-sm text-blue-200/90 italic mt-1 font-serif line-clamp-2">
                          &ldquo;{school.tagline}&rdquo;
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-xs text-blue-300/70 hover:text-blue-200 italic mt-1 flex items-center gap-1 group"
                        >
                          <Plus className="w-3 h-3 text-blue-300" />
                          <span>Add school motto / tagline</span>
                        </button>
                      )}

                      {/* Affiliation / Board & Session row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {school.affiliation ? (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-400/15 border border-amber-400/30 text-amber-200 px-2.5 py-0.5 rounded-full font-medium">
                            <Award className="w-3.5 h-3.5 text-amber-300" />
                            {school.affiliation}
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowFullSchoolProfileEditor(true)}
                            className="inline-flex items-center gap-1 text-[11px] bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 px-2.5 py-0.5 rounded-full"
                          >
                            <Plus className="w-3 h-3 text-amber-300" /> Add Board / Affiliation
                          </button>
                        )}

                        {activeSession && (
                          <span className="inline-flex items-center gap-1 text-xs bg-blue-500/20 border border-blue-400/30 text-blue-200 px-2.5 py-0.5 rounded-full font-medium">
                            <Calendar className="w-3.5 h-3.5 text-blue-300" />
                            Session: {activeSession.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary Direct Action Buttons */}
                  <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 pt-1 sm:pt-0">
                    <button
                      onClick={() => setShowFullSchoolProfileEditor(true)}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-900/40 border border-blue-400/30 active:scale-95 transition-all"
                    >
                      <Edit3 className="w-4 h-4 text-white" />
                      <span>Edit School Details</span>
                    </button>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold border border-white/20 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Add Details</span>
                      </button>
                      <button
                        onClick={() => setShowDigitalSignatureModal(true)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white rounded-xl text-xs font-bold border border-amber-400/30 transition-all cursor-pointer shadow-xs"
                        title="Screen pe Principal aur Director ke signatures karein"
                      >
                        <PenTool className="w-3.5 h-3.5 text-amber-300" />
                        <span>✍️ Signatures</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Key Institutional Details Matrix */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/10 text-xs text-slate-200">
                  {/* Address */}
                  <div className="flex items-start gap-2.5 bg-white/5 hover:bg-white/10 rounded-xl p-2.5 border border-white/5 transition-colors">
                    <MapPin className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Campus Address</div>
                      {school.address ? (
                        <p className="font-medium text-white line-clamp-2 leading-relaxed">{school.address}</p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-blue-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add school address
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Contact / Helpline */}
                  <div className="flex items-start gap-2.5 bg-white/5 hover:bg-white/10 rounded-xl p-2.5 border border-white/5 transition-colors">
                    <Phone className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Helpline &amp; Contact</div>
                      {school.mobile || school.phone ? (
                        <p className="font-medium text-white truncate leading-relaxed">
                          {school.mobile || school.phone}
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-emerald-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add phone / mobile
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Leadership: Principal */}
                  <div className="flex items-start gap-2.5 bg-white/5 hover:bg-white/10 rounded-xl p-2.5 border border-white/5 transition-colors">
                    <GraduationCap className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Principal / Head</span>
                        {school.principalSignatureUrl ? (
                          <span className="text-[9.5px] bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded font-bold">✍️ Sign OK</span>
                        ) : (
                          <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-amber-300 hover:underline font-bold">+ Add Sign</button>
                        )}
                      </div>
                      {school.principalName ? (
                        <p className="font-medium text-white truncate leading-relaxed">
                          {school.principalName}
                          {school.principalPhone && (
                            <span className="text-[11px] text-slate-300 font-normal ml-1">({school.principalPhone})</span>
                          )}
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-amber-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add Principal Name
                        </button>
                      )}
                      {school.principalSignatureUrl && (
                        <div className="mt-1 flex items-center gap-2">
                          <img src={school.principalSignatureUrl} alt="Principal Signature" className="h-4 max-w-[70px] object-contain bg-white/90 rounded px-1" />
                          <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-blue-300 hover:underline">Change</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Email / Director */}
                  <div className="flex items-start gap-2.5 bg-white/5 hover:bg-white/10 rounded-xl p-2.5 border border-white/5 transition-colors">
                    <Mail className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Email / Director</span>
                        {school.directorSignatureUrl ? (
                          <span className="text-[9.5px] bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded font-bold">✍️ Sign OK</span>
                        ) : school.directorName ? (
                          <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-sky-300 hover:underline font-bold">+ Add Sign</button>
                        ) : null}
                      </div>
                      {school.email || school.directorName ? (
                        <p className="font-medium text-white truncate leading-relaxed">
                          {school.email || school.directorName}
                          {school.directorPhone && (
                            <span className="text-[11px] text-slate-300 font-normal ml-1">({school.directorPhone})</span>
                          )}
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-sky-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium"
                        >
                          <Plus className="w-3 h-3" /> Add official email
                        </button>
                      )}
                      {school.directorSignatureUrl && (
                        <div className="mt-1 flex items-center gap-2">
                          <img src={school.directorSignatureUrl} alt="Director Signature" className="h-4 max-w-[70px] object-contain bg-white/90 rounded px-1" />
                          <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-blue-300 hover:underline">Change</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Custom Fields Chips (UDISE, Reg No, Medium, etc. if any) */}
                {Array.isArray(school.customFields) && school.customFields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {school.customFields.filter(f => f.label && f.value).map((f, i) => (
                      <span key={`custom-field-${f.label}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 border border-white/10 text-[11px] text-blue-100 font-mono">
                        <span className="font-semibold text-slate-300">{f.label}:</span>
                        <span>{f.value}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer Action Bar: Website & Quick inline details */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setView("public_website")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Live Public Website</span>
                    </button>
                    <button
                      onClick={() => setShowFullSchoolProfileEditor(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Print Header Settings</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (!schoolCardExpanded) openEditSchoolInfo();
                      setSchoolCardExpanded(p => !p);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors"
                  >
                    <span>{schoolCardExpanded ? "Hide Quick Inline Edit" : "Fast Inline Edit"}</span>
                    {schoolCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Fast Inline Edit Drawer (optional expand) */}
                {schoolCardExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/15 bg-black/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">⚡ Quick Field Update</p>
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-xs text-blue-300 hover:underline flex items-center gap-1 font-medium"
                      >
                        <Sparkles className="w-3 h-3" /> Open Full Editor with Logo &amp; Print Header
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        ["principalName", "Principal Name", "text"],
                        ["principalPhone", "Principal Mobile Number", "tel"],
                        ["directorName",  "Director / Manager Name", "text"],
                        ["mobile",        "Helpline / Mobile Number", "tel"],
                        ["address",       "Campus Address", "text"],
                        ["tagline",       "School Tagline / Motto", "text"],
                      ].map(([k, lbl, t], idx) => (
                        <div key={`school-info-field-${k}-${idx}`}>
                          <label className="text-[11px] text-slate-300 mb-1 block">{lbl}</label>
                          <input
                            type={t}
                            value={(schoolInfoForm as any)[k] ?? ""}
                            onChange={e => setSchoolInfoForm(p => ({ ...p, [k]: e.target.value }))}
                            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                            placeholder={lbl}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={saveSchoolInfo}
                        disabled={savingSchoolInfo}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-60 shadow"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingSchoolInfo ? "Saving..." : "Save Quick Updates"}
                      </button>
                      <button
                        onClick={() => setSchoolCardExpanded(false)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── LOCK CODE CARD ─────────────────────────────────────── */}
          {school && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4 border border-slate-100 dark:border-slate-700 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white">School Lock Code</h3>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${lockCodeActive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {lockCodeActive ? '🔒 Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Jab active hoga, students ko school join karne ke liye yeh code enter karna padega. Sirf aap aur super admin ko pata rahega.</p>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockCodeActive}
                  onChange={e => setLockCodeActive(e.target.checked)}
                  className="w-4 h-4 accent-amber-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-200 font-medium">Lock Code Enable Karo</span>
              </label>

              <div className="relative">
                <label className="text-xs text-slate-500 mb-1 block">Lock Code</label>
                <input
                  type={showLockCode ? "text" : "password"}
                  placeholder="Apna secret code likhiye"
                  value={lockCodeInput}
                  onChange={e => setLockCodeInput(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLockCode(!showLockCode)}
                  className="absolute right-3 top-7 text-slate-400 hover:text-slate-600"
                >
                  {showLockCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={saveLockCode}
                disabled={savingLockCode}
                className={`w-full py-2 rounded-lg text-sm font-bold transition-all ${lockCodeSaved ? 'bg-green-500 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'} disabled:opacity-60`}
              >
                {savingLockCode ? 'Saving...' : lockCodeSaved ? '✓ Saved!' : 'Lock Code Save Karo'}
              </button>
            </div>
          )}

          {/* ── SUB-ADMIN MANAGEMENT ──────────────────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4 border border-slate-100 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              <h3 className="font-semibold text-slate-800 dark:text-white">Sub-Admin Manage Karo</h3>
            </div>
            <p className="text-xs text-slate-400">
              Apne school ke kisi trusted member ko sub-admin banao — woh bhi content, classes, students manage kar sakta hai.
            </p>

            {/* Existing sub-admins list */}
            {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').length > 0 && (
              <div className="space-y-2">
                {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').map((p, idx) => (
                  <div key={p.uid || p.email || `subadmin-${idx}`} className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl px-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-purple-200 dark:bg-purple-700 flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-200 flex-shrink-0">
                      {(p.name || p.email).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveSubAdmin(p.uid)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Remove sub-admin"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Assign new sub-admin */}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Sub-Admin ka Email (IIC app wala)</label>
              <input
                type="email"
                placeholder="subadmin@example.com"
                value={subAdminEmail}
                onChange={e => { setSubAdminEmail(e.target.value); setSubAdminResult(null); }}
                className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm"
              />
            </div>
            {subAdminResult && (
              <div className={`text-xs px-3 py-2 rounded-lg font-medium ${subAdminResult.ok ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
                {subAdminResult.msg}
              </div>
            )}
            <button
              onClick={handleAssignSubAdmin}
              disabled={assigningSubAdmin || !subAdminEmail.trim()}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {assigningSubAdmin ? 'Searching...' : '👥 Sub-Admin Banao'}
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Total Students</p>
              <p className="text-2xl font-bold text-blue-500">{students.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Total Teachers</p>
              <p className="text-2xl font-bold text-green-500">{teachers.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Classes</p>
              <p className="text-2xl font-bold text-purple-500">{classes.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">Sessions</p>
              <p className="text-2xl font-bold text-orange-500">{sessions.length}</p>
            </div>
          </div>

          {/* ── Plan timer card ─────────────────────────────── */}
          {school && (() => {
            const expIso = school.subscription.expiresAt || school.subscription.paidUntil;
            const daysLeft = expIso
              ? Math.ceil((new Date(expIso).getTime() - Date.now()) / 86400000)
              : null;
            const isExpired = daysLeft !== null && daysLeft <= 0;
            const warnSoon  = daysLeft !== null && !isExpired && daysLeft <= 7;
            const warnMid   = daysLeft !== null && !isExpired && daysLeft <= 30;
            const planLabel = subTier === "full" ? "Pro Plan" : subTier === "lite" ? "Lite Plan" : "School Plan";
            const tierColor = subTier === "full"
              ? { bg: "from-amber-500 to-orange-500", light: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" }
              : subTier === "lite"
              ? { bg: "from-blue-500 to-indigo-600", light: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" }
              : { bg: "from-slate-400 to-slate-500", light: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700", badge: "bg-slate-100 text-slate-500" };
            const timerColor = isExpired || !subscriptionActive
              ? "text-red-600 dark:text-red-400"
              : warnSoon ? "text-red-500"
              : warnMid  ? "text-amber-600 dark:text-amber-400"
              : "text-green-600 dark:text-green-400";

            return (
              <div className={`rounded-2xl border p-4 mb-4 shadow-sm ${isExpired || !subscriptionActive ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : tierColor.light}`}>
                <div className="flex items-center gap-3">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierColor.bg} flex items-center justify-center shrink-0 shadow`}>
                    {subTier === "full" ? <Crown className="w-6 h-6 text-white" /> : subTier === "lite" ? <Shield className="w-6 h-6 text-white" /> : <Lock className="w-6 h-6 text-white" />}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-base text-slate-800 dark:text-white">{planLabel}</span>
                      {subscriptionActive && !isExpired
                        ? <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✅ Active</span>
                        : <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{isExpired ? "❌ Expired" : "❌ Inactive"}</span>
                      }
                    </div>
                    {daysLeft !== null && (
                      <p className={`text-sm font-black mt-0.5 ${timerColor}`}>
                        {isExpired
                          ? `${Math.abs(daysLeft)} din pehle expire hua`
                          : warnSoon
                          ? `⚠️ Sirf ${daysLeft} din baaki!`
                          : `${daysLeft} din baaki`
                        }
                      </p>
                    )}
                    {expIso && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isExpired ? "Expired" : "Valid till"}: {new Date(expIso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </div>
                  {/* View plan button */}
                  <button onClick={() => setView("subscription")} className={`shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-xl ${tierColor.badge} flex items-center gap-1`}>
                    <Crown className="w-3 h-3" /> Plan
                  </button>
                </div>

                {/* Day progress bar */}
                {daysLeft !== null && !isExpired && subscriptionActive && school.subscription.assignedAt && (() => {
                  const totalDays = Math.ceil((new Date(expIso!).getTime() - new Date(school.subscription.assignedAt!).getTime()) / 86400000);
                  const pct = totalDays > 0 ? Math.max(0, Math.min(100, Math.round((daysLeft / totalDays) * 100))) : 0;
                  return (
                    <div className="mt-3">
                      <div className="h-1.5 bg-white/60 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${warnSoon ? "bg-red-500" : warnMid ? "bg-amber-500" : "bg-green-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{pct}% time remaining</p>
                    </div>
                  );
                })()}

                {/* Feature chips (Pro only) */}
                {subscriptionActive && subTier === "full" && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {school.subscription.reading && <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold">📖 Reading</span>}
                    {school.subscription.writing && <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 text-purple-700 dark:text-purple-300 rounded-full text-[10px] font-bold">✏️ Writing</span>}
                    {school.subscription.pdf     && <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 text-orange-700 dark:text-orange-300 rounded-full text-[10px] font-bold">📄 PDF</span>}
                    {school.subscription.mcq     && <span className="px-2 py-0.5 bg-white/60 dark:bg-slate-700/60 text-green-700 dark:text-green-300 rounded-full text-[10px] font-bold">❓ MCQ</span>}
                  </div>
                )}
                {/* Lite info */}
                {subscriptionActive && subTier === "lite" && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Student data management active. Content ke liye Pro Plan lo.</p>
                )}
                {/* Expired info */}
                {(!subscriptionActive || isExpired) && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">Plan expire ho gaya — data entry aur content editing band hai. Super Admin se renew karao.</p>
                )}
              </div>
            );
          })()}

          {/* Menu */}
          <div className="space-y-2">
            {menuItems.map((item, idx) => (
              <button key={item.view || `menu-item-${item.label}-${idx}`} onClick={() => setView(item.view as AdminView)}
                className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition-shadow text-left">
                {item.icon}
                <span className="flex-1 font-medium text-slate-800 dark:text-white">{item.label}</span>
                {item.count !== null && <span className="text-sm text-slate-400">{item.count}</span>}
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize">{view.replace("_", " ")}</p>
          </div>
          {renderListView()}
        </div>
      )}

      {/* ── 48-HOUR EXPIRY WARNING POPUP ─────────────────────────── */}
      {showExpiryPopup && school && (() => {
        const expIso = school.subscription?.expiresAt || school.subscription?.paidUntil;
        const msLeft = expIso ? new Date(expIso).getTime() - Date.now() : 0;
        const hoursLeft = Math.ceil(msLeft / 3600000);
        const daysLeft  = Math.ceil(msLeft / 86400000);
        return (
          <div className="fixed inset-0 z-[9999] flex items-end justify-center p-4 pb-8" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
            <div className={`w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden ${expiryPopupExpired ? 'bg-red-600' : 'bg-amber-500'}`}>
              {/* Top accent strip */}
              <div className="px-5 pt-6 pb-4 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 text-3xl">
                    {expiryPopupExpired ? '❌' : '⚠️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-black leading-tight">
                      {expiryPopupExpired
                        ? 'Subscription Expire Ho Gaya!'
                        : hoursLeft <= 24
                        ? `Sirf ${hoursLeft} Ghante Baaki!`
                        : `Sirf ${daysLeft} Din Baaki!`}
                    </h2>
                    <p className="text-sm text-white/80 mt-1 leading-snug">
                      {expiryPopupExpired
                        ? 'Aapka school plan khatam ho gaya hai. Sabhi features band ho gaye hain. Super Admin se turant renew karao.'
                        : 'Aapka subscription jald hi khatam hone wala hai. Expire hone ke baad sab features band ho jayenge. Super Admin se abhi renew karao.'}
                    </p>
                  </div>
                </div>

                {expIso && (
                  <div className="mt-4 bg-white/15 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                        {expiryPopupExpired ? 'Expire Hua' : 'Expire Hoga'}
                      </p>
                      <p className="text-sm font-black">
                        {new Date(expIso).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Plan</p>
                      <p className="text-sm font-black">
                        {school.subscription.tier === 'full' ? '⭐ Pro' : school.subscription.tier === 'lite' ? '📦 Lite' : '🏫 School'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="bg-white dark:bg-slate-900 px-5 py-4 flex flex-col gap-2.5">
                <button
                  onClick={() => { setShowExpiryPopup(false); setView("subscription"); }}
                  className={`w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${expiryPopupExpired ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                >
                  <Crown className="w-4 h-4" />
                  {expiryPopupExpired ? 'Plan Renew Karo' : 'Plan Dekho / Renew Karo'}
                </button>
                <button
                  onClick={() => setShowExpiryPopup(false)}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Baad Mein
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Class QR Attendance Modal */}
      {qrModalClass && (
        <ClassQrCodeModal
          isOpen={!!qrModalClass}
          onClose={() => setQrModalClass(null)}
          schoolId={schoolId}
          schoolName={school?.name || "School"}
          classId={qrModalClass.id}
          className={qrModalClass.name}
          totalStudents={students.filter(s => s.classId === qrModalClass.id).length}
        />
      )}
      {school && showFullSchoolProfileEditor && (
        <SchoolHeaderEditorModal
          isOpen={showFullSchoolProfileEditor}
          onClose={() => setShowFullSchoolProfileEditor(false)}
          school={school}
          schoolId={schoolId}
          currentDetails={{
            schoolName: school.name || "",
            tagline: school.tagline || "",
            affiliation: school.affiliation || "",
            address: school.address || "",
            phone: school.mobile || school.phone || "",
            email: school.email || "",
            logoUrl: school.logoUrl || "",
            principalName: school.principalName || "",
            principalTitle: "Principal / Head of Institution",
            code: school.code || "",
            principalPhone: school.principalPhone || "",
            directorName: school.directorName || "",
            directorPhone: school.directorPhone || "",
            principalSignatureUrl: school.principalSignatureUrl || "",
            directorSignatureUrl: school.directorSignatureUrl || "",
            customFields: school.customFields || [],
            documentPrintFields: school.documentPrintFields || {},
          }}
          onApply={(details: SchoolHeaderDetails) => {
            setSchool(previous => previous ? {
              ...previous,
              name: details.schoolName,
              tagline: details.tagline,
              affiliation: details.affiliation,
              address: details.address,
              phone: details.phone,
              mobile: details.phone,
              email: details.email,
              logoUrl: details.logoUrl,
              principalName: details.principalName,
              principalPhone: details.principalPhone,
              directorName: details.directorName,
              directorPhone: details.directorPhone,
              principalSignatureUrl: details.principalSignatureUrl,
              directorSignatureUrl: details.directorSignatureUrl,
              code: details.code,
              customFields: details.customFields,
              documentPrintFields: details.documentPrintFields,
            } : previous);
          }}
        />
      )}
      {school && showDigitalSignatureModal && (
        <DigitalSignatureModal
          isOpen={showDigitalSignatureModal}
          onClose={() => setShowDigitalSignatureModal(false)}
          school={school}
          schoolId={schoolId}
          onSignaturesUpdated={updated => {
            setSchool(prev => prev ? {
              ...prev,
              principalSignatureUrl: updated.principalSignatureUrl !== undefined ? updated.principalSignatureUrl : prev.principalSignatureUrl,
              directorSignatureUrl: updated.directorSignatureUrl !== undefined ? updated.directorSignatureUrl : prev.directorSignatureUrl,
            } : prev);
          }}
        />
      )}
      <StudentQuickActionModal
        isOpen={Boolean(quickActionStudent)}
        onClose={() => setQuickActionStudent(null)}
        student={quickActionStudent}
        school={school}
        classes={classes}
        currentMonth={feeMonth || currentMonthStr()}
        adminUid={adminUid}
        initialTab={quickActionInitialTab}
      />
    </div>
  );
};
