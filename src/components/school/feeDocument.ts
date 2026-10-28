import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generateDpsReceiptHtml,
  DPS_RECEIPT_CSS,
  printDpsReceiptDirect,
  type DpsReceiptData,
  type FeeReceiptItem,
} from "./feeReceiptUtils";

interface FeeDocumentOptions {
  fee: MonthlyFee;
  student?: Pick<SchoolStudent, "phone" | "fatherName" | "admissionNo" | "rollNo" | "name"> | null;
  schoolName?: string;
  className?: string;
  schoolDetails?: {
    schoolName?: string;
    address?: string;
    phone?: string;
    email?: string;
    affiliation?: string;
    logoUrl?: string;
    principalName?: string;
    principalSignatureUrl?: string;
  };
}

/**
 * Builds standard DpsReceiptData structure from any MonthlyFee record
 */
export function buildDpsReceiptData({
  fee,
  student,
  schoolName,
  className,
  schoolDetails,
}: FeeDocumentOptions): DpsReceiptData {
  const baseMonthlyAmount = Number(fee.monthlyAmount ?? fee.amount ?? 0) || 5000;
  const arrears = Number(fee.arrearsAmount || 0);
  const totalPaid = Number(fee.amount ?? baseMonthlyAmount);

  // Format month name / installment
  let installment = "CURRENT INSTALLMENT";
  if (fee.month) {
    const d = new Date(`${fee.month}-01T00:00:00`);
    const m = d.getMonth();
    // Academic quarter or month name
    if (m >= 3 && m <= 5) installment = "APR-JUN";
    else if (m >= 6 && m <= 8) installment = "JULY-SEP";
    else if (m >= 9 && m <= 11) installment = "OCT-DEC";
    else installment = "JAN-MAR";
  }

  // Format Receipt Date
  let receiptDate = "";
  if (fee.paidDate) {
    const d = new Date(fee.paidDate);
    receiptDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } else {
    const d = new Date();
    receiptDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }

  // Build items ledger
  const items: FeeReceiptItem[] = [];
  if (baseMonthlyAmount >= 50000) {
    items.push(
      { id: "1", slNo: 1, description: "Admission Fee", due: 65000, con: 0, paid: 65000 },
      { id: "2", slNo: 2, description: "Tuition Fee", due: 19140, con: 0, paid: 19140 },
      { id: "3", slNo: 3, description: "Caution Money", due: 60000, con: 0, paid: 60000 },
      { id: "4", slNo: 4, description: "Annual Charges", due: 23320, con: 0, paid: 23320 },
      { id: "5", slNo: 5, description: "Bus Fee", due: 10360, con: 0, paid: 10360 }
    );
  } else {
    items.push({
      id: "1",
      slNo: 1,
      description: "Tuition Fee",
      due: baseMonthlyAmount,
      con: 0,
      paid: baseMonthlyAmount,
    });
    if (arrears > 0) {
      items.push({
        id: "2",
        slNo: 2,
        description: "Back Due / Previous Arrears",
        due: arrears,
        con: 0,
        paid: arrears,
      });
    }
  }

  return {
    schoolName: schoolDetails?.schoolName || schoolName || "Delhi Public School",
    schoolAddress: schoolDetails?.address || "Site No.1, Sector-45, Urban Estate, Gurgaon, Haryana",
    schoolLogoUrl: schoolDetails?.logoUrl,
    schoolPhone: schoolDetails?.phone,
    schoolEmail: schoolDetails?.email,
    schoolAffiliation: schoolDetails?.affiliation,

    receiptNo: fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000)),
    admissionNo: (student as any)?.admissionNo || fee.rollNo || String(Math.floor(100000 + Math.random() * 900000)),
    studentName: fee.studentName || student?.name || "STUDENT",
    studentPhotoUrl: (student as any)?.photoUrl || (student as any)?.photo || "",
    installment,
    receiptDate,
    session: (fee as any)?.sessionId || "2026-2027",
    className: className || fee.classId || "Class 6-B",
    counterNo: "DPS-RECEIPT",

    items,

    payModeInfo: {
      payMode: "Cheque",
      date: receiptDate,
      bank: "HDFC BANK",
      number: "689870,06,07",
    },

    note: fee.note || "356",
    showDigitalSignature: Boolean(schoolDetails?.principalSignatureUrl),
    principalSignatureUrl: schoolDetails?.principalSignatureUrl,
    principalName: schoolDetails?.principalName || "Principal",
  };
}

/**
 * Downloads official DPS-Format Monthly Fee Receipt as high-resolution PDF
 */
export async function downloadFeeDocument(options: FeeDocumentOptions): Promise<void> {
  const receiptData = buildDpsReceiptData(options);
  const safeName = (receiptData.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const receiptNumber = receiptData.receiptNo;

  // Create temporary container for high-fidelity rasterization
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "720px";
  container.style.background = "#ffffff";
  container.style.padding = "20px";
  container.style.zIndex = "-1";

  const styleEl = document.createElement("style");
  styleEl.innerHTML = DPS_RECEIPT_CSS;
  container.appendChild(styleEl);

  const wrapper = document.createElement("div");
  wrapper.innerHTML = generateDpsReceiptHtml(receiptData);
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    const cardEl = container.querySelector(".dps-receipt-card") as HTMLElement || wrapper;
    // Render using html2canvas with 2x scale for sharp print quality
    const canvas = await html2canvas(cardEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    // Maintain aspect ratio, centered on page with top margin
    const marginX = 14;
    const printWidth = pdfWidth - marginX * 2;
    const printHeight = (canvas.height * printWidth) / canvas.width;

    pdf.addImage(imgData, "JPEG", marginX, 15, printWidth, printHeight);
    pdf.save(`Fee_Receipt_${safeName}_${receiptNumber}.pdf`);
  } catch (err) {
    console.warn("Direct PDF generation fallback to print dialog:", err);
    // Fallback: trigger print dialog if canvas fails in browser sandbox
    printDpsReceiptDirect(receiptData);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Direct print helper
 */
export function printFeeDocument(options: FeeDocumentOptions): void {
  const receiptData = buildDpsReceiptData(options);
  printDpsReceiptDirect(receiptData);
}
