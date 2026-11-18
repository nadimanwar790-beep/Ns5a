// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  X, Printer, Download, MessageCircle, CheckCircle2, Loader2, Send, Eye, EyeOff
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
  maskSensitive2Chars,
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
  initialFormat?: "full" | "4in1" | "pos" | "a6";
  isStudentView?: boolean;
  defaultMasked?: boolean;
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
  initialFormat,
  isStudentView = false,
  defaultMasked = false,
}) => {
  const isAdmissionReceipt = fee?.feeType === "admission" || fee?.receiptCategory === "admission";
  const resolvedDefaultFormat: "full" | "4in1" | "pos" | "a6" = isAdmissionReceipt
    ? initialFormat || "full"
    : initialFormat && initialFormat !== "full"
    ? initialFormat
    : "4in1";
  const [activeFormat, setActiveFormat] = useState<"full" | "4in1" | "pos" | "a6">(resolvedDefaultFormat);
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(() => Boolean(defaultMasked));
  useEffect(() => {
    setActiveFormat(
      isAdmissionReceipt
        ? initialFormat || "full"
        : initialFormat && initialFormat !== "full"
        ? initialFormat
        : "4in1"
    );
  }, [initialFormat, isAdmissionReceipt, isOpen, fee?.receiptNo]);
  useEffect(() => {
    setMaskSensitiveData(Boolean(defaultMasked));
  }, [defaultMasked, isOpen]);

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
  const isSlipView = activeFormat === "a6";
  const counterNo = isDueDemand ? "DUE-DEMAND" : isAdmissionReceipt ? "ADM-RECEIPT" : ((fee as any).counterNo || "DPS-RECEIPT");
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

    const isFree = Boolean(student?.isFreeEducation || (baseFee > 0 && earlyDisc >= baseFee));
    const isSiblingDisc = Boolean(student?.siblingDiscountPct || student?.siblingDiscountAmount || student?.isSiblingMarked);

    let tuitionDesc = "Tuition Fee (चालू माह शुल्क)";
    if (isFree) {
      tuitionDesc = "Tuition Fee (100% Sibling Free / नि:शुल्क शिक्षा)";
    } else if (isSiblingDisc && earlyDisc > 0) {
      tuitionDesc = `Tuition Fee (Sibling Concession / भाई-बहन छूट${student?.siblingDiscountPct ? ` ${student.siblingDiscountPct}%` : ""})`;
    } else if (earlyDisc > 0) {
      tuitionDesc = "Tuition Fee (5% Early Bird Concession)";
    }

    initialList.push({
      id: "tuition",
      slNo: sl++,
      description: tuitionDesc,
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
    motherName: student?.motherName || (student as any)?.mother || "",
    aadhaarNo: student?.aadhaarNo || (student as any)?.aadhaar || "",
    maskSensitiveData,
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
    showDigitalSignature: Boolean(
      school?.principalSignatureUrl ||
      school?.accountantSignatureUrl ||
      school?.managerSignatureUrl ||
      school?.directorSignatureUrl ||
      fee.collectorSignatureUrl
    ),
    principalSignatureUrl: school?.principalSignatureUrl,
    principalName: school?.principalName || "Principal",
    principalTitle: "Principal (Sign & Seal)",
    directorSignatureUrl: school?.directorSignatureUrl,
    directorName: school?.directorName || "Director",
    managerSignatureUrl: school?.managerSignatureUrl,
    managerName: school?.managerName || "Manager",
    accountantSignatureUrl: school?.accountantSignatureUrl,
    accountantName: school?.accountantName || "Accountant",
    collectedByRole: fee.collectedByRole || "accountant",
    collectedByName: fee.collectedByName,
    collectorSignatureUrl: fee.collectorSignatureUrl,
    signatoryTitle: school?.principalName || "Principal",
    signatoryMode: isDueDemand ? "principal_only" : "both",
    cashierTitle:
      fee.collectedByRole === "manager"
        ? (fee.collectedByName || school?.managerName || "Manager")
        : (fee.collectedByName || school?.accountantName || "Accountant"),
  }), [
    schoolNameState, school, schoolAddressState, schoolLogoUrl, fee, totalPaid, totalDue, grandTotal,
    receiptNo, admissionNo, studentName, student, studentPhotoUrl, installment, receiptDate,
    session, resolvedClass, counterNo, items, payMode, payDate, bank, chequeNumber, note, historySummary, balanceDue, fatherName, rollNo, isDueDemand, maskSensitiveData
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

  // Direct Print: Full A4, A6 Slip, 4-in-1 A4, or POS 80mm
  const handlePrint = () => {
    if (activeFormat === "full") {
      printDpsReceiptDirect(receiptData, "full");
    } else if (activeFormat === "a6") {
      printA6SlipDirect(receiptData);
    } else if (activeFormat === "4in1") {
      printDpsReceipts4in1([receiptData]);
    } else {
      printPosSlipDirect(receiptData, 80);
    }
  };

  const [showWhatsAppPortalModal, setShowWhatsAppPortalModal] = useState(false);

  // Prepared fee options for WhatsApp message and PDF Blob
  const feeDocumentOptions = useMemo(() => ({
    mode: activeFormat as any,
    receiptDataOverride: receiptData,
    fee: {
      ...fee,
      receiptNo,
      items,
      amount: grandTotal,
      monthlyAmount: fee.monthlyAmount,
      studentName,
      note,
      paidDate: fee.paidDate || new Date().toISOString(),
      paidAmount: totalPaid > 0 ? totalPaid : (fee.paid ? grandTotal : 0),
      arrearsAmount: fee.arrearsAmount,
    },
    feeHistory: feeHistory && feeHistory.length > 0 ? feeHistory : fetchedHistory,
    student: maskSensitiveData && student
      ? {
          ...student,
          fatherName: maskSensitive2Chars(student.fatherName, true),
          motherName: maskSensitive2Chars(student.motherName, true),
          phone: maskSensitive2Chars(student.phone || student.whatsappNo, true),
          whatsappNo: maskSensitive2Chars(student.whatsappNo || student.phone, true),
          aadhaarNo: maskSensitive2Chars(student.aadhaarNo, true),
        }
      : student,
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
      managerSignatureUrl: receiptData.managerSignatureUrl,
      managerName: receiptData.managerName,
      accountantSignatureUrl: receiptData.accountantSignatureUrl,
      accountantName: receiptData.accountantName,
      principalName: receiptData.signatoryTitle,
    },
    isDueDemand: activeFormat === "a6" && isDueDemand,
  }), [activeFormat, fee, receiptNo, items, grandTotal, studentName, note, totalPaid, feeHistory, fetchedHistory, student, receiptData, resolvedClass, school, isDueDemand, maskSensitiveData]);

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
        mode: activeFormat,
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
        <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white flex items-center justify-between shrink-0 border-b-2 border-indigo-700 dark:border-white/10 gap-2">
          {/* Left: Student & Document Info */}
          <div className="min-w-0 flex items-center gap-2">
            <span className="text-lg shrink-0">{isDueDemand ? "📄" : "🧾"}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-nowrap overflow-hidden">
                <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight truncate">
                  {studentName}
                </h2>
                <span className="text-[10px] bg-indigo-100 dark:bg-slate-800 text-indigo-900 dark:text-slate-300 border border-indigo-700/40 dark:border-transparent font-mono font-bold px-1.5 py-0.2 rounded shrink-0">
                  {resolvedClass}
                </span>
                {totalPaid >= grandTotal && grandTotal > 0 ? (
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-md shrink-0 flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Paid
                  </span>
                ) : totalPaid > 0 ? (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                    Partial: ₹{totalPaid.toLocaleString("en-IN")}
                  </span>
                ) : (
                  <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.2 rounded-md shrink-0">
                    Due: ₹{grandTotal.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-700 dark:text-slate-400 font-semibold truncate">
                #{receiptNo} • {receiptDate} •{" "}
                {activeFormat === "full"
                  ? "Full A4 Official Receipt (पूरा पेज A4)"
                  : activeFormat === "a6"
                  ? "Slip Preview (A6)"
                  : activeFormat === "4in1"
                  ? "4-in-1 A4 Sheet"
                  : "Thermal POS Receipt (3\")"}
              </p>
            </div>
          </div>

          {/* Right: 3 Prominent Action Buttons + Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppClick}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              title="अभिभावक के WhatsApp पर रसीद शेयर करें"
            >
              <MessageCircle className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* 2. Print */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer"
              title="रसीद प्रिंट करें"
            >
              <Printer className="w-3.5 h-3.5 text-amber-200" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* 3. Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              title="Download PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-white" />
              )}
              <span className="hidden sm:inline">PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 flex items-center justify-center transition cursor-pointer ml-0.5"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Format Switcher Strip (Full A4 / POS 80mm / 4-in-1 A4 / A6 Slip) */}
        <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1 text-[11px] font-bold">
            {isAdmissionReceipt && (
              <button
                type="button"
                onClick={() => setActiveFormat("full")}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                  activeFormat === "full"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                }`}
              >
                📄 Full A4
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveFormat("pos")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                activeFormat === "pos"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              🧾 POS 80mm
            </button>
            <button
              type="button"
              onClick={() => setActiveFormat("4in1")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                activeFormat === "4in1"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              📑 4-in-1 A4
            </button>
            <button
              type="button"
              onClick={() => setActiveFormat("a6")}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer shrink-0 ${
                activeFormat === "a6"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              🏷️ A6 Slip
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmissionReceipt && activeFormat !== "full" && (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hidden sm:inline">
                💡 पूरी जानकारी के लिए &quot;Full A4&quot; चुनें
              </span>
            )}
            <button
              type="button"
              onClick={() => setMaskSensitiveData((prev) => !prev)}
              className={`p-1.5 rounded-lg flex items-center justify-center border transition cursor-pointer shrink-0 shadow-xs ${
                maskSensitiveData
                  ? "bg-amber-600 text-white border-amber-500 hover:bg-amber-500"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              title={maskSensitiveData ? "संवेदनशील डेटा छिपा है (पूरा दिखाने के लिए क्लिक करें)" : "मोबाइल नंबर, आधार, पिता और माता का नाम 2 अक्षर के बाद xxxx में छुपाएं"}
              aria-label={maskSensitiveData ? "Show sensitive data" : "Mask sensitive data"}
            >
              {maskSensitiveData ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Modal Body: Direct Receipt Preview */}
        <div className="flex-1 overflow-auto p-2 sm:p-5 bg-slate-100 dark:bg-slate-950/70 flex flex-col items-center">
          {/* Inject Receipt & Thermal POS CSS */}
          <style>{DPS_RECEIPT_CSS}</style>
          <style>{POS_SLIP_CSS}</style>

          <div className="w-full flex justify-center py-1 overflow-x-auto">
            <div
              className="flex justify-center"
              style={{
                width: activeFormat === "4in1" ? "210mm" : activeFormat === "full" ? "100%" : "auto",
                maxWidth: activeFormat === "full" ? "700px" : undefined,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  activeFormat === "a6"
                    ? generateSingleA6SlipHtml(receiptData)
                    : activeFormat === "4in1"
                    ? generate4in1A4PageHtml([{ data: receiptData }])
                    : activeFormat === "full"
                    ? generateDpsReceiptHtml(receiptData, { layout: "full" })
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
