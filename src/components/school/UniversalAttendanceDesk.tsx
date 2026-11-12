// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Clock, MapPin, CheckCircle2, XCircle, Users, Crown,
  UserCheck, ShieldCheck, Search, Filter, Sparkles,
  ArrowRight, Phone, Printer, Calendar, RefreshCw,
  LogOut, LogIn, ChevronRight, Check, AlertCircle,
  ExternalLink, Compass, Navigation
} from "lucide-react";
import type {
  School, SchoolClass, SchoolStudent, SchoolTeacher,
  StaffEmployee, AdminAttendanceRecord, StaffDailyAttendanceRecord
} from "../../school-types";
import {
  todayStr, getAdminAttendance, saveAdminAttendance,
  getStaffDailyAttendance, saveStaffDailyAttendance,
  markStudentQrAttendance, getAttendance, saveAttendance
} from "../../school-firebase";
import { calculateDistanceMeters, formatDistance, getLiveBrowserPosition } from "../../utils/geoUtils";
import { playSoundCorrect } from "../../utils/soundEffects";
import { SchoolLocationModal } from "./SchoolLocationModal";
import { TeacherIdCardModal } from "./TeacherIdCardModal";

interface Props {
  school?: School | null;
  classes?: SchoolClass[];
  students?: SchoolStudent[];
  teachers?: SchoolTeacher[];
  staff?: StaffEmployee[];
  onOpenScanner?: () => void;
  onOpenFaceTest?: () => void;
  onOpenLocationModal?: () => void;
  onViewClassAttendance?: (classId: string) => void;
}

type RoleTab = "teachers" | "students";

