// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  subscribeToSessions, subscribeToClasses, subscribeToSubjects, subscribeToTeachers,
  subscribeToAllStudents, saveSession, saveClass, saveSubject, saveMultipleSubjects, saveTeacher, saveStudent,
  deleteClass, deleteSubject, deleteTeacher, deleteStudent, updateStudent, deleteSession,
  updateSchool, updateSession, updateClass, updateTeacher,
  generateId, getSchool, getSessions, setSchoolLockCode,
  assignSchoolSubAdminByEmail, getSchoolAdmins, removeSchoolUserByUid,
  getAllMonthlyFees, currentMonthStr, saveFee, markFeePaid, isStudentInClass, isDemoRecord,
  shouldUseDemoForSchool
} from "../../school-firebase";
import { COMMON_BOOK_PRESETS, PRESET_BOOK_BUNDLES } from "./TeacherPanel";
import type { SchoolUserProfile } from "../../school-types";
import type {
  School, SchoolSession, SchoolClass, SchoolSubject, SchoolTeacher, SchoolStudent
} from "../../school-types";
import {
  BLOOD_GROUPS, getSchoolMaxStudents, getSchoolMaxTeachers, TIER_CONFIG,
  SeniorStream, SENIOR_STREAMS, isSeniorClass, getDefaultSubjectsForClass, sortSchoolClasses
} from "../../school-types";
import { DEMO_SESSION_ID, seedDemoSchoolData } from "./demoSchoolData";
import { isDemoDataEnabled, setDemoDataEnabled } from "./demoDataStore";
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
import { HolidayManager } from "./HolidayManager";
import { SchoolReportsHub } from "./SchoolReportsHub";
import { PublicSchoolWebsite } from "./PublicSchoolWebsite";
import { OnlineAdmissionManager } from "./OnlineAdmissionManager";
import { getStaffEmployees, saveStaffEmployee } from "../../school-firebase";
import type { MonthlyFee, StaffEmployee } from "../../school-types";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { DigitalSignatureModal } from "./DigitalSignatureModal";
import { getSavedSchoolLogo, isAppLogo, cleanLogoUrl } from "./feeReceiptUtils";
import { TimetableManager } from "./TimetableManager";
import { ClassroomVideoArchive } from "./ClassroomVideoArchive";
import { HomeworkManager } from "./HomeworkManager";
import { LibraryManager } from "./LibraryManager";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";
import { InventoryStoreManager } from "./InventoryStoreManager";
import { TeacherIdCardModal } from "./TeacherIdCardModal";
import { SchoolCommunityFeed } from "./SchoolCommunityFeed";
import { SchoolMessengerBroadcastStudio } from "./SchoolMessengerBroadcastStudio";
import { NstaMessengerSuite } from "./NstaMessengerSuite";
import { AbsenteeActionPage } from "./AbsenteeActionPage";
import {
  Users, BookOpen, Calendar, IndianRupee, Plus, Trash2, Settings,
  ChevronRight, ChevronLeft, X, Edit3, FileText, Award,
  MapPin, Phone, User, ChevronDown, ChevronUp, Save, Building2,
  Lock, Eye, EyeOff, Shield, ArrowLeft, ShoppingBag, AlertTriangle, Crown,
  CreditCard, Megaphone, TrendingUp, Briefcase, FileSpreadsheet,
  ClipboardList, Globe, UserPlus, QrCode, GraduationCap, CheckCircle2,
  Printer, Search, Sparkles, Mail, PenTool, Loader2, AlertCircle, LogOut,
  Home, Image as ImageIcon, Clock, Book, Package, MessageSquare, Bell, ArrowRight,
  Youtube, Check
} from "lucide-react";
import { SchoolStore } from "./SchoolStore";
import { SchoolPlanView } from "./SchoolPlanView";
import { ClassQrCodeModal } from "./ClassQrCodeModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { ClassFeeStructureSection } from "./ClassFeeStructureSection";
import { DirectAdmissionModal } from "./DirectAdmissionModal";
import { AdmissionFormPrintModal } from "./AdmissionFormPrintModal";

interface Props {
  schoolId: string;
  adminUid: string;
  onBack?: () => void;
  onOpenPlatformContent?: () => void;
  onLogout?: () => void;
  onPreviewTeacher?: () => void;
  onPreviewStudent?: () => void;
}

type AdminView =
  | "dashboard"
  | "community"
  | "absentee"
  | "sessions" | "classes" | "subjects" | "teachers" | "students"
  | "content" | "attendance" | "fees" | "fee_class" | "fee_all" | "fee_structure" | "report_card" | "marks" | "results"
  | "store" | "subscription"
  | "id_cards" | "admit_cards" | "certificates" | "marksheet_hub" | "promotion" | "notices" | "holidays" | "staff_hrm" | "reports_hub"
  | "public_website" | "online_admissions"
  | "timetable" | "homework" | "library" | "parent_queries" | "inventory_store";


