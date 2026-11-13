// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  subscribeToClasses, subscribeToSubjects, subscribeToStudents,
  subscribeToAllStudents, subscribeToLessons, getSchool, getSessions,
  getSubjects, getStudents, shouldUseDemoForSchool, isDemoRecord,
  saveSubject, saveMultipleSubjects, generateId, deleteSubject,
  getSchoolFeeHistory, getReferralPayouts, getSchoolReferralSettings,
  subscribeToTeachers,
  isStudentBirthdayToday, dispatchOfficialSchoolBirthdayWish
} from "../../school-firebase";
import { getDemoSchoolDataset } from "./demoDataStore";
import type {
  School, SchoolClass, SchoolSubject, SchoolLesson, SchoolStudent, SchoolSession,
  MonthlyFee, TeacherReferralPayout, SchoolReferralSettings, SchoolTeacher
} from "../../school-types";
import { sortSchoolClasses } from "../../school-types";
import {
  calculateTeacherReferralLedger,
  formatReferralDurationLabel,
  normalizePersonName
} from "../../utils/schoolReferralSiblingEngine";
import { AttendanceManager } from "./AttendanceManager";
import { MarksManager } from "./MarksManager";
import { SmartClass } from "./SmartClass";
import { ContentManager } from "./ContentManager";
import { SchoolCommunityFeed } from "./SchoolCommunityFeed";
import {
  BookOpen, Users, ClipboardList, LayoutDashboard,
  ChevronRight, ChevronLeft, Edit3, FileText, HelpCircle, Play,
  Search, Phone, User, Calendar, Award, Sparkles, Filter, CheckCircle2,
  GraduationCap, LogOut, Home, Megaphone, Image as ImageIcon,
  Clock, Book, MessageSquare, Plus, X, Trash2, Check, Layers, IndianRupee, Wallet, Bell,
  Youtube, RotateCw, Menu, Building2, AlertCircle, UserPlus, Crown, ArrowRight,
  Sun, Moon, Palette,
  Cake, Gift,
  Smartphone, Laptop, Monitor,
  Camera
} from "lucide-react";
import { TimetableManager } from "./TimetableManager";
import { ClassroomVideoArchive } from "./ClassroomVideoArchive";
import { HomeworkManager } from "./HomeworkManager";
import { LibraryManager } from "./LibraryManager";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";
import { NstaMessengerSuite } from "./NstaMessengerSuite";
import { AbsenteeActionPage } from "./AbsenteeActionPage";
import { OnlineAdmissionManager } from "./OnlineAdmissionManager";
import { getSavedSchoolLogo } from "./feeReceiptUtils";
import { ClassCurriculumNotesManager } from "./ClassCurriculumNotesManager";
import { isSchoolEliteCurriculum } from "../../school-types";
import { GroupStudyModal } from "../GroupStudyModal";
import { ParentLeaveManager } from "./ParentLeaveManager";
import { PtmSchedulerModal } from "./PtmSchedulerModal";
import { UniversalFaceIdStudioModal } from "./UniversalFaceIdStudioModal";
import { QuestionPaperBuilder } from "./QuestionPaperBuilder";
import { rotateToLandscape, rotateToPortrait, setDesktopMode, useDeviceOrientation } from "../../utils/displayPrefs";

interface Props {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  onBack?: () => void;
  onLogout?: () => void;
  onOpenPlatformContent?: () => void;
}

type TeacherView =
  | "dashboard"
  | "community"
  | "absentee"
  | "all_students"
  | "classes"
  | "class_students"
  | "subjects"
  | "lessons"
  | "attendance"
  | "marks"
  | "class_notes_manager"
  | "smart_class"
  | "content_manage"
  | "timetable"
  | "video_lectures"
  | "homework"
  | "library"
  | "parent_queries"
  | "referrals"
  | "messenger_broadcast"
  | "online_admission"
  | "school_study_room"
  | "leaves_desk"
  | "question_paper_builder"
  | "ptm_scheduler";

export const COMMON_BOOK_PRESETS = [
  { name: "Hindi", icon: "📖", category: "Language" },
  { name: "English", icon: "📘", category: "Language" },
  { name: "Mathematics", icon: "📐", category: "Core" },
  { name: "Science", icon: "🔬", category: "Core" },
  { name: "Social Science", icon: "🌍", category: "Core" },
  { name: "EVS", icon: "🌿", category: "Junior" },
  { name: "Sanskrit", icon: "📜", category: "Language" },
  { name: "Computer / IT", icon: "💻", category: "Technical" },
  { name: "General Knowledge (GK)", icon: "🧠", category: "General" },
  { name: "Drawing & Art", icon: "🎨", category: "Creative" },
  { name: "Moral Science", icon: "🕊️", category: "General" },
  { name: "Physical Education", icon: "🏃", category: "Sports" },
  { name: "Urdu", icon: "🕌", category: "Language" },
  { name: "Rhymes & Oral", icon: "🎵", category: "Junior" },
  { name: "Physics", icon: "⚛️", category: "Science" },
  { name: "Chemistry", icon: "🧪", category: "Science" },
  { name: "Biology", icon: "🧬", category: "Science" },
  { name: "Accountancy", icon: "📑", category: "Commerce" },
  { name: "Business Studies", icon: "💼", category: "Commerce" },
  { name: "Economics", icon: "📈", category: "Commerce" },
  { name: "History", icon: "🏛️", category: "Arts" },
  { name: "Political Science", icon: "⚖️", category: "Arts" },
  { name: "Geography", icon: "🗺️", category: "Arts" },
  { name: "Sociology", icon: "👥", category: "Arts" },
  { name: "Informatics Practices", icon: "🖥️", category: "Technical" },
];

export const PRESET_BOOK_BUNDLES = [
  {
    label: "⚡ All 6 Core Books",
    desc: "Hindi, English, Math, Science, SST, Computer",
    books: ["Hindi", "English", "Mathematics", "Science", "Social Science", "Computer / IT"],
  },
  {
    label: "🎒 Nursery / KG Pack",
    desc: "Rhymes, Balgeet, Numbers, Art, GK",
    books: ["English Rhymes", "Hindi Balgeet", "Numbers & Maths", "Drawing & Art", "General Knowledge (GK)"],
  },
  {
    label: "📚 Primary 8 Books",
    desc: "Class 1st to 5th standard set",
    books: ["Hindi", "English", "Mathematics", "EVS", "Social Science", "Computer / IT", "General Knowledge (GK)", "Drawing & Art"],
  },
  {
    label: "🎓 Middle / High 8 Books",
    desc: "Class 6th to 10th standard set",
    books: ["Hindi", "English", "Mathematics", "Science", "Social Science", "Sanskrit", "Computer / IT", "Physical Education"],
  },
  {
    label: "🔬 Class 11-12 Science Pack",
    desc: "Physics, Chemistry, Maths, Biology, English Core, Computer",
    books: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer / IT", "Physical Education"],
  },
  {
    label: "📊 Class 11-12 Commerce Pack",
    desc: "Accountancy, Business Studies, Economics, English, Applied Maths",
    books: ["Accountancy", "Business Studies", "Economics", "English", "Mathematics", "Informatics Practices"],
  },
  {
    label: "🎨 Class 11-12 Arts / Humanities Pack",
    desc: "History, Political Science, Geography, Economics, English, Hindi",
    books: ["History", "Political Science", "Geography", "Economics", "English", "Hindi", "Sociology"],
  },
];

