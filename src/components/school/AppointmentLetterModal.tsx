import React, { useState, useEffect } from "react";
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  PenTool,
  Save,
  Sparkles,
} from "lucide-react";
import type { School, SchoolClass, SchoolSession, SchoolTeacher } from "../../school-types";
import {
  getTeacherRulesConfig,
  saveAccountant,
  getAccountants,
  updateTeacher,
} from "../../school-firebase";
import {
  getDefaultTeacherRulesConfig,
  isLifeMakerSchool,
} from "../../utils/schoolTeacherRules";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";
import { formatAcademicSession, getSavedSchoolLogo } from "./feeReceiptUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School | null;
  teacher: SchoolTeacher | any;
  classes?: SchoolClass[];
  activeSession?: SchoolSession | null;
  canEdit?: boolean;
  onOpenTeacherSignaturePad?: () => void;
  onUpdatedTeacher?: (updated: Partial<SchoolTeacher>) => void;
}

export const AppointmentLetterModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  teacher,
  classes = [],
  activeSession,
  canEdit = true,
  onOpenTeacherSignaturePad,
  onUpdatedTeacher,
}) => {
  const schoolId = school?.id || teacher?.schoolId || "";
  const schoolName = school?.name || "SCHOOL NAME";
  const isLifeMaker = isLifeMakerSchool(school);

  const [trustLine, setTrustLine] = useState(
    isLifeMaker ? "Ummid Educational & Welfare Trust" : school?.affiliation || ""
  );
  const [sessionLabel, setSessionLabel] = useState(() =>
    formatAcademicSession(activeSession?.name || "2026-27")
  );
  const [refNo, setRefNo] = useState("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [teacherAddress, setTeacherAddress] = useState("");
  const [designation, setDesignation] = useState("Teacher");
  const [subjectsText, setSubjectsText] = useState("");
  const [classesAssigned, setClassesAssigned] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [monthlySalary, setMonthlySalary] = useState<number>(0);
  const [probationText, setProbationText] = useState("three months");
  const [noticeText, setNoticeText] = useState("one month's");
  const [principalName, setPrincipalName] = useState(school?.principalName || "");
  const [managerName, setManagerName] = useState(school?.managerName || "");
  const [directorName, setDirectorName] = useState(school?.directorName || "");
  const [status, setStatus] = useState<"not_issued" | "issued" | "signed">(
    "issued"
  );
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !teacher) return;
    const slug = isLifeMaker
      ? "LMPS"
      : schoolName
          .replace(/[^A-Za-z]/g, "")
          .toUpperCase()
          .slice(0, 4) || "SCH";
    const yearCode = new Date().getFullYear();
    const empSuffix =
      (teacher.employeeId || teacher.id || "001").slice(-3).toUpperCase();
    setRefNo(
      teacher.appointmentRefNo || `${slug}/APP/${yearCode}/${empSuffix}`
    );
    setIssueDate(
      teacher.appointmentIssuedAt?.split("T")[0] ||
        new Date().toISOString().split("T")[0]
    );
    setTeacherAddress(teacher.address || "");
    setDesignation(teacher.designation || "Teacher");
    setSubjectsText(
      Array.isArray(teacher.subjects)
        ? teacher.subjects.join(", ")
        : teacher.subjects || ""
    );

    const assignedNames = (teacher.classes || [])
      .map((cid: string) => classes.find((c) => c.id === cid)?.name || cid)
      .filter(Boolean)
      .join(", ");
    setClassesAssigned(assignedNames || "As per School Timetable");
    setJoinDate(teacher.joinDate || new Date().toISOString().split("T")[0]);
    setMonthlySalary(
      Number(
        teacher.salaryStructure?.netMonthlySalary ??
          teacher.monthlySalary ??
          teacher.salary ??
          0
      )
    );
    setPrincipalName(school?.principalName || "");
    setManagerName(school?.managerName || "");
    setDirectorName(school?.directorName || "");
    setStatus(teacher.appointmentStatus || "issued");

    if (schoolId) {
      getTeacherRulesConfig(schoolId, school)
        .then((cfg) => {
          if (cfg?.trustLine) setTrustLine(cfg.trustLine);
        })
        .catch(() => {});
    }
  }, [isOpen, teacher, school, classes, schoolId, schoolName, isLifeMaker]);

  if (!isOpen || !teacher) return null;

  const teacherSigUrl = teacher.signatureUrl || "";
  const principalSigUrl = school?.principalSignatureUrl || "";
  const managerSigUrl = school?.managerSignatureUrl || "";
  const directorSigUrl = school?.directorSignatureUrl || "";
  const schoolLogo = school?.logoUrl || (schoolId ? getSavedSchoolLogo(schoolId) : "");

  const handleSaveTracking = async (
    nextStatus?: "not_issued" | "issued" | "signed"
  ) => {
    if (!schoolId || !teacher.id) return;
    setSaving(true);
    try {
      const targetStatus = nextStatus || status;
      const patch: Partial<SchoolTeacher> = {
        address: teacherAddress.trim() || undefined,
        appointmentRefNo: refNo.trim(),
        appointmentStatus: targetStatus,
        appointmentIssuedAt: issueDate,
      };
      if (!teacher._isAccountantOnly) {
        await updateTeacher(schoolId, teacher.id, patch);
      }
      try {
        const accs = await getAccountants(schoolId);
        const linked = (accs || []).filter(
          (a) => a.id === teacher.id || a.teacherRef === teacher.id
        );
        await Promise.all(
          linked.map((a) =>
            saveAccountant({
              ...a,
              ...patch,
            })
          )
        );
      } catch {}

      setStatus(targetStatus);
      onUpdatedTeacher?.(patch);
      setToastMsg("✅ Appointment Letter स्टेटस व विवरण सेव हो गया!");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const buildAppointmentPageHtml = () => {
    const cleanSalary =
      monthlySalary > 0
        ? `₹ ${monthlySalary.toLocaleString("en-IN")} /-`
        : "____________________";
    const safeSession = sessionLabel || "2026–27";
    const subHeaderLine = [
      trustLine ? `Run By: ${trustLine}` : "",
      `Session: ${safeSession}`,
    ]
      .filter(Boolean)
      .join(" &nbsp;|&nbsp; ");

    return `
      <div class="app-sheet">
        <div class="app-header">
          ${schoolLogo ? `<img src="${schoolLogo}" class="app-logo" alt="Logo" />` : ""}
          <div class="app-header-text">
            <h1>${schoolName.toUpperCase()}</h1>
            ${school?.address ? `<div class="app-addr">${school.address}</div>` : ""}
            ${subHeaderLine ? `<div class="app-sub">${subHeaderLine}</div>` : ""}
          </div>
          ${schoolLogo ? `<div style="width:52px;"></div>` : ""}
        </div>

        <div class="ref-row">
          <div><strong>Ref. No.:</strong> ${refNo || "_________________"}</div>
          <div><strong>Date:</strong> ${issueDate ? new Date(issueDate).toLocaleDateString("en-IN") : "______________"}</div>
        </div>

        <div class="letter-title">APPOINTMENT LETTER</div>

        <div class="to-row">
          <div><strong>To, Mr./Mrs./Ms.</strong> <span class="fill">${teacher.name || "_______________________"}</span></div>
          <div><strong>Address:</strong> <span class="fill">${teacherAddress || "________________________"}</span></div>
        </div>

        <div class="subject-line">
          <strong>Subject: Appointment as a ${designation || "Teacher"} at ${schoolName.toUpperCase()}.</strong>
        </div>

        <p class="salutation">Dear Mr./Mrs./Ms. <strong>${teacher.name || "_________________"}</strong>,</p>

        <p class="para">
          We are pleased to inform you that you have been selected and appointed as a <strong>${designation || "Teacher"}</strong> at
          <strong>${schoolName.toUpperCase()}</strong>${school?.address ? `, ${school.address}` : ""}, for the academic session <strong>${safeSession}</strong>.
          We welcome you to our institution and hope that you will contribute positively towards the academic and overall development of our students.
        </p>

        <table class="details-table">
          <tr>
            <td><strong>Designation:</strong> ${designation || "Teacher"}</td>
            <td><strong>Subject:</strong> ${subjectsText || "All Assigned Subjects"}</td>
          </tr>
          <tr>
            <td><strong>Classes Assigned:</strong> ${classesAssigned || "As per Timetable"}</td>
            <td><strong>Date of Joining:</strong> ${joinDate ? new Date(joinDate).toLocaleDateString("en-IN") : "_____________"}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Monthly Salary:</strong> ${cleanSalary}</td>
          </tr>
        </table>

        <p class="para">
          You are expected to perform your duties with sincerity, dedication, punctuality and professionalism. You must follow the school's timetable, maintain discipline, prepare lesson plans, complete the syllabus on time, conduct regular assessments and maintain students' academic records.
        </p>
        <p class="para">
          You will also be required to attend staff meetings, training programmes, parent-teacher meetings and other academic and extracurricular activities organised by the school.
        </p>
        <p class="para">
          Your appointment will initially be subject to a <strong>probation period of ${probationText}</strong>, during which your teaching performance, punctuality, conduct and overall contribution will be evaluated.
        </p>
        <p class="para">
          You must follow all school rules and regulations, maintain confidentiality regarding school records and treat students, parents and colleagues with respect.
        </p>
        <p class="para">
          Either party may terminate this employment by giving <strong>${noticeText}</strong> written notice or salary in lieu of notice, subject to applicable rules and the terms of employment.
        </p>
        <p class="para">
          We expect you to uphold our institutional values: <strong>Discipline, Devotion &amp; Dedication</strong>. We are confident that your association with the school will be fruitful and rewarding.
        </p>
        <p class="para">
          Kindly sign the duplicate copy of this letter as a token of your acceptance of the appointment and its terms and conditions.
        </p>
        <p class="para" style="margin-top:8px;">
          <strong>With Best Wishes!</strong> &nbsp; Yours faithfully,
        </p>

        <div class="auth-sigs">
          <div class="auth-col">
            <div class="sig-img-box">
              ${principalSigUrl ? `<img src="${principalSigUrl}" alt="Principal Sign" />` : ""}
            </div>
            <div class="sig-line"><strong>Principal</strong></div>
            <div class="sig-name">Name: ${principalName || "______________"}</div>
          </div>
          <div class="auth-col">
            <div class="sig-img-box">
              ${managerSigUrl ? `<img src="${managerSigUrl}" alt="Manager Sign" />` : ""}
            </div>
            <div class="sig-line"><strong>Manager</strong></div>
            <div class="sig-name">Name: ${managerName || "______________"}</div>
          </div>
          <div class="auth-col">
            <div class="sig-img-box">
              ${directorSigUrl ? `<img src="${directorSigUrl}" alt="Director Sign" />` : ""}
            </div>
            <div class="sig-line"><strong>Director</strong></div>
            <div class="sig-name">Name: ${directorName || "______________"}</div>
          </div>
        </div>

        <div class="seal-note">(Official School Seal)</div>

        <div class="acceptance-box">
          <div class="acc-title">ACCEPTANCE</div>
          <div class="acc-text">I hereby accept the appointment and agree to abide by the terms and conditions mentioned in this letter.</div>
          <div class="acc-row">
            <div><strong>Teacher's Name:</strong> ${teacher.name || "______________________"}</div>
            <div class="acc-sign-wrap">
              <strong>Signature:</strong>
              ${
                teacherSigUrl
                  ? `<img src="${teacherSigUrl}" alt="Teacher Sign" class="teacher-sig-inline" />`
                  : `<span>______________________</span>`
              }
            </div>
            <div><strong>Date:</strong> ${issueDate ? new Date(issueDate).toLocaleDateString("en-IN") : "__________"}</div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintLetterOnly = () => {
    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Appointment Letter - ${teacher.name}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; font-family: "Segoe UI", Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #0f172a; background: #fff; }
    .app-sheet { border: 1.5px solid #1e3a8a; padding: 18px 22px; min-height: 270mm; }
    .app-header { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
    .app-logo { width: 52px; height: 52px; object-fit: contain; }
    .app-header-text { flex: 1; }
    .app-header-text h1 { margin: 0; font-size: 22px; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; }
    .app-addr { font-size: 11px; font-weight: 600; color: #334155; margin-top: 2px; }
    .app-sub { font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 2px; }
    .ref-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; }
    .letter-title { text-align: center; font-size: 16px; font-weight: 900; color: #1e3a8a; margin: 10px 0 10px; letter-spacing: 0.8px; }
    .to-row { display: flex; justify-content: space-between; gap: 12px; font-size: 11.5px; margin-bottom: 8px; }
    .fill { border-bottom: 1px solid #64748b; padding: 0 6px; font-weight: 700; }
    .subject-line { font-size: 11.5px; margin: 8px 0; }
    .salutation { font-size: 11.5px; margin: 8px 0; }
    .para { font-size: 11px; line-height: 1.48; margin: 7px 0; text-align: justify; }
    .details-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
    .details-table td { border: 1px solid #cbd5e1; padding: 6px 10px; width: 50%; }
    .auth-sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 20px; font-size: 11px; }
    .sig-img-box { height: 34px; display: flex; align-items: flex-end; justify-content: flex-start; margin-bottom: 2px; }
    .sig-img-box img { max-height: 32px; max-width: 120px; object-fit: contain; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 3px; }
    .sig-name { font-size: 10.5px; color: #334155; margin-top: 1px; }
    .seal-note { font-style: italic; font-size: 10.5px; color: #475569; margin: 12px 0 6px; }
    .acceptance-box { border: 1.5px solid #1e3a8a; background: #f8fafc; padding: 10px 12px; margin-top: 8px; }
    .acc-title { font-size: 12px; font-weight: 900; color: #1e3a8a; margin-bottom: 4px; }
    .acc-text { font-size: 11px; margin-bottom: 8px; }
    .acc-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 10px; font-size: 11px; }
    .acc-sign-wrap { display: flex; align-items: flex-end; gap: 6px; }
    .teacher-sig-inline { max-height: 28px; max-width: 110px; object-fit: contain; border-bottom: 1px solid #0f172a; }
  </style>
</head>
<body>${buildAppointmentPageHtml()}</body>
</html>`;
    printHtmlInIframe(htmlDoc, `Appointment_Letter_${teacher.name}`);
  };

  const handlePrintCompleteJoiningKit = async () => {
    const cfg = schoolId
      ? await getTeacherRulesConfig(schoolId, school).catch(() =>
          getDefaultTeacherRulesConfig(schoolId, school)
        )
      : getDefaultTeacherRulesConfig("", school);

    const enabledRules = [...(cfg.rules || [])]
      .filter((r) => r.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const rulesRowsHtml = enabledRules
      .map(
        (rule, idx) => `
        <div class="rule-row">
          <div class="rule-num">${idx + 1}).</div>
          <div class="rule-body">
            <span class="rule-title">${rule.title}:</span>
            <span class="rule-desc">${rule.description}</span>
          </div>
          <div class="rule-icon">${rule.icon || "•"}</div>
        </div>
      `
      )
      .join("");

    const teacherSigHtml = teacherSigUrl
      ? `<img src="${teacherSigUrl}" alt="Teacher Sign" style="max-height:36px; max-width:120px; object-fit:contain;" />`
      : "";
    const principalSigHtml = principalSigUrl
      ? `<img src="${principalSigUrl}" alt="Principal Sign" style="max-height:36px; max-width:120px; object-fit:contain;" />`
      : "";

    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Joining Kit - ${teacher.name}</title>
  <style>
    @page { size: A4 portrait; margin: 11mm; }
    * { box-sizing: border-box; font-family: "Segoe UI", Arial, sans-serif; }
    body { margin: 0; padding: 0; color: #0f172a; background: #fff; }
    .page-break { page-break-after: always; }
    .app-sheet { border: 1.5px solid #1e3a8a; padding: 16px 20px; }
    .app-header { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; border-bottom: 2px solid #1e3a8a; padding-bottom: 8px; }
    .app-logo { width: 52px; height: 52px; object-fit: contain; }
    .app-header-text { flex: 1; }
    .app-header-text h1 { margin: 0; font-size: 21px; font-weight: 900; color: #1e3a8a; }
    .app-addr { font-size: 11px; font-weight: 600; color: #334155; }
    .app-sub { font-size: 11px; font-weight: 800; color: #0f172a; }
    .ref-row { display: flex; justify-content: space-between; font-size: 11px; margin-top: 8px; }
    .letter-title { text-align: center; font-size: 15px; font-weight: 900; color: #1e3a8a; margin: 8px 0; }
    .to-row { display: flex; justify-content: space-between; gap: 12px; font-size: 11px; margin-bottom: 6px; }
    .fill { border-bottom: 1px solid #64748b; padding: 0 6px; font-weight: 700; }
    .subject-line { font-size: 11px; margin: 6px 0; }
    .salutation { font-size: 11px; margin: 6px 0; }
    .para { font-size: 10.5px; line-height: 1.44; margin: 6px 0; text-align: justify; }
    .details-table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10.5px; }
    .details-table td { border: 1px solid #cbd5e1; padding: 5px 9px; width: 50%; }
    .auth-sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 16px; font-size: 10.5px; }
    .sig-img-box { height: 32px; display: flex; align-items: flex-end; margin-bottom: 2px; }
    .sig-img-box img { max-height: 30px; max-width: 115px; object-fit: contain; }
    .sig-line { border-top: 1px solid #0f172a; padding-top: 3px; }
    .sig-name { font-size: 10px; color: #334155; }
    .seal-note { font-style: italic; font-size: 10px; color: #475569; margin: 10px 0 4px; }
    .acceptance-box { border: 1.5px solid #1e3a8a; background: #f8fafc; padding: 9px 12px; margin-top: 6px; }
    .acc-title { font-size: 11.5px; font-weight: 900; color: #1e3a8a; margin-bottom: 3px; }
    .acc-text { font-size: 10.5px; margin-bottom: 6px; }
    .acc-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 8px; font-size: 10.5px; }
    .acc-sign-wrap { display: flex; align-items: flex-end; gap: 6px; }
    .teacher-sig-inline { max-height: 26px; max-width: 100px; object-fit: contain; border-bottom: 1px solid #0f172a; }

    /* Page 2: Rules Sheet */
    .rules-sheet { border: 3px solid #1e3a8a; border-radius: 12px; padding: 12px 14px; background: linear-gradient(180deg, #eff6ff 0%, #ffffff 18%); }
    .r-head { text-align: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 8px; }
    .r-head h2 { margin: 0; font-size: 20px; font-weight: 900; color: #1e3a8a; }
    .r-banner { margin: 8px 0 10px; background: #b91c1c; color: #fef08a; text-align: center; padding: 6px; border-radius: 8px; font-size: 14px; font-weight: 900; }
    .rules-list { display: flex; flex-direction: column; gap: 5px; }
    .rule-row { display: flex; align-items: center; gap: 8px; border: 1px solid #bfdbfe; border-radius: 999px; padding: 5px 10px; background: #fff; }
    .rule-num { min-width: 26px; height: 24px; border-radius: 999px; background: #dc2626; color: #fff; font-weight: 900; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rule-body { flex: 1; font-size: 10.5px; line-height: 1.3; }
    .rule-title { font-weight: 800; color: #1e3a8a; }
    .rule-desc { font-weight: 600; }
    .rule-icon { font-size: 14px; }
    .r-sigs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 12px; }
    .r-sig-box { border: 1.5px solid #1e3a8a; border-radius: 8px; overflow: hidden; background: #fff; }
    .r-sig-head { background: #1e3a8a; color: #fff; text-align: center; padding: 4px; font-size: 10.5px; font-weight: 800; }
    .r-sig-space { height: 40px; display: flex; align-items: center; justify-content: center; }
    .tagline { margin-top: 8px; background: #1e3a8a; color: #fde047; text-align: center; padding: 5px; border-radius: 999px; font-size: 13px; font-weight: 900; font-style: italic; }
  </style>
</head>
<body>
  <div class="page-break">${buildAppointmentPageHtml()}</div>
  <div class="rules-sheet">
    <div class="r-head">
      <h2>${schoolName.toUpperCase()}</h2>
      ${school?.address ? `<div class="app-addr">${school.address}</div>` : ""}
      ${trustLine ? `<div class="app-sub">Run By: ${trustLine}</div>` : ""}
    </div>
    <div class="r-banner">★ ${cfg.headerSubtitle || "Rules & Regulations for Teachers"} ★</div>
    <div class="rules-list">${rulesRowsHtml}</div>
    <div class="r-sigs">
      <div class="r-sig-box"><div class="r-sig-head">Teacher's Signature</div><div class="r-sig-space">${teacherSigHtml}</div></div>
      <div class="r-sig-box"><div class="r-sig-head">Teacher's Guardian Signature</div><div class="r-sig-space"></div></div>
      <div class="r-sig-box"><div class="r-sig-head">Principal Signature</div><div class="r-sig-space">${principalSigHtml}</div></div>
    </div>
    <div class="tagline">${cfg.tagline || "Together for a Better Tomorrow..."}</div>
  </div>
</body>
</html>`;
    printHtmlInIframe(htmlDoc, `Complete_Joining_Kit_${teacher.name}`);
  };

  return (
    <div className="fixed inset-0 z-[9500] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Top Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black">
                Appointment Letter Generator — {teacher.name}
              </h3>
              <p className="text-[11px] text-blue-200">
                {schoolName} • Digital Signatures &amp; Complete Joining Kit Ready
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenTeacherSignaturePad && (
              <button
                type="button"
                onClick={onOpenTeacherSignaturePad}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{teacherSigUrl ? "Teacher Sign ✓" : "Add Teacher Sign"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintLetterOnly}
              className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Letter (A4)</span>
            </button>
            <button
              type="button"
              onClick={handlePrintCompleteJoiningKit}
              className="px-3 py-1.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Joining Kit (Letter + 13 Rules)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-rose-500 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Edit Fields (for Admin OR Read-only status summary for Teacher) */}
          {canEdit && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <span className="font-black text-amber-300">
                  ऑटो-फ़िल विवरण एडिट करें (Letter Fields &amp; Tracking):
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-[11px]"
                  >
                    <option value="not_issued">Not Issued</option>
                    <option value="issued">Issued (जारी)</option>
                    <option value="signed">Signed Copy Submitted ✓</option>
                  </select>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveTracking()}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? "Saving..." : "Save Status"}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Ref. No.</label>
                  <input
                    value={refNo}
                    onChange={(e) => setRefNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Issue Date</label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Academic Session</label>
                  <input
                    value={sessionLabel}
                    onChange={(e) => setSessionLabel(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={monthlySalary || ""}
                    onChange={(e) => setMonthlySalary(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-emerald-300 font-black tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Designation</label>
                  <input
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Subject(s)</label>
                  <input
                    value={subjectsText}
                    onChange={(e) => setSubjectsText(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Classes Assigned</label>
                  <input
                    value={classesAssigned}
                    onChange={(e) => setClassesAssigned(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Date of Joining</label>
                  <input
                    type="date"
                    value={joinDate}
                    onChange={(e) => setJoinDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Teacher Address</label>
                  <input
                    value={teacherAddress}
                    onChange={(e) => setTeacherAddress(e.target.value)}
                    placeholder="Village / Post / Dist."
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Manager Name</label>
                  <input
                    value={managerName}
                    onChange={(e) => setManagerName(e.target.value)}
                    placeholder="Manager Name"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-0.5">Director Name</label>
                  <input
                    value={directorName}
                    onChange={(e) => setDirectorName(e.target.value)}
                    placeholder="Director Name"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Crisp A4 Live Preview */}
          <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 border-2 border-blue-900 shadow-xl space-y-3 text-xs leading-relaxed">
            <div className="text-center border-b-2 border-blue-900 pb-3">
              <h2 className="text-xl font-black text-blue-900 uppercase tracking-wide">
                {schoolName}
              </h2>
              {school?.address && (
                <p className="text-[11px] font-semibold text-slate-600">{school.address}</p>
              )}
              <p className="text-[11px] font-extrabold text-slate-900 mt-0.5">
                {trustLine ? `Run By: ${trustLine} | ` : ""}Session: {sessionLabel}
              </p>
            </div>

            <div className="flex justify-between text-[11px] font-bold">
              <span>Ref. No.: {refNo}</span>
              <span>Date: {issueDate ? new Date(issueDate).toLocaleDateString("en-IN") : ""}</span>
            </div>

            <div className="text-center text-base font-black text-blue-900 tracking-wider pt-1">
              APPOINTMENT LETTER
            </div>

            <div className="flex flex-wrap justify-between gap-2 text-[11.5px]">
              <span>
                <strong>To, Mr./Mrs./Ms.</strong> {teacher.name}
              </span>
              <span>
                <strong>Address:</strong> {teacherAddress || "________________________"}
              </span>
            </div>

            <p className="font-bold text-[11.5px]">
              Subject: Appointment as a {designation || "Teacher"} at {schoolName.toUpperCase()}.
            </p>
            <p>
              Dear Mr./Mrs./Ms. <strong>{teacher.name}</strong>,
            </p>
            <p className="text-[11px]">
              We are pleased to inform you that you have been selected and appointed as a{" "}
              <strong>{designation || "Teacher"}</strong> at <strong>{schoolName.toUpperCase()}</strong>
              {school?.address ? `, ${school.address}` : ""}, for the academic session{" "}
              <strong>{sessionLabel}</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 border border-slate-300 rounded-lg overflow-hidden text-[11px]">
              <div className="p-2 border-b sm:border-r border-slate-300">
                <strong>Designation:</strong> {designation}
              </div>
              <div className="p-2 border-b border-slate-300">
                <strong>Subject:</strong> {subjectsText || "All Assigned Subjects"}
              </div>
              <div className="p-2 border-b sm:border-r border-slate-300">
                <strong>Classes Assigned:</strong> {classesAssigned}
              </div>
              <div className="p-2 border-b border-slate-300">
                <strong>Date of Joining:</strong>{" "}
                {joinDate ? new Date(joinDate).toLocaleDateString("en-IN") : ""}
              </div>
              <div className="p-2 sm:col-span-2 bg-slate-50 font-black text-emerald-800">
                Monthly Salary:{" "}
                {monthlySalary > 0 ? `₹ ${monthlySalary.toLocaleString("en-IN")} /-` : "As agreed"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-6 text-[11px]">
              <div>
                <div className="h-8 flex items-end">
                  {principalSigUrl && (
                    <img src={principalSigUrl} alt="Principal" className="max-h-8 object-contain" />
                  )}
                </div>
                <div className="border-t border-slate-800 pt-1 font-bold">Principal</div>
                <div className="text-[10px] text-slate-600">Name: {principalName || "—"}</div>
              </div>
              <div>
                <div className="h-8 flex items-end">
                  {managerSigUrl && (
                    <img src={managerSigUrl} alt="Manager" className="max-h-8 object-contain" />
                  )}
                </div>
                <div className="border-t border-slate-800 pt-1 font-bold">Manager</div>
                <div className="text-[10px] text-slate-600">Name: {managerName || "—"}</div>
              </div>
              <div>
                <div className="h-8 flex items-end">
                  {directorSigUrl && (
                    <img src={directorSigUrl} alt="Director" className="max-h-8 object-contain" />
                  )}
                </div>
                <div className="border-t border-slate-800 pt-1 font-bold">Director</div>
                <div className="text-[10px] text-slate-600">Name: {directorName || "—"}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-blue-900 mt-3 space-y-1.5">
              <div className="font-black text-blue-900 text-xs flex items-center justify-between">
                <span>ACCEPTANCE</span>
                {status === "signed" && (
                  <span className="text-emerald-700 text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed Copy Verified
                  </span>
                )}
              </div>
              <p className="text-[10.5px]">
                I hereby accept the appointment and agree to abide by the terms and conditions mentioned in this letter.
              </p>
              <div className="flex flex-wrap items-end justify-between gap-3 pt-1 text-[11px]">
                <span>
                  <strong>Teacher's Name:</strong> {teacher.name}
                </span>
                <span className="flex items-end gap-2">
                  <strong>Signature:</strong>
                  {teacherSigUrl ? (
                    <img
                      src={teacherSigUrl}
                      alt="Teacher Sign"
                      className="max-h-7 max-w-[110px] object-contain border-b border-slate-700"
                    />
                  ) : (
                    <span className="text-slate-400">__________________</span>
                  )}
                </span>
                <span>
                  <strong>Date:</strong> {issueDate ? new Date(issueDate).toLocaleDateString("en-IN") : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div className="fixed bottom-5 right-5 z-[10100] px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-black shadow-2xl">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
};
