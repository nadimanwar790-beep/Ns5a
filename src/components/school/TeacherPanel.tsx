// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  subscribeToClasses, subscribeToSubjects, subscribeToStudents,
  subscribeToAllStudents, subscribeToLessons, getSchool, getSessions,
  getSubjects, getStudents, shouldUseDemoForSchool, isDemoRecord,
  saveSubject, saveMultipleSubjects, generateId, deleteSubject,
  getSchoolFeeHistory, getReferralPayouts, getSchoolReferralSettings
} from "../../school-firebase";
import { getDemoSchoolDataset } from "./demoDataStore";
import type {
  School, SchoolClass, SchoolSubject, SchoolLesson, SchoolStudent, SchoolSession,
  MonthlyFee, TeacherReferralPayout, SchoolReferralSettings
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
  Youtube
} from "lucide-react";
import { TimetableManager } from "./TimetableManager";
import { ClassroomVideoArchive } from "./ClassroomVideoArchive";
import { HomeworkManager } from "./HomeworkManager";
import { LibraryManager } from "./LibraryManager";
import { ParentTeacherQueryManager } from "./ParentTeacherQueryManager";
import { SchoolMessengerBroadcastStudio } from "./SchoolMessengerBroadcastStudio";
import { NstaMessengerSuite } from "./NstaMessengerSuite";

interface Props {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  onBack?: () => void;
  onLogout?: () => void;
}

type TeacherView =
  | "dashboard"
  | "community"
  | "all_students"
  | "classes"
  | "class_students"
  | "subjects"
  | "lessons"
  | "attendance"
  | "marks"
  | "smart_class"
  | "content_manage"
  | "timetable"
  | "video_lectures"
  | "homework"
  | "library"
  | "parent_queries"
  | "referrals"
  | "messenger_broadcast";

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
  // Senior Secondary Stream Subjects (Class 11 & 12)
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
  // Senior Secondary Stream Bundles
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

