// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  GraduationCap,
  Calendar,
  CalendarDays,
  CalendarCheck,
  CreditCard,
  Award,
  BookOpen,
  Bell,
  QrCode,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Camera,
  FileText,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  LogOut,
  MessageCircle,
  Home,
  Users,
  Image as ImageIcon,
  Search,
  ReceiptText,
  Youtube,
  Palmtree,
  Sun,
  Play,
  Share2,
  Heart,
  Film,
  Filter,
  Layers,
  Eye,
  RefreshCw,
  UserPlus,
  ChevronDown,
  Check,
  X,
  ShoppingBag,
} from "lucide-react";
import QRCode from "react-qr-code";
import { ClassroomVideoArchive } from "./ClassroomVideoArchive";
import { CustomPlayer } from "../CustomPlayer";
import {
  getSchool,
  getLocalStudents,
  setLocalStudents,
  getLocalClasses,
  getStudentOrAdmissionRecord,
  getLocalAttendance,
  getMonthlyAttendance,
  todayStr,
  currentMonthStr,
  getLocalFees,
  getStudentFees,
  subscribeToStudentFees,
  getLocalExams,
  getExams,
  subscribeToExams,
  subscribeToStudent,
  updateStudentPhoto,
  getHomework,
  getNotices,
  getSchoolHolidays,
  subscribeToNotices,
  subscribeToSchoolHolidays,
  subscribeToSchoolCommunityPosts,
  subscribeToTeachers,
  getClasses,
  isDemoRecord,
  shouldUseDemoForSchool,
  type SchoolCommunityPost,
  isStudentBirthdayToday,
  dispatchOfficialSchoolBirthdayWish,
  checkAndDispatchTodaysBirthdays,
} from "../../school-firebase";
import { getSavedSchoolLogo, isAppLogo } from "./feeReceiptUtils";
import { getDemoSchoolDataset, isHolidayDate, isDemoDataEnabled, setDemoDataEnabled } from "./demoDataStore";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { AdmissionFormPrintModal } from "./AdmissionFormPrintModal";
import { AnnualBulkFeeStatementModal } from "./AnnualBulkFeeStatementModal";
import { QrAttendanceScannerModal } from "./QrAttendanceScannerModal";
import { SchoolCommunityFeed } from "./SchoolCommunityFeed";
import { SchoolClassChannelView } from "./SchoolClassChannelView";
import { NstaMessengerSuite } from "./NstaMessengerSuite";
import { SchoolWelcomeModal } from "./SchoolWelcomeModal";
import { SchoolBirthdayModal } from "./SchoolBirthdayModal";
import { StudentSchoolStore } from "./StudentSchoolStore";
import { downloadFeeDocument, shareFeeReceiptOnWhatsApp } from "./feeDocument";
import {
  getSchoolPushEnabledState,
  enableSchoolPushForUser,
  disableSchoolPushForUser,
  syncStudentFeeDueForPush,
  sendSchoolPushNotification,
} from "../../utils/schoolPushClient";
import type { School, SchoolStudent, SchoolTeacher, NstaWelcomeData, NstaBirthdayData } from "../../school-types";

interface Props {
  uid?: string;
  schoolId?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  sessionId?: string;
  linkedStudent?: any;
  allLinkedStudents?: any[];
  initialTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  onAddAnotherStudentQr?: () => void;
  onOpenPlatformContent?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  // Backward compatibility props
  students?: any[];
  onAddStudent?: any;
  onSelectForFee?: any;
}

type TabType =
  | "overview"
  | "channel"
  | "attendance"
  | "fees"
  | "exams"
  | "homework"
  | "notices"
  | "community"
  | "idcard"
  | "teachers"
  | "videos"
  | "holidays"
  | "events_memories"
  | "explore_plus"
  | "store"
  | "profile";

