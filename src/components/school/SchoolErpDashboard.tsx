// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  School, Users, BookOpen, Calendar, IndianRupee, Megaphone,
  Briefcase, Award, CheckCircle2, AlertTriangle, Clock, Search,
  Filter, Plus, Trash2, Printer, Download, Eye, FileText,
  ChevronRight, Sparkles, Phone, MapPin, ShieldCheck, RefreshCw,
  QrCode, UserCheck, Layers, Star, TrendingUp, X
} from "lucide-react";
import {
  getDemoSchoolDataset,
  generateFull1YearDemoDataset,
  DEMO_CLASS_DEFINITIONS,
  EXAM_CYCLES,
  ACADEMIC_MONTHS,
  DEMO_STAFF_MEMBERS,
  addCustomHoliday,
  removeCustomHoliday,
  addCustomNotice,
  isHolidayDate,
  type FullDemoSchoolDataset,
  type FestivalHoliday,
  type TeacherLatePenaltyInfo
} from "./demoDataStore";
import { HolidayManager } from "./HolidayManager";
import { StaffHRMManager } from "./StaffHRMManager";
import { NoticeBoardManager } from "./NoticeBoardManager";

type MainTab =
  | "dashboard"
  | "students"
  | "exams"
  | "staff"
  | "attendance"
  | "holidays"
  | "fees"
  | "notices";

