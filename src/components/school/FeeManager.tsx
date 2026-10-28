// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getMonthlyFees, getClasses, saveFee, markFeePaid, currentMonthStr, getSchoolFeeHistory
} from "../../school-firebase";
import type { SchoolStudent, SchoolClass, MonthlyFee, School, SchoolDocumentPrintFields } from "../../school-types";
import { schoolPrintFieldEnabled } from "../../school-types";
import { CheckCircle, Clock, Download, ChevronLeft, ChevronRight, IndianRupee, Users, TrendingUp, AlertCircle, Printer, MessageCircle, ReceiptText, Building2, Sparkles } from "lucide-react";
import { downloadFeeDocument } from "./feeDocument";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import {
  generateDpsReceiptHtml,
  generate4in1A4PageHtml,
  printDpsReceipts4in1,
  printDpsReceiptDirect,
  DPS_RECEIPT_CSS,
  type DpsReceiptData,
  type FeeReceiptItem
} from "./feeReceiptUtils";

interface Props {
  schoolId: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  school?: School;
  sessionId: string;
  adminId: string;
  onBack?: () => void;
}

export const FeeManager: React.FC<Props> = ({ schoolId, classId, className, schoolName, school, sessionId, adminId, onBack }) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedDueSlipIds, setSelectedDueSlipIds] = useState<string[]>([]);
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SchoolStudent | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");
  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails>({
    schoolName: school?.name || schoolName || "School",
    tagline: school?.tagline || "",
    affiliation: school?.affiliation || "",
    address: school?.address || "",
    phone: school?.mobile || school?.phone || "",
    email: school?.email || "",
    logoUrl: school?.logoUrl || "",
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
    if (!school) return;
    setSchoolDetails(previous => ({
      ...previous,
      schoolName: school.name || "",
      tagline: school.tagline || "",
      affiliation: school.affiliation || "",
      address: school.address || "",
      phone: school.mobile || school.phone || "",
      email: school.email || "",
      logoUrl: school.logoUrl || "",
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

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setFeeError(null);
    const [allStudents, allFeeData, schoolClasses, feeHistory] = await Promise.all([
      getStudents(schoolId, classId),
      getMonthlyFees(schoolId, month, classId),
      getClasses(schoolId, sessionId),
      getSchoolFeeHistory(schoolId),
    ]);
    const sts = allStudents.filter(student => !sessionId || student.sessionId === sessionId);
    const feeData = allFeeData.filter(fee =>
      !sessionId || !fee.sessionId || fee.sessionId === sessionId
    );
    // Unpaid fee balances belong to the student and carry across academic sessions.
    const history = feeHistory;
    setClassNames(Object.fromEntries(schoolClasses.map((schoolClass: SchoolClass) => [schoolClass.id, schoolClass.name])));
    setStudents(sts);

    // Create fee records for students without one
    const feeMap = new Map(feeData.map(f => [f.studentId, f]));
    const allFees: MonthlyFee[] = sts.map(student => {
      const existing = feeMap.get(student.id);
      const previousFees = history
        .filter(fee => fee.studentId === student.id && fee.month < month)
        .sort((a, b) => a.month.localeCompare(b.month));
      const latestCumulative = [...previousFees].reverse().find(fee =>
        fee.monthlyAmount !== undefined || fee.arrearsAmount !== undefined || fee.arrearsMonths !== undefined
      );
      const unpaidLegacyFees = previousFees.filter(fee =>
        !fee.paid &&
        (latestCumulative ? fee.month > latestCumulative.month : true)
      );
      const arrearsAmount =
        (latestCumulative && !latestCumulative.paid
          ? Number(latestCumulative.amount || 0)
          : 0) +
        unpaidLegacyFees.reduce((sum, fee) => sum + Number(fee.amount || 0), 0);
      const arrearsMonths = Array.from(new Set([
        ...(latestCumulative && !latestCumulative.paid
          ? [...(latestCumulative.arrearsMonths || []), latestCumulative.month]
          : []),
        ...unpaidLegacyFees.map(fee => fee.month),
      ])).sort();
      const monthlyAmount = Number(
        existing?.monthlyAmount ?? existing?.amount ?? student.monthlyFee ?? 0
      );

      return {
        ...(existing || {}),
        schoolId,
        sessionId: student.sessionId || sessionId,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classId: student.classId,
        month,
        monthlyAmount,
        arrearsAmount: existing?.paid ? Number(existing.arrearsAmount || 0) : arrearsAmount,
        arrearsMonths: existing?.paid ? (existing.arrearsMonths || []) : arrearsMonths,
        amount: existing?.paid ? Number(existing.amount || monthlyAmount) : monthlyAmount + arrearsAmount,
        paid: Boolean(existing?.paid),
      } as MonthlyFee;
    });
    const currentMonth = currentMonthStr();
    if (month <= currentMonth) {
      const newBills = allFees.filter(fee => {
        if (fee.paid) return false;
        const stored = feeMap.get(fee.studentId);
        if (!stored) return true;
        if (month !== currentMonth) return false;

        const storedMonths = [...(stored.arrearsMonths || [])].sort();
        const calculatedMonths = [...(fee.arrearsMonths || [])].sort();
        return (
          Number(stored.amount || 0) !== Number(fee.amount || 0) ||
          Number(stored.monthlyAmount ?? 0) !== Number(fee.monthlyAmount ?? 0) ||
          Number(stored.arrearsAmount ?? 0) !== Number(fee.arrearsAmount ?? 0) ||
          JSON.stringify(storedMonths) !== JSON.stringify(calculatedMonths)
        );
      });
      try {
        await Promise.all(newBills.map(fee => saveFee(fee)));
      } catch (error) {
        console.error("Could not persist monthly fee dues:", error);
        setFeeError("Monthly dues were calculated, but could not be saved. Please retry before moving to another month.");
      }
    }
    setFees(allFees);
    if (!isSilent) {
      setSelectedReceiptIds([]);
      setSelectedDueSlipIds([]);
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [month, classId]);

  const setFeeStatus = async (fee: MonthlyFee, paid: boolean) => {
    if (fee.paid === paid) return;
    setSaving(fee.studentId);
    setFeeError(null);

    // Optimistic UI update: instantly update local state without delay or screen refresh
    const receiptNo = paid ? (fee.receiptNo || `RCP-${Date.now()}`) : undefined;
    const paidDate = paid ? new Date().toISOString() : undefined;
    const paidBy = paid ? adminId : undefined;

    setFees(prev =>
      prev.map(f =>
        f.studentId === fee.studentId
          ? {
              ...f,
              paid,
              receiptNo,
              paidDate,
              paidBy,
            }
          : f
      )
    );

    try {
      if (paid) {
        await saveFee({
          ...fee,
          month,
          paid: true,
          paidDate,
          paidBy,
          receiptNo,
        });
        await markFeePaid(schoolId, fee.studentId, month, adminId);
      } else {
        const unpaidRecord = {
          ...fee,
          month,
          paid: false,
          paidDate: undefined,
          paidBy: undefined,
          receiptNo: undefined,
        };
        await saveFee(unpaidRecord);
      }
      // Re-sync silently in background without screen flicker or unmounting
      await loadData(true);
    } catch (error) {
      console.error(`Could not mark fee ${paid ? "paid" : "unpaid"}:`, error);
      setFeeError(`Could not mark ${fee.studentName}'s fee ${paid ? "paid" : "unpaid"}. Please retry.`);
      // Rollback on failure
      await loadData(true);
    } finally {
      setSaving(null);
    }
  };

  const handleInitAllFees = async () => {
    setSaving("all");
    for (const fee of fees) {
      const existing = fees.find(f => f.studentId === fee.studentId);
      if (!existing?.receiptNo) {
        await saveFee({ ...fee, month });
      }
    }
    await loadData(true);
    setSaving(null);
  };

  const changeMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const paidFees = fees.filter(f => f.paid);
  const unpaidFees = fees.filter(f => !f.paid);
  const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const collectedAmount = paidFees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const pendingAmount = totalAmount - collectedAmount;

  const toggleReceiptSelection = (studentId: string) => {
    setSelectedReceiptIds(current => current.includes(studentId)
      ? current.filter(id => id !== studentId)
      : [...current, studentId]);
  };

  const getReceiptMarkup = (fee: MonthlyFee) => {
    const paid = Boolean(fee.paid);
    const escapeHtml = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char] as string));
    const student = students.find(item => item.id === fee.studentId);
    const feeClassName = className && className !== "All Classes"
      ? className
      : classNames[fee.classId] || fee.classId || "—";
    const paidDate = fee.paidDate ? new Date(fee.paidDate).toLocaleDateString("en-IN") : "—";
    const showSchoolField = (field: Parameters<typeof schoolPrintFieldEnabled>[2]) =>
      schoolPrintFieldEnabled(schoolDetails.documentPrintFields as SchoolDocumentPrintFields, "feeReceipt", field);
    const schoolHeader = showSchoolField("schoolName") && schoolDetails.schoolName
      ? `<div class="school-name">${escapeHtml(schoolDetails.schoolName)}</div>`
      : "";
    const schoolMeta = [
      showSchoolField("address") && schoolDetails.address ? `Address: ${schoolDetails.address}` : "",
      showSchoolField("phone") && schoolDetails.phone ? `School mobile: ${schoolDetails.phone}` : "",
      showSchoolField("email") && schoolDetails.email ? `Email: ${schoolDetails.email}` : "",
      showSchoolField("principalName") && schoolDetails.principalName ? `Principal: ${schoolDetails.principalName}` : "",
      showSchoolField("principalPhone") && schoolDetails.principalPhone ? `Principal mobile: ${schoolDetails.principalPhone}` : "",
      showSchoolField("directorName") && schoolDetails.directorName ? `Director: ${schoolDetails.directorName}` : "",
      showSchoolField("directorPhone") && schoolDetails.directorPhone ? `Director mobile: ${schoolDetails.directorPhone}` : "",
      showSchoolField("affiliation") && schoolDetails.affiliation ? schoolDetails.affiliation : "",
      showSchoolField("code") && schoolDetails.code ? `School code: ${schoolDetails.code}` : "",
      ...(showSchoolField("customFields") ? (schoolDetails.customFields || [])
        .filter(field => field.label?.trim() && field.value?.trim())
        .map(field => `${field.label}: ${field.value}`) : []),
    ].filter(Boolean).map(value => `<div>${escapeHtml(value)}</div>`).join("");
    return `<article class="receipt">
      <div class="receipt-heading">
        <div class="school-heading-box">
          ${schoolHeader}
          <div class="school-subtitle">${escapeHtml(feeClassName)} • ${paid ? "Monthly Fee Receipt" : "Monthly Fee Due Slip"}</div>
        </div>
        <div class="receipt-status ${paid ? "paid" : "due"}">${paid ? "✓ PAID" : "AMOUNT DUE"}</div>
      </div>
      ${schoolMeta ? `<div class="school-meta">${schoolMeta}</div>` : ""}
      <div class="receipt-number">
        <span>${paid ? "Receipt No" : "Fee Ref"}: <strong>${escapeHtml(paid ? fee.receiptNo || "—" : `${fee.studentId.slice(-8)}-${fee.month}`)}</strong></span>
        <span>Month: <strong>${escapeHtml(new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" }))}</strong></span>
      </div>
      <div class="details">
        <div><span>Student</span><strong>${escapeHtml(fee.studentName)}</strong></div>
        <div><span>Roll No</span><strong>${escapeHtml(fee.rollNo || "—")}</strong></div>
        <div><span>Class</span><strong>${escapeHtml(feeClassName)}</strong></div>
        <div><span>Contact</span><strong>${escapeHtml(student?.phone || "—")}</strong></div>
        ${paid ? `<div><span>Paid on</span><strong>${escapeHtml(paidDate)}</strong></div>` : ""}
        <div><span>Base Fee</span><strong>₹${escapeHtml(Number(fee.monthlyAmount ?? fee.amount ?? 0).toLocaleString("en-IN"))}</strong></div>
        ${Number(fee.arrearsAmount || 0) > 0 ? `<div><span>Back Due</span><strong style="color:#c2410c">₹${escapeHtml(Number(fee.arrearsAmount).toLocaleString("en-IN"))}</strong></div>` : ""}
        ${fee.arrearsMonths?.length ? `<div style="grid-column:span 2"><span>Unpaid Months</span><strong>${escapeHtml(fee.arrearsMonths.map(value => new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })).join(", "))}</strong></div>` : ""}
      </div>
      <div class="amount-row">
        <span>Total Payable / Received</span>
        <strong>₹${escapeHtml(Number(fee.amount || 0).toLocaleString("en-IN"))}</strong>
      </div>
      <div class="receipt-footer">
        <span>${paid ? "Thank you. Keep this slip." : "Please pay dues on time."}</span>
        <span class="sig" style="display:inline-flex; flex-direction:column; align-items:flex-end;">
          ${schoolDetails.principalSignatureUrl ? `<img src="${schoolDetails.principalSignatureUrl}" style="height:15px; max-width:65px; object-fit:contain; margin-bottom:2px;" alt="Principal Sign" />` : ""}
          <span>Parent Sign &nbsp;|&nbsp; ${schoolDetails.principalName ? escapeHtml(schoolDetails.principalName) : "Auth. Sign"}</span>
        </span>
      </div>
    </article>`;
  };

  const printReceipts = (receiptFees: MonthlyFee[], layoutMode: "4in1" | "full" = "4in1") => {
    // 4 receipts per A4 sheet (standard Indian format)
    printDpsReceipts(receiptFees, layoutMode);
  };

  const getDpsDataForFee = (fee: MonthlyFee): DpsReceiptData => {
    const student = students.find(item => item.id === fee.studentId);
    const feeClassName = className && className !== "All Classes"
      ? className
      : classNames[fee.classId] || fee.classId || "—";
    const paidDate = fee.paidDate
      ? new Date(fee.paidDate).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN");

    const baseFee = Number(fee.monthlyAmount ?? fee.amount ?? 0) || 0;
    const arrears = Number(fee.arrearsAmount || 0);

    const items: FeeReceiptItem[] = [
      { id: "1", slNo: 1, description: "Tuition Fee", due: baseFee, con: 0, paid: baseFee }
    ];
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

    const d = new Date(`${fee.month}-01T00:00:00`);
    const monthName = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase();

    return {
      schoolName: schoolDetails.schoolName || school?.name || "Delhi Public School",
      schoolAddress: schoolDetails.address || school?.address || "Site No.1, Sector-45, Urban Estate, Gurgaon, Haryana",
      schoolLogoUrl: schoolDetails.logoUrl || school?.logoUrl,
      schoolPhone: schoolDetails.phone || school?.phone || school?.mobile,
      schoolEmail: schoolDetails.email || school?.email,
      schoolAffiliation: schoolDetails.affiliation || school?.affiliation,
      receiptNo: fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000)),
      admissionNo: student?.admissionNo || fee.rollNo || "140516",
      studentName: fee.studentName,
      studentPhotoUrl: student?.photoUrl || (student as any)?.photo || "",
      installment: monthName,
      receiptDate: paidDate,
      session: "2026-2027",
      className: feeClassName,
      counterNo: "DPS-RECEIPT",
      items,
      payModeInfo: {
        payMode: "Cash / Counter",
        date: paidDate,
        bank: "CASH COUNTER",
        number: fee.receiptNo || "—",
      },
      note: fee.note || String(Math.floor(100 + Math.random() * 900)),
      showDigitalSignature: Boolean(schoolDetails.principalSignatureUrl),
      principalSignatureUrl: schoolDetails.principalSignatureUrl,
      principalName: schoolDetails.principalName || "Principal",
      principalTitle: "Principal / Authorized Signatory",
    };
  };

  const printDpsReceipts = (receiptFees: MonthlyFee[], layoutMode: "4in1" | "full" = "4in1") => {
    if (!receiptFees.length) return;
    const dpsList = receiptFees.map(f => getDpsDataForFee(f));

    if (layoutMode === "4in1") {
      printDpsReceipts4in1(dpsList);
      return;
    }

    const printWindow = window.open("", "_blank", "width=850,height=900");
    if (!printWindow) {
      alert("Please allow pop-ups to print official fee receipts.");
      return;
    }
    const markup = `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Official Fee Receipts (DPS Format)</title>
          <style>
            ${DPS_RECEIPT_CSS}
            .dps-page-container {
              page-break-after: always;
              break-after: page;
              padding: 10px 0;
            }
            .dps-page-container:last-child {
              page-break-after: auto;
              break-after: auto;
            }
          </style>
        </head>
        <body>
          ${dpsList.map(data => `
            <div class="dps-page-container">
              ${generateDpsReceiptHtml(data, { layout: "full" })}
            </div>
          `).join("")}
          <script>
            window.onload = () => setTimeout(() => { window.print(); window.close(); }, 250);
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(markup);
    printWindow.document.close();
  };

  const sendReceiptOnWhatsApp = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    const rawPhone = student?.phone?.trim() || "";
    const digits = rawPhone.replace(/\D/g, "");
    if (!digits) {
      alert(`Parent/guardian phone number is missing for ${fee.studentName}.`);
      return;
    }
    const whatsappNumber = digits.length === 10
      ? `91${digits}`
      : digits.length === 11 && digits.startsWith("0")
        ? `91${digits.slice(1)}`
        : digits;
    const monthLabel = new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const message = [
      `Fee payment receipt — ${className || "School"}`,
      `Student: ${fee.studentName}`,
      `Roll No: ${fee.rollNo || "—"}`,
      `Month: ${monthLabel}`,
      `Amount received: ₹${Number(fee.amount || 0).toLocaleString("en-IN")}`,
      `Receipt No: ${fee.receiptNo || "—"}`,
      `Paid on: ${fee.paidDate ? new Date(fee.paidDate).toLocaleDateString("en-IN") : "—"}`,
    ].join("\n");
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const sendDueSlipOnWhatsApp = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    const digits = (student?.phone || "").replace(/\D/g, "");
    if (!digits) {
      alert(`Parent/guardian phone number is missing for ${fee.studentName}.`);
      return;
    }
    const whatsappNumber = digits.length === 10
      ? `91${digits}`
      : digits.length === 11 && digits.startsWith("0")
        ? `91${digits.slice(1)}`
        : digits;
    const monthLabel = new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const message = [
      `Fee due reminder — ${schoolName || className || "School"}`,
      `Student: ${fee.studentName}`,
      `Roll No: ${fee.rollNo || "—"}`,
      `Class: ${className || fee.classId || "—"}`,
      `Fee month: ${monthLabel}`,
      `Amount due: ₹${Number(fee.amount || 0).toLocaleString("en-IN")}`,
      "Please contact the school office to pay this fee.",
    ].join("\n");
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  const downloadFeeFile = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    downloadFeeDocument({ fee, student, schoolName, className, schoolDetails });
  };

  const downloadFeeReport = () => {
    const rows = fees.map(f =>
      `<tr style="background:${f.paid ? "#f0fdf4" : "#fff7ed"}">
        <td>${f.rollNo}</td>
        <td>${f.studentName}</td>
        <td>₹${f.amount}</td>
        <td><span style="color:${f.paid ? "green" : "red"};font-weight:bold">${f.paid ? "✓ PAID" : "✗ UNPAID"}</span></td>
        <td>${f.paidDate ? new Date(f.paidDate).toLocaleDateString() : "-"}</td>
        <td>${f.receiptNo || "-"}</td>
      </tr>`
    ).join("");

    const html = `<html><head><meta charset="UTF-8"><title>Fee Report</title>
<style>body{font-family:Arial,sans-serif;padding:24px}h1{color:#1e293b}
.summary{display:flex;gap:24px;margin:16px 0}
.card{background:#f1f5f9;border-radius:8px;padding:12px 20px;text-align:center;flex:1}
.card h3{margin:0;font-size:22px;color:#1e293b}.card p{margin:4px 0;color:#64748b;font-size:12px}
table{width:100%;border-collapse:collapse;margin-top:16px}
th{background:#1e293b;color:white;padding:10px;text-align:left}
td{padding:8px 10px;border-bottom:1px solid #e2e8f0}</style></head>
<body>
<h1>💰 Fee Collection Report</h1>
<p><strong>Class:</strong> ${className || classId} &nbsp;|&nbsp; <strong>Month:</strong> ${month} &nbsp;|&nbsp; <strong>Generated:</strong> ${new Date().toLocaleString()}</p>
<div class="summary">
<div class="card"><h3>₹${totalAmount}</h3><p>Total Expected</p></div>
<div class="card" style="background:#dcfce7"><h3>₹${collectedAmount}</h3><p>Collected</p></div>
<div class="card" style="background:#fee2e2"><h3>₹${pendingAmount}</h3><p>Pending</p></div>
<div class="card"><h3>${paidFees.length}/${fees.length}</h3><p>Students Paid</p></div>
</div>
<table><thead><tr><th>Roll No</th><th>Student Name</th><th>Fee Amount</th><th>Status</th><th>Paid Date</th><th>Receipt No</th></tr></thead>
<tbody>${rows}</tbody></table>
<p style="margin-top:24px;color:#94a3b8;font-size:12px">Generated by IIC×NSTA Smart School System</p>
</body></html>`;

    const blob = new Blob([html], { type: "multipart/related" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Fee_Report_${className || classId}_${month}.mhtml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button>}
        <div className="flex-1">
          <h2 className="font-bold text-slate-800 dark:text-white">{className || "All Classes"} — Fee Management</h2>
          <p className="text-xs text-slate-500">{students.length} students</p>
        </div>
        <button
          onClick={() => setShowSchoolHeaderModal(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Building2 className="h-4 w-4" /> Receipt Details
        </button>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {feeError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{feeError}</div>}
        {/* Month selector */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronLeft className="w-4 h-4" /></button>
          <span className="flex-1 text-center font-bold text-slate-800 dark:text-white">
            {new Date(month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
          </span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500">Collected</span>
            </div>
            <p className="text-xl font-bold text-green-600">₹{collectedAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{paidFees.length} students paid</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-slate-500">Pending</span>
            </div>
            <p className="text-xl font-bold text-orange-500">₹{pendingAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-400">{unpaidFees.length} students pending</p>
          </div>
        </div>

        {/* Collection bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-600 dark:text-slate-300">Collection Progress</span>
            <span className="font-bold text-slate-800 dark:text-white">{totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0}%</span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">₹{collectedAmount.toLocaleString()} of ₹{totalAmount.toLocaleString()}</p>
        </div>

        {/* Student fee list */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : (
          <>
          {unpaidFees.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><ReceiptText className="w-4 h-4 text-orange-600" /> Unpaid fee due slips</p>
                  <p className="text-xs text-slate-500 mt-1">Print take-home slips for students. A4 par 4 slips per page.</p>
                </div>
                <button
                  onClick={() => setSelectedDueSlipIds(selectedDueSlipIds.length === unpaidFees.length ? [] : unpaidFees.map(fee => fee.studentId))}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {selectedDueSlipIds.length === unpaidFees.length ? "Deselect all" : "Select all unpaid"}
                </button>
              </div>
              <button
                onClick={() => printReceipts(unpaidFees.filter(fee => selectedDueSlipIds.includes(fee.studentId)))}
                disabled={!selectedDueSlipIds.length}
                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" /> Print selected due slips ({selectedDueSlipIds.length})
              </button>
            </div>
          )}
          {paidFees.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><ReceiptText className="w-4 h-4 text-blue-600" /> Fee receipts</p>
                  <p className="text-xs text-slate-500 mt-1">A4 par 4 receipts per page. WhatsApp kholkar message bhej sakte hain.</p>
                </div>
                <button
                  onClick={() => setSelectedReceiptIds(selectedReceiptIds.length === paidFees.length ? [] : paidFees.map(fee => fee.studentId))}
                  className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200"
                >
                  {selectedReceiptIds.length === paidFees.length ? "Deselect all" : "Select all paid"}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => printDpsReceipts(paidFees.filter(fee => selectedReceiptIds.includes(fee.studentId)), "4in1")}
                  disabled={!selectedReceiptIds.length}
                  className="flex-1 py-2.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-xs shadow-md shadow-blue-900/30 active:scale-95 transition cursor-pointer"
                  title="Ek A4 paper par 4 receipts print karein"
                >
                  <Printer className="w-4 h-4 text-amber-300" />
                  <span>📑 Print 4-in-1 A4 Receipts ({selectedReceiptIds.length})</span>
                </button>
                <button
                  onClick={() => printDpsReceipts(paidFees.filter(fee => selectedReceiptIds.includes(fee.studentId)), "full")}
                  disabled={!selectedReceiptIds.length}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition cursor-pointer"
                  title="Print 1 receipt per full A4 page"
                >
                  <span>📄 Full A4</span>
                </button>
              </div>
            </div>
          )}
          {!classId && fees.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => printDpsReceipts(fees.filter(f => f.paid), "4in1")}
                className="flex-1 py-3 bg-gradient-to-r from-indigo-700 to-blue-700 hover:from-indigo-600 hover:to-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm text-xs cursor-pointer"
                title="Ek A4 paper par 4 receipts print karein"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>📑 Print All 4-in-1 A4 Receipts ({fees.filter(f => f.paid).length} Paid)</span>
              </button>
              <button
                onClick={() => printDpsReceipts(fees.filter(f => f.paid), "full")}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition cursor-pointer"
                title="Print 1 receipt per full A4 page"
              >
                <span>📄 Full A4</span>
              </button>
            </div>
          )}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
            {fees.map(fee => (
              <div key={fee.studentId} className={`flex items-center gap-3 px-4 py-3 border-b dark:border-slate-700 last:border-0 ${fee.paid ? "bg-green-50/50 dark:bg-green-900/10" : ""}`}>
                {fee.paid && (
                  <input
                    aria-label={`Select ${fee.studentName} receipt`}
                    type="checkbox"
                    checked={selectedReceiptIds.includes(fee.studentId)}
                    onChange={() => toggleReceiptSelection(fee.studentId)}
                    className="h-4 w-4 accent-blue-600"
                  />
                )}
                {!fee.paid && (
                  <input
                    aria-label={`Select ${fee.studentName} unpaid fee slip`}
                    type="checkbox"
                    checked={selectedDueSlipIds.includes(fee.studentId)}
                    onChange={() => setSelectedDueSlipIds(current => current.includes(fee.studentId)
                      ? current.filter(id => id !== fee.studentId)
                      : [...current, fee.studentId])}
                    className="h-4 w-4 accent-orange-600"
                  />
                )}
                <span className="text-xs text-slate-400 w-8">{fee.rollNo}</span>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      const fullStudent = students.find(s => s.id === fee.studentId) || {
                        id: fee.studentId,
                        name: fee.studentName,
                        rollNo: fee.rollNo,
                        classId: fee.classId,
                        monthlyFee: fee.monthlyAmount || fee.amount || 0,
                      } as any;
                      setSelectedStudentForModal(fullStudent);
                      setModalInitialTab("fees");
                    }}
                    className="group text-left font-bold text-slate-800 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5 transition-colors"
                    title="Click student name to view ID Card, Fee Details & Attendance"
                  >
                    <span className="underline decoration-dotted decoration-slate-300 group-hover:decoration-blue-500">{fee.studentName}</span>
                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-1.5 py-0.2 rounded font-semibold opacity-70 group-hover:opacity-100">
                      Options
                    </span>
                  </button>
                  <p className="text-xs text-slate-400">
                    Fee ₹{Number(fee.monthlyAmount ?? fee.amount ?? 0).toLocaleString("en-IN")}
                    {Number(fee.arrearsAmount || 0) > 0 ? ` + Back due ₹${Number(fee.arrearsAmount).toLocaleString("en-IN")}` : ""}
                    {` = ₹${Number(fee.amount || 0).toLocaleString("en-IN")}`}
                    {fee.paidDate ? ` • Paid ${new Date(fee.paidDate).toLocaleDateString()}` : ""}
                    {fee.receiptNo ? ` • ${fee.receiptNo}` : ""}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFeeStatus(fee, true)}
                      disabled={saving === fee.studentId}
                      aria-pressed={fee.paid}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                        fee.paid
                          ? "bg-green-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {saving === fee.studentId ? "..." : "Paid"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeeStatus(fee, false)}
                      disabled={saving === fee.studentId}
                      aria-pressed={!fee.paid}
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors disabled:opacity-50 ${
                        !fee.paid
                          ? "bg-orange-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {saving === fee.studentId ? "..." : "Unpaid"}
                    </button>
                  </div>
                </div>
                {fee.paid ? (
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <button
                      onClick={() => setDpsReceiptFee(fee)}
                      className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
                      title="Open Official DPS-Format Fee Receipt"
                    >
                      <ReceiptText className="w-3.5 h-3.5 text-amber-300" />
                      <span>DPS Receipt</span>
                    </button>
                    <button
                      onClick={() => printDpsReceipts([fee], "4in1")}
                      className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition"
                      title="Direct Print 4-in-1 A4 (Student, School, Accounts, Parent Copy)"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => sendReceiptOnWhatsApp(fee)}
                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition"
                      title={`WhatsApp receipt to ${students.find(student => student.id === fee.studentId)?.phone || "parent number"}`}
                      aria-label={`Send ${fee.studentName} receipt on WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => printReceipts([fee])}
                      className="p-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300"
                      title={`Print ${fee.studentName} unpaid fee due slip`}
                      aria-label={`Print ${fee.studentName} unpaid fee due slip`}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => sendDueSlipOnWhatsApp(fee)}
                      className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                      title={`WhatsApp fee reminder to ${students.find(student => student.id === fee.studentId)?.phone || "parent number"}`}
                      aria-label={`Send ${fee.studentName} fee reminder on WhatsApp`}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => downloadFeeFile(fee)}
                      className="p-2 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300"
                      title={`Download ${fee.studentName} fee due slip`}
                      aria-label={`Download ${fee.studentName} unpaid fee slip`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
            {fees.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No students found</p>
              </div>
            )}
          </div>
          </>
        )}

        <button onClick={downloadFeeReport}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md">
          <Download className="w-5 h-5" /> Download Fee Report (MHTML)
        </button>
      </div>
      <SchoolHeaderEditorModal
        isOpen={showSchoolHeaderModal}
        onClose={() => setShowSchoolHeaderModal(false)}
        school={school}
        schoolId={schoolId}
        currentDetails={schoolDetails}
        onApply={setSchoolDetails}
        title="School Details for Fee Receipt"
        subtitle="School ke contacts aur receipt par dikhne wali details set karein"
      />
      <StudentQuickActionModal
        isOpen={Boolean(selectedStudentForModal)}
        onClose={() => setSelectedStudentForModal(null)}
        student={selectedStudentForModal}
        school={school}
        classes={[]}
        currentMonth={month}
        adminUid={adminId}
        initialTab={modalInitialTab}
        onFeeUpdated={() => loadData(true)}
      />
      {dpsReceiptFee && (
        <OfficialFeeReceiptModal
          isOpen={Boolean(dpsReceiptFee)}
          onClose={() => setDpsReceiptFee(null)}
          school={school || {
            id: schoolId,
            name: schoolDetails.schoolName,
            address: schoolDetails.address,
            logoUrl: schoolDetails.logoUrl,
            phone: schoolDetails.phone,
            email: schoolDetails.email,
            principalName: schoolDetails.principalName,
            principalSignatureUrl: schoolDetails.principalSignatureUrl,
          } as any}
          fee={dpsReceiptFee}
          student={students.find(s => s.id === dpsReceiptFee.studentId)}
          className={className && className !== "All Classes" ? className : (classNames[dpsReceiptFee.classId] || "Class 6-B")}
          sessionName="2026-2027"
        />
      )}
    </div>
  );
};
