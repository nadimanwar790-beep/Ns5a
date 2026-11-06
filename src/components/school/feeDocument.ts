import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderHtmlToCanvasSafe } from "../../utils/safePdfCapture";
import type { MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generateDpsReceiptHtml,
  generatePosSlipHtml,
  DPS_RECEIPT_CSS,
  POS_SLIP_CSS,
  printDpsReceiptDirect,
  printPosSlipDirect,
  getSavedSchoolLogo,
  formatAcademicSession,
  formatShortFeeMonth,
  formatConciseArrearsMonths,
  computeStudentFeeHistorySummary,
  type DpsReceiptData,
  type FeeReceiptItem,
} from "./feeReceiptUtils";

interface FeeDocumentOptions {
  fee: MonthlyFee;
  student?: Pick<SchoolStudent, "phone" | "fatherName" | "admissionNo" | "rollNo" | "name"> | null;
  schoolName?: string;
  className?: string;
  feeHistory?: MonthlyFee[];
  isDueDemand?: boolean;
  mode?: "4in1" | "full" | "pos" | "a6";
  schoolDetails?: {
    schoolId?: string;
    schoolName?: string;
    address?: string;
    phone?: string;
    email?: string;
    affiliation?: string;
    code?: string;
    logoUrl?: string;
    upiId?: string;
    principalName?: string;
    principalSignatureUrl?: string;
    directorName?: string;
    directorSignatureUrl?: string;
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
  feeHistory,
  schoolDetails,
}: FeeDocumentOptions): DpsReceiptData {
  const baseMonthlyAmount = Number(fee.monthlyAmount ?? fee.amount ?? 0) || 5000;
  const arrears = Number(fee.arrearsAmount || 0);

  // Format month name cleanly (e.g. "NOV 2026")
  const installment = fee.month
    ? (formatShortFeeMonth(fee.month).toUpperCase() || "CURRENT MONTH")
    : "CURRENT MONTH";

  // Format Receipt Date and Exact Payment Time
  let receiptDate = "";
  let receiptTime = "";
  if (fee.paidDate) {
    const d = new Date(fee.paidDate);
    receiptDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    receiptTime = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  } else {
    const d = new Date();
    receiptDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    receiptTime = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }

  // Build items ledger
  let items: FeeReceiptItem[] = [];
  if (fee.items && fee.items.length > 0) {
    items = fee.items;
  } else if (baseMonthlyAmount >= 50000) {
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
      paid: fee.paid ? baseMonthlyAmount : Number(fee.paidAmount || 0),
    });
    if (arrears > 0) {
      const conciseArrears = formatConciseArrearsMonths(fee.arrearsMonths);
      items.push({
        id: "2",
        slNo: 2,
        description: `Back Due / Previous Arrears${conciseArrears ? ` (${conciseArrears})` : ""}`,
        due: arrears,
        con: 0,
        paid: fee.paid ? arrears : 0,
      });
    }
  }

  const isDueDemandSlip = !fee.paid && (Number(fee.paidAmount || 0) === 0);
  const isAdmissionReceipt = fee.feeType === "admission" || fee.receiptCategory === "admission";
  const resolvedSchoolId = schoolDetails?.schoolId || fee.schoolId || "";
  const histSummary = computeStudentFeeHistorySummary({
    studentId: fee.studentId,
    schoolId: resolvedSchoolId,
    currentMonth: fee.month,
    currentFee: fee,
    feeHistory,
  });

  return {
    schoolName: schoolDetails?.schoolName || schoolName || "School",
    schoolId: resolvedSchoolId,
    schoolAddress: schoolDetails?.address || "Institutional Academic Campus, Educational Zone",
    schoolLogoUrl: getSavedSchoolLogo(schoolDetails?.logoUrl, resolvedSchoolId),
    schoolPhone: schoolDetails?.phone,
    schoolEmail: schoolDetails?.email,
    schoolAffiliation: schoolDetails?.affiliation,
    upiId: schoolDetails?.upiId || "",
    receiptTitle: isDueDemandSlip
      ? "FEE DEMAND SLIP • बकाया शुल्क तकादा पर्ची"
      : isAdmissionReceipt
      ? "OFFICIAL ADMISSION FEE RECEIPT / प्रवेश शुल्क रसीद"
      : "OFFICIAL MONTHLY FEE RECEIPT / मासिक शुल्क रसीद",

    receiptNo: fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000)),
    admissionNo: (student as any)?.admissionNo || fee.rollNo || String(Math.floor(100000 + Math.random() * 900000)),
    studentName: fee.studentName || student?.name || "STUDENT",
    fatherName: student?.fatherName || "",
    studentId: fee.studentId || "",
    rollNo: student?.rollNo || fee.rollNo || "",
    phone: student?.phone || (fee as any).phone || "",
    studentPhotoUrl: (student as any)?.photoUrl || (student as any)?.photo || "",
    installment: isAdmissionReceipt ? "ADMISSION" : installment,
    receiptDate: isDueDemandSlip ? receiptDate : (receiptTime ? `${receiptDate} (${receiptTime})` : receiptDate),
    session: formatAcademicSession((fee as any)?.sessionId || "2026-27"),
    className: className || fee.classId || "Class",
    counterNo: isDueDemandSlip ? "DUE-DEMAND" : isAdmissionReceipt ? "ADM-RECEIPT" : "FEE-RECEIPT",

    items,
    balanceDue: fee.balanceDue,
    lastPaidAmount: fee.lastPaidAmount !== undefined ? fee.lastPaidAmount : histSummary.lastPaidAmount,
    lastPaidDate: fee.lastPaidDate || histSummary.lastPaidDate,
    lastDueAmount: fee.lastDueAmount !== undefined ? fee.lastDueAmount : histSummary.lastDueAmount,
    lastDueDate: fee.lastDueDate || histSummary.lastDueDate,
    fifoSummary: fee.note,

    payModeInfo: fee.payModeInfo || {
      payMode: fee.paid ? "Cash" : "Payment Pending / Due Slip",
      date: receiptDate,
      bank: fee.paid ? "School Counter" : "PENDING",
      number: "-",
    },

    note: fee.note || (isDueDemandSlip ? "Pay by 10th of month" : "Thank you"),
    showDigitalSignature: Boolean(schoolDetails?.principalSignatureUrl || schoolDetails?.directorSignatureUrl),
    principalSignatureUrl: schoolDetails?.principalSignatureUrl,
    principalName: schoolDetails?.principalName || "Principal",
    principalTitle: "Principal",
    directorSignatureUrl: schoolDetails?.directorSignatureUrl,
    directorName: schoolDetails?.directorName || "Director",
    signatoryTitle: schoolDetails?.principalName || "Principal",
  };
}

