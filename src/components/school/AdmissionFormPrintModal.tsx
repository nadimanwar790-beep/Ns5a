import React, { useState, useMemo, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderHtmlToCanvasSafe } from "../../utils/safePdfCapture";
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
  MessageCircle,
  Send,
  Pencil,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import type {
  School,
  SchoolStudent,
  AdmissionApplication,
  MonthlyFee,
  NstaMessage,
} from "../../school-types";
import { ADMISSION_DOCUMENT_OPTIONS, ADMISSION_CATEGORIES, BLOOD_GROUPS } from "../../school-types";
import { getLocalFees, updateStudent, saveAdmissionApplication, saveNstaMessage } from "../../school-firebase";
import { uploadToCloudinary } from "../../services/cloudinaryService";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { getSavedSchoolLogo, getVisibleSchoolRegNo, numberToIndianWords, formatAcademicSession, maskSensitive2Chars } from "./feeReceiptUtils";
import { buildAdmissionQrUrl } from "../../utils/qrVerifyUrl";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import {
  shareFeeReceiptOnWhatsApp,
  buildWhatsAppReceiptMessage,
} from "./feeDocument";
import { WhatsAppShareModal } from "./WhatsAppShareModal";

export type AdmissionPrintMode = "classic_box_grid" | "combined" | "form_only" | "receipt_only";
export type AdmissionSignatoryMode = "both" | "cashier_only" | "principal_only";

export function calculateAgeOnAprilFirst(
  dobStr?: string,
  sessionYear?: number
): { years: number; months: number; days: number } | null {
  if (!dobStr || dobStr === "—" || dobStr === "-") return null;
  let birthDate: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dobStr)) {
    const [y, m, d] = dobStr.split("-").map(Number);
    birthDate = new Date(y, m - 1, d);
  } else if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(dobStr)) {
    const parts = dobStr.split(/[/-]/).map(Number);
    birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
  } else {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) birthDate = d;
  }
  if (!birthDate || isNaN(birthDate.getTime())) return null;

  const refYear = sessionYear || new Date().getFullYear();
  const targetDate = new Date(refYear, 3, 1); // 1st April
  if (birthDate > targetDate) return { years: 0, months: 0, days: 0 };

  let years = targetDate.getFullYear() - birthDate.getFullYear();
  let months = targetDate.getMonth() - birthDate.getMonth();
  let days = targetDate.getDate() - birthDate.getDate();

  if (days < 0) {
    months--;
    const prevMonthDays = new Date(targetDate.getFullYear(), targetDate.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  return {
    years: Math.max(0, years),
    months: Math.max(0, months),
    days: Math.max(0, days),
  };
}

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
  isStudentView?: boolean;
  defaultMasked?: boolean;
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
 * Extracts all active stylesheets from the current document as synchronous inline <style> blocks
 * (falling back to <link> tags only for cross-origin stylesheets), preventing unstyled prints.
 */
export function extractDocumentStylesHtml(): string {
  if (typeof document === "undefined") return "";
  const chunks: string[] = [];

  try {
    const sheets = Array.from(document.styleSheets || []);
    for (const sheet of sheets) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules && rules.length > 0) {
          const cssText = Array.from(rules)
            .map((r) => r.cssText)
            .join("\n");
          if (cssText.trim()) {
            chunks.push(`<style>${cssText}</style>`);
            continue;
          }
        }
      } catch {
        // Cross-origin stylesheet — fall back to ownerNode below
      }
      const owner = sheet.ownerNode as HTMLElement | null;
      if (owner?.outerHTML) {
        chunks.push(owner.outerHTML);
      }
    }
  } catch {
    // Ignore stylesheet inspection errors
  }

  if (chunks.length === 0) {
    return Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join("\n");
  }
  return chunks.join("\n");
}

/**
 * Prints an HTML document inside an invisible off-screen iframe so printing works
 * reliably inside preview iframes and Android Print Spooler without window.open popups.
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
  // Give real off-screen desktop/A4 dimensions so responsive Tailwind rules & grids never evaluate at 0px width
  iframe.style.position = "fixed";
  iframe.style.left = "-12000px";
  iframe.style.top = "0";
  iframe.style.width = "1180px";
  iframe.style.height = "840px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlDocument);
  doc.close();

  let printed = false;
  const cleanup = () => {
    try {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    } catch {}
  };

  const triggerPrint = () => {
    if (printed) return;
    printed = true;
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.onafterprint = () => {
          setTimeout(cleanup, 500);
        };
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    } catch (err) {
      console.warn("Iframe print error:", err);
    } finally {
      setTimeout(cleanup, 60000);
    }
  };

  // Wait for stylesheets, fonts, and images (logo, student photo, QR, signature) to finish loading
  const waitForResources = async () => {
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    const imgs = Array.from(doc.images || []);

    const linkPromises = links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) {
            resolve();
            return;
          }
          link.addEventListener("load", () => resolve(), { once: true });
          link.addEventListener("error", () => resolve(), { once: true });
        })
    );

    const imgPromises = imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    );

    const fontPromise = (doc as any).fonts?.ready
      ? Promise.race([(doc as any).fonts.ready, new Promise((r) => setTimeout(r, 800))])
      : Promise.resolve();

    await Promise.race([
      Promise.all([...linkPromises, ...imgPromises, fontPromise]),
      new Promise<void>((resolve) => setTimeout(resolve, 2200)),
    ]);

    setTimeout(triggerPrint, 180);
  };

  void waitForResources();
}

/**
 * Clones active stylesheets and prints a specific DOM element cleanly inside an isolated iframe.
 */
