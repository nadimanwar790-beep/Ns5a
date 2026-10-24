// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getMonthlyFees, getClasses, saveFee, markFeePaid, currentMonthStr
} from "../../school-firebase";
import type { SchoolStudent, SchoolClass, MonthlyFee } from "../../school-types";
import { CheckCircle, Clock, Download, ChevronLeft, ChevronRight, IndianRupee, Users, TrendingUp, AlertCircle, Printer, MessageCircle, ReceiptText } from "lucide-react";
import { downloadFeeDocument } from "./feeDocument";

interface Props {
  schoolId: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  sessionId: string;
  adminId: string;
  onBack?: () => void;
}

export const FeeManager: React.FC<Props> = ({ schoolId, classId, className, schoolName, sessionId, adminId, onBack }) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [month, setMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedDueSlipIds, setSelectedDueSlipIds] = useState<string[]>([]);

  const loadData = async () => {
    setLoading(true);
    const [allStudents, allFeeData, schoolClasses] = await Promise.all([
      getStudents(schoolId, classId),
      getMonthlyFees(schoolId, month, classId),
      getClasses(schoolId, sessionId),
    ]);
    const sts = allStudents.filter(student => !sessionId || student.sessionId === sessionId);
    const feeData = allFeeData.filter(fee => !sessionId || fee.sessionId === sessionId);
    setClassNames(Object.fromEntries(schoolClasses.map((schoolClass: SchoolClass) => [schoolClass.id, schoolClass.name])));
    setStudents(sts);

    // Create fee records for students without one
    const feeMap = new Map(feeData.map(f => [f.studentId, f]));
    const allFees: MonthlyFee[] = sts.map(s => {
      return feeMap.get(s.id) || {
        schoolId, sessionId, studentId: s.id, studentName: s.name,
        rollNo: s.rollNo, classId: s.classId, month,
        amount: s.monthlyFee, paid: false
      };
    });
    setFees(allFees);
    setSelectedReceiptIds([]);
    setSelectedDueSlipIds([]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [month, classId]);

  const handleMarkPaid = async (fee: MonthlyFee) => {
    setSaving(fee.studentId);
    if (!fee.paid) {
      await saveFee({ ...fee, month });
      await markFeePaid(schoolId, fee.studentId, month, adminId);
    } else {
      await saveFee({ ...fee, paid: false, paidDate: undefined, paidBy: undefined, receiptNo: undefined });
    }
    await loadData();
    setSaving(null);
  };

  const handleInitAllFees = async () => {
    setSaving("all");
    for (const fee of fees) {
      const id = `${fee.studentId}_${month}`;
      const existing = fees.find(f => f.studentId === fee.studentId);
      if (!existing?.receiptNo) {
        await saveFee({ ...fee, month });
      }
    }
    await loadData();
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
    return `<article class="receipt">
      <div class="receipt-heading"><div><div class="school-name">${escapeHtml(schoolName || "SCHOOL")}</div><div class="school-subtitle">${escapeHtml(feeClassName)} • ${paid ? "Monthly Fee Receipt" : "Monthly Fee Due Slip"}</div></div><div class="receipt-status ${paid ? "paid" : "due"}">${paid ? "PAID" : "AMOUNT DUE"}</div></div>
      <div class="receipt-number">${paid ? "Receipt No" : "Fee Reference"}: <strong>${escapeHtml(paid ? fee.receiptNo || "—" : `${fee.studentId.slice(-8)}-${fee.month}`)}</strong></div>
      <div class="details">
        <div><span>Student</span><strong>${escapeHtml(fee.studentName)}</strong></div>
        <div><span>Roll No.</span><strong>${escapeHtml(fee.rollNo || "—")}</strong></div>
        <div><span>Class</span><strong>${escapeHtml(feeClassName)}</strong></div>
        <div><span>${paid ? "Fee month" : "Due for"}</span><strong>${escapeHtml(new Date(`${fee.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }))}</strong></div>
        ${paid ? `<div><span>Paid on</span><strong>${escapeHtml(paidDate)}</strong></div>` : ""}
        <div><span>Parent contact</span><strong>${escapeHtml(student?.phone || "—")}</strong></div>
      </div>
      <div class="amount-row"><span>${paid ? "Amount received" : "Amount due"}</span><strong>₹${escapeHtml(Number(fee.amount || 0).toLocaleString("en-IN"))}</strong></div>
      <div class="receipt-footer"><span>${paid ? "Keep this receipt for your records." : "Please return this slip with the fee payment."}</span><span>Parent signature&nbsp;&nbsp;&nbsp; Authorized signature</span></div>
    </article>`;
  };

  const printReceipts = (receiptFees: MonthlyFee[]) => {
    if (!receiptFees.length) return;
    const pages: MonthlyFee[][] = [];
    for (let index = 0; index < receiptFees.length; index += 4) {
      pages.push(receiptFees.slice(index, index + 4));
    }
    const printWindow = window.open("", "_blank", "width=1000,height=750");
    if (!printWindow) {
      alert("Please allow pop-ups to print fee slips.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><meta charset="UTF-8"><title>Monthly Fee Slips</title><style>
      @page{size:A4 portrait;margin:8mm}
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;font-family:Arial,sans-serif;color:#172033}
      .receipt-page{height:281mm;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:5mm;page-break-after:always;break-after:page}
      .receipt-page:last-child{page-break-after:auto;break-after:auto}
      .receipt{border:1px solid #94a3b8;border-radius:5px;padding:8mm;display:flex;flex-direction:column;min-height:0}
      .receipt-heading{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1d4ed8;padding-bottom:4mm}
      .school-name{font-weight:800;font-size:15pt;letter-spacing:.03em}
      .school-subtitle{font-size:9pt;color:#64748b;margin-top:2mm}
      .receipt-status{padding:2mm 4mm;border-radius:4px;font-size:9pt;font-weight:700}
      .receipt-status.paid{background:#dcfce7;color:#15803d}.receipt-status.due{background:#ffedd5;color:#c2410c}
      .receipt-number{font-size:10pt;margin:4mm 0}
      .details{display:grid;grid-template-columns:1fr 1fr;gap:4mm 6mm}
      .details div{display:flex;flex-direction:column;gap:1mm}
      .details span{font-size:8pt;color:#64748b}.details strong{font-size:10pt}
      .amount-row{margin-top:6mm;border-top:1px solid #cbd5e1;border-bottom:1px solid #cbd5e1;padding:4mm 0;display:flex;justify-content:space-between;align-items:center;font-size:11pt}
      .amount-row strong{font-size:18pt;color:#1d4ed8}
      .receipt-footer{margin-top:auto;padding-top:8mm;display:flex;justify-content:space-between;gap:8mm;font-size:8pt;color:#64748b}
      @media screen{body{padding:12px;background:#e2e8f0}.receipt-page{background:white;padding:0;margin:0 auto 12px;max-width:210mm}}
    </style></head><body>
      ${pages.map(page => `<section class="receipt-page">${page.map(getReceiptMarkup).join("")}</section>`).join("")}
      <script>window.onload=()=>setTimeout(()=>{window.print();window.close()},250)</script>
    </body></html>`);
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
    downloadFeeDocument({ fee, student, schoolName, className });
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
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
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
              <button
                onClick={() => printReceipts(paidFees.filter(fee => selectedReceiptIds.includes(fee.studentId)))}
                disabled={!selectedReceiptIds.length}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold flex items-center justify-center gap-2 text-sm"
              >
                <Printer className="w-4 h-4" /> Print selected receipts ({selectedReceiptIds.length})
              </button>
            </div>
          )}
          {!classId && fees.length > 0 && (
            <button
              onClick={() => printReceipts(fees)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="w-4 h-4" /> Print all monthly slips — all classes ({fees.length})
            </button>
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
                <div className="flex-1">
                  <p className="font-medium text-slate-800 dark:text-white text-sm">{fee.studentName}</p>
                  <p className="text-xs text-slate-400">₹{fee.amount}{fee.paidDate ? ` • Paid ${new Date(fee.paidDate).toLocaleDateString()}` : ""}{fee.receiptNo ? ` • ${fee.receiptNo}` : ""}</p>
                </div>
                {fee.paid ? (
                  <button
                    onClick={() => sendReceiptOnWhatsApp(fee)}
                    className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300"
                    title={`WhatsApp receipt to ${students.find(student => student.id === fee.studentId)?.phone || "parent number"}`}
                    aria-label={`Send ${fee.studentName} receipt on WhatsApp`}
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
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
                <button
                  onClick={() => handleMarkPaid(fee)}
                  disabled={saving === fee.studentId}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${fee.paid ? "bg-green-100 text-green-700 dark:bg-green-900/40" : "bg-orange-100 text-orange-700 dark:bg-orange-900/40"}`}>
                  {saving === fee.studentId ? "..." : fee.paid ? <><CheckCircle className="w-3.5 h-3.5" /> Paid</> : <><Clock className="w-3.5 h-3.5" /> Unpaid</>}
                </button>
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
    </div>
  );
};