/**
 * Downloads official DPS-Format Monthly Fee Receipt as high-resolution PDF
 */
export async function downloadFeeDocument(options: FeeDocumentOptions & { mode?: "4in1" | "full" | "pos" | "a6" }): Promise<void> {
  const receiptData = buildDpsReceiptData(options);
  const safeName = (receiptData.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const receiptNumber = receiptData.receiptNo;
  const mode = options.mode || (options.isDueDemand ? "a6" : "pos");
  const isA6 = mode === "a6" || Boolean(options.isDueDemand && mode !== "pos");
  const isPos = mode === "pos";

  let htmlContent = "";
  const cssText = isPos ? POS_SLIP_CSS : DPS_RECEIPT_CSS;
  if (isA6) {
    const { generateSingleA6SlipHtml } = await import("./feeReceiptUtils");
    htmlContent = generateSingleA6SlipHtml(receiptData);
  } else if (mode === "4in1") {
    const { generate4in1A4PageHtml } = await import("./feeReceiptUtils");
    htmlContent = generate4in1A4PageHtml([
      { data: receiptData, copyTitle: "STUDENT COPY" },
      { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: receiptData, copyTitle: "ACCOUNTS COPY" },
      { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
    ]);
  } else if (isPos) {
    htmlContent = generatePosSlipHtml(receiptData, { rollWidthMm: 80 });
  } else {
    htmlContent = generateDpsReceiptHtml(receiptData, { layout: "full" });
  }

  try {
    const widthPx = isA6 ? 397 : mode === "4in1" ? 794 : isPos ? 340 : 720;
    const canvas = await renderHtmlToCanvasSafe(htmlContent, cssText, {
      widthPx,
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: isA6 ? "a6" : "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    if (isA6 || mode === "4in1") {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    } else if (isPos) {
      const printWidth = 84;
      const printHeight = Math.min(pdfHeight - 20, (canvas.height * printWidth) / canvas.width);
      const marginX = (pdfWidth - printWidth) / 2;
      pdf.addImage(imgData, "JPEG", marginX, 12, printWidth, printHeight);
    } else {
      const marginX = 14;
      const printWidth = pdfWidth - marginX * 2;
      const printHeight = (canvas.height * printWidth) / canvas.width;
      const marginY = Math.max(14, (pdfHeight - printHeight) / 2);
      pdf.addImage(imgData, "JPEG", marginX, marginY, printWidth, printHeight);
    }
    const docPrefix = isA6 ? "Fee_Demand_Slip" : isPos ? "Fee_POS_Receipt" : "Fee_Receipt";
    pdf.save(`${docPrefix}_${safeName}_${receiptNumber}.pdf`);
  } catch (err) {
    console.warn("Direct PDF generation fallback to print dialog:", err);
    if (isA6) {
      const { printA6SlipDirect } = await import("./feeReceiptUtils");
      printA6SlipDirect(receiptData);
    } else if (mode === "pos") {
      printPosSlipDirect(receiptData, 80);
    } else {
      printDpsReceiptDirect(receiptData, mode);
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

/**
 * Generates an official PDF Blob from FeeDocumentOptions
 */
/**
 * Generates an official PDF Blob from FeeDocumentOptions
 */
export async function generateFeeDocumentPdfBlob(
  options: FeeDocumentOptions & { mode?: "4in1" | "full" | "pos" | "a6" }
): Promise<{ blob: Blob; filename: string; receiptData: DpsReceiptData }> {
  const receiptData = buildDpsReceiptData(options);
  const safeName = (receiptData.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const receiptNumber = receiptData.receiptNo;
  const mode = options.mode || (options.isDueDemand ? "a6" : "pos");
  const isA6 = mode === "a6" || Boolean(options.isDueDemand && mode !== "pos");
  const isPos = mode === "pos";
  const filename = isA6
    ? `Fee_Demand_Slip_${safeName}_${receiptNumber}.pdf`
    : isPos
    ? `POS_Fee_Receipt_${safeName}_${receiptNumber}.pdf`
    : `${receiptData.receiptTitle?.toLowerCase().includes("due") ? "Fee_Due_Demand_Slip" : "Official_Fee_Receipt"}_${safeName}_${receiptNumber}.pdf`;

  let htmlContent = "";
  const cssText = isPos ? POS_SLIP_CSS : DPS_RECEIPT_CSS;
  if (isA6) {
    const { generateSingleA6SlipHtml } = await import("./feeReceiptUtils");
    htmlContent = generateSingleA6SlipHtml(receiptData);
  } else if (mode === "4in1") {
    const { generate4in1A4PageHtml } = await import("./feeReceiptUtils");
    htmlContent = generate4in1A4PageHtml([
      { data: receiptData, copyTitle: "STUDENT COPY" },
      { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: receiptData, copyTitle: "ACCOUNTS COPY" },
      { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
    ]);
  } else if (isPos) {
    htmlContent = generatePosSlipHtml(receiptData, { rollWidthMm: 80 });
  } else {
    htmlContent = generateDpsReceiptHtml(receiptData, { layout: "full" });
  }

  const widthPx = isA6 ? 397 : mode === "4in1" ? 794 : isPos ? 340 : 720;
  const canvas = await renderHtmlToCanvasSafe(htmlContent, cssText, {
    widthPx,
    scale: 2,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  // If A6 mode, produce an authentic A6 PDF
  if (isA6) {
    const a6Pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a6",
    });
    const pdfWidth = a6Pdf.internal.pageSize.getWidth();
    const pdfHeight = a6Pdf.internal.pageSize.getHeight();
    a6Pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
    const blob = a6Pdf.output("blob");
    return { blob, filename, receiptData };
  }

  // If POS mode, produce an authentic 80mm roll PDF
  if (isPos) {
    const rollWidthMm = 80;
    const rollHeightMm = Math.max(110, (canvas.height * rollWidthMm) / canvas.width + 8);
    const posPdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [rollWidthMm, rollHeightMm],
    });
    posPdf.addImage(imgData, "JPEG", 0, 3, rollWidthMm, (canvas.height * rollWidthMm) / canvas.width);
    const blob = posPdf.output("blob");
    return { blob, filename, receiptData };
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  if (mode === "4in1") {
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  } else {
    const marginX = 14;
    const printWidth = pdfWidth - marginX * 2;
    const printHeight = (canvas.height * printWidth) / canvas.width;
    const marginY = Math.max(14, (pdfHeight - printHeight) / 2);
    pdf.addImage(imgData, "JPEG", marginX, marginY, printWidth, printHeight);
  }

  const blob = pdf.output("blob");
  return { blob, filename, receiptData };
}

/**
 * Builds the structured WhatsApp receipt / demand due message and extracts recipient metadata.
 */
export function buildWhatsAppReceiptMessage(
  options: FeeDocumentOptions & { mode?: "4in1" | "full" | "pos"; targetPhone?: string; isDueDemand?: boolean }
): {
  message: string;
  targetPhone: string;
  rawPhone: string;
  receiptData: DpsReceiptData;
  isDue: boolean;
  totalBill: number;
  paidAmount: number;
  balanceDue: number;
} {
  const receiptData = buildDpsReceiptData(options);
  const rawPhone = options.targetPhone || options.student?.phone || (options.fee as any).phone || "";
  const digits = rawPhone.replace(/\D/g, "");
  const targetPhone = digits.length === 10 ? `91${digits}` : digits;

  const totalBill = options.fee.amount || Number(options.fee.monthlyAmount || 0);
  const paidAmount = Number(options.fee.paidAmount !== undefined ? options.fee.paidAmount : (options.fee.paid ? totalBill : 0));
  const balanceDue = Number(options.fee.balanceDue !== undefined ? options.fee.balanceDue : Math.max(0, totalBill - paidAmount));

  const isDue = options.isDueDemand || (!options.fee.paid && paidAmount === 0);
  const isPos = options.mode === "pos";
  const schoolName = receiptData.schoolName || options.schoolName || "School";

  // Build itemized breakdown text for clear WhatsApp reading
  const itemLines = (receiptData.items || []).map((it, idx) => {
    const paidVal = Number(it.paid) || 0;
    const dueVal = Number(it.due) || 0;
    const amountStr = paidVal > 0 ? `₹${paidVal.toLocaleString("en-IN")}` : `₹${dueVal.toLocaleString("en-IN")}`;
    return `  ${idx + 1}. ${it.description}: ${amountStr}`;
  }).join("\n");

  let message = "";

  // 1. DEDICATED POS THERMAL RECEIPT WHATSAPP FORMAT
  if (isPos) {
    if (isDue) {
      message = `🏫 *${schoolName.toUpperCase()}*\n` +
        (receiptData.schoolAddress ? `📍 ${receiptData.schoolAddress}\n` : "") +
        (receiptData.schoolPhone ? `📞 Helpline: ${receiptData.schoolPhone}\n` : "") +
        `================================\n` +
        `⚠️ *POS FEE DEMAND SLIP (बकाया पर्ची)*\n` +
        `================================\n` +
        `🧾 *Slip No:* ${receiptData.receiptNo}\n` +
        `📅 *Date:* ${receiptData.receiptDate}\n` +
        `👤 *Student:* *${receiptData.studentName}*\n` +
        `🆔 *Adm No:* ${receiptData.admissionNo || "—"}\n` +
        `📚 *Class:* ${receiptData.className}${receiptData.rollNo ? ` (Roll: ${receiptData.rollNo})` : ""}\n` +
        (receiptData.fatherName ? `👨 *Father:* ${receiptData.fatherName}\n` : "") +
        `--------------------------------\n` +
        `*FEE PARTICULARS / विवरण:*\n` +
        `${itemLines}\n` +
        `--------------------------------\n` +
        `💰 *TOTAL DUE (कुल देय बकाया):* *₹${Math.max(balanceDue, totalBill).toLocaleString("en-IN")}*\n` +
        `================================\n` +
        `🙏 *कृपया निर्धारित तिथि तक शुल्क स्कूल काउंटर पर जमा करें।*\n` +
        `📄 *POS 80mm Thermal Slip PDF attached.*`;
    } else {
      message = `🏫 *${schoolName.toUpperCase()}*\n` +
        (receiptData.schoolAddress ? `📍 ${receiptData.schoolAddress}\n` : "") +
        (receiptData.schoolPhone ? `📞 Helpline: ${receiptData.schoolPhone}\n` : "") +
        `================================\n` +
        `🧾 *OFFICIAL POS THERMAL RECEIPT (रसीद)*\n` +
        `================================\n` +
        `🧾 *Receipt No:* ${receiptData.receiptNo}\n` +
        `📅 *Date & Time:* ${receiptData.receiptDate}\n` +
        `👤 *Student:* *${receiptData.studentName}*\n` +
        `🆔 *Adm No:* ${receiptData.admissionNo || "—"}\n` +
        `📚 *Class:* ${receiptData.className}${receiptData.rollNo ? ` (Roll: ${receiptData.rollNo})` : ""}\n` +
        (receiptData.fatherName ? `👨 *Father:* ${receiptData.fatherName}\n` : "") +
        `💳 *Pay Mode:* ${receiptData.payModeInfo.payMode || "Cash"}\n` +
        `--------------------------------\n` +
        `*FEE HEADS / मद विवरण:*\n` +
        `${itemLines}\n` +
        `--------------------------------\n` +
        `💰 *Gross Total:* ₹${totalBill.toLocaleString("en-IN")}\n` +
        (Number(options.fee.concession || 0) > 0 ? `🎁 *Concession:* -₹${Number(options.fee.concession).toLocaleString("en-IN")}\n` : "") +
        `✅ *NET PAID (जमा राशि):* *₹${paidAmount.toLocaleString("en-IN")}*\n` +
        `⚠️ *Balance Due (शेष):* ₹${balanceDue.toLocaleString("en-IN")}${balanceDue <= 0 ? " (FULL PAID ✓)" : ""}\n` +
        `================================\n` +
        `✍️ *Authority:* ${receiptData.signatoryTitle || "Principal / Cashier"} (VERIFIED)\n` +
        `*Computer Generated Official POS Slip*\n` +
        `📄 *POS 80mm Thermal Receipt PDF attached.*`;
    }
  } else {
    // 2. STANDARD / DPS RECEIPT FORMAT
    if (isDue) {
      const lastPaidAmt = Number(receiptData.lastPaidAmount || 0);
      const lastPaidDt = receiptData.lastPaidDate || "";
      const lastDueAmt = Number(receiptData.lastDueAmount || 0);
      const lastDueDt = receiptData.lastDueDate || "";
      const netPayableTotal = Math.max(balanceDue, totalBill);
      message = `🏫 *${schoolName.toUpperCase()}*\n` +
        `⚠️ *FEE DEMAND SLIP / बकाया शुल्क तकादा पर्ची*\n` +
        `----------------------------------------\n` +
        `👤 *Student Name:* ${receiptData.studentName}\n` +
        (receiptData.fatherName ? `👨 *Father Name:* ${receiptData.fatherName}\n` : "") +
        `🆔 *Adm No / Roll:* ${receiptData.admissionNo || "—"}${receiptData.rollNo ? ` (Roll: ${receiptData.rollNo})` : ""}\n` +
        `📚 *Class:* ${receiptData.className}\n` +
        `🧾 *Slip No:* ${receiptData.receiptNo} • *Date:* ${receiptData.receiptDate}\n` +
        `----------------------------------------\n` +
        `*FEE PARTICULARS:*\n${itemLines}\n` +
        `----------------------------------------\n` +
        `✅ *Last Paid (पिछला जमा):* ₹${lastPaidAmt.toLocaleString("en-IN")}${lastPaidAmt > 0 && lastPaidDt ? ` (${lastPaidDt})` : " (कोई पिछला जमा नहीं)"}\n` +
        `📌 *Last Due (पिछला बकाया):* ₹${lastDueAmt.toLocaleString("en-IN")}${lastDueAmt > 0 && lastDueDt ? ` (${lastDueDt})` : " (Clear)"}\n` +
        `💰 *Total Net Payable Due (कुल देय राशि):* ₹${netPayableTotal.toLocaleString("en-IN")}\n` +
        `----------------------------------------\n` +
        `🙏 *कृपया निर्धारित तिथि तक शुल्क स्कूल काउंटर या UPI QR द्वारा जमा करें।*`;
    } else {
      message = `🏫 *${schoolName.toUpperCase()}*\n` +
        `🧾 *OFFICIAL FEE PAYMENT RECEIPT / फीस रसीद*\n` +
        `----------------------------------------\n` +
        `👤 *Student Name:* ${receiptData.studentName}\n` +
        `🆔 *Adm No / Roll:* ${receiptData.admissionNo || "—"}\n` +
        `📚 *Class:* ${receiptData.className}\n` +
        `🧾 *Receipt No:* ${receiptData.receiptNo}\n` +
        `📅 *Date & Time:* ${receiptData.receiptDate}\n` +
        `💳 *Payment Mode:* ${receiptData.payModeInfo.payMode || "Cash"}\n` +
        `----------------------------------------\n` +
        `*FEE PARTICULARS:*\n${itemLines}\n` +
        `----------------------------------------\n` +
        `💰 *Total Payable (कुल शुल्क):* ₹${totalBill.toLocaleString("en-IN")}\n` +
        `✅ *Amount Paid (जमा राशि):* ₹${paidAmount.toLocaleString("en-IN")}\n` +
        `⚠️ *Remaining Balance (शेष बकाया):* ₹${balanceDue.toLocaleString("en-IN")}\n` +
        `----------------------------------------\n` +
        (balanceDue > 0
          ? `📌 *शेष बकाया ₹${balanceDue.toLocaleString("en-IN")} अगले महीने के बिल में जुड़ेगा।*\n`
          : `🎉 *सत्र का यह शुल्क पूर्णतः जमा (Full Paid) हो चुका है।*\n`) +
        `📄 *Official DPS Format PDF Receipt downloaded to your device.*`;
    }
  }

  return {
    message,
    targetPhone,
    rawPhone,
    receiptData,
    isDue,
    totalBill,
    paidAmount,
    balanceDue,
  };
}

/**
 * Shares or sends the official fee receipt / demand due slip directly to WhatsApp.
 */
export async function shareFeeReceiptOnWhatsApp(
  options: FeeDocumentOptions & { mode?: "4in1" | "full" | "pos"; targetPhone?: string; isDueDemand?: boolean }
): Promise<void> {
  const { message, targetPhone } = buildWhatsAppReceiptMessage(options);

  // Launch WhatsApp directly with prefilled message to target parent
  const waUrl = targetPhone
    ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  try {
    const link = document.createElement("a");
    link.href = waUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
    }, 100);
  } catch (err) {
    console.error("Direct link click failed, falling back to window.open", err);
    window.open(waUrl, "_blank");
  }
}


