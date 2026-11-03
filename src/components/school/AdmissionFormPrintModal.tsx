import React, { useState, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  X,
  Printer,
  Download,
  FileText,
  ReceiptText,
  Scissors,
  Loader2,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import type {
  School,
  SchoolStudent,
  AdmissionApplication,
  MonthlyFee,
} from "../../school-types";
import { ADMISSION_DOCUMENT_OPTIONS } from "../../school-types";
import { getLocalFees } from "../../school-firebase";
import { getSavedSchoolLogo, numberToIndianWords, formatAcademicSession } from "./feeReceiptUtils";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";

export type AdmissionPrintMode = "combined" | "form_only" | "receipt_only";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  student?: Partial<SchoolStudent> | null;
  application?: Partial<AdmissionApplication> | null;
  className?: string;
  sessionName?: string;
  feeRecord?: MonthlyFee | null;
  initialMode?: AdmissionPrintMode;
}

const escapeHtml = (val?: string | number | null): string => {
  if (val === null || val === undefined) return "";
  return String(val)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

/**
 * Prints an HTML document inside an invisible iframe so printing works
 * reliably inside preview iframes without window.open popups.
 */
export function printHtmlInIframe(htmlDocument: string, title = "Print Document"): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById("nst-hidden-print-iframe");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const iframe = document.createElement("iframe");
  iframe.id = "nst-hidden-print-iframe";
  iframe.title = title;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlDocument);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn("Iframe print error:", err);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 4000);
    }
  };

  // Wait briefly for images (logo, student photo, QR, signature) to load
  const imgs = Array.from(doc.images || []);
  if (imgs.length === 0) {
    setTimeout(triggerPrint, 200);
    return;
  }

  let settled = 0;
  let printed = false;
  const checkDone = () => {
    settled++;
    if (!printed && settled >= imgs.length) {
      printed = true;
      setTimeout(triggerPrint, 150);
    }
  };

  imgs.forEach((img) => {
    if (img.complete) {
      checkDone();
    } else {
      img.onload = checkDone;
      img.onerror = checkDone;
    }
  });

  // Safety timeout so slow external images never block printing
  setTimeout(() => {
    if (!printed) {
      printed = true;
      triggerPrint();
    }
  }, 1400);
}

const ADMISSION_PRINT_CSS = `
  @page { size: A4 portrait; margin: 7mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; background: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; }
  .a4-sheet {
    width: 196mm;
    min-height: 281mm;
    margin: 0 auto;
    background: #ffffff;
    color: #0f172a;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .adm-box {
    border: 1.5px solid #1e3a8a;
    border-radius: 6px;
    padding: 3.2mm 4mm;
    background: #ffffff;
  }
  .inst-header {
    display: flex;
    align-items: center;
    gap: 3.5mm;
    border-bottom: 2px solid #1e3a8a;
    padding-bottom: 2.2mm;
    margin-bottom: 2.2mm;
  }
  .inst-logo {
    width: 15mm;
    height: 15mm;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    background: #f8fafc;
    font-weight: 900;
    font-size: 11pt;
    color: #1e3a8a;
  }
  .inst-logo img { width: 100%; height: 100%; object-fit: contain; }
  .inst-title-wrap { flex: 1; text-align: center; }
  .inst-name { font-size: 13.5pt; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.3px; line-height: 1.15; }
  .inst-sub { font-size: 7.5pt; color: #334155; font-weight: 600; margin-top: 1px; }
  .doc-badge-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #1e3a8a;
    color: #ffffff;
    padding: 1.4mm 3mm;
    border-radius: 4px;
    font-size: 8pt;
    font-weight: 800;
    letter-spacing: 0.4px;
    margin-bottom: 2.2mm;
  }
  .meta-strip {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2mm;
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    padding: 1.6mm 2.5mm;
    margin-bottom: 2.2mm;
    font-size: 7.5pt;
  }
  .meta-item { display: flex; flex-direction: column; }
  .meta-lbl { font-size: 6.3pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
  .meta-val { font-size: 8pt; font-weight: 800; color: #0f172a; }
  .bio-layout { display: flex; gap: 3mm; align-items: stretch; }
  .bio-table { flex: 1; width: 100%; border-collapse: collapse; font-size: 7.5pt; }
  .bio-table td { border: 1px solid #cbd5e1; padding: 1.2mm 2mm; vertical-align: top; }
  .bio-table td.lbl { width: 22%; background: #f8fafc; color: #475569; font-weight: 700; font-size: 7pt; }
  .bio-table td.val { width: 28%; color: #0f172a; font-weight: 700; }
  .photo-frame {
    width: 25mm;
    height: 31mm;
    border: 1.5px solid #334155;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
    flex-shrink: 0;
    text-align: center;
  }
  .photo-frame img { width: 100%; height: 100%; object-fit: cover; }
  .docs-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2mm 3mm;
    border: 1px solid #cbd5e1;
    background: #f8fafc;
    border-radius: 4px;
    padding: 1.5mm 2.5mm;
    margin-top: 2mm;
    font-size: 6.8pt;
  }
  .doc-chip { display: inline-flex; align-items: center; gap: 1mm; font-weight: 700; color: #1e293b; }
  .chk-box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3.3mm;
    height: 3.3mm;
    border: 1px solid #1e3a8a;
    border-radius: 2px;
    font-size: 6.5pt;
    font-weight: 900;
    line-height: 1;
  }
  .chk-on { background: #1e3a8a; color: #ffffff; }
  .sig-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: 4mm;
    padding-top: 1.5mm;
    font-size: 7pt;
  }
  .sig-block { text-align: center; min-width: 36mm; }
  .sig-line { border-top: 1px solid #334155; padding-top: 1mm; font-weight: 800; color: #1e293b; }
  .cut-divider {
    display: flex;
    align-items: center;
    gap: 2mm;
    margin: 2.2mm 0;
    color: #475569;
    font-size: 7pt;
    font-weight: 800;
    letter-spacing: 0.5px;
  }
  .cut-line { flex: 1; border-top: 1.5px dashed #64748b; }
  .fee-table { width: 100%; border-collapse: collapse; font-size: 7.4pt; margin-top: 1.5mm; }
  .fee-table th { background: #eff6ff; border: 1px solid #94a3b8; padding: 1.2mm 2mm; text-align: left; font-weight: 800; color: #1e3a8a; font-size: 7pt; }
  .fee-table td { border: 1px solid #cbd5e1; padding: 1.1mm 2mm; font-weight: 600; }
  .fee-table th.num, .fee-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
  .receipt-footer-grid { display: flex; justify-content: space-between; align-items: center; gap: 3mm; margin-top: 2mm; }
  .totals-box { flex: 1; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1.8mm 2.5mm; font-size: 7.4pt; }
  .qr-mini { width: 19mm; height: 19mm; border: 1px solid #cbd5e1; padding: 1mm; border-radius: 4px; flex-shrink: 0; background: #fff; }
  .qr-mini img { width: 100%; height: 100%; object-fit: contain; }
  .section-heading {
    background: #eff6ff;
    border-left: 3px solid #1e3a8a;
    padding: 1.2mm 2.5mm;
    font-size: 8pt;
    font-weight: 800;
    color: #1e3a8a;
    text-transform: uppercase;
    margin: 3mm 0 1.8mm 0;
  }
`;

