// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  subscribeToClasses, subscribeToSubjects, subscribeToStudents,
  subscribeToAllStudents, subscribeToLessons, getSchool, getSessions,
  getSubjects, getStudents
} from "../../school-firebase";
import { getDemoSchoolDataset } from "./demoDataStore";
import type { School, SchoolClass, SchoolSubject, SchoolLesson, SchoolStudent, SchoolSession } from "../../school-types";
import { AttendanceManager } from "./AttendanceManager";
import { MarksManager } from "./MarksManager";
import { SmartClass } from "./SmartClass";
import { ContentManager } from "./ContentManager";
import {
  BookOpen, Users, ClipboardList, LayoutDashboard,
  ChevronRight, ChevronLeft, Edit3, FileText, HelpCircle, Play,
  Search, Phone, User, Calendar, Award, Sparkles, Filter, CheckCircle2,
  GraduationCap, LogOut
} from "lucide-react";

interface Props {
  schoolId: string;
  teacherId: string;
  teacherName: string;
  onBack?: () => void;
  onLogout?: () => void;
}

type TeacherView =
  | "dashboard"
  | "all_students"
  | "classes"
  | "class_students"
  | "subjects"
  | "lessons"
  | "attendance"
  | "marks"
  | "smart_class"
  | "content_manage";

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

    // 3. Load All Students immediately
    const unsubStudents = subscribeToAllStudents(schoolId, (stds) => {
      if (stds && stds.length > 0) {
        setAllStudents(stds);
      } else {
        const demo = getDemoSchoolDataset();
        if (demo && demo.students) setAllStudents(demo.students);
      }
    });

    // 4. Load All Subjects for top stats
    getSubjects(schoolId).then(subs => {
      if (subs && subs.length > 0) {
        setAllSubjects(subs);
      } else {
        const demo = getDemoSchoolDataset();
        if (demo && demo.subjects) setAllSubjects(demo.subjects);
      }
    });

    return () => {
      if (typeof unsubStudents === "function") unsubStudents();
    };
  }, [schoolId]);

  // Subscribe to classes for the active session
  useEffect(() => {
    const unsub = subscribeToClasses(schoolId, activeSession?.id || "", (clsList) => {
      if (clsList && clsList.length > 0) {
        setClasses(clsList);
      } else {
        const demo = getDemoSchoolDataset();
        if (demo && demo.classes) setClasses(demo.classes);
      }
    });
    return unsub;
  }, [schoolId, activeSession]);

  // Subscribe to subjects when a class is selected
  useEffect(() => {
    if (!selectedClass) return;
    const unsub = subscribeToSubjects(schoolId, selectedClass.id, (subs) => {
      if (subs && subs.length > 0) {
        setSubjects(subs);
      } else {
        const demo = getDemoSchoolDataset();
        const found = demo.subjects.filter(s => s.classId === selectedClass.id || s.className === selectedClass.name);
        setSubjects(found.length > 0 ? found : demo.subjects.slice(0, 6));
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

  if (view === "attendance" && selectedClass) {
    return (
      <AttendanceManager
        schoolId={schoolId}
        classId={selectedClass.id}
        className={selectedClass.name}
        teacherId={teacherId}
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
        sessionId={activeSession?.id || "demo_session_2026_27"}
        teacherId={teacherId}
        subjectId={selectedSubject?.id}
        subjectName={selectedSubject?.name}
        onBack={() => setView("classes")}
      />
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

  const goBack = () => {
    if (view === "lessons") setView("subjects");
    else if (view === "subjects" || view === "class_students") setView("classes");
    else setView("dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 select-none pb-12">
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

      {/* ── DASHBOARD VIEW ── */}
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
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{classes.length || 13}</p>
              <span className="text-[10px] text-slate-400">All grades active</span>
            </div>

            <div
              onClick={() => setView("all_students")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Students</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{allStudents.length || 910}</p>
              <span className="text-[10px] text-slate-400">Enrolled &amp; tracked</span>
            </div>

            <div
              onClick={() => setView("classes")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Subjects</span>
                <FileText className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {allSubjects.length > 0 ? allSubjects.length : 26}
              </p>
              <span className="text-[10px] text-slate-400">Curriculum books</span>
            </div>

            <div
              onClick={() => setView("classes")}
              className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:shadow-md transition active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Attendance</span>
                <ClipboardList className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">Daily</p>
              <span className="text-[10px] text-slate-400">Live marking</span>
            </div>
          </div>

          {/* Quick Action Navigation Cards */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider px-1">
              Teacher Action Center
            </h3>

            {/* 1. School Students Directory (Crucial requested feature!) */}
            <button
              onClick={() => setView("all_students")}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5 hover:shadow-md transition active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">School Students Directory</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                    {allStudents.length || 910} Students
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  View all students across classes, roll numbers, admission details &amp; parent contacts
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition shrink-0" />
            </button>

            {/* 2. My Classes */}
            <button
              onClick={() => setView("classes")}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5 hover:shadow-md transition active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition">
                <BookOpen className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">My Classes &amp; Roster</p>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                    {classes.length || 13} Classes
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Select a class to manage students, curriculum lessons, and schedule
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition shrink-0" />
            </button>

            {/* 3. Smart Class */}
            <button
              onClick={() => setView("classes")}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5 hover:shadow-md transition active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-950/50 border border-green-200/60 dark:border-green-800 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0 group-hover:scale-105 transition">
                <Play className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">Smart Class Interactive Session</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Launch digital whiteboard, reading mode, writing canvas, PDFs &amp; live MCQs
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-green-500 transition shrink-0" />
            </button>

            {/* 4. Mark Attendance */}
            <button
              onClick={() => setView("classes")}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5 hover:shadow-md transition active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/60 dark:border-orange-800 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 group-hover:scale-105 transition">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">Mark Daily Attendance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Record daily attendance: Present, Absent, Late, Leave &amp; Bunk tracking
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition shrink-0" />
            </button>

            {/* 5. Marks Entry */}
            <button
              onClick={() => setView("classes")}
              className="w-full bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center gap-3.5 hover:shadow-md transition active:scale-[0.99] text-left cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0 group-hover:scale-105 transition">
                <Edit3 className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">Marks Entry &amp; Exam Cycles</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  Enter and grade PA-1, PA-2, Half Yearly, PA-3, PA-4 and Final Annual Board exams
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-500 transition shrink-0" />
            </button>
          </div>
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

          {[...classes].sort((a, b) => {
            const na = parseInt(a.name.replace(/\D+/g, '')) || 0;
            const nb = parseInt(b.name.replace(/\D+/g, '')) || 0;
            return na !== nb ? na - nb : a.name.localeCompare(b.name);
          }).map(cls => {
            const count = studentCountByClass[cls.id] || studentCountByClass[cls.name] || 35;
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
                    <span>Lessons</span>
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
        <div className="p-3 sm:p-4 space-y-3 max-w-3xl mx-auto">
          <p className="text-sm text-slate-500 font-medium">
            Subjects in <strong className="text-slate-800 dark:text-slate-100 font-bold">{selectedClass.name}</strong>:
          </p>
          {subjects.map(sub => (
            <div key={sub.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-slate-900 dark:text-white text-base">{sub.name}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-900/30">
                  Active
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setSelectedSubject(sub); setView("lessons"); }}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>View Lessons</span>
                </button>
                <button
                  onClick={() => { setSelectedSubject(sub); setView("content_manage"); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Manage Content</span>
                </button>
              </div>
            </div>
          ))}

          {subjects.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>No subjects added yet</p>
            </div>
          )}
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
    </div>
  );
};

export default TeacherPanel;
