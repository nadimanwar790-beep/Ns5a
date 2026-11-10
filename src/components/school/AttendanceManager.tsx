// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  saveAttendance, subscribeToAttendance, getAttendance, getMonthlyAttendance, getStudents, todayStr, currentMonthStr,
  isStudentBirthdayToday, dispatchOfficialSchoolBirthdayWish
} from "../../school-firebase";
import type { SchoolStudent, AttendanceRecord } from "../../school-types";
import {
  CheckCircle, XCircle, Download, Calendar, Users, ChevronLeft, ChevronRight,
  Camera, QrCode, Phone, PhoneCall, Bell, Send, AlertTriangle, AlertCircle,
  CheckCircle2, MessageCircle, ShieldAlert, Sparkles, PhoneOutgoing, Loader2,
  Cake, Gift, Heart, Wifi, WifiOff, Cloud, CloudOff, RefreshCw
} from "lucide-react";
import { speakNotification } from "../../utils/voiceNotifyEngine";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { QrAttendanceScannerModal } from "./QrAttendanceScannerModal";
import { ClassQrCodeModal } from "./ClassQrCodeModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { FaceAttendanceKioskModal } from "./FaceAttendanceKioskModal";
import { UniversalFaceIdStudioModal } from "./UniversalFaceIdStudioModal";

interface Props {
  schoolId: string;
  classId: string;
  className: string;
  teacherId: string;
  onBack?: () => void;
}

