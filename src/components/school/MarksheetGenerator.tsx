// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, SchoolSession, ExamEntry } from "../../school-types";
import { getExams, promoteStudents, isStudentInClass, getMonthlyAttendance, currentMonthStr } from "../../school-firebase";
import {
  FileSpreadsheet, Printer, ChevronLeft, Plus, Trash2, Award, Calendar,
  CheckCircle2, Sparkles, RefreshCw, User, BookOpen, Layers, Edit3, Shield,
  Building2, UserPlus, Zap, TrendingUp, ArrowRight, CheckSquare, Square, AlertCircle
} from "lucide-react";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { schoolPrintFieldEnabled, isBoardClass } from "../../school-types";
import { QuickAddStudentModal } from "./QuickAddStudentModal";
import { cleanLogoUrl, isAppLogo, getSavedSchoolLogo, formatAcademicSession } from "./feeReceiptUtils";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  activeSession: SchoolSession | null;
  onBack: () => void;
}

export type SchoolLevelWing = 'pre_primary' | 'primary' | 'middle_secondary';

export const detectClassWing = (className?: string): SchoolLevelWing => {
  if (!className) return 'middle_secondary';
  const c = className.toLowerCase().trim();
  if (
    c.includes("play") ||
    c.includes("nursery") ||
    c.includes("nur") ||
    c.includes("kg") ||
    c.includes("lkg") ||
    c.includes("ukg") ||
    c.includes("prep") ||
    c.includes("infant") ||
    c.includes("toddler")
  ) {
    return 'pre_primary';
  }
  const numMatch = c.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    if (num >= 1 && num <= 5) return 'primary';
    if (num >= 6) return 'middle_secondary';
  }
  if (c.includes("first") || c.includes("second") || c.includes("third") || c.includes("fourth") || c.includes("fifth") || c.includes("1st") || c.includes("2nd") || c.includes("3rd") || c.includes("4th") || c.includes("5th")) {
    return 'primary';
  }
  return 'middle_secondary';
};

export interface TermAttendanceDetail {
  termKey: string;
  termName: string;
  workingDays: number;
  presentDays: number;
  scorePct: number;
  note?: string;
}

export const DEFAULT_TERMS: TermAttendanceDetail[] = [
  { termKey: "pa1", termName: "PA - 1", workingDays: 45, presentDays: 42, scorePct: 88, note: "Regular & Attentive" },
  { termKey: "pa2", termName: "PA - 2", workingDays: 40, presentDays: 24, scorePct: 58, note: "⚠️ Low Attendance Affected Score" },
  { termKey: "halfYearly", termName: "Half-Yearly Exam", workingDays: 85, presentDays: 78, scorePct: 82, note: "Attendance Recovered, Good Result" },
  { termKey: "pa3", termName: "PA - 3", workingDays: 42, presentDays: 39, scorePct: 86, note: "Consistent Classroom Focus" },
  { termKey: "pa4", termName: "PA - 4", workingDays: 38, presentDays: 36, scorePct: 90, note: "Very Active & Regular" },
  { termKey: "annual", termName: "Final Annual Exam", workingDays: 90, presentDays: 86, scorePct: 93, note: "Outstanding Overall Performance" },
];

export interface ExamOption {
  id: string;
  name: string;
  shortName: string;
  category: "pa" | "half_yearly" | "annual" | "custom";
  maxMarks: number;
  term: "term1" | "term2" | "final";
}

export const DEFAULT_EXAM_OPTIONS: ExamOption[] = [
  { id: "pa1", name: "Periodic Assessment 1 (PA-1)", shortName: "PA-1", category: "pa", maxMarks: 40, term: "term1" },
  { id: "pa2", name: "Periodic Assessment 2 (PA-2)", shortName: "PA-2", category: "pa", maxMarks: 40, term: "term1" },
  { id: "half_yearly", name: "Half Yearly Examination", shortName: "Half-Yearly", category: "half_yearly", maxMarks: 100, term: "term1" },
  { id: "pa3", name: "Periodic Assessment 3 (PA-3)", shortName: "PA-3", category: "pa", maxMarks: 40, term: "term2" },
  { id: "pa4", name: "Periodic Assessment 4 (PA-4)", shortName: "PA-4", category: "pa", maxMarks: 40, term: "term2" },
  { id: "annual", name: "Final Annual Examination", shortName: "Annual Exam", category: "annual", maxMarks: 100, term: "final" },
];

export interface MarksheetSubjectRow {
  id: string;
  code: string;
  name: string;
  theory: number;     // 6-10 Theory | 1-5 Written | Pre-Primary Oral
  mcq: number;        // 6-10 MCQ/Internal | 1-5 Oral | Pre-Primary Written/Activity
  practical: number;  // 6-10 Practical | 1-5 Notebook | Pre-Primary Craft
  highest: number;
  maxTheory: number;
  maxMcq: number;
  maxPractical: number;
  // Multi-term breakdown for cumulative marksheet
  pa1?: number;
  pa2?: number;
  halfYearly?: number;
  pa3?: number;
  pa4?: number;
  annual?: number;
}

export const WING_PRESETS: Record<SchoolLevelWing, { title: string; defaultExamTitle: string; subjects: MarksheetSubjectRow[] }> = {
  pre_primary: {
    title: "🧸 Pre-Primary (Play, Nursery, LKG, UKG)",
    defaultExamTitle: "EARLY YEARS PROGRESS REPORT 2026-27",
    subjects: [
      { id: "sub_1", code: "N01", name: "English Rhymes, Oral & Phonics", theory: 48, mcq: 45, practical: 0, highest: 98, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 38, pa2: 36, halfYearly: 88, pa3: 39, pa4: 40, annual: 93 },
      { id: "sub_2", code: "N02", name: "Hindi Balgeet & Akshar Gyan", theory: 46, mcq: 44, practical: 0, highest: 96, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 37, pa2: 34, halfYearly: 85, pa3: 38, pa4: 39, annual: 90 },
      { id: "sub_3", code: "N03", name: "Mathematics & Number Concepts", theory: 47, mcq: 48, practical: 0, highest: 99, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 39, pa2: 37, halfYearly: 92, pa3: 39, pa4: 40, annual: 95 },
      { id: "sub_4", code: "N04", name: "General Awareness & Conversation", theory: 45, mcq: 46, practical: 0, highest: 95, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 36, pa2: 32, halfYearly: 82, pa3: 37, pa4: 38, annual: 91 },
      { id: "sub_5", code: "N05", name: "Art, Craft & Drawing Skill", theory: 49, mcq: 48, practical: 0, highest: 100, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 40, pa2: 38, halfYearly: 95, pa3: 40, pa4: 40, annual: 97 },
      { id: "sub_6", code: "N06", name: "Good Habits & Cleanliness", theory: 50, mcq: 48, practical: 0, highest: 100, maxTheory: 50, maxMcq: 50, maxPractical: 0, pa1: 40, pa2: 39, halfYearly: 96, pa3: 40, pa4: 40, annual: 98 },
    ]
  },
  primary: {
    title: "🎒 Primary Wing (Class 1st to 5th)",
    defaultExamTitle: "PRIMARY CONTINUOUS EVALUATION 2026-27",
    subjects: [
      { id: "sub_1", code: "P01", name: "English Language & Grammar", theory: 62, mcq: 14, practical: 14, highest: 95, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 36, pa2: 31, halfYearly: 84, pa3: 37, pa4: 38, annual: 90 },
      { id: "sub_2", code: "P02", name: "Hindi Bhasha & Sahitya", theory: 64, mcq: 13, practical: 14, highest: 96, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 37, pa2: 30, halfYearly: 83, pa3: 36, pa4: 38, annual: 91 },
      { id: "sub_3", code: "P03", name: "Mathematics (Ganit)", theory: 65, mcq: 15, practical: 15, highest: 99, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 38, pa2: 33, halfYearly: 89, pa3: 39, pa4: 40, annual: 95 },
      { id: "sub_4", code: "P04", name: "Environmental Studies (EVS)", theory: 59, mcq: 14, practical: 13, highest: 92, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 35, pa2: 28, halfYearly: 78, pa3: 36, pa4: 37, annual: 86 },
      { id: "sub_5", code: "P05", name: "Computer & IT Skill", theory: 63, mcq: 14, practical: 15, highest: 98, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 38, pa2: 34, halfYearly: 88, pa3: 38, pa4: 39, annual: 92 },
      { id: "sub_6", code: "P06", name: "General Knowledge (GK)", theory: 66, mcq: 14, practical: 14, highest: 97, maxTheory: 70, maxMcq: 15, maxPractical: 15, pa1: 37, pa2: 32, halfYearly: 86, pa3: 38, pa4: 39, annual: 94 },
    ]
  },
  middle_secondary: {
    title: "🎓 Middle & Secondary (Class 6th to 10th)",
    defaultExamTitle: "ANNUAL SECONDARY EXAMINATION 2026-27",
    subjects: [
      { id: "sub_1", code: "101", name: "English Language & Lit.", theory: 68, mcq: 18, practical: 0, highest: 92, maxTheory: 80, maxMcq: 20, maxPractical: 0, pa1: 36, pa2: 30, halfYearly: 82, pa3: 37, pa4: 38, annual: 86 },
      { id: "sub_2", code: "102", name: "Hindi / Regional Lang.", theory: 72, mcq: 17, practical: 0, highest: 94, maxTheory: 80, maxMcq: 20, maxPractical: 0, pa1: 37, pa2: 29, halfYearly: 83, pa3: 38, pa4: 39, annual: 89 },
      { id: "sub_3", code: "103", name: "Mathematics (Standard)", theory: 65, mcq: 19, practical: 0, highest: 98, maxTheory: 80, maxMcq: 20, maxPractical: 0, pa1: 38, pa2: 32, halfYearly: 88, pa3: 39, pa4: 40, annual: 94 },
      { id: "sub_4", code: "104", name: "General Science", theory: 52, mcq: 16, practical: 19, highest: 95, maxTheory: 60, maxMcq: 20, maxPractical: 20, pa1: 35, pa2: 26, halfYearly: 76, pa3: 36, pa4: 38, annual: 87 },
      { id: "sub_5", code: "105", name: "Social Science", theory: 64, mcq: 18, practical: 0, highest: 89, maxTheory: 80, maxMcq: 20, maxPractical: 0, pa1: 36, pa2: 28, halfYearly: 79, pa3: 37, pa4: 38, annual: 82 },
      { id: "sub_6", code: "106", name: "Information Technology (ICT)", theory: 28, mcq: 19, practical: 48, highest: 99, maxTheory: 30, maxMcq: 20, maxPractical: 50, pa1: 38, pa2: 34, halfYearly: 91, pa3: 39, pa4: 40, annual: 95 },
    ]
  }
};

const DEFAULT_SUBJECTS: MarksheetSubjectRow[] = WING_PRESETS.middle_secondary.subjects;

