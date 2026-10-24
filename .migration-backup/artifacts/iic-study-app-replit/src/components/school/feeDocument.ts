import { jsPDF } from "jspdf";
import type { MonthlyFee, SchoolStudent } from "../../school-types";

interface FeeDocumentOptions {
  fee: MonthlyFee;
  student?: Pick<SchoolStudent, "phone" | "fatherName"> | null;
  schoolName?: string;
  className?: string;
}

export function downloadFeeDocument({
  fee,
  student,
  schoolName,
  className,
}: FeeDocumentOptions) {
  const paid = Boolean(fee.paid);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const monthLabel = new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
  const amount = `Rs. ${Number(fee.amount || 0).toLocaleString("en-IN")}`;
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(29, 78, 216);
  doc.rect(0, 0, pageWidth, 48, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(schoolName || "SCHOOL", 18, 20, { maxWidth: pageWidth - 36 });
  doc.setFontSize(11);
  doc.text(paid ? "FEE PAYMENT RECEIPT" : "FEE DUE SLIP", 18, 31);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(className || "School Fee", 18, 40);

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(paid ? "PAYMENT RECEIVED" : "PAYMENT DUE", 18, 64);
  doc.setDrawColor(203, 213, 225);
  doc.line(18, 70, pageWidth - 18, 70);

  const details: Array<[string, string]> = [
    ["Student name", fee.studentName || "—"],
    ["Roll number", fee.rollNo || "—"],
    ["Class", className || fee.classId || "—"],
    ["Fee month", monthLabel],
    [paid ? "Receipt number" : "Fee reference", paid ? fee.receiptNo || "—" : `${fee.studentId.slice(-8)}-${fee.month}`],
    ["Parent / guardian", student?.fatherName || "—"],
    ["Parent contact", student?.phone || "—"],
  ];
  if (paid) {
    details.push([
      "Paid on",
      fee.paidDate ? new Date(fee.paidDate).toLocaleDateString("en-IN") : "—",
    ]);
  }

  let y = 86;
  doc.setFontSize(10);
  for (const [label, value] of details) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, 18, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(value, pageWidth - 18, y, { align: "right", maxWidth: 110 });
    doc.setDrawColor(226, 232, 240);
    doc.line(18, y + 4, pageWidth - 18, y + 4);
    y += 15;
  }

  doc.setFillColor(paid ? 240 : 255, paid ? 253 : 247, paid ? 244 : 237);
  doc.roundedRect(18, y + 5, pageWidth - 36, 32, 3, 3, "F");
  doc.setTextColor(71, 85, 105);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(paid ? "Amount received" : "Amount due", 25, y + 18);
  doc.setTextColor(paid ? 22 : 194, paid ? 101 : 65, paid ? 52 : 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(amount, pageWidth - 25, y + 25, { align: "right" });

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    paid ? "Thank you. Please keep this receipt for your records." : "Please contact the school office to pay this fee.",
    18,
    270,
    { maxWidth: pageWidth - 36 },
  );

  const safeName = (fee.studentName || "student").replace(/[^a-z0-9-_]+/gi, "_");
  const safeMonth = fee.month.replace(/[^0-9-]/g, "");
  doc.save(`${paid ? "Fee_Receipt" : "Fee_Due_Slip"}_${safeName}_${safeMonth}.pdf`);
}
