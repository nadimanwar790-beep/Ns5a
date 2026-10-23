// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent, SchoolSession } from "../../school-types";
import {
  FileText, Printer, ChevronLeft, Plus, Trash2, Calendar, Clock,
  CheckSquare, Square, Award, AlertCircle, Building2, Layers, Edit3, User, Shield, Sparkles, UserPlus
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

export interface TimetableItem {
  id: string;
  subject: string;
  date: string;
  time: string;
  room?: string;
}

export const AdmitCardManager: React.FC<Props> = ({
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
  const currentClass = classes.find(c => c.id === selectedClassId);
  const currentStudent = classStudents.find(s => s.id === selectedStudentId) || classStudents[0] || null;

  // Modals state
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  // School Header Customization State
  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails>({
    schoolName: school?.name || "National Academy",
    tagline: school?.tagline || "Learn • Grow • Lead",
    affiliation: "Affiliated to State / Central Board of Secondary Education",
    address: school?.address || "Main Campus Examination Center",
    phone: school?.mobile || school?.phone || "+91 98765 43210",
    email: school?.email || "info@school.org",
    logoUrl: school?.logoUrl || "",
    principalName: school?.principalName || "Dr. Rajeshwar Sharma",
    principalTitle: "Principal / Authorized Signatory",
    code: school?.code || "SCH-001",
  });

  // Exam & Center Info
  const [examName, setExamName] = useState("Annual Board Examination 2026-27");
  const [sessionName, setSessionName] = useState(activeSession?.name || "2026-27");
  const [centerName, setCenterName] = useState(schoolDetails.schoolName + ", Main Campus Examination Hall");

  // Signatory & Authority
  const [centerSuperintendent, setCenterSuperintendent] = useState("Center Superintendent");
  const [principalTitle, setPrincipalTitle] = useState("Principal / Authorized Signatory");
  const [principalName, setPrincipalName] = useState(school?.principalName || "Dr. Rajeshwar Sharma");

  // Candidate Details Editable State (Allows overriding student details for print)
  const [candidateName, setCandidateName] = useState("");
  const [candidateRoll, setCandidateRoll] = useState("");
  const [candidateAdmNo, setCandidateAdmNo] = useState("");
  const [candidateFather, setCandidateFather] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidatePhoto, setCandidatePhoto] = useState("");
  const [candidateClass, setCandidateClass] = useState("");

  // Sync candidate fields when student or class changes
  const syncFromCurrentStudent = () => {
    if (currentStudent) {
      setCandidateName(currentStudent.name || "");
      setCandidateRoll(currentStudent.rollNo || "101");
      setCandidateAdmNo(currentStudent.admissionNo || "ADM-" + (currentStudent.rollNo || "101"));
      setCandidateFather(currentStudent.fatherName || "Shri Parent");
      setCandidatePhone(currentStudent.phone || "");
      setCandidatePhoto(currentStudent.photoUrl || "");
      setCandidateClass(currentClass?.name || "Class 10");
    }
  };

  useEffect(() => {
    syncFromCurrentStudent();
  }, [selectedStudentId, selectedClassId]);

  // Timetable Rows (Fully Editable)
  const [timetable, setTimetable] = useState<TimetableItem[]>([
    { id: "tt_1", subject: "Mathematics", date: "2026-11-10", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { id: "tt_2", subject: "General Science", date: "2026-11-12", time: "09:30 AM - 12:30 PM", room: "Hall A" },
    { id: "tt_3", subject: "Social Science", date: "2026-11-15", time: "09:30 AM - 12:30 PM", room: "Hall B" },
    { id: "tt_4", subject: "English Language & Lit.", date: "2026-11-18", time: "09:30 AM - 12:30 PM", room: "Hall B" },
    { id: "tt_5", subject: "Hindi / Regional Lang.", date: "2026-11-21", time: "09:30 AM - 12:30 PM", room: "Hall A" },
  ]);

  // Load Exam Presets
  const loadTimetablePreset = (presetType: "class10" | "class12sci" | "class12com" | "midterm") => {
    if (presetType === "class10") {
      setExamName("Secondary School Examination (Class X) 2026-27");
      setTimetable([
        { id: "tt_1", subject: "Mathematics (Standard / Basic)", date: "2026-11-10", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_2", subject: "Science (Theory & Pract.)", date: "2026-11-12", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_3", subject: "Social Science", date: "2026-11-15", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_4", subject: "English Language & Literature", date: "2026-11-18", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_5", subject: "Hindi Course-A / Regional", date: "2026-11-21", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_6", subject: "Information Technology (IT 402)", date: "2026-11-24", time: "09:30 AM - 11:30 AM", room: "Lab 1" },
      ]);
    } else if (presetType === "class12sci") {
      setExamName("Senior Secondary Examination (Class XII Science) 2026-27");
      setTimetable([
        { id: "tt_1", subject: "English Core (301)", date: "2026-11-10", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_2", subject: "Physics (042)", date: "2026-11-13", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_3", subject: "Chemistry (043)", date: "2026-11-17", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_4", subject: "Mathematics (041)", date: "2026-11-20", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_5", subject: "Biology (044)", date: "2026-11-23", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_6", subject: "Computer Science (083)", date: "2026-11-26", time: "09:30 AM - 12:30 PM", room: "Lab 2" },
      ]);
    } else if (presetType === "class12com") {
      setExamName("Senior Secondary Examination (Class XII Commerce) 2026-27");
      setTimetable([
        { id: "tt_1", subject: "English Core (301)", date: "2026-11-10", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_2", subject: "Accountancy (055)", date: "2026-11-14", time: "09:30 AM - 12:30 PM", room: "Hall A" },
        { id: "tt_3", subject: "Business Studies (054)", date: "2026-11-18", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_4", subject: "Economics (030)", date: "2026-11-21", time: "09:30 AM - 12:30 PM", room: "Hall B" },
        { id: "tt_5", subject: "Applied Mathematics / IP", date: "2026-11-25", time: "09:30 AM - 12:30 PM", room: "Hall A" },
      ]);
    } else {
      setExamName("Half-Yearly Summative Assessment 2026-27");
      setTimetable([
        { id: "tt_1", subject: "English", date: "2026-09-15", time: "09:00 AM - 12:00 PM", room: "Room 101" },
        { id: "tt_2", subject: "Mathematics", date: "2026-09-17", time: "09:00 AM - 12:00 PM", room: "Room 101" },
        { id: "tt_3", subject: "Science / EVS", date: "2026-09-19", time: "09:00 AM - 12:00 PM", room: "Room 102" },
        { id: "tt_4", subject: "Social Studies", date: "2026-09-22", time: "09:00 AM - 12:00 PM", room: "Room 102" },
        { id: "tt_5", subject: "Hindi / Second Lang.", date: "2026-09-24", time: "09:00 AM - 12:00 PM", room: "Room 101" },
      ]);
    }
  };

  // Rules & Instructions (Fully Editable)
  const DEFAULT_RULES = [
    "Candidates must arrive at the examination hall at least 30 minutes before commencement.",
    "Possession of mobile phones, smartwatches, or any unauthorized material is strictly prohibited.",
    "This Admit Card must be preserved and presented upon entry along with the Student ID card.",
    "No candidate will be allowed to leave the examination hall before the completion of the exam duration.",
    "Use of blue or black ballpoint pen only for writing answers and darkening OMR bubbles."
  ];

  const [rules, setRules] = useState<string[]>(DEFAULT_RULES);
  const [newRule, setNewRule] = useState("");

  // Bulk Mode
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"preview" | "timetable" | "candidate" | "rules">("preview");

  const addTimetableRow = () => {
    const newId = "tt_" + Date.now();
    setTimetable(prev => [
      ...prev,
      { id: newId, subject: "New Subject", date: "2026-11-25", time: "09:30 AM - 12:30 PM", room: "Hall A" }
    ]);
  };

  const updateTimetableRow = (id: string, field: keyof TimetableItem, value: string) => {
    setTimetable(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTimetableRow = (id: string) => {
    if (timetable.length <= 1) return;
    setTimetable(prev => prev.filter(t => t.id !== id));
  };

  const addRule = () => {
    if (!newRule.trim()) return;
    setRules(prev => [...prev, newRule.trim()]);
    setNewRule("");
  };

  const updateRule = (index: number, val: string) => {
    setRules(prev => prev.map((r, i) => i === index ? val : r));
  };

  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSelectAll = () => {
    if (selectedStudentIds.length === classStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(classStudents.map(s => s.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handlePrint = () => {
    window.print();
  };

  // Render single Hall Ticket / Admit Card
  const renderAdmitCard = (student?: SchoolStudent) => {
    const isSingle = !bulkMode || !student || (currentStudent && student.id === currentStudent.id);
    const sName = isSingle ? (candidateName || student?.name || "Candidate Name") : (student?.name || "Candidate Name");
    const sRoll = isSingle ? (candidateRoll || student?.rollNo || "101") : (student?.rollNo || "101");
    const sAdm = isSingle ? (candidateAdmNo || student?.admissionNo || `ADM-${sRoll}`) : (student?.admissionNo || `ADM-${sRoll}`);
    const sFather = isSingle ? (candidateFather || student?.fatherName || "Shri Parent") : (student?.fatherName || "Shri Parent");
    const sPhone = isSingle ? (candidatePhone || student?.phone || "—") : (student?.phone || "—");
    const sPhoto = isSingle ? (candidatePhoto || student?.photoUrl || "") : (student?.photoUrl || "");
    const sClass = isSingle ? (candidateClass || currentClass?.name || "Class 10") : (currentClass?.name || "Class 10");

    const qrData = JSON.stringify({
      admitCard: true,
      exam: examName,
      school: schoolDetails.schoolName,
      studentId: student?.id || "custom",
      rollNo: sRoll,
      name: sName,
      class: sClass,
      center: centerName
    });

    return (
      <div
        key={student?.id || "single"}
        className="w-full max-w-[780px] bg-white rounded-2xl border-2 border-slate-900 shadow-xl overflow-hidden p-6 text-slate-900 print:shadow-none print:m-0 print:border-2 print:border-black print:break-after-page print:max-w-none print:rounded-none relative"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* School Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center relative">
          <div className="flex items-center justify-center gap-3.5 mb-1">
            {schoolDetails.logoUrl ? (
              <img src={schoolDetails.logoUrl} alt="Logo" className="w-14 h-14 object-cover rounded-xl border border-slate-300" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-slate-900 text-amber-300 font-black text-xl flex items-center justify-center">
                {(schoolDetails.schoolName || "SC").slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-950 leading-tight">{schoolDetails.schoolName}</h1>
              {schoolDetails.address && <p className="text-xs text-slate-600">{schoolDetails.address}</p>}
              <p className="text-[10px] text-slate-500 font-semibold tracking-wide uppercase">
                {schoolDetails.affiliation || "Official Examination Board"} &bull; Affiliation Code: {schoolDetails.code || "SCH-001"} &bull; Ph: {schoolDetails.phone || ""}
              </p>
            </div>
          </div>

          <div className="mt-2">
            <span className="inline-block px-4 py-1 rounded-full bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
              EXAMINATION ADMIT CARD / HALL TICKET
            </span>
            <p className="text-xs font-bold text-indigo-950 mt-1 uppercase tracking-wide">
              {examName} &bull; Session: {sessionName}
            </p>
          </div>
        </div>

        {/* Student Profile & Details Table */}
        <div className="grid grid-cols-12 gap-4 mb-4 items-center">
          <div className="col-span-9 space-y-1.5 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold">Candidate Name: </span>
                <span className="font-black text-slate-900 text-sm">{sName}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Roll Number: </span>
                <span className="font-black text-indigo-700 text-sm">{sRoll}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Class &amp; Section: </span>
                <span className="font-bold text-slate-800">{sClass}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Admission / Reg No: </span>
                <span className="font-bold text-slate-800">{sAdm}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Father's Name: </span>
                <span className="font-bold text-slate-800">{sFather}</span>
              </div>
              <div>
                <span className="text-slate-500 font-bold">Contact / Phone: </span>
                <span className="font-bold text-slate-800">{sPhone}</span>
              </div>
            </div>
            <div className="p-2 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between">
              <span className="font-bold text-indigo-900">Examination Center:</span>
              <span className="font-bold text-slate-800 text-right">{centerName}</span>
            </div>
          </div>

          {/* Photo and QR Box */}
          <div className="col-span-3 flex flex-col items-center justify-center gap-2">
            <div className="w-24 h-28 border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
              {sPhoto ? (
                <img src={sPhoto} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center text-slate-400">
                  <User className="w-8 h-8 mb-1" />
                  <span className="text-[9px] font-bold">Affix Candidate Photo</span>
                </div>
              )}
            </div>
            <div className="p-1 bg-white border border-slate-300 rounded shadow-sm">
              <QRCode value={qrData} size={48} level="M" />
            </div>
          </div>
        </div>

        {/* Timetable Schedule Table (Fully dynamic) */}
        <div className="mb-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Exam Schedule &amp; Timetable:
          </h4>
          <div className="overflow-hidden border border-slate-300 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-700 w-10 text-center">#</th>
                  <th className="p-2 border-r border-slate-700">Subject Name</th>
                  <th className="p-2 border-r border-slate-700 w-28">Exam Date</th>
                  <th className="p-2 border-r border-slate-700 w-44">Exam Timing</th>
                  <th className="p-2 w-24">Room No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {timetable.map((row, idx) => (
                  <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-2 font-bold text-slate-500 border-r border-slate-200 text-center">{idx + 1}</td>
                    <td className="p-2 font-black text-slate-900 border-r border-slate-200">{row.subject}</td>
                    <td className="p-2 font-bold text-slate-700 border-r border-slate-200">{row.date}</td>
                    <td className="p-2 font-semibold text-slate-700 border-r border-slate-200">{row.time}</td>
                    <td className="p-2 font-bold text-slate-700">{row.room || "Room 1"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rules & Instructions (Editable) */}
        <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-[10px] text-amber-950 space-y-1 mb-5">
          <p className="font-black text-amber-950 uppercase tracking-tight">Important Rules &amp; Guidelines for Candidates:</p>
          {rules.map((rule, idx) => (
            <p key={idx} className="leading-snug">&bull; {rule}</p>
          ))}
        </div>

        {/* Signatures Footer */}
        <div className="grid grid-cols-3 gap-6 pt-4 border-t border-slate-300 text-center text-xs">
          <div>
            <div className="h-8 border-b border-slate-400 mb-1"></div>
            <p className="font-bold text-slate-600">Candidate Signature</p>
          </div>
          <div>
            <div className="h-8 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="text-[11px] font-bold text-slate-700">{centerSuperintendent}</span>
            </div>
            <p className="font-bold text-slate-600">Center Superintendent</p>
          </div>
          <div>
            <div className="h-8 border-b border-slate-400 mb-1 flex items-end justify-center">
              <span className="italic font-serif font-black text-indigo-800 text-sm">{principalName}</span>
            </div>
            <p className="font-black text-slate-900 uppercase tracking-wider text-[11px]">{principalTitle}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSchoolHeaderModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 bg-indigo-700/80 hover:bg-indigo-600 text-white shadow transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" /> 🏫 School Details Edit
            </button>
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                bulkMode ? "bg-amber-500 text-white shadow" : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> {bulkMode ? "Single Mode" : "Bulk Class Print"}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-transform"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0">
        {/* Full Interactive Customization Console (Hidden on Print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 print:hidden border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-indigo-600" />
                Admit Card (Hall Ticket) Live Editor
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Exam Title, Timetable Dates & Times, Rules, aur Candidate Details ko live edit karein.
              </p>
            </div>

            {/* Navigation Tabs for Editors */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "preview" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                General &amp; Exam
              </button>
              <button
                onClick={() => setActiveTab("timetable")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "timetable" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Timetable ({timetable.length})
              </button>
              <button
                onClick={() => setActiveTab("candidate")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "candidate" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Candidate Info
              </button>
              <button
                onClick={() => setActiveTab("rules")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "rules" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-600 dark:text-slate-300"
                }`}
              >
                Exam Rules ({rules.length})
              </button>
            </div>
          </div>

          {/* TAB 1: General & Exam Metadata */}
          {activeTab === "preview" && (
            <div className="space-y-3 pt-2 border-t dark:border-slate-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Class Select Karein:</label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Exam Title:</label>
                  <input
                    type="text"
                    value={examName}
                    onChange={e => setExamName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Academic Session:</label>
                  <input
                    type="text"
                    value={sessionName}
                    onChange={e => setSessionName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Exam Center Name:</label>
                  <input
                    type="text"
                    value={centerName}
                    onChange={e => setCenterName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Principal / Signatory Name:</label>
                  <input
                    type="text"
                    value={principalName}
                    onChange={e => setPrincipalName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Signatory Title:</label>
                  <input
                    type="text"
                    value={principalTitle}
                    onChange={e => setPrincipalTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Full Timetable Interactive Editor */}
          {activeTab === "timetable" && (
            <div className="space-y-3 pt-2 border-t dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  Har Row ka Subject, Date, Time, aur Room live edit karein:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={addTimetableRow}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Naya Subject Jodein
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600 text-xs">
                <span className="font-bold text-slate-500 text-[11px] mr-1">Quick Presets:</span>
                <button
                  onClick={() => loadTimetablePreset("class10")}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
                >
                  📘 Class 10 Board
                </button>
                <button
                  onClick={() => loadTimetablePreset("class12sci")}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
                >
                  🔬 Class 12 Science
                </button>
                <button
                  onClick={() => loadTimetablePreset("class12com")}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
                >
                  📊 Class 12 Commerce
                </button>
                <button
                  onClick={() => loadTimetablePreset("midterm")}
                  className="px-2.5 py-1 bg-white dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-lg font-bold border border-slate-300 dark:border-slate-500 shadow-xs"
                >
                  📝 Half-Yearly Exam
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold">
                    <tr>
                      <th className="p-2 w-10 text-center">#</th>
                      <th className="p-2">Subject Name</th>
                      <th className="p-2 w-36">Exam Date</th>
                      <th className="p-2 w-48">Exam Timing</th>
                      <th className="p-2 w-28">Room No</th>
                      <th className="p-2 w-12 text-center">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {timetable.map((row, idx) => (
                      <tr key={row.id}>
                        <td className="p-2 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.subject}
                            onChange={e => updateTimetableRow(row.id, "subject", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="date"
                            value={row.date}
                            onChange={e => updateTimetableRow(row.id, "date", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.time}
                            onChange={e => updateTimetableRow(row.id, "time", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={row.room || "Hall 1"}
                            onChange={e => updateTimetableRow(row.id, "room", e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeTimetableRow(row.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Hatao"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Candidate Info Editor */}
          {activeTab === "candidate" && (
            <div className="space-y-3 pt-2 border-t dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                  Student Select Karein ya Details Manual Edit Karein:
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStudentId}
                    onChange={e => setSelectedStudentId(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  >
                    {classStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo})</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                    title="Naya student turant add karein"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Student Data
                  </button>
                  <button
                    onClick={syncFromCurrentStudent}
                    className="px-2.5 py-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                    title="Student details wapas reload karein"
                  >
                    🔄 Reset Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Candidate Name:</label>
                  <input
                    type="text"
                    value={candidateName}
                    onChange={e => setCandidateName(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Roll Number:</label>
                  <input
                    type="text"
                    value={candidateRoll}
                    onChange={e => setCandidateRoll(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Admission / Reg No:</label>
                  <input
                    type="text"
                    value={candidateAdmNo}
                    onChange={e => setCandidateAdmNo(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Father's Name:</label>
                  <input
                    type="text"
                    value={candidateFather}
                    onChange={e => setCandidateFather(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Contact Phone:</label>
                  <input
                    type="text"
                    value={candidatePhone}
                    onChange={e => setCandidatePhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Class &amp; Section Name:</label>
                  <input
                    type="text"
                    value={candidateClass}
                    onChange={e => setCandidateClass(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">Photo URL (Optional):</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={candidatePhoto}
                    onChange={e => setCandidatePhoto(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Rules & Instructions Editor */}
          {activeTab === "rules" && (
            <div className="space-y-3 pt-2 border-t dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                  Admit Card par aane wale Rules &amp; Guidelines ko edit karein:
                </span>
                <button
                  onClick={() => setRules(DEFAULT_RULES)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                >
                  🔄 Reset to Standard Rules
                </button>
              </div>

              <div className="space-y-2">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5 text-right">{idx + 1}.</span>
                    <input
                      type="text"
                      value={rule}
                      onChange={e => updateRule(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                    />
                    <button
                      onClick={() => removeRule(idx)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                      title="Hatao"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Naya rule / guideline likhein..."
                  value={newRule}
                  onChange={e => setNewRule(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                />
                <button
                  onClick={addRule}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Rule Jodein
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Content Display (Print-ready) */}
        {bulkMode ? (
          <div>
            <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm mb-4 print:hidden border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSelectAll}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  {selectedStudentIds.length === classStudents.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedStudentIds.length === classStudents.length ? "Deselect All" : "Select All Class"}
                </button>
                <span className="text-xs text-slate-500">
                  ({selectedStudentIds.length > 0 ? selectedStudentIds.length : classStudents.length} of {classStudents.length} Students Selected)
                </span>
              </div>
              <span className="text-xs font-bold text-emerald-600">Print Ready</span>
            </div>

            <div className="space-y-6">
              {(selectedStudentIds.length > 0
                ? classStudents.filter(s => selectedStudentIds.includes(s.id))
                : classStudents
              ).map(student => renderAdmitCard(student))}
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            {renderAdmitCard(currentStudent || undefined)}
          </div>
        )}
      </div>

      {showSchoolHeaderModal && (
        <SchoolHeaderEditorModal
          initialDetails={schoolDetails}
          schoolId={school.id}
          onClose={() => setShowSchoolHeaderModal(false)}
          onSave={(updated) => setSchoolDetails(updated)}
        />
      )}

      {showAddStudentModal && (
        <QuickAddStudentModal
          schoolId={school.id}
          classes={classes}
          defaultClassId={selectedClassId}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={(newStu) => {
            setStudentList(prev => [newStu, ...prev]);
            setSelectedStudentId(newStu.id);
          }}
        />
      )}
    </div>
  );
};
