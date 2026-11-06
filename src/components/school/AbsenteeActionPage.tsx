// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert, Calendar, Users, Phone, PhoneCall, Bell, Send, AlertTriangle,
  AlertCircle, CheckCircle2, MessageCircle, ChevronLeft, Filter, Clock,
  RefreshCw, Check, Loader2, UserX, Sparkles, ArrowRight
} from "lucide-react";
import type { School, SchoolClass, SchoolStudent, AttendanceRecord } from "../../school-types";
import {
  getStudents, getAttendance, subscribeToAttendance, todayStr
} from "../../school-firebase";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

export interface AbsenteeActionPageProps {
  schoolId: string;
  schoolName?: string;
  classes?: SchoolClass[];
  currentRole?: "ADMIN" | "TEACHER";
  currentUserId?: string;
  onBack?: () => void;
  onOpenStudentModal?: (student: SchoolStudent) => void;
}

export const AbsenteeActionPage: React.FC<AbsenteeActionPageProps> = ({
  schoolId,
  schoolName = "School",
  classes = [],
  currentRole = "ADMIN",
  currentUserId,
  onBack,
  onOpenStudentModal,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [activeSegment, setActiveSegment] = useState<"day2" | "day1" | "all">("day2");

  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [classId: string]: AttendanceRecord | null }>({});
  const [yesterdayRecords, setYesterdayRecords] = useState<{ [classId: string]: AttendanceRecord | null }>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Call status and reason notes saved locally and in RTDB
  const callLogsStorageKey = `nst_absentee_call_logs_${schoolId}_${selectedDate}`;
  const [callNotes, setCallNotes] = useState<{ [id: string]: { note?: string; called?: boolean; timestamp?: string } }>(() => {
    try {
      const raw = localStorage.getItem(callLogsStorageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Calculate previous working day (skips Sunday to Saturday)
  const getPreviousWorkingDateStr = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      if (d.getDay() === 0) {
        d.setDate(d.getDate() - 1);
      }
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  const yesterdayDateStr = useMemo(() => getPreviousWorkingDateStr(selectedDate), [selectedDate]);

  // Load all students and attendance for selected date & yesterday
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allSts = await getStudents(schoolId);
      setStudents(allSts);

      // Load attendance records for all classes
      const todayRecMap: { [classId: string]: AttendanceRecord | null } = {};
      const yestRecMap: { [classId: string]: AttendanceRecord | null } = {};

      const classList = classes.length > 0
        ? classes
        : Array.from(new Set(allSts.map((s) => s.classId).filter(Boolean))).map((cid) => ({ id: cid, name: cid }));

      await Promise.allSettled(
        classList.map(async (cls) => {
          const [todayRec, yestRec] = await Promise.all([
            getAttendance(schoolId, cls.id, selectedDate),
            getAttendance(schoolId, cls.id, yesterdayDateStr),
          ]);
          todayRecMap[cls.id] = todayRec;
          yestRecMap[cls.id] = yestRec;
        })
      );

      setAttendanceRecords(todayRecMap);
      setYesterdayRecords(yestRecMap);
    } catch (err) {
      console.warn("[AbsenteeActionPage] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [schoolId, classes, selectedDate, yesterdayDateStr]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Filter students by selected class
  const filteredStudents = useMemo(() => {
    if (selectedClassId === "all") return students;
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  // Map student attendance for today and yesterday
  const { absentStudents, day1Absentees, day2PlusAbsentees, presentStudents } = useMemo(() => {
    const absent: SchoolStudent[] = [];
    const present: SchoolStudent[] = [];
    const day1: SchoolStudent[] = [];
    const day2: SchoolStudent[] = [];

    filteredStudents.forEach((st) => {
      const clsId = st.classId || "class_general";
      const todayRec = attendanceRecords[clsId];
      const todayEntry = todayRec?.students?.[st.id];

      // Student is marked absent or not marked present when record exists
      const isPresentToday = Boolean(todayEntry?.present);
      const isAbsentToday = todayRec ? !isPresentToday : false;

      if (isAbsentToday) {
        absent.push(st);

        // Check yesterday's attendance
        const yestRec = yesterdayRecords[clsId];
        const wasAbsentYesterday = yestRec?.students?.[st.id]?.present === false;

        if (wasAbsentYesterday) {
          day2.push(st);
        } else {
          day1.push(st);
        }
      } else {
        present.push(st);
      }
    });

    return {
      absentStudents: absent,
      day1Absentees: day1,
      day2PlusAbsentees: day2,
      presentStudents: present,
    };
  }, [filteredStudents, attendanceRecords, yesterdayRecords]);

  // 1-Click Broadcast Absent Notification to all unmarked/absent students
  const handleBroadcastToAllAbsentees = async () => {
    if (absentStudents.length === 0) {
      alert("Chune gaye segment me koi bhi chhatra anupasthit nahi hai.");
      return;
    }
    setBroadcasting(true);
    setToastMessage(null);

    try {
      const targetIds = absentStudents.map((s) => s.id);
      const pushRes = await sendSchoolPushNotification({
        schoolId,
        studentIds: targetIds,
        title: `⚠️ ${schoolName} • अनुपस्थिति सूचना (Absent Alert)`,
        body: `आदरणीय अभिभावक, आपका बच्चा आज विद्यालय में अनुपस्थित है। यदि कोई समस्या या अवकाश है तो कृपया सूचित करें।`,
        type: "SCHOOL_NOTICE",
        url: `/?schoolPortal=1&schoolTab=attendance`,
        urgent: true,
      });

      const msg = `✅ ${targetIds.length} अनुपस्थित छात्रों के पेरेंट्स को Lock-screen Push Notification भेज दिया गया! (Delivered: ${pushRes.delivered})`;
      setToastMessage(msg);
      setTimeout(() => setToastMessage(null), 5000);
    } catch {
      alert("Notification भेजने में समस्या आई। Kripya punah prayas karein.");
    } finally {
      setBroadcasting(false);
    }
  };

  // 1-Tap Single Student Push Alert (Day 1)
  const handleSendSinglePush = async (student: SchoolStudent) => {
    try {
      const res = await sendSchoolPushNotification({
        schoolId,
        studentIds: [student.id],
        title: `⚠️ ${schoolName} • अनुपस्थिति सूचना`,
        body: `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) आज विद्यालय में उपस्थित नहीं है। कृपया कारण सूचित करें।`,
        type: "SCHOOL_NOTICE",
        url: `/?schoolPortal=1&studentId=${student.id}&schoolTab=attendance`,
        urgent: true,
      });
      setToastMessage(`✅ ${student.name} के पेरेंट्स को ऐप नोटिफिकेशन भेजा गया! (Delivered: ${res.delivered})`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch {
      alert("अलर्ट भेजने में समस्या आई।");
    }
  };

  // Send WhatsApp message to parent
  const handleSendWhatsApp = (student: SchoolStudent, isDay2: boolean) => {
    const rawPhone = student.phone || (student as any).whatsappNo || (student as any).fatherPhone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const msg = isDay2
      ? `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) लगातार 2 दिनों से विद्यालय में अनुपस्थित है। कृपया तुरंत विद्यालय प्रशासन से संपर्क करें। - ${schoolName}`
      : `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) आज विद्यालय में उपस्थित नहीं हुआ है। यदि अवकाश का कारण है तो कृपया विद्यालय को अवगत कराएं। - ${schoolName}`;

    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      alert("इस छात्र के पेरेंट्स का मोबाइल नंबर दर्ज नहीं है।");
    }
  };

  // Log Call & Reason note
  const updateStudentCallNote = (studentId: string, note: string) => {
    setCallNotes((prev) => {
      const next = {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          note,
          called: true,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      };
      try {
        localStorage.setItem(callLogsStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markStudentAsCalled = (studentId: string) => {
    setCallNotes((prev) => {
      const next = {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || {}),
          called: true,
          timestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        },
      };
      try {
        localStorage.setItem(callLogsStorageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* ── TOP APP BAR ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 dark:bg-slate-850/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-rose-600/30">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  Absentee Action Center
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white">
                  🚨 LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-Day Notification & 2-Day Direct Call Action • {schoolName}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="p-3 sm:p-5 max-w-4xl mx-auto space-y-4">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2.5 animate-in fade-in shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ── FILTER BAR: DATE & CLASS ─────────────────────────────────────────── */}
        <div className="p-3.5 sm:p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              <Filter className="w-4 h-4 text-rose-600" />
              <span>Target Class & Tareekh Chunein:</span>
            </div>

            {/* Date Input */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Class Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              type="button"
              onClick={() => setSelectedClassId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedClassId === "all"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-102"
                  : "bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <span>Sabhi Classes (All School)</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                {students.length}
              </span>
            </button>

            {classes.map((cls) => {
              const isSelected = selectedClassId === cls.id;
              const count = students.filter((s) => s.classId === cls.id).length;
              return (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => setSelectedClassId(cls.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-102"
                      : "bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  <span>{cls.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── KPI STATS CARDS ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs">
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {filteredStudents.length}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              Kul Namankit Chhatra
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-center shadow-xs">
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {absentStudents.length}
            </p>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5 flex items-center justify-center gap-1">
              <UserX className="w-3.5 h-3.5" />
              Kul Absent Aaj
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center shadow-xs">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {day1Absentees.length}
            </p>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Day 1 Absent (Notice)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white text-center shadow-md shadow-rose-600/25">
            <p className="text-2xl font-black tabular-nums text-white">
              {day2PlusAbsentees.length}
            </p>
            <p className="text-[11px] font-bold text-rose-100 mt-0.5 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              2 Day+ Absent (Call ⚠️)
            </p>
          </div>
        </div>

        {/* ── 1-CLICK BROADCAST TO ALL ABSENTEES BANNER ────────────────────────── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white shadow-xl shadow-rose-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 animate-pulse text-amber-300" />
              <h3 className="text-sm sm:text-base font-black">
                1-Click Absent Alert Broadcast
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-rose-700">
                AUTO PUSH
              </span>
            </div>
            <p className="text-xs text-rose-100 max-w-xl">
              Sabhi {absentStudents.length} anupasthit chhatron ke parents ke phone par instant <strong>Lock-screen Push Alert</strong> bhejein:
              <em>"Aapka bachha aaj school nahi aaya hai."</em>
            </p>
          </div>

          <button
            type="button"
            onClick={handleBroadcastToAllAbsentees}
            disabled={broadcasting || absentStudents.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 font-black text-xs shadow-lg active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {broadcasting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
                <span>Bheja ja raha hai...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-rose-700" />
                <span>📢 1-Click Sabhi Absent Chhatron Ko Alert Bhejein</span>
              </>
            )}
          </button>
        </div>

        {/* ── SEGMENT SWITCHER TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setActiveSegment("day2")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "day2"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>🚨 2 Day+ Absent (Call Action) ({day2PlusAbsentees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment("day1")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "day1"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>📢 Day 1 Absent (Notice) ({day1Absentees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment("all")}
            className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <span>All ({absentStudents.length})</span>
          </button>
        </div>

        {/* ── SEGMENT 1: DAY 2+ CONSECUTIVE ABSENTEES (CALL ACTION CENTER) ──────── */}
        {activeSegment === "day2" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  2 Din Se Lagatar Anupasthit Chhatra (Day 2+ Action)
                </h4>
              </div>
              <span className="text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-0.5 rounded-full">
                {day2PlusAbsentees.length} Chhatra
              </span>
            </div>

            {day2PlusAbsentees.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  Shabash! Koi bhi chhatra 2 din se lagatar absent nahi hai.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Sabhi chhatra regular hain ya unhone kal attendance banayi thi.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {day2PlusAbsentees.map((st) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";
                  const callInfo = callNotes[st.id];
                  const hasCalled = Boolean(callInfo?.called);

                  return (
                    <div
                      key={st.id}
                      className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border-2 border-rose-400 dark:border-rose-800/80 shadow-md space-y-3.5 hover:shadow-lg transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-rose-300 dark:border-rose-900">
                            #{st.rollNo || "-"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                {st.name}
                              </h5>
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                ⚠️ 2 Din Se Absent
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Class: <strong>{(st as any).className || st.classId || "Class"}</strong> • Roll: #{st.rollNo || "N/A"} • Parent: {st.parentName || (st as any).fatherName || "Guardian"}
                            </p>
                          </div>
                        </div>

                        {/* Call Status Badge */}
                        <div className="flex items-center gap-2">
                          {hasCalled ? (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Call Done ({callInfo?.timestamp || "Logged"})</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center gap-1.5 border border-rose-300 dark:border-rose-800">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>Call Pending ⏳</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-Tap Direct Call + WhatsApp + Push Actions */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            onClick={() => markStudentAsCalled(st.id)}
                            className="flex-1 min-w-[170px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                          >
                            <Phone className="w-4 h-4 animate-bounce" />
                            <span>📞 1-Tap Direct Call ({phone})</span>
                          </a>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold px-3 py-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                            Phone number uplabdh nahi hai
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(st, true)}
                          className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Alert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSinglePush(st)}
                          className="py-2.5 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                          <span>App Push</span>
                        </button>
                      </div>

                      {/* Reason Log Dropdown */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 bg-slate-50 dark:bg-slate-750/50 p-2.5 rounded-2xl">
                        <label className="text-[11px] font-bold text-slate-500 shrink-0">
                          Kyu nahi aaya? (Reason Note):
                        </label>
                        <select
                          value={callInfo?.note || ""}
                          onChange={(e) => updateStudentCallNote(st.id, e.target.value)}
                          className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden cursor-pointer"
                        >
                          <option value="">-- Reason Chunein (Select Reason) --</option>
                          <option value="बीमारी / अस्वस्थ (Sick Leave)">बीमारी / अस्वस्थ (Sick Leave)</option>
                          <option value="पारिवारिक कार्य / इमरजेंसी (Family Emergency)">पारिवारिक कार्य / इमरजेंसी (Family Emergency)</option>
                          <option value="बिना सूचना अनुपस्थित (Uninformed)">बिना सूचना अनुपस्थित (Uninformed)</option>
                          <option value="गाँव या बाहर गए हैं (Out of Station)">गाँव या बाहर गए हैं (Out of Station)</option>
                          <option value="अन्य कारण (Other Reason)">अन्य कारण (Other Reason)</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENT 2: DAY 1 ABSENTEES (NOTICE & PUSH ALERT CENTER) ──────────── */}
        {activeSegment === "day1" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                Aaj Ka Pehla Din Absent (Day 1 Notice Dispatch)
              </h4>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                {day1Absentees.length} Chhatra
              </span>
            </div>

            {day1Absentees.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  Aaj koi naya chhatra absent nahi hai.
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sabhi chhatra upasthit hain.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {day1Absentees.map((st) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";
                  return (
                    <div
                      key={st.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono font-black text-xs flex items-center justify-center shrink-0">
                          #{st.rollNo || "-"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm text-slate-900 dark:text-white">
                              {st.name}
                            </h5>
                            <span className="text-[10px] px-2 py-0.2 rounded-md font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              Day 1
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Class: {(st as any).className || st.classId || "Class"} • {phone ? `Ph: ${phone}` : "No phone registered"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendSinglePush(st)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Push Alert</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(st, false)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
                            title="Direct Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENT 3: ALL ABSENTEES COMBINED ─────────────────────────────────── */}
        {activeSegment === "all" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                Sabhi Anupasthit Chhatra (Combined List)
              </h4>
              <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full">
                {absentStudents.length} Students
              </span>
            </div>

            {absentStudents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  Koi bhi chhatra absent nahi hai.
                </h4>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {absentStudents.map((st) => {
                  const isDay2 = day2PlusAbsentees.some((s) => s.id === st.id);
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";

                  return (
                    <div
                      key={st.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-10 h-10 rounded-2xl font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                          isDay2 ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        }`}>
                          #{st.rollNo || "-"}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-black text-sm text-slate-900 dark:text-white">
                              {st.name}
                            </h5>
                            <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold ${
                              isDay2 ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                            }`}>
                              {isDay2 ? "2-Day Absent ⚠️" : "1-Day Absent"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Class: {(st as any).className || st.classId || "Class"} • {phone ? `Ph: ${phone}` : "No phone"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDay2 && phone && (
                          <a
                            href={`tel:${phone}`}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendSinglePush(st)}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Push</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(st, isDay2)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
