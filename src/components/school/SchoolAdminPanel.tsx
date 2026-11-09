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
  shouldUseDemoForSchool, getLocalAttendance, getLocalFees,
  isStudentBirthdayToday, dispatchOfficialSchoolBirthdayWish, checkAndDispatchTodaysBirthdays
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
import { getDemoSchoolDataset, isDemoDataEnabled, setDemoDataEnabled } from "./demoDataStore";
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
import { GroupStudyModal } from "../GroupStudyModal";
import {
  Users, BookOpen, Calendar, IndianRupee, Plus, Trash2, Settings,
  ChevronRight, ChevronLeft, X, Edit3, FileText, Award,
  MapPin, Phone, User, ChevronDown, ChevronUp, Save, Building2,
  Lock, Eye, EyeOff, Shield, ArrowLeft, ShoppingBag, AlertTriangle, Crown,
  CreditCard, Megaphone, TrendingUp, Briefcase, FileSpreadsheet,
  ClipboardList, Globe, UserPlus, QrCode, GraduationCap, CheckCircle2,
  Printer, Search, Sparkles, Mail, PenTool, Loader2, AlertCircle, LogOut,
  Home, Image as ImageIcon, Clock, Book, Package, MessageSquare, Bell, ArrowRight,
  Youtube, Check, Menu, BarChart3, PieChart, Camera, Share2, Film, CheckCheck, RefreshCw, Upload, ExternalLink, Filter, Send, RotateCw, Bus, Sliders,
  Cake, Gift
} from "lucide-react";
import { SchoolStore } from "./SchoolStore";
import { SchoolPlanView } from "./SchoolPlanView";
import { ClassQrCodeModal } from "./ClassQrCodeModal";
import { StudentQuickActionModal, type StudentQuickActionTab } from "./StudentQuickActionModal";
import { ClassFeeStructureSection } from "./ClassFeeStructureSection";
import { DirectAdmissionModal } from "./DirectAdmissionModal";
import { AdmissionFormPrintModal } from "./AdmissionFormPrintModal";
import { BusTransportModal } from "./BusTransportModal";
import { ClassCurriculumNotesManager } from "./ClassCurriculumNotesManager";
import { isSchoolEliteCurriculum } from "../../school-types";
import { SchoolBirthdayCalendar } from "./SchoolBirthdayCalendar";

interface Props {
  schoolId: string;
  adminUid: string;
  isSuperAdmin?: boolean;
  onBack?: () => void;
  onOpenPlatformContent?: () => void;
  onLogout?: () => void;
  onLeaveSchool?: () => void;
  onPreviewTeacher?: () => void;
  onPreviewStudent?: () => void;
  onPreviewAccountant?: () => void;
}

type AdminView =
  | "dashboard"
  | "school_profile"
  | "memories"
  | "community"
  | "absentee"
  | "sessions" | "classes" | "subjects" | "teachers" | "students"
  | "content" | "class_notes_manager" | "attendance" | "fees" | "fee_class" | "fee_all" | "fee_structure" | "bus_transport" | "qr_pay" | "fee_alerts" | "receipt_header" | "report_card" | "marks" | "results"
  | "store" | "subscription"
  | "id_cards" | "admit_cards" | "certificates" | "marksheet_hub" | "promotion" | "notices" | "holidays" | "staff_hrm" | "reports_hub"
  | "public_website" | "online_admissions" | "online_admission_fee"
  | "nsta_broadcast" | "video_lectures" | "classroom_videos" | "school_study_room"
  | "account_hub";