export const AdmissionFormPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  student,
  application,
  className,
  sessionName,
  feeRecord,
  initialMode,
}) => {
  // Automatically resolve admission fee record if not explicitly passed
  const resolvedFee = useMemo<MonthlyFee | null>(() => {
    if (feeRecord) return feeRecord;
    if (school?.id) {
      const localFees = getLocalFees(school.id);
      const stId = student?.id || application?.enrolledStudentId;
      const admReceipt = student?.admissionReceiptNo || application?.admissionFeeDetails?.receiptNo;
      const found = localFees.find((f) => {
        const isAdm = f.feeType === "admission" || f.receiptCategory === "admission";
        if (!isAdm) return false;
        if (admReceipt && f.receiptNo === admReceipt) return true;
        if (stId && f.studentId === stId) return true;
        return false;
      });
      if (found) return found;
    }
    if (application?.admissionFeeDetails) {
      const d = application.admissionFeeDetails;
      const fallbackItems =
        d.items && d.items.length > 0
          ? d.items
          : [
              d.admissionFee > 0 && { id: "1", slNo: 1, description: "Admission Fee (प्रवेश शुल्क)", due: d.admissionFee, con: 0, paid: d.admissionFee },
              d.registrationFee > 0 && { id: "2", slNo: 2, description: "Registration & Form Fee", due: d.registrationFee, con: 0, paid: d.registrationFee },
              d.developmentFee > 0 && { id: "3", slNo: 3, description: "Annual / Development Charges", due: d.developmentFee, con: 0, paid: d.developmentFee },
              d.idKitFee > 0 && { id: "4", slNo: 4, description: "Student Kit, ID Card & Diary", due: d.idKitFee, con: 0, paid: d.idKitFee },
              d.examFund > 0 && { id: "5", slNo: 5, description: "Exam & Activity Charges", due: d.examFund, con: 0, paid: d.examFund },
            ].filter(Boolean) as any[];

      return {
        schoolId: school.id,
        sessionId: sessionName || "2026-27",
        studentId: student?.id || application.enrolledStudentId || application.id || "std",
        studentName: student?.name || application.studentName || "Student",
        rollNo: student?.rollNo || application.assignedRollNo || "—",
        classId: student?.classId || application.classId || "",
        month: (d.paidDate || application.appliedAt || new Date().toISOString()).slice(0, 7),
        amount: d.totalPayable,
        paid: d.paidAmount >= d.totalPayable,
        paidDate: d.paidDate || application.reviewedAt || application.appliedAt,
        receiptNo: d.receiptNo || "ADM-RCPT",
        paidAmount: d.paidAmount,
        balanceDue: d.balanceDue,
        concession: d.concession || 0,
        feeType: "admission",
        receiptCategory: "admission",
        payModeInfo: {
          payMode: d.paymentMode || "Cash",
          date: d.paidDate ? new Date(d.paidDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB"),
          bank: "",
          number: "",
        },
        items: fallbackItems,
      };
    }
    return null;
  }, [feeRecord, school?.id, student, application, sessionName]);

  const [mode, setMode] = useState<AdmissionPrintMode>(() => {
    if (initialMode) return initialMode;
    return resolvedFee ? "combined" : "form_only";
  });
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [showOfficialPosModal, setShowOfficialPosModal] = useState(false);
  const [admissionType, setAdmissionType] = useState<"NEW" | "READMISSION">(() => {
    const rawType = (student as any)?.admissionType || (application as any)?.admissionType;
    return rawType === "READMISSION" ? "READMISSION" : "NEW";
  });
  const [copyTarget, setCopyTarget] = useState<"PARENT COPY" | "OFFICE COPY">("PARENT COPY");
  const previewRef = useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    } else {
      setMode(resolvedFee ? "combined" : "form_only");
    }
    const rawType = (student as any)?.admissionType || (application as any)?.admissionType;
    if (rawType === "READMISSION" || rawType === "NEW") {
      setAdmissionType(rawType);
    }
  }, [initialMode, resolvedFee, isOpen, student, application]);

  if (!isOpen) return null;

  // Masking helper for Aadhaar (UIDAI compliance: only last 4 digits visible)
  const maskAadhaar = (val?: string | number | null): string => {
    if (!val || val === "—") return "—";
    const str = String(val).replace(/\D/g, "");
    if (str.length >= 4) {
      return `XXXXXXXX${str.slice(-4)}`;
    }
    return String(val);
  };

  // Unified normalized bio-data from student + application
  const logoUrl = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const fullName = student?.name || application?.studentName || "—";
  const admNo = student?.admissionNo || application?.applicationNo || "—";
  const rollNo = student?.rollNo || application?.assignedRollNo || "Not Assigned";
  const clsLabel = className || student?.className || application?.className || student?.classId || "—";
  const sessLabel = formatAcademicSession(sessionName || student?.sessionId || "2026-27");
  const admDateRaw = student?.joinDate || (application?.appliedAt ? application.appliedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const dob = student?.dateOfBirth || application?.dateOfBirth || "—";
  const genderRaw = student?.gender || application?.gender || "";
  const genderLabel = genderRaw ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1) : "—";
  const bloodGroup = student?.bloodGroup || application?.bloodGroup || "—";
  const category = student?.category || application?.category || "General";
  const apaarId = student?.apaarId || application?.apaarId || "—";
  const studentAadhaar = student?.aadhaarNo || application?.aadhaarNo || "—";
  const fatherName = student?.fatherName || application?.fatherName || "—";
  const fatherOcc = student?.fatherOccupation || application?.fatherOccupation || "";
  const fatherAadhaar = student?.fatherAadhaar || application?.fatherAadhaar || "—";
  const motherName = student?.motherName || application?.motherName || "—";
  const motherOcc = student?.motherOccupation || application?.motherOccupation || "";
  const motherAadhaar = student?.motherAadhaar || application?.motherAadhaar || "—";
  const phone = student?.phone || application?.phone || "—";
  const whatsappNo = student?.whatsappNo || application?.whatsappNo || "";
  const email = student?.email || application?.email || "";
  const addressParts = [
    student?.address || application?.address || "",
    student?.city || application?.city || "",
    student?.pincode || application?.pincode ? `PIN: ${student?.pincode || application?.pincode}` : "",
  ].filter(Boolean);
  const fullAddress = addressParts.join(", ") || "—";
  const permanentAddress = (student as any)?.permanentAddress || (application as any)?.permanentAddress || fullAddress;
  const prevSchool = student?.previousSchool || application?.previousSchool || "—";
  const prevMarks = student?.previousMarks || application?.previousMarks || "";
  const photoUrl = student?.photoUrl || application?.photoUrl || "";
  const monthlyFee = student?.monthlyFee ?? application?.monthlyFee ?? 0;
  const usesBus = student?.usesBus ?? application?.usesBus ?? false;
  const busRoute = student?.busRoute || student?.busStop || application?.busRoute || application?.busStop || "";
  const busFee = student?.busFee ?? application?.busFee ?? 0;
  const submittedDocs = student?.submittedDocs || application?.submittedDocs || [];

  // Statutory & Compliance Fields
  const annualIncome = student?.annualIncome || (student as any)?.familyIncome || application?.annualIncome || "—";
  const rawEmergContact = student?.emergencyContact || application?.emergencyContact || "";
  const isEmergContactNumeric = /^\+?[\d\s-]{8,}$/.test(rawEmergContact.trim());
  const emergencyPhone =
    student?.emergencyPhone ||
    application?.emergencyPhone ||
    (isEmergContactNumeric ? rawEmergContact : "") ||
    phone ||
    "—";
  const emergencyPerson =
    (student as any)?.emergencyPerson ||
    (application as any)?.emergencyPerson ||
    (!isEmergContactNumeric && rawEmergContact ? rawEmergContact : "") ||
    "Guardian / Relative";
  const emergencyRelation = student?.emergencyRelation || application?.emergencyRelation || "Relative";
  const identificationMark = student?.identificationMark || (student as any)?.idMark || application?.identificationMark || "—";
  const medicalCondition = student?.medicalHistory || (student as any)?.medicalNotes || application?.medicalHistory || (application as any)?.medicalNotes || "Normal / Fit";
  const religion = (student as any)?.religion || (application as any)?.religion || "Hindu";
  const nationality = (student as any)?.nationality || (application as any)?.nationality || "Indian";
  const motherTongue = (student as any)?.motherTongue || (application as any)?.motherTongue || "Hindi / Bhojpuri";
  const mediumOfInstruction = (student as any)?.medium || (application as any)?.medium || "English / Hindi";
  const guardianName = (student as any)?.guardianName || (application as any)?.guardianName || fatherName;
  const guardianRelation = (student as any)?.guardianRelation || (application as any)?.guardianRelation || "Father / Guardian";

  // Fee Calculations
  const feeItems = resolvedFee?.items && resolvedFee.items.length > 0
    ? resolvedFee.items
    : resolvedFee
    ? [{ id: "1", slNo: 1, description: "Admission & Enrollment Fee (प्रवेश शुल्क)", due: resolvedFee.amount || 0, con: resolvedFee.concession || 0, paid: resolvedFee.paidAmount ?? resolvedFee.amount ?? 0 }]
    : [];
  const totalDue = feeItems.reduce((s, i) => s + Number(i.due || 0), 0);
  const totalCon = Number(resolvedFee?.concession || feeItems.reduce((s, i) => s + Number(i.con || 0), 0));
  const netPayable = Math.max(0, totalDue - totalCon);
  const totalPaid = resolvedFee ? Number(resolvedFee.paidAmount ?? resolvedFee.amount ?? netPayable) : 0;
  const balanceDue = resolvedFee ? Math.max(0, resolvedFee.balanceDue ?? (netPayable - totalPaid)) : 0;
  const paidWords = numberToIndianWords(totalPaid);
  const qrPayload = encodeURIComponent(
    `ADM-VERIFY|School:${school?.name}|AdmNo:${admNo}|Name:${fullName}|Class:${clsLabel}|Rcpt:${resolvedFee?.receiptNo || "NA"}|Paid:INR ${totalPaid}`
  );
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=2&data=${qrPayload}`;

  const buildSheetInnerHtml = (targetMode: AdmissionPrintMode): string => {
    const headerHtml = `
      <div class="inst-header">
        <div class="inst-logo">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" />` : `<span>${escapeHtml((school?.name || "SC").slice(0, 2).toUpperCase())}</span>`}
        </div>
        <div class="inst-title-wrap">
          <div class="inst-name">${escapeHtml(school?.name || "Institutional Campus")}</div>
          ${school?.tagline ? `<div class="inst-sub" style="font-style:italic;">"${escapeHtml(school.tagline)}"</div>` : ""}
          ${school?.address ? `<div class="inst-sub">Address / Campus: ${escapeHtml(school.address)}</div>` : ""}
          <div class="inst-sub">
            ${school?.phone || school?.mobile ? `Helpline: ${escapeHtml(school.phone || school.mobile)}` : ""}
            ${school?.email ? `${school?.phone || school?.mobile ? " • " : ""}Email: ${escapeHtml(school.email)}` : ""}
            ${school?.code && school.code !== (school as any).lockCode && school.code !== "0002" ? ` • Reg. No: ${escapeHtml(school.code)}` : ""}
            ${school?.phone || school?.mobile || school?.email ? " • " : ""}Office Timings: 08:00 AM – 02:00 PM
          </div>
        </div>
        <div style="text-align:right;min-width:32mm;">
          <div style="display:inline-block;padding:1mm 2.2mm;background:#1e3a8a;color:#ffffff;font-size:7pt;font-weight:900;border-radius:3px;letter-spacing:0.3px;">
            ${escapeHtml(copyTarget)}
          </div>
          <div style="font-size:6.8pt;font-weight:800;color:#0f172a;margin-top:1.2mm;">
            SESSION: ${escapeHtml(sessLabel)}
          </div>
        </div>
      </div>
    `;

    const admissionTypeBarHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border:1px solid #cbd5e1;border-radius:4px;padding:1.2mm 2.5mm;margin-bottom:2mm;font-size:7.2pt;font-weight:800;color:#1e3a8a;">
        <span>ADMISSION CATEGORY / प्रवेश प्रकार:</span>
        <div style="display:flex;gap:4mm;">
          <span style="display:inline-flex;align-items:center;gap:1mm;">
            <span class="chk-box ${admissionType === "NEW" ? "chk-on" : ""}">${admissionType === "NEW" ? "✓" : ""}</span>
            <span>NEW ADMISSION (नया नामांकन)</span>
          </span>
          <span style="display:inline-flex;align-items:center;gap:1mm;">
            <span class="chk-box ${admissionType === "READMISSION" ? "chk-on" : ""}">${admissionType === "READMISSION" ? "✓" : ""}</span>
            <span>RE-ADMISSION / PROMOTION (पुनः नामांकन)</span>
          </span>
        </div>
      </div>
    `;

    const docsChecklistHtml = `
      <div class="docs-grid">
        <span style="font-weight:900;color:#1e3a8a;width:100%;font-size:7pt;margin-bottom:0.5mm;">
          DOCUMENTS SUBMITTED / संलग्न दस्तावेज:
        </span>
        ${ADMISSION_DOCUMENT_OPTIONS.map((docLabel) => {
          const checked = submittedDocs.includes(docLabel);
          return `
            <span class="doc-chip">
              <span class="chk-box ${checked ? "chk-on" : ""}">${checked ? "✓" : ""}</span>
              <span>${escapeHtml(docLabel)}</span>
            </span>
          `;
        }).join("")}
      </div>
    `;

    if (targetMode === "combined" && resolvedFee) {
      return `
        <div class="a4-sheet">
          <!-- TOP HALF: OFFICIAL ADMISSION BIO-DATA & CONFIRMATION -->
          <div class="adm-box">
            ${headerHtml}
            ${admissionTypeBarHtml}
            <div class="doc-badge-bar">
              <span>OFFICIAL ADMISSION CONFIRMATION &amp; STUDENT BIO-DATA (प्रवेश विवरण प्रपत्र)</span>
              <span>${escapeHtml(copyTarget)}</span>
            </div>

            <div class="meta-strip">
              <div class="meta-item">
                <span class="meta-lbl">Admission / App No.</span>
                <span class="meta-val">${escapeHtml(admNo)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Admission Date</span>
                <span class="meta-val">${escapeHtml(admDateRaw)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Class &amp; Section</span>
                <span class="meta-val">${escapeHtml(clsLabel)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Assigned Roll No.</span>
                <span class="meta-val">${escapeHtml(rollNo)}</span>
              </div>
            </div>

            <div class="bio-layout">
              <table class="bio-table">
                <tbody>
                  <tr>
                    <td class="lbl">Student Name</td>
                    <td class="val" style="text-transform:uppercase;font-size:8.2pt;">${escapeHtml(fullName)}</td>
                    <td class="lbl">DOB &amp; Gender</td>
                    <td class="val">${escapeHtml(dob)} (${escapeHtml(genderLabel)})</td>
                  </tr>
                  <tr>
                    <td class="lbl">Religion &amp; Nationality</td>
                    <td class="val">${escapeHtml(religion)} • ${escapeHtml(nationality)}</td>
                    <td class="lbl">Blood Grp &amp; Cat.</td>
                    <td class="val">${escapeHtml(bloodGroup)} | ${escapeHtml(category)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Student Aadhaar</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(studentAadhaar))}</td>
                    <td class="lbl">APAAR / PEN ID</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(apaarId || "—")}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Father's Name</td>
                    <td class="val">${escapeHtml(fatherName)}${fatherOcc ? ` (${escapeHtml(fatherOcc)})` : ""}</td>
                    <td class="lbl">Father Aadhaar</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(fatherAadhaar))}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Mother's Name</td>
                    <td class="val">${escapeHtml(motherName)}${motherOcc ? ` (${escapeHtml(motherOcc)})` : ""}</td>
                    <td class="lbl">Mother Aadhaar</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(motherAadhaar))}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Annual Income / Mobile</td>
                    <td class="val">${annualIncome && annualIncome !== "—" ? `₹${Number(annualIncome).toLocaleString("en-IN")}` : "—"} | ${escapeHtml(phone)}</td>
                    <td class="lbl">Emergency Contact</td>
                    <td class="val">${escapeHtml(emergencyPerson)}: ${escapeHtml(emergencyPhone)} (${escapeHtml(emergencyRelation)})</td>
                  </tr>
                  <tr>
                    <td class="lbl">Health / ID Mark</td>
                    <td class="val">${identificationMark && identificationMark !== "—" ? escapeHtml(identificationMark) : "Normal"} | ${escapeHtml(medicalCondition)}</td>
                    <td class="lbl">Tongue &amp; Medium</td>
                    <td class="val">${escapeHtml(motherTongue)} | ${escapeHtml(mediumOfInstruction)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Transport / Monthly</td>
                    <td class="val" colspan="3">${usesBus ? `Bus YES (Route/Stop: ${escapeHtml(busRoute || "Assigned Stop")} ₹${busFee}/mo)` : "NO (Self Arrangement)"} | Monthly Tuition: ₹${Number(monthlyFee || 0).toLocaleString("en-IN")}/mo</td>
                  </tr>
                  <tr>
                    <td class="lbl">Residential Address</td>
                    <td class="val" colspan="3">${escapeHtml(fullAddress)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="photo-frame">
                ${
                  photoUrl
                    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" crossorigin="anonymous" />`
                    : `<div style="font-size:6.5pt;color:#64748b;padding:2mm;">PASSPORT<br/>PHOTO<br/><strong style="font-size:12pt;color:#1e3a8a;">${escapeHtml(fullName.charAt(0).toUpperCase())}</strong></div>`
                }
              </div>
            </div>

            ${docsChecklistHtml}

            <div class="sig-row">
              <div class="sig-block">
                <div style="font-size:6pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Signature of Student</div>
              </div>
              <div class="sig-block">
                <div style="font-size:6pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Parent / Guardian Signature</div>
              </div>
              <div class="sig-block">
                <div style="font-size:6pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Admission In-Charge</div>
              </div>
              <div class="sig-block">
                ${school?.principalSignatureUrl ? `<img src="${escapeHtml(school.principalSignatureUrl)}" alt="Sign" crossorigin="anonymous" style="height:8mm;max-width:30mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:6mm;"></div>`}
                <div class="sig-line">${escapeHtml(school?.principalName || "Principal")} (Seal &amp; Sign)</div>
              </div>
            </div>
          </div>

          <!-- SCISSOR TEAR LINE -->
          <div class="cut-divider">
            <span>✂</span>
            <div class="cut-line"></div>
            <span>OFFICIAL ADMISSION FEE RECEIPT • प्रवेश शुल्क रसीद (${escapeHtml(copyTarget)})</span>
            <div class="cut-line"></div>
          </div>

          <!-- BOTTOM HALF: OFFICIAL ADMISSION FEE RECEIPT -->
          <div class="adm-box">
            <div class="inst-header" style="padding-bottom:1.5mm;margin-bottom:1.8mm;">
              <div class="inst-logo" style="width:11mm;height:11mm;">
                ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" />` : `<span>${escapeHtml((school?.name || "SC").slice(0, 2).toUpperCase())}</span>`}
              </div>
              <div class="inst-title-wrap">
                <div class="inst-name" style="font-size:11.5pt;">${escapeHtml(school?.name || "Institutional Campus")}</div>
                <div class="inst-sub">
                  ${school?.address ? `Address: ${escapeHtml(school.address)}` : ""}
                  ${school?.phone || school?.mobile ? `${school?.address ? " • " : ""}Helpline: ${escapeHtml(school.phone || school.mobile)}` : ""}
                  ${school?.code && school.code !== (school as any).lockCode && school.code !== "0002" ? ` • Reg. No: ${escapeHtml(school.code)}` : ""}
                </div>
              </div>
              <div style="text-align:right;">
                <span style="display:inline-block;padding:1mm 2.2mm;border-radius:3px;font-size:7pt;font-weight:900;background:${balanceDue <= 0 ? "#dcfce7" : "#fef3c7"};color:${balanceDue <= 0 ? "#166534" : "#92400e"};border:1px solid ${balanceDue <= 0 ? "#86efac" : "#fcd34d"};">
                  ${balanceDue <= 0 ? "✓ FULL PAID" : "PARTIAL PAID"}
                </span>
              </div>
            </div>

            <div class="doc-badge-bar" style="background:#0f172a;margin-bottom:1.8mm;">
              <span>OFFICIAL ADMISSION FEE RECEIPT (प्रवेश शुल्क रसीद)</span>
              <span>RECEIPT NO: ${escapeHtml(resolvedFee.receiptNo || "ADM-RCPT")}</span>
            </div>

            <div class="meta-strip" style="margin-bottom:1.5mm;">
              <div class="meta-item">
                <span class="meta-lbl">Student Name</span>
                <span class="meta-val">${escapeHtml(fullName)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Adm No / Class / Roll</span>
                <span class="meta-val">${escapeHtml(admNo)} • ${escapeHtml(clsLabel)} (#${escapeHtml(rollNo)})</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Father's Name</span>
                <span class="meta-val">${escapeHtml(fatherName)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Date &amp; Pay Mode</span>
                <span class="meta-val">${escapeHtml(resolvedFee.payModeInfo?.date || admDateRaw)} (${escapeHtml(resolvedFee.payModeInfo?.payMode || "Cash")})</span>
              </div>
            </div>

            <table class="fee-table">
              <thead>
                <tr>
                  <th style="width:8%;">#</th>
                  <th>Fee Particulars / शुल्क विवरण</th>
                  <th class="num" style="width:18%;">Fee Amount (₹)</th>
                  <th class="num" style="width:16%;">Concession (₹)</th>
                  <th class="num" style="width:18%;">Net Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${feeItems
                  .map(
                    (it, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${escapeHtml(it.description)}</td>
                    <td class="num">₹${Number(it.due || 0).toLocaleString("en-IN")}</td>
                    <td class="num">${Number(it.con || 0) > 0 ? `-₹${Number(it.con).toLocaleString("en-IN")}` : "—"}</td>
                    <td class="num" style="font-weight:800;">₹${Math.max(0, Number(it.due || 0) - Number(it.con || 0)).toLocaleString("en-IN")}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>

            <div class="receipt-footer-grid">
              <div class="totals-box">
                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:2mm;border-bottom:1px solid #cbd5e1;padding-bottom:1mm;margin-bottom:1mm;">
                  <span>Total Fee: <strong>₹${totalDue.toLocaleString("en-IN")}</strong></span>
                  ${totalCon > 0 ? `<span style="color:#047857;">Concession: <strong>-₹${totalCon.toLocaleString("en-IN")}</strong></span>` : ""}
                  <span style="color:#1e3a8a;font-size:8.5pt;">PAID NOW: <strong>₹${totalPaid.toLocaleString("en-IN")}</strong></span>
                  <span style="color:${balanceDue > 0 ? "#b91c1c" : "#15803d"};">Balance Due: <strong>₹${balanceDue.toLocaleString("en-IN")}</strong></span>
                </div>
                <div style="font-size:6.9pt;color:#334155;">
                  <strong>Amount in Words:</strong> ${escapeHtml(paidWords)}
                </div>
              </div>

              <div class="qr-mini">
                <img src="${qrImgUrl}" alt="QR" crossorigin="anonymous" />
              </div>

              <div class="sig-block" style="min-width:34mm;">
                ${school?.principalSignatureUrl ? `<img src="${escapeHtml(school.principalSignatureUrl)}" alt="Sign" crossorigin="anonymous" style="height:8mm;max-width:28mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:6mm;"></div>`}
                <div class="sig-line" style="font-size:6.8pt;">Authorized Signatory</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (targetMode === "receipt_only") {
      const effectiveReceiptItems =
        feeItems.length > 0
          ? feeItems
          : [
              {
                id: "1",
                slNo: 1,
                description: "Admission & Registration Fee (प्रवेश एवं नामांकन शुल्क)",
                due: Number(monthlyFee) || 0,
                con: 0,
                paid: Number(monthlyFee) || 0,
              },
            ];
      const rcptDue = effectiveReceiptItems.reduce((s, i) => s + Number(i.due || 0), 0);
      const rcptCon = resolvedFee ? totalCon : 0;
      const rcptNet = Math.max(0, rcptDue - rcptCon);
      const rcptPaid = resolvedFee ? totalPaid : rcptNet;
      const rcptBal = resolvedFee ? balanceDue : Math.max(0, rcptNet - rcptPaid);
      const rcptWords = numberToIndianWords(rcptPaid);
      const rcptNo = resolvedFee?.receiptNo || student?.admissionReceiptNo || "ADM-RCPT";
      const rcptDate = resolvedFee?.payModeInfo?.date || admDateRaw;
      const rcptPayMode = resolvedFee?.payModeInfo?.payMode || "Cash";
      const rcptPayRef = resolvedFee?.payModeInfo?.number && resolvedFee.payModeInfo.number !== "-" ? ` • Ref: ${resolvedFee.payModeInfo.number}` : "";

      const renderReceiptCopyBox = (copyLabel: string) => `
        <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:3.4mm 4mm;">
          <div>
            <div class="inst-header" style="padding-bottom:2mm;margin-bottom:2mm;">
              <div class="inst-logo" style="width:13mm;height:13mm;">
                ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" />` : `<span>${escapeHtml((school?.name || "SC").slice(0, 2).toUpperCase())}</span>`}
              </div>
              <div class="inst-title-wrap">
                <div class="inst-name" style="font-size:12.5pt;">${escapeHtml(school?.name || "Institutional Campus")}</div>
                ${school?.address ? `<div class="inst-sub">Address / Campus: ${escapeHtml(school.address)}</div>` : ""}
                <div class="inst-sub">
                  ${school?.phone || school?.mobile ? `Helpline: ${escapeHtml(school.phone || school.mobile)}` : ""}
                  ${school?.email ? `${school?.phone || school?.mobile ? " • " : ""}Email: ${escapeHtml(school.email)}` : ""}
                  ${school?.code && school.code !== (school as any).lockCode && school.code !== "0002" ? ` • Reg. No: ${escapeHtml(school.code)}` : ""}
                  • Office Timings: 08:00 AM – 02:00 PM
                </div>
              </div>
              <div style="text-align:right;min-width:34mm;">
                <div style="display:inline-block;padding:1mm 2.4mm;background:#1e3a8a;color:#ffffff;font-size:7pt;font-weight:900;border-radius:3px;letter-spacing:0.3px;">
                  ${escapeHtml(copyLabel)}
                </div>
                <div style="margin-top:1.2mm;">
                  <span style="display:inline-block;padding:0.8mm 2mm;border-radius:3px;font-size:6.8pt;font-weight:900;background:${rcptBal <= 0 ? "#dcfce7" : "#fef3c7"};color:${rcptBal <= 0 ? "#166534" : "#92400e"};border:1px solid ${rcptBal <= 0 ? "#86efac" : "#fcd34d"};">
                    ${rcptBal <= 0 ? "✓ FULL PAID" : "PARTIAL PAID"}
                  </span>
                </div>
              </div>
            </div>

            <div class="doc-badge-bar" style="background:#0f172a;margin-bottom:2mm;padding:1.5mm 3mm;">
              <span>OFFICIAL ADMISSION FEE RECEIPT • प्रवेश शुल्क रसीद (${admissionType === "READMISSION" ? "RE-ADMISSION" : "NEW ADMISSION"})</span>
              <span>RECEIPT NO: ${escapeHtml(rcptNo)}</span>
            </div>

            <div style="display:flex;gap:3mm;align-items:stretch;margin-bottom:2mm;">
              <div style="flex:1;">
                <table class="bio-table" style="font-size:7.6pt;">
                  <tbody>
                    <tr>
                      <td class="lbl">Student Name</td>
                      <td class="val" style="text-transform:uppercase;font-weight:900;">${escapeHtml(fullName)}</td>
                      <td class="lbl">Session</td>
                      <td class="val">${escapeHtml(sessLabel)}</td>
                    </tr>
                    <tr>
                      <td class="lbl">Admission No.</td>
                      <td class="val" style="font-family:monospace;">${escapeHtml(admNo)}</td>
                      <td class="lbl">Class &amp; Roll No.</td>
                      <td class="val">${escapeHtml(clsLabel)} (Roll: ${escapeHtml(rollNo)})</td>
                    </tr>
                    <tr>
                      <td class="lbl">Father's Name</td>
                      <td class="val">${escapeHtml(fatherName)}</td>
                      <td class="lbl">Mobile Number</td>
                      <td class="val">${escapeHtml(phone)}</td>
                    </tr>
                    <tr>
                      <td class="lbl">Payment Date</td>
                      <td class="val">${escapeHtml(rcptDate)}</td>
                      <td class="lbl">Payment Mode</td>
                      <td class="val">${escapeHtml(rcptPayMode)}${escapeHtml(rcptPayRef)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              ${
                photoUrl
                  ? `<div class="photo-frame" style="width:21mm;height:25mm;"><img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" crossorigin="anonymous" /></div>`
                  : ""
              }
            </div>

            <table class="fee-table" style="font-size:7.8pt;">
              <thead>
                <tr>
                  <th style="width:8%;text-align:center;">Sl.</th>
                  <th>Admission Fee Particulars / प्रवेश शुल्क विवरण</th>
                  <th class="num" style="width:18%;">Fee Amount (₹)</th>
                  <th class="num" style="width:16%;">Concession (₹)</th>
                  <th class="num" style="width:18%;">Net Paid (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${effectiveReceiptItems
                  .map(
                    (it, idx) => `
                  <tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td>${escapeHtml(it.description)}</td>
                    <td class="num">₹${Number(it.due || 0).toLocaleString("en-IN")}</td>
                    <td class="num">${Number(it.con || 0) > 0 ? `-₹${Number(it.con).toLocaleString("en-IN")}` : "—"}</td>
                    <td class="num" style="font-weight:800;">₹${Math.max(0, Number(it.due || 0) - Number(it.con || 0)).toLocaleString("en-IN")}</td>
                  </tr>
                `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>

          <div class="receipt-footer-grid" style="margin-top:2.5mm;">
            <div class="totals-box" style="padding:2mm 2.8mm;">
              <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:2.5mm;border-bottom:1px solid #cbd5e1;padding-bottom:1.2mm;margin-bottom:1.2mm;">
                <span>Gross Total: <strong>₹${rcptDue.toLocaleString("en-IN")}</strong></span>
                ${rcptCon > 0 ? `<span style="color:#047857;">Concession: <strong>-₹${rcptCon.toLocaleString("en-IN")}</strong></span>` : ""}
                <span style="color:#1e3a8a;font-size:9pt;">TOTAL PAID: <strong>₹${rcptPaid.toLocaleString("en-IN")}</strong></span>
                <span style="color:${rcptBal > 0 ? "#b91c1c" : "#15803d"};">Balance Due: <strong>₹${rcptBal.toLocaleString("en-IN")}</strong></span>
              </div>
              <div style="font-size:7.1pt;color:#334155;">
                <strong>Amount in Words:</strong> ${escapeHtml(rcptWords)}
              </div>
              <div style="font-size:6.4pt;color:#64748b;margin-top:0.8mm;">
                * Note: Admission &amp; Registration fees once paid are non-refundable. Computer generated official receipt.
              </div>
            </div>

            <div class="qr-mini" style="width:18mm;height:18mm;">
              <img src="${qrImgUrl}" alt="QR" crossorigin="anonymous" />
            </div>

            <div class="sig-block" style="min-width:30mm;">
              <div style="height:7mm;"></div>
              <div class="sig-line" style="font-size:6.6pt;">Cashier / Clerk</div>
            </div>

            <div class="sig-block" style="min-width:36mm;">
              ${school?.principalSignatureUrl ? `<img src="${escapeHtml(school.principalSignatureUrl)}" alt="Sign" crossorigin="anonymous" style="height:8.5mm;max-width:30mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:7mm;"></div>`}
              <div class="sig-line" style="font-size:6.8pt;">${escapeHtml(school?.principalName || "Principal")} (Sign &amp; Seal)</div>
            </div>
          </div>
        </div>
      `;

      return `
        <div class="a4-sheet">
          ${renderReceiptCopyBox("STUDENT / PARENT COPY")}
          <div class="cut-divider" style="margin:2.8mm 0;">
            <span>✂</span>
            <div class="cut-line"></div>
            <span>CUT HERE • यहाँ से फाड़ें (SCHOOL OFFICE &amp; ACCOUNTS COPY BELOW)</span>
            <div class="cut-line"></div>
          </div>
          ${renderReceiptCopyBox("SCHOOL OFFICE COPY")}
        </div>
      `;
    }

    // STANDALONE FULL A4 ADMISSION FORM
    return `
      <div class="a4-sheet">
        <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:4mm;">
          <div>
            ${headerHtml}
            ${admissionTypeBarHtml}
            <div class="doc-badge-bar" style="padding:1.8mm 3.2mm;font-size:8.5pt;">
              <span>OFFICIAL STUDENT ADMISSION &amp; REGISTRATION FORM (नामांकन आवेदन पत्र)</span>
              <span>FORM NO: ${escapeHtml(admNo)}</span>
            </div>

            <div class="meta-strip" style="padding:2mm 2.8mm;">
              <div class="meta-item">
                <span class="meta-lbl">Admission / Reg No.</span>
                <span class="meta-val">${escapeHtml(admNo)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Date of Admission</span>
                <span class="meta-val">${escapeHtml(admDateRaw)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Class Applied / Allotted</span>
                <span class="meta-val">${escapeHtml(clsLabel)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Roll Number</span>
                <span class="meta-val">${escapeHtml(rollNo)}</span>
              </div>
            </div>

            <div class="section-heading">1. Student Personal &amp; Identification Details (छात्र का व्यक्तिगत विवरण)</div>
            <div class="bio-layout">
              <table class="bio-table" style="font-size:7.8pt;">
                <tbody>
                  <tr>
                    <td class="lbl">Full Name of Student</td>
                    <td class="val" colspan="3" style="font-size:9.2pt;text-transform:uppercase;">${escapeHtml(fullName)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Date of Birth</td>
                    <td class="val">${escapeHtml(dob)}</td>
                    <td class="lbl">Gender</td>
                    <td class="val">${escapeHtml(genderLabel)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Religion &amp; Nationality</td>
                    <td class="val">${escapeHtml(religion)} • ${escapeHtml(nationality)}</td>
                    <td class="lbl">Blood Grp &amp; Category</td>
                    <td class="val">${escapeHtml(bloodGroup)} | ${escapeHtml(category)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Student Aadhaar (UIDAI)</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(studentAadhaar))}</td>
                    <td class="lbl">APAAR / PEN ID</td>
                    <td class="val" style="font-family:monospace;">${escapeHtml(apaarId || "—")}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Identification Mark</td>
                    <td class="val">${identificationMark && identificationMark !== "—" ? escapeHtml(identificationMark) : "Normal Mole / Cut"}</td>
                    <td class="lbl">Medical History / Allergy</td>
                    <td class="val">${escapeHtml(medicalCondition)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Mother Tongue &amp; Medium</td>
                    <td class="val">${escapeHtml(motherTongue)} | ${escapeHtml(mediumOfInstruction)}</td>
                    <td class="lbl">Previous School &amp; Marks</td>
                    <td class="val">${escapeHtml(prevSchool)} ${prevMarks ? `(${escapeHtml(prevMarks)})` : ""}</td>
                  </tr>
                </tbody>
              </table>

              <div class="photo-frame" style="width:28mm;height:35mm;">
                ${
                  photoUrl
                    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" crossorigin="anonymous" />`
                    : `<div style="font-size:6.5pt;color:#64748b;padding:2mm;">AFFIX<br/>PASSPORT<br/>PHOTO<br/><strong style="font-size:13pt;color:#1e3a8a;">${escapeHtml(fullName.charAt(0).toUpperCase())}</strong></div>`
                }
              </div>
            </div>

            <div class="section-heading">2. Parents &amp; Guardian Information (माता-पिता / अभिभावक का विवरण)</div>
            <table class="bio-table" style="font-size:7.8pt;">
              <tbody>
                <tr>
                  <td class="lbl">Father's Name</td>
                  <td class="val">${escapeHtml(fatherName)}</td>
                  <td class="lbl">Occupation &amp; Income</td>
                  <td class="val">${escapeHtml(fatherOcc || "—")} ${annualIncome && annualIncome !== "—" ? `(₹${Number(annualIncome).toLocaleString("en-IN")}/yr)` : ""}</td>
                </tr>
                <tr>
                  <td class="lbl">Father's Aadhaar (Masked)</td>
                  <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(fatherAadhaar))}</td>
                  <td class="lbl">Primary Mobile Phone</td>
                  <td class="val" style="font-weight:800;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td class="lbl">Mother's Name</td>
                  <td class="val">${escapeHtml(motherName)}</td>
                  <td class="lbl">Occupation &amp; WhatsApp</td>
                  <td class="val">${escapeHtml(motherOcc || "—")} | ${escapeHtml(whatsappNo || phone)}</td>
                </tr>
                <tr>
                  <td class="lbl">Mother's Aadhaar (Masked)</td>
                  <td class="val" style="font-family:monospace;">${escapeHtml(maskAadhaar(motherAadhaar))}</td>
                  <td class="lbl">Local Guardian (Optional)</td>
                  <td class="val">${escapeHtml(guardianName)} (${escapeHtml(guardianRelation)})</td>
                </tr>
                <tr>
                  <td class="lbl">Emergency Contact Person</td>
                  <td class="val" colspan="3">${escapeHtml(emergencyPerson)} — Mobile: <strong>${escapeHtml(emergencyPhone)}</strong> (Relation: ${escapeHtml(emergencyRelation)})</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">3. Residential Address &amp; Transport Facility (स्थायी एवं वर्तमान पता)</div>
            <table class="bio-table" style="font-size:7.8pt;">
              <tbody>
                <tr>
                  <td class="lbl">Present / Local Address</td>
                  <td class="val" colspan="3">${escapeHtml(fullAddress)}</td>
                </tr>
                <tr>
                  <td class="lbl">Permanent Native Address</td>
                  <td class="val" colspan="3">${escapeHtml(permanentAddress)}</td>
                </tr>
                <tr>
                  <td class="lbl">School Bus / Transport?</td>
                  <td class="val">${usesBus ? `YES — Route/Stop: ${escapeHtml(busRoute || "Main Route")} (₹${busFee}/mo)` : "NO (Own / Parent Arrangement)"}</td>
                  <td class="lbl">Monthly Tuition Fee</td>
                  <td class="val" style="font-weight:800;color:#1e3a8a;">₹${Number(monthlyFee || 0).toLocaleString("en-IN")} / month</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">4. Fee Structure &amp; Initial Payment Record (प्रारंभिक शुल्क एवं रसीद विवरण)</div>
            <table class="bio-table" style="font-size:7.8pt;">
              <thead>
                <tr style="background:#f1f5f9;font-weight:800;color:#1e3a8a;">
                  <td style="width:25%;">Admission Fee (प्रवेश शुल्क)</td>
                  <td style="width:25%;">Registration / Form Fee</td>
                  <td style="width:25%;">Monthly Tuition Fee</td>
                  <td style="width:25%;">Total Paid at Admission</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="val">₹${(feeItems.find(i => /admission/i.test(i.description))?.due || 0).toLocaleString("en-IN")}</td>
                  <td class="val">₹${(feeItems.find(i => /registration|form/i.test(i.description))?.due || 0).toLocaleString("en-IN")}</td>
                  <td class="val">₹${Number(monthlyFee || 0).toLocaleString("en-IN")} / mo</td>
                  <td class="val" style="font-weight:900;color:${totalPaid > 0 ? "#166534" : "#92400e"};">
                    ${totalPaid > 0 ? `₹${totalPaid.toLocaleString("en-IN")} (${resolvedFee?.payModeInfo?.payMode || "Cash"}) • Rcpt #${resolvedFee?.receiptNo || "ADM-01"}` : "Pending at Counter"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">5. Enclosures &amp; Documents Checklist (जमा किए गए दस्तावेज)</div>
            ${docsChecklistHtml}

            <div class="section-heading">6. Declaration by Parent / Guardian (अभिभावक द्वारा घोषणा)</div>
            <div style="font-size:7pt;color:#334155;line-height:1.4;border:1px solid #cbd5e1;border-radius:4px;padding:2mm 2.8mm;background:#f8fafc;">
              मैं प्रमाणित करता/करती हूँ कि ऊपर दिया गया छात्र का नाम, जन्मतिथि एवं अन्य सभी विवरण पूर्णतः सत्य हैं। मैं विद्यालय के अनुशासन, उपस्थिति एवं शुल्क संबंधी सभी नियमों का पालन करने के लिए सहमत हूँ।<br/>
              <em>I hereby declare that the particulars furnished above are true and correct to the best of my knowledge, and I agree to abide by the rules, fee schedule, and discipline regulations of the institution.</em>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;border:1.2px solid #1e3a8a;border-radius:4px;padding:1.8mm 2.8mm;margin-top:2.5mm;background:#f8fafc;font-size:7.2pt;">
              <div>
                <strong style="color:#1e3a8a;">FOR OFFICE USE ONLY:</strong> Enrollment Status: <strong style="color:#166534;">CONFIRMED &amp; APPROVED BY AUTHORITY</strong> • Class: <strong>${escapeHtml(clsLabel)}</strong> • Roll No: <strong>${escapeHtml(rollNo)}</strong>
                ${resolvedFee ? ` • Adm. Receipt: <strong>${escapeHtml(resolvedFee.receiptNo)} (Paid ₹${totalPaid.toLocaleString("en-IN")})</strong>` : ""}
              </div>
              <img src="${qrImgUrl}" alt="QR" crossorigin="anonymous" style="width:13mm;height:13mm;object-fit:contain;" />
            </div>

            <div class="sig-row" style="margin-top:5mm;">
              <div class="sig-block">
                <div style="font-size:6.2pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Signature of Student</div>
              </div>
              <div class="sig-block">
                <div style="font-size:6.2pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Signature of Parent / Guardian</div>
              </div>
              <div class="sig-block">
                <div style="font-size:6.2pt;color:#64748b;margin-bottom:0.8mm;">Date: ____/____/20__</div>
                <div class="sig-line">Admission Clerk</div>
              </div>
              <div class="sig-block">
                ${school?.principalSignatureUrl ? `<img src="${escapeHtml(school.principalSignatureUrl)}" alt="Sign" crossorigin="anonymous" style="height:9mm;max-width:32mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:7mm;"></div>`}
                <div class="sig-line">${escapeHtml(school?.principalName || "Principal")} (Seal &amp; Sign)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintA4 = () => {
    const bodyHtml = buildSheetInnerHtml(mode);
    const fullDoc = `<!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Admission_${escapeHtml(fullName)}_${escapeHtml(admNo)}</title>
          <style>${ADMISSION_PRINT_CSS}</style>
        </head>
        <body>${bodyHtml}</body>
      </html>`;
    printHtmlInIframe(fullDoc, `Admission Print - ${fullName}`);
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = "794px";
    container.style.background = "#ffffff";
    container.style.padding = "18px";
    container.style.zIndex = "-1";

    const styleEl = document.createElement("style");
    styleEl.innerHTML = ADMISSION_PRINT_CSS;
    container.appendChild(styleEl);

    const sheetWrap = document.createElement("div");
    sheetWrap.innerHTML = buildSheetInnerHtml(mode);
    container.appendChild(sheetWrap);
    document.body.appendChild(container);

    try {
      const targetEl = (container.querySelector(".a4-sheet") as HTMLElement) || sheetWrap;
      const canvas = await html2canvas(targetEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const renderW = pdfW - margin * 2;
      const renderH = Math.min(pdfH - margin * 2, (canvas.height * renderW) / canvas.width);
      pdf.addImage(imgData, "JPEG", margin, margin, renderW, renderH);
      const safeName = fullName.replace(/[^a-z0-9-_]+/gi, "_");
      const prefix =
        mode === "combined"
          ? "Admission_Form_And_Receipt"
          : mode === "receipt_only"
          ? "Official_Admission_Fee_Receipt"
          : "Admission_Form";
      pdf.save(`${prefix}_${safeName}_${admNo}.pdf`);
    } catch (err) {
      console.warn("PDF generation fallback to print:", err);
      handlePrintA4();
    } finally {
      if (container.parentNode) container.parentNode.removeChild(container);
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 dark:border-slate-700 overflow-hidden">
        {/* Top Action Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600/25 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight">
                Official Admission Print &amp; Receipt Studio
              </h3>
              <p className="text-[11px] text-slate-400">
                {fullName} • {admNo} • {clsLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrintA4}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow cursor-pointer transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow cursor-pointer transition disabled:opacity-60"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
            </button>

            {resolvedFee && (
              <button
                type="button"
                onClick={() => setShowOfficialPosModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold cursor-pointer transition"
                title="Thermal POS 80mm / 4-in-1 / WhatsApp Share"
              >
                <ReceiptText className="w-4 h-4 text-amber-300" />
                <span>POS / WhatsApp रसीद</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mode Switcher Bar */}
        <div className="bg-white dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {resolvedFee && (
              <button
                type="button"
                onClick={() => setMode("combined")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                  mode === "combined"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                }`}
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>1 A4 पर दोनों (फॉर्म + रसीद)</span>
              </button>
            )}

            {(resolvedFee || mode === "receipt_only") && (
              <button
                type="button"
                onClick={() => setMode("receipt_only")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                  mode === "receipt_only"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                }`}
              >
                <ReceiptText className="w-3.5 h-3.5" />
                <span>केवल रसीद (Admission Receipt)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMode("form_only")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                mode === "form_only"
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>केवल फॉर्म (Full A4)</span>
            </button>

            {/* Admission Type Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl border border-slate-300 dark:border-slate-600 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setAdmissionType("NEW")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  admissionType === "NEW" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                New Admission
              </button>
              <button
                type="button"
                onClick={() => setAdmissionType("READMISSION")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  admissionType === "READMISSION" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Re-Admission
              </button>
            </div>

            {/* Copy Target Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-xl border border-slate-300 dark:border-slate-600 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setCopyTarget("PARENT COPY")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  copyTarget === "PARENT COPY" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Parent Copy
              </button>
              <button
                type="button"
                onClick={() => setCopyTarget("OFFICE COPY")}
                className={`px-2.5 py-1 rounded-lg transition ${
                  copyTarget === "OFFICE COPY" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
              >
                Office Copy
              </button>
            </div>
          </div>
        </div>

        {/* Live Scaled A4 Preview Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 flex justify-center bg-slate-200/80 dark:bg-slate-950">
          <div className="bg-white shadow-xl border border-slate-300 rounded-md p-3 sm:p-5 overflow-x-auto max-w-full">
            <style>{ADMISSION_PRINT_CSS}</style>
            <div
              ref={previewRef}
              dangerouslySetInnerHTML={{ __html: buildSheetInnerHtml(mode) }}
            />
          </div>
        </div>
      </div>

      {/* Optional Thermal POS / 4-in-1 / WhatsApp Fee Receipt Modal */}
      {showOfficialPosModal && resolvedFee && (
        <OfficialFeeReceiptModal
          isOpen={showOfficialPosModal}
          onClose={() => setShowOfficialPosModal(false)}
          school={school}
          fee={resolvedFee}
          student={{
            id: student?.id || application?.enrolledStudentId || "std",
            schoolId: school.id,
            sessionId: sessLabel,
            classId: student?.classId || application?.classId || "",
            name: fullName,
            rollNo: rollNo === "Not Assigned" ? "" : rollNo,
            admissionNo: admNo,
            fatherName,
            motherName,
            phone: phone === "—" ? "" : phone,
            photoUrl,
            monthlyFee: Number(monthlyFee) || 0,
            joinDate: admDateRaw,
            active: true,
            createdAt: new Date().toISOString(),
          }}
          className={clsLabel}
          sessionName={sessLabel}
        />
      )}
    </div>
  );
};
