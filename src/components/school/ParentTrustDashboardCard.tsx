import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  Bus,
  Phone,
  BookOpen,
  CalendarCheck,
  Award,
  AlertTriangle,
  HeartPulse,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
} from "lucide-react";
import type {
  SchoolEmergencyAlert,
  SchoolStudent,
  StudentWeeklyReport,
} from "../../school-types";
import { loadSchoolSubcollection } from "../../utils/schoolCloudSync";
import {
  buildMergedFleetList,
  getLocalRoutes,
} from "../../utils/schoolTransportStore";
import { shouldUseDemoForSchool } from "../../school-firebase";

interface Props {
  schoolId: string;
  student: SchoolStudent;
  attendanceStats: { present: number; total: number; percentage: number };
  todayAttendanceStatus?: string;
  todayInTime?: string;
  homeworkList: Array<{ id: string; subject: string; title: string; status: string }>;
  latestExamSummary: { hasMarks: boolean; percentage: number; grade: string; examType: string };
  upcomingNotices: Array<{ id: string; title: string; date: string; category?: string }>;
  pendingDues: number;
  onOpenGrowthHub: () => void;
  onOpenHealthSafety: () => void;
  onOpenBusMap: () => void;
  onOpenAttendance: () => void;
  onOpenHomework: () => void;
  onOpenExams: () => void;
}