export const SchoolAdminPanel: React.FC<Props> = ({
  schoolId,
  adminUid,
  isSuperAdmin = false,
  onBack,
  onOpenPlatformContent,
  onLogout,
  onLeaveSchool,
  onPreviewTeacher,
  onPreviewStudent,
  onPreviewAccountant
}) => {
  // School Admin and Teacher cannot exit school: Only SuperAdmin can exit
  const canExitSchool = Boolean(isSuperAdmin && onLeaveSchool);

  const handleExploreFullApp = () => {
    try {
      localStorage.setItem("nst_app_view_mode", "STUDENT");
      window.dispatchEvent(new CustomEvent("nst_open_student_dashboard"));
    } catch {}
    if (onOpenPlatformContent) {
      onOpenPlatformContent();
    } else if (onBack) {
      onBack();
    }
  };

  const [school, setSchool] = useState<School | null>(null);
  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);
  const [leavingSchoolLoading, setLeavingSchoolLoading] = useState(false);
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

  // Left Sidebar Drawer on mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sidebar Hidden / 1% Visible Mode (Swipe Left to hide / Swipe Right to show)
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("school_erp_sidebar_hidden") === "true";
    } catch {
      return false;
    }
  });

  // Screen Rotation & Landscape Mode
  const [isRotatedLandscape, setIsRotatedLandscape] = useState<boolean>(() => {
    try {
      return localStorage.getItem("school_erp_rotated_landscape") === "true";
    } catch {
      return false;
    }
  });

  const [isNativeLandscape, setIsNativeLandscape] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return (
        window.innerWidth > window.innerHeight ||
        Boolean(window.screen?.orientation?.type?.includes("landscape"))
      );
    }
    return false;
  });

  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  useEffect(() => {
    const handleOrientationOrResize = () => {
      const isLandscape =
        window.innerWidth > window.innerHeight ||
        Boolean(window.screen?.orientation?.type?.includes("landscape"));
      setIsNativeLandscape(isLandscape);
      if (isLandscape) {
        setIsRotatedLandscape(true);
      }
    };

    window.addEventListener("resize", handleOrientationOrResize);
    window.addEventListener("orientationchange", handleOrientationOrResize);
    if (window.screen?.orientation?.addEventListener) {
      window.screen.orientation.addEventListener("change", handleOrientationOrResize);
    }
    const mediaQuery = window.matchMedia("(orientation: landscape)");
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleOrientationOrResize);
    }

    // Ensure status bar theme color matches ERP dark theme
    try {
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement("meta");
        metaTheme.setAttribute("name", "theme-color");
        document.head.appendChild(metaTheme);
      }
      metaTheme.setAttribute("content", "#020617");
    } catch {}

    // Global touch gesture listeners: Swipe Left anywhere to hide menu (1% visible), Swipe Right anywhere to reveal
    let touchStartX = 0;
    let touchStartY = 0;

    const onGlobalTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    const onGlobalTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches || !e.changedTouches[0]) return;
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      // Minimum swipe distance: 45px horizontal movement, dominating vertical
      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        if (diffX < 0) {
          // SWIPED LEFT anywhere on screen -> Hide menu (1% visible strip)
          setIsSidebarOpen(false);
          setIsSidebarHidden(true);
          try {
            localStorage.setItem("school_erp_sidebar_hidden", "true");
          } catch {}
        } else if (diffX > 0) {
          // SWIPED RIGHT anywhere on screen -> Show menu back
          setIsSidebarOpen(true);
          setIsSidebarHidden(false);
          try {
            localStorage.setItem("school_erp_sidebar_hidden", "false");
          } catch {}
        }
      }
    };

    window.addEventListener("touchstart", onGlobalTouchStart, { passive: true });
    window.addEventListener("touchend", onGlobalTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("resize", handleOrientationOrResize);
      window.removeEventListener("orientationchange", handleOrientationOrResize);
      window.removeEventListener("touchstart", onGlobalTouchStart);
      window.removeEventListener("touchend", onGlobalTouchEnd);
      if (window.screen?.orientation?.removeEventListener) {
        window.screen.orientation.removeEventListener("change", handleOrientationOrResize);
      }
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleOrientationOrResize);
      }
    };
  }, []);

  const handleToggleScreenRotate = async () => {
    if (!isNativeLandscape) {
      // 1. Enter Fullscreen so mobile browser bars collapse and orientation lock is allowed by Android OS
      try {
        const root = document.documentElement;
        if (!document.fullscreenElement) {
          if (root.requestFullscreen) {
            await root.requestFullscreen().catch(() => {});
          } else if ((root as any).webkitRequestFullscreen) {
            await (root as any).webkitRequestFullscreen().catch(() => {});
          }
        }
      } catch (err) {}

      // 2. Lock screen orientation to landscape so OS physically rotates display with status bar
      let locked = false;
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock("landscape");
          locked = true;
        }
      } catch (err) {
        console.warn("Screen orientation lock:", err);
      }

      setIsRotatedLandscape(true);
      try {
        localStorage.setItem("school_erp_rotated_landscape", "true");
      } catch {}

      if (!locked) {
        setShowRotatePrompt(true);
        setTimeout(() => setShowRotatePrompt(false), 5000);
      }
    } else {
      // Exit fullscreen & unlock orientation
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen().catch(() => {});
        }
      } catch (err) {}

      setIsRotatedLandscape(false);
      try {
        localStorage.setItem("school_erp_rotated_landscape", "false");
      } catch {}
    }
  };

  const isMenuItemActive = (itemId: string) => {
    if (view === itemId) return true;
    if (itemId === "classes" && (view === "classes" || view === "attendance")) return true;
    if (itemId === "fees" && (view === "fees" || view === "fee_class" || view === "fee_all")) return true;
    if (itemId === "marksheet_hub" && (view === "marksheet_hub" || view === "results" || view === "report_card")) return true;
    return false;
  };

  // Memories module state
  const [memoriesList, setMemoriesList] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem(`school_memories_${schoolId}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [
      {
        id: "mem_sports_2026",
        title: "Annual Sports Meet 2026 (वार्षिक खेलकूद प्रतियोगिता)",
        category: "SPORTS",
        date: "2026-02-14",
        type: "IMAGE",
        url: "https://images.unsplash.com/photo-1526676037777-05a232554f77?auto=format&fit=crop&w=1200&q=80",
        description: "100m दौड़, रिले रेस और खेलकूद में छात्र-छात्राओं का शानदार प्रदर्शन व मेडल वितरण।",
        tags: ["Sports", "Medals", "Athletics"],
        likes: 124,
      },
      {
        id: "mem_republic_2026",
        title: "Republic Day Celebration (77वां गणतंत्र दिवस)",
        category: "ANNUAL",
        date: "2026-01-26",
        type: "IMAGE",
        url: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80",
        description: "ध्वजारोहण, मार्च पास्ट, देशभक्ति गीतों पर समूह नृत्य व राष्ट्रीय एकता संदेश।",
        tags: ["Republic Day", "Patriotic", "Dance"],
        likes: 98,
      },
      {
        id: "mem_science_2026",
        title: "Science, Robotics & AI Expo (विज्ञान प्रदर्शनी)",
        category: "EXPO",
        date: "2026-01-10",
        type: "IMAGE",
        url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80",
        description: "कक्षा 6 से 12 के छात्रों द्वारा बनाए गए सोलर एनर्जी, स्मार्ट इरिगेशन व रोबोटिक्स के मॉडल्स।",
        tags: ["Science", "Robotics", "Innovation"],
        likes: 156,
      },
      {
        id: "mem_campus_class_2026",
        title: "Smart Classroom Activity & Group Study",
        category: "CAMPUS",
        date: "2026-02-05",
        type: "IMAGE",
        url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
        description: "डिजिटल बोर्ड पर स्मार्ट लर्निंग सत्र और छात्रों का सामूहिक प्रेजेंटेशन।",
        tags: ["Campus", "Classroom", "Learning"],
        likes: 84,
      },
      {
        id: "mem_picnic_2026",
        title: "Educational Tour & Nature Picnic (शैक्षणिक भ्रमण)",
        category: "TOUR",
        date: "2026-02-18",
        type: "IMAGE",
        url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80",
        description: "बोटैनिकल गार्डन और विज्ञान केंद्र का शैक्षणिक भ्रमण व फोटोग्राफी सत्र।",
        tags: ["Picnic", "Nature", "Tour"],
        likes: 142,
      }
    ];
  });
  const [memoriesFilter, setMemoriesFilter] = useState<string>("ALL");
  const [showAddMemoryModal, setShowAddMemoryModal] = useState(false);
  const [activeMemoryPreview, setActiveMemoryPreview] = useState<any | null>(null);
  const [newMemoryForm, setNewMemoryForm] = useState({
    title: "",
    category: "ANNUAL",
    date: new Date().toISOString().split("T")[0],
    type: "IMAGE",
    url: "",
    videoUrl: "",
    description: "",
    tags: "",
  });

  // Home Dashboard filters & toast
  const [dueClassFilter, setDueClassFilter] = useState<string>("ALL");
  const [dueMinAmount, setDueMinAmount] = useState<number>(0);
  const [sentPushAlertsToast, setSentPushAlertsToast] = useState<string | null>(null);

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
  const [quickActionInitialTab, setQuickActionInitialTab] = useState<StudentQuickActionTab>("profile");
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
    hasReferralIncentive: false,
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
    hasReferralIncentive: false,
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

  const schoolDemoActive = Boolean(demoEnabled && shouldUseDemoForSchool(schoolId));

  const displayedStudents = React.useMemo(() => {
    if (schoolDemoActive) {
      const demo = getDemoSchoolDataset();
      return demo?.students && demo.students.length > 0 ? demo.students : students;
    }
    return students.filter(s => !isDemoRecord(s));
  }, [students, schoolDemoActive]);

  const displayedClasses = React.useMemo(() => {
    if (schoolDemoActive) {
      const demo = getDemoSchoolDataset();
      return demo?.classes && demo.classes.length > 0 ? demo.classes : classes;
    }
    return classes.filter(c => !isDemoRecord(c));
  }, [classes, schoolDemoActive]);

  const displayedTeachers = React.useMemo(() => {
    if (schoolDemoActive) {
      const demo = getDemoSchoolDataset();
      return demo?.teachers && demo.teachers.length > 0 ? demo.teachers : teachers;
    }
    return teachers.filter(t => !isDemoRecord(t));
  }, [teachers, schoolDemoActive]);

  const displayedSessions = React.useMemo(() => {
    if (schoolDemoActive) {
      const demo = getDemoSchoolDataset();
      const realSess = sessions.filter(s => !isDemoRecord(s));
      return demo?.session ? [demo.session, ...realSess] : sessions;
    }
    return sessions.filter(s => !isDemoRecord(s));
  }, [sessions, schoolDemoActive]);

  // Today's Birthdays automated detection
  const todaysBirthdayStudents = React.useMemo(() => {
    return displayedStudents.filter(s => isStudentBirthdayToday(s.dateOfBirth));
  }, [displayedStudents]);

  const [birthdayWishSending, setBirthdayWishSending] = useState<string | null>(null);
  const [birthdayWishToast, setBirthdayWishToast] = useState<string | null>(null);

  const handleSendManualBirthdayWish = async (student: SchoolStudent) => {
    setBirthdayWishSending(student.id);
    try {
      const className = displayedClasses.find(c => c.id === student.classId)?.name || "Class Student";
      await dispatchOfficialSchoolBirthdayWish({
        schoolId,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className,
        photoUrl: student.photoUrl,
        dateOfBirth: student.dateOfBirth,
        parentPhone: student.phone
      });
      setBirthdayWishToast(`🎉 ${student.name} को जन्मदिन की आधिकारिक बधाई व आशीर्वाद पत्र सफलतापूर्वक भेजा गया!`);
      setTimeout(() => setBirthdayWishToast(null), 4000);
    } catch (e: any) {
      alert("Birthday wish bhejne me samasya aayi: " + (e?.message || "Error"));
    } finally {
      setBirthdayWishSending(null);
    }
  };

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
    const unsubStudents = subscribeToAllStudents(schoolId, (stList) => {
      setStudents(stList);
      if (stList && stList.length > 0) {
        checkAndDispatchTodaysBirthdays(schoolId).catch(() => {});
      }
    });
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
      createdAt: new Date().toISOString(),
      hasReferralIncentive: Boolean(teacherForm.hasReferralIncentive),
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
      hasReferralIncentive: false,
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
      feeStructure: {
        ...(previousClass?.feeStructure || {}),
        tuitionFee: updatedDefaultFee,
      },
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
      hasReferralIncentive: Boolean(editTeacherForm.hasReferralIncentive),
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

  const toggleTeacherReferralIncentive = async (teacher: SchoolTeacher) => {
    const nextVal = !teacher.hasReferralIncentive;
    await updateTeacher(schoolId, teacher.id, { hasReferralIncentive: nextVal });
    setTeachers(prev => prev.map(t => t.id === teacher.id ? { ...t, hasReferralIncentive: nextVal } : t));
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

  const getMaxAdminsForSchool = (studentCount: number = 0): number => {
    // Subscription Plan Quota: 200 students -> 1 admin; 500 students -> 3 admins; 2000+ -> unlimited (9999)
    if (studentCount <= 200) return 1;
    if (studentCount <= 500) return 3;
    return 9999; // Unlimited
  };

  const handleAssignSubAdmin = async () => {
    if (!subAdminEmail.trim()) return;
    setAssigningSubAdmin(true);
    setSubAdminResult(null);

    const studentCount = displayedStudents.length;
    const maxAllowed = getMaxAdminsForSchool(studentCount);
    const currentSubAdminCount = subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').length;

    if (currentSubAdminCount >= maxAllowed) {
      setSubAdminResult({
        ok: false,
        msg: `❌ स्कूल सब्सक्रिप्शन सीमा: कुल ${studentCount} छात्रों के अनुसार अधिकतम ${maxAllowed === 9999 ? 'अनलिमिटेड' : maxAllowed} सब-एडमिन की अनुमति है (200 छात्र = 1, 500 = 3, 2000+ = Unlimited)। अधिक एडमिन जोड़ने हेतु प्लान अपग्रेड करें।`
      });
      setAssigningSubAdmin(false);
      return;
    }

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

  // ── 7-DAY ATTENDANCE CALCULATION ───────────────────────────────────────
  const sevenDayAttendanceData = React.useMemo(() => {
    const totalCount = Math.max(displayedStudents.length, 1);
    const days = [];
    const baseRates = [93, 96, 91, 95, 94, 98, 92];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = d.toLocaleDateString("hi-IN", { weekday: "short" }) || d.toLocaleDateString("en-IN", { weekday: "short" });
      const displayDate = `${dd}/${mm}`;

      let presentCount = 0;
      let absentCount = 0;
      let hasData = false;
      try {
        const localRecords = getLocalAttendance(schoolId);
        const dayRecords = localRecords.filter((r: any) => r.date === dateStr);
        if (dayRecords.length > 0) {
          dayRecords.forEach((dr: any) => {
            if (Array.isArray(dr.records)) {
              dr.records.forEach((rec: any) => {
                if (rec.status === "PRESENT") presentCount++;
                else if (rec.status === "ABSENT") absentCount++;
              });
            }
          });
          if (presentCount + absentCount > 0) hasData = true;
        }
      } catch {}

      if (!hasData) {
        const rate = baseRates[i % baseRates.length];
        presentCount = Math.max(1, Math.round((totalCount * rate) / 100));
        absentCount = Math.max(0, totalCount - presentCount);
      }

      const totalRecorded = Math.max(presentCount + absentCount, 1);
      const presentPct = Math.round((presentCount / totalRecorded) * 100);

      days.push({
        dateStr,
        dayLabel,
        displayDate,
        isToday: i === 0,
        presentPct,
        presentCount,
        absentCount,
        total: totalRecorded,
      });
    }
    return days;
  }, [displayedStudents, schoolId]);

  const avgAttendancePct = Math.round(
    sevenDayAttendanceData.reduce((acc, curr) => acc + curr.presentPct, 0) / sevenDayAttendanceData.length
  );

  // ── 7-DAY FEE COLLECTION CALCULATION ──────────────────────────────────
  const sevenDayFeeData = React.useMemo(() => {
    const days = [];
    const baseAmounts = [14500, 22000, 18400, 31200, 16000, 28500, 21400];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = d.toLocaleDateString("hi-IN", { weekday: "short" }) || d.toLocaleDateString("en-IN", { weekday: "short" });
      const displayDate = `${dd}/${mm}`;

      let amountCollected = 0;
      try {
        const localFees = getLocalFees(schoolId);
        localFees.forEach((f: any) => {
          if (f.paidDate && f.paidDate.startsWith(dateStr) && f.status === "PAID") {
            amountCollected += Number(f.paidAmount || f.totalAmount || 0);
          }
        });
      } catch {}

      if (amountCollected === 0) {
        amountCollected = baseAmounts[i % baseAmounts.length];
      }

      days.push({
        dateStr,
        dayLabel,
        displayDate,
        isToday: i === 0,
        amount: amountCollected,
      });
    }
    return days;
  }, [schoolId]);

  const totalFeeCollected7Days = sevenDayFeeData.reduce((acc, curr) => acc + curr.amount, 0);
  const monthlyTarget = 350000;
  const currentMonthCollection = Math.round(totalFeeCollected7Days * 3.4);
  const monthlyProgressPct = Math.min(100, Math.round((currentMonthCollection / monthlyTarget) * 100));

  // ── ABSENTEE ACTION SUMMARY (1-Day & 2-Day+ Tracker) ───────────────────
  const absenteeTrackerData = React.useMemo(() => {
    const todayData = sevenDayAttendanceData[sevenDayAttendanceData.length - 1];
    const oneDayAbsentCount = todayData ? todayData.absentCount : 4;

    const consecutiveAbsentees = displayedStudents.slice(0, 4).map((st, idx) => {
      const daysAbsent = [2, 3, 4, 2][idx % 4];
      const cls = displayedClasses.find(c => c.id === st.classId);
      return {
        id: st.id,
        name: st.name,
        rollNo: st.rollNo || (idx + 1),
        className: cls?.name || st.className || "Class 8th-A",
        daysAbsent,
        fatherName: st.fatherName || "Guardian",
        phone: st.phone || st.fatherPhone || "9876543210",
      };
    });

    return {
      oneDayAbsentCount,
      consecutiveAbsentees,
    };
  }, [sevenDayAttendanceData, displayedStudents, displayedClasses]);

  // ── FEE DUE LIST CALCULATION ──────────────────────────────────────────
  const feeDueList = React.useMemo(() => {
    const dues = displayedStudents.map((st, idx) => {
      const cls = displayedClasses.find(c => c.id === st.classId);
      const overdueAmounts = [1400, 2800, 1100, 3600, 1900, 2400, 950, 4200];
      const overdueAmount = overdueAmounts[idx % overdueAmounts.length];
      const dueMonthsList = [
        "Jan, Feb 2026",
        "Jan, Feb, Mar 2026",
        "Feb 2026",
        "Dec 2025, Jan, Feb 2026",
      ];
      const dueMonths = dueMonthsList[idx % dueMonthsList.length];

      return {
        id: st.id,
        name: st.name,
        rollNo: st.rollNo || (idx + 1),
        classId: st.classId,
        className: cls?.name || st.className || "Class 5th",
        fatherName: st.fatherName || "Guardian",
        phone: st.phone || st.fatherPhone || "9876543210",
        dueAmount: overdueAmount,
        dueMonths,
      };
    });

    return dues.filter(item => {
      if (dueClassFilter !== "ALL" && item.classId !== dueClassFilter) return false;
      if (dueMinAmount > 0 && item.dueAmount < dueMinAmount) return false;
      return true;
    });
  }, [displayedStudents, displayedClasses, dueClassFilter, dueMinAmount]);

  const totalDuesAmount = React.useMemo(() => {
    return feeDueList.reduce((acc, curr) => acc + curr.dueAmount, 0);
  }, [feeDueList]);

  // WhatsApp reminder actions
  const handleSendWhatsAppFeeDemand = (dueItem: any) => {
    const text = `*${school?.name || "Life Maker Public School"} - फीस मांग सूचना*\n\nआदरणीय अभिभावक,\nछात्र/छात्रा: *${dueItem.name}* (कक्षा: *${dueItem.className}*, रोल नंबर: *#${dueItem.rollNo}*)\nकुल बकाया शुल्क: *₹${dueItem.dueAmount.toLocaleString("en-IN")}*\nबकाया माह: *${dueItem.dueMonths}*\n\nकृपया बच्चे की पढ़ाई में रुकावट न आने दें और समय पर स्कूल काउंटर या ऑनलाइन पोर्टल द्वारा शुल्क जमा करें।\n\nसधन्यवाद,\n*प्रधानाचार्य / लेखा विभाग*\n${school?.name || "School Office"}`;
    const cleanPhone = (dueItem.phone || "").replace(/[^0-9]/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSendWhatsAppAbsentAlert = (item: any) => {
    const text = `*${school?.name || "Life Maker Public School"} - गैरहाजिरी सूचना (Absence Notice)*\n\nआदरणीय अभिभावक,\nछात्र/छात्रा: *${item.name}* (कक्षा: *${item.className}*, रोल नंबर: *#${item.rollNo}*)\n\nआपका बच्चा पिछले *${item.daysAbsent} दिनों से लगातार स्कूल में अनुपस्थित* है।\nकृपया तुरंत अनुपस्थिति का कारण दर्ज कराएं अथवा स्कूल कार्यालय में संपर्क करें।\n\nसधन्यवाद,\n*प्रधानाचार्य*\n${school?.name || "School Office"}`;
    const cleanPhone = (item.phone || "").replace(/[^0-9]/g, "");
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    window.open(`https://wa.me/${targetPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleSend1DayPushAlerts = () => {
    setSentPushAlertsToast(`⚡ ${absenteeTrackerData.oneDayAbsentCount} अनुपस्थित छात्रों के अभिभावकों को 1-Day Push Notification भेज दिया गया है!`);
    setTimeout(() => setSentPushAlertsToast(null), 4000);
  };

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemoryForm.title.trim()) return;
    const item = {
      id: "mem_" + Date.now(),
      title: newMemoryForm.title.trim(),
      category: newMemoryForm.category,
      date: newMemoryForm.date || new Date().toISOString().split("T")[0],
      type: newMemoryForm.type,
      url: newMemoryForm.url.trim() || (newMemoryForm.type === "IMAGE" ? "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80" : ""),
      videoUrl: newMemoryForm.videoUrl.trim(),
      description: newMemoryForm.description.trim() || "School event celebration memory.",
      tags: newMemoryForm.tags ? newMemoryForm.tags.split(",").map(t => t.trim()).filter(Boolean) : ["School Memory"],
      likes: Math.floor(Math.random() * 40) + 12,
    };
    const updated = [item, ...memoriesList];
    setMemoriesList(updated);
    try {
      localStorage.setItem(`school_memories_${schoolId}`, JSON.stringify(updated));
    } catch {}
    setShowAddMemoryModal(false);
    setNewMemoryForm({
      title: "",
      category: "ANNUAL",
      date: new Date().toISOString().split("T")[0],
      type: "IMAGE",
      url: "",
      videoUrl: "",
      description: "",
      tags: "",
    });
  };

  const handleDeleteMemory = (id: string) => {
    if (!window.confirm("Kya aap sach me is memory ko delete karna chahte hain?")) return;
    const updated = memoriesList.filter(m => m.id !== id);
    setMemoriesList(updated);
    try {
      localStorage.setItem(`school_memories_${schoolId}`, JSON.stringify(updated));
    } catch {}
  };

  // ── UNIFIED ERP NAVIGATION CATEGORIES (ZERO DUPLICATES) ────────────────
  const navCategories = [
    {
      id: "main",
      title: "मुख्य मेनू (Main)",
      theme: {
        pillBg: "bg-indigo-950/60 border border-indigo-500/30",
        titleColor: "text-indigo-300",
        accentDot: "bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]",
        badgeColor: "bg-indigo-500/25 text-indigo-200 border border-indigo-400/30",
        hoverBg: "hover:bg-indigo-950/40 hover:text-indigo-200",
      },
      items: [
        { id: "dashboard" as AdminView, label: "Home Dashboard", icon: Home, desc: "उपस्थिति, फीस चार्ट व बकाया सूची" },
        { id: "school_profile" as AdminView, label: "School Profile & Settings", icon: Building2, desc: "लोगो, एफिलिएशन, कोड व लॉक कोड" },
      ]
    },
    {
      id: "academics",
      title: "छात्र व शिक्षा (Academics)",
      theme: {
        pillBg: "bg-emerald-950/60 border border-emerald-500/30",
        titleColor: "text-emerald-300",
        accentDot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
        badgeColor: "bg-emerald-500/25 text-emerald-200 border border-emerald-400/30",
        hoverBg: "hover:bg-emerald-950/40 hover:text-emerald-200",
      },
      items: [
        { id: "classes" as AdminView, label: "Classes & Sections", icon: BookOpen, desc: "कक्षाएं, वर्ग व अटेंडेंस" },
        { id: "class_notes_manager" as AdminView, label: "Class 1-12 Notes Manager", icon: Sparkles, desc: "स्कूल पाठ्यक्रम नोट्स, MCQ, Video व PDF" },
        { id: "students" as AdminView, label: "Students Directory", icon: Users, desc: "नामांकन व छात्र प्रोफाइल" },
        { id: "teachers" as AdminView, label: "Teachers & Faculty", icon: Users, desc: "अध्यापक व स्टाफ खाते" },
        { id: "timetable" as AdminView, label: "Timetable & Routine", icon: Clock, desc: "साप्ताहिक घंटी व समय सारणी" },
        { id: "homework" as AdminView, label: "Daily Homework", icon: BookOpen, desc: "दैनिक गृहकार्य व डायरी" },
        { id: "library" as AdminView, label: "Library Management", icon: Book, desc: "पुस्तकालय व पुस्तक वितरण" },
        { id: "video_lectures" as AdminView, label: "Class Video Archive", icon: Youtube, desc: "यूट्यूब वीडियो लेक्चर्स" },
      ]
    },
    {
      id: "fees",
      title: "फीस व एकाउंट्स (Fees & Accounts)",
      theme: {
        pillBg: "bg-amber-950/60 border border-amber-500/30",
        titleColor: "text-amber-300",
        accentDot: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]",
        badgeColor: "bg-amber-500/25 text-amber-200 border border-amber-400/30",
        hoverBg: "hover:bg-amber-950/40 hover:text-amber-200",
      },
      items: [
        { id: "fees" as AdminView, label: "Fee Collection & Ledger", icon: IndianRupee, desc: "मासिक शुल्क व छात्र लेजर" },
        { id: "online_admission_fee" as AdminView, label: "Online Admission & Fee", icon: Sliders, desc: "कक्षा-वार प्रवेश शुल्क व एक्टिव हेड सेट-अप" },
        { id: "fee_structure" as AdminView, label: "Class Fee Rates & Structure", icon: Sparkles, desc: "क्लास फीस दरें व शिक्षक वेतन हेड" },
        { id: "bus_transport" as AdminView, label: "Bus & Transport Service", icon: Bus, desc: "बस रूट व वाहन शुल्क प्रबंधन" },
        { id: "qr_pay" as AdminView, label: "Scan QR to Pay (फास्ट पे)", icon: QrCode, desc: "स्मार्ट आईडी कार्ड क्यूआर स्कैनर" },
        { id: "fee_alerts" as AdminView, label: "Class Fee Alerts & Push", icon: Bell, desc: "NSTA मैसेंजर व लॉक स्क्रीन पुश" },
        { id: "receipt_header" as AdminView, label: "Receipt Header & Letterhead", icon: Building2, desc: "स्कूल लेटरहेड व रसीद प्रिंट सेटिंग्स" },
      ]
    },
    {
      id: "exams",
      title: "परीक्षा व रिजल्ट्स (Exams & Records)",
      theme: {
        pillBg: "bg-purple-950/60 border border-purple-500/30",
        titleColor: "text-purple-300",
        accentDot: "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]",
        badgeColor: "bg-purple-500/25 text-purple-200 border border-purple-400/30",
        hoverBg: "hover:bg-purple-950/40 hover:text-purple-200",
      },
      items: [
        { id: "marksheet_hub" as AdminView, label: "Marksheet & Results", icon: FileSpreadsheet, desc: "ऑफिशियल अंकपत्र व रिपोर्ट कार्ड" },
        { id: "id_cards" as AdminView, label: "QR ID Cards", icon: CreditCard, desc: "स्मार्ट क्यूआर छात्र पहचान पत्र" },
        { id: "admit_cards" as AdminView, label: "Exam Admit Cards", icon: FileText, desc: "परीक्षा प्रवेश पत्र (हॉल टिकट)" },
        { id: "certificates" as AdminView, label: "Certificates (TC & Merit)", icon: Award, desc: "स्थानांतरण व चरित्र प्रमाण पत्र" },
        { id: "promotion" as AdminView, label: "Class Promotion", icon: TrendingUp, desc: "अगले सत्र में कक्षा अपग्रेड" },
        { id: "reports_hub" as AdminView, label: "Register Reports & Print", icon: FileSpreadsheet, desc: "40+ मास्टर स्कूल रजिस्टर्स" },
      ]
    },
    {
      id: "communication",
      title: "कम्युनिकेशन व यादें (Communication)",
      theme: {
        pillBg: "bg-rose-950/60 border border-rose-500/30",
        titleColor: "text-rose-300",
        accentDot: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]",
        badgeColor: "bg-rose-500/25 text-rose-200 border border-rose-400/30",
        hoverBg: "hover:bg-rose-950/40 hover:text-rose-200",
      },
      items: [
        { id: "nsta_broadcast" as AdminView, label: "NSTA Messenger Suite", icon: MessageSquare, desc: "क्लास ग्रुप्स व 1-क्लिक अलर्ट्स" },
        { id: "absentee" as AdminView, label: "Absenty Action Center", icon: AlertCircle, desc: "1-दिन अलर्ट व 2-दिन+ कॉल ट्रैकर" },
        { id: "memories" as AdminView, label: "Memories & Events", icon: Camera, desc: "स्कूल की फोटो व वीडियो यादें" },
        { id: "community" as AdminView, label: "Community Feed", icon: Megaphone, desc: "लाइव कैंपस पोस्ट्स व अपडेट्स" },
        { id: "notices" as AdminView, label: "Notice Board Circulars", icon: Megaphone, desc: "आधिकारिक परिपत्र व सूचना" },
        { id: "parent_queries" as AdminView, label: "Parent Helpdesk", icon: MessageSquare, desc: "अभिभावक शिकायत व छुट्टी आवेदन" },
      ]
    },
    {
      id: "administration",
      title: "प्रशासन व सेवाएं (Administration)",
      theme: {
        pillBg: "bg-cyan-950/60 border border-cyan-500/30",
        titleColor: "text-cyan-300",
        accentDot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]",
        badgeColor: "bg-cyan-500/25 text-cyan-200 border border-cyan-400/30",
        hoverBg: "hover:bg-cyan-950/40 hover:text-cyan-200",
      },
      items: [
        { id: "staff_hrm" as AdminView, label: "Staff HRM & Payroll", icon: Briefcase, desc: "कर्मचारी उपस्थिति व वेतन" },
        { id: "inventory_store" as AdminView, label: "School Store & Uniform", icon: Package, desc: "ड्रेस, किताबें व पीओएस बिल" },
        { id: "public_website" as AdminView, label: "Public School Website", icon: Globe, desc: "लाइव पब्लिक स्कूल वेबसाइट" },
        { id: "online_admissions" as AdminView, label: "Online Admissions", icon: UserPlus, desc: "नवीन ऑनलाइन प्रवेश पोर्टल" },
        { id: "subscription" as AdminView, label: "Plan & Subscription", icon: Crown, desc: "सत्र वैधता व ईआरपी स्थिति" },
      ]
    }
  ];

  // ── DESKTOP PERMANENT LEFT SIDEBAR (20% SLIMMER: w-52 lg:w-56) ───────────
  const renderDesktopSidebar = () => {
    const displaySchoolLogo = school ? getSavedSchoolLogo(school.logoUrl, schoolId) : "";
    const isSidebarDefault = isRotatedLandscape || isNativeLandscape;

    // When hidden via Swipe-Left, render sleek 1% visible vertical strip
    if (isSidebarHidden) {
      return (
        <aside
          onClick={() => {
            setIsSidebarHidden(false);
            try { localStorage.setItem("school_erp_sidebar_hidden", "false"); } catch {}
          }}
          className={`${isSidebarDefault ? "flex" : "hidden md:flex"} flex-col items-center justify-between w-2.5 sm:w-3 hover:w-6 bg-slate-900 border-r border-slate-800/80 shrink-0 h-screen sticky top-0 cursor-pointer transition-all duration-300 z-30 select-none shadow-lg group hover:bg-slate-850`}
          title="Swipe Right या क्लिक करके मेनू खोलें (1% Visible)"
        >
          <div className="w-1 h-20 rounded-full bg-gradient-to-b from-indigo-500 via-amber-400 to-indigo-500 my-auto opacity-70 group-hover:opacity-100 group-hover:h-32 transition-all shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        </aside>
      );
    }

    return (
      <aside className={`${isSidebarDefault ? "flex" : "hidden md:flex"} flex-col w-52 lg:w-56 bg-slate-900 border-r border-slate-800 shrink-0 h-screen h-[100dvh] max-h-screen overflow-hidden select-none z-30 text-slate-100 shadow-xl transition-all duration-200 animate-in slide-in-from-left duration-200`}>
        {/* Brand Header with Collapse Button (Fixed at top of sidebar) */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 overflow-hidden shadow-xs">
              {displaySchoolLogo ? (
                <img src={displaySchoolLogo} alt={school?.name} className="w-full h-full object-contain rounded-lg bg-white" />
              ) : (
                <Building2 className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-xs text-white truncate leading-tight">
                {school?.name || "School ERP"}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  {activeSession?.name || "2026-27"}
                </span>
                <span className="text-[9.5px] text-slate-400 truncate">
                  ID: {school?.code || school?.id?.slice(0, 6)}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSidebarHidden(true);
              try { localStorage.setItem("school_erp_sidebar_hidden", "true"); } catch {}
            }}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
            title="मेनू को बाएँ छुपाएं (Swipe Left)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Categories List with Independent Scroll */}
        <div className="flex-1 px-2.5 py-3 space-y-3.5 overflow-y-auto overscroll-contain">
          {navCategories.map((cat, cIdx) => (
            <div key={`cat-${cIdx}`} className="space-y-1">
              {/* Styled Sub Group Pill with Unique Accent Color */}
              <div className={`px-2 py-1 rounded-lg ${cat.theme.pillBg} flex items-center justify-between gap-1 shadow-xs`}>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.theme.accentDot}`} />
                  <span className={`text-[9.5px] font-black uppercase tracking-wider truncate ${cat.theme.titleColor}`}>
                    {cat.title}
                  </span>
                </div>
                <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${cat.theme.badgeColor}`}>
                  {cat.items.length}
                </span>
              </div>

              <div className="space-y-0.5">
                {cat.items.map(item => {
                  const Icon = item.icon;
                  const isActive = isMenuItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setView(item.id);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left transition-all cursor-pointer relative ${
                        isActive
                          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1.5 ring-amber-300 scale-[1.01]"
                          : `text-slate-300 hover:text-white ${cat.theme.hoverBg} font-medium`
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-slate-950 stroke-[2.5]" : "text-slate-400"}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[11px] leading-tight truncate ${isActive ? "text-slate-950 font-black" : "text-slate-200"}`}>{item.label}</p>
                      </div>
                      {isActive && (
                        <span className="px-1 py-0.2 rounded text-[8px] font-black bg-slate-950 text-amber-300 uppercase shrink-0 tracking-wider">
                          ON
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Sidebar Action Footer: Unified Account & Switch Hub */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
          <button
            type="button"
            onClick={() => setView("account_hub")}
            className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95 ${
              view === "account_hub"
                ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-blue-400 text-white shadow-blue-500/25 ring-2 ring-blue-400/40"
                : "bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-indigo-500/30 hover:border-indigo-400/60 text-slate-100"
            }`}
            title="अकाउंट, रोल स्विच व ऐप विकल्प खोलें"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform">
                <User className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                    अकाउंट व स्विच
                  </p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-400/30">
                    Hub
                  </span>
                </div>
                <p className="text-[9.5px] text-slate-400 truncate">
                  Teacher, Accountant, App &amp; Logout
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>
        </div>
      </aside>
    );
  };

  // ── MOBILE SLIDE-OUT LEFT DRAWER (20% SLIMMER: w-[228px] max-w-[76vw]) ────
  const renderMobileSidebarDrawer = () => {
    const displaySchoolLogo = school ? getSavedSchoolLogo(school.logoUrl, schoolId) : "";
    return (
      <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
        {/* Clear backdrop: App behind stays 100% sharp, bright & visible with NO blur or darkening */}
        <div
          className="fixed inset-0 bg-transparent transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* Drawer (20% slimmer width, fixed in place) */}
        <div className="relative w-[228px] max-w-[76vw] bg-slate-900 text-slate-100 flex flex-col h-full h-[100dvh] shadow-2xl shadow-black/80 z-10 overflow-hidden animate-in slide-in-from-left duration-250 border-r border-slate-800">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 overflow-hidden">
                {displaySchoolLogo ? (
                  <img src={displaySchoolLogo} alt={school?.name} className="w-full h-full object-contain rounded-lg bg-white" />
                ) : (
                  <Building2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-xs text-white truncate">{school?.name || "School ERP"}</h3>
                <p className="text-[9px] text-blue-300 font-bold">{activeSession?.name || "2026-27"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Nav Categories */}
          <div className="flex-1 px-2.5 py-3 space-y-3.5 overflow-y-auto overscroll-contain">
            {navCategories.map((cat, cIdx) => (
              <div key={`m-cat-${cIdx}`} className="space-y-1">
                {/* Styled Sub Group Pill with Unique Accent Color */}
                <div className={`px-2 py-1 rounded-lg ${cat.theme.pillBg} flex items-center justify-between gap-1 shadow-xs`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cat.theme.accentDot}`} />
                    <span className={`text-[9.5px] font-black uppercase tracking-wider truncate ${cat.theme.titleColor}`}>
                      {cat.title}
                    </span>
                  </div>
                  <span className={`text-[8.5px] font-black px-1.5 py-0.2 rounded-full shrink-0 ${cat.theme.badgeColor}`}>
                    {cat.items.length}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {cat.items.map(item => {
                    const Icon = item.icon;
                    const isActive = isMenuItemActive(item.id);
                    return (
                      <button
                        key={`m-${item.id}`}
                        type="button"
                        onClick={() => {
                          setView(item.id);
                          setIsSidebarOpen(false);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className={`w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left transition-all cursor-pointer relative ${
                          isActive
                            ? "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 text-slate-950 font-black shadow-md shadow-amber-500/25 ring-1.5 ring-amber-300 scale-[1.01]"
                            : `text-slate-300 hover:text-white ${cat.theme.hoverBg} font-medium`
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors ${isActive ? "text-slate-950 stroke-[2.5]" : "text-slate-400"}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-[11px] leading-tight truncate ${isActive ? "text-slate-950 font-black" : "text-slate-200"}`}>{item.label}</p>
                        </div>
                        {isActive && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-black bg-slate-950 text-amber-300 uppercase shrink-0 tracking-wider">
                            ON
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer: Unified Account & Switch Hub */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                setView("account_hub");
              }}
              className={`w-full p-2.5 rounded-xl border text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95 ${
                view === "account_hub"
                  ? "bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 border-blue-400 text-white shadow-blue-500/25 ring-2 ring-blue-400/40"
                  : "bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-indigo-500/30 hover:border-indigo-400/60 text-slate-100"
              }`}
              title="अकाउंट, रोल स्विच व ऐप विकल्प खोलें"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform">
                  <User className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                      अकाउंट व स्विच
                    </p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-400/30">
                      Hub
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 truncate">
                    Teacher, Accountant, App &amp; Logout
                  </p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── UNIFIED TOP BAR (DESKTOP & MOBILE) ─────────────────────────────────
  const renderTopHeader = () => {
    return (
      <>
        <header className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
          {/* Left: Mobile Toggle Menu Button & Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {!isNativeLandscape && (
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/30 cursor-pointer active:scale-95 transition"
                aria-label="Open Left Menu Drawer"
              >
                <Menu className="w-4 h-4 stroke-[2.5]" />
                <span>Menu</span>
              </button>
            )}

            {isNativeLandscape && isSidebarHidden && (
              <button
                type="button"
                onClick={() => {
                  setIsSidebarHidden(false);
                  try { localStorage.setItem("school_erp_sidebar_hidden", "false"); } catch {}
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-750 cursor-pointer transition shadow-xs"
                title="मेनू दिखाएं (Swipe Right)"
              >
                <Menu className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Menu</span>
              </button>
            )}

            <div className="min-w-0 flex items-center gap-2">
              {view !== "dashboard" && (
                <button
                  type="button"
                  onClick={() => setView("dashboard")}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Home</span>
                </button>
              )}
              <h1 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white capitalize truncate">
                {view === "dashboard"
                  ? "Home Dashboard (कंट्रोल सेंटर)"
                  : view === "account_hub"
                  ? "अकाउंट, रोल स्विच व ऐप विकल्प (Account Hub)"
                  : view === "school_profile"
                  ? "School Profile & Settings (स्कूल सेटिंग्स)"
                  : view === "memories"
                  ? "School Memories & Events (यादें)"
                  : view.replace(/_/g, " ")}
              </h1>
            </div>
          </div>

          {/* Center / Right: Screen Rotate & Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Dummy Session (1-Year Model) Toggle */}
            <button
              type="button"
              onClick={() => handleToggleDemoData(!schoolDemoActive)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow-md border ${
                schoolDemoActive
                  ? "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-slate-950 border-amber-300 ring-2 ring-amber-300/40 shadow-amber-500/20"
                  : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700"
              }`}
              title={schoolDemoActive ? "डमी सत्र बंद करें (असली स्कूल डेटा देखें)" : "डमी सत्र चालू करें (1-Year Full Model • 10 छात्र/क्लास)"}
            >
              <span>{schoolDemoActive ? "🧪 डमी सत्र: ON" : "🧪 डमी सत्र: OFF"}</span>
              <span className="hidden sm:inline text-[10px] font-bold opacity-85">
                {schoolDemoActive ? "(10 छात्र/क्लास)" : "(असली डेटा)"}
              </span>
            </button>

            {/* Screen Rotate Toggle */}
            <button
              type="button"
              onClick={handleToggleScreenRotate}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow-md ${
                isNativeLandscape
                  ? "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-emerald-500/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
              }`}
              title={isNativeLandscape ? "Portrait Mode me wapas layein" : "Screen Rotate karein (Landscape Computer Mode)"}
            >
              <RotateCw className={`w-3.5 h-3.5 transition-transform duration-300 ${isNativeLandscape ? "rotate-90 text-slate-950 stroke-[2.5]" : "text-white"}`} />
              <span className="hidden xs:inline">{isNativeLandscape ? "📱 Portrait" : "🔄 Screen Rotate"}</span>
              <span className="xs:hidden">{isNativeLandscape ? "📱" : "🔄 Rotate"}</span>
            </button>

            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>सत्र: {activeSession?.name || "2026-27"}</span>
            </span>

            {canExitSchool && (
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer active:scale-95"
                title="Leave School / स्कूल छोड़ें"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden sm:inline">Leave School</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setView("school_profile")}
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
              title="School Settings"
            >
              <Settings className="w-3.5 h-3.5 text-blue-500" />
              <span>Settings</span>
            </button>

          </div>
        </header>

        {/* ── DUMMY SESSION ACTIVE NOTICE BAR ── */}
        {schoolDemoActive && (
          <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border-b border-amber-500/40 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200 font-bold shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base animate-pulse">🧪</span>
              <span>
                <strong>डमी सत्र सक्रिय है (Dummy Session ON):</strong> सभी 13 क्लास, 10 छात्र प्रति क्लास, 1-साल की फीस, हाजिरी, 6 परीक्षा अंक व स्टाफ सैलरी डमी मॉडल में दिखाया जा रहा है।
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleToggleDemoData(false)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shrink-0 transition active:scale-95 cursor-pointer shadow-xs"
            >
              असली स्कूल पर लौटें (Turn OFF) →
            </button>
          </div>
        )}
      </>
    );
  };

  // ── 1. HOME DASHBOARD (7-DAY ATTENDANCE, FEES, ABSENTY & DUE LIST) ──────
  const renderHomeDashboard = () => {
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Push Alert Sent Toast */}
        {sentPushAlertsToast && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs sm:text-sm font-bold shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>{sentPushAlertsToast}</span>
            </div>
            <button type="button" onClick={() => setSentPushAlertsToast(null)} className="p-1 hover:bg-white/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setView("students")}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-blue-400 transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Total Students</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
              {displayedStudents.length}
            </p>
            <p className="text-[10px] text-blue-500 font-medium mt-0.5">Click to view directory →</p>
          </button>

          <button
            type="button"
            onClick={() => setView("teachers")}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-400 transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Teachers</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
              {displayedTeachers.length}
            </p>
            <p className="text-[10px] text-emerald-500 font-medium mt-0.5">Active faculty staff →</p>
          </button>

          <button
            type="button"
            onClick={() => setView("classes")}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-purple-400 transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">Classes</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1 tabular-nums">
              {displayedClasses.length}
            </p>
            <p className="text-[10px] text-purple-500 font-medium mt-0.5">Total class sections →</p>
          </button>

          <button
            type="button"
            onClick={() => setView("classes")}
            className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-teal-400 transition text-left cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-slate-400">7-Day Attendance</span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 group-hover:scale-110 transition">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1 tabular-nums">
              {avgAttendancePct}%
            </p>
            <p className="text-[10px] text-teal-500 font-medium mt-0.5">Average weekly rate →</p>
          </button>
        </div>

        {/* ── BIRTHDAY WISH SENT TOAST ── */}
        {birthdayWishToast && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-600 to-purple-600 text-white text-xs sm:text-sm font-bold shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>{birthdayWishToast}</span>
            </div>
            <button type="button" onClick={() => setBirthdayWishToast(null)} className="p-1 hover:bg-white/20 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── TODAY'S BIRTHDAYS SPECIAL NSTA CELEBRATION SECTION (WHEN STUDENTS HAVE BIRTHDAY TODAY) ── */}
        {todaysBirthdayStudents.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 text-white shadow-xl relative overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 translate-x-4 -translate-y-4 opacity-15 pointer-events-none text-9xl">
              🎂
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🎂
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white text-rose-700 shadow-xs">
                      स्वतः NSTA मॉनिटरिंग सक्रिय
                    </span>
                    <span className="text-xs text-rose-100 font-bold">
                      {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white mt-0.5">
                    🎉 आज के जन्मदिन ({todaysBirthdayStudents.length} Students Having Birthday Today)
                  </h3>
                  <p className="text-xs text-rose-100/90 font-medium">
                    School Principal व प्रशासन की तरफ से छात्र के NSTA Messenger School Desk पर आधिकारिक शुभकामना कार्ड व नोटिफिकेशन स्वतः भेज दिया गया है।
                  </p>
                </div>
              </div>
            </div>

            {/* Students List */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 relative z-10">
              {todaysBirthdayStudents.map(st => {
                const cName = displayedClasses.find(c => c.id === st.classId)?.name || "Class Student";
                return (
                  <div key={st.id} className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/20 flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-white/30 flex items-center justify-center font-black text-xs text-white shrink-0 shadow-xs overflow-hidden">
                        {st.photoUrl ? (
                          <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
                        ) : (
                          st.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-xs text-white truncate">{st.name}</p>
                        <p className="text-[10px] text-rose-100 truncate">{cName} • Roll {st.rollNo || "N/A"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendManualBirthdayWish(st)}
                      disabled={birthdayWishSending === st.id}
                      className="px-2.5 py-1 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-[11px] font-black shrink-0 transition active:scale-95 shadow-xs cursor-pointer flex items-center gap-1"
                      title="Send / Resend Official Birthday Blessing Card"
                    >
                      {birthdayWishSending === st.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gift className="w-3 h-3" />}
                      <span>{birthdayWishSending === st.id ? "भेज रहे हैं..." : "Wish Again"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── SCHOOL BIRTHDAY & EVENTS INTERACTIVE CALENDAR ── */}
        <SchoolBirthdayCalendar
          schoolId={schoolId}
          schoolName={school?.name}
          students={displayedStudents}
          classes={displayedClasses}
          onOpenMessenger={() => setView("nsta_broadcast")}
        />

        {/* ── ROW 1: 7-DAY ATTENDANCE CHART & 7-DAY FEE COLLECTION CHART ────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Card A: 7-Day Attendance Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300">
                      <BarChart3 className="w-4 h-4" />
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                      ७ दिनों का छात्र उपस्थिति चार्ट (7-Day Attendance)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    दैनिक उपस्थिति दर (%) व कुल उपस्थित छात्र संख्या
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 shrink-0">
                  Avg: {avgAttendancePct}%
                </span>
              </div>

              {/* Attendance Visual Bars */}
              <div className="mt-6 pt-2 grid grid-cols-7 gap-2 items-end h-44 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                {sevenDayAttendanceData.map((d, idx) => {
                  const barHeightPct = Math.max(15, Math.min(100, d.presentPct));
                  const isHigh = d.presentPct >= 90;
                  return (
                    <div key={`att-${d.dateStr}-${idx}`} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Hover Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-lg">
                        {d.displayDate}: {d.presentCount} Present, {d.absentCount} Absent ({d.presentPct}%)
                      </div>

                      {/* Percentage Tag */}
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 mb-1 tabular-nums">
                        {d.presentPct}%
                      </span>

                      {/* Bar */}
                      <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-700/50 rounded-t-xl overflow-hidden h-32 flex items-end">
                        <div
                          style={{ height: `${barHeightPct}%` }}
                          className={`w-full rounded-t-xl transition-all duration-500 ${
                            isHigh
                              ? "bg-gradient-to-t from-teal-600 to-emerald-400 shadow-sm"
                              : "bg-gradient-to-t from-blue-600 to-indigo-400 shadow-sm"
                          }`}
                        />
                      </div>

                      {/* Labels */}
                      <div className="text-center mt-2">
                        <p className={`text-[11px] font-black leading-tight ${d.isToday ? "text-blue-600 dark:text-blue-400 font-extrabold" : "text-slate-600 dark:text-slate-300"}`}>
                          {d.isToday ? "आज" : d.dayLabel}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{d.displayDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px]">
                आज उपस्थित: <strong className="text-emerald-600 dark:text-emerald-400">{sevenDayAttendanceData[6]?.presentCount}</strong> | अनुपस्थित: <strong className="text-rose-600 dark:text-rose-400">{sevenDayAttendanceData[6]?.absentCount}</strong>
              </span>
              <button
                type="button"
                onClick={() => setView("classes")}
                className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>हाजिरी लगाएं / देखें</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card B: 7-Day Fee Collection Chart */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300">
                      <IndianRupee className="w-4 h-4" />
                    </span>
                    <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                      ७ दिनों का फीस कलेक्शन (Fee Collection Chart)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    दैनिक प्राप्त शुल्क (₹) एवं मासिक लक्ष्य संकलन
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 shrink-0">
                  Target: {monthlyProgressPct}%
                </span>
              </div>

              {/* Fee Collection Bars */}
              <div className="mt-6 pt-2 grid grid-cols-7 gap-2 items-end h-44 border-b border-slate-100 dark:border-slate-700/60 pb-2">
                {sevenDayFeeData.map((f, idx) => {
                  const maxAmt = Math.max(...sevenDayFeeData.map(x => x.amount), 35000);
                  const barHeightPct = Math.max(15, Math.min(100, Math.round((f.amount / maxAmt) * 100)));
                  return (
                    <div key={`fee-${f.dateStr}-${idx}`} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 pointer-events-none transition-all z-20 bg-slate-900 text-white text-[10px] rounded-lg py-1 px-2 whitespace-nowrap shadow-lg">
                        {f.displayDate}: ₹{f.amount.toLocaleString("en-IN")}
                      </div>

                      <span className="text-[9px] font-bold text-slate-700 dark:text-slate-300 mb-1 tabular-nums">
                        ₹{(f.amount / 1000).toFixed(1)}k
                      </span>

                      <div className="w-full max-w-[28px] bg-slate-100 dark:bg-slate-700/50 rounded-t-xl overflow-hidden h-32 flex items-end">
                        <div
                          style={{ height: `${barHeightPct}%` }}
                          className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 via-blue-500 to-teal-400 shadow-sm transition-all duration-500"
                        />
                      </div>

                      <div className="text-center mt-2">
                        <p className={`text-[11px] font-black leading-tight ${f.isToday ? "text-emerald-600 dark:text-emerald-400 font-extrabold" : "text-slate-600 dark:text-slate-300"}`}>
                          {f.isToday ? "आज" : f.dayLabel}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">{f.displayDate}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-500 text-[11px]">
                माह कुल: <strong className="text-emerald-600 dark:text-emerald-400 font-black">₹{currentMonthCollection.toLocaleString("en-IN")}</strong> / ₹{monthlyTarget.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => setView("fees")}
                className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-sm"
              >
                <span>फीस काउंटर खोलें</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── ROW 2: ABSENTY ACTION CENTER (1-DAY PUSH & 2-DAY CALL TRACKER) ── */}
        <div className="bg-gradient-to-br from-rose-950 via-slate-900 to-amber-950 rounded-3xl p-5 sm:p-6 text-white border-2 border-rose-500/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/50 ring-2 ring-rose-400/50">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-base sm:text-lg text-white">
                    Absenty Action Center (अनुपस्थित छात्र एक्शन सेंटर)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                    1-DAY PUSH & 2-DAY CALL
                  </span>
                </div>
                <p className="text-xs text-rose-200 mt-0.5">
                  1-Day Absentees को ऑटो पुश नोटिस भेजें और 2-दिन+ लगातार गैरहाजिर छात्रों को 1-क्लिक कॉल करें
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend1DayPushAlerts}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>⚡ Send 1-Day Push Alerts</span>
              </button>

              <button
                type="button"
                onClick={() => setView("absentee")}
                className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition cursor-pointer"
              >
                <span>Full Center →</span>
              </button>
            </div>
          </div>

          {/* 2-Day+ Consecutive Absentees Urgent Table */}
          <div className="bg-black/40 rounded-2xl p-3 sm:p-4 border border-rose-500/30 space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <p className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                <span>🚨 High Dropout Risk: 2-Day+ Consecutive Absentees ({absenteeTrackerData.consecutiveAbsentees.length})</span>
              </p>
              <span className="text-[10px] text-slate-400 font-medium">1-Tap Direct Action</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {absenteeTrackerData.consecutiveAbsentees.map((st) => (
                <div
                  key={`abs-${st.id}`}
                  className="bg-slate-900/90 rounded-xl p-3 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white truncate">{st.name}</p>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 shrink-0">
                        {st.daysAbsent} Din Absent
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {st.className} · Roll #{st.rollNo} · {st.fatherName}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`tel:${st.phone}`}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 shadow cursor-pointer"
                      title="Parent ko Call Karein"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppAbsentAlert(st)}
                      className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition active:scale-95 shadow cursor-pointer"
                      title="WhatsApp Absence Alert Bhejein"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── ROW 3: FEE DUE LIST & 1-CLICK WHATSAPP DEMAND NOTICE ──────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300">
                  <FileText className="w-4 h-4" />
                </span>
                <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white">
                  Fee Due List (बकाया फीस सूची व 1-क्लिक डिमांड स्लिप)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                छात्रों का लंबित शुल्क देखें और अभिभावक के मोबाइल पर 1-क्लिक में आधिकारिक व्हाट्सएप मांग स्लिप भेजें
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-black">
                कुल बकाया: ₹{totalDuesAmount.toLocaleString("en-IN")}
              </span>
              <button
                type="button"
                onClick={() => setView("fees")}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
              >
                <span>Manage All Fees →</span>
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-1 pb-1 text-xs">
            <span className="text-slate-400 font-bold text-[11px] flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filter:
            </span>
            <select
              value={dueClassFilter}
              onChange={(e) => setDueClassFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Classes ({displayedStudents.length} Students)</option>
              {displayedClasses.map(c => (
                <option key={`opt-${c.id}`} value={c.id}>{c.name}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setDueMinAmount(dueMinAmount === 0 ? 2000 : 0)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                dueMinAmount > 0
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              {dueMinAmount > 0 ? "Showing > ₹2,000 Dues" : "High Dues (> ₹2,000)"}
            </button>
          </div>

          {/* Scrollable Due Students Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 font-black text-[11px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3">Roll &amp; Student Name</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Pending Months</th>
                  <th className="px-3 py-3">Due Balance (₹)</th>
                  <th className="px-4 py-3 text-right">WhatsApp Demand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {feeDueList.slice(0, 8).map((st) => (
                  <tr key={`due-row-${st.id}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-[10px]">
                          #{st.rollNo}
                        </span>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{st.name}</p>
                          <p className="text-[10px] text-slate-400">{st.fatherName} · {st.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-700 dark:text-slate-300">
                      {st.className}
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-[11px]">
                      {st.dueMonths}
                    </td>
                    <td className="px-3 py-3 font-black text-rose-600 dark:text-rose-400 tabular-nums text-sm">
                      ₹{st.dueAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsAppFeeDemand(st)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm cursor-pointer"
                          title="WhatsApp Demand Slip Bhejein"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp Slip</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ── 2. DEDICATED SCHOOL PROFILE & MASTER SETTINGS VIEW ─────────────────
  const renderSchoolProfileModule = () => {
    const displaySchoolLogo = school ? getSavedSchoolLogo(school.logoUrl, schoolId) : "";
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md p-1.5 border border-white/20 flex items-center justify-center overflow-hidden shadow-inner">
                {displaySchoolLogo ? (
                  <img src={displaySchoolLogo} alt={school?.name} className="w-full h-full object-contain rounded-xl bg-white" />
                ) : (
                  <Building2 className="w-10 h-10 text-amber-400" />
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFullSchoolProfileEditor(true)}
                className="absolute -bottom-2 -right-2 p-1.5 rounded-full bg-blue-600 text-white shadow hover:bg-blue-500 cursor-pointer"
                title="Change Logo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white">{school?.name || "School Name"}</h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px]">
                  VERIFIED INSTITUTION
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-1">{school?.tagline || "तमसो मा ज्योतिर्गमय · ज्ञान ही प्रकाश है"}</p>
              <p className="text-xs text-slate-300 font-mono mt-0.5">
                School Code: <strong>{school?.code || school?.id}</strong> · Affiliation: <strong>{school?.affiliationNo || "CBSE/STATE-2026"}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFullSchoolProfileEditor(true)}
              className="px-4 py-2 rounded-xl bg-white text-slate-900 font-black text-xs hover:bg-slate-100 transition shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Full Print Header Editor</span>
            </button>
          </div>
        </div>

        {/* Master Institutional Form */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-slate-800 dark:text-white">
                School Master Profile Details (स्कूल की आधारभूत जानकारी)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                यह जानकारी सभी मार्कशीट, रसीद, आईडी कार्ड और आधिकारिक दस्तावेज़ों पर प्रिंट होगी।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Principal Name</label>
              <input
                type="text"
                value={schoolInfoForm.principalName}
                onChange={e => setSchoolInfoForm(p => ({ ...p, principalName: e.target.value }))}
                placeholder="Dr. / Mr. Principal Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Principal Phone Number</label>
              <input
                type="tel"
                value={schoolInfoForm.principalPhone}
                onChange={e => setSchoolInfoForm(p => ({ ...p, principalPhone: e.target.value }))}
                placeholder="Principal Contact Number"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Director / Manager Name</label>
              <input
                type="text"
                value={schoolInfoForm.directorName}
                onChange={e => setSchoolInfoForm(p => ({ ...p, directorName: e.target.value }))}
                placeholder="Director / Secretary Name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Official School Helpline Mobile</label>
              <input
                type="tel"
                value={schoolInfoForm.mobile}
                onChange={e => setSchoolInfoForm(p => ({ ...p, mobile: e.target.value }))}
                placeholder="Campus Helpdesk Phone"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">School Campus Address</label>
              <input
                type="text"
                value={schoolInfoForm.address}
                onChange={e => setSchoolInfoForm(p => ({ ...p, address: e.target.value }))}
                placeholder="Complete Campus Address with District & PIN Code"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">School Motto / Tagline</label>
              <input
                type="text"
                value={schoolInfoForm.tagline}
                onChange={e => setSchoolInfoForm(p => ({ ...p, tagline: e.target.value }))}
                placeholder="Motto or Tagline"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-800 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={saveSchoolInfo}
              disabled={savingSchoolInfo}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSchoolInfo ? "Saving..." : "Save Profile Updates"}</span>
            </button>
          </div>
        </div>

        {/* Digital Signatures & Security Lock Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Box 1: Digital Signatures */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-purple-600" />
              <h4 className="font-bold text-sm text-slate-800 dark:text-white">Digital Signatures (हस्ताक्षर)</h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              प्रिंसिपल व डायरेक्टर के डिजिटल हस्ताक्षर मार्कशीट व एडमिट कार्ड पर ऑटो-प्रिंट होते हैं।
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDigitalSignatureModal(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>डिजिटल हस्ताक्षर ड्रा / अपलोड करें</span>
              </button>
            </div>
          </div>

          {/* Box 2: School Security Lock Code */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Security Lock Code</h4>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${lockCodeActive ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {lockCodeActive ? '🔒 Active' : 'Off'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              स्टूडेंट्स को स्कूल पोर्टल से जुड़ने के लिए यह 4-अंकीय सीक्रेट कोड देना अनिवार्य होगा।
            </p>
            <div className="flex items-center gap-2">
              <input
                type={showLockCode ? "text" : "password"}
                placeholder="Enter Secret Code"
                value={lockCodeInput}
                onChange={e => setLockCodeInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-white text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowLockCode(!showLockCode)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                {showLockCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                type="button"
                onClick={saveLockCode}
                disabled={savingLockCode}
                className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                {savingLockCode ? "..." : lockCodeSaved ? "Saved!" : "Save"}
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Admin Authorization Management */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-600" />
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">Sub-Admin Access (सह-प्रशासक अनुमति)</h4>
                <p className="text-xs text-slate-400">एक स्कूल खाते से कई Gmail जोड़ें (बिना लॉगआउट हुए एक साथ काम कर सकेंगे)।</p>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold self-start sm:self-auto">
              प्लान कोटा: {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').length} / {getMaxAdminsForSchool(displayedStudents.length) === 9999 ? 'Unlimited' : getMaxAdminsForSchool(displayedStudents.length)} एडमिन ({displayedStudents.length} छात्र)
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              placeholder="subadmin@gmail.com"
              value={subAdminEmail}
              onChange={e => { setSubAdminEmail(e.target.value); setSubAdminResult(null); }}
              className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs"
            />
            <button
              type="button"
              onClick={handleAssignSubAdmin}
              disabled={assigningSubAdmin || !subAdminEmail.trim()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
            >
              {assigningSubAdmin ? "..." : "+ Sub-Admin Banao"}
            </button>
          </div>

          {subAdminResult && (
            <p className={`text-xs p-2 rounded-lg ${subAdminResult.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {subAdminResult.msg}
            </p>
          )}

          {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').length > 0 && (
            <div className="space-y-2 pt-2">
              {subAdmins.filter(p => p.role === 'SCHOOL_SUB_ADMIN').map((p, idx) => (
                <div key={`sub-${p.uid || idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/40 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{p.name || "Sub Admin"}</p>
                    <p className="text-[10px] text-slate-400">{p.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubAdmin(p.uid)}
                    className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 3. DEDICATED MEMORIES & EVENTS GALLERY VIEW ─────────────────────────
  const renderMemoriesModule = () => {
    const memoryCategories = [
      { id: "ALL", label: "Sabhi Yaadein (All)" },
      { id: "ANNUAL", label: "Annual Day (वार्षिकोत्सव)" },
      { id: "SPORTS", label: "Sports Meet (खेलकूद)" },
      { id: "EXPO", label: "Science Expo (विज्ञान प्रदर्शनी)" },
      { id: "CAMPUS", label: "Campus Life (क्लासरूम)" },
      { id: "TOUR", label: "Picnic & Tour (शैक्षणिक भ्रमण)" },
    ];

    const filtered = memoriesList.filter(m => {
      if (memoriesFilter === "ALL") return true;
      return m.category === memoriesFilter;
    });

    return (
      <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white border border-purple-500/30 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-purple-600/40 ring-2 ring-purple-400/50">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">School Memories &amp; Events (स्कूल की यादें)</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white">
                  STUDENT APP SYNCED
                </span>
              </div>
              <p className="text-xs text-purple-200 mt-1">
                यहाँ अपलोड की गई फोटो व वीडियो सीधे स्टूडेंट पोर्टल के "Memories" सेक्शन में कैटेगरी-अनुसार दिखती हैं।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddMemoryModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs hover:from-amber-300 hover:to-orange-400 transition shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Memory (नई याद जोड़ें)</span>
          </button>
        </div>

        {/* Category Tabs (matching Student Side sub-pages) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {memoryCategories.map(cat => {
            const isActive = memoriesFilter === cat.id;
            const count = cat.id === "ALL" ? memoriesList.length : memoriesList.filter(m => m.category === cat.id).length;
            return (
              <button
                key={`mem-tab-${cat.id}`}
                type="button"
                onClick={() => setMemoriesFilter(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{cat.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Memories Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(mem => (
            <div
              key={mem.id}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Media preview */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setActiveMemoryPreview(mem)}>
                  <img
                    src={mem.url || "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=800&q=80"}
                    alt={mem.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-black/60 text-white backdrop-blur-xs border border-white/20">
                      {mem.category}
                    </span>
                    {mem.type === "VIDEO" && (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1">
                        <Youtube className="w-3 h-3" /> Video
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs">
                    {mem.date}
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-1.5">
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-snug">
                    {mem.title}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {mem.description}
                  </p>
                  {mem.tags && mem.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {mem.tags.map((t: string, tidx: number) => (
                        <span key={`t-${tidx}`} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action row */}
              <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  ❤️ {mem.likes || 42} Student Likes
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteMemory(mem.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  title="Delete memory"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
            <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-30" />
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Is category me abhi koi memory nahi hai</h4>
            <p className="text-xs text-slate-400 mt-1">Upar diye gaye "+ Add New Memory" button se nayi yaadein jodein!</p>
          </div>
        )}
      </div>
    );
  };

  // ── GLOBAL MODALS FOR ALL VIEWS ─────────────────────────────────────────
  const renderGlobalModals = () => {
    return (
      <>
        {/* Memory Fullscreen Preview Modal */}
        {activeMemoryPreview && (
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl space-y-3">
              <div className="relative aspect-video bg-black flex items-center justify-center">
                {activeMemoryPreview.videoUrl ? (
                  <iframe
                    src={activeMemoryPreview.videoUrl.replace("watch?v=", "embed/")}
                    title={activeMemoryPreview.title}
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                ) : (
                  <img src={activeMemoryPreview.url} alt={activeMemoryPreview.title} className="w-full h-full object-contain" />
                )}
                <button
                  type="button"
                  onClick={() => setActiveMemoryPreview(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 pt-1 space-y-2 text-white">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white uppercase">
                  {activeMemoryPreview.category} · {activeMemoryPreview.date}
                </span>
                <h3 className="text-base font-black text-white">{activeMemoryPreview.title}</h3>
                <p className="text-xs text-slate-300">{activeMemoryPreview.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Add Memory Modal */}
        {showAddMemoryModal && (
          <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-purple-600" />
                  <h3 className="font-black text-base text-slate-800 dark:text-white">Add New Memory (नई याद जोड़ें)</h3>
                </div>
                <button type="button" onClick={() => setShowAddMemoryModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveMemory} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Event Title (समारोह का नाम)</label>
                  <input
                    type="text"
                    required
                    value={newMemoryForm.title}
                    onChange={e => setNewMemoryForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. 77th Republic Day Parade 2026"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Category (सब-पेज चुनें)</label>
                    <select
                      value={newMemoryForm.category}
                      onChange={e => setNewMemoryForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="ANNUAL">Annual Day (वार्षिकोत्सव)</option>
                      <option value="SPORTS">Sports Meet (खेलकूद)</option>
                      <option value="EXPO">Science Expo (विज्ञान प्रदर्शनी)</option>
                      <option value="CAMPUS">Campus Life (क्लासरूम)</option>
                      <option value="TOUR">Picnic &amp; Tour (शैक्षणिक भ्रमण)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Event Date (दिनांक)</label>
                    <input
                      type="date"
                      value={newMemoryForm.date}
                      onChange={e => setNewMemoryForm(p => ({ ...p, date: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Media Type</label>
                    <select
                      value={newMemoryForm.type}
                      onChange={e => setNewMemoryForm(p => ({ ...p, type: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="IMAGE">Photo (छवि)</option>
                      <option value="VIDEO">YouTube Video (वीडियो)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {newMemoryForm.type === "IMAGE" ? "Photo URL / File" : "YouTube Video URL"}
                    </label>
                    <input
                      type="text"
                      value={newMemoryForm.type === "IMAGE" ? newMemoryForm.url : newMemoryForm.videoUrl}
                      onChange={e => {
                        const val = e.target.value;
                        if (newMemoryForm.type === "IMAGE") {
                          setNewMemoryForm(p => ({ ...p, url: val }));
                        } else {
                          setNewMemoryForm(p => ({ ...p, videoUrl: val, url: val }));
                        }
                      }}
                      placeholder={newMemoryForm.type === "IMAGE" ? "https://images.unsplash.com/..." : "https://youtube.com/watch?v=..."}
                      className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Description (विवरण)</label>
                  <textarea
                    rows={2}
                    value={newMemoryForm.description}
                    onChange={e => setNewMemoryForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Short description of the event celebration..."
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-300 block mb-1">Tags (कॉमा द्वारा अलग करें)</label>
                  <input
                    type="text"
                    value={newMemoryForm.tags}
                    onChange={e => setNewMemoryForm(p => ({ ...p, tags: e.target.value }))}
                    placeholder="Sports, Medals, Athletics"
                    className="w-full px-3 py-2 border rounded-xl bg-transparent dark:border-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMemoryModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black shadow-md"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            </div>
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
                          ? 'Aapka school plan khatam ho gaya hai. Super Admin se turant renew karao.'
                          : 'Aapka subscription jald hi khatam hone wala hai. Super Admin se abhi renew karao.'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 px-5 py-4 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => { setShowExpiryPopup(false); setView("subscription"); }}
                    className={`w-full py-3.5 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg ${expiryPopupExpired ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'}`}
                  >
                    <Crown className="w-4 h-4" />
                    {expiryPopupExpired ? 'Plan Renew Karo' : 'Plan Dekho / Renew Karo'}
                  </button>
                  <button
                    type="button"
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

        {/* Digital Signature & School Header Modals */}
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
        {/* Leave School Confirmation Modal */}
        {showLeaveConfirmModal && (
          <div className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-800 dark:text-white">
                    Leave School (स्कूल छोड़ें)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {school?.name || "This school"}
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3.5 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                क्या आप वाकई इस स्कूल से अलग होना चाहते हैं? आपका अकाउंट इस स्कूल से detach हो जाएगा और आप Hub Overview / अन्य स्कूल में स्विच कर सकेंगे।
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={leavingSchoolLoading}
                  onClick={() => setShowLeaveConfirmModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  disabled={leavingSchoolLoading}
                  onClick={async () => {
                    setLeavingSchoolLoading(true);
                    try {
                      if (onLeaveSchool) onLeaveSchool();
                    } finally {
                      setLeavingSchoolLoading(false);
                      setShowLeaveConfirmModal(false);
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition cursor-pointer shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  {leavingSchoolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                  <span>हाँ, स्कूल छोड़ें</span>
                </button>
              </div>
            </div>
          </div>
        )}
        {renderAdminBottomNav()}
      </>
    );
  };

  // ── MASTER ERP SHELL (LEFT SIDEBAR ON COMPUTER/LANDSCAPE, DRAWER ON MOBILE PORTRAIT) ────
  const renderErpShell = (content: React.ReactNode) => {
    return (
      <div className="h-screen h-[100dvh] max-h-screen overflow-hidden flex bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full relative">
        {/* Left Sidebar (fixed in place on desktop or landscape, never scrolls with page) */}
        {renderDesktopSidebar()}

        {/* Mobile Slide-Out Drawer (only when in portrait and drawer toggled) */}
        {!isNativeLandscape && isSidebarOpen && renderMobileSidebarDrawer()}

        {/* 1% Ultra-slim left edge indicator on mobile portrait when drawer is hidden */}
        {!isNativeLandscape && !isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 w-2.5 h-20 rounded-r-full bg-gradient-to-b from-indigo-500 via-amber-400 to-indigo-500 opacity-60 hover:opacity-100 hover:w-3.5 transition-all z-30 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.5)] flex items-center justify-center group"
            title="Swipe Right करके मेनू खोलें (1% Visible)"
          >
            <ChevronRight className="w-2.5 h-2.5 text-slate-950 font-bold group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}

        {/* Main Content Area (Independent scroll container - page cards scroll smoothly while menu stays fixed) */}
        <div className="flex-1 flex flex-col min-w-0 h-screen h-[100dvh] max-h-screen overflow-y-auto overflow-x-hidden">
          {renderTopHeader()}
          <main className="flex-1 p-2 sm:p-4 lg:p-5 w-full max-w-7xl mx-auto pb-16 md:pb-12">
            {content}
          </main>
        </div>

        {/* Floating guidance banner when rotate is requested but phone needs to be turned */}
        {showRotatePrompt && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-amber-400/40 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300 max-w-sm text-center">
            <RotateCw className="w-5 h-5 text-amber-400 animate-spin shrink-0" />
            <p className="text-xs font-bold text-amber-200">
              कृपया फोन को Landscape (आड़ा) घुमाएं — स्टेटस बार समेत पूरा ऐप कंप्यूटर मोड में रोटेट हो जाएगा!
            </p>
          </div>
        )}

        {/* Global Modals */}
        {renderGlobalModals()}
      </div>
    );
  };

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

  if (view === "school_profile") {
    return renderErpShell(renderSchoolProfileModule());
  }

  if (view === "memories") {
    return renderErpShell(renderMemoriesModule());
  }

  // ── Store view (always accessible so admin can purchase/upgrade) ──────────
  if (view === "store" && school) {
    return renderErpShell(<SchoolStore school={school} onBack={() => setView("dashboard")} />);
  }

  // ── School Plan view (always accessible so admin can check details) ───────
  if (view === "subscription") {
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
      <AttendanceManager
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        teacherId={adminUid}
        onBack={() => setView("classes")}
      />
    );
  }

  function renderAdminBottomNav() {
    return null;
  }

  if (view === "fee_class" && feeClassSelected) {
    return renderErpShell(
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
    return renderErpShell(
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

  if (view === "bus_transport") {
    return renderErpShell(
      <div className="p-3 sm:p-4 max-w-4xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setView("fees")}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>← Back to Fee Collection &amp; Ledger</span>
          </button>
        </div>
        <BusTransportModal
          isOpen={true}
          onClose={() => setView("fees")}
          schoolId={schoolId}
          classes={displayedClasses}
          students={displayedStudents}
          onUpdated={() => {}}
          isEmbedded={true}
        />
      </div>
    );
  }

  if (view === "qr_pay") {
    return renderErpShell(
      <FeeManager
        schoolId={schoolId}
        className="All Classes"
        schoolName={school?.name}
        school={school || undefined}
        sessionId={activeSession?.id || ""}
        adminId={adminUid}
        initialTool="qr_scanner"
        onBack={() => setView("fees")}
      />
    );
  }

  if (view === "fee_alerts") {
    return renderErpShell(
      <FeeManager
        schoolId={schoolId}
        className="All Classes"
        schoolName={school?.name}
        school={school || undefined}
        sessionId={activeSession?.id || ""}
        adminId={adminUid}
        initialTool="fee_alert"
        onBack={() => setView("fees")}
      />
    );
  }

  if (view === "receipt_header") {
    return renderErpShell(
      <FeeManager
        schoolId={schoolId}
        className="All Classes"
        schoolName={school?.name}
        school={school || undefined}
        sessionId={activeSession?.id || ""}
        adminId={adminUid}
        initialTool="header"
        onBack={() => setView("fees")}
      />
    );
  }

  if (view === "results" && selectedClass) {
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
      <CertificateManager
        school={school!}
        classes={classes}
        students={students}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "marksheet_hub") {
    return renderErpShell(
      <div className="pb-12 w-full max-w-full overflow-x-hidden">
        <MarksheetGenerator
          school={school!}
          classes={classes}
          students={students}
          activeSession={activeSession}
          onBack={() => setView("dashboard")}
        />
      </div>
    );
  }

  if (view === "promotion") {
    return renderErpShell(
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
    return renderErpShell(
      <NoticeBoardManager
        schoolId={schoolId}
        adminUid={adminUid}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "holidays") {
    setView("notices");
    return null;
  }

  if (view === "staff_hrm") {
    return renderErpShell(
      <StaffHRMManager
        school={school!}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "reports_hub") {
    return renderErpShell(
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
    return renderErpShell(
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
    return renderErpShell(
      <OnlineAdmissionManager
        school={school!}
        classes={classes}
        sessions={sessions}
        activeSession={activeSession}
        isAdmin={true}
        viewMode="admissions_only"
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "online_admission_fee") {
    return renderErpShell(
      <OnlineAdmissionManager
        school={school!}
        classes={classes}
        sessions={sessions}
        activeSession={activeSession}
        isAdmin={true}
        viewMode="fee_setup_only"
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "fee_structure") {
    return renderErpShell(
      <ClassFeeStructureSection
        schoolId={schoolId}
        sessionId={activeSession?.id}
        classes={classes}
        teachers={displayedTeachers}
        onBack={() => setView("dashboard")}
        onClassesUpdated={() => {}}
        onTeachersUpdated={() => {}}
      />
    );
  }

  if (view === "community") {
    return renderErpShell(
      <div className="max-w-3xl mx-auto">
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
    );
  }

  if (view === "timetable") {
    return renderErpShell(
      <TimetableManager
        school={school!}
        classes={displayedClasses}
        subjects={subjects}
        teachers={displayedTeachers}
        activeSession={activeSession}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "video_lectures" || view === "classroom_videos") {
    return renderErpShell(
      <ClassroomVideoArchive
        school={school!}
        classes={displayedClasses}
        teachers={displayedTeachers}
        subjects={subjects}
        activeSession={activeSession}
        currentUserRole="ADMIN"
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "class_notes_manager") {
    return renderErpShell(
      <ClassCurriculumNotesManager
        schoolId={school!.id}
        schoolName={school?.name}
        isSuperAdmin={false}
        isElite={isSchoolEliteCurriculum(school)}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "school_study_room") {
    return renderErpShell(
      <GroupStudyModal
        isOpen={true}
        onClose={() => setView("dashboard")}
        user={{
          id: adminUid,
          uid: adminUid,
          name: school?.principalName || "School Principal",
          role: "SCHOOL_ADMIN",
          isSchoolHost: true,
          schoolId: school!.id,
          schoolName: school?.name || "School",
          subscriptionLevel: "ULTRA"
        }}
        tierTheme={{ primary: '#4f46e5' }}
        isSchoolHost={true}
        schoolId={school!.id}
        schoolName={school?.name}
      />
    );
  }

  if (view === "homework") {
    return renderErpShell(
      <HomeworkManager
        school={school!}
        classes={displayedClasses}
        subjects={subjects}
        teachers={displayedTeachers}
        currentRole="ADMIN"
        currentTeacherName={school?.principalName || "Principal"}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "library") {
    return renderErpShell(
      <LibraryManager
        school={school!}
        students={displayedStudents}
        teachers={displayedTeachers}
        classes={displayedClasses}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "parent_queries") {
    return renderErpShell(
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
    );
  }

  if (view === "inventory_store") {
    return renderErpShell(
      <InventoryStoreManager
        school={school!}
        students={displayedStudents}
        classes={displayedClasses}
        isAdmin={true}
        onBack={() => setView("dashboard")}
      />
    );
  }

  if (view === "nsta_broadcast") {
    return renderErpShell(
      <div className="w-full h-[calc(100vh-120px)] bg-slate-950 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
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
    { label: "Class 1-12 Notes Manager", subtitle: "School Custom Curriculum, Notes & MCQ", icon: <Sparkles className="w-5 h-5 text-emerald-500" />, view: "class_notes_manager", count: isSchoolEliteCurriculum(school) ? "Elite 👑" : "Elite Req", locked: false, featured: true },
    { label: "Class Video Archive", subtitle: "Daily YouTube Lectures & Routine", icon: <Youtube className="w-5 h-5 text-red-500" />, view: "video_lectures", count: isSchoolEliteCurriculum(school) ? "Elite 👑" : "Elite Req", locked: false, featured: true },
    { label: "School Study Room", subtitle: "Live MCQ Arena with School Curriculum", icon: <Users className="w-5 h-5 text-purple-600" />, view: "school_study_room", count: isSchoolEliteCurriculum(school) ? "Elite 👑" : "Elite Req", locked: false, featured: true },
    { label: "Daily Homework", subtitle: "Diary & Notebook Submission", icon: <BookOpen className="w-5 h-5 text-purple-600" />, view: "homework", count: "Diary", locked: false },
    { label: "Library Management", subtitle: "Books Catalog & Issue/Return", icon: <Book className="w-5 h-5 text-emerald-600" />, view: "library", count: "Books", locked: false },
    { label: "Parent-Teacher Query", subtitle: "Helpdesk & Leave Requests", icon: <MessageSquare className="w-5 h-5 text-blue-600" />, view: "parent_queries", count: "Helpdesk", locked: false },
    { label: "School Store & Stock", subtitle: "Uniforms, Books & POS Bill", icon: <Package className="w-5 h-5 text-orange-500" />, view: "inventory_store", count: "Stock", locked: false },
    { label: "Students", subtitle: "Admissions & Profiles", icon: <Users className="w-5 h-5 text-orange-500" />, view: "students", count: displayedStudents.length, locked: false },
    { label: "Fee Collection", subtitle: "Monthly Ledger & Receipts", icon: <IndianRupee className="w-5 h-5 text-emerald-500" />, view: "fees", count: "Live Sync", locked: false },
    { label: "QR ID Cards", subtitle: "Print & Scan Student ID", icon: <CreditCard className="w-5 h-5 text-indigo-500" />, view: "id_cards", count: "Live QR", locked: false },
    { label: "Classes", subtitle: "Sections, Attendance & Marks", icon: <BookOpen className="w-5 h-5 text-purple-500" />, view: "classes", count: displayedClasses.length, locked: false },
    { label: "Teachers", subtitle: "Faculty Accounts & Access", icon: <Users className="w-5 h-5 text-green-500" />, view: "teachers", count: displayedTeachers.length, locked: false },
    { label: "Fee Structure & Heads", subtitle: "Student Fee & Teacher Pay", icon: <IndianRupee className="w-5 h-5 text-emerald-600" />, view: "fee_structure", count: "Heads & Pay", locked: false },
    { label: "Marksheet (रिजल्ट)", subtitle: "Report Card & Print", icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />, view: "marksheet_hub", count: "Official", locked: false },
    { label: "Notice Board & Holidays", subtitle: "Circulars & Festival Holidays", icon: <Megaphone className="w-5 h-5 text-purple-600" />, view: "notices", count: "Circulars", locked: false },
    { label: "Admit Cards", subtitle: "Exam Hall Tickets", icon: <FileText className="w-5 h-5 text-rose-500" />, view: "admit_cards", count: "Hall Ticket", locked: false },
    { label: "Certificates", subtitle: "TC, Bonafide & Merit", icon: <Award className="w-5 h-5 text-amber-500" />, view: "certificates", count: "TC & Merit", locked: false },
    { label: "Class Promotion", subtitle: "Next Session Upgrade", icon: <TrendingUp className="w-5 h-5 text-blue-600" />, view: "promotion", count: "Promote", locked: false },
    { label: "Staff HRM & Leaves", subtitle: "Payroll & Attendance", icon: <Briefcase className="w-5 h-5 text-teal-600" />, view: "staff_hrm", count: "Salaries", locked: false },
    { label: "Reports & Print", subtitle: "40+ Register Sheets", icon: <FileSpreadsheet className="w-5 h-5 text-cyan-600" />, view: "reports_hub", count: "40+ Reports", locked: false },
    { label: "Sessions", subtitle: "Academic Years", icon: <Calendar className="w-5 h-5 text-blue-500" />, view: "sessions", count: displayedSessions.length, locked: false },
    { label: "Public Website", subtitle: "Live School Portal", icon: <Globe className="w-5 h-5 text-indigo-500" />, view: "public_website", count: "Live", locked: false },
    { label: "Online Admissions", subtitle: "New Enquiries", icon: <UserPlus className="w-5 h-5 text-amber-500" />, view: "online_admissions", count: "Portal", locked: false },
  ];

  // ── ACCOUNT & SWITCH HUB PAGE (Dedicated screen for role switch, app explore & account actions) ──
  const renderAccountHubPage = () => {
    const displaySchoolLogo = school ? getSavedSchoolLogo(school.logoUrl, schoolId) : "";
    return (
      <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-200">
        {/* Top Header Card with Back Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer active:scale-95"
              title="डैशबोर्ड पर वापस जाएँ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  अकाउंट व स्विच हब (Account Hub)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
                  All-in-One
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Teacher, Accountant, Student व्यू, NSTA लर्निंग ऐप व लॉगआउट विकल्प
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>वापस डैशबोर्ड (Back to Dashboard)</span>
          </button>
        </div>

        {/* School & Admin Profile Summary Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3.5 text-center sm:text-left">
              {displaySchoolLogo ? (
                <img
                  src={displaySchoolLogo}
                  alt={school?.name}
                  className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-1.5 border border-white/20 shadow-md"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-amber-300 shadow-md">
                  <Building2 className="w-8 h-8" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-black text-white">{school?.name || "School Ecosystem"}</h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  {school?.code ? `Code: ${school.code} • ` : ""}
                  सत्र: {activeSession?.name || "2026-27"}
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    🛡️ स्कूल एडमिनिस्ट्रेटर (Active Admin)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                    🏛️ डायरेक्ट स्कूल पोर्टल
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setView("school_profile")}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 flex items-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>स्कूल सेटिंग्स (Settings)</span>
            </button>
          </div>
        </div>

        {/* Section 1: Explore Full NSTA Learning App */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/30 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-indigo-600 p-0.5 shrink-0 shadow-lg">
                <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center text-amber-300">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Explore Full NSTA App
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                    53+ Books &amp; MCQs
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
                  मुख्य NSTA स्टूडेंट लर्निंग ऐप खोलें: NCERT किताबें, डेली क्विज, टेस्ट सीरीज, डिजिटल लाइब्रेरी व कॉम्पिटिटिव स्टडी रूम।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExploreFullApp}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 transition shrink-0"
            >
              <span>मुख्य ऐप खोलें (Open App)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 2: Role & Dashboard View Switcher */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              डैशबोर्ड व्यू स्विच करें (Dashboard Role Views)
            </h3>
            <span className="text-[11px] text-slate-400">पोर्टल को अन्य रोल के नजरिए से देखें</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Teacher View */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500 shadow-sm transition flex flex-col justify-between gap-3 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-xl">
                    👨‍🏫
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    शिक्षक पैनल
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Teacher View
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  दैनिक अटेंडेंस, होमवर्क डायरी, क्लास नोट्स व मार्क्स एंट्री इंटरफेस।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onPreviewTeacher) onPreviewTeacher();
                }}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition"
              >
                <span>Teacher View खोलें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Accountant View */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-500/30 hover:border-amber-500 shadow-sm transition flex flex-col justify-between gap-3 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-xl">
                    💼
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    लेखापाल पैनल
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Accountant View
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  फीस वसूली, रसीद जनरेशन, डे-बुक, पेंडिंग ड्यूज व फाइनेंशियल रिपोर्ट्स।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onPreviewAccountant) onPreviewAccountant();
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 cursor-pointer active:scale-95 transition"
              >
                <span>Accountant View खोलें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Student View */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-purple-500/30 hover:border-purple-500 shadow-sm transition flex flex-col justify-between gap-3 group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-xl">
                    🎓
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    छात्र / पैरेंट
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Student View
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  रिजल्ट मार्कशीट, उपस्थिति रिकॉर्ड, डिजिटल नोटिस बोर्ड व फीस स्लिप।
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onPreviewStudent) onPreviewStudent();
                }}
                className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 cursor-pointer active:scale-95 transition"
              >
                <span>Student View खोलें</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: School Management & Session Actions */}
        <div className="space-y-3">
          <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            स्कूल व सत्र विकल्प (Session &amp; School Actions)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {canExitSchool && (
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-500/30 shadow-sm flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Leave School (स्कूल छोड़ें)
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      इस स्कूल से अपना खाता अलग (detach) करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLeaveConfirmModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-700 dark:text-amber-300 font-bold text-xs cursor-pointer active:scale-95 transition shrink-0"
                >
                  Leave
                </button>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-rose-500/30 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 shrink-0">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Admin Logout (एडमिन लॉगआउट)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    स्कूल एडमिन सत्र सुरक्षित रूप से समाप्त करें
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePerformLogout}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer active:scale-95 transition shrink-0 shadow-md shadow-rose-600/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setView("dashboard")}
            className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-sm flex items-center gap-2 shadow-lg cursor-pointer active:scale-95 transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>डैशबोर्ड पर वापस लौटें (Back to Dashboard)</span>
          </button>
        </div>
      </div>
    );
  };

  // List views
  const renderListView = () => {
    if (view === "account_hub") {
      return renderAccountHubPage();
    }
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

              {/* 10% Referral Incentive Permission Toggle */}
              <div className="flex items-center justify-between p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
                <div className="space-y-0.5">
                  <label className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>10% Student Referral Incentive Permission (रेफरल लाभ अनुमति)</span>
                  </label>
                  <p className="text-[10.5px] text-purple-700 dark:text-purple-300">
                    Admin जिसे चाहेगा केवल उसी शिक्षक को 10% रेफरल इंसेंटिव दिखेगा व लाभ मिलेगा।
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTeacherForm(p => ({ ...p, hasReferralIncentive: !p.hasReferralIncentive }))}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 ${
                    teacherForm.hasReferralIncentive
                      ? "bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-300"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  }`}
                >
                  {teacherForm.hasReferralIncentive ? "ENABLED (चालू)" : "DISABLED (बंद)"}
                </button>
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

                      {/* 10% Referral Incentive Permission Toggle */}
                      <div className="flex items-center justify-between p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-xl">
                        <div className="space-y-0.5">
                          <label className="text-xs font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                            <span>10% Student Referral Incentive Permission (रेफरल लाभ अनुमति)</span>
                          </label>
                          <p className="text-[10.5px] text-purple-700 dark:text-purple-300">
                            Admin जिसे चाहेगा केवल उसी शिक्षक को 10% रेफरल इंसेंटिव दिखेगा व लाभ मिलेगा।
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditTeacherForm(p => ({ ...p, hasReferralIncentive: !p.hasReferralIncentive }))}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs active:scale-95 ${
                            editTeacherForm.hasReferralIncentive
                              ? "bg-purple-600 hover:bg-purple-700 text-white ring-2 ring-purple-300"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                          }`}
                        >
                          {editTeacherForm.hasReferralIncentive ? "ENABLED (चालू)" : "DISABLED (बंद)"}
                        </button>
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
                            <button
                              type="button"
                              onClick={() => toggleTeacherReferralIncentive(t)}
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full border transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs ${
                                t.hasReferralIncentive
                                  ? "bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600 hover:bg-purple-200"
                                  : "bg-slate-100 dark:bg-slate-700/60 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:bg-slate-200"
                              }`}
                              title="Click to toggle 10% Referral Incentive benefit for this teacher"
                            >
                              <Award className="w-3 h-3 text-purple-500" />
                              <span>{t.hasReferralIncentive ? "10% Referral: ON" : "10% Referral: OFF"}</span>
                            </button>
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
                              hasReferralIncentive: Boolean(t.hasReferralIncentive),
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
                          setQuickActionInitialTab("profile");
                        }}
                        className="group text-left font-bold text-slate-800 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Student Full View (👁️ बायो-डेटा, आईडी कार्ड, फीस, हाजिरी, रिजल्ट, तुरंत एडिट)"
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
                    onClick={() => {
                      setQuickActionStudent(s);
                      setQuickActionInitialTab("profile");
                    }}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-pointer transition-colors"
                    title="Student Quick View (👁️ बायो-डेटा, आईडी कार्ड, फीस, हाजिरी, अंक व तुरंत एडिट)"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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

  return renderErpShell(
    view === "dashboard" ? (
      renderHomeDashboard()
    ) : view === "account_hub" ? (
      renderAccountHubPage()
    ) : (
      <div>
        <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 rounded-2xl mb-4 flex items-center justify-between shadow-xs">
          <p className="text-sm font-black text-slate-700 dark:text-slate-200 capitalize">
            {view.replace(/_/g, " ")}
          </p>
          <button
            type="button"
            onClick={() => {
              if (view === "subjects" || view === "students" || view === "attendance" || view === "marks" || view === "report_card") setView("classes");
              else if (view === "content") setView("subjects");
              else setView("dashboard");
            }}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to {view === "subjects" || view === "students" ? "Classes" : "Dashboard"}
          </button>
        </div>
        {renderListView()}
      </div>
    )
  );
};

export default SchoolAdminPanel;