export function printElementInIframe(
  element: HTMLElement | null,
  title = "Print Document",
  extraCss = ""
): void {
  if (!element || typeof document === "undefined") return;
  const styles = extractDocumentStylesHtml();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  ${styles}
  <style>
    @page { size: auto; margin: 8mm; }
    html, body {
      margin: 0 !important;
      padding: 8px !important;
      background: #ffffff !important;
      color: #0f172a !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .print-center-stage {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
    }
    .print\\:hidden, .no-print { display: none !important; }
    ${extraCss}
  </style>
</head>
<body>
  <div class="print-center-stage">${element.outerHTML}</div>
</body>
</html>`;

  printHtmlInIframe(html, title);
}

const ADMISSION_PRINT_CSS = `
  @page { size: A4 portrait; margin: 6mm 7mm; }
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
    box-sizing: border-box;
  }
  .page-break {
    page-break-after: always;
    break-after: page;
    height: 0;
    margin: 0;
    padding: 0;
    display: block;
    clear: both;
  }
  @media print {
    .a4-sheet {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      min-height: 284mm !important;
      margin: 0 auto !important;
    }
    .page-break {
      page-break-after: always !important;
      break-after: page !important;
      visibility: hidden !important;
    }
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
  .c-char-box {
    width: 5.6mm;
    height: 5.6mm;
    border: 1px solid #000000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 7.6pt;
    font-weight: 700;
    box-sizing: border-box;
    text-transform: uppercase;
    background: #ffffff;
    color: #000000;
    flex-shrink: 0;
  }
  .c-check-box {
    width: 4.8mm;
    height: 4.8mm;
    border: 1.2px solid #000000;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 7.5pt;
    font-weight: 900;
    box-sizing: border-box;
    vertical-align: middle;
    background: #ffffff;
    color: #000000;
  }
  .c-dotted-line {
    border-bottom: 1px dotted #000000;
    display: inline-block;
    min-height: 4.2mm;
    vertical-align: bottom;
    padding-left: 1mm;
    padding-right: 1mm;
    box-sizing: border-box;
    color: #000000;
    font-weight: 700;
  }
  .c-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 7.6pt;
  }
  .c-table th, .c-table td {
    border: 1px solid #000000;
    padding: 1.2mm 2mm;
    text-align: left;
  }
  .c-table th {
    font-weight: 700;
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
  isStudentView = false,
  defaultMasked = false,
}) => {
  // Automatically resolve admission fee record if not explicitly passed
  const resolvedFee = useMemo<MonthlyFee>(() => {
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
              d.registrationFee > 0 && { id: "2", slNo: 2, description: "Registration & Form Fee (फॉर्म शुल्क)", due: d.registrationFee, con: 0, paid: d.registrationFee },
              d.developmentFee > 0 && { id: "3", slNo: 3, description: "Annual / Development Charges", due: d.developmentFee, con: 0, paid: d.developmentFee },
              d.idKitFee > 0 && { id: "4", slNo: 4, description: "ID Card, Diary & Tie-Belt (आईडी व डायरी)", due: d.idKitFee, con: 0, paid: d.idKitFee },
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
          bank: "School Counter",
          number: "-",
        },
        items: fallbackItems,
      };
    }

    // Default authentic Admission Fee structure so combined Form + Receipt is always complete
    const tuitionVal = Number(student?.monthlyFee ?? application?.monthlyFee ?? 1000) || 1000;
    const admPart = tuitionVal >= 2500 ? 3000 : 1500;
    const regPart = 500;
    const idPart = 300;
    const totalAdmissionBill = admPart + regPart + idPart + tuitionVal;
    const generatedReceiptNo = student?.admissionReceiptNo || `ADM-${(sessionName || "2026-27").replace(/\D/g, "").slice(0, 4)}-${student?.admissionNo || application?.applicationNo || String(Math.floor(10000 + Math.random() * 90000))}`;

    return {
      schoolId: school?.id || "school_campus",
      sessionId: sessionName || "2026-27",
      studentId: student?.id || application?.enrolledStudentId || application?.id || "std",
      studentName: student?.name || application?.studentName || "Student",
      rollNo: student?.rollNo || application?.assignedRollNo || "1",
      classId: student?.classId || application?.classId || "",
      month: new Date().toISOString().slice(0, 7),
      amount: totalAdmissionBill,
      paid: true,
      paidDate: student?.joinDate || application?.appliedAt || new Date().toISOString(),
      receiptNo: generatedReceiptNo,
      paidAmount: totalAdmissionBill,
      balanceDue: 0,
      concession: 0,
      feeType: "admission",
      receiptCategory: "admission",
      payModeInfo: {
        payMode: "Cash",
        date: new Date().toLocaleDateString("en-GB"),
        bank: "School Counter",
        number: "-",
      },
      items: [
        { id: "1", slNo: 1, description: "Admission Fee (प्रवेश शुल्क)", due: admPart, con: 0, paid: admPart },
        { id: "2", slNo: 2, description: "Registration & Form Fee (फॉर्म शुल्क)", due: regPart, con: 0, paid: regPart },
        { id: "3", slNo: 3, description: "ID Card, Diary & Tie-Belt (आईडी व डायरी)", due: idPart, con: 0, paid: idPart },
        { id: "4", slNo: 4, description: "1st Month Tuition Fee (प्रथम माह शुल्क)", due: tuitionVal, con: 0, paid: tuitionVal },
      ],
    };
  }, [feeRecord, school?.id, student, application, sessionName]);

  const [mode, setMode] = useState<AdmissionPrintMode>(() => {
    if (initialMode && initialMode !== "classic_box_grid") return initialMode;
    return "form_only";
  });
  const [isBlankForm, setIsBlankForm] = useState<boolean>(false);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(() => Boolean(defaultMasked));
  React.useEffect(() => {
    setMaskSensitiveData(Boolean(defaultMasked));
  }, [defaultMasked, isOpen]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [showOfficialPosModal, setShowOfficialPosModal] = useState(false);
  const [admissionType, setAdmissionType] = useState<"NEW" | "READMISSION">(() => {
    const rawType = (student as any)?.admissionType || (application as any)?.admissionType;
    return rawType === "READMISSION" ? "READMISSION" : "NEW";
  });
  const [copyTarget] = useState<"PARENT COPY" | "OFFICE COPY">("PARENT COPY");
  const [signatoryMode] = useState<AdmissionSignatoryMode>("both");
  const [showDigitalSig] = useState<boolean>(true);
  const [cashierTitle] = useState<string>(() =>
    resolvedFee?.collectedByRole === "manager"
      ? `${resolvedFee?.collectedByName || school?.managerName || "Manager"} (Manager)`
      : `${resolvedFee?.collectedByName || school?.accountantName || "Accountant"} (Accountant)`
  );
  const [principalTitle, setPrincipalTitle] = useState<string>(() => `${school?.principalName || "Principal"} (Sign & Seal)`);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const previewViewportRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    const availW = Math.max(280, window.innerWidth - 36);
    return Math.min(1, Number((availW / 741).toFixed(3)));
  });
  const [previewPage, setPreviewPage] = useState<1 | 2 | 3 | "all">("all");

  React.useEffect(() => {
    const el = previewViewportRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const updateFit = () => {
      const w = el.clientWidth;
      if (w > 120) {
        const nextFit = Math.min(1, Math.max(0.32, Number(((w - 24) / 741).toFixed(3))));
        setFitScale(nextFit);
      }
    };
    updateFit();
    const ro = new ResizeObserver(updateFit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  React.useEffect(() => {
    if (school?.principalName) {
      setPrincipalTitle(`${school.principalName} (Sign & Seal)`);
    }
  }, [school?.principalName]);

  const [isEditingForm, setIsEditingForm] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const buildInitialEditDraft = () => ({
    studentName: student?.name || application?.studentName || "",
    admissionNo: student?.admissionNo || application?.applicationNo || "",
    rollNo: student?.rollNo || application?.assignedRollNo || "",
    joinDate: student?.joinDate || (application?.appliedAt ? application.appliedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
    dateOfBirth: student?.dateOfBirth || application?.dateOfBirth || "",
    gender: student?.gender || application?.gender || "male",
    category: student?.category || application?.category || "General",
    religion: (student as any)?.religion || (application as any)?.religion || "Hindu",
    nationality: (student as any)?.nationality || (application as any)?.nationality || "Indian",
    bloodGroup: student?.bloodGroup || application?.bloodGroup || "",
    aadhaarNo: student?.aadhaarNo || application?.aadhaarNo || "",
    apaarId: student?.apaarId || application?.apaarId || "",
    phone: student?.phone || application?.phone || student?.fatherPhone || application?.fatherPhone || "",
    whatsappNo: student?.whatsappNo || application?.whatsappNo || student?.fatherWhatsapp || application?.fatherWhatsapp || "",
    fatherName: student?.fatherName || application?.fatherName || "",
    fatherPhone: student?.fatherPhone || application?.fatherPhone || "",
    fatherOccupation: student?.fatherOccupation || application?.fatherOccupation || "",
    fatherQualification: (student as any)?.fatherQualification || (application as any)?.fatherQualification || "",
    motherName: student?.motherName || application?.motherName || "",
    motherPhone: student?.motherPhone || application?.motherPhone || "",
    motherOccupation: student?.motherOccupation || application?.motherOccupation || "",
    motherQualification: (student as any)?.motherQualification || (application as any)?.motherQualification || "",
    address: student?.address || application?.address || "",
    permanentAddress: (student as any)?.permanentAddress || (application as any)?.permanentAddress || student?.address || application?.address || "",
    previousSchool: student?.previousSchool || application?.previousSchool || "",
    monthlyFee: String(student?.monthlyFee ?? application?.monthlyFee ?? 0),
  });

  const [editDraft, setEditDraft] = useState(buildInitialEditDraft);
  const [appliedOverrides, setAppliedOverrides] = useState<ReturnType<typeof buildInitialEditDraft> | null>(null);

  React.useEffect(() => {
    if (initialMode && initialMode !== "classic_box_grid") {
      setMode(initialMode);
    } else {
      setMode("form_only");
    }
    setPreviewPage("all");
    if (isStudentView) {
      setIsBlankForm(false);
    }
    const rawType = (student as any)?.admissionType || (application as any)?.admissionType;
    if (rawType === "READMISSION" || rawType === "NEW") {
      setAdmissionType(rawType);
    }
    const freshDraft = buildInitialEditDraft();
    setEditDraft(freshDraft);
    setAppliedOverrides(null);
    setIsEditingForm(false);
  }, [initialMode, isOpen, student, application, isStudentView]);

  if (!isOpen) return null;

  const activeData = isEditingForm ? editDraft : (appliedOverrides || editDraft);

  const handleSaveFormEdits = async () => {
    setSavingEdit(true);
    try {
      const updatedMonthlyFee = Number(editDraft.monthlyFee || 0);
      if (school?.id && student?.id) {
        await updateStudent(school.id, student.id, {
          name: editDraft.studentName.trim() || student.name,
          admissionNo: editDraft.admissionNo.trim() || student.admissionNo,
          rollNo: editDraft.rollNo.trim() || student.rollNo,
          joinDate: editDraft.joinDate || student.joinDate,
          dateOfBirth: editDraft.dateOfBirth,
          gender: editDraft.gender as any,
          category: editDraft.category,
          religion: editDraft.religion,
          nationality: editDraft.nationality,
          bloodGroup: editDraft.bloodGroup,
          aadhaarNo: editDraft.aadhaarNo,
          apaarId: editDraft.apaarId,
          phone: editDraft.phone,
          whatsappNo: editDraft.whatsappNo,
          fatherName: editDraft.fatherName,
          fatherPhone: editDraft.fatherPhone,
          fatherOccupation: editDraft.fatherOccupation,
          fatherQualification: editDraft.fatherQualification,
          motherName: editDraft.motherName,
          motherPhone: editDraft.motherPhone,
          motherOccupation: editDraft.motherOccupation,
          motherQualification: editDraft.motherQualification,
          address: editDraft.address,
          permanentAddress: editDraft.permanentAddress,
          previousSchool: editDraft.previousSchool,
          monthlyFee: isNaN(updatedMonthlyFee) ? student.monthlyFee : updatedMonthlyFee,
          admissionType,
        } as any);
      }
      if (school?.id && application?.id) {
        await saveAdmissionApplication(school.id, {
          ...(application as AdmissionApplication),
          studentName: editDraft.studentName.trim() || application.studentName || "",
          assignedRollNo: editDraft.rollNo.trim() || application.assignedRollNo,
          dateOfBirth: editDraft.dateOfBirth,
          gender: editDraft.gender as any,
          category: editDraft.category,
          religion: editDraft.religion,
          nationality: editDraft.nationality,
          bloodGroup: editDraft.bloodGroup,
          aadhaarNo: editDraft.aadhaarNo,
          apaarId: editDraft.apaarId,
          phone: editDraft.phone,
          whatsappNo: editDraft.whatsappNo,
          fatherName: editDraft.fatherName,
          fatherPhone: editDraft.fatherPhone,
          fatherOccupation: editDraft.fatherOccupation,
          fatherQualification: editDraft.fatherQualification,
          motherName: editDraft.motherName,
          motherPhone: editDraft.motherPhone,
          motherOccupation: editDraft.motherOccupation,
          motherQualification: editDraft.motherQualification,
          address: editDraft.address,
          permanentAddress: editDraft.permanentAddress,
          previousSchool: editDraft.previousSchool,
          monthlyFee: isNaN(updatedMonthlyFee) ? application.monthlyFee : updatedMonthlyFee,
          admissionType,
        } as any);
      }
      setAppliedOverrides({ ...editDraft });
      setIsEditingForm(false);
      toast.success("Admission form details saved & applied to A4 sheet!");
    } catch (err) {
      console.error("Failed to save admission form edits:", err);
      toast.error("Details preview par apply ho gaye, lekin save karte samay error aaya.");
      setAppliedOverrides({ ...editDraft });
      setIsEditingForm(false);
    } finally {
      setSavingEdit(false);
    }
  };

  // Masking helper (2 chars + xxxx when maskSensitiveData enabled; full unmasked data when disabled)
  const maskAadhaar = (val?: string | number | null): string => {
    if (!val || val === "—") return "—";
    return maskSensitiveData ? maskSensitive2Chars(val, true) : String(val).trim();
  };

  // Unified normalized bio-data from student + application + live edits
  const logoUrl = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const fullName = activeData.studentName || student?.name || application?.studentName || "—";
  const admNo = activeData.admissionNo || student?.admissionNo || application?.applicationNo || "—";
  const rollNo = activeData.rollNo || student?.rollNo || application?.assignedRollNo || "Not Assigned";
  const sessLabel = formatAcademicSession(sessionName || student?.sessionId || "2026-27");
  const rawCls = className || student?.className || application?.className || student?.classId || "—";
  const stream = student?.stream || application?.stream || "";
  const clsLabel = stream && !rawCls.toLowerCase().includes(stream.toLowerCase())
    ? `${rawCls} (${stream})`
    : rawCls;
  const admDateRaw = activeData.joinDate || student?.joinDate || (application?.appliedAt ? application.appliedAt.slice(0, 10) : new Date().toISOString().slice(0, 10));
  const dob = activeData.dateOfBirth || student?.dateOfBirth || application?.dateOfBirth || "—";
  const genderRaw = activeData.gender || student?.gender || application?.gender || "";
  const genderLabel = genderRaw ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1) : "—";
  const bloodGroup = activeData.bloodGroup || student?.bloodGroup || application?.bloodGroup || "—";
  const category = activeData.category || student?.category || application?.category || "General";
  const apaarId = activeData.apaarId || student?.apaarId || application?.apaarId || "—";
  const studentAadhaar = activeData.aadhaarNo || student?.aadhaarNo || application?.aadhaarNo || "—";
  const fatherName = activeData.fatherName || student?.fatherName || application?.fatherName || "—";
  const fatherOcc = activeData.fatherOccupation || student?.fatherOccupation || application?.fatherOccupation || "";
  const fatherAadhaar = student?.fatherAadhaar || application?.fatherAadhaar || "—";
  const fatherPhone = activeData.fatherPhone || student?.fatherPhone || application?.fatherPhone || "";
  const fatherWhatsapp = student?.fatherWhatsapp || application?.fatherWhatsapp || "";
  const motherName = activeData.motherName || student?.motherName || application?.motherName || "—";
  const motherOcc = activeData.motherOccupation || student?.motherOccupation || application?.motherOccupation || "";
  const motherAadhaar = student?.motherAadhaar || application?.motherAadhaar || "—";
  const motherPhone = activeData.motherPhone || student?.motherPhone || application?.motherPhone || "";
  const motherWhatsapp = student?.motherWhatsapp || application?.motherWhatsapp || "";
  const phone = activeData.phone || student?.phone || application?.phone || fatherPhone || "—";
  const whatsappNo = activeData.whatsappNo || student?.whatsappNo || application?.whatsappNo || fatherWhatsapp || "";
  const email = student?.email || application?.email || "";
  const addressParts = activeData.address
    ? [activeData.address]
    : [
        student?.address || application?.address || "",
        student?.city || application?.city || "",
        student?.pincode || application?.pincode ? `PIN: ${student?.pincode || application?.pincode}` : "",
      ].filter(Boolean);
  const fullAddress = addressParts.join(", ") || "—";
  const permanentAddress = activeData.permanentAddress || (student as any)?.permanentAddress || (application as any)?.permanentAddress || fullAddress;
  const prevSchool = activeData.previousSchool || student?.previousSchool || application?.previousSchool || "—";
  const prevMarks = student?.previousMarks || application?.previousMarks || "";
  const photoUrl = student?.photoUrl || application?.photoUrl || "";
  const monthlyFee = Number(activeData.monthlyFee || 0) || (student?.monthlyFee ?? application?.monthlyFee ?? 0);
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
  const emergencyWhatsapp = student?.emergencyWhatsapp || application?.emergencyWhatsapp || "";
  const identificationMark = student?.identificationMark || (student as any)?.idMark || application?.identificationMark || "—";
  const medicalCondition = student?.medicalHistory || (student as any)?.medicalNotes || application?.medicalHistory || (application as any)?.medicalNotes || "Normal / Fit";
  const religion = activeData.religion || (student as any)?.religion || (application as any)?.religion || "Hindu";
  const nationality = activeData.nationality || (student as any)?.nationality || (application as any)?.nationality || "Indian";
  const guardianName = (student as any)?.guardianName || (application as any)?.guardianName || fatherName;
  const guardianRelation = (student as any)?.guardianRelation || (application as any)?.guardianRelation || "Father / Guardian";
  const fatherQualification = activeData.fatherQualification || (student as any)?.fatherQualification || (application as any)?.fatherQualification || "";
  const motherQualification = activeData.motherQualification || (student as any)?.motherQualification || (application as any)?.motherQualification || "";
  const isOnlyChild = (student as any)?.isOnlyChild ?? (application as any)?.isOnlyChild ?? false;
  const siblings: Array<{ name: string; relation: string; className: string }> = (student as any)?.siblingDetails || (application as any)?.siblingDetails || [];
  const transportModeIfNo = (student as any)?.transportModeIfNo || (application as any)?.transportModeIfNo || "Walking";
  const transportDistanceKm = (student as any)?.transportDistanceKm || (application as any)?.transportDistanceKm || "";
  const busNumber = (student as any)?.busNumber || (application as any)?.busNumber || "";
  const driverName = (student as any)?.driverName || (application as any)?.driverName || "";
  const driverPhone = (student as any)?.driverPhone || (application as any)?.driverPhone || "";
  const childSensitivity = (student as any)?.childSensitivity || (application as any)?.childSensitivity || false;
  const childSensitivityRemarks = (student as any)?.childSensitivityRemarks || (application as any)?.childSensitivityRemarks || "";
  const sessionStartYear = parseInt((sessLabel || "2026").slice(0, 4), 10) || 2026;
  const calculatedAge = calculateAgeOnAprilFirst(dob, sessionStartYear);
  const ageDisplay = calculatedAge
    ? `${calculatedAge.years} Y, ${calculatedAge.months} M, ${calculatedAge.days} D (${calculatedAge.years} वर्ष, ${calculatedAge.months} माह, ${calculatedAge.days} दिन)`
    : "—";

  // Display values respecting privacy mask toggle (2 chars + xxxx when ON; full data when OFF)
  const dispStudentAadhaar = maskAadhaar(studentAadhaar);
  const dispFatherName = maskSensitiveData ? maskSensitive2Chars(fatherName, true) : fatherName;
  const dispFatherPhone = fatherPhone ? (maskSensitiveData ? maskSensitive2Chars(fatherPhone, true) : fatherPhone) : "";
  const dispFatherWhatsapp = fatherWhatsapp ? (maskSensitiveData ? maskSensitive2Chars(fatherWhatsapp, true) : fatherWhatsapp) : "";
  const dispFatherAadhaar = maskAadhaar(fatherAadhaar);
  const dispMotherName = maskSensitiveData ? maskSensitive2Chars(motherName, true) : motherName;
  const dispMotherPhone = motherPhone ? (maskSensitiveData ? maskSensitive2Chars(motherPhone, true) : motherPhone) : "";
  const dispMotherWhatsapp = motherWhatsapp ? (maskSensitiveData ? maskSensitive2Chars(motherWhatsapp, true) : motherWhatsapp) : "";
  const dispMotherAadhaar = maskAadhaar(motherAadhaar);
  const dispPhone = maskSensitiveData ? maskSensitive2Chars(phone, true) : phone;
  const dispWhatsappNo = whatsappNo ? (maskSensitiveData ? maskSensitive2Chars(whatsappNo, true) : whatsappNo) : "";
  const dispEmergencyPhone = maskSensitiveData ? maskSensitive2Chars(emergencyPhone, true) : emergencyPhone;
  const dispGuardianName = maskSensitiveData ? maskSensitive2Chars(guardianName, true) : guardianName;

  // Fee Calculations
  const feeItems = resolvedFee?.items && resolvedFee.items.length > 0
    ? resolvedFee.items
    : resolvedFee
    ? [{
        id: "1",
        slNo: 1,
        description:
          admissionType === "READMISSION"
            ? "Re-Admission & Back-Session Settlement (पुनः प्रवेश शुल्क)"
            : "Admission & Enrollment Fee (प्रवेश शुल्क)",
        due: resolvedFee.amount || 0,
        con: resolvedFee.concession || 0,
        paid: resolvedFee.paidAmount ?? resolvedFee.amount ?? 0,
      }]
    : [];
  const totalDue = feeItems.reduce((s, i) => s + Number(i.due || 0), 0);
  const totalCon = Number(resolvedFee?.concession || feeItems.reduce((s, i) => s + Number(i.con || 0), 0));
  const netPayable = Math.max(0, totalDue - totalCon);
  const totalPaid = resolvedFee ? Number(resolvedFee.paidAmount ?? resolvedFee.amount ?? netPayable) : 0;
  const balanceDue = resolvedFee ? Math.max(0, resolvedFee.balanceDue ?? (netPayable - totalPaid)) : 0;
  const paidWords = numberToIndianWords(totalPaid);
  const qrVerifyUrl = buildAdmissionQrUrl({
    schoolId: school?.id || "",
    schoolName: school?.name || "",
    studentId: student?.id || application?.id || "",
    admNo,
    applicationNo: application?.applicationNo || admNo,
    studentName: fullName,
    fatherName,
    motherName,
    className: clsLabel,
    dob,
    gender: genderLabel,
    phone,
    admissionType,
    receiptNo: resolvedFee?.receiptNo || "NA",
    totalDue,
    totalCon,
    totalPaid,
    balanceDue,
    paidDate: resolvedFee?.paidDate || "",
    paymentMode: resolvedFee?.paymentMode || "Cash / Counter",
    collectorName: resolvedFee?.collectedByName || "",
    items: feeItems,
  });
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=2&data=${encodeURIComponent(qrVerifyUrl)}`;

  const buildSheetInnerHtmlPage = (targetMode: AdmissionPrintMode, pageNum: 1 | 2 | 3 = 1): string => {
    const renderReceiptSignatures = () => {
      const isManagerCol = resolvedFee?.collectedByRole === "manager";
      const collectorRawSig = isManagerCol
        ? (resolvedFee?.collectorSignatureUrl || school?.managerSignatureUrl)
        : (resolvedFee?.collectorSignatureUrl || school?.accountantSignatureUrl || (school as any)?.cashierSignatureUrl);
      const cashierSigImg = showDigitalSig && collectorRawSig;
      const collectorDisplayLabel = isManagerCol
        ? `${resolvedFee?.collectedByName || school?.managerName || "Manager"} (Manager)`
        : `${resolvedFee?.collectedByName || school?.accountantName || "Accountant"} (Accountant)`;
      const principalSigImg = showDigitalSig && school?.principalSignatureUrl;

      const cashierBlock = `
        <div class="sig-block" style="min-width:30mm;">
          ${cashierSigImg ? `<img src="${escapeHtml(cashierSigImg)}" alt="Collector Sign" crossorigin="anonymous" style="height:8.5mm;max-width:28mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:7mm;"></div>`}
          <div class="sig-line" style="font-size:6.6pt;">${escapeHtml(collectorDisplayLabel || cashierTitle)}</div>
        </div>
      `;

      const principalBlock = `
        <div class="sig-block" style="min-width:34mm;">
          ${principalSigImg ? `<img src="${escapeHtml(principalSigImg)}" alt="Principal Sign" crossorigin="anonymous" style="height:8.5mm;max-width:30mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:7mm;"></div>`}
          <div class="sig-line" style="font-size:6.8pt;">${escapeHtml(principalTitle || `${school?.principalName || "Principal"} (Sign & Seal)`)}</div>
        </div>
      `;

      if (signatoryMode === "cashier_only") {
        return cashierBlock;
      }
      if (signatoryMode === "principal_only") {
        return principalBlock;
      }
      return `${cashierBlock}\n${principalBlock}`;
    };

    const visibleSchoolRegNo = getVisibleSchoolRegNo(school);
    const hasContactInfo = Boolean(school?.phone || school?.mobile || school?.email || visibleSchoolRegNo);
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
            ${visibleSchoolRegNo ? `${school?.phone || school?.mobile || school?.email ? " • " : ""}Reg. No: ${escapeHtml(visibleSchoolRegNo)}` : ""}
            ${hasContactInfo ? " • " : ""}Office Timings: 08:00 AM – 02:00 PM
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

    const page2CompactHeaderHtml = `
      <div class="inst-header" style="border-bottom:1.5px solid #1e3a8a;padding-bottom:1.8mm;margin-bottom:2mm;">
        <div class="inst-logo" style="width:13mm;height:13mm;">
          ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" />` : `<span>${escapeHtml((school?.name || "SC").slice(0, 2).toUpperCase())}</span>`}
        </div>
        <div class="inst-title-wrap" style="text-align:left;padding-left:2mm;">
          <div class="inst-name" style="font-size:11pt;line-height:1.1;">${escapeHtml(school?.name || "Institutional Campus")}</div>
          <div class="inst-sub" style="font-size:6.9pt;">
            STUDENT: <strong style="color:#0f172a;text-transform:uppercase;">${escapeHtml(fullName)}</strong> • ADM NO: <strong style="color:#1e3a8a;">${escapeHtml(admNo)}</strong> • CLASS: <strong>${escapeHtml(clsLabel)}</strong> (ROLL: <strong>${escapeHtml(rollNo)}</strong>)
          </div>
        </div>
        <div style="text-align:right;min-width:32mm;">
          <div style="display:inline-block;padding:1mm 2.4mm;background:#1e3a8a;color:#ffffff;font-size:6.8pt;font-weight:900;border-radius:3px;letter-spacing:0.3px;">
            📄 PAGE 2 OF 2 (भाग - 2)
          </div>
          <div style="font-size:6.5pt;font-weight:800;color:#64748b;margin-top:1mm;">
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

    // -------------------------------------------------------------
    // CLASSIC BOX GRID FORM (2-PAGE SYSTEM)
    // -------------------------------------------------------------
    if (targetMode === "classic_box_grid") {
      const renderBoxCells = (text: string, count: number): string => {
        const clean = (!isBlankForm && text ? text.toUpperCase().replace(/[^A-Z0-9 ]/g, "") : "").slice(0, count);
        let cells = "";
        for (let i = 0; i < count; i++) {
          const ch = clean[i] && clean[i] !== " " ? clean[i] : "&nbsp;";
          cells += `<span class="c-char-box">${ch}</span>`;
        }
        return `<div style="display:inline-flex;gap:0;">${cells}</div>`;
      };

      const fullNameClean = (!isBlankForm && fullName !== "—" ? fullName : "").toUpperCase();
      const row1Name = fullNameClean.slice(0, 24);
      const row2Name = fullNameClean.length > 24 ? fullNameClean.slice(24, 48) : "";

      let d1 = "&nbsp;", d2 = "&nbsp;", m1 = "&nbsp;", m2 = "&nbsp;", y1 = "&nbsp;", y2 = "&nbsp;", y3 = "&nbsp;", y4 = "&nbsp;";
      if (!isBlankForm && dob && dob !== "—") {
        let dObj: Date | null = null;
        if (/^\d{4}-\d{2}-\d{2}/.test(dob)) {
          const [y, m, d] = dob.split("-").map(Number);
          dObj = new Date(y, m - 1, d);
        } else if (/^\d{2}[/-]\d{2}[/-]\d{4}/.test(dob)) {
          const p = dob.split(/[/-]/).map(Number);
          dObj = new Date(p[2], p[1] - 1, p[0]);
        }
        if (dObj && !isNaN(dObj.getTime())) {
          const ddStr = String(dObj.getDate()).padStart(2, "0");
          const mmStr = String(dObj.getMonth() + 1).padStart(2, "0");
          const yyyyStr = String(dObj.getFullYear());
          d1 = ddStr[0]; d2 = ddStr[1];
          m1 = mmStr[0]; m2 = mmStr[1];
          y1 = yyyyStr[0]; y2 = yyyyStr[1]; y3 = yyyyStr[2]; y4 = yyyyStr[3];
        }
      }

      const sessionStartYear = Number((sessionName || student?.sessionId || "2026-27").replace(/\D/g, "").slice(0, 4)) || 2026;
      const calculatedAge = calculateAgeOnAprilFirst(dob, sessionStartYear);
      const ageYears = !isBlankForm && calculatedAge ? String(calculatedAge.years) : "&nbsp;";
      const ageMonths = !isBlankForm && calculatedAge ? String(calculatedAge.months) : "&nbsp;";
      const ageDays = !isBlankForm && calculatedAge ? String(calculatedAge.days) : "&nbsp;";

      const isMale = !isBlankForm && (genderRaw === "male" || genderLabel.toLowerCase() === "male");
      const isFemale = !isBlankForm && (genderRaw === "female" || genderLabel.toLowerCase() === "female");

      const catLower = category.toLowerCase();
      const isGen = !isBlankForm && (catLower.includes("gen") || catLower === "general");
      const isSc = !isBlankForm && catLower.includes("sc") && !catLower.includes("obc");
      const isSt = !isBlankForm && catLower.includes("st");
      const isObc = !isBlankForm && catLower.includes("obc");

      const rawSiblingList = (student as any)?.siblingDetails || (application as any)?.siblingDetails || [];
      const siblings = Array.isArray(rawSiblingList) ? rawSiblingList : [];
      const isOnlyChildVal = !isBlankForm ? ((student as any)?.isOnlyChild ?? (application as any)?.isOnlyChild ?? (siblings.length === 0 ? null : false)) : null;

      const schoolDisplayName = school?.name || "School Administration";
      const schoolDisplayAddr = school?.address || "";

      // PAGE 1 OF CLASSIC BOX GRID
      if (pageNum === 1) {
        return `
          <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:3.5mm 4mm;font-family:Arial,Helvetica,sans-serif;color:#000;">
            <div>
              <!-- HEADER -->
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1.5mm;">
                <div style="width:24mm;text-align:center;flex-shrink:0;">
                  ${logoUrl
                    ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" crossorigin="anonymous" style="width:20mm;height:20mm;object-fit:contain;" />`
                    : `<div style="width:19mm;height:19mm;border:1.5px solid #000;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto;font-weight:900;font-size:7pt;text-align:center;">
                        <span>${escapeHtml(schoolDisplayName.slice(0, 10))}</span>
                       </div>`
                  }
                  <div style="background:#000;color:#fff;font-size:6pt;font-weight:bold;padding:0.8px 2px;margin-top:1mm;border-radius:2px;display:inline-block;">
                    Session ${escapeHtml(sessLabel)}
                  </div>
                </div>

                <div style="flex:1;text-align:center;padding:0 2mm;">
                  <div style="font-size:17pt;font-weight:900;letter-spacing:0.3px;font-family:'Comic Sans MS',Impact,Arial,sans-serif;line-height:1.1;color:#000;">
                    ${escapeHtml(schoolDisplayName)}
                  </div>
                  <div style="font-size:8pt;font-weight:700;margin-top:1mm;color:#000;">
                    ${escapeHtml(schoolDisplayAddr)}
                  </div>
                  <div style="font-size:10pt;font-weight:900;letter-spacing:0.8px;margin-top:1.2mm;text-transform:uppercase;color:#000;">
                    REGISTRATION CUM ADMISSION FORM (PAGE 1)
                  </div>
                  <div style="font-size:8.5pt;font-weight:800;margin-top:0.8mm;letter-spacing:0.5px;color:#000;">
                    ${isBlankForm ? "SESSION 20...... - 20........" : `SESSION ${escapeHtml(sessLabel)}`}
                  </div>
                </div>

                <div style="width:27mm;height:32mm;border:1.2px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-size:7.2pt;font-weight:600;line-height:1.2;padding:1mm;flex-shrink:0;">
                  ${!isBlankForm && photoUrl
                    ? `<img src="${escapeHtml(photoUrl)}" alt="Photo" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;" />`
                    : `Affix<br/>a recent<br/>Passport Size<br/>Photograph<br/>Here`
                  }
                </div>
              </div>

              <!-- META NUMBERS & SECTION A -->
              <div style="font-size:7.6pt;margin-bottom:1.5mm;">
                <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1mm;">
                  <div>
                    <span>Form No. <span class="c-dotted-line" style="min-width:28mm;">${!isBlankForm && admNo !== "—" ? escapeHtml(admNo) : "&nbsp;"}</span></span>
                  </div>
                  <div>
                    <span>Admission No. <span class="c-dotted-line" style="min-width:32mm;">${!isBlankForm && admNo !== "—" ? escapeHtml(admNo) : "&nbsp;"}</span></span>
                  </div>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:baseline;">
                  <div>
                    <span>Registration / PEN: <span class="c-dotted-line" style="min-width:30mm;">${!isBlankForm && (student?.apaarId || application?.applicationNo) ? escapeHtml(student?.apaarId || application?.applicationNo) : "&nbsp;"}</span></span>
                  </div>
                  <div style="text-align:center;">
                    <span style="font-size:8.5pt;font-weight:900;text-decoration:underline;">A. Student Profile</span>
                  </div>
                  <div>
                    <span>Receipt No : <span class="c-dotted-line" style="min-width:26mm;">${!isBlankForm && resolvedFee?.receiptNo ? escapeHtml(resolvedFee.receiptNo) : "&nbsp;"}</span></span>
                  </div>
                </div>
              </div>

              <!-- SECTION A: STUDENT PROFILE -->
              <div style="font-size:7.5pt;line-height:1.3;">
                <div style="margin-bottom:1.8mm;">
                  <div style="font-weight:700;margin-bottom:0.8mm;">1. Name (In CAPITAL Letters)</div>
                  <div style="margin-bottom:0.6mm;">${renderBoxCells(row1Name, 24)}</div>
                  <div>${renderBoxCells(row2Name, 24)}</div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;gap:2mm;margin-bottom:1.8mm;flex-wrap:wrap;">
                  <div style="display:flex;align-items:center;gap:1.5mm;">
                    <span style="font-weight:700;">2. Date of Birth</span>
                    <span style="font-weight:700;margin-left:1mm;">DD</span>
                    <span class="c-char-box">${d1}</span><span class="c-char-box">${d2}</span>
                    <span style="font-weight:700;margin-left:1mm;">MM</span>
                    <span class="c-char-box">${m1}</span><span class="c-char-box">${m2}</span>
                    <span style="font-weight:700;margin-left:1mm;">YYYY</span>
                    <span class="c-char-box">${y1}</span><span class="c-char-box">${y2}</span><span class="c-char-box">${y3}</span><span class="c-char-box">${y4}</span>
                  </div>

                  <div style="display:flex;align-items:center;gap:1.5mm;">
                    <span style="font-weight:700;">3. Age as on 1st April</span>
                    <span style="font-weight:700;margin-left:1mm;">Y</span>
                    <span class="c-char-box" style="width:7mm;">${ageYears}</span>
                    <span style="font-weight:700;">M</span>
                    <span class="c-char-box" style="width:7mm;">${ageMonths}</span>
                    <span style="font-weight:700;">D</span>
                    <span class="c-char-box" style="width:7mm;">${ageDays}</span>
                  </div>
                </div>

                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.8mm;">
                  <div>
                    <span style="font-weight:700;">4. Seeking Admission to</span>
                    <span style="margin-left:3mm;font-weight:700;">Class</span>
                    <span class="c-dotted-line" style="min-width:32mm;">${!isBlankForm ? escapeHtml(clsLabel) : "&nbsp;"}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:3mm;">
                    <span style="font-weight:700;">5. Gender</span>
                    <span>Male <span class="c-check-box">${isMale ? "✓" : "&nbsp;"}</span></span>
                    <span>Female <span class="c-check-box">${isFemale ? "✓" : "&nbsp;"}</span></span>
                  </div>
                </div>

                <div style="display:flex;align-items:center;gap:4mm;margin-bottom:1.8mm;">
                  <span style="font-weight:700;">6. Caste</span>
                  <span>Gen. <span class="c-check-box">${isGen ? "✓" : "&nbsp;"}</span></span>
                  <span>SC <span class="c-check-box">${isSc ? "✓" : "&nbsp;"}</span></span>
                  <span>ST <span class="c-check-box">${isSt ? "✓" : "&nbsp;"}</span></span>
                  <span>OBC <span class="c-check-box">${isObc ? "✓" : "&nbsp;"}</span></span>
                  <span style="margin-left:auto;font-weight:700;">Blood Group: <span class="c-dotted-line" style="min-width:18mm;">${!isBlankForm ? escapeHtml(bloodGroup) : "&nbsp;"}</span></span>
                </div>

                <div style="display:flex;align-items:center;gap:4mm;margin-bottom:1.8mm;">
                  <div style="display:flex;align-items:center;gap:2mm;">
                    <span style="font-weight:700;">7. Religion</span>
                    ${renderBoxCells(religion, 9)}
                  </div>
                  <div style="display:flex;align-items:center;gap:2mm;">
                    <span style="font-weight:700;">Nationality</span>
                    ${renderBoxCells(nationality || "INDIAN", 8)}
                  </div>
                </div>

                <div style="margin-bottom:2mm;">
                  <span style="font-weight:700;">8. Name of School Last Attended</span>
                  <span class="c-dotted-line" style="width:122mm;">${!isBlankForm && prevSchool !== "—" ? escapeHtml(prevSchool) : "&nbsp;"}</span>
                </div>
              </div>

              <!-- SECTION B: PARENT'S PROFILE -->
              <div style="text-align:center;font-weight:900;text-decoration:underline;font-size:8.5pt;margin:2.5mm 0 1.5mm 0;">
                B. Parent's Profile
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:2mm;font-size:7.5pt;">
                <!-- Father -->
                <div>
                  <div style="font-weight:800;text-align:center;margin-bottom:1.2mm;">Father Details</div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">1. Name</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm && dispFatherName !== "—" ? escapeHtml(dispFatherName) : "&nbsp;"}</span>
                  </div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">2. Qualification</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm ? escapeHtml(fatherQualification || "") : "&nbsp;"}</span>
                  </div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">3. Occupation</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm ? escapeHtml(fatherOcc) : "&nbsp;"}</span>
                  </div>
                  <div>
                    <span style="font-weight:700;display:inline-block;width:34mm;">4. Contact No.</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm && dispPhone !== "—" ? escapeHtml(dispPhone) : "&nbsp;"}</span>
                  </div>
                </div>

                <!-- Mother -->
                <div>
                  <div style="font-weight:800;text-align:center;margin-bottom:1.2mm;">Mother Details</div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">1. Name</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm && dispMotherName !== "—" ? escapeHtml(dispMotherName) : "&nbsp;"}</span>
                  </div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">2. Qualification</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm ? escapeHtml(student?.motherQualification || application?.motherQualification || "") : "&nbsp;"}</span>
                  </div>
                  <div style="margin-bottom:1.2mm;">
                    <span style="font-weight:700;display:inline-block;width:34mm;">3. Occupation</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm ? escapeHtml(motherOcc) : "&nbsp;"}</span>
                  </div>
                  <div>
                    <span style="font-weight:700;display:inline-block;width:34mm;">4. Contact No.</span>
                    <span class="c-dotted-line" style="width:calc(100% - 36mm);">${!isBlankForm && (dispWhatsappNo || dispPhone !== "—") ? escapeHtml(dispWhatsappNo || dispPhone) : "&nbsp;"}</span>
                  </div>
                </div>
              </div>

              <!-- 11. Only Child & Sibling Profile -->
              <div style="margin-bottom:1.8mm;font-size:7.4pt;">
                <div style="display:flex;align-items:center;gap:4mm;margin-bottom:1.2mm;">
                  <span style="font-weight:700;">11. Is candidate only child of parents</span>
                  <span>Yes <span class="c-check-box">${isOnlyChildVal === true ? "✓" : "&nbsp;"}</span></span>
                  <span>No <span class="c-check-box">${isOnlyChildVal === false ? "✓" : "&nbsp;"}</span></span>
                </div>
                <div style="font-weight:700;margin-bottom:0.8mm;">
                  If no, Sibling Profile :- (If studying in this school)
                </div>
                <table class="c-table">
                  <thead>
                    <tr style="background:#f1f5f9;">
                      <th style="width:14mm;">Sl. No.</th>
                      <th>Name</th>
                      <th style="width:34mm;">Brother/Sister</th>
                      <th style="width:24mm;">Class</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${[0, 1, 2].map((idx) => {
                      const sib = !isBlankForm && siblings[idx] ? siblings[idx] : null;
                      return `
                        <tr>
                          <td style="text-align:center;">${idx + 1}.</td>
                          <td>${sib ? escapeHtml(sib.name) : "&nbsp;"}</td>
                          <td>${sib ? escapeHtml(sib.relation || "Brother") : "&nbsp;"}</td>
                          <td>${sib ? escapeHtml(sib.className) : "&nbsp;"}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Page 1 Footer -->
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.2px solid #cbd5e1;padding-top:1.8mm;margin-top:auto;font-size:6.8pt;color:#64748b;font-weight:700;">
              <span>📄 पृष्ठ 1 / 2 (Page 1 of 2)</span>
              <span style="color:#1e3a8a;">* कृपया स्थायी पता, परिवहन, शुल्क व घोषणा हेतु पृष्ठ 2 देखें</span>
              <span>${escapeHtml(schoolDisplayName)}</span>
            </div>
          </div>
        `;
      }

      // PAGE 2 OF CLASSIC BOX GRID
      return `
        <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:3.5mm 4mm;font-family:Arial,Helvetica,sans-serif;color:#000;">
          <div>
            ${page2CompactHeaderHtml}

            <!-- 9. Permanent Address & 10. Correspondence Address -->
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-bottom:2mm;font-size:7.5pt;">
              <div>
                <div style="font-weight:700;margin-bottom:0.8mm;">9. Permanent Address</div>
                <div class="c-dotted-line" style="width:100%;margin-bottom:1mm;">${!isBlankForm ? escapeHtml(permanentAddress.slice(0, 50)) : "&nbsp;"}</div>
                <div class="c-dotted-line" style="width:100%;">${!isBlankForm && permanentAddress.length > 50 ? escapeHtml(permanentAddress.slice(50, 100)) : "&nbsp;"}</div>
              </div>
              <div>
                <div style="font-weight:700;margin-bottom:0.8mm;">10. Correspondence Address</div>
                <div class="c-dotted-line" style="width:100%;margin-bottom:1mm;">${!isBlankForm ? escapeHtml(fullAddress.slice(0, 50)) : "&nbsp;"}</div>
                <div class="c-dotted-line" style="width:100%;">${!isBlankForm && fullAddress.length > 50 ? escapeHtml(fullAddress.slice(50, 100)) : "&nbsp;"}</div>
              </div>
            </div>

            <!-- TRANSPORT & CHILD SENSITIVITY BOX -->
            <div style="border:1.2px solid #000;padding:1.6mm 2.2mm;margin-bottom:2.2mm;font-size:7.4pt;line-height:1.35;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1mm;flex-wrap:wrap;">
                <div>
                  <span style="font-weight:700;">Want to avail Transport Facility</span>
                  <span style="margin-left:2mm;">Yes <span class="c-check-box">${!isBlankForm && usesBus ? "✓" : "&nbsp;"}</span></span>
                  <span style="margin-left:1.5mm;">No <span class="c-check-box">${!isBlankForm && !usesBus ? "✓" : "&nbsp;"}</span></span>
                </div>
                <div>
                  <span style="font-weight:700;">If No. Walking</span>
                  <span class="c-check-box">${!isBlankForm && !usesBus && student?.transportModeIfNo === "Walking" ? "✓" : "&nbsp;"}</span>
                  <span style="font-weight:700;margin-left:2mm;">Guardian</span>
                  <span class="c-check-box">${!isBlankForm && !usesBus && student?.transportModeIfNo !== "Walking" ? "✓" : "&nbsp;"}</span>
                </div>
              </div>

              <div style="margin-bottom:1mm;">
                <span style="font-weight:700;">If yes, specify the Location</span>
                <span class="c-dotted-line" style="width:65mm;">${!isBlankForm ? escapeHtml(busRoute || "") : "&nbsp;"}</span>
                <span style="font-weight:700;margin-left:2mm;">Distance from School</span>
                <span class="c-dotted-line" style="width:25mm;">${!isBlankForm ? `${escapeHtml(student?.transportDistanceKm || application?.transportDistanceKm || "—")} Km` : "&nbsp;"}</span>
              </div>

              <div style="display:flex;align-items:center;margin-bottom:1mm;">
                <span style="font-weight:700;">Sensitivity about Child</span>
                <span style="margin-left:3mm;">Yes <span class="c-check-box">${!isBlankForm && (student?.childSensitivity || application?.childSensitivity) ? "✓" : "&nbsp;"}</span></span>
                <span style="margin-left:2mm;">No <span class="c-check-box">${!isBlankForm && !(student?.childSensitivity || application?.childSensitivity) ? "✓" : "&nbsp;"}</span></span>
              </div>

              <div>
                <span style="font-weight:700;">If Yes, Specify Remarks</span>
                <span class="c-dotted-line" style="width:142mm;">${!isBlankForm ? escapeHtml(student?.childSensitivityRemarks || application?.childSensitivityRemarks || (medicalCondition !== "Normal / Fit" ? medicalCondition : "")) : "&nbsp;"}</span>
              </div>
            </div>

            <!-- FEE PARTICULARS AT ADMISSION -->
            <div style="margin-bottom:2.2mm;">
              <div style="font-weight:800;font-size:7.6pt;margin-bottom:1mm;color:#1e3a8a;">
                FEE PARTICULARS AT ADMISSION (प्रारंभिक शुल्क एवं रसीद विवरण)
              </div>
              <table class="bio-table" style="font-size:7.6pt;">
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
            </div>

            <!-- DOCUMENTS CHECKLIST -->
            ${docsChecklistHtml}

            <!-- DECLARATION -->
            <div style="margin-top:2.5mm;margin-bottom:3mm;font-size:7.2pt;line-height:1.35;">
              <p style="margin:0 0 2mm 0;text-align:justify;">
                I/We declare that the above mentioned information provided by me/us is true to the best of my/our knowledge and I/we shall be responsible for any misleading information.
              </p>
              <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:4mm;">
                <div style="text-align:center;min-width:48mm;">
                  <div class="c-dotted-line" style="width:100%;margin-bottom:1mm;">&nbsp;</div>
                  <div style="font-weight:700;">Signature of Father/Guardian</div>
                </div>
                <div style="text-align:center;min-width:48mm;">
                  <div class="c-dotted-line" style="width:100%;margin-bottom:1mm;">&nbsp;</div>
                  <div style="font-weight:700;">Signature of Mother/Guardian</div>
                </div>
              </div>
            </div>

            <!-- FOR OFFICE USE -->
            <div style="border-top:1.2px solid #000;padding-top:1.8mm;font-size:7.3pt;">
              <div style="text-align:center;font-weight:900;text-decoration:underline;margin-bottom:1.2mm;">
                FOR OFFICE USE
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2mm;">
                <div>
                  <span style="font-weight:700;">Admission</span>
                  <span style="margin-left:2mm;">Granted <span class="c-check-box">${!isBlankForm ? "✓" : "&nbsp;"}</span></span>
                  <span style="margin-left:2mm;">Not Granted <span class="c-check-box">&nbsp;</span></span>
                </div>
                <div>
                  <span style="font-weight:700;">Remarks</span>
                  <span class="c-dotted-line" style="min-width:58mm;">${!isBlankForm ? "OFFICIALLY ENROLLED" : "&nbsp;"}</span>
                </div>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2mm;">
                <div>
                  <span style="font-weight:700;">Class of Admission</span>
                  <span class="c-dotted-line" style="min-width:40mm;">${!isBlankForm ? escapeHtml(clsLabel) : "&nbsp;"}</span>
                </div>
                <div>
                  <span style="font-weight:700;">Date of Admission</span>
                  <span class="c-dotted-line" style="min-width:38mm;">${!isBlankForm ? escapeHtml(admDateRaw) : "&nbsp;"}</span>
                </div>
              </div>

              <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:2.5mm;">
                <div style="text-align:center;min-width:44mm;">
                  <div style="font-weight:700;">Signature of Accountant</div>
                </div>
                <div style="text-align:center;min-width:44mm;">
                  <div style="font-weight:700;">Signature of Principal</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Page 2 Footer -->
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.2px solid #cbd5e1;padding-top:1.8mm;margin-top:auto;font-size:6.8pt;color:#64748b;font-weight:700;">
            <span>📄 पृष्ठ 2 / 2 (Page 2 of 2)</span>
            <span style="color:#15803d;font-weight:800;">✓ आधिकारिक विद्यालय दस्तावेज (Official School Record)</span>
            <span>${escapeHtml(schoolDisplayName)}</span>
          </div>
        </div>
      `;
    }

    // -------------------------------------------------------------
    // STANDALONE OFFICIAL ADMISSION FEE RECEIPT (FULL A4)
    // -------------------------------------------------------------
    const renderAdmissionReceiptSheet = (pageFooterText = "📄 आधिकारिक प्रवेश शुल्क रसीद • Official Admission Fee Receipt (Full A4)"): string => {
      const receiptNoLabel = resolvedFee?.receiptNo || `ADM-${(sessLabel || "2026").replace(/\D/g, "").slice(0, 4)}-${admNo}`;
      const rcptDate = resolvedFee?.payModeInfo?.date || (resolvedFee?.paidDate ? new Date(resolvedFee.paidDate).toLocaleDateString("en-IN") : new Date().toLocaleDateString("en-IN"));
      const payModeLabel = resolvedFee?.payModeInfo?.payMode || resolvedFee?.paymentMode || "Cash";
      const payBankLabel = resolvedFee?.payModeInfo?.bank || "School Counter";
      const payRefLabel = resolvedFee?.payModeInfo?.number || "—";
      const splitOnlineAmt = Number(resolvedFee?.payModeInfo?.onlineAmount || 0);
      const splitOfflineAmt = Number(resolvedFee?.payModeInfo?.offlineAmount || 0);
      const isFullPaidRcpt = totalPaid >= netPayable && netPayable > 0 && balanceDue === 0;
      const isPartialRcpt = totalPaid > 0 && balanceDue > 0;
      const statusBadgeHtml = isFullPaidRcpt
        ? `<span style="display:inline-block;padding:0.8mm 2.5mm;border-radius:3px;background:#16a34a;color:#ffffff;font-weight:900;font-size:7.4pt;">✓ FULL PAID</span>`
        : isPartialRcpt
        ? `<span style="display:inline-block;padding:0.8mm 2.5mm;border-radius:3px;background:#d97706;color:#ffffff;font-weight:900;font-size:7.4pt;">⚠ PARTIAL PAID (बकाया शेष)</span>`
        : `<span style="display:inline-block;padding:0.8mm 2.5mm;border-radius:3px;background:#dc2626;color:#ffffff;font-weight:900;font-size:7.4pt;">PENDING DUE</span>`;

      const receiptItemsHtml = feeItems.length > 0
        ? feeItems.map((item, idx) => {
            const dVal = Number(item.due || 0);
            const cVal = Number(item.con || 0);
            const netItem = Math.max(0, dVal - cVal);
            // Proportionally reflect paid if item.paid wasn't capped on partial payments
            const pVal = Number(item.paid !== undefined ? item.paid : netItem);
            return `
              <tr>
                <td style="text-align:center;font-weight:700;">${item.slNo || idx + 1}</td>
                <td style="font-weight:700;color:#0f172a;">${escapeHtml(item.description)}</td>
                <td class="num">₹${dVal.toLocaleString("en-IN")}</td>
                <td class="num" style="color:#b45309;">${cVal > 0 ? `-₹${cVal.toLocaleString("en-IN")}` : "₹0"}</td>
                <td class="num" style="font-weight:800;">₹${netItem.toLocaleString("en-IN")}</td>
                <td class="num" style="font-weight:800;color:#15803d;">₹${pVal.toLocaleString("en-IN")}</td>
              </tr>
            `;
          }).join("")
        : `
          <tr>
            <td style="text-align:center;">1</td>
            <td style="font-weight:700;">Admission &amp; Enrollment Fee (प्रवेश शुल्क)</td>
            <td class="num">₹${totalDue.toLocaleString("en-IN")}</td>
            <td class="num">₹${totalCon.toLocaleString("en-IN")}</td>
            <td class="num">₹${netPayable.toLocaleString("en-IN")}</td>
            <td class="num" style="font-weight:800;color:#15803d;">₹${totalPaid.toLocaleString("en-IN")}</td>
          </tr>
        `;

      return `
        <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:4mm 4.5mm;border:2px solid #065f46;">
          <div>
            ${headerHtml}
            <div class="doc-badge-bar" style="background:linear-gradient(90deg,#065f46,#047857);padding:1.8mm 3.2mm;font-size:8.6pt;margin-bottom:2.5mm;">
              <span>${admissionType === "READMISSION" ? "🧾 OFFICIAL RE-ADMISSION &amp; FEE SLIP • आधिकारिक पुनः प्रवेश शुल्क रसीद" : "🧾 OFFICIAL ADMISSION FEE RECEIPT • आधिकारिक प्रवेश शुल्क रसीद"}</span>
              <span>RECEIPT NO: ${escapeHtml(receiptNoLabel)}</span>
            </div>

            <!-- Receipt Meta Strip -->
            <div class="meta-strip" style="grid-template-columns:repeat(4,1fr);padding:2mm 2.8mm;margin-bottom:2.6mm;background:#f0fdf4;border-color:#86efac;">
              <div class="meta-item">
                <span class="meta-lbl">Receipt No. / रसीद संख्या</span>
                <span class="meta-val" style="color:#065f46;">${escapeHtml(receiptNoLabel)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Payment Date / तिथि</span>
                <span class="meta-val">${escapeHtml(rcptDate)}</span>
              </div>
              <div class="meta-item">
                <span class="meta-lbl">Admission Type / प्रकार</span>
                <span class="meta-val">${admissionType === "READMISSION" ? "RE-ADMISSION" : "NEW ADMISSION"}</span>
              </div>
              <div class="meta-item" style="align-items:flex-end;">
                <span class="meta-lbl">Payment Status / स्थिति</span>
                <div style="margin-top:0.5mm;">${statusBadgeHtml}</div>
              </div>
            </div>

            <!-- Complete Student Profile Card with Photo -->
            <div class="section-heading" style="background:#ecfdf5;border-left-color:#059669;color:#065f46;margin-top:1mm;">
              1. Student &amp; Admission Identification Details (छात्र एवं प्रवेश विवरण)
            </div>
            <div class="bio-layout" style="margin-bottom:2.8mm;">
              <table class="bio-table" style="font-size:7.9pt;">
                <tbody>
                  <tr>
                    <td class="lbl">Student Name</td>
                    <td class="val" colspan="3" style="font-size:9.5pt;font-weight:900;text-transform:uppercase;color:#0f172a;">${escapeHtml(fullName)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Admission / Reg No.</td>
                    <td class="val" style="font-family:monospace;color:#1e3a8a;font-weight:900;">${escapeHtml(admNo)}</td>
                    <td class="lbl">Class &amp; Roll No.</td>
                    <td class="val" style="font-weight:900;">${escapeHtml(clsLabel)} (Roll: ${escapeHtml(rollNo)})</td>
                  </tr>
                  <tr>
                    <td class="lbl">Father's Name</td>
                    <td class="val">${escapeHtml(dispFatherName)}${dispFatherPhone ? ` (📞 ${escapeHtml(dispFatherPhone)})` : ""}</td>
                    <td class="lbl">Mother's Name</td>
                    <td class="val">${escapeHtml(dispMotherName)}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Date of Birth &amp; Gender</td>
                    <td class="val">${escapeHtml(dob)} • ${escapeHtml(genderLabel)}</td>
                    <td class="lbl">Mobile / WhatsApp</td>
                    <td class="val" style="font-weight:900;color:#047857;">📞 ${escapeHtml(dispPhone)} ${dispWhatsappNo && dispWhatsappNo !== dispPhone ? `| 💬 ${escapeHtml(dispWhatsappNo)}` : ""}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Academic Session</td>
                    <td class="val">${escapeHtml(sessLabel)}${dispStudentAadhaar !== "—" ? ` • Aadhaar: <span style="font-family:monospace;font-weight:700;">${escapeHtml(dispStudentAadhaar)}</span>` : ""}</td>
                    <td class="lbl">Transport Facility</td>
                    <td class="val">${usesBus ? `🚌 Bus Active (${escapeHtml(busRoute || "Route")} • ₹${busFee}/mo)` : "No Bus Service"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Residential Address</td>
                    <td class="val" colspan="3">${escapeHtml(fullAddress)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="photo-frame" style="width:27mm;height:33mm;border-color:#065f46;">
                ${
                  photoUrl
                    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" crossorigin="anonymous" />`
                    : `<div style="font-size:6.5pt;color:#64748b;padding:2mm;">STUDENT<br/>PHOTO<br/><strong style="font-size:14pt;color:#065f46;">${fullName !== "—" ? escapeHtml(fullName.charAt(0).toUpperCase()) : "S"}</strong></div>`
                }
              </div>
            </div>

            <!-- Itemized Admission Fee Table -->
            <div class="section-heading" style="background:#ecfdf5;border-left-color:#059669;color:#065f46;">
              2. Itemized Admission Fee Breakdown (प्रवेश शुल्क विवरण तालिका)
            </div>
            <table class="fee-table" style="font-size:8pt;">
              <thead>
                <tr>
                  <th style="width:10mm;text-align:center;background:#ecfdf5;color:#065f46;">Sl.</th>
                  <th style="background:#ecfdf5;color:#065f46;">Fee Particulars / शुल्क का मद</th>
                  <th class="num" style="width:26mm;background:#ecfdf5;color:#065f46;">Gross Fee (₹)</th>
                  <th class="num" style="width:24mm;background:#ecfdf5;color:#065f46;">Discount (₹)</th>
                  <th class="num" style="width:26mm;background:#ecfdf5;color:#065f46;">Net Bill (₹)</th>
                  <th class="num" style="width:26mm;background:#ecfdf5;color:#065f46;">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                ${receiptItemsHtml}
                <tr style="background:#f8fafc;font-weight:900;border-top:1.8px solid #065f46;">
                  <td colspan="2" style="text-align:right;color:#0f172a;padding:1.6mm 2.2mm;">TOTAL / कुल योग :</td>
                  <td class="num">₹${totalDue.toLocaleString("en-IN")}</td>
                  <td class="num" style="color:#b45309;">${totalCon > 0 ? `-₹${totalCon.toLocaleString("en-IN")}` : "₹0"}</td>
                  <td class="num" style="color:#1e3a8a;">₹${netPayable.toLocaleString("en-IN")}</td>
                  <td class="num" style="color:#15803d;font-size:8.6pt;">₹${totalPaid.toLocaleString("en-IN")}</td>
                </tr>
              </tbody>
            </table>

            <!-- Payment Summary, Split Info, Words & QR Code -->
            <div class="section-heading" style="background:#ecfdf5;border-left-color:#059669;color:#065f46;margin-top:3mm;">
              3. Payment Mode &amp; Final Settlement Summary (भुगतान एवं शेष बकाया विवरण)
            </div>
            <div class="receipt-footer-grid" style="align-items:stretch;gap:3.5mm;">
              <div class="totals-box" style="background:#f8fafc;border:1.2px solid #cbd5e1;padding:2.5mm 3mm;font-size:8pt;display:flex;flex-direction:column;justify-content:space-between;gap:1.6mm;">
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #cbd5e1;padding-bottom:1.2mm;">
                  <span style="color:#475569;font-weight:700;">Payment Mode / माध्यम:</span>
                  <strong style="color:#0f172a;">${escapeHtml(payModeLabel)}${splitOnlineAmt > 0 || splitOfflineAmt > 0 ? ` (Online: ₹${splitOnlineAmt.toLocaleString("en-IN")} + Cash: ₹${splitOfflineAmt.toLocaleString("en-IN")})` : ""}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #cbd5e1;padding-bottom:1.2mm;">
                  <span style="color:#475569;font-weight:700;">Counter / Bank &amp; Ref No.:</span>
                  <strong style="color:#0f172a;">${escapeHtml(payBankLabel)} • Ref: ${escapeHtml(payRefLabel)}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;border-bottom:1px dashed #cbd5e1;padding-bottom:1.2mm;">
                  <span style="color:#475569;font-weight:700;">Total Net Admission Bill:</span>
                  <strong style="color:#1e3a8a;">₹${netPayable.toLocaleString("en-IN")} ${totalCon > 0 ? `(Concession Waived: ₹${totalCon.toLocaleString("en-IN")})` : ""}</strong>
                </div>
                <div style="display:flex;justify-content:space-between;background:#dcfce7;border:1px solid #86efac;border-radius:4px;padding:1.4mm 2.2mm;">
                  <span style="color:#166534;font-weight:900;">कुल जमा राशि • TOTAL PAID AMOUNT :</span>
                  <strong style="color:#15803d;font-size:10pt;font-weight:900;">₹${totalPaid.toLocaleString("en-IN")}</strong>
                </div>
                ${
                  balanceDue > 0
                    ? `<div style="display:flex;justify-content:space-between;background:#fef2f2;border:1px solid #fca5a5;border-radius:4px;padding:1.4mm 2.2mm;">
                        <span style="color:#991b1b;font-weight:900;">शेष बकाया • BALANCE DUE (फ़ीस स्लिप में जुड़ेगा):</span>
                        <strong style="color:#dc2626;font-size:9.5pt;font-weight:900;">₹${balanceDue.toLocaleString("en-IN")}</strong>
                      </div>`
                    : `<div style="display:flex;justify-content:space-between;background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:1.2mm 2.2mm;">
                        <span style="color:#1e40af;font-weight:800;">Remaining Admission Due / शेष बकाया:</span>
                        <strong style="color:#15803d;font-weight:900;">₹0 (NIL / पूर्ण जमा)</strong>
                      </div>`
                }
                <div style="font-size:7.6pt;color:#1e293b;padding-top:0.5mm;">
                  <strong>Amount in Words:</strong> <span style="font-weight:700;text-transform:capitalize;">${escapeHtml(paidWords)}</span>
                </div>
              </div>

              <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;border:1.2px solid #cbd5e1;border-radius:4px;padding:2mm;background:#ffffff;min-width:30mm;">
                <img src="${qrImgUrl}" alt="Verification QR" crossorigin="anonymous" style="width:23mm;height:23mm;object-fit:contain;" />
                <span style="font-size:6.4pt;font-weight:800;color:#065f46;margin-top:1mm;text-align:center;">SCAN TO VERIFY<br/>OFFICIAL RECEIPT</span>
              </div>
            </div>

            <!-- Important Instructions & Declaration -->
            <div style="margin-top:3mm;border:1px solid #cbd5e1;border-radius:4px;padding:2mm 2.8mm;background:#f8fafc;font-size:7.1pt;color:#334155;line-height:1.45;">
              <strong style="color:#065f46;">नोट व नियम (Terms &amp; Note):</strong><br/>
              1. Admission, Registration &amp; Annual Charges once paid are non-refundable &amp; non-transferable.<br/>
              2. ${balanceDue > 0 ? `बकाया प्रवेश शुल्क ₹${balanceDue.toLocaleString("en-IN")} अगले मासिक शुल्क रसीद (Fee Slip) में स्वतः जुड़कर दिखेगा जब तक पूरा जमा न हो जाए।` : "प्रवेश शुल्क पूर्णतः जमा हो चुका है। कृपया भविष्य के संदर्भ हेतु यह रसीद सुरक्षित रखें।"}<br/>
              3. Regular monthly tuition fee is payable by the 10th of every month (10 तारीख से पहले जमा करने पर नियमानुसार छूट लागू).
            </div>
          </div>

          <div>
            <!-- Signature Row -->
            <div class="sig-row" style="margin-top:6mm;padding-top:2mm;border-top:1px dashed #cbd5e1;">
              <div class="sig-block" style="min-width:36mm;">
                <div style="height:7mm;"></div>
                <div class="sig-line" style="font-size:6.8pt;">Parent / Guardian Sign</div>
              </div>
              ${renderReceiptSignatures()}
            </div>

            <!-- Official Receipt Footer -->
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.4px solid #065f46;padding-top:1.8mm;margin-top:2.5mm;font-size:7pt;color:#475569;font-weight:700;">
              <span>${pageFooterText}</span>
              <span style="color:#065f46;font-weight:900;">✓ Computer Verified Admission Receipt</span>
              <span>${escapeHtml(school?.name || "School Campus")}</span>
            </div>
          </div>
        </div>
      `;
    };

    if (targetMode === "receipt_only") {
      return renderAdmissionReceiptSheet();
    }

    if (targetMode === "combined") {
      if (pageNum === 3) {
        return renderAdmissionReceiptSheet("📄 पृष्ठ 3 / 3 • Official Admission Fee Receipt (Full A4)");
      }
      // Fall through to Form Page 1 or Page 2 for pageNum 1 or 2!
    }

    // -------------------------------------------------------------
    // STANDALONE OFFICIAL ADMISSION FORM (2-PAGE SYSTEM)
    // -------------------------------------------------------------
    if (pageNum === 1) {
      return `
        <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:3.5mm 4mm;">
          <div>
            ${headerHtml}
            ${admissionTypeBarHtml}
            <div class="doc-badge-bar" style="padding:1.6mm 3mm;font-size:8.2pt;">
              <span>OFFICIAL STUDENT ADMISSION &amp; REGISTRATION FORM • पृष्ठ 1/2 (छात्र व परिवार विवरण)</span>
              <span>FORM NO: ${escapeHtml(admNo)}</span>
            </div>

            <div class="meta-strip" style="padding:1.8mm 2.6mm;margin-bottom:2mm;">
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
                <span class="meta-lbl">Assigned Roll Number</span>
                <span class="meta-val">${escapeHtml(rollNo)}</span>
              </div>
            </div>

            <div class="section-heading">1. Student Personal &amp; Identification Details (छात्र का व्यक्तिगत विवरण)</div>
            <div class="bio-layout">
              <table class="bio-table" style="font-size:7.7pt;">
                <tbody>
                  <tr>
                    <td class="lbl">Full Name of Student</td>
                    <td class="val" colspan="3" style="font-size:9.2pt;text-transform:uppercase;color:#0f172a;font-weight:900;">${!isBlankForm ? escapeHtml(fullName) : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Date of Birth</td>
                    <td class="val">${!isBlankForm ? escapeHtml(dob) : "&nbsp;"}</td>
                    <td class="lbl">Age as on 1st April</td>
                    <td class="val" style="font-weight:700;color:#1e3a8a;">${!isBlankForm ? escapeHtml(ageDisplay) : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Gender</td>
                    <td class="val">${!isBlankForm ? escapeHtml(genderLabel) : "&nbsp;"}</td>
                    <td class="lbl">Blood Grp &amp; Category</td>
                    <td class="val">${!isBlankForm ? `${escapeHtml(bloodGroup)} | ${escapeHtml(category)}` : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Religion &amp; Nationality</td>
                    <td class="val">${!isBlankForm ? `${escapeHtml(religion)} • ${escapeHtml(nationality)}` : "&nbsp;"}</td>
                    <td class="lbl">UDISE+ APAAR / PEN ID</td>
                    <td class="val" style="font-family:monospace;font-weight:bold;color:#1e3a8a;">${!isBlankForm ? escapeHtml(apaarId) : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Student Aadhaar (UIDAI)</td>
                    <td class="val" style="font-family:monospace;">${!isBlankForm ? escapeHtml(dispStudentAadhaar) : "&nbsp;"}</td>
                    <td class="lbl">Primary Mobile (कॉलिंग)</td>
                    <td class="val" style="font-weight:900;color:#1e3a8a;font-size:8.8pt;">${!isBlankForm && dispPhone !== "—" ? `📞 ${escapeHtml(dispPhone)}` : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">WhatsApp Contact (व्हाट्सएप)</td>
                    <td class="val" style="font-weight:900;color:#047857;font-size:8.8pt;">${!isBlankForm && (dispWhatsappNo || dispPhone !== "—") ? `💬 ${escapeHtml(dispWhatsappNo || dispPhone)}` : "&nbsp;"}</td>
                    <td class="lbl">Identification Mark</td>
                    <td class="val">${!isBlankForm ? escapeHtml(identificationMark) : "&nbsp;"}</td>
                  </tr>
                  <tr>
                    <td class="lbl">Emergency Contact Person</td>
                    <td class="val">${!isBlankForm ? `${escapeHtml(emergencyPerson || "Parent")} (${escapeHtml(emergencyRelation || "Guardian")})` : "&nbsp;"}</td>
                    <td class="lbl">Emergency Calling Phone</td>
                    <td class="val" style="font-weight:900;color:#b91c1c;font-size:8.8pt;">${!isBlankForm && dispEmergencyPhone !== "—" ? `🚨 ${escapeHtml(dispEmergencyPhone)}` : "&nbsp;"}</td>
                  </tr>
                </tbody>
              </table>

              <div class="photo-frame" style="width:28mm;height:35mm;">
                ${
                  !isBlankForm && photoUrl
                    ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" crossorigin="anonymous" />`
                    : `<div style="font-size:6.5pt;color:#64748b;padding:2mm;">AFFIX<br/>PASSPORT<br/>PHOTO<br/><strong style="font-size:13pt;color:#1e3a8a;">${!isBlankForm && fullName !== "—" ? escapeHtml(fullName.charAt(0).toUpperCase()) : ""}</strong></div>`
                }
              </div>
            </div>

            <div class="section-heading">2. Parents &amp; Guardian Information (माता-पिता / अभिभावक का विवरण)</div>
            <table class="bio-table" style="font-size:7.7pt;">
              <tbody>
                <tr>
                  <td class="lbl">Father's Name &amp; Phone</td>
                  <td class="val" style="font-weight:bold;">${!isBlankForm ? `${escapeHtml(dispFatherName)} ${dispFatherPhone ? `<br/><span style="font-size:7.2pt;color:#1e3a8a;">📞 ${escapeHtml(dispFatherPhone)}</span>` : ""}` : "&nbsp;"}</td>
                  <td class="lbl">Father Edu. &amp; WhatsApp</td>
                  <td class="val">${!isBlankForm ? `${escapeHtml(fatherQualification || "Matric / Graduate")} ${dispFatherWhatsapp ? `<br/><span style="font-size:7.2pt;color:#047857;">💬 WA: ${escapeHtml(dispFatherWhatsapp)}</span>` : ""}` : "&nbsp;"}</td>
                </tr>
                <tr>
                  <td class="lbl">Father Occupation &amp; Income</td>
                  <td class="val">${!isBlankForm ? `${escapeHtml(fatherOcc || "—")} ${annualIncome && annualIncome !== "—" ? `(₹${Number(annualIncome).toLocaleString("en-IN")}/yr)` : ""}` : "&nbsp;"}</td>
                  <td class="lbl">${maskSensitiveData ? "Father's Aadhaar (Masked)" : "Father's Aadhaar (UIDAI)"}</td>
                  <td class="val" style="font-family:monospace;">${!isBlankForm ? escapeHtml(dispFatherAadhaar) : "&nbsp;"}</td>
                </tr>
                <tr>
                  <td class="lbl">Mother's Name &amp; Phone</td>
                  <td class="val" style="font-weight:bold;">${!isBlankForm ? `${escapeHtml(dispMotherName)} ${dispMotherPhone ? `<br/><span style="font-size:7.2pt;color:#be185d;">📱 ${escapeHtml(dispMotherPhone)}</span>` : ""}` : "&nbsp;"}</td>
                  <td class="lbl">Mother Edu. &amp; WhatsApp</td>
                  <td class="val">${!isBlankForm ? `${escapeHtml(motherQualification || "Matric / Intermediate")} ${dispMotherWhatsapp ? `<br/><span style="font-size:7.2pt;color:#047857;">💬 WA: ${escapeHtml(dispMotherWhatsapp)}</span>` : ""}` : "&nbsp;"}</td>
                </tr>
                <tr>
                  <td class="lbl">Mother Occupation &amp; Calling</td>
                  <td class="val">${!isBlankForm ? `${escapeHtml(motherOcc || "—")} | Primary: 📞 ${escapeHtml(dispPhone)} | WA: 💬 ${escapeHtml(dispWhatsappNo || dispPhone)}` : "&nbsp;"}</td>
                  <td class="lbl">${maskSensitiveData ? "Mother's Aadhaar (Masked)" : "Mother's Aadhaar (UIDAI)"}</td>
                  <td class="val" style="font-family:monospace;">${!isBlankForm ? escapeHtml(dispMotherAadhaar) : "&nbsp;"}</td>
                </tr>
                <tr>
                  <td class="lbl">Local Guardian Details</td>
                  <td class="val" colspan="3">${!isBlankForm ? `${escapeHtml(dispGuardianName)} (Relation: ${escapeHtml(guardianRelation)}) | Emergency Mobile: 📞 ${escapeHtml(dispEmergencyPhone)}` : "&nbsp;"}</td>
                </tr>
              </tbody>
            </table>

            <div class="section-heading">3. Family Status &amp; Sibling Profile (सहोदर विवरण - यदि इसी विद्यालय में पढ़ते हों)</div>
            <div style="font-size:7.5pt;margin-bottom:1.5mm;font-weight:700;">
              Only Child of Parents (इकलौती संतान): <span style="color:#1e3a8a;">${isOnlyChild ? "YES (हाँ)" : "NO (नहीं)"}</span>
            </div>
            <table class="bio-table" style="font-size:7.5pt;">
              <thead>
                <tr style="background:#f1f5f9;font-weight:800;color:#1e3a8a;">
                  <td style="width:12mm;text-align:center;">Sl.</td>
                  <td>Sibling Name (भाई/बहन का नाम)</td>
                  <td style="width:32mm;">Relation (भाई / बहन)</td>
                  <td style="width:30mm;">Class &amp; Section</td>
                  <td style="width:25mm;">Roll Number</td>
                </tr>
              </thead>
              <tbody>
                ${[0, 1, 2].map((idx) => {
                  const sib = !isBlankForm && siblings[idx] ? siblings[idx] : null;
                  return `
                    <tr>
                      <td style="text-align:center;">${idx + 1}.</td>
                      <td style="font-weight:700;">${sib ? escapeHtml(sib.name) : "&nbsp;"}</td>
                      <td>${sib ? escapeHtml(sib.relation || "Brother") : "&nbsp;"}</td>
                      <td>${sib ? escapeHtml(sib.className) : "&nbsp;"}</td>
                      <td>${sib ? escapeHtml((sib as any).rollNo || "—") : "&nbsp;"}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>

          <!-- Page 1 Bottom Note -->
          <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.2px solid #cbd5e1;padding-top:1.8mm;margin-top:auto;font-size:6.8pt;color:#64748b;font-weight:700;">
            <span>📄 पृष्ठ 1 / 2 (Page 1 of 2)</span>
            <span style="color:#1e3a8a;">* कृपया स्थायी पता, अकादमिक, परिवहन, शुल्क, घोषणा व हस्ताक्षर हेतु पृष्ठ 2 देखें</span>
            <span>${escapeHtml(school?.name || "School Campus")}</span>
          </div>
        </div>
      `;
    }

    // PAGE 2 OF STANDALONE ADMISSION FORM
    return `
      <div class="adm-box" style="flex:1;display:flex;flex-direction:column;justify-content:space-between;padding:3.5mm 4mm;">
        <div>
          ${page2CompactHeaderHtml}

          <div class="section-heading" style="margin-top:1.5mm;">4. Residential Address &amp; Communication (स्थायी एवं वर्तमान पता)</div>
          <table class="bio-table" style="font-size:7.7pt;">
            <tbody>
              <tr>
                <td class="lbl" style="width:25%;">Present / Local Address</td>
                <td class="val">${!isBlankForm ? escapeHtml(fullAddress) : "&nbsp;"}</td>
              </tr>
              <tr>
                <td class="lbl">Permanent Native Address</td>
                <td class="val">${!isBlankForm ? escapeHtml(permanentAddress) : "&nbsp;"}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-heading">5. Previous Academic Record &amp; Last School (पूर्व विद्यालय का विवरण)</div>
          <table class="bio-table" style="font-size:7.7pt;">
            <tbody>
              <tr>
                <td class="lbl" style="width:25%;">Name of School Last Attended</td>
                <td class="val" colspan="3">${!isBlankForm ? escapeHtml(prevSchool !== "—" ? prevSchool : (admissionType === "READMISSION" ? (school?.name || "Same School (Internal Promotion / Re-Admission)") : "")) || "&nbsp;" : "&nbsp;"}</td>
              </tr>
              <tr>
                <td class="lbl">Board / Affiliation</td>
                <td class="val">${!isBlankForm ? escapeHtml((student as any)?.previousBoard || "CBSE / State Board") : "&nbsp;"}</td>
                <td class="lbl">Last Class &amp; Session / Marks</td>
                <td class="val">${!isBlankForm ? `${escapeHtml((student as any)?.previousClass || (student as any)?.previousClassName || "Previous Class")}${(student as any)?.previousSessionName ? ` (${escapeHtml((student as any)?.previousSessionName)})` : ""} • ${escapeHtml(prevMarks || "Promoted")}` : "&nbsp;"}</td>
              </tr>
              <tr>
                <td class="lbl">Transfer Certificate (TC No.)</td>
                <td class="val" colspan="3">${!isBlankForm ? escapeHtml((student as any)?.tcNumber || (admissionType === "READMISSION" ? "Internal Re-Admission (Not Required)" : "Submitted / Attached")) : "&nbsp;"}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-heading">6. School Bus / Transport Facility (स्कूल बस / परिवहन सेवा)</div>
          <table class="bio-table" style="font-size:7.7pt;">
            <tbody>
              <tr>
                <td class="lbl" style="width:25%;">Transport Opted</td>
                <td class="val" colspan="3">
                  ${!isBlankForm ? (
                    usesBus
                      ? `<strong>YES (बस/वैन उपलब्ध)</strong> — Route: ${escapeHtml(busRoute || "Main Route")} | Pickup Stop: ${escapeHtml(student?.busStop || busRoute || "Assigned Stop")} | Distance: ${escapeHtml(transportDistanceKm || "—")} Km | Vehicle: ${escapeHtml(busNumber || "School Bus")} | Bus Fee: ₹${busFee}/mo ${driverName ? `| Driver: ${escapeHtml(driverName)} (📞 ${escapeHtml(driverPhone || "—")})` : ""}`
                      : `<strong>NO</strong> — Mode: ${transportModeIfNo === "Walking" ? "Walking (पैदल)" : "Guardian / Own Arrangement (अभिभावक स्वयं)"}`
                  ) : "&nbsp;"}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="section-heading">7. Health, Child Sensitivity &amp; Medical Emergency (स्वास्थ्य व विशेष देखभाल)</div>
          <table class="bio-table" style="font-size:7.7pt;">
            <tbody>
              <tr>
                <td class="lbl" style="width:25%;">Child Sensitivity / Health</td>
                <td class="val">${!isBlankForm ? escapeHtml(childSensitivityRemarks || medicalCondition || "Normal / Fit") : "&nbsp;"}</td>
                  <td class="lbl">Emergency Calling</td>
                  <td class="val" style="font-weight:900;color:#b91c1c;">${!isBlankForm && dispEmergencyPhone !== "—" ? `🚨 ${escapeHtml(dispEmergencyPhone)} (${escapeHtml(emergencyPerson)})` : "&nbsp;"}</td>
              </tr>
            </tbody>
          </table>

          <div class="section-heading">8. Admission Fee Structure &amp; Initial Payment Record (प्रारंभिक शुल्क एवं रसीद विवरण)</div>
          <table class="bio-table" style="font-size:7.7pt;">
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

          <div class="section-heading">9. Submitted Documents Checklist (संलग्न दस्तावेजों की सूची)</div>
          ${docsChecklistHtml}

          <div class="section-heading">10. Legal Declaration by Parent / Guardian (अभिभावक द्वारा घोषणा पत्र)</div>
          <div style="font-size:7pt;color:#334155;line-height:1.4;border:1px solid #cbd5e1;border-radius:4px;padding:2mm 2.8mm;background:#f8fafc;">
            मैं प्रमाणित करता/करती हूँ कि ऊपर दिया गया छात्र का नाम, जन्मतिथि एवं अन्य सभी विवरण पूर्णतः सत्य हैं। मैं विद्यालय के अनुशासन, उपस्थिति एवं शुल्क संबंधी सभी नियमों का पालन करने के लिए सहमत हूँ।<br/>
            <em>I hereby declare that the particulars furnished above are true and correct to the best of my knowledge, and I agree to abide by the rules, fee schedule, and discipline regulations of the institution.</em>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;border:1.2px solid #1e3a8a;border-radius:4px;padding:1.6mm 2.5mm;margin-top:2mm;background:#f8fafc;font-size:7.2pt;">
            <div>
              <strong style="color:#1e3a8a;">FOR OFFICE USE ONLY:</strong> Enrollment Status: <strong style="color:#166534;">CONFIRMED &amp; APPROVED BY AUTHORITY</strong> • Class: <strong>${escapeHtml(clsLabel)}</strong> • Roll No: <strong>${escapeHtml(rollNo)}</strong>
              ${resolvedFee ? ` • Adm. Receipt: <strong>${escapeHtml(resolvedFee.receiptNo)} (Paid ₹${totalPaid.toLocaleString("en-IN")})</strong>` : ""}
            </div>
            <img src="${qrImgUrl}" alt="QR" crossorigin="anonymous" style="width:12mm;height:12mm;object-fit:contain;" />
          </div>

          <div class="sig-row" style="margin-top:4mm;">
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
              <div class="sig-line">Admission Clerk / Accounts</div>
            </div>
            <div class="sig-block">
              ${school?.principalSignatureUrl ? `<img src="${escapeHtml(school.principalSignatureUrl)}" alt="Sign" crossorigin="anonymous" style="height:9mm;max-width:32mm;object-fit:contain;display:block;margin:0 auto 0.5mm;" />` : `<div style="height:7mm;"></div>`}
              <div class="sig-line">${escapeHtml(school?.principalName || "Principal")} (Seal &amp; Sign)</div>
            </div>
          </div>
        </div>

        <!-- Page 2 Footer -->
        <div style="display:flex;justify-content:space-between;align-items:center;border-top:1.2px solid #cbd5e1;padding-top:1.8mm;margin-top:auto;font-size:6.8pt;color:#64748b;font-weight:700;">
          <span>📄 पृष्ठ 2 / 2 (Page 2 of 2)</span>
          <span style="color:#15803d;font-weight:800;">✓ आधिकारिक विद्यालय दस्तावेज (Official School Record)</span>
          <span>NSTA School ERP</span>
        </div>
      </div>
    `;
  };

  const buildSheetInnerHtml = (targetMode: AdmissionPrintMode): string => {
    if (targetMode === "combined") {
      if (previewPage === "all") {
        return `
          <div class="a4-sheet a4-page-1">${buildSheetInnerHtmlPage("form_only", 1)}</div>
          <div class="page-break"></div>
          <div class="a4-sheet a4-page-2">${buildSheetInnerHtmlPage("form_only", 2)}</div>
          <div class="page-break"></div>
          <div class="a4-sheet a4-page-3">${buildSheetInnerHtmlPage("combined", 3)}</div>
        `;
      }
      const p = previewPage === 3 ? 3 : previewPage === 2 ? 2 : 1;
      return `<div class="a4-sheet a4-page-${p}">${buildSheetInnerHtmlPage(p === 3 ? "combined" : "form_only", p)}</div>`;
    }
    if (targetMode === "form_only" || targetMode === "classic_box_grid") {
      if (previewPage === "all") {
        return `
          <div class="a4-sheet a4-page-1">${buildSheetInnerHtmlPage(targetMode, 1)}</div>
          <div class="page-break"></div>
          <div class="a4-sheet a4-page-2">${buildSheetInnerHtmlPage(targetMode, 2)}</div>
        `;
      }
      const p: 1 | 2 = previewPage === 2 ? 2 : 1;
      return `<div class="a4-sheet a4-page-${p}">${buildSheetInnerHtmlPage(targetMode, p)}</div>`;
    }
    return `<div class="a4-sheet">${buildSheetInnerHtmlPage(targetMode, 1)}</div>`;
  };

  const handlePrintA4 = () => {
    let bodyHtml = "";
    if (mode === "combined") {
      const p1 = buildSheetInnerHtmlPage("form_only", 1);
      const p2 = buildSheetInnerHtmlPage("form_only", 2);
      const p3 = buildSheetInnerHtmlPage("combined", 3);
      bodyHtml = `
        <div class="a4-sheet a4-page-1">${p1}</div>
        <div class="page-break"></div>
        <div class="a4-sheet a4-page-2">${p2}</div>
        <div class="page-break"></div>
        <div class="a4-sheet a4-page-3">${p3}</div>
      `;
    } else if (mode === "form_only" || mode === "classic_box_grid") {
      const p1 = buildSheetInnerHtmlPage(mode, 1);
      const p2 = buildSheetInnerHtmlPage(mode, 2);
      bodyHtml = `
        <div class="a4-sheet a4-page-1">${p1}</div>
        <div class="page-break"></div>
        <div class="a4-sheet a4-page-2">${p2}</div>
      `;
    } else {
      bodyHtml = `<div class="a4-sheet">${buildSheetInnerHtmlPage(mode, 1)}</div>`;
    }

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

  const generateActiveSectionPdfBlob = async (): Promise<{ blob: Blob; filename: string }> => {
    const safeName = fullName.replace(/[^a-z0-9-_]+/gi, "_");

    if (mode === "combined" || mode === "form_only" || mode === "classic_box_grid") {
      const pageHtmls =
        mode === "combined"
          ? [
              `<div class="a4-sheet">${buildSheetInnerHtmlPage("form_only", 1)}</div>`,
              `<div class="a4-sheet">${buildSheetInnerHtmlPage("form_only", 2)}</div>`,
              `<div class="a4-sheet">${buildSheetInnerHtmlPage("combined", 3)}</div>`,
            ]
          : [
              `<div class="a4-sheet">${buildSheetInnerHtmlPage(mode, 1)}</div>`,
              `<div class="a4-sheet">${buildSheetInnerHtmlPage(mode, 2)}</div>`,
            ];

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const renderW = pdfW - margin * 2;

      for (let i = 0; i < pageHtmls.length; i++) {
        const canvas = await renderHtmlToCanvasSafe(pageHtmls[i], ADMISSION_PRINT_CSS, {
          widthPx: 794,
          scale: 2,
          backgroundColor: "#ffffff",
        });
        if (i > 0) pdf.addPage("a4", "portrait");
        const renderH = Math.min(pdfH - margin * 2, (canvas.height * renderW) / canvas.width);
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, renderW, renderH);
      }

      const prefix =
        mode === "combined"
          ? "Admission_Form_And_Receipt"
          : mode === "classic_box_grid"
          ? isBlankForm
            ? "Blank_Classic_Admission_Form"
            : "Classic_Admission_Form"
          : isBlankForm
          ? "Blank_Admission_Form"
          : "Admission_Form";
      const filename = `${prefix}_${safeName}_${admNo}_${pageHtmls.length}Page.pdf`;
      return { blob: pdf.output("blob"), filename };
    }

    const sheetHtml = `<div class="a4-sheet">${buildSheetInnerHtmlPage(mode, 1)}</div>`;
    const canvas = await renderHtmlToCanvasSafe(sheetHtml, ADMISSION_PRINT_CSS, {
      widthPx: 794,
      scale: 2,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const renderW = pdfW - margin * 2;
    const renderH = Math.min(pdfH - margin * 2, (canvas.height * renderW) / canvas.width);
    pdf.addImage(imgData, "JPEG", margin, margin, renderW, renderH);
    const filename = `Official_Admission_Fee_Receipt_${safeName}_${admNo}.pdf`;
    return { blob: pdf.output("blob"), filename };
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const { blob, filename } = await generateActiveSectionPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("PDF generation error, fallback to print:", err);
      handlePrintA4();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const [showAdmissionWhatsAppModal, setShowAdmissionWhatsAppModal] = useState(false);
  const [isSendingNstaMessenger, setIsSendingNstaMessenger] = useState(false);

  const targetStudentId = student?.id || application?.enrolledStudentId || application?.id || "";
  const parentPhone = phone && phone !== "—" ? phone : student?.phone || application?.phone || "";

  const admFeeDocOptions = useMemo(() => {
    if (!resolvedFee) return null;
    return {
      mode: "pos" as const,
      fee: resolvedFee,
      student: {
        name: fullName,
        admissionNo: admNo,
        rollNo: rollNo === "Not Assigned" ? "" : rollNo,
        phone: maskSensitiveData ? dispPhone : parentPhone,
        fatherName: dispFatherName,
      },
      schoolName: school?.name || "School",
      className: clsLabel,
      schoolDetails: {
        schoolId: school?.id,
        schoolName: school?.name,
        address: school?.address,
        phone: school?.phone || school?.mobile,
        email: school?.email,
        logoUrl,
        principalSignatureUrl: school?.principalSignatureUrl,
        directorSignatureUrl: school?.directorSignatureUrl,
        managerSignatureUrl: school?.managerSignatureUrl,
        managerName: school?.managerName,
        accountantSignatureUrl: school?.accountantSignatureUrl,
        accountantName: school?.accountantName,
        principalName: school?.principalName,
      },
      isDueDemand: false,
    };
  }, [resolvedFee, fullName, admNo, rollNo, parentPhone, dispPhone, dispFatherName, maskSensitiveData, school, clsLabel, logoUrl]);

  const admWhatsAppMeta = useMemo(() => {
    if (!admFeeDocOptions) return null;
    return buildWhatsAppReceiptMessage({
      ...admFeeDocOptions,
      targetPhone: parentPhone,
    });
  }, [admFeeDocOptions, parentPhone]);

  const activeShareInfo = useMemo(() => {
    const schoolTitle = school?.name || "School";
    if (mode === "receipt_only" && admWhatsAppMeta) {
      return {
        title: "Admission Fee Payment Receipt (प्रवेश रसीद - Full A4)",
        message: admWhatsAppMeta.message,
        totalAmount: admWhatsAppMeta.totalBill,
        paidAmount: admWhatsAppMeta.paidAmount,
        balanceDue: admWhatsAppMeta.balanceDue,
        nstaText: `🧾 Official Admission Fee Receipt (Full A4 PDF) — ${fullName} (${admNo}) ki admission fee rasid PDF bheji gayi hai.`,
      };
    }
    if (mode === "combined") {
      const formPart =
        `📑 *ADMISSION FORM + FEE RECEIPT (A4)*\n` +
        `🏫 *${schoolTitle}*\n` +
        `👤 *Student:* ${fullName}\n` +
        `🆔 *Adm No:* ${admNo}\n` +
        `📚 *Class:* ${clsLabel}\n` +
        `👨 *Father:* ${dispFatherName}\n`;
      const combinedMsg = admWhatsAppMeta
        ? `${formPart}\n${admWhatsAppMeta.message}`
        : `${formPart}\nKripya sanlagna (attached) 3-Page Admission Form aur Fee Receipt PDF check karein.`;
      return {
        title: "Admission Form + Fee Receipt (दोनों - 3 Page A4)",
        message: combinedMsg,
        totalAmount: admWhatsAppMeta?.totalBill,
        paidAmount: admWhatsAppMeta?.paidAmount,
        balanceDue: admWhatsAppMeta?.balanceDue,
        nstaText: `📑 Admission Form + Fee Receipt (3 Page A4 PDF) — ${fullName} (${admNo}) ka admission form aur fee rasid ek sath PDF me bheja gaya hai.`,
      };
    }
    const formMsg =
      `📋 *OFFICIAL ADMISSION FORM (A4)*\n` +
      `🏫 *${schoolTitle}*\n` +
      `👤 *Student:* ${fullName}\n` +
      `🆔 *Adm No:* ${admNo}\n` +
      `📚 *Class:* ${clsLabel}\n` +
      `👨 *Father:* ${dispFatherName}\n` +
      (dob && dob !== "—" ? `🎂 *DOB:* ${dob}\n` : "") +
      `\nKripya sanlagna (attached) Full A4 Admission Form PDF check karein. Dhanyawad!`;
    return {
      title: "Official Admission Form (प्रवेश फॉर्म - 2 Page A4)",
      message: formMsg,
      totalAmount: undefined,
      paidAmount: undefined,
      balanceDue: undefined,
      nstaText: `📋 Official Admission Form (2 Page A4 PDF) — ${fullName} (${admNo}) ka pravesh form PDF bheja gaya hai.`,
    };
  }, [mode, school?.name, fullName, admNo, clsLabel, dispFatherName, dob, admWhatsAppMeta]);

  const handleDirectWhatsAppShare = () => {
    setShowAdmissionWhatsAppModal(true);
  };

  const handleSendToNstaMessenger = async () => {
    if (!targetStudentId || !school?.id) {
      toast.error("इस फॉर्म से कोई छात्र जुड़ा नहीं है (Student record not linked).");
      return;
    }
    setIsSendingNstaMessenger(true);
    try {
      const { blob, filename } = await generateActiveSectionPdfBlob();
      const pdfFile = new File([blob], filename, { type: "application/pdf" });

      let uploadedUrl = "";
      try {
        const res = await uploadToCloudinary(pdfFile, "pdf");
        uploadedUrl = res?.secure_url || res?.url || "";
      } catch (uploadErr) {
        console.warn("[AdmissionFormPrintModal] Cloud PDF upload failed, using DataURL fallback:", uploadErr);
      }

      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = () => reject(new Error("PDF read failed"));
          reader.readAsDataURL(blob);
        });
      }

      const nstaMsg: NstaMessage = {
        id: `adm_doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        schoolId: school.id,
        threadType: "SCHOOL_DESK",
        studentId: targetStudentId,
        studentName: fullName,
        className: clsLabel,
        senderId: "school_admin",
        senderName: "School Administration & Accounts",
        senderRole: "ADMIN",
        text: activeShareInfo.nstaText,
        attachmentType: "PDF",
        attachmentUrl: uploadedUrl,
        fileName: filename,
        fileSize: blob.size,
        createdAt: new Date().toISOString(),
        status: "delivered",
      };

      await saveNstaMessage(nstaMsg);

      sendSchoolPushNotification({
        schoolId: school.id,
        studentIds: [targetStudentId],
        title: `🏫 ${school.name || "School"} • ${activeShareInfo.title}`,
        body: activeShareInfo.nstaText,
        type: mode === "receipt_only" ? "FEE_RECEIPT" : "NSTA_MESSAGE",
        url: "/?schoolPortal=1&schoolTab=messenger",
      }).catch(() => {});

      toast.success(`✅ ${fullName} के NSTA Messenger में PDF भेज दिया गया!`);
    } catch (err: any) {
      console.error("Failed to send PDF to NSTA Messenger:", err);
      toast.error(err?.message || "NSTA Messenger में PDF भेजने में समस्या आई।");
    } finally {
      setIsSendingNstaMessenger(false);
    }
  };


  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl border border-slate-300 dark:border-slate-700 overflow-hidden">
        {/* Top Clean Action Bar */}
        <div className="bg-slate-900 text-white px-3 sm:px-4 py-2 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600/25 border border-blue-400/40 flex items-center justify-center text-blue-300 shrink-0">
                <Printer className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm leading-tight text-white truncate flex items-center gap-1.5 flex-wrap">
                  <span>Admission Print &amp; Receipt Studio</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                    mode === "classic_box_grid"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/40"
                      : mode === "receipt_only"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : "bg-blue-500/20 text-blue-300 border-blue-400/30"
                  }`}>
                    {mode === "classic_box_grid"
                      ? "📷 क्लासिक बॉक्स फॉर्म (A4)"
                      : mode === "receipt_only"
                      ? "🧾 फीस रसीद (Full A4)"
                      : mode === "combined"
                      ? "📑 फॉर्म + रसीद (A4)"
                      : "📋 DPS फॉर्म (Full A4)"}
                  </span>
                  {isBlankForm && mode !== "receipt_only" && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                      ✏️ खाली फॉर्म (Blank Print)
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-400 truncate">
                  {isBlankForm && mode !== "receipt_only" ? "📝 खाली फॉर्म प्रिंट (Walk-in Admissions)" : `${fullName} • ${admNo} • ${clsLabel}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* TEMPLATE PICKER & ACTION BAR */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1 flex-wrap">
            {/* Template Selector Pills */}
            <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-slate-700 text-xs shrink-0">
              <button
                type="button"
                onClick={() => { setMode("form_only"); setPreviewPage("all"); }}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  mode === "form_only"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                }`}
                title="फुल A4 DPS/CBSE एडमिशन फॉर्म (स्कूल फाइल व पैरेंट कॉपी)"
              >
                📋 DPS फॉर्म (A4)
              </button>
              {resolvedFee && (
                <button
                  type="button"
                  onClick={() => { setMode("receipt_only"); setPreviewPage(1); }}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mode === "receipt_only"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                  title="अभिभावक व स्कूल रिकॉर्ड हेतु आधिकारिक एडमिशन फीस रसीद (Full A4)"
                >
                  🧾 फीस रसीद (A4)
                </button>
              )}
              {resolvedFee && (
                <button
                  type="button"
                  onClick={() => { setMode("combined"); setPreviewPage("all"); }}
                  className={`px-2.5 sm:px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    mode === "combined"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "text-slate-300 hover:text-white hover:bg-slate-700/60"
                  }`}
                  title="एडमिशन फॉर्म (पेज 1-2) + एडमिशन फीस रसीद (पेज 3) एक साथ Full A4 में"
                >
                  📑 दोनों (A4)
                </button>
              )}
            </div>

            {/* Edit Form & Blank vs Filled Toggles (Only relevant on forms) */}
            {!isStudentView && mode !== "receipt_only" && (
              <button
                type="button"
                onClick={() => setIsEditingForm((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shadow-xs ${
                  isEditingForm
                    ? "bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400"
                    : "bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-500"
                }`}
                title="एडमिशन फॉर्म के विवरण बदलें (नाम, धर्म हिंदू/मुस्लिम, जाति, जन्मतिथि आदि)"
              >
                <Pencil className="w-3 h-3" />
                <span>{isEditingForm ? "Close Editor" : "Edit Form (सुधार)"}</span>
              </button>
            )}

            {!isStudentView && mode !== "receipt_only" && (
              <button
                type="button"
                onClick={() => setIsBlankForm((prev) => !prev)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer shadow-xs ${
                  isBlankForm
                    ? "bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-500"
                    : "bg-slate-800 text-emerald-300 border-slate-700 hover:bg-slate-700"
                }`}
                title="खाली फॉर्म और भरे हुए फॉर्म में स्विच करें"
              >
                <span>{isBlankForm ? "📝 खाली फॉर्म (Blank)" : "📋 भरा हुआ (Filled)"}</span>
              </button>
            )}

            {/* Privacy Mask Toggle (Visible on BOTH Admin and Student Portal for Form & Receipt) */}
            <button
              type="button"
              onClick={() => setMaskSensitiveData((prev) => !prev)}
              className={`flex items-center justify-center p-1.5 rounded-lg border transition cursor-pointer shadow-xs shrink-0 ${
                maskSensitiveData
                  ? "bg-amber-600 text-white border-amber-400 hover:bg-amber-500"
                  : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              }`}
              title={maskSensitiveData ? "संवेदनशील डेटा छिपा है (पूरा दिखाने के लिए क्लिक करें)" : "मोबाइल नंबर, आधार, पिता और माता का नाम 2 अक्षर के बाद xxxx में छुपाएं"}
              aria-label={maskSensitiveData ? "Show sensitive data" : "Mask sensitive data"}
            >
              {maskSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-1.5 flex-nowrap">

              {!isStudentView && (
                <button
                  type="button"
                  onClick={handlePrintA4}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer shrink-0 transition"
                  title="Full A4 शीट प्रिंट करें"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print A4</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer shrink-0 transition disabled:opacity-60"
                title="Full A4 शीट PDF डाउनलोड करें"
              >
                {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                <span>{downloadingPdf ? "Saving..." : "PDF (A4)"}</span>
              </button>

              {!isStudentView && resolvedFee && (
                <button
                  type="button"
                  onClick={() => setShowOfficialPosModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer shrink-0 transition"
                  title="Official Receipt (Full A4 / POS 80mm / A6) प्रिंट या WhatsApp करें"
                >
                  <ReceiptText className="w-3.5 h-3.5 text-amber-200" />
                  <span>POS</span>
                </button>
              )}

              {!isStudentView && (
                <button
                  type="button"
                  onClick={handleDirectWhatsAppShare}
                  disabled={isSharingWhatsApp}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer shrink-0 transition disabled:opacity-60"
                  title={
                    mode === "combined"
                      ? "फॉर्म + रसीद दोनों का PDF WhatsApp पर भेजें"
                      : mode === "receipt_only"
                      ? "फीस रसीद का PDF WhatsApp पर भेजें"
                      : "एडमिशन फॉर्म का PDF WhatsApp पर भेजें"
                  }
                >
                  {isSharingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageCircle className="w-3.5 h-3.5 text-amber-300" />}
                  <span>WhatsApp</span>
                </button>
              )}

              {!isStudentView && targetStudentId && (
                <button
                  type="button"
                  onClick={handleSendToNstaMessenger}
                  disabled={isSendingNstaMessenger}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-[11px] font-bold shadow-xs active:scale-95 cursor-pointer shrink-0 transition disabled:opacity-60"
                  title={`${fullName} के NSTA Messenger (School Desk) में यही PDF भेजें`}
                >
                  {isSendingNstaMessenger ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-cyan-200" />}
                  <span>{isSendingNstaMessenger ? "Sending..." : "NSTA Messenger"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline Edit Admission Form Details Drawer */}
        {isEditingForm && !isStudentView && mode !== "receipt_only" && (
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 p-3 sm:p-4 max-h-[50vh] overflow-y-auto space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Admission Form Details (फॉर्म विवरण बदलें)</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Changes update live on the A4 sheet below. Click Save &amp; Apply to keep permanently.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditDraft(appliedOverrides || buildInitialEditDraft());
                    setIsEditingForm(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={handleSaveFormEdits}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savingEdit ? "Saving..." : "Save & Apply"}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Student Name</label>
                <input
                  type="text"
                  value={editDraft.studentName}
                  onChange={(e) => setEditDraft((p) => ({ ...p, studentName: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Admission No.</label>
                <input
                  type="text"
                  value={editDraft.admissionNo}
                  onChange={(e) => setEditDraft((p) => ({ ...p, admissionNo: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Roll No.</label>
                <input
                  type="text"
                  value={editDraft.rollNo}
                  onChange={(e) => setEditDraft((p) => ({ ...p, rollNo: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Religion (धर्म)</label>
                <select
                  value={["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain"].includes(editDraft.religion) ? editDraft.religion : "Other"}
                  onChange={(e) => setEditDraft((p) => ({ ...p, religion: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="Hindu">Hindu (हिंदू)</option>
                  <option value="Muslim">Muslim (मुस्लिम)</option>
                  <option value="Sikh">Sikh (सिख)</option>
                  <option value="Christian">Christian (ईसाई)</option>
                  <option value="Buddhist">Buddhist (बौद्ध)</option>
                  <option value="Jain">Jain (जैन)</option>
                  <option value="Other">Other (अन्य)</option>
                </select>
                {!["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain"].includes(editDraft.religion) && (
                  <input
                    type="text"
                    value={editDraft.religion === "Other" ? "" : editDraft.religion}
                    onChange={(e) => setEditDraft((p) => ({ ...p, religion: e.target.value || "Other" }))}
                    placeholder="अन्य धर्म लिखें"
                    className="mt-1 w-full px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white text-[11px]"
                  />
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Gender</label>
                <select
                  value={editDraft.gender}
                  onChange={(e) => setEditDraft((p) => ({ ...p, gender: e.target.value as "male" | "female" | "other" }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="male">Male (लड़का)</option>
                  <option value="female">Female (लड़की)</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Caste Category</label>
                <select
                  value={editDraft.category}
                  onChange={(e) => setEditDraft((p) => ({ ...p, category: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                >
                  {ADMISSION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={editDraft.dateOfBirth}
                  onChange={(e) => setEditDraft((p) => ({ ...p, dateOfBirth: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Admission Type</label>
                <select
                  value={admissionType}
                  onChange={(e) => setAdmissionType(e.target.value as "NEW" | "READMISSION")}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-semibold"
                >
                  <option value="NEW">NEW ADMISSION</option>
                  <option value="READMISSION">RE-ADMISSION</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Blood Group</label>
                <select
                  value={editDraft.bloodGroup}
                  onChange={(e) => setEditDraft((p) => ({ ...p, bloodGroup: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Nationality</label>
                <input
                  type="text"
                  value={editDraft.nationality}
                  onChange={(e) => setEditDraft((p) => ({ ...p, nationality: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Primary Mobile</label>
                <input
                  type="tel"
                  value={editDraft.phone}
                  onChange={(e) => setEditDraft((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Father&apos;s Name</label>
                <input
                  type="text"
                  value={editDraft.fatherName}
                  onChange={(e) => setEditDraft((p) => ({ ...p, fatherName: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Father Occupation</label>
                <input
                  type="text"
                  value={editDraft.fatherOccupation}
                  onChange={(e) => setEditDraft((p) => ({ ...p, fatherOccupation: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Mother&apos;s Name</label>
                <input
                  type="text"
                  value={editDraft.motherName}
                  onChange={(e) => setEditDraft((p) => ({ ...p, motherName: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Mother Occupation</label>
                <input
                  type="text"
                  value={editDraft.motherOccupation}
                  onChange={(e) => setEditDraft((p) => ({ ...p, motherOccupation: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Student Aadhaar</label>
                <input
                  type="text"
                  value={editDraft.aadhaarNo}
                  onChange={(e) => setEditDraft((p) => ({ ...p, aadhaarNo: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">APAAR / PEN ID</label>
                <input
                  type="text"
                  value={editDraft.apaarId}
                  onChange={(e) => setEditDraft((p) => ({ ...p, apaarId: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Previous School Name</label>
                <input
                  type="text"
                  value={editDraft.previousSchool}
                  onChange={(e) => setEditDraft((p) => ({ ...p, previousSchool: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div className="col-span-2 sm:col-span-3">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Present / Residential Address</label>
                <input
                  type="text"
                  value={editDraft.address}
                  onChange={(e) => setEditDraft((p) => ({ ...p, address: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">Monthly Tuition (₹)</label>
                <input
                  type="number"
                  value={editDraft.monthlyFee}
                  onChange={(e) => setEditDraft((p) => ({ ...p, monthlyFee: e.target.value }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Responsive Full-A4 Preview Area */}
        <div
          ref={previewViewportRef}
          className="flex-1 overflow-auto p-2 sm:p-5 flex flex-col items-center justify-start bg-slate-200/90 dark:bg-slate-950"
        >
          {(() => {
            const pageCount =
              previewPage === "all" && mode === "combined"
                ? 3
                : previewPage === "all" && (mode === "form_only" || mode === "classic_box_grid")
                ? 2
                : 1;
            const totalHeightMm = pageCount === 3 ? 281 * 3 + 16 : pageCount === 2 ? 281 * 2 + 8 : 281;
            return (
              <div
                className="shadow-2xl rounded-lg overflow-hidden bg-white border border-slate-300 dark:border-slate-800 shrink-0 transition-all duration-150 my-1"
                style={{
                  width: `${196 * fitScale}mm`,
                  height: `${totalHeightMm * fitScale}mm`,
                  boxSizing: "border-box",
                }}
              >
                <div
                  ref={previewRef}
                  style={{
                    width: "196mm",
                    minHeight: `${totalHeightMm}mm`,
                    transform: `scale(${fitScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <style>{ADMISSION_PRINT_CSS}</style>
                  <div dangerouslySetInnerHTML={{ __html: buildSheetInnerHtml(mode) }} />
                </div>
              </div>
            );
          })()}
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
            aadhaarNo: studentAadhaar !== "—" ? studentAadhaar : undefined,
            photoUrl,
            monthlyFee: Number(monthlyFee) || 0,
            joinDate: admDateRaw,
            active: true,
            createdAt: new Date().toISOString(),
          }}
          className={clsLabel}
          sessionName={sessLabel}
          isStudentView={isStudentView}
          defaultMasked={maskSensitiveData}
        />
      )}

      {/* WhatsApp Share & Send Modal with Active Section PDF */}
      {showAdmissionWhatsAppModal && (
        <WhatsAppShareModal
          isOpen={showAdmissionWhatsAppModal}
          onClose={() => setShowAdmissionWhatsAppModal(false)}
          studentName={fullName}
          parentPhone={parentPhone}
          className={clsLabel}
          rollNo={rollNo === "Not Assigned" ? "" : rollNo}
          admissionNo={admNo}
          fatherName={dispFatherName}
          receiptNo={resolvedFee?.receiptNo || admWhatsAppMeta?.receiptData.receiptNo}
          title={activeShareInfo.title}
          formattedMessage={activeShareInfo.message}
          isDueDemand={false}
          totalAmount={activeShareInfo.totalAmount}
          paidAmount={activeShareInfo.paidAmount}
          balanceDue={activeShareInfo.balanceDue}
          generatePdfBlob={generateActiveSectionPdfBlob}
        />
      )}
    </div>
  );
};