export const ParentTrustDashboardCard: React.FC<Props> = ({
  schoolId,
  student,
  attendanceStats,
  todayAttendanceStatus,
  todayInTime,
  homeworkList,
  latestExamSummary,
  upcomingNotices,
  pendingDues,
  onOpenGrowthHub,
  onOpenHealthSafety,
  onOpenBusMap,
  onOpenAttendance,
  onOpenHomework,
  onOpenExams,
}) => {
  const [alerts, setAlerts] = useState<SchoolEmergencyAlert[]>([]);
  const [latestWeekly, setLatestWeekly] = useState<StudentWeeklyReport | null>(null);
  const [hwRefreshTick, setHwRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;
    if (!schoolId || !student?.id) return;

    loadSchoolSubcollection<SchoolEmergencyAlert>(
      schoolId,
      "emergency_alerts",
      `nst_emergency_alerts_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      setAlerts(rows.filter((a) => a.active !== false));
    });

    loadSchoolSubcollection<StudentWeeklyReport>(
      schoolId,
      "student_weekly_reports",
      `nst_weekly_reports_${schoolId}`
    ).then((rows) => {
      if (!active) return;
      const mine = rows
        .filter((r) => r.studentId === student.id)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      if (mine.length > 0) {
        setLatestWeekly(mine[0]);
      } else if (shouldUseDemoForSchool(schoolId)) {
        setLatestWeekly({
          id: "demo_wk_1",
          schoolId,
          studentId: student.id,
          weekLabel: "This Week",
          summary: "Consistent class participation and neat notebook work.",
          strengths: "Analytical reasoning and classroom discipline",
          focusAreas: "Timed mental math practice",
          skills: { reading: 4, writing: 5, communication: 4, creativity: 4, teamwork: 5, discipline: 5 },
          teacherName: "Class Teacher",
          createdAt: new Date().toISOString(),
        });
      } else {
        setLatestWeekly(null);
      }
    });

    const onHwSync = () => setHwRefreshTick((t) => t + 1);
    window.addEventListener("storage", onHwSync);
    return () => {
      active = false;
      window.removeEventListener("storage", onHwSync);
    };
  }, [schoolId, student?.id]);

  // Homework completion ratio merged with student local checkboxes
  const hwStats = useMemo(() => {
    let doneIds: string[] = [];
    try {
      const raw = localStorage.getItem(`nst_hw_done_${schoolId}_${student.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) doneIds = parsed;
      }
    } catch {}
    const total = homeworkList.length;
    const completed = homeworkList.filter(
      (h) => h.status === "completed" || doneIds.includes(h.id)
    ).length;
    return { completed, total };
  }, [homeworkList, schoolId, student.id, hwRefreshTick]);

  // Assigned Bus & Driver lookup
  const busInfo = useMemo(() => {
    if (!student?.usesBus && !student?.busRoute && !student?.busNumber) return null;
    const routes = getLocalRoutes(schoolId);
    const fleet = buildMergedFleetList(schoolId);
    const matchedRoute = routes.find(
      (r) =>
        (student.busRoute && r.routeName === student.busRoute) ||
        (student.busNumber && r.busNumber === student.busNumber)
    );
    const matchedBus = fleet.find(
      (b) =>
        (matchedRoute?.busId && b.busId === matchedRoute.busId) ||
        (student.busNumber && b.busNumber === student.busNumber) ||
        (student.busRoute && b.route === student.busRoute)
    );
    const matchedStop = matchedRoute?.stops?.find(
      (s) => s.stopName.toLowerCase() === (student.busStop || "").toLowerCase()
    );
    return {
      routeName: student.busRoute || matchedRoute?.routeName || matchedBus?.route || "School Route",
      stopName: student.busStop || matchedStop?.stopName || matchedBus?.currentStop || "Assigned Stop",
      pickupTime: matchedStop?.pickupTime || matchedRoute?.stops?.[0]?.pickupTime || "",
      dropTime: matchedStop?.dropTime || matchedRoute?.stops?.[0]?.dropTime || "",
      busNumber: student.busNumber || matchedRoute?.busNumber || matchedBus?.busNumber || "School Bus",
      driverName: student.driverName || matchedRoute?.driverName || matchedBus?.driverName || "Assigned Driver",
      driverPhone: student.driverPhone || matchedRoute?.driverPhone || matchedBus?.driverPhone || "",
      conductorName: matchedRoute?.conductorName || "",
      tripStatus: matchedBus?.tripStatus === "started" ? "LIVE ON ROUTE" : "PARKED / READY",
      isLive: matchedBus?.tripStatus === "started",
      currentStop: matchedBus?.currentStop || "",
    };
  }, [schoolId, student]);

  // Next Exam Notice lookup
  const nextExamInfo = useMemo(() => {
    const match = upcomingNotices.find((n) =>
      /exam|test|half|annual|pre-board|unit/i.test(`${n.title} ${n.category || ""}`)
    );
    if (match) return { title: match.title, date: match.date || "Scheduled" };
    return {
      title: latestExamSummary.hasMarks ? `${latestExamSummary.examType} Published` : "Schedule Awaited",
      date: latestExamSummary.hasMarks ? `${latestExamSummary.percentage}% (${latestExamSummary.grade})` : "Check Notices",
    };
  }, [upcomingNotices, latestExamSummary]);

  const todayStatusLabel =
    todayAttendanceStatus === "present"
      ? "Present Today"
      : todayAttendanceStatus === "absent"
      ? "Absent Today"
      : todayAttendanceStatus === "late"
      ? "Late Arrival"
      : todayAttendanceStatus === "leave"
      ? "On Approved Leave"
      : "Awaiting Roll Call";

  const todayStatusTone =
    todayAttendanceStatus === "present"
      ? "text-emerald-400"
      : todayAttendanceStatus === "absent"
      ? "text-rose-400"
      : todayAttendanceStatus === "late"
      ? "text-amber-400"
      : "text-slate-300";

  return (
    <section className="space-y-4">
      {/* Emergency SOS / School Closure Alert Banner */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className={`rounded-2xl p-4 border flex items-start gap-3 ${
                alert.severity === "CRITICAL"
                  ? "bg-rose-950/70 border-rose-500/50 text-rose-100"
                  : alert.severity === "WARNING"
                  ? "bg-amber-950/60 border-amber-500/40 text-amber-100"
                  : "bg-sky-950/60 border-sky-500/40 text-sky-100"
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black tracking-tight">
                    {alert.title}
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {alert.category.replace("_", " ")} · {new Date(alert.createdAt).toLocaleDateString("en-IN")}
                  </span>
                </div>
                <p className="text-xs opacity-90 mt-1">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Parent Trust Dashboard Card */}
      <div className="bg-slate-900 border-2 border-indigo-700 dark:border-slate-700 rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm sm:text-base font-black text-white tracking-tight">
                Parent Trust &amp; Safety Snapshot
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live attendance, daily homework progress, transport safety, and weekly teacher feedback at a glance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenGrowthHub}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Insights &amp; Diary</span>
            </button>
            <button
              type="button"
              onClick={onOpenHealthSafety}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
              <span>Health &amp; Pickup Pass</span>
            </button>
          </div>
        </div>

        {/* 6 Unified Trust KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
          <button
            type="button"
            onClick={onOpenAttendance}
            className="bg-slate-950/80 hover:border-emerald-500/40 border border-slate-800 rounded-xl p-3 text-left transition cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <CalendarCheck className="w-3.5 h-3.5 text-emerald-400" />
              Today Status
            </span>
            <span className={`text-xs sm:text-sm font-black mt-1 block ${todayStatusTone}`}>
              {todayStatusLabel}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5 tabular-nums">
              {todayInTime ? `Gate In: ${todayInTime}` : `Overall: ${attendanceStats.percentage}%`}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenHomework}
            className="bg-slate-950/80 hover:border-indigo-500/40 border border-slate-800 rounded-xl p-3 text-left transition cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              Homework
            </span>
            <span className="text-sm font-black text-white mt-1 block tabular-nums">
              {hwStats.completed} / {hwStats.total} Done
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {hwStats.total === 0 ? "No pending tasks" : `${hwStats.total - hwStats.completed} remaining`}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenAttendance}
            className="bg-slate-950/80 hover:border-emerald-500/40 border border-slate-800 rounded-xl p-3 text-left transition cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-400">Attendance Rate</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 mt-1 block tabular-nums">
              {attendanceStats.percentage}%
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5 tabular-nums">
              {attendanceStats.present} / {attendanceStats.total} days
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenExams}
            className="bg-slate-950/80 hover:border-amber-500/40 border border-slate-800 rounded-xl p-3 text-left transition cursor-pointer"
          >
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              Last Result
            </span>
            <span className="text-sm sm:text-base font-black text-white mt-1 block tabular-nums">
              {latestExamSummary.hasMarks ? `${latestExamSummary.percentage}%` : "Awaited"}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {latestExamSummary.hasMarks ? `${latestExamSummary.examType} · Grade ${latestExamSummary.grade}` : "No marks posted"}
            </span>
          </button>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-400">Exam / Milestone</span>
            <span className="text-xs font-black text-sky-300 mt-1 block truncate">
              {nextExamInfo.date}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5 truncate">
              {nextExamInfo.title}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-400">Fee Ledger</span>
            <span className={`text-sm font-black mt-1 block tabular-nums ${pendingDues === 0 ? "text-emerald-400" : "text-amber-400"}`}>
              {pendingDues === 0 ? "All Paid" : `₹${pendingDues.toLocaleString("en-IN")} Due`}
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              Verified school account
            </span>
          </div>
        </div>

        {/* Teacher Weekly Remark + My Bus & Driver Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Teacher Remark */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-black text-indigo-300">
                Teacher Feedback ({latestWeekly?.weekLabel || "Weekly Observation"})
              </span>
              <button
                type="button"
                onClick={onOpenGrowthHub}
                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Full Growth Report</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {latestWeekly
                ? latestWeekly.summary
                : "Teacher weekly remarks, daily diary updates, and 6-skill assessments will appear here."}
            </p>
            {latestWeekly?.strengths && (
              <p className="text-[11px] text-emerald-400 font-semibold">
                Strength: {latestWeekly.strengths}
              </p>
            )}
          </div>

          {/* My Bus & Assigned Driver Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between gap-2">
            {busInfo ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-amber-400" />
                    <span>My School Bus · {busInfo.busNumber}</span>
                  </span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                      busInfo.isLive
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-slate-800 text-slate-300 border-slate-700"
                    }`}
                  >
                    {busInfo.tripStatus}
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p className="font-semibold text-white truncate">
                    Route: {busInfo.routeName}
                  </p>
                  <p className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-sky-400" />
                      Stop: {busInfo.stopName}
                    </span>
                    {busInfo.pickupTime && (
                      <span className="flex items-center gap-1 tabular-nums">
                        <Clock className="w-3 h-3 text-emerald-400" />
                        Pickup {busInfo.pickupTime} {busInfo.dropTime ? `· Drop ${busInfo.dropTime}` : ""}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-300">
                    Driver: <strong className="text-white">{busInfo.driverName}</strong>
                    {busInfo.conductorName ? ` · Helper: ${busInfo.conductorName}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    {busInfo.driverPhone && (
                      <a
                        href={`tel:${busInfo.driverPhone}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call Driver</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={onOpenBusMap}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black cursor-pointer"
                    >
                      Track Live
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col justify-between h-full gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-slate-400" />
                    <span>School Transport Status</span>
                  </span>
                  <button
                    type="button"
                    onClick={onOpenBusMap}
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    View Bus Routes →
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Private / Guardian pickup mode active. Set up verified guardians &amp; QR Pickup Code under Child Safety.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
