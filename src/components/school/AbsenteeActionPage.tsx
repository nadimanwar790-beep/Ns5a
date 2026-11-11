// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ShieldAlert, Calendar, Users, Phone, PhoneCall, Bell, Send, AlertTriangle,
  AlertCircle, CheckCircle2, MessageCircle, ChevronLeft, Filter, Clock,
  RefreshCw, Check, Loader2, UserX, Sparkles, ArrowRight, Plus, X,
  FileText, CalendarDays, UserCheck, Edit3, Trash2
} from "lucide-react";
import type {
  School,
  SchoolClass,
  SchoolStudent,
  AttendanceRecord,
  StudentAcknowledgedLeave,
  StudentAbsenteeCallLog
} from "../../school-types";
import {
  getStudents,
  getAttendance,
  todayStr,
  saveStudentAcknowledgedLeave,
  getStudentAcknowledgedLeaves,
  deleteStudentAcknowledgedLeave,
  saveAbsenteeCallLog,
  getLocalAbsenteeCallLogs
} from "../../school-firebase";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";

export interface AbsenteeActionPageProps {
  schoolId: string;
  schoolName?: string;
  classes?: SchoolClass[];
  currentRole?: "ADMIN" | "TEACHER" | "ACCOUNTANT";
  currentUserId?: string;
  currentUserName?: string;
  onBack?: () => void;
  onOpenStudentModal?: (student: SchoolStudent) => void;
}

const PRESET_REASONS = [
  { id: "sick", label: "🤒 बीमारी / अस्वस्थ (Sick Leave)", desc: "बुखार, सर्दी, चोट या डॉक्टरी सलाह" },
  { id: "wedding", label: "💍 शादी / पारिवारिक समारोह", desc: "रिश्तेदार की शादी या मांगलिक उत्सव" },
  { id: "out_station", label: "🏡 गाँव जाना / बाहर गए हैं", desc: "पारिवारिक यात्रा या गाँव प्रस्थान" },
  { id: "family_work", label: "🚨 आवश्यक घरेलू कार्य", desc: "घर पर आवश्यक मदद या परिस्थिति" },
  { id: "other", label: "❓ अन्य विशेष कारण", desc: "अभिभावक द्वारा सूचित अन्य कारण" },
];

