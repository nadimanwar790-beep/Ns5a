// @ts-nocheck
import React, { useState, useRef } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { renderHtmlToCanvasSafe } from "../../utils/safePdfCapture";
import {
  X,
  Printer,
  Download,
  MessageCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
  FileText,
  AlertTriangle,
  QrCode as QrIcon,
} from "lucide-react";
import type { School, SchoolStudent } from "../../school-types";
import {
  getSavedSchoolLogo,
  numberToIndianWords,
  formatAcademicSession,
} from "./feeReceiptUtils";
import { printHtmlInIframe } from "./AdmissionFormPrintModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  student: SchoolStudent;
  className?: string;
  sessionName?: string;
  allFees: any[];
  feeSummary: {
    totalBilled: number;
    totalDeposited: number;
    totalRemaining: number;
  };
  isStudentView?: boolean;
}

export const AnnualBulkFeeStatementModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  student,
  className = "Nursery",
  sessionName = "2026-2027",
  allFees = [],
  feeSummary,
  isStudentView = false,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const printSheetRef = useRef<HTMLDivElement | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(() => (isStudentView ? 0.5 : 1));

  if (!isOpen) return null;

  const schoolLogo = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const resolvedSchoolName = school?.name || "School";
  const resolvedAddress = school?.address || "Campus Address, Educational Zone";
  const resolvedPhone = school?.mobile || school?.phone || "—";
  const resolvedEmail = school?.email || "—";
  const resolvedAffiliation = school?.affiliation || "";
  const resolvedCode = school?.code || "";

  const studentName = student?.name || "Student";
  const admissionNo = student?.admissionNo || "—";
  const rollNo = student?.rollNo || "—";
  const fatherName = student?.fatherName || (student as any)?.parentName || "—";
  const motherName = student?.motherName || "—";
  const studentPhone = student?.phone || (student as any)?.parentPhone || "—";
  const joinDate = student?.joinDate || (student as any)?.admissionDate || (student as any)?.createdAt?.slice(0, 10) || "—";

  const totalDemand = feeSummary.totalBilled || 0;
  const totalPaid = feeSummary.totalDeposited || 0;
  const netDue = feeSummary.totalRemaining || 0;
  const netDueWords = numberToIndianWords(netDue > 0 ? netDue : totalPaid);

  const todayDisplay = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const handlePrint = () => {
    if (!printSheetRef.current) return;
    const contentHtml = printSheetRef.current.innerHTML;
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Annual_Fee_Ledger_${studentName.replace(/\s+/g, "_")}</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { margin: 0; padding: 0; background: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 8pt; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
            th { background: #f1f5f9; }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${contentHtml}
        </body>
      </html>
    `;
    printHtmlInIframe(fullHtml, `Annual_Fee_Ledger_${studentName}`);
  };

  const handleDownloadPdf = async () => {
    if (!printSheetRef.current || downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const contentHtml = printSheetRef.current.innerHTML;
      const printCss = `
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; padding: 12px; background: #ffffff; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; font-size: 8pt; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #cbd5e1; padding: 4px 6px; }
        th { background: #f1f5f9; }
        .no-print { display: none !important; }
      `;
      const canvas = await renderHtmlToCanvasSafe(contentHtml, printCss, {
        widthPx: 794,
        scale: 2,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 6;
      const printWidth = pdfWidth - margin * 2;
      const printHeight = (canvas.height * printWidth) / canvas.width;

      if (printHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, "JPEG", margin, margin, printWidth, printHeight);
      } else {
        // Multi-page slicing if table has extensive rows
        let yOffset = 0;
        let page = 0;
        const pageCanvasHeight = (canvas.width * (pdfHeight - margin * 2)) / printWidth;

        while (yOffset < canvas.height) {
          if (page > 0) pdf.addPage();
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(pageCanvasHeight, canvas.height - yOffset);

          const ctx = pageCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              yOffset,
              canvas.width,
              pageCanvas.height,
              0,
              0,
              canvas.width,
              pageCanvas.height
            );
            const pageData = pageCanvas.toDataURL("image/jpeg", 0.95);
            const renderedH = (pageCanvas.height * printWidth) / canvas.width;
            pdf.addImage(pageData, "JPEG", margin, margin, printWidth, renderedH);
          }
          yOffset += pageCanvasHeight;
          page++;
        }
      }

      const safeName = studentName.replace(/[^a-z0-9_-]/gi, "_");
      pdf.save(`Bulk_Fee_Statement_A4_${safeName}_${admissionNo}.pdf`);
    } catch (err) {
      console.error("PDF generation error:", err);
      handlePrint();
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    setSharingWhatsApp(true);
    try {
      const cleanPhone = (studentPhone || "").replace(/\D/g, "").slice(-10);
      const paidRows = allFees.filter((f) => f.paid);
      const dueRows = allFees.filter((f) => !f.paid && !f.isUpcoming && !f.isPreAdmission && Number(f.balanceDue || 0) > 0);

      const text = `*${resolvedSchoolName}*\n` +
        `*वार्षिक सत्र शुल्क मांग व भुगतान विवरण (Session ${sessionName})*\n` +
        `───────────────────────\n` +
        `👤 *छात्र:* ${studentName}\n` +
        `🏫 *कक्षा:* ${className} | *रोल सं:* ${rollNo}\n` +
        `🆔 *नामांकन सं:* ${admissionNo}\n` +
        `👨‍👧 *अभिभावक:* ${fatherName}\n` +
        `───────────────────────\n` +
        `📊 *सत्र सारांश (Fee Summary):*\n` +
        `• कुल सत्र शुल्क मांग: ₹${totalDemand.toLocaleString("en-IN")}\n` +
        `• कुल जमा शुल्क: ₹${totalPaid.toLocaleString("en-IN")}\n` +
        `• कुल शेष देय बकाया: *₹${netDue.toLocaleString("en-IN")}* ${netDue === 0 ? "✅ (कोई बकाया नहीं)" : "⚠️"}\n` +
        `───────────────────────\n` +
        `📑 *मदवार रसीद व मांग विवरण:*\n` +
        allFees
          .filter((f) => !f.isPreAdmission)
          .map((f) => {
            const isAdm = f.feeType === "admission" || f.receiptCategory === "admission" || String(f.receiptNo || "").startsWith("ADM-");
            const label = isAdm ? "प्रवेश शुल्क व किट" : (f.month || "माह");
            if (f.paid) {
              return `✓ ${label}: ₹${Number(f.paidAmount || f.amount || 0).toLocaleString("en-IN")} (जमा, रसीद #${f.receiptNo || "RCP"})`;
            } else if (f.isUpcoming) {
              return `• ${label}: ₹${Number(f.monthlyAmount || f.amount || 0).toLocaleString("en-IN")} (आगामी)`;
            } else {
              return `⚠ ${label}: ₹${Number(f.balanceDue || f.amount || 0).toLocaleString("en-IN")} (बकाया मांग)`;
            }
          })
          .join("\n") +
        `\n───────────────────────\n` +
        `_यह विद्यालय लेखा विभाग द्वारा आधिकारिक रूप से सत्यापित विवरण है।_`;

      const targetUrl = cleanPhone
        ? `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(text)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(targetUrl, "_blank");
    } finally {
      setSharingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold text-lg shrink-0">
              📊
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-black text-white leading-tight truncate">
                  Annual Session Fee Demand + Receipt Ledger (Bulk A4 Dossier)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Full Session A4 Print
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate mt-0.5">
                छात्र: <strong>{studentName}</strong> • {className} • Roll #{rollNo} • कुल सत्र मांग + रसीदें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
            {/* Interactive Zoom Controls */}
            <div className="flex items-center gap-0.5 bg-slate-800 px-1.5 py-0.5 rounded-lg border border-slate-700 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.35, Number((z - 0.1).toFixed(2))))}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                title="Zoom Out"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(0.5)}
                className={`px-1.5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center cursor-pointer ${
                  Math.abs(zoomLevel - 0.5) < 0.03 ? "bg-indigo-600 text-white" : "bg-slate-700/80 text-slate-300 hover:bg-slate-700"
                }`}
                title="Fit Phone Screen (105mm × 148.5mm)"
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(2.0, Number((z + 0.1).toFixed(2))))}
                className="w-5 h-5 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center cursor-pointer text-xs"
                title="Zoom In"
              >
                +
              </button>
            </div>

            {!isStudentView && (
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-xs transition cursor-pointer shrink-0"
                title="A4 Paper Print"
              >
                <Printer className="w-3.5 h-3.5 text-white" />
                <span>A4 Print</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50 shrink-0"
              title="Download A4 PDF"
            >
              {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Download className="w-3.5 h-3.5 text-white" />}
              <span>{downloadingPdf ? "Generating..." : "Download PDF"}</span>
            </button>

            {!isStudentView && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={sharingWhatsApp}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-white border border-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer shrink-0"
                title="WhatsApp Parent"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer shrink-0 ml-0.5"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: A4 Paper Preview Container with 105mm × 148.5mm Scaling */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-100 dark:bg-slate-950/70 flex flex-col items-center justify-start">
          {/* ── THE CONSOLIDATED A4 SHEET ────────────────────────────────────── */}
          <div
            style={{
              width: `${210 * zoomLevel}mm`,
              height: `${297 * zoomLevel}mm`,
              maxWidth: "100%",
              boxSizing: "border-box",
              position: "relative",
            }}
            className="shadow-2xl rounded-xl overflow-hidden bg-white shrink-0 my-auto border border-slate-300 dark:border-slate-800"
          >
            <div
              ref={printSheetRef}
              style={{
                width: "210mm",
                minHeight: "297mm",
                transform: `scale(${zoomLevel})`,
                transformOrigin: "top left",
                boxSizing: "border-box",
                fontFamily: "'Segoe UI', Arial, sans-serif",
              }}
              className="bg-white text-slate-900 p-5 sm:p-7 relative flex flex-col justify-between"
            >
            <div>
              {/* Institutional Header */}
              <div className="flex items-center justify-between border-b-2 border-indigo-900 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  {schoolLogo ? (
                    <img
                      src={schoolLogo}
                      alt={resolvedSchoolName}
                      className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-0.5 bg-white shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-indigo-900 text-white flex items-center justify-center text-xl font-black shrink-0">
                      {resolvedSchoolName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-lg sm:text-xl font-black text-indigo-950 tracking-wide uppercase leading-tight">
                      {resolvedSchoolName}
                    </h1>
                    <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
                      {resolvedAddress}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Helpline: {resolvedPhone} • Email: {resolvedEmail} {resolvedCode ? `• Reg No: ${resolvedCode}` : ""} {resolvedAffiliation ? `• ${resolvedAffiliation}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-900 text-white text-[10px] font-black uppercase tracking-wider">
                    Official Accounts Copy
                  </span>
                  <p className="text-[10px] text-slate-600 font-bold mt-1">
                    Date: <span className="font-mono">{todayDisplay}</span>
                  </p>
                  <p className="text-[10px] text-indigo-900 font-bold font-mono">
                    Session: {sessionName}
                  </p>
                </div>
              </div>

              {/* Title Ribbon */}
              <div className="bg-indigo-50 border-y border-indigo-200 py-1.5 px-3 mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wide">
                    ANNUAL SESSION FEE DEMAND &amp; RECEIPT PASSBOOK • वार्षिक सत्र शुल्क मांग व भुगतान विवरण
                  </h3>
                  <p className="text-[10px] text-indigo-800 font-medium">
                    Consolidated 12-Month Academic Ledger showing all billed monthly fee demands and official payment receipts.
                  </p>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-300">
                  REF: LEDGER-{admissionNo}
                </span>
              </div>

              {/* Student Identification Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-3 text-[11px]">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Student Name (छात्र का नाम)</span>
                  <span className="font-black text-slate-900">{studentName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Class &amp; Roll No (कक्षा व रोल)</span>
                  <span className="font-bold text-slate-900">{className} (Roll: {rollNo})</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Admission No (नामांकन सं.)</span>
                  <span className="font-mono font-bold text-indigo-900">{admissionNo}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Admission Date (दाखिला तिथि)</span>
                  <span className="font-mono font-bold text-slate-900">{joinDate}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Father's Name (पिता का नाम)</span>
                  <span className="font-bold text-slate-900">{fatherName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Mother's Name (माता का नाम)</span>
                  <span className="font-bold text-slate-900">{motherName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Parent Mobile (मोबाइल)</span>
                  <span className="font-mono font-bold text-slate-900">{studentPhone}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">Current Session (शैक्षणिक सत्र)</span>
                  <span className="font-bold text-emerald-800">{sessionName}</span>
                </div>
              </div>

              {/* Comprehensive Session Fee Table */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-[10px] text-left border border-slate-300">
                  <thead className="bg-slate-100 text-indigo-950 font-black uppercase text-[9px] border-b border-slate-300">
                    <tr>
                      <th className="p-1.5 text-center w-8">क्र.</th>
                      <th className="p-1.5">सत्र माह / विवरण (Particulars)</th>
                      <th className="p-1.5 text-right">शुल्क मांग (Demand)</th>
                      <th className="p-1.5 text-right">जमा राशि (Paid)</th>
                      <th className="p-1.5">रसीद सं. (Receipt)</th>
                      <th className="p-1.5">जमा तिथि व माध्यम</th>
                      <th className="p-1.5 text-right">शेष देय (Due)</th>
                      <th className="p-1.5 text-center">स्थिति (Status)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {allFees.map((f: any, idx: number) => {
                      const isPreAdm = Boolean(f.isPreAdmission || f.status === "pre_admission");
                      const isUpcoming = !isPreAdm && Boolean(f.isUpcoming || f.status === "upcoming");
                      const isPaid = !isPreAdm && (typeof f.paid === "boolean" ? f.paid : f.status === "paid");
                      const isAdm =
                        f.feeType === "admission" ||
                        f.receiptCategory === "admission" ||
                        String(f.receiptNo || "").startsWith("ADM-");

                      let monthDisplay = f.month || "2026-04";
                      if (isAdm) {
                        monthDisplay = "प्रवेश शुल्क, किट व प्रथम माह (Admission & Kit)";
                      } else if (/^\d{4}-\d{2}$/.test(monthDisplay)) {
                        const d = new Date(`${monthDisplay}-01T00:00:00`);
                        if (!isNaN(d.getTime())) {
                          monthDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                        }
                      }

                      const billed = isPreAdm
                        ? 0
                        : isAdm
                        ? Number(f.grossTotal ?? f.grossAmount ?? f.amount ?? f.paidAmount ?? 0)
                        : Number(f.monthlyAmount ?? f.amount ?? 0);

                      const paid = isPreAdm ? 0 : Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));
                      const remaining = isPreAdm || isUpcoming
                        ? 0
                        : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

                      const rNo = isPreAdm ? "—" : (isPaid || paid > 0 ? (f.receiptNo || `DPS-26-${String(idx + 1).padStart(4, "0")}`) : "—");
                      const dateStr = f.paidDate || f.paymentDate ? new Date(f.paidDate || f.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }) : (isUpcoming ? "आगामी" : (isPreAdm ? "—" : "Pending"));
                      const modeStr = f.payModeInfo?.payMode || f.paymentMode || (isPaid ? "Cash" : (isPreAdm ? "—" : "Pending"));

                      return (
                        <tr
                          key={f.id || `bulk_${idx}`}
                          className={isAdm ? "bg-amber-50/50 font-medium" : idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
                        >
                          <td className="p-1.5 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-1.5 font-bold text-slate-900">
                            {monthDisplay}
                            {isPreAdm && <span className="text-[8px] text-slate-400 block font-normal">सत्र पूर्व / Pre-Admission (लागू नहीं)</span>}
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold text-slate-800">
                            {isPreAdm ? "—" : `₹${billed.toLocaleString("en-IN")}`}
                          </td>
                          <td className="p-1.5 text-right font-mono font-black text-emerald-700">
                            {isPreAdm ? "—" : `₹${paid.toLocaleString("en-IN")}`}
                          </td>
                          <td className="p-1.5 font-mono text-slate-700 font-bold">{rNo}</td>
                          <td className="p-1.5 font-mono text-[9px] text-slate-600">
                            {dateStr} {modeStr !== "Pending" && modeStr !== "—" && `• ${modeStr}`}
                          </td>
                          <td className="p-1.5 text-right font-mono font-bold">
                            <span className={remaining > 0 ? "text-amber-800 font-black" : "text-slate-400"}>
                              {isPreAdm || isUpcoming ? "—" : remaining > 0 ? `₹${remaining.toLocaleString("en-IN")}` : "₹0"}
                            </span>
                          </td>
                          <td className="p-1.5 text-center">
                            {isPreAdm ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                सत्र पूर्व
                              </span>
                            ) : isPaid ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200">
                                ✓ पूर्ण जमा
                              </span>
                            ) : paid > 0 && remaining > 0 ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200">
                                ⚠ आंशिक
                              </span>
                            ) : isUpcoming ? (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                आगामी
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-200">
                                देय मांग
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-black text-indigo-950 border-t-2 border-indigo-900">
                    <tr>
                      <td colSpan={2} className="p-2 text-right uppercase text-[9px]">
                        सत्र कुल योग (Consolidated Totals):
                      </td>
                      <td className="p-2 text-right font-mono text-xs">
                        ₹{totalDemand.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-emerald-800">
                        ₹{totalPaid.toLocaleString("en-IN")}
                      </td>
                      <td colSpan={2} className="p-2 text-center text-[9px] text-slate-600 font-normal">
                        कुल {allFees.filter((f) => f.paid).length} रसीदें जारी
                      </td>
                      <td className="p-2 text-right font-mono text-xs text-amber-900">
                        ₹{netDue.toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${netDue === 0 ? "bg-emerald-200 text-emerald-950" : "bg-amber-200 text-amber-950"}`}>
                          {netDue === 0 ? "CLEARED" : "DUE PENDING"}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Financial Statement & Reconciled Words Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 border border-slate-300 rounded-lg p-2.5 mb-3 text-[11px]">
                <div className="sm:col-span-2">
                  <p className="text-[10px] text-slate-600 font-bold uppercase">Amount in Words (भारतीय शब्दों में):</p>
                  <p className="text-xs font-serif font-black text-indigo-950 capitalize mt-0.5">
                    Rupees {netDueWords} Only
                  </p>
                  <p className="text-[9px] text-slate-500 mt-1 italic">
                    * Note: This consolidated statement reflects every monthly fee demand generated by the school and all authenticated payment receipts recorded on the official database.
                  </p>
                </div>

                <div className="bg-white p-2 rounded border border-slate-200 text-right">
                  <span className="text-[9px] text-slate-500 uppercase font-bold block">नेट शेष देय (Net Due Balance)</span>
                  <span className={`text-base font-black font-mono block ${netDue === 0 ? "text-emerald-700" : "text-amber-800"}`}>
                    ₹{netDue.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[9px] font-bold text-slate-500">
                    {netDue === 0 ? "कोई बकाया शुल्क नहीं है" : "शीघ्र देय"}
                  </span>
                </div>
              </div>
            </div>

            {/* Official Signatories & Legal Seal Footer */}
            <div className="border-t border-slate-300 pt-3 mt-2">
              <div className="flex items-end justify-between text-center text-[10px] text-slate-700">
                <div className="w-44">
                  <div className="h-9 flex items-end justify-center font-script text-slate-800 text-xs font-bold">
                    Accounts Office
                  </div>
                  <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
                    Cashier / Accounts Clerk
                  </div>
                  <span className="text-[8px] text-slate-500 block">Verified &amp; Recorded</span>
                </div>

                <div className="w-28 text-center flex flex-col items-center">
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-indigo-900/50 flex items-center justify-center text-[8px] font-black uppercase text-indigo-950 p-1 leading-tight">
                    SCHOOL SEAL
                  </div>
                  <span className="text-[8px] text-slate-500 mt-1">Official Seal</span>
                </div>

                <div className="w-44">
                  <div className="h-9 flex items-end justify-center font-script text-slate-800 text-xs font-bold">
                    {school?.principalSignatureUrl ? (
                      <img src={school.principalSignatureUrl} alt="Signature" className="h-8 object-contain" />
                    ) : (
                      <span className="font-serif italic font-bold">{school?.principalName || "Principal"}</span>
                    )}
                  </div>
                  <div className="border-t border-slate-800 pt-1 font-bold text-slate-900">
                    Principal (Sign &amp; Seal)
                  </div>
                  <span className="text-[8px] text-slate-500 block">{school?.principalName || "Institutional Head"}</span>
                </div>
              </div>

              <div className="mt-3 text-center text-[8px] text-slate-400 font-mono border-t border-slate-200 pt-1.5 flex items-center justify-between">
                <span>Computer generated official annual fee statement • Valid without physical seal for digital records</span>
                <span>Page 1 of 1 • System Generated on {todayDisplay}</span>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Session {sessionName} Passbook
            </span>
            <span className="text-xs text-slate-400 font-mono">
              • {allFees.length} Total Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isStudentView && (
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>A4 Paper Print</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{downloadingPdf ? "डाउनलोड हो रहा है..." : "Download A4 PDF"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition cursor-pointer"
            >
              बंद करें (Close)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