export const StudentSchoolPanel: React.FC<Props> = ({
  uid,
  schoolId = "dps_gurgaon_sector45",
  studentId,
  studentName,
  classId,
  sessionId,
  linkedStudent,
  allLinkedStudents,
  initialTab,
  onTabChange,
  onAddAnotherStudentQr,
  onOpenPlatformContent,
  onBack,
  onLogout,
}) => {
  const normalizeTab = (t?: string): TabType => {
    if (!t) return "overview";
    if (t === "updates" || t === "messenger" || t === "chat" || t === "nsta_messenger") return "channel";
    if (t === "feed" || t === "community" || t === "notices") return "holidays";
    if (t === "memories" || t === "events") return "events_memories";
    if (t === "explore") return "explore_plus";
    if (t === "store" || t === "shop" || t === "school_store") return "store";
    if ([
      "overview", "channel", "attendance", "fees", "exams", "homework",
      "idcard", "teachers", "videos", "holidays", "events_memories",
      "explore_plus", "store"
    ].includes(t)) {
      return t as TabType;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => normalizeTab(initialTab));
  const [communityInitialFilter, setCommunityInitialFilter] = useState<"ALL" | "HOLIDAY" | "NOTICE" | "EVENT_MEDIA" | "HOMEWORK">("ALL");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  useEffect(() => {
    onTabChange?.(activeTab);
  }, [activeTab, onTabChange]);

  const effectiveUid = useMemo(() => {
    if (uid) return uid;
    try {
      const raw = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.id || p?.uid) return String(p.id || p.uid);
      }
    } catch {}
    return studentId || "guest";
  }, [uid, studentId]);

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => getSchoolPushEnabledState(effectiveUid));
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleStudentLogout = () => {
    try {
      localStorage.removeItem("nst_current_user");
      localStorage.removeItem("nsta_cached_user");
      localStorage.removeItem("nst_is_guest");
      localStorage.setItem("nst_logged_out", "true");
    } catch (e) {}
    if (onLogout) {
      onLogout();
    } else if (onBack) {
      onBack();
    } else {
      window.location.reload();
    }
  };
  const [school, setSchool] = useState<School | null>(null);
  const [selectedFeeForReceipt, setSelectedFeeForReceipt] = useState<any | null>(null);
  const [feeModalFormat, setFeeModalFormat] = useState<"a6" | "pos">("pos");
  const [feeViewMode, setFeeViewMode] = useState<"cards" | "table">("cards");
  const [showPreAdmissionMonths, setShowPreAdmissionMonths] = useState<boolean>(false);
  const [selectedAdmissionModal, setSelectedAdmissionModal] = useState<{
    isOpen: boolean;
    mode: "receipt_only" | "form_only" | "combined";
    feeRecord?: any;
  } | null>(null);
  const [showBulkFeeModal, setShowBulkFeeModal] = useState(false);
  const [showQrAttendanceScanner, setShowQrAttendanceScanner] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [liveFees, setLiveFees] = useState<any[]>([]);
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [liveAttendanceRecords, setLiveAttendanceRecords] = useState<any[]>([]);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  // ── School Events & Memories states
  const [selectedMemoryMedia, setSelectedMemoryMedia] = useState<{
    type: "IMAGE" | "VIDEO";
    url: string;
    title: string;
    eventName?: string;
    date?: string;
    description?: string;
  } | null>(null);
  const [eventsFilter, setEventsFilter] = useState<string>("ALL");

  // ── Holidays page states
  const [holidaysFilter, setHolidaysFilter] = useState<string>("ALL");
  const [holidaysSearch, setHolidaysSearch] = useState<string>("");

  // ── Notification and Student Switcher Modals
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showStudentSwitcherModal, setShowStudentSwitcherModal] = useState<boolean>(false);
  const [welcomeModalData, setWelcomeModalData] = useState<NstaWelcomeData | null>(null);

  // Check for newly created ID or scan-login welcome celebration trigger
  useEffect(() => {
    try {
      const pendingKey = `nst_show_welcome_popup_${studentId}`;
      const hasPopup = localStorage.getItem(pendingKey);
      if (hasPopup) {
        localStorage.removeItem(pendingKey);
        let parsed: NstaWelcomeData | null = null;
        try {
          parsed = JSON.parse(hasPopup);
        } catch {}
        if (!parsed || typeof parsed !== "object") {
          try {
            const rawStored = localStorage.getItem("nst_pending_welcome_student");
            if (rawStored) parsed = JSON.parse(rawStored);
          } catch {}
        }
        if (!parsed || !parsed.studentName) {
          parsed = {
            studentId: studentId || "std",
            studentName: studentName || "Student",
            admissionNo: "ADM-001",
            rollNo: "01",
            className: "Class 10",
            schoolName: "NSTA Digital School",
            issuedAt: new Date().toISOString(),
          };
        }
        setWelcomeModalData(parsed);
      }
    } catch {}
  }, [studentId, studentName]);

  useEffect(() => {
    const handleWelcomeEvent = (e: any) => {
      if (e?.detail) {
        setWelcomeModalData(e.detail);
      }
    };
    window.addEventListener("nst-school-welcome-received", handleWelcomeEvent);
    return () => window.removeEventListener("nst-school-welcome-received", handleWelcomeEvent);
  }, []);



  // Load demo dataset for fallback / syllabus / calendar
  const dataset = useMemo(() => getDemoSchoolDataset(), []);

  // Find this student record from local school database, session cache, or dataset
  const currentStudent: SchoolStudent = useMemo(() => {
    // 0. Check cached logged in user from localStorage
    let sessionUser: any = null;
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) sessionUser = JSON.parse(rawUser);
    } catch {}

    const localStudents = getLocalStudents(schoolId);
    const localClasses = getLocalClasses(schoolId);

    // Look up by studentId, admissionNo, linkedStudent, or sessionUser identity
    const matchId = studentId || linkedStudent?.id || sessionUser?.id || sessionUser?.studentId || sessionUser?.uid;
    const matchName = studentName || linkedStudent?.name || sessionUser?.name;
    const matchAdm = linkedStudent?.admissionNo || sessionUser?.admissionNo;
    const matchRoll = linkedStudent?.rollNo || sessionUser?.rollNo || sessionUser?.displayId?.replace("ROLL-", "");

    // Heal any student record whose className was previously polluted by rollNo (e.g. "01" instead of "Nursery")
    const healStudentRecord = (rec: any): SchoolStudent => {
      if (!rec) return rec;
      const healed = { ...rec };
      const rawClsName = typeof healed.className === "string" ? healed.className.trim() : "";
      const rawRoll = typeof healed.rollNo === "string" ? healed.rollNo.trim() : "";
      const isBogusRollClass =
        Boolean(rawClsName) &&
        ((rawRoll && rawClsName === rawRoll && /^0?\d+$/.test(rawClsName) && (healed.classId || "").toLowerCase().includes("nursery")) ||
          /^0\d+$/.test(rawClsName) ||
          /^class\s+0\d+$/i.test(rawClsName));

      if (isBogusRollClass) {
        const clsObj = localClasses.find((c) => c.id === healed.classId);
        const linkedCls =
          linkedStudent?.className &&
          !/^0\d+$/.test(String(linkedStudent.className).trim()) &&
          !/^class\s+0\d+$/i.test(String(linkedStudent.className).trim())
            ? linkedStudent.className
            : undefined;
        healed.className =
          clsObj?.name ||
          linkedCls ||
          ((healed.classId || "").toLowerCase().includes("nursery") ? "Nursery" : undefined);

        try {
          const targetSid = healed.schoolId || schoolId;
          const pool = getLocalStudents(targetSid);
          if (pool.some((p) => p.id === healed.id)) {
            setLocalStudents(
              targetSid,
              pool.map((p) => (p.id === healed.id ? { ...p, className: healed.className } : p))
            );
          }
        } catch {}
      }

      if (linkedStudent) {
        if (!healed.className && linkedStudent.className && !/^0\d+$/.test(String(linkedStudent.className).trim())) {
          healed.className = linkedStudent.className;
        }
        if (!healed.fatherName && linkedStudent.fatherName) healed.fatherName = linkedStudent.fatherName;
        if (!healed.motherName && linkedStudent.motherName) healed.motherName = linkedStudent.motherName;
        if (!healed.schoolName && linkedStudent.schoolName) healed.schoolName = linkedStudent.schoolName;
        if ((!healed.monthlyFee || healed.monthlyFee <= 0) && Number(linkedStudent.monthlyFee) > 0) {
          healed.monthlyFee = Number(linkedStudent.monthlyFee);
        }
      }
      return healed;
    };

    // 1. Match in current school's local student pool by unique ID or unique Admission No
    if (matchId) {
      const foundLocal = localStudents.find(
        (s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase())
      );
      if (foundLocal) return healStudentRecord(foundLocal);
    }
    if (matchAdm) {
      const foundByAdm = localStudents.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()
      );
      if (foundByAdm) return healStudentRecord(foundByAdm);
    }
    if (matchName) {
      const foundLocalByName = localStudents.find(
        (s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );
      if (foundLocalByName) return healStudentRecord(foundLocalByName);
    }

    // 2. If linkedStudent was passed directly from SchoolEcosystem QR/ID login, use it directly
    if (linkedStudent && (linkedStudent.id || linkedStudent.admissionNo || linkedStudent.name)) {
      return healStudentRecord(linkedStudent);
    }

    // 3. Check demo dataset ONLY when demo data is enabled for the default demo school
    const studentsList = (shouldUseDemoForSchool(schoolId) && Array.isArray(dataset?.students)) ? dataset.students : [];
    if (matchId) {
      const found = studentsList.find(
        (s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase())
      );
      if (found) return found;
    }
    if (matchAdm) {
      const found = studentsList.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()
      );
      if (found) return found;
    }
    if (matchName) {
      const foundByName = studentsList.find(
        (s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );
      if (foundByName) return foundByName;
    }

    // 5. CRITICAL: If student is logged in or provided by name/props, construct their authentic record!
    if (matchName || matchAdm || matchId) {
      const isNadim = (matchName && matchName.toLowerCase().includes("nadim")) || (matchAdm && matchAdm.includes("6616"));
      const rawSessionCls = (sessionUser as any)?.className;
      const cleanSessionCls =
        rawSessionCls && !/^0\d+$/.test(String(rawSessionCls).trim()) && !/^class\s+0\d+$/i.test(String(rawSessionCls).trim())
          ? rawSessionCls
          : undefined;
      const safeStudent: SchoolStudent = {
        id: matchId || `std_${Date.now()}`,
        schoolId: sessionUser?.schoolId || schoolId,
        schoolName: sessionUser?.schoolName || (sessionUser as any)?.school || (isNadim ? "Life maker public school" : (sessionUser?.schoolName || "School")),
        sessionId: sessionId || "demo_session_2026_27",
        classId: (sessionUser as any)?.classId || classId || sessionUser?.classLevel || (isNadim ? "cls_nursery" : "cls_10"),
        className: cleanSessionCls || (isNadim ? "Nursery" : undefined),
        name: matchName || sessionUser?.name || "Student",
        rollNo: matchRoll || (matchId?.startsWith("ROLL-") ? matchId.replace("ROLL-", "") : "01"),
        admissionNo: matchAdm || sessionUser?.admissionNo || `ADM-${(matchId || "26").slice(-6).toUpperCase()}`,
        fatherName: sessionUser?.fatherName || "",
        motherName: sessionUser?.motherName || "",
        phone: sessionUser?.mobile || sessionUser?.phone || "",
        bloodGroup: sessionUser?.bloodGroup || undefined,
        dateOfBirth: (sessionUser as any)?.dateOfBirth || undefined,
        address: (sessionUser as any)?.address || undefined,
        monthlyFee: (typeof sessionUser?.monthlyFee === "number" && sessionUser.monthlyFee > 0)
          ? sessionUser.monthlyFee
          : 1000,
        photoUrl: sessionUser?.photoURL || sessionUser?.photoUrl || "",
        active: true,
        createdAt: new Date().toISOString(),
      };

      try {
        const cur = getLocalStudents(safeStudent.schoolId);
        if (!cur.some(s => s.id === safeStudent.id || (s.admissionNo && s.admissionNo === safeStudent.admissionNo))) {
          setLocalStudents(safeStudent.schoolId, [safeStudent, ...cur]);
        }
      } catch {}

      return safeStudent;
    }

    // Fallback demo student only when completely unauthenticated/guest
    const fallbackPool = Array.isArray(dataset?.students) ? dataset.students : [];
    const class10Student = fallbackPool.find(
      (s) =>
        s.classId === "demo_class_c10_sec_a" ||
        (s.classId?.includes("c10") && (!s.section || s.section === "A")) ||
        (s.classId === "cls_10" && s.section === "A")
    );
    return (
      class10Student ||
      fallbackPool[0] || {
        id: "demo_std_c10_a_01",
        schoolId,
        sessionId: sessionId || "demo_session_2026_27",
        classId: classId || "demo_class_c10_sec_a",
        name: studentName || "Aarav Sharma",
        rollNo: "1",
        admissionNo: "ADM-26-C10A01",
        fatherName: "Mr. Rajesh Sharma",
        motherName: "Mrs. Sunita Sharma",
        phone: "9876512010",
        bloodGroup: "O+",
        monthlyFee: 2400,
        active: true,
        createdAt: new Date().toISOString(),
      }
    );
  }, [studentId, studentName, classId, sessionId, schoolId, linkedStudent, dataset]);

  // Synchronize background details from remote Firestore or Admissions
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [liveStudentData, setLiveStudentData] = useState<Partial<SchoolStudent> | null>(null);

  useEffect(() => {
    if (!currentStudent) return;
    if (!currentStudent.fatherName || !(currentStudent as any).className || !currentStudent.motherName) {
      getStudentOrAdmissionRecord(schoolId, {
        id: currentStudent.id,
        admissionNo: currentStudent.admissionNo,
        name: currentStudent.name,
        phone: currentStudent.phone
      }).then((extra) => {
        if (extra) {
          setEnrichedData(extra);
        }
      }).catch(() => {});
    }
  }, [schoolId, currentStudent?.id, currentStudent?.admissionNo, currentStudent?.name]);

  // ── REAL-TIME LIVE SYNC WITH SCHOOL ADMIN DATABASE ──────────────────────────
  useEffect(() => {
    if (!schoolId || !currentStudent?.id) return;
    const unsub = subscribeToStudent(schoolId, currentStudent.id, (freshStudent) => {
      if (freshStudent) {
        setLiveStudentData((prev: any) => ({
          ...prev,
          ...freshStudent,
          // Preserve authentic monthlyFee when admin updates it in School Admin ERP
          monthlyFee:
            typeof freshStudent.monthlyFee === "number" && freshStudent.monthlyFee > 0
              ? freshStudent.monthlyFee
              : (prev?.monthlyFee ?? currentStudent.monthlyFee),
        }));
      }
    });
    return () => unsub();
  }, [schoolId, currentStudent?.id, currentStudent?.monthlyFee]);

  const activeStudent: SchoolStudent = useMemo(() => {
    return {
      ...currentStudent,
      ...(enrichedData || {}),
      ...(liveStudentData || {})
    };
  }, [currentStudent, enrichedData, liveStudentData]);

  const activePhoto = studentPhoto || activeStudent.photoUrl || (activeStudent as any).photoURL || "";

  const studentInitials = useMemo(() => {
    const n = activeStudent.name || "Student";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [activeStudent.name]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setStudentPhoto(dataUrl);
      const finalUrl = await updateStudentPhoto(schoolId, activeStudent.id, dataUrl);
      const resolvedUrl = finalUrl || dataUrl;
      setStudentPhoto(resolvedUrl);
      activeStudent.photoUrl = resolvedUrl;
      const cur = getLocalStudents(schoolId);
      setLocalStudents(
        schoolId,
        cur.map((s) => (s.id === activeStudent.id || s.admissionNo === activeStudent.admissionNo ? { ...s, photoUrl: resolvedUrl } : s))
      );
      if (resolvedUrl && !resolvedUrl.startsWith("data:image/")) {
        try {
          const u = localStorage.getItem("nst_current_user");
          if (u) {
            const parsed = JSON.parse(u);
            parsed.photoURL = resolvedUrl;
            localStorage.setItem("nst_current_user", JSON.stringify(parsed));
          }
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const handleExploreFullApp = () => {
    try {
      localStorage.setItem("nst_app_view_mode", "STUDENT");
      window.dispatchEvent(new CustomEvent("nst_open_student_dashboard"));
    } catch {}
    if (onOpenPlatformContent) {
      onOpenPlatformContent();
    }
  };

  const [classesList, setClassesList] = useState<any[]>(() => schoolId ? getLocalClasses(schoolId) : []);
  const [demoEnabled, setDemoEnabled] = useState<boolean>(() => isDemoDataEnabled());
  const schoolDemoActive = demoEnabled && shouldUseDemoForSchool(schoolId);

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
  };

  useEffect(() => {
    if (!schoolId) return;
    getClasses(schoolId).then((cls) => {
      if (cls && cls.length > 0) setClassesList(cls);
    }).catch(() => {});
  }, [schoolId]);

  const allStudentsInSchool = useMemo(() => {
    const local = getLocalStudents(schoolId) || [];
    const demo = (shouldUseDemoForSchool(schoolId) && Array.isArray(dataset?.students)) ? dataset.students : [];
    const combined = [...local];
    demo.forEach((d) => {
      if (d && !combined.some((c) => c && (c.id === d.id || (c.admissionNo && c.admissionNo === d.admissionNo)))) {
        combined.push(d);
      }
    });
    if (activeStudent && !combined.some((c) => c && c.id === activeStudent.id)) {
      combined.unshift(activeStudent);
    }
    return combined;
  }, [schoolId, dataset?.students, activeStudent]);

  const studentClassLabel = useMemo(() => {
    const isBogusZeroRoll = (val?: string) => {
      if (!val || typeof val !== "string") return true;
      const t = val.trim();
      if (!t || t.startsWith("cls_")) return true;
      if (/^0\d+$/.test(t) || /^class\s+0\d+$/i.test(t)) return true;
      return false;
    };

    // 1. Check available School Admin classes first by exact classId so Admin renames/assignments win
    const localSchoolClasses = schoolId ? getLocalClasses(schoolId) : [];
    const schoolClasses = school?.classes || [];
    const datasetClasses = (schoolDemoActive && Array.isArray(dataset?.classes)) ? dataset.classes : [];
    const allClasses = [...classesList, ...localSchoolClasses, ...schoolClasses, ...datasetClasses];

    const targetClassId = activeStudent?.classId || (activeStudent as any)?.classLevel || linkedStudent?.classId;
    if (targetClassId) {
      const foundCls = allClasses.find(
        (c) => c.id === targetClassId || c.name?.toLowerCase() === String(targetClassId).toLowerCase()
      );
      if (foundCls?.name) {
        return foundCls.name.trim();
      }
    }

    // 2. Direct human-readable class name if present on student or linkedStudent
    const directName =
      (activeStudent as any)?.className ||
      linkedStudent?.className ||
      (activeStudent as any)?.classGrade ||
      (currentStudent as any)?.className;

    if (directName && typeof directName === "string" && !isBogusZeroRoll(directName) && directName.length < 24) {
      return directName.trim();
    }

    // 3. Check if targetClassId encodes Nursery / LKG / UKG / standard class
    if (targetClassId && typeof targetClassId === "string") {
      const lowerId = targetClassId.toLowerCase();
      if (lowerId.includes("pre_nursery") || lowerId.includes("prenursery")) return "Pre-Nursery";
      if (lowerId.includes("nursery")) return "Nursery";
      if (lowerId.includes("lkg")) return "LKG";
      if (lowerId.includes("ukg")) return "UKG";

      const isCrypticId = targetClassId.length >= 14 && /[A-Z]/.test(targetClassId) && /[0-9]/.test(targetClassId);
      if (!isCrypticId) {
        const clean = targetClassId
          .replace(/^cls_/i, "")
          .replace(/_/g, " ")
          .trim();
        if (clean && clean.toLowerCase() !== "demo class c10 sec a") {
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
      }
    }

    // 4. Check session user in localStorage if valid
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.className && !isBogusZeroRoll(parsed.className)) {
          return parsed.className.trim();
        }
      }
    } catch {}

    return "Nursery";
  }, [activeStudent, linkedStudent, dataset, school, schoolId, classesList, demoEnabled, currentStudent]);

  // Format label so it never displays duplicate "Class Class 9" or "Class Nursery"
  const formatClassLabel = (label?: string): string => {
    if (!label) return "Nursery";
    const clean = label.trim();
    if (/^Class\s+/i.test(clean)) return clean;
    if (/^(Nursery|Pre-?Nursery|LKG|UKG|KG|Play|Prep)/i.test(clean)) return clean;
    return `Class ${clean}`;
  };


  // Load school info
  useEffect(() => {
    getSchool(schoolId)
      .then((s) => {
        if (s) setSchool(s);
      })
      .catch(() => {});
  }, [schoolId]);

  // Load real attendance logs
  useEffect(() => {
    const localAtt = getLocalAttendance(schoolId);
    setLiveAttendanceRecords(localAtt);

    const curMonth = todayStr().slice(0, 7);
    getMonthlyAttendance(schoolId, currentStudent.classId || "cls_10", curMonth)
      .then((recs) => {
        if (recs && recs.length > 0) {
          setLiveAttendanceRecords((prev) => {
            const map = new Map();
            [...prev, ...recs].forEach((r) => map.set(`${r.classId}_${r.date}`, r));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [schoolId, currentStudent.classId]);

  // Combined attendance entries for currentStudent
  const studentAttendanceLogs = useMemo(() => {
    const logs: Array<{ date: string; status: string; inTime?: string; outTime?: string; stayDuration?: string }> = [];

    // 1. From live attendance
    liveAttendanceRecords.forEach((rec) => {
      if (rec.students && rec.students[currentStudent.id]) {
        const entry = rec.students[currentStudent.id];
        logs.push({
          date: rec.date,
          status: entry.status || (entry.present ? "present" : "absent"),
          inTime: entry.inTime,
          outTime: entry.outTime,
          stayDuration: entry.stayDuration,
        });
      }
    });

    // 2. From demo dataset (only if this student is one of the demo students)
    if (currentStudent.id?.startsWith("demo_std_")) {
      const demoAtt = Array.isArray((dataset as any)?.attendance) ? (dataset as any).attendance : [];
      demoAtt
        .filter((a: any) => a?.studentId === currentStudent.id)
        .forEach((a: any) => {
          if (!logs.some((l) => l.date === a.date)) {
            logs.push({
              date: a.date,
              status: a.status || "present",
            });
          }
        });
    }

    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [liveAttendanceRecords, currentStudent.id, dataset]);

  // Today's attendance state
  const todayEntry = useMemo(() => {
    const today = todayStr();
    return studentAttendanceLogs.find((l) => l.date === today);
  }, [studentAttendanceLogs]);

  const [realHolidays, setRealHolidays] = useState<any[]>([]);
  const [realNotices, setRealNotices] = useState<any[]>([]);
  const [realHomework, setRealHomework] = useState<any[]>([]);
  const [liveCommunityPosts, setLiveCommunityPosts] = useState<SchoolCommunityPost[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    const loadHomework = () => {
      getHomework(schoolId, activeStudent?.classId)
        .then((hws) => {
          if (mounted) setRealHomework(Array.isArray(hws) ? hws : []);
        })
        .catch(() => {});
    };

    getSchoolHolidays(schoolId)
      .then((hols) => {
        if (mounted && Array.isArray(hols) && hols.length > 0) setRealHolidays(hols);
      })
      .catch(() => {});
    getNotices(schoolId)
      .then((nts) => {
        if (mounted && Array.isArray(nts) && nts.length > 0) setRealNotices(nts);
      })
      .catch(() => {});
    loadHomework();

    const unsubNotices = subscribeToNotices(schoolId, (nts) => {
      if (mounted) setRealNotices(Array.isArray(nts) ? nts : []);
    });
    const unsubHolidays = subscribeToSchoolHolidays(schoolId, (hols) => {
      if (mounted) setRealHolidays(Array.isArray(hols) ? hols : []);
    });
    const unsubCommunity = subscribeToSchoolCommunityPosts(schoolId, (posts) => {
      if (mounted) setLiveCommunityPosts(Array.isArray(posts) ? posts : []);
    });

    window.addEventListener("homework-updated", loadHomework);
    return () => {
      mounted = false;
      unsubNotices();
      unsubHolidays();
      unsubCommunity();
      window.removeEventListener("homework-updated", loadHomework);
    };
  }, [schoolId, activeStudent?.classId, demoEnabled]);

  const [schoolTeachers, setSchoolTeachers] = useState<SchoolTeacher[]>([]);
  const [teacherSearch, setTeacherSearch] = useState<string>("");

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    const unsub = subscribeToTeachers(schoolId, (list) => {
      if (mounted && Array.isArray(list)) {
        setSchoolTeachers(list.filter((t) => t.active !== false));
      }
    });
    return () => {
      mounted = false;
      if (typeof unsub === "function") unsub();
    };
  }, [schoolId]);

  const displayedFaculty = useMemo(() => {
    const list = schoolTeachers;
    if (!teacherSearch.trim()) return list;
    const q = teacherSearch.toLowerCase().trim();
    return list.filter((t) => {
      const matchName = t.name?.toLowerCase().includes(q);
      const matchDesig = t.designation?.toLowerCase().includes(q);
      const matchQual = t.qualification?.toLowerCase().includes(q);
      const matchSubs = Array.isArray(t.subjects)
        ? t.subjects.some((s) => s.toLowerCase().includes(q))
        : (typeof t.subjects === "string" ? (t.subjects as string).toLowerCase().includes(q) : false);
      return matchName || matchDesig || matchQual || matchSubs;
    });
  }, [schoolTeachers, teacherSearch]);

  // Check if today is Sunday or holiday
  const todayHolidayInfo = useMemo(() => {
    const today = todayStr();
    const d = new Date();
    const isSunday = d.getDay() === 0;
    if (isSunday) return { isHoliday: true, name: "Sunday (रविवार - साप्ताहिक अवकाश)" };
    const matchedSchoolHoliday = realHolidays.find(
      (h: any) => h.startDate && today >= h.startDate && today <= (h.endDate || h.startDate)
    );
    if (matchedSchoolHoliday) {
      return { isHoliday: true, name: matchedSchoolHoliday.name || "School Holiday (अवकाश)" };
    }
    if (schoolDemoActive && isHolidayDate(today)) return { isHoliday: true, name: "Festival / Institutional Holiday (अवकाश)" };
    return { isHoliday: false, name: "" };
  }, [realHolidays, schoolDemoActive]);

  const attendanceStats = useMemo(() => {
    if (studentAttendanceLogs.length > 0) {
      const total = studentAttendanceLogs.length;
      const present = studentAttendanceLogs.filter((a) => a.status === "present" || a.status === "late").length;
      const absent = studentAttendanceLogs.filter((a) => a.status === "absent").length;
      const late = studentAttendanceLogs.filter((a) => a.status === "late").length;
      const leave = studentAttendanceLogs.filter((a) => a.status === "leave").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
      return { total, present, absent, late, leave, percentage, hasRealLogs: true };
    }
    return { total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 100, hasRealLogs: false };
  }, [studentAttendanceLogs]);

  // Load real fees with Live Realtime Subscription
  useEffect(() => {
    if (!schoolId || !currentStudent.id) return;

    // Immediate local cache read
    try {
      const local = getLocalFees(schoolId).filter((f: any) => f.studentId === currentStudent.id);
      if (local && local.length > 0) {
        setLiveFees(local);
      }
    } catch {}

    const unsub = subscribeToStudentFees(schoolId, currentStudent.id, (freshFees) => {
      if (freshFees) {
        setLiveFees((prev) => {
          const map = new Map();
          prev.forEach((f) => {
            const k = f.feeType === "admission" || f.receiptCategory === "admission"
              ? `adm_${f.studentId}`
              : `${f.studentId}_${f.month || f.id}`;
            map.set(k, f);
          });
          freshFees.forEach((f) => {
            const k = f.feeType === "admission" || f.receiptCategory === "admission"
              ? `adm_${f.studentId}`
              : `${f.studentId}_${f.month || f.id}`;
            map.set(k, f);
          });
          return Array.from(map.values());
        });
      }
    });

    // Also fetch any remote fees from Firestore
    getStudentFees(schoolId, currentStudent.id)
      .then((remote) => {
        if (remote && remote.length > 0) {
          setLiveFees((prev) => {
            const map = new Map();
            prev.forEach((f) => {
              const k = f.feeType === "admission" || f.receiptCategory === "admission"
                ? `adm_${f.studentId}`
                : `${f.studentId}_${f.month || f.id}`;
              map.set(k, f);
            });
            remote.forEach((f) => {
              const k = f.feeType === "admission" || f.receiptCategory === "admission"
                ? `adm_${f.studentId}`
                : `${f.studentId}_${f.month || f.id}`;
              map.set(k, f);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => unsub();
  }, [schoolId, currentStudent.id, currentStudent.admissionNo, currentStudent.rollNo]);

  // Student monthly fee dynamically determined
  const studentMonthlyFee = useMemo(() => {
    if (typeof activeStudent.monthlyFee === "number" && activeStudent.monthlyFee > 0) {
      return activeStudent.monthlyFee;
    }
    const localSchoolClasses = schoolId ? getLocalClasses(schoolId) : [];
    const schoolClasses = school?.classes || [];
    const datasetClasses = Array.isArray(dataset?.classes) ? dataset.classes : [];
    const allClasses = [...localSchoolClasses, ...schoolClasses, ...datasetClasses];
    const cls = allClasses.find((c) => c.id === activeStudent.classId || c.name?.toLowerCase() === studentClassLabel.toLowerCase());
    if (cls && typeof cls.defaultFee === "number" && cls.defaultFee > 0) {
      return cls.defaultFee;
    }
    return 1800;
  }, [activeStudent, dataset, school, schoolId, studentClassLabel]);

  const tuitionFee = Math.round(studentMonthlyFee * 0.7);
  const computerFee = Math.round(studentMonthlyFee * 0.15);
  const sportsFee = Math.max(0, studentMonthlyFee - tuitionFee - computerFee);

  // Student fees list: complete academic session passbook merged with real live payments (100% synced with School Admin)
  const allStudentFees = useMemo(() => {
    const sessionMonths = [
      { code: "2026-04", name: "April 2026" },
      { code: "2026-05", name: "May 2026" },
      { code: "2026-06", name: "June 2026" },
      { code: "2026-07", name: "July 2026" },
      { code: "2026-08", name: "August 2026" },
      { code: "2026-09", name: "September 2026" },
      { code: "2026-10", name: "October 2026" },
      { code: "2026-11", name: "November 2026" },
      { code: "2026-12", name: "December 2026" },
      { code: "2027-01", name: "January 2027" },
      { code: "2027-02", name: "February 2027" },
      { code: "2027-03", name: "March 2027" },
    ];

    const activeMonth = currentMonthStr();
    const filteredLiveFees = !schoolDemoActive ? liveFees.filter((f: any) => !isDemoRecord(f)) : liveFees;

    // Detect parent receipt numbers that already distributed lump-sum payments into FIFO-* child months
    const fifoParentReceipts = new Set<string>();
    filteredLiveFees.forEach((f: any) => {
      if (typeof f?.receiptNo === "string" && f.receiptNo.startsWith("FIFO-")) {
        const m = f.receiptNo.match(/^FIFO-\d{4}-\d{2}-(.+)$/);
        if (m?.[1]) fifoParentReceipts.add(m[1]);
      }
    });

    const liveMonthMap = new Map<string, any>();
    const extraFees: any[] = [];

    // 1. Identify authentic admission date & month of this student
    const studentJoinDate =
      (activeStudent as any)?.joinDate ||
      (currentStudent as any)?.joinDate ||
      (activeStudent as any)?.admissionDate ||
      (currentStudent as any)?.admissionDate ||
      (typeof activeStudent?.createdAt === "string" ? activeStudent.createdAt.slice(0, 10) : "") ||
      (typeof currentStudent?.createdAt === "string" ? currentStudent.createdAt.slice(0, 10) : "") ||
      (enrichedData as any)?.joinDate ||
      (enrichedData as any)?.admissionDate;

    // Find admission fee record if present
    const rawAdmissionFee = filteredLiveFees.find(
      (f: any) =>
        f.feeType === "admission" ||
        f.receiptCategory === "admission" ||
        (typeof f.receiptNo === "string" && f.receiptNo.startsWith("ADM-"))
    );

    const admissionDateFromFee =
      rawAdmissionFee?.paidDate ||
      rawAdmissionFee?.paymentDate ||
      (typeof rawAdmissionFee?.createdAt === "string" ? rawAdmissionFee.createdAt.slice(0, 10) : "");

    const effectiveJoinDate = studentJoinDate || admissionDateFromFee || "";
    let admissionMonthCode = "";
    if (effectiveJoinDate && /^\d{4}-\d{2}/.test(effectiveJoinDate)) {
      admissionMonthCode = effectiveJoinDate.slice(0, 7);
    } else if (rawAdmissionFee?.month && /^\d{4}-\d{2}$/.test(rawAdmissionFee.month)) {
      admissionMonthCode = rawAdmissionFee.month;
    } else if (!schoolDemoActive && !currentStudent.id?.startsWith("demo_std_")) {
      admissionMonthCode = activeMonth;
    }

    filteredLiveFees.forEach((rawFee: any) => {
      let f = rawFee;
      if (
        f.receiptNo &&
        !String(f.receiptNo).startsWith("FIFO-") &&
        fifoParentReceipts.has(String(f.receiptNo))
      ) {
        const billed = Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);
        const rawPaid = Number(f.paidAmount ?? 0);
        const balDue = Number(f.balanceDue ?? (f.paid ? 0 : billed));
        if (!f.paid && rawPaid > billed) {
          const normalizedPaid = Math.max(0, billed - balDue);
          f = {
            ...f,
            lastReceiptPaidAmount: f.lastReceiptPaidAmount ?? rawPaid,
            paidAmount: normalizedPaid,
            balanceDue: balDue,
            status: normalizedPaid > 0 ? "partial" : "due",
          };
        }
      }

      const isAdm =
        f.feeType === "admission" ||
        f.receiptCategory === "admission" ||
        (typeof f.receiptNo === "string" && f.receiptNo.startsWith("ADM-"));

      if (isAdm) {
        // Ensure admission fee billed amount reflects total admission payable/paid rather than single monthly fee
        const admBilled = Number(f.grossTotal ?? f.grossAmount ?? f.amount ?? f.paidAmount ?? 0);
        f = {
          ...f,
          feeType: "admission",
          receiptCategory: "admission",
          amount: admBilled > 0 ? admBilled : (f.amount || studentMonthlyFee),
          monthlyAmount: admBilled > 0 ? admBilled : (f.monthlyAmount || studentMonthlyFee),
        };
        extraFees.push(f);
      } else if (f.month) {
        liveMonthMap.set(f.month, f);
      } else {
        extraFees.push(f);
      }
    });

    if (filteredLiveFees.length === 0 && schoolDemoActive && currentStudent.id?.startsWith("demo_std_")) {
      const rawFees = Array.isArray(dataset?.fees) ? dataset.fees : [];
      const filtered = rawFees.filter((f: any) => f?.studentId === currentStudent.id);
      if (filtered.length > 0) return filtered;
    }

    const sessionList = sessionMonths.map((m, idx) => {
      const recorded = liveMonthMap.get(m.code);
      if (recorded) {
        return recorded;
      }

      // Pre-admission months: Any session month strictly prior to student's admission date
      const isPreAdmission = Boolean(admissionMonthCode && m.code < admissionMonthCode);
      if (isPreAdmission) {
        return {
          id: `fee_pre_${m.code}_${currentStudent.id}`,
          schoolId,
          sessionId: currentStudent.sessionId || "demo_session_2026_27",
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          rollNo: currentStudent.rollNo,
          classId: currentStudent.classId,
          month: m.code,
          amount: 0,
          monthlyAmount: 0,
          paid: false,
          paidAmount: 0,
          balanceDue: 0,
          isPreAdmission: true,
          status: "pre_admission",
          receiptNo: "—",
          paidDate: undefined,
          paymentMode: "Pre-Admission (नामांकन पूर्व)",
        };
      }

      const isUpcoming = m.code > activeMonth;
      if (isUpcoming) {
        return {
          id: `fee_${m.code}_${currentStudent.id}`,
          schoolId,
          sessionId: currentStudent.sessionId || "demo_session_2026_27",
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          rollNo: currentStudent.rollNo,
          classId: currentStudent.classId,
          month: m.code,
          amount: studentMonthlyFee,
          monthlyAmount: studentMonthlyFee,
          paid: false,
          paidAmount: 0,
          balanceDue: 0,
          isUpcoming: true,
          status: "upcoming",
          receiptNo: "—",
          paidDate: undefined,
          paymentMode: "Upcoming",
        };
      }

      const isPastMonth = idx <= 5;
      const defaultStatus = schoolDemoActive && isPastMonth ? "paid" : "due";
      const isPaid = defaultStatus === "paid";

      return {
        id: `fee_${m.code}_${currentStudent.id}`,
        schoolId,
        sessionId: currentStudent.sessionId || "demo_session_2026_27",
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        rollNo: currentStudent.rollNo,
        classId: currentStudent.classId,
        month: m.code,
        amount: studentMonthlyFee,
        monthlyAmount: studentMonthlyFee,
        paid: isPaid,
        paidAmount: isPaid ? studentMonthlyFee : 0,
        balanceDue: isPaid ? 0 : studentMonthlyFee,
        status: defaultStatus,
        receiptNo: isPaid ? `DPS-26-${String(idx + 1).padStart(4, "0")}` : "—",
        paidDate: isPaid ? `${m.code}-05` : undefined,
        paymentMode: isPaid ? "UPI / Counter" : "Pending",
      };
    });

    return [...extraFees, ...sessionList];
  }, [liveFees, currentStudent, dataset, studentMonthlyFee, schoolId, schoolDemoActive, activeStudent, enrichedData]);

  const feeSummary = useMemo(() => {
    let totalBilled = 0;
    let totalDeposited = 0;
    let totalRemaining = 0;

    allStudentFees.forEach((f: any) => {
      // Exclude pre-admission session months completely from pending dues & billed totals
      if (f.isPreAdmission || f.status === "pre_admission") return;

      const isUpcoming = Boolean(f.isUpcoming || f.status === "upcoming");
      const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
      const isAdm =
        f.feeType === "admission" ||
        f.receiptCategory === "admission" ||
        String(f.receiptNo || "").startsWith("ADM-");

      const billed = isAdm
        ? Number(f.grossTotal ?? f.grossAmount ?? f.amount ?? f.paidAmount ?? studentMonthlyFee)
        : Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);

      const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));
      const remaining = isUpcoming
        ? 0
        : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

      totalBilled += billed;
      totalDeposited += paid;
      totalRemaining += remaining;
    });

    return { totalBilled, totalDeposited, totalRemaining };
  }, [allStudentFees, studentMonthlyFee]);

  const studentAdmissionFeeRecord = useMemo(() => {
    return (
      allStudentFees.find(
        (f: any) =>
          f.feeType === "admission" ||
          f.receiptCategory === "admission" ||
          (typeof f.receiptNo === "string" && f.receiptNo.startsWith("ADM-"))
      ) || null
    );
  }, [allStudentFees]);

  const pendingDues = feeSummary.totalRemaining;

  const [downloadingFeeId, setDownloadingFeeId] = useState<string | null>(null);

  const formatPaymentDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: "—", time: "" };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: "" };
      const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const hasTime = dateStr.includes("T") || dateStr.includes(":");
      const time = hasTime
        ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : "";
      return { date, time };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  const handleDownloadStudentPdf = async (f: any) => {
    setDownloadingFeeId(f.id || f.month || "active");
    try {
      await downloadFeeDocument({
        fee: f,
        student: activeStudent,
        schoolName: school?.name || schoolDisplayName || "School",
        className: formatClassLabel(studentClassLabel),
        schoolDetails: {
          schoolName: school?.name || schoolDisplayName || "School",
          address: school?.address || "",
          phone: school?.mobile || school?.phone || "",
          email: school?.email || "",
          affiliation: school?.affiliation || "",
          code: school?.code || "",
          logoUrl: getSavedSchoolLogo(school?.logoUrl, schoolId),
          principalSignatureUrl: school?.principalSignatureUrl || "",
          directorSignatureUrl: school?.directorSignatureUrl || "",
          principalName: school?.principalName || "",
        },
      });
    } catch (err) {
      console.error("Error downloading student PDF:", err);
    } finally {
      setDownloadingFeeId(null);
    }
  };

  const handleShareStudentWhatsApp = async (f: any) => {
    const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
    try {
      await shareFeeReceiptOnWhatsApp({
        fee: f,
        student: activeStudent,
        schoolName: school?.name || schoolDisplayName || "School",
        className: formatClassLabel(studentClassLabel),
        schoolDetails: {
          schoolName: school?.name || "School",
          address: school?.address || "",
          phone: school?.mobile || school?.phone || "",
          email: school?.email || "",
          affiliation: school?.affiliation || "",
          code: school?.code || "",
          logoUrl: getSavedSchoolLogo(school?.logoUrl, schoolId),
          principalSignatureUrl: school?.principalSignatureUrl || "",
          directorSignatureUrl: school?.directorSignatureUrl || "",
          principalName: school?.principalName || "",
        },
        isDueDemand: !isPaid,
      });
    } catch (err) {
      console.error("Error sharing fee on WhatsApp:", err);
    }
  };

  // Load real exams with Live Realtime Subscription
  useEffect(() => {
    if (!schoolId) return;
    const targetClass = currentStudent.classId || "cls_10";
    const unsub = subscribeToExams(schoolId, targetClass, (exams) => {
      if (exams) {
        setLiveExams((prev) => {
          const map = new Map();
          [...prev, ...exams].forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
      }
    });

    getExams(schoolId, targetClass)
      .then((remote) => {
        if (remote && remote.length > 0) {
          setLiveExams((prev) => {
            const map = new Map();
            [...prev, ...remote].forEach((e) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => unsub();
  }, [schoolId, currentStudent.classId]);

  // Check student marks across exams (strictly respects Demo OFF / Real Only mode and per-school isolation)
  const studentExams = useMemo(() => {
    const cleanLive = !schoolDemoActive ? liveExams.filter((e: any) => !isDemoRecord(e)) : liveExams;
    const combined = [...cleanLive];
    if (schoolDemoActive && currentStudent.id?.startsWith("demo_std_") && Array.isArray(dataset?.exams)) {
      dataset.exams.forEach((de) => {
        if (!combined.some((ce) => ce.id === de.id)) combined.push(de);
      });
    }

    const extracted: any[] = [];
    combined.forEach((e: any) => {
      if (!e) return;
      if (e.studentId === currentStudent?.id) {
        extracted.push(e);
        return;
      }
      if (e.studentMarks && currentStudent?.id && e.studentMarks[currentStudent.id]) {
        const markEntry = e.studentMarks[currentStudent.id];
        let cycleKey = e.examType || "";
        if (!cycleKey && typeof e.id === "string") {
          if (e.id.endsWith("_pa1") || e.name?.includes("PA-1")) cycleKey = "PA-1";
          else if (e.id.endsWith("_pa2") || e.name?.includes("PA-2")) cycleKey = "PA-2";
          else if (e.id.endsWith("_half_yearly") || e.name?.toLowerCase().includes("half")) cycleKey = "Half-Yearly";
          else if (e.id.endsWith("_pa3") || e.name?.includes("PA-3")) cycleKey = "PA-3";
          else if (e.id.endsWith("_pa4") || e.name?.includes("PA-4")) cycleKey = "PA-4";
          else if (e.id.endsWith("_final") || e.name?.toLowerCase().includes("final")) cycleKey = "Final-Annual";
        }
        extracted.push({
          ...e,
          examType: cycleKey || "Half-Yearly",
          subjectName: e.subjectName || e.name || "Subject",
          marksObtained: markEntry.absent ? 0 : Number(markEntry.marks) || 0,
          maxMarks: Number(e.maxMarks) || 100,
          absent: Boolean(markEntry.absent),
        });
      }
    });

    return extracted;
  }, [liveExams, dataset, currentStudent?.id, schoolDemoActive]);

  const examCycles = useMemo(() => {
    const cycles = [
      { id: "PA-1", name: "Periodic Assessment 1 (PA-1)", maxMarks: 40, term: "Term 1" },
      { id: "PA-2", name: "Periodic Assessment 2 (PA-2)", maxMarks: 40, term: "Term 1" },
      { id: "Half-Yearly", name: "Half Yearly Examination", maxMarks: 100, term: "Term 1" },
      { id: "PA-3", name: "Periodic Assessment 3 (PA-3)", maxMarks: 40, term: "Term 2" },
      { id: "PA-4", name: "Periodic Assessment 4 (Pre-Board)", maxMarks: 40, term: "Term 2" },
      { id: "Final-Annual", name: "Final Annual Board Exam", maxMarks: 100, term: "Term 2" },
    ];

    return cycles.map((c) => {
      const records = studentExams.filter((e) => e.examType === c.id || e.id?.includes(c.id.toLowerCase()));
      const hasMarks = records.length > 0;
      const totalObtained = records.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
      const totalMax = records.reduce((sum, r) => sum + (r.maxMarks || c.maxMarks), 0) || (c.maxMarks * 5);
      const percentage = hasMarks && totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      return {
        ...c,
        records,
        hasMarks,
        totalObtained,
        totalMax,
        percentage,
        grade: !hasMarks ? "Pending" : percentage >= 90 ? "A1" : percentage >= 80 ? "A2" : percentage >= 70 ? "B1" : percentage >= 60 ? "B2" : "C",
      };
    });
  }, [studentExams]);

  const latestExamSummary = useMemo(() => {
    const halfYearly = examCycles.find((c) => c.id === "Half-Yearly");
    if (halfYearly && halfYearly.hasMarks) return halfYearly;
    const withMarks = examCycles.find((c) => c.hasMarks);
    if (withMarks) return withMarks;
    return {
      id: "Half-Yearly",
      name: "Half Yearly Examination",
      hasMarks: false,
      totalObtained: 0,
      totalMax: 500,
      percentage: 0,
      grade: "Pending",
      records: [],
    };
  }, [examCycles]);

  const [selectedExamCycle, setSelectedExamCycle] = useState("Half-Yearly");

  // Homework list synced with School Admin (falls back to sample items ONLY when Demo Mode is ON)
  const homeworkList = useMemo(() => {
    if (realHomework.length > 0) {
      return realHomework.map((hw: any) => ({
        id: hw.id,
        subject: hw.subjectName || hw.subject || "Class Work",
        title: hw.title || "Class Assignment",
        assignedBy: hw.teacherName || hw.assignedBy || "Class Teacher",
        dueDate: hw.dueDate ? `Due: ${hw.dueDate}` : "Assigned",
        status: "pending",
        description: hw.description || "",
      }));
    }
    if (!schoolDemoActive) return [];
    return [
      {
        id: "hw-1",
        subject: "Mathematics",
        title: "Quadratic Equations - NCERT Exercise 4.3",
        assignedBy: "Mr. R. K. Verma (Math HOD)",
        dueDate: "Kal Subah 09:00 AM",
        status: "pending",
        description: "Solve Question 1 to 10 in the fair register. Show step-by-step formula derivation.",
      },
      {
        id: "hw-2",
        subject: "Science",
        title: "Chemical Reactions & Equations - Lab Notes",
        assignedBy: "Dr. Anjali Sen",
        dueDate: "3 Days Remaining",
        status: "completed",
        description: "Write displacement and double displacement reaction observations with balanced equations.",
      },
    ];
  }, [realHomework, schoolDemoActive]);

  const noticesList = useMemo(() => {
    if (realNotices.length > 0) {
      return realNotices.map((n: any) => ({
        id: n.id,
        title: n.title || "School Notice",
        date: n.date || (n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""),
        category: n.category || n.type || "Official",
        body: n.content || n.body || n.message || "",
      }));
    }
    if (!schoolDemoActive) return [];
    return [
      {
        id: "demo-n1",
        title: "Annual Sports Meet & Athletic Championship 2026",
        date: "18 Oct 2026",
        category: "Sports",
        body: "Inter-house athletic meet will be organized in November. House Captains and sports teachers will conduct selection trials next week.",
      },
      {
        id: "demo-n2",
        title: "Parent-Teacher Meeting (PTM) for Half-Yearly Results",
        date: "12 Oct 2026",
        category: "Academic",
        body: "PTM will be conducted on Saturday between 08:30 AM to 12:30 PM. Parents must accompany students in complete school uniform.",
      },
    ];
  }, [realNotices, schoolDemoActive]);

  const holidaysList = useMemo(() => {
    if (realHolidays.length > 0) {
      return realHolidays.map((h: any) => ({
        id: h.id || h.name,
        name: h.name,
        date: h.endDate && h.endDate !== h.startDate ? `${h.startDate} to ${h.endDate}` : h.startDate,
        type: h.type || "holiday",
        days: h.description || (h.type ? String(h.type).toUpperCase() : "School Holiday"),
      }));
    }
    if (!schoolDemoActive) return [];
    return [
      { id: "h1", name: "Diwali (दीपावली)", date: "31 Oct 2026", type: "festival", days: "Vacation 29 Oct - 04 Nov" },
      { id: "h2", name: "Chhath Puja (छठ पूजा)", date: "06 Nov - 08 Nov 2026", type: "festival", days: "3 Days Holiday" },
      { id: "h3", name: "Guru Nanak Jayanti", date: "24 Nov 2026", type: "national", days: "1 Day Holiday" },
      { id: "h4", name: "Christmas & Winter Break", date: "25 Dec 2026 - 05 Jan 2027", type: "vacation", days: "Winter Vacation" },
      { id: "h5", name: "Republic Day (गणतंत्र दिवस)", date: "26 Jan 2027", type: "national", days: "Celebration at Campus" },
      { id: "h6", name: "Holi (होली)", date: "22 Mar - 24 Mar 2027", type: "festival", days: "3 Days Holiday" },
    ];
  }, [realHolidays, schoolDemoActive]);

  const [homeworkStatusMap, setHomeworkStatusMap] = useState<Record<string, string>>({});

  const toggleHomeworkStatus = (hwId: string) => {
    setHomeworkStatusMap((prev) => ({
      ...prev,
      [hwId]: prev[hwId] === "completed" ? "pending" : "completed",
    }));
  };

  // Student QR payload for digital verification
  const qrStudentPayload = `NSTA-SCHOOL:${[
    encodeURIComponent(schoolId),
    encodeURIComponent(activeStudent.id),
    encodeURIComponent(activeStudent.rollNo),
    encodeURIComponent(activeStudent.classId || "cls_nursery"),
    encodeURIComponent(activeStudent.name),
    encodeURIComponent(activeStudent.admissionNo || ""),
    encodeURIComponent(activeStudent.phone || ""),
    encodeURIComponent(activeStudent.fatherName || ""),
    encodeURIComponent(activeStudent.motherName || ""),
    encodeURIComponent(activeStudent.bloodGroup || ""),
    encodeURIComponent(activeStudent.dateOfBirth || ""),
    encodeURIComponent(activeStudent.address || ""),
    encodeURIComponent(String(activeStudent.monthlyFee ?? "")),
    encodeURIComponent(studentClassLabel),
    encodeURIComponent(school?.name || (activeStudent as any)?.schoolName || "")
  ].join(":")}`;

  const schoolDisplayName = useMemo(() => {
    // 1. Loaded school profile for THIS schoolId takes highest priority for multi-school accuracy
    if (school?.name && school.name.trim() && school.name.trim().toLowerCase() !== "delhi public school" && school.name.trim() !== "School") {
      return school.name.trim();
    }

    // 2. Explicit student record schoolName
    const studentRecordSchoolName =
      (activeStudent as any)?.schoolName ||
      linkedStudent?.schoolName ||
      (currentStudent as any)?.schoolName ||
      enrichedData?.schoolName;

    if (studentRecordSchoolName && studentRecordSchoolName.trim() && studentRecordSchoolName.trim().toLowerCase() !== "delhi public school") {
      return studentRecordSchoolName.trim();
    }

    // 3. Logged-in session user schoolName ONLY if it matches this schoolId
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (
          (!parsed?.schoolId || parsed.schoolId === schoolId) &&
          parsed?.schoolName &&
          typeof parsed.schoolName === "string" &&
          parsed.schoolName.trim() &&
          parsed.schoolName.trim().toLowerCase() !== "delhi public school"
        ) {
          return parsed.schoolName.trim();
        }
      }
    } catch {}

    // 4. Fallback to school?.name or student's school or Nstz
    return (school?.name && school.name.trim()) || (studentRecordSchoolName && studentRecordSchoolName.trim()) || "Nstz";
  }, [school?.name, schoolId, activeStudent, linkedStudent, currentStudent, enrichedData]);

  const schoolInitials = (schoolDisplayName || "NS").slice(0, 2).toUpperCase();
  const resolvedSchoolLogo = getSavedSchoolLogo(school?.logoUrl || (activeStudent as any)?.schoolLogo, schoolId);

  const [birthdayModalData, setBirthdayModalData] = useState<NstaBirthdayData | null>(null);

  // Automated Birthday Detection & School Dispatch
  useEffect(() => {
    if (!studentId) return;
    const currentYear = new Date().getFullYear();
    const sentKey = `nst_birthday_wish_sent_${schoolId || "dps_gurgaon_sector45"}_${studentId}_${currentYear}`;
    const pendingPopupKey = `nst_show_birthday_popup_${studentId}`;

    // 1. Check if pending popup flag was already queued
    try {
      const hasPopup = localStorage.getItem(pendingPopupKey);
      if (hasPopup) {
        localStorage.removeItem(pendingPopupKey);
        let parsed: NstaBirthdayData | null = null;
        try {
          parsed = JSON.parse(hasPopup);
        } catch {}
        if (parsed && parsed.studentName) {
          setBirthdayModalData(parsed);
          return;
        }
      }
    } catch {}

    // 2. Check if today is student's birthday!
    const targetStudent = activeStudent || currentStudent;
    if (targetStudent && targetStudent.dateOfBirth && isStudentBirthdayToday(targetStudent.dateOfBirth)) {
      try {
        const alreadyWished = localStorage.getItem(sentKey);
        void dispatchOfficialSchoolBirthdayWish(targetStudent, {
          force: false,
          triggerPopup: true,
          schoolName: schoolDisplayName || school?.name || undefined,
          schoolLogo: resolvedSchoolLogo || undefined,
        }).then((msg) => {
          if (msg?.birthdayData) {
            setBirthdayModalData(msg.birthdayData);
          } else if (!alreadyWished) {
            setBirthdayModalData({
              studentId: targetStudent.id,
              studentName: targetStudent.name,
              admissionNo: targetStudent.admissionNo,
              rollNo: targetStudent.rollNo,
              className: targetStudent.className || formatClassLabel(studentClassLabel),
              schoolName: schoolDisplayName || school?.name || "NSTA Digital School",
              schoolLogo: resolvedSchoolLogo || undefined,
              dateOfBirth: targetStudent.dateOfBirth,
              wishedYear: currentYear,
              issuedAt: new Date().toISOString(),
            });
          }
        });
      } catch {}
    }
  }, [studentId, activeStudent, currentStudent, schoolId, schoolDisplayName, school?.name, resolvedSchoolLogo, studentClassLabel]);

  // Listen for real-time birthday wish event
  useEffect(() => {
    const handleBirthdayEvent = (e: any) => {
      if (e?.detail) {
        setBirthdayModalData(e.detail);
      }
    };
    window.addEventListener("nst-school-birthday-received", handleBirthdayEvent);
    return () => window.removeEventListener("nst-school-birthday-received", handleBirthdayEvent);
  }, []);

  // Sync active student's pending fee balance to the Web Push server so monthly auto-reminders always have exact ₹ due!
  useEffect(() => {
    if (!activeStudent?.id || !schoolId) return;
    void syncStudentFeeDueForPush({
      studentId: activeStudent.id,
      schoolId,
      schoolName: schoolDisplayName,
      studentName: activeStudent.name,
      classId: activeStudent.classId,
      className: formatClassLabel(studentClassLabel),
      rollNo: activeStudent.rollNo,
      pendingDues,
      monthlyFee: studentMonthlyFee,
    });
  }, [activeStudent?.id, activeStudent?.name, activeStudent?.classId, activeStudent?.rollNo, schoolId, schoolDisplayName, studentClassLabel, pendingDues, studentMonthlyFee]);

  const buildPushStudentList = () => {
    const baseList = Array.isArray(allLinkedStudents) && allLinkedStudents.length > 0
      ? allLinkedStudents
      : [activeStudent];
    return baseList.map((st: any) => ({
      id: st.id,
      schoolId: st.schoolId || schoolId,
      schoolName: st.id === activeStudent.id ? schoolDisplayName : (st.schoolName || schoolDisplayName),
      classId: st.classId || "cls_nursery",
      className: st.id === activeStudent.id ? formatClassLabel(studentClassLabel) : (st.className || ""),
      name: st.name || "Student",
      rollNo: st.rollNo || "01",
      admissionNo: st.admissionNo || "",
      pendingDues: st.id === activeStudent.id ? pendingDues : undefined,
      monthlyFee: st.id === activeStudent.id ? studentMonthlyFee : st.monthlyFee,
    }));
  };

  const handleTogglePushAlerts = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushFeedback(null);
    try {
      if (pushEnabled) {
        await disableSchoolPushForUser(effectiveUid);
        setPushEnabled(false);
        setPushFeedback({ type: "ok", text: "Push notifications band kar diye gaye hain." });
      } else {
        const res = await enableSchoolPushForUser({
          userId: effectiveUid,
          students: buildPushStudentList(),
          replaceStudents: true,
        });
        if (res.ok) {
          setPushEnabled(true);
          const count = Array.isArray(allLinkedStudents) && allLinkedStudents.length > 1 ? allLinkedStudents.length : 1;
          setPushFeedback({
            type: "ok",
            text: `🔔 Lock Screen Alerts ON! ${count > 1 ? `Sabhi ${count} students` : activeStudent.name} ka monthly fee due aur school notice ab app band hone par bhi aayega.`,
          });
        } else {
          setPushFeedback({ type: "err", text: res.error || "Notification allow nahi ho paya." });
        }
      }
    } finally {
      setPushBusy(false);
      setTimeout(() => setPushFeedback(null), 7000);
    }
  };

  const handleSendTestLockScreenPush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const dueStr = pendingDues > 0
        ? `कुल शेष देय शुल्क ₹${pendingDues.toLocaleString("en-IN")} है।`
        : "इस माह तक कोई शुल्क बकाया नहीं है (No Dues)।";
      const res = await sendSchoolPushNotification({
        userId: effectiveUid,
        studentIds: [activeStudent.id],
        schoolId,
        type: "MONTHLY_FEE",
        title: `🏫 ${schoolDisplayName} • शुल्क व नोटिस अलर्ट`,
        body: `${activeStudent.name} (${formatClassLabel(studentClassLabel)}, Roll #${activeStudent.rollNo}): ${dueStr}`,
        url: `/?schoolPortal=1&studentId=${encodeURIComponent(activeStudent.id)}&schoolTab=fees`,
        urgent: true,
      });
      if (res.delivered > 0) {
        setPushFeedback({
          type: "ok",
          text: "✅ Push bhej diya gaya! Phone lock karke ya notification tray kholkar dekhein.",
        });
      } else {
        setPushFeedback({
          type: "err",
          text: "Push deliver nahi hua — kripya ek baar Alerts OFF karke dobara ON karein.",
        });
      }
    } finally {
      setPushBusy(false);
      setTimeout(() => setPushFeedback(null), 6000);
    }
  };

  // Check if school subscription is expired
  const schoolExpIso = school?.subscription?.expiresAt || school?.subscription?.paidUntil;
  const isSchoolSubExpired = schoolExpIso ? new Date(schoolExpIso).getTime() <= Date.now() : false;

  if (isSchoolSubExpired && school) {
    const expiredFormattedDate = schoolExpIso
      ? new Date(schoolExpIso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "24 April 2027";

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-md w-full bg-slate-900/90 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-5">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-4xl shadow-xl shadow-red-600/40 border border-red-400/40">
            🔒
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-[11px] font-black uppercase mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>School Modules Locked</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Subscription Expired
            </h2>
            <p className="text-xs text-red-400 font-bold mt-1">
              Access Terminated (स्कूल मॉड्यूल लॉक हो गए हैं)
            </p>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Aapke school ({school.name}) ka subscription plan samapt ho chuka hai. Kripya school administration ya principal se contact karein taaki plan renew ho sake.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-xs text-left space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>School:</span>
              <span className="font-bold text-white">{school.name}</span>
            </div>
            <div className="flex justify-between">
              <span>Expired On:</span>
              <span className="font-bold text-red-400">{expiredFormattedDate}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                Logout / Switch Student
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── TOP NAV HEADER (SHOWN STRICTLY ONLY ON HOME OVERVIEW PAGE) ─────── */}
      {activeTab === "overview" && (
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-lg">
          {/* Left: Users icon + All linked student accounts as pills */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 shrink-0">
              <Users className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {(() => {
                const list = Array.isArray(allLinkedStudents) && allLinkedStudents.length > 0
                  ? allLinkedStudents
                  : [activeStudent];
                return list.map((st: any) => {
                  const isSelected = st.id === activeStudent.id || st.admissionNo === activeStudent.admissionNo;
                  const chipClass = st.className
                    ? (/^(Nursery|LKG|UKG|Class)/i.test(st.className) ? st.className : `Class ${st.className}`)
                    : (formatClassLabel(studentClassLabel) || "");
                  return (
                    <div
                      key={st.id || st.admissionNo || st.name}
                      className={`inline-flex items-center rounded-xl border text-xs font-bold transition shrink-0 ${
                        isSelected
                          ? "bg-emerald-600/20 border-emerald-500/60 text-emerald-200"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (!isSelected) {
                            try {
                              localStorage.setItem("nst_current_user", JSON.stringify(st));
                              window.location.reload();
                            } catch {}
                          }
                        }}
                        className="px-2.5 py-1 flex items-center gap-1.5 cursor-pointer"
                        title={isSelected ? `${st.name} (Active Student)` : `Switch to ${st.name}`}
                      >
                        <span className="truncate max-w-[120px]">{st.name}</span>
                        {chipClass && (
                          <span className="text-[10px] text-slate-300 font-medium">
                            · {chipClass}
                          </span>
                        )}
                      </button>
                      {list.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              const remaining = list.filter((x: any) => (x.id || x.admissionNo) !== (st.id || st.admissionNo));
                              localStorage.setItem("nst_linked_students", JSON.stringify(remaining));
                              if (isSelected && remaining.length > 0) {
                                localStorage.setItem("nst_current_user", JSON.stringify(remaining[0]));
                              }
                              window.location.reload();
                            } catch {}
                          }}
                          title={`${st.name} ka ID card is account se hatayein`}
                          className="pr-2 pl-0.5 py-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right: + Add Student QR button */}
          <button
            type="button"
            onClick={() => {
              if (onAddAnotherStudentQr) {
                onAddAnotherStudentQr();
              } else {
                setShowStudentSwitcherModal(true);
              }
            }}
            className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/40 text-indigo-300 hover:text-white text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
            title="Add another student ID / QR"
          >
            <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
            <span>+ Add Student QR</span>
          </button>
        </header>
      )}

      {/* ── STUDENT IDENTITY HERO BANNER (SHOWN STRICTLY ONLY ON HOME OVERVIEW) ── */}
      {activeTab === "overview" && (
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto space-y-3.5">
            {/* School Name & Official Notification Row (Moved Down From Top Bar) */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5 min-w-0">
                {resolvedSchoolLogo && !isAppLogo(resolvedSchoolLogo) ? (
                  <img
                    src={resolvedSchoolLogo}
                    alt="Logo"
                    className="w-8 h-8 rounded-xl object-contain bg-white p-0.5 border border-slate-700 shadow-sm shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-xs shrink-0">
                    {schoolInitials}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xs sm:text-sm font-black text-white tracking-tight truncate">
                      {schoolDisplayName}
                    </h2>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                      Student Portal
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Official Student &amp; Parent Digital Campus</p>
                </div>
              </div>

              {/* Notification Button beside School Name */}
              <button
                type="button"
                onClick={() => setShowNotificationModal(true)}
                className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer active:scale-95 shrink-0 ${
                  pushEnabled
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                    : "bg-slate-800/90 border-slate-700 hover:bg-slate-700 text-slate-300"
                }`}
                title="School Notifications &amp; History"
              >
                <div className="relative">
                  <Bell className={`w-3.5 h-3.5 ${pushEnabled ? "text-emerald-400" : "text-amber-400"}`} />
                  {pushEnabled && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] font-bold">
                  {pushEnabled ? "Alerts ON" : "Notifications"}
                </span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="relative group shrink-0">
                {activePhoto ? (
                  <img
                    src={activePhoto}
                    alt={activeStudent.name}
                    className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl object-cover border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-white select-none">
                    <span className="text-base sm:text-lg font-bold tracking-wider">{studentInitials}</span>
                    <span className="text-[8px] font-semibold text-emerald-400">Student</span>
                  </div>
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white transition cursor-pointer"
                  title="Change or upload student photo"
                >
                  <Camera className="w-3 h-3" />
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold mb-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Verified Enrolled Student</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">{activeStudent.name}</h2>
                  <span className="text-xs text-slate-400">
                    · Roll #{activeStudent.rollNo} · {formatClassLabel(studentClassLabel)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admission: <span className="font-mono text-slate-200">{activeStudent.admissionNo}</span>
                  {activeStudent.bloodGroup ? ` · Blood: ${activeStudent.bloodGroup}` : ""}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500">Father:</span>
                    <span className="font-semibold text-white truncate">{activeStudent.fatherName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500">Mother:</span>
                    <span className="font-semibold text-white truncate">{activeStudent.motherName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Mobile:</span>
                    <span className="font-semibold text-emerald-400 tabular-nums">{activeStudent.phone || "—"}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2.5">
                  <button
                    onClick={() => setActiveTab("idcard")}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer active:scale-95"
                  >
                    <QrCode className="w-3 h-3 text-indigo-400" />
                    <span>Digital ID Card</span>
                  </button>
                  <button
                    onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "form_only", feeRecord: studentAdmissionFeeRecord })}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 border border-slate-700 transition cursor-pointer active:scale-95"
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span>A4 Admission Form</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Key Stat Summary */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-emerald-500/50 text-center min-w-[88px] cursor-pointer transition active:scale-95 group shadow-sm"
                title="View full attendance details"
              >
                <span className="text-[11px] text-slate-400 block">Attendance</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums block">
                  {attendanceStats.percentage}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-emerald-400 flex items-center justify-center gap-0.5 mt-0.5 transition-colors">
                  More →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fees")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-center min-w-[88px] cursor-pointer transition active:scale-95 group shadow-sm"
                title="View full fee passbook & dues"
              >
                <span className="text-[11px] text-slate-400 block">Fee Dues</span>
                <span className={`text-sm sm:text-base font-bold tabular-nums block ${pendingDues === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {pendingDues === 0 ? "Cleared" : `₹${pendingDues.toLocaleString("en-IN")}`}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-amber-400 flex items-center justify-center gap-0.5 mt-0.5 transition-colors">
                  More →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("exams")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-center min-w-[88px] cursor-pointer transition active:scale-95 group shadow-sm"
                title="View exam results & report card"
              >
                <span className="text-[11px] text-slate-400 block">Result</span>
                <span className="text-sm sm:text-base font-bold text-indigo-400 tabular-nums block">
                  {latestExamSummary.hasMarks ? `${latestExamSummary.percentage}%` : "Active"}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 group-hover:text-indigo-400 flex items-center justify-center gap-0.5 mt-0.5 transition-colors">
                  More →
                </span>
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE / PUSH FEEDBACK TOAST ────────────────────────────────── */}
      {attendanceSuccessMsg && (
        <div className="mx-4 mt-3 max-w-6xl mx-auto p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{attendanceSuccessMsg}</span>
          </div>
          <button onClick={() => setAttendanceSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {pushFeedback && (
        <div
          className={`mx-4 mt-3 max-w-6xl mx-auto p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in border ${
            pushFeedback.type === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-rose-500/20 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{pushFeedback.text}</span>
          </div>
          <button onClick={() => setPushFeedback(null)} className="hover:text-white font-bold ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ── MAIN TAB CONTENT CONTAINER ─────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        {/* TAB 1: UNIFIED APP LAUNCHPAD HOME & PROFILE ──────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Clean Multi-Section Official Feature Button Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Student Portal Services &amp; Documents</h3>
                <span className="text-xs text-slate-400">आधिकारिक दस्तावेज व स्कूल सुविधाएं</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {/* Dedicated Card 1: Official Admission Fee Receipt */}
                <button
                  type="button"
                  onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "receipt_only", feeRecord: studentAdmissionFeeRecord })}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                      <ReceiptText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase">
                      Receipt
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">प्रवेश शुल्क रसीद</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      मदवार रसीद
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 2: Student Admission Form Details */}
                <button
                  type="button"
                  onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "form_only", feeRecord: studentAdmissionFeeRecord })}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold uppercase">
                      A4 Form
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">A4 फॉर्म विवरण</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      नामांकन फॉर्म
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 3: Annual Session Passbook A4 */}
                <button
                  type="button"
                  onClick={() => setShowBulkFeeModal(true)}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold uppercase">
                      Passbook
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">पासबुक A4</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      12 माह लेजर
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 4: Fee Statements */}
                <button
                  type="button"
                  onClick={() => setActiveTab("fees")}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold uppercase">
                      Fees
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Fee Statements</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      मासिक मांग
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 5: Teachers Faculty */}
                <button
                  type="button"
                  onClick={() => setActiveTab("teachers")}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-blue-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition-transform">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold uppercase">
                      Faculty
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Our Teachers</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      फैकल्टी परिचय
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 6: Digital ID Card */}
                <button
                  type="button"
                  onClick={() => setActiveTab("idcard")}
                  className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                      ID Card
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">Digital ID Card</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      स्मार्ट पहचान पत्र
                    </p>
                  </div>
                </button>

                {/* Dedicated Card 7: School Store (24H Booking) */}
                <button
                  type="button"
                  onClick={() => setActiveTab("store")}
                  className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/40 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/50 text-left transition cursor-pointer flex flex-col justify-between gap-3 group shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 border border-amber-500/40 font-black uppercase animate-pulse">
                      24h Book
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white">School Store</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      ड्रेस, किताबें व सामग्री
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Sibling Switcher if multiple students are linked */}
            {allLinkedStudents && allLinkedStudents.length > 1 && (
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Linked Sibling Accounts (परिवार के अन्य छात्र)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {allLinkedStudents.map((sib: any) => (
                    <button
                      key={sib.id}
                      onClick={() => {
                        try {
                          localStorage.setItem("nst_current_user", JSON.stringify(sib));
                          window.location.reload();
                        } catch {}
                      }}
                      className={`p-3 rounded-xl text-left border flex items-center justify-between gap-3 transition cursor-pointer ${
                        sib.id === activeStudent.id
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 text-white"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold">{sib.name}</p>
                        <p className="text-[11px] text-slate-400">Class: {sib.className || sib.classId} • Roll #{sib.rollNo}</p>
                      </div>
                      {sib.id === activeStudent.id ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">Active</span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">Switch</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STUDENT ACCOUNT MANAGEMENT ── */}
            <div id="portal-settings" className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Student Account Management</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Logout karne par aapka linked data aur ID card surakshit rahega
                </p>
              </div>

              <div className="w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={handleStudentLogout}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-sm shadow-rose-950/40"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Full App Logout</span>
                </button>
              </div>
            </div>

            {/* ── COMPACT PREMIUM NSTA LEARNING APP BUTTON (PAGE LAST) ── */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                      Explore Full NSTA App
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                      Study &amp; MCQs
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    Govt. Exams, 100 MCQs Daily Challenge, Live Study Room &amp; Revision Engine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExploreFullApp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition cursor-pointer shrink-0"
              >
                <span>Open Full App</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── TAB: NSTA MESSENGER SUITE (CLASS | SCHOOL | TEACHER) ─────────── */}
        {activeTab === "channel" && (
          <div className="fixed inset-0 pb-16 z-30 bg-slate-950 flex flex-col">
            <NstaMessengerSuite
              school={{
                ...(school || {}),
                id: schoolId,
                name: schoolDisplayName,
                logoUrl: resolvedSchoolLogo,
                address: school?.address || "Institutional Academic Campus, Educational Zone",
                affiliation: school?.affiliation || "Affiliated School Campus",
                code: school?.code || "NSTZ",
              } as any}
              currentUserRole="STUDENT"
              currentUserId={activeStudent?.id || studentId || "std_current"}
              currentUserName={activeStudent?.name || studentName || "Student"}
              student={activeStudent || undefined}
              classes={classesList}
              teachers={schoolTeachers}
              students={allStudentsInSchool}
              fees={allStudentFees}
              onBack={() => setActiveTab("overview")}
              onOpenFeeReceipt={(f) => {
                const isA6Demand = f?.type === "A6_DEMAND_SLIP" || f?.slipType === "A6_DEMAND_SLIP" || f?.isDueDemand || (f?.paid === false && Number(f?.paidAmount || 0) === 0);
                setFeeModalFormat(isA6Demand ? "a6" : "pos");
                setSelectedFeeForReceipt(f);
              }}
              onOpenWhatsAppPay={(f) => {
                setPendingWhatsAppFee(f);
                setShowWhatsAppModal(true);
              }}
            />
          </div>
        )}

        {/* ── TAB: CLASSROOM VIDEO LECTURES & REVISION ARCHIVE ────────────────── */}
        {activeTab === "videos" && activeStudent && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>वापस (Back to Attendance)</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-black flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500" />
                  <span>Class: {activeStudent.className || "My Class"}</span>
                </span>
              </div>
            </div>

            <ClassroomVideoArchive
              school={{
                ...(school || {}),
                id: schoolId,
                name: schoolDisplayName,
                logoUrl: resolvedSchoolLogo,
                address: school?.address || "Institutional Academic Campus, Educational Zone",
                affiliation: school?.affiliation || "Affiliated School Campus",
                code: school?.code || "NSTZ",
              } as any}
              classes={classesList}
              teachers={schoolTeachers}
              currentUserRole="STUDENT"
              studentClassId={activeStudent.classId}
              onBack={() => setActiveTab("attendance")}
            />
          </div>
        )}

        {/* TAB 2: MY ATTENDANCE ────────────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Attendance Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Days</span>
                <span className="text-xl font-black text-white">{attendanceStats.total}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-emerald-400 font-bold uppercase block">Present</span>
                <span className="text-xl font-black text-emerald-400">{attendanceStats.present}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-rose-400 font-bold uppercase block">Absent</span>
                <span className="text-xl font-black text-rose-400">{attendanceStats.absent}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-amber-400 font-bold uppercase block">Late Entry</span>
                <span className="text-xl font-black text-amber-400">{attendanceStats.late}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-indigo-400 font-bold uppercase block">Percentage</span>
                <span className="text-xl font-black text-indigo-400">{attendanceStats.percentage}%</span>
              </div>
            </div>

            {/* Attendance Monthly Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-3">Monthly Attendance Summary (Session 2026-27)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Month</th>
                      <th className="py-2.5 px-3">Recorded Days</th>
                      <th className="py-2.5 px-3 text-emerald-400">Present</th>
                      <th className="py-2.5 px-3 text-rose-400">Absent</th>
                      <th className="py-2.5 px-3 text-amber-400">Late Entry</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {studentAttendanceLogs.length > 0 ? (
                      (() => {
                        const monthMap: Record<string, { days: number; present: number; absent: number; late: number }> = {};
                        studentAttendanceLogs.forEach((l) => {
                          const mKey = l.date.slice(0, 7);
                          if (!monthMap[mKey]) monthMap[mKey] = { days: 0, present: 0, absent: 0, late: 0 };
                          monthMap[mKey].days++;
                          if (l.status === "present") monthMap[mKey].present++;
                          else if (l.status === "late") { monthMap[mKey].present++; monthMap[mKey].late++; }
                          else if (l.status === "absent") monthMap[mKey].absent++;
                        });
                        return Object.entries(monthMap).map(([mKey, s], mIdx) => {
                          let mDisplay = mKey;
                          const d = new Date(`${mKey}-01T00:00:00`);
                          if (!isNaN(d.getTime())) {
                            mDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                          }
                          const pct = s.days > 0 ? `${Math.round((s.present / s.days) * 100)}%` : "100%";
                          return (
                            <tr key={`month-attd-${mKey}-${mIdx}`} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-white">{mDisplay}</td>
                              <td className="py-2.5 px-3">{s.days}</td>
                              <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.present}</td>
                              <td className="py-2.5 px-3 text-rose-400">{s.absent}</td>
                              <td className="py-2.5 px-3 text-amber-400">{s.late}</td>
                              <td className="py-2.5 px-3 text-right font-black text-indigo-400">{pct}</td>
                            </tr>
                          );
                        });
                      })()
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Calendar className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
                          <p className="font-bold text-white text-sm">New Student Admission • Attendance Tracking Active</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Jaise hi attendance register me haziri lagegi ya QR scan hoga, yahan mahinawaar attendance update ho jayegi.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dedicated Card: Daily Class Video Lectures (YouTube Archive) placed below Monthly Attendance Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-red-950/80 via-slate-900 to-rose-950/80 border-2 border-red-500/50 shadow-xl shadow-red-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/40">
                  <Youtube className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 font-black uppercase">
                      YouTube 🔴 Live &amp; Archive
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Class: {activeStudent.className || "Class 10"}
                    </span>
                  </div>
                  <h4 className="text-sm sm:text-base font-black text-white">
                    Daily Class Video Lectures (आज की क्लास वीडियो)
                  </h4>
                  <p className="text-xs text-red-200/90 mt-0.5">
                    Daily period-wise YouTube lectures dekhein aur revision ke liye video archive kholein
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("videos")}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-red-600/40 transition active:scale-95 cursor-pointer shrink-0"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Watch Class Videos (वीडियो देखें)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FEES & RECEIPTS ─────────────────────────────────────────── */}
        {activeTab === "fees" && (() => {
          // Separate active fees from pre-admission months
          const activeFeesList = allStudentFees.filter(
            (f: any) => !f.isPreAdmission && f.status !== "pre_admission"
          );
          const preAdmissionFeesList = allStudentFees.filter(
            (f: any) => f.isPreAdmission || f.status === "pre_admission"
          );
          const displayedFees = showPreAdmissionMonths
            ? [...activeFeesList, ...preAdmissionFeesList]
            : activeFeesList;

          return (
            <div className="space-y-4 sm:space-y-5">
              {/* Executive 3-Column KPI Summary Ribbon */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                      कुल देय (Billed)
                    </span>
                    <span className="text-base sm:text-2xl font-black text-white font-mono tabular-nums mt-0.5 sm:mt-1 block">
                      ₹{feeSummary.totalBilled.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate">
                      Session 2026-27
                    </span>
                  </div>
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 items-center justify-center text-slate-300 shrink-0">
                    <CreditCard className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/25 shadow-sm flex items-center justify-between">
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-emerald-400 uppercase tracking-wider block truncate">
                      कुल जमा (Paid)
                    </span>
                    <span className="text-base sm:text-2xl font-black text-emerald-400 font-mono tabular-nums mt-0.5 sm:mt-1 block">
                      ₹{feeSummary.totalDeposited.toLocaleString("en-IN")}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-500/80 font-medium block truncate">
                      सफलतापूर्वक प्राप्त
                    </span>
                  </div>
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center text-emerald-400 shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                </div>

                <div className={`p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center justify-between ${
                  feeSummary.totalRemaining === 0
                    ? "bg-emerald-950/20 border-emerald-500/25"
                    : "bg-amber-950/20 border-amber-500/25"
                }`}>
                  <div className="min-w-0">
                    <span className="text-[10px] sm:text-[11px] font-bold text-amber-400 uppercase tracking-wider block truncate">
                      शेष बकाया (Due)
                    </span>
                    <span className={`text-base sm:text-2xl font-black font-mono tabular-nums mt-0.5 sm:mt-1 block ${
                      feeSummary.totalRemaining === 0 ? "text-emerald-400" : "text-amber-400"
                    }`}>
                      {feeSummary.totalRemaining === 0 ? "₹0" : `₹${feeSummary.totalRemaining.toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium block truncate">
                      {feeSummary.totalRemaining === 0 ? "पूर्ण चुकता" : "लंबित देय राशि"}
                    </span>
                  </div>
                  <div className={`hidden sm:flex w-10 h-10 rounded-xl border items-center justify-center shrink-0 ${
                    feeSummary.totalRemaining === 0
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* School Info Header + View Toggle + Single A4 Passbook Button */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{schoolDisplayName}</span>
                      <span className="text-xs text-slate-400 font-normal hidden sm:inline">• छात्र शुल्क पासबुक</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      छात्र: <strong className="text-slate-200">{activeStudent.name}</strong> • रोल: <strong className="text-slate-200">{activeStudent.rollNo || "—"}</strong> • कक्षा: <strong className="text-slate-200">{formatClassLabel(studentClassLabel)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                  {/* View Mode Toggle: Cards (Mobile-friendly) vs Table */}
                  <div className="inline-flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFeeViewMode("cards")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        feeViewMode === "cards"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>कार्ड दृश्य</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeViewMode("table")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        feeViewMode === "table"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span>तालिका दृश्य</span>
                    </button>
                  </div>

                  {/* Single Clean Consolidated A4 Passbook Print Button */}
                  <button
                    type="button"
                    onClick={() => setShowBulkFeeModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-indigo-950/40 active:scale-95 cursor-pointer"
                    title="सभी 12 महीनों का Fee Demand + Fee Receipt एक A4 शीट पर डाउनलोड व प्रिंट करें"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-300" />
                    <span>वार्षिक पासबुक A4</span>
                  </button>
                </div>
              </div>

              {/* Informative Pre-Admission Banner (Collapsible to eliminate empty '---' rows) */}
              {preAdmissionFeesList.length > 0 && (
                <div className="p-3 sm:p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-500 shrink-0" />
                    <span>
                      सत्र 2026-27: छात्र का नामांकन सत्र के दौरान हुआ। <strong className="text-slate-300">{preAdmissionFeesList.length} सत्र-पूर्व माह</strong> शुल्क मुक्त हैं।
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPreAdmissionMonths(!showPreAdmissionMonths)}
                    className="self-start sm:self-auto px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold border border-slate-700 transition cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>{showPreAdmissionMonths ? "सत्र-पूर्व माह छुपाएं" : `सत्र-पूर्व माह देखें (${preAdmissionFeesList.length})`}</span>
                  </button>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────── */}
              {/* MODE 1: MOBILE-FIRST ALL-IN-ONE CARD VIEW                       */}
              {/* Month name, Price, Status & Receipt/Slip are ALWAYS VISIBLE     */}
              {/* ────────────────────────────────────────────────────────────── */}
              {feeViewMode === "cards" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {displayedFees.map((f: any, idx: number) => {
                    const isPreAdmission = Boolean(f.isPreAdmission || f.status === "pre_admission");
                    const isUpcoming = !isPreAdmission && Boolean(f.isUpcoming || f.status === "upcoming");
                    const isPaid = !isPreAdmission && (typeof f.paid === "boolean" ? f.paid : f.status === "paid");
                    const isAdmissionFee =
                      f.feeType === "admission" ||
                      f.receiptCategory === "admission" ||
                      String(f.receiptNo || "").startsWith("ADM-");

                    const monthCode = f.month || "2026-04";
                    let monthDisplay = monthCode;
                    if (isAdmissionFee) {
                      monthDisplay = "प्रवेश शुल्क व किट (Admission & Kit)";
                    } else if (/^\d{4}-\d{2}$/.test(monthCode)) {
                      const d = new Date(`${monthCode}-01T00:00:00`);
                      if (!isNaN(d.getTime())) {
                        monthDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                      }
                    }

                    const billed = isPreAdmission
                      ? 0
                      : isAdmissionFee
                      ? Number(f.grossTotal ?? f.grossAmount ?? f.amount ?? f.paidAmount ?? studentMonthlyFee)
                      : Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);

                    const paid = isPreAdmission
                      ? 0
                      : Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));

                    const remaining = isPreAdmission || isUpcoming
                      ? 0
                      : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

                    const isPartial = !isPreAdmission && !isPaid && !isUpcoming && paid > 0 && remaining > 0;
                    const rNo = isPreAdmission ? "—" : (isPaid || paid > 0 ? (f.receiptNo || `DPS-26-${String(idx + 1).padStart(4, "0")}`) : "—");
                    const dtInfo = formatPaymentDateTime(f.paidDate || f.paymentDate);

                    return (
                      <div
                        key={`f-card-${f.id || f.receiptNo || monthCode || "mo"}-${idx}`}
                        className={`p-4 rounded-2xl border transition shadow-sm flex flex-col justify-between ${
                          isAdmissionFee
                            ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-indigo-950/40 border-emerald-500/35"
                            : isPreAdmission
                            ? "bg-slate-900/40 border-slate-800 opacity-70"
                            : isPaid
                            ? "bg-slate-900/95 border-emerald-500/30 hover:border-emerald-500/50"
                            : isPartial
                            ? "bg-slate-900/95 border-amber-500/35 hover:border-amber-500/55"
                            : isUpcoming
                            ? "bg-slate-900/60 border-slate-800"
                            : "bg-slate-900/95 border-rose-500/35 hover:border-rose-500/55"
                        }`}
                      >
                        <div>
                          {/* Top Row: Month Name & Status Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isAdmissionFee
                                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                                  : isPreAdmission
                                  ? "bg-slate-800 text-slate-500"
                                  : isPaid
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : isPartial
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : isUpcoming
                                  ? "bg-slate-800 text-slate-400"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}>
                                {isAdmissionFee ? (
                                  <Sparkles className="w-4 h-4" />
                                ) : isPaid ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : isPartial ? (
                                  <Clock className="w-4 h-4" />
                                ) : isUpcoming ? (
                                  <Calendar className="w-4 h-4" />
                                ) : isPreAdmission ? (
                                  <span className="text-xs font-mono font-bold">N/A</span>
                                ) : (
                                  <AlertTriangle className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-white flex items-center gap-1.5 leading-tight truncate">
                                  <span>{monthDisplay}</span>
                                </h4>
                                <span className="text-[11px] text-slate-400 font-mono block mt-0.5 truncate">
                                  {isAdmissionFee ? (
                                    <span className="text-emerald-400 font-semibold">{f.receiptNo || "ADM-DOSSIER"}</span>
                                  ) : isPreAdmission ? (
                                    "सत्र-पूर्व अवधि (शुल्क लागू नहीं)"
                                  ) : isPaid && rNo !== "—" ? (
                                    <span>रसीद: <strong className="text-slate-300">{rNo}</strong></span>
                                  ) : isUpcoming ? (
                                    "आगामी सत्र माह"
                                  ) : (
                                    <span className="text-rose-400/90 font-medium">माह शुल्क देय (Pending)</span>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0">
                              {isPreAdmission ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  सत्र पूर्व
                                </span>
                              ) : isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/35 shadow-xs">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>पूर्ण जमा</span>
                                </span>
                              ) : isPartial ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/35">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  <span>आंशिक</span>
                                </span>
                              ) : isUpcoming ? (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                  आगामी
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/35">
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>बकाया</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 3 Price Columns - GUARANTEED VISIBLE TOGETHER AT ALL TIMES */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 mb-3 text-center">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                                कुल देय (Billed)
                              </span>
                              <span className="text-sm font-black text-slate-200 font-mono tabular-nums mt-0.5 block">
                                {isPreAdmission ? "—" : `₹${billed.toLocaleString("en-IN")}`}
                              </span>
                            </div>
                            <div className="border-x border-slate-800/80">
                              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                                जमा (Paid)
                              </span>
                              <span className="text-sm font-black text-emerald-400 font-mono tabular-nums mt-0.5 block">
                                {isPreAdmission ? "—" : `₹${paid.toLocaleString("en-IN")}`}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                                शेष (Due)
                              </span>
                              <span className={`text-sm font-black font-mono tabular-nums mt-0.5 block ${
                                remaining > 0 ? "text-amber-400" : "text-slate-500"
                              }`}>
                                {isPreAdmission || isUpcoming ? "—" : remaining > 0 ? `₹${remaining.toLocaleString("en-IN")}` : "₹0"}
                              </span>
                            </div>
                          </div>

                          {/* Payment Timestamp Details */}
                          {(isPaid || paid > 0) && dtInfo.date !== "—" && (
                            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3 px-1">
                              <div className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3 h-3 text-emerald-400" />
                                <span>जमा: <strong className="text-slate-200">{dtInfo.date}</strong> {dtInfo.time && `(${dtInfo.time})`}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {f.payModeInfo?.payMode || f.paymentMode || "Cash / Counter"}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Direct Action Buttons: Always in the card, never scrolled out */}
                        <div className="pt-2 border-t border-slate-800/70">
                          {isPreAdmission ? (
                            <div className="text-center py-1 text-slate-600 text-xs font-medium">
                              सत्र-पूर्व माह • कोई दस्तावेज आवश्यक नहीं
                            </div>
                          ) : isAdmissionFee ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "receipt_only", feeRecord: f })}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="प्रवेश शुल्क रसीद देखें व प्रिंट करें"
                              >
                                <ReceiptText className="w-3.5 h-3.5" />
                                <span>प्रवेश रसीद</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "form_only", feeRecord: f })}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="नामांकन फॉर्म विवरण देखें"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>फॉर्म विवरण</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentPdf(f)}
                                disabled={downloadingFeeId === (f.id || f.month)}
                                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                                title="आधिकारिक PDF डाउनलोड करें"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          ) : isPaid ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeModalFormat("pos");
                                  setSelectedFeeForReceipt(f);
                                }}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="3-इंच (80mm) थर्मल फीस रसीद देखें"
                              >
                                <ReceiptText className="w-3.5 h-3.5" />
                                <span>रसीद (Receipt)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeModalFormat("a6");
                                  setSelectedFeeForReceipt(f);
                                }}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="A6 फीस स्लिप देखें"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>फीस स्लिप</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentPdf(f)}
                                disabled={downloadingFeeId === (f.id || f.month)}
                                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                                title="PDF डाउनलोड करें"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF</span>
                              </button>
                            </div>
                          ) : isUpcoming ? (
                            <div className="w-full text-center py-1 text-slate-500 text-xs italic">
                              सत्र अनुसार आगामी माह (अभी देय नहीं)
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setFeeModalFormat("a6");
                                  setSelectedFeeForReceipt(f);
                                }}
                                className="flex-1 py-2 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-xs"
                                title="आधिकारिक फीस मांग पर्ची (Demand Slip) देखें"
                              >
                                <FileText className="w-3.5 h-3.5 text-slate-950" />
                                <span>फीस मांग पर्ची (Slip)</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadStudentPdf(f)}
                                disabled={downloadingFeeId === (f.id || f.month)}
                                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center gap-1 active:scale-95 cursor-pointer disabled:opacity-50"
                                title="मांग पर्ची PDF डाउनलोड करें"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>PDF स्लिप</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────── */}
              {/* MODE 2: TABLE VIEW WITH STICKY MONTH COLUMN                    */}
              {/* When scrolling horizontally, Month column NEVER disappears     */}
              {/* ────────────────────────────────────────────────────────────── */}
              {feeViewMode === "table" && (
                <div className="p-3 sm:p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto relative">
                    <table className="w-full text-xs text-left text-slate-300 border-collapse">
                      <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          {/* Sticky first column so month name NEVER hides */}
                          <th className="py-3 px-3.5 sticky left-0 z-20 bg-slate-800/95 backdrop-blur-md shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-700">
                            विवरण / माह
                          </th>
                          <th className="py-3 px-3">जमा तिथि व समय</th>
                          <th className="py-3 px-3">रसीद सं.</th>
                          <th className="py-3 px-3 text-right">कुल देय (Billed)</th>
                          <th className="py-3 px-3 text-right">जमा (Paid)</th>
                          <th className="py-3 px-3 text-right">शेष (Due)</th>
                          <th className="py-3 px-3 text-center">स्थिति</th>
                          <th className="py-3 px-3 text-right">आधिकारिक दस्तावेज</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {displayedFees.map((f: any, idx: number) => {
                          const isPreAdmission = Boolean(f.isPreAdmission || f.status === "pre_admission");
                          const isUpcoming = !isPreAdmission && Boolean(f.isUpcoming || f.status === "upcoming");
                          const isPaid = !isPreAdmission && (typeof f.paid === "boolean" ? f.paid : f.status === "paid");
                          const isAdmissionFee =
                            f.feeType === "admission" ||
                            f.receiptCategory === "admission" ||
                            String(f.receiptNo || "").startsWith("ADM-");

                          const monthCode = f.month || "2026-04";
                          let monthDisplay = monthCode;
                          if (isAdmissionFee) {
                            monthDisplay = "प्रवेश शुल्क व किट (Admission & Kit)";
                          } else if (/^\d{4}-\d{2}$/.test(monthCode)) {
                            const d = new Date(`${monthCode}-01T00:00:00`);
                            if (!isNaN(d.getTime())) {
                              monthDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                            }
                          }

                          const billed = isPreAdmission
                            ? 0
                            : isAdmissionFee
                            ? Number(f.grossTotal ?? f.grossAmount ?? f.amount ?? f.paidAmount ?? studentMonthlyFee)
                            : Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);

                          const paid = isPreAdmission
                            ? 0
                            : Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));

                          const remaining = isPreAdmission || isUpcoming
                            ? 0
                            : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

                          const isPartial = !isPreAdmission && !isPaid && !isUpcoming && paid > 0 && remaining > 0;
                          const rNo = isPreAdmission ? "—" : (isPaid || paid > 0 ? (f.receiptNo || `DPS-26-${String(idx + 1).padStart(4, "0")}`) : "—");
                          const dtInfo = formatPaymentDateTime(f.paidDate || f.paymentDate);

                          return (
                            <tr key={`f-row-${f.id || f.receiptNo || monthCode || "mo"}-${idx}`} className="hover:bg-slate-800/40 transition">
                              {/* Sticky Month Name Column */}
                              <td className="py-3 px-3.5 sticky left-0 z-10 bg-slate-900 shadow-[2px_0_5px_rgba(0,0,0,0.5)] border-r border-slate-800 min-w-[150px]">
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {isAdmissionFee && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                  <span>{monthDisplay}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono block">
                                  {isPreAdmission
                                    ? "सत्र पूर्व (लागू नहीं)"
                                    : isUpcoming
                                    ? "आगामी माह"
                                    : (f.payModeInfo?.payMode || f.paymentMode || (isPaid ? "Cash / Counter" : "Fee Counter"))}
                                </span>
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                {isPreAdmission ? (
                                  <span className="text-slate-600 font-mono">—</span>
                                ) : isPaid || paid > 0 ? (
                                  <div>
                                    <span className="font-medium text-slate-200 block">{dtInfo.date}</span>
                                    {dtInfo.time ? (
                                      <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" /> {dtInfo.time}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-mono">Official Hours</span>
                                    )}
                                  </div>
                                ) : isUpcoming ? (
                                  <span className="text-slate-500 italic">आगामी माह</span>
                                ) : (
                                  <span className="text-slate-500 italic">देय (Unpaid)</span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-400 font-bold whitespace-nowrap">{rNo}</td>
                              <td className="py-3 px-3 text-right font-mono font-bold text-slate-300 tabular-nums whitespace-nowrap">
                                {isPreAdmission ? "—" : `₹${billed.toLocaleString("en-IN")}`}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black text-emerald-400 tabular-nums whitespace-nowrap">
                                {isPreAdmission ? "—" : `₹${paid.toLocaleString("en-IN")}`}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-black tabular-nums whitespace-nowrap">
                                <span className={remaining > 0 ? "text-amber-400" : "text-slate-500"}>
                                  {isPreAdmission || isUpcoming ? "—" : `₹${remaining.toLocaleString("en-IN")}`}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {isPreAdmission ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/80 text-slate-400 border border-slate-700/60">
                                    सत्र पूर्व
                                  </span>
                                ) : isPaid ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> पूर्ण जमा
                                  </span>
                                ) : isPartial ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                    <Clock className="w-2.5 h-2.5" /> आंशिक
                                  </span>
                                ) : isUpcoming ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                    आगामी
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                    बकाया
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right whitespace-nowrap">
                                {isPreAdmission ? (
                                  <span className="text-[11px] text-slate-600 font-medium">लागू नहीं</span>
                                ) : isAdmissionFee ? (
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "receipt_only", feeRecord: f })}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                      title="प्रवेश शुल्क रसीद देखें व प्रिंट करें"
                                    >
                                      <ReceiptText className="w-3 h-3 text-emerald-400" />
                                      <span>प्रवेश रसीद</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAdmissionModal({ isOpen: true, mode: "form_only", feeRecord: f })}
                                      className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                      title="छात्र नामांकन फॉर्म व विवरण देखें"
                                    >
                                      <FileText className="w-3 h-3 text-indigo-400" />
                                      <span>फॉर्म विवरण</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadStudentPdf(f)}
                                      disabled={downloadingFeeId === (f.id || f.month)}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                      title="Download Official PDF Document"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                    {isPaid ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFeeModalFormat("pos");
                                            setSelectedFeeForReceipt(f);
                                          }}
                                          className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                          title="3-इंच (80mm) थर्मल फीस रसीद देखें"
                                        >
                                          <ReceiptText className="w-3 h-3 text-emerald-400" />
                                          <span>रसीद</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setFeeModalFormat("a6");
                                            setSelectedFeeForReceipt(f);
                                          }}
                                          className="px-2 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                          title="A6 फीस डिमांड स्लिप (मांग पर्ची) देखें"
                                        >
                                          <FileText className="w-3 h-3 text-blue-400" />
                                          <span>स्लिप</span>
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setFeeModalFormat("a6");
                                          setSelectedFeeForReceipt(f);
                                        }}
                                        className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                        title="आधिकारिक फीस डिमांड स्लिप देखें (कुल बकाया राशि सहित)"
                                      >
                                        <FileText className="w-3 h-3 text-amber-400" />
                                        <span>मांग पर्ची</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDownloadStudentPdf(f)}
                                      disabled={downloadingFeeId === (f.id || f.month)}
                                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50 cursor-pointer shadow-xs"
                                      title="Download Official PDF Document"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>PDF</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* TAB 4: EXAMS & REPORT CARD ──────────────────────────────────────── */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  Examination Performance &amp; Marksheets (Session 2026-27)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  6-Stage Examination System: PA-1 (40), PA-2 (40), Half Yearly (100), PA-3 (40), PA-4 (40), Annual Exam (100)
                </p>
              </div>

              <button
                onClick={async () => {
                  const mEl = document.getElementById("student-marksheet-card-section");
                  if (!mEl) return;
                  try {
                    const html2canvas = (await import("html2canvas")).default;
                    const canvas = await html2canvas(mEl, { scale: 2, useCORS: true, backgroundColor: "#0f172a" });
                    const a = document.createElement("a");
                    a.download = `Marksheet_${selectedExamCycle}_${(activeStudent.name || "Student").replace(/\s+/g, "_")}.png`;
                    a.href = canvas.toDataURL("image/png");
                    a.click();
                  } catch (e) {
                    console.warn("Marksheet download error:", e);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Marksheet
              </button>
            </div>

            {/* Exam Cycle Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {examCycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => setSelectedExamCycle(cycle.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    selectedExamCycle === cycle.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cycle.name}
                </button>
              ))}
            </div>

            {/* Subject-Wise Marks Table for Selected Exam */}
            {(() => {
              const currentCycle = examCycles.find((c) => c.id === selectedExamCycle) || examCycles[0];
              return (
                <div id="student-marksheet-card-section" className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-black text-white">{currentCycle.name} Result Card</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatClassLabel(studentClassLabel)} • Roll #{activeStudent.rollNo} • Admission: {activeStudent.admissionNo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Total:</span>
                      <span className="text-lg font-black text-indigo-400">
                        {currentCycle.hasMarks ? `${currentCycle.totalObtained} / ${currentCycle.totalMax} (${currentCycle.percentage}%)` : "Pending"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs">
                        {currentCycle.hasMarks ? `Grade ${currentCycle.grade}` : "Under Evaluation"}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3 rounded-l-lg">Subject Name</th>
                          <th className="py-2.5 px-3">Max Marks</th>
                          <th className="py-2.5 px-3 text-emerald-400">Marks Obtained</th>
                          <th className="py-2.5 px-3">Grade</th>
                          <th className="py-2.5 px-3 text-right rounded-r-lg">Teacher Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {currentCycle.hasMarks && currentCycle.records.length > 0 ? (
                          currentCycle.records.map((row: any) => {
                            const subName = row.subjectName || row.name || "Subject";
                            const max = row.maxMarks || (selectedExamCycle.includes("PA") ? 40 : 100);
                            const obt = row.marksObtained;
                            const pct = max > 0 ? (obt / max) * 100 : 0;
                            const grade = pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : pct >= 60 ? "B2" : "C";
                            return (
                              <tr key={subName} className="hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-bold text-white">{subName}</td>
                                <td className="py-3 px-3 font-mono">{max}</td>
                                <td className="py-3 px-3 font-black text-emerald-400 text-sm">{obt}</td>
                                <td className="py-3 px-3 font-bold text-indigo-400">{grade}</td>
                                <td className="py-3 px-3 text-right text-slate-400">{pct >= 85 ? "Excellent Performance" : pct >= 70 ? "Good Performance" : "Satisfactory"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              <Award className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
                              <p className="font-bold text-white text-sm">Abhi is pariksha ke marks teacher dwaara upload nahi kiye gaye hain</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Jaise hi subject teachers answer sheet evaluate karke marks submit karenge, yahan official marksheet generate ho jayegi.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: HOMEWORK & DIARY ─────────────────────────────────────────── */}
        {activeTab === "homework" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Daily Homework &amp; Digital School Diary
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assignments given by subject teachers for {formatClassLabel(studentClassLabel)}
                </p>
              </div>
            </div>

            {homeworkList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeworkList.map((hw) => {
                  const isDone = homeworkStatusMap[hw.id] === "completed";
                  return (
                    <div
                      key={hw.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isDone
                          ? "bg-slate-900/60 border-slate-800/80 opacity-80"
                          : "bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                          {hw.subject}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDone ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        }`}>
                          {hw.dueDate}
                        </span>
                      </div>

                      <h4 className={`text-sm font-bold mt-1 text-white ${isDone ? "line-through text-slate-400" : ""}`}>
                        {hw.title}
                      </h4>

                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {hw.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500">{hw.assignedBy}</span>
                        <button
                          onClick={() => toggleHomeworkStatus(hw.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                            isDone
                              ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
                              : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/25"
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{isDone ? "Completed ✓" : "Mark as Done"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <FileText className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Abhi {formatClassLabel(studentClassLabel)} ke liye koi homework darj nahi hai</p>
                <p className="text-xs text-slate-400 mt-1">
                  Jaise hi School Admin ya Class Teacher homework assign karenge, yahan turant sync ho jayega.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: SCHOOL HOLIDAYS HUB ────────────────────────────────────────── */}
        {activeTab === "holidays" && (() => {
          const parsedHolidays = holidaysList.map((h, idx) => ({
            ...h,
            key: h.id || `hol_${idx}`,
          }));

          const filteredHols = parsedHolidays.filter((h) => {
            if (holidaysSearch) {
              const q = holidaysSearch.toLowerCase();
              return h.name?.toLowerCase().includes(q) || h.date?.toLowerCase().includes(q) || h.days?.toLowerCase().includes(q);
            }
            if (holidaysFilter === "FESTIVAL") return h.type === "festival" || h.name.includes("पूजा") || h.name.includes("दिवाली") || h.name.includes("होली");
            if (holidaysFilter === "NATIONAL") return h.type === "national" || h.name.includes("दिवस") || h.name.includes("Jayanti");
            if (holidaysFilter === "VACATION") return h.type === "vacation" || h.days?.toLowerCase().includes("vacation") || h.days?.toLowerCase().includes("break");
            return true;
          });

          const nextHoliday = parsedHolidays[0];

          return (
            <div className="space-y-6">


              {/* Search & Category Filter Pills */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {[
                    { id: "ALL", label: `All Holidays (${holidaysList.length})` },
                    { id: "FESTIVAL", label: "Festivals (त्यौहार)" },
                    { id: "NATIONAL", label: "National (राष्ट्रीय)" },
                    { id: "VACATION", label: "Vacations (अवकाश)" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setHolidaysFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                        holidaysFilter === f.id
                          ? "bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/30"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <div className="relative min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={holidaysSearch}
                    onChange={(e) => setHolidaysSearch(e.target.value)}
                    placeholder="Search holiday or date..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-rose-500 transition"
                  />
                </div>
              </div>

              {/* Holidays Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredHols.map((h, i) => {
                  const isFestival = h.type === "festival" || h.name.includes("पूजा") || h.name.includes("दिवाली") || h.name.includes("होली");
                  const isNational = h.type === "national" || h.name.includes("दिवस") || h.name.includes("Jayanti");
                  const isVacation = h.type === "vacation" || h.days?.toLowerCase().includes("vacation") || h.days?.toLowerCase().includes("break");
                  
                  return (
                    <div
                      key={h.key || i}
                      className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex items-start gap-3.5 group shadow-sm hover:shadow-md"
                    >
                      {/* Date Badge */}
                      <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 border text-center font-bold ${
                        isFestival
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                          : isNational
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                          : isVacation
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                          : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                      }`}>
                        <span className="text-[10px] uppercase font-mono tracking-wider opacity-80">
                          {h.date?.split(" ")[1] || "HOL"}
                        </span>
                        <span className="text-base font-black leading-none mt-0.5">
                          {h.date?.split(" ")[0]?.slice(0, 5) || (i + 1)}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isFestival
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : isNational
                              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                              : isVacation
                              ? "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                              : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                          }`}>
                            {h.type || "Holiday"}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{h.days}</span>
                        </div>

                        <h4 className="text-sm font-black text-white group-hover:text-rose-300 transition-colors">
                          {h.name}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{h.date}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Session Leave Statistics */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-around gap-4 text-center">
                <div>
                  <span className="text-xs text-slate-400">Total School Holidays</span>
                  <p className="text-lg font-black text-white mt-0.5">{holidaysList.length} दिन</p>
                </div>
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />
                <div>
                  <span className="text-xs text-slate-400">Major Festival Leaves</span>
                  <p className="text-lg font-black text-amber-400 mt-0.5">दिवाली, छठ, होली, ईद</p>
                </div>
                <div className="w-px h-8 bg-slate-800 hidden sm:block" />
                <div>
                  <span className="text-xs text-slate-400">Summer &amp; Winter Vacation</span>
                  <p className="text-lg font-black text-blue-400 mt-0.5">ग्रीष्मकालीन व शीतकालीन</p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── TAB: SCHOOL EVENTS & MEMORIES (PHOTOS & VIDEOS) ────────────────── */}
        {activeTab === "events_memories" && (() => {
          const liveMedia = liveCommunityPosts.filter(
            (p) => p.category === "EVENT_MEDIA" || Boolean(p.imageUrl) || Boolean(p.videoUrl)
          );

          const adminCustomMemories: any[] = (() => {
            try {
              return JSON.parse(localStorage.getItem(`school_memories_${schoolId}`) || "[]");
            } catch {
              return [];
            }
          })();

          const combinedMemories = [
            ...adminCustomMemories,
            ...liveMedia.map((p) => ({
              id: p.id,
              title: p.title || "School Celebration & Memory",
              category: "SCHOOL",
              date: p.timestamp ? new Date(p.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Recent",
              type: p.videoUrl ? "VIDEO" : "IMAGE",
              url: p.imageUrl || p.videoUrl || "",
              videoUrl: p.videoUrl || "",
              description: p.text || "School campus event and student activity memory.",
              tags: ["School Post", "Campus Memory"],
              likes: p.likesCount || 42,
            })),
            {
              id: "mem_sports_2026",
              title: "Annual Sports Meet 2026 (वार्षिक खेलकूद प्रतियोगिता)",
              category: "SPORTS",
              date: "14 Feb 2026",
              type: "IMAGE",
              url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80",
              description: "100m, 200m दौड़, रिले रेस और खेलकूद में छात्र-छात्राओं का शानदार प्रदर्शन व मेडल वितरण।",
              tags: ["Sports", "Medals", "Athletics"],
              likes: 124,
            },
            {
              id: "mem_republic_2026",
              title: "Republic Day Celebration (77वां गणतंत्र दिवस समारोह)",
              category: "ANNUAL",
              date: "26 Jan 2026",
              type: "IMAGE",
              url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80",
              description: "ध्वजारोहण, एनसीसी मार्च पास्ट, देशभक्ति गीतों पर समूह नृत्य व राष्ट्रीय एकता संदेश।",
              tags: ["Republic Day", "Patriotic", "Dance"],
              likes: 98,
            },
            {
              id: "mem_science_2026",
              title: "Science, Robotics & AI Expo (विज्ञान व रोबोटिक्स प्रदर्शनी)",
              category: "EXPO",
              date: "10 Jan 2026",
              type: "IMAGE",
              url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
              description: "कक्षा 6 से 12 के छात्रों द्वारा बनाए गए सोलर एनर्जी, स्मार्ट इरिगेशन व रोबोटिक्स के वर्किंग मॉडल्स।",
              tags: ["Science", "Robotics", "Innovation"],
              likes: 156,
            },
            {
              id: "mem_annual_dance_2025",
              title: "Annual Cultural Fest & Drama (वार्षिक सांस्कृतिक संध्या)",
              category: "ANNUAL",
              date: "20 Dec 2025",
              type: "VIDEO",
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              description: "छात्रों द्वारा 'पर्यावरण संरक्षण' पर नाट्य मंचन और लोकनृत्य प्रस्तुति।",
              tags: ["Annual Day", "Drama", "Dance"],
              likes: 210,
            },
            {
              id: "mem_children_2025",
              title: "Children's Day Carnival (बाल दिवस मेला व प्रतियोगिताएं)",
              category: "SPORTS",
              date: "14 Nov 2025",
              type: "IMAGE",
              url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
              description: "फूड स्टॉल, फन गेम्स, क्विज प्रतियोगिता और शिक्षकों द्वारा बच्चों के लिए विशेष कार्यक्रम।",
              tags: ["Children's Day", "Carnival", "Games"],
              likes: 87,
            },
            {
              id: "mem_picnic_2025",
              title: "School Nature Excursion (शैक्षणिक भ्रमण व पिकनिक)",
              category: "EXPO",
              date: "05 Oct 2025",
              type: "IMAGE",
              url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
              description: "बोटैनिकल गार्डन और विज्ञान केंद्र का शैक्षणिक भ्रमण व फोटोग्राफी सत्र।",
              tags: ["Picnic", "Nature", "Excursion"],
              likes: 142,
            },
          ];

          const filteredMemories = combinedMemories.filter((m) => {
            if (eventsFilter === "PHOTOS") return m.type === "IMAGE";
            if (eventsFilter === "VIDEOS") return m.type === "VIDEO";
            if (eventsFilter === "SPORTS") return m.category === "SPORTS";
            if (eventsFilter === "ANNUAL") return m.category === "ANNUAL";
            if (eventsFilter === "EXPO") return m.category === "EXPO";
            return true;
          });

          return (
            <div className="space-y-6">


              {/* Category Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {[
                  { id: "ALL", label: `All Memories (${combinedMemories.length})` },
                  { id: "PHOTOS", label: "📸 Photos Only" },
                  { id: "VIDEOS", label: "🎬 Videos Only" },
                  { id: "SPORTS", label: "🏆 Sports Day" },
                  { id: "ANNUAL", label: "🎭 Annual Fest" },
                  { id: "EXPO", label: "🔬 Science & Art Expo" },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setEventsFilter(f.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                      eventsFilter === f.id
                        ? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Memories Media Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMemories.map((mem) => {
                  const isVideo = mem.type === "VIDEO";
                  return (
                    <div
                      key={mem.id}
                      onClick={() => setSelectedMemoryMedia(mem)}
                      className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 overflow-hidden transition-all duration-200 cursor-pointer flex flex-col shadow-lg hover:shadow-amber-950/30 hover:-translate-y-0.5"
                    >
                      {/* Media Thumbnail */}
                      <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                        {isVideo ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-gradient-to-tr from-slate-950 via-slate-900 to-rose-950">
                            {mem.url && mem.url.includes("img") ? (
                              <img src={mem.url} alt={mem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="absolute inset-0 bg-cover bg-center opacity-40 group-hover:opacity-60 transition-opacity" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80')` }} />
                            )}
                            <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-red-600/40 group-hover:scale-110 transition-transform z-10">
                              <Play className="w-5 h-5 fill-current ml-0.5" />
                            </div>
                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-mono text-white font-bold border border-slate-700/60 z-10">
                              Video Lecture / Event
                            </span>
                          </div>
                        ) : (
                          <>
                            <img
                              src={mem.url}
                              alt={mem.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60" />
                          </>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-bold text-amber-300 uppercase">
                            {mem.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/80 text-[10px] font-mono text-slate-300">
                            {mem.date}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
                        <div>
                          <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                            {mem.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {mem.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                          <div className="flex items-center gap-1.5 text-rose-400">
                            <Heart className="w-3.5 h-3.5 fill-current" />
                            <span className="font-bold">{mem.likes}</span>
                          </div>
                          <span className="text-[11px] font-bold text-amber-400 group-hover:underline flex items-center gap-1">
                            <span>{isVideo ? "Play Video" : "View Photo"}</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Lightbox / Video Modal */}
              {selectedMemoryMedia && (
                <div
                  className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
                  onClick={() => setSelectedMemoryMedia(null)}
                >
                  <div
                    className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Modal Top Bar */}
                    <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-white">{selectedMemoryMedia.title}</h3>
                        <p className="text-[11px] text-slate-400">{selectedMemoryMedia.date} • {schoolDisplayName}</p>
                      </div>
                      <button
                        onClick={() => setSelectedMemoryMedia(null)}
                        className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Media Display */}
                    <div className="flex-1 bg-black overflow-y-auto flex items-center justify-center min-h-[320px] max-h-[60vh]">
                      {selectedMemoryMedia.type === "VIDEO" ? (
                        <div className="w-full h-full min-h-[360px] flex items-center justify-center">
                          <CustomPlayer
                            videoUrl={selectedMemoryMedia.videoUrl || selectedMemoryMedia.url}
                            videoTitle={selectedMemoryMedia.title}
                            onBack={() => setSelectedMemoryMedia(null)}
                            brandingText={schoolDisplayName}
                          />
                        </div>
                      ) : (
                        <img
                          src={selectedMemoryMedia.url}
                          alt={selectedMemoryMedia.title}
                          className="max-h-[60vh] w-auto max-w-full object-contain mx-auto"
                        />
                      )}
                    </div>

                    {/* Caption & Actions */}
                    <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                        {selectedMemoryMedia.description}
                      </p>
                      {selectedMemoryMedia.type === "IMAGE" && (
                        <a
                          href={selectedMemoryMedia.url}
                          target="_blank"
                          rel="noreferrer"
                          download="school_memory.jpg"
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shrink-0 transition"
                        >
                          <Download className="w-4 h-4" />
                          <span>Save Photo</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── TAB: EXPLORE+ COMPLETE LEARNING UNIVERSE ────────────────────────── */}
        {activeTab === "explore_plus" && (
          <div className="space-y-6">
            {/* Hero Card with Blurred Student Dashboard Preview */}
            <div
              onClick={handleExploreFullApp}
              className="relative rounded-3xl overflow-hidden border-2 border-indigo-500/40 hover:border-indigo-400 transition-all cursor-pointer group shadow-2xl shadow-indigo-950/60"
            >
              <div
                className="absolute inset-0 bg-cover bg-top filter blur-[3px] scale-105 opacity-40 group-hover:opacity-55 transition-opacity"
                style={{ backgroundImage: `url('/assets/aistudio/Screenshot_20261106_025216_Chrome_cb98684f.jpg')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-indigo-950/85" />

              <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="space-y-3 max-w-2xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                    <span>NSTA Complete Learning Ecosystem</span>
                  </div>

                  <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2 group-hover:text-indigo-200 transition-colors">
                    <span>Explore the Full App</span>
                    <ArrowRight className="w-6 h-6 text-indigo-400 group-hover:translate-x-2 transition-transform" />
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                    25,000+ लाइन्स का मुख्य लर्निंग डैशबोर्ड: 53+ प्रतियोगी किताबें, 100 MCQs डेली चैलेंज, लाइव स्टडी रूम और मेमोरी इंजन।
                  </p>

                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs font-bold text-slate-200">
                      🏆 Daily Challenge
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs font-bold text-slate-200">
                      👥 Live Study Room
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs font-bold text-slate-200">
                      🧠 Revision Hub
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-700/60 text-xs font-bold text-slate-200">
                      📚 Govt. Exams &amp; 53+ Books
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExploreFullApp();
                    }}
                    className="w-full md:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-emerald-500 hover:from-indigo-500 hover:to-emerald-400 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/35 transition active:scale-95 cursor-pointer"
                  >
                    <span>Launch Full Platform</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Explore Modules Grid */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-white">Academic &amp; Competitive Learning Modules</h3>
                <span className="text-xs text-slate-400">1-टैप में सीधे शुरू करें</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[
                  {
                    title: "100 MCQs Daily Challenge",
                    desc: "रोज़ाना 100 बहुविकल्पीय प्रश्नों की टाइमर परीक्षा, लाइव लीडरबोर्ड व कॉइन्स रिवॉर्ड।",
                    icon: "🎯",
                    badge: "Live Arena",
                    color: "from-rose-950/60 to-slate-900 border-rose-500/30",
                    action: handleExploreFullApp,
                  },
                  {
                    title: "Live Virtual Study Room",
                    desc: "सहपाठियों के साथ वर्चुअल स्टडी रूम, पोमोडोरो टाइमर व फोकस मोड में पढ़ाई।",
                    icon: "👥",
                    badge: "Peers Online",
                    color: "from-blue-950/60 to-slate-900 border-blue-500/30",
                    action: handleExploreFullApp,
                  },
                  {
                    title: "Revision Hub & Memory Engine",
                    desc: "स्पैस्ड रिपीटिशन तकनीक से कभी न भूलने वाले फॉर्मूले व कमजोर विषयों की ड्रिल।",
                    icon: "🧠",
                    badge: "Memory Engine",
                    color: "from-purple-950/60 to-slate-900 border-purple-500/30",
                    action: handleExploreFullApp,
                  },
                  {
                    title: "Govt. Exams & 53+ Books",
                    desc: "Lucent GK, Speedy Science, सार संग्रह, NCERT और प्रतियोगी परीक्षाओं की किताबें।",
                    icon: "📚",
                    badge: "7+ Books",
                    color: "from-emerald-950/60 to-slate-900 border-emerald-500/30",
                    action: handleExploreFullApp,
                  },
                  {
                    title: "Class 1 to 12 Academic Notes",
                    desc: "कक्षावार विस्तृत अध्ययन नोट्स, महत्वपूर्ण प्रश्नोत्तर और अभ्यास सेट्स।",
                    icon: "📖",
                    badge: "Syllabus",
                    color: "from-indigo-950/60 to-slate-900 border-indigo-500/30",
                    action: handleExploreFullApp,
                  },
                  {
                    title: "Spin Wheel & Brain Games",
                    desc: "डेली लॉगिन बोनस, लकी व्हील, मेमोरी गेम्स व कॉइन्स रिवॉर्ड्स।",
                    icon: "🎮",
                    badge: "Win Coins",
                    color: "from-amber-950/60 to-slate-900 border-amber-500/30",
                    action: handleExploreFullApp,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    onClick={item.action}
                    className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} border hover:border-indigo-400 transition cursor-pointer flex flex-col justify-between gap-3 group shadow-md hover:shadow-indigo-950/40`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950/80 text-indigo-300 border border-slate-700 font-bold uppercase">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-white group-hover:text-indigo-300 transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                      <span>Open in Main Platform</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}



        {/* ── BACKWARD COMPATIBILITY: COMMUNITY / NOTICES TAB ────────────────── */}
        {(activeTab === "community" || activeTab === "notices") && (
          <SchoolCommunityFeed
            schoolId={schoolId}
            schoolName={schoolDisplayName}
            currentUserId={activeStudent.id || effectiveUid}
            currentUserName={activeStudent.name}
            currentUserRole="STUDENT"
            studentClassId={activeStudent.classId}
            studentClassName={formatClassLabel(studentClassLabel)}
            initialFilter={communityInitialFilter}
          />
        )}

        {/* TAB 7: DIGITAL ID CARD ──────────────────────────────────────────── */}
        {activeTab === "idcard" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  Official Student Digital ID Card
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  CR80 landscape standard identity card with verified QR security token
                </p>
              </div>

              <button
                onClick={async () => {
                  const card = document.getElementById("student-id-card-cr80-element");
                  if (!card) return;
                  try {
                    const html2canvas = (await import("html2canvas")).default;
                    const canvas = await html2canvas(card, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
                    const a = document.createElement("a");
                    a.download = `ID_Card_${(activeStudent.name || "Student").replace(/\s+/g, "_")}.png`;
                    a.href = canvas.toDataURL("image/png");
                    a.click();
                  } catch (e) {
                    console.warn("Download error:", e);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download ID Card
              </button>
            </div>

            {/* Rendered CR80 Card */}
            <div className="flex justify-center p-4 sm:p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <div
                id="student-id-card-cr80-element"
                className="w-[360px] min-h-[225px] bg-white text-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-600 flex flex-col overflow-hidden relative"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-3 py-2 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    {resolvedSchoolLogo && !isAppLogo(resolvedSchoolLogo) ? (
                      <img src={resolvedSchoolLogo} alt="Logo" className="w-6 h-6 rounded-full bg-white object-contain p-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white text-emerald-900 flex items-center justify-center font-black text-[9px]">
                        {schoolInitials}
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-[11px] leading-tight text-white">{schoolDisplayName}</h3>
                      <p className="text-[7px] text-emerald-200">{school?.tagline || school?.affiliation || "Affiliated School Campus"}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-wider">
                    STUDENT ID • 2026-27
                  </span>
                </div>

                {/* Body: QR on Left, Details Center, Photo Right */}
                <div className="p-3 flex items-center justify-between gap-2.5 bg-white flex-1">
                  {/* QR */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-[84px]">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-sm flex items-center justify-center">
                      <QRCode value={qrStudentPayload} size={72} level="M" />
                    </div>
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verify QR
                    </span>
                    <span className="text-[6.5px] font-mono text-slate-500 font-bold">
                      {activeStudent.admissionNo}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 text-[9.5px] leading-tight space-y-0.5">
                    <h4 className="font-black text-xs text-slate-900 truncate">{activeStudent.name}</h4>
                    <p className="text-[8.5px] font-black text-emerald-700">{formatClassLabel(studentClassLabel)}</p>
                    <div className="pt-1 space-y-0.5 border-t border-slate-100 text-[8px] text-slate-700">
                      <p><strong>Roll:</strong> #{activeStudent.rollNo} • <strong>Adm:</strong> {activeStudent.admissionNo}</p>
                      <p><strong>Father:</strong> {activeStudent.fatherName || "—"}</p>
                      {activeStudent.motherName && <p><strong>Mother:</strong> {activeStudent.motherName}</p>}
                      <p><strong>Mobile:</strong> {activeStudent.phone || "—"}</p>
                      <p><strong>Blood:</strong> <span className="text-rose-700 font-bold">🩸 {activeStudent.bloodGroup || "O+"}</span>{activeStudent.dateOfBirth ? ` • DOB: ${activeStudent.dateOfBirth}` : ''}</p>
                      {activeStudent.address && <p><strong>Address:</strong> {activeStudent.address}</p>}
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="shrink-0">
                    <div className="w-[68px] h-[80px] rounded-xl border border-slate-300 overflow-hidden shadow-sm bg-slate-100 flex items-center justify-center">
                      {activePhoto ? (
                        <img
                          src={activePhoto}
                          alt={activeStudent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-emerald-700 via-teal-800 to-indigo-900 flex flex-col items-center justify-center text-white select-none">
                          <span className="text-sm font-black">{studentInitials}</span>
                          <span className="text-[6.5px] uppercase font-bold text-emerald-200 mt-0.5">STUDENT</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500 shrink-0">
                  <span>Valid for Academic Session 2026-27</span>
                  <span className="font-bold text-slate-800">Principal Signature ✓</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: OUR TEACHERS & FACULTY DIRECTORY ─────────────────────────── */}
        {activeTab === "teachers" && (
          <div className="space-y-5 animate-in fade-in">
            {/* Faculty Header Card */}
            <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border border-slate-800 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-black text-white">
                        Our Esteemed Faculty (हमारे सम्मानीय शिक्षक)
                      </h2>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {displayedFaculty.length} Educators
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      हमारे विद्यालय के सुयोग्य, अनुभवी एवं समर्पित मार्गदर्शकों का परिचय
                    </p>
                  </div>
                </div>

                {/* Privacy Badge */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>🔒 Privacy Protected • Teachers ke personal numbers private hain</span>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    placeholder="Search by teacher name, subject, or qualification..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
                  />
                  {teacherSearch && (
                    <button
                      type="button"
                      onClick={() => setTeacherSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Academic guidance ke liye school counter / office se sampark karein.</span>
                </p>
              </div>
            </div>

            {/* Teachers Cards Grid */}
            {schoolTeachers.length === 0 ? (
              <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-white">
                  शिक्षक सूची अभी अपडेट की जा रही है (No Faculty Added Yet)
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                  जैसे ही स्कूल प्रशासन द्वारा शिक्षकों का प्रोफाइल और विषय विवरण दर्ज किया जाएगा, यहाँ सभी सम्मानीय शिक्षकों की सूची प्रदर्शित होगी।
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-semibold text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>स्कूल एडमिन पैनल से टीचर जोड़े जाने पर यहाँ लाइव दिखेगा</span>
                </div>
              </div>
            ) : displayedFaculty.length === 0 ? (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <GraduationCap className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Koi teacher match nahi hua</p>
                <p className="text-xs text-slate-400 mt-1">
                  "{teacherSearch}" se match hone wala koi teacher nahi mila. Search query badalkar dekhein.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedFaculty.map((t, idx) => {
                  const subjectsList = Array.isArray(t.subjects)
                    ? t.subjects
                    : (typeof t.subjects === "string" ? t.subjects.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
                  return (
                    <div
                      key={t.id || `faculty-${t.name}-${idx}`}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700/90 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-sm relative overflow-hidden group hover:shadow-lg"
                    >
                      {/* Top accent line */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

                      <div className="space-y-3.5">
                        {/* Header: Photo + Name + Designation */}
                        <div className="flex items-start gap-3.5">
                          {/* Portrait Photo */}
                          <div className="w-14 h-16 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 shrink-0 shadow-inner flex items-center justify-center">
                            {t.photoUrl ? (
                              <img
                                src={t.photoUrl}
                                alt={t.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 flex flex-col items-center justify-center text-white select-none">
                                <span className="text-lg font-black">{t.name ? t.name.charAt(0).toUpperCase() : "T"}</span>
                                <span className="text-[7px] font-bold text-blue-200">FACULTY</span>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                                {t.name}
                              </h3>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Faculty" />
                            </div>

                            <p className="text-xs font-semibold text-blue-400 mt-0.5 truncate">
                              {t.designation || "Senior Faculty Member"}
                            </p>

                            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                              {t.qualification && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                  🎓 {t.qualification}
                                </span>
                              )}
                              {t.experience && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                  ⏳ {t.experience}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Subjects Taught Badges */}
                        {subjectsList.length > 0 && (
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                              Subjects Taught (विषय):
                            </span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {subjectsList.map((sub: string, sIdx: number) => (
                                <span
                                  key={`t-sub-${t.id}-${sIdx}`}
                                  className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Bio / Teacher Quote */}
                        {t.bio && (
                          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 italic relative">
                            <span className="text-blue-400 font-serif font-black mr-1 text-sm">“</span>
                            {t.bio}
                            <span className="text-blue-400 font-serif font-black ml-1 text-sm">”</span>
                          </div>
                        )}
                      </div>

                      {/* Card Footer: Privacy-Safe Official Routing */}
                      <div className="mt-4 pt-3 border-t border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>Academic Mentor</span>
                        </span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Faculty</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB: SCHOOL STORE & 24-HOUR ITEM BOOKING ──────────────────────────── */}
        {activeTab === "store" && (
          <div className="space-y-4 animate-in fade-in">
            <StudentSchoolStore
              school={{
                ...(school || {}),
                id: schoolId,
                name: schoolDisplayName,
                logoUrl: resolvedSchoolLogo,
              } as any}
              student={activeStudent}
              onBack={() => setActiveTab("overview")}
            />
          </div>
        )}
      </main>

      {/* ── FIXED BOTTOM NAVIGATION BAR (STUDENT PORTAL) ────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 print:hidden">
        <div className="max-w-xl mx-auto grid grid-cols-5 gap-1">
          {[
            { id: "overview", label: "Home", icon: Home },
            { id: "attendance", label: "Attendance", icon: CalendarCheck },
            { id: "channel", label: "Updates", icon: Bell },
            { id: "holidays", label: "Holidays", icon: CalendarDays },
            { id: "events_memories", label: "Memories", icon: Sparkles },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as TabType);
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  isActive
                    ? "bg-emerald-600/20 text-emerald-400 font-bold shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] sm:text-[11px] leading-tight font-medium truncate max-w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── OFFICIAL FEE RECEIPT MODAL ─────────────────────────────────────── */}
      {selectedFeeForReceipt && (
        <OfficialFeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedFeeForReceipt(null)}
          school={{
            ...(school || {}),
            id: schoolId,
            name: schoolDisplayName,
            logoUrl: resolvedSchoolLogo,
            address: school?.address || "Institutional Academic Campus, Educational Zone",
            affiliation: school?.affiliation || "Affiliated School Campus",
            code: school?.code || "NSTZ"
          } as any}
          fee={selectedFeeForReceipt}
          student={activeStudent}
          className={formatClassLabel(studentClassLabel)}
          sessionName="2026-2027"
          initialFormat={feeModalFormat}
          isStudentView={true}
        />
      )}

      {/* ── OFFICIAL ADMISSION FORM & RECEIPT MODAL ───────────────────────── */}
      {selectedAdmissionModal && (
        <AdmissionFormPrintModal
          key={`adm_modal_${selectedAdmissionModal.mode}`}
          isOpen={true}
          onClose={() => setSelectedAdmissionModal(null)}
          school={{
            ...(school || {}),
            id: schoolId,
            name: schoolDisplayName,
            logoUrl: resolvedSchoolLogo,
            address: school?.address || "Affour nzgra saran",
            affiliation: school?.affiliation || "",
            code: school?.code || "",
            email: school?.email || "",
            mobile: school?.mobile || school?.phone || "",
          } as any}
          student={activeStudent}
          application={enrichedData || activeStudent}
          className={formatClassLabel(studentClassLabel)}
          sessionName={activeStudent.sessionId || "2026-27"}
          feeRecord={selectedAdmissionModal.feeRecord || studentAdmissionFeeRecord}
          initialMode={selectedAdmissionModal.mode}
          isStudentView={true}
        />
      )}

      {/* ── ANNUAL BULK FEE STATEMENT (A4 DOSSIER) MODAL ─────────────────── */}
      {showBulkFeeModal && (
        <AnnualBulkFeeStatementModal
          isOpen={true}
          onClose={() => setShowBulkFeeModal(false)}
          school={{
            ...(school || {}),
            id: schoolId,
            name: schoolDisplayName,
            logoUrl: resolvedSchoolLogo,
            address: school?.address || "Affour nzgra saran",
            affiliation: school?.affiliation || "",
            code: school?.code || "",
            email: school?.email || "",
            mobile: school?.mobile || school?.phone || "",
            upiId: school?.upiId || "",
            principalName: school?.principalName || "Principal",
            principalSignatureUrl: school?.principalSignatureUrl || "",
          } as any}
          student={activeStudent}
          className={formatClassLabel(studentClassLabel)}
          sessionName={activeStudent.sessionId || "2026-2027"}
          allFees={allStudentFees}
          feeSummary={feeSummary}
          isStudentView={true}
        />
      )}

      {/* ── QR ATTENDANCE SCANNER MODAL ────────────────────────────────────── */}
      {showQrAttendanceScanner && (
        <QrAttendanceScannerModal
          isOpen={true}
          onClose={() => setShowQrAttendanceScanner(false)}
          currentStudent={{
            id: activeStudent.id,
            name: activeStudent.name,
            rollNo: activeStudent.rollNo,
            classId: activeStudent.classId || "cls_nursery",
            className: formatClassLabel(studentClassLabel),
            schoolId: schoolId,
            schoolName: schoolDisplayName,
          }}
          isTeacherMode={false}
          onStudentMarked={(res) => {
            setShowQrAttendanceScanner(false);
            setAttendanceSuccessMsg(`🎉 Shabaash ${activeStudent.name}! Aapki attendance safaltapoorvak darj ho gayi hai.`);
            setTimeout(() => setAttendanceSuccessMsg(null), 6000);
          }}
        />
      )}

      {/* ── NOTIFICATION CENTER & NOTICES HISTORY MODAL ───────────────────── */}
      {showNotificationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Bell className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Notifications &amp; Alerts</h3>
                  <p className="text-[10px] text-slate-400">स्कूल सूचनाएं, मासिक फीस व अवकाश अपडेट</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNotificationModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Push Alerts Toggle Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pushEnabled ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                    <span className="text-xs font-bold text-white">
                      Lock Screen Push Alerts:{" "}
                      <span className={pushEnabled ? "text-emerald-400" : "text-amber-400"}>
                        {pushEnabled ? "Active (चालू)" : "Inactive (बंद)"}
                      </span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  {pushEnabled
                    ? `हर माह देय फीस (वर्तमान: ₹${pendingDues.toLocaleString("en-IN")}), छुट्टी और कम्युनिटी पोस्ट फ़ोन लॉक होने पर भी अपने आप दिखेंगे।`
                    : "1 टैप में चालू करें — मासिक फीस, छुट्टी व स्कूल कम्युनिटी अपडेट Lock Screen पर पाएं।"}
                </p>
                <div className="flex items-center gap-2">
                  {pushEnabled ? (
                    <button
                      type="button"
                      onClick={handleSendTestLockScreenPush}
                      disabled={pushBusy}
                      className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Test Lock Screen Push
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleTogglePushAlerts}
                      disabled={pushBusy}
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{pushBusy ? "Activating..." : "1-Tap Enable Alerts"}</span>
                    </button>
                  )}
                  {pushEnabled && (
                    <button
                      type="button"
                      onClick={handleTogglePushAlerts}
                      disabled={pushBusy}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                    >
                      Turn Off
                    </button>
                  )}
                </div>
              </div>

              {/* Notification History Section */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Notification History (ताज़ा अलर्ट व सर्कुलर)</span>
                </h4>

                <div className="space-y-2.5">
                  {/* Automated Fee Due Alert */}
                  {pendingDues > 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          Fee Due Notice
                        </span>
                        <span className="text-[10px] text-slate-400">Current Session</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        मासिक शिक्षण शुल्क देय: ₹{pendingDues.toLocaleString("en-IN")}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        कृपया समय पर शुल्क भुगतान करें ताकि परीक्षा व रिपोर्ट कार्ड में व्यवधान न हो।
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                          Fee Status
                        </span>
                        <span className="text-[10px] text-slate-400">Up to date</span>
                      </div>
                      <p className="text-xs font-bold text-white">
                        सभी देय शुल्क पूर्ण रूप से चुकता हैं।
                      </p>
                    </div>
                  )}

                  {/* Automated Attendance Alert */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                        Attendance Status
                      </span>
                      <span className="text-[10px] text-slate-400">Today</span>
                    </div>
                    <p className="text-xs font-bold text-white">
                      कुल उपस्थिति: {attendanceStats.percentage}% ({attendanceStats.presentCount} दिन उपस्थित)
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      नियमित उपस्थिति के लिए धन्यवाद।
                    </p>
                  </div>

                  {/* School Circulars / Notices */}
                  {noticesList && noticesList.length > 0 ? (
                    noticesList.map((ntc: any) => (
                      <div key={ntc.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            {ntc.category || "School Notice"}
                          </span>
                          <span className="text-[10px] text-slate-400">{ntc.date}</span>
                        </div>
                        <h5 className="text-xs font-bold text-white">{ntc.title}</h5>
                        {ntc.body && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-3">
                            {ntc.body}
                          </p>
                        )}
                      </div>
                    ))
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-STUDENT SWITCHER & ADD ID MODAL ───────────────────────── */}
      {showStudentSwitcherModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Student Account Switcher</h3>
                  <p className="text-[10px] text-slate-400">छात्र आईडी चुनें या नई आईडी जोड़ें</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentSwitcherModal(false)}
                className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              <p className="text-xs text-slate-400">
                एक ही डिवाइस में परिवार के सभी बच्चों की आईडी लिंक करें और कभी भी स्विच करें:
              </p>

              <div className="space-y-2">
                {/* Active Student */}
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {studentInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{activeStudent.name}</p>
                      <p className="text-[10px] text-slate-400">
                        Class: {formatClassLabel(studentClassLabel)} • Roll #{activeStudent.rollNo}
                      </p>
                      <p className="text-[10px] font-mono text-emerald-400 truncate">
                        ID: {activeStudent.admissionNo}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Active</span>
                  </span>
                </div>

                {/* Sibling / Other Linked Students */}
                {allLinkedStudents &&
                  allLinkedStudents
                    .filter((s: any) => s.id !== activeStudent.id && s.admissionNo !== activeStudent.admissionNo)
                    .map((sib: any) => (
                      <button
                        key={sib.id || sib.admissionNo}
                        type="button"
                        onClick={() => {
                          try {
                            localStorage.setItem("nst_current_user", JSON.stringify(sib));
                            window.location.reload();
                          } catch {}
                        }}
                        className="w-full p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-left flex items-center justify-between gap-3 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 group-hover:bg-slate-700">
                            {(sib.name || "S").slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{sib.name}</p>
                            <p className="text-[10px] text-slate-400">
                              Class: {sib.className || sib.classId} • Roll #{sib.rollNo}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              ID: {sib.admissionNo || sib.id}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 group-hover:bg-indigo-600 group-hover:text-white transition shrink-0">
                          Switch
                        </span>
                      </button>
                    ))}
              </div>

              {/* Add New Student ID Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentSwitcherModal(false);
                    if (onAddAnotherStudentQr) {
                      onAddAnotherStudentQr();
                    } else {
                      setActiveTab("idcard");
                    }
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-md active:scale-95"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add New Student ID Card (QR Scan)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CELEBRATORY SCHOOL WELCOME MODAL ── */}
      <SchoolWelcomeModal
        isOpen={Boolean(welcomeModalData)}
        onClose={() => setWelcomeModalData(null)}
        welcomeData={welcomeModalData}
        onOpenSchoolDesk={() => setActiveTab("channel")}
      />

      {/* ── CELEBRATORY SCHOOL BIRTHDAY MODAL ── */}
      <SchoolBirthdayModal
        isOpen={Boolean(birthdayModalData)}
        onClose={() => setBirthdayModalData(null)}
        birthdayData={birthdayModalData}
        onOpenSchoolDesk={() => setActiveTab("channel")}
      />
    </div>
  );
};

export default StudentSchoolPanel;