export const AbsenteeActionPage: React.FC<AbsenteeActionPageProps> = ({
  schoolId,
  schoolName = "School",
  classes = [],
  currentRole = "ADMIN",
  currentUserId = "staff_user",
  currentUserName = "Staff",
  onBack,
  onOpenStudentModal,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [activeSegment, setActiveSegment] = useState<"day2" | "day1" | "expected_returns" | "all">("day2");

  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<{ [classId: string]: AttendanceRecord | null }>({});
  const [yesterdayRecords, setYesterdayRecords] = useState<{ [classId: string]: AttendanceRecord | null }>({});
  const [acknowledgedLeaves, setAcknowledgedLeaves] = useState<StudentAcknowledgedLeave[]>([]);
  const [callLogs, setCallLogs] = useState<{ [studentId: string]: StudentAbsenteeCallLog }>({});
  const [loading, setLoading] = useState<boolean>(true);

  const [broadcasting, setBroadcasting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Leave recording modal state
  const [leaveModalStudent, setLeaveModalStudent] = useState<SchoolStudent | null>(null);
  const [leaveForm, setLeaveForm] = useState<{
    reason: string;
    customNotes: string;
    expectedReturnDate: string;
  }>({
    reason: PRESET_REASONS[0].label,
    customNotes: "",
    expectedReturnDate: "",
  });

  // Call logging modal state
  const [callLogStudent, setCallLogStudent] = useState<SchoolStudent | null>(null);
  const [callLogForm, setCallLogForm] = useState<{
    status: StudentAbsenteeCallLog["status"];
    parentRemarks: string;
  }>({
    status: "connected",
    parentRemarks: "",
  });

  // Helper: calculate previous working day
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

  // Load all students, attendance records, acknowledged leaves, and call logs
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allSts, allLeaves] = await Promise.all([
        getStudents(schoolId),
        getStudentAcknowledgedLeaves(schoolId),
      ]);
      setStudents(allSts);
      setAcknowledgedLeaves(allLeaves || []);

      // Load today's call logs
      const savedLogs = getLocalAbsenteeCallLogs(schoolId, selectedDate);
      const logMap: { [studentId: string]: StudentAbsenteeCallLog } = {};
      savedLogs.forEach((l) => {
        logMap[l.studentId] = l;
      });
      setCallLogs(logMap);

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

  // Smart Segmentation: Excused Leaves, Day 1 (Notice Only), Day 2+ (Call Only), and Overdue Returns
  const {
    absentStudents,
    day1Absentees,
    day2PlusAbsentees,
    onLeaveStudents,
    overdueReturnStudents,
  } = useMemo(() => {
    const rawAbsent: SchoolStudent[] = [];
    const day1: SchoolStudent[] = [];
    const day2: SchoolStudent[] = [];
    const onLeave: { student: SchoolStudent; leave: StudentAcknowledgedLeave }[] = [];
    const overdue: { student: SchoolStudent; leave: StudentAcknowledgedLeave }[] = [];

    // Map active leaves by studentId
    const activeLeavesMap = new Map<string, StudentAcknowledgedLeave>();
    acknowledgedLeaves.forEach((leave) => {
      if (leave.status === "active") {
        activeLeavesMap.set(leave.studentId, leave);
      }
    });

    filteredStudents.forEach((st) => {
      const clsId = st.classId || "class_general";
      const todayRec = attendanceRecords[clsId];
      const todayEntry = todayRec?.students?.[st.id];

      const isPresentToday = Boolean(todayEntry?.present);
      const isAbsentToday = todayRec ? !isPresentToday : false;

      const registeredLeave = activeLeavesMap.get(st.id);

      if (registeredLeave) {
        // Compare return date
        const isWithinLeaveWindow = registeredLeave.expectedReturnDate >= selectedDate;

        if (isWithinLeaveWindow) {
          // Student is excused and on an acknowledged leave
          onLeave.push({ student: st, leave: registeredLeave });
          return; // SUPPRESS from urgent daily alarm list!
        } else {
          // Return date has arrived or passed!
          if (isAbsentToday) {
            // Student failed to return on their committed return date -> AUTO-ESCALATE to Call list!
            overdue.push({ student: st, leave: registeredLeave });
            day2.push(st);
            rawAbsent.push(st);
            return;
          }
        }
      }

      if (isAbsentToday) {
        rawAbsent.push(st);

        // Check yesterday's attendance
        const yestRec = yesterdayRecords[clsId];
        const wasAbsentYesterday = yestRec?.students?.[st.id]?.present === false;

        if (wasAbsentYesterday) {
          day2.push(st);
        } else {
          day1.push(st);
        }
      }
    });

    return {
      absentStudents: rawAbsent,
      day1Absentees: day1,
      day2PlusAbsentees: day2,
      onLeaveStudents: onLeave,
      overdueReturnStudents: overdue,
    };
  }, [filteredStudents, attendanceRecords, yesterdayRecords, acknowledgedLeaves, selectedDate]);

  // Broadcast alert to unexcused absentees
  const handleBroadcastToAllAbsentees = async () => {
    if (absentStudents.length === 0) {
      alert("Chune gaye segment me koi anupasthit chhatra nahi hai.");
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

  // 1-Tap Single Student Push Alert (Day 1 only)
  const handleSendSinglePush = async (student: SchoolStudent) => {
    try {
      await sendSchoolPushNotification({
        schoolId,
        studentIds: [student.id],
        title: `⚠️ ${schoolName} • अनुपस्थिति सूचना`,
        body: `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) आज विद्यालय में उपस्थित नहीं है। कृपया कारण सूचित करें।`,
        type: "SCHOOL_NOTICE",
        url: `/?schoolPortal=1&studentId=${student.id}&schoolTab=attendance`,
        urgent: true,
      });

      setToastMessage(`✅ ${student.name} ke parents ko Push Alert bhej diya gaya!`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch {
      alert("Push alert bhejte samay samasya aayi.");
    }
  };

  // WhatsApp Alert (Day 1 only)
  const handleSendWhatsApp = (student: SchoolStudent) => {
    const phone = student.phone || (student as any).whatsappNo || (student as any).fatherPhone || "";
    if (!phone) {
      alert("Is chhatra ka mobile number uplabdh nahi hai.");
      return;
    }

    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const fullPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const msg = `*${schoolName}*
*दैनिक अनुपस्थिति सूचना (Day 1 Absent Alert)*

आदरणीय अभिभावक (${student.parentName || (student as any).fatherName || "अभिभावक"}),
आपका बच्चा *${student.name}* (कक्षा: ${(student as any).className || student.classId || "Class"}, Roll: #${student.rollNo || "-"}) आज विद्यालय में अनुपस्थित है।

कृपया अनुपस्थिति का कारण विद्यालय में सूचित करें। यदि बच्चा अस्वस्थ है तो शीघ्र स्वस्थ होने की कामना करते हैं।

सादर,
${schoolName} प्रशासन`;

    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, "_blank");
  };

  // Open Leave Recording Modal
  const openLeaveModal = (student: SchoolStudent) => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default: return in 2 days
    const defaultDate = d.toISOString().split("T")[0];

    // Check if there is already an existing leave
    const existing = acknowledgedLeaves.find((l) => l.studentId === student.id && l.status === "active");

    setLeaveModalStudent(student);
    setLeaveForm({
      reason: existing?.reason || PRESET_REASONS[0].label,
      customNotes: existing?.customNotes || "",
      expectedReturnDate: existing?.expectedReturnDate || defaultDate,
    });
  };

  // Save Acknowledged Leave
  const handleSaveLeave = async () => {
    if (!leaveModalStudent) return;
    if (!leaveForm.expectedReturnDate) {
      alert("कृपया छात्र के स्कूल लौटने की संभावित तारीख (Expected Return Date) चुनें।");
      return;
    }

    const newLeave: StudentAcknowledgedLeave = {
      id: `leave_${leaveModalStudent.id}_${Date.now()}`,
      studentId: leaveModalStudent.id,
      schoolId,
      studentName: leaveModalStudent.name,
      rollNo: leaveModalStudent.rollNo,
      className: (leaveModalStudent as any).className || leaveModalStudent.classId,
      classId: leaveModalStudent.classId,
      parentName: leaveModalStudent.parentName || (leaveModalStudent as any).fatherName,
      parentPhone: leaveModalStudent.phone || (leaveModalStudent as any).whatsappNo || (leaveModalStudent as any).fatherPhone,
      reason: leaveForm.reason,
      customNotes: leaveForm.customNotes.trim(),
      leaveStartDate: selectedDate,
      expectedReturnDate: leaveForm.expectedReturnDate,
      recordedBy: currentUserName || "School Staff",
      recordedRole: currentRole,
      recordedAt: new Date().toISOString(),
      status: "active",
    };

    await saveStudentAcknowledgedLeave(newLeave);

    setAcknowledgedLeaves((prev) => {
      const filtered = prev.filter((l) => l.studentId !== leaveModalStudent.id);
      return [newLeave, ...filtered];
    });

    setToastMessage(`✅ ${leaveModalStudent.name} की छुट्टी दर्ज कर ली गई (वापसी: ${leaveForm.expectedReturnDate})। अब इन्हें दैनिक अलार्म में नहीं भेजा जाएगा।`);
    setLeaveModalStudent(null);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Delete / Mark Leave as Completed
  const handleDeleteLeave = async (leaveId: string, studentName?: string) => {
    if (!confirm(`क्या आप ${studentName || "इस छात्र"} की छुट्टी समाप्त या रद्द करना चाहते हैं?`)) {
      return;
    }
    await deleteStudentAcknowledgedLeave(schoolId, leaveId);
    setAcknowledgedLeaves((prev) => prev.filter((l) => l.id !== leaveId));
    setToastMessage(`✅ छुट्टी रिकॉर्ड हटा दिया गया।`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Open Call Log Modal
  const openCallLogModal = (student: SchoolStudent) => {
    const existing = callLogs[student.id];
    setCallLogStudent(student);
    setCallLogForm({
      status: existing?.status || "connected",
      parentRemarks: existing?.parentRemarks || "",
    });
  };

  // Save Call Log
  const handleSaveCallLog = async () => {
    if (!callLogStudent) return;

    const newLog: StudentAbsenteeCallLog = {
      id: `call_${callLogStudent.id}_${Date.now()}`,
      studentId: callLogStudent.id,
      schoolId,
      studentName: callLogStudent.name,
      date: selectedDate,
      callerName: currentUserName || "Staff",
      callerRole: currentRole,
      callTimestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
      parentRemarks: callLogForm.parentRemarks.trim(),
      status: callLogForm.status,
    };

    await saveAbsenteeCallLog(newLog);

    setCallLogs((prev) => ({
      ...prev,
      [callLogStudent.id]: newLog,
    }));

    setToastMessage(`✅ ${callLogStudent.name} के पेरेंट्स से बातचीत का विवरण दर्ज हो गया!`);
    const st = callLogStudent;
    setCallLogStudent(null);
    setTimeout(() => setToastMessage(null), 3000);

    // If parent requested leave during call, prompt to grant leave
    if (callLogForm.status === "leave_granted") {
      setTimeout(() => openLeaveModal(st), 300);
    }
  };

  // Quick return date shortcut helper
  const setQuickReturnDays = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setLeaveForm((prev) => ({
      ...prev,
      expectedReturnDate: d.toISOString().split("T")[0],
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-3 sm:p-6 transition-colors">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xl flex items-center justify-between animate-in slide-in-from-top duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── HEADER ───────────────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 transition cursor-pointer"
                title="Back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                  दैनिक अनुपस्थिति प्रबंधन (Absentee Action Center)
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {currentRole === "ACCOUNTANT" ? "Accountant Desk" : currentRole === "TEACHER" ? "Teacher Desk" : "Admin Desk"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Day 1 (Notice Only), Day 2+ (1-Tap Call Only) व अभिभावक से बातचीत उपरांत छुट्टी व वापसी ट्रैकिंग।
              </p>
            </div>
          </div>

          {/* Date Picker & Refresh */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-750 border border-slate-200 dark:border-slate-700 text-xs font-bold">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 dark:text-white focus:outline-hidden cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 transition cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-300 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── CLASS FILTER TABS ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 p-2 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setSelectedClassId("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                selectedClassId === "all"
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Sabhi Classes ({students.length})
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
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs">
            <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {filteredStudents.length}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              कुल छात्र
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center shadow-xs">
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {day1Absentees.length}
            </p>
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
              Day 1 Absent (Notice Only)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white text-center shadow-md shadow-rose-600/25">
            <p className="text-2xl font-black tabular-nums text-white">
              {day2PlusAbsentees.length}
            </p>
            <p className="text-[11px] font-bold text-rose-100 mt-0.5 flex items-center justify-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300 animate-bounce" />
              2 Day+ Absent (Call Only ⚠️)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-900/60 text-center shadow-xs">
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 tabular-nums">
              {onLeaveStudents.length}
            </p>
            <p className="text-[11px] font-bold text-sky-700 dark:text-sky-300 mt-0.5 flex items-center justify-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" />
              छुट्टी पर (Excused Leaves)
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-center shadow-xs col-span-2 sm:col-span-1">
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
              {absentStudents.length}
            </p>
            <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300 mt-0.5 flex items-center justify-center gap-1">
              <UserX className="w-3.5 h-3.5" />
              सक्रिय अनुपस्थित (Unexcused)
            </p>
          </div>
        </div>

        {/* ── 1-CLICK BROADCAST TO DAY 1 ABSENTEES BANNER ────────────────────────── */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-600 via-rose-700 to-red-700 text-white shadow-xl shadow-rose-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 animate-pulse text-amber-300" />
              <h3 className="text-sm sm:text-base font-black">
                1-Click Day 1 Absent Alert Broadcast
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-rose-700">
                AUTO NOTICE
              </span>
            </div>
            <p className="text-xs text-rose-100 max-w-xl">
              कुल {day1Absentees.length} पहले दिन के अनुपस्थित छात्रों के पेरेंट्स को Lock-screen Push Alert भेजें। (छुट्टी पर दर्ज छात्र सुरक्षित रूप से बाहर हैं)।
            </p>
          </div>

          <button
            type="button"
            onClick={handleBroadcastToAllAbsentees}
            disabled={broadcasting || day1Absentees.length === 0}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white hover:bg-rose-50 text-rose-700 font-black text-xs shadow-lg active:scale-95 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
          >
            {broadcasting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
                <span>भेजा जा रहा है...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-rose-700" />
                <span>📢 1-Click Day 1 छात्रों को Notice भेजें</span>
              </>
            )}
          </button>
        </div>

        {/* ── SEGMENT SWITCHER TABS ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-200/80 dark:bg-slate-800 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSegment("day2")}
            className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "day2"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>🚨 2 Day+ Absent (Call Only) ({day2PlusAbsentees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment("day1")}
            className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "day1"
                ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>📢 Day 1 (Notice Only) ({day1Absentees.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment("expected_returns")}
            className={`flex-1 min-w-[140px] py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeSegment === "expected_returns"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/30"
                : "text-slate-700 dark:text-slate-300 hover:text-slate-900"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>📅 Expected Return List ({onLeaveStudents.length})</span>
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

        {/* ── SEGMENT 1: DAY 2+ CONSECUTIVE ABSENTEES (CALL ONLY - NO MESSAGE) ──── */}
        {activeSegment === "day2" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  2+ दिन से लगातार अनुपस्थित (Day 2+ केवल कॉल व पूछताछ)
                </h4>
              </div>
              <span className="text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-2.5 py-0.5 rounded-full">
                {day2PlusAbsentees.length} छात्र
              </span>
            </div>

            {day2PlusAbsentees.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  शानदार! कोई भी छात्र 2 दिन से लगातार अनुपस्थित नहीं है।
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  सभी छात्र नियमित हैं या उनकी छुट्टी पहले से दर्ज है।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {day2PlusAbsentees.map((st) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";
                  const callLog = callLogs[st.id];
                  const hasCalled = Boolean(callLog);
                  const isOverdue = overdueReturnStudents.some((o) => o.student.id === st.id);

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
                              {isOverdue ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white animate-pulse">
                                  ⚠️ वापसी तारीख बीत गई (Missed Return)
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                  ⚠️ 2+ दिन से Absent
                                </span>
                              )}
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
                              <span>कॉल सम्पन्न ({callLog.callTimestamp})</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center gap-1.5 border border-rose-300 dark:border-rose-800">
                              <Clock className="w-3.5 h-3.5 text-rose-600" />
                              <span>कॉल बाकी ⏳</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Day 2 Action Rule: Message is GONE, ONLY DIRECT CALL + CALL LOG */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            onClick={() => openCallLogModal(st)}
                            className="flex-1 min-w-[200px] py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition cursor-pointer"
                          >
                            <Phone className="w-4 h-4 animate-bounce" />
                            <span>📞 1-Tap Direct Call ({phone})</span>
                          </a>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold px-3 py-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                            Phone number उपलब्ध नहीं है
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => openCallLogModal(st)}
                          className="py-3 px-4 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
                        >
                          <FileText className="w-4 h-4 text-amber-400" />
                          <span>📝 कॉल रिमार्क्स दर्ज करें</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openLeaveModal(st)}
                          className="py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/20 transition cursor-pointer"
                        >
                          <CalendarDays className="w-4 h-4" />
                          <span>📅 छुट्टी व वापसी तय करें</span>
                        </button>
                      </div>

                      {/* Display saved call remarks if any */}
                      {callLog && callLog.parentRemarks && (
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-750/70 text-xs border border-slate-200 dark:border-slate-700">
                          <span className="font-bold text-slate-500 dark:text-slate-400">पेरेंट्स से बातचीत का नोट:</span>{" "}
                          <span className="font-medium text-slate-800 dark:text-slate-200">"{callLog.parentRemarks}"</span>
                          <span className="ml-2 text-[10px] text-slate-400">({callLog.callerName})</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENT 2: DAY 1 ABSENTEES (MESSAGE ONLY - NO CALL) ──────────────── */}
        {activeSegment === "day1" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                पहला दिन अनुपस्थित (Day 1 केवल Notice व WhatsApp अलर्ट)
              </h4>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2.5 py-0.5 rounded-full">
                {day1Absentees.length} छात्र
              </span>
            </div>

            {day1Absentees.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  आज कोई नया छात्र अनुपस्थित नहीं है।
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  सभी छात्र उपस्थित हैं या उनकी छुट्टी दर्ज है।
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
                              Day 1 Absent
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Class: {(st as any).className || st.classId || "Class"} • {phone ? `Ph: ${phone}` : "No phone registered"}
                          </p>
                        </div>
                      </div>

                      {/* Day 1 Action Rule: ONLY Message Options (WhatsApp / Push / Leave Log). Call is hidden */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(st)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp Notice</span>
                        </button>

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
                          onClick={() => openLeaveModal(st)}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>छुट्टी / वजह दर्ज करें</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENT 3: EXPECTED RETURN LIST ─────────────────────────────────── */}
        {activeSegment === "expected_returns" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-sky-500" />
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-sky-700 dark:text-sky-400">
                  Expected Return List
                </h4>
              </div>
              <span className="text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2.5 py-0.5 rounded-full">
                {onLeaveStudents.length} छात्र छुट्टी पर
              </span>
            </div>

            {onLeaveStudents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CalendarDays className="w-10 h-10 text-sky-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  वर्तमान में कोई भी छात्र पूर्व-स्वीकृत छुट्टी पर नहीं है।
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  जब किसी छात्र के अभिभावक कारण व संभावित वापसी की तारीख बताएंगे, तो वे यहाँ सुरक्षित ट्रैक होंगे।
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {onLeaveStudents.map(({ student: st, leave }) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";

                  // Calculate countdown days
                  const todayDate = new Date(selectedDate);
                  const returnDate = new Date(leave.expectedReturnDate);
                  const diffTime = returnDate.getTime() - todayDate.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  let countdownLabel = "";
                  let countdownColor = "";
                  if (diffDays === 0) {
                    countdownLabel = "⚡ आज स्कूल आने की तारीख है!";
                    countdownColor = "bg-amber-500 text-slate-950 font-black";
                  } else if (diffDays > 0) {
                    countdownLabel = `⏳ ${diffDays} दिन बाद आएंगे (${leave.expectedReturnDate})`;
                    countdownColor = "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold";
                  } else {
                    countdownLabel = "⚠️ वापसी की तारीख बीत चुकी है!";
                    countdownColor = "bg-rose-600 text-white font-black animate-pulse";
                  }

                  return (
                    <div
                      key={leave.id}
                      className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-800/80 shadow-md space-y-3 hover:shadow-lg transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 font-mono font-black text-sm flex items-center justify-center shrink-0 border border-sky-300 dark:border-sky-900">
                            #{st.rollNo || "-"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h5 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                {st.name}
                              </h5>
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] ${countdownColor}`}>
                                {countdownLabel}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Class: <strong>{(st as any).className || st.classId || "Class"}</strong> • Parent: {st.parentName || (st as any).fatherName || "Guardian"} • {phone ? `Ph: ${phone}` : "No phone"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold text-slate-400">
                          दर्जकर्ता: {leave.recordedBy} ({leave.recordedRole})
                        </span>
                      </div>

                      {/* Reason & Remarks Info Box */}
                      <div className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/40 text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-800 dark:text-sky-300">कारण:</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{leave.reason}</span>
                        </div>
                        {leave.customNotes && (
                          <div className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                            <span className="font-bold shrink-0">विशेष विवरण:</span>
                            <span>"{leave.customNotes}"</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                          <span>अवकाश प्रारम्भ: {leave.leaveStartDate}</span>
                          <span>संभावित वापसी: <strong className="text-sky-700 dark:text-sky-300">{leave.expectedReturnDate}</strong></span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>कॉल करें</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => openLeaveModal(st)}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>तारीख / कारण बदलें</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteLeave(leave.id, st.name)}
                          className="px-3.5 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>स्कूल वापस आ गए (समाप्त)</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SEGMENT 4: ALL ABSENTEES COMBINED ─────────────────────────────────── */}
        {activeSegment === "all" && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                सभी सक्रिय अनुपस्थित छात्र (Combined View)
              </h4>
              <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-2.5 py-0.5 rounded-full">
                {absentStudents.length} Students
              </span>
            </div>

            {absentStudents.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2 shadow-xs">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white">
                  कोई भी छात्र अनुपस्थित नहीं है।
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
                              {isDay2 ? "2-Day Absent (Call Action) ⚠️" : "1-Day Absent (Notice)"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Class: {(st as any).className || st.classId || "Class"} • {phone ? `Ph: ${phone}` : "No phone"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {isDay2 ? (
                          <>
                            {phone && (
                              <a
                                href={`tel:${phone}`}
                                onClick={() => openCallLogModal(st)}
                                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black flex items-center gap-1.5 shadow-sm transition"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>1-Tap Call</span>
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => openCallLogModal(st)}
                              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold"
                            >
                              कॉल रिमार्क्स
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSendWhatsApp(st)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSendSinglePush(st)}
                              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black flex items-center gap-1 shadow-sm transition cursor-pointer"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              <span>Push</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => openLeaveModal(st)}
                          className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                        >
                          छुट्टी दर्ज करें
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

      {/* ── MODAL 1: RECORD ACKNOWLEDGED LEAVE (छुट्टी व संभावित वापसी) ────────── */}
      {leaveModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    छात्र छुट्टी व वापसी दर्ज करें
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {leaveModalStudent.name} (Roll #{leaveModalStudent.rollNo || "-"})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLeaveModalStudent(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Reason Selector Chips */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                अनुपस्थिति का मुख्य कारण (Select Reason):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_REASONS.map((r) => {
                  const isSelected = leaveForm.reason === r.label;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLeaveForm({ ...leaveForm, reason: r.label })}
                      className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                        isSelected
                          ? "bg-sky-500/15 border-sky-500 text-sky-700 dark:text-sky-300 font-bold ring-1 ring-sky-500"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="font-bold leading-tight">{r.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expected Return Date Picker + Quick Day Chips */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                कब तक स्कूल वापस आएगा? (Expected Return Date) *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  required
                  min={selectedDate}
                  value={leaveForm.expectedReturnDate}
                  onChange={(e) => setLeaveForm({ ...leaveForm, expectedReturnDate: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs focus:ring-2 focus:ring-sky-500 focus:outline-hidden cursor-pointer"
                />
              </div>

              {/* Quick Day Chips (+1 दिन, +2 दिन, +3 दिन, +5 दिन, +7 दिन) */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] font-bold text-slate-400 mr-1">त्वरित चयन:</span>
                {[
                  { label: "कल (+1 दिन)", days: 1 },
                  { label: "+2 दिन", days: 2 },
                  { label: "+3 दिन", days: 3 },
                  { label: "+5 दिन", days: 5 },
                  { label: "+1 सप्ताह (7 दिन)", days: 7 },
                ].map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setQuickReturnDays(item.days)}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-[11px] font-bold hover:bg-sky-100 transition cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes / Parent conversation details */}
            <div className="space-y-1 pt-1">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                अभिभावक से बातचीत विवरण / विशेष टिप्पणी (Remarks):
              </label>
              <textarea
                rows={3}
                placeholder="उदा. माता जी से बात हुई, बच्चे को बुखार है। डॉक्टर को दिखाया है, सोमवार से नियमित आएंगे।"
                value={leaveForm.customNotes}
                onChange={(e) => setLeaveForm({ ...leaveForm, customNotes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            {/* System Rule Notice */}
            <div className="p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-[11px] text-sky-800 dark:text-sky-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>स्मार्ट ऑटो-सप्रेशन नियम:</span>
              </div>
              <p className="leading-relaxed">
                छुट्टी दर्ज होते ही छात्र को दैनिक अनुपस्थिति अलार्म से बाहर कर दिया जाएगा। तय तारीख पर छात्र उपस्थित नहीं होने पर सिस्टम इन्हें पुनः <strong>कॉल लिस्ट</strong> में डाल देगा।
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setLeaveModalStudent(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveLeave}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-md shadow-sky-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>छुट्टी दर्ज करें (Save Leave)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: RECORD CALL REMARKS & CONVERSATION ──────────────────────── */}
      {callLogStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                    कॉल बातचीत विवरण दर्ज करें
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {callLogStudent.name} (Parent: {callLogStudent.parentName || (callLogStudent as any).fatherName || "Guardian"})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCallLogStudent(null)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Call Status Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                कॉल परिणाम (Call Status):
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { id: "connected", label: "📞 बात हो गई (Connected)" },
                  { id: "not_reachable", label: "📵 फोन नहीं उठा (No Answer)" },
                  { id: "call_back", label: "⏳ दोबारा कॉल करना है" },
                  { id: "leave_granted", label: "📝 छुट्टी मांगी है" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCallLogForm({ ...callLogForm, status: item.id as any })}
                    className={`p-2.5 rounded-xl border text-left font-bold transition cursor-pointer ${
                      callLogForm.status === item.id
                        ? "bg-rose-500/15 border-rose-500 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500"
                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks Textarea */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                पेरेंट्स से क्या बात हुई? (Remarks):
              </label>
              <textarea
                rows={3}
                placeholder="उदा. पिता जी ने बताया कि शादी में गए हैं, कल तक आ जाएंगे।"
                value={callLogForm.parentRemarks}
                onChange={(e) => setCallLogForm({ ...callLogForm, parentRemarks: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCallLogStudent(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveCallLog}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-md shadow-rose-600/30 transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>सुरक्षित करें (Save Log)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