export const SchoolAdminPanel: React.FC<Props> = ({ schoolId, adminUid, onBack, onLogout, onPreviewTeacher, onPreviewStudent }) => {
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
  const [lockCodeDrawerOpen, setLockCodeDrawerOpen] = useState(false);

  const handlePerformLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      try {
        localStorage.removeItem('nst_current_user');
        localStorage.removeItem('nsta_cached_user');
        localStorage.setItem('nst_logged_out', 'true');
        window.location.reload();
      } catch {}
    }
  };

  // Sub-admin management
  const [subAdmins, setSubAdmins]             = useState<SchoolUserProfile[]>([]);
  const [subAdminEmail, setSubAdminEmail]     = useState('');
  const [assigningSubAdmin, setAssigningSubAdmin] = useState(false);
  const [subAdminResult, setSubAdminResult]   = useState<{ ok: boolean; msg: string } | null>(null);
  const [subAdminExpanded, setSubAdminExpanded] = useState(false);
  const [quickActionStudent, setQuickActionStudent] = useState<SchoolStudent | null>(null);
  const [quickActionInitialTab, setQuickActionInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");
  const [selectedTeacherForIdCard, setSelectedTeacherForIdCard] = useState<SchoolTeacher | StaffEmployee | null>(null);

  // Forms
  const [sessionForm, setSessionForm] = useState({ name: "", startDate: "", endDate: "" });
  const [classForm, setClassForm] = useState({ name: "", section: "", stream: "Science", autoAddSubjects: true, defaultFee: 0 });
  const [subjectForm, setSubjectForm] = useState({ name: "" });
  const [multiBookQueue, setMultiBookQueue] = useState<string[]>([]);
  const [customMultiBooksText, setCustomMultiBooksText] = useState("");
  const [savingMultiBooks, setSavingMultiBooks] = useState(false);
  const [teacherForm, setTeacherForm] = useState({
    name: "",
    phone: "",
    photoUrl: "",
    designation: "Senior Faculty",
    qualification: "",
    experience: "",
    subjects: "",
    bio: "",
    employeeId: "",
    email: "",
  });
  const [studentForm, setStudentForm] = useState<any>({
    name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "",
    phone: "", dateOfBirth: "", monthlyFee: 0, bloodGroup: ""
  });
  const [showForm, setShowForm] = useState<string | null>(null);

  // Edit states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionForm, setEditSessionForm] = useState({ name: "", startDate: "", endDate: "" });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassForm, setEditClassForm] = useState({ name: "", section: "", stream: "", defaultFee: 0 });
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editTeacherForm, setEditTeacherForm] = useState({
    name: "",
    phone: "",
    photoUrl: "",
    designation: "",
    qualification: "",
    experience: "",
    subjects: "",
    bio: "",
    employeeId: "",
    email: "",
  });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentForm, setEditStudentForm] = useState<any>({
    name: "", rollNo: "", admissionNo: "", fatherName: "", motherName: "",
    phone: "", dateOfBirth: "", monthlyFee: 0, photoUrl: "", bloodGroup: "",
    gender: "", category: "", aadhaarNo: "", address: ""
  });
  const [showDirectAdmissionModal, setShowDirectAdmissionModal] = useState(false);
  const [admissionPrintPayload, setAdmissionPrintPayload] = useState<{
    student: SchoolStudent;
    fee?: MonthlyFee | null;
    mode?: "combined" | "form_only" | "receipt_only";
  } | null>(null);

  // Fee summary state
  const [feeMonth, setFeeMonth] = useState(currentMonthStr());
  const [allFees, setAllFees] = useState<MonthlyFee[]>([]);
  const [feeSummaryLoading, setFeeSummaryLoading] = useState(false);
  const [feeClassSelected, setFeeClassSelected] = useState<SchoolClass | null>(null);
  const [demoGenerating, setDemoGenerating] = useState(false);
  const [demoMessage, setDemoMessage] = useState("");
  const [demoEnabled, setDemoEnabled] = useState<boolean>(() => isDemoDataEnabled());

  useEffect(() => {
    const handleDemoChange = (e: any) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setDemoEnabled(e.detail.enabled);
      }
    };
    window.addEventListener("nst_demo_toggle_changed", handleDemoChange);
    return () => window.removeEventListener("nst_demo_toggle_changed", handleDemoChange);
  }, []);

  const handleToggleDemoData = (val: boolean) => {
    setDemoDataEnabled(val);
    setDemoEnabled(val);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  const isDefaultDemoSchool = schoolId === "dps_gurgaon_sector45" || schoolId === "demo_school";
  const schoolDemoActive = demoEnabled && shouldUseDemoForSchool(schoolId);

  const displayedStudents = React.useMemo(() => {
    return schoolDemoActive ? students : students.filter(s => !isDemoRecord(s));
  }, [students, schoolDemoActive]);

  const displayedClasses = React.useMemo(() => {
    return schoolDemoActive ? classes : classes.filter(c => !isDemoRecord(c));
  }, [classes, schoolDemoActive]);

  const displayedTeachers = React.useMemo(() => {
    return schoolDemoActive ? teachers : teachers.filter(t => !isDemoRecord(t));
  }, [teachers, schoolDemoActive]);

  const displayedSessions = React.useMemo(() => {
    return schoolDemoActive ? sessions : sessions.filter(s => !isDemoRecord(s));
  }, [sessions, schoolDemoActive]);

  // Advanced Class Card states
  const [expandedToolsClassId, setExpandedToolsClassId] = useState<string | null>(null);
  const [classSearchQuery, setClassSearchQuery] = useState("");
  const [qrModalClass, setQrModalClass] = useState<SchoolClass | null>(null);

  // Class preset names ordered strictly from Nursery to 12
  const CLASS_PRESETS = [
    "Nursery", "LKG", "UKG",
    "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
    "Class 6", "Class 7", "Class 8", "Class 9", "Class 10",
    "Class 11", "Class 12", "Play"
  ];

  // 1-second live ticker for 48h live countdown and instant lockout on 00:00:00
  const [nowTick, setNowTick] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Online Admission Notification alerts for School Admin
  const [admissionAlerts, setAdmissionAlerts] = useState<any[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`school_admission_alerts_${schoolId}`) || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const handleNewAdmission = () => {
      try {
        const list = JSON.parse(localStorage.getItem(`school_admission_alerts_${schoolId}`) || "[]");
        setAdmissionAlerts(list);
      } catch {}
    };
    window.addEventListener("school-admission-alert", handleNewAdmission);
    return () => window.removeEventListener("school-admission-alert", handleNewAdmission);
  }, [schoolId]);

  // 48-hour expiry warning — shown once per login session
  useEffect(() => {
    if (!school) return;
    const sessionKey = `iic_expiry_warned_${schoolId}`;
    if (sessionStorage.getItem(sessionKey)) return;
    const expIso = school.subscription?.expiresAt || school.subscription?.paidUntil || '2027-04-24T23:59:59.000Z';
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
    const handleSchoolUpdated = (e: any) => {
      const detail = e?.detail;
      if (detail?.schoolId && detail.schoolId !== schoolId) return;
      if (detail?.logoUrl !== undefined || detail?.data) {
        setSchool(prev => {
          if (!prev) return prev;
          const nextLogo = detail.logoUrl !== undefined ? detail.logoUrl : (detail?.data?.logoUrl || prev.logoUrl);
          return {
            ...prev,
            ...(detail?.data || {}),
            logoUrl: nextLogo,
          };
        });
      }
    };
    window.addEventListener("school-profile-updated", handleSchoolUpdated);
    return () => window.removeEventListener("school-profile-updated", handleSchoolUpdated);
  }, [schoolId]);

  useEffect(() => {
    if (!activeSession) return;
    const unsubClasses = subscribeToClasses(schoolId, activeSession.id, setClasses);
    return unsubClasses;
  }, [schoolId, activeSession]);

  useEffect(() => {
    // Only auto upgrade demo dataset if demo mode is active for the default demo school
    if (!schoolDemoActive) return;
    if (activeSession?.id === DEMO_SESSION_ID && classes.length > 0) {
      const hasOldSplit = classes.some(c => c.id.includes("_a") || c.id.includes("_b"));
      if (hasOldSplit && !demoGenerating) {
        seedDemoSchoolData(schoolId, adminUid).catch(err => console.warn("Auto demo upgrade:", err));
      }
    }
  }, [activeSession, classes, demoGenerating, schoolId, adminUid, schoolDemoActive]);

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
    const streamVal = isSeniorClass(classForm.name) ? (classForm.stream || "Science") : undefined;
    await saveClass({
      id, schoolId, sessionId: activeSession.id,
      name: classForm.name,
      section: classForm.section,
      stream: streamVal,
      defaultFee: Number(classForm.defaultFee) || 0,
      createdAt: new Date().toISOString()
    });

    // Auto-create pre-configured stream / grade subjects
    if (classForm.autoAddSubjects) {
      const defaultSubs = getDefaultSubjectsForClass(classForm.name, streamVal);
      if (defaultSubs && defaultSubs.length > 0) {
        const newSubs: SchoolSubject[] = defaultSubs.map(subName => ({
          id: generateId(),
          schoolId,
          sessionId: activeSession.id,
          classId: id,
          name: subName,
          stream: streamVal,
          createdAt: new Date().toISOString()
        }));
        await saveMultipleSubjects(newSubs);
      }
    }

    setClassForm({ name: "", section: "", stream: "Science", autoAddSubjects: true, defaultFee: 0 });
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

  const handleSaveBulkBooks = async () => {
    if (!selectedClass || !activeSession || multiBookQueue.length === 0) return;
    setSavingMultiBooks(true);
    try {
      const existingNames = new Set(subjects.map(s => (s.name || "").trim().toLowerCase()));
      const toAdd = multiBookQueue.filter(name => !existingNames.has(name.trim().toLowerCase()));
      if (toAdd.length === 0) {
        alert("Ye sabhi books pehle se is class me add hain!");
        setSavingMultiBooks(false);
        return;
      }
      const newSubs: SchoolSubject[] = toAdd.map(name => ({
        id: generateId(),
        schoolId,
        sessionId: activeSession.id,
        classId: selectedClass.id,
        className: selectedClass.name,
        name: name.trim(),
        createdAt: new Date().toISOString()
      }));
      await saveMultipleSubjects(newSubs);
      setSubjects(prev => [...prev, ...newSubs]);
      setMultiBookQueue([]);
      setCustomMultiBooksText("");
      setShowForm(null);
    } catch (err: any) {
      alert("Error adding books: " + (err?.message || "Please try again"));
    } finally {
      setSavingMultiBooks(false);
    }
  };

  const addTeacher = async () => {
    if (!teacherForm.name.trim()) return;
    const maxTeachers = getSchoolMaxTeachers(school);
    if (teachers.length >= maxTeachers) {
      const tierName = TIER_CONFIG[school?.subscription?.tier || 'starter_200']?.name || 'Starter Plan';
      alert(`⚠️ Faculty / Teacher Limit Reached (${teachers.length}/${maxTeachers})!\n\nAapka subscription plan (${tierName}) अधिकतम ${maxTeachers} faculty members tak seemit hai.\nNaye teachers add karne ke liye kripya Super Admin se agla plan upgrade karwayen.`);
      return;
    }
    setSaving(true);
    const id = generateId();
    const subArr = teacherForm.subjects
      ? String(teacherForm.subjects).split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];
    const empId = teacherForm.employeeId?.trim() || `TEA-${id.slice(-4).toUpperCase()}`;
    const cleanPhone = teacherForm.phone?.trim() || "";
    const newTeacher: SchoolTeacher = {
      id,
      schoolId,
      name: teacherForm.name.trim(),
      email: teacherForm.email?.trim() || undefined,
      phone: cleanPhone || undefined,
      photoUrl: teacherForm.photoUrl || undefined,
      designation: teacherForm.designation?.trim() || "Faculty Member",
      qualification: teacherForm.qualification?.trim() || undefined,
      experience: teacherForm.experience?.trim() || undefined,
      bio: teacherForm.bio?.trim() || undefined,
      employeeId: empId,
      subjects: subArr,
      classes: [],
      active: true,
      joinDate: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString()
    };
    await saveTeacher(newTeacher);

    // Also sync to staff employees so HRM and ID card systems are 100% in sync
    await saveStaffEmployee({
      id,
      schoolId,
      name: newTeacher.name,
      email: newTeacher.email || "",
      phone: cleanPhone,
      designation: newTeacher.designation || "Teacher",
      department: "Academic / Faculty",
      joinDate: newTeacher.joinDate,
      monthlySalary: 0,
      active: true,
      photoUrl: newTeacher.photoUrl,
      employeeId: empId,
      createdAt: newTeacher.createdAt
    });

    setTeacherForm({
      name: "",
      phone: "",
      photoUrl: "",
      designation: "Senior Faculty",
      qualification: "",
      experience: "",
      subjects: "",
      bio: "",
      employeeId: "",
      email: "",
    });
    setShowForm(null);
    setSaving(false);

    // Auto-open newly added teacher's ID card immediately!
    setSelectedTeacherForIdCard(newTeacher);
  };

  const addStudent = async () => {
    if (!studentForm.name.trim() || !selectedClass || !activeSession) return;
    const maxStudents = getSchoolMaxStudents(school);
    if (students.length >= maxStudents) {
      const tierName = TIER_CONFIG[school?.subscription?.tier || 'starter_200']?.name || 'Starter Plan';
      alert(`⚠️ Student Capacity Limit Reached (${students.length}/${maxStudents})!\n\nAapka vartaman subscription plan (${tierName}) अधिकतम ${maxStudents} students tak seemit hai.\nNaye bacchon ko add karne ke liye kripya Super Admin se agla tier upgrade karwayen.`);
      return;
    }
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
    const streamVal = isSeniorClass(editClassForm.name) ? (editClassForm.stream || previousClass?.stream || "Science") : undefined;
    await updateClass(schoolId, editingClassId, {
      name: editClassForm.name.trim(),
      section: editClassForm.section,
      stream: streamVal,
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

  const handleDeleteSession = async (session: SchoolSession) => {
    if (sessions.length <= 1) {
      setDemoMessage("⚠️ Aap aakhiri session delete nahi kar sakte. School me kam se kam ek academic session hona zaroori hai.");
      return;
    }

    setSaving(true);
    try {
      await deleteSession(schoolId, session.id);
      const remainingSessions = sessions.filter(s => s.id !== session.id);
      setSessions(remainingSessions);
      if (activeSession?.id === session.id && remainingSessions.length > 0) {
        await handleActivateSession(remainingSessions[0]);
      }
    } catch (err) {
      console.error("Error deleting session:", err);
      setDemoMessage("⚠️ Session delete karne me samasya aayi.");
    } finally {
      setSaving(false);
    }
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
    const subArr = typeof editTeacherForm.subjects === "string"
      ? editTeacherForm.subjects.split(",").map((s: string) => s.trim()).filter(Boolean)
      : (Array.isArray(editTeacherForm.subjects) ? editTeacherForm.subjects : []);
    const cleanPhone = editTeacherForm.phone?.trim() || "";
    const cleanEmpId = editTeacherForm.employeeId?.trim() || undefined;

    await updateTeacher(schoolId, editingTeacherId, {
      name: editTeacherForm.name.trim(),
      email: editTeacherForm.email?.trim() || undefined,
      phone: cleanPhone || undefined,
      photoUrl: editTeacherForm.photoUrl || undefined,
      designation: editTeacherForm.designation?.trim() || undefined,
      qualification: editTeacherForm.qualification?.trim() || undefined,
      experience: editTeacherForm.experience?.trim() || undefined,
      bio: editTeacherForm.bio?.trim() || undefined,
      employeeId: cleanEmpId,
      subjects: subArr,
    });

    await saveStaffEmployee({
      id: editingTeacherId,
      schoolId,
      name: editTeacherForm.name.trim(),
      email: editTeacherForm.email?.trim() || "",
      phone: cleanPhone,
      designation: editTeacherForm.designation?.trim() || "Teacher",
      department: "Academic / Faculty",
      joinDate: new Date().toISOString().split("T")[0],
      monthlySalary: 0,
      active: true,
      photoUrl: editTeacherForm.photoUrl || undefined,
      employeeId: cleanEmpId || `TEA-${editingTeacherId.slice(-4).toUpperCase()}`,
      createdAt: new Date().toISOString()
    });

    setEditingTeacherId(null);
    setSaving(false);
  };

  const saveEditStudent = async () => {
    if (!editingStudentId || !editStudentForm.name.trim()) return;
    setSaving(true);
    const newPhoto = editStudentForm.photoUrl || "";
    await updateStudent(schoolId, editingStudentId, {
      name: editStudentForm.name.trim(),
      rollNo: editStudentForm.rollNo,
      admissionNo: editStudentForm.admissionNo || undefined,
      fatherName: editStudentForm.fatherName,
      motherName: editStudentForm.motherName,
      phone: editStudentForm.phone,
      dateOfBirth: editStudentForm.dateOfBirth || undefined,
      gender: editStudentForm.gender || undefined,
      category: editStudentForm.category || undefined,
      aadhaarNo: editStudentForm.aadhaarNo || undefined,
      address: editStudentForm.address || undefined,
      bloodGroup: editStudentForm.bloodGroup || "",
      monthlyFee: Number(editStudentForm.monthlyFee) || 0,
      photoUrl: newPhoto || undefined,
    });
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
  const subStatus  = school?.subscription?.status || "active";
  const subTier    = school?.subscription?.tier || "full";
  const _expiresAt = school?.subscription?.expiresAt || school?.subscription?.paidUntil || '2027-04-24T23:59:59.000Z';
  const planExpired = _expiresAt ? new Date(_expiresAt).getTime() <= nowTick : false;
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
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold cursor-pointer"
            >
              Back to dashboard
            </button>
          </>
        )}
      </div>
    );
  }

  // ── Store view (always accessible so admin can purchase/upgrade) ──────────
  if (view === "store" && school) {
    return <SchoolStore school={school} onBack={() => setView("dashboard")} />;
  }

  // ── School Plan view (always accessible so admin can check details) ───────
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

  // ── COMPLETE SUBSCRIPTION EXPIRED LOCKOUT SCREEN ──────────────────────────
  // If subscription has expired (00:00:00 reached), completely lock all access
  if (planExpired && !isSuperAdmin) {
    const expiredFormattedDate = _expiresAt
      ? new Date(_expiresAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "24 April 2027";

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
        {/* Ambient red alert glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[34rem] h-[34rem] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-lg bg-slate-900/95 border-2 border-red-500/60 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-950/60 backdrop-blur-xl text-center space-y-6">
          {/* Animated Lock Icon */}
          <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
            <span className="absolute inset-0 rounded-3xl bg-red-500/20 animate-ping opacity-75" />
            <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-red-600 via-rose-700 to-red-800 flex items-center justify-center shadow-xl shadow-red-600/50 border border-red-400/50">
              <Lock className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-black uppercase tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Access Terminated · 00:00:00</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug">
              Subscription Expired
            </h1>
            <p className="text-base font-black text-red-400">
              सब कुछ लॉक हो गया (Complete Lockout)
            </p>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto pt-1">
              Aapke school ka subscription plan samapt ho chuka hai. Suraksha evam policy ke anusaar school ke sabhi modules (Students, Fees, Marksheet, Attendance, Notices) lock kar diye gaye hain. Kripya Super Admin se sampark karke plan renew karwayen.
            </p>
          </div>

          {/* School & Expiry Info Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">School Name:</span>
              <span className="font-bold text-white truncate max-w-[220px]">{school?.name || "School"}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">School Code / ID:</span>
              <span className="font-mono font-bold text-indigo-300">{school?.code || school?.id || schoolId}</span>
            </div>
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
              <span className="text-slate-400 font-medium">Plan Status:</span>
              <span className="font-bold text-red-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                EXPIRED ({subTier === "starter_200" || subTier === "lite" ? "Basic Plan (200 Students)" : subTier === "growth_500" ? "Standard Plan (500 Students)" : "Pro Plan (2000 Students)"})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Expired On:</span>
              <span className="font-bold text-red-400">{expiredFormattedDate}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={() => setView("subscription")}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition cursor-pointer"
            >
              <Crown className="w-4 h-4 text-white" />
              <span>Plan Details & Renew (प्लान रिन्यू कराएं)</span>
            </button>

            <button
              type="button"
              onClick={() => setView("store")}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Open Store & Plans</span>
            </button>

            <a
              href={`https://wa.me/918227070298?text=${encodeURIComponent(`Hello Super Admin, hamare school (${school?.name || "School"}, ID: ${school?.id || schoolId}) ka subscription expire ho gaya hai. Kripya hamara plan turant renew karwayen.`)}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Contact Super Admin on WhatsApp</span>
            </a>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 px-4 rounded-xl text-slate-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout / Switch Account</span>
            </button>
          </div>
        </div>
      </div>
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



  if (view === "absentee") {
    return (
      <AbsenteeActionPage
        schoolId={schoolId}
        schoolName={school?.name}
        classes={classes}
        currentRole="ADMIN"
        currentUserId={adminUid}
        onBack={() => setView("dashboard")}
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

  const renderAdminBottomNav = () => {
    const navItems = [
      { key: "dashboard", label: "Home", active: view === "dashboard", icon: Home, onClick: () => setView("dashboard") },
      { key: "classes", label: "Classes", active: view === "classes" || view === "students" || view === "attendance" || view === "marks", icon: GraduationCap, onClick: () => setView("classes") },
      { key: "fees", label: "Fees", active: view === "fees" || view === "fee_class" || view === "fee_all" || view === "fee_structure", icon: IndianRupee, onClick: () => setView("fees") },
      { key: "community", label: "Community", active: view === "community" || view === "notices" || view === "holidays", icon: Megaphone, onClick: () => setView("community") },
      { key: "marksheet_hub", label: "Results", active: view === "marksheet_hub" || view === "reports_hub", icon: FileSpreadsheet, onClick: () => setView("marksheet_hub") },
    ];
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] print:hidden">
        <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition cursor-pointer ${
                  item.active
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 font-black"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? "stroke-[2.5]" : ""}`} />
                <span className="text-[10px] leading-tight tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  };

  if (view === "fee_class" && feeClassSelected) {
    return (
      <div className="pb-20">
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
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "fee_all") {
    return (
      <div className="pb-20">
        <FeeManager
          schoolId={schoolId}
          className="All Classes"
          schoolName={school?.name}
          school={school || undefined}
          sessionId={activeSession?.id || ""}
          adminId={adminUid}
          onBack={() => setView("fees")}
        />
        {renderAdminBottomNav()}
      </div>
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
        initialSubjects={subjects.filter(s => s.classId === selectedClass.id)}
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
        teachers={teachers}
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
      <div className="pb-20">
        <MarksheetGenerator
          school={school!}
          classes={classes}
          students={students}
          activeSession={activeSession}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "promotion") {
    return (
      <div className="pb-20">
        <StudentPromotionManager
          schoolId={schoolId}
          sessions={sessions}
          classes={classes}
          students={students}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "notices") {
    return (
      <div className="pb-20">
        <NoticeBoardManager
          schoolId={schoolId}
          adminUid={adminUid}
          isAdmin={true}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "holidays") {
    return (
      <div className="pb-20">
        <HolidayManager
          schoolId={schoolId}
          adminUid={adminUid}
          schoolName={school?.name}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
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
      <div className="pb-20">
        <ClassFeeStructureSection
          schoolId={schoolId}
          sessionId={activeSession?.id}
          classes={classes}
          onBack={() => setView("dashboard")}
          onClassesUpdated={() => {}}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "community") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-4 border-b border-indigo-800/40 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <button
              onClick={() => setView("dashboard")}
              className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Back to Dashboard
            </button>
            <span className="text-xs font-black text-rose-300 bg-rose-500/20 border border-rose-400/30 px-2.5 py-1 rounded-lg">
              School Community Hub
            </span>
          </div>
        </div>
        <div className="p-3 sm:p-4 max-w-2xl mx-auto">
          <SchoolCommunityFeed
            schoolId={schoolId}
            schoolName={school?.name || "School"}
            currentUserId={adminUid}
            currentUserName={school?.principalName || "Principal / Admin"}
            currentUserRole="ADMIN"
            classes={displayedClasses}
            onBack={() => setView("dashboard")}
          />
        </div>
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "timetable") {
    return (
      <div className="pb-20">
        <TimetableManager
          school={school!}
          classes={displayedClasses}
          subjects={subjects}
          teachers={displayedTeachers}
          activeSession={activeSession}
          isAdmin={true}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "video_lectures" || view === "classroom_videos") {
    return (
      <div className="pb-20">
        <ClassroomVideoArchive
          school={school!}
          classes={displayedClasses}
          teachers={displayedTeachers}
          subjects={subjects}
          activeSession={activeSession}
          currentUserRole="ADMIN"
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "homework") {
    return (
      <div className="pb-20">
        <HomeworkManager
          school={school!}
          classes={displayedClasses}
          subjects={subjects}
          teachers={displayedTeachers}
          currentRole="ADMIN"
          currentTeacherName={school?.principalName || "Principal"}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "library") {
    return (
      <div className="pb-20">
        <LibraryManager
          school={school!}
          students={displayedStudents}
          teachers={displayedTeachers}
          classes={displayedClasses}
          isAdmin={true}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "parent_queries") {
    return (
      <div className="pb-20">
        <ParentTeacherQueryManager
          school={school!}
          students={displayedStudents}
          teachers={displayedTeachers}
          classes={displayedClasses}
          currentUserRole="ADMIN"
          currentUserName={school?.principalName || "Principal / Admin"}
          currentUserId={adminUid}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "inventory_store") {
    return (
      <div className="pb-20">
        <InventoryStoreManager
          school={school!}
          students={displayedStudents}
          classes={displayedClasses}
          isAdmin={true}
          onBack={() => setView("dashboard")}
        />
        {renderAdminBottomNav()}
      </div>
    );
  }

  if (view === "nsta_broadcast") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
        <NstaMessengerSuite
          school={school!}
          classes={displayedClasses}
          students={displayedStudents}
          teachers={displayedTeachers}
          currentUserId={adminUid}
          currentUserName={school?.principalName || "Principal / Admin"}
          currentUserRole="ADMIN"
          onBack={() => setView("dashboard")}
        />
      </div>
    );
  }

  const menuItems = [
    { label: "Absenty Action Center", subtitle: "1-Day Push Notice & 2-Day+ Direct Call Tracker", icon: <AlertCircle className="w-5 h-5 text-rose-500" />, view: "absentee", count: "Action 🚨", locked: false, featured: true },
    { label: "NSTA Messenger", subtitle: "Class Groups, School Desk & Teacher Chat", icon: <MessageSquare className="w-5 h-5 text-indigo-500" />, view: "nsta_broadcast", count: "3 Screens ⚡", locked: false, featured: true },
    { label: "School Community", subtitle: "Photo, Video & Chhutti Post", icon: <ImageIcon className="w-5 h-5 text-rose-500" />, view: "community", count: "LIVE", locked: false, featured: true },
    { label: "Timetable & Routine", subtitle: "Weekly Periods & Routine", icon: <Clock className="w-5 h-5 text-amber-500" />, view: "timetable", count: "8 Periods", locked: false },
    { label: "Class Video Archive", subtitle: "Daily YouTube Lectures & Routine", icon: <Youtube className="w-5 h-5 text-red-500" />, view: "video_lectures", count: "YouTube 🔴", locked: false, featured: true },
    { label: "Daily Homework", subtitle: "Diary & Notebook Submission", icon: <BookOpen className="w-5 h-5 text-purple-600" />, view: "homework", count: "Diary", locked: false },
    { label: "Library Management", subtitle: "Books Catalog & Issue/Return", icon: <Book className="w-5 h-5 text-emerald-600" />, view: "library", count: "Books", locked: false },
    { label: "Parent-Teacher Query", subtitle: "Helpdesk & Leave Requests", icon: <MessageSquare className="w-5 h-5 text-blue-600" />, view: "parent_queries", count: "Helpdesk", locked: false },
    { label: "School Store & Stock", subtitle: "Uniforms, Books & POS Bill", icon: <Package className="w-5 h-5 text-orange-500" />, view: "inventory_store", count: "Stock", locked: false },
    { label: "Students", subtitle: "Admissions & Profiles", icon: <Users className="w-5 h-5 text-orange-500" />, view: "students", count: displayedStudents.length, locked: false },
    { label: "Fee Collection", subtitle: "Monthly Ledger & Receipts", icon: <IndianRupee className="w-5 h-5 text-emerald-500" />, view: "fees", count: "Live Sync", locked: false },
    { label: "QR ID Cards", subtitle: "Print & Scan Student ID", icon: <CreditCard className="w-5 h-5 text-indigo-500" />, view: "id_cards", count: "Live QR", locked: false },
    { label: "Classes", subtitle: "Sections, Attendance & Marks", icon: <BookOpen className="w-5 h-5 text-purple-500" />, view: "classes", count: displayedClasses.length, locked: false },
    { label: "Teachers", subtitle: "Faculty Accounts & Access", icon: <Users className="w-5 h-5 text-green-500" />, view: "teachers", count: displayedTeachers.length, locked: false },
    { label: "Class Fee Setup", subtitle: "Monthly & Head Structure", icon: <IndianRupee className="w-5 h-5 text-emerald-600" />, view: "fee_structure", count: "5 Heads", locked: false },
    { label: "Marksheet (रिजल्ट)", subtitle: "Report Card & Print", icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />, view: "marksheet_hub", count: "Official", locked: false },
    { label: "Festival Holidays", subtitle: "Chhutti Calendar & Push", icon: <Calendar className="w-5 h-5 text-pink-500" />, view: "holidays", count: "Calendar", locked: false },
    { label: "Notice Board", subtitle: "Official Circulars", icon: <Megaphone className="w-5 h-5 text-purple-600" />, view: "notices", count: "Circulars", locked: false },
    { label: "Admit Cards", subtitle: "Exam Hall Tickets", icon: <FileText className="w-5 h-5 text-rose-500" />, view: "admit_cards", count: "Hall Ticket", locked: false },
    { label: "Certificates", subtitle: "TC, Bonafide & Merit", icon: <Award className="w-5 h-5 text-amber-500" />, view: "certificates", count: "TC & Merit", locked: false },
    { label: "Class Promotion", subtitle: "Next Session Upgrade", icon: <TrendingUp className="w-5 h-5 text-blue-600" />, view: "promotion", count: "Promote", locked: false },
    { label: "Staff HRM & Leaves", subtitle: "Payroll & Attendance", icon: <Briefcase className="w-5 h-5 text-teal-600" />, view: "staff_hrm", count: "Salaries", locked: false },
    { label: "Reports & Print", subtitle: "40+ Register Sheets", icon: <FileSpreadsheet className="w-5 h-5 text-cyan-600" />, view: "reports_hub", count: "40+ Reports", locked: false },
    { label: "Sessions", subtitle: "Academic Years", icon: <Calendar className="w-5 h-5 text-blue-500" />, view: "sessions", count: displayedSessions.length, locked: false },
    { label: "Public Website", subtitle: "Live School Portal", icon: <Globe className="w-5 h-5 text-indigo-500" />, view: "public_website", count: "Live", locked: false },
    { label: "Online Admissions", subtitle: "New Enquiries", icon: <UserPlus className="w-5 h-5 text-amber-500" />, view: "online_admissions", count: "Portal", locked: false },
  ];

  // List views
  const renderListView = () => {
    if (view === "sessions") {
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
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
          {displayedSessions.map((s, idx) => (
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
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(s)}
                      disabled={saving}
                      className="px-3 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                    <button onClick={() => setEditingSessionId(null)} className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
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
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-500" title="Edit Session">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(s)}
                    disabled={saving}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition cursor-pointer"
                    title="Delete Session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }

    if (view === "classes") {
      const sortedClasses = sortSchoolClasses(displayedClasses);

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
                    <span>{displayedClasses.length} Total Classes</span>
                    <span>•</span>
                    <span>{displayedStudents.length} Enrolled Students</span>
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

                  {/* Stream Selection for Class 11 and Class 12 */}
                  {isSeniorClass(classForm.name) && (
                    <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-600" />
                          <span>Senior Secondary Stream (स्ट्रीम चुनें) *</span>
                        </label>
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">Class 11 / 12 Special</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {SENIOR_STREAMS.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setClassForm(p => ({ ...p, stream: st.id }))}
                            className={`p-2.5 rounded-xl border text-left transition-all ${
                              classForm.stream === st.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-black text-xs">
                              <span>{st.icon}</span>
                              <span>{st.label}</span>
                            </div>
                            <p className={`text-[10px] mt-1 line-clamp-1 ${classForm.stream === st.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                              {st.desc}
                            </p>
                          </button>
                        ))}
                      </div>

                      {/* Pre-configured stream subjects preview */}
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-600 dark:text-slate-300">
                        <span className="font-bold text-indigo-900 dark:text-indigo-200">Pre-loaded Subjects: </span>
                        <span className="font-semibold">
                          {getDefaultSubjectsForClass(classForm.name, classForm.stream || "Science").join(", ")}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Auto-create pre-configured subjects toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      checked={classForm.autoAddSubjects}
                      onChange={e => setClassForm(p => ({ ...p, autoAddSubjects: e.target.checked }))}
                      className="rounded accent-blue-600 w-4 h-4"
                    />
                    <span>
                      {isSeniorClass(classForm.name)
                        ? `Auto-create Stream Subjects (स्ट्रीम के ${getDefaultSubjectsForClass(classForm.name, classForm.stream || "Science").length} विषय अपने आप जोड़ें)`
                        : `Auto-create Standard Subjects (कक्षा के मानक विषय अपने आप जोड़ें)`}
                    </span>
                  </label>

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
                  const classStudents = displayedStudents.filter(s => isStudentInClass(s, cls.id, cls.name));
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

                          {/* Stream Selection for Class 11 and 12 in Edit */}
                          {isSeniorClass(editClassForm.name) && (
                            <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2">
                              <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Academic Stream (स्ट्रीम):</span>
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {SENIOR_STREAMS.map(st => (
                                  <button
                                    key={st.id}
                                    type="button"
                                    onClick={() => setEditClassForm(p => ({ ...p, stream: st.id }))}
                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                                      editClassForm.stream === st.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    {st.icon} {st.id}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

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
                                  {(cls.stream || isSeniorClass(cls.name)) && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1 shadow-2xs">
                                      <span>{cls.stream === "Commerce" ? "📊" : cls.stream === "Arts" ? "🎨" : "🔬"}</span>
                                      <span>{cls.stream || "Science"} Stream</span>
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
                                  setEditClassForm({ name: cls.name, section: cls.section || "", stream: cls.stream || (isSeniorClass(cls.name) ? "Science" : ""), defaultFee });
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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <p className="text-sm text-slate-500">
                  Subjects for <strong className="text-slate-800 dark:text-slate-100 font-bold">{selectedClass.name}</strong> ({subjects.length} books)
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(showForm === "multi_subject" ? null : "multi_subject");
                      setMultiBookQueue([]);
                      setCustomMultiBooksText("");
                    }}
                    className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Multiple Books (एक साथ कई किताबें)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(showForm === "subject" ? null : "subject")}
                    className="px-3 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Single Add
                  </button>
                </div>
              </div>

              {/* Single Subject Form */}
              {showForm === "subject" && (
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3 border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-black text-slate-700 dark:text-slate-300">Add Single Subject:</p>
                  <input
                    value={subjectForm.name}
                    onChange={e => setSubjectForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Subject Name (e.g. Mathematics)"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={addSubject} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-60">Save</button>
                    <button onClick={() => setShowForm(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {/* Multi-Book Bulk Addition Form */}
              {showForm === "multi_subject" && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-md border-2 border-emerald-500/30 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                        Add Multiple Books / Subjects for {selectedClass.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Preset bundle chunein, chips par click karein ya type karke ek saath add karein
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowForm(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Preset Bundles */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      1-Click Preset Bundles (रेडीमेड बुक पैक):
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_BOOK_BUNDLES.map((b, bIdx) => (
                        <button
                          key={bIdx}
                          type="button"
                          onClick={() => {
                            setMultiBookQueue(prev => {
                              const s = new Set(prev);
                              b.books.forEach(bk => s.add(bk));
                              return Array.from(s);
                            });
                          }}
                          className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 transition cursor-pointer"
                        >
                          <p className="font-bold text-xs text-slate-800 dark:text-slate-100">{b.label}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">{b.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Clickable Preset Chips */}
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Click to Select Books (किताबें चुनें):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_BOOK_PRESETS.map((preset) => {
                        const isSelected = multiBookQueue.includes(preset.name);
                        const isAlreadyAdded = subjects.some(s => (s.name || "").trim().toLowerCase() === preset.name.toLowerCase());
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            disabled={isAlreadyAdded}
                            onClick={() => {
                              setMultiBookQueue(prev =>
                                prev.includes(preset.name) ? prev.filter(x => x !== preset.name) : [...prev, preset.name]
                              );
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                              isAlreadyAdded
                                ? "bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 cursor-not-allowed"
                                : isSelected
                                ? "bg-emerald-600 text-white border border-emerald-600"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200"
                            }`}
                          >
                            <span>{preset.icon}</span>
                            <span>{preset.name}</span>
                            {isAlreadyAdded && <span className="text-[9px]">(Added)</span>}
                            {isSelected && !isAlreadyAdded && <Check className="w-3 h-3 text-white" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Type Custom Books (कॉमा से अलग करें):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customMultiBooksText}
                        onChange={e => setCustomMultiBooksText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (!customMultiBooksText.trim()) return;
                            const parts = customMultiBooksText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                            setMultiBookQueue(prev => Array.from(new Set([...prev, ...parts])));
                            setCustomMultiBooksText("");
                          }
                        }}
                        placeholder="e.g. Sanskrit, Environmental Science, GK"
                        className="flex-1 px-3 py-2 text-xs rounded-xl border dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!customMultiBooksText.trim()) return;
                          const parts = customMultiBooksText.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
                          setMultiBookQueue(prev => Array.from(new Set([...prev, ...parts])));
                          setCustomMultiBooksText("");
                        }}
                        className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Queued preview */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        Selected to Add ({multiBookQueue.length}):
                      </span>
                      {multiBookQueue.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setMultiBookQueue([])}
                          className="text-[10px] text-rose-500 font-bold hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {multiBookQueue.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {multiBookQueue.map(b => (
                          <span key={b} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold">
                            {b}
                            <button type="button" onClick={() => setMultiBookQueue(prev => prev.filter(x => x !== b))}>
                              <X className="w-3 h-3 hover:text-rose-500" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No books selected yet</p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={multiBookQueue.length === 0 || savingMultiBooks}
                      onClick={handleSaveBulkBooks}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-1.5"
                    >
                      {savingMultiBooks ? "Saving Books..." : `Save All ${multiBookQueue.length} Books`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowForm(null)}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Subjects List */}
              {subjects.map((sub, idx) => (
                <div key={sub.id || `subject-${sub.name || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3 border border-slate-100 dark:border-slate-700/80">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-black text-sm flex items-center justify-center shrink-0">
                      {sub.name ? sub.name.charAt(0).toUpperCase() : "S"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 dark:text-white text-sm sm:text-base truncate">{sub.name}</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800 mt-0.5">
                        Academic Subject
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Kya aap "${sub.name}" subject ko delete karna chahte hain?`)) {
                        deleteSubject(schoolId, sub.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    title="Delete Subject"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {subjects.length === 0 && (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Is class me abhi koi subject nahi hai</p>
                  <p className="text-xs text-slate-400 mt-1">Upar "+ Add Multiple Books" button par click karke ek saath sabhi books add karein</p>
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (view === "teachers") {
      return (
        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          {/* Header Banner */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Faculty &amp; Teachers Directory (शिक्षक प्रबंधन)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Teachers ka photo, qualification, designation, subjects aur bio manage karein jo student dashboard me dikhega.
              </p>
              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>🔒 Privacy Protection: Teachers ke personal mobile numbers student portal par nahi dikhaye jaate hain.</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setView("id_cards")}
                className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                title="Open ID Card Generator for All Staff and Teachers"
              >
                <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>🪪 ID Cards Hub</span>
              </button>
              <button
                onClick={() => {
                  setShowForm(showForm === "teacher" ? null : "teacher");
                  setEditingTeacherId(null);
                }}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Faculty / Teacher</span>
              </button>
            </div>
          </div>

          {/* Add Teacher Form */}
          {showForm === "teacher" && !editingTeacherId && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border-2 border-blue-500/30 shadow-md space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <p className="text-sm font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>New Teacher Profile (नया शिक्षक जोड़ें)</span>
                </p>
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs font-bold"
                >
                  ✕ Close
                </button>
              </div>

              {/* Photo Upload */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-500 shrink-0">
                    {teacherForm.photoUrl ? (
                      <img src={teacherForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Teacher Photo (तस्वीर)</p>
                    <p className="text-[10px] text-slate-400">ID Card व Teacher Portal पर दिखेगी</p>
                  </div>
                </div>
                <DirectUploadButton
                  kind="image"
                  compact
                  currentUrl={teacherForm.photoUrl}
                  onUploaded={(url) => setTeacherForm(p => ({ ...p, photoUrl: url }))}
                  onClear={() => setTeacherForm(p => ({ ...p, photoUrl: "" }))}
                />
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Full Name (पूरा नाम) *
                  </label>
                  <input
                    value={teacherForm.name}
                    onChange={e => setTeacherForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Dr. Arvind Swaminathan"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Designation / Role (पद)
                  </label>
                  <input
                    value={teacherForm.designation}
                    onChange={e => setTeacherForm(p => ({ ...p, designation: e.target.value }))}
                    placeholder="e.g. Senior Faculty - Mathematics, TGT Science"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Qualification & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Highest Qualification (शैक्षणिक योग्यता)
                  </label>
                  <input
                    value={teacherForm.qualification}
                    onChange={e => setTeacherForm(p => ({ ...p, qualification: e.target.value }))}
                    placeholder="e.g. M.Sc. (Mathematics), B.Ed, CTET"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Teaching Experience (शिक्षण अनुभव)
                  </label>
                  <input
                    value={teacherForm.experience}
                    onChange={e => setTeacherForm(p => ({ ...p, experience: e.target.value }))}
                    placeholder="e.g. 8+ Years Experience"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                  />
                </div>
              </div>

              {/* Subjects */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  Subjects Taught (पढ़ाने वाले विषय — अल्पविराम ',' से अलग करें)
                </label>
                <input
                  value={teacherForm.subjects}
                  onChange={e => setTeacherForm(p => ({ ...p, subjects: e.target.value }))}
                  placeholder="e.g. Mathematics, Physics, Applied Math"
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                />
              </div>

              {/* Bio / Message */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                  Teacher Bio / Message for Students (शिक्षक का संदेश / परिचय)
                </label>
                <textarea
                  rows={2}
                  value={teacherForm.bio}
                  onChange={e => setTeacherForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="e.g. Dedicated to conceptual clarity and helping every student achieve academic excellence."
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                />
              </div>

              {/* Mobile Phone, Employee ID & Optional Official Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl">
                <div>
                  <label className="text-xs font-bold text-blue-950 dark:text-blue-200 mb-1 block">
                    Mobile Number * (मोबाइल नंबर)
                  </label>
                  <input
                    type="tel"
                    value={teacherForm.phone}
                    onChange={e => setTeacherForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="e.g. 9876543210 (लॉगिन हेतु)"
                    className="w-full px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm font-bold"
                  />
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">शिक्षक ID कार्ड व लॉगिन हेतु</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Employee ID (कर्मचारी कोड)
                  </label>
                  <input
                    value={teacherForm.employeeId}
                    onChange={e => setTeacherForm(p => ({ ...p, employeeId: e.target.value }))}
                    placeholder="e.g. TEA-104 (खाली छोड़ने पर ऑटो)"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Official Email (ईमेल — Optional)
                  </label>
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={e => setTeacherForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="e.g. teacher@school.edu.in"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={addTeacher}
                  disabled={saving || !teacherForm.name.trim()}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black disabled:opacity-60 shadow-md transition active:scale-95 cursor-pointer"
                >
                  {saving ? "Saving Teacher..." : "Save Teacher Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Teachers Cards List */}
          {displayedTeachers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <GraduationCap className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                Abhi koi teacher add nahi kiya gaya
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Upar diye "+ Add Faculty / Teacher" button par click karke apne school ke teachers ki photo, qualification aur subjects jodein.
              </p>
            </div>
          ) : (
            displayedTeachers.map((t, idx) => {
              const subjectsList = Array.isArray(t.subjects) ? t.subjects : (t.subjects ? [t.subjects] : []);
              return (
                <div
                  key={t.id || `teacher-${t.name || idx}-${idx}`}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-slate-700 shadow-xs hover:shadow-md transition overflow-hidden"
                >
                  {editingTeacherId === t.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Faculty Profile</span>
                        </p>
                        <span className="text-[10px] text-slate-400 font-bold">ID: #{t.id.slice(0, 6)}</span>
                      </div>

                      {/* Edit Photo */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-600 flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-500 shrink-0">
                            {editTeacherForm.photoUrl ? (
                              <img src={editTeacherForm.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Teacher Photo</p>
                            <p className="text-[10px] text-slate-400">Change portrait image</p>
                          </div>
                        </div>
                        <DirectUploadButton
                          kind="image"
                          compact
                          currentUrl={editTeacherForm.photoUrl}
                          onUploaded={(url) => setEditTeacherForm(p => ({ ...p, photoUrl: url }))}
                          onClear={() => setEditTeacherForm(p => ({ ...p, photoUrl: "" }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Full Name *</label>
                          <input
                            value={editTeacherForm.name}
                            onChange={e => setEditTeacherForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Designation / Role</label>
                          <input
                            value={editTeacherForm.designation}
                            onChange={e => setEditTeacherForm(p => ({ ...p, designation: e.target.value }))}
                            placeholder="Designation"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Highest Qualification</label>
                          <input
                            value={editTeacherForm.qualification}
                            onChange={e => setEditTeacherForm(p => ({ ...p, qualification: e.target.value }))}
                            placeholder="e.g. M.Sc., B.Ed"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Teaching Experience</label>
                          <input
                            value={editTeacherForm.experience}
                            onChange={e => setEditTeacherForm(p => ({ ...p, experience: e.target.value }))}
                            placeholder="e.g. 8+ Years"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Subjects Taught (comma separated)</label>
                        <input
                          value={editTeacherForm.subjects}
                          onChange={e => setEditTeacherForm(p => ({ ...p, subjects: e.target.value }))}
                          placeholder="e.g. Mathematics, Physics"
                          className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Teacher Bio / Message for Students</label>
                        <textarea
                          rows={2}
                          value={editTeacherForm.bio}
                          onChange={e => setEditTeacherForm(p => ({ ...p, bio: e.target.value }))}
                          placeholder="Inspiring bio or message for students"
                          className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Mobile Number *</label>
                          <input
                            type="tel"
                            value={editTeacherForm.phone}
                            onChange={e => setEditTeacherForm(p => ({ ...p, phone: e.target.value }))}
                            placeholder="Mobile (Login Number)"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Employee ID</label>
                          <input
                            value={editTeacherForm.employeeId}
                            onChange={e => setEditTeacherForm(p => ({ ...p, employeeId: e.target.value }))}
                            placeholder="Employee ID"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Official Email</label>
                          <input
                            type="email"
                            value={editTeacherForm.email}
                            onChange={e => setEditTeacherForm(p => ({ ...p, email: e.target.value }))}
                            placeholder="Email"
                            className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={saveEditTeacher}
                          disabled={saving || !editTeacherForm.name.trim()}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black disabled:opacity-60 shadow-md transition active:scale-95 cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{saving ? "Saving Changes..." : "Save Changes"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingTeacherId(null)}
                          className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        {/* Portrait Photo */}
                        <div className="w-14 h-16 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-lg overflow-hidden shrink-0 shadow-xs border border-slate-200 dark:border-slate-700">
                          {t.photoUrl ? (
                            <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{t.name ? t.name.charAt(0).toUpperCase() : "T"}</span>
                          )}
                        </div>

                        {/* Teacher Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-base text-slate-800 dark:text-white">
                              {t.name}
                            </h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {t.designation || "Faculty"}
                            </span>
                            {t.experience && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                ⏳ {t.experience}
                              </span>
                            )}
                          </div>

                          {t.qualification && (
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1 flex items-center gap-1">
                              <span>🎓</span>
                              <span>{t.qualification}</span>
                            </p>
                          )}

                          {subjectsList.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                              {subjectsList.map((subItem: string, sIdx: number) => (
                                <span
                                  key={`t-sub-${t.id}-${sIdx}`}
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300"
                                >
                                  {subItem}
                                </span>
                              ))}
                            </div>
                          )}

                          {t.bio && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-2 bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border-l-2 border-blue-500">
                              "{t.bio}"
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-2 flex-wrap">
                            {t.employeeId && <span className="font-mono font-bold text-slate-600 dark:text-slate-300">ID: {t.employeeId}</span>}
                            {t.phone && <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5"><Phone className="w-3 h-3" /> {t.phone}</span>}
                            {t.email && <span>{t.email}</span>}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex sm:flex-col items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setSelectedTeacherForIdCard(t)}
                          className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-black flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
                          title="Teacher ID Card Dekhein aur Print Karein"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>🪪 ID Card</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacherId(t.id);
                            setEditTeacherForm({
                              name: t.name || "",
                              phone: t.phone || "",
                              photoUrl: t.photoUrl || "",
                              designation: t.designation || "",
                              qualification: t.qualification || "",
                              experience: t.experience || "",
                              subjects: Array.isArray(t.subjects) ? t.subjects.join(", ") : (t.subjects || ""),
                              bio: t.bio || "",
                              employeeId: t.employeeId || "",
                              email: t.email || "",
                            });
                            setShowForm(null);
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Kya aap sach me "${t.name}" ko remove karna chahte hain?`)) {
                              deleteTeacher(schoolId, t.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      );
    }

    if (view === "students") {
      const classStudents = selectedClass ? displayedStudents.filter(s => isStudentInClass(s, selectedClass.id, selectedClass.name)) : displayedStudents;
      return (
        <div className="p-4 space-y-3 max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              {selectedClass ? (
                <>Students in <strong className="text-slate-700 dark:text-slate-200">{selectedClass.name}</strong> ({classStudents.length})</>
              ) : (
                <>All Enrolled Students (<strong className="text-slate-700 dark:text-slate-200">{classStudents.length}</strong>)</>
              )}
            </p>
            {selectedClass && (
              <button
                type="button"
                onClick={() => setSelectedClass(null)}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Show All Classes
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingStudentId(null);
              setShowDirectAdmissionModal(true);
            }}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ New Student Admission (Quick / Full Form + Receipt)</span>
          </button>

          {classStudents.map((s, idx) => (
            <div key={s.id || `student-${s.rollNo || idx}-${idx}`} className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm border border-slate-100 dark:border-slate-700">
              {editingStudentId === s.id ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-orange-500 uppercase tracking-wider">Edit Student Details</p>
                    <button
                      type="button"
                      onClick={() => setAdmissionPrintPayload({ student: s })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 text-xs font-bold cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Admission Form
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      ["name", "Full Name *", "text"],
                      ["rollNo", "Roll Number", "text"],
                      ["admissionNo", "Admission No", "text"],
                      ["phone", "Phone / Mobile", "tel"],
                      ["fatherName", "Father's Name", "text"],
                      ["motherName", "Mother's Name", "text"],
                      ["aadhaarNo", "Student Aadhaar (12-digit)", "text"],
                      ["address", "Address", "text"],
                    ].map(([k, label, type], fIdx) => (
                      <input key={`edit-student-field-${k}-${fIdx}`} type={type} value={(editStudentForm as any)[k] || ""}
                        onChange={e => setEditStudentForm(p => ({ ...p, [k]: e.target.value }))}
                        placeholder={label}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Date of Birth</label>
                      <input type="date" value={editStudentForm.dateOfBirth || ""}
                        onChange={e => setEditStudentForm(p => ({ ...p, dateOfBirth: e.target.value }))}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Gender</label>
                      <select
                        value={editStudentForm.gender || ""}
                        onChange={e => setEditStudentForm(p => ({ ...p, gender: e.target.value }))}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold"
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block font-bold text-rose-600 dark:text-rose-400">🩸 Blood Group</label>
                      <select
                        value={editStudentForm.bloodGroup || ""}
                        onChange={e => setEditStudentForm(p => ({ ...p, bloodGroup: e.target.value }))}
                        className="w-full px-3 py-2 border dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm font-semibold"
                      >
                        <option value="">Select Blood Group</option>
                        {BLOOD_GROUPS.map((bg, bgIdx) => (
                          <option key={`edit-student-bg-${bg}-${bgIdx}`} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-500 whitespace-nowrap">Monthly Fee (₹):</label>
                    <input type="number" value={editStudentForm.monthlyFee}
                      onChange={e => setEditStudentForm(p => ({ ...p, monthlyFee: Number(e.target.value) }))}
                      className="flex-1 px-3 py-2 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-sm" />
                  </div>
                  <div className="space-y-1.5 p-2.5 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Student Photo (Camera / Gallery Upload):</label>
                      <DirectUploadButton
                        kind="image"
                        compact
                        currentUrl={editStudentForm.photoUrl}
                        onUploaded={(url) => setEditStudentForm(p => ({ ...p, photoUrl: url }))}
                        onClear={() => setEditStudentForm(p => ({ ...p, photoUrl: '' }))}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">Photo ID Card, Marksheet aur Admission Form par dikhegi.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveEditStudent} disabled={saving} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium disabled:opacity-60 cursor-pointer">
                      <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingStudentId(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm cursor-pointer">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center font-bold text-orange-700 text-sm flex-shrink-0 overflow-hidden">
                    {s.photoUrl ? (
                      <img src={s.photoUrl} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      s.rollNo || "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setQuickActionStudent(s);
                          setQuickActionInitialTab("id_card");
                        }}
                        className="group text-left font-bold text-slate-800 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    <p className="text-xs text-slate-400">
                      {s.admissionNo || "No Adm No"} • Roll #{s.rollNo || "—"} • Fee: ₹{s.monthlyFee}/mo
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdmissionPrintPayload({ student: s })}
                    className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 cursor-pointer"
                    title="Print Admission Form / Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button onClick={() => {
                    setEditingStudentId(s.id);
                    setEditStudentForm({
                      name: s.name,
                      rollNo: s.rollNo || "",
                      admissionNo: s.admissionNo || "",
                      fatherName: s.fatherName || "",
                      motherName: s.motherName || "",
                      phone: s.phone || "",
                      dateOfBirth: s.dateOfBirth || "",
                      gender: s.gender || "",
                      category: s.category || "",
                      aadhaarNo: s.aadhaarNo || "",
                      address: s.address || "",
                      monthlyFee: s.monthlyFee || 0,
                      photoUrl: s.photoUrl || "",
                      bloodGroup: s.bloodGroup || "",
                    });
                    setShowForm(null);
                  }}
                    className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-500 cursor-pointer">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteStudent(schoolId, s.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 cursor-pointer">
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
      const sortedClasses = sortSchoolClasses(displayedClasses);
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

      const schoolTotal = displayedStudents.reduce((sum, s) => sum + (s.monthlyFee || 0), 0);
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
            const classStudents = displayedStudents.filter(s => isStudentInClass(s, cls.id, cls.name));
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header - Only shown when in subpages (classes, students, marks, etc.) for back navigation */}
      {view !== "dashboard" && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 py-3.5 border-b border-indigo-800/40 shadow-md">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <button
                onClick={() => {
                  if (view === "subjects" || view === "students" || view === "attendance" || view === "marks" || view === "report_card") setView("classes");
                  else if (view === "content") { setView("subjects"); }
                  else setView("dashboard");
                }}
                className="flex items-center gap-1.5 text-blue-200 hover:text-white text-xs sm:text-sm font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/15 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> {view === "store" ? "Dashboard" : "Back to Dashboard"}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Log Out Button */}
              <button
                onClick={handlePerformLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 border border-rose-400/40 text-rose-200 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                title="School Admin ERP se Log Out karein"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "dashboard" ? (
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* ── LIVE ONLINE ADMISSION NOTIFICATION BANNER ── */}
          {admissionAlerts.length > 0 && (
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-3xl p-4 sm:p-5 shadow-xl border border-emerald-400/40 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 mt-0.5 shadow-inner">
                    <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-xs">
                        🔔 New Online Admission ({admissionAlerts.length})
                      </span>
                    </div>
                    <h4 className="font-black text-sm sm:text-base text-white mt-1 leading-snug">
                      {admissionAlerts[0].studentName} ne {admissionAlerts[0].className} me online admission liya hai!
                    </h4>
                    <p className="text-xs text-white/90 mt-1">
                      आवंटित रोल नंबर: <strong className="text-amber-300 font-mono text-sm">#{admissionAlerts[0].rollNo}</strong> • जमा शुल्क: <strong>₹{admissionAlerts[0].amount}</strong> (प्रवेश: ₹{admissionAlerts[0].admissionCharge} + वार्षिक: ₹{admissionAlerts[0].annualCharge})
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setView("online_admissions")}
                        className="px-3.5 py-2 rounded-xl bg-white text-slate-900 text-xs font-black hover:bg-slate-100 transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
                        <span>आवेदन व पेमेंट स्क्रीनशॉट देखें</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem(`school_admission_alerts_${schoolId}`);
                          setAdmissionAlerts([]);
                        }}
                        className="px-3 py-2 rounded-xl bg-black/25 hover:bg-black/35 text-white/90 text-xs font-bold transition cursor-pointer"
                      >
                        Dismiss All
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(`school_admission_alerts_${schoolId}`);
                    setAdmissionAlerts([]);
                  }}
                  className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
                  title="Dismiss Alert"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── UNIFIED ALL-IN-ONE INSTITUTIONAL MASTER CARD ── */}
          {school && (
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-2xl border border-indigo-500/25 p-4 sm:p-5 space-y-4 mb-4 transition-all">
              {/* Decorative subtle ambient glows */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* 1. TOP IDENTITY ROW: Logo + Titles + Verification Badges + Top-Right Log Out button */}
              <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Logo / Crest frame */}
                  {(() => {
                    const displaySchoolLogo = getSavedSchoolLogo(school.logoUrl, schoolId);
                    return (
                      <div className="relative group flex-shrink-0">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1 flex items-center justify-center shadow-inner overflow-hidden">
                          {displaySchoolLogo ? (
                            <img
                              src={displaySchoolLogo}
                              alt={school.name}
                              className="w-full h-full object-contain rounded-xl bg-white p-0.5"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                                const fb = (e.target as HTMLElement).parentElement?.querySelector('.admin-logo-fallback') as HTMLElement;
                                if (fb) fb.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex flex-col items-center justify-center text-slate-950 font-black shadow admin-logo-fallback ${displaySchoolLogo ? 'hidden' : 'flex'}`}>
                            <Building2 className="w-6 h-6 text-slate-950 mb-0.5" />
                            <span className="text-[10px] uppercase font-bold tracking-wider">
                              {(school.name || "SC").slice(0, 3)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          title="Change School Logo"
                          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md text-[10px] border border-white/40 cursor-pointer active:scale-95 transition-transform"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })()}

                  {/* School titles, code & affiliation */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-blue-300 text-[11px] font-black uppercase tracking-wider bg-blue-500/20 px-2.5 py-0.5 rounded-lg border border-blue-400/30">
                        School Admin ERP
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-snug drop-shadow-sm truncate">
                        {school.name || "Institutional Campus"}
                      </h2>
                    </div>

                    {/* Badges strip (Clean: Isolated DB badge removed) */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {school.code && (
                        <span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/15 text-[10px] font-mono font-semibold tracking-wide text-blue-200">
                          CODE: {school.code}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Verified Institute
                      </span>
                      {/* 3-Tier Subscription & Student Capacity Meter */}
                      {(() => {
                        const maxSts = getSchoolMaxStudents(school);
                        const currentCount = displayedStudents.length;
                        const tierKey = school?.subscription?.tier || "starter_200";
                        const tierMeta = TIER_CONFIG[tierKey] || TIER_CONFIG.starter_200;
                        const isNearLimit = currentCount >= maxSts * 0.9;
                        return (
                          <button
                            type="button"
                            onClick={() => setView("subscription")}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer shadow-xs ${
                              isNearLimit
                                ? "bg-rose-500/25 border-rose-400 text-rose-200 hover:bg-rose-500/35 animate-pulse"
                                : "bg-amber-400/20 border-amber-400/40 text-amber-200 hover:bg-amber-400/30"
                            }`}
                            title="View Plan Details & Upgrade Tier"
                          >
                            <Crown className="w-3 h-3 text-amber-300" />
                            <span>{tierMeta.name}: <strong>{currentCount} / {maxSts}</strong> Students</span>
                          </button>
                        );
                      })()}
                      {school.affiliation ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-400/15 border border-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full font-medium">
                          <Award className="w-3 h-3 text-amber-300" />
                          {school.affiliation}
                        </span>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="inline-flex items-center gap-1 text-[10px] bg-white/10 hover:bg-white/15 border border-white/15 text-slate-300 px-2 py-0.5 rounded-full cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-amber-300" /> Add Board
                        </button>
                      )}
                      {activeSession && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/20 border border-blue-400/30 text-blue-200 px-2 py-0.5 rounded-full font-medium">
                          <Calendar className="w-3 h-3 text-blue-300" />
                          Session: {activeSession.name}
                        </span>
                      )}
                      {isDefaultDemoSchool && (
                        <button
                          onClick={() => handleToggleDemoData(!demoEnabled)}
                          className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-0.5 rounded-full font-bold transition-all shadow-sm cursor-pointer border ${
                            demoEnabled
                              ? "bg-amber-500/25 border-amber-400 text-amber-200 hover:bg-amber-500/35"
                              : "bg-emerald-500/25 border-emerald-400 text-emerald-200 hover:bg-emerald-500/35"
                          }`}
                          title="Toggle Demo Data"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${demoEnabled ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
                          <span>Demo: <strong>{demoEnabled ? "ON" : "OFF"}</strong></span>
                        </button>
                      )}
                    </div>

                    {/* Tagline / Motto */}
                    <div className="mt-1">
                      {school.tagline ? (
                        <p className="text-xs text-blue-200/90 italic font-serif line-clamp-1">
                          &ldquo;{school.tagline}&rdquo;
                        </p>
                      ) : (
                        <button
                          onClick={() => setShowFullSchoolProfileEditor(true)}
                          className="text-[11px] text-blue-300/70 hover:text-blue-200 italic flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-2.5 h-2.5 text-blue-300" />
                          <span>Add school motto / tagline</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Unified Card Header Action: Log Out Button directly in Master Card */}
                <div className="flex items-center gap-2 shrink-0 self-start">
                  <button
                    onClick={handlePerformLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 border border-rose-400/40 text-rose-200 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm shrink-0"
                    title="School Admin ERP se Log Out karein"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>

              {/* 2. COMPACT 2x2 INSTITUTIONAL CREDENTIALS MATRIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Campus Address */}
                <div className="flex items-start gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl p-2.5 border border-white/[0.08] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Campus Address</span>
                    {school.address ? (
                      <p className="font-semibold text-white text-xs line-clamp-1 mt-0.5">{school.address}</p>
                    ) : (
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-blue-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add address
                      </button>
                    )}
                  </div>
                </div>

                {/* Helpline & Contact */}
                <div className="flex items-start gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl p-2.5 border border-white/[0.08] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Helpline & Contact</span>
                    {school.mobile || school.phone ? (
                      <p className="font-semibold text-white text-xs truncate mt-0.5">{school.mobile || school.phone}</p>
                    ) : (
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-emerald-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add phone
                      </button>
                    )}
                  </div>
                </div>

                {/* Principal / Head */}
                <div className="flex items-start gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl p-2.5 border border-white/[0.08] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Principal / Head</span>
                      {school.principalSignatureUrl ? (
                        <span className="text-[9px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded font-black">✍️ Sign OK</span>
                      ) : (
                        <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-amber-300 hover:underline font-bold cursor-pointer">+ Add Sign</button>
                      )}
                    </div>
                    {school.principalName ? (
                      <p className="font-semibold text-white text-xs truncate mt-0.5">
                        {school.principalName}
                        {school.principalPhone && (
                          <span className="text-[10px] text-slate-300 font-normal ml-1">({school.principalPhone})</span>
                        )}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-amber-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Principal Name
                      </button>
                    )}
                  </div>
                </div>

                {/* Official Email / Director */}
                <div className="flex items-start gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] rounded-xl p-2.5 border border-white/[0.08] transition-all">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Mail className="w-3.5 h-3.5 text-sky-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Official Email / Director</span>
                      {school.directorSignatureUrl ? (
                        <span className="text-[9px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-1.5 py-0.2 rounded font-black">✍️ Sign OK</span>
                      ) : school.directorName ? (
                        <button onClick={() => setShowDigitalSignatureModal(true)} className="text-[10px] text-sky-300 hover:underline font-bold cursor-pointer">+ Add Sign</button>
                      ) : null}
                    </div>
                    {school.email || school.directorName ? (
                      <p className="font-semibold text-white text-xs truncate mt-0.5">
                        {school.email || school.directorName}
                        {school.directorPhone && (
                          <span className="text-[10px] text-slate-300 font-normal ml-1">({school.directorPhone})</span>
                        )}
                      </p>
                    ) : (
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-sky-300 hover:underline flex items-center gap-1 mt-0.5 text-xs font-medium cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Email
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. CONSOLIDATED ACTION TOOLBAR (All inside 1 cohesive bar) */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowFullSchoolProfileEditor(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black shadow-md shadow-blue-900/40 border border-blue-400/30 active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    onClick={() => setShowDigitalSignatureModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 hover:text-white font-bold border border-amber-400/30 active:scale-95 transition-all cursor-pointer shadow-xs"
                    title="Screen pe Principal aur Director ke signatures karein"
                  >
                    <PenTool className="w-3.5 h-3.5 text-amber-300" />
                    <span>✍️ Signatures</span>
                  </button>

                  <button
                    onClick={() => setView("public_website")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Website</span>
                  </button>

                  <button
                    onClick={() => setShowFullSchoolProfileEditor(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/10 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Letterhead</span>
                  </button>

                  <button
                    onClick={() => setLockCodeDrawerOpen(p => !p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                      lockCodeActive
                        ? "bg-amber-400/20 border-amber-400/40 text-amber-200"
                        : "bg-white/10 border-white/10 text-slate-300 hover:text-white"
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lockCodeActive ? "🔒 Lock Code: Active" : "Lock Code"}</span>
                    {lockCodeDrawerOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {onPreviewTeacher && (
                    <button
                      onClick={onPreviewTeacher}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 border border-purple-700/50 text-purple-200 hover:text-white font-medium transition cursor-pointer"
                      title="Teacher View preview karein"
                    >
                      <GraduationCap className="w-3.5 h-3.5 text-purple-300" />
                      <span>Teacher View</span>
                    </button>
                  )}

                  {onPreviewStudent && (
                    <button
                      onClick={onPreviewStudent}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-900/40 hover:bg-indigo-800/60 border border-indigo-700/50 text-indigo-200 hover:text-white font-medium transition cursor-pointer"
                      title="Student View preview karein"
                    >
                      <Users className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Student View</span>
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    if (!schoolCardExpanded) openEditSchoolInfo();
                    setSchoolCardExpanded(p => !p);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span>{schoolCardExpanded ? "Hide Quick Edit" : "⚡ Quick Edit"}</span>
                  {schoolCardExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* 4. INTEGRATED LOCK CODE DRAWER */}
              {lockCodeDrawerOpen && (
                <div className="mt-3 pt-3 border-t border-white/15 bg-black/30 rounded-2xl p-4 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-sm text-white">School Security Lock Code</h4>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lockCodeActive ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/10 text-slate-400'}`}>
                        {lockCodeActive ? '🔒 Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      Jab active hoga, students ko school portal se judne ke liye yeh secret code enter karna hoga.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-200">
                      <input
                        type="checkbox"
                        checked={lockCodeActive}
                        onChange={e => setLockCodeActive(e.target.checked)}
                        className="w-4 h-4 accent-amber-500 cursor-pointer"
                      />
                      <span>Lock Code Enable Karo</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showLockCode ? "text" : "password"}
                          placeholder="Secret code enter karein"
                          value={lockCodeInput}
                          onChange={e => setLockCodeInput(e.target.value)}
                          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLockCode(!showLockCode)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {showLockCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={saveLockCode}
                        disabled={savingLockCode}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${lockCodeSaved ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'} disabled:opacity-60`}
                      >
                        {savingLockCode ? 'Saving...' : lockCodeSaved ? '✓ Saved!' : 'Save Code'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Fast Inline Edit Drawer (optional expand) */}
                {schoolCardExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/15 bg-black/20 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">⚡ Quick Field Update</p>
                      <button
                        onClick={() => setShowFullSchoolProfileEditor(true)}
                        className="text-xs text-blue-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
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
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold disabled:opacity-60 shadow cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {savingSchoolInfo ? "Saving..." : "Save Quick Updates"}
                      </button>
                      <button
                        onClick={() => setSchoolCardExpanded(false)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-slate-200 rounded-lg text-xs cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              type="button"
              onClick={() => setView("students")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-200/70 dark:border-slate-700 text-left hover:border-blue-400 transition cursor-pointer"
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Students</p>
              <p className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">{displayedStudents.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setView("teachers")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-200/70 dark:border-slate-700 text-left hover:border-emerald-400 transition cursor-pointer"
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Teachers</p>
              <p className="text-xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{displayedTeachers.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setView("classes")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-slate-200/70 dark:border-slate-700 text-left hover:border-purple-400 transition cursor-pointer"
            >
              <p className="text-[10px] font-bold uppercase text-slate-400">Classes</p>
              <p className="text-xl font-black tabular-nums text-purple-600 dark:text-purple-400 mt-0.5">{displayedClasses.length}</p>
            </button>
            <button
              type="button"
              onClick={() => setView("community")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-rose-200/80 dark:border-rose-800/60 text-left hover:border-rose-400 transition cursor-pointer"
            >
              <p className="text-[10px] font-bold uppercase text-rose-500">Community</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">Live</p>
            </button>
          </div>

          {/* ── COLLAPSIBLE SUB-ADMIN MANAGEMENT ──────────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-3 border border-slate-200/70 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setSubAdminExpanded(prev => !prev)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">Sub-Admin Access Manage Karo</h3>
                  <p className="text-[11px] text-slate-400">
                    {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').length} active sub-admin(s)
                  </p>
                </div>
              </div>
              {subAdminExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {subAdminExpanded && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-3">
                <p className="text-xs text-slate-400">
                  Apne school ke kisi trusted member ko sub-admin banao — woh bhi content, classes, students manage kar sakta hai.
                </p>

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
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
                          title="Remove sub-admin"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Sub-Admin ka Email</label>
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
                  className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {assigningSubAdmin ? 'Searching...' : 'Sub-Admin Banao'}
                </button>
              </div>
            )}
          </div>

          {/* ── UNIFIED PREMIUM SUBSCRIPTION CARD (Problem 1 & 2) ────────────────── */}
          {school && (() => {
            const expIso = school.subscription?.expiresAt || school.subscription?.paidUntil || '2027-04-24T23:59:59.000Z';
            const expTime = expIso ? new Date(expIso).getTime() : 0;
            const msLeft = expTime ? expTime - nowTick : null;
            const isExpired = msLeft !== null && msLeft <= 0;
            const isWithin48Hours = msLeft !== null && msLeft > 0 && msLeft <= 48 * 3600 * 1000;
            const daysLeft = msLeft !== null ? Math.ceil(msLeft / 86400000) : null;
            const planDuration = school.subscription?.planDuration;
            const isBasic = subTier === "starter_200" || subTier === "lite";
            const isStandard = subTier === "growth_500";
            const isPro = subTier === "enterprise_2000" || subTier === "full" || (!isBasic && !isStandard);
            const planLabel = isBasic
              ? "Basic Plan (200 Students)"
              : isStandard
              ? "Standard Plan (500 Students)"
              : "Pro Plan (2000 Students)";
            const durationBadgeText =
              planDuration === "1_year"
                ? "1st Year Session"
                : planDuration === "monthly"
                ? "Monthly"
                : null;

            // Exact formatted expiry date (e.g. 24 April 2027)
            const formattedExpiryDate = expIso
              ? new Date(expIso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
              : "24 April 2027";

            // Live 48-hour ticking countdown string (Hour : Min : Sec)
            let liveCountdownText = "";
            if (isWithin48Hours && msLeft !== null) {
              const totalSec = Math.max(0, Math.floor(msLeft / 1000));
              const hrs = Math.floor(totalSec / 3600);
              const mins = Math.floor((totalSec % 3600) / 60);
              const secs = totalSec % 60;
              liveCountdownText = `${hrs.toString().padStart(2, "0")} Hours : ${mins.toString().padStart(2, "0")} Mins : ${secs.toString().padStart(2, "0")} Secs remaining`;
            }

            return (
              <div className={`rounded-3xl border-2 p-5 mb-5 shadow-lg relative overflow-hidden transition-all ${
                isExpired
                  ? "bg-gradient-to-br from-red-950/40 via-slate-900 to-red-950/30 border-red-500/50 text-white"
                  : isPro
                  ? "bg-gradient-to-br from-amber-500/10 via-white to-orange-500/10 dark:from-amber-950/40 dark:via-slate-900 dark:to-orange-950/30 border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/5"
                  : isStandard
                  ? "bg-gradient-to-br from-purple-500/10 via-white to-indigo-500/10 dark:from-purple-950/40 dark:via-slate-900 dark:to-indigo-950/30 border-purple-400/60 dark:border-purple-500/40 shadow-purple-500/5"
                  : "bg-gradient-to-br from-blue-500/10 via-white to-indigo-500/10 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 border-blue-400/60 dark:border-blue-500/40 shadow-blue-500/5"
              }`}>
                {/* Decorative background glow */}
                <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-400/10 dark:bg-amber-400/5 rounded-full blur-2xl pointer-events-none" />

                {/* Top Header Row: Icon + Plan Status + Active Badge */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                      isExpired
                        ? "bg-red-600 text-white"
                        : isPro
                        ? "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-amber-500/30 ring-2 ring-amber-300/50"
                        : isStandard
                        ? "bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 text-white shadow-purple-500/30 ring-2 ring-purple-300/50"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30"
                    }`}>
                      {isExpired ? <Lock className="w-6 h-6 text-white" /> : isPro ? <Crown className="w-7 h-7 text-white" /> : isStandard ? <Users className="w-6 h-6 text-white" /> : <Shield className="w-6 h-6 text-white" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-lg text-slate-800 dark:text-white tracking-tight">
                          {planLabel}
                        </h3>
                        {durationBadgeText && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {durationBadgeText}
                          </span>
                        )}
                        {subscriptionActive && !isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            [ACTIVE]
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-black bg-red-600 text-white shadow-sm shadow-red-600/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            [EXPIRED]
                          </span>
                        )}
                      </div>
                      {/* Exact Expiry Date */}
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 mt-1">
                        <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>📅 Valid Till: <strong className="text-slate-900 dark:text-white font-black">{formattedExpiryDate}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Days count or Expired badge */}
                  <div className="text-right">
                    {!isExpired && daysLeft !== null && !isWithin48Hours ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                        {daysLeft} Days Remaining
                      </span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-black bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300">
                        Expired
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* 48-Hour Live Ticking Countdown Bar */}
                {isWithin48Hours && (
                  <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/15 dark:bg-amber-950/50 border-2 border-amber-500/50 shadow-sm animate-pulse">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5 flex-wrap">
                          <span>⚠️ Expiring Soon:</span>
                          <span className="font-mono tracking-tight text-amber-900 dark:text-amber-100 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-lg border border-amber-400/50 font-black">
                            {liveCountdownText}
                          </span>
                        </p>
                        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-0.5">
                          Subscription expire hote hi sabhi school modules lock ho jayenge. Turant renew karwayen!
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Integrated Action Buttons: View Plan Details & Upgrade / Store */}
                <div className="mt-4 pt-3.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setView("subscription")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>View Plan Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView("store")}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-[0.98] shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Upgrade / Store</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── NSTA MESSENGER CLASS BROADCAST HERO BANNER ─────────────────── */}
          <div className="mb-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white shadow-xl border-2 border-indigo-500/50 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/50 ring-2 ring-indigo-400/60">
                <Bell className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm sm:text-base text-white">NSTA Messenger Broadcast Studio</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">PRO ⚡ 1-CLICK</span>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  क्लास-वाइज़ 1-वे ब्रॉडकास्ट, A6 फीस मांग स्लिप व लॉक-स्क्रीन पुश अलर्ट भेजें (कोई ग्रुप चैट अव्यवस्था नहीं)
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView("nsta_broadcast")}
              className="py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>ओपन ब्रॉडकास्ट स्टूडियो</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* ── ABSENTEE ACTION CENTER HERO BANNER ─────────────────── */}
          <div className="mb-4 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-950 via-slate-900 to-amber-950 text-white shadow-xl border-2 border-rose-500/50 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/50 ring-2 ring-rose-400/60">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-sm sm:text-base text-white">Absenty Action Center</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-400 text-slate-950">1-DAY PUSH & 2-DAY CALL</span>
                </div>
                <p className="text-xs text-rose-200 mt-1">
                  1-Day Absentees ko direct app push notification aur 2-Day+ lagatar absentees ko 1-tap call karne ki suvidha
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView("absentee")}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <span>ओपन Absenty Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Clean App Feature Grid (Every section opens cleanly in its own view) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                School ERP Modules (Tap to Open)
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                All Links Live Synced
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {menuItems.map((item: any, idx) => (
                <button
                  key={item.view || `menu-item-${item.label}-${idx}`}
                  type="button"
                  onClick={() => setView(item.view as AdminView)}
                  className={`rounded-2xl p-3.5 shadow-sm border flex flex-col justify-between gap-2.5 hover:shadow-md transition active:scale-[0.98] text-left cursor-pointer ${
                    item.view === "nsta_broadcast"
                      ? "col-span-2 sm:col-span-1 bg-gradient-to-br from-indigo-500/15 via-white to-purple-500/15 dark:from-indigo-950/60 dark:via-slate-800 dark:to-purple-950/40 border-indigo-400/80 dark:border-indigo-600 hover:border-indigo-500 ring-1 ring-indigo-500/30"
                      : item.featured
                      ? "col-span-2 sm:col-span-1 bg-gradient-to-br from-rose-500/10 via-white to-amber-500/10 dark:from-rose-950/40 dark:via-slate-800 dark:to-amber-950/30 border-rose-200/80 dark:border-rose-800/60 hover:border-rose-400"
                      : "bg-white dark:bg-slate-800 border-slate-200/70 dark:border-slate-700 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/70 flex items-center justify-center shrink-0">
                      {item.icon}
                    </div>
                    {item.count !== null && item.count !== undefined && (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                        item.featured
                          ? "bg-rose-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}>
                        {item.count}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-black text-slate-800 dark:text-white text-sm leading-snug">
                      {item.label}
                    </p>
                    {item.subtitle && (
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
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
          totalStudents={students.filter(s => isStudentInClass(s, qrModalClass.id, qrModalClass.name)).length}
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
            logoUrl: getSavedSchoolLogo(school.logoUrl, schoolId),
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
      {school && showDirectAdmissionModal && (
        <DirectAdmissionModal
          isOpen={showDirectAdmissionModal}
          onClose={() => setShowDirectAdmissionModal(false)}
          school={school}
          classes={displayedClasses}
          activeSession={activeSession}
          defaultClassId={selectedClass?.id || displayedClasses[0]?.id}
          existingStudents={displayedStudents}
          adminUid={adminUid}
          onSuccess={(newStudent, admFee) => {
            setShowDirectAdmissionModal(false);
            setStudents(prev => [newStudent, ...prev.filter(s => s.id !== newStudent.id)]);
            setAdmissionPrintPayload({
              student: newStudent,
              fee: admFee || null,
              mode: admFee ? "combined" : "form_only",
            });
          }}
        />
      )}
      {school && admissionPrintPayload && (
        <AdmissionFormPrintModal
          isOpen={Boolean(admissionPrintPayload)}
          onClose={() => setAdmissionPrintPayload(null)}
          school={school}
          student={admissionPrintPayload.student}
          className={
            displayedClasses.find(c => c.id === admissionPrintPayload.student.classId)?.name ||
            admissionPrintPayload.student.className ||
            ""
          }
          initialMode={admissionPrintPayload.mode}
        />
      )}
      {school && selectedTeacherForIdCard && (
        <TeacherIdCardModal
          isOpen={true}
          teacher={selectedTeacherForIdCard}
          school={school}
          onClose={() => setSelectedTeacherForIdCard(null)}
          onOpenTestPortal={() => {
            setSelectedTeacherForIdCard(null);
            if (onPreviewTeacher) onPreviewTeacher();
          }}
        />
      )}
      {renderAdminBottomNav()}
    </div>
  );
};

export default SchoolAdminPanel;
