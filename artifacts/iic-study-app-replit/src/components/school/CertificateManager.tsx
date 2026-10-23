// @ts-nocheck
import React, { useState, useEffect } from "react";
import QRCode from "react-qr-code";
import type { School, SchoolClass, SchoolStudent } from "../../school-types";
import {
  Award, Printer, ChevronLeft, FileCheck, CheckCircle2, Shield, Calendar,
  Edit3, User, Sparkles, RefreshCw
} from "lucide-react";

interface Props {
  school: School;
  classes: SchoolClass[];
  students: SchoolStudent[];
  onBack: () => void;
}

type CertType = "character" | "tc" | "bonafide" | "merit" | "sports" | "completion" | "custom";

export const CertificateManager: React.FC<Props> = ({
  school,
  classes,
  students,
  onBack,
}) => {
  const [certType, setCertType] = useState<CertType>("character");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || "");
  const student = students.find(s => s.id === selectedStudentId) || students[0] || null;
  const studentClass = classes.find(c => c.id === student?.classId);

  // Editable Meta fields
  const [dispatchNo, setDispatchNo] = useState("CERT-" + Math.floor(1000 + Math.random() * 9000));
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("Higher education admission");
  const [conduct, setConduct] = useState("Exemplary and Good");
  const [remarks, setRemarks] = useState("All school dues cleared successfully.");

  // Editable Student details
  const [candidateName, setCandidateName] = useState(student?.name || "Student Name");
  const [candidateFather, setCandidateFather] = useState(student?.fatherName || "Shri Parent");
  const [candidateRoll, setCandidateRoll] = useState(student?.rollNo || "101");
  const [candidateAdmNo, setCandidateAdmNo] = useState(student?.admissionNo || "ADM-101");
  const [candidateClass, setCandidateClass] = useState(studentClass?.name || "Class 10");

  // Editable Titles & Subtitles
  const [customTitle, setCustomTitle] = useState("CHARACTER & CONDUCT CERTIFICATE");
  const [customSubtitle, setCustomSubtitle] = useState("Charitra va Yogyata Praman Patra");

  // Editable Body Paragraph
  const [customBodyText, setCustomBodyText] = useState("");

  // Signatures
  const [principalName, setPrincipalName] = useState(school.principalName || "Dr. Rajeshwar Sharma");
  const [principalTitle, setPrincipalTitle] = useState("Principal / Head of Institution");
  const [teacherName, setTeacherName] = useState("S. K. Gupta");
  const [teacherTitle, setTeacherTitle] = useState("Class Teacher / Exam Incharge");

  // Template defaults generator
  const getTemplateBody = (type: CertType, name: string, father: string, roll: string, cls: string, adm: string) => {
    switch (type) {
      case "character":
        return `This is to certify that Master / Miss ${name}, Son / Daughter of ${father}, is / was a bona fide student of this school studying in ${cls} bearing Roll Number ${roll}. During the academic period in this institution, his / her character, conduct, and moral behavior have been found to be ${conduct}. He / She has not been observed to engage in any activity detrimental to the discipline of the institution.`;
      case "tc":
        return `This is to certify that ${name}, Admission No ${adm}, Roll No ${roll}, attended ${cls} up to the present session. All school fees and dues have been satisfactorily cleared. Reason for leaving the institution: ${reason}. We wish him / her every success and bright future in all subsequent academic endeavors.`;
      case "bonafide":
        return `This is to certify that Master / Miss ${name}, bearing Roll Number ${roll}, is a bona fide regular student of our institution enrolled in ${cls} during the academic session 2026-27. This certificate is issued upon request for the specific purpose of ${reason}.`;
      case "merit":
        return `This Certificate of Merit is proudly conferred upon ${name} of ${cls} in recognition of outstanding academic performance, exemplary dedication, and commendable merit shown during academic examinations and co-curricular activities.`;
      case "sports":
        return `This is to certify that Master / Miss ${name}, Son / Daughter of ${father}, student of ${cls} (Roll No: ${roll}), has actively represented our institution in Sports & Athletics competitions. In recognition of outstanding athletic prowess, sportsmanship, and commendable achievement in sports events, this Certificate of Sporting Excellence is proudly awarded.`;
      case "completion":
        return `This is to certify that Master / Miss ${name}, Admission No: ${adm}, Roll No: ${roll}, has successfully completed the prescribed curriculum and course of study for ${cls} during the academic session 2026-27 at this institution. He / She has completed all necessary assessments and fulfilled the graduation requirements satisfactorily.`;
      case "custom":
        return `This official certificate is proudly presented to ${name}, Son / Daughter of ${father}, studying in ${cls} (Roll No: ${roll}) in recognition of outstanding performance, honorable conduct, and meritorious achievements in our school.`;
      default:
        return "";
    }
  };

  const syncFromSelectedStudent = () => {
    if (student) {
      const name = student.name || "Student Name";
      const father = student.fatherName || "Shri Parent";
      const roll = student.rollNo || "101";
      const adm = student.admissionNo || "ADM-" + roll;
      const cls = studentClass?.name || "Class 10";

      setCandidateName(name);
      setCandidateFather(father);
      setCandidateRoll(roll);
      setCandidateAdmNo(adm);
      setCandidateClass(cls);

      setCustomBodyText(getTemplateBody(certType, name, father, roll, cls, adm));
    }
  };

  // Sync candidate fields when student changes
  useEffect(() => {
    syncFromSelectedStudent();
  }, [selectedStudentId]);

  // When cert type changes, update title & body
  const handleCertTypeChange = (type: CertType) => {
    setCertType(type);
    const titles: Record<CertType, { title: string; subtitle: string }> = {
      tc: { title: "SCHOOL LEAVING / TRANSFER CERTIFICATE", subtitle: "Vidhyalay Chhodne ka Praman Patra" },
      character: { title: "CHARACTER & CONDUCT CERTIFICATE", subtitle: "Charitra Praman Patra" },
      bonafide: { title: "BONAFIDE STUDENT CERTIFICATE", subtitle: "Niyamit Chhatra Praman Patra" },
      merit: { title: "CERTIFICATE OF EXCELLENCE & MERIT", subtitle: "Yogyata va Utkrishtata Praman Patra" },
      sports: { title: "SPORTS & ATHLETICS MERIT CERTIFICATE", subtitle: "Khelkud va Vyayam Utkrishtata Praman Patra" },
      completion: { title: "ACADEMIC COURSE COMPLETION CERTIFICATE", subtitle: "Pathyakram Poornata Praman Patra" },
      custom: { title: "OFFICIAL RECOGNITION CERTIFICATE", subtitle: "Vishesh Prashasti Patra" },
    };
    setCustomTitle(titles[type].title);
    setCustomSubtitle(titles[type].subtitle);
    setCustomBodyText(getTemplateBody(type, candidateName, candidateFather, candidateRoll, candidateClass, candidateAdmNo));
  };

  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    certificate: customTitle,
    dispatchNo,
    school: school.name,
    student: candidateName,
    rollNo: candidateRoll,
    issueDate,
    verified: true
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-indigo-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-amber-200 hover:text-white text-sm font-bold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> School Dashboard
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow active:scale-95 transition-transform"
          >
            <Printer className="w-3.5 h-3.5" /> Print / Save Certificate
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-5 print:p-0">
        {/* Full Generator & Data Editing Console (Hidden on Print) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm mb-6 space-y-4 print:hidden border border-slate-200 dark:border-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-600" />
                School Certificate Live Editor
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Certificate ka Title, Candidate details, Paragraph Text, aur Signatures sab kuch live edit karein.
              </p>
            </div>

            {/* Certificate Preset Selector */}
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-xl">
              {[
                { type: "character", label: "Character" },
                { type: "tc", label: "Transfer (TC)" },
                { type: "bonafide", label: "Bonafide" },
                { type: "merit", label: "Merit / Award" },
                { type: "sports", label: "🏅 Sports" },
                { type: "completion", label: "🎓 Completion" },
                { type: "custom", label: "Custom Title" },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleCertTypeChange(item.type as CertType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    certType === item.type ? "bg-amber-600 text-white shadow" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form details: Student, Titles, Dispatch */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3 border-t dark:border-slate-700">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-500">Student Select Karein:</label>
                <button
                  onClick={syncFromSelectedStudent}
                  className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                  title="Student ke data se form reset karein"
                >
                  🔄 Reset
                </button>
              </div>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Dispatch / Serial No:</label>
              <input
                type="text"
                value={dispatchNo}
                onChange={e => setDispatchNo(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Issue Date:</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Reason / Purpose:</label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full px-3 py-2 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
          </div>

          {/* Candidate Details Edit Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Candidate Name:</label>
              <input
                type="text"
                value={candidateName}
                onChange={e => setCandidateName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Father's Name:</label>
              <input
                type="text"
                value={candidateFather}
                onChange={e => setCandidateFather(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Roll &amp; Adm No:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Roll"
                  value={candidateRoll}
                  onChange={e => setCandidateRoll(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
                <input
                  type="text"
                  placeholder="Adm No"
                  value={candidateAdmNo}
                  onChange={e => setCandidateAdmNo(e.target.value)}
                  className="w-1/2 px-2 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Class Name:</label>
              <input
                type="text"
                value={candidateClass}
                onChange={e => setCandidateClass(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
          </div>

          {/* Certificate Title & Subtitle Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Certificate Main Title:</label>
              <input
                type="text"
                value={customTitle}
                onChange={e => setCustomTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Certificate Subtitle / Tagline:</label>
              <input
                type="text"
                value={customSubtitle}
                onChange={e => setCustomSubtitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
          </div>

          {/* Certificate Body Paragraph (Full Custom Textarea) */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                Certificate Body / Paragraph Text (Live Edit Karein):
              </label>
              <button
                onClick={() => setCustomBodyText(getTemplateBody(certType, candidateName, candidateFather, candidateRoll, candidateClass, candidateAdmNo))}
                className="text-[11px] text-amber-600 hover:underline flex items-center gap-1 font-bold"
              >
                <RefreshCw className="w-3 h-3" /> Reset to Template
              </button>
            </div>
            <textarea
              rows={4}
              value={customBodyText}
              onChange={e => setCustomBodyText(e.target.value)}
              className="w-full px-3 py-2 text-xs leading-relaxed bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Signatures & Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Official Remarks:</label>
              <input
                type="text"
                value={remarks}
                onChange={e => setRemarks(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Teacher / Incharge Name:</label>
              <input
                type="text"
                value={teacherName}
                onChange={e => setTeacherName(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Teacher Title:</label>
              <input
                type="text"
                value={teacherTitle}
                onChange={e => setTeacherTitle(e.target.value)}
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
              <label className="text-xs font-bold text-slate-500 block mb-1">Principal Title:</label>
              <input
                type="text"
                value={principalTitle}
                onChange={e => setPrincipalTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-0"
              />
            </div>
          </div>
        </div>

        {/* Printable Certificate Sheet (Classic Ornate Style) */}
        <div className="flex justify-center">
          <div
            className="w-full max-w-[840px] bg-[#fffdfa] rounded-xl border-[8px] border-double border-amber-900/60 p-10 shadow-2xl relative overflow-hidden print:shadow-none print:m-0 print:border-[6px] print:w-full print:max-w-none print:rounded-none"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
              <span className="text-9xl font-black">{school.name.slice(0, 2)}</span>
            </div>

            {/* Ornate Header */}
            <div className="text-center border-b-2 border-amber-900/30 pb-6 mb-6">
              <div className="flex items-center justify-center gap-3.5 mb-2">
                {school.logoUrl ? (
                  <img src={school.logoUrl} alt="Logo" className="w-16 h-16 object-cover rounded-full border border-amber-900/40 p-0.5 shadow-sm" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-amber-950 text-amber-200 font-black text-2xl flex items-center justify-center shadow-sm">
                    {school.name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h1 className="text-3xl font-black tracking-wider text-amber-950 uppercase">{school.name}</h1>
                  {school.address && <p className="text-xs text-slate-700 mt-0.5 font-sans">{school.address}</p>}
                  <p className="text-[10px] text-amber-900 font-bold uppercase tracking-widest mt-0.5 font-sans">
                    Recognized &amp; Affiliated Educational Institution &bull; School Code: {school.code || "SCH-001"}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <h2 className="text-xl font-bold text-amber-900 tracking-wider underline underline-offset-4 uppercase">
                  {customTitle}
                </h2>
                {customSubtitle && <p className="text-xs italic text-slate-600 mt-1">{customSubtitle}</p>}
              </div>

              <div className="flex justify-between items-center text-xs text-slate-600 mt-4 px-2 font-sans font-bold">
                <span>Dispatch / Serial No: <strong className="text-slate-900">{dispatchNo}</strong></span>
                <span>Date of Issue: <strong className="text-slate-900">{new Date(issueDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></span>
              </div>
            </div>

            {/* Certificate Body (Dynamic from editable text) */}
            <div className="space-y-6 text-sm text-slate-800 leading-relaxed px-4 py-2 text-justify">
              <p className="text-base text-slate-900 leading-relaxed">
                {customBodyText}
              </p>

              {remarks && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 text-xs font-sans text-slate-700">
                  <span className="font-bold text-amber-950">Official Remarks:</span> {remarks}
                </div>
              )}
            </div>

            {/* Signatures & Seal Footer (4-Section Classic Layout) */}
            <div className="mt-14 pt-6 border-t border-amber-900/20 grid grid-cols-4 items-end text-center">
              <div className="text-center font-sans">
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                  <span className="italic font-serif font-black text-slate-800 text-sm">{teacherName}</span>
                </div>
                <p className="font-bold text-[11px] text-slate-800 uppercase tracking-tight">{teacherTitle}</p>
                <p className="text-[9px] text-slate-500">Signatory</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="p-1 bg-white border border-slate-300 rounded shadow-sm">
                  <QRCode value={qrData} size={48} level="M" />
                </div>
                <span className="text-[8px] font-sans text-slate-500 mt-1">Digital QR Verification</span>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-18 h-18 rounded-full border-2 border-dashed border-amber-900/40 flex items-center justify-center text-[9px] text-amber-900/70 font-sans uppercase font-bold tracking-tighter text-center p-1">
                  Official Seal
                </div>
              </div>

              <div className="text-center font-sans">
                <div className="h-10 border-b border-slate-400 mb-1 flex items-end justify-center">
                  <span className="italic font-serif font-black text-amber-950 text-sm">{principalName}</span>
                </div>
                <p className="font-black text-xs text-slate-900 uppercase tracking-wider">{principalTitle}</p>
                <p className="text-[9px] text-slate-500">{school.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