export const TeacherPanel: React.FC<Props> = ({
  schoolId,
  teacherId,
  teacherName,
  onBack,
  onLogout,
  onOpenPlatformContent
}) => {
  const handleExploreFullApp = () => {
    try {
      localStorage.setItem("nst_app_view_mode", "STUDENT");
      window.dispatchEvent(new CustomEvent("nst_open_student_dashboard"));
    } catch (err) {
      console.warn("[TeacherPanel] Explore full app switch warning:", err);
    }
    if (onOpenPlatformContent) {
      onOpenPlatformContent();
    } else if (onBack) {
      onBack();
    }
  };

  const [school, setSchool] = useState<School | null>(null);
  const [sessions, setSessions] = useState<SchoolSession[]>([]);
  const [activeSession, setActiveSession] = useState<SchoolSession | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [allSubjects, setAllSubjects] = useState<SchoolSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SchoolSubject | null>(null);
  const [lessons, setLessons] = useState<SchoolLesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<SchoolLesson | null>(null);
  const [smartMode, setSmartMode] = useState<"reading" | "writing" | "pdf" | "mcq">("reading");
  const [view, setView] = useState<TeacherView>("dashboard");

  // Navigation Sidebar & Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem("school_teacher_sidebar_hidden") === "true";
    } catch {
      return false;
    }
  });

  // Continuous Device Orientation & Screen Width Hook
  const { isLandscape: isClientLandscape, isWideScreen } = useDeviceOrientation();

  // Desktop/Laptop Mode state (Manual Toggle Preserved in localStorage)
  const [isRotatedLandscape, setIsRotatedLandscape] = useState<boolean>(() => {
    try {
      return localStorage.getItem("school_erp_rotated_landscape") === "true";
    } catch {
      return false;
    }
  });

  // Effective landscape: active when manual desktop mode is ON, or device is held in landscape, or wide desktop monitor
  const isEffectiveLandscape = isRotatedLandscape || isClientLandscape || isWideScreen;
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);

  // 3-Theme Switcher (White / Black / Midnight Current)
  const [appTheme, setAppTheme] = useState<"current" | "white" | "black">(() => {
    try {
      const saved = (localStorage.getItem("nst_app_theme") || localStorage.getItem("nst_student_theme")) as any;
      if (saved === "white" || saved === "black" || saved === "current") return saved;
    } catch (err) {
      console.warn("[TeacherPanel] Theme load warning:", err);
    }
    return "current";
  });

  const applyTeacherTheme = (nextTheme: "current" | "white" | "black") => {
    setAppTheme(nextTheme);
    try {
      localStorage.setItem("nst_app_theme", nextTheme);
      localStorage.setItem("nst_student_theme", nextTheme);
      if (typeof document !== "undefined") {
        document.documentElement.classList.remove(
          "teacher-theme-white",
          "teacher-theme-black",
          "teacher-theme-current",
          "app-theme-white",
          "app-theme-black",
          "app-theme-current",
          "dark-mode-black",
          "dark-mode-blue"
        );
        document.documentElement.classList.add(`teacher-theme-${nextTheme}`, `app-theme-${nextTheme}`);
        if (nextTheme === "white") {
          document.documentElement.classList.remove("dark", "dark-mode");
        } else if (nextTheme === "black") {
          document.documentElement.classList.add("dark", "dark-mode", "dark-mode-black");
        } else {
          document.documentElement.classList.add("dark", "dark-mode", "dark-mode-blue");
        }
      }
      window.dispatchEvent(new Event("nst-dark-theme-change"));
    } catch (err) {
      console.warn("[TeacherPanel] Theme apply warning:", err);
    }
  };

  useEffect(() => {
    applyTeacherTheme(appTheme);
  }, []);

  // Students state
  const [allStudents, setAllStudents] = useState<SchoolStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");
  const [showFaceStudio, setShowFaceStudio] = useState(false);
  const [confirmDeleteSubjectId, setConfirmDeleteSubjectId] = useState<string | null>(null);

  // Multi-book addition state
  const [showAddBooksModal, setShowAddBooksModal] = useState(false);
  const [customBooksInput, setCustomBooksInput] = useState("");
  const [selectedBooksQueue, setSelectedBooksQueue] = useState<string[]>([]);
  const [savingBooks, setSavingBooks] = useState(false);
  const [booksFeedback, setBooksFeedback] = useState<string | null>(null);

  // Current logged in Teacher record
  const [currentTeacher, setCurrentTeacher] = useState<SchoolTeacher | null>(null);

  // Teacher 10% Referral Incentive state
  const [schoolFees, setSchoolFees] = useState<MonthlyFee[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<TeacherReferralPayout[]>([]);
  const [referralSettings, setReferralSettings] = useState<SchoolReferralSettings | null>(null);

  // Initial load
  useEffect(() => {
    getSchool(schoolId).then((s) => setSchool(s));

    getSessions(schoolId).then((sess) => {
      setSessions(sess);
      const active = sess.find((s) => s.active) || sess[0] || null;
      setActiveSession(active);
    });

    const useDemo = shouldUseDemoForSchool(schoolId);

    const unsubStudents = subscribeToAllStudents(schoolId, (stds) => {
      if (stds && stds.length > 0) {
        const clean = !useDemo ? stds.filter((s) => !isDemoRecord(s)) : stds;
        setAllStudents(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        if (demo && demo.students) setAllStudents(demo.students);
      } else {
        setAllStudents([]);
      }
    });

    const unsubTeachers = subscribeToTeachers(schoolId, (tchs) => {
      if (tchs && tchs.length > 0) {
        const me = tchs.find(
          (t) => t.id === teacherId || (t.name && teacherName && normalizePersonName(t.name) === normalizePersonName(teacherName))
        );
        if (me) setCurrentTeacher(me);
      }
    });

    getSubjects(schoolId).then((subs) => {
      if (subs && subs.length > 0) {
        const clean = !useDemo ? subs.filter((s) => !isDemoRecord(s)) : subs;
        setAllSubjects(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        if (demo && demo.subjects) setAllSubjects(demo.subjects);
      } else {
        setAllSubjects([]);
      }
    });

    Promise.all([
      getSchoolFeeHistory(schoolId),
      getReferralPayouts(schoolId),
      getSchoolReferralSettings(schoolId),
    ])
      .then(([fees, payouts, refCfg]) => {
        setSchoolFees(fees || []);
        setReferralPayouts(payouts || []);
        setReferralSettings(refCfg || null);
      })
      .catch(() => {});

    return () => {
      if (typeof unsubStudents === "function") unsubStudents();
      if (typeof unsubTeachers === "function") unsubTeachers();
    };
  }, [schoolId, teacherId, teacherName]);

  // Orientation listener
  useEffect(() => {
    const checkOrientation = () => {
      const isLandscape = window.innerWidth > window.innerHeight;
      if (isLandscape) {
        setShowRotatePrompt(false);
      }
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    window.addEventListener("orientationchange", checkOrientation);
    return () => {
      window.removeEventListener("resize", checkOrientation);
      window.removeEventListener("orientationchange", checkOrientation);
    };
  }, []);

  // Global touch gestures: Swipe Left to hide menu, Swipe Right to reveal
  useEffect(() => {
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

      if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.2) {
        if (diffX < 0) {
          // Swipe Left -> Hide menu (1% visible strip)
          setIsSidebarOpen(false);
          setIsSidebarHidden(true);
          try {
            localStorage.setItem("school_teacher_sidebar_hidden", "true");
          } catch (err) {
            console.warn("[TeacherPanel] Sidebar pref warning:", err);
          }
        } else if (diffX > 0) {
          // Swipe Right -> Reveal menu ONLY if drag started from left 20% edge of screen
          const maxLeftEdge = typeof window !== "undefined" ? window.innerWidth * 0.20 : 80;
          if (touchStartX <= maxLeftEdge) {
            if (isEffectiveLandscape) {
              setIsSidebarHidden(false);
              try {
                localStorage.setItem("school_teacher_sidebar_hidden", "false");
              } catch (err) {
                console.warn("[TeacherPanel] Sidebar pref warning:", err);
              }
            } else {
              setIsSidebarOpen(true);
            }
          }
        }
      }
    };

    window.addEventListener("touchstart", onGlobalTouchStart, { passive: true });
    window.addEventListener("touchend", onGlobalTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onGlobalTouchStart);
      window.removeEventListener("touchend", onGlobalTouchEnd);
    };
  }, [isEffectiveLandscape]);

  useEffect(() => {
    if (view !== "referrals") return;
    Promise.all([
      getSchoolFeeHistory(schoolId),
      getReferralPayouts(schoolId),
      getSchoolReferralSettings(schoolId),
    ])
      .then(([fees, payouts, refCfg]) => {
        setSchoolFees(fees || []);
        setReferralPayouts(payouts || []);
        setReferralSettings(refCfg || null);
      })
      .catch(() => {});
  }, [view, schoolId]);

  const myReferralSummary = useMemo(() => {
    const normMe = normalizePersonName(teacherName);
    const normalizedStudents = allStudents.map((st) => {
      const matchesMe =
        st.referredByTeacherId === teacherId ||
        (Boolean(normMe) && normalizePersonName(st.referredByTeacherName) === normMe);
      return matchesMe ? { ...st, referredByTeacherId: teacherId, referredByTeacherName: teacherName } : st;
    });
    const normalizedPayouts = referralPayouts.map((p) => {
      const matchesMe =
        p.teacherId === teacherId ||
        (Boolean(normMe) && normalizePersonName(p.teacherName) === normMe);
      return matchesMe ? { ...p, teacherId, teacherName } : p;
    });

    const ledger = calculateTeacherReferralLedger({
      students: normalizedStudents.filter((s) => s.referredByTeacherId === teacherId),
      fees: schoolFees,
      payouts: normalizedPayouts.filter((p) => p.teacherId === teacherId),
      referrers: [{ id: teacherId, name: teacherName, designation: "Faculty", source: "teacher" }],
      settings: referralSettings || undefined,
    });

    return (
      ledger.teachers[0] || {
        teacherId,
        teacherName,
        designation: "Faculty",
        studentsCount: 0,
        totalEligibleFeeCollected: 0,
        totalEarnedCommission: 0,
        totalPendingCommission: 0,
        totalPaidOut: 0,
        balancePayable: 0,
        students: [],
        payouts: [],
      }
    );
  }, [allStudents, schoolFees, referralPayouts, referralSettings, teacherId, teacherName]);

  // Subscribe to classes
  useEffect(() => {
    const useDemo = shouldUseDemoForSchool(schoolId, activeSession?.id);
    const unsub = subscribeToClasses(schoolId, activeSession?.id || "", (clsList) => {
      if (clsList && clsList.length > 0) {
        const clean = !useDemo ? clsList.filter((c) => !isDemoRecord(c)) : clsList;
        setClasses(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        if (demo && demo.classes) setClasses(demo.classes);
      } else {
        setClasses([]);
      }
    });
    return unsub;
  }, [schoolId, activeSession]);

  // Subscribe to subjects
  useEffect(() => {
    if (!selectedClass) return;
    const useDemo = shouldUseDemoForSchool(schoolId, activeSession?.id);
    const unsub = subscribeToSubjects(schoolId, selectedClass.id, (subs) => {
      if (subs && subs.length > 0) {
        const clean = !useDemo ? subs.filter((s) => !isDemoRecord(s)) : subs;
        setSubjects(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        const found = demo.subjects.filter((s) => s.classId === selectedClass.id || s.className === selectedClass.name);
        setSubjects(found.length > 0 ? found : demo.subjects.slice(0, 6));
      } else {
        setSubjects([]);
      }
    });
    return unsub;
  }, [schoolId, selectedClass]);

  // Subscribe to lessons
  useEffect(() => {
    if (!selectedSubject) return;
    const useDemo = shouldUseDemoForSchool(schoolId, activeSession?.id);
    const unsub = subscribeToLessons(schoolId, selectedSubject.id, (lesList) => {
      if (lesList && lesList.length > 0) {
        setLessons(lesList);
      } else if (useDemo) {
        setLessons([
          {
            id: `les_${selectedSubject.id}_1`,
            schoolId,
            subjectId: selectedSubject.id,
            title: `Chapter 1: ${selectedSubject.name} - Fundamentals & Concepts`,
            order: 1,
            features: { readingEnabled: true, writingEnabled: true, pdfEnabled: true, mcqEnabled: true },
            readingContent: `# ${selectedSubject.name}\n\n## Chapter 1: Comprehensive Study Notes\n\nWelcome to this chapter. Here you will learn the core curriculum syllabus, solved examples, and revision formulas.`,
            writingPrompt: `Explain the fundamental importance of ${selectedSubject.name} in daily life.`,
            mcqQuestions: [
              {
                id: "q1",
                question: `What is the core focus of ${selectedSubject.name}?`,
                options: ["Conceptual mastery & understanding", "Random guessing", "No practical value", "None of these"],
                correctOption: 0,
                explanation: "Foundational conceptual understanding is the primary curriculum goal."
              }
            ],
            createdAt: new Date().toISOString()
          }
        ]);
      } else {
        setLessons([]);
      }
    });
    return unsub;
  }, [schoolId, selectedSubject, activeSession?.id]);

  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      const q = studentSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toString().toLowerCase().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q));

      const matchClass = selectedClassFilter === "ALL" || s.classId === selectedClassFilter;
      return matchSearch && matchClass;
    });
  }, [allStudents, studentSearch, selectedClassFilter]);

  const studentCountByClass = useMemo(() => {
    const map: Record<string, number> = {};
    allStudents.forEach((st) => {
      if (st.classId) map[st.classId] = (map[st.classId] || 0) + 1;
    });
    return map;
  }, [allStudents]);

  const todaysTeacherBirthdays = useMemo(() => {
    return allStudents.filter((s) => isStudentBirthdayToday(s.dateOfBirth));
  }, [allStudents]);

  const handleToggleScreenRotate = async () => {
    const nextIsRotated = !isEffectiveLandscape;
    setIsRotatedLandscape(nextIsRotated);
    try {
      localStorage.setItem("school_erp_rotated_landscape", nextIsRotated ? "true" : "false");
    } catch (err) {
      console.warn("[TeacherPanel] Orientation save warning:", err);
    }

    if (nextIsRotated) {
      await rotateToLandscape();
      setDesktopMode(true, false);
      setShowRotatePrompt(true);
      setTimeout(() => setShowRotatePrompt(false), 3500);
    } else {
      await rotateToPortrait();
      setDesktopMode(false, false);
      setShowRotatePrompt(false);
    }
  };

  const handlePerformLogout = () => {
    try {
      localStorage.removeItem("nst_current_user");
      localStorage.removeItem("nsta_cached_user");
      localStorage.removeItem("nst_is_guest");
      localStorage.setItem("nst_logged_out", "true");
    } catch (e) {}
    if (onLogout) onLogout();
    else if (onBack) onBack();
    else window.location.reload();
  };

  const handleSaveAllBooks = async () => {
    if (!selectedClass || selectedBooksQueue.length === 0) return;
    setSavingBooks(true);
    setBooksFeedback(null);
    try {
      const existingNames = new Set(subjects.map((s) => (s.name || "").trim().toLowerCase()));
      const toAdd = selectedBooksQueue.filter((name) => !existingNames.has(name.trim().toLowerCase()));

      if (toAdd.length === 0) {
        setBooksFeedback("Ye sabhi books pehle se is class me add hain!");
        setSavingBooks(false);
        return;
      }

      const newSubs: SchoolSubject[] = toAdd.map((name) => ({
        id: generateId(),
        schoolId,
        sessionId: activeSession?.id || "",
        classId: selectedClass.id,
        className: selectedClass.name,
        name: name.trim(),
        createdAt: new Date().toISOString()
      }));

      await saveMultipleSubjects(newSubs);

      setSubjects((prev) => [...prev, ...newSubs]);
      setAllSubjects((prev) => [...prev, ...newSubs]);
      setSelectedBooksQueue([]);
      setCustomBooksInput("");
      setShowAddBooksModal(false);
      setBooksFeedback(`✅ ${newSubs.length} books safaltapoorvak add kar di gayi hain!`);
      setTimeout(() => setBooksFeedback(null), 4000);
    } catch (err: any) {
      setBooksFeedback(`❌ Error adding books: ${err?.message || "Kripya dobara try karein"}`);
    } finally {
      setSavingBooks(false);
    }
  };

  const handleDeleteSubject = async (sub: SchoolSubject) => {
    try {
      await deleteSubject(schoolId, sub.id);
      setSubjects((prev) => prev.filter((s) => s.id !== sub.id));
      setAllSubjects((prev) => prev.filter((s) => s.id !== sub.id));
      setConfirmDeleteSubjectId(null);
      toast.success(`"${sub.name}" delete ho gaya.`);
    } catch (err) {
      console.error("[TeacherPanel] Delete subject error:", err);
      toast.error("Subject delete karne me samasya aayi.");
    }
  };

  // Full-screen smart class mode
  if (view === "smart_class" && selectedLesson) {
    return (
      <SmartClass
        lesson={selectedLesson}
        initialMode={smartMode}
        schoolId={schoolId}
        teacherId={teacherId}
        onBack={() => setView("lessons")}
      />
    );
  }

  // ── TEACHER NAVIGATION CATEGORIES (ONLY CONTROLS TEACHERS USE) ─────────────
  const isReferralEligible = Boolean(currentTeacher?.hasReferralIncentive);

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
        { id: "dashboard" as TeacherView, label: "Teacher Dashboard", icon: Home, desc: "कक्षा समरी व लाइव मेट्रिक्स" },
        { id: "community" as TeacherView, label: "Classroom Community", icon: Megaphone, desc: "फोटो, वीडियो व सर्कुलर्स" },
      ]
    },
    {
      id: "academics",
      title: "छात्र व शिक्षा (Academics & Teaching)",
      theme: {
        pillBg: "bg-emerald-950/60 border border-emerald-500/30",
        titleColor: "text-emerald-300",
        accentDot: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]",
        badgeColor: "bg-emerald-500/25 text-emerald-200 border border-emerald-400/30",
        hoverBg: "hover:bg-emerald-950/40 hover:text-emerald-200",
      },
      items: [
        { id: "online_admission" as TeacherView, label: "Online Admission", icon: UserPlus, desc: "नया छात्र प्रवेश फॉर्म भरें" },
        { id: "classes" as TeacherView, label: "My Classes & Sections", icon: BookOpen, desc: "कक्षाएं व छात्र रोस्टर" },
        { id: "all_students" as TeacherView, label: "Students Directory", icon: Users, desc: "छात्र प्रोफाइल व रोल नंबर" },
        { id: "attendance" as TeacherView, label: "Daily Attendance", icon: ClipboardList, desc: "दैनिक रोल-कॉल व उपस्थिति" },
        { id: "leaves_desk" as TeacherView, label: "Student Leaves Desk", icon: Calendar, desc: "छुट्टी आवेदन व 1-टैप अप्रूवल" },
        { id: "marks" as TeacherView, label: "Marks & Exam Entry", icon: Edit3, desc: "यूनिट टेस्ट व परीक्षा अंक" },
        { id: "question_paper_builder" as TeacherView, label: "Question Paper Builder", icon: FileText, desc: "अर्धवार्षिक व वार्षिक परीक्षा पेपर" },
        { id: "homework" as TeacherView, label: "Daily Homework & Diary", icon: BookOpen, desc: "दैनिक गृहकार्य व डायरी" },
        { id: "timetable" as TeacherView, label: "Timetable & Routine", icon: Clock, desc: "साप्ताहिक घंटी व समय सारणी" },
      ]
    },
    {
      id: "digital_classroom",
      title: "डिजिटल क्लासरूम व लाइब्रेरी (Digital Study)",
      theme: {
        pillBg: "bg-cyan-950/60 border border-cyan-500/30",
        titleColor: "text-cyan-300",
        accentDot: "bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]",
        badgeColor: "bg-cyan-500/25 text-cyan-200 border border-cyan-400/30",
        hoverBg: "hover:bg-cyan-950/40 hover:text-cyan-200",
      },
      items: [
        { id: "class_notes_manager" as TeacherView, label: "Class 1-12 Notes Manager", icon: Sparkles, desc: "स्कूल नोट्स, MCQ, Video व PDF" },
        { id: "subjects" as TeacherView, label: "Smart Class & Subjects", icon: Play, desc: "स्मार्ट क्लास, पाठ व एमसीक्यू" },
        { id: "video_lectures" as TeacherView, label: "Class Video Archive", icon: Youtube, desc: "यूट्यूब वीडियो लेक्चर्स संग्रह" },
        { id: "school_study_room" as TeacherView, label: "School Study Room", icon: Users, desc: "लाइव स्टडी रूम (School MCQs)" },
        { id: "library" as TeacherView, label: "Library Management", icon: Book, desc: "पुस्तकालय व पुस्तक विवरण" },
      ]
    },
    {
      id: "communication",
      title: "कम्युनिकेशन व सुरक्षा (Communication)",
      theme: {
        pillBg: "bg-rose-950/60 border border-rose-500/30",
        titleColor: "text-rose-300",
        accentDot: "bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]",
        badgeColor: "bg-rose-500/25 text-rose-200 border border-rose-400/30",
        hoverBg: "hover:bg-rose-950/40 hover:text-rose-200",
      },
      items: [
        { id: "absentee" as TeacherView, label: "Absenty Action Center", icon: AlertCircle, desc: "1-दिन अलर्ट व 2-दिन+ कॉल" },
        { id: "messenger_broadcast" as TeacherView, label: "Messenger & Broadcast", icon: MessageSquare, desc: "क्लास ग्रुप्स व 1-वे पुश अलर्ट्स" },
        { id: "parent_queries" as TeacherView, label: "Parent Helpdesk & Leaves", icon: MessageSquare, desc: "अभिभावक संवाद व लीव आवेदन" },
        { id: "ptm_scheduler" as TeacherView, label: "PTM Slot Scheduler", icon: Calendar, desc: "अभिभावक-शिक्षक बैठक समय सारणी" },
      ]
    },
    // Referral Incentive is ONLY visible to teachers approved by Admin
    ...(isReferralEligible
      ? [
          {
            id: "earnings",
            title: "वेतन व इंसेंटिव (Incentives & Pay)",
            theme: {
              pillBg: "bg-purple-950/60 border border-purple-500/30",
              titleColor: "text-purple-300",
              accentDot: "bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.8)]",
              badgeColor: "bg-purple-500/25 text-purple-200 border border-purple-400/30",
              hoverBg: "hover:bg-purple-950/40 hover:text-purple-200",
            },
            items: [
              { id: "referrals" as TeacherView, label: "10% Referral Incentive", icon: Award, desc: "रेफरल इंसेंटिव व लेजर" },
            ]
          }
        ]
      : [])
  ];

  const isMenuItemActive = (itemId: TeacherView): boolean => {
    if (view === itemId) return true;
    if (itemId === "classes" && (view === "class_students" || view === "lessons" || view === "content_manage")) return true;
    if (itemId === "subjects" && (view === "subjects" || view === "lessons" || view === "smart_class")) return true;
    return false;
  };

  const handleSelectNavView = (targetView: TeacherView) => {
    if (targetView === "attendance") {
      const target = selectedClass || classes[0] || null;
      if (target) setSelectedClass(target);
      setView("attendance");
    } else if (targetView === "marks") {
      const target = selectedClass || classes[0] || null;
      if (target) setSelectedClass(target);
      setView("marks");
    } else if (targetView === "subjects") {
      const target = selectedClass || classes[0] || null;
      if (target) setSelectedClass(target);
      setView("subjects");
    } else {
      setView(targetView);
    }
    setIsSidebarOpen(false);
  };

  // ── DESKTOP PERMANENT LEFT SIDEBAR (20% SLIMMER: w-52 lg:w-56) ───────────
  const renderDesktopSidebar = () => {
    const displaySchoolLogo = school ? getSavedSchoolLogo(school.logoUrl, schoolId) : "";
    const isSidebarDefault = isEffectiveLandscape;

    if (isSidebarHidden) {
      return (
        <aside
          onClick={() => {
            setIsSidebarHidden(false);
            try {
              localStorage.setItem("school_teacher_sidebar_hidden", "false");
            } catch (err) {
              console.warn("[TeacherPanel] Sidebar reveal warning:", err);
            }
          }}
          className="hidden md:flex flex-col w-2 hover:w-3.5 bg-slate-900 border-r border-indigo-500/40 hover:border-amber-400 shrink-0 h-screen h-[100dvh] max-h-screen cursor-pointer transition-all duration-200 z-30 group relative"
          title="मेनू खोलें (Click ya Swipe Right)"
        >
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-16 rounded-r-full bg-gradient-to-b from-indigo-500 via-amber-400 to-indigo-500 opacity-70 group-hover:opacity-100 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
        </aside>
      );
    }

    return (
      <aside className={`${isSidebarDefault ? "flex" : "hidden md:flex"} flex-col w-52 lg:w-56 bg-slate-900 border-r border-slate-800 shrink-0 h-screen h-[100dvh] max-h-screen overflow-hidden select-none z-30 text-slate-100 shadow-xl transition-all duration-200 animate-in slide-in-from-left duration-200`}>
        {/* Brand Header */}
        <div className="p-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 overflow-hidden shadow-xs">
              {displaySchoolLogo ? (
                <img src={displaySchoolLogo} alt={school?.name} className="w-full h-full object-contain rounded-lg bg-white" />
              ) : (
                <GraduationCap className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-xs text-white truncate leading-tight">
                {school?.name || "Teacher Portal"}
              </h2>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  {teacherName.split(" ")[0]} (Faculty)
                </span>
                <span className="text-[9.5px] text-slate-400 truncate">
                  {activeSession?.name || "2026-27"}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSidebarHidden(true);
              try {
                localStorage.setItem("school_teacher_sidebar_hidden", "true");
              } catch (err) {
                console.warn("[TeacherPanel] Sidebar hide warning:", err);
              }
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
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = isMenuItemActive(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectNavView(item.id)}
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

        {/* Bottom Sidebar Action Footer */}
        <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 space-y-1.5 shrink-0">
          {/* Explore Full NSTA Learning App */}
          <button
            type="button"
            onClick={handleExploreFullApp}
            className="w-full p-2 rounded-xl bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                  Explore Full NSTA App
                </p>
                <p className="text-[9.5px] text-indigo-300/80 truncate">
                  53+ Books, MCQs &amp; Study Room
                </p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-300 truncate">
              {teacherName}
            </span>
          </div>
          <button
            type="button"
            onClick={handlePerformLogout}
            className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-100 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Teacher Logout</span>
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
        {/* Transparent backdrop: Screen behind remains sharp, bright & visible */}
        <div
          className="fixed inset-0 bg-transparent transition-opacity cursor-pointer"
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* Drawer */}
        <div className="relative w-[228px] max-w-[76vw] bg-slate-900 text-slate-100 flex flex-col h-full h-[100dvh] shadow-2xl z-10 overflow-hidden animate-in slide-in-from-left duration-250 border-r border-slate-800">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/90 flex items-center justify-between gap-2.5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/15 overflow-hidden">
                {displaySchoolLogo ? (
                  <img src={displaySchoolLogo} alt={school?.name} className="w-full h-full object-contain rounded-lg bg-white" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-xs text-white truncate">{teacherName}</h3>
                <p className="text-[9px] text-emerald-300 font-bold">Faculty Member</p>
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
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isMenuItemActive(item.id);
                    return (
                      <button
                        key={`m-${item.id}`}
                        type="button"
                        onClick={() => handleSelectNavView(item.id)}
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

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-950/80 space-y-1.5 shrink-0">
            {/* Explore Full NSTA Learning App */}
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                handleExploreFullApp();
              }}
              className="w-full p-2 rounded-xl bg-gradient-to-r from-indigo-900/70 via-purple-900/60 to-slate-900 border border-indigo-500/40 hover:border-indigo-400 text-left transition flex items-center justify-between gap-2 shadow-md group cursor-pointer active:scale-95"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-white group-hover:text-indigo-200 truncate">
                    Explore Full NSTA App
                  </p>
                  <p className="text-[9.5px] text-indigo-300/80 truncate">
                    53+ Books, MCQs &amp; Study Room
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            <button
              type="button"
              onClick={handlePerformLogout}
              className="w-full py-1.5 px-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Teacher Logout</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ── UNIFIED TOP BAR ────────────────────────────────────────────────────────
  const renderTopHeader = () => {
    return (
      <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        {/* Left: View Name & Navigation */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="min-w-0 flex items-center gap-2">
            {view !== "dashboard" && (
              <button
                type="button"
                onClick={() => setView("dashboard")}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Dashboard</span>
              </button>
            )}

            {/* Academic Session Badge on Left */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-emerald-500/35 text-[11px] font-black shrink-0">
              <Calendar className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tabular-nums font-mono">
                सत्र: {activeSession?.name ? activeSession.name.replace(/Academic Session |Session /i, "") : "2026-27"}
              </span>
            </span>
            <h1 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white capitalize truncate">
              {view === "dashboard"
                ? "Teacher Dashboard (अकादमिक पोर्टल)"
                : view === "classes"
                ? "My Classes & Sections"
                : view === "all_students"
                ? "Students Directory"
                : view === "attendance"
                ? "Daily Attendance (छात्र उपस्थिति)"
                : view === "marks"
                ? "Marks & Exam Entry (परीक्षा अंक)"
                : view === "homework"
                ? "Daily Homework & Diary"
                : view === "timetable"
                ? "Timetable & Routine"
                : view === "video_lectures"
                ? "Class Video Archive"
                : view === "library"
                ? "Library Management"
                : view === "absentee"
                ? "Absenty Action Center"
                : view === "messenger_broadcast"
                ? "Class Messenger Broadcast"
                : view === "parent_queries"
                ? "Parent Helpdesk & Queries"
                : view === "leaves_desk"
                ? "Student Leaves Desk (छुट्टी आवेदन व अप्रूवल)"
                : view === "question_paper_builder"
                ? "Question Paper & Blueprint Generator"
                : view === "ptm_scheduler"
                ? "PTM Slot Scheduler & Appointments"
                : view === "online_admission"
                ? "Online Student Admission (छात्र प्रवेश)"
                : view === "referrals"
                ? "10% Student Referral Incentive"
                : view.replace(/_/g, " ")}
            </h1>
          </div>
        </div>

        {/* Right: 3-Theme Switcher, Screen Rotate Toggle & Faculty Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {/* 3-Theme Switcher Segmented Pill */}
          <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-xs">
            <button
              type="button"
              onClick={() => applyTeacherTheme("white")}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                appTheme === "white"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="White (Light) थीम - सफेद"
            >
              <Sun className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">White</span>
            </button>
            <button
              type="button"
              onClick={() => applyTeacherTheme("black")}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                appTheme === "black"
                  ? "bg-cyan-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Black (AMOLED) थीम - सुपर डार्क"
            >
              <Moon className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Black</span>
            </button>
            <button
              type="button"
              onClick={() => applyTeacherTheme("current")}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-black flex items-center gap-1 transition cursor-pointer ${
                appTheme === "current"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Midnight (Default) थीम - डिफ़ॉल्ट"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Midnight</span>
            </button>
          </div>

          {/* Mobile / Laptop Rotate Toggle Button */}
          <button
            type="button"
            onClick={handleToggleScreenRotate}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow-md border ${
              isEffectiveLandscape
                ? "bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white border-cyan-300/60 shadow-cyan-500/30 ring-2 ring-cyan-400/30"
                : "bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/40 shadow-emerald-500/10"
            }`}
            title={
              isEffectiveLandscape
                ? "Mobile (Portrait) Mode me wapas layein"
                : "Laptop (Desktop) Mode me badlein"
            }
          >
            {isEffectiveLandscape ? (
              <>
                <Laptop className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                <span className="inline">💻 Laptop</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span className="inline">📱 Mobile</span>
              </>
            )}
          </button>

          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{teacherName.split(" ")[0]} (Faculty)</span>
          </span>
        </div>
      </header>
    );
  };

  // ── VIEW CONTENT DISPATCHER ────────────────────────────────────────────────
  const renderViewContent = () => {
    // 1. Absenty Action Center
    if (view === "absentee") {
      return (
        <AbsenteeActionPage
          schoolId={schoolId}
          schoolName={school?.name}
          classes={classes}
          currentRole="TEACHER"
          currentUserId={teacherId}
          currentUserName={teacherName}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 2. Attendance Manager
    if (view === "attendance") {
      const activeClass = selectedClass || classes[0] || null;
      if (!activeClass) {
        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <ClipboardList className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Koi Class uplabdh nahi hai</h3>
            <p className="text-xs text-slate-500 mt-1">Attendance lene ke liye pehle class add karein ya select karein.</p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {classes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 shrink-0">Class chunein:</span>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeClass.id === cls.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}
          <AttendanceManager
            schoolId={schoolId}
            classId={activeClass.id}
            className={activeClass.name}
            teacherId={teacherId}
            onBack={() => setView("dashboard")}
          />
        </div>
      );
    }

    // 3. Marks Manager
    if (view === "marks") {
      const activeClass = selectedClass || classes[0] || null;
      if (!activeClass) {
        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <Edit3 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Koi Class uplabdh nahi hai</h3>
            <p className="text-xs text-slate-500 mt-1">Marks entry ke liye pehle class select karein.</p>
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {classes.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-bold text-slate-500 shrink-0">Class chunein:</span>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    activeClass.id === cls.id
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {cls.name}
                </button>
              ))}
            </div>
          )}
          <MarksManager
            schoolId={schoolId}
            classId={activeClass.id}
            className={activeClass.name}
            sessionId={activeSession?.id || "demo_session_2026_27"}
            teacherId={teacherId}
            subjectId={selectedSubject?.id}
            subjectName={selectedSubject?.name}
            onBack={() => setView("dashboard")}
          />
        </div>
      );
    }

    // 4. Content Manager
    if (view === "content_manage" && selectedClass && selectedSubject) {
      return (
        <ContentManager
          schoolId={schoolId}
          sessionId={activeSession?.id || "demo_session_2026_27"}
          classId={selectedClass.id}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          className={selectedClass.name}
          authorId={teacherId}
          subscription={school?.subscription || { reading: true, writing: true, pdf: true, mcq: true }}
          onBack={() => setView("subjects")}
          onOpenLesson={(lesson, mode) => {
            setSelectedLesson(lesson);
            setSmartMode(mode);
            setView("smart_class");
          }}
        />
      );
    }

    // 5. Timetable Manager
    if (view === "timetable") {
      return (
        <TimetableManager
          school={school!}
          classes={classes}
          subjects={allSubjects}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          activeSession={activeSession}
          isTeacher={true}
          currentTeacherId={teacherId}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 6. Classroom Video Archive
    if (view === "video_lectures") {
      return (
        <ClassroomVideoArchive
          school={school!}
          classes={classes}
          subjects={allSubjects}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          activeSession={activeSession}
          currentUserRole="TEACHER"
          currentTeacherName={teacherName}
          currentTeacherId={teacherId}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // Class 6-12 Notes Manager
    if (view === "class_notes_manager") {
      return (
        <ClassCurriculumNotesManager
          schoolId={schoolId}
          schoolName={school?.name}
          isSuperAdmin={false}
          isElite={isSchoolEliteCurriculum(school)}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // School Live Study Room
    if (view === "school_study_room") {
      return (
        <GroupStudyModal
          isOpen={true}
          onClose={() => setView("dashboard")}
          user={{
            id: teacherId,
            uid: teacherId,
            name: teacherName,
            role: "TEACHER",
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

    // 7. Homework Manager
    if (view === "homework") {
      return (
        <HomeworkManager
          school={school!}
          classes={classes}
          subjects={allSubjects}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          currentRole="TEACHER"
          currentTeacherId={teacherId}
          currentTeacherName={teacherName}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 8. Library Manager
    if (view === "library") {
      return (
        <LibraryManager
          school={school!}
          students={allStudents}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          classes={classes}
          isAdmin={true}
          currentTeacherId={teacherId}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 9. Parent Queries Helpdesk
    if (view === "parent_queries") {
      return (
        <ParentTeacherQueryManager
          school={school!}
          students={allStudents}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          classes={classes}
          currentUserRole="TEACHER"
          currentUserName={teacherName}
          currentUserId={teacherId}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 10. Messenger Broadcast Studio
    if (view === "messenger_broadcast") {
      return (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden">
          <NstaMessengerSuite
            school={school!}
            classes={classes}
            students={allStudents}
            teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
            currentUserId={teacherId}
            currentUserName={teacherName}
            currentUserRole="TEACHER"
            onBack={() => setView("dashboard")}
          />
        </div>
      );
    }

    // 11. Community Feed
    if (view === "community") {
      return (
        <SchoolCommunityFeed
          schoolId={schoolId}
          schoolName={school?.name || "School"}
          currentUserId={teacherId}
          currentUserName={teacherName}
          currentUserRole="TEACHER"
          classes={classes}
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 12. Student Leaves Desk
    if (view === "leaves_desk") {
      return (
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <ParentLeaveManager school={school} mode="TEACHER_ADMIN" />
        </div>
      );
    }

    // 13. Question Paper & Blueprint Builder
    if (view === "question_paper_builder") {
      return (
        <div className="space-y-4 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </div>
          <QuestionPaperBuilder school={school} activeSession={activeSession} />
        </div>
      );
    }

    // 14. PTM Slot Scheduler
    if (view === "ptm_scheduler") {
      return (
        <PtmSchedulerModal
          isOpen={true}
          onClose={() => setView("dashboard")}
          school={school}
          activeSession={activeSession}
          mode="ADMIN_TEACHER"
        />
      );
    }

    // Online Student Admission View (Teachers can register/admit new students)
    if (view === "online_admission") {
      if (!school) {
        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500">School details load ho rahi hain...</p>
          </div>
        );
      }
      return (
        <OnlineAdmissionManager
          school={school}
          classes={classes}
          sessions={sessions}
          activeSession={activeSession}
          isAdmin={true}
          viewMode="admissions_only"
          onBack={() => setView("dashboard")}
        />
      );
    }

    // 12. 10% Referral Incentive View (Permission protected: only shown if Admin enabled)
    if (view === "referrals") {
      if (!isReferralEligible) {
        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md mx-auto text-center border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto text-2xl">
              🔒
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              10% Referral Incentive Feature
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              यह सुविधा केवल स्कूल एडमिन द्वारा अनुमति प्राप्त शिक्षकों के लिए उपलब्ध है। यदि आपको रेफरल इंसेंटिव का लाभ चाहिए तो कृपया अपने स्कूल एडमिन/प्रिंसिपल से संपर्क करें।
            </p>
            <button
              type="button"
              onClick={() => setView("dashboard")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer transition shadow-sm"
            >
              ← Back to Teacher Dashboard
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-emerald-600" />
                My Student Admissions &amp; {referralSettings?.defaultCommissionPct ?? 10}% Referral Ledger
              </h2>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                Policy: {formatReferralDurationLabel(referralSettings?.commissionDuration || "1_year")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Aapke reference se aane wale har student ki jama (paid) fee par {referralSettings?.defaultCommissionPct ?? 10}% incentive banta hai.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>My Admissions</span>
                <Users className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black tabular-nums text-slate-900 dark:text-white mt-1">
                {myReferralSummary.studentsCount}
              </p>
              <span className="text-[10px] text-slate-400">Active students</span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Paid Fee</span>
                <IndianRupee className="w-4 h-4 text-teal-500" />
              </div>
              <p className="text-2xl font-black tabular-nums text-teal-600 dark:text-teal-400 mt-1">
                ₹{myReferralSummary.totalEligibleFeeCollected.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-slate-400">Excl. Bus fee</span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Earned Bonus</span>
                <Award className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{myReferralSummary.totalEarnedCommission.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold tabular-nums">
                Pending: ₹{myReferralSummary.totalPendingCommission.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Balance Due</span>
                <Wallet className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                ₹{myReferralSummary.balancePayable.toLocaleString("en-IN")}
              </p>
              <span className="text-[10px] text-slate-400 tabular-nums">
                Received: ₹{myReferralSummary.totalPaidOut.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Referred Students Breakdown
              </h3>
              <span className="text-[11px] font-bold tabular-nums text-slate-400">
                {myReferralSummary.students.length} records
              </span>
            </div>

            {myReferralSummary.students.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700 dark:text-slate-200">
                  Abhi aapke naam se koi student referral darj nahi hai.
                </p>
                <p>
                  Naye admission ke samay Admin ya Online Admission Form mein apna naam &ldquo;Referred By Teacher&rdquo; mein select karwayein.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300">
                    <tr>
                      <th className="p-3 font-bold">Student</th>
                      <th className="p-3 font-bold">Class</th>
                      <th className="p-3 font-bold text-right">Paid Fee</th>
                      <th className="p-3 font-bold text-right">Earned ({referralSettings?.defaultCommissionPct ?? 10}%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 tabular-nums">
                    {myReferralSummary.students.map((st) => (
                      <tr key={st.studentId}>
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          <div>{st.studentName}</div>
                          <div className="text-[10px] text-slate-400">Adm #{st.admissionNo}</div>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{st.className}</td>
                        <td className="p-3 text-right font-bold text-slate-700 dark:text-slate-200">
                          ₹{st.eligiblePaidExclBus.toLocaleString("en-IN")}
                        </td>
                        <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                          ₹{st.earnedCommission.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 13. All Students Directory View
    if (view === "all_students") {
      return (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">Students Directory</h2>
              <p className="text-xs text-slate-500">Total {filteredStudents.length} students found</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFaceStudio(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>📷 लाइव फेस आईडी</span>
              </button>
              <button
                onClick={() => setView("classes")}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
              >
                View by Class
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, admission no, or mobile..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-blue-500 transition shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedClassFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                selectedClassFilter === "ALL"
                  ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              All Classes ({allStudents.length})
            </button>
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassFilter(cls.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedClassFilter === cls.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {filteredStudents.slice(0, 100).map((st) => (
              <div
                key={st.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-400 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
                    {st.rollNo || "•"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{st.name}</p>
                      <span className="px-2 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                        {st.className || classes.find((c) => c.id === st.classId)?.name || "Class"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span>Adm: <strong className="text-slate-600 dark:text-slate-300">{st.admissionNo}</strong></span>
                      {st.fatherName && <span>Father: <strong className="text-slate-600 dark:text-slate-300">{st.fatherName}</strong></span>}
                      {st.phone && (
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{st.phone}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      const matchedClass = classes.find((c) => c.id === st.classId || c.name === st.className) || classes[0];
                      if (matchedClass) {
                        setSelectedClass(matchedClass);
                        setView("attendance");
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-300 font-bold text-xs border border-green-200 dark:border-green-800 hover:bg-green-100 transition cursor-pointer"
                  >
                    Attendance
                  </button>
                  <button
                    onClick={() => {
                      const matchedClass = classes.find((c) => c.id === st.classId || c.name === st.className) || classes[0];
                      if (matchedClass) {
                        setSelectedClass(matchedClass);
                        setView("marks");
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 font-bold text-xs border border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition cursor-pointer"
                  >
                    Marks
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 14. Classes View
    if (view === "classes") {
      return (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Select a Class to Manage:</p>
            <button
              onClick={() => setView("all_students")}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Students ({allStudents.length})</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {sortSchoolClasses(classes).map((cls) => {
              const count = studentCountByClass[cls.id] || 0;
              return (
                <div
                  key={cls.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-400 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-black text-lg flex items-center justify-center shrink-0 border border-emerald-500/20">
                      {cls.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-black text-base text-slate-900 dark:text-white">{cls.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{count} Enrolled Students</span>
                        {cls.section && <span>• Section {cls.section}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setView("attendance");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition cursor-pointer"
                    >
                      Attendance
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setView("marks");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold transition cursor-pointer"
                    >
                      Marks
                    </button>
                    <button
                      onClick={() => {
                        setSelectedClass(cls);
                        setView("subjects");
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                    >
                      Books &amp; Smart Class →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 15. Subjects View
    if (view === "subjects") {
      const activeClass = selectedClass || classes[0] || null;
      if (!activeClass) {
        return (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <BookOpen className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Pehle Class Select Karein</h3>
            <button
              onClick={() => setView("classes")}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Go to Classes
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {activeClass.name} — Subjects &amp; Curriculum Books
              </h2>
              <p className="text-xs text-slate-500">Digital chapters, reading and smart writing board</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddBooksModal(true);
                setSelectedBooksQueue([]);
                setCustomBooksInput("");
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Books</span>
            </button>
          </div>

          {booksFeedback && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200">
              {booksFeedback}
            </div>
          )}

          {/* Add Books Modal */}
          {showAddBooksModal && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Quick Add Subjects in {activeClass.name}
                </h3>
                <button onClick={() => setShowAddBooksModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {COMMON_BOOK_PRESETS.map((p) => {
                  const isQueued = selectedBooksQueue.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setSelectedBooksQueue((prev) =>
                          isQueued ? prev.filter((b) => b !== p.name) : [...prev, p.name]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isQueued
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                      }`}
                    >
                      <span>{p.icon}</span>
                      <span>{p.name}</span>
                    </button>
                  );
                })}
              </div>

              {selectedBooksQueue.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleSaveAllBooks}
                    disabled={savingBooks}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                  >
                    {savingBooks ? "Saving..." : `Save ${selectedBooksQueue.length} Books`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBooksQueue([])}
                    className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Subjects List */}
          <div className="space-y-2.5">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-black text-sm flex items-center justify-center shrink-0 border border-purple-200/50">
                    <Book className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-base truncate">{sub.name}</p>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">✓ Enrolled Book</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSubject(sub);
                      setView("lessons");
                    }}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lessons / Chapters</span>
                  </button>
                  {confirmDeleteSubjectId === sub.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDeleteSubject(sub)}
                        className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteSubjectId(null)}
                        className="px-2 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteSubjectId(sub.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl transition cursor-pointer"
                      title="Delete Book"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {subjects.length === 0 && (
              <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-black text-base text-slate-700 dark:text-slate-200">
                  {activeClass.name} me abhi tak koi subject / book add nahi hai
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBooksModal(true);
                    setSelectedBooksQueue([]);
                  }}
                  className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Books Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 16. Lessons View
    if (view === "lessons" && selectedSubject) {
      return (
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500 font-medium">
              Lessons — <strong className="text-slate-800 dark:text-slate-100 font-bold">{selectedSubject.name}</strong>
            </p>
            <button
              onClick={() => setView("subjects")}
              className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
            >
              ← Back to Subjects
            </button>
          </div>

          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{lesson.order}</span>
                </div>
                <p className="flex-1 font-bold text-slate-900 dark:text-white text-sm">{lesson.title}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {lesson.features?.readingEnabled && (
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setSmartMode("reading");
                      setView("smart_class");
                    }}
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Reading Mode
                  </button>
                )}
                {lesson.features?.writingEnabled && (
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setSmartMode("writing");
                      setView("smart_class");
                    }}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Writing Mode
                  </button>
                )}
                {lesson.features?.pdfEnabled && (
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setSmartMode("pdf");
                      setView("smart_class");
                    }}
                    className="py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF Viewer
                  </button>
                )}
                {lesson.features?.mcqEnabled && (
                  <button
                    onClick={() => {
                      setSelectedLesson(lesson);
                      setSmartMode("mcq");
                      setView("smart_class");
                    }}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Live MCQs
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // ── DEFAULT: HOME DASHBOARD VIEW ─────────────────────────────────────────
    return (
      <div className="space-y-5 animate-in fade-in duration-200">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setView("classes")}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-emerald-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">My Classes</span>
              <BookOpen className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">{classes.length || 0}</p>
            <span className="text-[10px] text-slate-400">Active class sections</span>
          </div>

          <div
            onClick={() => setView("all_students")}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-blue-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Students</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400 mt-1">{allStudents.length || 0}</p>
            <span className="text-[10px] text-slate-400">Enrolled &amp; synced</span>
          </div>

          <div
            onClick={() => setView("classes")}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-purple-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Subjects</span>
              <FileText className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-black tabular-nums text-purple-600 dark:text-purple-400 mt-1">
              {allSubjects.length}
            </p>
            <span className="text-[10px] text-slate-400">Curriculum books</span>
          </div>

          <div
            onClick={() => setView("community")}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-rose-500 transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Community</span>
              <Megaphone className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">Live</p>
            <span className="text-[10px] text-slate-400">Photos, Videos &amp; Notices</span>
          </div>
        </div>

        {/* ── TODAY'S BIRTHDAYS (TEACHER NO-PUNISHMENT ALERT) ── */}
        {todaysTeacherBirthdays.length > 0 && (
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white shadow-xl border-2 border-white/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
                🎂
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-rose-700 shadow-xs">
                    🛡️ NO PUNISHMENT POLICY
                  </span>
                  <span className="text-xs text-rose-100 font-bold">
                    आज {todaysTeacherBirthdays.length} छात्र का जन्मदिन है!
                  </span>
                </div>
                <h4 className="font-black text-sm sm:text-base text-white mt-0.5">
                  🎉 आज जन्मदिन है: {todaysTeacherBirthdays.map((s) => s.name).join(", ")}
                </h4>
                <p className="text-xs text-rose-100/90 font-medium">
                  शिक्षकों से अनुरोध: आज इन बच्चों को किसी भी बात पर डांटें या दंडित (punish) न करें। स्कूल की ओर से उन्हें जन्मदिन का शुभाशीर्वाद दें।
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const target = selectedClass || classes[0] || null;
                if (target) setSelectedClass(target);
                setView("attendance");
              }}
              className="px-4 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs shrink-0 transition active:scale-95 shadow cursor-pointer self-start sm:self-center"
            >
              उपस्थिति में देखें →
            </button>
          </div>
        )}

        {/* Broadcast Studio Quick Card */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 text-white shadow-xl border-2 border-indigo-500/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-indigo-600/40 ring-2 ring-indigo-400/50">
              <Bell className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-sm sm:text-base text-white">Class Messenger &amp; Push Alerts</h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">PRO ⚡ LIVE</span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Apni class ke sabhi students/parents ko instant 1-way broadcast, homework aur notice alerts bhejein.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setView("messenger_broadcast")}
            className="py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <span>Broadcast Studio</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Launchpad Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
              Teacher Actions &amp; Modules
            </h3>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Real-Time Sync Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Mark Attendance */}
            <button
              type="button"
              onClick={() => {
                const target = selectedClass || classes[0] || null;
                if (target) setSelectedClass(target);
                setView("attendance");
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Mark Attendance</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Present, Absent &amp; Late</p>
              </div>
            </button>

            {/* Live Face ID Studio */}
            <button
              type="button"
              onClick={() => setShowFaceStudio(true)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-300 dark:border-emerald-800/60 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-500 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Live 📷</span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Live Face ID</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Enroll &amp; Match Test</p>
              </div>
            </button>

            {/* Absenty Action Center */}
            <button
              type="button"
              onClick={() => setView("absentee")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-rose-300 dark:border-rose-800/60 flex flex-col justify-between gap-3 hover:shadow-md hover:border-rose-500 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-md">
                  <Bell className="w-5 h-5 animate-pulse" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 text-rose-700">1-Day &amp; 2-Day</span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Absenty Center</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Push Alert &amp; Call</p>
              </div>
            </button>

            {/* Marks & Exam Entry */}
            <button
              type="button"
              onClick={() => {
                const target = selectedClass || classes[0] || null;
                if (target) setSelectedClass(target);
                setView("marks");
              }}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-purple-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Exam Marks Entry</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Unit Test, Half Yearly &amp; Annual</p>
              </div>
            </button>

            {/* Daily Homework */}
            <button
              type="button"
              onClick={() => setView("homework")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-amber-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">DIARY</span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Daily Homework</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Daily class diary &amp; notes</p>
              </div>
            </button>

            {/* Timetable */}
            <button
              type="button"
              onClick={() => setView("timetable")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-blue-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">ROUTINE</span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Timetable &amp; Routine</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Period schedule</p>
              </div>
            </button>

            {/* Video Archive */}
            <button
              type="button"
              onClick={() => setView("video_lectures")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-red-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                  <Youtube className="w-5 h-5" />
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">VIDEO</span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Video Archive</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">YouTube lecture links</p>
              </div>
            </button>

            {/* Parent Queries */}
            <button
              type="button"
              onClick={() => setView("parent_queries")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-cyan-400 transition text-left cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Parent Queries &amp; Leaves</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Leaves &amp; chat queries</p>
              </div>
            </button>

            {/* Online Admission (Teachers can admit new students) */}
            <button
              type="button"
              onClick={() => setView("online_admission")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-emerald-300 dark:border-emerald-800/70 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-500 transition text-left cursor-pointer group"
            >
              <div className="flex items-center justify-between w-full">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                  New Adm
                </span>
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">Online Admission</p>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">नया छात्र प्रवेश फॉर्म भरें</p>
              </div>
            </button>

            {/* 10% Referrals (Only shown if Admin explicitly enabled for this teacher) */}
            {isReferralEligible && (
              <button
                type="button"
                onClick={() => setView("referrals")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-purple-300 dark:border-purple-800/70 flex flex-col justify-between gap-3 hover:shadow-md hover:border-purple-500 transition text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800">
                    {myReferralSummary.studentsCount > 0
                      ? `₹${myReferralSummary.totalEarnedCommission.toLocaleString("en-IN")}`
                      : "10% BONUS"}
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm">10% Referral Ledger</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">Student referral bonus</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── MASTER TEACHER ERP SHELL (LEFT SIDEBAR & MOBILE DRAWER) ────────────────
  const renderTeacherShell = (content: React.ReactNode) => {
    return (
      <div className={`h-screen h-[100dvh] max-h-screen overflow-hidden flex transition-colors duration-200 teacher-theme-${appTheme} app-theme-${appTheme} ${
        appTheme === "white"
          ? "bg-slate-100 text-slate-900"
          : appTheme === "black"
          ? "bg-black text-white"
          : "bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
      } w-full relative`}>
        {/* Left Sidebar (fixed on desktop or landscape, never scrolls with page) */}
        {renderDesktopSidebar()}

        {/* Mobile Slide-Out Drawer (only when in portrait and drawer toggled) */}
        {!isEffectiveLandscape && isSidebarOpen && renderMobileSidebarDrawer()}

        {/* 1% Ultra-slim left edge indicator on mobile portrait when drawer is hidden */}
        {!isEffectiveLandscape && !isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(true)}
            className="fixed left-0 top-1/2 -translate-y-1/2 w-2.5 h-20 rounded-r-full bg-gradient-to-b from-indigo-500 via-amber-400 to-indigo-500 opacity-60 hover:opacity-100 hover:w-3.5 transition-all z-30 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.5)] flex items-center justify-center group"
            title="Swipe Right करके मेनू खोलें (1% Visible)"
          >
            <ChevronRight className="w-2.5 h-2.5 text-slate-950 font-bold group-hover:translate-x-0.5 transition-transform" />
          </div>
        )}

        {/* Main Content Area (Independent scroll container) */}
        <div className={`flex-1 flex flex-col min-w-0 h-screen h-[100dvh] max-h-screen overflow-y-auto ${
          isEffectiveLandscape ? "overflow-x-auto" : "overflow-x-hidden"
        }`}>
          {renderTopHeader()}
          <main className={`flex-1 p-2.5 sm:p-4 lg:p-5 w-full mx-auto pb-16 md:pb-12 ${
            isEffectiveLandscape ? "min-w-[980px] sm:min-w-0 max-w-7xl" : "max-w-7xl"
          }`}>
            {content}
          </main>
        </div>

        {/* Screen rotate floating prompt if needed */}
        {showRotatePrompt && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-cyan-400/40 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300 max-w-sm text-center">
            <Laptop className="w-5 h-5 text-cyan-400 shrink-0" />
            <p className="text-xs font-bold text-cyan-200">
              💻 Laptop (Desktop) मोड सक्रिय है! आप फोन को आड़ा (Landscape) करके पूरे लैपटॉप व्यू का उपयोग कर सकते हैं।
            </p>
          </div>
        )}
      </div>
    );
  };

  const schoolExpIso = school?.subscription?.expiresAt || school?.subscription?.paidUntil;
  const isSchoolSubExpired = schoolExpIso ? new Date(schoolExpIso).getTime() <= Date.now() : false;

  if (isSchoolSubExpired && school) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="max-w-md w-full bg-slate-900 border-2 border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600 flex items-center justify-center text-3xl">
            🔒
          </div>
          <h2 className="text-xl font-black text-white">School Subscription Expired</h2>
          <p className="text-xs text-red-400 font-bold">Access Terminated (स्कूल मॉड्यूल लॉक हैं)</p>
          <p className="text-xs text-slate-300">
            Aapke school ({school.name}) ka subscription plan samapt ho chuka hai. Kripya school administration ya principal se contact karein.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {renderTeacherShell(renderViewContent())}
      {showFaceStudio && (
        <UniversalFaceIdStudioModal
          isOpen={showFaceStudio}
          onClose={() => setShowFaceStudio(false)}
          schoolId={schoolId}
          students={allStudents}
          teachers={currentTeacher ? [currentTeacher] : []}
          classes={classes}
          onEnrollmentUpdated={() => {}}
        />
      )}
    </>
  );
};

export default TeacherPanel;