export const AttendanceManager: React.FC<Props> = ({ schoolId, classId, className, teacherId, onBack }) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [attendance, setAttendance] = useState<{ [id: string]: boolean }>({});
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [viewMode, setViewMode] = useState<"mark" | "absentee" | "report" | "matrix">("mark");
  const [monthlyData, setMonthlyData] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [showFaceKiosk, setShowFaceKiosk] = useState(false);
  const [showFaceStudio, setShowFaceStudio] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SchoolStudent | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"id_card" | "fees" | "attendance">("attendance");
  const [showClassQrModal, setShowClassQrModal] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{ studentName: string; rollNo: string; date: string; info: any } | null>(null);

  // Absentee Action Center & 2-Day Tracker States
  const [yesterdayRecord, setYesterdayRecord] = useState<AttendanceRecord | null>(null);
  const [broadcastingAbsentees, setBroadcastingAbsentees] = useState(false);
  const [absenteeBroadcastToast, setAbsenteeBroadcastToast] = useState<string | null>(null);
  const [absenteeCallNotes, setAbsenteeCallNotes] = useState<{ [id: string]: { note?: string; called?: boolean } }>(() => {
    try {
      const saved = localStorage.getItem(`nst_call_logs_${schoolId}_${classId}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // ── Offline Attendance Queue & Network State ─────────────────────────────
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const QUEUE_KEY = `nst_offline_attendance_queue_${schoolId}`;
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem(`nst_offline_attendance_queue_${schoolId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [offlineAlertMsg, setOfflineAlertMsg] = useState<string | null>(null);
  const [isSyncingQueue, setIsSyncingQueue] = useState<boolean>(false);

  const getStoredQueue = useCallback((): any[] => {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [QUEUE_KEY]);

  const enqueueOfflineRecord = useCallback((record: AttendanceRecord) => {
    const queue = getStoredQueue();
    const id = `${record.classId}_${record.date}`;
    const next = [
      { id, date: record.date, classId: record.classId, className, record, timestamp: new Date().toISOString() },
      ...queue.filter((q: any) => q.id !== id)
    ];
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(next));
    } catch {}
    setOfflineQueue(next);
  }, [QUEUE_KEY, className, getStoredQueue]);

  const syncOfflineQueue = useCallback(async () => {
    const queue = getStoredQueue();
    if (queue.length === 0) return;
    setIsSyncingQueue(true);
    let synced = 0;
    const remaining: any[] = [];

    for (const item of queue) {
      try {
        await saveAttendance(item.record);
        synced++;
      } catch (e) {
        remaining.push(item);
      }
    }

    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    } catch {}
    setOfflineQueue(remaining);
    setIsSyncingQueue(false);

    if (synced > 0) {
      setOfflineAlertMsg(`☁️ बैकग्राउंड सिंक पूर्ण: ${synced} ऑफलाइन हाजिरी रिकॉर्ड्स क्लाउड पर सफलतापूर्वक सिंक हो गए!`);
      speakNotification("अटेंडेंस सिंक पूर्ण", `${synced} हाजिरी रिकॉर्ड क्लाउड पर सिंक हो गए।`);
      setTimeout(() => setOfflineAlertMsg(null), 4500);
    }
  }, [QUEUE_KEY, getStoredQueue]);

  // Network listener & auto-sync every 20s
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = setInterval(() => {
      if (typeof navigator !== "undefined" && navigator.onLine && getStoredQueue().length > 0) {
        syncOfflineQueue();
      }
    }, 20000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [syncOfflineQueue, getStoredQueue]);

  // Birthday Detection for No-Punishment Policy & Greetings
  const birthdayStudentsInClass = React.useMemo(() => {
    return students.filter(s => isStudentBirthdayToday(s.dateOfBirth));
  }, [students]);

  const [wishingBirthdayId, setWishingBirthdayId] = useState<string | null>(null);
  const [wishingClassBirthdays, setWishingClassBirthdays] = useState(false);
  const [birthdayNoticeToast, setBirthdayNoticeToast] = useState<string | null>(null);

  const handleWishSingleStudent = async (student: SchoolStudent) => {
    setWishingBirthdayId(student.id);
    try {
      await dispatchOfficialSchoolBirthdayWish({
        schoolId,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        className: className || "Class",
        photoUrl: student.photoUrl,
        dateOfBirth: student.dateOfBirth,
        parentPhone: student.phone
      });
      setBirthdayNoticeToast(`🎉 ${student.name} को जन्मदिन की बधाई व शुभाशीर्वाद भेजा गया!`);
      setTimeout(() => setBirthdayNoticeToast(null), 4000);
    } catch (e: any) {
      alert("Birthday wish error: " + (e?.message || "Error"));
    } finally {
      setWishingBirthdayId(null);
    }
  };

  const handleWishAllClassBirthdays = async (list: SchoolStudent[]) => {
    setWishingClassBirthdays(true);
    try {
      for (const st of list) {
        await dispatchOfficialSchoolBirthdayWish({
          schoolId,
          studentId: st.id,
          studentName: st.name,
          rollNo: st.rollNo,
          className: className || "Class",
          photoUrl: st.photoUrl,
          dateOfBirth: st.dateOfBirth,
          parentPhone: st.phone
        });
      }
      setBirthdayNoticeToast(`🎉 सभी ${list.length} छात्रों को जन्मदिन की शुभकामनाएं प्रेषित की गईं!`);
      setTimeout(() => setBirthdayNoticeToast(null), 4000);
    } catch (e: any) {
      alert("Birthday wish error: " + (e?.message || "Error"));
    } finally {
      setWishingClassBirthdays(false);
    }
  };

  // Calculate previous working day date
  const getPreviousWorkingDateStr = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      d.setDate(d.getDate() - 1);
      if (d.getDay() === 0) { // If Sunday, skip to Saturday
        d.setDate(d.getDate() - 1);
      }
      return d.toISOString().split("T")[0];
    } catch {
      return dateStr;
    }
  };

  // Fetch yesterday's attendance to compute 2-day consecutive absentees
  useEffect(() => {
    const prevDate = getPreviousWorkingDateStr(selectedDate);
    getAttendance(schoolId, classId, prevDate).then(rec => {
      setYesterdayRecord(rec);
    }).catch(() => setYesterdayRecord(null));
  }, [schoolId, classId, selectedDate]);

  useEffect(() => {
    getStudents(schoolId, classId).then(s => {
      setStudents(s);
      const init: { [id: string]: boolean } = {};
      s.forEach(st => (init[st.id] = true));
      setAttendance(init);
      setLoading(false);
    });
  }, [schoolId, classId]);

  useEffect(() => {
    const unsubscribe = subscribeToAttendance(schoolId, classId, selectedDate, (rec: AttendanceRecord | null) => {
      setExistingRecord(rec);
      if (rec) {
        const m: { [id: string]: boolean } = {};
        Object.entries(rec.students || {}).forEach(([id, v]: any) => (m[id] = v.present));
        setAttendance(m);
      } else {
        const init: { [id: string]: boolean } = {};
        students.forEach(s => (init[s.id] = true));
        setAttendance(init);
      }
    });

    return unsubscribe;
  }, [schoolId, classId, selectedDate, students]);

  useEffect(() => {
    if (viewMode === "report" || viewMode === "matrix") {
      getMonthlyAttendance(schoolId, classId, selectedMonth).then(setMonthlyData);
    }
  }, [viewMode, selectedMonth, schoolId, classId]);

  const toggleStudent = (id: string) => {
    setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const markAll = (present: boolean) => {
    const m: { [id: string]: boolean } = {};
    students.forEach(s => (m[s.id] = present));
    setAttendance(m);
    setSaved(false);
  };

  const saveRecord = async () => {
    setSaving(true);
    const studentsMap: AttendanceRecord["students"] = { ...(existingRecord?.students || {}) };
    students.forEach(s => {
      const previous = studentsMap[s.id];
      studentsMap[s.id] = {
        ...previous,
        present: attendance[s.id] ?? previous?.present ?? true,
        name: s.name,
        rollNo: s.rollNo,
      };
    });
    const record: AttendanceRecord = {
      date: selectedDate,
      schoolId,
      classId,
      sessionId: students[0]?.sessionId || "",
      markedBy: teacherId,
      students: studentsMap,
      createdAt: new Date().toISOString()
    };

    let cloudSynced = false;
    const isCurrentlyOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (isCurrentlyOnline) {
      try {
        await Promise.race([
          saveAttendance(record),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Network timeout")), 2500))
        ]);
        cloudSynced = true;
      } catch (err) {
        console.warn("[Attendance] Cloud sync slow or failed, fallback to offline queue:", err);
      }
    }

    if (!cloudSynced) {
      // Enqueue for offline sync
      enqueueOfflineRecord(record);
      const prs = Object.values(studentsMap).filter(st => st.present).length;
      setOfflineAlertMsg(
        `📶 हाजिरी फोन में सुरक्षित सेव हो गई है (${prs} उपस्थित)। इंटरनेट कमजोर या बंद होने के कारण यह ऑफलाइन सुरक्षित है, नेटवर्क आते ही अपने आप क्लाउड पर सिंक हो जाएगी।`
      );
      speakNotification(
        "हाजिरी ऑफलाइन सेव",
        "कमजोर नेटवर्क के कारण हाजिरी डिवाइस में सुरक्षित सेव हो गई है। इंटरनेट आने पर स्वतः सिंक होगी।"
      );
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }

    setSaving(false);
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  // Filter today's absent students
  const absentStudents = students.filter(s => {
    const isPresent = attendance[s.id] ?? existingRecord?.students?.[s.id]?.present;
    return isPresent === false;
  });

  // Split into Day 1 Absent vs Day 2+ Consecutive Absent
  const { day1Absentees, day2PlusAbsentees } = (() => {
    const day1: SchoolStudent[] = [];
    const day2Plus: SchoolStudent[] = [];

    absentStudents.forEach(st => {
      const wasAbsentYesterday = yesterdayRecord?.students?.[st.id]?.present === false;
      if (wasAbsentYesterday) {
        day2Plus.push(st);
      } else {
        day1.push(st);
      }
    });

    return { day1Absentees: day1, day2PlusAbsentees: day2Plus };
  })();

  // 1-Click Broadcast Absentee Notices
  const handleBroadcastAbsenteeNotices = async () => {
    if (absentStudents.length === 0) {
      alert("आज कोई भी छात्र अनुपस्थित नहीं है।");
      return;
    }
    setBroadcastingAbsentees(true);
    try {
      const studentIds = absentStudents.map(s => s.id);
      const pushRes = await sendSchoolPushNotification({
        schoolId,
        classId,
        studentIds,
        title: `⚠️ विद्यालय अनुपस्थिति सूचना • ${className}`,
        body: `आदरणीय अभिभावक, आपका बच्चा आज विद्यालय में अनुपस्थित है। यदि कोई समस्या या अवकाश है तो कृपया सूचित करें।`,
        type: "SCHOOL_NOTICE",
        url: `/?schoolPortal=1&classId=${classId}&schoolTab=attendance`,
        urgent: true,
      });

      setAbsenteeBroadcastToast(`✅ ${studentIds.length} अनुपस्थित छात्रों के अभिभावकों को पुश नोटिफिकेशन भेज दिया गया! (Delivered: ${pushRes.delivered})`);
      setTimeout(() => setAbsenteeBroadcastToast(null), 4000);
    } catch {
      alert("Notification भेजने में समस्या आई।");
    } finally {
      setBroadcastingAbsentees(false);
    }
  };

  // 1-Tap Single Absent Push Notice
  const handleSendSingleAbsentPush = async (student: SchoolStudent) => {
    try {
      await sendSchoolPushNotification({
        schoolId,
        classId,
        studentIds: [student.id],
        title: `⚠️ अनुपस्थिति सूचना • ${className}`,
        body: `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) आज विद्यालय में उपस्थित नहीं है। कृपया कारण सूचित करें।`,
        type: "SCHOOL_NOTICE",
        url: `/?schoolPortal=1&studentId=${student.id}&schoolTab=attendance`,
        urgent: true,
      });
      setAbsenteeBroadcastToast(`✅ ${student.name} के पेरेंट्स को अनुपस्थिति अलर्ट भेजा गया!`);
      setTimeout(() => setAbsenteeBroadcastToast(null), 3500);
    } catch {
      alert("अलर्ट भेजने में समस्या आई।");
    }
  };

  // WhatsApp Alert Link
  const handleSendSingleWhatsApp = (student: SchoolStudent, isDay2: boolean) => {
    const rawPhone = student.phone || (student as any).whatsappNo || (student as any).fatherPhone || "";
    const cleanPhone = rawPhone.replace(/\D/g, "");
    const msg = isDay2
      ? `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) लगातार 2 दिनों से विद्यालय में अनुपस्थित है। कृपया तुरंत विद्यालय प्रशासन से संपर्क करें। - ${className}`
      : `आदरणीय अभिभावक, आपका बच्चा ${student.name} (Roll #${student.rollNo || "-"}) आज विद्यालय में उपस्थित नहीं हुआ है। यदि अवकाश का कारण है तो कृपया विद्यालय को अवगत कराएं। - ${className}`;
    
    if (cleanPhone) {
      window.open(`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      alert("इस छात्र के पेरेंट्स का फोन नंबर उपलब्ध नहीं है।");
    }
  };

  // Call status & notes logging
  const updateCallNote = (studentId: string, note: string) => {
    setAbsenteeCallNotes(prev => {
      const next = { ...prev, [studentId]: { ...(prev[studentId] || {}), note, called: true } };
      try {
        localStorage.setItem(`nst_call_logs_${schoolId}_${classId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const markStudentCalled = (studentId: string) => {
    setAbsenteeCallNotes(prev => {
      const next = { ...prev, [studentId]: { ...(prev[studentId] || {}), called: true } };
      try {
        localStorage.setItem(`nst_call_logs_${schoolId}_${classId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Monthly Report: compute per-student attendance stats
  const studentStats = students.map(s => {
    const days = monthlyData.filter(r => r.students[s.id] !== undefined);
    const presentDays = days.filter(r => r.students[s.id]?.present).length;
    return { ...s, totalDays: days.length, presentDays, absentDays: days.length - presentDays, pct: days.length > 0 ? Math.round((presentDays / days.length) * 100) : 0 };
  });

  const downloadMHTMLReport = () => {
    const rows = studentStats.map(s =>
      `<tr><td>${s.rollNo}</td><td>${s.name}</td><td>${s.presentDays}</td><td>${s.absentDays}</td><td>${s.totalDays}</td><td style="color:${s.pct >= 75 ? "green" : "red"}">${s.pct}%</td></tr>`
    ).join("");

    const html = `<html><head><meta charset="UTF-8"><title>Attendance Report - ${className}</title>
<style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#1e293b}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1e293b;color:white;padding:10px;text-align:left}td{padding:8px 10px;border-bottom:1px solid #e2e8f0}tr:hover{background:#f8fafc}.summary{display:flex;gap:24px;margin:16px 0}.card{background:#f1f5f9;border-radius:8px;padding:12px 20px;text-align:center}.card h3{margin:0;font-size:24px}.card p{margin:4px 0;color:#64748b;font-size:13px}</style></head>
<body>
<h1>📋 Attendance Report</h1>
<p><strong>School:</strong> ${schoolId} &nbsp;|&nbsp; <strong>Class:</strong> ${className} &nbsp;|&nbsp; <strong>Month:</strong> ${selectedMonth}</p>
<div class="summary">
<div class="card"><h3>${monthlyData.length}</h3><p>Total Days</p></div>
<div class="card"><h3>${studentStats.length}</h3><p>Students</p></div>
<div class="card" style="background:#dcfce7"><h3>${studentStats.filter(s => s.pct >= 75).length}</h3><p>≥75% Attendance</p></div>
<div class="card" style="background:#fee2e2"><h3>${studentStats.filter(s => s.pct < 75).length}</h3><p>&lt;75% Attendance</p></div>
</div>
<table><thead><tr><th>Roll No</th><th>Student Name</th><th>Present</th><th>Absent</th><th>Total Days</th><th>Attendance %</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="margin-top:24px;color:#94a3b8;font-size:12px">Generated by IIC×NSTA Smart School System on ${new Date().toLocaleString()}</p>
</body></html>`;

    const blob = new Blob([html], { type: "multipart/related; type=\"text/html\"; boundary=\"boundary\"" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${className}_${selectedMonth}.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changeMonth = (delta: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-slate-400">Loading students...</div>;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>}
          <div>
            <h2 className="font-bold text-slate-800 dark:text-white">{className} — Attendance</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-500">{students.length} छात्र</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              {isOnline ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ऑनलाइन (क्लाउड सिंक)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  ऑफलाइन मोड (लोकल सुरक्षित)
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={isSyncingQueue}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer animate-pulse"
              title="पेंडिंग हाजिरी क्लाउड पर सिंक करें"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? "animate-spin" : ""}`} />
              <span>{isSyncingQueue ? "सिंक हो रहा है..." : `☁️ ${offlineQueue.length} पेंडिंग सिंक करें`}</span>
            </button>
          )}

          <button onClick={() => setViewMode("mark")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${viewMode === "mark" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Mark (दैनिक)</button>
          <button onClick={() => setViewMode("absentee")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${viewMode === "absentee" ? "bg-rose-600 text-white shadow-md shadow-rose-600/30" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"}`}>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>🚨 Absenty Action Center ({absentStudents.length})</span>
          </button>
          <button onClick={() => setViewMode("report")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${viewMode === "report" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Report</button>
          <button onClick={() => setViewMode("matrix")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${viewMode === "matrix" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>📅 31-Day Matrix</button>
        </div>
      </div>

      {offlineAlertMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="p-3 bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold rounded-xl flex items-center justify-between gap-2 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2">
              <CloudOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{offlineAlertMsg}</span>
            </div>
            <button
              onClick={() => setOfflineAlertMsg(null)}
              className="p-1 hover:bg-amber-500/20 rounded text-slate-500 cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewMode === "mark" ? (
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Toast Notification */}
          {absenteeBroadcastToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{absenteeBroadcastToast}</span>
            </div>
          )}

          {/* Birthday Wish Sent Toast */}
          {birthdayNoticeToast && (
            <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold rounded-xl flex items-center justify-between gap-2 shadow-lg animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>{birthdayNoticeToast}</span>
              </div>
              <button type="button" onClick={() => setBirthdayNoticeToast(null)} className="p-1 hover:bg-white/20 rounded">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ── TEACHER NOTICE: TODAY'S BIRTHDAYS & NO PUNISHMENT POLICY ── */}
          {birthdayStudentsInClass.length > 0 && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white shadow-xl border-2 border-white/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0">
                  🎂
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white text-rose-700 shadow-xs">
                      🛡️ NO PUNISHMENT POLICY
                    </span>
                    <span className="text-xs text-rose-100 font-bold">
                      आज {birthdayStudentsInClass.length} छात्र का जन्मदिन है!
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-black text-white mt-1">
                    🎉 आज {birthdayStudentsInClass.map(s => s.name).join(", ")} का जन्मदिन है!
                  </p>
                  <p className="text-[11px] text-rose-100/95 font-medium leading-relaxed mt-0.5">
                    शिक्षकों से विनम्र अनुरोध: आज जन्मदिन के शुभ अवसर पर इन छात्रों को डांटें या किसी कारण दंडित (punish) न करें। स्कूल की ओर से इन्हें शुभकामनाएं व शुभाशीर्वाद दें।
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWishAllClassBirthdays(birthdayStudentsInClass)}
                disabled={wishingClassBirthdays}
                className="px-3.5 py-2 rounded-xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-md transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-center"
              >
                {wishingClassBirthdays ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gift className="w-3.5 h-3.5" />}
                <span>{wishingClassBirthdays ? "भेज रहे हैं..." : "🎁 Send Birthday Blessing"}</span>
              </button>
            </div>
          )}

          {/* Date Picker */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <Calendar className="w-5 h-5 text-blue-500" />
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
              className="flex-1 bg-transparent text-slate-800 dark:text-white font-medium outline-none" />
            {existingRecord && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Saved</span>}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-blue-600">{presentCount}/{students.length}</p>
              <p className="text-[11px] text-blue-500 font-semibold">Present Today</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-emerald-600">
                {students.filter(s => existingRecord?.students[s.id]?.inTime).length}
              </p>
              <p className="text-[11px] text-emerald-500 font-semibold">Punched In</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-amber-600">
                {students.filter(s => existingRecord?.students[s.id]?.outTime).length}
              </p>
              <p className="text-[11px] text-amber-500 font-semibold">Punched Out (Exit)</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/30 rounded-xl p-3 text-center">
              <p className="text-xl font-black text-rose-600">
                {students.filter(s => existingRecord?.students[s.id]?.status === "late").length}
              </p>
              <p className="text-[11px] text-rose-400 font-semibold">Late Arrivals</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button onClick={() => markAll(true)} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition">All Present</button>
            <button onClick={() => markAll(false)} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition">All Absent</button>
          </div>

          {/* 1-Click Absentee Broadcast Button (If any absent student) */}
          {absentStudents.length > 0 && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span className="font-bold text-slate-800 dark:text-white">
                  आज {absentStudents.length} छात्र अनुपस्थित हैं।
                </span>
              </div>
              <button
                type="button"
                onClick={handleBroadcastAbsenteeNotices}
                disabled={broadcastingAbsentees}
                className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/30 active:scale-95 transition cursor-pointer"
              >
                {broadcastingAbsentees ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>भेजा जा रहा है...</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3.5 h-3.5" />
                    <span>📢 1-Click सभी अभिभावकों को अनुपस्थिति अलर्ट भेजें</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Smart Attendance Actions: AI Face Kiosk, Live Face Studio, Camera QR, and Class QR */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setShowFaceKiosk(true)}
              className="py-2.5 px-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-300" />
              <span>AI Face Kiosk</span>
            </button>
            <button
              type="button"
              onClick={() => setShowFaceStudio(true)}
              className="py-2.5 px-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 transition cursor-pointer"
              title="लाइव कैमरे से छात्र का चेहरा रजिस्टर व टेस्ट करें"
            >
              <Camera size={14} className="text-amber-200" />
              <span>📷 लाइव फेस आईडी</span>
            </button>
            <button
              type="button"
              onClick={() => setShowQrScanner(true)}
              className="py-2.5 px-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Camera size={14} />
              <span>📷 QR Scan</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClassQrModal(true)}
              className="py-2.5 px-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <QrCode size={14} className="text-emerald-400" />
              <span>📱 Class QR</span>
            </button>
          </div>

          {/* Student List with In/Out Timing */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs overflow-hidden border border-slate-200 dark:border-slate-700">
            {students.map((s) => {
              const stEntry = existingRecord?.students[s.id];
              const inTime = stEntry?.inTime;
              const outTime = stEntry?.outTime;
              const duration = stEntry?.stayDuration;
              const isLate = stEntry?.status === "late";
              const isBirthday = isStudentBirthdayToday(s.dateOfBirth);

              return (
                <div
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 cursor-pointer transition-colors border-b dark:border-slate-700 last:border-0 ${
                    isBirthday
                      ? "bg-rose-50/80 dark:bg-rose-950/30 border-l-4 border-l-pink-500 shadow-xs"
                      : attendance[s.id]
                      ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750"
                      : "bg-red-50/70 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 w-8 text-right">
                      #{s.rollNo}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-800 dark:text-white font-bold text-sm leading-tight">
                          {s.name}
                        </span>

                        {isBirthday && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 text-white text-[10px] font-black shadow-xs animate-pulse">
                              <span>🎂 Happy Birthday!</span>
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[9px] font-black">
                              <span>🛡️ No Punishment</span>
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForModal(s);
                            setModalInitialTab("attendance");
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold transition-colors"
                          title="View ID Card, Fee Details & Attendance"
                        >
                          Options
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px]">
                        {inTime ? (
                          <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                            isLate ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          }`}>
                            <span>In: {inTime}</span>
                            {isLate && <span className="font-bold text-[10px]">(Late)</span>}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No entry punch</span>
                        )}

                        {outTime && (
                          <span className="inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            Exit: {outTime}
                          </span>
                        )}

                        {duration && (
                          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                            ⏱️ {duration}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isBirthday && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWishSingleStudent(s);
                        }}
                        disabled={wishingBirthdayId === s.id}
                        className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-[11px] font-black flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                        title="Send Official Birthday Blessing Card to Student"
                      >
                        {wishingBirthdayId === s.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Gift className="w-3 h-3" />
                        )}
                        <span>{wishingBirthdayId === s.id ? "भेज रहे हैं..." : "🎁 Wish"}</span>
                      </button>
                    )}

                    {attendance[s.id]
                      ? <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                      : <XCircle className="w-6 h-6 text-red-400 shrink-0" />}
                  </div>
                </div>
              );
            })}
          </div>

          {students.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No students in this class yet</p>
            </div>
          )}

          {students.length > 0 && (
            <button onClick={saveRecord} disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md disabled:opacity-60 transition-colors">
              {saving ? "Saving..." : saved ? "✓ Attendance Saved!" : "Save Attendance"}
            </button>
          )}
        </div>
      ) : viewMode === "absentee" ? (
        /* ABSENTEE ACTION CENTER (ABSENTY PAGE) */
        <div className="p-4 space-y-4 max-w-3xl mx-auto animate-in fade-in">
          {/* Header & Date */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Absentee Action Center (अनुपस्थिति ट्रैकर)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Day 1 अनुपस्थिति नोटिस व Day 2+ लगातार अनुपस्थित छात्रों पर 1-टैप कॉल एक्शन
                  </p>
                </div>
              </div>
            </div>

            {/* Date selector */}
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-750 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-white outline-hidden cursor-pointer"
              />
            </div>
          </div>

          {/* Toast Notification */}
          {absenteeBroadcastToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{absenteeBroadcastToast}</span>
            </div>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center shadow-xs">
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums">
                {absentStudents.length}
              </p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                कुल अनुपस्थित आज
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-center shadow-xs">
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                {day1Absentees.length}
              </p>
              <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                पहला दिन (Day 1)
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900/60 text-center shadow-xs">
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400 tabular-nums">
                {day2PlusAbsentees.length}
              </p>
              <p className="text-[11px] font-bold text-rose-800 dark:text-rose-300 mt-0.5 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                लगातार 2+ दिन ⚠️
              </p>
            </div>
          </div>

          {/* 1-Click Broadcast Button to all Absentees */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white shadow-lg shadow-rose-600/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 animate-pulse text-amber-300" />
                <h4 className="text-sm font-black">
                  1-Click Absent Alert Broadcast
                </h4>
              </div>
              <p className="text-xs text-rose-100 mt-0.5">
                सभी {absentStudents.length} अनुपस्थित बच्चों के माता-पिता के फोन पर लॉक-स्क्रीन अलर्ट भेजें
              </p>
            </div>
            <button
              type="button"
              onClick={handleBroadcastAbsenteeNotices}
              disabled={broadcastingAbsentees || absentStudents.length === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 font-black text-xs shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {broadcastingAbsentees ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
                  <span>भेजा जा रहा है...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-rose-700" />
                  <span>📢 सभी अनुपस्थित को Alert भेजें</span>
                </>
              )}
            </button>
          </div>

          {/* ── SECTION 1: 2-DAY CONSECUTIVE ABSENTEES (CALL ACTION CENTER) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                <h4 className="text-sm font-black text-rose-700 dark:text-rose-400 uppercase tracking-wide flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4" />
                  2 दिन से लगातार अनुपस्थित छात्र (Day 2+ Action Center)
                </h4>
              </div>
              <span className="text-xs font-bold text-rose-600 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full">
                {day2PlusAbsentees.length} छात्र
              </span>
            </div>

            {day2PlusAbsentees.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <h5 className="text-xs font-black text-slate-800 dark:text-white">
                  शानदार! कोई भी छात्र लगातार 2 दिन से अनुपस्थित नहीं है।
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  सभी छात्र नियमित हैं या कल उपस्थित थे।
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {day2PlusAbsentees.map((st) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";
                  const callInfo = absenteeCallNotes[st.id];
                  const hasCalled = Boolean(callInfo?.called);

                  return (
                    <div
                      key={st.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800/80 shadow-md space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-black text-sm flex items-center justify-center shrink-0">
                            #{st.rollNo || "-"}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-black text-sm text-slate-900 dark:text-white">
                                {st.name}
                              </h5>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white animate-pulse">
                                ⚠️ 2 दिन से Absent
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Class: {className} • Roll: #{st.rollNo || "N/A"} • Parent: {st.parentName || st.fatherName || "Guardian"}
                            </p>
                          </div>
                        </div>

                        {/* Call Status Badge */}
                        <div className="flex items-center gap-2">
                          {hasCalled ? (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              कॉल किया गया ✓
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              कॉल बाकी है
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Direct Action Buttons: 1-Tap Call & WhatsApp */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {phone ? (
                          <a
                            href={`tel:${phone}`}
                            onClick={() => markStudentCalled(st.id)}
                            className="flex-1 min-w-[160px] py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-rose-600/30 transition cursor-pointer"
                          >
                            <Phone className="w-4 h-4 animate-bounce" />
                            <span>📞 1-Tap Call ({phone})</span>
                          </a>
                        ) : (
                          <span className="text-xs text-rose-500 font-bold px-3 py-2 bg-rose-50 dark:bg-rose-950/40 rounded-xl">
                            फोन नंबर उपलब्ध नहीं
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSendSingleWhatsApp(st, true)}
                          className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp Notice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendSingleAbsentPush(st)}
                          className="py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                        >
                          <Bell className="w-4 h-4" />
                          <span>Push Alert</span>
                        </button>
                      </div>

                      {/* Reason Log Dropdown */}
                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[11px] font-bold text-slate-500 shrink-0">
                          अनुपस्थिति का कारण दर्ज करें:
                        </label>
                        <select
                          value={callInfo?.note || ""}
                          onChange={(e) => updateCallNote(st.id, e.target.value)}
                          className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750 text-slate-800 dark:text-white font-medium focus:outline-hidden"
                        >
                          <option value="">-- कारण चुनें (Select Reason) --</option>
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

          {/* ── SECTION 2: DAY 1 ABSENTEES (NOTIFICATION CENTER) ── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                आज का पहला दिन अनुपस्थित (Day 1 Absent Notice)
              </h4>
              <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950 px-2.5 py-0.5 rounded-full">
                {day1Absentees.length} छात्र
              </span>
            </div>

            {day1Absentees.length === 0 ? (
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  आज कोई नया छात्र अनुपस्थित नहीं है।
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-xs">
                {day1Absentees.map((st) => {
                  const phone = st.phone || (st as any).whatsappNo || (st as any).fatherPhone || "";
                  return (
                    <div
                      key={st.id}
                      className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-750 transition"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono font-bold text-slate-400 w-7 text-right">
                          #{st.rollNo}
                        </span>
                        <div>
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white">
                            {st.name}
                          </h5>
                          <p className="text-[11px] text-slate-400">
                            {phone ? `Ph: ${phone}` : "No phone registered"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendSingleAbsentPush(st)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>Push Alert</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendSingleWhatsApp(st, false)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
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
        </div>
      ) : viewMode === "matrix" ? (
        /* 31-DAY MONTHLY ATTENDANCE MATRIX */
        <div className="p-3 sm:p-4 space-y-4 max-w-full overflow-hidden">
          {/* Month selector & actions */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-4 h-4" /></button>
              <span className="font-bold text-slate-800 dark:text-white text-base">
                📅 {new Date(selectedMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Print / PDF Matrix</span>
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-800 dark:text-white">Legend:</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-emerald-500 text-white font-black text-[10px] flex items-center justify-center">P</span> Present</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-amber-500 text-white font-black text-[10px] flex items-center justify-center">L</span> Late Arrival</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-blue-500 text-white font-black text-[10px] flex items-center justify-center">LV</span> Leave</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-purple-600 text-white font-black text-[10px] flex items-center justify-center">B</span> Bunk</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">A</span> Absent</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-amber-150 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[9px] flex items-center justify-center">Sun</span> Sunday</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-400 font-black text-[10px] flex items-center justify-center">-</span> Holiday / No Record</span>
            <span className="ml-auto text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold italic">Tip: Click cell to view In-Time & Exit-Time</span>
          </div>

          {/* 31-Day Matrix Table */}
          {(() => {
            const [yStr, mStr] = selectedMonth.split("-");
            const yr = parseInt(yStr, 10);
            const mn = parseInt(mStr, 10);
            const daysInMonth = new Date(yr, mn, 0).getDate();
            const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

            return (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200 dark:border-slate-700 overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px]">
                      <th className="sticky left-0 z-20 bg-slate-800 px-2.5 py-2.5 text-left min-w-[50px] border-r border-slate-700">Roll</th>
                      <th className="sticky left-[50px] z-20 bg-slate-800 px-3 py-2.5 text-left min-w-[140px] border-r border-slate-700">Student Name</th>
                      {daysArr.map(d => {
                        const dow = new Date(yr, mn - 1, d).getDay();
                        const isSun = dow === 0;
                        return (
                          <th key={d} className={`px-1.5 py-2 text-center min-w-[30px] border-r border-slate-700 font-bold ${isSun ? "bg-amber-600/60 text-amber-100" : ""}`}>
                            <div>{d}</div>
                            <div className="text-[9px] font-normal opacity-80">{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][dow]}</div>
                          </th>
                        );
                      })}
                      <th className="px-2 py-2 text-center bg-emerald-900 text-emerald-100 min-w-[40px] font-bold">P</th>
                      <th className="px-2 py-2 text-center bg-amber-900 text-amber-100 min-w-[40px] font-bold">L</th>
                      <th className="px-2 py-2 text-center bg-rose-900 text-rose-100 min-w-[40px] font-bold">A</th>
                      <th className="px-2 py-2 text-center bg-indigo-900 text-indigo-100 min-w-[50px] font-bold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((st, idx) => {
                      let pCount = 0;
                      let lCount = 0;
                      let aCount = 0;
                      let recordedDays = 0;

                      const cells = daysArr.map(d => {
                        const dateStr = `${selectedMonth}-${String(d).padStart(2, "0")}`;
                        const dow = new Date(yr, mn - 1, d).getDay();
                        const isSun = dow === 0;
                        const rec = monthlyData.find(r => r.date === dateStr);
                        const entry = rec?.students?.[st.id];

                        if (rec && entry !== undefined) {
                          recordedDays++;
                          if (entry.status === "leave") {
                            return { day: d, date: dateStr, status: "LV", entry, isSun };
                          } else if (entry.status === "bunk") {
                            aCount++;
                            return { day: d, date: dateStr, status: "B", entry, isSun };
                          } else if (entry.present) {
                            if (entry.status === "late") {
                              lCount++;
                              pCount++;
                              return { day: d, date: dateStr, status: "L", entry, isSun };
                            }
                            pCount++;
                            return { day: d, date: dateStr, status: "P", entry, isSun };
                          } else {
                            aCount++;
                            return { day: d, date: dateStr, status: "A", entry, isSun };
                          }
                        }

                        if (isSun) {
                          return { day: d, date: dateStr, status: "SUN", entry: null, isSun: true };
                        }
                        return { day: d, date: dateStr, status: "NONE", entry: null, isSun: false };
                      });

                      const pct = recordedDays > 0 ? Math.round((pCount / recordedDays) * 100) : 0;

                      return (
                        <tr key={st.id} className={`border-b dark:border-slate-700/60 transition-colors ${idx % 2 === 0 ? "bg-white dark:bg-slate-850" : "bg-slate-50/70 dark:bg-slate-800"}`}>
                          <td className="sticky left-0 z-10 bg-inherit px-2.5 py-2 font-mono font-bold text-slate-500 border-r border-slate-200 dark:border-slate-700">
                            {st.rollNo}
                          </td>
                          <td className="sticky left-[50px] z-10 bg-inherit px-3 py-2 font-bold text-slate-800 dark:text-white truncate border-r border-slate-200 dark:border-slate-700">
                            {st.name}
                          </td>
                          {cells.map(c => {
                            let badgeStyle = "text-slate-300 dark:text-slate-600";
                            let text = "-";

                            if (c.status === "P") {
                              badgeStyle = "bg-emerald-500 text-white font-black cursor-pointer shadow-2xs hover:scale-110 active:scale-95";
                              text = "P";
                            } else if (c.status === "L") {
                              badgeStyle = "bg-amber-500 text-white font-black cursor-pointer shadow-2xs hover:scale-110 active:scale-95";
                              text = "L";
                            } else if (c.status === "A") {
                              badgeStyle = "bg-rose-500 text-white font-black cursor-pointer shadow-2xs hover:scale-110 active:scale-95";
                              text = "A";
                            } else if (c.status === "LV") {
                              badgeStyle = "bg-blue-500 text-white font-black cursor-pointer shadow-2xs hover:scale-110 active:scale-95";
                              text = "LV";
                            } else if (c.status === "B") {
                              badgeStyle = "bg-purple-600 text-white font-black cursor-pointer shadow-2xs hover:scale-110 active:scale-95";
                              text = "B";
                            } else if (c.status === "SUN") {
                              badgeStyle = "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-semibold text-[9px]";
                              text = "Su";
                            }

                            return (
                              <td
                                key={c.day}
                                onClick={() => {
                                  if (c.entry) {
                                    setSelectedCellInfo({
                                      studentName: st.name,
                                      rollNo: st.rollNo,
                                      date: c.date,
                                      info: c.entry,
                                    });
                                  }
                                }}
                                className={`px-1 py-1.5 text-center border-r border-slate-200 dark:border-slate-700 ${c.isSun ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}`}
                              >
                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] transition-transform ${badgeStyle}`}>
                                  {text}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-1.5 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">{pCount}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-amber-600 bg-amber-50/50 dark:bg-amber-950/20">{lCount}</td>
                          <td className="px-2 py-1.5 text-center font-bold text-rose-600 bg-rose-50/50 dark:bg-rose-950/20">{aCount}</td>
                          <td className="px-2 py-1.5 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${pct >= 75 ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"}`}>
                              {pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {/* Cell Details Dialog */}
          {selectedCellInfo && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white text-base">
                      {selectedCellInfo.studentName}
                    </h3>
                    <p className="text-xs text-slate-500">Roll #{selectedCellInfo.rollNo} • Date: {selectedCellInfo.date}</p>
                  </div>
                  <button onClick={() => setSelectedCellInfo(null)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">✕</button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-750">
                    <span className="text-slate-500">Attendance Status:</span>
                    <span className={`font-black px-2 py-0.5 rounded ${selectedCellInfo.info.present ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"}`}>
                      {selectedCellInfo.info.present ? (selectedCellInfo.info.status === "late" ? "PRESENT (LATE)" : "PRESENT") : "ABSENT"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-750">
                    <span className="text-slate-500">In-Time (प्रवेश):</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {selectedCellInfo.info.inTime ? `🟢 ${selectedCellInfo.info.inTime}` : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-750">
                    <span className="text-slate-500">Exit-Time (प्रस्थान):</span>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {selectedCellInfo.info.outTime ? `🔴 ${selectedCellInfo.info.outTime}` : "Not Punched Out"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b dark:border-slate-750">
                    <span className="text-slate-500">Stay Duration (अवधि):</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {selectedCellInfo.info.stayDuration ? `⏱️ ${selectedCellInfo.info.stayDuration}` : "—"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCellInfo(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs"
                >
                  Theek Hai (Close)
                </button>
              </div>
            </div>
          )}
        </div>
      ) : viewMode === "report" ? (
        /* REPORT VIEW */
        <div className="p-4 space-y-4 max-w-3xl mx-auto">
          {/* Month selector */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
            <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-4 h-4" /></button>
            <span className="flex-1 text-center font-bold text-slate-800 dark:text-white">
              {new Date(selectedMonth + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{monthlyData.length}</p>
              <p className="text-xs text-slate-500">Working Days</p>
            </div>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold">{studentStats.filter(s => s.pct >= 75).length}/{students.length}</p>
              <p className="text-xs text-slate-500">≥75% Attendance</p>
            </div>
          </div>

          {/* Student table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700 text-slate-500 text-xs">
                  <th className="text-left px-3 py-2">Roll</th>
                  <th className="text-left px-3 py-2">Name</th>
                  <th className="text-center px-3 py-2">P</th>
                  <th className="text-center px-3 py-2">A</th>
                  <th className="text-center px-3 py-2">%</th>
                </tr>
              </thead>
              <tbody>
                {studentStats.map(s => (
                  <tr key={s.id} className="border-t dark:border-slate-700">
                    <td className="px-3 py-2.5 text-slate-400">{s.rollNo}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-white">{s.name}</td>
                    <td className="px-3 py-2.5 text-center text-green-600 font-medium">{s.presentDays}</td>
                    <td className="px-3 py-2.5 text-center text-red-500 font-medium">{s.absentDays}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${s.pct >= 75 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{s.pct}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && <p className="text-center py-8 text-slate-400">No students found</p>}
          </div>

          <button onClick={downloadMHTMLReport}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md">
            <Download className="w-5 h-5" /> Download MHTML Report
          </button>
        </div>
      ) : null}

      {/* AI Face Attendance Kiosk Modal */}
      <FaceAttendanceKioskModal
        isOpen={showFaceKiosk}
        onClose={() => setShowFaceKiosk(false)}
        schoolId={schoolId}
        schoolName={className ? `${className} Face Attendance` : "School Campus"}
        classId={classId}
        className={className}
        students={students}
        teacherId={teacherId}
        onAttendanceUpdated={() => {
          getAttendance(schoolId, classId, selectedDate).then((rec) => {
            setExistingRecord(rec);
            if (rec?.students) {
              const map: { [id: string]: boolean } = {};
              Object.entries(rec.students).forEach(([id, st]) => {
                map[id] = st.present;
              });
              setAttendance(map);
            }
          });
        }}
      />

      {/* Universal Live Face ID Studio & Match Test Modal */}
      {showFaceStudio && (
        <UniversalFaceIdStudioModal
          isOpen={showFaceStudio}
          onClose={() => setShowFaceStudio(false)}
          schoolId={schoolId}
          students={students}
          classes={className ? [{ id: classId, name: className }] : []}
          onEnrollmentUpdated={() => {
            getStudents(schoolId, classId).then((stList) => {
              if (stList) setStudents(stList);
            });
          }}
        />
      )}

      {/* QR Code Scanner for Teacher / Admin */}
      <QrAttendanceScannerModal
        isOpen={showQrScanner}
        onClose={() => setShowQrScanner(false)}
        isTeacherMode={true}
        targetSchoolId={schoolId}
        targetClassId={classId}
        targetClassName={className}
        teacherId={teacherId}
        onStudentMarked={(st) => {
          setAttendance(prev => ({ ...prev, [st.id]: true }));
          setSaved(false);
        }}
      />

      {/* Class Attendance QR Display Modal */}
      <ClassQrCodeModal
        isOpen={showClassQrModal}
        onClose={() => setShowClassQrModal(false)}
        schoolId={schoolId}
        schoolName={schoolId}
        classId={classId}
        className={className}
        presentCount={presentCount}
        totalStudents={students.length}
      />

      <StudentQuickActionModal
        isOpen={Boolean(selectedStudentForModal)}
        onClose={() => setSelectedStudentForModal(null)}
        student={selectedStudentForModal}
        school={{ id: schoolId, name: schoolId } as any}
        classes={[{ id: classId, name: className } as any]}
        currentMonth={selectedMonth}
        adminUid={teacherId}
        initialTab={modalInitialTab}
      />
    </div>
  );
};
