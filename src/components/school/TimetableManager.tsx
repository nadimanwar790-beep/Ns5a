// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Clock, Calendar, BookOpen, Users, Plus, Edit3, Trash2, Printer,
  Save, AlertTriangle, CheckCircle2, ChevronLeft, Sparkles, Filter,
  Building2, ArrowRight
} from "lucide-react";
import type {
  School, SchoolClass, SchoolSubject, SchoolTeacher, SchoolSession,
  TimetablePeriod, ClassWeeklyTimetable
} from "../../school-types";

interface Props {
  school: School;
  classes: SchoolClass[];
  subjects?: SchoolSubject[];
  teachers?: SchoolTeacher[];
  activeSession?: SchoolSession | null;
  isAdmin?: boolean;
  isTeacher?: boolean;
  currentTeacherId?: string;
  studentClassId?: string;
  onBack?: () => void;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEFAULT_PERIOD_TIMES = [
  { periodNumber: 1, startTime: "08:30", endTime: "09:15" },
  { periodNumber: 2, startTime: "09:15", endTime: "10:00" },
  { periodNumber: 3, startTime: "10:00", endTime: "10:45" },
  { periodNumber: 4, startTime: "10:45", endTime: "11:30" },
  { periodNumber: 5, startTime: "12:00", endTime: "12:45" }, // After Lunch
  { periodNumber: 6, startTime: "12:45", endTime: "01:30" },
  { periodNumber: 7, startTime: "01:30", endTime: "02:15" },
  { periodNumber: 8, startTime: "02:15", endTime: "03:00" },
];

export const TimetableManager: React.FC<Props> = ({
  school,
  classes = [],
  subjects = [],
  teachers = [],
  activeSession,
  isAdmin = false,
  isTeacher = false,
  currentTeacherId,
  studentClassId,
  onBack
}) => {
  // Default selected class
  const initialClassId = studentClassId || (classes[0]?.id || "");
  const [selectedClassId, setSelectedClassId] = useState<string>(initialClassId);
  const [selectedDay, setSelectedDay] = useState<string>("Monday");
  const [viewMode, setViewMode] = useState<"day" | "week" | "teacher">("week");
  const [filterTeacherId, setFilterTeacherId] = useState<string>(currentTeacherId || "");

  // Edit Modal State
  const [editingPeriod, setEditingPeriod] = useState<{
    day: string;
    periodNumber: number;
    period?: TimetablePeriod;
  } | null>(null);

  const [formSubjectName, setFormSubjectName] = useState("");
  const [formTeacherName, setFormTeacherName] = useState("");
  const [formStartTime, setFormStartTime] = useState("08:30");
  const [formEndTime, setFormEndTime] = useState("09:15");
  const [formRoom, setFormRoom] = useState("");
  const [formIsBreak, setFormIsBreak] = useState(false);

  // Storage key
  const storageKey = useMemo(() => `nst_school_timetable_${school?.id || "default"}`, [school?.id]);

  // All schedules: { [classId]: { [day]: TimetablePeriod[] } }
  const [allTimetables, setAllTimetables] = useState<Record<string, Record<string, TimetablePeriod[]>>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return {};
  });

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(allTimetables));
    } catch {}
  }, [allTimetables, storageKey]);

  // Current class schedule
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId) || classes[0], [classes, selectedClassId]);
  const classSchedule = useMemo(() => {
    if (!selectedClass) return {};
    return allTimetables[selectedClass.id] || {};
  }, [allTimetables, selectedClass]);

  // Quick auto-populate standard routine if empty
  const handleAutoPopulate = () => {
    if (!selectedClass) return;
    const sampleSubjects = subjects.filter(s => s.classId === selectedClass.id);
    const subList = sampleSubjects.length > 0 ? sampleSubjects.map(s => s.name) : ["Mathematics", "Science", "English", "Hindi", "Social Science", "Sanskrit/Computer", "Moral Science", "Games/Library"];

    const newClassSchedule: Record<string, TimetablePeriod[]> = {};

    DAYS_OF_WEEK.forEach(day => {
      newClassSchedule[day] = DEFAULT_PERIOD_TIMES.map((t, idx) => {
        const sub = subList[idx % subList.length] || "General Studies";
        const matchedTeacher = teachers.find(tch => Array.isArray(tch.subjects) && tch.subjects.some(s => s.toLowerCase().includes(sub.toLowerCase())));
        return {
          id: `p-${day}-${t.periodNumber}`,
          periodNumber: t.periodNumber,
          startTime: t.startTime,
          endTime: t.endTime,
          subjectName: sub,
          teacherName: matchedTeacher?.name || teachers[idx % Math.max(1, teachers.length)]?.name || "Subject Teacher",
          room: `Room ${selectedClass.name.replace(/\D+/g, "") || "101"}`,
          isBreak: false
        };
      });
    });

    setAllTimetables(prev => ({
      ...prev,
      [selectedClass.id]: newClassSchedule
    }));
  };

  // Open edit modal for a period
  const handleOpenEdit = (day: string, periodNumber: number) => {
    if (!isAdmin && !isTeacher) return;
    const existing = classSchedule[day]?.find(p => p.periodNumber === periodNumber);
    const defaultTime = DEFAULT_PERIOD_TIMES.find(p => p.periodNumber === periodNumber);

    setEditingPeriod({ day, periodNumber, period: existing });
    setFormSubjectName(existing?.subjectName || "");
    setFormTeacherName(existing?.teacherName || "");
    setFormStartTime(existing?.startTime || defaultTime?.startTime || "08:30");
    setFormEndTime(existing?.endTime || defaultTime?.endTime || "09:15");
    setFormRoom(existing?.room || "");
    setFormIsBreak(existing?.isBreak || false);
  };

  // Save period edit
  const handleSavePeriod = () => {
    if (!editingPeriod || !selectedClass) return;
    const { day, periodNumber } = editingPeriod;

    const newPeriod: TimetablePeriod = {
      id: editingPeriod.period?.id || `p-${day}-${periodNumber}-${Date.now()}`,
      periodNumber,
      startTime: formStartTime,
      endTime: formEndTime,
      subjectName: formIsBreak ? "Lunch Break" : (formSubjectName.trim() || "Free Period"),
      teacherName: formIsBreak ? "" : (formTeacherName.trim() || "TBA"),
      room: formRoom.trim() || "",
      isBreak: formIsBreak
    };

    setAllTimetables(prev => {
      const curClassData = prev[selectedClass.id] || {};
      const curDayPeriods = curClassData[day] || [];
      const updatedDayPeriods = [
        ...curDayPeriods.filter(p => p.periodNumber !== periodNumber),
        newPeriod
      ].sort((a, b) => a.periodNumber - b.periodNumber);

      return {
        ...prev,
        [selectedClass.id]: {
          ...curClassData,
          [day]: updatedDayPeriods
        }
      };
    });

    setEditingPeriod(null);
  };

  // Check teacher conflicts across classes for a given day and period
  const checkTeacherConflict = (day: string, periodNumber: number, teacherName: string, currentClassId: string) => {
    if (!teacherName || teacherName === "TBA" || teacherName === "Subject Teacher") return null;
    for (const [cId, sched] of Object.entries(allTimetables)) {
      if (cId === currentClassId) continue;
      const periodsOnDay = sched[day] || [];
      const clash = periodsOnDay.find(p => p.periodNumber === periodNumber && p.teacherName?.toLowerCase() === teacherName.toLowerCase() && !p.isBreak);
      if (clash) {
        const otherCls = classes.find(c => c.id === cId);
        return otherCls?.name || "Another Class";
      }
    }
    return null;
  };

  // Print Timetable
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white px-4 py-4 sm:py-6 shadow-md border-b border-indigo-800/40 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 text-[11px] font-black uppercase tracking-wider border border-blue-400/30">
                  Academic Routine
                </span>
                {activeSession && (
                  <span className="text-slate-300 text-xs font-semibold">
                    Session: {activeSession.name}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white mt-0.5 flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-400" />
                <span>Class Timetable & Period Routine (समय-सारणी)</span>
              </h1>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center gap-1.5 transition border border-white/20 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-300" />
              <span>Print A4 Routine</span>
            </button>
            {(isAdmin || isTeacher) && (
              <button
                type="button"
                onClick={handleAutoPopulate}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto-Fill Standard Routine</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Printable Header (Visible only during print) */}
        <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
          <h2 className="text-2xl font-black text-slate-900">{school?.name || "School Timetable"}</h2>
          <p className="text-xs text-slate-600">{school?.address} {school?.phone && `• Ph: ${school.phone}`}</p>
          <div className="mt-2 inline-block px-4 py-1 rounded bg-slate-100 border border-slate-300 text-sm font-black">
            Official Weekly Timetable — {selectedClass ? `${selectedClass.name} ${selectedClass.section ? `(Sec ${selectedClass.section})` : ""}` : "All Classes"}
          </div>
        </div>

        {/* Filter & View Switcher */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Class Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Select Class:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {classes.map((cls) => {
                const isSel = cls.id === selectedClassId;
                return (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      isSel
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {cls.name} {cls.section ? `(${cls.section})` : ""}
                  </button>
                );
              })}
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                viewMode === "week"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Weekly Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                viewMode === "day"
                  ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Day-by-Day
            </button>
          </div>
        </div>

        {/* DAY SELECTOR TABS (for day mode) */}
        {viewMode === "day" && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 print:hidden">
            {DAYS_OF_WEEK.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                  selectedDay === d
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* ── 1. WEEKLY GRID VIEW (Table) ── */}
        {viewMode === "week" && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                    <th className="p-3 font-black w-24 sticky left-0 bg-slate-100 dark:bg-slate-700">Day</th>
                    {DEFAULT_PERIOD_TIMES.map((t) => (
                      <th key={t.periodNumber} className="p-3 font-black text-center border-l border-slate-200 dark:border-slate-700 min-w-[120px]">
                        <div>Period {t.periodNumber}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{t.startTime} - {t.endTime}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayPeriods = classSchedule[day] || [];
                    return (
                      <tr key={day} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                        <td className="p-3 font-black text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
                          {day}
                        </td>
                        {DEFAULT_PERIOD_TIMES.map((t) => {
                          const p = dayPeriods.find(item => item.periodNumber === t.periodNumber);
                          const clash = p && checkTeacherConflict(day, t.periodNumber, p.teacherName, selectedClass?.id || "");
                          const canEdit = isAdmin || isTeacher;

                          return (
                            <td
                              key={t.periodNumber}
                              onClick={() => canEdit && handleOpenEdit(day, t.periodNumber)}
                              className={`p-2.5 border-l border-slate-200 dark:border-slate-700 align-top transition ${
                                canEdit ? "cursor-pointer hover:bg-blue-50/60 dark:hover:bg-blue-950/30" : ""
                              } ${p?.isBreak ? "bg-amber-50/40 dark:bg-amber-950/20" : ""}`}
                            >
                              {p ? (
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`font-black text-xs ${p.isBreak ? "text-amber-700 dark:text-amber-400" : "text-slate-800 dark:text-white"}`}>
                                      {p.subjectName}
                                    </span>
                                    {canEdit && (
                                      <Edit3 className="w-2.5 h-2.5 text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 print:hidden shrink-0" />
                                    )}
                                  </div>
                                  {!p.isBreak && p.teacherName && (
                                    <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                      <Users className="w-2.5 h-2.5" />
                                      <span className="truncate">{p.teacherName}</span>
                                    </div>
                                  )}
                                  {p.room && (
                                    <div className="text-[9px] text-slate-400">
                                      {p.room}
                                    </div>
                                  )}
                                  {clash && (
                                    <div className="text-[9px] text-rose-600 font-bold flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded">
                                      <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                      <span>Clash: {clash}</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-12 flex items-center justify-center text-slate-300 dark:text-slate-600 text-[10px] italic">
                                  {canEdit ? "+ Add" : "—"}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 2. DAY-BY-DAY CARD VIEW ── */}
        {viewMode === "day" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {DEFAULT_PERIOD_TIMES.map((t) => {
              const dayPeriods = classSchedule[selectedDay] || [];
              const p = dayPeriods.find(item => item.periodNumber === t.periodNumber);
              const clash = p && checkTeacherConflict(selectedDay, t.periodNumber, p.teacherName, selectedClass?.id || "");
              const canEdit = isAdmin || isTeacher;

              return (
                <div
                  key={t.periodNumber}
                  onClick={() => canEdit && handleOpenEdit(selectedDay, t.periodNumber)}
                  className={`bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-md transition relative ${
                    canEdit ? "cursor-pointer hover:border-blue-400" : ""
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-black text-xs">
                      Period {t.periodNumber}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {p?.startTime || t.startTime} - {p?.endTime || t.endTime}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <h4 className="font-black text-base text-slate-900 dark:text-white">
                      {p?.subjectName || "Unassigned"}
                    </h4>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>{p?.teacherName || "No teacher allocated"}</span>
                    </p>
                    {p?.room && (
                      <p className="text-[11px] text-slate-400">
                        Location: {p.room}
                      </p>
                    )}
                    {clash && (
                      <div className="text-[10px] text-rose-600 font-bold flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 p-1.5 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Teacher Clash with {clash}</span>
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Edit3 className="w-3 h-3" /> Edit Period
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EDIT PERIOD MODAL ── */}
      {editingPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  {selectedClass?.name} • {editingPeriod.day}
                </p>
                <h3 className="font-black text-lg text-slate-900 dark:text-white">
                  Period {editingPeriod.periodNumber} Details
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-750 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <input
                type="checkbox"
                checked={formIsBreak}
                onChange={e => setFormIsBreak(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Mark as Recess / Lunch Break (लंच / मध्यंतर)
              </span>
            </label>

            {!formIsBreak && (
              <>
                {/* Subject Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Subject (विषय) *
                  </label>
                  <input
                    type="text"
                    value={formSubjectName}
                    onChange={e => setFormSubjectName(e.target.value)}
                    placeholder="e.g. Mathematics, English, Science"
                    className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
                  />
                  {subjects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {subjects.slice(0, 6).map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setFormSubjectName(s.name)}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-blue-100"
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teacher Selector */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Assigned Teacher (अध्यापक) *
                  </label>
                  <input
                    type="text"
                    value={formTeacherName}
                    onChange={e => setFormTeacherName(e.target.value)}
                    placeholder="e.g. Dr. Arvind Swaminathan"
                    className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-sm font-bold text-slate-800 dark:text-white"
                  />
                  {teachers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5 max-h-20 overflow-y-auto">
                      {teachers.slice(0, 8).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setFormTeacherName(t.name)}
                          className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-emerald-100"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Time slot & Room */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={e => setFormStartTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={e => setFormEndTime(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                Classroom / Lab (Optional)
              </label>
              <input
                type="text"
                value={formRoom}
                onChange={e => setFormRoom(e.target.value)}
                placeholder="e.g. Room 102, Science Lab, Ground"
                className="w-full px-3 py-2 border rounded-xl dark:border-slate-600 dark:bg-slate-700 text-xs font-bold"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleSavePeriod}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md transition cursor-pointer"
              >
                Save Period
              </button>
              <button
                type="button"
                onClick={() => setEditingPeriod(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
