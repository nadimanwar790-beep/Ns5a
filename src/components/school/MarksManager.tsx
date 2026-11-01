// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, saveExam, getExams, deleteExam, generateId,
  getSubjects, saveSubject
} from "../../school-firebase";
import type { SchoolStudent, ExamEntry, SchoolSubject } from "../../school-types";
import {
  Plus, Trash2, Save, ChevronLeft, BookOpen, Download, BarChart2,
  CheckCircle2, Sparkles, Filter, Layers, FileSpreadsheet, X, Search,
  Calendar, Award, AlertCircle
} from "lucide-react";

function getTotalGrade(pct: number) {
  if (pct >= 91) return "A+";
  if (pct >= 81) return "A";
  if (pct >= 71) return "B+";
  if (pct >= 61) return "B";
  if (pct >= 51) return "C+";
  if (pct >= 41) return "C";
  if (pct >= 33) return "D";
  return "F";
}

function getTotalGradeColor(pct: number) {
  if (pct >= 81) return "text-green-600";
  if (pct >= 61) return "text-blue-600";
  if (pct >= 41) return "text-yellow-600";
  return "text-red-600";
}

const COMMON_EXAM_PRESETS = [
  { name: "PA 1 (Periodic Assessment 1)", max: 40, date: "2026-05-18", label: "PA 1 (40 M)" },
  { name: "PA 2 (Periodic Assessment 2)", max: 40, date: "2026-07-25", label: "PA 2 (40 M)" },
  { name: "Half Yearly Examination", max: 100, date: "2026-09-22", label: "Half Yearly (100 M)" },
  { name: "PA 3 (Periodic Assessment 3)", max: 40, date: "2026-11-28", label: "PA 3 (40 M)" },
  { name: "PA 4 (Periodic Assessment 4)", max: 40, date: "2027-01-20", label: "PA 4 (40 M)" },
  { name: "Final Annual Examination", max: 100, date: "2027-03-15", label: "Final Exam (100 M)" },
];

const EXTRA_SUBJECT_SUGGESTIONS = [
  "General Knowledge (GK)", "Drawing & Art", "Moral Science",
  "Computer / IT", "Rhymes & Oral", "Handwriting & Calligraphy",
  "Conversation / Spoken English", "Physical Education (Sports)",
  "Urdu", "Sanskrit", "Music & Dance", "Environmental Studies (EVS)",
  "Social Science", "Practical / Viva", "Project Work"
];

interface Props {
  schoolId: string;
  classId: string;
  className: string;
  sessionId: string;
  teacherId: string;
  subjectId?: string;
  subjectName?: string;
  initialSubjects?: SchoolSubject[];
  onBack?: () => void;
}

