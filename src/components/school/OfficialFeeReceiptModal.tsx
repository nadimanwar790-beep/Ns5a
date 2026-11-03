// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  X, Printer, Download, MessageCircle, CheckCircle2, Loader2, Send
} from "lucide-react";
import type { School, MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generatePosSlipHtml,
  generate4in1A4PageHtml,
  printPosSlipDirect,
  printDpsReceiptDirect,
  POS_SLIP_CSS,
  DPS_RECEIPT_CSS,
  getSavedSchoolLogo,
  formatAcademicSession,
  formatShortFeeMonth,
  formatConciseArrearsMonths,
  computeStudentFeeHistorySummary,
  type FeeReceiptItem,
  type DpsReceiptData,
} from "./feeReceiptUtils";
import { getStudentFees } from "../../school-firebase";
import { downloadFeeDocument, shareFeeReceiptOnWhatsApp } from "./feeDocument";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  fee: MonthlyFee;
  student?: SchoolStudent | null;
  className?: string;
  sessionName?: string;
  feeHistory?: MonthlyFee[];
}

export const OfficialFeeReceiptModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  fee,
  student,
  className = "Class 6-B",
  sessionName = "2026-27",
  feeHistory,
}) => {
  const [fetchedHistory, setFetchedHistory] = useState<MonthlyFee[]>([]);

  useEffect(() => {
    const sid = school?.id || fee?.schoolId;
    const stId = student?.id || fee?.studentId;
    if (!isOpen || !sid || !stId || (feeHistory && feeHistory.length > 0)) return;
    let active = true;
    getStudentFees(sid, stId)
      .then((list) => {
        if (active && Array.isArray(list)) setFetchedHistory(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, school?.id, fee?.schoolId, student?.id, fee?.studentId, feeHistory]);

  // Format month name cleanly (e.g. "NOV 2026")
  const initialInstallment = useMemo(() => {
    if (!fee.month) return "CURRENT MONTH";
    return formatShortFeeMonth(fee.month).toUpperCase() || "CURRENT MONTH";
  }, [fee.month]);

  // Form states
  const receiptNo = fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000));
  const admissionNo = student?.admissionNo || fee.rollNo || "140516";
  const studentName = fee.studentName || student?.name || "STUDENT";
  const studentPhotoUrl = student?.photoUrl || (student as any)?.photo || "";
  const installment = initialInstallment;

  const receiptDate = useMemo(() => {
    if (fee.paidDate) {
      const d = new Date(fee.paidDate);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }, [fee.paidDate]);

  const session = formatAcademicSession(sessionName);
  const resolvedClass = className;
  const counterNo = !fee.paid && Number(fee.paidAmount || 0) === 0 ? "DUE-DEMAND" : "FEE-RECEIPT";
  const note = fee.note || String(Math.floor(100 + Math.random() * 900));
  const [previewFormat, setPreviewFormat] = useState<"4in1" | "pos">("4in1");

  // School identity & logo state
  const schoolLogoUrl = getSavedSchoolLogo(school?.logoUrl, school?.id);
  const schoolNameState = school?.name || "School";
  const schoolAddressState = school?.address || "";

  // Pay Mode Information
  const payMode = fee.payModeInfo?.payMode || "Cash";
  const bank = fee.payModeInfo?.bank || "SCHOOL COUNTER";
  const chequeNumber = fee.payModeInfo?.number || "—";
  const payDate = fee.payModeInfo?.date || receiptDate;

  // Fee items breakdown (All fee heads matching school receipt structure)
  const items: FeeReceiptItem[] = useMemo(() => {
    const arrears = Number(fee.arrearsAmount || 0);
    const conciseArrears = formatConciseArrearsMonths(fee.arrearsMonths);
    const formattedMonths = conciseArrears ? ` (${conciseArrears})` : "";

    if (fee.items && fee.items.length > 0) {
      const hasArrearsItem = fee.items.some(it => it.id === "arrears" || it.description.toLowerCase().includes("arrears") || it.description.toLowerCase().includes("back due"));
      if (arrears > 0 && !hasArrearsItem) {
        return [
          ...fee.items,
          {
            id: "arrears",
            slNo: fee.items.length + 1,
            description: `Back Due / Previous Arrears${formattedMonths}`,
            due: arrears,
            con: 0,
            paid: fee.paid ? arrears : (fee.paidAmount && fee.paidAmount > (fee.monthlyAmount || 0) ? Math.min(arrears, fee.paidAmount - (fee.monthlyAmount || 0)) : 0)
          }
        ];
      }
      return fee.items;
    }

    const baseFee = Number(fee.monthlyAmount ?? fee.amount ?? 0) || 2000;
    const effectivePaid = fee.paidAmount !== undefined ? Number(fee.paidAmount) : (fee.paid ? baseFee : 0);

    const initialList: FeeReceiptItem[] = [];
    let sl = 1;
    initialList.push({
      id: "tuition",
      slNo: sl++,
      description: "Tuition Fee",
      due: baseFee,
      con: Number(fee.concession || 0),
      paid: effectivePaid
    });

    if (fee.includeAdmissionFee) {
      initialList.push({
        id: "admission",
        slNo: sl++,
        description: "Admission Fee",
        due: 65000,
        con: 0,
        paid: fee.paid ? 65000 : 0
      });
    }
    if (fee.includeCautionMoney) {
      initialList.push({
        id: "caution",
        slNo: sl++,
        description: "Caution Money",
        due: 60000,
        con: 0,
        paid: fee.paid ? 60000 : 0
      });
    }
    if (fee.includeAnnualCharges) {
      initialList.push({
        id: "annual",
        slNo: sl++,
        description: "Annual Charges",
        due: 23320,
        con: 0,
        paid: fee.paid ? 23320 : 0
      });
    }
    if (fee.includeBusFee) {
      const bus = Number(fee.busFeeAmount !== undefined ? fee.busFeeAmount : 1000);
      initialList.push({
        id: "bus",
        slNo: sl++,
        description: "Bus Transport Fee",
        due: bus,
        con: 0,
        paid: fee.paid ? bus : 0
      });
    }
    if (arrears > 0) {
      initialList.push({
        id: "arrears",
        slNo: sl++,
        description: `Back Due / Previous Arrears${formattedMonths}`,
        due: arrears,
        con: 0,
        paid: fee.paid ? arrears : (fee.paidAmount && fee.paidAmount > baseFee ? Math.min(arrears, fee.paidAmount - baseFee) : 0)
      });
    }

    return initialList;
  }, [fee]);

  // Derived totals
  const totalDue = items.reduce((sum, it) => sum + (Number(it.due) || 0), 0);
  const totalConcession = items.reduce((sum, it) => sum + (Number(it.con) || 0), 0);
  const totalPaid = items.reduce((sum, it) => sum + (Number(it.paid) || 0), 0);
  const grandTotal = Math.max(0, totalDue - totalConcession);

  // Complete data object for receipt generator
  const historySummary = useMemo(() => {
    return computeStudentFeeHistorySummary({
      studentId: student?.id || fee.studentId,
      schoolId: school?.id || fee.schoolId,
      currentMonth: fee.month,
      currentFee: fee,
      feeHistory: feeHistory && feeHistory.length > 0 ? feeHistory : fetchedHistory,
    });
  }, [student?.id, fee, school?.id, feeHistory, fetchedHistory]);

  const receiptData: DpsReceiptData = useMemo(() => ({
    schoolName: schoolNameState || school?.name || "School",
    schoolId: school?.id || "school_campus",
    schoolAddress: schoolAddressState || school?.address || "Institutional Academic Campus, Educational Zone",
    schoolLogoUrl: getSavedSchoolLogo(schoolLogoUrl || school?.logoUrl, school?.id),
    schoolPhone: school?.mobile || school?.phone,
    schoolEmail: school?.email,
    schoolAffiliation: school?.affiliation,
    upiId: school?.upiId || "",
    receiptTitle: !fee.paid && totalPaid === 0
      ? "FEE DEMAND SLIP • बकाया शुल्क तकादा पर्ची"
      : (fee.receiptCategory === "admission"
        ? "OFFICIAL ADMISSION FEE RECEIPT / प्रवेश शुल्क रसीद"
        : "OFFICIAL MONTHLY FEE RECEIPT / मासिक शुल्क रसीद"),
    receiptNo,
    admissionNo,
    studentName,
    fatherName: student?.fatherName || "",
    studentId: student?.id || fee.studentId || "",
    rollNo: student?.rollNo || fee.rollNo || "",
    phone: student?.phone || student?.whatsappNo || (fee as any).phone || "",
    studentPhotoUrl,
    installment,
    receiptDate,
    session,
    className: resolvedClass,
    counterNo,
    items,
    balanceDue: Math.max(
      Number(fee.balanceDue || 0) + (fee.paid ? 0 : Number(fee.arrearsAmount || 0)),
      Math.max(0, grandTotal - totalPaid)
    ),
    lastPaidAmount: fee.lastPaidAmount !== undefined ? fee.lastPaidAmount : historySummary.lastPaidAmount,
    lastPaidDate: fee.lastPaidDate || historySummary.lastPaidDate,
    lastDueAmount: fee.lastDueAmount !== undefined ? fee.lastDueAmount : historySummary.lastDueAmount,
    lastDueDate: fee.lastDueDate || historySummary.lastDueDate,
    fifoSummary: fee.note || undefined,
    payModeInfo: {
      payMode: !fee.paid && totalPaid === 0 ? "Payment Pending / Due Slip" : payMode,
      date: payDate,
      bank: !fee.paid && totalPaid === 0 ? "PENDING" : bank,
      number: chequeNumber,
    },
    note,
    showDigitalSignature: Boolean(school?.principalSignatureUrl || school?.directorSignatureUrl),
    principalSignatureUrl: school?.principalSignatureUrl,
    principalName: school?.principalName || "Principal",
    principalTitle: "Principal",
    directorSignatureUrl: school?.directorSignatureUrl,
    directorName: school?.directorName || "Director",
    signatoryTitle: school?.principalName || "Principal",
  }), [
    schoolNameState, school, schoolAddressState, schoolLogoUrl, fee, totalPaid, totalDue, grandTotal,
    receiptNo, admissionNo, studentName, student, studentPhotoUrl, installment, receiptDate,
    session, resolvedClass, counterNo, items, payMode, payDate, bank, chequeNumber, note, historySummary
  ]);

  // Extract parent / student mobile number (prefill from student phone or fatherPhone)
  const initialParentPhone = useMemo(() => {
    const raw = student?.phone || (student as any)?.parentPhone || (student as any)?.fatherPhone || (student as any)?.motherPhone || fee.phone || "";
    return raw ? String(raw).replace(/\D/g, "").slice(-10) : "";
  }, [student, fee]);

  const [parentMobile, setParentMobile] = useState<string>(initialParentPhone);

  useEffect(() => {
    if (initialParentPhone) {
      setParentMobile(initialParentPhone);
    }
  }, [initialParentPhone]);

  // Direct Print action (respects selected 4-in-1 A4 Sheet or Mini POS Slip)
  const handlePrint = () => {
    if (previewFormat === "4in1") {
      printDpsReceiptDirect(receiptData, "4in1");
    } else {
      printPosSlipDirect(receiptData, 80);
    }
  };

  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);

  // WhatsApp share directly with parent mobile number
  const handleWhatsApp = async (overridePhone?: string) => {
    setIsSharingWhatsApp(true);
    try {
      const targetPhone = overridePhone !== undefined ? overridePhone : parentMobile;
      await shareFeeReceiptOnWhatsApp({
        targetPhone,
        fee: {
          ...fee,
          receiptNo,
          amount: grandTotal,
          monthlyAmount: grandTotal,
          studentName,
          note,
          paidDate: fee.paidDate || new Date().toISOString(),
          paidAmount: totalPaid > 0 ? totalPaid : (fee.paid ? grandTotal : 0),
          arrearsAmount: fee.arrearsAmount,
        },
        student,
        schoolName: receiptData.schoolName,
        className: resolvedClass,
        schoolDetails: {
          schoolId: school?.id,
          schoolName: receiptData.schoolName,
          address: receiptData.schoolAddress,
          phone: receiptData.schoolPhone,
          email: receiptData.schoolEmail,
          affiliation: receiptData.schoolAffiliation,
          logoUrl: receiptData.schoolLogoUrl,
          upiId: school?.upiId,
          principalSignatureUrl: receiptData.principalSignatureUrl,
          directorSignatureUrl: receiptData.directorSignatureUrl,
          principalName: receiptData.signatoryTitle,
        },
        isDueDemand: !fee.paid && totalPaid === 0,
      });
    } catch (err) {
      console.error("WhatsApp share error:", err);
    } finally {
      setIsSharingWhatsApp(false);
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadFeeDocument({
        fee: {
          ...fee,
          receiptNo,
          amount: grandTotal,
          monthlyAmount: grandTotal,
          studentName,
          note,
        },
        student,
        schoolName: receiptData.schoolName,
        className: resolvedClass,
        schoolDetails: {
          schoolId: school?.id,
          schoolName: receiptData.schoolName,
          address: receiptData.schoolAddress,
          logoUrl: receiptData.schoolLogoUrl,
          upiId: school?.upiId,
          phone: receiptData.schoolPhone,
          email: receiptData.schoolEmail,
          affiliation: receiptData.schoolAffiliation,
          principalName: receiptData.principalName,
          principalSignatureUrl: receiptData.principalSignatureUrl,
        },
        mode: previewFormat,
      });
    } catch (err) {
      console.error("PDF download error:", err);
      handlePrint();
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Navbar */}
        <div className="px-4 sm:px-5 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-amber-300 font-bold text-lg shadow-inner shrink-0">
              🧾
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-white leading-tight truncate">
                  {!fee.paid && totalPaid === 0 ? "Official Fee Due Demand Slip" : "Official School Fee Receipt"}
                </h2>
                {totalPaid >= grandTotal && grandTotal > 0 ? (
                  <span className="text-[10px] bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" /> FULL PAID (पूर्ण भुगतान)
                  </span>
                ) : totalPaid > 0 ? (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    ⚠️ PARTIAL (जमा: ₹{totalPaid.toLocaleString("en-IN")})
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                    DEMAND SLIP (बकाया)
                  </span>
                )}
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 font-black px-2 py-0.5 rounded-full">
                  {previewFormat === "4in1" ? "4-in-1 A4 Sheet" : "Mini Thermal POS Slip"}
                </span>
              </div>
              <p className="text-xs text-slate-300 truncate">
                {studentName} • Receipt #{receiptNo} • <span className="text-amber-300 font-mono font-bold">{receiptDate}</span> • ₹{grandTotal.toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleWhatsApp()}
              disabled={isSharingWhatsApp}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-900/30 active:scale-95 transition cursor-pointer disabled:opacity-50"
              title="Direct WhatsApp share to parent mobile"
            >
              {isSharingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <MessageCircle className="w-4 h-4" />}
              <span className="hidden sm:inline">{isSharingWhatsApp ? "भेज रहे..." : "WhatsApp"}</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-white/20 active:scale-95 transition cursor-pointer disabled:opacity-50"
              title="Download Receipt PDF"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">{isDownloadingPdf ? "Saving..." : "Download PDF"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-black rounded-xl shadow-md shadow-orange-900/30 active:scale-95 transition cursor-pointer"
              title="Mini Bluetooth / USB Thermal Printer (80mm/58mm Roll) par print karein"
            >
              <Printer className="w-4 h-4 text-amber-200" />
              <span className="hidden sm:inline">Mini POS Print</span>
              <span className="sm:hidden">POS</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Clean Direct Preview with Direct Parent WhatsApp Share Card */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/60 flex flex-col items-center">
          {/* ── Direct WhatsApp Share to Parent Mobile Number Card ── */}
          <div className="w-full max-w-[540px] bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950/40 dark:via-teal-950/40 dark:to-slate-900 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl p-4 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md shadow-emerald-700/25 shrink-0">
                  <MessageCircle className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 dark:text-emerald-100 flex items-center gap-1.5">
                    अभिभावक के WhatsApp पर रसीद भेजें
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200">
                      Direct WhatsApp
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    छात्र: <strong className="text-slate-900 dark:text-white">{studentName}</strong> • {resolvedClass} {student?.fatherName ? `• C/O ${student.fatherName}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500 select-none flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>+91</span>
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={parentMobile}
                  onChange={(e) => setParentMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="Parent WhatsApp No (10 अंक)"
                  className="w-full pl-15 pr-3 py-2.5 text-xs font-mono font-bold rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                />
              </div>
              <button
                type="button"
                onClick={() => handleWhatsApp(parentMobile)}
                disabled={isSharingWhatsApp}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-800/30 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {isSharingWhatsApp ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Send className="w-4 h-4 text-amber-300" />
                )}
                <span>{isSharingWhatsApp ? "भेज रहे हैं..." : "WhatsApp पर भेजें"}</span>
              </button>
            </div>
            <p className="text-[10px] text-emerald-800/80 dark:text-emerald-400/80 mt-1.5 flex items-center gap-1">
              <span>💡</span>
              <span>अभिभावक का मोबाइल नंबर यहां बदलें या सीधे हरे बटन पर क्लिक करें। रसीद विवरण सीधे इसी नंबर पर जाएगा।</span>
            </p>
          </div>

          {/* Format Switcher: 4-in-1 A4 Sheet vs Mini Thermal POS */}
          <div className="w-full max-w-[540px] flex items-center justify-between gap-2 mb-3 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 px-2">
              Receipt Print Format:
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPreviewFormat("4in1")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  previewFormat === "4in1"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                📄 4-in-1 A4 Sheet
              </button>
              <button
                type="button"
                onClick={() => setPreviewFormat("pos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                  previewFormat === "pos"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                🧾 Mini POS Slip
              </button>
            </div>
          </div>

          {/* Inject Receipt & Thermal POS CSS */}
          <style>{DPS_RECEIPT_CSS}</style>
          <style>{POS_SLIP_CSS}</style>

          {/* RENDER LIVE 4-IN-1 SHEET OR MINI POS THERMAL SLIP */}
          <div className="w-full flex justify-center py-1 overflow-x-auto">
            {previewFormat === "4in1" ? (
              <div
                className="w-full flex justify-center"
                dangerouslySetInnerHTML={{
                  __html: generate4in1A4PageHtml([
                    { data: receiptData, copyTitle: "STUDENT COPY" },
                    { data: receiptData, copyTitle: "SCHOOL / OFFICE COPY" },
                    { data: receiptData, copyTitle: "ACCOUNTS COPY" },
                    { data: receiptData, copyTitle: "PARENT / GUARDIAN COPY" },
                  ]),
                }}
              />
            ) : (
              <div
                className="w-full flex justify-center"
                dangerouslySetInnerHTML={{
                  __html: generatePosSlipHtml(receiptData, { rollWidthMm: 80 }),
                }}
              />
            )}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleWhatsApp(parentMobile)}
              disabled={isSharingWhatsApp}
              className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="Share receipt directly on parent WhatsApp number"
            >
              {isSharingWhatsApp ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4 text-amber-300" />}
              <span>WhatsApp पर भेजें</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>{isDownloadingPdf ? "Saving PDF..." : "Download PDF"}</span>
            </button>
            <button
              type="button"
              onClick={() => printDpsReceiptDirect(receiptData, "4in1")}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="A4 4-in-1 Sheet print karein"
            >
              <Printer className="w-4 h-4 text-indigo-200" />
              <span>📄 Print 4-in-1 Sheet</span>
            </button>
            <button
              type="button"
              onClick={() => printPosSlipDirect(receiptData, 80)}
              className="px-3.5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
              title="Mini Thermal POS Printer (80mm/58mm Roll) par turant print karein"
            >
              <Printer className="w-4 h-4 text-amber-200" />
              <span>🧾 Print Mini POS</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