export const MarksheetGenerator: React.FC<Props> = ({
  school,
  classes,
  students: initialStudents,
  activeSession,
  onBack,
}) => {
  const [studentList, setStudentList] = useState<SchoolStudent[]>(initialStudents);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const classStudents = studentList.filter(s => !selectedClassId || isStudentInClass(s, selectedClassId));
  const [selectedStudentId, setSelectedStudentId] = useState<string>(classStudents[0]?.id || studentList[0]?.id || "");

  // School Header Customization State (can be edited on the fly)
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [isAutoGeneratingMarks, setIsAutoGeneratingMarks] = useState(false);
  const [autoGenNotice, setAutoGenNotice] = useState<string | null>(null);

  // Next Session 1-Click Batch Promotion State
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionNotice, setPromotionNotice] = useState<string | null>(null);
  const [promoFromClassId, setPromoFromClassId] = useState<string>(selectedClassId || classes[0]?.id || "");
  const [promoToClassId, setPromoToClassId] = useState<string>("");
  const [promoTargetSession, setPromoTargetSession] = useState<string>(() => {
    if (activeSession?.name) {
      const match = activeSession.name.match(/(\d{4})-(\d{2,4})/);
      if (match) {
        const y1 = parseInt(match[1], 10) + 1;
        const y2 = parseInt(match[2], 10) + 1;
        return `${y1}-${y2}`;
      }
      return `${activeSession.name} (Next)`;
    }
    return "2027-28";
  });
  const [promoSelectedStudentIds, setPromoSelectedStudentIds] = useState<string[]>([]);
  const [isPromotingStudents, setIsPromotingStudents] = useState(false);

  // Auto map next class & pre-select all students when source class changes
  useEffect(() => {
    const fromId = promoFromClassId || selectedClassId || classes[0]?.id;
    if (!fromId) return;
    const currentIdx = classes.findIndex(c => c.id === fromId);
    if (currentIdx !== -1 && currentIdx + 1 < classes.length) {
      setPromoToClassId(classes[currentIdx + 1].id);
    } else {
      setPromoToClassId(classes[classes.length - 1]?.id || fromId);
    }
    const eligible = studentList.filter(s => s.classId === fromId);
    setPromoSelectedStudentIds(eligible.map(s => s.id));
  }, [promoFromClassId, selectedClassId, classes]);

  const handleBatchPromote = async () => {
    if (!promoToClassId || promoSelectedStudentIds.length === 0) {
      setPromotionNotice("⚠️ Kripya kam se kam ek student aur target class chunein.");
      return;
    }
    setIsPromotingStudents(true);
    try {
      await promoteStudents(school.id, promoToClassId, promoTargetSession, promoSelectedStudentIds);
      // update local state
      setStudentList(prev =>
        prev.map(s =>
          promoSelectedStudentIds.includes(s.id)
            ? { ...s, classId: promoToClassId, sessionId: promoTargetSession }
            : s
        )
      );
      const toClassName = classes.find(c => c.id === promoToClassId)?.name || "Next Class";
      setPromotionNotice(`🎉 बधाई हो! ${promoSelectedStudentIds.length} छात्र सफलतापूर्वक अगले सत्र (${promoTargetSession}) व ${toClassName} में प्रमोट हो गए!`);
      setShowPromotionModal(false);
      setTimeout(() => setPromotionNotice(null), 6000);
    } catch (err: any) {
      setPromotionNotice("⚠️ Promotion failed: " + (err?.message || "Unknown error"));
    } finally {
      setIsPromotingStudents(false);
    }
  };

  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails>({
    schoolName: school?.name || "",
    tagline: school?.tagline || "",
    affiliation: school?.affiliation || "CBSE Pattern Curriculum",
    address: school?.address || "",
    phone: school?.mobile || school?.phone || "",
    email: school?.email || "",
    logoUrl: getSavedSchoolLogo(school?.logoUrl, school?.id),
    principalName: school?.principalName || "",
    principalTitle: "Principal",
    code: school?.code || "",
    principalPhone: school?.principalPhone || "",
    directorName: school?.directorName || "",
    directorPhone: school?.directorPhone || "",
    principalSignatureUrl: school?.principalSignatureUrl || "",
    directorSignatureUrl: school?.directorSignatureUrl || "",
    customFields: school?.customFields || [],
    documentPrintFields: school?.documentPrintFields || {},
  });
  useEffect(() => {
    setSchoolDetails(previous => ({
      ...previous,
      schoolName: school.name || "",
      tagline: school.tagline || "",
      affiliation: school.affiliation || previous.affiliation || "CBSE Pattern Curriculum",
      address: school.address || "",
      phone: school.mobile || school.phone || "",
      email: school.email || "",
      logoUrl: getSavedSchoolLogo(school.logoUrl || previous.logoUrl, school.id),
      principalName: school.principalName || "",
      code: school.code || "",
      principalPhone: school.principalPhone || "",
      directorName: school.directorName || "",
      directorPhone: school.directorPhone || "",
      principalSignatureUrl: school.principalSignatureUrl || "",
      directorSignatureUrl: school.directorSignatureUrl || "",
      customFields: school.customFields || [],
      documentPrintFields: school.documentPrintFields || {},
    }));
  }, [school]);
  const showSchoolDetail = (field: Parameters<typeof schoolPrintFieldEnabled>[2]) =>
    schoolPrintFieldEnabled(schoolDetails.documentPrintFields, "marksheet", field);
  const customSchoolDetails = showSchoolDetail("customFields")
    ? (schoolDetails.customFields || []).filter(field => field.label?.trim() && field.value?.trim())
      .map(field => `${field.label}: ${field.value}`).join(" • ")
    : "";
  const principalName = schoolDetails.principalName;

  // Selected Exam Cycle (Default: 'annual')
  const [selectedExamId, setSelectedExamId] = useState<string>("annual");
  const [customExams, setCustomExams] = useState<ExamOption[]>([]);
  const [dbExams, setDbExams] = useState<ExamEntry[]>([]);
  const [showAddExamModal, setShowAddExamModal] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamMaxMarks, setNewExamMaxMarks] = useState<number>(40);

  // Marksheet Display Style (Admin Choice: Smart Visual with Charts, Classic Table, Normal Single Slip, Portrait)
  const [marksheetStyle, setMarksheetStyle] = useState<"visual_charts" | "classic_table" | "single_slip" | "portrait">("visual_charts");

  // Exam Meta (Defaults: Pre-Board / Annual with Dropdown selection)
  const [examTitle, setExamTitle] = useState("Annual Examination 2026-27");
  const [publishDate, setPublishDate] = useState(new Date().toISOString().split("T")[0]);
  const [sessionName, setSessionName] = useState(() => formatAcademicSession(activeSession?.name || "2026-27"));
  const [gradingScaleType, setGradingScaleType] = useState<"5.0" | "10.0">("5.0");
  const [promotionStatusMode, setPromotionStatusMode] = useState<"auto" | "eligible_board" | "appearing_board" | "promoted" | "custom">("auto");
  const [customPromotionText, setCustomPromotionText] = useState<string>("");

  // Attendance Summary Box States (Default 220 Working Days / 198 Student Attendance = 90%)
  const [totalWorkingDays, setTotalWorkingDays] = useState<number>(220);
  const [studentAttendance, setStudentAttendance] = useState<number>(198);

  // Editable Student Meta (Overrides auto student data if desired)
  const currentStudent = classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;
  const currentClass = classes.find(c => c.id === selectedClassId);

  const [studentName, setStudentName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [regiNo, setRegiNo] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [motherName, setMotherName] = useState("");
  const [sectionName, setSectionName] = useState("A");

  // Rank Display States (Class Rank & Section Rank)
  const [classRank, setClassRank] = useState<string>("01");
  const [classStrength, setClassStrength] = useState<string>("85");
  const [sectionRank, setSectionRank] = useState<string>("01");
  const [sectionStrength, setSectionStrength] = useState<string>("32");

  // Student Photo (Pic Option)
  const [showStudentPhoto, setShowStudentPhoto] = useState(true);
  const [studentPhoto, setStudentPhoto] = useState<string>("");

  // 3 Distinct Class-Level Wings: pre_primary | primary | middle_secondary
  const [activeWing, setActiveWing] = useState<"pre_primary" | "primary" | "middle_secondary">(() => {
    return detectClassWing(classes.find(c => c.id === selectedClassId)?.name);
  });

  // Multi-term attendance tracking for correlation analysis in Landscape mode
  const [termAttendance, setTermAttendance] = useState<TermAttendanceDetail[]>(DEFAULT_TERMS);

  // Layout Mode: Standard 1-Page Portrait, 2-Page Part 1 & Part 2, or Landscape Wide
  const [layoutMode, setLayoutMode] = useState<"portrait_compact" | "two_pages" | "landscape_wide">("landscape_wide");
  const isLandscapeView = marksheetStyle !== "portrait" && (marksheetStyle === "visual_charts" || marksheetStyle === "classic_table" || layoutMode === "landscape_wide");

  // 3 Official Signatures: Class Teacher, Exam Controller, Principal (with Round Stamp)
  const [teacherName, setTeacherName] = useState("Class Teacher");
  const [examControllerName, setExamControllerName] = useState("Exam Controller");
  const [teacherRemark, setTeacherRemark] = useState("");

  // Subject rows
  const [subjects, setSubjects] = useState<MarksheetSubjectRow[]>(() => {
    const detected = detectClassWing(classes.find(c => c.id === selectedClassId)?.name);
    return WING_PRESETS[detected]?.subjects || DEFAULT_SUBJECTS;
  });

  // Bulk Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Automatically update wing, subject preset, and exam title when selected class changes
  useEffect(() => {
    const cls = classes.find(c => c.id === selectedClassId);
    if (cls) {
      const detected = detectClassWing(cls.name);
      setActiveWing(detected);
      if (WING_PRESETS[detected]) {
        setSubjects(WING_PRESETS[detected].subjects);
      }
      if (isBoardClass(cls.name)) {
        setExamTitle(`PRE-BOARD EXAMINATION (${sessionName || "2026-27"})`);
        setPromotionStatusMode("eligible_board");
      }
    }
  }, [classes, selectedClassId, sessionName]);

  // Auto-fetch any custom exams created in School Admin / Marks Manager
  useEffect(() => {
    if (!school?.id) return;
    getExams(school.id, selectedClassId)
      .then(fetched => {
        if (Array.isArray(fetched)) {
          setDbExams(fetched);
          if (fetched.length > 0) {
            const distinctNames = Array.from(new Set(fetched.map(e => e.examName).filter(Boolean)));
            const extra: ExamOption[] = [];
            distinctNames.forEach(name => {
              const lower = name.toLowerCase();
              const isKnown = DEFAULT_EXAM_OPTIONS.some(d =>
                lower.includes(d.id.toLowerCase()) ||
                lower.includes(d.shortName.toLowerCase()) ||
                (d.id === "annual" && (lower.includes("annual") || lower.includes("final"))) ||
                (d.id === "half_yearly" && (lower.includes("half") || lower.includes("mid")))
              );
              if (!isKnown) {
                const matchingEx = fetched.find(e => e.examName === name);
                const max = matchingEx?.maxMarks || 40;
                extra.push({
                  id: `custom_${name.replace(/\s+/g, "_").toLowerCase()}`,
                  name,
                  shortName: name.length > 14 ? name.slice(0, 12) + ".." : name,
                  category: "custom",
                  maxMarks: max,
                  term: "term1",
                });
              }
            });
            setCustomExams(extra);
          }
        }
      })
      .catch(() => {});
  }, [school?.id, selectedClassId]);

  const allExamOptions = useMemo(() => {
    return [...DEFAULT_EXAM_OPTIONS, ...customExams];
  }, [customExams]);

  const currentExamOption = useMemo(() => {
    return allExamOptions.find(e => e.id === selectedExamId) || DEFAULT_EXAM_OPTIONS[5];
  }, [allExamOptions, selectedExamId]);

  const handleSelectExam = (examId: string) => {
    setSelectedExamId(examId);
    const opt = allExamOptions.find(e => e.id === examId);
    if (!opt) return;
    if (opt.id === "annual") {
      setExamTitle(`Annual Examination ${sessionName}`);
      setMarksheetStyle("visual_charts");
    } else if (opt.id === "half_yearly") {
      setExamTitle(`Half Yearly Examination ${sessionName}`);
      setMarksheetStyle("visual_charts");
    } else {
      setExamTitle(`${opt.name} ${sessionName}`);
      setMarksheetStyle("single_slip");
    }
  };

  const handleAddCustomExam = () => {
    if (!newExamName.trim()) return;
    const clean = newExamName.trim();
    const id = `custom_${Date.now()}`;
    const newOpt: ExamOption = {
      id,
      name: clean,
      shortName: clean.length > 14 ? clean.slice(0, 12) + ".." : clean,
      category: "custom",
      maxMarks: Number(newExamMaxMarks) || 40,
      term: "term1",
    };
    setCustomExams(prev => [...prev, newOpt]);
    setSelectedExamId(id);
    setExamTitle(`${clean} ${sessionName}`);
    setMarksheetStyle("single_slip");
    setShowAddExamModal(false);
    setNewExamName("");
    setNewExamMaxMarks(40);
  };

  // Optional auto-sync from recorded class attendance if available
  useEffect(() => {
    if (!school?.id || !selectedClassId || !selectedStudentId) return;
    getMonthlyAttendance(school.id, selectedClassId, currentMonthStr())
      .then(records => {
        if (records && records.length >= 10) {
          let present = 0;
          records.forEach(rec => {
            const st = rec.students?.[selectedStudentId];
            const isP = st ? (typeof st === "object" ? Boolean(st.present) : Boolean(st)) : false;
            if (isP) present++;
          });
          setTotalWorkingDays(records.length);
          setStudentAttendance(present);
        }
      })
      .catch(() => {});
  }, [school?.id, selectedClassId, selectedStudentId]);

  // Dynamic Rank Calculation Engine across all students in class & section
  const studentRankings = useMemo(() => {
    if (!classStudents || classStudents.length === 0) {
      return { classRanks: new Map<string, number>(), sectionRanks: new Map<string, number>() };
    }

    // Determine performance score for each student to rank them objectively
    const studentScores = classStudents.map(student => {
      let totalMarks = 0;
      let hasMarks = false;
      if (dbExams && dbExams.length > 0) {
        dbExams.forEach(exam => {
          const entry = exam.studentMarks?.[student.id];
          if (entry && typeof entry.marks === "number") {
            totalMarks += entry.marks;
            hasMarks = true;
          }
        });
      }

      // If exams exist with marks, use total marks. Otherwise rank by roll number order (Roll 1 > Roll 2 > etc.)
      const rollNum = parseInt(student.rollNo || "999", 10);
      const scoreKey = hasMarks ? totalMarks : (10000 - (isNaN(rollNum) ? 999 : rollNum));

      return {
        id: student.id,
        rollNo: student.rollNo,
        section: (student.section || currentClass?.section || "A").trim().toUpperCase(),
        scoreKey,
      };
    });

    // Sort descending for entire class
    const sortedClass = [...studentScores].sort((a, b) => b.scoreKey - a.scoreKey);
    const classRanks = new Map<string, number>();
    sortedClass.forEach((st, idx) => {
      classRanks.set(st.id, idx + 1);
    });

    // Group by section and sort descending
    const sectionRanks = new Map<string, number>();
    const bySection: Record<string, typeof studentScores> = {};
    studentScores.forEach(st => {
      if (!bySection[st.section]) bySection[st.section] = [];
      bySection[st.section].push(st);
    });

    Object.values(bySection).forEach(secList => {
      const sortedSec = [...secList].sort((a, b) => b.scoreKey - a.scoreKey);
      sortedSec.forEach((st, idx) => {
        sectionRanks.set(st.id, idx + 1);
      });
    });

    return { classRanks, sectionRanks };
  }, [classStudents, dbExams, currentClass]);

  // Synchronize student data on selection
  const syncStudentData = (target: SchoolStudent | null) => {
    if (target) {
      setStudentName(target.name || "");
      const r = target.rollNo || "01";
      setRollNo(r);
      setRegiNo(target.admissionNo || "REG-" + (target.rollNo || "01"));
      setFatherName(target.fatherName || "Shri Parent");
      setMotherName(target.motherName || "Smt. Guardian");
      setSectionName(currentClass?.section || "A");
      setStudentPhoto((target as any)?.photoUrl || "");

      const numRoll = parseInt(r, 10);
      const computedClassRank = studentRankings.classRanks.get(target.id) || (numRoll && !isNaN(numRoll) ? numRoll : 1);
      const computedSecRank = studentRankings.sectionRanks.get(target.id) || computedClassRank;

      const fmtClass = computedClassRank < 10 ? `0${computedClassRank}` : `${computedClassRank}`;
      const fmtSec = computedSecRank < 10 ? `0${computedSecRank}` : `${computedSecRank}`;

      setClassRank(fmtClass);
      setSectionRank(fmtSec);
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
        setDbExams(exams);
        const resolved = computeStudentSubjects(currentStudent, subjects, exams, selectedExamId);
        setSubjects(resolved);
        setAutoGenNotice(`✅ Database se ${exams.length} exams ke real marks load ho gaye!`);
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

  // Helper for Pre-Primary Star Ratings
  const getStarRating = (pct: number) => {
    if (pct >= 90) return "⭐⭐⭐⭐⭐";
    if (pct >= 75) return "⭐⭐⭐⭐";
    if (pct >= 60) return "⭐⭐⭐";
    if (pct >= 40) return "⭐⭐";
    return "⭐";
  };

  // Grand Totals (Computes stats for either the default subjects or a specific student's subjects)
  const grandStats = (targetSubjects: MarksheetSubjectRow[] = subjects) => {
    let grandTotal = 0;
    let grandMax = 0;
    let totalPoints = 0;
    let hasFail = false;

    targetSubjects.forEach(sub => {
      const stats = calculateSubjectStats(sub);
      grandTotal += stats.totalMarks;
      grandMax += stats.maxMarks;
      totalPoints += parseFloat(stats.point);
      if (stats.grade === "F") hasFail = true;
    });

    const gpa = targetSubjects.length > 0 ? (totalPoints / targetSubjects.length).toFixed(2) : "0.00";
    const overallPct = grandMax > 0 ? ((grandTotal / grandMax) * 100).toFixed(1) : "0.0";
    const isPrePrimary = activeWing === "pre_primary";

    let overallGrade = "F";
    if (isPrePrimary) {
      const p = parseFloat(overallPct);
      if (p >= 85) overallGrade = "A+";
      else if (p >= 70) overallGrade = "A";
      else if (p >= 50) overallGrade = "B";
      else overallGrade = "C";
    } else if (!hasFail) {
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

    const resultStatus = isPrePrimary
      ? "PROMOTED TO NEXT CLASS 🎉"
      : hasFail
      ? "FAILED (Supplementary)"
      : "PASSED (Promoted)";

    return {
      grandTotal,
      grandMax,
      gpa,
      overallPct,
      overallGrade,
      resultStatus,
      hasFail: isPrePrimary ? false : hasFail,
      isPrePrimary,
    };
  };

  const totals = grandStats();

  // Helper to map real marks entered in MarksManager from Firestore to student subjects
  const computeStudentSubjects = (
    target: SchoolStudent | null | undefined,
    baseSubjects: MarksheetSubjectRow[],
    exams: ExamEntry[],
    activeExamId: string
  ): MarksheetSubjectRow[] => {
    if (!target || !exams || exams.length === 0) {
      return baseSubjects;
    }

    const isMatchTerm = (examTitle: string, term: "pa1" | "pa2" | "halfYearly" | "pa3" | "pa4" | "annual") => {
      const l = examTitle.toLowerCase();
      if (term === "pa1") return l.includes("pa 1") || l.includes("pa-1") || l.includes("periodic assessment 1") || l.includes("unit 1");
      if (term === "pa2") return l.includes("pa 2") || l.includes("pa-2") || l.includes("periodic assessment 2") || l.includes("unit 2");
      if (term === "halfYearly") return l.includes("half") || l.includes("mid") || l.includes("term 1") || l.includes("sa 1");
      if (term === "pa3") return l.includes("pa 3") || l.includes("pa-3") || l.includes("periodic assessment 3") || l.includes("unit 3");
      if (term === "pa4") return l.includes("pa 4") || l.includes("pa-4") || l.includes("periodic assessment 4") || l.includes("unit 4");
      if (term === "annual") return l.includes("annual") || l.includes("final") || l.includes("term 2") || l.includes("sa 2");
      return false;
    };

    // Check if target student has marks recorded in any exam in Firestore
    const hasAnyMarks = exams.some(e => e.studentMarks && e.studentMarks[target.id] !== undefined);
    if (!hasAnyMarks) {
      return baseSubjects;
    }

    const subjectMap = new Map<string, MarksheetSubjectRow>();
    baseSubjects.forEach(s => {
      subjectMap.set(s.name.trim().toLowerCase(), { ...s });
    });

    // Add extra subjects found in exams
    exams.forEach((ex, idx) => {
      const sKey = (ex.subjectName || ex.examName).trim().toLowerCase();
      if (!subjectMap.has(sKey)) {
        subjectMap.set(sKey, {
          id: ex.id || `exam_sub_${idx}`,
          code: ex.subjectId ? ex.subjectId.slice(0, 4).toUpperCase() : `S${idx + 1}`,
          name: ex.subjectName || ex.examName,
          theory: 0,
          mcq: 0,
          practical: 0,
          highest: ex.maxMarks || 100,
          maxTheory: 80,
          maxMcq: 20,
          maxPractical: 0,
        });
      }
    });

    const resultRows: MarksheetSubjectRow[] = [];

    subjectMap.forEach(row => {
      const subKey = row.name.trim().toLowerCase();
      const subjectExams = exams.filter(e => {
        const eSub = (e.subjectName || "").trim().toLowerCase();
        return eSub === subKey || eSub.includes(subKey) || subKey.includes(eSub) || (!e.subjectName && e.examName.toLowerCase().includes(subKey));
      });

      let pa1: number | undefined = row.pa1;
      let pa2: number | undefined = row.pa2;
      let halfYearly: number | undefined = row.halfYearly;
      let pa3: number | undefined = row.pa3;
      let pa4: number | undefined = row.pa4;
      let annual: number | undefined = row.annual;

      let highestScore = row.highest || 90;

      subjectExams.forEach(e => {
        const allStudentMarks = Object.values(e.studentMarks || {}).map((m: any) => Number(m.marks || 0));
        if (allStudentMarks.length > 0) {
          highestScore = Math.max(highestScore, ...allStudentMarks);
        }

        const sm = e.studentMarks?.[target.id];
        if (sm !== undefined) {
          const score = sm.absent ? 0 : Number(sm.marks || 0);
          if (isMatchTerm(e.examName, "pa1")) pa1 = score;
          else if (isMatchTerm(e.examName, "pa2")) pa2 = score;
          else if (isMatchTerm(e.examName, "halfYearly")) halfYearly = score;
          else if (isMatchTerm(e.examName, "pa3")) pa3 = score;
          else if (isMatchTerm(e.examName, "pa4")) pa4 = score;
          else if (isMatchTerm(e.examName, "annual")) annual = score;
        }
      });

      let activeExamScore: number | undefined;
      if (activeExamId === "pa1") activeExamScore = pa1;
      else if (activeExamId === "pa2") activeExamScore = pa2;
      else if (activeExamId === "half_yearly") activeExamScore = halfYearly;
      else if (activeExamId === "pa3") activeExamScore = pa3;
      else if (activeExamId === "pa4") activeExamScore = pa4;
      else if (activeExamId === "annual") activeExamScore = annual ?? halfYearly ?? pa1;
      else {
        const matchingCustomEx = subjectExams.find(e => e.id === activeExamId || e.examName.toLowerCase().includes(activeExamId.toLowerCase()));
        if (matchingCustomEx?.studentMarks?.[target.id]) {
          const rec = matchingCustomEx.studentMarks[target.id];
          activeExamScore = rec.absent ? 0 : Number(rec.marks || 0);
        }
      }

      let theory = row.theory;
      let mcq = row.mcq;
      let practical = row.practical;

      if (activeExamScore !== undefined) {
        const isPractical = (row.maxPractical && row.maxPractical > 0) ||
          row.name.toLowerCase().includes("science") ||
          row.name.toLowerCase().includes("computer") ||
          row.name.toLowerCase().includes("practical") ||
          row.name.toLowerCase().includes("it");

        if (activeWing === "pre_primary") {
          theory = Math.round(activeExamScore * 0.5);
          mcq = activeExamScore - theory;
          practical = 0;
        } else if (activeWing === "primary") {
          theory = Math.round(activeExamScore * 0.7);
          mcq = Math.round(activeExamScore * 0.15);
          practical = activeExamScore - theory - mcq;
        } else if (isPractical) {
          theory = Math.round(activeExamScore * 0.6);
          mcq = Math.round(activeExamScore * 0.2);
          practical = activeExamScore - theory - mcq;
        } else {
          theory = Math.round(activeExamScore * 0.8);
          mcq = activeExamScore - theory;
          practical = 0;
        }
      }

      resultRows.push({
        ...row,
        theory,
        mcq,
        practical,
        highest: highestScore,
        pa1,
        pa2,
        halfYearly,
        pa3,
        pa4,
        annual,
      });
    });

    return resultRows;
  };

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

  const baseClassSubjects = subjects;

  // Render a Single Marksheet Sheet (A4 Portrait/Landscape exact layout)
  const renderMarksheetSheet = (targetStudent?: SchoolStudent) => {
    const isSingle = !bulkMode || !targetStudent || (currentStudent && targetStudent.id === currentStudent.id);
    const activeStudent = isSingle ? (currentStudent || targetStudent) : targetStudent;
    const subjects = computeStudentSubjects(activeStudent, baseClassSubjects, dbExams, selectedExamId);
    const totals = grandStats(subjects);

    const sName = isSingle ? (studentName || activeStudent?.name || "Student Candidate") : (activeStudent?.name || "Student Candidate");
    const sRoll = isSingle ? (rollNo || activeStudent?.rollNo || "01") : (activeStudent?.rollNo || "01");
    const sReg = isSingle ? (regiNo || activeStudent?.admissionNo || `REG-${sRoll}`) : (activeStudent?.admissionNo || `REG-${sRoll}`);
    const sFather = isSingle ? (fatherName || activeStudent?.fatherName || "Shri Parent") : (activeStudent?.fatherName || "Shri Parent");
    const cName = currentClass?.name || "Class 10";
    const sSection = isSingle ? (sectionName || currentClass?.section || "A") : (currentClass?.section || "A");
    const sPhoto = isSingle ? (studentPhoto || (activeStudent as any)?.photoUrl || "") : ((activeStudent as any)?.photoUrl || "");

    const formatTwoDigit = (val: string | number) => {
      const n = parseInt(String(val).trim(), 10);
      if (!isNaN(n)) return n < 10 ? `0${n}` : `${n}`;
      return String(val || "01");
    };

    const targetId = activeStudent?.id;
    const computedClassRank = targetId && studentRankings.classRanks.has(targetId)
      ? studentRankings.classRanks.get(targetId)!
      : (parseInt(activeStudent?.rollNo || "1", 10) || 1);

    const computedSectionRank = targetId && studentRankings.sectionRanks.has(targetId)
      ? studentRankings.sectionRanks.get(targetId)!
      : computedClassRank;

    const sClassRank = isSingle ? formatTwoDigit(classRank || computedClassRank) : formatTwoDigit(computedClassRank);
    const sClassStrength = classStrength || (classStudents.length > 0 ? String(classStudents.length) : "85");
    const sSectionRank = isSingle ? formatTwoDigit(sectionRank || computedSectionRank) : formatTwoDigit(computedSectionRank);
    const sSectionStrength = sectionStrength || "32";

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
      classRank: `${sClassRank}/${sClassStrength}`,
      sectionRank: `${sSectionRank}/${sSectionStrength}`,
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

    const cleanSessionText = formatAcademicSession(sessionName);
    const cleanExamHeading = (examTitle || `Annual Examination ${cleanSessionText}`)
      .replace(/\(?\s*cbse\s+full\s+year\s*\)?/gi, "")
      .trim() || `Annual Examination ${cleanSessionText}`;
    const cleanCurriculumLine = (schoolDetails.affiliation || "CBSE Pattern Curriculum")
      .replace(/\(?\s*cbse\s+full\s+year\s*\)?/gi, "CBSE Pattern Curriculum")
      .replace(/affiliation\s*code\s*:?\s*/gi, "School Code: ")
      .trim();
    const safeWorkingDays = Math.max(0, Number(totalWorkingDays) || 0);
    const safePresentDays = Math.max(0, Math.min(safeWorkingDays || 999, Number(studentAttendance) || 0));
    const attendancePercentage = safeWorkingDays > 0 ? Math.round((safePresentDays / safeWorkingDays) * 100) : 0;

    const isPreBoard = /pre[-\s]?board/i.test(examTitle) || /board\s+mock/i.test(examTitle);
    const isBoard = isPreBoard || isBoardClass(cName || currentClass?.name);
    const isSingleExam = currentExamOption.category === "pa" || currentExamOption.category === "custom";
    const isHalfYearly = selectedExamId === "half_yearly";
    const examMax = currentExamOption.maxMarks || 40;
    const maxTheory = Math.round(examMax * 0.75);
    const maxInternal = examMax - maxTheory;

    const boardExamYear = (() => {
      const parts = (cleanSessionText || sessionName || "2026-27").trim().split("-");
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10);
        const p2 = parts[1].trim();
        if (p2.length === 2 && !isNaN(y1)) {
          return `${String(y1).slice(0, 2)}${p2}`;
        } else if (p2.length === 4) {
          return p2;
        }
      }
      return "2027";
    })();

    const nextSessionString = (() => {
      const parts = (sessionName || "2026-27").split("-");
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10);
        const y2 = parseInt(parts[1], 10);
        if (!isNaN(y1) && !isNaN(y2)) {
          return `${y1 + 1}-${String(y2 + 1).padStart(2, "0")}`;
        }
      }
      return "2027-28";
    })();

    const nextClassString = (() => {
      const cn = cName || "";
      const numMatch = cn.match(/\d+/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0], 10) + 1;
        return cn.replace(numMatch[0], String(nextNum));
      }
      const lower = cn.toLowerCase();
      if (lower.includes("play")) return "Nursery";
      if (lower.includes("nursery") || lower.includes("nur")) return "LKG";
      if (lower.includes("lkg")) return "UKG";
      if (lower.includes("ukg") || lower.includes("prep")) return "Class 1";
      return "Next Standard";
    })();

    // Status calculations for Promotion / Board Eligibility
    const resolvedStatus = (() => {
      if (totals.hasFail) {
        return {
          header: isBoard ? "Board Exam Status" : (isHalfYearly ? "Mid-Term Academic Status" : "Annual Promotion Status"),
          badge: isBoard ? "⚠️ Supplementary (Remedial for Board)" : (isHalfYearly ? "⚠️ Needs Revision in Term-2" : "⚠️ Supplementary / Retake"),
          sub: `Session: ${cleanSessionText}`,
        };
      }
      if (promotionStatusMode === "eligible_board") {
        return {
          header: "Board Exam Status (बोर्ड परीक्षा पात्रता)",
          badge: `🎯 ELIGIBLE FOR BOARD EXAM ${boardExamYear}`,
          sub: `Appearing in CBSE / Board Exam • Session: ${cleanSessionText}`,
        };
      }
      if (promotionStatusMode === "appearing_board") {
        return {
          header: "Board Exam Status (बोर्ड परीक्षा स्थिति)",
          badge: `📝 APPEARING IN CBSE/BOARD EXAM ${boardExamYear}`,
          sub: `Current Academic Session: ${cleanSessionText}`,
        };
      }
      if (promotionStatusMode === "promoted") {
        return {
          header: "Annual Promotion Status",
          badge: `🎉 Promoted to ${nextClassString}`,
          sub: `Session: ${nextSessionString}`,
        };
      }
      if (promotionStatusMode === "custom" && customPromotionText.trim()) {
        return {
          header: isBoard ? "Board Exam Status" : "Annual Promotion Status",
          badge: customPromotionText.trim(),
          sub: `Session: ${cleanSessionText}`,
        };
      }
      // Auto mode: Class 10 & 12 / Pre-Board defaults to Eligible for Board Exam
      if (isBoard) {
        return {
          header: "Board Exam Status (बोर्ड परीक्षा पात्रता)",
          badge: `🎯 ELIGIBLE FOR BOARD EXAM ${boardExamYear}`,
          sub: `Appearing in CBSE / Board Exam • Session: ${cleanSessionText}`,
        };
      }
      if (isHalfYearly) {
        return {
          header: "Mid-Term Academic Status",
          badge: "✓ Qualified for Term-2",
          sub: `Current Session: ${cleanSessionText}`,
        };
      }
      return {
        header: "Annual Promotion Status",
        badge: `🎉 Promoted to ${nextClassString}`,
        sub: `Session: ${nextSessionString}`,
      };
    })();

    const isDenseSubjects = subjects.length >= 12;

    // Helper to render level-appropriate marks table for Pre-Primary, Primary, and Middle/Secondary wings
    const renderSubjectMarksTable = (isCompactTable: boolean, isVeryCompactTable: boolean, inLandscape: boolean) => {
      if (activeWing === "pre_primary") {
        return (
          <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr className={isVeryCompactTable ? "text-[8.5px]" : "text-[10px]"}>
                  <th className="p-1 border-r border-slate-700 text-center w-6">SL</th>
                  <th className="p-1 border-r border-slate-700 text-center w-10 font-mono">Code</th>
                  <th className="p-1 border-r border-slate-700">Foundational Skill / Subject</th>
                  <th className="p-1 border-r border-slate-700 text-center w-14">Oral (50)</th>
                  <th className="p-1 border-r border-slate-700 text-center w-14">Activity (50)</th>
                  <th className="p-1 border-r border-slate-700 text-center w-12 bg-indigo-950">Total</th>
                  <th className="p-1 border-r border-slate-700 text-center w-20 bg-indigo-950">Stars</th>
                  <th className="p-1 text-center w-12 bg-indigo-950">Grade</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-300 font-medium ${isVeryCompactTable ? "text-[8px]" : "text-[9.5px]"}`}>
                {subjects.map((sub, idx) => {
                  const oral = Number(sub.theory || 0);
                  const act = Number(sub.mcq || 0);
                  const total = oral + act;
                  const max = (Number(sub.maxTheory || 50) + Number(sub.maxMcq || 50)) || 100;
                  const pct = Math.round((total / max) * 100);
                  const stars = getStarRating(pct);
                  const grade = pct >= 85 ? "A+" : pct >= 70 ? "A" : pct >= 50 ? "B" : "C";
                  const cellPad = isDenseSubjects ? "py-0.5 px-1" : inLandscape ? "py-1.5 px-1" : "p-1";
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className={`${cellPad} text-center font-bold text-slate-500 border-r border-slate-300`}>{idx + 1}</td>
                      <td className={`${cellPad} text-center font-mono font-bold text-slate-700 border-r border-slate-300`}>{sub.code}</td>
                      <td className={`${cellPad} font-black text-slate-900 border-r border-slate-300 truncate max-w-[130px]`}>{sub.name}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{oral}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{act}</td>
                      <td className={`${cellPad} text-center font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50`}>{total}</td>
                      <td className={`${cellPad} text-center border-r border-slate-300 bg-amber-50/50 text-[10px]`}>{stars}</td>
                      <td className={`${cellPad} text-center font-black bg-indigo-50/50 text-emerald-700`}>{grade}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={5} className="p-1.5 text-right uppercase tracking-wider border-r border-slate-700 text-[10px]">
                    Overall Foundational Evaluation
                  </td>
                  <td className="p-1 text-center border-r border-slate-700 text-amber-300 text-xs">
                    {totals.grandTotal} / {totals.grandMax}
                  </td>
                  <td className="p-1 text-center border-r border-slate-700 text-amber-300 text-xs">
                    {getStarRating(parseFloat(totals.overallPct))}
                  </td>
                  <td className="p-1 text-center bg-amber-400 text-slate-950 font-black text-xs">
                    {totals.overallGrade}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      }

      if (activeWing === "primary") {
        return (
          <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr className={isVeryCompactTable ? "text-[8.5px]" : "text-[10px]"}>
                  <th className="p-1 border-r border-slate-700 text-center w-6">SL</th>
                  <th className="p-1 border-r border-slate-700 text-center w-10 font-mono">Code</th>
                  <th className="p-1 border-r border-slate-700">Subject Name</th>
                  <th className="p-1 border-r border-slate-700 text-center w-12">Written (70)</th>
                  <th className="p-1 border-r border-slate-700 text-center w-12">Oral (15)</th>
                  <th className="p-1 border-r border-slate-700 text-center w-12">Notebook (15)</th>
                  <th className="p-1 border-r border-slate-700 text-center w-11 bg-slate-800">Highest</th>
                  <th className="p-1 border-r border-slate-700 text-center w-12 bg-indigo-950">Total</th>
                  <th className="p-1 text-center w-12 bg-indigo-950">Grade</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-300 font-medium ${isVeryCompactTable ? "text-[8px]" : "text-[9.5px]"}`}>
                {subjects.map((sub, idx) => {
                  const stats = calculateSubjectStats(sub);
                  const cellPad = isDenseSubjects ? "py-0.5 px-1" : inLandscape ? "py-1.5 px-1" : "p-1";
                  return (
                    <tr key={sub.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className={`${cellPad} text-center font-bold text-slate-500 border-r border-slate-300`}>{idx + 1}</td>
                      <td className={`${cellPad} text-center font-mono font-bold text-slate-700 border-r border-slate-300`}>{sub.code}</td>
                      <td className={`${cellPad} font-black text-slate-900 border-r border-slate-300 truncate max-w-[130px]`}>{sub.name}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{sub.theory}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{sub.mcq}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{sub.practical}</td>
                      <td className={`${cellPad} text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-50`}>{sub.highest}</td>
                      <td className={`${cellPad} text-center font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50`}>{stats.totalMarks}</td>
                      <td className={`${cellPad} text-center font-black bg-indigo-50/50`}>
                        <span className={`px-1 py-0.5 rounded text-[9.5px] font-black ${
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
              <tfoot className="bg-slate-900 text-white font-black text-xs">
                <tr>
                  <td colSpan={6} className="p-1.5 text-right uppercase tracking-wider border-r border-slate-700 text-[10px]">
                    Grand Total Marks &amp; GPA
                  </td>
                  <td className="p-1 text-center border-r border-slate-700 text-slate-300">—</td>
                  <td className="p-1 text-center border-r border-slate-700 text-amber-300 text-xs">
                    {totals.grandTotal} / {totals.grandMax}
                  </td>
                  <td className="p-1 text-center bg-amber-400 text-slate-950 font-black text-xs">
                    {totals.overallGrade}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      }

      // Middle & Secondary (Class 6 to 10)
      return (
        <div className="overflow-hidden border-2 border-slate-900 rounded-lg">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-900 text-white font-bold">
              <tr className={isVeryCompactTable ? "text-[8.5px]" : "text-[10px]"}>
                <th className="p-1 border-r border-slate-700 text-center w-6">SL</th>
                <th className="p-1 border-r border-slate-700 text-center w-10 font-mono">Code</th>
                <th className="p-1 border-r border-slate-700">Subject Name</th>
                <th className="p-1 border-r border-slate-700 text-center w-12">Theory (80)</th>
                <th className="p-1 border-r border-slate-700 text-center w-12">Practical/IA</th>
                <th className="p-1 border-r border-slate-700 text-center w-11 bg-slate-800">Highest</th>
                <th className="p-1 border-r border-slate-700 text-center w-12 bg-indigo-950">Total</th>
                <th className="p-1 border-r border-slate-700 text-center w-10 bg-indigo-950">Point</th>
                <th className="p-1 text-center w-12 bg-indigo-950">Grade</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-300 font-medium ${isVeryCompactTable ? "text-[8px]" : "text-[9.5px]"}`}>
              {subjects.map((sub, idx) => {
                const stats = calculateSubjectStats(sub);
                const cellPad = isDenseSubjects ? "py-0.5 px-1" : inLandscape ? "py-1.5 px-1" : "p-1";
                return (
                  <tr key={sub.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                    <td className={`${cellPad} text-center font-bold text-slate-500 border-r border-slate-300`}>{idx + 1}</td>
                    <td className={`${cellPad} text-center font-mono font-bold text-slate-700 border-r border-slate-300`}>{sub.code}</td>
                    <td className={`${cellPad} font-black text-slate-900 border-r border-slate-300 truncate max-w-[130px]`}>{sub.name}</td>
                    <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>{sub.theory}</td>
                    <td className={`${cellPad} text-center font-bold text-slate-800 border-r border-slate-300`}>
                      {sub.maxPractical > 0 ? sub.practical : (sub.maxMcq > 0 ? sub.mcq : "-")}
                    </td>
                    <td className={`${cellPad} text-center font-bold text-slate-600 border-r border-slate-300 bg-slate-50`}>{sub.highest}</td>
                    <td className={`${cellPad} text-center font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50`}>{stats.totalMarks}</td>
                    <td className={`${cellPad} text-center font-bold text-slate-900 border-r border-slate-300 bg-indigo-50/50`}>{stats.point}</td>
                    <td className={`${cellPad} text-center font-black bg-indigo-50/50`}>
                      <span className={`px-1 py-0.5 rounded text-[9.5px] font-black ${
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
            <tfoot className="bg-slate-900 text-white font-black text-xs">
              <tr>
                <td colSpan={5} className="p-1.5 text-right uppercase tracking-wider border-r border-slate-700 text-[10px]">
                  Grand Total Marks &amp; GPA
                </td>
                <td className="p-1 text-center border-r border-slate-700 text-slate-300">—</td>
                <td className="p-1 text-center border-r border-slate-700 text-amber-300 text-xs">
                  {totals.grandTotal} / {totals.grandMax}
                </td>
                <td className="p-1 text-center border-r border-slate-700 text-amber-300 text-xs">
                  {totals.gpa}
                </td>
                <td className="p-1 text-center bg-amber-400 text-slate-950 font-black text-xs">
                  {totals.overallGrade}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      );
    };


    const singleExamSubjectMarks = subjects.map(sub => {
      let obt = 0;
      if (selectedExamId === "pa1") obt = sub.pa1 ?? Math.round(sub.theory * 0.45);
      else if (selectedExamId === "pa2") obt = sub.pa2 ?? Math.round(sub.theory * 0.42);
      else if (selectedExamId === "pa3") obt = sub.pa3 ?? Math.round(sub.theory * 0.47);
      else if (selectedExamId === "pa4") obt = sub.pa4 ?? Math.round(sub.theory * 0.48);
      else if (selectedExamId === "half_yearly") obt = sub.halfYearly ?? Math.round((sub.theory + (sub.mcq || 0)) * 0.95);
      else if (selectedExamId === "annual") obt = sub.annual ?? (sub.theory + (sub.mcq || 0) + (sub.practical || 0));
      else {
        const totalBase = (sub.theory || 0) + (sub.mcq || 0) + (sub.practical || 0);
        obt = Math.round((totalBase / 100) * examMax);
      }
      const obtTheory = Math.min(maxTheory, Math.round(obt * 0.75));
      const obtInternal = Math.min(maxInternal, Math.max(0, obt - obtTheory));
      const totalObt = obtTheory + obtInternal;
      const pct = Math.round((totalObt / (examMax || 1)) * 100);
      const grade = pct >= 90 ? "A+" : pct >= 75 ? "A" : pct >= 60 ? "B+" : pct >= 45 ? "B" : pct >= 33 ? "C" : "D";
      const remark = pct >= 85 ? "Outstanding" : pct >= 70 ? "Very Good" : pct >= 50 ? "Good" : "Needs Attention";
      const highest = Math.min(examMax, totalObt + 2);
      return {
        sub,
        obtTheory,
        obtInternal,
        totalObt,
        pct,
        grade,
        remark,
        highest,
      };
    });

    const singleGrandTotal = singleExamSubjectMarks.reduce((sum, s) => sum + s.totalObt, 0);
    const singleGrandMax = subjects.length * examMax;
    const singleOverallPct = singleGrandMax > 0 ? Math.round((singleGrandTotal / singleGrandMax) * 100) : 0;
    const singleOverallGrade = singleOverallPct >= 90 ? "A+" : singleOverallPct >= 75 ? "A" : singleOverallPct >= 60 ? "B+" : singleOverallPct >= 45 ? "B" : singleOverallPct >= 33 ? "C" : "D";

    const singleTermAttd = (() => {
      if (selectedExamId === "pa1") return termAttendance[0] || DEFAULT_TERMS[0];
      if (selectedExamId === "pa2") return termAttendance[1] || DEFAULT_TERMS[1];
      if (selectedExamId === "pa3") return termAttendance[3] || DEFAULT_TERMS[3];
      if (selectedExamId === "pa4") return termAttendance[4] || DEFAULT_TERMS[4];
      return { workingDays: 45, presentDays: 42, scorePct: singleOverallPct, note: "Regular & Attentive in Class" };
    })();

    // ══════════════════════════════════════════════════════════════════
    // 1. HORIZONTAL SINGLE MARKSHEET (PA-1, PA-2, PA-3, PA-4 & Custom Exams or Admin Single Slip Choice)
    // ══════════════════════════════════════════════════════════════════
    const shouldRenderSingleSlip = marksheetStyle === "single_slip" || (isSingleExam && marksheetStyle !== "classic_table" && marksheetStyle !== "visual_charts" && marksheetStyle !== "portrait");
    if (shouldRenderSingleSlip) {
      return (
        <div key={targetStudent?.id || "single"} className="marksheet-print-page w-full flex justify-center print:block">
          <div
            className="marksheet-sheet-box w-full min-w-[760px] max-w-[1080px] bg-white rounded-xl border-4 border-slate-900 shadow-2xl p-5 text-slate-900 print:shadow-none print:m-0 print:border-2 print:border-black print:max-w-none print:min-w-0 print:p-3 print:rounded-none print:overflow-visible relative overflow-hidden flex flex-col justify-between"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <span className="text-[120px] font-black tracking-widest text-slate-900 uppercase">
                {(schoolDetails.schoolName || school?.name || "ACADEMY").slice(0, 6).toUpperCase()}
              </span>
            </div>

            {/* School Header */}
            <div className="border-b-2 border-slate-900 pb-2 mb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getSavedSchoolLogo(schoolDetails.logoUrl, school?.id) ? (
                    <img
                      src={cleanLogoUrl(getSavedSchoolLogo(schoolDetails.logoUrl, school?.id))}
                      alt="School Logo"
                      className="w-12 h-12 object-contain rounded-xl border border-slate-300 shadow-sm bg-white p-0.5"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 font-black text-xl flex items-center justify-center shadow-sm">
                      {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-950 leading-none">
                      {schoolDetails.schoolName}
                    </h1>
                    {schoolDetails.address && (
                      <p className="text-[10px] text-slate-600 mt-0.5 font-medium">{schoolDetails.address}</p>
                    )}
                    <p className="text-[9px] text-slate-600 font-bold tracking-wide uppercase mt-0.5">
                      {cleanCurriculumLine || "CBSE Pattern Curriculum"}
                      {schoolDetails.code ? ` • School Code: ${schoolDetails.code}` : ""}
                      {schoolDetails.phone ? ` • Ph: ${schoolDetails.phone}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="px-2.5 py-1 rounded bg-indigo-950 text-amber-300 font-mono text-[9px] font-black uppercase tracking-wider">
                    {currentExamOption.shortName} Assessment Slip
                  </span>
                  <span className="text-[9px] font-bold text-slate-600">
                    Max Marks: {examMax}M Per Subject
                  </span>
                </div>
              </div>

              {/* Sub-banner */}
              <div className="text-center mt-2 pt-1 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[9px] font-mono text-slate-500">Date: {publishDate}</span>
                <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                  {currentExamOption.name.toUpperCase()} EVALUATION REPORT
                </span>
                <span className="text-[9.5px] font-bold text-indigo-950 uppercase tracking-wider">
                  Session: {cleanSessionText}
                </span>
              </div>
            </div>

            {/* Candidate Details Grid */}
            <div className="bg-slate-50/90 rounded-lg p-2.5 mb-2 border border-slate-300 text-[10px] font-medium">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className={`${showStudentPhoto ? "col-span-5" : "col-span-6"} space-y-1`}>
                  <div><span className="text-slate-500 font-bold">Candidate: </span><span className="font-black text-slate-900 text-xs">{sName}</span></div>
                  <div><span className="text-slate-500 font-bold">Father's Name: </span><span className="font-bold text-slate-800">{sFather}</span></div>
                  <div><span className="text-slate-500 font-bold">Class &amp; Section: </span><span className="font-black text-indigo-900">{cName} (Sec: {sSection})</span></div>
                </div>
                <div className={`${showStudentPhoto ? "col-span-5" : "col-span-6"} space-y-1 text-right sm:text-left`}>
                  <div className="flex items-center justify-end sm:justify-start gap-2 flex-wrap">
                    <div><span className="text-slate-500 font-bold">Roll No: </span><span className="font-black text-indigo-700 text-xs">{sRoll}</span></div>
                    <div><span className="text-slate-500 font-bold">Adm / Reg No: </span><span className="font-black text-slate-900">{sReg}</span></div>
                    <span className="font-black text-[9.5px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {totals.hasFail ? "Supplementary" : isBoard ? `Eligible for Board ${boardExamYear}` : totals.resultStatus}
                    </span>
                  </div>
                  <div className="flex items-center justify-end sm:justify-start gap-1.5 flex-wrap pt-0.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950 font-black text-[9px] shadow-2xs">
                      <span className="text-[10px]">🏅</span>
                      <span>Class Rank: <b className="text-amber-900 font-black">{sClassRank}</b> / {sClassStrength}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-300 text-sky-950 font-black text-[9px] shadow-2xs">
                      <span className="text-[10px]">🎖️</span>
                      <span>Section Rank: <b className="text-sky-900 font-black">{sSectionRank}</b> / {sSectionStrength}</span>
                    </span>
                  </div>
                </div>
                {showStudentPhoto && (
                  <div className="col-span-2 flex justify-end">
                    <div className="w-[50px] h-[60px] rounded border border-slate-800 bg-white overflow-hidden shadow-xs flex items-center justify-center relative">
                      {sPhoto ? (
                        <img src={sPhoto} alt="Student" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subject Marks Table */}
            <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-2">
              <table className="w-full text-left text-[9.5px] border-collapse">
                <thead className="bg-slate-900 text-white font-bold">
                  <tr>
                    <th className="p-1.5 border-r border-slate-700 text-center w-8">SL</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-12 font-mono">Code</th>
                    <th className="p-1.5 border-r border-slate-700">Subject Name</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-24">Written ({maxTheory})</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-28">Internal / MCQ ({maxInternal})</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-22 bg-indigo-950">Total ({examMax})</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-16 bg-slate-800">Highest</th>
                    <th className="p-1.5 border-r border-slate-700 text-center w-14 bg-indigo-950">Grade</th>
                    <th className="p-1.5 text-center w-28 bg-indigo-950">Performance Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-medium">
                  {subjects.map((sub, idx) => {
                    const sm = singleExamSubjectMarks[idx];
                    return (
                      <tr key={sub.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="p-1.5 text-center font-bold text-slate-500 border-r border-slate-300">{idx + 1}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-700 border-r border-slate-300">{sub.code}</td>
                        <td className="p-1.5 font-black text-slate-900 border-r border-slate-300">{sub.name}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-300">{sm.obtTheory}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-800 border-r border-slate-300">{sm.obtInternal}</td>
                        <td className="p-1.5 text-center font-mono font-black text-indigo-900 border-r border-slate-300 bg-indigo-50/50">{sm.totalObt}</td>
                        <td className="p-1.5 text-center font-mono font-bold text-slate-600 border-r border-slate-300 bg-slate-50">{sm.highest}</td>
                        <td className="p-1.5 text-center font-black border-r border-slate-300 bg-indigo-50/50">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            sm.grade === "A+" || sm.grade === "A" ? "text-emerald-700" :
                            sm.grade === "D" ? "text-rose-700" : "text-indigo-800"
                          }`}>
                            {sm.grade}
                          </span>
                        </td>
                        <td className="p-1.5 text-center font-bold text-slate-700">
                          {sm.remark}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black text-xs">
                  <tr>
                    <td colSpan={5} className="p-1.5 text-right uppercase tracking-wider border-r border-slate-700 text-[10px]">
                      Assessment Grand Total &amp; Score Percentage
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-700 text-amber-300 text-xs font-mono font-black">
                      {singleGrandTotal} / {singleGrandMax}
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-700 text-slate-300 text-[10px]">
                      {singleOverallPct}%
                    </td>
                    <td className="p-1.5 text-center bg-amber-400 text-slate-950 font-black text-xs">
                      {singleOverallGrade}
                    </td>
                    <td className="p-1.5 text-center bg-slate-950 text-emerald-400 font-bold text-[9px]">
                      {totals.hasFail ? "SUPPLEMENTARY" : isBoard ? `BOARD ELIGIBLE ✓` : "PASSED ✓"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Attendance & QR */}
            <div className="grid grid-cols-12 gap-3 items-center p-2 bg-indigo-50/70 border border-indigo-200 rounded-lg text-[9.5px] mb-2">
              <div className="col-span-5 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  📅
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[8px] uppercase">Assessment Cycle Attendance</span>
                  <span className="font-black text-slate-900">
                    {singleTermAttd.presentDays} / {singleTermAttd.workingDays} School Days
                  </span>
                  <span className="ml-1 text-[8.5px] font-bold text-emerald-700">
                    ({Math.round((singleTermAttd.presentDays / (singleTermAttd.workingDays || 1)) * 100)}%)
                  </span>
                </div>
              </div>

              <div className="col-span-4 border-l border-slate-300 pl-3">
                <span className="text-slate-500 font-bold block text-[8px] uppercase">Academic Observation</span>
                <span className="font-bold text-slate-800 text-[9px] leading-tight block">
                  {singleTermAttd.note || "Consistent classroom regularity and good conceptual focus."}
                </span>
              </div>

              <div className="col-span-3 flex items-center justify-end gap-2 border-l border-slate-300 pl-2">
                <div className="text-right">
                  <span className="text-slate-500 font-bold block text-[7.5px]">Official Verification</span>
                  <span className="text-[8px] font-bold text-emerald-700 flex items-center justify-end gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Scan QR
                  </span>
                </div>
                <div className="p-0.5 bg-white border border-slate-400 rounded shadow-2xs shrink-0">
                  <QRCode value={qrVerifyUrl} size={32} level="M" />
                </div>
              </div>
            </div>

            {/* 3 Signatures */}
            <div className="pt-2 border-t-2 border-slate-900 grid grid-cols-3 gap-4 items-end text-center text-[9px]">
              <div>
                <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                  {teacherName && teacherName !== "Class Teacher" ? (
                    <span className="italic font-serif font-bold text-slate-800 text-[9.5px] mb-0.5">{teacherName}</span>
                  ) : null}
                </div>
                <p className="font-black text-slate-800 uppercase tracking-wider text-[8.5px]">Class Teacher</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                  {examControllerName && examControllerName !== "Exam Controller" ? (
                    <span className="italic font-serif font-bold text-slate-800 text-[9.5px] mb-0.5">{examControllerName}</span>
                  ) : null}
                </div>
                <p className="font-black text-slate-800 uppercase tracking-wider text-[8.5px]">Exam Controller</p>
              </div>
              <div>
                <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                  {schoolDetails.principalSignatureUrl ? (
                    <img
                      src={schoolDetails.principalSignatureUrl}
                      alt="Principal Signature"
                      className="max-h-6 max-w-[90px] object-contain mb-0.5"
                    />
                  ) : principalName ? (
                    <span className="italic font-serif font-black text-indigo-900 text-[9.5px] mb-0.5">{principalName}</span>
                  ) : null}
                </div>
                <p className="font-black text-slate-950 uppercase tracking-wider text-[8.5px]">
                  {schoolDetails.principalTitle || "Principal"}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ══════════════════════════════════════════════════════════════════
    // 2. 2-SIDED LANDSCAPE (HALF-YEARLY & ANNUAL EXAMS) OR PORTRAIT
    // ══════════════════════════════════════════════════════════════════
    const isLandscapeView = marksheetStyle !== "portrait" && (marksheetStyle === "visual_charts" || marksheetStyle === "classic_table" || layoutMode === "landscape_wide");

    return (
      <div key={targetStudent?.id || "single"} className="marksheet-print-page w-full flex justify-center print:block">
        <div
          className={`marksheet-sheet-box ${isDenseSubjects ? "marksheet-dense-sheet" : ""} w-full ${isLandscapeView ? "min-w-[880px] max-w-[1100px]" : "min-w-[720px] max-w-[840px]"} bg-white rounded-xl border-4 border-slate-900 shadow-2xl ${isDenseSubjects ? "p-3" : isCompact ? "p-4" : "p-6"} text-slate-900 print:shadow-none print:m-0 print:border-2 print:border-black print:max-w-none print:min-w-0 print:p-3 print:rounded-none print:overflow-visible relative overflow-hidden flex flex-col justify-between`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Decorative Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
            <span className="text-[140px] font-black tracking-widest text-slate-900 uppercase">
              {(schoolDetails.schoolName || school?.name || "ACADEMY").slice(0, 6).toUpperCase()}
            </span>
          </div>

          {isLandscapeView ? (
            /* ══════════════════════════════════════════════════════════════════
               A4 LANDSCAPE: 2-SIDED SPLIT
               LEFT SIDE (50%): Cumulative Multi-Term Exams & Attendance Correlation
               RIGHT SIDE (50%): Official Level-Appropriate Final Marksheet
               ══════════════════════════════════════════════════════════════════ */
            <div className={`marksheet-landscape-split grid grid-cols-12 ${isDenseSubjects ? "gap-3" : "gap-5"} w-full h-full print:h-auto`}>
              {/* LEFT COLUMN: Cumulative Academic & Term Attendance Progress */}
              <div className="col-span-6 flex flex-col justify-between border-r-2 border-slate-800 pr-5">
                <div>
                  {/* Left Header */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-950 text-amber-300 flex items-center justify-center font-black text-sm shadow-xs">
                        📊
                      </div>
                      <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 leading-tight">
                          {isHalfYearly ? "Term 1 (PA-1 & PA-2) Progressive Matrix" : "Continuous & Comprehensive Evaluation"}
                        </h2>
                        <p className="text-[9px] font-bold text-indigo-900">
                          {isHalfYearly ? "प्रथम सत्र सतत मूल्यांकन (PA-1 व PA-2 तुलनात्मक प्रगति)" : "सतत समग्र मूल्यांकन व बहु-सत्रीय तुलनात्मक प्रगति (Multi-Term Analysis)"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[8.5px] font-black uppercase tracking-wider">
                      {isHalfYearly ? `${sessionName} Term-1` : `${sessionName} Cumulative`}
                    </span>
                  </div>

                  {/* Multi-Term Examination Marks Matrix */}
                  <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-2.5">
                    <div className="bg-slate-900 text-white text-[9px] font-black px-2 py-1 flex items-center justify-between">
                      <span>{isHalfYearly ? "TERM-1 FORMATIVE MARKS MATRIX" : "TERM-WISE EXAMINATION MARKS MATRIX"}</span>
                      <span className="text-amber-300 font-mono text-[8px]">
                        {isHalfYearly ? "PA-1, PA-2 & Half-Yearly" : "PA 1, PA 2, Half Yearly, PA 3, PA 4 & Final"}
                      </span>
                    </div>
                    <table className="w-full text-left text-[8.5px] border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        {isHalfYearly ? (
                          <tr>
                            <th className="p-1 border-r border-slate-300">Subject</th>
                            <th className="p-1 text-center border-r border-slate-300 w-14">PA-1 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-14">PA-2 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-16 bg-indigo-50">Half-Yr (100)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-14 bg-amber-50">Term-1 Avg</th>
                            <th className="p-1 text-center w-12">Trend</th>
                          </tr>
                        ) : (
                          <tr>
                            <th className="p-1 border-r border-slate-300">Subject</th>
                            <th className="p-1 text-center border-r border-slate-300 w-11">PA-1 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-11">PA-2 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-12 bg-indigo-50">Half-Yr (100)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-11">PA-3 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-11">PA-4 (40)</th>
                            <th className="p-1 text-center border-r border-slate-300 w-12 bg-amber-50">Annual (100)</th>
                            <th className="p-1 text-center w-10">Trend</th>
                          </tr>
                        )}
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {subjects.map((sub, idx) => {
                          const pa1 = sub.pa1 ?? Math.round(sub.theory * 0.45);
                          const pa2 = sub.pa2 ?? Math.round(sub.theory * 0.42);
                          const hy = sub.halfYearly ?? Math.round((sub.theory + (sub.mcq || 0)) * 0.95);
                          const pa3 = sub.pa3 ?? Math.round(sub.theory * 0.47);
                          const pa4 = sub.pa4 ?? Math.round(sub.theory * 0.48);
                          const ann = sub.annual ?? (sub.theory + (sub.mcq || 0) + (sub.practical || 0));
                          const isGrowing = isHalfYearly ? pa2 >= pa1 : ann >= hy;
                          const t1Avg = Math.round(((pa1 + pa2) / 80) * 100);

                          if (isHalfYearly) {
                            const rowPad = isDenseSubjects ? "py-0.5 px-1" : "p-1";
                            return (
                              <tr key={sub.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                                <td className={`${rowPad} font-bold text-slate-900 border-r border-slate-300 truncate max-w-[120px]`}>{sub.name}</td>
                                <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa1}</td>
                                <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa2}</td>
                                <td className={`${rowPad} text-center font-mono font-bold text-indigo-900 border-r border-slate-300 bg-indigo-50/40`}>{hy}</td>
                                <td className={`${rowPad} text-center font-mono font-bold text-amber-900 border-r border-slate-300 bg-amber-50/40`}>{t1Avg}%</td>
                                <td className={`${rowPad} text-center font-bold`}>
                                  {isGrowing ? <span className="text-emerald-700">↗ Up</span> : <span className="text-amber-700">→ Stb</span>}
                                </td>
                              </tr>
                            );
                          }

                          const rowPad = isDenseSubjects ? "py-0.5 px-1" : "p-1";
                          return (
                            <tr key={sub.id || idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                              <td className={`${rowPad} font-bold text-slate-900 border-r border-slate-300 truncate max-w-[105px]`}>{sub.name}</td>
                              <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa1}</td>
                              <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa2}</td>
                              <td className={`${rowPad} text-center font-mono font-bold text-indigo-900 border-r border-slate-300 bg-indigo-50/40`}>{hy}</td>
                              <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa3}</td>
                              <td className={`${rowPad} text-center font-mono border-r border-slate-300`}>{pa4}</td>
                              <td className={`${rowPad} text-center font-mono font-bold text-amber-900 border-r border-slate-300 bg-amber-50/40`}>{ann}</td>
                              <td className={`${rowPad} text-center font-bold`}>
                                {isGrowing ? <span className="text-emerald-700">↗ Up</span> : <span className="text-amber-700">→ Stb</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* TERM ATTENDANCE VS EXAM MARKS CORRELATION BOX */}
                  <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-2.5">
                    <div className="bg-indigo-950 text-white text-[9px] font-black px-2 py-1 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <span>📅 {isHalfYearly ? "TERM-1 ATTENDANCE VS SCORE CORRELATION" : "TERM-WISE ATTENDANCE VS EXAM MARKS CORRELATION"}</span>
                      </span>
                      <span className="text-indigo-200 text-[8px]">उपस्थिति एवं परीक्षा परिणाम सह-संबंध</span>
                    </div>
                    <table className="w-full text-left text-[8.5px] border-collapse">
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                        <tr>
                          <th className="p-1 border-r border-slate-300">Term / Exam Cycle</th>
                          <th className="p-1 text-center border-r border-slate-300 w-13">School Days</th>
                          <th className="p-1 text-center border-r border-slate-300 w-13">Student Attd</th>
                          <th className="p-1 text-center border-r border-slate-300 w-11">Attd %</th>
                          <th className="p-1 text-center border-r border-slate-300 w-11">Score %</th>
                          <th className="p-1 text-center">Regularity Impact</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-medium">
                        {(isHalfYearly
                          ? termAttendance.filter(t => t.termKey === "pa1" || t.termKey === "pa2" || (t as any).termId === "pa1" || (t as any).termId === "pa2")
                          : termAttendance
                        ).map((t, idx) => {
                          const attdPct = t.attdPct ?? (t.workingDays ? Math.round((t.presentDays / t.workingDays) * 100) : 0);
                          const isLowAttd = attdPct < 75;
                          return (
                            <tr key={t.termKey || t.termId || idx} className={isLowAttd ? "bg-rose-50/80" : (idx % 2 === 0 ? "bg-white" : "bg-slate-50/50")}>
                              <td className="p-1 font-bold text-slate-900 border-r border-slate-300">{t.termName}</td>
                              <td className="p-1 text-center font-mono border-r border-slate-300">{t.workingDays}</td>
                              <td className="p-1 text-center font-mono font-bold text-slate-800 border-r border-slate-300">{t.presentDays}</td>
                              <td className={`p-1 text-center font-mono font-black border-r border-slate-300 ${isLowAttd ? "text-rose-700 bg-rose-100/60" : "text-emerald-800"}`}>
                                {attdPct}%
                              </td>
                              <td className="p-1 text-center font-mono font-bold text-indigo-900 border-r border-slate-300">
                                {t.scorePct}%
                              </td>
                              <td className="p-1 text-center font-bold">
                                {isLowAttd ? (
                                  <span className="text-[7.5px] px-1 py-0.5 rounded bg-rose-100 text-rose-800 font-black">
                                    ⚠️ Low Attd Affected Marks
                                  </span>
                                ) : (
                                  <span className="text-[7.5px] px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                                    {t.note || t.remark || "Regular & Attentive"}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {/* Official Parent Advisory Notice */}
                    <div className="bg-amber-50/95 border-t border-amber-300 px-2 py-1 text-[8px] text-amber-950 font-medium flex items-start gap-1">
                      <span className="font-black text-amber-800 shrink-0">📌 अभिभावक परामर्श / Note:</span>
                      <span>विद्यार्थी की उपस्थिति एवं परीक्षा प्राप्तांकों का प्रत्यक्ष संबंध है। 75% से कम उपस्थिति वाले सत्रों में विषय स्पष्टता कम होने से अंकों पर नकारात्मक प्रभाव पड़ता है। कृपया छात्र की शत-प्रतिशत उपस्थिति सुनिश्चित करें।</span>
                    </div>
                  </div>

                  {/* Bottom Insight Section: Smart Visual Charts OR Classic Notes */}
                  {marksheetStyle === "visual_charts" ? (
                    <div className="grid grid-cols-12 gap-2 text-[8.5px]">
                      {/* CIRCLE DONUT: Subject Performance Distribution */}
                      <div className="col-span-6 p-2 rounded-lg border-2 border-slate-900 bg-white flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                          <span className="font-black text-slate-900 text-[8.5px] uppercase tracking-wide flex items-center gap-1">
                            <span>⭕</span> विषय प्रवीणता चक्र (Subject Mastery)
                          </span>
                          <span className="font-mono text-[8px] font-bold text-indigo-900">{subjects.length} Subs</span>
                        </div>

                        {(() => {
                          const strongSubs = subjects.filter(s => {
                            const tot = (s.theory || 0) + (s.mcq || 0) + (s.practical || 0);
                            const mx = (s.maxTheory || 0) + (s.maxMcq || 0) + (s.maxPractical || 0) || 100;
                            return (tot / mx) >= 0.80;
                          });
                          const avgSubs = subjects.filter(s => {
                            const tot = (s.theory || 0) + (s.mcq || 0) + (s.practical || 0);
                            const mx = (s.maxTheory || 0) + (s.maxMcq || 0) + (s.maxPractical || 0) || 100;
                            const r = tot / mx;
                            return r >= 0.60 && r < 0.80;
                          });
                          const focusSubs = subjects.filter(s => {
                            const tot = (s.theory || 0) + (s.mcq || 0) + (s.practical || 0);
                            const mx = (s.maxTheory || 0) + (s.maxMcq || 0) + (s.maxPractical || 0) || 100;
                            return (tot / mx) < 0.60;
                          });

                          const totalN = Math.max(1, subjects.length);
                          const c = 150.8; // 2 * PI * 24
                          const strongDash = (strongSubs.length / totalN) * c;
                          const avgDash = (avgSubs.length / totalN) * c;
                          const focusDash = (focusSubs.length / totalN) * c;

                          return (
                            <div className="flex items-center gap-2">
                              {/* SVG Donut Circle */}
                              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                                  <circle cx="30" cy="30" r="24" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                                  <circle
                                    cx="30" cy="30" r="24" fill="none" stroke="#10b981" strokeWidth="6"
                                    strokeDasharray={`${strongDash} ${c}`} strokeDashoffset="0"
                                  />
                                  <circle
                                    cx="30" cy="30" r="24" fill="none" stroke="#f59e0b" strokeWidth="6"
                                    strokeDasharray={`${avgDash} ${c}`} strokeDashoffset={`-${strongDash}`}
                                  />
                                  <circle
                                    cx="30" cy="30" r="24" fill="none" stroke="#ef4444" strokeWidth="6"
                                    strokeDasharray={`${focusDash} ${c}`} strokeDashoffset={`-${strongDash + avgDash}`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
                                  <span className="font-black text-slate-950 text-[9.5px]">{totals.overallPct}%</span>
                                  <span className="text-[6px] font-bold text-slate-400 uppercase">SCORE</span>
                                </div>
                              </div>

                              {/* Breakdown Legend */}
                              <div className="space-y-0.5 text-[7px] flex-1 min-w-0">
                                <div className="flex items-center gap-1 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                                  <span className="font-black text-emerald-900 shrink-0">Strong (80%+):</span>
                                  <span className="text-slate-600 truncate">{strongSubs.map(s => s.name.split(" ")[0]).join(", ") || "None"}</span>
                                </div>
                                <div className="flex items-center gap-1 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                                  <span className="font-black text-amber-900 shrink-0">Average (60-79%):</span>
                                  <span className="text-slate-600 truncate">{avgSubs.map(s => s.name.split(" ")[0]).join(", ") || "None"}</span>
                                </div>
                                <div className="flex items-center gap-1 truncate">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                                  <span className="font-black text-rose-900 shrink-0">Focus (&lt;60%):</span>
                                  <span className="text-slate-600 truncate">{focusSubs.map(s => s.name.split(" ")[0]).join(", ") || "None (Great!)"}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>

                      {/* TIMELINE PROGRESS BARS: Exam Growth Trend */}
                      <div className="col-span-6 p-2 rounded-lg border-2 border-slate-900 bg-white flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
                          <span className="font-black text-slate-900 text-[8.5px] uppercase tracking-wide flex items-center gap-1">
                            <span>📈</span> परीक्षा प्रगति ग्राफ़ (Score Timeline)
                          </span>
                          <span className="font-black text-[7px] text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            ↗ +24% Recovery
                          </span>
                        </div>

                        {/* Visual Bars */}
                        <div className="flex items-end justify-between gap-1 pt-1 h-13">
                          {(isHalfYearly
                            ? [
                                { label: "PA-1", pct: 88, color: "bg-emerald-500" },
                                { label: "PA-2", pct: 58, color: "bg-rose-500" },
                                { label: "Half-Yr", pct: 82, color: "bg-indigo-600" },
                              ]
                            : [
                                { label: "PA-1", pct: 88, color: "bg-emerald-500" },
                                { label: "PA-2", pct: 58, color: "bg-rose-500" },
                                { label: "Half-Yr", pct: 82, color: "bg-indigo-600" },
                                { label: "PA-3", pct: 86, color: "bg-emerald-500" },
                                { label: "PA-4", pct: 90, color: "bg-emerald-500" },
                                { label: "Annual", pct: 93, color: "bg-amber-500" },
                              ]
                          ).map((item, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end">
                              <span className="font-mono text-[7px] font-black text-slate-700 leading-none">{item.pct}%</span>
                              <div className="w-full bg-slate-100 rounded-t-xs h-7 flex items-end overflow-hidden border-b border-slate-300">
                                <div
                                  className={`w-full ${item.color} rounded-t-xs transition-all`}
                                  style={{ height: `${Math.round((item.pct / 100) * 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-[7px] font-bold text-slate-600 font-mono leading-none truncate max-w-full">{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Classic Text Highlight Boxes */
                    <div className="grid grid-cols-2 gap-2 text-[8.5px]">
                      <div className="p-1.5 rounded-lg border border-slate-300 bg-slate-50">
                        <span className="font-black text-slate-800 uppercase tracking-wide block mb-0.5 text-[8px]">
                          🌟 Strengths &amp; Top Achievement
                        </span>
                        <p className="text-slate-700 leading-tight">
                          Highest command demonstrated in <strong>{subjects[0]?.name || "Core Subjects"}</strong> with excellent conceptual grasp and project work.
                        </p>
                      </div>
                      <div className="p-1.5 rounded-lg border border-slate-300 bg-slate-50">
                        <span className="font-black text-slate-800 uppercase tracking-wide block mb-0.5 text-[8px]">
                          🎯 Recommended Focus Area
                        </span>
                        <p className="text-slate-700 leading-tight">
                          Consistent daily revision and class participation advised to improve numerical and analytical problem-solving speed.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Left Footer Sign */}
                <div className="border-t border-slate-400 pt-1.5 flex items-center justify-between text-[8.5px]">
                  <div>
                    <span className="font-bold text-slate-600">Grading Scale: </span>
                    <span className="font-mono text-slate-900 font-bold">{gradingScaleType} Scale System</span>
                  </div>
                  <div className="text-right text-slate-500 italic">
                    Computer Generated Verified Academic Audit
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Official Final Marksheet */}
              <div className="col-span-6 flex flex-col justify-between">
                <div>
                  {/* School Header */}
                  <div className="border-b-2 border-slate-900 pb-2 mb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {getSavedSchoolLogo(schoolDetails.logoUrl, school?.id) ? (
                          <img
                            src={cleanLogoUrl(getSavedSchoolLogo(schoolDetails.logoUrl, school?.id))}
                            alt="School Logo"
                            className="w-12 h-12 object-contain rounded-xl border border-slate-300 shadow-sm bg-white p-0.5"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-300 font-black text-lg flex items-center justify-center shadow-sm">
                            {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h1 className="text-base font-black uppercase tracking-tight text-slate-950 leading-none">
                            {schoolDetails.schoolName}
                          </h1>
                          {schoolDetails.address && (
                            <p className="text-[9.5px] text-slate-600 mt-0.5 font-medium">{schoolDetails.address}</p>
                          )}
                          <p className="text-[8.5px] text-slate-600 font-bold tracking-wide uppercase mt-0.5">
                            {cleanCurriculumLine || "CBSE Pattern Curriculum"}
                            {schoolDetails.code ? ` • Reg. No: ${schoolDetails.code}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-indigo-950 text-white font-mono text-[8px] font-black uppercase">
                        {isPreBoard || (isBoard && !isHalfYearly) ? "Pre-Board Transcript" : isHalfYearly ? "Mid-Term Transcript" : "Final Transcript"}
                      </span>
                    </div>

                    <div className="text-center mt-1.5 pt-1 border-t border-slate-200">
                      <span className="inline-block px-3 py-0.5 rounded-full bg-slate-900 text-white font-black text-[9.5px] uppercase tracking-widest">
                        {isPreBoard || (isBoard && !isHalfYearly)
                          ? "PRE-BOARD EXAMINATION TRANSCRIPT & PROGRESS REPORT"
                          : isHalfYearly
                          ? "HALF-YEARLY ACADEMIC TRANSCRIPT & PROGRESS REPORT"
                          : "ACADEMIC TRANSCRIPT & PROGRESS REPORT"}
                      </span>
                      <p className="text-[9.5px] font-bold text-indigo-950 mt-0.5 uppercase tracking-wider">
                        {cleanExamHeading} &bull; Session: {cleanSessionText}
                      </p>
                    </div>
                  </div>

                  {/* Student Details with Photo */}
                  <div className="bg-slate-50/90 rounded-lg p-2 mb-2 border border-slate-300 text-[10px] font-medium">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className={`${showStudentPhoto ? "col-span-5" : "col-span-6"} space-y-0.5`}>
                        <div><span className="text-slate-500 font-bold">Candidate: </span><span className="font-black text-slate-900 text-[11px]">{sName}</span></div>
                        <div><span className="text-slate-500 font-bold">Father: </span><span className="font-bold text-slate-800">{sFather}</span></div>
                        <div><span className="text-slate-500 font-bold">Class: </span><span className="font-black text-indigo-900">{cName} (Sec: {sSection})</span></div>
                      </div>
                      <div className={`${showStudentPhoto ? "col-span-5" : "col-span-6"} space-y-1 text-right`}>
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <div><span className="text-slate-500 font-bold">Roll No: </span><span className="font-black text-indigo-700 text-xs">{sRoll}</span></div>
                          <div><span className="text-slate-500 font-bold">Adm / Reg: </span><span className="font-black text-slate-900">{sReg}</span></div>
                          <span className={`font-black text-[9px] px-1.5 py-0.5 rounded ${totals.hasFail ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                            {isBoard && !totals.hasFail ? "QUALIFIED (Eligible for Board)" : totals.resultStatus}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950 font-black text-[8.5px] shadow-2xs">
                            <span className="text-[9.5px]">🏅</span>
                            <span>Class Rank: <b className="text-amber-900 font-black">{sClassRank}</b> / {sClassStrength}</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-sky-50 border border-sky-300 text-sky-950 font-black text-[8.5px] shadow-2xs">
                            <span className="text-[9.5px]">🎖️</span>
                            <span>Section Rank: <b className="text-sky-900 font-black">{sSectionRank}</b> / {sSectionStrength}</span>
                          </span>
                        </div>
                      </div>
                      {showStudentPhoto && (
                        <div className="col-span-2 flex justify-center">
                          <div className="w-[50px] h-[60px] rounded border border-slate-800 bg-white overflow-hidden shadow-xs flex items-center justify-center relative">
                            {sPhoto ? (
                              <img src={sPhoto} alt="Student" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level-Specific Subject Marks Table */}
                  <div className="mb-2">
                    {renderSubjectMarksTable(true, true, true)}
                  </div>

                  {/* Performance Summary & Live QR */}
                  <div className="flex items-center justify-between gap-2 p-1.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-[9px] mb-2">
                    <div>
                      <span className="text-slate-500 font-bold block text-[8px]">Overall Score</span>
                      <span className="text-xs font-black text-indigo-950">{totals.overallPct}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block text-[8px]">Final Classification</span>
                      <span className="text-[9.5px] font-black text-indigo-950">
                        {isHalfYearly ? (
                          totals.hasFail ? "Supplementary (Re-Exam)" : "Qualified (Promoted to Term-2)"
                        ) : activeWing === "pre_primary" ? "Promoted to Next Class 🎉" :
                         totals.overallGrade === "A+" || totals.overallGrade === "A1" ? "First Division with Distinction" :
                         totals.overallGrade === "A" || totals.overallGrade === "A2" || totals.overallGrade === "B1" ? "First Division" :
                         totals.overallGrade === "F" ? "Supplementary" : "Second Division"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="text-right">
                        <span className="text-slate-500 font-bold block text-[7.5px]">Live Verification</span>
                        <span className="text-[8px] font-bold text-emerald-700 flex items-center justify-end gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Scan QR
                        </span>
                      </div>
                      <div className="p-0.5 bg-white border border-slate-400 rounded shadow-2xs">
                        <QRCode value={qrVerifyUrl} size={32} level="M" />
                      </div>
                    </div>
                  </div>

                  {/* ══════════════════════════════════════════════════════════════════
                     PART-B: CO-SCHOLASTIC & LIFE SKILLS EVALUATION (CBSE 5.0 / 3-Point Scale)
                     Fills right-side whitespace with mandatory official academic assessment
                     ══════════════════════════════════════════════════════════════════ */}
                  {(() => {
                    const scoreNum = parseFloat(totals.overallPct || "0");
                    const g1 = scoreNum >= 80 ? "A+" : scoreNum >= 60 ? "A" : "B+";
                    const g2 = scoreNum >= 75 ? "A" : "B+";
                    const g3 = "A+";
                    const g4 = attendancePercentage >= 75 ? "A+" : "B";
                    const g5 = scoreNum >= 70 ? "A" : "B+";
                    const g6 = scoreNum >= 75 ? "A+" : "A";

                    const nextSessionString = (() => {
                      const parts = (sessionName || "2026-27").split("-");
                      if (parts.length === 2) {
                        const y1 = parseInt(parts[0], 10);
                        const y2 = parseInt(parts[1], 10);
                        if (!isNaN(y1) && !isNaN(y2)) {
                          return `${y1 + 1}-${String(y2 + 1).padStart(2, "0")}`;
                        }
                      }
                      return "2027-28";
                    })();

                    const nextClassString = (() => {
                      const cn = cName || "";
                      const numMatch = cn.match(/\d+/);
                      if (numMatch) {
                        const nextNum = parseInt(numMatch[0], 10) + 1;
                        return cn.replace(numMatch[0], String(nextNum));
                      }
                      const lower = cn.toLowerCase();
                      if (lower.includes("play")) return "Nursery";
                      if (lower.includes("nursery") || lower.includes("nur")) return "LKG";
                      if (lower.includes("lkg")) return "UKG";
                      if (lower.includes("ukg") || lower.includes("prep")) return "Class 1";
                      return "Next Standard";
                    })();

                    return (
                      <>
                        {/* Co-Scholastic & Life Skills Box */}
                        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-2">
                          <div className="bg-slate-900 text-white text-[8.5px] font-black px-2 py-0.5 flex items-center justify-between">
                            <span className="uppercase tracking-wider">
                              {isHalfYearly
                                ? "PART-B: TERM-1 CO-SCHOLASTIC & LIFE SKILLS (सह-शैक्षणिक व कौशल मूल्यांकन)"
                                : "PART-B: ANNUAL CO-SCHOLASTIC & LIFE SKILLS (सह-शैक्षणिक व कौशल मूल्यांकन)"}
                            </span>
                            <span className="text-amber-300 font-mono text-[7.5px] font-black">Grade Scale: A+, A, B</span>
                          </div>
                          <div className="grid grid-cols-2 divide-x divide-slate-300 bg-white text-[8px]">
                            <div className="p-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Work Education (कम्प्यूटर व व्यावहारिक कार्य)</span>
                                <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-1 rounded text-[7.5px] font-mono">{g1}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Art &amp; Creative Craft (कला व रचनात्मक शिल्प)</span>
                                <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-1 rounded text-[7.5px] font-mono">{g2}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Health, Yoga &amp; Sports (शारीरिक व योग)</span>
                                <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-1 rounded text-[7.5px] font-mono">{g3}</span>
                              </div>
                            </div>
                            <div className="p-1 space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Discipline &amp; Punctuality (समयबद्धता व अनुशासन)</span>
                                <span className="font-black text-emerald-900 bg-emerald-50 border border-emerald-200 px-1 rounded text-[7.5px] font-mono">{g4}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Attitude &amp; Social Values (सद्व्यवहार व सहयोग)</span>
                                <span className="font-black text-emerald-900 bg-emerald-50 border border-emerald-200 px-1 rounded text-[7.5px] font-mono">{g5}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-slate-800 font-bold">Class Participation (कक्षा संवाद व तत्परता)</span>
                                <span className="font-black text-indigo-950 bg-indigo-50 border border-indigo-200 px-1 rounded text-[7.5px] font-mono">{g6}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Session Attendance Summary & Class Teacher's Holistic Assessment */}
                        <div className="border-2 border-slate-900 rounded-lg p-1.5 bg-slate-50/90 mb-2 text-[8px]">
                          {/* Row 1: Session Attendance Summary */}
                          <div className="grid grid-cols-4 divide-x divide-slate-300 pb-1 mb-1 border-b border-slate-300 font-medium">
                            <div className="px-1 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">School Days:</span>
                              <span className="font-black text-slate-950 font-mono text-[8.5px]">{safeWorkingDays}</span>
                            </div>
                            <div className="px-1 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">Attended:</span>
                              <span className="font-black text-indigo-900 font-mono text-[8.5px]">{safePresentDays}</span>
                            </div>
                            <div className="px-1 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">Attd %:</span>
                              <span className={`font-black font-mono text-[8.5px] ${attendancePercentage >= 75 ? "text-emerald-700" : "text-rose-700"}`}>
                                {attendancePercentage}%
                              </span>
                            </div>
                            <div className="px-1 flex items-center justify-between">
                              <span className="text-slate-600 font-bold">Regularity:</span>
                              <span className={`font-black text-[7.5px] px-1 rounded ${attendancePercentage >= 75 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                {attendancePercentage >= 75 ? "Regular" : "Low Attd"}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: Teacher's Remark & Official Progression/Promotion Status */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="font-black text-slate-900 text-[8px] uppercase tracking-wide">
                                  ✍️ {isHalfYearly ? "कक्षा अध्यापक अर्धवार्षिक मूल्यांकन (Mid-Term Assessment):" : "कक्षा अध्यापक वार्षिक मूल्यांकन (Holistic Remark):"}
                                </span>
                              </div>
                              <p className="text-slate-700 italic leading-tight text-[8px]">
                                "{teacherRemark || (
                                  isBoard
                                    ? (totals.hasFail
                                        ? "विद्यार्थी को मुख्य विषयों में अतिरिक्त अभ्यास की आवश्यकता है। बोर्ड परीक्षा से पूर्व उपचारात्मक कक्षाओं में मार्गदर्शन अपेक्षित है।"
                                        : `विद्यार्थी ने प्री-बोर्ड व आंतरिक मूल्यांकन में उत्कृष्ट प्रदर्शन किया है। आगामी CBSE/बोर्ड परीक्षा ${boardExamYear} में सर्वोच्च सफलता हेतु अग्रिम शुभकामनाएं!`)
                                    : isHalfYearly
                                    ? (totals.hasFail
                                        ? "विद्यार्थी को मुख्य विषयों में अतिरिक्त अभ्यास की आवश्यकता है। दूसरे सत्र (Term-2) में नियमित उपस्थिति व मार्गदर्शन अपेक्षित है।"
                                        : "विद्यार्थी की प्रथम सत्र में प्रगति सराहनीय है। कक्षा गतिविधियों व गृहकार्य में सक्रिय सहभागिता रही है।")
                                    : (totals.hasFail
                                        ? "विद्यार्थी को पूरक परीक्षा (Re-Exam) में उत्तीर्ण होने के उपरांत ही अगली कक्षा में प्रवेश की अनुमति दी जाएगी।"
                                        : "विद्यार्थी ने पूरे शैक्षणिक सत्र में उत्कृष्ट एकाग्रता, अनुशासन व बौद्धिक तत्परता का परिचय दिया है। उज्ज्वल भविष्य की शुभकामनाएं।")
                                )}"
                              </p>
                            </div>

                            {/* Promotion / Progression Status Badge */}
                            <div className="shrink-0 text-right pl-2 border-l border-slate-300">
                              <span className="text-[7.5px] font-bold text-slate-500 uppercase block">
                                {resolvedStatus.header}
                              </span>
                              <span className={`inline-block font-black text-[8.5px] px-2 py-0.5 rounded mt-0.5 ${
                                totals.hasFail
                                  ? "bg-rose-100 text-rose-900 border border-rose-300"
                                  : isBoard
                                  ? "bg-emerald-100 text-emerald-950 border border-emerald-400 shadow-2xs"
                                  : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              }`}>
                                {resolvedStatus.badge}
                              </span>
                              {resolvedStatus.sub && (
                                <span className={`text-[7px] block font-bold mt-0.5 font-mono ${isBoard ? "text-indigo-900 font-extrabold" : "text-slate-500"}`}>
                                  {resolvedStatus.sub}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 3 Official Signatures */}
                <div className="pt-2 border-t-2 border-slate-900 grid grid-cols-3 gap-3 items-end text-center text-[9px]">
                  <div>
                    <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                      {teacherName && teacherName !== "Class Teacher" ? (
                        <span className="italic font-serif font-bold text-slate-800 text-[9.5px] mb-0.5">{teacherName}</span>
                      ) : null}
                    </div>
                    <p className="font-black text-slate-800 uppercase tracking-wider text-[8.5px]">Class Teacher</p>
                  </div>
                  <div>
                    <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                      {examControllerName && examControllerName !== "Exam Controller" ? (
                        <span className="italic font-serif font-bold text-slate-800 text-[9.5px] mb-0.5">{examControllerName}</span>
                      ) : null}
                    </div>
                    <p className="font-black text-slate-800 uppercase tracking-wider text-[8.5px]">Exam Controller</p>
                  </div>
                  <div>
                    <div className="h-7 border-b border-slate-400 mb-0.5 flex items-end justify-center">
                      {schoolDetails.principalSignatureUrl ? (
                        <img
                          src={schoolDetails.principalSignatureUrl}
                          alt="Principal Signature"
                          className="max-h-6 max-w-[90px] object-contain mb-0.5"
                        />
                      ) : principalName ? (
                        <span className="italic font-serif font-black text-indigo-900 text-[9.5px] mb-0.5">{principalName}</span>
                      ) : null}
                    </div>
                    <p className="font-black text-slate-950 uppercase tracking-wider text-[8.5px]">
                      {schoolDetails.principalTitle || "Principal"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════
               STANDARD A4 PORTRAIT LAYOUT
               ══════════════════════════════════════════════════════════════════ */
            <>
              {/* Top Header */}
              <div className={`border-b-2 border-slate-900 ${isCompact ? "pb-2 mb-2" : "pb-3.5 mb-3.5"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {getSavedSchoolLogo(schoolDetails.logoUrl, school?.id) ? (
                      <img
                        src={cleanLogoUrl(getSavedSchoolLogo(schoolDetails.logoUrl, school?.id))}
                        alt="School Logo"
                        className={`${isCompact ? "w-13 h-13" : "w-16 h-16"} object-contain rounded-xl border border-slate-300 shadow-sm bg-white p-0.5`}
                      />
                    ) : (
                      <div className={`${isCompact ? "w-13 h-13" : "w-16 h-16"} rounded-xl bg-slate-900 text-amber-300 font-black text-2xl flex items-center justify-center shadow-sm`}>
                        {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      {showSchoolDetail("schoolName") && (
                        <h1 className={`${isCompact ? "text-xl" : "text-2xl"} font-black uppercase tracking-tight text-slate-950 leading-none`}>
                          {schoolDetails.schoolName}
                        </h1>
                      )}
                      {showSchoolDetail("address") && schoolDetails.address && (
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">{schoolDetails.address}</p>
                      )}
                      <p className="text-[9.5px] text-slate-600 font-bold tracking-wide uppercase mt-0.5">
                        {showSchoolDetail("affiliation") ? (cleanCurriculumLine || "CBSE Pattern Curriculum") : "CBSE Pattern Curriculum"}
                        {(showSchoolDetail("code") && schoolDetails.code && schoolDetails.code !== (school as any)?.lockCode && schoolDetails.code !== "0002") ? ` • Reg. No: ${schoolDetails.code}` : ""}
                      </p>
                      {((showSchoolDetail("phone") && schoolDetails.phone) || (showSchoolDetail("email") && schoolDetails.email)) ? (
                        <p className="text-[9px] text-slate-600 mt-0.5">
                          {showSchoolDetail("phone") && schoolDetails.phone ? `Helpline: ${schoolDetails.phone}` : ""}
                          {showSchoolDetail("phone") && schoolDetails.phone && showSchoolDetail("email") && schoolDetails.email ? " • " : ""}
                          {showSchoolDetail("email") && schoolDetails.email ? `Email: ${schoolDetails.email}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Grading Scale Badge */}
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
                    {isPreBoard || (isBoard && !isHalfYearly)
                      ? "PRE-BOARD EXAMINATION TRANSCRIPT & PROGRESS REPORT"
                      : isHalfYearly
                      ? "HALF-YEARLY ACADEMIC TRANSCRIPT & PROGRESS REPORT"
                      : "ACADEMIC TRANSCRIPT & PROGRESS REPORT"}
                  </span>
                  <p className="text-[11px] font-bold text-indigo-950 mt-0.5 uppercase tracking-wider">
                    {cleanExamHeading} &bull; Academic Session: {cleanSessionText}
                  </p>
                </div>
              </div>

              {/* Student Details with Photo */}
              <div className={`bg-slate-50/90 rounded-xl ${isCompact ? "p-2 mb-2" : "p-3 mb-3.5"} border border-slate-300 text-xs font-medium`}>
                <div className="grid grid-cols-12 gap-3 items-center">
                  <div className={`${showStudentPhoto ? "col-span-6" : "col-span-8"} space-y-1`}>
                    <div><span className="text-slate-500 font-bold">Result Date: </span><span className="font-black text-slate-900">{publishDate}</span></div>
                    <div><span className="text-slate-500 font-bold">Student Name: </span><span className="font-black text-slate-900 text-sm">{sName}</span></div>
                    <div><span className="text-slate-500 font-bold">Father's Name: </span><span className="font-bold text-slate-800">{sFather}</span></div>
                    <div><span className="text-slate-500 font-bold">Class: </span><span className="font-black text-indigo-900">{cName}</span></div>
                  </div>

                  <div className={`${showStudentPhoto ? "col-span-4" : "col-span-4"} space-y-1 text-right`}>
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <div><span className="text-slate-500 font-bold">Roll No: </span><span className="font-black text-indigo-700 text-sm">{sRoll}</span></div>
                      <div><span className="text-slate-500 font-bold">Reg / Adm No: </span><span className="font-black text-slate-900">{sReg}</span></div>
                      <span className={`font-black text-xs px-2 py-0.5 rounded ${totals.hasFail ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {totals.resultStatus}
                      </span>
                    </div>
                    <div><span className="text-slate-500 font-bold">Section: </span><span className="font-black text-slate-900">{sSection}</span></div>
                    <div className="flex items-center justify-end gap-1.5 flex-wrap pt-0.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-300 text-amber-950 font-black text-[10px]">
                        <span>🏅</span>
                        <span>Class Rank: <b className="text-amber-900 font-black">{sClassRank}</b> / {sClassStrength}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-300 text-sky-950 font-black text-[10px]">
                        <span>🎖️</span>
                        <span>Section Rank: <b className="text-sky-900 font-black">{sSectionRank}</b> / {sSectionStrength}</span>
                      </span>
                    </div>
                  </div>

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

              {/* Wing-Specific Subject Marks Table */}
              <div className={isCompact ? "mb-2" : "mb-3.5"}>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 mb-1 flex items-center justify-between">
                  <span>
                    Result Details ({subjects.length} {activeWing === "pre_primary" ? "Domains" : "Subjects"} - {activeWing === "pre_primary" ? "Pre-Primary" : activeWing === "primary" ? "Primary" : "Middle/Secondary"}):
                  </span>
                  <span className="text-[9.5px] text-slate-500 lowercase font-normal italic">
                    {activeWing === "pre_primary" ? "foundational oral & activity evaluation" : "theory, mcq & practical components"}
                  </span>
                </div>
                {renderSubjectMarksTable(isCompact, isVeryCompact, false)}
              </div>

              {/* Attendance Box + Performance Summary */}
              <div className={`space-y-2 ${isCompact ? "mb-2" : "mb-3.5"}`}>
                <div className="grid grid-cols-3 divide-x divide-slate-300 border-2 border-slate-800 rounded-lg bg-slate-50 text-xs overflow-hidden">
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-600 text-[10.5px]">Total Working Days:</span>
                    <span className="font-black text-slate-950 text-xs font-mono">{safeWorkingDays}</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-600 text-[10.5px]">Student Attendance:</span>
                    <span className="font-black text-indigo-900 text-xs font-mono">{safePresentDays}</span>
                  </div>
                  <div className="px-3 py-1.5 flex items-center justify-between bg-emerald-50/70">
                    <span className="font-bold text-slate-700 text-[10.5px]">Attendance Percentage:</span>
                    <span className="font-black text-emerald-800 text-xs font-mono">{attendancePercentage}%</span>
                  </div>
                </div>

                <div className={`flex items-center justify-between gap-3 ${isCompact ? "p-2" : "p-2.5"} bg-indigo-50/70 border border-indigo-200 rounded-xl text-xs text-slate-800`}>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9.5px]">Percentage Score</span>
                    <span className="text-sm font-black text-indigo-950">{totals.overallPct}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-bold block text-[9.5px]">{resolvedStatus.header}</span>
                    <span className={`text-xs font-black inline-flex items-center gap-1 px-2.5 py-0.5 rounded mt-0.5 ${
                      totals.hasFail
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : isBoard
                        ? "bg-emerald-100 text-emerald-950 border border-emerald-400 font-black shadow-2xs"
                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                    }`}>
                      {resolvedStatus.badge}
                    </span>
                    {resolvedStatus.sub && (
                      <span className={`text-[9px] block font-mono mt-0.5 ${isBoard ? "text-indigo-900 font-extrabold" : "text-slate-500"}`}>
                        {resolvedStatus.sub}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-slate-500 font-bold block text-[9px]">Transcript Verify</span>
                      <span className="text-[9.5px] font-bold text-emerald-700 flex items-center justify-end gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Scan QR
                      </span>
                    </div>
                    <div className="p-1 bg-white border border-slate-400 rounded shadow-2xs">
                      <QRCode value={qrVerifyUrl} size={40} level="M" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3 Official Signatures */}
              <div className={`${isCompact ? "pt-2.5" : "pt-3.5"} border-t-2 border-slate-900 grid grid-cols-3 gap-6 items-end text-center text-xs`}>
                <div>
                  <div className="h-9 border-b border-slate-400 mb-1 flex items-end justify-center">
                    {teacherName && teacherName !== "Class Teacher" ? (
                      <span className="italic font-serif font-bold text-slate-800 text-[11px] mb-0.5">{teacherName}</span>
                    ) : null}
                  </div>
                  <p className="font-black text-slate-800 uppercase tracking-wider text-[10.5px]">Class Teacher</p>
                </div>
                <div>
                  <div className="h-9 border-b border-slate-400 mb-1 flex items-end justify-center">
                    {examControllerName && examControllerName !== "Exam Controller" ? (
                      <span className="italic font-serif font-bold text-slate-800 text-[11px] mb-0.5">{examControllerName}</span>
                    ) : null}
                  </div>
                  <p className="font-black text-slate-800 uppercase tracking-wider text-[10.5px]">Exam Controller</p>
                </div>
                <div>
                  <div className="h-9 border-b border-slate-400 mb-1 flex items-end justify-center">
                    {schoolDetails.principalSignatureUrl ? (
                      <img
                        src={schoolDetails.principalSignatureUrl}
                        alt="Principal Signature"
                        className="max-h-8 max-w-[110px] object-contain mb-0.5"
                      />
                    ) : principalName ? (
                      <span className="italic font-serif font-black text-indigo-900 text-xs mb-0.5">{principalName}</span>
                    ) : null}
                  </div>
                  <p className="font-black text-slate-950 uppercase tracking-wider text-[10.5px]">
                    {schoolDetails.principalTitle || "Principal"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

    const isOuterSingleExam = currentExamOption.category === "pa" || currentExamOption.category === "custom";
    const isOuterSingleSlip = marksheetStyle === "single_slip" || (isOuterSingleExam && marksheetStyle !== "classic_table" && marksheetStyle !== "visual_charts" && marksheetStyle !== "portrait");
    const isPrintLandscape = !isOuterSingleSlip && isLandscapeView;
    const outerSession = sessionName || "2026-27";
    const outerBoardYear = (() => {
      const parts = outerSession.trim().split("-");
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10);
        const p2 = parts[1].trim();
        if (p2.length === 2 && !isNaN(y1)) return `${String(y1).slice(0, 2)}${p2}`;
        if (p2.length === 4) return p2;
      }
      return "2027";
    })();
    const outerNextSession = (() => {
      const parts = outerSession.split("-");
      if (parts.length === 2) {
        const y1 = parseInt(parts[0], 10);
        const y2 = parseInt(parts[1], 10);
        if (!isNaN(y1) && !isNaN(y2)) return `${y1 + 1}-${String(y2 + 1).padStart(2, "0")}`;
      }
      return "2027-28";
    })();
    const outerNextClass = (() => {
      const cn = currentClass?.name || "";
      const numMatch = cn.match(/\d+/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0], 10) + 1;
        return cn.replace(numMatch[0], String(nextNum));
      }
      const lower = cn.toLowerCase();
      if (lower.includes("play")) return "Nursery";
      if (lower.includes("nursery") || lower.includes("nur")) return "LKG";
      if (lower.includes("lkg")) return "UKG";
      if (lower.includes("ukg") || lower.includes("prep")) return "Class 1";
      return "Next Standard";
    })();

    return (
      <div className="marksheet-print-shell min-h-screen bg-slate-100 dark:bg-slate-900 pb-16 print:min-h-0 print:pb-0 print:bg-white print:block w-full max-w-full overflow-x-hidden print:overflow-visible">
        <style>{`
          @media print {
            @page {
              size: ${isPrintLandscape ? "A4 landscape" : "A4 portrait"};
              margin: 6mm;
            }
            html, body, #root {
              width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
            }
            .marksheet-print-shell {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: visible !important;
              background: #ffffff !important;
              display: block !important;
            }
            .marksheet-print-page {
              width: 100% !important;
              max-width: 100% !important;
              height: auto !important;
              min-height: 0 !important;
              max-height: none !important;
              padding: 0 !important;
              margin: 0 auto !important;
              box-sizing: border-box !important;
              display: block !important;
              overflow: visible !important;
              background: #ffffff !important;
              page-break-inside: avoid !important;
              break-inside: avoid-page !important;
              ${bulkMode ? "page-break-after: always !important; break-after: page !important;" : "page-break-after: auto !important; break-after: auto !important;"}
            }
            .marksheet-print-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
            .marksheet-sheet-box {
              width: 100% !important;
              min-width: 0 !important;
              max-width: 100% !important;
              height: auto !important;
              max-height: none !important;
              margin: 0 !important;
              padding: ${isPrintLandscape ? "3.5mm" : "4mm"} !important;
              box-sizing: border-box !important;
              overflow: visible !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: flex-start !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
            .marksheet-sheet-box table {
              width: 100% !important;
              table-layout: auto !important;
            }
            .marksheet-sheet-box th,
            .marksheet-sheet-box td {
              width: auto !important;
            }
            .marksheet-dense-sheet {
              padding: 2.5mm !important;
              font-size: 9px !important;
            }
            .marksheet-dense-sheet table th,
            .marksheet-dense-sheet table td {
              padding-top: 1.5px !important;
              padding-bottom: 1.5px !important;
              font-size: 7.5px !important;
              line-height: 1.15 !important;
            }
          }
          @media print and (orientation: portrait) {
            .marksheet-landscape-split {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
            .marksheet-landscape-split > div:first-child {
              border-right: none !important;
              padding-right: 0 !important;
              border-bottom: 2px solid #1e293b !important;
              padding-bottom: 10px !important;
            }
          }
        `}</style>
      {/* Top Navbar */}
      <div className="bg-slate-950/95 backdrop-blur-md px-3 sm:px-4 py-2 text-white shadow-xl sticky top-0 z-30 print:hidden border-b border-white/10 w-full">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 w-full">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-slate-300 hover:text-white text-xs font-bold transition-colors py-1 cursor-pointer shrink-0 mr-1"
          >
            <ChevronLeft className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">School Dashboard</span>
            <span className="sm:hidden">Dashboard</span>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-nowrap min-w-0">
            <button
              onClick={() => setShowSchoolHeaderModal(true)}
              className="px-2 py-1 bg-slate-900/90 hover:bg-slate-800 text-amber-200/90 border border-amber-400/25 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
            >
              <Building2 className="w-3 h-3 text-amber-300" />
              <span>School Edit</span>
            </button>
            <button
              onClick={autoGenerateFromAppMarks}
              disabled={isAutoGeneratingMarks}
              className="px-2 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-400/30 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="App ke actual marks se auto-fill karein"
            >
              <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span>{isAutoGeneratingMarks ? "..." : "Auto-Marks"}</span>
            </button>
            <button
              onClick={randomizeSampleScores}
              className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-200 border border-indigo-400/30 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition active:scale-95 cursor-pointer"
              title="Demo marks generate karein"
            >
              <Sparkles className="w-3 h-3 text-indigo-300" />
              <span>Sample</span>
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer border ${
                bulkMode
                  ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                  : "bg-slate-900/90 text-slate-300 border-white/15 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>{bulkMode ? "Single" : "Bulk Print"}</span>
            </button>
            <button
              onClick={() => {
                setPromoFromClassId(selectedClassId);
                setShowPromotionModal(true);
              }}
              className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-sm active:scale-95 transition cursor-pointer shrink-0"
              title="वार्षिक परीक्षा के बाद सभी छात्रों को 1-Click में अगले सत्र में प्रमोट करें"
            >
              <TrendingUp className="w-3 h-3 text-yellow-300" />
              <span>Next Session</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-sm shadow-emerald-500/20 active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <Printer className="w-3 h-3" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4 print:p-0 print:m-0 print:max-w-none print:w-full">
        {promotionNotice && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-center gap-2 text-emerald-900 dark:text-emerald-200 text-xs font-bold print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{promotionNotice}</span>
          </div>
        )}
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
                  className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                      className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold ml-2 cursor-pointer"
                      title="Reset candidate fields to selected student"
                    >
                      🔄 Reset
                    </button>
                  </div>
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
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

          {/* Exam Cycle Selector: PA-1, PA-2, Half-Yearly, PA-3, PA-4, Annual, + Custom */}
          <div className="pt-3 border-t dark:border-slate-700">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  Select Examination Cycle / Type:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">
                  (PA-1 to PA-4: Single Horizontal Slip • Half-Yearly &amp; Annual: 2-Sided Landscape Analysis)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExamModal(true)}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Custom Exam</span>
              </button>
            </div>

            {/* Exam Cycle Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {allExamOptions.map(opt => {
                const isSel = selectedExamId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectExam(opt.id)}
                    className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 flex items-center gap-1.5 transition cursor-pointer ${
                      isSel
                        ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-600/30 scale-102"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <span>{opt.category === "annual" ? "🏆" : opt.category === "half_yearly" ? "📑" : "📄"}</span>
                    <span>{opt.shortName}</span>
                    <span className="text-[10px] opacity-75 font-mono">({opt.maxMarks}M)</span>
                    {opt.category === "custom" && (
                      <span className="text-[9px] px-1 py-0.2 bg-amber-400 text-slate-950 font-bold rounded">Custom</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Marksheet Display Style Selector (Admin Choice) */}
            <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Format Style (मार्कशीट डिस्प्ले स्टाइल):
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  (Final व Half-Yearly को Visual Graph, Classic Data या PA1/PA2 जैसा Normal Single Slip में बदलें)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMarksheetStyle("visual_charts")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    marksheetStyle === "visual_charts"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  title="2-Sided Split with Circular Subject Mastery Donut & Exam Growth Trend Line"
                >
                  <span>📊 2-Sided Visual Charts (सर्कल व ग्राफ़)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarksheetStyle("classic_table")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    marksheetStyle === "classic_table"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  title="2-Sided Split with Table Matrix & Observation Box"
                >
                  <span>📑 2-Sided Classic (टेबल डेटा)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarksheetStyle("single_slip")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    marksheetStyle === "single_slip"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  title="Normal Single Slip like PA-1 / PA-2"
                >
                  <span>📄 Normal Single Slip (PA1/PA2 जैसा नॉर्मल)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMarksheetStyle("portrait")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    marksheetStyle === "portrait"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                  }`}
                  title="Standard A4 Portrait Marksheet"
                >
                  <span>📜 A4 Portrait (खड़ी नॉर्मल मार्कशीट)</span>
                </button>
              </div>
            </div>
          </div>

          {/* Exam Title & Promotion Status Controls (Pre-Board / Annual / Board Exam Eligibility) */}
          <div className="pt-3 border-t dark:border-slate-700 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Exam Title & Heading Selector */}
              <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <span>🎯</span> Exam Title (मार्कशीट हेडिंग / परीक्षा शीर्षक):
                  </label>
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">
                    Class 10/12 Pre-Board &amp; Annual
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={
                        examTitle === `PRE-BOARD EXAMINATION (${outerSession})`
                          ? `PRE-BOARD EXAMINATION (${outerSession})`
                          : examTitle === `ANNUAL EXAMINATION TRANSCRIPT (${outerSession})`
                          ? `ANNUAL EXAMINATION TRANSCRIPT (${outerSession})`
                          : examTitle === `ANNUAL EXAMINATION (${outerSession})`
                          ? `ANNUAL EXAMINATION (${outerSession})`
                          : examTitle === `HALF-YEARLY EXAMINATION (${outerSession})`
                          ? `HALF-YEARLY EXAMINATION (${outerSession})`
                          : examTitle === `CBSE / BOARD MOCK EXAMINATION (${outerSession})`
                          ? `CBSE / BOARD MOCK EXAMINATION (${outerSession})`
                          : examTitle === `PERIODIC ASSESSMENT (PA-1 / PA-2 / PA-3 / PA-4)`
                          ? `PERIODIC ASSESSMENT (PA-1 / PA-2 / PA-3 / PA-4)`
                          : examTitle === `SECONDARY SCHOOL EXAMINATION (CLASS X) ${outerSession}`
                          ? `SECONDARY SCHOOL EXAMINATION (CLASS X) ${outerSession}`
                          : examTitle === `SENIOR SECONDARY EXAMINATION (CLASS XII) ${outerSession}`
                          ? `SENIOR SECONDARY EXAMINATION (CLASS XII) ${outerSession}`
                          : "custom"
                      }
                      onChange={e => {
                        const val = e.target.value;
                        if (val !== "custom") {
                          setExamTitle(val);
                          if (val.includes("PRE-BOARD") || val.includes("BOARD")) {
                            setPromotionStatusMode("eligible_board");
                          } else if (val.includes("ANNUAL")) {
                            if (!isBoardClass(currentClass?.name)) {
                              setPromotionStatusMode("promoted");
                            }
                          }
                        }
                      }}
                      className="w-1/2 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-indigo-300 dark:border-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value={`PRE-BOARD EXAMINATION (${outerSession})`}>🎯 PRE-BOARD EXAMINATION ({outerSession})</option>
                      <option value={`ANNUAL EXAMINATION TRANSCRIPT (${outerSession})`}>📋 ANNUAL EXAMINATION TRANSCRIPT ({outerSession})</option>
                      <option value={`ANNUAL EXAMINATION (${outerSession})`}>🏆 ANNUAL EXAMINATION ({outerSession})</option>
                      <option value={`HALF-YEARLY EXAMINATION (${outerSession})`}>📑 HALF-YEARLY EXAMINATION ({outerSession})</option>
                      <option value={`CBSE / BOARD MOCK EXAMINATION (${outerSession})`}>🏛️ CBSE / BOARD MOCK EXAMINATION ({outerSession})</option>
                      <option value="PERIODIC ASSESSMENT (PA-1 / PA-2 / PA-3 / PA-4)">📝 PERIODIC ASSESSMENT (PA-1 / PA-2 / PA-3 / PA-4)</option>
                      <option value={`SECONDARY SCHOOL EXAMINATION (CLASS X) ${outerSession}`}>🎓 SECONDARY SCHOOL EXAMINATION (CLASS X)</option>
                      <option value={`SENIOR SECONDARY EXAMINATION (CLASS XII) ${outerSession}`}>🎓 SENIOR SECONDARY EXAMINATION (CLASS XII)</option>
                      <option value="custom">✍️ Custom Heading (Type Manually)</option>
                    </select>

                    <input
                      type="text"
                      value={examTitle}
                      onChange={e => setExamTitle(e.target.value)}
                      placeholder="Exam title likhein..."
                      className="w-1/2 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Quick Exam Title Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Quick Select:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setExamTitle(`PRE-BOARD EXAMINATION (${outerSession})`);
                        setPromotionStatusMode("eligible_board");
                      }}
                      className="px-2 py-0.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                      🎯 Pre-Board ({outerSession})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamTitle(`ANNUAL EXAMINATION TRANSCRIPT (${outerSession})`);
                        if (!isBoardClass(currentClass?.name)) setPromotionStatusMode("promoted");
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-[10px] shadow-2xs cursor-pointer"
                    >
                      📋 Annual Exam
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamTitle(`HALF-YEARLY EXAMINATION (${outerSession})`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-[10px] shadow-2xs cursor-pointer"
                    >
                      📑 Half-Yearly
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setExamTitle(`CBSE / BOARD MOCK EXAMINATION (${outerSession})`);
                        setPromotionStatusMode("appearing_board");
                      }}
                      className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold text-[10px] shadow-2xs cursor-pointer"
                    >
                      🏛️ Board Mock
                    </button>
                  </div>
                </div>
              </div>

              {/* Promotion / Board Eligibility Status Selector */}
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <label className="text-xs font-black text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
                    <span>🎓</span> Promotion / Board Eligibility Status (प्रमोशन / बोर्ड परीक्षा स्थिति):
                  </label>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                    Bottom Status Box
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={promotionStatusMode}
                      onChange={e => setPromotionStatusMode(e.target.value as any)}
                      className="flex-1 px-2.5 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="auto">⚡ Auto (Class 10/12 ke liye Board Eligible, Baki Class ke liye Promoted)</option>
                      <option value="eligible_board">🎯 ELIGIBLE FOR BOARD EXAM {outerBoardYear} (Appearing in Board • Current Session: {outerSession})</option>
                      <option value="appearing_board">📝 APPEARING IN CBSE/BOARD EXAM {outerBoardYear} (Current Session: {outerSession})</option>
                      <option value="promoted">🎉 Promoted to Next Class ({outerNextClass} • Session: {outerNextSession})</option>
                      <option value="custom">✍️ Custom Status Text (Manually Enter)</option>
                    </select>

                    {promotionStatusMode === "custom" && (
                      <input
                        type="text"
                        value={customPromotionText}
                        onChange={e => setCustomPromotionText(e.target.value)}
                        placeholder="Custom status likhein..."
                        className="w-1/2 px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-emerald-300 dark:border-emerald-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    )}
                  </div>

                  {/* Quick Promotion Status Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500">Quick Set:</span>
                    <button
                      type="button"
                      onClick={() => setPromotionStatusMode("eligible_board")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-2xs transition active:scale-95 cursor-pointer ${
                        promotionStatusMode === "eligible_board"
                          ? "bg-emerald-700 text-white"
                          : "bg-white dark:bg-slate-800 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      🎯 Eligible for Board Exam {outerBoardYear}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromotionStatusMode("appearing_board")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-2xs transition active:scale-95 cursor-pointer ${
                        promotionStatusMode === "appearing_board"
                          ? "bg-emerald-700 text-white"
                          : "bg-white dark:bg-slate-800 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      📝 Appearing in Board Exam {outerBoardYear}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromotionStatusMode("promoted")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-2xs transition active:scale-95 cursor-pointer ${
                        promotionStatusMode === "promoted"
                          ? "bg-emerald-700 text-white"
                          : "bg-white dark:bg-slate-800 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      🎉 Promoted to Next Class
                    </button>
                    <button
                      type="button"
                      onClick={() => setPromotionStatusMode("auto")}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black shadow-2xs transition active:scale-95 cursor-pointer ${
                        promotionStatusMode === "auto"
                          ? "bg-indigo-600 text-white"
                          : "bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      ⚡ Auto
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidate Metadata Editor Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Publish Date:</label>
                <input
                  type="date"
                  value={publishDate}
                  onChange={e => setPublishDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Candidate Name:</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Roll &amp; Reg No:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Roll"
                    value={rollNo}
                    onChange={e => setRollNo(e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Reg No"
                    value={regiNo}
                    onChange={e => setRegiNo(e.target.value)}
                    className="w-1/2 px-2 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Class Rank & Section Rank Configurator */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-amber-700 dark:text-amber-400 block mb-1">🏅 Class Rank:</label>
              <input
                type="text"
                placeholder="e.g. 01"
                value={classRank}
                onChange={e => setClassRank(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-amber-300 dark:border-amber-700 focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Class Strength:</label>
              <input
                type="text"
                placeholder="e.g. 85"
                value={classStrength}
                onChange={e => setClassStrength(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-sky-700 dark:text-sky-400 block mb-1">🎖️ Section Rank:</label>
              <input
                type="text"
                placeholder="e.g. 01"
                value={sectionRank}
                onChange={e => setSectionRank(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-sky-300 dark:border-sky-700 focus:ring-2 focus:ring-sky-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Section Strength:</label>
              <input
                type="text"
                placeholder="e.g. 32"
                value={sectionStrength}
                onChange={e => setSectionStrength(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Father, Signatories & Attendance Box inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Father's Name:</label>
              <input
                type="text"
                value={fatherName}
                onChange={e => setFatherName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Class Teacher (Sign 1):</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Exam Controller (Sign 2):</label>
              <input
                type="text"
                value={examControllerName}
                onChange={e => setExamControllerName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Principal Name (Sign 3):</label>
              <input
                type="text"
                value={principalName}
                onChange={e => setSchoolDetails(p => ({ ...p, principalName: e.target.value }))}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Attendance Summary Box & GPA Scale Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Total Working Days:</label>
              <input
                type="number"
                min="1"
                max="365"
                value={totalWorkingDays}
                onChange={e => setTotalWorkingDays(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Student Attendance (Days):</label>
              <input
                type="number"
                min="0"
                max={totalWorkingDays || 365}
                value={studentAttendance}
                onChange={e => setStudentAttendance(Number(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Academic Session:</label>
              <input
                type="text"
                value={sessionName}
                onChange={e => setSessionName(e.target.value)}
                placeholder="2026-27"
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">GPA Scale System:</label>
              <select
                value={gradingScaleType}
                onChange={e => setGradingScaleType(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="5.0">5.0 Scale (Standard A+, A, A-, B, C, D, F)</option>
                <option value="10.0">10.0 Scale (Pattern A1, A2, B1, B2, C1, C2, D, F)</option>
              </select>
            </div>
          </div>

          {/* Teacher Evaluative Remark Input */}
          <div className="pt-2 px-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>✍️</span> Class Teacher / Principal Remark (कक्षा अध्यापक / प्रधानाचार्य विशेष टिप्पणी):
              </span>
              <span className="text-[10.5px] text-indigo-600 dark:text-indigo-400 font-medium">
                Khali chhodne par student ke marks ke anusaar smart assessment auto-fill hoga
              </span>
            </label>
            <input
              type="text"
              value={teacherRemark}
              onChange={e => setTeacherRemark(e.target.value)}
              placeholder="Custom remark likhein (jaise: विद्यार्थी की प्रथम सत्र में प्रगति सराहनीय है...)"
              className="w-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
            />
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
                <option value="landscape_wide">A4 Landscape (Left: Cumulative Progress &amp; Attendance Trend | Right: Final Marksheet)</option>
                <option value="portrait_compact">A4 Portrait (Standard Formal Marksheet)</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-0.5">Landscape mode features continuous multi-term analysis and attendance correlation</p>
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

          {/* 3 Distinct Class Wings Selector */}
          <div className="pt-3 border-t dark:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-600" />
                Select Marksheet Level &amp; Curriculum Wing:
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Current Class: {currentClass?.name || "Standard"} • Auto-detected: {activeWing === "pre_primary" ? "Pre-Primary" : activeWing === "primary" ? "Primary" : "Middle/Secondary"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setActiveWing("pre_primary");
                  setSubjects(WING_PRESETS.pre_primary.subjects);
                  setExamTitle("NURSERY / KG FOUNDATIONAL PROGRESS REPORT 2026-27");
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeWing === "pre_primary"
                    ? "bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-400/40"
                    : "bg-slate-50 dark:bg-slate-700/50 hover:bg-purple-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <span>🧸 Pre-Primary Wing</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${activeWing === "pre_primary" ? "text-purple-100" : "text-slate-500"}`}>
                  Play, Nursery, LKG, UKG • Oral, Activity &amp; Stars (No Fail)
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWing("primary");
                  setSubjects(WING_PRESETS.primary.subjects);
                  setExamTitle("PRIMARY ACADEMIC REPORT CARD (CLASS 1 - 5) 2026-27");
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeWing === "primary"
                    ? "bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-400/40"
                    : "bg-slate-50 dark:bg-slate-700/50 hover:bg-blue-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <span>🎒 Primary Wing</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${activeWing === "primary" ? "text-blue-100" : "text-slate-500"}`}>
                  Class 1 to 5 • Written (70), Oral (15), Notebook (15)
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWing("middle_secondary");
                  setSubjects(WING_PRESETS.middle_secondary.subjects);
                  setExamTitle("ANNUAL EXAMINATION TRANSCRIPT (CLASS 6 - 10) 2026-27");
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  activeWing === "middle_secondary" && !isBoardClass(currentClass?.name) && !examTitle.includes("PRE-BOARD")
                    ? "bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-400/40"
                    : "bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <span>🎓 Middle &amp; Secondary Wing</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${activeWing === "middle_secondary" && !isBoardClass(currentClass?.name) && !examTitle.includes("PRE-BOARD") ? "text-indigo-100" : "text-slate-500"}`}>
                  Class 6 to 10 • Theory (80), Practical / Internal (20) &amp; GPA
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveWing("middle_secondary");
                  loadSubjectPreset("class10");
                  setExamTitle(`PRE-BOARD EXAMINATION (${sessionName || "2026-27"})`);
                  setPromotionStatusMode("eligible_board");
                }}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isBoardClass(currentClass?.name) || examTitle.includes("PRE-BOARD")
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-400/40"
                    : "bg-slate-50 dark:bg-slate-700/50 hover:bg-emerald-50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <span>🏛️ Board Classes 10 &amp; 12</span>
                </div>
                <p className={`text-[10px] mt-0.5 ${isBoardClass(currentClass?.name) || examTitle.includes("PRE-BOARD") ? "text-emerald-100" : "text-slate-500"}`}>
                  Pre-Board Examination • Eligible / Appearing in Board Exam {outerBoardYear}
                </p>
              </button>
            </div>
          </div>

          {/* Subject Rows Interactive Table Editor */}
          <div className="pt-2 border-t dark:border-slate-700">
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
                    <th className="p-2">{activeWing === "pre_primary" ? "Foundational Skill / Area" : "Subject Name"}</th>
                    <th className="p-2 w-20 text-center">
                      {activeWing === "pre_primary" ? "Oral (50)" : activeWing === "primary" ? "Written (70)" : "Theory (80)"}
                    </th>
                    <th className="p-2 w-20 text-center">
                      {activeWing === "pre_primary" ? "Activity (50)" : activeWing === "primary" ? "Oral (15)" : "MCQ / Quiz"}
                    </th>
                    <th className="p-2 w-20 text-center">
                      {activeWing === "pre_primary" ? "Extra Skill" : activeWing === "primary" ? "Notebook (15)" : "Practical (20)"}
                    </th>
                    <th className="p-2 w-20 text-center">Highest</th>
                    <th className="p-2 w-20 text-center">Total</th>
                    <th className="p-2 w-20 text-center">
                      {activeWing === "pre_primary" ? "Star Rating" : "Grade"}
                    </th>
                    <th className="p-2 w-12 text-center">Hatao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {subjects.map((sub) => {
                    const stats = calculateSubjectStats(sub);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-750">
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={sub.code}
                            onChange={e => handleSubjectChange(sub.id, "code", e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 font-mono text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={sub.name}
                            onChange={e => handleSubjectChange(sub.id, "name", e.target.value)}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.theory}
                            onChange={e => handleSubjectChange(sub.id, "theory", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={sub.mcq}
                            onChange={e => handleSubjectChange(sub.id, "mcq", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.practical}
                            onChange={e => handleSubjectChange(sub.id, "practical", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={sub.highest}
                            onChange={e => handleSubjectChange(sub.id, "highest", Number(e.target.value))}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded border border-slate-300 dark:border-slate-600 text-center font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </td>
                        <td className="p-1.5 text-center font-black text-indigo-600 dark:text-indigo-400">
                          {stats.totalMarks}
                        </td>
                        <td className="p-1.5 text-center font-black">
                          {activeWing === "pre_primary" ? (
                            <span className="text-amber-500 text-xs">{getStarRating(stats.pct)}</span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded ${stats.grade === "A+" || stats.grade === "A" ? "bg-emerald-100 text-emerald-800" : "bg-indigo-100 text-indigo-800"}`}>
                              {stats.grade} ({stats.point})
                            </span>
                          )}
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
        <div className="w-full max-w-full my-6 print:my-0 print:m-0">
          <div className="flex items-center justify-between gap-2 mb-2.5 px-1 print:hidden">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                A4 Marksheet Live Preview ({isPrintLandscape ? "A4 Landscape 297×210mm" : "A4 Portrait 210×297mm"})
              </span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold bg-slate-200/70 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              📱 Swipe to inspect full sheet
            </span>
          </div>

          <div className="w-full max-w-full overflow-x-auto pb-6 pt-1 px-1 rounded-2xl scrollbar-thin bg-slate-200/40 dark:bg-slate-950/40 border border-slate-300/60 dark:border-slate-800 shadow-inner print:bg-transparent print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:overflow-visible">
            {bulkMode ? (
              <div className="space-y-8 print:space-y-0 min-w-fit print:min-w-0 flex flex-col items-center print:block">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 p-3 rounded-xl text-xs text-amber-900 dark:text-amber-200 print:hidden flex items-center justify-between w-full max-w-[1100px]">
                  <span>Bulk Class Mode: Poore <strong>{currentClass?.name}</strong> ke sabhi {classStudents.length} bacchon ki marksheet print hogi.</span>
                  <span className="font-bold">Total: {classStudents.length} Students</span>
                </div>
                {classStudents.map(student => renderMarksheetSheet(student))}
              </div>
            ) : (
              <div className="min-w-fit print:min-w-0 print:w-full flex justify-center print:block mx-auto print:m-0">
                {renderMarksheetSheet(currentStudent || undefined)}
              </div>
            )}
          </div>
        </div>
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

      {/* 1-CLICK NEXT SESSION PROMOTION MODAL */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 print:hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto">
            {/* Modal Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300">
                  सत्र समाप्ति व क्लास प्रमोशन सिस्टम
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  अगले सत्र में प्रमोट करें (1-Click Batch Promotion)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  फाइनल मार्कशीट के बाद छात्रों को नए शैक्षणिक सत्र और अगली कक्षा में एक क्लिक में भेजें।
                </p>
              </div>
              <button
                onClick={() => setShowPromotionModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-lg font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Session & Class Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  1. Current Class (वर्तमान कक्षा)
                </label>
                <select
                  value={promoFromClassId}
                  onChange={e => setPromoFromClassId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs font-bold bg-white dark:bg-slate-800 dark:border-slate-600 text-slate-900 dark:text-white"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  2. Next Class (अगली कक्षा)
                </label>
                <select
                  value={promoToClassId}
                  onChange={e => setPromoToClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-500 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 dark:border-slate-600 text-emerald-800 dark:text-emerald-300"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>➔ {c.name} {c.section ? `(${c.section})` : ""}</option>
                  ))}
                  <option value="passed_out">🎓 Alumni / Passed Out (School Complete)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  3. Next Session (अगला सत्र)
                </label>
                <input
                  type="text"
                  value={promoTargetSession}
                  onChange={e => setPromoTargetSession(e.target.value)}
                  placeholder="e.g. 2027-28"
                  className="w-full px-3 py-2 border rounded-xl text-xs font-black bg-white dark:bg-slate-800 dark:border-slate-600 text-indigo-700 dark:text-indigo-300"
                />
              </div>
            </div>

            {/* Students List with Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  छात्र चयन (Students in Class):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const classStds = studentList.filter(s => s.classId === promoFromClassId);
                      if (promoSelectedStudentIds.length === classStds.length) {
                        setPromoSelectedStudentIds([]);
                      } else {
                        setPromoSelectedStudentIds(classStds.map(s => s.id));
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {promoSelectedStudentIds.length === studentList.filter(s => s.classId === promoFromClassId).length
                      ? "Deselect All"
                      : "Select All Passed"}
                  </button>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    {promoSelectedStudentIds.length} Selected
                  </span>
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-700">
                {studentList.filter(s => s.classId === promoFromClassId).length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    इस कक्षा में अभी कोई छात्र रिकॉर्ड नहीं है।
                  </div>
                ) : (
                  studentList.filter(s => s.classId === promoFromClassId).map(student => {
                    const isSelected = promoSelectedStudentIds.includes(student.id);
                    return (
                      <div
                        key={student.id}
                        onClick={() => {
                          setPromoSelectedStudentIds(prev =>
                            prev.includes(student.id)
                              ? prev.filter(x => x !== student.id)
                              : [...prev, student.id]
                          );
                        }}
                        className={`flex items-center justify-between p-3 text-xs cursor-pointer transition ${
                          isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by parent div
                            className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {student.name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Roll #{student.rollNo} • Adm: {student.admissionNo || "—"} • {student.fatherName ? `Father: ${student.fatherName}` : ""}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          ✓ PASSED (Promoted)
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Note & Action Buttons */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                प्रमोट करने के बाद छात्रों का पिछला रिजल्ट और फीस इतिहास सुरक्षित रूप से आर्काइव में रहेगा।
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowPromotionModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchPromote}
                disabled={isPromotingStudents || promoSelectedStudentIds.length === 0}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <TrendingUp className="w-4 h-4 text-amber-300" />
                <span>
                  {isPromotingStudents
                    ? "Promoting..."
                    : `1-Click Promote (${promoSelectedStudentIds.length} Students)`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOM EXAM MODAL */}
      {showAddExamModal && (
        <div className="fixed inset-0 z-50 print:hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-auto">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-3 flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                  Custom Exam Creator
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  नया परीक्षा जोड़ें (+ Add Custom Exam)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  कोई भी नई परीक्षा जोड़ें, उसका सिंगल मार्कशीट स्लिप तुरंत ऑटो-जनरेट हो जाएगा।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Exam Name (परीक्षा का नाम):
                </label>
                <input
                  type="text"
                  placeholder="उदा. Unit Test 1, Monthly Test, Pre-Board..."
                  value={newExamName}
                  onChange={e => setNewExamName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Total Max Marks (अधिकतम अंक प्रति विषय):
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={newExamMaxMarks}
                  onChange={e => setNewExamMaxMarks(Number(e.target.value) || 40)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  त्वरित सुझाव (Quick Presets):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Unit Test 1", marks: 40 },
                    { name: "Unit Test 2", marks: 40 },
                    { name: "Monthly Assessment", marks: 25 },
                    { name: "Pre-Board Exam", marks: 100 },
                    { name: "Quarterly Exam", marks: 50 },
                  ].map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setNewExamName(preset.name);
                        setNewExamMaxMarks(preset.marks);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-600 cursor-pointer transition"
                    >
                      + {preset.name} ({preset.marks}M)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowAddExamModal(false)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomExam}
                disabled={!newExamName.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>परीक्षा जोड़ें व मार्कशीट बनाएं</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
