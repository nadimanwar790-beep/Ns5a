// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import {
  saveAttendance, getAttendance, getMonthlyAttendance, getStudents, todayStr, currentMonthStr
} from "../../school-firebase";
import type { SchoolStudent, AttendanceRecord } from "../../school-types";
import { CheckCircle, XCircle, Download, Calendar, Users, ChevronLeft, ChevronRight, Camera, QrCode } from "lucide-react";
import { QrAttendanceScannerModal } from "./QrAttendanceScannerModal";
import { ClassQrCodeModal } from "./ClassQrCodeModal";

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
  const [viewMode, setViewMode] = useState<"mark" | "report" | "matrix">("mark");
  const [monthlyData, setMonthlyData] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [showClassQrModal, setShowClassQrModal] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState<{ studentName: string; rollNo: string; date: string; info: any } | null>(null);

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
    getAttendance(schoolId, classId, selectedDate).then((rec: AttendanceRecord | null) => {
      setExistingRecord(rec);
      if (rec) {
        const m: { [id: string]: boolean } = {};
        Object.entries(rec.students).forEach(([id, v]: any) => (m[id] = v.present));
        setAttendance(m);
      } else {
        const init: { [id: string]: boolean } = {};
        students.forEach(s => (init[s.id] = true));
        setAttendance(init);
      }
    });
  }, [selectedDate, students]);

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
    const studentsMap: AttendanceRecord["students"] = {};
    students.forEach(s => {
      studentsMap[s.id] = { present: attendance[s.id] ?? true, name: s.name, rollNo: s.rollNo };
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
    await saveAttendance(record);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

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
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button>}
        <div className="flex-1">
          <h2 className="font-bold text-slate-800 dark:text-white">{className} — Attendance</h2>
          <p className="text-xs text-slate-500">{students.length} students</p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          <button onClick={() => setViewMode("mark")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${viewMode === "mark" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Mark (दैनिक)</button>
          <button onClick={() => setViewMode("report")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${viewMode === "report" ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>Report</button>
          <button onClick={() => setViewMode("matrix")} className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${viewMode === "matrix" ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}>📅 31-Day Matrix</button>
        </div>
      </div>

      {viewMode === "mark" ? (
        <div className="p-4 space-y-4 max-w-2xl mx-auto">
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

          {/* QR Code Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowQrScanner(true)}
              className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <Camera size={15} />
              <span>📷 Scan Entry & Exit QR</span>
            </button>
            <button
              type="button"
              onClick={() => setShowClassQrModal(true)}
              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <QrCode size={15} />
              <span>📱 Class Attendance QR</span>
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

              return (
                <div
                  key={s.id}
                  onClick={() => toggleStudent(s.id)}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 cursor-pointer transition-colors border-b dark:border-slate-700 last:border-0 ${
                    attendance[s.id] ? "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750" : "bg-red-50/70 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-400 w-8 text-right">
                      #{s.rollNo}
                    </span>
                    <div>
                      <p className="text-slate-800 dark:text-white font-bold text-sm leading-tight">
                        {s.name}
                      </p>
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
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-rose-500 text-white font-black text-[10px] flex items-center justify-center">A</span> Absent</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-amber-150 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 font-bold text-[9px] flex items-center justify-center">Sun</span> Sunday</span>
            <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-400 font-black text-[10px] flex items-center justify-center">-</span> Holiday / No Record</span>
            <span className="ml-auto text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold italic">Tip: Click any cell to view In-Time & Exit-Time</span>
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
                          if (entry.present) {
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
    </div>
  );
};
