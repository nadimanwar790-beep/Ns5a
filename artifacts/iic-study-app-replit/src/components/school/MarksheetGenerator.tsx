// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, SchoolSession } from "../../school-types";
import {
  FileSpreadsheet, Printer, ChevronLeft, Plus, Trash2, Award, Calendar,
  CheckCircle2, Sparkles, RefreshCw, User, BookOpen, Layers, Edit3, Shield
} from "lucide-react";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  activeSession: SchoolSession | null;
  onBack: () => void;
}

export interface MarksheetSubjectRow {
  id: string;
  code: string;
  name: string;
  theory: number;
  mcq: number;
  practical: number;
  highest: number;
  maxTheory: number;
  maxMcq: number;
  maxPractical: number;
}

const DEFAULT_SUBJECTS: MarksheetSubjectRow[] = [
  { id: "sub_1", code: "101", name: "English Language & Lit.", theory: 68, mcq: 18, practical: 0, highest: 92, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
  { id: "sub_2", code: "102", name: "Hindi / Regional Lang.", theory: 72, mcq: 17, practical: 0, highest: 94, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
  { id: "sub_3", code: "103", name: "Mathematics", theory: 65, mcq: 19, practical: 0, highest: 98, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
  { id: "sub_4", code: "104", name: "General Science", theory: 52, mcq: 16, practical: 19, highest: 95, maxTheory: 60, maxMcq: 20, maxPractical: 20 },
  { id: "sub_5", code: "105", name: "Social Science", theory: 64, mcq: 18, practical: 0, highest: 89, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
  { id: "sub_6", code: "106", name: "Information Technology (ICT)", theory: 28, mcq: 19, practical: 48, highest: 99, maxTheory: 30, maxMcq: 20, maxPractical: 50 },
];

export const MarksheetGenerator: React.FC<Props> = ({
  school,
  classes,
  students,
  activeSession,
  onBack,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const classStudents = students.filter(s => s.classId === selectedClassId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || "");

  // Exam Meta
  const [examTitle, setExamTitle] = useState("ANNUAL EXAMINATION 2026-27");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionName, setSessionName] = useState(activeSession?.name || "2026-27");
  const [gradingScaleType, setGradingScaleType] = useState<"5.0" | "10.0">("5.0");

  // Editable Student Meta (Overrides auto student data if desired)
  const currentStudent = classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;
  const currentClass = classes.find(c => c.id === selectedClassId);

  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [regiNo, setRegiNo] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [sectionName, setSectionName] = useState("A");

  // Signatures
  const [principalTitle, setPrincipalTitle] = useState("Principal / Headmaster");
  const [principalName, setPrincipalName] = useState(school.principalName || "Dr. Rajeshwar Sharma");
  const [teacherName, setTeacherName] = useState("Class Teacher");

  // Subject rows
  const [subjects, setSubjects] = useState<MarksheetSubjectRow[]>(DEFAULT_SUBJECTS);

  // Bulk Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Synchronize student data on selection
  const syncStudentData = () => {
    if (currentStudent) {
      setStudentName(currentStudent.name || "");
      setRollNo(currentStudent.rollNo || "101");
      setRegiNo(currentStudent.admissionNo || "REG-" + (currentStudent.rollNo || "101"));
      setFatherName(currentStudent.fatherName || "Shri Parent");
      setMotherName(currentStudent.motherName || "Smt. Guardian");
      setSectionName(currentClass?.section || "A");
    }
  };

  useEffect(() => {
    syncStudentData();
  }, [selectedStudentId, selectedClassId]);

  // Load Subject Presets
  const loadSubjectPreset = (presetType: "class10" | "class12sci" | "class12com" | "primary") => {
    if (presetType === "class10") {
      setExamTitle("SECONDARY SCHOOL EXAMINATION (CLASS X) 2026-27");
      setSubjects([
        { id: "sub_1", code: "101", name: "English Language & Lit.", theory: 68, mcq: 18, practical: 0, highest: 92, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_2", code: "102", name: "Hindi / Regional Lang.", theory: 72, mcq: 17, practical: 0, highest: 94, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_3", code: "103", name: "Mathematics (Standard)", theory: 65, mcq: 19, practical: 0, highest: 98, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_4", code: "104", name: "General Science", theory: 52, mcq: 16, practical: 19, highest: 95, maxTheory: 60, maxMcq: 20, maxPractical: 20 },
        { id: "sub_5", code: "105", name: "Social Science", theory: 64, mcq: 18, practical: 0, highest: 89, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_6", code: "106", name: "Information Technology (ICT)", theory: 28, mcq: 19, practical: 48, highest: 99, maxTheory: 30, maxMcq: 20, maxPractical: 50 },
      ]);
    } else if (presetType === "class12sci") {
      setExamTitle("SENIOR SECONDARY EXAMINATION (CLASS XII SCIENCE) 2026-27");
      setSubjects([
        { id: "sub_1", code: "301", name: "English Core", theory: 66, mcq: 18, practical: 0, highest: 95, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_2", code: "042", name: "Physics", theory: 50, mcq: 15, practical: 29, highest: 98, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_3", code: "043", name: "Chemistry", theory: 51, mcq: 16, practical: 28, highest: 97, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_4", code: "041", name: "Mathematics", theory: 68, mcq: 18, practical: 0, highest: 100, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_5", code: "044", name: "Biology", theory: 54, mcq: 15, practical: 28, highest: 96, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_6", code: "083", name: "Computer Science", theory: 48, mcq: 18, practical: 29, highest: 99, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
      ]);
    } else if (presetType === "class12com") {
      setExamTitle("SENIOR SECONDARY EXAMINATION (CLASS XII COMMERCE) 2026-27");
      setSubjects([
        { id: "sub_1", code: "301", name: "English Core", theory: 66, mcq: 18, practical: 0, highest: 95, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_2", code: "055", name: "Accountancy", theory: 64, mcq: 16, practical: 19, highest: 98, maxTheory: 60, maxMcq: 20, maxPractical: 20 },
        { id: "sub_3", code: "054", name: "Business Studies", theory: 65, mcq: 17, practical: 18, highest: 96, maxTheory: 60, maxMcq: 20, maxPractical: 20 },
        { id: "sub_4", code: "030", name: "Economics", theory: 68, mcq: 16, practical: 19, highest: 97, maxTheory: 60, maxMcq: 20, maxPractical: 20 },
        { id: "sub_5", code: "065", name: "Informatics Practices", theory: 52, mcq: 18, practical: 28, highest: 99, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
      ]);
    } else {
      setExamTitle("ANNUAL SUMMATIVE EVALUATION 2026-27");
      setSubjects([
        { id: "sub_1", code: "01", name: "English", theory: 42, mcq: 10, practical: 0, highest: 50, maxTheory: 40, maxMcq: 10, maxPractical: 0 },
        { id: "sub_2", code: "02", name: "Mathematics", theory: 45, mcq: 10, practical: 0, highest: 50, maxTheory: 40, maxMcq: 10, maxPractical: 0 },
        { id: "sub_3", code: "03", name: "Environmental Studies (EVS)", theory: 38, mcq: 9, practical: 0, highest: 49, maxTheory: 40, maxMcq: 10, maxPractical: 0 },
        { id: "sub_4", code: "04", name: "Hindi / Regional Lang.", theory: 40, mcq: 8, practical: 0, highest: 48, maxTheory: 40, maxMcq: 10, maxPractical: 0 },
        { id: "sub_5", code: "05", name: "Computer & General Studies", theory: 39, mcq: 10, practical: 0, highest: 50, maxTheory: 40, maxMcq: 10, maxPractical: 0 },
      ]);
    }
  };

  // Grade & Point calculation
  const calculateSubjectStats = (sub: MarksheetSubjectRow) => {
    const totalMarks = Number(sub.theory || 0) + Number(sub.mcq || 0) + Number(sub.practical || 0);
    const maxMarks = (Number(sub.maxTheory || 0) + Number(sub.maxMcq || 0) + Number(sub.maxPractical || 0)) || 100;
    const pct = Math.round((totalMarks / maxMarks) * 100);

    let point = 0.0;
    let grade = "F";

    if (gradingScaleType === "5.0") {
      if (pct >= 80) { point = 5.0; grade = "A+"; }
      else if (pct >= 70) { point = 4.0; grade = "A"; }
      else if (pct >= 60) { point = 3.5; grade = "A-"; }
      else if (pct >= 50) { point = 3.0; grade = "B"; }
      else if (pct >= 40) { point = 2.0; grade = "C"; }
      else if (pct >= 33) { point = 1.0; grade = "D"; }
      else { point = 0.0; grade = "F"; }
    } else {
      // 10.0 scale
      if (pct >= 90) { point = 10.0; grade = "A1"; }
      else if (pct >= 80) { point = 9.0; grade = "A2"; }
      else if (pct >= 70) { point = 8.0; grade = "B1"; }
      else if (pct >= 60) { point = 7.0; grade = "B2"; }
      else if (pct >= 50) { point = 6.0; grade = "C1"; }
      else if (pct >= 40) { point = 5.0; grade = "C2"; }
      else if (pct >= 33) { point = 4.0; grade = "D"; }
      else { point = 0.0; grade = "F"; }
    }

    return { totalMarks, maxMarks, pct, point: point.toFixed(2), grade };
  };

  // Grand Totals
  const grandStats = () => {
    let grandTotal = 0;
    let grandMax = 0;
    let totalPoints = 0;
    let hasFail = false;

    subjects.forEach(sub => {
      const stats = calculateSubjectStats(sub);
      grandTotal += stats.totalMarks;
      grandMax += stats.maxMarks;
      totalPoints += parseFloat(stats.point);
      if (stats.grade === "F") hasFail = true;
    });

    const gpa = subjects.length > 0 ? (totalPoints / subjects.length).toFixed(2) : "0.00";
    const overallPct = grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(1) : "0.0";

    let overallGrade = "F";
    if (!hasFail) {
      const gpaNum = parseFloat(gpa);
      if (gradingScaleType === "5.0") {
        if (gpaNum >= 5.0) overallGrade = "A+";
        else if (gpaNum >= 4.0) overallGrade = "A";
        else if (gpaNum >= 3.5) overallGrade = "A-";
        else if (gpaNum >= 3.0) overallGrade = "B";
        else if (gpaNum >= 2.0) overallGrade = "C";
        else if (gpaNum >= 1.0) overallGrade = "D";
      } else {
        if (gpaNum >= 9.0) overallGrade = "A1";
        else if (gpaNum >= 8.0) overallGrade = "A2";
        else if (gpaNum >= 7.0) overallGrade = "B1";
        else if (gpaNum >= 6.0) overallGrade = "B2";
        else if (gpaNum >= 5.0) overallGrade = "C1";
        else if (gpaNum >= 4.0) overallGrade = "D";
      }
    }

    const resultStatus = hasFail ? "FAILED" : "PASSED (Promoted)";

    return { grandTotal, grandMax, gpa, overallPct, overallGrade, resultStatus, hasFail };
  };

  const totals = grandStats();

  // Subject table edits
  const handleSubjectChange = (id: string, field: keyof MarksheetSubjectRow, value: any) => {
    setSubjects(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const addSubjectRow = () => {
    const newId = "sub_" + Date.now();
    const nextCode = String(100 + subjects.length + 1);
    setSubjects(prev => [
      ...prev,
      {
        id: newId,
        code: nextCode,
        name: "New Subject",
        theory: 50,
        mcq: 15,
        practical: 0,
        highest: 85,
        maxTheory: 80,
        maxMcq: 20,
        maxPractical: 0,
      },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    if (subjects.length <= 1) return;
    setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const randomizeSampleScores = () => {
    setSubjects(prev =>
      prev.map(sub => {
        const theory = Math.floor(Math.random() * 25) + 55;
        const mcq = Math.floor(Math.random() * 6) + 14;
        const practical = sub.maxPractical > 0 ? Math.floor(Math.random() * 5) + (sub.maxPractical - 4) : 0;
        return {
          ...sub,
          theory: Math.min(theory, sub.maxTheory),
          mcq: Math.min(mcq, sub.maxMcq),
          practical: Math.min(practical, sub.maxPractical),
          highest: Math.min(theory + mcq + practical + Math.floor(Math.random() * 8), 100),
        };
      })
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Render a Single Marksheet Sheet (A4 Portrait exact layout from zip)
  const renderMarksheetSheet = (targetStudent?: SchoolStudent) => {
    const isSingle = !bulkMode || !targetStudent || (currentStudent && targetStudent.id === currentStudent.id);
    const sName = isSingle ? (studentName || targetStudent?.name || "Student Candidate") : (targetStudent?.name || "Student Candidate");
    const sRoll = isSingle ? (rollNo || targetStudent?.rollNo || "01") : (targetStudent?.rollNo || "01");
    const sReg = isSingle ? (regiNo || targetStudent?.admissionNo || `REG-${sRoll}`) : (targetStudent?.admissionNo || `REG-${sRoll}`);
    const sFather = isSingle ? (fatherName || targetStudent?.fatherName || "Shri Parent") : (targetStudent?.fatherName || "Shri Parent");
    const cName = currentClass?.name || "Class 10";
    const sSection = isSingle ? (sectionName || currentClass?.section || "A") : (currentClass?.section || "A");

    const qrData = JSON.stringify({
      officialMarksheet: true,
      school: school.name,
      student: sName,
      roll: sRoll,
      regNo: sReg,
      class: cName,
      session: sessionName,
      total: `${totals.grandTotal}/${totals.grandMax}`,
      gpa: totals.gpa,
      grade: totals.overallGrade,
      status: totals.resultStatus,
      date: publishDate,
    });

    return (
      <div
        key={targetStudent?.id || "single"}
        className="w-full max-w-[840px] bg-white rounded-xl border-4 border-slate-900 shadow-2xl p-7 text-slate-900 print:shadow-none print:m-0 print:border-2 print:border-black print:break-after-page print:max-w-none print:p-6 print:rounded-none relative overflow-hidden"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Decorative Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[140px] font-black tracking-widest text-slate-900 uppercase">
            {school.code || school.name.slice(0, 4)}
          </span>
        </div>

        {/* Top Header: Logo, School Name, Category, Affiliation */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {school.logoUrl ? (
                <img src={school.logoUrl} alt="Logo" className="w-16 h-16 object-cover rounded-xl border border-slate-300 shadow-sm" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-amber-300 font-black text-2xl flex items-center justify-center shadow-sm">
                  {school.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-950 leading-none">
                  {school.name}
                </h1>
                {school.address && <p className="text-xs text-slate-600 mt-1 font-medium">{school.address}</p>}
                <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                  Affiliated to State / Central Board of Secondary Education &bull; Code: {school.code || "SCH-001"}
                </p>
              </div>
            </div>

            {/* Grading Scale Badge / Legend Table */}
            <div className="hidden sm:block border border-slate-300 rounded-lg p-1.5 text-[9px] bg-slate-50/80">
              <div className="font-bold text-slate-800 text-center mb-0.5 border-b border-slate-200 pb-0.5">
                Grading System ({gradingScaleType} Scale)
              </div>
              <div className="grid grid-cols-2 gap-x-2 text-slate-600 font-mono">
                <span>80-100%: <strong>A+ (5.0)</strong></span>
                <span>50-59%: <strong>B (3.0)</strong></span>
                <span>70-79%: <strong>A (4.0)</strong></span>
                <span>40-49%: <strong>C (2.0)</strong></span>
                <span>60-69%: <strong>A- (3.5)</strong></span>
                <span>&lt;33%: <strong>F (0.0)</strong></span>
              </div>
            </div>
          </div>

          <div className="text-center mt-3 pt-2 border-t border-slate-200">
            <span className="inline-block px-5 py-1 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
              ACADEMIC TRANSCRIPT & OFFICIAL MARKSHEET
            </span>
            <p className="text-xs font-bold text-indigo-950 mt-1 uppercase tracking-wider">
              {examTitle} &bull; Academic Session: {sessionName}
            </p>
          </div>
        </div>

        {/* Student & Examination Details Filter / Meta Grid (Matching zip `marksheet_pub_print.blade.php`) */}
        <div className="bg-slate-50/90 rounded-xl p-3 border border-slate-300 mb-4 text-xs font-medium">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-8 space-y-1">
              <div>
                <span className="text-slate-500 font-bold">Result Publish Date: </span>
                <span className="font-black text-slate-900">{publishDate}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Student Name: </span>
                <span className="font-black text-slate-900 text-sm">{sName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Father's Name: </span>
                <span className="font-bold text-slate-800">{sFather}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Class: </span>
                <span className="font-black text-indigo-900">{cName}</span>
              </div>
            </div>

            <div className="col-span-4 space-y-1 text-right">
              <div>
                <span className="text-slate-500 font-bold">Section: </span>
                <span className="font-black text-slate-900">{sSection}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Roll No: </span>
                <span className="font-black text-indigo-700 text-sm">{sRoll}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Regi / Adm No: </span>
                <span className="font-black text-slate-900">{sReg}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Status: </span>
                <span className={`font-black text-xs px-2 py-0.5 rounded ${totals.hasFail ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {totals.resultStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Marks Data Table (Exact format from zip `marksheet_pub_print.blade.php`) */}
        <div className="mb-4">
          <div className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5 flex items-center justify-between">
            <span>Result Details:</span>
            <span className="text-[10px] text-slate-500 lowercase font-normal italic">*mcq and practical where applicable</span>
          </div>
          <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-700 text-center w-8">SL</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14">Code</th>
                  <th className="p-2 border-r border-slate-700">Sub Name</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14">Theory</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14">MCQ</th>
                  <th className="p-2 border-r border-slate-700 text-center w-16">Practical</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14 bg-slate-800">Highest</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14 bg-indigo-950">Total</th>
                  <th className="p-2 border-r border-slate-700 text-center w-14 bg-indigo-950">Point</th>
                  <th className="p-2 text-center w-14 bg-indigo-950">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-medium">
                {subjects.map((sub, idx) => {
                  const stats = calculateSubjectStats(sub);
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="p-2 text-center font-bold text-slate-500 border-r border-slate-300">{idx + 1}</td>
                      <td className="p-2 text-center font-mono font-bold text-slate-700 border-r border-slate-300">{sub.code}</td>
                      <td className="p-2 font-black text-slate-900 border-r border-slate-300">{sub.name}</td>
                      <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-300">{sub.theory}</td>
                      <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-300">
                        {sub.maxMcq > 0 ? sub.mcq : "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-800 border-r border-slate-300">
                        {sub.maxPractical > 0 ? sub.practical : "-"}
                      </td>
                      <td className="p-2 text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-50">{sub.highest}</td>
                      <td className="p-2 text-center font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50">{stats.totalMarks}</td>
                      <td className="p-2 text-center font-bold text-slate-900 border-r border-slate-300 bg-indigo-50/50">{stats.point}</td>
                      <td className="p-2 text-center font-black bg-indigo-50/50">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                          stats.grade === "A+" || stats.grade === "A" ? "text-emerald-700" :
                          stats.grade === "F" ? "text-rose-700" : "text-indigo-800"
                        }`}>
                          {stats.grade}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Grand Total Footer (exact markup from zip `marksheet_pub_print.blade.php`) */}
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider border-r border-slate-700">
                    Grand Total Marks &amp; GPA (Grade Point Average)
                  </td>
                  <td className="p-2 text-center border-r border-slate-700 text-slate-300">—</td>
                  <td className="p-2 text-center border-r border-slate-700 text-amber-300 text-sm">
                    {totals.grandTotal} / {totals.grandMax}
                  </td>
                  <td className="p-2 text-center border-r border-slate-700 text-amber-300 text-sm">
                    {totals.gpa}
                  </td>
                  <td className="p-2 text-center bg-amber-400 text-slate-950 font-black text-sm">
                    {totals.overallGrade}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Performance Summary Banner */}
        <div className="grid grid-cols-3 gap-3 p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl mb-6 text-xs text-slate-800">
          <div>
            <span className="text-slate-500 font-bold block text-[10px]">Percentage Score</span>
            <span className="text-sm font-black text-indigo-950">{totals.overallPct}%</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block text-[10px]">Final Classification</span>
            <span className="text-sm font-black text-indigo-950">
              {totals.overallGrade === "A+" ? "First Division with Distinction" :
               totals.overallGrade === "A" ? "First Division" :
               totals.overallGrade === "F" ? "Supplementary / Retake" : "Second Division"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-bold block text-[10px]">Digital Verification</span>
            <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3 h-3" /> Securely Verified
            </span>
          </div>
        </div>

        {/* Authorities & Signatures (Matching zip `report-authority`) */}
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-4 items-end text-center text-xs">
          <div>
            <div className="h-10 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-700">Guardian Signature</p>
          </div>

          <div>
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="italic font-serif font-black text-slate-800 text-[11px]">{teacherName}</span>
            </div>
            <p className="font-bold text-slate-700">Class Teacher Signature</p>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="p-1 bg-white border border-slate-400 rounded shadow-sm">
              <QRCode value={qrData} size={48} level="M" />
            </div>
            <span className="text-[8px] text-slate-500 mt-0.5">Scan to Verify</span>
          </div>

          <div>
            <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="italic font-serif font-black text-indigo-900 text-sm">{principalName}</span>
            </div>
            <p className="font-black text-slate-950 uppercase tracking-tight text-[11px]">{principalTitle}</p>
            <p className="text-[9px] text-slate-500">{school.name}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={randomizeSampleScores}
              className="px-3 py-1.5 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Demo marks generate karein"
            >
              <Sparkles className="w-3.5 h-3.5" /> Sample Marks Fill
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bulkMode ? "bg-amber-500 text-white shadow" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> {bulkMode ? "Single Marksheet" : "Bulk Class Print"}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save Marksheet
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0">
        {/* Generator & Data Editing Console (Hidden during print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 print:hidden border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
                Official Result Marksheet Generator (रिजल्ट मार्कशीट)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                School Management System standard ke mutabiq Theory, MCQ, Practical aur GPA calculate karke printable A4 Marksheet banayein.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Class Chuno:</label>
                <select
                  value={selectedClassId}
                  onChange={e => setSelectedClassId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {!bulkMode && (
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] font-bold text-slate-500">Student Chuno:</label>
                    <button
                      onClick={syncStudentData}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      title="Reset candidate fields to selected student"
                    >
                      🔄 Reset
                    </button>
                  </div>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  >
                    {classStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Exam & Candidate Metadata Editor Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t dark:border-slate-700">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Exam Title:</label>
              <input
                type="text"
                value={examTitle}
                onChange={e => setExamTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Publish Date:</label>
              <input
                type="date"
                value={publishDate}
                onChange={e => setPublishDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Student Candidate Name:</label>
              <input
                type="text"
                value={studentName}
                onChange={e => setStudentName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Roll &amp; Reg No:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Roll"
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
                <input
                  type="text"
                  placeholder="Reg No"
                  value={regiNo}
                  onChange={e => setRegiNo(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
              </div>
            </div>
          </div>

          {/* Father, Mother & Signatory inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Father's Name:</label>
              <input
                type="text"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Principal / Head Name:</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setPrincipalName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Class Teacher Name:</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">GPA Scale System:</label>
              <select
                value={gradingScaleType}
                onChange={e => setGradingScaleType(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              >
                <option value="5.0">5.0 Scale (Standard A+, A, A-, B, C, D, F)</option>
                <option value="10.0">10.0 Scale (CBSE A1, A2, B1, B2, C1, C2, D, F)</option>
              </select>
            </div>
          </div>

          {/* Subject Rows Interactive Table Editor */}
          <div className="pt-3 border-t dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                Subjects & Marks Editor (Har Subject ke Marks Live Edit Karein):
              </span>
              <button
                onClick={addSubjectRow}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Naya Subject Jodein
              </button>
            </div>

            {/* Quick Subject Presets */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs mb-3">
              <span className="font-bold text-slate-500 text-[11px] mr-1">Subject Presets:</span>
              <button
                onClick={() => loadSubjectPreset("class10")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                📘 Class 10 (6 Subjects)
              </button>
              <button
                onClick={() => loadSubjectPreset("class12sci")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                🔬 Class 12 Science (6 Subjects)
              </button>
              <button
                onClick={() => loadSubjectPreset("class12com")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                📊 Class 12 Commerce
              </button>
              <button
                onClick={() => loadSubjectPreset("primary")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                🎨 Primary / Middle
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold">
                  <tr>
                    <th className="p-2 w-16">Code</th>
                    <th className="p-2">Subject Name</th>
                    <th className="p-2 w-20 text-center">Theory</th>
                    <th className="p-2 w-20 text-center">MCQ</th>
                    <th className="p-2 w-20 text-center">Practical</th>
                    <th className="p-2 w-20 text-center">Highest</th>
                    <th className="p-2 w-20 text-center">Total</th>
                    <th className="p-2 w-20 text-center">Grade</th>
                    <th className="p-2 w-12 text-center">Hatao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {subjects.map((sub) => {
                    const stats = calculateSubjectStats(sub);
                    return (
                      <tr key={sub.id}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={sub.code}
                            onChange={e => handleSubjectChange(sub.id, "code", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-mono text-center"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={e => handleSubjectChange(sub.id, "name", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.theory}
                            onChange={e => handleSubjectChange(sub.id, "theory", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-center font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={sub.mcq}
                            onChange={e => handleSubjectChange(sub.id, "mcq", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-center"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.practical}
                            onChange={e => handleSubjectChange(sub.id, "practical", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-center"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.highest}
                            onChange={e => handleSubjectChange(sub.id, "highest", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-center text-slate-500"
                          />
                        </td>
                        <td className="p-1.5 text-center font-black text-indigo-600 dark:text-indigo-400">
                          {stats.totalMarks}
                        </td>
                        <td className="p-1.5 text-center font-black">
                          <span className={`px-2 py-0.5 rounded ${stats.grade === "A+" || stats.grade === "A" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                            {stats.grade} ({stats.point})
                          </span>
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            onClick={() => removeSubjectRow(sub.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Display Marksheet Preview (Print-ready) */}
        {bulkMode ? (
          <div className="space-y-8">
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200 print:hidden flex items-center justify-between">
              <span>Bulk Class Mode: Poore <strong>{currentClass?.name}</strong> ke sabhi {classStudents.length} bacchon ki marksheet print hogi.</span>
              <span className="font-bold">Total: {classStudents.length} Students</span>
            </div>
            {classStudents.map(student => renderMarksheetSheet(student))}
          </div>
        ) : (
          <div className="flex justify-center">
            {renderMarksheetSheet(currentStudent || undefined)}
          </div>
        )}
      </div>
    </div>
  );
};
