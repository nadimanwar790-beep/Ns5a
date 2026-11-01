// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getExams, saveExam, deleteExam, generateId, todayStr,
  saveSubject
} from "../../school-firebase";
import type { SchoolStudent, SchoolSubject, ExamEntry } from "../../school-types";
import {
  Plus, ChevronLeft, Save, Trash2, Award, FileText, Printer,
  BookOpen, Check, X, BarChart2, Users, AlertCircle, ArrowLeft, Sparkles
} from "lucide-react";

interface Props {
  schoolId: string;
  classId: string;
  className: string;
  sessionId: string;
  subjects: SchoolSubject[];
  adminId: string;
  schoolName?: string;
  onBack?: () => void;
}

function getGrade(pct: number) {
  if (pct >= 91) return "A+";
  if (pct >= 81) return "A";
  if (pct >= 71) return "B+";
  if (pct >= 61) return "B";
  if (pct >= 51) return "C+";
  if (pct >= 41) return "C";
  if (pct >= 33) return "D";
  return "F";
}

function getGradeColor(pct: number) {
  if (pct >= 81) return "#16a34a";
  if (pct >= 61) return "#2563eb";
  if (pct >= 41) return "#d97706";
  return "#dc2626";
}

function gdriveLinkToImg(url: string) {
  if (!url) return "";
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
  return url;
}

const COMMON_PRESETS = [
  { name: "PA 1 (Periodic Assessment 1)", max: "40", date: "2026-05-18" },
  { name: "PA 2 (Periodic Assessment 2)", max: "40", date: "2026-07-25" },
  { name: "Half Yearly Examination", max: "100", date: "2026-09-22" },
  { name: "PA 3 (Periodic Assessment 3)", max: "40", date: "2026-11-28" },
  { name: "PA 4 (Periodic Assessment 4)", max: "40", date: "2027-01-20" },
  { name: "Final Annual Examination", max: "100", date: "2027-03-15" },
];