export const MarksManager: React.FC<Props> = ({
  schoolId,
  classId,
  className,
  sessionId,
  teacherId,
  subjectId = "",
  subjectName = "All Subjects",
  initialSubjects = [],
  onBack
}) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>(initialSubjects);
  const [view, setView] = useState<"list" | "new" | "entry" | "totals" | "master_sheet">("list");
  const [selectedExam, setSelectedExam] = useState<ExamEntry | null>(null);
  const [termFilter, setTermFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Single Exam Form State
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().split("T")[0]);
  const [maxMarks, setMaxMarks] = useState(100);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectId);
  const [examSubjectName, setExamSubjectName] = useState(subjectName !== "All Subjects" ? subjectName : "");
  const [marksInput, setMarksInput] = useState<{ [id: string]: string }>({});
  const [absentMap, setAbsentMap] = useState<{ [id: string]: boolean }>({});

  // Extra Subject Modal State
  const [showExtraSubjectModal, setShowExtraSubjectModal] = useState(false);
  const [extraSubjectInput, setExtraSubjectInput] = useState("");
  const [saveToClassPermanent, setSaveToClassPermanent] = useState(true);
  const [addingSubject, setAddingSubject] = useState(false);

  // Multi-Subject Master Sheet State
  const [masterExamName, setMasterExamName] = useState<string>(COMMON_EXAM_PRESETS[0].name);
  const [masterMaxMarks, setMasterMaxMarks] = useState<number>(COMMON_EXAM_PRESETS[0].max);
  const [masterExamDate, setMasterExamDate] = useState<string>(COMMON_EXAM_PRESETS[0].date);
  // Grid: [studentId][subjectName]: string
  const [masterMarksGrid, setMasterMarksGrid] = useState<{ [studentId: string]: { [subjName: string]: string } }>({});
  const [masterAbsentGrid, setMasterAbsentGrid] = useState<{ [studentId: string]: { [subjName: string]: boolean } }>({});
  const [masterSearchQuery, setMasterSearchQuery] = useState("");

  // Load students, exams, and class subjects on mount
  useEffect(() => {
    Promise.all([
      getStudents(schoolId, classId),
      getExams(schoolId, classId),
      getSubjects(schoolId, classId)
    ]).then(([sts, exs, subs]) => {
      setStudents(sts);
      setExams(exs);
      if (subs && subs.length > 0) {
        setSubjects(subs);
      } else if (initialSubjects && initialSubjects.length > 0) {
        setSubjects(initialSubjects);
      }
    });
  }, [schoolId, classId]);

  // Sync Master Sheet Grid whenever masterExamName or exams or subjects change
  useEffect(() => {
    if (!masterExamName || students.length === 0) return;

    // Filter exams matching this masterExamName
    const relevantExams = exams.filter(e =>
      e.examName.trim().toLowerCase() === masterExamName.trim().toLowerCase()
    );

    const newGrid: { [studentId: string]: { [subjName: string]: string } } = {};
    const newAbsent: { [studentId: string]: { [subjName: string]: boolean } } = {};

    students.forEach(st => {
      newGrid[st.id] = {};
      newAbsent[st.id] = {};

      subjects.forEach(sub => {
        const matchingExam = relevantExams.find(e =>
          (e.subjectId && e.subjectId === sub.id) ||
          e.subjectName.trim().toLowerCase() === sub.name.trim().toLowerCase()
        );
        if (matchingExam && matchingExam.studentMarks[st.id]) {
          const rec = matchingExam.studentMarks[st.id];
          newGrid[st.id][sub.name] = rec.absent ? "" : String(rec.marks);
          newAbsent[st.id][sub.name] = !!rec.absent;
        } else {
          newGrid[st.id][sub.name] = "";
          newAbsent[st.id][sub.name] = false;
        }
      });
    });

    setMasterMarksGrid(newGrid);
    setMasterAbsentGrid(newAbsent);
  }, [masterExamName, exams, subjects, students]);

  // Auto-dismiss notification
  useEffect(() => {
    if (saveSuccessNotice) {
      const timer = setTimeout(() => setSaveSuccessNotice(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveSuccessNotice]);

  const startNewExam = (presetSubject?: SchoolSubject) => {
    setExamName(COMMON_EXAM_PRESETS[0].name);
    setExamDate(COMMON_EXAM_PRESETS[0].date);
    setMaxMarks(COMMON_EXAM_PRESETS[0].max);

    const targetSub = presetSubject || (subjects.length > 0 ? subjects[0] : null);
    if (targetSub) {
      setSelectedSubjectId(targetSub.id);
      setExamSubjectName(targetSub.name);
    } else {
      setSelectedSubjectId("");
      setExamSubjectName(subjectName !== "All Subjects" ? subjectName : "");
    }

    const init: { [id: string]: string } = {};
    students.forEach(s => (init[s.id] = ""));
    setMarksInput(init);
    setAbsentMap({});
    setView("new");
  };

  const openExam = (exam: ExamEntry) => {
    setSelectedExam(exam);
    setSelectedSubjectId(exam.subjectId || "");
    setExamSubjectName(exam.subjectName || "");
    const m: { [id: string]: string } = {};
    const ab: { [id: string]: boolean } = {};
    students.forEach(s => {
      const sm = exam.studentMarks[s.id];
      m[s.id] = sm ? String(sm.marks) : "";
      ab[s.id] = sm?.absent || false;
    });
    setMarksInput(m);
    setAbsentMap(ab);
    setView("entry");
  };

  // Add Extra Subject / Book on the fly
  const handleAddExtraSubject = async (customName?: string) => {
    const nameToAdd = (customName || extraSubjectInput).trim();
    if (!nameToAdd) return;

    setAddingSubject(true);
    try {
      // Check if already in subjects
      const existing = subjects.find(s => s.name.trim().toLowerCase() === nameToAdd.toLowerCase());
      let targetSubjectId = existing ? existing.id : generateId();

      if (!existing) {
        const newSub: SchoolSubject = {
          id: targetSubjectId,
          schoolId,
          sessionId,
          classId,
          name: nameToAdd,
          createdAt: new Date().toISOString()
        };

        if (saveToClassPermanent) {
          await saveSubject(newSub);
        }
        setSubjects(prev => [...prev, newSub]);
      }

      // Auto select for single exam if in new/entry mode
      setSelectedSubjectId(targetSubjectId);
      setExamSubjectName(nameToAdd);
      setShowExtraSubjectModal(false);
      setExtraSubjectInput("");
      setSaveSuccessNotice(`✅ Book "${nameToAdd}" safalta se add ho gayi!`);
    } catch (err) {
      console.error("Error adding extra subject:", err);
    } finally {
      setAddingSubject(false);
    }
  };

  // Save Single Exam Entry
  const saveNewExam = async () => {
    if (!examName.trim()) {
      alert("Please enter Exam Name (e.g. PA 1 or Half Yearly)");
      return;
    }
    if (!examSubjectName.trim()) {
      alert("Please select or enter Subject / Book name");
      return;
    }

    setSaving(true);
    const studentMarks: ExamEntry["studentMarks"] = {};
    students.forEach(s => {
      const m = parseFloat(marksInput[s.id]);
      studentMarks[s.id] = {
        marks: isNaN(m) ? 0 : Math.min(m, maxMarks),
        absent: absentMap[s.id] || false,
        studentName: s.name,
        rollNo: s.rollNo
      };
    });

    const exam: ExamEntry = {
      id: generateId(),
      schoolId,
      sessionId,
      classId,
      subjectId: selectedSubjectId || "",
      subjectName: examSubjectName.trim(),
      examName: examName.trim(),
      examDate,
      maxMarks,
      markedBy: teacherId,
      studentMarks,
      createdAt: new Date().toISOString()
    };

    await saveExam(exam);
    const updated = await getExams(schoolId, classId);
    setExams(updated);
    setView("list");
    setSaving(false);
    setSaveSuccessNotice(`✅ ${exam.examName} (${exam.subjectName}) ke marks save ho gaye!`);
  };

  const updateExamMarks = async () => {
    if (!selectedExam) return;
    setSaving(true);
    const studentMarks: ExamEntry["studentMarks"] = {};
    students.forEach(s => {
      const m = parseFloat(marksInput[s.id]);
      studentMarks[s.id] = {
        marks: isNaN(m) ? 0 : Math.min(m, selectedExam.maxMarks),
        absent: absentMap[s.id] || false,
        studentName: s.name,
        rollNo: s.rollNo
      };
    });

    const updatedExam: ExamEntry = {
      ...selectedExam,
      subjectId: selectedSubjectId || selectedExam.subjectId,
      subjectName: examSubjectName.trim() || selectedExam.subjectName,
      studentMarks
    };

    await saveExam(updatedExam);
    const updated = await getExams(schoolId, classId);
    setExams(updated);
    setView("list");
    setSaving(false);
    setSaveSuccessNotice(`✅ ${updatedExam.examName} (${updatedExam.subjectName}) update ho gaya!`);
  };

  // Save All-in-One Multi-Subject Master Sheet
  const saveMasterSheetMarks = async () => {
    if (!masterExamName.trim()) {
      alert("Please select or enter Exam Name for Master Sheet");
      return;
    }

    setSaving(true);
    try {
      // Loop over each subject that has at least some marks entered or is in subjects list
      for (const sub of subjects) {
        // Collect student marks for this subject
        const studentMarks: ExamEntry["studentMarks"] = {};
        let hasAnyEntry = false;

        students.forEach(st => {
          const rawVal = masterMarksGrid[st.id]?.[sub.name];
          const isAbsent = masterAbsentGrid[st.id]?.[sub.name] || false;
          const parsed = parseFloat(rawVal || "");

          if (isAbsent || !isNaN(parsed)) {
            hasAnyEntry = true;
          }

          studentMarks[st.id] = {
            marks: isNaN(parsed) ? 0 : Math.min(parsed, masterMaxMarks),
            absent: isAbsent,
            studentName: st.name,
            rollNo: st.rollNo
          };
        });

        // Only save if there are entries or to update existing
        const existingExam = exams.find(e =>
          e.examName.trim().toLowerCase() === masterExamName.trim().toLowerCase() &&
          ((e.subjectId && e.subjectId === sub.id) || e.subjectName.trim().toLowerCase() === sub.name.trim().toLowerCase())
        );

        if (hasAnyEntry || existingExam) {
          const examDoc: ExamEntry = {
            id: existingExam ? existingExam.id : generateId(),
            schoolId,
            sessionId,
            classId,
            subjectId: sub.id,
            subjectName: sub.name,
            examName: masterExamName.trim(),
            examDate: masterExamDate,
            maxMarks: masterMaxMarks,
            markedBy: teacherId,
            studentMarks,
            createdAt: existingExam ? existingExam.createdAt : new Date().toISOString()
          };
          await saveExam(examDoc);
        }
      }

      const updated = await getExams(schoolId, classId);
      setExams(updated);
      setSaveSuccessNotice(`🎉 Sabhi ${subjects.length} Books ke Marks ek saath save ho gaye!`);
    } catch (err) {
      console.error("Error saving master sheet:", err);
      alert("Failed to save master sheet. Please check connection.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!window.confirm("Are you sure you want to delete this exam record?")) return;
    await deleteExam(schoolId, examId);
    setExams(prev => prev.filter(e => e.id !== examId));
    setSaveSuccessNotice("Exam record deleted.");
  };

  const downloadExamReport = (exam: ExamEntry) => {
    const rows = students.map(s => {
      const sm = exam.studentMarks[s.id];
      const pct = sm && !sm.absent ? Math.round((sm.marks / exam.maxMarks) * 100) : null;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${s.rollNo}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0">${s.name}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${sm?.absent ? "<b>AB</b>" : (sm?.marks ?? "-")}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center">${exam.maxMarks}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;color:${pct !== null ? (pct >= 60 ? "#16a34a" : "#dc2626") : "#94a3b8"}">${pct !== null ? pct + "%" : "-"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${exam.examName} — ${exam.subjectName}</title>
<style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1e293b;color:white;padding:10px;text-align:left}th.center,td.center{text-align:center}</style></head>
<body>
  <h2>${exam.examName} — ${exam.subjectName}</h2>
  <p><strong>Class:</strong> ${className} &nbsp;|&nbsp; <strong>Date:</strong> ${exam.examDate} &nbsp;|&nbsp; <strong>Max Marks:</strong> ${exam.maxMarks}</p>
  <table>
    <thead><tr><th class="center">Roll</th><th>Student Name</th><th class="center">Marks</th><th class="center">Max Marks</th><th class="center">%</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px;color:#94a3b8;font-size:12px">Generated by Smart School Management System</p>
</body></html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exam.examName}_${exam.subjectName}_${className}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Single Exam Form (New or Edit)
  const renderSingleExamForm = (exam: ExamEntry | null, isNew: boolean) => {
    const mx = isNew ? maxMarks : exam?.maxMarks || 100;
    return (
      <div className="p-4 space-y-4 max-w-3xl mx-auto animate-in fade-in duration-150">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                {isNew ? "📝 Naya Exam Marks Entry" : `✏️ Edit: ${exam?.examName}`}
              </h3>
              <p className="text-xs text-slate-500">
                Class: <strong className="text-slate-700 dark:text-slate-300">{className}</strong> ({students.length} Students, {subjects.length} Books)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowExtraSubjectModal(true)}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Extra Book / Subject जोड़ें</span>
            </button>
          </div>

          {/* Exam Presets (PA 1, PA 2, Half Yearly, etc.) */}
          <div>
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
              📅 Exam Type Chunein (PA 40 Marks, Half/Final 100 Marks):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {COMMON_EXAM_PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setExamName(p.name);
                    setMaxMarks(p.max);
                    setExamDate(p.date);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer text-left ${
                    examName === p.name
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-blue-50"
                  }`}
                >
                  <p className="font-black truncate">{p.label}</p>
                  <p className="text-[10px] opacity-75">{p.date}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject / Book Selector - Dynamic showing ALL 9, 10, or 20 books */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-purple-600" />
                <span>Subject / Book Chunein ({subjects.length} Books Available in {className}):</span>
              </label>
              <span className="text-[11px] text-slate-400">
                1-Click tap karke book select karein
              </span>
            </div>

            {/* Books Pills / Grid */}
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
              {subjects.map(sub => {
                const isSelected = examSubjectName.trim().toLowerCase() === sub.name.trim().toLowerCase();
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setExamSubjectName(sub.name);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-purple-300"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span>{sub.name}</span>
                  </button>
                );
              })}

              {/* Extra Subject Quick Button */}
              <button
                type="button"
                onClick={() => setShowExtraSubjectModal(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Extra Book</span>
              </button>
            </div>

            {/* Direct Input Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Selected Subject / Book Name *</label>
                <input
                  value={examSubjectName}
                  onChange={e => setExamSubjectName(e.target.value)}
                  placeholder="Subject / Book Name (e.g. Mathematics, Hindi, GK)"
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Exam Title *</label>
                <input
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="Exam Name (e.g. PA 1, Half Yearly)"
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Exam Date</label>
                <input
                  type="date"
                  value={examDate}
                  onChange={e => setExamDate(e.target.value)}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Max Marks (पूर्णांक)</label>
                <input
                  type="number"
                  value={maxMarks}
                  onChange={e => setMaxMarks(Number(e.target.value))}
                  min={1}
                  max={1000}
                  className="w-full px-3 py-2 border dark:border-slate-600 rounded-xl bg-transparent text-slate-800 dark:text-white text-xs font-black"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Student Marks Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="w-12 text-center">Roll</span>
            <span className="flex-1">Student Name</span>
            <span className="w-24 text-center">Marks / {mx}</span>
            <span className="w-16 text-center">Absent</span>
          </div>

          <div className="divide-y dark:divide-slate-700 max-h-[55vh] overflow-y-auto">
            {students.map(s => {
              const isAb = absentMap[s.id] || false;
              const val = marksInput[s.id] || "";
              const numVal = parseFloat(val);
              const isInvalid = !isAb && val !== "" && (isNaN(numVal) || numVal > mx || numVal < 0);

              return (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 px-4 py-2.5 transition-colors ${
                    isAb ? "bg-red-50/40 dark:bg-red-950/20" : "hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                  }`}
                >
                  <span className="w-12 text-center text-xs font-mono font-bold text-slate-400">
                    {s.rollNo || "—"}
                  </span>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      Adm: {s.admissionNo || "—"}
                    </p>
                  </div>

                  <div className="w-24 flex flex-col items-center">
                    <input
                      type="number"
                      min={0}
                      max={mx}
                      step="any"
                      value={isAb ? "" : val}
                      disabled={isAb}
                      onChange={e => setMarksInput(prev => ({ ...prev, [s.id]: e.target.value }))}
                      placeholder={isAb ? "AB" : "0"}
                      className={`w-20 px-2 py-1.5 border rounded-xl text-center text-sm font-black transition ${
                        isInvalid
                          ? "border-red-500 bg-red-50 text-red-600"
                          : isAb
                          ? "border-slate-200 bg-slate-100 text-slate-400 opacity-60"
                          : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      }`}
                    />
                    {isInvalid && <span className="text-[9px] text-red-500 font-bold mt-0.5">Max {mx}</span>}
                  </div>

                  <label className="w-16 flex items-center justify-center gap-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAb}
                      onChange={e => setAbsentMap(prev => ({ ...prev, [s.id]: e.target.checked }))}
                      className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                    />
                    <span className="text-xs font-bold text-red-500">AB</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={isNew ? saveNewExam : updateExamMarks}
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-98 transition cursor-pointer disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Marks Save Ho Rahe Hain..." : `Save Marks (${examSubjectName || "Subject"})`}</span>
        </button>
      </div>
    );
  };

  // Multi-Subject Master Sheet View (All 9, 10, or 20 books in one table)
  const renderMasterSheetView = () => {
    const filteredStudents = students.filter(s => {
      if (!masterSearchQuery.trim()) return true;
      const q = masterSearchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || (s.rollNo && s.rollNo.includes(q));
    });

    return (
      <div className="p-3 sm:p-5 space-y-4 max-w-full overflow-x-hidden animate-in fade-in duration-150">
        {/* Master Sheet Header & Term Switcher */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h3 className="font-black text-slate-900 dark:text-white text-base">
                  All-in-One Multi-Subject Master Sheet
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                  {subjects.length} Books / Subjects
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Class: <strong className="text-slate-700 dark:text-slate-300">{className}</strong> • Sabhi subjects ke marks ek hi sheet mein daalein
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowExtraSubjectModal(true)}
                className="px-3 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Extra Subject / Book</span>
              </button>

              <button
                type="button"
                onClick={saveMasterSheetMarks}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition cursor-pointer disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving All..." : "💾 Save All Subjects Marks"}</span>
              </button>
            </div>
          </div>

          {/* Exam Presets Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Exam Term Chunein:</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {COMMON_EXAM_PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setMasterExamName(p.name);
                    setMasterMaxMarks(p.max);
                    setMasterExamDate(p.date);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition cursor-pointer ${
                    masterExamName === p.name
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-indigo-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search student */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={masterSearchQuery}
              onChange={e => setMasterSearchQuery(e.target.value)}
              placeholder="Search student by name or roll..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {/* Master Matrix Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-black border-b dark:border-slate-600">
                  <th className="p-2.5 text-center sticky left-0 bg-slate-100 dark:bg-slate-700 z-10 w-12 border-r dark:border-slate-600">Roll</th>
                  <th className="p-2.5 sticky left-12 bg-slate-100 dark:bg-slate-700 z-10 min-w-[140px] border-r dark:border-slate-600">Student Name</th>
                  {subjects.map(sub => (
                    <th key={sub.id} className="p-2.5 text-center min-w-[100px] border-r dark:border-slate-600">
                      <div className="flex flex-col items-center">
                        <span className="font-bold truncate max-w-[110px]" title={sub.name}>{sub.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">Max: {masterMaxMarks}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-2.5 text-center min-w-[80px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">Total</th>
                  <th className="p-2.5 text-center min-w-[60px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">%</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-700">
                {filteredStudents.map(st => {
                  let studentTotal = 0;
                  let enteredCount = 0;

                  subjects.forEach(sub => {
                    const val = masterMarksGrid[st.id]?.[sub.name];
                    const isAb = masterAbsentGrid[st.id]?.[sub.name];
                    if (isAb) {
                      enteredCount++;
                    } else if (val !== undefined && val !== "") {
                      const num = parseFloat(val);
                      if (!isNaN(num)) {
                        studentTotal += num;
                        enteredCount++;
                      }
                    }
                  });

                  const totalPossible = subjects.length * masterMaxMarks;
                  const pct = totalPossible > 0 && enteredCount > 0
                    ? Math.round((studentTotal / totalPossible) * 100)
                    : null;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-2 text-center sticky left-0 bg-white dark:bg-slate-800 z-10 font-mono font-bold text-slate-400 border-r dark:border-slate-700">
                        {st.rollNo || "—"}
                      </td>
                      <td className="p-2 sticky left-12 bg-white dark:bg-slate-800 z-10 font-bold text-slate-900 dark:text-white border-r dark:border-slate-700 truncate max-w-[140px]">
                        {st.name}
                      </td>

                      {subjects.map(sub => {
                        const val = masterMarksGrid[st.id]?.[sub.name] ?? "";
                        const isAb = masterAbsentGrid[st.id]?.[sub.name] ?? false;

                        return (
                          <td key={sub.id} className="p-1.5 text-center border-r dark:border-slate-700">
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={masterMaxMarks}
                                step="any"
                                value={isAb ? "" : val}
                                disabled={isAb}
                                placeholder={isAb ? "AB" : "—"}
                                onChange={e => {
                                  const newVal = e.target.value;
                                  setMasterMarksGrid(prev => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      [sub.name]: newVal
                                    }
                                  }));
                                }}
                                className={`w-14 px-1.5 py-1 text-center text-xs font-bold rounded-lg border transition ${
                                  isAb
                                    ? "bg-slate-100 text-slate-400 opacity-60 border-slate-200"
                                    : val !== ""
                                    ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100"
                                    : "border-slate-200 dark:border-slate-600 bg-transparent text-slate-800 dark:text-white"
                                }`}
                              />
                              <button
                                type="button"
                                title={isAb ? "Mark Present" : "Mark Absent"}
                                onClick={() => {
                                  setMasterAbsentGrid(prev => ({
                                    ...prev,
                                    [st.id]: {
                                      ...(prev[st.id] || {}),
                                      [sub.name]: !isAb
                                    }
                                  }));
                                }}
                                className={`text-[10px] px-1 py-0.5 rounded font-black cursor-pointer transition ${
                                  isAb
                                    ? "bg-red-500 text-white"
                                    : "bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-red-500"
                                }`}
                              >
                                AB
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-2 text-center font-black text-slate-800 dark:text-white bg-indigo-50/50 dark:bg-indigo-950/20">
                        {enteredCount > 0 ? studentTotal : "—"}
                      </td>
                      <td className="p-2 text-center font-black bg-indigo-50/50 dark:bg-indigo-950/20">
                        {pct !== null ? (
                          <span className={getTotalGradeColor(pct)}>{pct}%</span>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={saveMasterSheetMarks}
            disabled={saving}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition cursor-pointer disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving All..." : `💾 Save All ${subjects.length} Subjects Marks`}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Top Navbar */}
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={view !== "list" ? () => setView("list") : onBack}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="min-w-0">
              <h2 className="font-black text-slate-900 dark:text-white text-base truncate">
                {view === "list"
                  ? `${className} — Exam Marks`
                  : view === "new"
                  ? "New Exam Entry"
                  : view === "master_sheet"
                  ? "Multi-Subject Master Sheet"
                  : view === "totals"
                  ? `${className} — Total Score & Merit`
                  : `Edit: ${selectedExam?.examName}`}
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                {subjects.length} Subjects/Books • {students.length} Students
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {view === "list" && (
              <>
                <button
                  type="button"
                  onClick={() => setView("master_sheet")}
                  className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                  title="Sabhi books ke marks ek hi sheet me daalein"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Master Sheet</span>
                  <span className="sm:hidden">Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => setView("totals")}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Total Score</span>
                </button>
                <button
                  type="button"
                  onClick={() => startNewExam()}
                  className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs active:scale-95 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Exam</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Floating Success Notice */}
      {saveSuccessNotice && (
        <div className="max-w-md mx-auto mt-3 px-4 animate-in slide-in-from-top duration-200">
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between gap-2 text-xs font-bold">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveSuccessNotice}</span>
            </div>
            <button onClick={() => setSaveSuccessNotice(null)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW 1: EXAM LIST VIEW ── */}
      {view === "list" && (
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
          {/* 📚 Class Subjects Showcase Bar - Dynamically displaying ALL 9, 10, or 20 books */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm">
                    Class {className} ke Sabhi Subjects & Books ({subjects.length})
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Har book ke samne exam marks add karne aur extra books jodane ki suvidha
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowExtraSubjectModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Extra Book / Subject जोड़ें</span>
                </button>
              </div>
            </div>

            {/* Scrollable / Wrap Grid of ALL Class Books */}
            <div className="flex flex-wrap gap-2 pt-1">
              {subjects.map((sub, idx) => {
                const subExams = exams.filter(e =>
                  (e.subjectId && e.subjectId === sub.id) ||
                  e.subjectName.trim().toLowerCase() === sub.name.trim().toLowerCase()
                );
                const isFiltered = subjectFilter.toLowerCase() === sub.name.toLowerCase();

                return (
                  <div
                    key={sub.id || `subj-${idx}`}
                    className={`group px-3 py-2 rounded-xl border transition-all flex items-center gap-2 ${
                      isFiltered
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-slate-50 dark:bg-slate-700/50 hover:bg-white text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSubjectFilter(isFiltered ? "all" : sub.name)}
                      className="text-xs font-bold text-left flex items-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isFiltered ? "text-white" : "text-purple-600 dark:text-purple-400"}`} />
                      <span className="truncate max-w-[120px]">{sub.name}</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isFiltered
                          ? "bg-white/20 text-white"
                          : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                      }`}>
                        {subExams.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startNewExam(sub)}
                      title={`Add Exam for ${sub.name}`}
                      className={`p-1 rounded-lg transition opacity-80 hover:opacity-100 cursor-pointer ${
                        isFiltered ? "hover:bg-white/20 text-white" : "hover:bg-purple-100 text-purple-600"
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Master Sheet Promotion Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-indigo-500/30">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h4 className="font-black text-sm">Multi-Subject Master Entry Sheet</h4>
              </div>
              <p className="text-xs text-indigo-200">
                Sabhi {subjects.length} books ke marks ek sath table me daalna chahte hain?
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("master_sheet")}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Open Master Sheet</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="space-y-2">
            {/* Term Filter */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              <button
                type="button"
                onClick={() => setTermFilter("all")}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  termFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                Sabhi Exams ({exams.length})
              </button>
              {COMMON_EXAM_PRESETS.map(tf => (
                <button
                  key={tf.name}
                  type="button"
                  onClick={() => setTermFilter(tf.name)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    termFilter === tf.name
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Subject Filter Bar */}
            {subjectFilter !== "all" && (
              <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/30 px-3 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800 text-xs font-bold text-purple-700 dark:text-purple-300">
                <Filter className="w-3.5 h-3.5" />
                <span>Showing only: <strong>{subjectFilter}</strong></span>
                <button
                  type="button"
                  onClick={() => setSubjectFilter("all")}
                  className="ml-auto text-purple-500 hover:text-purple-700 text-xs underline cursor-pointer"
                >
                  Clear Filter
                </button>
              </div>
            )}
          </div>

          {/* Exam List */}
          {exams.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
              <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="font-black text-slate-700 dark:text-slate-300 text-base">Koi Exam Record Nahi Mila</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Class {className} ke sabhi {subjects.length} subjects ke exam marks yahan store honge.
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => startNewExam()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Single Exam
                </button>
                <button
                  type="button"
                  onClick={() => setView("master_sheet")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Open Master Sheet
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {exams
                .filter(exam => {
                  if (termFilter !== "all" && !exam.examName.toLowerCase().includes(termFilter.toLowerCase())) {
                    return false;
                  }
                  if (subjectFilter !== "all" && exam.subjectName.toLowerCase() !== subjectFilter.toLowerCase()) {
                    return false;
                  }
                  return true;
                })
                .map(exam => {
                  const appeared = Object.values(exam.studentMarks).filter(m => !m.absent).length;
                  const avg = appeared > 0
                    ? Math.round(Object.values(exam.studentMarks).filter(m => !m.absent).reduce((s, m) => s + m.marks, 0) / appeared)
                    : 0;
                  const pass = Object.values(exam.studentMarks).filter(m => !m.absent && m.marks / exam.maxMarks >= 0.33).length;

                  return (
                    <div
                      key={exam.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-black text-slate-900 dark:text-white text-sm">
                              {exam.examName}
                            </p>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                              📖 {exam.subjectName}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                              exam.maxMarks === 40
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300"
                                : "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300"
                            }`}>
                              {exam.maxMarks} Marks
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 font-medium">
                            Exam Date: <strong>{exam.examDate}</strong>
                          </p>

                          <div className="flex gap-4 mt-2 text-xs flex-wrap">
                            <span className="text-slate-400">
                              Appeared: <b className="text-slate-700 dark:text-slate-200">{appeared}/{students.length}</b>
                            </span>
                            <span className="text-slate-400">
                              Class Avg: <b className="text-blue-600">{avg}/{exam.maxMarks}</b>
                            </span>
                            <span className="text-slate-400">
                              Passed: <b className="text-green-600">{pass}</b>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadExamReport(exam)}
                            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition cursor-pointer"
                            title="Download / Print Report"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openExam(exam)}
                            className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/40 text-blue-600 transition cursor-pointer"
                            title="View & Edit Marks"
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteExam(exam.id)}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 transition cursor-pointer"
                            title="Delete Exam Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: NEW SINGLE EXAM ── */}
      {view === "new" && renderSingleExamForm(null, true)}

      {/* ── VIEW 3: EDIT SINGLE EXAM ── */}
      {view === "entry" && selectedExam && renderSingleExamForm(selectedExam, false)}

      {/* ── VIEW 4: MASTER SHEET ── */}
      {view === "master_sheet" && renderMasterSheetView()}

      {/* ── VIEW 5: TOTALS / MERIT VIEW ── */}
      {view === "totals" && (
        <div className="p-4 space-y-4 max-w-4xl mx-auto animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-emerald-600" />
                <span>Class {className} — Overall Total Score &amp; Merit</span>
              </h3>
              <p className="text-xs text-slate-500">
                Calculated across all recorded exams and subjects
              </p>
            </div>
            <button
              type="button"
              onClick={() => setView("list")}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Back to Exams
            </button>
          </div>

          {students.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BarChart2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="font-bold">Koi student nahi mila</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/60 text-xs text-slate-500 font-bold border-b dark:border-slate-700 grid grid-cols-12">
                <span className="col-span-1 text-center">Roll</span>
                <span className="col-span-4">Student Name</span>
                <span className="col-span-2 text-center">Exams Given</span>
                <span className="col-span-3 text-center">Total Marks</span>
                <span className="col-span-1 text-center">%</span>
                <span className="col-span-1 text-center">Grade</span>
              </div>

              <div className="divide-y dark:divide-slate-700">
                {students.map((s, idx) => {
                  const studentExams = exams.filter(e => e.studentMarks?.[s.id]);
                  const totalObt = studentExams.reduce((sum, e) => {
                    const sm = e.studentMarks[s.id];
                    return sum + (sm?.absent ? 0 : sm?.marks || 0);
                  }, 0);
                  const totalMax = studentExams.reduce((sum, e) => sum + e.maxMarks, 0);
                  const pct = totalMax > 0 ? Math.round((totalObt / totalMax) * 100) : null;
                  const gr = pct !== null ? getTotalGrade(pct) : "—";

                  return (
                    <div
                      key={s.id}
                      className={`grid grid-cols-12 items-center px-4 py-3 text-xs ${
                        idx % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-700/20"
                      }`}
                    >
                      <span className="col-span-1 text-center font-mono font-bold text-slate-400">
                        {s.rollNo || "—"}
                      </span>
                      <div className="col-span-4 min-w-0 pr-2">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">Adm: {s.admissionNo || "—"}</p>
                      </div>
                      <span className="col-span-2 text-center text-slate-500 font-medium">
                        {studentExams.length}
                      </span>
                      <span className="col-span-3 text-center font-black text-slate-800 dark:text-slate-100">
                        {totalMax > 0 ? `${totalObt} / ${totalMax}` : "—"}
                      </span>
                      <span className={`col-span-1 text-center font-black ${pct !== null ? getTotalGradeColor(pct) : "text-slate-400"}`}>
                        {pct !== null ? `${pct}%` : "—"}
                      </span>
                      <span className={`col-span-1 text-center font-black ${pct !== null ? getTotalGradeColor(pct) : "text-slate-400"}`}>
                        {gr}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL: + ADD EXTRA SUBJECT / BOOK ── */}
      {showExtraSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-base">
                    Extra Subject / Book जोड़ें
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Class {className} me naya subject add karein aur marks daalein
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExtraSubjectModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject / Book ka Naam *
                </label>
                <input
                  type="text"
                  value={extraSubjectInput}
                  onChange={e => setExtraSubjectInput(e.target.value)}
                  placeholder="e.g. Drawing, Moral Science, GK Oral, Sanskrit"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white text-xs font-bold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              {/* Suggestions */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 mb-1.5">Quick Suggestions (Tap karke add karein):</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {EXTRA_SUBJECT_SUGGESTIONS.map(sug => {
                    const alreadyExists = subjects.some(s => s.name.trim().toLowerCase() === sug.toLowerCase());
                    return (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setExtraSubjectInput(sug)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                          alreadyExists
                            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-60"
                            : extraSubjectInput === sug
                            ? "bg-purple-600 text-white"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-purple-300"
                        }`}
                      >
                        {sug} {alreadyExists ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Checkbox: Save permanently to class subjects */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveToClassPermanent}
                  onChange={e => setSaveToClassPermanent(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
                />
                <span className="text-xs font-bold text-purple-900 dark:text-purple-200 leading-tight">
                  Is book ko Class {className} ki permanent subject list me bhi save karein (Sabhi exams aur report card me dikhega)
                </span>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleAddExtraSubject()}
                  disabled={addingSubject || !extraSubjectInput.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-500/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
                >
                  {addingSubject ? "Adding Subject..." : "✓ Book Add Karein"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowExtraSubjectModal(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
