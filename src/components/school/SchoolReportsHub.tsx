import React, { useEffect, useMemo, useState } from "react";
import type {
  School,
  SchoolClass,
  SchoolStudent,
  SchoolTeacher,
  MonthlyFee,
  AttendanceRecord,
  ExamEntry,
} from "../../school-types";
import {
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import { getSavedSchoolLogo, isAppLogo } from "./feeReceiptUtils";
import {
  getSchoolFeeHistory,
  getExams,
  getLocalAttendance,
  getLocalFees,
  getLocalExams,
} from "../../school-firebase";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  teachers: SchoolTeacher[];
  fees: MonthlyFee[];
  onBack: () => void;
}

type ReportType = "student_directory" | "fee_defaulters" | "attendance_summary" | "exam_merit";

export const SchoolReportsHub: React.FC<Props> = ({
  school,
  classes,
  students,
  fees,
  onBack,
}) => {
  const [reportType, setReportType] = useState<ReportType>("student_directory");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [search, setSearch] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  const [cloudFees, setCloudFees] = useState<MonthlyFee[]>(() =>
    fees && fees.length > 0 ? fees : getLocalFees(school.id)
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() =>
    getLocalAttendance(school.id)
  );
  const [examRecords, setExamRecords] = useState<ExamEntry[]>(() =>
    getLocalExams(school.id)
  );

  useEffect(() => {
    let active = true;
    const loadReportsData = async () => {
      if (!school?.id) return;
      setLoadingData(true);
      try {
        const [loadedFees, loadedExams] = await Promise.all([
          fees && fees.length > 0 ? Promise.resolve(fees) : getSchoolFeeHistory(school.id).catch(() => getLocalFees(school.id)),
          getExams(school.id).catch(() => getLocalExams(school.id)),
        ]);

        let loadedAtt = getLocalAttendance(school.id);
        if (db && school.id && !school.id.startsWith("demo")) {
          try {
            const snap = await getDocs(collection(db, "schools", school.id, "attendance"));
            if (!snap.empty) {
              const cloudAtt = snap.docs.map((d) => d.data() as AttendanceRecord);
              const mergedMap = new Map<string, AttendanceRecord>();
              for (const rec of loadedAtt) mergedMap.set(`${rec.classId}_${rec.date}`, rec);
              for (const rec of cloudAtt) mergedMap.set(`${rec.classId}_${rec.date}`, rec);
              loadedAtt = Array.from(mergedMap.values());
            }
          } catch (err) {
            console.warn("[SchoolReportsHub] Cloud attendance fetch skipped:", err);
          }
        }

        if (!active) return;
        setCloudFees(loadedFees || []);
        setExamRecords(loadedExams || []);
        setAttendanceRecords(loadedAtt || []);
      } finally {
        if (active) setLoadingData(false);
      }
    };
    loadReportsData();
    return () => {
      active = false;
    };
  }, [school?.id, fees]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const classMatch = selectedClassId === "all" || s.classId === selectedClassId;
      const searchMatch =
        !q ||
        (s.name || "").toLowerCase().includes(q) ||
        (s.rollNo && String(s.rollNo).toLowerCase().includes(q)) ||
        (s.admissionNo && String(s.admissionNo).toLowerCase().includes(q));
      return classMatch && searchMatch;
    });
  }, [students, selectedClassId, search]);

  // Real Fee Defaulters calculation for selectedMonth
  const defaulterRows = useMemo(() => {
    const activeStudents = filteredStudents.filter((s) => s.active !== false);
    return activeStudents
      .map((s) => {
        const cls = classes.find((c) => c.id === s.classId);
        const monthFees = cloudFees.filter(
          (f) => f.studentId === s.id && (f.month === selectedMonth || !f.month)
        );
        const studentMonthFee = monthFees.find((f) => f.month === selectedMonth);
        const monthlyBase = Number(
          s.monthlyFee || cls?.defaultFee || cls?.feeStructure?.tuitionFee || 0
        );
        const busAmt = s.usesBus ? Number(s.busFee || 0) : 0;
        const expectedAmount = studentMonthFee
          ? Number(studentMonthFee.amount || studentMonthFee.monthlyAmount || monthlyBase + busAmt)
          : monthlyBase + busAmt;
        const paidAmount = monthFees
          .filter((f) => {
            const raw = f as MonthlyFee & { cancelled?: boolean; status?: string };
            return f.month === selectedMonth && !raw.cancelled && raw.status !== "CANCELLED";
          })
          .reduce((sum, f) => {
            const raw = f as MonthlyFee & { status?: string };
            const isPaid = Boolean(f.paid || raw.status === "paid");
            const isPartial = raw.status === "partial" || (!isPaid && Number(f.paidAmount || 0) > 0);
            if (!isPaid && !isPartial) return sum;
            return sum + Number(f.paidAmount ?? (isPaid ? f.amount || f.monthlyAmount || expectedAmount : 0));
          }, 0);
        const isPaidFull =
          Boolean(
            studentMonthFee &&
              (studentMonthFee.paid ||
                (studentMonthFee as MonthlyFee & { status?: string }).status === "paid")
          ) || (expectedAmount > 0 && paidAmount >= expectedAmount);
        const dueAmount = Math.max(0, expectedAmount - paidAmount);
        return {
          student: s,
          className: cls?.name || "—",
          expectedAmount,
          paidAmount,
          dueAmount,
          isPaidFull,
          status: isPaidFull ? "Paid" : paidAmount > 0 ? "Partial Due" : "Unpaid / Due",
        };
      })
      .filter((row) => !row.isPaidFull && row.dueAmount > 0);
  }, [filteredStudents, classes, cloudFees, selectedMonth]);

  // Real Monthly Attendance calculation from attendance records
  const attendanceRows = useMemo(() => {
    const monthRecords = attendanceRecords.filter((rec) =>
      String(rec.date || "").startsWith(selectedMonth)
    );
    return filteredStudents.map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      const classMonthRecords = monthRecords.filter((rec) => rec.classId === s.classId);
      let workingDays = 0;
      let presentDays = 0;
      let absentDays = 0;
      for (const rec of classMonthRecords) {
        const legacyRecords = (rec as AttendanceRecord & { records?: Record<string, string> }).records;
        const entry = rec.students?.[s.id] ?? legacyRecords?.[s.id];
        if (!entry) continue;
        if (typeof entry === "string") {
          if (entry === "holiday" || entry === "sunday") continue;
          workingDays++;
          if (entry === "present" || entry === "late" || entry === "half_day") presentDays++;
          else if (entry === "absent" || entry === "leave") absentDays++;
        } else {
          if ((entry.status as string) === "holiday" || (entry.status as string) === "sunday") continue;
          workingDays++;
          if (
            entry.present ||
            entry.status === "present" ||
            entry.status === "late" ||
            entry.status === "half_day"
          ) {
            presentDays++;
          } else {
            absentDays++;
          }
        }
      }
      const pct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : null;
      return {
        student: s,
        className: cls?.name || "—",
        workingDays,
        presentDays,
        absentDays,
        pct,
      };
    });
  }, [filteredStudents, classes, attendanceRecords, selectedMonth]);

  // Real Exam Merit calculation from ExamEntry marks
  const meritRows = useMemo(() => {
    const rows = filteredStudents.map((s) => {
      const cls = classes.find((c) => c.id === s.classId);
      const classExams = examRecords.filter(
        (ex) => !s.classId || ex.classId === s.classId
      );
      let obtained = 0;
      let maxMarks = 0;
      let subjectsEvaluated = 0;
      let hasFail = false;

      for (const ex of classExams) {
        const entry = ex.studentMarks?.[s.id];
        if (!entry) continue;
        subjectsEvaluated++;
        const mMax = Number(ex.maxMarks || 100);
        const mObt = entry.absent ? 0 : Number(entry.marks || 0);
        maxMarks += mMax;
        obtained += mObt;
        if (entry.absent || (mMax > 0 && (mObt / mMax) * 100 < 33)) {
          hasFail = true;
        }
      }

      const pct = maxMarks > 0 ? Number(((obtained / maxMarks) * 100).toFixed(1)) : null;
      const grade =
        pct === null
          ? "—"
          : pct >= 90
          ? "A+"
          : pct >= 80
          ? "A"
          : pct >= 70
          ? "B+"
          : pct >= 60
          ? "B"
          : pct >= 50
          ? "C"
          : pct >= 33
          ? "D"
          : "F";

      return {
        student: s,
        className: cls?.name || "—",
        obtained,
        maxMarks,
        subjectsEvaluated,
        pct,
        grade,
        hasFail,
      };
    });

    return rows.sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
  }, [filteredStudents, classes, examRecords]);

  const handlePrint = () => {
    window.print();
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16 print:min-h-0 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 7mm; }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>

      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Export PDF
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0 print:m-0 print:max-w-none">
        {/* Controls Bar (hidden in print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm mb-6 space-y-4 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                School Reports &amp; Printing Center
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Live Firestore/Database data ke aadhar par real fee defaulters, attendance aur exam merit reports print karein.
              </p>
            </div>

            {/* Report Type Selector */}
            <div className="flex flex-wrap p-1 bg-slate-100 dark:bg-slate-700 rounded-xl gap-1">
              {[
                { id: "student_directory", label: "👥 Student Directory" },
                { id: "fee_defaulters", label: "💰 Fee Defaulters" },
                { id: "attendance_summary", label: "📊 Attendance Register" },
                { id: "exam_merit", label: "🏆 Merit / Rank Report" },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReportType(r.id as ReportType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    reportType === r.id ? "bg-indigo-600 text-white shadow" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Filter Class:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0"
              >
                <option value="all">Sabhi Classes ({students.length} students)</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {(reportType === "fee_defaulters" || reportType === "attendance_summary") && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0"
                />
              )}

              {loadingData && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing live data...
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="Search student..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border-0 w-44"
            />
          </div>
        </div>

        {/* Printable Official Sheet */}
        <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-xl text-slate-900 print:shadow-none print:border-none print:p-0 print:rounded-none">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            {(() => {
              const savedLogo = getSavedSchoolLogo(school.logoUrl);
              const hasCustomLogo = Boolean(savedLogo && !isAppLogo(savedLogo));
              return (
                <div className="flex items-center justify-center gap-3 mb-1">
                  {hasCustomLogo ? (
                    <img src={savedLogo} alt="Logo" className="w-12 h-12 object-contain rounded-xl border border-slate-200 bg-white p-0.5" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-black text-base flex items-center justify-center">
                      {(school.name || "SC").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-black uppercase text-slate-900">{school.name}</h2>
                    {school.address && <p className="text-xs text-slate-600">{school.address}</p>}
                  </div>
                </div>
              );
            })()}
            <div className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-wider mt-2">
              {reportType === "student_directory" && "OFFICIAL STUDENT MASTER DIRECTORY"}
              {reportType === "fee_defaulters" && `FEE OUTSTANDING & DEFAULTERS STATEMENT (${selectedMonth})`}
              {reportType === "attendance_summary" && `MONTHLY ATTENDANCE REGISTER STATEMENT (${selectedMonth})`}
              {reportType === "exam_merit" && "ACADEMIC MERIT & RANK SUMMARY"}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-bold">
              Class: {selectedClassId === "all" ? "All Classes" : currentClass?.name} · Generated:{" "}
              {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* REPORT CONTENT: STUDENT DIRECTORY */}
          {reportType === "student_directory" && (
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-700">#</th>
                    <th className="p-2 border-r border-slate-700">Roll No</th>
                    <th className="p-2 border-r border-slate-700">Student Name</th>
                    <th className="p-2 border-r border-slate-700">Class</th>
                    <th className="p-2 border-r border-slate-700">Father's Name</th>
                    <th className="p-2 border-r border-slate-700">Contact Number</th>
                    <th className="p-2 border-r border-slate-700">Admission No</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">No students match the selected filter.</td>
                    </tr>
                  ) : (
                    filteredStudents.map((s, idx) => {
                      const cName = classes.find((c) => c.id === s.classId)?.name || "—";
                      return (
                        <tr key={s.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="p-2 border-r border-slate-200 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-200 font-black text-indigo-700">{s.rollNo || "—"}</td>
                          <td className="p-2 border-r border-slate-200 font-black text-slate-900">{s.name}</td>
                          <td className="p-2 border-r border-slate-200 font-bold text-slate-700">{cName}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-700">{s.fatherName || "—"}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-700 font-mono">{s.phone || "—"}</td>
                          <td className="p-2 border-r border-slate-200 text-slate-600">{s.admissionNo || "—"}</td>
                          <td className="p-2 font-bold text-emerald-700">{s.active === false ? "Inactive" : "Active"}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT CONTENT: REAL FEE DEFAULTERS */}
          {reportType === "fee_defaulters" && (
            <div className="overflow-x-auto print:overflow-visible space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex flex-wrap justify-between items-center gap-2">
                <span>Defaulter Students ({selectedMonth}): <strong>{defaulterRows.length}</strong> / {filteredStudents.length}</span>
                <span>Total Outstanding: <strong>₹{defaulterRows.reduce((s, r) => s + r.dueAmount, 0).toLocaleString("en-IN")}</strong></span>
              </div>
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-700">#</th>
                    <th className="p-2 border-r border-slate-700">Roll No</th>
                    <th className="p-2 border-r border-slate-700">Student Name</th>
                    <th className="p-2 border-r border-slate-700">Class</th>
                    <th className="p-2 border-r border-slate-700">Parent Phone</th>
                    <th className="p-2 border-r border-slate-700">Expected (₹)</th>
                    <th className="p-2 border-r border-slate-700">Paid (₹)</th>
                    <th className="p-2 border-r border-slate-700">Balance Due (₹)</th>
                    <th className="p-2">Fee Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {defaulterRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-emerald-700 font-bold">
                        ✅ Is mahine ({selectedMonth}) me koi fee defaulter nahi hai (sabhi students ki fee jama hai ya fee amount ₹0 hai).
                      </td>
                    </tr>
                  ) : (
                    defaulterRows.map((row, idx) => (
                      <tr key={row.student.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-2 border-r border-slate-200 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-black">{row.student.rollNo || "—"}</td>
                        <td className="p-2 border-r border-slate-200 font-black text-slate-900">{row.student.name}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-700">{row.className}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700 font-mono">{row.student.phone || "—"}</td>
                        <td className="p-2 border-r border-slate-200 font-bold">₹{row.expectedAmount.toLocaleString("en-IN")}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-emerald-700">₹{row.paidAmount.toLocaleString("en-IN")}</td>
                        <td className="p-2 border-r border-slate-200 font-black text-rose-700">₹{row.dueAmount.toLocaleString("en-IN")}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT CONTENT: REAL ATTENDANCE REGISTER */}
          {reportType === "attendance_summary" && (
            <div className="overflow-x-auto print:overflow-visible space-y-4">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-700">#</th>
                    <th className="p-2 border-r border-slate-700">Roll No</th>
                    <th className="p-2 border-r border-slate-700">Student Name</th>
                    <th className="p-2 border-r border-slate-700">Class</th>
                    <th className="p-2 border-r border-slate-700">Recorded Days</th>
                    <th className="p-2 border-r border-slate-700">Days Present</th>
                    <th className="p-2 border-r border-slate-700">Attendance %</th>
                    <th className="p-2">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {attendanceRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">No students found.</td>
                    </tr>
                  ) : (
                    attendanceRows.map((row, idx) => (
                      <tr key={row.student.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-2 border-r border-slate-200 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-black">{row.student.rollNo || "—"}</td>
                        <td className="p-2 border-r border-slate-200 font-black text-slate-900">{row.student.name}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-700">{row.className}</td>
                        <td className="p-2 border-r border-slate-200 text-slate-700">{row.workingDays} Days</td>
                        <td className="p-2 border-r border-slate-200 font-bold">{row.presentDays} Days</td>
                        <td className="p-2 border-r border-slate-200 font-black text-indigo-700">
                          {row.pct !== null ? `${row.pct}%` : "—"}
                        </td>
                        <td className="p-2 font-bold">
                          {row.pct === null ? (
                            <span className="text-slate-400">No Attendance Recorded</span>
                          ) : row.pct >= 75 ? (
                            <span className="text-emerald-700">✅ Eligible</span>
                          ) : (
                            <span className="text-rose-700">⚠️ Low Attendance</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* REPORT CONTENT: REAL EXAM MERIT */}
          {reportType === "exam_merit" && (
            <div className="overflow-x-auto print:overflow-visible space-y-4">
              <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-2 border-r border-slate-700">Rank</th>
                    <th className="p-2 border-r border-slate-700">Roll No</th>
                    <th className="p-2 border-r border-slate-700">Student Name</th>
                    <th className="p-2 border-r border-slate-700">Class</th>
                    <th className="p-2 border-r border-slate-700">Total Marks</th>
                    <th className="p-2 border-r border-slate-700">Percentage</th>
                    <th className="p-2 border-r border-slate-700">Grade</th>
                    <th className="p-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {meritRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">No students found.</td>
                    </tr>
                  ) : (
                    meritRows.map((row, idx) => (
                      <tr key={row.student.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-2 border-r border-slate-200 font-black text-indigo-700">
                          {row.pct !== null ? `#${idx + 1}` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-bold">{row.student.rollNo || "—"}</td>
                        <td className="p-2 border-r border-slate-200 font-black text-slate-900">{row.student.name}</td>
                        <td className="p-2 border-r border-slate-200 font-bold text-slate-700">{row.className}</td>
                        <td className="p-2 border-r border-slate-200 font-bold">
                          {row.maxMarks > 0 ? `${row.obtained} / ${row.maxMarks}` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-black text-slate-900">
                          {row.pct !== null ? `${row.pct}%` : "—"}
                        </td>
                        <td className="p-2 border-r border-slate-200 font-black text-emerald-700">{row.grade}</td>
                        <td className="p-2 font-bold">
                          {row.pct === null ? (
                            <span className="text-slate-400">Marks Pending</span>
                          ) : row.hasFail ? (
                            <span className="text-rose-700">SUPPLEMENTARY</span>
                          ) : (
                            <span className="text-emerald-700">PASSED</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Signature Block */}
          <div className="grid grid-cols-2 gap-8 pt-10 border-t border-slate-300 text-center text-xs mt-8">
            <div>
              <div className="h-10 border-b border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-600">Prepared by (Academic Incharge)</p>
            </div>
            <div>
              <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                <span className="italic font-serif font-black text-indigo-700">Verified &amp; Sealed</span>
              </div>
              <p className="font-black text-slate-900 uppercase">Principal / School Head</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
