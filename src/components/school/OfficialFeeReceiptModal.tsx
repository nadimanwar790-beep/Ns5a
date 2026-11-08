// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  X, Printer, Download, MessageCircle, CheckCircle2, Loader2, Send
} from "lucide-react";
import type { School, MonthlyFee, SchoolStudent } from "../../school-types";
import {
  generatePosSlipHtml,
  generate4in1A4PageHtml,
  generateDpsReceiptHtml,
  generateSingleA6SlipHtml,
  printA6SlipDirect,
  printPosSlipDirect,
  printDpsReceiptDirect,
  printDpsReceipts4in1,
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
import {
  downloadFeeDocument,
  shareFeeReceiptOnWhatsApp,
  generateFeeDocumentPdfBlob,
  buildWhatsAppReceiptMessage,
} from "./feeDocument";
import { WhatsAppShareModal } from "./WhatsAppShareModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  fee: MonthlyFee;
  student?: SchoolStudent | null;
  className?: string;
  sessionName?: string;
  feeHistory?: MonthlyFee[];
  initialFormat?: "4in1" | "pos" | "a6";
  isStudentView?: boolean;
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
  initialFormat = "pos",
  isStudentView = false,
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
  const fatherName = student?.fatherName || "";
  const rollNo = student?.rollNo || fee.rollNo || "";
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
  const isDueDemand = !fee.paid && Number(fee.paidAmount || 0) === 0;
  const isSlipView = initialFormat === "a6" || (initialFormat !== "pos" && isDueDemand);
  const counterNo = isSlipView ? "DUE-DEMAND" : ((fee as any).counterNo || "DPS-RECEIPT");
  const note = fee.note || (fee as any).remarks || "";
  const [zoomLevel, setZoomLevel] = useState<number>(() => (isStudentView ? 0.8 : 1));

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
    const earlyDisc = Number(fee.earlyDiscount || fee.concession || 0);
    const effectivePaid = fee.paidAmount !== undefined
      ? Number(fee.paidAmount)
      : (fee.paid ? Math.max(0, baseFee - earlyDisc) : 0);

    const initialList: FeeReceiptItem[] = [];
    let sl = 1;
    initialList.push({
      id: "tuition",
      slNo: sl++,
      description: earlyDisc > 0 ? "Tuition Fee (5% Early Bird Concession)" : "Tuition Fee (चालू माह शुल्क)",
      due: baseFee,
      con: earlyDisc,
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
  const isFeePaid = Boolean(fee.paid || (totalPaid >= grandTotal && grandTotal > 0));
  const balanceDue = Math.max(
    Number(fee.balanceDue || 0) + (fee.paid ? 0 : Number(fee.arrearsAmount || 0)),
    Math.max(0, grandTotal - totalPaid)
  );

  useEffect(() => {
    if (isStudentView) {
      if (isFeePaid) {
        setZoomLevel(1);
      } else {
        setZoomLevel(0.85);
      }
    }
  }, [isStudentView, isFeePaid]);

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
    fatherName,
    studentId: student?.id || fee.studentId || "",
    rollNo,
    phone: student?.phone || student?.whatsappNo || (fee as any).phone || "",
    studentPhotoUrl,
    installment,
    receiptDate,
    session,
    className: resolvedClass,
    counterNo,
    items,
    balanceDue,
    lastPaidAmount: fee.lastPaidAmount !== undefined ? fee.lastPaidAmount : historySummary.lastPaidAmount,
    lastPaidDate: fee.lastPaidDate || historySummary.lastPaidDate,
    lastDueAmount: fee.lastDueAmount !== undefined ? fee.lastDueAmount : historySummary.lastDueAmount,
    lastDueDate: fee.lastDueDate || historySummary.lastDueDate,
    fifoSummary: fee.note || undefined,
    earlyDiscount: Number(fee.earlyDiscount || fee.concession || 0) || undefined,
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
    principalTitle: "Principal (Sign & Seal)",
    directorSignatureUrl: school?.directorSignatureUrl,
    directorName: school?.directorName || "Cashier / Clerk",
    signatoryTitle: school?.principalName || "Principal",
    signatoryMode: (fee.receiptCategory === "admission" || fee.feeType === "admission") ? "both" : "principal_only",
    cashierTitle: "Cashier / Clerk",
  }), [
    schoolNameState, school, schoolAddressState, schoolLogoUrl, fee, totalPaid, totalDue, grandTotal,
    receiptNo, admissionNo, studentName, student, studentPhotoUrl, installment, receiptDate,
    session, resolvedClass, counterNo, items, payMode, payDate, bank, chequeNumber, note, historySummary, balanceDue, fatherName, rollNo
  ]);

  // Extract parent / student mobile number (prefill from student phone or fatherPhone)
  const initialParentPhone = useMemo(() => {
    const raw =
      student?.phone ||
      (student as any)?.whatsappNo ||
      (student as any)?.parentPhone ||
      (student as any)?.fatherPhone ||
      (student as any)?.motherPhone ||
      (student as any)?.mobile ||
      (fee as any)?.phone ||
      (fee as any)?.parentPhone ||
      "";
    return raw ? String(raw).replace(/\D/g, "").slice(-10) : "";
  }, [student, fee]);

  const [parentMobile, setParentMobile] = useState<string>(initialParentPhone);
  const [showPhonePrompt, setShowPhonePrompt] = useState<boolean>(false);
  const [manualPhone, setManualPhone] = useState<string>("");

  useEffect(() => {
    if (initialParentPhone) {
      setParentMobile(initialParentPhone);
      setManualPhone(initialParentPhone);
    }
  }, [initialParentPhone]);

  // Direct Print: A6 Demand Slip or Receipt
  const handlePrint = () => {
    if (isSlipView) {
      printA6SlipDirect(receiptData);
    } else if (initialFormat === "4in1") {
      printDpsReceipts4in1([receiptData]);
    } else {
      printPosSlipDirect(receiptData, 80);
    }
  };

  const [showWhatsAppPortalModal, setShowWhatsAppPortalModal] = useState(false);

  // Prepared fee options for WhatsApp message and PDF Blob
  const feeDocumentOptions = useMemo(() => ({
    mode: (isSlipView ? "a6" : initialFormat === "4in1" ? "4in1" : "pos") as any,
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
    isDueDemand,
  }), [fee, receiptNo, grandTotal, studentName, note, totalPaid, student, receiptData, resolvedClass, school, isDueDemand, initialFormat]);

  const whatsAppMeta = useMemo(() => {
    return buildWhatsAppReceiptMessage({
      ...feeDocumentOptions,
      targetPhone: parentMobile || initialParentPhone || "",
    });
  }, [feeDocumentOptions, parentMobile, initialParentPhone]);

  const handleWhatsAppClick = () => {
    setShowWhatsAppPortalModal(true);
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    try {
      await downloadFeeDocument({
        ...feeDocumentOptions,
        mode: isDueDemand ? "a6" : initialFormat === "4in1" ? "4in1" : "pos",
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
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[96vh]">
        {/* Top Navbar with EXACTLY 3 Action Buttons: WhatsApp, Print, Download + Close */}
        <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0 border-b border-white/10 gap-2">
          {/* Left: Student & Document Info */}
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-lg shrink-0">{isDueDemand ? "📄" : "🧾"}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                <h2 className="text-xs sm:text-sm font-black text-white leading-tight truncate">
                  {studentName}
                </h2>
                <span className="text-[10px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded shrink-0">
                  {resolvedClass}
                </span>
                {totalPaid >= grandTotal && grandTotal > 0 ? (
                  <span className="text-[10px] bg-emerald-500 text-white font-bold px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                  </span>
                ) : totalPaid > 0 ? (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                    Partial: ₹{totalPaid.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-500 text-white font-bold px-1.5 py-0.2 rounded-md shrink-0">
                    Due: ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                #{receiptNo} • {receiptDate} • {isSlipView ? "Fee Demand Slip (मांग पर्ची - A6)" : "Official Fee Receipt (शुल्क रसीद - POS 3\")"}
              </p>
            </div>
          </div>

          {/* Right: 3 Prominent Action Buttons + Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. WhatsApp: Direct dispatch with copy number, direct document share & WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              title={isSlipView ? "अभिभावक के WhatsApp पर मांग पर्ची शेयर करें" : "अभिभावक के WhatsApp पर रसीद शेयर करें"}
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              <span>WhatsApp</span>
            </button>

            {/* 2. Print: Direct A6 demand slip or receipt print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              title={isSlipView ? "मांग पर्ची प्रिंट करें (Print Demand Slip A6)" : "शुल्क रसीद प्रिंट करें (Print Receipt POS)"}
            >
              <Printer className="w-3.5 h-3.5 text-amber-200" />
              <span>Print</span>
            </button>

            {/* 3. Download: Download PDF */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              title={isSlipView ? "Download Demand Slip PDF" : "Download Fee Receipt PDF"}
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-white" />
              )}
              <span>Download</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer ml-0.5"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Direct Single A6 Demand Slip or Receipt Preview */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-5 bg-slate-100 dark:bg-slate-950/70 flex flex-col items-center">
          {/* Inject Receipt & Thermal POS CSS */}
          <style>{DPS_RECEIPT_CSS}</style>
          <style>{POS_SLIP_CSS}</style>

          <div className="w-full flex justify-center py-1">
            <div
              className="w-full flex justify-center"
              dangerouslySetInnerHTML={{
                __html:
                  isSlipView
                    ? generateSingleA6SlipHtml(receiptData)
                    : initialFormat === "4in1"
                    ? generate4in1A4PageHtml([{ data: receiptData }])
                    : generatePosSlipHtml(receiptData, { rollWidthMm: 80 }),
              }}
            />
          </div>
        </div>
      </div>

      {/* Dedicated WhatsApp Share & Send Modal with Number Copy & Direct Document Share */}
      <WhatsAppShareModal
        isOpen={showWhatsAppPortalModal}
        onClose={() => setShowWhatsAppPortalModal(false)}
        studentName={studentName}
        parentPhone={parentMobile || initialParentPhone || ""}
        className={resolvedClass}
        rollNo={rollNo}
        admissionNo={admissionNo}
        fatherName={fatherName}
        receiptNo={receiptNo}
        title={isDueDemand ? "Fee Demand Slip (मांग पर्ची)" : "Official Fee Receipt (रसीद)"}
        formattedMessage={whatsAppMeta.message}
        isDueDemand={isDueDemand}
        totalAmount={grandTotal}
        paidAmount={totalPaid > 0 ? totalPaid : (fee.paid ? grandTotal : 0)}
        balanceDue={balanceDue}
        generatePdfBlob={() => generateFeeDocumentPdfBlob(feeDocumentOptions)}
      />
    </div>
  );
};