export const UniversalAttendanceDesk: React.FC<Props> = ({
  school,
  classes = [],
  students = [],
  teachers = [],
  staff = [],
  onOpenScanner,
  onOpenFaceTest,
  onOpenLocationModal,
  onViewClassAttendance,
}) => {
  const schoolId = school?.id || "";
  const today = todayStr();

  const [activeTab, setActiveTab] = useState<RoleTab>("teachers");
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [teacherSearchQuery, setTeacherSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedTeacherForIdCard, setSelectedTeacherForIdCard] = useState<SchoolTeacher | null>(null);

  // Live Digital Clock
  const [currentTime, setCurrentTime] = useState<string>(() =>
    new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Live Distance from School Campus
  const [campusDistanceInfo, setCampusDistanceInfo] = useState<{
    distanceMeters: number;
    isInside: boolean;
    checked: boolean;
  } | null>(null);

  useEffect(() => {
    if (school?.latitude && school?.longitude) {
      getLiveBrowserPosition()
        .then((pos) => {
          const d = calculateDistanceMeters(pos.latitude, pos.longitude, school.latitude!, school.longitude!);
          setCampusDistanceInfo({
            distanceMeters: d,
            isInside: d <= (school.locationRadiusMeters || 200),
            checked: true,
          });
        })
        .catch(() => {
          setCampusDistanceInfo(null);
        });
    }
  }, [school?.latitude, school?.longitude, school?.locationRadiusMeters]);

  // ── TEACHERS ATTENDANCE STATE ──
  const [staffAttendance, setStaffAttendance] = useState<StaffDailyAttendanceRecord>(() =>
    schoolId
      ? getStaffDailyAttendance(schoolId, today)
      : {
          schoolId: "",
          date: today,
          records: {},
        }
  );

  // Keep attendance in sync whenever schoolId or today changes
  useEffect(() => {
    if (schoolId) {
      setStaffAttendance(getStaffDailyAttendance(schoolId, today));
    }
  }, [schoolId, today]);

  const handleTeacherPunch = async (teacher: SchoolTeacher, action: "in" | "out" | "absent") => {
    if (!schoolId) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const currentRecords = { ...staffAttendance.records };
    const existing = currentRecords[teacher.id];

    if (action === "absent") {
      currentRecords[teacher.id] = {
        id: teacher.id,
        name: teacher.name,
        role: "TEACHER",
        employeeId: teacher.employeeId || teacher.id,
        present: false,
        status: "absent",
        inTime: undefined,
        outTime: undefined,
      };
    } else {
      let stayDuration = existing?.stayDuration;
      if (action === "out" && existing?.inTime) {
        stayDuration = `${nowTime} (Departed)`;
      }

      currentRecords[teacher.id] = {
        id: teacher.id,
        name: teacher.name,
        role: "TEACHER",
        employeeId: teacher.employeeId || teacher.id,
        present: true,
        status: "present",
        inTime: action === "in" ? nowTime : (existing?.inTime || nowTime),
        outTime: action === "out" ? nowTime : existing?.outTime,
        stayDuration,
      };
    }

    const updated = {
      schoolId: schoolId,
      date: today,
      records: currentRecords,
    };

    setStaffAttendance(updated);
    await saveStaffDailyAttendance(updated);
    playSoundCorrect();

    setToastMessage({
      type: "success",
      text: `✓ शिक्षक ${teacher.name} का ${action === "in" ? "आगमन" : action === "out" ? "प्रस्थान" : "अनुपस्थिति"} दर्ज हुआ!`,
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleMarkAllTeachersIn = async () => {
    if (!schoolId) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const currentRecords = { ...staffAttendance.records };
    teachers.forEach((t) => {
      currentRecords[t.id] = {
        id: t.id,
        name: t.name,
        role: "TEACHER",
        employeeId: t.employeeId || t.id,
        present: true,
        status: "present",
        inTime: currentRecords[t.id]?.inTime || nowTime,
        outTime: currentRecords[t.id]?.outTime,
      };
    });

    const updated = {
      schoolId: schoolId,
      date: today,
      records: currentRecords,
    };
    setStaffAttendance(updated);
    await saveStaffDailyAttendance(updated);
    playSoundCorrect();
    setToastMessage({
      type: "success",
      text: `✓ सभी ${teachers.length} शिक्षकों का Punch-In (आगमन) एक साथ दर्ज कर दिया गया!`,
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── STUDENTS ATTENDANCE STATE FOR SELECTED CLASS ──
  const [classAttendanceRecord, setClassAttendanceRecord] = useState<any>(null);

  useEffect(() => {
    if (selectedClassId && schoolId) {
      getAttendance(schoolId, selectedClassId, today).then((rec) => {
        setClassAttendanceRecord(rec);
      });
    }
  }, [schoolId, selectedClassId, today]);

  const currentClassStudents = useMemo(() => {
    return students.filter((s) => s.classId === selectedClassId);
  }, [students, selectedClassId]);

  const filteredClassStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return currentClassStudents;
    const q = studentSearchQuery.toLowerCase().trim();
    return currentClassStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.rollNo).includes(q) ||
        (s.admissionNo && s.admissionNo.toLowerCase().includes(q))
    );
  }, [currentClassStudents, studentSearchQuery]);

  const handleStudentPunch = async (student: SchoolStudent, action: "in" | "out" | "absent") => {
    if (!schoolId || !selectedClassId) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    try {
      if (action === "absent") {
        const existing = await getAttendance(schoolId, selectedClassId, today);
        const map = existing?.students ? { ...existing.students } : {};
        map[student.id] = {
          present: false,
          name: student.name,
          rollNo: student.rollNo,
          status: "absent",
          note: "Marked absent via Quick Attendance Desk",
        };
        const updated = {
          date: today,
          schoolId: schoolId,
          classId: selectedClassId,
          sessionId: existing?.sessionId || "",
          markedBy: "UNIVERSAL_DESK",
          students: map,
          createdAt: existing?.createdAt || new Date().toISOString(),
        };
        await saveAttendance(updated);
        setClassAttendanceRecord(updated);
      } else {
        const res = await markStudentQrAttendance({
          schoolId: schoolId,
          classId: selectedClassId,
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          date: today,
          scanMode: action,
          markedBy: "UNIVERSAL_DESK",
        });
        if (res.record) {
          setClassAttendanceRecord(res.record);
        }
      }

      playSoundCorrect();
      setToastMessage({
        type: "success",
        text: `✓ ${student.name} (Roll #${student.rollNo}) - ${action === "in" ? "आगमन (Punch-In)" : action === "out" ? "प्रस्थान (Punch-Out)" : "अनुपस्थित"} दर्ज!`,
      });
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: "error", text: err?.message || "हाजिरी दर्ज करने में त्रुटि।" });
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleMarkAllClassIn = async () => {
    if (!schoolId || !selectedClassId) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    try {
      const existing = await getAttendance(schoolId, selectedClassId, today);
      const map = existing?.students ? { ...existing.students } : {};

      currentClassStudents.forEach((st) => {
        map[st.id] = {
          present: true,
          name: st.name,
          rollNo: st.rollNo,
          inTime: map[st.id]?.inTime || nowTime,
          outTime: map[st.id]?.outTime,
          status: "present",
          scanType: "in",
        };
      });

      const updated = {
        date: today,
        schoolId: schoolId,
        classId: selectedClassId,
        sessionId: existing?.sessionId || "",
        markedBy: "UNIVERSAL_DESK_BULK",
        students: map,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await saveAttendance(updated);
      setClassAttendanceRecord(updated);
      playSoundCorrect();

      const cName = classes.find((c) => c.id === selectedClassId)?.name || "Class";
      setToastMessage({
        type: "success",
        text: `✓ ${cName} के सभी ${currentClassStudents.length} छात्रों का Punch-In (आगमन) एक साथ दर्ज हो गया!`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      setToastMessage({ type: "error", text: "Error: " + e.message });
    }
  };

  const handleMarkAllClassOut = async () => {
    if (!schoolId || !selectedClassId) return;
    const nowTime = new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    try {
      const existing = await getAttendance(schoolId, selectedClassId, today);
      const map = existing?.students ? { ...existing.students } : {};

      currentClassStudents.forEach((st) => {
        if (map[st.id]?.present) {
          map[st.id] = {
            ...map[st.id],
            outTime: nowTime,
            scanType: "out",
          };
        }
      });

      const updated = {
        date: today,
        schoolId: schoolId,
        classId: selectedClassId,
        sessionId: existing?.sessionId || "",
        markedBy: "UNIVERSAL_DESK_BULK_OUT",
        students: map,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await saveAttendance(updated);
      setClassAttendanceRecord(updated);
      playSoundCorrect();

      const cName = classes.find((c) => c.id === selectedClassId)?.name || "Class";
      setToastMessage({
        type: "success",
        text: `✓ ${cName} के सभी उपस्थित छात्रों का Punch-Out (प्रस्थान) दर्ज हो गया!`,
      });
      setTimeout(() => setToastMessage(null), 3500);
    } catch (e: any) {
      setToastMessage({ type: "error", text: "Error: " + e.message });
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  if (!school) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/30 dark:border-indigo-500/40 shadow-xl space-y-5">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-between shadow-lg transition-all ${
            toastMessage.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-rose-600 text-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button type="button" onClick={() => setToastMessage(null)} className="p-1 hover:bg-white/20 rounded">
            ✕
          </button>
        </div>
      )}

      {/* ── HEADER: DIGITAL LIVE CLOCK & CAMPUS GPS STATUS STRIP ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-md shadow-indigo-500/30">
              <Clock className="w-5 h-5" />
            </span>
            <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
              त्वरित हाजिरी डेस्क (Quick Attendance &amp; Punch Desk)
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              ALL ROLES • IN &amp; OUT
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            स्कूल एडमिन, सभी शिक्षक और किसी भी क्लास के छात्र का आगमन (Punch In) व प्रस्थान (Punch Out) सीधे यहीं से लगाएं
          </p>
        </div>

        {/* Live Clock & Geolocation Chip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Digital Live Clock */}
          <div className="px-3.5 py-1.5 rounded-2xl bg-slate-900 text-amber-300 font-mono text-xs font-black shadow-inner border border-slate-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="tabular-nums tracking-wider">{currentTime}</span>
          </div>

          {/* School Location Status Pill */}
          <button
            type="button"
            onClick={() => setShowLocationModal(true)}
            className={`px-3 py-1.5 rounded-2xl border text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs ${
              school.latitude && school.longitude
                ? campusDistanceInfo?.isInside
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                  : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800"
                : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 animate-pulse"
            }`}
            title="स्कूल लोकेशन बदलें या सेट करें"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-none">
              {school.latitude && school.longitude
                ? campusDistanceInfo
                  ? campusDistanceInfo.isInside
                    ? `🎯 परिसर में (${formatDistance(campusDistanceInfo.distanceMeters)})`
                    : `📍 स्कूल से ${formatDistance(campusDistanceInfo.distanceMeters)} दूर`
                  : `📍 GPS सेट है (${school.latitude.toFixed(2)}°N)`
                : "📍 स्कूल लोकेशन सेट करें (GPS)"}
            </span>
            <span className="text-[10px] opacity-70 underline">बदलें</span>
          </button>

          {/* Quick Scanner Launcher */}
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-purple-600/30 transition active:scale-95 cursor-pointer"
            >
              <span>📷 QR / Face Scan</span>
            </button>
          )}

          {/* Face Test Playground Quick Launcher */}
          {onOpenFaceTest && (
            <button
              type="button"
              onClick={onOpenFaceTest}
              className="px-3 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/30 ring-1 ring-amber-300 transition active:scale-95 cursor-pointer"
              title="टेस्ट मोड: अटेंडेंस नहीं लगेगी, सिर्फ कैमरा में चेहरा मैच करके वॉयस से नाम बोलेगा"
            >
              <span>🧪 फेस टेस्ट मोड</span>
            </button>
          )}
        </div>
      </div>

      {/* ── ROLE TABS (TEACHERS, STUDENTS) ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("teachers")}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "teachers"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>👨‍🏫 Teachers &amp; Staff ({teachers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shrink-0 ${
            activeTab === "students"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>🎓 Students ({students.length} छात्र • All Classes)</span>
        </button>
      </div>

      {/* ── TAB 2: TEACHERS & STAFF ATTENDANCE ── */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="शिक्षक का नाम या ID खोजें..."
                value={teacherSearchQuery}
                onChange={(e) => setTeacherSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllTeachersIn}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>⚡ सभी शिक्षक Punch-In करें</span>
              </button>
            </div>
          </div>

          {/* Teacher List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {teachers
              .filter((t) =>
                !teacherSearchQuery.trim()
                  ? true
                  : t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase()) ||
                    (t.employeeId && t.employeeId.toLowerCase().includes(teacherSearchQuery.toLowerCase()))
              )
              .map((teacher) => {
                const rec = staffAttendance.records[teacher.id];
                const isPresent = rec?.present === true;
                return (
                  <div
                    key={teacher.id}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3 hover:border-indigo-400 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-black text-sm flex items-center justify-center shrink-0">
                        {teacher.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-xs text-slate-800 dark:text-white truncate">
                            {teacher.name}
                          </h4>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                              isPresent
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}
                          >
                            {isPresent ? "In" : "Pending"}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {teacher.designation || "Teacher"} • ID: {teacher.employeeId || teacher.id.slice(-4)}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span>In: <strong className="text-emerald-600 dark:text-emerald-400">{rec?.inTime || "--:--"}</strong></span>
                          <span>Out: <strong className="text-amber-600 dark:text-amber-400">{rec?.outTime || "--:--"}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleTeacherPunch(teacher, "in")}
                        className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
                        title="Punch In (आगमन)"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTeacherPunch(teacher, "out")}
                        className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95 cursor-pointer"
                        title="Punch Out (प्रस्थान)"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedTeacherForIdCard(teacher)}
                        className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs transition cursor-pointer"
                        title="Teacher ID Card"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ── TAB 3: STUDENTS OF ANY CLASS ── */}
      {activeTab === "students" && (
        <div className="space-y-4">
          {/* Class Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                कक्षा चुनें (Select Class):
              </span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-xs font-bold focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({students.filter((st) => st.classId === c.id).length} छात्र)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Bulk Actions for Class */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleMarkAllClassIn}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>⚡ सभी छात्र IN</span>
              </button>
              <button
                type="button"
                onClick={handleMarkAllClassOut}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition active:scale-95 cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>🏃 सभी छात्र OUT</span>
              </button>
              {onViewClassAttendance && (
                <button
                  type="button"
                  onClick={() => onViewClassAttendance(selectedClassId)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-300 transition cursor-pointer"
                >
                  Full Register →
                </button>
              )}
            </div>
          </div>

          {/* Search Bar & Summary */}
          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="छात्र नाम या रोल नंबर खोजें..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-transparent text-slate-800 dark:text-white"
              />
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">
              कुल छात्र: <strong className="text-slate-800 dark:text-white">{currentClassStudents.length}</strong>
            </div>
          </div>

          {/* Student Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
            {filteredClassStudents.map((st) => {
              const attData = classAttendanceRecord?.students?.[st.id];
              const isPresent = attData?.present === true;
              return (
                <div
                  key={st.id}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                    isPresent
                      ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                      {st.photoUrl ? (
                        <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        `#${st.rollNo}`
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-800 dark:text-white truncate">
                        {st.name}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        Roll #{st.rollNo} • {st.phone || "No phone"}
                      </p>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-500 mt-0.5">
                        <span className={attData?.inTime ? "text-emerald-600 dark:text-emerald-400 font-bold" : ""}>
                          In: {attData?.inTime || "--:--"}
                        </span>
                        <span>•</span>
                        <span className={attData?.outTime ? "text-amber-600 dark:text-amber-400 font-bold" : ""}>
                          Out: {attData?.outTime || "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStudentPunch(st, "in")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition active:scale-95 cursor-pointer ${
                        attData?.inTime
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-100 hover:bg-emerald-500 hover:text-white text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                      title="Mark Punch In (आगमन)"
                    >
                      In
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStudentPunch(st, "out")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition active:scale-95 cursor-pointer ${
                        attData?.outTime
                          ? "bg-amber-500 text-slate-950 font-extrabold"
                          : "bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                      title="Mark Punch Out (प्रस्थान)"
                    >
                      Out
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStudentPunch(st, "absent")}
                      className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 transition cursor-pointer"
                      title="Mark Absent"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* School Location Modal */}
      {showLocationModal && (
        <SchoolLocationModal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          school={school}
        />
      )}

      {/* Teacher ID Card Modal */}
      {selectedTeacherForIdCard && (
        <TeacherIdCardModal
          isOpen={!!selectedTeacherForIdCard}
          onClose={() => setSelectedTeacherForIdCard(null)}
          teacher={selectedTeacherForIdCard}
          school={school}
        />
      )}
    </div>
  );
};
