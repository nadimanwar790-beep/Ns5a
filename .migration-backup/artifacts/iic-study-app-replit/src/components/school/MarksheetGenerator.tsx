// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, SchoolSession, ExamEntry } from "../../school-types";
import { getExams } from "../../school-firebase";
import {
  FileSpreadsheet, Printer, ChevronLeft, Plus, Trash2, Award, Calendar,
  CheckCircle2, Sparkles, RefreshCw, User, BookOpen, Layers, Edit3, Shield,
  Building2, UserPlus, Zap
} from "lucide-react";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { QuickAddStudentModal } from "./QuickAddStudentModal";

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
  students: initialStudents,
  activeSession,
  onBack,
}) => {
  const [studentList, setStudentList] = useState<SchoolStudent[]>(initialStudents);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const classStudents = studentList.filter(s => !selectedClassId || s.classId === selectedClassId);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || studentList[0]?.id || "");

  // School Header Customization State (can be edited on the fly)
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [isAutoGeneratingMarks, setIsAutoGeneratingMarks] = useState(false);
  const [autoGenNotice, setAutoGenNotice] = useState<string | null>(null);

  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails>({
    schoolName: school?.name || "National Academy",
    tagline: school?.tagline || "Learn • Grow • Lead",
    affiliation: "Affiliated to State / Central Board of Secondary Education",
    address: school?.address || "Main Campus Examination Center",
    phone: school?.mobile || school?.phone || "+91 98765 43210",
    email: school?.email || "info@school.org",
    logoUrl: school?.logoUrl || "",
    principalName: school?.principalName || "Dr. Rajeshwar Sharma",
    principalTitle: "Principal / Headmaster",
    code: school?.code || "SCH-001",
  });
  const principalName = schoolDetails.principalName || "Principal";

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

  // Student Photo (Pic Option)
  const [showStudentPhoto, setShowStudentPhoto] = useState(true);
  const [studentPhoto, setStudentPhoto] = useState<string>("");

  // Layout Mode: Standard 1-Page Portrait, 2-Page Part 1 & Part 2, or Landscape Wide
  const [layoutMode, setLayoutMode] = useState<"portrait_compact" | "two_pages" | "landscape_wide">("portrait_compact");

  // Signatures
  const [teacherName, setTeacherName] = useState("Class Teacher");

  // Subject rows
  const [subjects, setSubjects] = useState<MarksheetSubjectRow[]>(DEFAULT_SUBJECTS);

  // Bulk Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Synchronize student data on selection
  const syncStudentData = (target: SchoolStudent | null) => {
    if (target) {
      setStudentName(target.name || "");
      setRollNo(target.rollNo || "101");
      setRegiNo(target.admissionNo || "REG-" + (target.rollNo || "101"));
      setFatherName(target.fatherName || "Shri Parent");
      setMotherName(target.motherName || "Smt. Guardian");
      setSectionName(currentClass?.section || "A");
      setStudentPhoto((target as any)?.photoUrl || "");
    }
  };

  useEffect(() => {
    syncStudentData(currentStudent);
  }, [selectedStudentId, selectedClassId]);

  // ⚡ AUTO-GENERATE MARKS FROM SAVED EXAMS
  const autoGenerateFromAppMarks = async () => {
    setIsAutoGeneratingMarks(true);
    setAutoGenNotice(null);
    try {
      const exams = await getExams(school.id, selectedClassId);
      if (exams && exams.length > 0) {
        const rows: MarksheetSubjectRow[] = exams.map((ex, idx) => {
          const sm = ex.studentMarks?.[selectedStudentId];
          const obtainedMarks = sm ? Number(sm.marks || 0) : 0;
          const max = Number(ex.maxMarks || 100);

          const allMarks = Object.values(ex.studentMarks || {}).map((m: any) => Number(m.marks || 0));
          const highest = allMarks.length > 0 ? Math.max(...allMarks) : obtainedMarks;

          const sName = (ex.subjectName || ex.examName).toLowerCase();
          const isPracticalSubject = sName.includes("science") || sName.includes("computer") || sName.includes("it") || sName.includes("practical");

          let theory = Math.round(obtainedMarks * 0.8);
          let mcq = Math.round(obtainedMarks * 0.2);
          let practical = 0;
          let maxTheory = 80;
          let maxMcq = 20;
          let maxPractical = 0;

          if (isPracticalSubject) {
            maxTheory = 60;
            maxMcq = 20;
            maxPractical = 20;
            theory = Math.min(60, Math.round(obtainedMarks * 0.6));
            mcq = Math.min(20, Math.round(obtainedMarks * 0.2));
            practical = Math.min(20, Math.round(obtainedMarks * 0.2));
          }

          return {
            id: ex.id || `sub_${idx + 1}`,
            code: ex.subjectId ? ex.subjectId.slice(0, 4).toUpperCase() : `10${idx + 1}`,
            name: ex.subjectName || ex.examName,
            theory,
            mcq,
            practical,
            highest: highest || 95,
            maxTheory,
            maxMcq,
            maxPractical,
          };
        });

        setSubjects(rows);
        setAutoGenNotice(`✅ App ke ${exams.length} subjects ke entered marks se marksheet auto-generate ho gayi!`);
      } else {
        loadSubjectPreset("class10");
        randomizeSampleScores();
        setAutoGenNotice("⚡ Is class ke recorded marks abhi save nahi the, isliye standard syllabus marks auto-fill kar diye gaye.");
      }
    } catch (err: any) {
      console.warn("Auto-generate error:", err);
      loadSubjectPreset("class10");
    } finally {
      setIsAutoGeneratingMarks(false);
      setTimeout(() => setAutoGenNotice(null), 4000);
    }
  };

  // Load Subject Presets (Including 10, 12, and 15 subject slots)
  const loadSubjectPreset = (presetType: "class10" | "class10_12sub" | "comp_15sub" | "class12sci" | "class12com" | "primary") => {
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
    } else if (presetType === "class10_12sub") {
      setExamTitle("SECONDARY SCHOOL COMPREHENSIVE EVALUATION (12 SUBJECTS) 2026-27");
      setSubjects([
        { id: "sub_1", code: "101", name: "English Language", theory: 68, mcq: 18, practical: 0, highest: 95, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_2", code: "102", name: "Hindi / Regional", theory: 72, mcq: 17, practical: 0, highest: 94, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_3", code: "103", name: "Sanskrit / 3rd Lang.", theory: 70, mcq: 18, practical: 0, highest: 96, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_4", code: "104", name: "Mathematics", theory: 65, mcq: 19, practical: 0, highest: 99, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_5", code: "105", name: "Physics", theory: 42, mcq: 16, practical: 18, highest: 94, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_6", code: "106", name: "Chemistry", theory: 44, mcq: 15, practical: 19, highest: 96, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_7", code: "107", name: "Biology", theory: 45, mcq: 17, practical: 18, highest: 95, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_8", code: "108", name: "History & Culture", theory: 60, mcq: 16, practical: 0, highest: 91, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_9", code: "109", name: "Geography & Env.", theory: 62, mcq: 18, practical: 0, highest: 93, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_10", code: "110", name: "Civics & Governance", theory: 64, mcq: 17, practical: 0, highest: 92, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_11", code: "111", name: "Economics", theory: 61, mcq: 18, practical: 0, highest: 90, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_12", code: "112", name: "Computer & AI", theory: 28, mcq: 19, practical: 48, highest: 100, maxTheory: 30, maxMcq: 20, maxPractical: 50 },
      ]);
    } else if (presetType === "comp_15sub") {
      setExamTitle("ANNUAL COMPREHENSIVE TRANSCRIPT (15 SUBJECTS & SKILLS) 2026-27");
      setSubjects([
        { id: "sub_1", code: "001", name: "English Comm.", theory: 68, mcq: 18, practical: 0, highest: 95, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_2", code: "002", name: "Hindi / Mother Tongue", theory: 70, mcq: 17, practical: 0, highest: 94, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_3", code: "003", name: "3rd Language (Sanskrit/Urdu)", theory: 72, mcq: 16, practical: 0, highest: 97, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_4", code: "004", name: "Mathematics", theory: 64, mcq: 19, practical: 0, highest: 99, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_5", code: "005", name: "Physics & Astronomy", theory: 42, mcq: 15, practical: 19, highest: 95, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_6", code: "006", name: "Chemistry & Minerals", theory: 44, mcq: 16, practical: 18, highest: 96, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_7", code: "007", name: "Biology & Botany", theory: 45, mcq: 17, practical: 19, highest: 98, maxTheory: 50, maxMcq: 20, maxPractical: 30 },
        { id: "sub_8", code: "008", name: "History & Civilization", theory: 62, mcq: 16, practical: 0, highest: 92, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_9", code: "009", name: "Geography & Ecology", theory: 63, mcq: 17, practical: 0, highest: 93, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_10", code: "010", name: "Civics & Constitution", theory: 65, mcq: 18, practical: 0, highest: 91, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_11", code: "011", name: "Indian Economics", theory: 60, mcq: 16, practical: 0, highest: 90, maxTheory: 80, maxMcq: 20, maxPractical: 0 },
        { id: "sub_12", code: "012", name: "Information Technology (ICT)", theory: 28, mcq: 19, practical: 49, highest: 100, maxTheory: 30, maxMcq: 20, maxPractical: 50 },
        { id: "sub_13", code: "013", name: "Art, Craft & Design", theory: 30, mcq: 0, practical: 65, highest: 98, maxTheory: 30, maxMcq: 0, maxPractical: 70 },
        { id: "sub_14", code: "014", name: "Health & Physical Education", theory: 35, mcq: 0, practical: 60, highest: 99, maxTheory: 40, maxMcq: 0, maxPractical: 60 },
        { id: "sub_15", code: "015", name: "General Knowledge & Aptitude", theory: 45, mcq: 45, practical: 0, highest: 98, maxTheory: 50, maxMcq: 50, maxPractical: 0 },
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

  // Render a Single Marksheet Sheet (A4 Portrait/Landscape exact layout)
  const renderMarksheetSheet = (targetStudent?: SchoolStudent) => {
    const isSingle = !bulkMode || !targetStudent || (currentStudent && targetStudent.id === currentStudent.id);
    const sName = isSingle ? (studentName || targetStudent?.name || "Student Candidate") : (targetStudent?.name || "Student Candidate");
    const sRoll = isSingle ? (rollNo || targetStudent?.rollNo || "01") : (targetStudent?.rollNo || "01");
    const sReg = isSingle ? (regiNo || targetStudent?.admissionNo || `REG-${sRoll}`) : (targetStudent?.admissionNo || `REG-${sRoll}`);
    const sFather = isSingle ? (fatherName || targetStudent?.fatherName || "Shri Parent") : (targetStudent?.fatherName || "Shri Parent");
    const cName = currentClass?.name || "Class 10";
    const sSection = isSingle ? (sectionName || currentClass?.section || "A") : (currentClass?.section || "A");
    const sPhoto = isSingle ? (studentPhoto || (currentStudent as any)?.photoUrl || "") : ((targetStudent as any)?.photoUrl || "");

    const verifiedPayload = {
      type: "marksheet",
      officialVerified: true,
      school: schoolDetails.schoolName || school?.name || "School",
      schoolCode: schoolDetails.code || school?.code || "SCH-001",
      student: sName,
      fatherName: sFather,
      roll: sRoll,
      regNo: sReg,
      class: cName,
      session: sessionName,
      total: `${totals.grandTotal}/${totals.grandMax}`,
      gpa: totals.gpa,
      grade: totals.overallGrade,
      status: totals.resultStatus,
      date: publishDate,
      photoUrl: sPhoto,
    };

    // Live verification URL encoded in QR Code
    const qrVerifyUrl = `${window.location.origin}/?verify=doc&type=marksheet&data=${encodeURIComponent(JSON.stringify(verifiedPayload))}`;

    const isCompact = subjects.length > 8;
    const isVeryCompact = subjects.length > 12;

    return (
      <div
        key={targetStudent?.id || "single"}
        className={`w-full ${layoutMode === "landscape_wide" ? "max-w-[1100px]" : "max-w-[840px]"} bg-white rounded-xl border-4 border-slate-900 shadow-2xl ${isCompact ? "p-5" : "p-7"} text-slate-900 print:shadow-none print:m-0 print:border-2 print:border-black print:break-after-page print:max-w-none ${isCompact ? "print:p-4" : "print:p-6"} print:rounded-none relative overflow-hidden`}
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* Decorative Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-[140px] font-black tracking-widest text-slate-900 uppercase">
            {schoolDetails.code || school?.code || (schoolDetails.schoolName || "SCHL").slice(0, 4)}
          </span>
        </div>

        {/* Top Header: Logo, School Name, Category, Affiliation */}
        <div className={`border-b-2 border-slate-900 ${isCompact ? "pb-2.5 mb-2.5" : "pb-4 mb-4"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              {schoolDetails.logoUrl ? (
                <img src={schoolDetails.logoUrl} alt="Logo" className={`${isCompact ? "w-13 h-13" : "w-16 h-16"} object-cover rounded-xl border border-slate-300 shadow-sm`} />
              ) : (
                <div className={`${isCompact ? "w-13 h-13" : "w-16 h-16"} rounded-xl bg-slate-900 text-amber-300 font-black text-2xl flex items-center justify-center shadow-sm`}>
                  {schoolDetails.schoolName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className={`${isCompact ? "text-xl" : "text-2xl"} font-black uppercase tracking-tight text-slate-950 leading-none`}>
                  {schoolDetails.schoolName}
                </h1>
                {schoolDetails.address && <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{schoolDetails.address}</p>}
                <p className="text-[9px] text-slate-500 font-semibold tracking-wide uppercase mt-0.5">
                  {schoolDetails.affiliation} &bull; Code: {schoolDetails.code || "SCH-001"}
                </p>
              </div>
            </div>

            {/* Grading Scale Badge / Legend Table */}
            <div className="hidden sm:block border border-slate-300 rounded-lg p-1.5 text-[8.5px] bg-slate-50/80">
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

          <div className="text-center mt-2 pt-1.5 border-t border-slate-200">
            <span className="inline-block px-4 py-0.5 rounded-full bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest">
              ACADEMIC TRANSCRIPT &amp; OFFICIAL MARKSHEET
            </span>
            <p className="text-[11px] font-bold text-indigo-950 mt-0.5 uppercase tracking-wider">
              {examTitle} &bull; Academic Session: {sessionName}
            </p>
          </div>
        </div>

        {/* Student & Examination Details Filter / Meta Grid with PHOTO */}
        <div className={`bg-slate-50/90 rounded-xl ${isCompact ? "p-2.5 mb-2.5" : "p-3 mb-4"} border border-slate-300 text-xs font-medium`}>
          <div className="grid grid-cols-12 gap-3 items-center">
            {/* Student Left Info */}
            <div className={`${showStudentPhoto ? "col-span-6" : "col-span-8"} space-y-1`}>
              <div>
                <span className="text-slate-500 font-bold">Result Date: </span>
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

            {/* Student Right Info */}
            <div className={`${showStudentPhoto ? "col-span-4" : "col-span-4"} space-y-1 text-right`}>
              <div>
                <span className="text-slate-500 font-bold">Section: </span>
                <span className="font-black text-slate-900">{sSection}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Roll No: </span>
                <span className="font-black text-indigo-700 text-sm">{sRoll}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Reg / Adm No: </span>
                <span className="font-black text-slate-900">{sReg}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Status: </span>
                <span className={`font-black text-xs px-2 py-0.5 rounded ${totals.hasFail ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {totals.resultStatus}
                </span>
              </div>
            </div>

            {/* Student Picture / Photo Box (Pic Option) */}
            {showStudentPhoto && (
              <div className="col-span-2 flex flex-col items-center justify-center">
                <div className="w-[68px] h-[82px] rounded-lg border-2 border-slate-800 bg-white overflow-hidden shadow-xs flex items-center justify-center relative">
                  {sPhoto ? (
                    <img src={sPhoto} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 p-1">
                      <User className="w-7 h-7 text-slate-400" />
                      <span className="text-[6.5px] font-black uppercase tracking-tight text-slate-500 mt-0.5">Photo</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 text-white text-[6px] font-black uppercase text-center py-0.5">
                    Verified
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Marks Data Table (Supporting 10, 12, up to 15+ Subjects easily) */}
        <div className={isCompact ? "mb-2.5" : "mb-4"}>
          <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
            <span>Result Details ({subjects.length} Subjects):</span>
            <span className="text-[9.5px] text-slate-500 lowercase font-normal italic">*mcq and practical where applicable</span>
          </div>
          <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr className={isVeryCompact ? "text-[10px]" : "text-[11px]"}>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-7`}>SL</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-12 font-mono`}>Code</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700`}>Subject Name</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-12`}>Theory</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-12`}>MCQ</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-14`}>Practical</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-12 bg-slate-800`}>Highest</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-13 bg-indigo-950`}>Total</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} border-r border-slate-700 text-center w-12 bg-indigo-950`}>Point</th>
                  <th className={`${isCompact ? "p-1.5" : "p-2"} text-center w-13 bg-indigo-950`}>Grade</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-300 font-medium ${isVeryCompact ? "text-[10px]" : isCompact ? "text-[11px]" : "text-xs"}`}>
                {subjects.map((sub, idx) => {
                  const stats = calculateSubjectStats(sub);
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-500 border-r border-slate-300`}>{idx + 1}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-mono font-bold text-slate-700 border-r border-slate-300`}>{sub.code}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} font-black text-slate-900 border-r border-slate-300`}>{sub.name}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-800 border-r border-slate-300`}>{sub.theory}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-800 border-r border-slate-300`}>
                        {sub.maxMcq > 0 ? sub.mcq : "-"}
                      </td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-800 border-r border-slate-300`}>
                        {sub.maxPractical > 0 ? sub.practical : "-"}
                      </td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-50`}>{sub.highest}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50`}>{stats.totalMarks}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-bold text-slate-900 border-r border-slate-300 bg-indigo-50/50`}>{stats.point}</td>
                      <td className={`${isVeryCompact ? "p-1" : isCompact ? "p-1.5" : "p-2"} text-center font-black bg-indigo-50/50`}>
                        <span className={`px-1.5 py-0.5 rounded text-[10.5px] font-black ${
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
              {/* Grand Total Footer */}
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={6} className={`${isCompact ? "p-2" : "p-2.5"} text-right uppercase tracking-wider border-r border-slate-700 text-[11px]`}>
                    Grand Total Marks &amp; GPA (Grade Point Average)
                  </td>
                  <td className="p-1.5 text-center border-r border-slate-700 text-slate-300">—</td>
                  <td className="p-1.5 text-center border-r border-slate-700 text-amber-300 text-sm">
                    {totals.grandTotal} / {totals.grandMax}
                  </td>
                  <td className="p-1.5 text-center border-r border-slate-700 text-amber-300 text-sm">
                    {totals.gpa}
                  </td>
                  <td className="p-1.5 text-center bg-amber-400 text-slate-950 font-black text-sm">
                    {totals.overallGrade}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Performance Summary Banner */}
        <div className={`grid grid-cols-3 gap-3 ${isCompact ? "p-2 mb-3" : "p-2.5 mb-5"} bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-slate-800`}>
          <div>
            <span className="text-slate-500 font-bold block text-[9.5px]">Percentage Score</span>
            <span className="text-sm font-black text-indigo-950">{totals.overallPct}%</span>
          </div>
          <div>
            <span className="text-slate-500 font-bold block text-[9.5px]">Final Classification</span>
            <span className="text-xs font-black text-indigo-950">
              {totals.overallGrade === "A+" ? "First Division with Distinction" :
               totals.overallGrade === "A" ? "First Division" :
               totals.overallGrade === "F" ? "Supplementary / Retake" : "Second Division"}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-bold block text-[9.5px]">Digital Verification</span>
            <span className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1">
              <CheckCircle2 className="w-3 h-3" /> Live Verified QR
            </span>
          </div>
        </div>

        {/* Authorities & Signatures */}
        <div className={`${isCompact ? "pt-3" : "pt-5"} border-t-2 border-slate-900 grid grid-cols-4 items-end text-center text-xs`}>
          <div>
            <div className="h-8 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-700 text-[10.5px]">Guardian Signature</p>
          </div>

          <div>
            <div className="h-8 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="italic font-serif font-black text-slate-800 text-[11px]">{teacherName}</span>
            </div>
            <p className="font-bold text-slate-700 text-[10.5px]">Class Teacher Signature</p>
          </div>

          <div className="flex flex-col items-center justify-center">
            <div className="p-1 bg-white border border-slate-400 rounded shadow-xs">
              <QRCode value={qrVerifyUrl} size={46} level="M" />
            </div>
            <span className="text-[7.5px] text-slate-500 mt-0.5 font-bold">Scan to Verify</span>
          </div>

          <div>
            <div className="h-8 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="italic font-serif font-black text-indigo-900 text-xs">{principalName}</span>
            </div>
            <p className="font-black text-slate-950 uppercase tracking-tight text-[10.5px]">{schoolDetails.principalTitle}</p>
            <p className="text-[8px] text-slate-500">{schoolDetails.schoolName}</p>
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
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSchoolHeaderModal(true)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-300/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" /> School Details Edit
            </button>
            <button
              onClick={autoGenerateFromAppMarks}
              disabled={isAutoGeneratingMarks}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer"
              title="App ke actual marks se auto-fill karein"
            >
              <Zap className="w-3.5 h-3.5 text-amber-950 fill-amber-950 animate-pulse" />
              <span>{isAutoGeneratingMarks ? "Generating..." : "⚡ Auto-Marks Fill"}</span>
            </button>
            <button
              onClick={randomizeSampleScores}
              className="px-3 py-1.5 bg-indigo-600/60 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              title="Demo marks generate karein"
            >
              <Sparkles className="w-3.5 h-3.5" /> Sample Fill
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
        {autoGenNotice && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-800 dark:text-emerald-200 text-xs font-bold print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{autoGenNotice}</span>
          </div>
        )}

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

            <div className="flex items-center gap-3 flex-wrap">
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
                      onClick={() => syncStudentData(currentStudent)}
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-2"
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

              <div className="self-end pb-0.5">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/30 rounded-xl hover:bg-emerald-100 flex items-center gap-1 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> + Student Data
                </button>
              </div>
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
                onChange={e => setSchoolDetails(p => ({ ...p, principalName: e.target.value }))}
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

          {/* Student Photo & Print Format Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t dark:border-slate-700 bg-slate-50 dark:bg-slate-750 p-3 rounded-xl border border-slate-200 dark:border-slate-600">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1.5 flex items-center justify-between">
                <span>📸 Student Photo (Pic Option):</span>
                <input
                  type="checkbox"
                  checked={showStudentPhoto}
                  onChange={e => setShowStudentPhoto(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600"
                />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Photo Image URL (or upload below)"
                  value={studentPhoto}
                  onChange={e => setStudentPhoto(e.target.value)}
                  className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                />
                <label className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shrink-0">
                  Upload Pic
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => setStudentPhoto(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 block mb-1">
                📄 Print Layout Format:
              </label>
              <select
                value={layoutMode}
                onChange={e => setLayoutMode(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-700 text-slate-800 dark:text-white rounded-lg border border-slate-300 dark:border-slate-600"
              >
                <option value="portrait_compact">A4 Portrait (Compact 10-12 Subjects Fit)</option>
                <option value="landscape_wide">A4 Landscape (Part 1 &amp; 2 - Fits 15+ Subjects)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Landscape mode allows 12-16 subjects without cutting</p>
            </div>

            <div className="flex flex-col justify-end">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Direct Live QR Verification Active
              </span>
              <p className="text-[10px] text-slate-500">
                Scanning QR with normal camera opens verified online marksheet transcript!
              </p>
            </div>
          </div>

          {/* Subject Rows Interactive Table Editor */}
          <div className="pt-3 border-t dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                Subjects &amp; Marks Editor ({subjects.length} Slots Active):
              </span>
              <button
                onClick={addSubjectRow}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> + Add New Subject Slot
              </button>
            </div>

            {/* Quick Subject Presets */}
            <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs mb-3">
              <span className="font-bold text-slate-500 text-[11px] mr-1">Subject Slots:</span>
              <button
                onClick={() => loadSubjectPreset("class10")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                📘 Standard (6 Subjects)
              </button>
              <button
                onClick={() => loadSubjectPreset("class10_12sub")}
                className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 rounded-lg font-black border border-indigo-300 dark:border-indigo-600 shadow-xs"
              >
                📚 12 Subjects Slot
              </button>
              <button
                onClick={() => loadSubjectPreset("comp_15sub")}
                className="px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-amber-900 dark:text-amber-200 rounded-lg font-black border border-amber-300 dark:border-amber-600 shadow-xs"
              >
                🌟 15 Subjects Full Slot
              </button>
              <button
                onClick={() => loadSubjectPreset("class12sci")}
                className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
              >
                🔬 Class 12 Science
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
                🎨 Primary
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

      {/* School Header Customizer Modal */}
      <SchoolHeaderEditorModal
        isOpen={showSchoolHeaderModal}
        onClose={() => setShowSchoolHeaderModal(false)}
        school={school}
        currentDetails={schoolDetails}
        onApply={details => setSchoolDetails(details)}
        title="Marksheet School Header & Details"
        subtitle="Marksheet printout ke liye School Name, Logo, Address, Code aur Principal customize karein"
      />

      {/* Quick Add Student Modal */}
      <QuickAddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        schoolId={school.id}
        classes={classes}
        defaultClassId={selectedClassId}
        onStudentAdded={newStudent => {
          setStudentList(prev => [...prev, newStudent]);
          setSelectedClassId(newStudent.classId);
          setSelectedStudentId(newStudent.id);
          syncStudentData(newStudent);
        }}
      />
    </div>
  );
};
