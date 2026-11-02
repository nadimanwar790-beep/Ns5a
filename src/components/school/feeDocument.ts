import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generateDpsReceiptHtml,
  DPS_RECEIPT_CSS,
  printDpsReceiptDirect,
  getSavedSchoolLogo,
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
      paid: fee.paid ? baseMonthlyAmount : (fee.paidAmount !== undefined ? Number(fee.paidAmount) : baseMonthlyAmount),
    });
    if (arrears > 0) {
      items.push({
        id: "2",
        slNo: 2,
        description: "Back Due / Previous Arrears",
        due: arrears,
        con: 0,
        paid: fee.paid ? arrears : 0,
      });
    }
  }

  const isDueDemandSlip = !fee.paid && (Number(fee.paidAmount || 0) === 0);

  return {
    schoolName: schoolDetails?.schoolName || schoolName || "Nstz",
    schoolAddress: schoolDetails?.address || "Institutional Academic Campus, Educational Zone",
    schoolLogoUrl: getSavedSchoolLogo(schoolDetails?.logoUrl),
    schoolPhone: schoolDetails?.phone,
    schoolEmail: schoolDetails?.email,
    schoolAffiliation: schoolDetails?.affiliation,
    receiptTitle: isDueDemandSlip
      ? "FEE DUE DEMAND NOTE / बकाया शुल्क विवरण"
      : "OFFICIAL MONTHLY FEE RECEIPT / मासिक शुल्क रसीद",

    receiptNo: fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000)),
    admissionNo: (student as any)?.admissionNo || fee.rollNo || String(Math.floor(100000 + Math.random() * 900000)),
    studentName: fee.studentName || student?.name || "STUDENT",
    studentPhotoUrl: (student as any)?.photoUrl || (student as any)?.photo || "",
    installment,
    receiptDate: receiptTime ? `${receiptDate} (${receiptTime})` : receiptDate,
    session: (fee as any)?.sessionId || "2026-2027",
    className: className || fee.classId || "Class 6-B",
    counterNo: "FEE-RECEIPT",

    items,
    balanceDue: fee.balanceDue,
    fifoSummary: fee.note,

    payModeInfo: fee.payModeInfo || {
      payMode: fee.paid ? "Cash" : "Demand Due",
      date: receiptDate,
      bank: "School Counter",
      number: "-",
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
export async function downloadFeeDocument(options: FeeDocumentOptions & { mode?: "4in1" | "full" }): Promise<void> {
  const receiptData = buildDpsReceiptData(options);
  const safeName = (receiptData.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const receiptNumber = receiptData.receiptNo;
  const mode = options.mode || "4in1";

  // Create temporary container for high-fidelity rasterization
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = mode === "4in1" ? "794px" : "720px";
  container.style.background = "#ffffff";
  container.style.padding = "0";
  container.style.zIndex = "-1";

  const styleEl = document.createElement("style");
  styleEl.innerHTML = DPS_RECEIPT_CSS;
  container.appendChild(styleEl);

  const wrapper = document.createElement("div");
  if (mode === "4in1") {
    const { generate4in1A4PageHtml } = await import("./feeReceiptUtils");
    wrapper.innerHTML = generate4in1A4PageHtml([
      { data: receiptData, copyTitle: "STUDENT COPY" },
      { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: receiptData, copyTitle: "ACCOUNTS COPY" },
      { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
    ]);
  } else {
    wrapper.innerHTML = generateDpsReceiptHtml(receiptData, { layout: "full" });
  }
  container.appendChild(wrapper);

  document.body.appendChild(container);

  try {
    const targetSelector = mode === "4in1" ? ".dps-4in1-page" : ".dps-receipt-card";
    const cardEl = (container.querySelector(targetSelector) as HTMLElement) || wrapper;
    if (mode === "4in1") {
      cardEl.style.width = "210mm";
      cardEl.style.maxWidth = "none";
      cardEl.style.height = "297mm";
      cardEl.style.maxHeight = "297mm";
      cardEl.style.border = "none";
      cardEl.style.borderRadius = "0";
      cardEl.style.boxShadow = "none";
    }
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
    pdf.save(`Fee_Receipt_${safeName}_${receiptNumber}.pdf`);
  } catch (err) {
    console.warn("Direct PDF generation fallback to print dialog:", err);
    printDpsReceiptDirect(receiptData, mode);
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

/**
 * Generates an official PDF Blob from FeeDocumentOptions
 */
export async function generateFeeDocumentPdfBlob(
  options: FeeDocumentOptions & { mode?: "4in1" | "full" }
): Promise<{ blob: Blob; filename: string; receiptData: DpsReceiptData }> {
  const receiptData = buildDpsReceiptData(options);
  const safeName = (receiptData.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const receiptNumber = receiptData.receiptNo;
  const mode = options.mode || "full";
  const filename = `${receiptData.receiptTitle?.toLowerCase().includes("due") ? "Fee_Due_Demand_Slip" : "Official_Fee_Receipt"}_${safeName}_${receiptNumber}.pdf`;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = mode === "4in1" ? "794px" : "720px";
  container.style.background = "#ffffff";
  container.style.padding = "0";
  container.style.zIndex = "-1";

  const styleEl = document.createElement("style");
  styleEl.innerHTML = DPS_RECEIPT_CSS;
  container.appendChild(styleEl);

  const wrapper = document.createElement("div");
  if (mode === "4in1") {
    const { generate4in1A4PageHtml } = await import("./feeReceiptUtils");
    wrapper.innerHTML = generate4in1A4PageHtml([
      { data: receiptData, copyTitle: "STUDENT COPY" },
      { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: receiptData, copyTitle: "ACCOUNTS COPY" },
      { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
    ]);
  } else {
    wrapper.innerHTML = generateDpsReceiptHtml(receiptData, { layout: "full" });
  }
  container.appendChild(wrapper);
  document.body.appendChild(container);

  try {
    const targetSelector = mode === "4in1" ? ".dps-4in1-page" : ".dps-receipt-card";
    const cardEl = (container.querySelector(targetSelector) as HTMLElement) || wrapper;
    if (mode === "4in1") {
      cardEl.style.width = "210mm";
      cardEl.style.maxWidth = "none";
      cardEl.style.height = "297mm";
      cardEl.style.maxHeight = "297mm";
      cardEl.style.border = "none";
      cardEl.style.borderRadius = "0";
      cardEl.style.boxShadow = "none";
    }
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
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Shares or sends the official fee receipt / demand due slip directly to WhatsApp.
 * - Downloads / creates the high-definition PDF document
 * - Uses Web Share API (native file share) on mobile devices to send PDF directly
 * - Opens WhatsApp with pre-filled structured message including Date, Time, Paid, Due, and School details
 */
export async function shareFeeReceiptOnWhatsApp(
  options: FeeDocumentOptions & { mode?: "4in1" | "full"; targetPhone?: string; isDueDemand?: boolean }
): Promise<void> {
  const receiptData = buildDpsReceiptData(options);
  const rawPhone = options.targetPhone || options.student?.phone || (options.fee as any).phone || "";
  const digits = rawPhone.replace(/\D/g, "");
  const targetPhone = digits.length === 10 ? `91${digits}` : digits;

  const totalBill = options.fee.amount || Number(options.fee.monthlyAmount || 0);
  const paidAmount = Number(options.fee.paidAmount !== undefined ? options.fee.paidAmount : (options.fee.paid ? totalBill : 0));
  const balanceDue = Number(options.fee.balanceDue !== undefined ? options.fee.balanceDue : Math.max(0, totalBill - paidAmount));

  const isDue = options.isDueDemand || (!options.fee.paid && paidAmount === 0);
  const schoolName = receiptData.schoolName || options.schoolName || "School";

  // Build high-clarity WhatsApp formatted text
  let message = "";
  if (isDue) {
    message = `🏫 *${schoolName.toUpperCase()}*\n` +
      `⚠️ *FEE DUE DEMAND NOTE / बकाया फीस सूचना*\n` +
      `----------------------------------------\n` +
      `👤 *Student Name:* ${receiptData.studentName}\n` +
      `🆔 *Adm No / Roll:* ${receiptData.admissionNo || "—"}\n` +
      `📚 *Class:* ${receiptData.className}\n` +
      `🧾 *Slip No:* ${receiptData.receiptNo}\n` +
      `📅 *Date & Time:* ${receiptData.receiptDate}\n` +
      `----------------------------------------\n` +
      `💰 *Total Outstanding Due (कुल बकाया):* ₹${balanceDue.toLocaleString("en-IN")}\n` +
      (options.fee.arrearsMonths?.length ? `⚠️ *Overdue Months:* ${options.fee.arrearsMonths.join(", ")}\n` : "") +
      `----------------------------------------\n` +
      `📌 *कृपया समय पर फीस स्कूल काउंटर या ऑनलाइन जमा करें।*\n` +
      `📄 *Official DPS Due Slip (PDF) has been generated.*`;
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
      `💰 *Total Payable (कुल शुल्क):* ₹${totalBill.toLocaleString("en-IN")}\n` +
      `✅ *Amount Paid (जमा राशि):* ₹${paidAmount.toLocaleString("en-IN")}\n` +
      `⚠️ *Remaining Balance (शेष बकाया):* ₹${balanceDue.toLocaleString("en-IN")}\n` +
      `----------------------------------------\n` +
      (balanceDue > 0
        ? `📌 *शेष बकाया ₹${balanceDue.toLocaleString("en-IN")} अगले महीने के बिल में जुड़ेगा।*\n`
        : `🎉 *सत्र का यह शुल्क पूर्णतः जमा (Full Paid) हो चुका है।*\n`) +
      `📄 *Official DPS Format PDF Receipt downloaded to your device.*`;
  }

  // Attempt Web Share with real PDF file if browser supports file sharing
  try {
    const { blob, filename } = await generateFeeDocumentPdfBlob(options);
    const pdfFile = new File([blob], filename, { type: "application/pdf" });

    if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        files: [pdfFile],
        title: `${schoolName} Fee Document - ${receiptData.studentName}`,
        text: message,
      });
      return;
    }

    // Trigger local PDF download so admin / parent has the file immediately
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  } catch (pdfErr) {
    console.warn("Could not generate inline PDF for share:", pdfErr);
  }

  // Launch WhatsApp with prefilled message
  const waUrl = targetPhone
    ? `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;

  window.open(waUrl, "_blank");
}