export function SchoolErpDashboard({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const [dataset, setDataset] = useState<FullDemoSchoolDataset>(() => getDemoSchoolDataset());
  const [activeTab, setActiveTab] = useState<MainTab>("dashboard");
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetSuccessToast, setResetSuccessToast] = useState<boolean>(false);

  // Guarantee pre-react splash dismissal on App component mount
  useEffect(() => {
    if (typeof (window as any).hidePreReactSplash === 'function') {
      (window as any).hidePreReactSplash();
    } else {
      const splash = document.getElementById('pre-react-splash');
      if (splash) splash.remove();
    }
  }, []);

  // Selected Class & Section for directory / marks / attendance
  const [selectedClassIndex, setSelectedClassIndex] = useState<number>(0); // 0 to 12 (Nursery to Class 10)
  const [selectedSection, setSelectedSection] = useState<"A" | "B">("A"); // Section A (35) or B (35)

  // Exam state
  const [selectedExamId, setSelectedExamId] = useState<string>("pa1"); // pa1, pa2, half_yearly, pa3, pa4, final
  const [reportCardStudent, setReportCardStudent] = useState<any | null>(null);

  // Fee state
  const [selectedFeeMonth, setSelectedFeeMonth] = useState<string>("2026-10");
  const [defaulterFilter, setDefaulterFilter] = useState<string>("all"); // all, paid, unpaid, 12m, 10m, 8m, 7m, 6m, 5m, 4m, 3m
  const [activeReceiptFee, setActiveReceiptFee] = useState<any | null>(null);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [studentStatusMap, setStudentStatusMap] = useState<Record<string, "present" | "late" | "leave" | "bunk" | "absent">>({});

  // Search filter in students table
  const [studentSearch, setStudentSearch] = useState<string>("");

  const currentClassDef = DEMO_CLASS_DEFINITIONS[selectedClassIndex] || DEMO_CLASS_DEFINITIONS[0];
  const currentClassId = `demo_class_${currentClassDef.key}_sec_${selectedSection.toLowerCase()}`;

  // Current section students (exactly 35 students)
  const currentSectionStudents = dataset.students.filter(s => s.classId === currentClassId);

  // Filtered by search query if any
  const displayedStudents = currentSectionStudents.filter(s => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.rollNo.includes(q) || (s.admissionNo && s.admissionNo.toLowerCase().includes(q));
  });

  // Current class subjects
  const currentClassSubjects = dataset.subjects.filter(s => s.classId === currentClassId);

  // Current selected exam cycle
  const currentExamCycle = EXAM_CYCLES.find(e => e.id === selectedExamId) || EXAM_CYCLES[0];

  // Refresh dataset handler
  const handleExecuteReset = () => {
    setShowResetConfirm(false);
    const refreshed = generateFull1YearDemoDataset();
    setDataset(refreshed);
    setResetSuccessToast(true);
    setTimeout(() => setResetSuccessToast(false), 4000);
  };

  // Status badge styling helper
  const getStatusBadge = (status: "present" | "late" | "leave" | "bunk" | "absent") => {
    switch (status) {
      case "present":
        return { label: "P", full: "Present", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300" };
      case "late":
        return { label: "L", full: "Late Arrival", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300" };
      case "leave":
        return { label: "LV", full: "Approved Leave", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300" };
      case "bunk":
        return { label: "B", full: "Bunked Class", color: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300" };
      case "absent":
      default:
        return { label: "A", full: "Absent", color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300" };
    }
  };

  // Compute stats for overview dashboard
  const totalStudentsCount = dataset.students.length; // 910
  const totalTeachersCount = dataset.teachers.length; // 26
  const totalClassesCount = DEMO_CLASS_DEFINITIONS.length; // 13 grades, 26 sections
  const totalSectionsCount = dataset.classes.length; // 26
  const totalHolidaysCount = dataset.holidays.length;

  const currentMonthFees = dataset.fees.filter(f => f.month === selectedFeeMonth);
  const paidFeesCount = currentMonthFees.filter(f => f.paid).length;
  const unpaidFeesCount = currentMonthFees.filter(f => !f.paid).length;
  const collectedFeeTotal = currentMonthFees.filter(f => f.paid).reduce((sum, f) => sum + f.amount, 0);
  const pendingFeeTotal = currentMonthFees.filter(f => !f.paid).reduce((sum, f) => sum + f.amount, 0);

  // Check holiday on selected date
  const holidayOnDate = isHolidayDate(attendanceDate);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-500 selection:text-white">
      {/* ── TOP NAV & INSTITUTIONAL HEADER ─────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20 gap-3">
            {/* School Branding */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-amber-600 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-rose-950 border border-white/20">
                🎓
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight uppercase">
                    DELHI PUBLIC SMART ACADEMY
                  </h1>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    CBSE AFFILIATED
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    1-YEAR DEMO AUTO-FILLED
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 hidden sm:block">
                  13 Classes (Nur-10) • 70 Students/Class (35 in A, 35 in B) • Ratio 1/35 • 3-Day Late Deduction • 6 Exams
                </p>
              </div>
            </div>

            {/* Quick Actions & Reset Button */}
            <div className="flex items-center gap-2">
              {onNavigate && (
                <button
                  onClick={() => onNavigate("STUDENT")}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-indigo-900/30"
                >
                  <span>🎓 Student Dashboard</span>
                </button>
              )}
              <button
                onClick={() => setShowResetConfirm(true)}
                title="1-Year Dataset Ko Fresh Auto-Fill Karein"
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline">Reset 1-Year Demo</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
            {[
              { id: "dashboard", label: "📊 Overview Dashboard" },
              { id: "students", label: "🏫 13 Classes & 910 Students" },
              { id: "exams", label: "📝 1-Year Exams & Marks (PA1-Final)" },
              { id: "staff", label: "👨‍🏫 Teachers & 3-Day Late Rule (1:35)" },
              { id: "attendance", label: "📅 1-Year Attendance (Leave/Bunk)" },
              { id: "holidays", label: "🎉 Festival Holidays & Chhutti" },
              { id: "fees", label: "💰 1-Year Fees & Defaulters" },
              { id: "notices", label: "📢 Notice Board (Month Filter)" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MainTab)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-rose-600 text-white shadow-md shadow-rose-950 font-black"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT VIEW ────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Institutional Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                  <span>TOTAL STUDENTS</span>
                  <Users className="w-4 h-4 text-rose-500" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">910</p>
                <p className="text-[11px] text-slate-400 mt-1">13 Classes × 70 Students (A: 35, B: 35)</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                  <span>FACULTY (RATIO 1:35)</span>
                  <Briefcase className="w-4 h-4 text-teal-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">26 + 1</p>
                <p className="text-[11px] text-slate-400 mt-1">26 Teachers (₹5k-15k) + 1 Principal (₹25k)</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                  <span>LATE PENALTY RULE</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-400">3 Days = 1 Cut</p>
                <p className="text-[11px] text-slate-400 mt-1">Math.floor(Late / 3) Days Salary Deducted</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition">
                <div className="flex items-center justify-between text-slate-400 text-xs font-bold mb-1">
                  <span>EXAMS & FESTIVALS</span>
                  <Award className="w-4 h-4 text-indigo-400" />
                </div>
                <p className="text-2xl sm:text-3xl font-black text-white">6 Cycles</p>
                <p className="text-[11px] text-slate-400 mt-1">PA1, PA2, Half Yearly, PA3, PA4, Final</p>
              </div>
            </div>

            {/* Quick Class Grade Switcher Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-rose-500" />
                    All 13 School Grades (Class Directory)
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Har class me 70 students hain, 35 Section A me aur 35 Section B me.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 px-2">Section:</span>
                  <button
                    onClick={() => setSelectedSection("A")}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      selectedSection === "A" ? "bg-rose-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Section A (35 Students)
                  </button>
                  <button
                    onClick={() => setSelectedSection("B")}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                      selectedSection === "B" ? "bg-rose-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Section B (35 Students)
                  </button>
                </div>
              </div>

              {/* 13 Grade Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {DEMO_CLASS_DEFINITIONS.map((def, idx) => {
                  const isSelected = selectedClassIndex === idx;
                  const teacherProfile = DEMO_STAFF_MEMBERS[idx * 2 + (selectedSection === "A" ? 1 : 2)];
                  return (
                    <button
                      key={def.key}
                      onClick={() => setSelectedClassIndex(idx)}
                      className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? "bg-rose-600/15 border-rose-500 text-white shadow-md ring-1 ring-rose-500"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black">{def.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {selectedSection}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">35 Students</p>
                      <p className="text-[9px] text-emerald-400 font-bold mt-0.5 truncate">
                        ₹{def.defaultFee}/mo
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Active Selected Class Banner */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <h3 className="font-black text-sm text-white">
                    {currentClassDef.name} — Section {selectedSection} (35 Students Enrolled)
                  </h3>
                  <p className="text-slate-400 mt-0.5">
                    Class Teacher: <strong>{DEMO_STAFF_MEMBERS[selectedClassIndex * 2 + (selectedSection === "A" ? 1 : 2)]?.name}</strong> · Monthly Fee: <strong>₹{currentClassDef.defaultFee}</strong> · Ratio: <strong>1 Teacher / 35 Students</strong>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab("students")}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    View All 35 Students <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-xs"
                  >
                    View Exam Marks
                  </button>
                </div>
              </div>
            </div>

            {/* Defaulter Analysis & Fee Dues Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-emerald-400" />
                    Fee Defaulters Analysis ({selectedFeeMonth})
                  </h3>
                  <button onClick={() => setActiveTab("fees")} className="text-xs text-rose-400 font-bold hover:underline">
                    View Fee Ledger →
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  User specification ke anusar 3, 4, 5, 6, 7, 8, 10, aur 12 mahine ke defaulter students auto-filled hain:
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-rose-900/40">
                    <p className="text-[10px] text-slate-400 font-bold">12 Months Due</p>
                    <p className="text-base font-black text-rose-400 mt-0.5">26 Students</p>
                    <p className="text-[9px] text-slate-500">Full Year Due</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-900/40">
                    <p className="text-[10px] text-slate-400 font-bold">10 Months Due</p>
                    <p className="text-base font-black text-amber-400 mt-0.5">26 Students</p>
                    <p className="text-[9px] text-slate-500">Long Defaulters</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-900/40">
                    <p className="text-[10px] text-slate-400 font-bold">6-8 Months Due</p>
                    <p className="text-base font-black text-amber-300 mt-0.5">78 Students</p>
                    <p className="text-[9px] text-slate-500">Medium Dues</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-emerald-900/40">
                    <p className="text-[10px] text-slate-400 font-bold">Paid Up-to-Date</p>
                    <p className="text-base font-black text-emerald-400 mt-0.5">702 Students</p>
                    <p className="text-[9px] text-slate-500">Cleared Fees</p>
                  </div>
                </div>
              </div>

              {/* 1-Year Exam Cycles Overview */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-white text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-400" />
                    6-Cycle Examination System (Every 2 Months)
                  </h3>
                  <button onClick={() => setActiveTab("exams")} className="text-xs text-rose-400 font-bold hover:underline">
                    Enter Marks →
                  </button>
                </div>
                <div className="space-y-2 text-xs">
                  {EXAM_CYCLES.map(cycle => (
                    <div key={cycle.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                      <div>
                        <span className="font-black text-slate-200">{cycle.name}</span>
                        <span className="text-[10px] text-slate-400 block">{cycle.month}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-amber-400">Max Marks: {cycle.maxMarks}</span>
                        <span className="text-[10px] text-slate-500 block">Weightage: {cycle.weightage}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 13 CLASSES & 910 STUDENTS DIRECTORY */}
        {activeTab === "students" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Class & Section Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white">
                    {currentClassDef.name} — Section {selectedSection} (35 Students Enrolled)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Total in Grade: 70 Students (Section A: 35, Section B: 35) • Class Teacher: {DEMO_STAFF_MEMBERS[selectedClassIndex * 2 + (selectedSection === "A" ? 1 : 2)]?.name}
                  </p>
                </div>

                {/* Section Toggle */}
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                  <button
                    onClick={() => setSelectedSection("A")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      selectedSection === "A" ? "bg-rose-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Section A (35)
                  </button>
                  <button
                    onClick={() => setSelectedSection("B")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                      selectedSection === "B" ? "bg-rose-600 text-white shadow-xs" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Section B (35)
                  </button>
                </div>
              </div>

              {/* Class Grade Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
                {DEMO_CLASS_DEFINITIONS.map((def, idx) => (
                  <button
                    key={def.key}
                    onClick={() => setSelectedClassIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      selectedClassIndex === idx
                        ? "bg-rose-600 text-white shadow-xs font-black"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {def.name}
                  </button>
                ))}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Roll No ya Student ka Naam khojein..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-950 rounded-xl border border-slate-800 text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>

            {/* Students Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-black tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Roll</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Admission No</th>
                      <th className="p-3">Father's Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Monthly Fee</th>
                      <th className="p-3">Due Months</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-semibold text-slate-200">
                    {displayedStudents.map((student, sIdx) => {
                      // Check fee dues for this student
                      const studentFees = dataset.fees.filter(f => f.studentId === student.id);
                      const dueCount = studentFees.filter(f => !f.paid).length;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-rose-400">#{student.rollNo}</td>
                          <td className="p-3">
                            <span className="font-bold text-white text-sm block">{student.name}</span>
                            <span className="text-[10px] text-slate-500">DOB: {student.dateOfBirth}</span>
                          </td>
                          <td className="p-3 font-mono text-slate-400">{student.admissionNo}</td>
                          <td className="p-3 text-slate-300">{student.fatherName}</td>
                          <td className="p-3 text-slate-400">{student.phone}</td>
                          <td className="p-3 font-black text-emerald-400">₹{student.monthlyFee}</td>
                          <td className="p-3">
                            {dueCount > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                ⚠️ {dueCount} Mo Due
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                ✅ Paid
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => {
                                setReportCardStudent(student);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-bold border border-indigo-500/30"
                            >
                              Report Card
                            </button>
                            <button
                              onClick={() => {
                                setActiveTab("fees");
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold border border-emerald-500/30"
                            >
                              Fee Ledger
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 1-YEAR EXAMS & MARKS (PA 1, PA 2, Half Yearly, PA 3, PA 4, Final) */}
        {activeTab === "exams" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Exam Cycles Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" />
                    Auto-Filled 1-Year Examination & Marks System
                  </h2>
                  <p className="text-xs text-slate-400">
                    PA 1, PA 2, PA 3, PA 4 ke <strong>40 marks</strong> aur Half Yearly & Final Exam ke <strong>100 marks</strong> har subject me auto-fill hain.
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-400 px-2">Section:</span>
                  <button
                    onClick={() => setSelectedSection("A")}
                    className={`px-3 py-1 rounded-lg text-xs font-black ${selectedSection === "A" ? "bg-rose-600 text-white" : "text-slate-400"}`}
                  >
                    Sec A (35)
                  </button>
                  <button
                    onClick={() => setSelectedSection("B")}
                    className={`px-3 py-1 rounded-lg text-xs font-black ${selectedSection === "B" ? "bg-rose-600 text-white" : "text-slate-400"}`}
                  >
                    Sec B (35)
                  </button>
                </div>
              </div>

              {/* 6 Exam Cycles Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {EXAM_CYCLES.map(cycle => (
                  <button
                    key={cycle.id}
                    onClick={() => setSelectedExamId(cycle.id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedExamId === cycle.id
                        ? "bg-amber-500/20 border-amber-500 text-white shadow-xs"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <p className="text-xs font-black">{cycle.shortName}</p>
                    <p className="text-[10px] text-amber-400 font-bold mt-0.5">Max Marks: {cycle.maxMarks}</p>
                    <p className="text-[9px] text-slate-500">{cycle.month}</p>
                  </button>
                ))}
              </div>

              {/* Grade Selector Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Class:</span>
                {DEMO_CLASS_DEFINITIONS.map((def, idx) => (
                  <button
                    key={def.key}
                    onClick={() => setSelectedClassIndex(idx)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 ${
                      selectedClassIndex === idx
                        ? "bg-rose-600 text-white font-black"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {def.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Marks Sheet Table for this Class & Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-white">
                    {currentClassDef.name} — Section {selectedSection} • {currentExamCycle.name} (Max Marks: {currentExamCycle.maxMarks})
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentClassSubjects.length} Grade-Specific Subjects Enrolled
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Paper Marks: {currentExamCycle.maxMarks}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Roll</th>
                      <th className="p-3">Student Name</th>
                      {currentClassSubjects.map(sub => (
                        <th key={sub.id} className="p-3 text-center">{sub.name}</th>
                      ))}
                      <th className="p-3 text-center">Total</th>
                      <th className="p-3 text-center">%</th>
                      <th className="p-3 text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                    {currentSectionStudents.map((student, sIdx) => {
                      let studentTotalEarned = 0;
                      const maxPossible = currentClassSubjects.length * currentExamCycle.maxMarks;

                      return (
                        <tr key={student.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-bold text-rose-400">#{student.rollNo}</td>
                          <td className="p-3 font-bold text-white whitespace-nowrap">
                            <button
                              onClick={() => setReportCardStudent(student)}
                              className="text-left hover:underline text-rose-300"
                            >
                              {student.name}
                            </button>
                          </td>

                          {currentClassSubjects.map((sub, subIdx) => {
                            // Find exam entry
                            const examKey = `demo_exam_${currentClassDef.key}_${selectedSection.toLowerCase()}_${sub.id}_${currentExamCycle.id}`;
                            const examEntry = dataset.exams.find(e => e.id === examKey);
                            const markData = examEntry?.studentMarks[student.id];
                            const marksVal = markData?.marks ?? (currentExamCycle.maxMarks === 40 ? 32 : 78);
                            studentTotalEarned += marksVal;

                            return (
                              <td key={sub.id} className="p-3 text-center font-mono">
                                <span className={marksVal >= (currentExamCycle.maxMarks * 0.75) ? "text-emerald-400 font-bold" : marksVal >= (currentExamCycle.maxMarks * 0.4) ? "text-slate-200" : "text-rose-400"}>
                                  {marksVal}
                                </span>
                              </td>
                            );
                          })}

                          <td className="p-3 text-center font-mono font-black text-amber-400">
                            {studentTotalEarned}/{maxPossible}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-white">
                            {Math.round((studentTotalEarned / maxPossible) * 100)}%
                          </td>
                          <td className="p-3 text-center">
                            {(() => {
                              const pct = (studentTotalEarned / maxPossible) * 100;
                              if (pct >= 90) return <span className="text-emerald-400 font-black">A1</span>;
                              if (pct >= 80) return <span className="text-emerald-300 font-bold">A2</span>;
                              if (pct >= 70) return <span className="text-blue-300 font-bold">B1</span>;
                              if (pct >= 60) return <span className="text-amber-300 font-bold">B2</span>;
                              return <span className="text-slate-400">C</span>;
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEACHERS & 3-DAY LATE ENTRY RULE (1:35 RATIO) */}
        {activeTab === "staff" && (
          <StaffHRMManager
            school={{
              id: "demo_school",
              name: "DELHI PUBLIC SMART ACADEMY",
              address: "Sector-4, Institutional Area, Smart City",
            }}
            onBack={() => setActiveTab("dashboard")}
          />
        )}

        {/* TAB 5: 1-YEAR ATTENDANCE SYSTEM */}
        {activeTab === "attendance" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Header / Date Picker */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    Daily Attendance & Status Tracking (Leave, Bunk, Late, Present)
                  </h2>
                  <p className="text-xs text-slate-400">
                    5 Statuses: <strong>P</strong> (Present), <strong>L</strong> (Late), <strong>LV</strong> (Leave), <strong>B</strong> (Bunked), <strong>A</strong> (Absent).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={e => setAttendanceDate(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Holiday Notice if today is a festival */}
              {holidayOnDate && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 border border-amber-400/40 text-amber-200 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🎉</span>
                    <div>
                      <p className="font-black text-sm">{holidayOnDate.name} (Festival Holiday)</p>
                      <p className="text-xs text-amber-300/80">{holidayOnDate.description} • Aaj school ki chhutti hai.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("holidays")}
                    className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-black shadow-xs"
                  >
                    Manage Holidays
                  </button>
                </div>
              )}

              {/* Class & Section Switcher */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0">Class:</span>
                  {DEMO_CLASS_DEFINITIONS.map((def, idx) => (
                    <button
                      key={def.key}
                      onClick={() => setSelectedClassIndex(idx)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 ${
                        selectedClassIndex === idx ? "bg-rose-600 text-white font-black" : "bg-slate-950 text-slate-400"
                      }`}
                    >
                      {def.name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setSelectedSection("A")}
                    className={`px-3 py-1 rounded-lg text-xs font-black ${selectedSection === "A" ? "bg-rose-600 text-white" : "text-slate-400"}`}
                  >
                    Sec A (35)
                  </button>
                  <button
                    onClick={() => setSelectedSection("B")}
                    className={`px-3 py-1 rounded-lg text-xs font-black ${selectedSection === "B" ? "bg-rose-600 text-white" : "text-slate-400"}`}
                  >
                    Sec B (35)
                  </button>
                </div>
              </div>
            </div>

            {/* Attendance List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-slate-400">
                  Showing 35 Students of <strong>{currentClassDef.name} — Section {selectedSection}</strong>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => {
                      const allP: any = {};
                      currentSectionStudents.forEach(s => (allP[s.id] = "present"));
                      setStudentStatusMap(allP);
                    }}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                  >
                    Mark All Present
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-800">
                {currentSectionStudents.map((student, idx) => {
                  // Default sample status: 27 present, 2 late, 2 leave, 1 bunk, 3 absent
                  const defaultStatus = idx < 27 ? "present" : idx < 29 ? "late" : idx < 31 ? "leave" : idx === 31 ? "bunk" : "absent";
                  const currentStatus = studentStatusMap[student.id] || defaultStatus;

                  return (
                    <div key={student.id} className="p-3 px-4 flex items-center justify-between gap-3 hover:bg-slate-800/40">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-500 w-7">#{student.rollNo}</span>
                        <div>
                          <p className="font-bold text-sm text-white">{student.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {currentStatus === "late" && "Punch: 08:35 AM (Late Entry 25m)"}
                            {currentStatus === "leave" && "Status: Approved Sick / Medical Leave"}
                            {currentStatus === "bunk" && "Status: Bunked after morning roll call"}
                            {currentStatus === "present" && "Punch: 07:48 AM (On Time)"}
                            {currentStatus === "absent" && "Status: Uninformed Absence"}
                          </p>
                        </div>
                      </div>

                      {/* 5 Status Switcher Buttons */}
                      <div className="flex items-center gap-1.5">
                        {[
                          { id: "present", label: "P", desc: "Present" },
                          { id: "late", label: "L", desc: "Late" },
                          { id: "leave", label: "LV", desc: "Leave" },
                          { id: "bunk", label: "B", desc: "Bunk" },
                          { id: "absent", label: "A", desc: "Absent" },
                        ].map(st => {
                          const isAct = currentStatus === st.id;
                          return (
                            <button
                              key={st.id}
                              onClick={() => setStudentStatusMap(prev => ({ ...prev, [student.id]: st.id as any }))}
                              className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                                isAct
                                  ? st.id === "present"
                                    ? "bg-emerald-600 text-white shadow"
                                    : st.id === "late"
                                    ? "bg-amber-500 text-slate-950 font-black shadow"
                                    : st.id === "leave"
                                    ? "bg-blue-600 text-white shadow"
                                    : st.id === "bunk"
                                    ? "bg-purple-600 text-white shadow"
                                    : "bg-rose-600 text-white shadow"
                                  : "bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-800"
                              }`}
                              title={st.desc}
                            >
                              {st.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: FESTIVAL HOLIDAYS & POWER TO ADD HOLIDAY */}
        {activeTab === "holidays" && (
          <HolidayManager
            schoolId="demo_school"
            adminUid="admin"
            schoolName="DELHI PUBLIC SMART ACADEMY"
            onBack={() => setActiveTab("dashboard")}
          />
        )}

        {/* TAB 7: 1-YEAR FEES & DEFAULTERS (3, 4, 5, 6, 7, 8, 10, 12 MONTHS) */}
        {activeTab === "fees" && (
          <div className="space-y-4 animate-in fade-in">
            {/* Defaulter Pills & Month Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-400" />
                    1-Year Fee Ledger & Dues Defaulters
                  </h2>
                  <p className="text-xs text-slate-400">
                    Defaulters with 3, 4, 5, 6, 7, 8, 10, aur 12 mahine pending fee auto-calculated hain.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">Month:</span>
                  <select
                    value={selectedFeeMonth}
                    onChange={e => setSelectedFeeMonth(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    {ACADEMIC_MONTHS.map(m => (
                      <option key={m.code} value={m.code}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Defaulter Month Filter Buttons */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[11px] font-bold text-slate-400 shrink-0">Filter Dues:</span>
                {[
                  { id: "all", label: "Sabhi Students" },
                  { id: "paid", label: "✅ Paid Up" },
                  { id: "unpaid", label: "⚠️ All Defaulters" },
                  { id: "12m", label: "🔴 12 Months Due" },
                  { id: "10m", label: "🟠 10 Months Due" },
                  { id: "8m", label: "🟡 8 Months Due" },
                  { id: "7m", label: "7 Months Due" },
                  { id: "6m", label: "6 Months Due" },
                  { id: "5m", label: "5 Months Due" },
                  { id: "4m", label: "4 Months Due" },
                  { id: "3m", label: "3 Months Due" },
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setDefaulterFilter(pill.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      defaulterFilter === pill.id
                        ? "bg-emerald-600 text-white font-black shadow-xs"
                        : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Fee Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Receipt / ID</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class & Sec</th>
                      <th className="p-3">Monthly Amount</th>
                      <th className="p-3">Dues Count</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Official Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-semibold text-slate-300">
                    {dataset.students
                      .filter(st => {
                        const allStudentFees = dataset.fees.filter(f => f.studentId === st.id);
                        const dueCount = allStudentFees.filter(f => !f.paid).length;
                        if (defaulterFilter === "paid") return dueCount === 0;
                        if (defaulterFilter === "unpaid") return dueCount > 0;
                        if (defaulterFilter === "12m") return dueCount === 12;
                        if (defaulterFilter === "10m") return dueCount === 10;
                        if (defaulterFilter === "8m") return dueCount === 8;
                        if (defaulterFilter === "7m") return dueCount === 7;
                        if (defaulterFilter === "6m") return dueCount === 6;
                        if (defaulterFilter === "5m") return dueCount === 5;
                        if (defaulterFilter === "4m") return dueCount === 4;
                        if (defaulterFilter === "3m") return dueCount === 3;
                        return true;
                      })
                      .slice(0, 100) // fast render for top 100
                      .map(student => {
                        const studentFees = dataset.fees.filter(f => f.studentId === student.id);
                        const currentFee = studentFees.find(f => f.month === selectedFeeMonth) || studentFees[0];
                        const dueCount = studentFees.filter(f => !f.paid).length;
                        const isPaid = currentFee?.paid;

                        return (
                          <tr key={student.id} className="hover:bg-slate-800/40">
                            <td className="p-3 font-mono text-slate-400">
                              {currentFee?.receiptNo || `DUE-${student.rollNo}`}
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-white text-sm block">{student.name}</span>
                              <span className="text-[10px] text-slate-500">Father: {student.fatherName}</span>
                            </td>
                            <td className="p-3 text-slate-400">
                              Class {student.classId.replace("demo_class_", "").replace("_sec_", " - Section ").toUpperCase()}
                            </td>
                            <td className="p-3 font-black text-emerald-400">₹{student.monthlyFee}</td>
                            <td className="p-3 font-black">
                              {dueCount > 0 ? (
                                <span className="text-rose-400 font-bold">{dueCount} Months Due</span>
                              ) : (
                                <span className="text-emerald-400">0 (All Clear)</span>
                              )}
                            </td>
                            <td className="p-3">
                              {isPaid ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                  PAID
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                  PENDING
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setActiveReceiptFee({ student, fee: currentFee, dueCount })}
                                className="px-3 py-1 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 font-bold text-[11px] border border-emerald-500/30"
                              >
                                View Receipt
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: 1-YEAR NOTICES ARCHIVE WITH MONTH-WISE FILTER */}
        {activeTab === "notices" && (
          <NoticeBoardManager
            schoolId="demo_school"
            adminUid="admin"
            isAdmin={true}
            onBack={() => setActiveTab("dashboard")}
          />
        )}
      </main>

      {/* ── MODAL: OFFICIAL REPORT CARD ─────────────────────────────── */}
      {reportCardStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase text-slate-900">
                  DELHI PUBLIC SMART ACADEMY
                </h2>
                <p className="text-xs text-slate-600">Institutional Progress & Examination Report Card</p>
              </div>
              <button
                onClick={() => setReportCardStudent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Student Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 font-bold block">Student Name:</span>
                <strong className="text-slate-900 text-sm">{reportCardStudent.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Roll No:</span>
                <strong className="text-slate-900">#{reportCardStudent.rollNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Admission No:</span>
                <strong className="text-slate-900">{reportCardStudent.admissionNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Academic Year:</span>
                <strong className="text-slate-900">2026-2027</strong>
              </div>
            </div>

            {/* Marks for All 6 Exam Cycles */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                1-Year Examination Assessment Performance (Auto-Filled):
              </h4>
              <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2.5">Exam Assessment</th>
                    <th className="p-2.5 text-center">Max Marks</th>
                    <th className="p-2.5 text-center">Marks Earned</th>
                    <th className="p-2.5 text-center">Percentage</th>
                    <th className="p-2.5 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {EXAM_CYCLES.map((cycle, cIdx) => {
                    const seed = (reportCardStudent.name.length * 7 + cIdx * 11) % 25;
                    const earned = cycle.maxMarks === 40 ? 30 + (seed % 10) : 74 + (seed % 24);
                    const pct = Math.round((earned / cycle.maxMarks) * 100);

                    return (
                      <tr key={cycle.id}>
                        <td className="p-2.5 font-bold">{cycle.name}</td>
                        <td className="p-2.5 text-center text-slate-500 font-mono">{cycle.maxMarks}</td>
                        <td className="p-2.5 text-center font-mono font-black text-slate-900">{earned}</td>
                        <td className="p-2.5 text-center font-mono font-bold text-emerald-700">{pct}%</td>
                        <td className="p-2.5 text-center font-black text-indigo-700">
                          {pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : "B2"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL DPS FEE RECEIPT ─────────────────────────── */}
      {activeReceiptFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white text-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="text-center border-b-2 border-slate-900 pb-3">
              <h2 className="text-xl font-black uppercase text-slate-900">DELHI PUBLIC SMART ACADEMY</h2>
              <p className="text-xs text-slate-500">Official Monthly Fee Receipt</p>
              <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase mt-1">
                Receipt No: {activeReceiptFee.fee?.receiptNo || "DPS-RCP-2026-001"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold block">Student:</span>
                <strong className="text-slate-900">{activeReceiptFee.student.name}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Roll No:</span>
                <strong className="text-slate-900">#{activeReceiptFee.student.rollNo}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Month:</span>
                <strong className="text-slate-900">{selectedFeeMonth}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-bold block">Amount Paid:</span>
                <strong className="text-emerald-700 text-sm">₹{activeReceiptFee.student.monthlyFee}</strong>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <p className="font-bold">Pending Dues Summary:</p>
              <p className="text-[11px] mt-0.5">
                {activeReceiptFee.dueCount > 0
                  ? `Total ${activeReceiptFee.dueCount} months fee pending for this student.`
                  : "All fees cleared up to this month."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setActiveReceiptFee(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" /> Print Fee Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-400">Delhi Public Smart Academy ERP</span>
            <span>• Session 2026-27 (1-Year Auto-Filled Demo Mode)</span>
          </div>
          <div>
            13 Classes • 70 Students/Class (A:35, B:35) • 1:35 Ratio • 3-Day Late Rule • 6 Exams
          </div>
        </div>
      </footer>
      {/* ── RESET CONFIRMATION MODAL ───────────────────────── */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset 1-Year Demo Dataset?</h3>
                <p className="text-xs text-slate-400">Delhi Public Smart Academy ERP</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Kya aap 1-Year Demo Dataset ko fresh reset karna chahte hain? Sabhi 13 classes, 910 students, marks, fee defaulters aur notices dobara auto-fill honge.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReset}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-amber-500/25"
              >
                Yes, Reset Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET SUCCESS TOAST ─────────────────────────────── */}
      {resetSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>✅ 1-Year Demo Dataset kamyabi se re-seed ho gaya!</span>
        </div>
      )}
    </div>
  );
}

export default SchoolErpDashboard;