export const ExamResultsPanel: React.FC<Props> = ({
  schoolId, classId, className, sessionId, subjects: initialSubjects = [], adminId, schoolName, onBack
}) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [subjectsList, setSubjectsList] = useState<SchoolSubject[]>(initialSubjects);
  const [view, setView] = useState<"list" | "entry" | "add" | "class_result">("list");
  const [selectedExam, setSelectedExam] = useState<ExamEntry | null>(null);
  const [marksInput, setMarksInput] = useState<Record<string, { marks: string; absent: boolean }>>({});
  const [addForm, setAddForm] = useState({
    examName: "",
    subjectId: "",
    customSubjectName: "",
    examDate: todayStr(),
    maxMarks: "100"
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [isCustomSubject, setIsCustomSubject] = useState(false);

  useEffect(() => {
    if (initialSubjects && initialSubjects.length > 0) {
      setSubjectsList(initialSubjects);
    }
  }, [initialSubjects]);

  const loadData = async () => {
    const [sts, exs] = await Promise.all([
      getStudents(schoolId, classId),
      getExams(schoolId, classId)
    ]);
    setStudents(sts.sort((a, b) => (parseInt(a.rollNo) || 0) - (parseInt(b.rollNo) || 0)));
    setExams(exs.sort((a, b) => b.examDate.localeCompare(a.examDate)));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [classId]);

  const openExam = (exam: ExamEntry) => {
    setSelectedExam(exam);
    const input: Record<string, { marks: string; absent: boolean }> = {};
    students.forEach(s => {
      const ex = exam.studentMarks[s.id];
      input[s.id] = { marks: ex && !ex.absent ? String(ex.marks) : "", absent: ex?.absent || false };
    });
    setMarksInput(input);
    setView("entry");
  };

  const saveMarks = async () => {
    if (!selectedExam) return;
    setSaving(true);
    const studentMarks: ExamEntry["studentMarks"] = {};
    students.forEach(s => {
      const inp = marksInput[s.id];
      if (inp && (inp.absent || inp.marks !== "")) {
        studentMarks[s.id] = {
          marks: inp.absent ? 0 : Math.min(Number(inp.marks) || 0, selectedExam.maxMarks),
          absent: inp.absent,
          studentName: s.name,
          rollNo: s.rollNo
        };
      }
    });
    await saveExam({ ...selectedExam, studentMarks });
    await loadData();
    setSelectedExam(prev => ({ ...prev!, studentMarks }));
    setSaving(false);
    alert("Marks save ho gaye!");
  };

  const handleAddExam = async () => {
    if (!addForm.examName.trim()) return alert("Exam ka naam daalo");

    let finalSubjectId = addForm.subjectId;
    let finalSubjectName = "";

    if (isCustomSubject) {
      if (!addForm.customSubjectName.trim()) {
        return alert("Kripya Extra Subject / Book ka naam daalein");
      }
      finalSubjectName = addForm.customSubjectName.trim();
      finalSubjectId = generateId();

      // Save as new subject for this class
      try {
        const newSub: SchoolSubject = {
          id: finalSubjectId,
          schoolId,
          sessionId,
          classId,
          name: finalSubjectName,
          createdAt: new Date().toISOString()
        };
        await saveSubject(newSub);
        setSubjectsList(prev => [...prev, newSub]);
      } catch (e) {
        console.error("Error saving new subject", e);
      }
    } else {
      if (!addForm.subjectId) return alert("Subject select karo");
      const sub = subjectsList.find(s => s.id === addForm.subjectId);
      finalSubjectName = sub?.name || "";
    }

    setSaving(true);
    const exam: ExamEntry = {
      id: generateId(),
      schoolId, sessionId, classId,
      subjectId: finalSubjectId,
      subjectName: finalSubjectName,
      examName: addForm.examName.trim(),
      examDate: addForm.examDate,
      maxMarks: Math.max(1, Number(addForm.maxMarks) || 100),
      markedBy: adminId,
      studentMarks: {},
      createdAt: new Date().toISOString()
    };
    await saveExam(exam);
    await loadData();
    setAddForm({ examName: "", subjectId: "", customSubjectName: "", examDate: todayStr(), maxMarks: "100" });
    setIsCustomSubject(false);
    setView("list");
    setSaving(false);
  };

  const handleDeleteExam = async (examId: string) => {
    await deleteExam(schoolId, examId);
    await loadData();
    setConfirmDelete(null);
  };

  const generateMarksheet = (student: SchoolStudent) => {
    const studentExams = exams.filter(e => e.studentMarks[student.id]);
    const bySubject: Record<string, ExamEntry[]> = {};
    studentExams.forEach(e => {
      if (!bySubject[e.subjectName]) bySubject[e.subjectName] = [];
      bySubject[e.subjectName].push(e);
    });

    const totalObtained = studentExams.reduce((sum, e) => {
      const sm = e.studentMarks[student.id];
      return sum + (sm?.absent ? 0 : (sm?.marks || 0));
    }, 0);
    const totalMax = studentExams.reduce((sum, e) => sum + e.maxMarks, 0);
    const pct = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
    const grade = getGrade(pct);

    const photoUrl = (student as any).photoUrl ? gdriveLinkToImg((student as any).photoUrl) : null;

    const subjectRows = Object.entries(bySubject).map(([subName, subExams]) => {
      const subObt = subExams.reduce((sum, e) => sum + (e.studentMarks[student.id]?.absent ? 0 : (e.studentMarks[student.id]?.marks || 0)), 0);
      const subMax = subExams.reduce((sum, e) => sum + e.maxMarks, 0);
      const subPct = subMax > 0 ? Math.round((subObt / subMax) * 100) : 0;
      const examCells = subExams.map(e => {
        const sm = e.studentMarks[student.id];
        return `<td style="border:1px solid #cbd5e1;padding:8px;text-align:center;">${sm?.absent ? "Ab" : (sm?.marks ?? "-")}<br><small style="color:#94a3b8">/${e.maxMarks}</small></td>`;
      }).join("");
      return `<tr>
        <td style="border:1px solid #cbd5e1;padding:8px;font-weight:600;">${subName}</td>
        ${examCells}
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;">${subObt}/${subMax}</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;color:${getGradeColor(subPct)};font-weight:bold;">${subPct}%</td>
        <td style="border:1px solid #cbd5e1;padding:8px;text-align:center;font-weight:bold;color:${getGradeColor(subPct)};">${getGrade(subPct)}</td>
      </tr>`;
    }).join("");

    const allExamNames = [...new Set(studentExams.map(e => e.examName))];
    const examHeaders = allExamNames.map(n => `<th style="border:1px solid #cbd5e1;padding:8px;background:#f1f5f9;text-align:center;font-size:12px;">${n}</th>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Marksheet — ${student.name}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: Arial, sans-serif; padding: 24px; background: #fff; color: #1e293b; }
  .header { text-align: center; border-bottom: 3px double #1e40af; padding-bottom: 16px; margin-bottom: 20px; }
  .school-name { font-size: 22px; font-weight: bold; color: #1e40af; }
  .sub-title { font-size: 14px; color: #475569; margin: 4px 0; }
  .marksheet-title { font-size: 16px; font-weight: bold; background: #1e40af; color: white; padding: 6px 20px; display: inline-block; border-radius: 4px; margin: 10px 0; }
  .info-grid { display: flex; gap: 20px; margin-bottom: 20px; align-items: flex-start; }
  .info-box { flex: 1; }
  .info-row { display: flex; margin-bottom: 8px; font-size: 14px; }
  .info-label { width: 130px; color: #64748b; font-weight: 600; }
  .info-value { flex: 1; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; }
  .photo-box { width: 110px; height: 130px; border: 2px solid #cbd5e1; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 4px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
  th { border: 1px solid #cbd5e1; padding: 8px; background: #1e40af; color: white; text-align: left; }
  .result-bar { display: flex; justify-content: space-between; background: #f1f5f9; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-weight: bold; }
  .result-highlight { font-size: 20px; color: ${getGradeColor(pct)}; }
  .sign-row { display: flex; justify-content: space-between; margin-top: 48px; }
  .sign-box { text-align: center; }
  .sign-line { border-top: 1px solid #1e293b; width: 160px; margin-bottom: 4px; }
  .sign-label { font-size: 12px; color: #64748b; }
  .footer { text-align: center; margin-top: 30px; font-size: 11px; color: #94a3b8; }
</style>
</head>
<body>
<div class="no-print" style="margin-bottom:16px;">
  <button onclick="window.print()" style="padding:10px 24px;background:#1e40af;color:white;border:none;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">🖨️ Print Marksheet</button>
</div>

<div class="header">
  <div class="school-name">${schoolName || "School Name"}</div>
  <div class="sub-title">${className} — Academic Result</div>
  <div class="marksheet-title">PROGRESS REPORT / MARKSHEET</div>
</div>

<div class="info-grid">
  <div class="info-box">
    <div class="info-row"><span class="info-label">Student Name:</span><span class="info-value">${student.name}</span></div>
    <div class="info-row"><span class="info-label">Father's Name:</span><span class="info-value">${(student as any).fatherName || ""}</span></div>
    <div class="info-row"><span class="info-label">Roll No:</span><span class="info-value">${student.rollNo}</span></div>
    <div class="info-row"><span class="info-label">Adm. No:</span><span class="info-value">${(student as any).admissionNo || ""}</span></div>
    <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${className}</span></div>
    <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${new Date().toLocaleDateString("en-IN")}</span></div>
  </div>
  ${photoUrl ? `<div class="photo-box"><img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" /></div>` : ""}
</div>

<table>
  <thead>
    <tr>
      <th>Subject</th>
      ${examHeaders}
      <th style="text-align:center;">Total</th>
      <th style="text-align:center;">Percentage</th>
      <th style="text-align:center;">Grade</th>
    </tr>
  </thead>
  <tbody>
    ${subjectRows}
  </tbody>
</table>

<div class="result-bar">
  <div>Grand Total: <span style="font-size:16px;">${totalObtained} / ${totalMax}</span></div>
  <div>Percentage: <span class="result-highlight">${pct}%</span></div>
  <div>Overall Grade: <span class="result-highlight">${grade}</span></div>
  <div>Result: <span style="color:${pct >= 33 ? "#16a34a" : "#dc2626"};font-size:18px;">${pct >= 33 ? "PASSED" : "FAILED"}</span></div>
</div>

<div class="sign-row">
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Class Teacher</div></div>
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Exam Controller</div></div>
  <div class="sign-box"><div class="sign-line"></div><div class="sign-label">Principal</div></div>
</div>

<div class="footer">Computer Generated Marksheet</div>
</body>
</html>`;

    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-16">
      {/* ── TOP HEADER NAVBAR WITH PROMINENT BACK BUTTON ── */}
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={view !== "list" ? () => setView("list") : onBack}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition cursor-pointer flex items-center gap-1 font-black text-xs sm:text-sm active:scale-95 shadow-2xs shrink-0"
              title={view !== "list" ? "Peeche Jayein" : "Class Management par wapas jayein"}
            >
              <ChevronLeft className="w-4 h-4 text-slate-800 dark:text-white" />
              <span>Back</span>
            </button>
            <div className="min-w-0">
              <h2 className="font-black text-slate-900 dark:text-white text-sm sm:text-base truncate">
                {view === "list"
                  ? `${className} — Exams & Results`
                  : view === "add"
                  ? "Naya Exam Add Karo"
                  : view === "entry"
                  ? `${selectedExam?.examName} — Marks Entry`
                  : `Class Result — ${className}`}
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Class: {className} • {students.length} Students • {subjectsList.length} Subjects
              </p>
            </div>
          </div>

          {view === "list" && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setView("class_result")}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Class Result</span>
              </button>
              <button
                type="button"
                onClick={() => setView("add")}
                className="px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Naya Exam</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="text-center">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
            <p className="font-bold text-sm">Exam data load ho raha hai...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── VIEW: ADD EXAM ── */}
          {view === "add" && (
            <div className="p-4 max-w-2xl mx-auto space-y-4 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                  <p className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-blue-600" />
                    <span>Naya Exam Add Karo</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setView("list")}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                {/* 6-Exam Quick Presets */}
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                    Quick Exam Presets:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COMMON_PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => {
                          setAddForm(prev => ({ ...prev, examName: p.name, maxMarks: p.max, examDate: p.date }));
                        }}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-left cursor-pointer ${
                          addForm.examName === p.name
                            ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                            : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-blue-50"
                        }`}
                      >
                        <p className="truncate font-black">{p.name.split(" (")[0]}</p>
                        <p className="text-[10px] opacity-75">{p.max} Marks</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">
                    Exam Ka Naam *
                  </label>
                  <input
                    value={addForm.examName}
                    onChange={e => setAddForm(p => ({ ...p, examName: e.target.value }))}
                    placeholder="e.g. Unit Test 1, Half Yearly, Final"
                    className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm font-bold"
                  />
                </div>

                {/* Subject Selector & Extra Subject Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      Subject / Book *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubject(!isCustomSubject)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isCustomSubject ? "← Choose from Class Books" : "+ Add Extra Book / Subject"}</span>
                    </button>
                  </div>

                  {isCustomSubject ? (
                    <input
                      value={addForm.customSubjectName}
                      onChange={e => setAddForm(p => ({ ...p, customSubjectName: e.target.value }))}
                      placeholder="Extra Subject Name (e.g. Drawing, GK Oral, Sanskrit)"
                      className="w-full px-3 py-2 border-2 border-purple-400 dark:border-purple-600 rounded-xl bg-purple-50/30 dark:bg-purple-950/20 text-slate-800 dark:text-white text-sm font-bold"
                    />
                  ) : (
                    <select
                      value={addForm.subjectId}
                      onChange={e => setAddForm(p => ({ ...p, subjectId: e.target.value }))}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm font-semibold"
                    >
                      <option value="">— Subject chuniye ({subjectsList.length} Books Available) —</option>
                      {subjectsList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Exam Date</label>
                    <input
                      type="date"
                      value={addForm.examDate}
                      onChange={e => setAddForm(p => ({ ...p, examDate: e.target.value }))}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-1 block">Total Marks (Max)</label>
                    <input
                      type="number"
                      value={addForm.maxMarks}
                      onChange={e => setAddForm(p => ({ ...p, maxMarks: e.target.value }))}
                      className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-sm font-black"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddExam}
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Exam Save Karo"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── VIEW: MARKS ENTRY ── */}
          {view === "entry" && selectedExam && (
            <div className="p-4 max-w-2xl mx-auto space-y-3 animate-in fade-in duration-150">
              <div className="bg-blue-50 dark:bg-blue-900/30 rounded-2xl p-4 border border-blue-200 dark:border-blue-800 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-black text-blue-900 dark:text-blue-100 text-sm">
                    {selectedExam.examName} — {selectedExam.subjectName}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    Date: {new Date(selectedExam.examDate).toLocaleDateString("en-IN")} • Max Marks: {selectedExam.maxMarks}
                  </p>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-blue-600 text-white shadow-xs">
                  {Object.keys(selectedExam.studentMarks).length}/{students.length} Marked
                </span>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="grid grid-cols-12 gap-0 px-3 py-2.5 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-xs font-black text-slate-600 dark:text-slate-300">
                  <span className="col-span-1 text-center">Roll</span>
                  <span className="col-span-5">Student Name</span>
                  <span className="col-span-3 text-center">Marks /{selectedExam.maxMarks}</span>
                  <span className="col-span-2 text-center">Absent</span>
                  <span className="col-span-1 text-right">%</span>
                </div>

                <div className="divide-y dark:divide-slate-700 max-h-[60vh] overflow-y-auto">
                  {students.map(s => {
                    const inp = marksInput[s.id] || { marks: "", absent: false };
                    const m = Number(inp.marks) || 0;
                    const pct = !inp.absent && inp.marks !== "" ? Math.round((m / selectedExam.maxMarks) * 100) : null;
                    return (
                      <div
                        key={s.id}
                        className={`grid grid-cols-12 gap-0 px-3 py-2.5 items-center transition-colors ${
                          inp.absent ? "bg-red-50/50 dark:bg-red-950/20" : "hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                        }`}
                      >
                        <span className="col-span-1 text-xs font-mono font-bold text-slate-400 text-center">
                          {s.rollNo || "—"}
                        </span>
                        <div className="col-span-5 truncate pr-1">
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{s.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">Adm: {s.admissionNo || "—"}</p>
                        </div>
                        <div className="col-span-3 flex justify-center">
                          <input
                            type="number"
                            min="0"
                            max={selectedExam.maxMarks}
                            value={inp.absent ? "" : inp.marks}
                            disabled={inp.absent}
                            onChange={e => setMarksInput(p => ({ ...p, [s.id]: { ...p[s.id], marks: e.target.value } }))}
                            placeholder={inp.absent ? "Ab" : "—"}
                            className="w-16 text-center px-2 py-1 border dark:border-slate-600 rounded-lg bg-transparent text-slate-800 dark:text-white text-xs font-black disabled:opacity-40 disabled:bg-slate-100 dark:disabled:bg-slate-700"
                          />
                        </div>
                        <div className="col-span-2 flex justify-center">
                          <button
                            type="button"
                            onClick={() => setMarksInput(p => ({ ...p, [s.id]: { marks: "", absent: !p[s.id]?.absent } }))}
                            className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              inp.absent ? "bg-red-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500"
                            }`}
                          >
                            {inp.absent ? "Absent" : "Present"}
                          </button>
                        </div>
                        <span
                          className="col-span-1 text-right text-xs font-black"
                          style={{ color: pct !== null ? getGradeColor(pct) : "#94a3b8" }}
                        >
                          {pct !== null ? `${pct}%` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={saveMarks}
                disabled={saving}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm disabled:opacity-60 flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? "Saving..." : "Marks Save Karo"}</span>
              </button>
            </div>
          )}

          {/* ── VIEW: CLASS RESULT ── */}
          {view === "class_result" && (
            <div className="p-4 max-w-4xl mx-auto space-y-3 animate-in fade-in duration-150">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-800 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    <span>Class Result Matrix — {className}</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {students.length} Students • {exams.length} Exams Recorded
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
                >
                  Exams List
                </button>
              </div>

              {(() => {
                const uniqueExamNames = [...new Set(exams.map(e => e.examName))];
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-white font-bold">
                          <th className="px-3 py-2.5 text-left sticky left-0 bg-slate-800 z-10 w-28">Roll / Name</th>
                          {uniqueExamNames.map(n => (
                            <th key={n} className="px-2 py-2.5 text-center whitespace-nowrap">{n}</th>
                          ))}
                          <th className="px-3 py-2.5 text-center">Total %</th>
                          <th className="px-3 py-2.5 text-center">Grade</th>
                          <th className="px-3 py-2.5 text-center">Marksheet</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-slate-700">
                        {students.map((s, idx) => {
                          const studentExams = exams.filter(e => e.studentMarks[s.id]);
                          const totalObt = studentExams.reduce((sum, e) => sum + (e.studentMarks[s.id]?.absent ? 0 : (e.studentMarks[s.id]?.marks || 0)), 0);
                          const totalMax = studentExams.reduce((sum, e) => sum + e.maxMarks, 0);
                          const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : null;
                          return (
                            <tr key={s.id} className={idx % 2 === 0 ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-700/30"}>
                              <td className="px-3 py-2 font-medium text-slate-800 dark:text-white sticky left-0 bg-inherit z-10">
                                <div className="text-[10px] font-mono font-bold text-slate-400">{s.rollNo}</div>
                                <div className="truncate max-w-[120px] font-bold">{s.name}</div>
                              </td>
                              {uniqueExamNames.map(examName => {
                                const matchedExams = exams.filter(e => e.examName === examName && e.studentMarks[s.id]);
                                if (matchedExams.length === 0) return <td key={examName} className="px-2 py-2 text-center text-slate-300">—</td>;
                                const obt = matchedExams.reduce((sum, e) => sum + (e.studentMarks[s.id]?.absent ? 0 : (e.studentMarks[s.id]?.marks || 0)), 0);
                                const mx = matchedExams.reduce((sum, e) => sum + e.maxMarks, 0);
                                const ep = mx > 0 ? Math.round((obt / mx) * 100) : 0;
                                return (
                                  <td key={examName} className="px-2 py-2 text-center">
                                    <span style={{ color: getGradeColor(ep) }} className="font-bold">{obt}/{mx}</span>
                                  </td>
                                );
                              })}
                              <td className="px-3 py-2 text-center font-black" style={{ color: pct !== null ? getGradeColor(pct) : "#94a3b8" }}>
                                {pct !== null ? `${pct}%` : "—"}
                              </td>
                              <td className="px-3 py-2 text-center font-black" style={{ color: pct !== null ? getGradeColor(pct) : "#94a3b8" }}>
                                {pct !== null ? getGrade(pct) : "—"}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => generateMarksheet(s)}
                                  className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-lg text-xs font-bold transition cursor-pointer"
                                  title="Print Marksheet"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── VIEW: EXAM LIST (MAIN VIEW SHOWN IN SCREENSHOT) ── */}
          {view === "list" && (
            <div className="p-4 max-w-2xl mx-auto space-y-3 animate-in fade-in duration-150">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setView("add")}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer text-sm"
                >
                  <Plus className="w-4 h-4" /> Naya Exam
                </button>
                <button
                  type="button"
                  onClick={() => setView("class_result")}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition active:scale-95 cursor-pointer text-sm"
                >
                  <BarChart2 className="w-4 h-4" /> Class Result
                </button>
              </div>

              {exams.length === 0 ? (
                <div className="text-center py-16 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                  <Award className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Koi exam nahi mila</p>
                  <p className="text-xs mt-1 text-slate-400">Oopar "+ Naya Exam" dabayein</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {exams.map(exam => {
                    const markedCount = Object.keys(exam.studentMarks).length;
                    const allMarked = markedCount === students.length && students.length > 0;
                    return (
                      <div
                        key={exam.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl p-3.5 shadow-sm border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${allMarked ? "bg-green-100 dark:bg-green-900/40" : "bg-blue-100 dark:bg-blue-900/40"}`}>
                            {allMarked ? <Check className="w-5 h-5 text-green-600" /> : <BookOpen className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{exam.examName}</p>
                            <p className="text-xs text-slate-500 font-medium">
                              {exam.subjectName} • {new Date(exam.examDate).toLocaleDateString("en-IN")} • Max: {exam.maxMarks}
                            </p>
                            <p className={`text-xs font-bold mt-0.5 ${allMarked ? "text-green-600" : "text-orange-500"}`}>
                              {markedCount}/{students.length} students marked
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => openExam(exam)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer active:scale-95 shadow-2xs"
                            >
                              Marks Enter
                            </button>
                            {confirmDelete === exam.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteExam(exam.id)}
                                  className="px-2 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold"
                                >
                                  ✓
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1.5 bg-slate-200 dark:bg-slate-700 rounded-xl text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDelete(exam.id)}
                                className="p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition cursor-pointer"
                                title="Delete Exam"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