export const TeacherPanel: React.FC<Props> = ({ schoolId, teacherId, teacherName, onBack, onLogout }) => {
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

  // Students state
  const [allStudents, setAllStudents] = useState<SchoolStudent[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>("ALL");

  // Multi-book addition state
  const [showAddBooksModal, setShowAddBooksModal] = useState(false);
  const [customBooksInput, setCustomBooksInput] = useState("");
  const [selectedBooksQueue, setSelectedBooksQueue] = useState<string[]>([]);
  const [savingBooks, setSavingBooks] = useState(false);
  const [booksFeedback, setBooksFeedback] = useState<string | null>(null);

  // Teacher 10% Referral Incentive state
  const [schoolFees, setSchoolFees] = useState<MonthlyFee[]>([]);
  const [referralPayouts, setReferralPayouts] = useState<TeacherReferralPayout[]>([]);
  const [referralSettings, setReferralSettings] = useState<SchoolReferralSettings | null>(null);

  // Initial load
  useEffect(() => {
    // 1. Get School Info
    getSchool(schoolId).then(s => setSchool(s));

    // 2. Load Sessions
    getSessions(schoolId).then(sess => {
      setSessions(sess);
      const active = sess.find(s => s.active) || sess[0] || null;
      setActiveSession(active);
    });

    const useDemo = shouldUseDemoForSchool(schoolId);

    // 3. Load All Students immediately — strictly isolate real school data
    const unsubStudents = subscribeToAllStudents(schoolId, (stds) => {
      if (stds && stds.length > 0) {
        const clean = !useDemo ? stds.filter(s => !isDemoRecord(s)) : stds;
        setAllStudents(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        if (demo && demo.students) setAllStudents(demo.students);
      } else {
        setAllStudents([]);
      }
    });

    // 4. Load All Subjects for top stats — never leak 166 demo subjects to real schools
    getSubjects(schoolId).then(subs => {
      if (subs && subs.length > 0) {
        const clean = !useDemo ? subs.filter(s => !isDemoRecord(s)) : subs;
        setAllSubjects(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        if (demo && demo.subjects) setAllSubjects(demo.subjects);
      } else {
        setAllSubjects([]);
      }
    });

    // 5. Load Fee History, Referral Payouts & Referral Policy for Teacher 10% Commission
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
    };
  }, [schoolId]);

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

  // Subscribe to classes for the active session — strictly isolate real school
  useEffect(() => {
    const useDemo = shouldUseDemoForSchool(schoolId);
    const unsub = subscribeToClasses(schoolId, activeSession?.id || "", (clsList) => {
      if (clsList && clsList.length > 0) {
        const clean = !useDemo ? clsList.filter(c => !isDemoRecord(c)) : clsList;
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

  // Subscribe to subjects when a class is selected — strictly isolate real school
  useEffect(() => {
    if (!selectedClass) return;
    const useDemo = shouldUseDemoForSchool(schoolId);
    const unsub = subscribeToSubjects(schoolId, selectedClass.id, (subs) => {
      if (subs && subs.length > 0) {
        const clean = !useDemo ? subs.filter(s => !isDemoRecord(s)) : subs;
        setSubjects(clean);
      } else if (useDemo) {
        const demo = getDemoSchoolDataset();
        const found = demo.subjects.filter(s => s.classId === selectedClass.id || s.className === selectedClass.name);
        setSubjects(found.length > 0 ? found : demo.subjects.slice(0, 6));
      } else {
        setSubjects([]);
      }
    });
    return unsub;
  }, [schoolId, selectedClass]);

  // Subscribe to lessons when a subject is selected
  useEffect(() => {
    if (!selectedSubject) return;
    const unsub = subscribeToLessons(schoolId, selectedSubject.id, (lesList) => {
      if (lesList && lesList.length > 0) {
        setLessons(lesList);
      } else {
        // Fallback default sample lessons so smart class works seamlessly
        setLessons([
          {
            id: `les_${selectedSubject.id}_1`,
            schoolId,
            subjectId: selectedSubject.id,
            title: `Chapter 1: ${selectedSubject.name} - Fundamentals & Key Concepts`,
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
          },
          {
            id: `les_${selectedSubject.id}_2`,
            schoolId,
            subjectId: selectedSubject.id,
            title: `Chapter 2: Advanced Applications & Question Bank`,
            order: 2,
            features: { readingEnabled: true, writingEnabled: true, pdfEnabled: true, mcqEnabled: true },
            readingContent: `## Chapter 2: Problem Solving & Practice\n\nFollow the step-by-step methods and exam guidelines.`,
            writingPrompt: `Describe two practical experiments or exercises covered in this chapter.`,
            mcqQuestions: [
              {
                id: "q2",
                question: "Which approach yields best results in exams?",
                options: ["Consistent daily revision", "Last minute cramming", "Leaving answers blank", "None"],
                correctOption: 0,
                explanation: "Consistent revision ensures peak memory recall."
              }
            ],
            createdAt: new Date().toISOString()
          }
        ]);
      }
    });
    return unsub;
  }, [schoolId, selectedSubject]);

  // Filtered students for Directory View
  const filteredStudents = useMemo(() => {
    return allStudents.filter(s => {
      const q = studentSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.rollNo && s.rollNo.toString().toLowerCase().includes(q)) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.fatherName && s.fatherName.toLowerCase().includes(q));

      const matchClass =
        selectedClassFilter === "ALL" ||
        s.classId === selectedClassFilter ||
        (s.className && s.className.toLowerCase().replace(/\s+/g, '').includes(selectedClassFilter.toLowerCase().replace(/\s+/g, '')));

      return matchSearch && matchClass;
    });
  }, [allStudents, studentSearch, selectedClassFilter]);

  // Students of selected class
  const classStudents = useMemo(() => {
    if (!selectedClass) return [];
    return allStudents.filter(s =>
      s.classId === selectedClass.id ||
      (s.className && s.className.toLowerCase().replace(/\s+/g, '') === selectedClass.name.toLowerCase().replace(/\s+/g, ''))
    ).sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0));
  }, [allStudents, selectedClass]);

  // Count of students per class
  const studentCountByClass = useMemo(() => {
    const map: Record<string, number> = {};
    allStudents.forEach(s => {
      if (s.classId) map[s.classId] = (map[s.classId] || 0) + 1;
      if (s.className) map[s.className] = (map[s.className] || 0) + 1;
    });
    return map;
  }, [allStudents]);

  // Multi-book management handlers
  const handleToggleBook = (bookName: string) => {
    setSelectedBooksQueue(prev =>
      prev.includes(bookName) ? prev.filter(b => b !== bookName) : [...prev, bookName]
    );
  };

  const handleApplyBundle = (books: string[]) => {
    setSelectedBooksQueue(prev => {
      const set = new Set(prev);
      books.forEach(b => set.add(b));
      return Array.from(set);
    });
  };

  const handleAddCustomBooks = () => {
    if (!customBooksInput.trim()) return;
    const parts = customBooksInput
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setSelectedBooksQueue(prev => {
      const set = new Set(prev);
      parts.forEach(b => set.add(b));
      return Array.from(set);
    });
    setCustomBooksInput("");
  };

  const handleRemoveQueuedBook = (bookName: string) => {
    setSelectedBooksQueue(prev => prev.filter(b => b !== bookName));
  };

  const handleSaveAllBooks = async () => {
    if (!selectedClass || selectedBooksQueue.length === 0) return;
    setSavingBooks(true);
    setBooksFeedback(null);
    try {
      const existingNames = new Set(subjects.map(s => (s.name || "").trim().toLowerCase()));
      const toAdd = selectedBooksQueue.filter(name => !existingNames.has(name.trim().toLowerCase()));

      if (toAdd.length === 0) {
        setBooksFeedback("Ye sabhi books pehle se is class me add hain!");
        setSavingBooks(false);
        return;
      }

      const newSubs: SchoolSubject[] = toAdd.map(name => ({
        id: generateId(),
        schoolId,
        sessionId: activeSession?.id || "",
        classId: selectedClass.id,
        className: selectedClass.name,
        name: name.trim(),
        createdAt: new Date().toISOString()
      }));

      await saveMultipleSubjects(newSubs);

      // Immediately update local state
      setSubjects(prev => [...prev, ...newSubs]);
      setAllSubjects(prev => [...prev, ...newSubs]);
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
    if (!confirm(`Kya aap "${sub.name}" book/subject ko delete karna chahte hain?`)) return;
    try {
      await deleteSubject(schoolId, sub.id);
      setSubjects(prev => prev.filter(s => s.id !== sub.id));
      setAllSubjects(prev => prev.filter(s => s.id !== sub.id));
    } catch (err) {
      alert("Error deleting subject");
    }
  };

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

  const renderBottomNav = () => {
    const openAttendance = () => {
      const target = selectedClass || classes[0] || null;
      if (target) {
        setSelectedClass(target);
        setView("attendance");
      } else {
        setView("classes");
      }
    };
    const openMarks = () => {
      const target = selectedClass || classes[0] || null;
      if (target) {
        setSelectedClass(target);
        setView("marks");
      } else {
        setView("classes");
      }
    };

    const items = [
      { key: "dashboard", label: "Home", active: view === "dashboard", icon: Home, onClick: () => setView("dashboard") },
      { key: "attendance", label: "Attendance", active: view === "attendance", icon: ClipboardList, onClick: openAttendance },
      { key: "classes", label: "Classes", active: view === "classes" || view === "class_students" || view === "subjects" || view === "lessons", icon: BookOpen, onClick: () => setView("classes") },
      { key: "community", label: "Community", active: view === "community", icon: Megaphone, onClick: () => setView("community") },
      { key: "marks", label: "Marks", active: view === "marks", icon: Edit3, onClick: openMarks },
    ];

    return (
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5 px-2 py-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={item.onClick}
                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl transition cursor-pointer ${
                  item.active
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 font-black"
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

  if (view === "attendance" && selectedClass) {
    return (
      <div className="pb-20">
        <AttendanceManager
          schoolId={schoolId}
          classId={selectedClass.id}
          className={selectedClass.name}
          teacherId={teacherId}
          onBack={() => setView("dashboard")}
        />
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "marks" && selectedClass) {
    return (
      <div className="pb-20">
        <MarksManager
          schoolId={schoolId}
          classId={selectedClass.id}
          className={selectedClass.name}
          sessionId={activeSession?.id || "demo_session_2026_27"}
          teacherId={teacherId}
          subjectId={selectedSubject?.id}
          subjectName={selectedSubject?.name}
          onBack={() => setView("dashboard")}
        />
        {renderBottomNav()}
      </div>
    );
  }

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
        onOpenLesson={(lesson, mode) => { setSelectedLesson(lesson); setSmartMode(mode); setView("smart_class"); }}
      />
    );
  }

  if (view === "timetable") {
    return (
      <div className="pb-20">
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
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "video_lectures") {
    return (
      <div className="pb-20">
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
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "homework") {
    return (
      <div className="pb-20">
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
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "library") {
    return (
      <div className="pb-20">
        <LibraryManager
          school={school!}
          students={allStudents}
          teachers={[{ id: teacherId, name: teacherName, schoolId } as any]}
          classes={classes}
          isAdmin={true}
          currentTeacherId={teacherId}
          onBack={() => setView("dashboard")}
        />
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "parent_queries") {
    return (
      <div className="pb-20">
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
        {renderBottomNav()}
      </div>
    );
  }

  if (view === "messenger_broadcast") {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col">
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

  const goBack = () => {
    if (view === "lessons") setView("subjects");
    else if (view === "subjects" || view === "class_students") setView("classes");
    else setView("dashboard");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-none pb-24">
      {/* ── TOP HEADER ── */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-4 py-5 shadow-lg border-b border-emerald-800/40">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {view !== "dashboard" ? (
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-emerald-300 text-xs sm:text-sm font-bold hover:text-white transition cursor-pointer px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Dashboard
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>TEACHER ACTIVE</span>
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.removeItem("nst_current_user");
                    localStorage.removeItem("nsta_cached_user");
                    localStorage.removeItem("nst_is_guest");
                    localStorage.setItem("nst_logged_out", "true");
                  } catch (e) {}
                  if (onLogout) onLogout();
                  else if (onBack) onBack();
                  else window.location.reload();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold active:scale-95 cursor-pointer transition shadow-sm shadow-rose-950/30"
                title="Logout (लॉगआउट)"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <p className="text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Teacher Academic Dashboard</span>
          </p>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{teacherName}</h1>
          <p className="text-emerald-200/80 text-xs mt-0.5 font-medium">
            {school?.name || "Nstz"} • {activeSession?.name || "Academic Session 2026-27"}
          </p>
        </div>
      </div>

      {/* ── SCHOOL COMMUNITY HUB VIEW ── */}
      {view === "community" && (
        <div className="p-3 sm:p-4 max-w-3xl mx-auto">
          <SchoolCommunityFeed
            schoolId={schoolId}
            schoolName={school?.name || "School"}
            currentUserId={teacherId}
            currentUserName={teacherName}
            currentUserRole="TEACHER"
            classes={classes}
            onBack={() => setView("dashboard")}
          />
        </div>
      )}

      {/* ── DASHBOARD VIEW (Clean Multi-Section Launchpad Grid) ── */}
      {view === "dashboard" && (
        <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              onClick={() => setView("classes")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">My Classes</span>
                <BookOpen className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">{classes.length || 0}</p>
              <span className="text-[10px] text-slate-400">Active grades</span>
            </div>

            <div
              onClick={() => setView("all_students")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
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
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
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
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Community</span>
                <Megaphone className="w-4 h-4 text-rose-500" />
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">Live</p>
              <span className="text-[10px] text-slate-400">Photos, Videos &amp; Notices</span>
            </div>
          </div>

          {/* ── TEACHER CLASS BROADCAST QUICK HERO ───────────────────────── */}
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

          {/* Clean Section Button Grid (Tap to open separate section) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Teacher Sections (Tap to Open)
              </h3>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                Real-Time Sync Active
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* 1. School Community Hub */}
              <button
                type="button"
                onClick={() => setView("community")}
                className="bg-gradient-to-br from-rose-500/10 via-white to-amber-500/10 dark:from-rose-950/40 dark:via-slate-800 dark:to-amber-950/30 rounded-2xl p-4 shadow-sm border border-rose-200/80 dark:border-rose-800/60 flex flex-col justify-between gap-3 hover:shadow-md hover:border-rose-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white">
                    NEW • LIVE
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    School Community
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Photo, Video, Chhutti Notice &amp; Homework post karein
                  </p>
                </div>
              </button>

              {/* 2. Mark Daily Attendance */}
              <button
                type="button"
                onClick={() => {
                  const target = selectedClass || classes[0] || null;
                  if (target) {
                    setSelectedClass(target);
                    setView("attendance");
                  } else {
                    setView("classes");
                  }
                }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-orange-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Mark Attendance
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Present, Absent, Late &amp; Leave live update karein
                  </p>
                </div>
              </button>

              {/* 3. My Classes & Lessons */}
              <button
                type="button"
                onClick={() => setView("classes")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {classes.length} Classes
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    My Classes &amp; Lessons
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Class roster, subjects aur chapter notes manage karein
                  </p>
                </div>
              </button>

              {/* 4. Marks Entry */}
              <button
                type="button"
                onClick={() => {
                  const target = selectedClass || classes[0] || null;
                  if (target) {
                    setSelectedClass(target);
                    setView("marks");
                  } else {
                    setView("classes");
                  }
                }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-purple-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Marks &amp; Exam Entry
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    PA-1, Half Yearly aur Annual marks live chadhayein
                  </p>
                </div>
              </button>

              {/* 5. Students Directory */}
              <button
                type="button"
                onClick={() => setView("all_students")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-blue-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {allStudents.length}
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Students Directory
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Roll no, admission no aur parent contact search karein
                  </p>
                </div>
              </button>

              {/* 6. Smart Class Interactive */}
              <button
                type="button"
                onClick={() => setView("classes")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-teal-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Play className="w-5 h-5" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Smart Class Board
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Digital reading, writing board, PDF aur live MCQ chalayein
                  </p>
                </div>
              </button>

              {/* 7. Daily Homework & Class Diary */}
              <button
                type="button"
                onClick={() => setView("homework")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-purple-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300">
                    DIARY
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Daily Homework
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Classwork, homework aur notebook submission manage karein
                  </p>
                </div>
              </button>

              {/* 8. Timetable & Periods */}
              <button
                type="button"
                onClick={() => setView("timetable")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-amber-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    ROUTINE
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Weekly Timetable
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Apna class routine aur period schedule dekhein
                  </p>
                </div>
              </button>

              {/* 9. Classroom YouTube Video Archive */}
              <button
                type="button"
                onClick={() => setView("video_lectures")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-red-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
                    <Youtube className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                    LECTURES 🔴
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Class Video Archive
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Daily class YouTube links attach karein aur revision archive dekhein
                  </p>
                </div>
              </button>

              {/* Class Messenger Broadcast (NSTA Messenger) */}
              <button
                type="button"
                onClick={() => setView("messenger_broadcast")}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-2xl p-4 shadow-sm border-2 border-indigo-300 dark:border-indigo-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-indigo-500 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                    <Bell className="w-5 h-5 animate-pulse" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-400 text-slate-950">
                    BROADCAST ⚡
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Class Messenger &amp; Push
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                    Apni class ke parents/students ko instant 1-way broadcast aur notices bhejein
                  </p>
                </div>
              </button>

              {/* 9. Parent-Teacher Queries */}
              <button
                type="button"
                onClick={() => setView("parent_queries")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-blue-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    HELPDESK
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Parent Queries &amp; Leaves
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Parents ke prashnon ka jawab dein aur chhutti approve karein
                  </p>
                </div>
              </button>

              {/* 10. Library Books */}
              <button
                type="button"
                onClick={() => setView("library")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-400 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Book className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    LIBRARY
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    Library Catalog
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    Books issue karein aur library catalog search karein
                  </p>
                </div>
              </button>

              {/* 11. Student Referrals (10% Commission) */}
              <button
                type="button"
                onClick={() => setView("referrals")}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between gap-3 hover:shadow-md hover:border-emerald-500 transition active:scale-[0.98] text-left cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black tabular-nums bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {myReferralSummary.studentsCount > 0
                      ? `₹${myReferralSummary.totalEarnedCommission.toLocaleString("en-IN")}`
                      : `${referralSettings?.defaultCommissionPct ?? 10}% BONUS`}
                  </span>
                </div>
                <div>
                  <p className="font-black text-slate-900 dark:text-white text-sm leading-snug">
                    My Student Referrals
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                    {myReferralSummary.studentsCount > 0
                      ? `${myReferralSummary.studentsCount} students admitted • Balance ₹${myReferralSummary.balancePayable.toLocaleString("en-IN")}`
                      : "Apne dwara laye gaye admissions aur 10% incentive dekhein"}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MY STUDENT REFERRALS (10% INCENTIVE) VIEW ── */}
      {view === "referrals" && (
        <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
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
              Aapke reference se aane wale har student ki jama (paid) fee par {referralSettings?.defaultCommissionPct ?? 10}% incentive banta hai (Bus/Transport fee aur sibling discount ghatane ke baad • School Admin dwara nirdharit avadhi: {formatReferralDurationLabel(referralSettings?.commissionDuration || "1_year")}).
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
              <span className="text-[10px] text-slate-400">Excl. Bus/Van fee</span>
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
                Unpaid fee locked: ₹{myReferralSummary.totalPendingCommission.toLocaleString("en-IN")}
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
                      <th className="p-3 font-bold text-right">Pending Fee Bonus</th>
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
                        <td className="p-3 text-right text-amber-600 dark:text-amber-400">
                          ₹{st.pendingCommission.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {myReferralSummary.payouts.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Received Commission Payouts
              </h3>
              <div className="space-y-2">
                {myReferralSummary.payouts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{p.paymentMode}</span>
                      {p.remarks && <span className="text-slate-500 ml-2">— {p.remarks}</span>}
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        +₹{p.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-2">{p.paidDate}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALL STUDENTS DIRECTORY VIEW ── */}
      {view === "all_students" && (
        <div className="p-3 sm:p-4 space-y-3.5 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">School Students Directory</h2>
              <p className="text-xs text-slate-500">Total {filteredStudents.length} students found</p>
            </div>
            <button
              onClick={() => setView("classes")}
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer"
            >
              View by Class
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name, roll no, admission no, or parent mobile..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium outline-none focus:border-blue-500 transition shadow-xs"
            />
            {studentSearch && (
              <button
                onClick={() => setStudentSearch("")}
                className="absolute right-3 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Class Filter Badges */}
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
            {classes.map(cls => (
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

          {/* Student Cards List */}
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
                        {st.className || (classes.find(c => c.id === st.classId)?.name) || "Class 10"}
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
                      const matchedClass = classes.find(c => c.id === st.classId || c.name === st.className) || classes[0];
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
                      const matchedClass = classes.find(c => c.id === st.classId || c.name === st.className) || classes[0];
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

            {filteredStudents.length > 100 && (
              <p className="text-center text-xs font-semibold text-slate-400 pt-2">
                Showing top 100 students of {filteredStudents.length}. Use the search bar or class filter above for specific students.
              </p>
            )}

            {filteredStudents.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Koi student nahi mila</p>
                <p className="text-xs text-slate-400 mt-0.5">Search query ya filter badal kar check karein</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CLASSES LIST VIEW ── */}
      {view === "classes" && (
        <div className="p-3 sm:p-4 space-y-3 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600 dark:text-slate-300 font-bold">Select a Class to Manage:</p>
            <button
              onClick={() => setView("all_students")}
              className="px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 font-bold text-xs border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>All Students ({allStudents.length})</span>
            </button>
          </div>

          {sortSchoolClasses(classes).map(cls => {
            const count = (studentCountByClass[cls.id] !== undefined)
              ? studentCountByClass[cls.id]
              : ((studentCountByClass[cls.name] !== undefined) ? studentCountByClass[cls.name] : 0);
            return (
              <div
                key={cls.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 hover:border-emerald-500/50 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm">
                      {cls.name.replace(/Class\s*/i, '').trim().slice(0, 3)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 dark:text-white text-base leading-tight">{cls.name}</p>
                      {cls.section && <span className="text-[11px] text-slate-400 font-medium">Section {cls.section}</span>}
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                    <Users className="w-3 h-3" />
                    <span>{count} Students</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                  <button
                    onClick={() => { setSelectedClass(cls); setView("class_students"); }}
                    className="py-2 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Students</span>
                  </button>

                  <button
                    onClick={() => { setSelectedClass(cls); setView("subjects"); }}
                    className="py-2 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Subjects</span>
                  </button>

                  <button
                    onClick={() => { setSelectedClass(cls); setView("attendance"); }}
                    className="py-2 px-2.5 bg-green-50 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:text-green-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    <span>Attendance</span>
                  </button>

                  <button
                    onClick={() => { setSelectedClass(cls); setView("marks"); }}
                    className="py-2 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Marks</span>
                  </button>
                </div>
              </div>
            );
          })}

          {classes.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No classes assigned yet</p>
            </div>
          )}
        </div>
      )}

      {/* ── CLASS STUDENTS VIEW (When a specific class is selected) ── */}
      {view === "class_students" && selectedClass && (
        <div className="p-3 sm:p-4 space-y-3.5 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {selectedClass.name} — Student Roster
              </h2>
              <p className="text-xs text-slate-500">{classStudents.length} Students Enrolled</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setView("attendance")}
                className="px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Mark Attendance</span>
              </button>
              <button
                onClick={() => setView("marks")}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition cursor-pointer flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Enter Marks</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {classStudents.map(st => (
              <div
                key={st.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
                    {st.rollNo || "•"}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{st.name}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 flex-wrap">
                      <span>Adm: <strong className="text-slate-600 dark:text-slate-300">{st.admissionNo}</strong></span>
                      {st.fatherName && <span>Parent: <strong className="text-slate-600 dark:text-slate-300">{st.fatherName}</strong></span>}
                      {st.phone && <span>Ph: {st.phone}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                    Active
                  </span>
                </div>
              </div>
            ))}

            {classStudents.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
                <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300">Is class mein abhi students nahi hain</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SUBJECTS VIEW ── */}
      {view === "subjects" && selectedClass && (
        <div className="p-3 sm:p-4 space-y-4 max-w-3xl mx-auto">
          {/* Top Class Banner */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {selectedClass.name} — Books &amp; Subjects
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Total <strong className="text-slate-800 dark:text-slate-200 font-bold">{subjects.length} books</strong> enrolled for this class.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAddBooksModal(true);
                setSelectedBooksQueue([]);
                setCustomBooksInput("");
                setBooksFeedback(null);
              }}
              className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Multiple Books (एक साथ किताबें जोड़ें)</span>
            </button>
          </div>

          {/* Feedback alert */}
          {booksFeedback && (
            <div className={`p-3.5 rounded-xl text-xs font-bold border transition ${
              booksFeedback.includes("❌")
                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                : "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            }`}>
              {booksFeedback}
            </div>
          )}

          {/* ── MULTI-BOOK ADDITION MODAL / PANEL ── */}
          {showAddBooksModal && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg border-2 border-emerald-500/30 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-black">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                      Add Multiple Books for {selectedClass.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Preset pack chunein, chips par click karein ya type karke ek saath add karein
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBooksModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 1. Quick Bundle Buttons */}
              <div>
                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>1-Click Preset Bundles (रेडीमेड बुक पैक):</span>
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRESET_BOOK_BUNDLES.map((bundle, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => handleApplyBundle(bundle.books)}
                      className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-400 transition cursor-pointer group"
                    >
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">
                        {bundle.label}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {bundle.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Clickable Subject Chips */}
              <div>
                <p className="text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  Click to Select / Unselect Books (किताबें चुनें):
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_BOOK_PRESETS.map((preset) => {
                    const isSelected = selectedBooksQueue.includes(preset.name);
                    const isAlreadyAdded = subjects.some(s => (s.name || "").trim().toLowerCase() === preset.name.toLowerCase());
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => handleToggleBook(preset.name)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isAlreadyAdded
                            ? "bg-slate-100 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                            : isSelected
                            ? "bg-emerald-600 text-white border border-emerald-600 shadow-xs"
                            : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600"
                        }`}
                      >
                        <span>{preset.icon}</span>
                        <span>{preset.name}</span>
                        {isAlreadyAdded && <span className="text-[9px] font-normal opacity-70">(Added)</span>}
                        {isSelected && !isAlreadyAdded && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Custom Textarea / Input for custom books */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Type Custom Book Names (कॉमा या न्यू लाइन से अलग करें):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customBooksInput}
                    onChange={e => setCustomBooksInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomBooks();
                      }
                    }}
                    placeholder="e.g. Environmental Studies, GK, Value Education"
                    className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomBooks}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    + Add to Queue
                  </button>
                </div>
              </div>

              {/* 4. Selected Queue Preview */}
              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                    Selected Books to Save ({selectedBooksQueue.length}):
                  </span>
                  {selectedBooksQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedBooksQueue([])}
                      className="text-[11px] text-rose-500 hover:underline font-bold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedBooksQueue.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedBooksQueue.map((book) => (
                      <span
                        key={book}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
                      >
                        <span>{book}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveQueuedBook(book)}
                          className="hover:text-rose-500 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Upar diye gaye preset bundles, subject chips ya custom text se books select karein
                  </p>
                )}
              </div>

              {/* 5. Submit / Cancel Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={selectedBooksQueue.length === 0 || savingBooks}
                  onClick={handleSaveAllBooks}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 transition cursor-pointer"
                >
                  {savingBooks ? (
                    <span>Saving {selectedBooksQueue.length} Books...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save All {selectedBooksQueue.length} Books in {selectedClass.name}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBooksModal(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── SUBJECTS LIST ── */}
          <div className="space-y-2.5">
            {subjects.map(sub => (
              <div
                key={sub.id}
                className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 font-black text-sm flex items-center justify-center shrink-0 border border-purple-200/50 dark:border-purple-800/50">
                    <Book className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white text-base truncate">{sub.name}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>Curriculum Book</span>
                      <span>•</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Enrolled</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setSelectedSubject(sub); setView("lessons"); }}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Lessons / Chapters</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(sub)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                    title="Delete Book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {subjects.length === 0 && (
              <div className="text-center py-12 px-4 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="font-black text-base text-slate-700 dark:text-slate-200">
                  {selectedClass.name} me abhi tak koi subject / book add nahi hai
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Upar diye gaye button par click karke ek saath Hindi, English, Math, Science ityadi sabhi books 1-click me add karein.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBooksModal(true);
                    setSelectedBooksQueue([]);
                    setCustomBooksInput("");
                  }}
                  className="mt-4 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black inline-flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Multiple Books Now</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LESSONS VIEW ── */}
      {view === "lessons" && selectedSubject && (
        <div className="p-3 sm:p-4 space-y-3 max-w-3xl mx-auto">
          <p className="text-sm text-slate-500 font-medium">
            Lessons — <strong className="text-slate-800 dark:text-slate-100 font-bold">{selectedSubject.name}</strong>
          </p>
          {lessons.map(lesson => (
            <div key={lesson.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-300">{lesson.order}</span>
                </div>
                <p className="flex-1 font-bold text-slate-900 dark:text-white text-sm">{lesson.title}</p>
              </div>

              <p className="text-xs text-slate-400 mb-2 font-medium">Launch Digital Smart Mode:</p>
              <div className="grid grid-cols-2 gap-2">
                {lesson.features?.readingEnabled && (
                  <button
                    onClick={() => { setSelectedLesson(lesson); setSmartMode("reading"); setView("smart_class"); }}
                    className="py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Reading Mode
                  </button>
                )}
                {lesson.features?.writingEnabled && (
                  <button
                    onClick={() => { setSelectedLesson(lesson); setSmartMode("writing"); setView("smart_class"); }}
                    className="py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Writing Mode
                  </button>
                )}
                {lesson.features?.pdfEnabled && (
                  <button
                    onClick={() => { setSelectedLesson(lesson); setSmartMode("pdf"); setView("smart_class"); }}
                    className="py-2.5 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" /> PDF Viewer
                  </button>
                )}
                {lesson.features?.mcqEnabled && (
                  <button
                    onClick={() => { setSelectedLesson(lesson); setSmartMode("mcq"); setView("smart_class"); }}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" /> Live MCQs
                  </button>
                )}
              </div>
            </div>
          ))}

          {lessons.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No lessons added for this subject yet</p>
            </div>
          )}
        </div>
      )}
      {renderBottomNav()}
    </div>
  );
};

export default TeacherPanel;
