// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getMonthlyFees, getClasses, saveFee, markFeePaid, currentMonthStr, getSchoolFeeHistory, isStudentInClass, updateStudent, getLocalFees
} from "../../school-firebase";
import type { SchoolStudent, SchoolClass, MonthlyFee, School, SchoolDocumentPrintFields } from "../../school-types";
import { schoolPrintFieldEnabled } from "../../school-types";
import { CheckCircle, Clock, Download, ChevronLeft, ChevronRight, ChevronDown, IndianRupee, Users, TrendingUp, AlertCircle, Printer, MessageCircle, ReceiptText, Building2, Sparkles, X, Check, RotateCcw, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight, Bus, QrCode, Search, Filter, Loader2, Bell, FileSpreadsheet, FileText, Plus, Trash2 } from "lucide-react";
import { downloadFeeDocument, shareFeeReceiptOnWhatsApp, generateFeeDocumentPdfBlob, buildWhatsAppReceiptMessage } from "./feeDocument";
import { WhatsAppShareModal } from "./WhatsAppShareModal";

import { sendSchoolPushNotification, triggerMonthlySchoolFeePush } from "../../utils/schoolPushClient";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { ClassFeeStructureModal } from "./ClassFeeStructureModal";
import { QrFeeScannerModal } from "./QrFeeScannerModal";
import { BusTransportModal } from "./BusTransportModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode } from "./AdmissionFormPrintModal";
import { ClassFeeAlertBroadcastModal } from "./ClassFeeAlertBroadcastModal";
import {
  generateDpsReceiptHtml,
  generateSingleA6SlipHtml,
  generate4in1A4PageHtml,
  printA6SlipDirect,
  printDpsReceipts4in1,
  printDpsReceiptDirect,
  printPosSlipDirect,
  printReceiptHtmlInIframe,
  formatAcademicSession,
  formatConciseArrearsMonths,
  computeStudentFeeHistorySummary,
  DPS_RECEIPT_CSS,
  cleanLogoUrl,
  getSavedSchoolLogo,
  isAppLogo,
  type DpsReceiptData,
  type FeeReceiptItem
} from "./feeReceiptUtils";
import {
  calculateFifoAllocation,
  formatMonthLabel,
  type MonthDueItem,
  type FifoPaymentResult,
  type FifoMonthAllocation
} from "../../utils/feeFifoAllocation";

interface Props {
  schoolId: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  school?: School;
  sessionId: string;
  adminId: string;
  onBack?: () => void;
  initialTool?: "qr_scanner" | "bus" | "admission_receipt" | "class_rates" | "fee_alert" | "header";
}

export const FeeManager: React.FC<Props> = ({ schoolId, classId, className, schoolName, school, sessionId, adminId, onBack, initialTool }) => {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [fees, setFees] = useState<MonthlyFee[]>([]);
  const [feeHistory, setFeeHistory] = useState<MonthlyFee[]>([]);
  const [classNames, setClassNames] = useState<Record<string, string>>({});
  const [rawClasses, setRawClasses] = useState<SchoolClass[]>([]);
  const [month, setMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedDueSlipIds, setSelectedDueSlipIds] = useState<string[]>([]);
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [duesFilter, setDuesFilter] = useState<string>("all");
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [dpsModalFormat, setDpsModalFormat] = useState<"a6" | "pos">("pos");
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SchoolStudent | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");
  const [expandedStudentFeeIds, setExpandedStudentFeeIds] = useState<string[]>([]);
  const [showDuesBreakdownTable, setShowDuesBreakdownTable] = useState<boolean>(false);
  const [showAllFeesOverview, setShowAllFeesOverview] = useState<boolean>(true);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [whatsappModalTarget, setWhatsappModalTarget] = useState<{
    fee: MonthlyFee;
    student?: SchoolStudent;
    isDueDemand: boolean;
  } | null>(null);
  const [sendingMonthlyPush, setSendingMonthlyPush] = useState<boolean>(false);
  const [showClassFeeAlertModal, setShowClassFeeAlertModal] = useState<boolean>(false);

  const [pushBannerMsg, setPushBannerMsg] = useState<string | null>(null);

  // Custom payment collection modal state (optional custom paid amount / default print rate / fee heads)
  const [collectingFee, setCollectingFee] = useState<MonthlyFee | null>(null);
  const [customIncludeAdmissionFee, setCustomIncludeAdmissionFee] = useState<boolean>(false);
  const [customIncludeCautionMoney, setCustomIncludeCautionMoney] = useState<boolean>(false);
  const [customIncludeAnnualCharges, setCustomIncludeAnnualCharges] = useState<boolean>(false);
  const [customIncludeBusFee, setCustomIncludeBusFee] = useState<boolean>(false);
  const [customBusFeeAmount, setCustomBusFeeAmount] = useState<string>("1000");
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<string>("");
  const [customPaidAmount, setCustomPaidAmount] = useState<string>("");
  const [customPayMode, setCustomPayMode] = useState<string>("Cash");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [customChequeNo, setCustomChequeNo] = useState<string>("");
  const [customConcession, setCustomConcession] = useState<string>("");
  const [customPaymentDate, setCustomPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Admission Fee Collection Modal State
  const [showAdmissionModal, setShowAdmissionModal] = useState<boolean>(false);
  const [admSelectedStudentId, setAdmSelectedStudentId] = useState<string>("");
  const [admFeeItems, setAdmFeeItems] = useState<{ id: string; description: string; due: number }[]>([]);
  const [admConcession, setAdmConcession] = useState<number>(0);
  const [admPaidAmount, setAdmPaidAmount] = useState<string>("");
  const [admPaidManual, setAdmPaidManual] = useState<boolean>(false);
  const [admPayMode, setAdmPayMode] = useState<string>("Cash");
  const [admPayRef, setAdmPayRef] = useState<string>("");
  const [admPaymentDate, setAdmPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [admSaving, setAdmSaving] = useState<boolean>(false);
  const [admPrintStudio, setAdmPrintStudio] = useState<{
    open: boolean;
    student: SchoolStudent | null;
    fee: MonthlyFee | null;
    mode: AdmissionPrintMode;
  }>({ open: false, student: null, fee: null, mode: "receipt_only" });
  const [schoolDetails, setSchoolDetails] = useState<SchoolHeaderDetails>(() => ({
    schoolName: school?.name || schoolName || "School",
    tagline: school?.tagline || "",
    affiliation: school?.affiliation || "",
    address: school?.address || "",
    phone: school?.mobile || school?.phone || "",
    email: school?.email || "",
    logoUrl: getSavedSchoolLogo(school?.logoUrl, school?.id || schoolId),
    upiId: school?.upiId || "",
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
  }));

  useEffect(() => {
    const handleProfileUpdate = (e?: Event) => {
      const customEvent = e as CustomEvent<{ schoolId?: string; logoUrl?: string; name?: string }>;
      if (customEvent?.detail?.schoolId && customEvent.detail.schoolId !== (school?.id || schoolId)) return;
      const updatedLogo = customEvent?.detail?.logoUrl || getSavedSchoolLogo(undefined, school?.id || schoolId);
      setSchoolDetails(prev => ({
        ...prev,
        logoUrl: updatedLogo || prev.logoUrl,
        schoolName: customEvent?.detail?.name || prev.schoolName,
      }));
    };
    window.addEventListener("school-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("school-profile-updated", handleProfileUpdate);
  }, [school?.id, schoolId]);

  useEffect(() => {
    if (initialTool === "qr_scanner") setShowQrScannerModal(true);
    else if (initialTool === "bus") setShowBusModal(true);
    else if (initialTool === "admission_receipt") openAdmissionModalForStudent();
    else if (initialTool === "class_rates") setShowClassFeeModal(true);
    else if (initialTool === "fee_alert") setShowClassFeeAlertModal(true);
    else if (initialTool === "header") setShowSchoolHeaderModal(true);

    const handleOpenTool = (e: any) => {
      const tool = e?.detail?.tool;
      if (tool === "qr_scanner") setShowQrScannerModal(true);
      else if (tool === "bus") setShowBusModal(true);
      else if (tool === "admission_receipt") openAdmissionModalForStudent();
      else if (tool === "class_rates") setShowClassFeeModal(true);
      else if (tool === "fee_alert") setShowClassFeeAlertModal(true);
      else if (tool === "header") setShowSchoolHeaderModal(true);
    };
    window.addEventListener("open-fee-tool", handleOpenTool);
    return () => window.removeEventListener("open-fee-tool", handleOpenTool);
  }, [initialTool]);

  useEffect(() => {
    if (!school) return;
    setSchoolDetails(previous => ({
      ...previous,
      schoolName: school.name || previous.schoolName || "",
      tagline: school.tagline || previous.tagline || "",
      affiliation: school.affiliation || previous.affiliation || "",
      address: school.address || previous.address || "",
      phone: school.mobile || school.phone || previous.phone || "",
      email: school.email || previous.email || "",
      logoUrl: getSavedSchoolLogo(school.logoUrl, school.id) || previous.logoUrl,
      upiId: school.upiId ?? previous.upiId ?? "",
      principalName: school.principalName || previous.principalName || "",
      code: school.code || previous.code || "",
      principalPhone: school.principalPhone || previous.principalPhone || "",
      directorName: school.directorName || previous.directorName || "",
      directorPhone: school.directorPhone || previous.directorPhone || "",
      principalSignatureUrl: school.principalSignatureUrl || previous.principalSignatureUrl || "",
      directorSignatureUrl: school.directorSignatureUrl || previous.directorSignatureUrl || "",
      customFields: school.customFields || previous.customFields || [],
      documentPrintFields: school.documentPrintFields || previous.documentPrintFields || {},
    }));
  }, [school]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setFeeError(null);
    const [fetchedStudents, allFeeData, schoolClasses, feeHistory] = await Promise.all([
      getStudents(schoolId, classId, className),
      getMonthlyFees(schoolId, month, classId),
      getClasses(schoolId, sessionId),
      getSchoolFeeHistory(schoolId),
    ]);

    let allStudents = fetchedStudents || [];
    if (allStudents.length === 0 && classId) {
      // Fallback: fetch all school students and filter with isStudentInClass
      const allSchoolStudents = await getStudents(schoolId);
      allStudents = allSchoolStudents.filter(s => isStudentInClass(s, classId, className));
    }

    // Resilient session matching:
    // If students don't have matching sessionId string (or have demo_session vs 2026-27 vs undefined),
    // never discard students when loading the class roster!
    const matchesSession = (entitySessionId?: string) => {
      if (!sessionId || !entitySessionId) return true;
      const cleanA = sessionId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanB = entitySessionId.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
    };

    let sts = allStudents.filter(student => matchesSession(student.sessionId));
    if (sts.length === 0 && allStudents.length > 0) {
      sts = allStudents;
    }

    let feeData = allFeeData.filter(fee => matchesSession(fee.sessionId));
    if (feeData.length === 0 && allFeeData.length > 0) {
      feeData = allFeeData;
    }

    // Unpaid fee balances belong to the student and carry across academic sessions.
    const history = feeHistory;
    setFeeHistory(feeHistory);
    setClassNames(Object.fromEntries(schoolClasses.map((schoolClass: SchoolClass) => [schoolClass.id, schoolClass.name])));
    setRawClasses(schoolClasses);
    setStudents(sts);

    const getUnpaidDue = (f: MonthlyFee): number => {
      if (f.balanceDue !== undefined) {
        return Math.max(0, Number(f.balanceDue));
      }
      if (f.paid) {
        return 0;
      }
      const total = Number(f.amount || f.monthlyAmount || 0);
      const paid = Number(f.paidAmount || 0);
      return Math.max(0, total - paid);
    };

    // Create fee records for students without one
    const feeMap = new Map(feeData.map(f => [f.studentId, f]));
    const allFees: MonthlyFee[] = sts.map(student => {
      const existing = feeMap.get(student.id);

      const targetClass = schoolClasses.find((c: SchoolClass) => c.id === student.classId || isStudentInClass(student, c.id, c.name)) || schoolClasses.find(c => c.id === classId) || rawClasses[0];
      const struct = targetClass?.feeStructure;
      const defaultTuition = Number(student.monthlyFee || struct?.tuitionFee || 2000);
      const studentBusRate = student.usesBus ? Number(student.busFee !== undefined ? student.busFee : (struct?.busFee !== undefined ? struct.busFee : 1000)) : 0;
      const monthlyBaseRate = defaultTuition + studentBusRate;

      // ── SESSION-WIDE AUTOMATIC ARREARS ACCUMULATION ──
      // Indian school academic session runs from April (YYYY-04) to March
      let sessionStartYear = 2026;
      if (sessionId) {
        const ym = sessionId.match(/(\d{4})/);
        if (ym) sessionStartYear = parseInt(ym[1], 10);
      } else if (month) {
        const ym = month.match(/(\d{4})/);
        if (ym) sessionStartYear = parseInt(ym[1], 10);
      }
      let studentStartMonth = `${sessionStartYear}-04`;
      if (student.joinDate && student.joinDate.length >= 7) {
        const jm = student.joinDate.slice(0, 7);
        if (jm > studentStartMonth && jm <= month) {
          studentStartMonth = jm;
        }
      }

      // Generate all prior session months before the currently viewed month
      const priorSessionMonths: string[] = [];
      let [curY, curM] = studentStartMonth.split("-").map(Number);
      const [targetY, targetM] = month.split("-").map(Number);
      while (curY < targetY || (curY === targetY && curM < targetM)) {
        priorSessionMonths.push(`${curY}-${String(curM).padStart(2, "0")}`);
        curM++;
        if (curM > 12) {
          curM = 1;
          curY++;
        }
        if (priorSessionMonths.length > 24) break;
      }

      // Check each prior month in running session
      let calculatedArrears = 0;
      const unpaidMonthsSet = new Set<string>();

      priorSessionMonths.forEach(pMonth => {
        const histFee = history.find(h => h.studentId === student.id && h.month === pMonth);
        if (histFee) {
          if (histFee.paid && (!histFee.balanceDue || histFee.balanceDue === 0)) {
            // Paid, no arrears
          } else if (histFee.balanceDue !== undefined && histFee.balanceDue > 0) {
            calculatedArrears += Number(histFee.balanceDue);
            unpaidMonthsSet.add(pMonth);
          } else if (!histFee.paid) {
            const due = Number(histFee.balanceDue ?? histFee.monthlyAmount ?? histFee.amount ?? monthlyBaseRate);
            calculatedArrears += due;
            unpaidMonthsSet.add(pMonth);
          }
        } else {
          // Month was in running session but student has no payment recorded -> Unpaid due automatically accumulates!
          calculatedArrears += monthlyBaseRate;
          unpaidMonthsSet.add(pMonth);
        }
      });

      // Also include any legacy unpaid fees strictly prior to studentStartMonth
      const legacyUnpaid = history.filter(h => h.studentId === student.id && h.month < studentStartMonth && getUnpaidDue(h) > 0);
      legacyUnpaid.forEach(lf => {
        calculatedArrears += getUnpaidDue(lf);
        unpaidMonthsSet.add(lf.month);
      });

      const arrearsAmount = calculatedArrears;
      const arrearsMonths = Array.from(unpaidMonthsSet).sort();

      const monthlyAmount = Number(
        existing?.monthlyAmount ?? defaultTuition
      );

      // By default: Admission Fee, Caution Money, Annual Charges are FALSE (disabled)
      // Bus Fee: automatically TRUE if student avails bus (student.usesBus) or previously enabled
      const includeAdmissionFee = Boolean(existing?.includeAdmissionFee ?? false);
      const includeCautionMoney = Boolean(existing?.includeCautionMoney ?? false);
      const includeAnnualCharges = Boolean(existing?.includeAnnualCharges ?? false);
      const includeBusFee = Boolean(existing?.includeBusFee ?? student.usesBus ?? false);

      const admFee = includeAdmissionFee ? Number(struct?.admissionFee ?? 65000) : 0;
      const cauFee = includeCautionMoney ? Number(struct?.cautionMoney ?? 60000) : 0;
      const annFee = includeAnnualCharges ? Number(struct?.annualCharges ?? 23320) : 0;
      const busRate = Number(student.busFee !== undefined ? student.busFee : (existing?.busFeeAmount !== undefined ? existing.busFeeAmount : (struct?.busFee !== undefined ? struct.busFee : 1000)));
      const busFee = includeBusFee ? busRate : 0;
      const concession = Number(existing?.concession || 0);

      const currentMonthHeadsTotal = Math.max(0, monthlyAmount + admFee + cauFee + annFee + busFee - concession);

      const totalAmount = existing?.paid && (!existing.balanceDue || existing.balanceDue === 0)
        ? Number(existing.amount ?? currentMonthHeadsTotal)
        : currentMonthHeadsTotal + arrearsAmount;

      const isPaid = Boolean(existing?.paid);
      // Normalize legacy FIFO records where full lump-sum payment was saved onto an unpaid/partial current month
      const hasFifoSplitChildren = Boolean(
        existing?.receiptNo &&
        !String(existing.receiptNo).startsWith("FIFO-") &&
        history.some(h => h.studentId === student.id && h.month !== month && String(h.receiptNo || "").endsWith(String(existing.receiptNo)))
      );
      const rawExistingPaid = existing?.paidAmount !== undefined
        ? Number(existing.paidAmount)
        : (isPaid ? totalAmount : 0);
      const paidAmount = hasFifoSplitChildren && !isPaid && rawExistingPaid > currentMonthHeadsTotal
        ? Math.max(0, currentMonthHeadsTotal - Number(existing?.balanceDue ?? currentMonthHeadsTotal))
        : rawExistingPaid;

      const balanceDue = existing?.balanceDue !== undefined
        ? Number(existing.balanceDue)
        : (isPaid ? 0 : Math.max(0, currentMonthHeadsTotal - paidAmount));

      const lastReceiptPaidAmount = (existing as any)?.lastReceiptPaidAmount ?? (hasFifoSplitChildren ? rawExistingPaid : undefined);

      const effectiveArrears = isPaid && balanceDue === 0 ? Number(existing?.arrearsAmount || 0) : arrearsAmount;
      const effectiveArrearsMonths = isPaid && balanceDue === 0 ? (existing?.arrearsMonths || []) : arrearsMonths;
      const histSummary = computeStudentFeeHistorySummary({
        studentId: student.id,
        schoolId,
        currentMonth: month,
        currentFee: {
          ...(existing || {}),
          studentId: student.id,
          month,
          paid: isPaid && balanceDue === 0,
          paidAmount,
          balanceDue,
          lastReceiptPaidAmount,
          arrearsAmount: effectiveArrears,
          arrearsMonths: effectiveArrearsMonths,
        },
        feeHistory: history,
      });

      return {
        ...(existing || {}),
        lastReceiptPaidAmount,
        lastPaidAmount: histSummary.lastPaidAmount,
        lastPaidDate: histSummary.lastPaidDate,
        lastDueAmount: histSummary.lastDueAmount,
        lastDueDate: histSummary.lastDueDate,
        schoolId,
        sessionId: student.sessionId || sessionId,
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classId: student.classId,
        month,
        monthlyAmount,
        includeAdmissionFee,
        includeCautionMoney,
        includeAnnualCharges,
        includeBusFee,
        busFeeAmount: busFee,
        busRoute: student.busRoute || existing?.busRoute || "Route 1",
        arrearsAmount: effectiveArrears,
        arrearsMonths: effectiveArrearsMonths,
        amount: totalAmount,
        paid: isPaid && balanceDue === 0,
        paidAmount,
        balanceDue,
        concession,
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
          Number(stored.balanceDue ?? 0) !== Number(fee.balanceDue ?? 0) ||
          Boolean(stored.includeAdmissionFee) !== Boolean(fee.includeAdmissionFee) ||
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

  useEffect(() => { loadData(); }, [month, classId, className, sessionId, schoolId]);

  const setFeeStatus = async (fee: MonthlyFee, paid: boolean) => {
    setSaving(fee.studentId);
    setFeeError(null);

    const total = Number(fee.amount || fee.monthlyAmount || 0);
    const paidAmount = paid ? total : 0;
    const balanceDue = paid ? 0 : total;
    const receiptNo = paid ? (fee.receiptNo || `RCP-${Date.now()}`) : undefined;
    const paidDate = paid ? new Date().toISOString() : undefined;
    const paidBy = paid ? adminId : undefined;

    const updatedFee: MonthlyFee = {
      ...fee,
      month,
      paid,
      paidAmount,
      balanceDue,
      receiptNo,
      paidDate,
      paidBy,
      lastReceiptPaidAmount: paid ? total : undefined,
      payModeInfo: paid ? fee.payModeInfo : undefined,
      note: paid ? "Full Paid" : "Unpaid Due",
      items: paid ? fee.items : [],
    };

    setFees(prev =>
      prev.map(f => f.studentId === fee.studentId ? updatedFee : f)
    );

    try {
      if (paid) {
        await saveFee(updatedFee);
        await markFeePaid(schoolId, fee.studentId, month, adminId);
      } else {
        await saveFee(updatedFee);
      }
      await loadData(true);
    } catch (error) {
      console.error(`Could not mark fee ${paid ? "paid" : "unpaid"}:`, error);
      setFeeError(`Could not mark ${fee.studentName}'s fee ${paid ? "paid" : "unpaid"}. Please retry.`);
      await loadData(true);
    } finally {
      setSaving(null);
    }
  };

  const handleToggleStudentBus = async (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const newBusState = !student.usesBus;
    setSaving(studentId);
    try {
      await updateStudent(schoolId, studentId, { usesBus: newBusState });
      const targetClass = rawClasses.find(c => c.id === student.classId);
      const struct = targetClass?.feeStructure;
      const busRate = Number(student.busFee || struct?.busFee || 1000);
      const fee = fees.find(f => f.studentId === studentId);
      if (fee) {
        const updatedFee: MonthlyFee = {
          ...fee,
          includeBusFee: newBusState,
          busFeeAmount: newBusState ? busRate : 0,
          busRoute: student.busRoute || "Route 1",
        };
        await saveFee(updatedFee);
      }
      await loadData(true);
    } catch (err) {
      console.error("Error toggling bus service:", err);
    } finally {
      setSaving(null);
    }
  };

  const handleOpenPaymentModal = (fee: MonthlyFee) => {
    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;
    const student = students.find(s => s.id === fee.studentId);
    setCollectingFee(fee);
    setCustomIncludeAdmissionFee(Boolean(fee.includeAdmissionFee ?? false));
    setCustomIncludeCautionMoney(Boolean(fee.includeCautionMoney ?? false));
    setCustomIncludeAnnualCharges(Boolean(fee.includeAnnualCharges ?? false));
    setCustomIncludeBusFee(Boolean(fee.includeBusFee ?? student?.usesBus ?? false));
    const initialBusFee = fee.busFeeAmount !== undefined && fee.busFeeAmount > 0
      ? fee.busFeeAmount
      : (student?.busFee !== undefined && student.busFee > 0
        ? student.busFee
        : (struct?.busFee !== undefined ? struct.busFee : 1000));
    setCustomBusFeeAmount(String(initialBusFee));
    const baseMonthly = Number(fee.monthlyAmount ?? struct?.tuitionFee ?? 2000);
    setCustomMonthlyAmount(String(baseMonthly));

    const todayDateStr = fee.paidDate ? fee.paidDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setCustomPaymentDate(todayDateStr);

    // Parse day cleanly without timezone shifts (e.g. 2026-11-09 -> 9)
    const dayParts = todayDateStr.split("-");
    const paymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
    const isEarlyBird = paymentDay <= 10;
    const earlyDisc = isEarlyBird && baseMonthly > 0 ? Math.round(baseMonthly * 0.05) : 0;
    const effectiveConcession = (fee.earlyDiscount && fee.earlyDiscount > 0)
      ? fee.earlyDiscount
      : (earlyDisc > 0 ? earlyDisc : Number(fee.concession || 0));
    setCustomConcession(effectiveConcession > 0 ? String(effectiveConcession) : "");

    // Auto calculate net payable: Old Arrears (no discount) + Discounted Current Tuition (5% off)
    const arrears = Number(fee.arrearsAmount || 0);
    const autoNetPayable = arrears + Math.max(0, baseMonthly - earlyDisc);

    // Auto pre-fill with net payable (e.g. 300 arrears + 360 current = 660) if new collection, or prior paidAmount
    const initialPaid = fee.paid && Number(fee.paidAmount || 0) > 0
      ? String(fee.paidAmount)
      : String(autoNetPayable);
    setCustomPaidAmount(initialPaid);

    setCustomPayMode(fee.payModeInfo?.payMode || "Cash");
    setCustomBankName(fee.payModeInfo?.bank || "");
    setCustomChequeNo(fee.payModeInfo?.number || "");
  };

  const buildAdmissionItemsForStudent = (targetStudent: SchoolStudent | null) => {
    if (!targetStudent) return [];
    const cls = rawClasses.find(c => c.id === targetStudent.classId);
    const fs = cls?.feeStructure;
    const items: { id: string; description: string; due: number }[] = [];
    if (fs) {
      if (Number(fs.admissionFee) > 0) items.push({ id: "adm_1", description: "Admission Fee (प्रवेश शुल्क)", due: Number(fs.admissionFee) });
      if (Number(fs.cautionMoney) > 0) items.push({ id: "adm_2", description: "Registration / Form Fee", due: Number(fs.cautionMoney) });
      if (Number(fs.annualCharges) > 0) items.push({ id: "adm_3", description: "Annual / Development Fund", due: Number(fs.annualCharges) });
      if (Number(fs.tuitionFee) > 0) items.push({ id: "adm_4", description: "1st Month Tuition Fee", due: Number(fs.tuitionFee) });
      if (Array.isArray(fs.customHeads)) {
        fs.customHeads.forEach((h, i) => {
          if (Number(h.amount) > 0) items.push({ id: `adm_c_${i}`, description: h.name, due: Number(h.amount) });
        });
      }
      if (targetStudent.usesBus && Number(fs.busFee || targetStudent.busFee || 0) > 0) {
        items.push({ id: "adm_bus", description: `Transport / Bus Fee (${targetStudent.busRoute || "Bus"})`, due: Number(targetStudent.busFee || fs.busFee) });
      }
    }
    if (items.length === 0) {
      const defTuition = Number(cls?.defaultFee || targetStudent.monthlyFee || 0);
      items.push(
        { id: "adm_1", description: "Admission Fee (नामांकन / प्रवेश शुल्क)", due: 1500 },
        { id: "adm_2", description: "Registration & Form Fee (पंजीकरण शुल्क)", due: 250 },
        { id: "adm_3", description: "Annual / Development Fund (वार्षिक विकास कोष)", due: 800 },
        { id: "adm_4", description: "Student Kit, ID Card & Diary (किट व डायरी)", due: 350 }
      );
      if (defTuition > 0) items.push({ id: "adm_tui", description: "1st Month Tuition Fee (प्रथम माह शुल्क)", due: defTuition });
      if (targetStudent.usesBus && Number(targetStudent.busFee || 0) > 0) {
        items.push({ id: "adm_bus", description: `Transport / Bus Fee (${targetStudent.busRoute || "Bus"})`, due: Number(targetStudent.busFee) });
      }
    }
    return items;
  };

  const openAdmissionModalForStudent = (targetStudent?: SchoolStudent | null) => {
    const s = targetStudent || students[0] || null;
    setAdmSelectedStudentId(s ? s.id : "");
    const items = buildAdmissionItemsForStudent(s);
    setAdmFeeItems(items);
    setAdmConcession(0);
    const gross = items.reduce((sum, it) => sum + (Number(it.due) || 0), 0);
    setAdmPaidAmount(String(gross));
    setAdmPaidManual(false);
    setAdmPayMode("Cash");
    setAdmPayRef("");
    setAdmPaymentDate(new Date().toISOString().slice(0, 10));
    setShowAdmissionModal(true);
  };

  const handleSelectAdmStudent = (sId: string) => {
    setAdmSelectedStudentId(sId);
    const s = students.find(item => item.id === sId) || null;
    const items = buildAdmissionItemsForStudent(s);
    setAdmFeeItems(items);
    setAdmConcession(0);
    const gross = items.reduce((sum, it) => sum + (Number(it.due) || 0), 0);
    setAdmPaidAmount(String(gross));
    setAdmPaidManual(false);
  };

  const admGross = admFeeItems.reduce((sum, it) => sum + (Number(it.due) || 0), 0);
  const admNet = Math.max(0, admGross - (Number(admConcession) || 0));

  const handleSaveAdmissionFee = async (mode: AdmissionPrintMode = "receipt_only") => {
    const student = students.find(s => s.id === admSelectedStudentId);
    if (!student) {
      setFeeError("कृपया पहले एक छात्र चुनें!");
      return;
    }
    setFeeError(null);
    setAdmSaving(true);
    try {
      const paidAmt = Math.max(0, Number(admPaidAmount) || 0);
      const balanceAmt = Math.max(0, admNet - paidAmt);
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();

      const finalItems = admFeeItems
        .filter(it => it.description.trim() && Number(it.due) >= 0)
        .map((it, idx) => ({
          id: it.id,
          slNo: idx + 1,
          description: it.description.trim(),
          due: Number(it.due) || 0,
          con: idx === 0 ? Math.min(Number(it.due) || 0, Number(admConcession) || 0) : 0,
          paid: Number(it.due) || 0,
        }));

      const admissionFeeRecord: MonthlyFee = {
        schoolId,
        sessionId: student.sessionId || sessionId || "2026-27",
        studentId: student.id,
        studentName: student.name,
        rollNo: student.rollNo,
        classId: student.classId,
        month: paidIso.slice(0, 7),
        amount: admNet,
        monthlyAmount: Number(student.monthlyFee) || 0,
        paid: paidAmt >= admNet && admNet > 0,
        paidDate: paidIso,
        paidBy: adminId,
        receiptNo,
        paidAmount: paidAmt,
        balanceDue: balanceAmt,
        concession: Number(admConcession) || 0,
        feeType: "admission",
        receiptCategory: "admission",
        includeBusFee: Boolean(student.usesBus),
        busFeeAmount: student.usesBus ? Number(student.busFee) || 0 : 0,
        busRoute: student.busRoute,
        payModeInfo: {
          payMode: admPayMode,
          date: new Date(admPaymentDate || Date.now()).toLocaleDateString("en-IN"),
          bank: admPayMode === "Cash" ? "School Counter" : admPayMode,
          number: admPayRef.trim() || "-",
        },
        items: finalItems,
      };

      await saveFee(admissionFeeRecord);

      if (!student.admissionReceiptNo) {
        await updateStudent(schoolId, student.id, { admissionReceiptNo: receiptNo }).catch(() => {});
      }

      setShowAdmissionModal(false);
      loadData(true);

      setAdmPrintStudio({
        open: true,
        student,
        fee: admissionFeeRecord,
        mode,
      });
    } catch (err: any) {
      console.error("Admission fee error:", err);
      setFeeError("Admission fee save करने में समस्या आई: " + (err?.message || "कृपया दोबारा कोशिश करें।"));
    } finally {
      setAdmSaving(false);
    }
  };

  const handleConfirmPayment = async (openDpsReceipt: boolean, markUnpaidDirectly = false) => {
    if (!collectingFee) return;
    const fee = collectingFee;
    setSaving(fee.studentId);
    setFeeError(null);

    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;
    const student = students.find(s => s.id === fee.studentId);

    const monthlyAmount = Number(customMonthlyAmount) || Number(struct?.tuitionFee || 2000);
    const admAmount = customIncludeAdmissionFee ? Number(struct?.admissionFee ?? 65000) : 0;
    const cauAmount = customIncludeCautionMoney ? Number(struct?.cautionMoney ?? 60000) : 0;
    const annAmount = customIncludeAnnualCharges ? Number(struct?.annualCharges ?? 23320) : 0;
    const busRate = Number(customBusFeeAmount) || 0;
    const busAmount = customIncludeBusFee ? busRate : 0;
    const arrearsAmount = Number(fee.arrearsAmount || 0);

    // Calculate early bird 5% discount based on payment date (10th or earlier)
    const dateStr = customPaymentDate || new Date().toISOString().slice(0, 10);
    const dayParts = dateStr.split("-");
    const paymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
    const isEarlyBirdEligible = paymentDay <= 10;
    const earlyDiscount = isEarlyBirdEligible && monthlyAmount > 0 ? Math.round(monthlyAmount * 0.05) : 0;

    const manualConcession = Number(customConcession) || 0;
    const totalConcession = Math.max(manualConcession, earlyDiscount);

    // 5% discount applies ONLY to current month regular tuition fee (e.g. ₹400 -> ₹380), NEVER to old arrears!
    const currentMonthTuition = Math.max(0, monthlyAmount - earlyDiscount);
    const currentMonthHeadDue = Math.max(0, currentMonthTuition + admAmount + cauAmount + annAmount + busAmount - (manualConcession > earlyDiscount ? manualConcession - earlyDiscount : 0));
    const totalBill = currentMonthHeadDue + arrearsAmount;

    if (markUnpaidDirectly || customPaidAmount.trim() === "0") {
      // Clean reset to Unpaid: 0 paid, full balance due, remove receiptNo and payment flags
      const resetFee: MonthlyFee = {
        ...fee,
        month: fee.month,
        monthlyAmount,
        includeAdmissionFee: customIncludeAdmissionFee,
        includeCautionMoney: customIncludeCautionMoney,
        includeAnnualCharges: customIncludeAnnualCharges,
        includeBusFee: customIncludeBusFee,
        busFeeAmount: busAmount,
        busRoute: student?.busRoute || fee.busRoute || "Route 1",
        amount: currentMonthHeadDue + arrearsAmount,
        paid: false,
        paidAmount: 0,
        balanceDue: currentMonthHeadDue,
        arrearsAmount,
        arrearsMonths: fee.arrearsMonths || [],
        concession,
        paidDate: undefined,
        paidBy: undefined,
        receiptNo: undefined,
        payModeInfo: undefined,
        lastReceiptPaidAmount: undefined,
        items: [],
        note: "Unpaid Due",
      };
      await saveFee(resetFee);
      setCollectingFee(null);
      await loadData(true);
      setSaving(null);
      return;
    }

    if (customPaidAmount.trim() === "") {
      setFeeError("कृपया जमा की गई राशि (₹) दर्ज करें! यदि छात्र ने कोई राशि नहीं दी है, तो 'Unpaid (₹0)' चुनें।");
      setSaving(null);
      return;
    }

    const effectivePaid = Math.max(0, Number(customPaidAmount));
    const isPaid = effectivePaid >= totalBill && totalBill > 0;

    const receiptNo = fee.receiptNo || `DPS-RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date();
    let paidDate: string;
    if (customPaymentDate) {
      const selected = new Date(customPaymentDate);
      if (selected.toDateString() === now.toDateString()) {
        paidDate = now.toISOString();
      } else {
        selected.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        paidDate = selected.toISOString();
      }
    } else {
      paidDate = now.toISOString();
    }
    const payModeInfo = {
      payMode: customPayMode,
      date: new Date(paidDate).toLocaleDateString("en-IN"),
      bank: customBankName,
      number: customChequeNo,
    };

    // ── FIFO MULTI-MONTH ALLOCATION EXECUTION ──
    // Build complete chronological unpaid months array for this student
    const allMonthsSet = new Set<string>();
    if (fee.arrearsMonths && Array.isArray(fee.arrearsMonths)) {
      fee.arrearsMonths.forEach(m => allMonthsSet.add(m));
    }
    allMonthsSet.add(fee.month);
    const sortedMonths = Array.from(allMonthsSet).sort();

    const localFeeList = getLocalFees(schoolId);
    const dueItems: MonthDueItem[] = sortedMonths
      .map(m => {
        const isCur = m === fee.month;
        if (isCur) {
          return {
            month: m,
            label: formatMonthLabel(m),
            monthlyAmount,
            totalDue: currentMonthHeadDue,
            alreadyPaid: 0,
            totalBill: currentMonthHeadDue,
          };
        }
        const hist = localFeeList.find(h => h.studentId === fee.studentId && h.month === m)
          || feeHistory.find(h => h.studentId === fee.studentId && h.month === m);
        const stdRate = monthlyAmount + busAmount;
        const alreadyPaid = Number(hist?.paidAmount || 0);
        const due = hist?.balanceDue !== undefined
          ? Number(hist.balanceDue)
          : (hist?.paid ? 0 : Number(hist?.amount || hist?.monthlyAmount || stdRate));

        return {
          month: m,
          label: formatMonthLabel(m),
          monthlyAmount: Number(hist?.monthlyAmount || stdRate),
          totalDue: due,
          alreadyPaid,
          totalBill: Number(hist?.amount || stdRate),
        };
      })
      .filter(item => item.totalDue > 0 || item.month === fee.month);

    const fifoResult = calculateFifoAllocation({
      unpaidMonths: dueItems,
      paymentAmount: markUnpaidDirectly ? 0 : effectivePaid,
      upcomingMonthRate: monthlyAmount,
    });

    // Settle every month in the database via FIFO!
    for (const alloc of fifoResult.allocations) {
      const existingRecord = localFeeList.find(h => h.studentId === fee.studentId && h.month === alloc.month)
        || feeHistory.find(h => h.studentId === fee.studentId && h.month === alloc.month);
      const isCurrentMonthRecord = alloc.month === fee.month;

      const recordToSave: MonthlyFee = {
        ...(existingRecord || {}),
        schoolId,
        sessionId: student?.sessionId || sessionId,
        studentId: fee.studentId,
        studentName: fee.studentName,
        rollNo: fee.rollNo,
        classId: fee.classId,
        month: alloc.month,
        monthlyAmount: isCurrentMonthRecord ? monthlyAmount : (existingRecord?.monthlyAmount ?? monthlyAmount),
        includeAdmissionFee: isCurrentMonthRecord ? customIncludeAdmissionFee : Boolean(existingRecord?.includeAdmissionFee),
        includeCautionMoney: isCurrentMonthRecord ? customIncludeCautionMoney : Boolean(existingRecord?.includeCautionMoney),
        includeAnnualCharges: isCurrentMonthRecord ? customIncludeAnnualCharges : Boolean(existingRecord?.includeAnnualCharges),
        includeBusFee: isCurrentMonthRecord ? customIncludeBusFee : Boolean(existingRecord?.includeBusFee),
        busFeeAmount: isCurrentMonthRecord ? busAmount : (existingRecord?.busFeeAmount ?? 0),
        busRoute: student?.busRoute || fee.busRoute || "Route 1",
        amount: isCurrentMonthRecord ? totalBill : (existingRecord?.amount ?? alloc.originalDue),
        paid: alloc.status === "PAID",
        paidAmount: alloc.totalPaidAfter,
        balanceDue: alloc.balanceDueAfter, // Specific to this month
        paidDate: alloc.allocatedThisTime > 0 ? paidDate : existingRecord?.paidDate,
        paidBy: alloc.allocatedThisTime > 0 ? adminId : existingRecord?.paidBy,
        receiptNo: alloc.allocatedThisTime > 0 ? (isCurrentMonthRecord ? receiptNo : `FIFO-${alloc.month}-${receiptNo}`) : existingRecord?.receiptNo,
        payModeInfo: alloc.allocatedThisTime > 0 ? payModeInfo : existingRecord?.payModeInfo,
        note: alloc.status === "PAID"
          ? `Full Paid (Receipt: ${receiptNo})`
          : alloc.status === "PARTIAL"
          ? `Partial Paid ₹${alloc.allocatedThisTime} (Balance due: ₹${alloc.balanceDueAfter}) (Receipt: ${receiptNo})`
          : "Unpaid Due",
      };

      try {
        await saveFee(recordToSave);
      } catch (saveErr) {
        console.warn(`Could not save month ${alloc.month} record:`, saveErr);
      }
    }

    const currentAlloc = fifoResult.allocations.find(a => a.month === fee.month);
    const priorRemainingMonths = fifoResult.allocations
      .filter(a => a.month < fee.month && a.balanceDueAfter > 0)
      .map(a => a.month);
    const priorRemainingArrears = fifoResult.allocations
      .filter(a => a.month < fee.month)
      .reduce((sum, a) => sum + a.balanceDueAfter, 0);

    const isCurrentFullPaid = currentAlloc ? currentAlloc.status === "PAID" : false;
    const currentMonthBalance = currentAlloc ? currentAlloc.balanceDueAfter : currentMonthHeadDue;
    const currentMonthPaidAmount = currentAlloc ? currentAlloc.totalPaidAfter : 0;

    // Persist only THIS month's allocated paidAmount so Student Ledger never double-counts FIFO months!
    const updatedFee: MonthlyFee = {
      ...fee,
      month,
      monthlyAmount,
      includeAdmissionFee: customIncludeAdmissionFee,
      includeCautionMoney: customIncludeCautionMoney,
      includeAnnualCharges: customIncludeAnnualCharges,
      includeBusFee: customIncludeBusFee,
      busFeeAmount: busAmount,
      busRoute: student?.busRoute || fee.busRoute || "Route 1",
      amount: currentMonthHeadDue + priorRemainingArrears,
      paid: isCurrentFullPaid && priorRemainingArrears === 0,
      paidAmount: currentMonthPaidAmount,
      ...(effectivePaid > 0 ? { lastReceiptPaidAmount: effectivePaid } : {}),
      balanceDue: currentMonthBalance,
      arrearsAmount: priorRemainingArrears,
      arrearsMonths: priorRemainingMonths,
      concession: totalConcession,
      earlyDiscount: earlyDiscount,
      paidDate: effectivePaid > 0 ? paidDate : undefined,
      paidBy: effectivePaid > 0 ? adminId : undefined,
      receiptNo: effectivePaid > 0 ? receiptNo : undefined,
      payModeInfo,
      items: fifoResult.receiptItems.length > 0 ? fifoResult.receiptItems : [],
      note: earlyDiscount > 0
        ? `Paid on/before 10th with 5% Early Bird Concession (-₹${earlyDiscount}) (Receipt: ${receiptNo})`
        : `${fifoResult.summaryHindi} (Receipt: ${receiptNo})`,
    } as MonthlyFee;

    // Snapshot for immediate receipt printing showing full payment collected & total remaining session balance
    const receiptFeeSnapshot: MonthlyFee = {
      ...updatedFee,
      paidAmount: effectivePaid,
      balanceDue: fifoResult.totalOutstandingDueAfter,
      earlyDiscount: earlyDiscount,
    };

    // Optimistic UI update
    setFees(prev => prev.map(f => f.studentId === fee.studentId ? updatedFee : f));
    setCollectingFee(null);

    try {
      await saveFee(updatedFee);
      if (updatedFee.paid) {
        await markFeePaid(schoolId, fee.studentId, month, adminId);
      }

      // Sync student bus status and custom bus fee if modified
      if (student) {
        const studentPatch: Partial<SchoolStudent> = {};
        if (Boolean(student.usesBus) !== customIncludeBusFee) {
          studentPatch.usesBus = customIncludeBusFee;
        }
        if (customIncludeBusFee && Number(customBusFeeAmount) !== student.busFee) {
          studentPatch.busFee = Number(customBusFeeAmount);
        }
        if (Object.keys(studentPatch).length > 0) {
          try {
            await updateStudent(schoolId, student.id, studentPatch);
          } catch (syncErr) {
            console.warn("Could not sync student bus details:", syncErr);
          }
        }
      }

      await loadData(true);
      if (effectivePaid > 0) {
        const remAfter = Math.max(0, Number(fifoResult.totalOutstandingDueAfter || 0));
        void sendSchoolPushNotification({
          schoolId,
          studentIds: [fee.studentId],
          type: "FEE_RECEIPT",
          title: `✅ ${schoolDetails.schoolName || "School"} • शुल्क जमा रसीद`,
          body: `${fee.studentName} का ₹${effectivePaid.toLocaleString("en-IN")} शुल्क जमा हो गया है (रसीद: ${receiptNo})। ${remAfter > 0 ? `शेष बकाया: ₹${remAfter.toLocaleString("en-IN")}` : "कोई बकाया नहीं!"}`,
          url: `/?schoolPortal=1&studentId=${encodeURIComponent(fee.studentId)}&schoolTab=fees`,
          urgent: true,
        });
      }
      if (openDpsReceipt && effectivePaid > 0) {
        setDpsReceiptFee(receiptFeeSnapshot);
      }
    } catch (error) {
      console.error("Could not save fee:", error);
      setFeeError(`Could not save ${fee.studentName}'s fee. Please retry.`);
      await loadData(true);
    } finally {
      setSaving(null);
    }
  };

  const handleBroadcastMonthlyFeePush = async () => {
    if (sendingMonthlyPush) return;
    setSendingMonthlyPush(true);
    setPushBannerMsg(null);
    try {
      const mLabel = formatMonthLabel(month);
      const duesList = fees
        .map((f) => {
          const st = students.find((s) => s.id === f.studentId);
          const curBal = f.balanceDue !== undefined ? Number(f.balanceDue) : (f.paid ? 0 : Number(f.amount || 0));
          const arrBal = f.paid ? 0 : Number(f.arrearsAmount || 0);
          const totalPending = Math.max(0, curBal + arrBal);
          return {
            studentId: f.studentId,
            schoolId,
            schoolName: schoolDetails.schoolName || schoolName || "School",
            studentName: f.studentName || st?.name || "Student",
            classId: f.classId || st?.classId || "",
            className: classNames[f.classId] || (st as any)?.className || "",
            rollNo: f.rollNo || st?.rollNo || "",
            pendingDues: totalPending,
            monthlyFee: Number(f.monthlyAmount || st?.monthlyFee || 0),
          };
        })
        .filter((d) => d.pendingDues > 0);

      if (duesList.length === 0) {
        setPushBannerMsg("Sabhi chhatron ki fee jama hai — kisi par koi बकाया nahi hai!");
        return;
      }

      const res = await triggerMonthlySchoolFeePush({
        schoolId,
        schoolName: schoolDetails.schoolName || schoolName || "School",
        monthLabel: mLabel,
        duesList,
      });

      setPushBannerMsg(
        res.delivered > 0
          ? `🔔 ${res.delivered} subscribed parent devices par ${mLabel} ka exact बकाया Lock Screen Push bhej diya gaya!`
          : `✅ ${duesList.length} chhatron ka बकाया sync ho gaya! Jaise hi parent Student Portal me 'Enable Alerts' ON karenge, unke phone par Lock Screen notification jayega.`
      );
    } finally {
      setSendingMonthlyPush(false);
      setTimeout(() => setPushBannerMsg(null), 8000);
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

  const paidFees = fees.filter(f => f.paid && (!f.balanceDue || f.balanceDue === 0));
  const partialFees = fees.filter(f => (Number(f.paidAmount || 0) > 0 && Number(f.balanceDue || 0) > 0) || (!f.paid && Number(f.paidAmount || 0) > 0));
  const unpaidFees = fees.filter(f => !f.paid || (f.balanceDue !== undefined && f.balanceDue > 0));
  const busFees = fees.filter(f => {
    const s = students.find(item => item.id === f.studentId);
    return Boolean(f.includeBusFee || s?.usesBus);
  });
  const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const collectedAmount = fees.reduce((sum, f) => sum + (f.paidAmount !== undefined ? Number(f.paidAmount) : (f.paid ? Number(f.amount || 0) : 0)), 0);
  const pendingAmount = Math.max(0, totalAmount - collectedAmount);

  const filteredFees = fees.filter(f => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const s = students.find(item => item.id === f.studentId);
      const nameMatch = (f.studentName || "").toLowerCase().includes(q);
      const rollMatch = (f.rollNo || "").toLowerCase().includes(q);
      const admMatch = (s?.admissionNo || "").toLowerCase().includes(q);
      if (!nameMatch && !rollMatch && !admMatch) return false;
    }

    if (duesFilter === "paid") return f.paid && (!f.balanceDue || f.balanceDue === 0);
    if (duesFilter === "partial") return (Number(f.paidAmount || 0) > 0 && Number(f.balanceDue || 0) > 0) || (!f.paid && Number(f.paidAmount || 0) > 0);
    if (duesFilter === "unpaid") return !f.paid || (f.balanceDue !== undefined && f.balanceDue > 0);
    if (duesFilter === "bus") {
      const s = students.find(item => item.id === f.studentId);
      return Boolean(f.includeBusFee || s?.usesBus);
    }
    if (duesFilter === "due3") return !f.paid && (f.arrearsMonths?.length || 0) >= 3;
    if (duesFilter === "due6") return !f.paid && (f.arrearsMonths?.length || 0) >= 6;
    if (duesFilter === "due8") return !f.paid && (f.arrearsMonths?.length || 0) >= 8;
    return true;
  });

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
      showSchoolField("code") && schoolDetails.code && schoolDetails.code !== (school as any)?.lockCode && schoolDetails.code !== "0002" ? `Reg. No: ${schoolDetails.code}` : "",
      ...(showSchoolField("customFields") ? (schoolDetails.customFields || [])
        .filter(field => field.label?.trim() && field.value?.trim())
        .map(field => `${field.label}: ${field.value}`) : []),
    ].filter(Boolean).map(value => `<div>${escapeHtml(value)}</div>`).join("");
    const cleanedQuickLogo = getSavedSchoolLogo(schoolDetails.logoUrl || school?.logoUrl);
    const schoolLogoHtml = cleanedQuickLogo
      ? `<img src="${escapeHtml(cleanedQuickLogo)}" alt="Logo" style="width:38px;height:38px;object-fit:contain;border-radius:6px;border:1px solid #cbd5e1;background:#ffffff;margin-right:8px;flex-shrink:0;" />`
      : "";
    return `<article class="receipt">
      <div class="receipt-heading" style="display:flex;align-items:center;gap:6px;">
        ${schoolLogoHtml}
        <div class="school-heading-box" style="flex:1;min-width:0;">
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

  const toggleStudentFeeExpand = (studentId: string) => {
    setExpandedStudentFeeIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getFeeItemsForStudent = (fee: MonthlyFee): FeeReceiptItem[] => {
    const arrears = Number(fee.arrearsAmount || 0);
    const isPaid = Boolean(fee.paid);
    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;
    const baseFee = Number(fee.monthlyAmount ?? fee.amount ?? struct?.tuitionFee ?? 2000);
    const effectivePaid = fee.paidAmount !== undefined ? Number(fee.paidAmount) : (fee.paid ? baseFee : 0);

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
            paid: isPaid ? arrears : (fee.paidAmount && fee.paidAmount > (fee.monthlyAmount || 0) ? Math.min(arrears, fee.paidAmount - (fee.monthlyAmount || 0)) : 0),
          }
        ];
      }
      return fee.items;
    }

    const itemsList: FeeReceiptItem[] = [];
    let sl = 1;

    // 1. Tuition Fee (Default / Standard Monthly Fee)
    itemsList.push({
      id: "tuition",
      slNo: sl++,
      description: "Tuition Fee",
      due: baseFee,
      con: Number(fee.concession || 0),
      paid: isPaid ? effectivePaid : (fee.paidAmount || 0),
    });

    // 2. Admission Fee — ONLY IF ENABLED (Default is OFF)
    if (fee.includeAdmissionFee) {
      const adm = Number(struct?.admissionFee ?? 65000);
      itemsList.push({
        id: "admission",
        slNo: sl++,
        description: "Admission Fee",
        due: adm,
        con: 0,
        paid: isPaid ? adm : 0,
      });
    }

    // 3. Caution Money — ONLY IF ENABLED (Default is OFF)
    if (fee.includeCautionMoney) {
      const cau = Number(struct?.cautionMoney ?? 60000);
      itemsList.push({
        id: "caution",
        slNo: sl++,
        description: "Caution Money",
        due: cau,
        con: 0,
        paid: isPaid ? cau : 0,
      });
    }

    // 4. Annual Charges — ONLY IF ENABLED (Default is OFF)
    if (fee.includeAnnualCharges) {
      const ann = Number(struct?.annualCharges ?? 23320);
      itemsList.push({
        id: "annual",
        slNo: sl++,
        description: "Annual Charges",
        due: ann,
        con: 0,
        paid: isPaid ? ann : 0,
      });
    }

    // 5. Bus Fee — ONLY IF ENABLED (Default is OFF)
    if (fee.includeBusFee) {
      const student = students.find(s => s.id === fee.studentId);
      const bus = Number(fee.busFeeAmount !== undefined ? fee.busFeeAmount : (student?.busFee !== undefined ? student.busFee : (struct?.busFee ?? 1000)));
      itemsList.push({
        id: "bus",
        slNo: sl++,
        description: `Bus Fee${student?.busRoute ? ` (${student.busRoute})` : ""}`,
        due: bus,
        con: 0,
        paid: isPaid ? bus : (fee.paidAmount && fee.paidAmount > baseFee ? Math.min(bus, fee.paidAmount - baseFee) : 0),
      });
    }

    // 6. Back Due / Previous Arrears
    if (arrears > 0) {
      itemsList.push({
        id: "arrears",
        slNo: sl++,
        description: `Back Due / Previous Arrears${formattedMonths}`,
        due: arrears,
        con: 0,
        paid: isPaid ? arrears : (fee.paidAmount && fee.paidAmount > baseFee ? Math.min(arrears, fee.paidAmount - baseFee) : 0),
      });
    }

    return itemsList;
  };

  const getDpsDataForFee = (fee: MonthlyFee): DpsReceiptData => {
    const student = students.find(item => item.id === fee.studentId);
    const feeClassName = className && className !== "All Classes"
      ? className
      : classNames[fee.classId] || fee.classId || "—";
    const paidDate = fee.paidDate
      ? new Date(fee.paidDate).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN");

    const items = getFeeItemsForStudent(fee);

    const d = new Date(`${fee.month}-01T00:00:00`);
    const monthName = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }).toUpperCase();

    const histSummary = computeStudentFeeHistorySummary({
      studentId: fee.studentId,
      schoolId: school?.id || schoolId,
      currentMonth: fee.month,
      currentFee: fee,
      feeHistory,
    });

    return {
      schoolName: schoolDetails.schoolName || school?.name || "School",
      schoolId: school?.id || schoolId,
      schoolAddress: schoolDetails.address || school?.address || "Institutional Academic Campus, Educational Zone",
      schoolLogoUrl: getSavedSchoolLogo(schoolDetails.logoUrl || school?.logoUrl, school?.id || schoolId),
      schoolPhone: schoolDetails.phone || school?.phone || school?.mobile,
      schoolEmail: schoolDetails.email || school?.email,
      schoolAffiliation: schoolDetails.affiliation || school?.affiliation,
      upiId: schoolDetails.upiId || school?.upiId || "",
      receiptTitle: fee.paid ? "FEE RECEIPT" : "FEE DEMAND SLIP • बकाया शुल्क तकादा पर्ची",
      receiptNo: fee.receiptNo || String(Math.floor(10000 + Math.random() * 90000)),
      admissionNo: student?.admissionNo || fee.rollNo || "140516",
      studentName: fee.studentName,
      fatherName: student?.fatherName || "",
      studentId: student?.id || fee.studentId || "",
      rollNo: student?.rollNo || fee.rollNo || "",
      phone: student?.phone || student?.whatsappNo || (fee as any).phone || "",
      studentPhotoUrl: student?.photoUrl || (student as any)?.photo || "",
      installment: monthName,
      receiptDate: paidDate,
      session: formatAcademicSession(sessionId || "2026-27"),
      className: feeClassName,
      counterNo: fee.paid ? "FEE-RECEIPT" : "DUE-DEMAND",
      items,
      balanceDue: fee.balanceDue,
      lastPaidAmount: fee.lastPaidAmount !== undefined ? fee.lastPaidAmount : histSummary.lastPaidAmount,
      lastPaidDate: fee.lastPaidDate || histSummary.lastPaidDate,
      lastDueAmount: fee.lastDueAmount !== undefined ? fee.lastDueAmount : histSummary.lastDueAmount,
      lastDueDate: fee.lastDueDate || histSummary.lastDueDate,
      payModeInfo: fee.payModeInfo || {
        payMode: fee.paid ? "Cash" : "Payment Pending / Due Slip",
        date: paidDate,
        bank: fee.paid ? "SCHOOL COUNTER" : "PENDING",
        number: fee.receiptNo || "—",
      },
      note: fee.note || (fee.paid ? String(Math.floor(100 + Math.random() * 900)) : "Pay by 10th of month"),
      showDigitalSignature: Boolean(schoolDetails.principalSignatureUrl || schoolDetails.directorSignatureUrl),
      principalSignatureUrl: schoolDetails.principalSignatureUrl,
      principalName: schoolDetails.principalName || "Principal",
      principalTitle: "Principal",
      directorSignatureUrl: schoolDetails.directorSignatureUrl,
      directorName: schoolDetails.directorName,
      signatoryTitle: schoolDetails.signatoryTitle || "Principal",
    };
  };

  const printPosSlip = (fee: MonthlyFee) => {
    const dpsData = getDpsDataForFee(fee);
    printPosSlipDirect(dpsData, 80);
  };

  const printDpsReceipts = (receiptFees: MonthlyFee[], layoutMode: "4in1" | "a6" | "full" = "4in1") => {
    if (!receiptFees.length) return;
    const dpsList = receiptFees.map(f => getDpsDataForFee(f));

    if (layoutMode === "a6" || (receiptFees.length === 1 && !receiptFees[0].paid && layoutMode !== "full")) {
      printA6SlipDirect(dpsList[0]);
      return;
    }

    if (layoutMode === "4in1") {
      printDpsReceipts4in1(dpsList);
      return;
    }

    const markup = `<!doctype html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Official Fee Receipts</title>
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
            <div class="dps-full-print-page">
              ${generateDpsReceiptHtml(data, { layout: "full" })}
            </div>
          `).join("")}
        </body>
      </html>`;
    printReceiptHtmlInIframe(markup);
  };

  const whatsappTargetOptions = React.useMemo(() => {
    if (!whatsappModalTarget) return null;
    const { fee, student, isDueDemand } = whatsappModalTarget;
    const resolvedClassName = className && className !== "All Classes" ? className : classNames[fee.classId] || fee.classId;
    return {
      fee,
      student,
      schoolName: schoolName || schoolDetails.schoolName,
      className: resolvedClassName,
      feeHistory,
      schoolDetails,
      isDueDemand,
      mode: "pos" as const,
    };
  }, [whatsappModalTarget, className, classNames, schoolName, schoolDetails, feeHistory]);

  const whatsappTargetMeta = React.useMemo(() => {
    if (!whatsappTargetOptions) return null;
    return buildWhatsAppReceiptMessage(whatsappTargetOptions);
  }, [whatsappTargetOptions]);

  const sendReceiptOnWhatsApp = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    setWhatsappModalTarget({ fee, student, isDueDemand: false });
  };

  const sendDueSlipOnWhatsApp = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    setWhatsappModalTarget({ fee, student, isDueDemand: true });
  };

  const downloadFeeFile = (fee: MonthlyFee) => {
    const student = students.find(item => item.id === fee.studentId);
    downloadFeeDocument({ fee, student, schoolName, className, feeHistory, schoolDetails });
  };

  // Direct Excel (.csv with UTF-8 BOM) export for due & fee register
  const exportFeeRegisterToExcel = () => {
    const classLabel = (className && className !== "All Classes") ? className : "All_Classes";
    const resolvedSchoolName = schoolName || schoolDetails.schoolName || school?.name || "School";
    
    // Headers
    const headers = [
      "Sr No",
      "Roll No",
      "Admission No",
      "Student Name",
      "Class",
      "Father Name",
      "WhatsApp / Mobile",
      "Expected Monthly Fee (₹)",
      "Arrears / Old Due (₹)",
      "Total Bill (₹)",
      "Paid Amount (₹)",
      "Balance Due (₹)",
      "Payment Status",
      "Payment Date",
      "Receipt No",
      "Payment Mode",
      "Session",
      "Fee Month",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = fees.map((f, index) => {
      const student = students.find(s => s.id === f.studentId);
      const studentClass = classNames[f.classId] || f.classId || className || "—";
      const totalBill = Number(f.amount || f.monthlyAmount || 0);
      const paidAmt = Number(f.paidAmount !== undefined ? f.paidAmount : (f.paid ? totalBill : 0));
      const balDue = Number(f.balanceDue !== undefined ? f.balanceDue : (f.paid ? 0 : totalBill - paidAmt));
      const statusStr = f.paid ? "PAID (जमा)" : (balDue > 0 ? "DUE (बकाया)" : "UNPAID");
      const paidDt = f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-IN") : "—";
      const receiptNum = f.receiptNo || "—";
      const payMode = f.paymentMode || (f.paid ? "Cash" : "—");

      return [
        index + 1,
        f.rollNo || student?.rollNo || "—",
        student?.admissionNo || "—",
        f.studentName || student?.name || "—",
        studentClass,
        student?.fatherName || "—",
        student?.phone || (f as any).phone || "—",
        Number(f.monthlyAmount || f.amount || 0),
        Number(f.arrearsAmount || 0),
        totalBill,
        paidAmt,
        balDue,
        statusStr,
        paidDt,
        receiptNum,
        payMode,
        sessionId || "2026-2027",
        f.month || month,
      ].map(escapeCsv).join(",");
    });

    // Summary calculation
    const totalExpected = fees.reduce((acc, f) => acc + Number(f.amount || f.monthlyAmount || 0), 0);
    const totalCollected = fees.reduce((acc, f) => {
      const bill = Number(f.amount || f.monthlyAmount || 0);
      return acc + Number(f.paidAmount !== undefined ? f.paidAmount : (f.paid ? bill : 0));
    }, 0);
    const totalPending = fees.reduce((acc, f) => {
      const bill = Number(f.amount || f.monthlyAmount || 0);
      const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (f.paid ? bill : 0));
      return acc + Math.max(0, bill - paid);
    }, 0);

    const summaryRows = [
      "",
      `"SUMMARY / कुल सारांश",,,,,,,,,,,,,,,,,`,
      `"Total Students",${fees.length},,,,,,,,,,,,,,,,,`,
      `"Total Expected Bill (₹)",${totalExpected},,,,,,,,,,,,,,,,,`,
      `"Total Collected (₹)",${totalCollected},,,,,,,,,,,,,,,,,`,
      `"Total Pending Due (₹)",${totalPending},,,,,,,,,,,,,,,,,`,
      `"Exported On","${new Date().toLocaleString("en-IN")}",,,,,,,,,,,,,,,,,`,
      `"School","${resolvedSchoolName}",,,,,,,,,,,,,,,,,`,
    ];

    // Prepend UTF-8 BOM (\uFEFF) so Excel opens seamlessly with special characters
    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows, ...summaryRows].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeDate = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `${resolvedSchoolName.replace(/[^a-z0-9-_]+/gi, "_")}_Fee_Due_Register_${classLabel.replace(/[^a-z0-9-_]+/gi, "_")}_${month}_${safeDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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


  const modalStudent = collectingFee ? students.find(s => s.id === collectingFee.studentId) : null;
  const modalTargetClass = collectingFee ? rawClasses.find(c => c.id === collectingFee.classId) : null;
  const modalStruct = modalTargetClass?.feeStructure;
  const modalMonthly = Number(customMonthlyAmount) || Number(modalStruct?.tuitionFee || 2000);
  const modalAdm = customIncludeAdmissionFee ? Number(modalStruct?.admissionFee ?? 65000) : 0;
  const modalCau = customIncludeCautionMoney ? Number(modalStruct?.cautionMoney ?? 60000) : 0;
  const modalAnn = customIncludeAnnualCharges ? Number(modalStruct?.annualCharges ?? 23320) : 0;
  const studentBusFee = Number(customBusFeeAmount) || 0;
  const modalBus = customIncludeBusFee ? studentBusFee : 0;
  const modalArrears = Number(collectingFee?.arrearsAmount || 0);

  // Dynamic 5% Early Bird discount calculation based on selected payment date:
  const dayParts = (customPaymentDate || "").split("-");
  const modalPaymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
  const isEarlyBirdEligible = modalPaymentDay <= 10;
  const modalEarlyDiscount = isEarlyBirdEligible && modalMonthly > 0 ? Math.round(modalMonthly * 0.05) : 0;

  const modalConcession = Number(customConcession) || 0;
  const effectiveEarlyDiscount = (collectingFee?.earlyDiscount && collectingFee.earlyDiscount > 0)
    ? collectingFee.earlyDiscount
    : modalEarlyDiscount;

  // 5% applies strictly to regular tuition fee, never to old arrears
  const currentMonthTuitionAfterDiscount = Math.max(0, modalMonthly - effectiveEarlyDiscount);
  const modalCurrentMonthGross = modalMonthly + modalAdm + modalCau + modalAnn + modalBus;
  const modalGrossTotalBeforeDiscount = modalArrears + modalCurrentMonthGross;

  const modalCurrentMonthBill = Math.max(0, currentMonthTuitionAfterDiscount + modalAdm + modalCau + modalAnn + modalBus - (modalConcession > effectiveEarlyDiscount ? modalConcession - effectiveEarlyDiscount : 0));
  const modalTotalBill = modalCurrentMonthBill + modalArrears;
  // Default to 0 (Unpaid) when nothing is typed; only allocates what user explicitly writes or clicks
  const enteredPaid = customPaidAmount.trim() !== "" ? Math.max(0, Number(customPaidAmount)) : 0;
  const remainingBalance = Math.max(0, modalTotalBill - enteredPaid);

  // Assemble all chronological unpaid/arrears months for this student
  const modalUnpaidMonths = React.useMemo<MonthDueItem[]>(() => {
    if (!collectingFee) return [];
    const allMonthsSet = new Set<string>();
    if (collectingFee.arrearsMonths && Array.isArray(collectingFee.arrearsMonths)) {
      collectingFee.arrearsMonths.forEach(m => allMonthsSet.add(m));
    }
    allMonthsSet.add(collectingFee.month);
    const sorted = Array.from(allMonthsSet).sort();
    const localFeeList = getLocalFees(schoolId);

    return sorted
      .map(m => {
        const isCurrent = m === collectingFee.month;
        if (isCurrent) {
          return {
            month: m,
            label: formatMonthLabel(m),
            monthlyAmount: modalMonthly,
            totalDue: modalCurrentMonthBill,
            alreadyPaid: 0,
            totalBill: modalCurrentMonthBill,
          };
        }
        const hist = localFeeList.find(h => h.studentId === collectingFee.studentId && h.month === m)
          || feeHistory.find(h => h.studentId === collectingFee.studentId && h.month === m);
        const standardRate = modalMonthly + modalBus;
        const alreadyPaid = Number(hist?.paidAmount || 0);
        const due = hist?.balanceDue !== undefined
          ? Number(hist.balanceDue)
          : (hist?.paid ? 0 : Number(hist?.amount || hist?.monthlyAmount || standardRate));

        return {
          month: m,
          label: formatMonthLabel(m),
          monthlyAmount: Number(hist?.monthlyAmount || standardRate),
          totalDue: due,
          alreadyPaid,
          totalBill: Number(hist?.amount || standardRate),
        };
      })
      .filter(item => item.totalDue > 0 || item.month === collectingFee.month);
  }, [collectingFee, modalMonthly, modalCurrentMonthBill, modalBus, schoolId, feeHistory]);

  const modalFifoResult = React.useMemo<FifoPaymentResult | null>(() => {
    if (!collectingFee || modalUnpaidMonths.length === 0) return null;
    return calculateFifoAllocation({
      unpaidMonths: modalUnpaidMonths,
      paymentAmount: enteredPaid,
      upcomingMonthRate: modalMonthly,
    });
  }, [collectingFee, modalUnpaidMonths, enteredPaid, modalMonthly]);

  const admCurrentStudent = students.find((st) => st.id === admSelectedStudentId);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        {onBack && <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"><ChevronLeft className="w-5 h-5" /></button>}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800 dark:text-white truncate">{className || "All Classes"} — Fee Management</h2>
          <p className="text-xs text-slate-500">{students.length} students enrolled</p>
        </div>
        <div className="flex items-center gap-2 relative">
          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student / roll..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 lg:w-48"
            />
          </div>

          {/* Quick Excel Export */}
          <button
            type="button"
            onClick={exportFeeRegisterToExcel}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition active:scale-95 cursor-pointer"
            title="Download complete Fee Due Register (.CSV for Excel)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </button>

          {/* Sleek ⚡ Fee Tools Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-500 hover:to-blue-500 active:scale-95 text-white px-3.5 py-2 text-xs font-black shadow-md shadow-indigo-700/25 transition cursor-pointer select-none"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>⚡ Fee Tools</span>
              <span className="w-4 h-4 rounded-full bg-white/20 text-[10px] flex items-center justify-center font-bold">
                7
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showToolsDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu Modal / Popover */}
            {showToolsDropdown && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowToolsDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 text-slate-800 dark:text-slate-100 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3.5 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Fee Management Actions</span>
                      </p>
                      <p className="text-[10px] text-slate-400">7 Quick tools for fee operations</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowToolsDropdown(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-1.5 space-y-0.5 max-h-[75vh] overflow-y-auto">
                    {/* Tool 1: Admission Fee Receipt */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        openAdmissionModalForStudent();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <ReceiptText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300">
                          + New Admission Receipt (+ प्रवेश शुल्क)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          प्रवेश शुल्क (Admission Fee) भरें और 3-इंच / A6 रसीद बनाएं
                        </p>
                      </div>
                    </button>

                    {/* Tool 2: Scan QR to Pay */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        setShowQrScannerModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-amber-50 dark:hover:bg-amber-950/40 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300">
                          Scan ID Card QR (फास्ट पे)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          आईडी कार्ड क्यूआर स्कैन करके तुरंत फीस जमा करें
                        </p>
                      </div>
                    </button>

                    {/* Tool 3: Push Monthly Alert */}
                    <button
                      type="button"
                      disabled={sendingMonthlyPush}
                      onClick={() => {
                        setShowToolsDropdown(false);
                        handleBroadcastMonthlyFeePush();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition flex items-center gap-2.5 group cursor-pointer disabled:opacity-50"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300">
                          Push Monthly Alert (लॉक स्क्रीन पुश)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          सभी बकाया छात्रों के अभिभावकों को वेब पुश भेजें
                        </p>
                      </div>
                    </button>

                    {/* Tool 4: Class Fee Alert (NSTA Messenger) */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        setShowClassFeeAlertModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-purple-50 dark:hover:bg-purple-950/40 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bell className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-300">
                          Class Fee Alert (NSTA Messenger)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          A6 डिमांड स्लिप व मैसेज क्लास ग्रुप में भेजें
                        </p>
                      </div>
                    </button>

                    {/* Tool 5: Bus Service Manager */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        setShowBusModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-teal-50 dark:hover:bg-teal-950/40 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Bus className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300">
                          Bus Service &amp; Routes ({busFees.length} Users)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          बस रूट, स्टॉप व वाहन शुल्क आवंटन प्रबंधित करें
                        </p>
                      </div>
                    </button>

                    {/* Tool 6: Class Fee Rates & Structure */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        setShowClassFeeModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-blue-50 dark:hover:bg-blue-950/40 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300">
                          Class Fee Rates &amp; Structure (क्लास दरें)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          ट्यूशन, एडमिशन, कॉशन मनी व वार्षिक शुल्क सेट करें
                        </p>
                      </div>
                    </button>

                    {/* Tool 7: Receipt Header & Print Settings */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsDropdown(false);
                        setShowSchoolHeaderModal(true);
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-slate-700 transition flex items-center gap-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-slate-900 dark:group-hover:text-slate-100">
                          Receipt Header &amp; Print Settings (लेटरहेड)
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          स्कूल लोगो, पता, संबद्धता व डिजिटल हस्ताक्षर सेटिंग्स
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {feeError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{feeError}</div>}
        {pushBannerMsg && (
          <div className="rounded-xl border border-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 dark:border-indigo-700 p-3 text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
            <span>{pushBannerMsg}</span>
            <button onClick={() => setPushBannerMsg(null)} className="text-indigo-500 hover:text-indigo-800 cursor-pointer">✕</button>
          </div>
        )}
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
          {/* ── ALL FEE HEADS OVERVIEW (सारे Fee का List) ── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="font-black text-sm text-slate-800 dark:text-white">
                    Class Fee Heads Overview (सारे Fee का List)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {className || "Class standard"} fee structure according to official DPS standard
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClassFeeModal(true)}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                title="Har class ka fee rate badlein ya edit karein"
              >
                <Sparkles className="w-3 h-3 text-amber-500" /> Edit Rates
              </button>
            </div>

            {/* Quick 5-Head Fee Summary Grid */}
            {(() => {
              const targetClass = rawClasses.find(c => c.id === classId) || rawClasses[0];
              const struct = targetClass?.feeStructure;
              const adm = Number(struct?.admissionFee ?? 65000);
              const tui = Number(struct?.tuitionFee ?? targetClass?.defaultFee ?? 19140);
              const cau = Number(struct?.cautionMoney ?? 60000);
              const ann = Number(struct?.annualCharges ?? 23320);
              const bus = Number(struct?.busFee ?? 10360);
              const totalPkg = adm + tui + cau + ann + bus;

              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">1. Admission Fee</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">₹{adm.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 block">2. Tuition Fee</span>
                      <span className="text-xs font-black text-blue-700 dark:text-blue-300">₹{tui.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">3. Caution Money</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">₹{cau.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">4. Annual Charges</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">₹{ann.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] font-bold text-slate-500 block">5. Bus Fee</span>
                      <span className="text-xs font-black text-slate-800 dark:text-white">₹{bus.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      Total Standard Package (Admission + All Heads):
                    </span>
                    <strong className="text-amber-700 dark:text-amber-300 font-black text-sm">
                      ₹{totalPkg.toLocaleString("en-IN")}
                    </strong>
                  </div>
                </div>
              );
            })()}
          </div>

          {unpaidFees.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm space-y-3 border border-orange-200 dark:border-orange-900/50">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-orange-600" />
                    Unpaid Fee Due Slips ({unpaidFees.length} Pending)
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sabhi baki bacchon ke slips DPS format (4 receipts per A4 page) me print karein.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDuesBreakdownTable(!showDuesBreakdownTable)}
                    className="px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <ReceiptText className="w-3.5 h-3.5" />
                    {showDuesBreakdownTable ? "Hide All Due List" : "📋 View All Due List (सारे Fee का List)"}
                  </button>
                  <button
                    onClick={() => setSelectedDueSlipIds(selectedDueSlipIds.length === unpaidFees.length ? [] : unpaidFees.map(fee => fee.studentId))}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    {selectedDueSlipIds.length === unpaidFees.length ? "Deselect all" : "Select all unpaid"}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Printing Dues */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => printReceipts(unpaidFees, "4in1")}
                  className="py-2.5 px-3 bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl font-black flex items-center justify-center gap-2 text-xs shadow-md shadow-orange-900/20 active:scale-95 transition cursor-pointer"
                  title="Sabhi pending fees ke DPS slips 4-in-1 A4 paper par print karein"
                >
                  <Printer className="w-4 h-4 text-amber-200" />
                  <span>🖨️ Print All Due (4-in-1 A4 DPS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => printReceipts(unpaidFees, "full")}
                  className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition cursor-pointer"
                  title="Print 1 full page due slip per student"
                >
                  <span>📄 Print All Due (Full A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => printReceipts(unpaidFees.filter(fee => selectedDueSlipIds.includes(fee.studentId)), "4in1")}
                  disabled={!selectedDueSlipIds.length}
                  className="py-2.5 px-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs transition cursor-pointer"
                  title="Print only checked students' due slips"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Selected Due ({selectedDueSlipIds.length})</span>
                </button>
              </div>

              {/* ── EXPANDABLE ALL DUE STUDENTS LIST WITH ALL 5 FEE HEADS ── */}
              {showDuesBreakdownTable && (
                <div className="mt-3 p-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-800/60 overflow-hidden space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-orange-900 dark:text-orange-200">
                    <span>📋 All Due Students — Complete 5 Fee Heads List:</span>
                    <span>Total Unpaid: {unpaidFees.length} students</span>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-orange-200 dark:border-orange-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-white sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-slate-700">Roll</th>
                          <th className="p-2 border-r border-slate-700">Student Name</th>
                          <th className="p-2 border-r border-slate-700">Admission (₹)</th>
                          <th className="p-2 border-r border-slate-700">Tuition (₹)</th>
                          <th className="p-2 border-r border-slate-700">Caution (₹)</th>
                          <th className="p-2 border-r border-slate-700">Annual (₹)</th>
                          <th className="p-2 border-r border-slate-700">Bus (₹)</th>
                          <th className="p-2 border-r border-slate-700">Arrears</th>
                          <th className="p-2 border-r border-slate-700 font-black text-amber-300">Total Due</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                        {unpaidFees.map((fee, idx) => {
                          const items = getFeeItemsForStudent(fee);
                          const admItem = items.find(i => i.description.toLowerCase().includes("admission"))?.due || 0;
                          const tuiItem = items.find(i => i.description.toLowerCase().includes("tuition"))?.due || 0;
                          const cauItem = items.find(i => i.description.toLowerCase().includes("caution"))?.due || 0;
                          const annItem = items.find(i => i.description.toLowerCase().includes("annual"))?.due || 0;
                          const busItem = items.find(i => i.description.toLowerCase().includes("bus"))?.due || 0;
                          const arrItem = Number(fee.arrearsAmount || 0);

                          return (
                            <tr key={fee.studentId ? `unpaid-${fee.studentId}` : `unpaid-${fee.rollNo || idx}-${idx}`} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/40"}>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500">{fee.rollNo}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                                {fee.studentName}
                                {fee.arrearsMonths?.length ? (
                                  <span className="ml-1 text-[9px] px-1 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                                    {fee.arrearsMonths.length}m due
                                  </span>
                                ) : null}
                              </td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800">₹{Number(admItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-bold text-blue-600 dark:text-blue-400">₹{Number(tuiItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800">₹{Number(cauItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800">₹{Number(annItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800">₹{Number(busItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-orange-600 font-bold">
                                {arrItem > 0 ? `₹${arrItem.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-black text-orange-600 dark:text-orange-400">
                                ₹{Number(fee.amount || 0).toLocaleString("en-IN")}
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDpsModalFormat("a6");
                                      setDpsReceiptFee(fee);
                                    }}
                                    className="px-1.5 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1 text-[10px] font-bold cursor-pointer"
                                    title="Demand Slip Dekhein (मांग पर्ची A6)"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>Slip</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDpsModalFormat("pos");
                                      setDpsReceiptFee(fee);
                                    }}
                                    className={`px-1.5 py-1 rounded flex items-center gap-1 text-[10px] font-bold transition cursor-pointer ${
                                      fee.paid
                                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                                    }`}
                                    title={fee.paid ? "Official Fee Receipt Dekhein (शुल्क रसीद 3\" POS)" : "Fee jama hone par raseed banegi (Click karke preview karein)"}
                                  >
                                    <ReceiptText className={`w-3.5 h-3.5 ${fee.paid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`} />
                                    <span>Receipt</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dpsData = getDpsDataForFee(fee);
                                      printA6SlipDirect(dpsData);
                                    }}
                                    className="p-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-300"
                                    title="Print Demand Slip (मांग पर्ची प्रिंट करें)"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentModal(fee)}
                                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]"
                                  >
                                    Pay
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
          {/* ── SEARCH & DUES QUICK FILTER ── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Student name, Roll number, ya Admission number se search karein..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                Fee Status &amp; Bus Service Filter:
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {filteredFees.length} of {fees.length} students
              </span>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
              <button
                type="button"
                onClick={() => setDuesFilter("all")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer ${
                  duesFilter === "all"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                }`}
              >
                All ({fees.length})
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("paid")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  duesFilter === "paid"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100"
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Full Paid ({paidFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("partial")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  duesFilter === "partial"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Partial Paid ({partialFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("unpaid")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  duesFilter === "unpaid"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Unpaid / Due ({unpaidFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("bus")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer flex items-center gap-1 ${
                  duesFilter === "bus"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100"
                }`}
              >
                <Bus className="w-3.5 h-3.5" />
                <span>🚌 Bus Students ({busFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("due3")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer ${
                  duesFilter === "due3"
                    ? "bg-amber-700 text-white shadow-sm"
                    : "bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200"
                }`}
              >
                ⚠️ 3+ Mo. Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 3).length})
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("due6")}
                className={`px-3 py-1.5 rounded-xl shrink-0 transition cursor-pointer ${
                  duesFilter === "due6"
                    ? "bg-rose-700 text-white shadow-sm"
                    : "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200"
                }`}
              >
                🚨 6+ Mo. Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 6).length})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden border border-slate-200 dark:border-slate-700">
            {filteredFees.map((fee, idx) => {
              const student = students.find(s => s.id === fee.studentId);
              const isBusActive = Boolean(fee.includeBusFee || student?.usesBus);
              const targetClass = rawClasses.find(c => c.id === fee.classId);
              const busRate = Number(student?.busFee || fee.busFeeAmount || targetClass?.feeStructure?.busFee || 1000);
              const totalFee = Number(fee.amount || fee.monthlyAmount || 0);
              const isFullPaid = Boolean(fee.paid && (!fee.balanceDue || fee.balanceDue === 0));
              const lastTxPaid = Number((fee as any).lastReceiptPaidAmount || 0);
              const paidAmt = lastTxPaid > 0
                ? lastTxPaid
                : (fee.paidAmount !== undefined ? Number(fee.paidAmount) : (isFullPaid ? totalFee : 0));
              const dueAmt = isFullPaid
                ? 0
                : (fee.balanceDue !== undefined
                    ? Number(fee.balanceDue) + Number(fee.arrearsAmount || 0)
                    : Math.max(0, totalFee - Number(fee.paidAmount || 0)));
              const isPartial = !isFullPaid && (paidAmt > 0 || Number(fee.paidAmount || 0) > 0);

              return (
                <div
                  key={fee.studentId ? `fee-${fee.studentId}` : `fee-${fee.rollNo || idx}-${idx}`}
                  className={`p-3 sm:px-4 sm:py-3 border-b dark:border-slate-700 last:border-0 transition ${
                    isFullPaid ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                  }`}
                >
                  {/* Top Row: Checkbox, Roll No, Student Name, and Status Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        aria-label={`Select ${fee.studentName} slip`}
                        type="checkbox"
                        checked={fee.paid ? selectedReceiptIds.includes(fee.studentId) : selectedDueSlipIds.includes(fee.studentId)}
                        onChange={() => {
                          if (fee.paid) toggleReceiptSelection(fee.studentId);
                          else {
                            setSelectedDueSlipIds(current =>
                              current.includes(fee.studentId)
                                ? current.filter(id => id !== fee.studentId)
                                : [...current, fee.studentId]
                            );
                          }
                        }}
                        className="h-4 w-4 accent-blue-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-mono font-bold text-slate-400 shrink-0">#{fee.rollNo}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const fullStudent = student || ({
                            id: fee.studentId,
                            name: fee.studentName,
                            rollNo: fee.rollNo,
                            classId: fee.classId,
                            monthlyFee: fee.monthlyAmount || fee.amount || 0,
                          } as any);
                          setSelectedStudentForModal(fullStudent);
                          setModalInitialTab("fees");
                        }}
                        className="text-left font-black text-slate-900 dark:text-white text-sm hover:text-blue-600 dark:hover:text-blue-400 truncate cursor-pointer"
                        title="Click student name to view ID Card, Fee Details & Attendance"
                      >
                        {fee.studentName}
                      </button>
                    </div>

                    {/* Payment Status Pill */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isFullPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>PAID (₹{paidAmt.toLocaleString("en-IN")})</span>
                        </span>
                      ) : isPartial ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>PARTIAL (₹{paidAmt.toLocaleString("en-IN")})</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>UNPAID (₹{dueAmt.toLocaleString("en-IN")})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Concise Financial Summary */}
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap text-xs text-slate-600 dark:text-slate-300">
                    <span className="bg-slate-100 dark:bg-slate-700/60 px-2 py-0.5 rounded font-bold text-slate-700 dark:text-slate-200">
                      Bill: <strong className="font-black text-slate-900 dark:text-white">₹{totalFee.toLocaleString("en-IN")}</strong>
                    </span>
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      Paid: <strong>₹{paidAmt.toLocaleString("en-IN")}</strong>
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        dueAmt > 0
                          ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/50"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      Due: <strong>₹{dueAmt.toLocaleString("en-IN")}</strong>
                    </span>
                    {Number(fee.arrearsAmount || 0) > 0 && (
                      <span className="bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded font-bold text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800/50 flex items-center gap-1">
                        <span>Back Due: +₹{Number(fee.arrearsAmount).toLocaleString("en-IN")}</span>
                        {fee.arrearsMonths?.length ? (
                          <span className="text-[10px] opacity-75">({fee.arrearsMonths.join(", ")})</span>
                        ) : null}
                      </span>
                    )}
                    {isBusActive && (
                      <span className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 px-1.5 py-0.5 rounded text-[10px] font-bold border border-teal-200 dark:border-teal-800/40">
                        🚌 Bus Active
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Tuition: ₹{Number(fee.monthlyAmount ?? targetClass?.feeStructure?.tuitionFee ?? 2000).toLocaleString("en-IN")}
                    </span>
                    {fee.receiptNo && (
                      <span className="text-[10px] font-mono text-slate-400">
                        #{fee.receiptNo}
                      </span>
                    )}
                  </div>

                  {/* Expandable Fee Heads Ledger Table for this student */}
                  {expandedStudentFeeIds.includes(fee.studentId) && (
                    <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>📜 Fee Items Breakdown ({fee.studentName}):</span>
                        <span className={isFullPaid ? "text-emerald-600" : isPartial ? "text-amber-600" : "text-orange-600"}>
                          Status: {isFullPaid ? "✓ PAID" : isPartial ? "⚠️ PARTIAL PAID" : "PENDING DUE"}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-[11px] border-collapse bg-white dark:bg-slate-800">
                          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold">
                            <tr>
                              <th className="p-1.5 border-r dark:border-slate-600">Sl.No</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Description</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Due (₹)</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Concession (₹)</th>
                              <th className="p-1.5">Paid (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {getFeeItemsForStudent(fee).map((item, itemIdx) => (
                              <tr key={item.id ? `item-${item.id}` : `item-${item.description}-${itemIdx}`}>
                                <td className="p-1.5 border-r dark:border-slate-700 text-slate-400">{item.slNo}</td>
                                <td className="p-1.5 border-r dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{item.description}</td>
                                <td className="p-1.5 border-r dark:border-slate-700">₹{Number(item.due).toLocaleString("en-IN")}</td>
                                <td className="p-1.5 border-r dark:border-slate-700">₹{Number(item.con || 0).toLocaleString("en-IN")}</td>
                                <td className="p-1.5 font-bold text-emerald-600 dark:text-emerald-400">₹{Number(item.paid).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bottom Compact Action Bar */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-1.5 flex-wrap">
                    {/* Left: Payment Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(fee)}
                        disabled={saving === fee.studentId}
                        className="rounded-lg px-2.5 py-1 text-xs font-black transition-colors disabled:opacity-50 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 active:scale-95"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{isFullPaid ? "Edit Pay" : "Pay Fee"}</span>
                      </button>

                      {!isFullPaid && (
                        <button
                          type="button"
                          onClick={() => setFeeStatus(fee, true)}
                          disabled={saving === fee.studentId}
                          className="rounded-lg px-2 py-1 text-xs font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          title="Mark 100% full paid directly"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Full Paid</span>
                        </button>
                      )}

                      {(isFullPaid || isPartial) && (
                        <button
                          type="button"
                          onClick={() => setFeeStatus(fee, false)}
                          disabled={saving === fee.studentId}
                          className="rounded-lg px-2 py-1 text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1"
                          title="पूरा भुगतान हटाकर ₹0 बकाया (Unpaid) करें"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mark Unpaid</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleStudentFeeExpand(fee.studentId)}
                        className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer transition flex items-center gap-1"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{expandedStudentFeeIds.includes(fee.studentId) ? "Hide ▲" : "Heads ▼"}</span>
                      </button>
                    </div>

                    {/* Right: Print & Share Actions */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDpsModalFormat("a6");
                          setDpsReceiptFee(fee);
                        }}
                        className="px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800"
                        title="Preview Fee Demand Slip (मांग पर्ची A6)"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDpsModalFormat("pos");
                          setDpsReceiptFee(fee);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition shadow-xs cursor-pointer ${
                          fee.paid
                            ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                        }`}
                        title={fee.paid ? "Open Official Fee Receipt (शुल्क रसीद 3\" POS)" : "Fee jama hone par raseed banegi (Click karke preview karein)"}
                      >
                        <ReceiptText className={`w-3.5 h-3.5 ${fee.paid ? "text-amber-300" : "text-slate-400"}`} />
                        <span>Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => printPosSlip(fee)}
                        className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer"
                        title="1-Click Mini Thermal POS Print (80mm / 58mm Roll Slip)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>POS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => (fee.paid ? sendReceiptOnWhatsApp(fee) : sendDueSlipOnWhatsApp(fee))}
                        disabled={sendingWhatsAppId === fee.studentId}
                        className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition disabled:opacity-50 cursor-pointer"
                        title="WhatsApp PDF to parent"
                        aria-label={`Send ${fee.studentName} on WhatsApp`}
                      >
                        {sendingWhatsAppId === fee.studentId ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                        ) : (
                          <MessageCircle className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {!fee.paid && (
                        <button
                          type="button"
                          onClick={() => downloadFeeFile(fee)}
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 transition cursor-pointer"
                          title={`Download ${fee.studentName} fee due slip`}
                          aria-label={`Download ${fee.studentName} unpaid fee slip`}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {fees.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>No students found</p>
              </div>
            )}
          </div>
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={exportFeeRegisterToExcel}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
            title="Download full due & fee register as Microsoft Excel spreadsheet (.csv)"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-100" />
            <span>📊 Export to Excel (.csv)</span>
          </button>

          <button
            type="button"
            onClick={downloadFeeReport}
            className="w-full py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Download Fee Report (MHTML)</span>
          </button>
        </div>

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
          school={{
            ...(school || {}),
            id: schoolId,
            name: schoolDetails.schoolName || school?.name || "School",
            address: schoolDetails.address || school?.address || "Institutional Academic Campus, Educational Zone",
            logoUrl: getSavedSchoolLogo(schoolDetails.logoUrl || school?.logoUrl),
            phone: schoolDetails.phone || school?.phone || school?.mobile,
            email: schoolDetails.email || school?.email,
            principalName: schoolDetails.principalName || school?.principalName,
            principalSignatureUrl: schoolDetails.principalSignatureUrl || school?.principalSignatureUrl,
          } as any}
          fee={dpsReceiptFee}
          student={students.find(s => s.id === dpsReceiptFee.studentId)}
          className={className && className !== "All Classes" ? className : (classNames[dpsReceiptFee.classId] || "Class 6-B")}
          sessionName={formatAcademicSession(sessionId || "2026-27")}
          feeHistory={feeHistory}
          initialFormat={dpsModalFormat}
        />
      )}
      <ClassFeeStructureModal
        isOpen={showClassFeeModal}
        onClose={() => setShowClassFeeModal(false)}
        classes={rawClasses}
        schoolId={schoolId}
        onUpdated={() => loadData(true)}
      />
      <QrFeeScannerModal
        isOpen={showQrScannerModal}
        onClose={() => setShowQrScannerModal(false)}
        schoolId={schoolId}
        students={students}
        fees={fees}
        classes={rawClasses}
        onSelectStudentForPayment={(student, fee) => {
          const targetFee = fee || fees.find(f => f.studentId === student.id);
          if (targetFee) {
            handleOpenPaymentModal(targetFee);
          } else {
            const minimalFee = {
              schoolId,
              sessionId,
              studentId: student.id,
              studentName: student.name,
              rollNo: student.rollNo,
              classId: student.classId,
              month,
              monthlyAmount: student.monthlyFee || 2000,
              amount: student.monthlyFee || 2000,
              paid: false,
              paidAmount: 0,
              balanceDue: student.monthlyFee || 2000,
            } as MonthlyFee;
            handleOpenPaymentModal(minimalFee);
          }
        }}
        onSelectStudentForReceipt={(fee) => {
          setDpsReceiptFee(fee);
        }}
      />
      <BusTransportModal
        isOpen={showBusModal}
        onClose={() => setShowBusModal(false)}
        schoolId={schoolId}
        classes={rawClasses}
        students={students}
        initialClassId={classId}
        onUpdated={() => loadData(true)}
      />

      {/* ── CUSTOM PAYMENT ENTRY MODAL (Admission Fee Opt-In, Partial Payment & Individual Student Saving) ── */}
      {collectingFee && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 my-6">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <IndianRupee className="w-5 h-5 text-emerald-600" />
                    Fee Payment & Head Customization
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Student: <strong className="text-slate-800 dark:text-slate-200">{collectingFee.studentName}</strong> (Roll: {collectingFee.rollNo}) • {classNames[collectingFee.classId] || className}
                  </p>
                </div>
                <button
                  onClick={() => setCollectingFee(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informational Guidance on Default vs Opt-in Fees */}
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-900 dark:text-blue-200">
                <span className="font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider mb-0.5 text-blue-700 dark:text-blue-300">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Default Rule (Admission Fee Band Hai)
                </span>
                Default me sirf regular <strong>Tuition Fee</strong> shamil hai. Admission Fee ya anya one-time heads shamil karne ke liye niche unke samne tick karein ("Enable").
              </div>

              {/* Fee Heads Toggles (Per-student customization) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 p-3 space-y-2.5">
                <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                  1. Fee Heads Shamil Karein (Is Student Ke Liye):
                </span>

                {/* Regular Tuition Fee */}
                <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Tuition Fee (Monthly Fee)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">✓ Hamesha Shamil (Monthly Cycle)</span>
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={customMonthlyAmount}
                      onChange={e => setCustomMonthlyAmount(e.target.value)}
                      placeholder="Amount"
                      className="w-full px-2 py-1 text-right text-xs font-black rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Admission Fee Toggle (Default: OFF) */}
                <label className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition cursor-pointer ${customIncludeAdmissionFee ? "bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customIncludeAdmissionFee}
                      onChange={e => setCustomIncludeAdmissionFee(e.target.checked)}
                      className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Admission Fee (+₹{Number(modalStruct?.admissionFee ?? 65000).toLocaleString("en-IN")})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {customIncludeAdmissionFee ? "✓ Shamil Hai (Naye Admission Par)" : "Default: Band (Disabled)"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${customIncludeAdmissionFee ? "bg-purple-200 text-purple-900 dark:bg-purple-900 dark:text-purple-200" : "bg-slate-100 text-slate-500"}`}>
                    {customIncludeAdmissionFee ? `+₹${Number(modalStruct?.admissionFee ?? 65000).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </label>

                {/* Caution Money Toggle (Default: OFF) */}
                <label className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition cursor-pointer ${customIncludeCautionMoney ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customIncludeCautionMoney}
                      onChange={e => setCustomIncludeCautionMoney(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Caution Money (+₹{Number(modalStruct?.cautionMoney ?? 60000).toLocaleString("en-IN")})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {customIncludeCautionMoney ? "✓ Shamil Hai (Security Deposit)" : "Default: Band (Disabled)"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${customIncludeCautionMoney ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200" : "bg-slate-100 text-slate-500"}`}>
                    {customIncludeCautionMoney ? `+₹${Number(modalStruct?.cautionMoney ?? 60000).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </label>

                {/* Annual Charges Toggle (Default: OFF) */}
                <label className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition cursor-pointer ${customIncludeAnnualCharges ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customIncludeAnnualCharges}
                      onChange={e => setCustomIncludeAnnualCharges(e.target.checked)}
                      className="h-4 w-4 rounded accent-indigo-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        Annual Charges (+₹{Number(modalStruct?.annualCharges ?? 23320).toLocaleString("en-IN")})
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {customIncludeAnnualCharges ? "✓ Shamil Hai" : "Default: Band (Disabled)"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${customIncludeAnnualCharges ? "bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200" : "bg-slate-100 text-slate-500"}`}>
                    {customIncludeAnnualCharges ? `+₹${Number(modalStruct?.annualCharges ?? 23320).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </label>

                {/* Bus Fee Toggle (Default: OFF unless student uses bus) */}
                <label className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition cursor-pointer ${customIncludeBusFee ? "bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customIncludeBusFee}
                      onChange={e => setCustomIncludeBusFee(e.target.checked)}
                      className="h-4 w-4 rounded accent-teal-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block flex items-center gap-1.5">
                        <Bus className="w-3.5 h-3.5 text-teal-600 inline" />
                        Bus Transport Fee (+₹{Number(studentBusFee).toLocaleString("en-IN")})
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {modalStudent?.usesBus ? `✓ Student Bus Active${modalStudent.busRoute ? ` • Route: ${modalStudent.busRoute}` : ""}` : (customIncludeBusFee ? "✓ Bus Fee Added to Bill" : "Default: Band (Disabled)")}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${customIncludeBusFee ? "bg-teal-200 text-teal-900 dark:bg-teal-900 dark:text-teal-200" : "bg-slate-100 text-slate-500"}`}>
                    {customIncludeBusFee ? `+₹${Number(studentBusFee).toLocaleString("en-IN")}` : "₹0"}
                  </span>
                </label>

                {/* Previous Arrears Warning if any */}
                {modalArrears > 0 && (
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs flex items-center justify-between text-orange-900 dark:text-orange-200">
                    <div>
                      <span className="font-black block">⚠️ Pichhle Mahine Ka Baki (Arrears):</span>
                      <span className="text-[10px] text-orange-700 dark:text-orange-300">
                        {collectingFee.arrearsMonths?.join(", ") || "Previous Unpaid Months"}
                      </span>
                    </div>
                    <span className="font-black text-sm text-orange-600">
                      +₹{modalArrears.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* 5% Early Bird Rule Callout Card */}
              {effectiveEarlyDiscount > 0 ? (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 text-xs shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-200">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>🎉 10 तारीख के पहले जमा: 5% विशेष छूट लागू!</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                      -₹{effectiveEarlyDiscount} OFF (5%)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center bg-white/80 dark:bg-slate-800/80 p-2 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">पुराना बकाया (Due)</span>
                      <strong className="text-slate-800 dark:text-slate-200 font-black">₹{modalArrears}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">चालू माह (छूट बाद)</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-black">
                        ₹{currentMonthTuitionAfterDiscount} <span className="line-through text-[9px] text-slate-400">₹{modalMonthly}</span>
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">कुल देय राशि</span>
                      <strong className="text-indigo-700 dark:text-indigo-400 font-black">₹{modalTotalBill}</strong>
                    </div>
                  </div>
                  <p className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                    ⚡ <strong>नियम:</strong> 5% छूट केवल चालू माह की फीस (₹{modalMonthly} - ₹{effectiveEarlyDiscount} = ₹{currentMonthTuitionAfterDiscount}) पर लागू है। पुराना बकाया (₹{modalArrears}) पूरा देय है।
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold block text-[11px]">ℹ️ 10 तारीख के बाद भुगतान:</span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300">
                      5% अर्ली बर्ड छूट की तिथि (10 तारीख) समाप्त हो चुकी है। सामान्य शुल्क लागू है।
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300">
                    कुल देय: ₹{modalTotalBill}
                  </span>
                </div>
              )}

              {/* Total Calculated Bill Overview */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Kul Deen (Total Payable):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-amber-300">
                      ₹{modalTotalBill.toLocaleString("en-IN")}
                    </span>
                    {effectiveEarlyDiscount > 0 && (
                      <span className="text-xs text-slate-400 line-through">
                        ₹{modalGrossTotalBeforeDiscount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-300">
                  <span>Month: <strong>{new Date(`${collectingFee.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</strong></span>
                </div>
              </div>

              {/* Payment Entry: Custom Amount, Presets & Partial Carry-Forward Alert */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-black text-slate-800 dark:text-slate-200">
                      Kitna Paid Kiya? (₹)
                    </label>
                    <div className="flex items-center gap-1 flex-wrap">
                      {effectiveEarlyDiscount > 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomPaidAmount(String(modalTotalBill))}
                          className="px-2.5 py-0.5 rounded text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer"
                          title="10 तारीख तक 5% छूट के बाद कुल देय"
                        >
                          ⚡ 5% OFF: ₹{modalTotalBill.toLocaleString("en-IN")}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCustomPaidAmount(String(modalTotalBill))}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                      >
                        Full (₹{modalTotalBill.toLocaleString("en-IN")})
                      </button>
                      {effectiveEarlyDiscount > 0 && (
                        <button
                          type="button"
                          onClick={() => setCustomPaidAmount(String(modalGrossTotalBeforeDiscount))}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                          title="बिना छूट के कुल राशि"
                        >
                          Gross (₹{modalGrossTotalBeforeDiscount.toLocaleString("en-IN")})
                        </button>
                      )}
                      {modalTotalBill >= 10000 && (
                        <button
                          type="button"
                          onClick={() => setCustomPaidAmount("10000")}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 hover:bg-indigo-200 text-indigo-800 cursor-pointer"
                          title="Test 10 Months (₹18,000 Due -> ₹10,000 Paid)"
                        >
                          ₹10,000
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setCustomPaidAmount(String(Math.floor(modalTotalBill / 2)))}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 cursor-pointer"
                      >
                        Half (₹{Math.floor(modalTotalBill / 2).toLocaleString("en-IN")})
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomPaidAmount("0")}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      >
                        Unpaid (₹0)
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      placeholder="राशि दर्ज करें (खाली = Unpaid ₹0, जितना मिला उतना लिखें)"
                      value={customPaidAmount}
                      onChange={e => setCustomPaidAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* ── LIVE FIFO ALLOCATION SIMULATOR CARD ── */}
                  {modalFifoResult && (
                    <div className="mt-3 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-b from-indigo-50/70 to-blue-50/50 dark:from-indigo-950/30 dark:to-slate-900/40 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5 font-black text-xs text-indigo-900 dark:text-indigo-200">
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                          <span>FIFO Month-by-Month Fill-up (शुरू से महीने भरते जाएंगे):</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-200 text-indigo-900 dark:bg-indigo-900 dark:text-indigo-200">
                          {modalFifoResult.fullyPaidMonths.length} Paid • {modalFifoResult.partialMonth ? "1 Partial" : "0 Partial"} • {modalFifoResult.unpaidMonths.length} Unpaid
                        </span>
                      </div>

                      {/* Month by month waterfall table */}
                      <div className="overflow-x-auto max-h-48 overflow-y-auto rounded-lg border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800">
                        <table className="w-full text-left text-[11px] border-collapse">
                          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 sticky top-0 text-[10px]">
                            <tr>
                              <th className="p-1.5 border-r dark:border-slate-600">Month</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Total Due</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Paid Now</th>
                              <th className="p-1.5 border-r dark:border-slate-600">Remaining</th>
                              <th className="p-1.5">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {modalFifoResult.allocations.map((alloc, allocIdx) => (
                              <tr key={`alloc-${alloc.month || "m"}-${alloc.monthIndex || allocIdx}-${allocIdx}`} className={alloc.status === "PAID" ? "bg-emerald-50/40 dark:bg-emerald-950/20" : alloc.status === "PARTIAL" ? "bg-amber-50/60 dark:bg-amber-950/30" : "bg-white dark:bg-slate-800"}>
                                <td className="p-1.5 border-r dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">
                                  #{alloc.monthIndex} {alloc.label}
                                </td>
                                <td className="p-1.5 border-r dark:border-slate-700">
                                  ₹{alloc.effectiveDueBefore.toLocaleString("en-IN")}
                                </td>
                                <td className="p-1.5 border-r dark:border-slate-700 font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{alloc.allocatedThisTime.toLocaleString("en-IN")}
                                </td>
                                <td className={`p-1.5 border-r dark:border-slate-700 font-bold ${alloc.balanceDueAfter > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400"}`}>
                                  ₹{alloc.balanceDueAfter.toLocaleString("en-IN")}
                                </td>
                                <td className="p-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black border ${alloc.badgeClass}`}>
                                    {alloc.status === "PAID" ? "✓ Full Paid" : alloc.status === "PARTIAL" ? "⚠️ Partial" : "✗ Unpaid"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Next Billing & Print Due Summary Banner */}
                      <div className="p-2.5 rounded-lg bg-slate-900 text-white space-y-1.5 text-xs shadow-sm">
                        <div className="flex items-center justify-between text-slate-300">
                          <span>Total Paid Now (अभी जमा हुआ):</span>
                          <strong className="text-emerald-400 font-black text-sm">₹{modalFifoResult.totalAllocated.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300 border-t border-slate-700 pt-1">
                          <span>Remaining Balance Due (कुल बाकी बकाया):</span>
                          <strong className="text-amber-300 font-black text-sm">₹{modalFifoResult.totalOutstandingDueAfter.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="flex items-center justify-between text-slate-300 border-t border-slate-700 pt-1">
                          <span>Next Bill &amp; Print Due (+ अगला नया महीना ₹{modalMonthly.toLocaleString("en-IN")}):</span>
                          <strong className="text-white font-black text-sm bg-indigo-600 px-2 py-0.5 rounded">
                            ₹{modalFifoResult.nextBillingTotalWithUpcoming.toLocaleString("en-IN")}
                          </strong>
                        </div>
                        <p className="text-[10px] text-slate-400 pt-0.5 italic">
                          💡 <strong>अगली बार जब रसीद प्रिंट होगी:</strong> {modalFifoResult.partialMonth ? `${modalFifoResult.partialMonth.label} का बचा ₹${modalFifoResult.partialMonth.balanceDueAfter.toLocaleString("en-IN")}` : "बकाया"} + बाकी {modalFifoResult.unpaidMonths.length} महीने + अगला नया महीना सब जुड़कर रसीद पर प्रिंट होगा।
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Mode Selector */}
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode:
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {["Cash", "Cheque", "Online / UPI", "Bank Transfer", "Card"].map(mode => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCustomPayMode(mode)}
                        className={`py-2 px-1 text-center rounded-lg text-xs font-bold border transition cursor-pointer ${
                          customPayMode === mode
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bank & Cheque details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Bank Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC BANK / CASH COUNTER"
                      value={customBankName}
                      onChange={e => setCustomBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cheque / UTR / Ref No:</label>
                    <input
                      type="text"
                      placeholder="e.g. 689870 / UTR123456"
                      value={customChequeNo}
                      onChange={e => setCustomChequeNo(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Concession & Payment Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Concession / Discount (₹):</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={customConcession}
                      onChange={e => setCustomConcession(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date {isEarlyBirdEligible ? <span className="text-emerald-600 font-bold">(10 तारीख तक: 5% OFF लागू)</span> : <span className="text-amber-600 font-bold">(10 के बाद: छूट समाप्त)</span>}:
                    </label>
                    <input
                      type="date"
                      value={customPaymentDate}
                      onChange={e => {
                        const newDt = e.target.value;
                        setCustomPaymentDate(newDt);
                        const parts = newDt.split("-");
                        const d = parts.length >= 3 ? parseInt(parts[2], 10) : new Date(newDt).getDate();
                        const isEarly = d <= 10;
                        const disc = isEarly && modalMonthly > 0 ? Math.round(modalMonthly * 0.05) : 0;
                        setCustomConcession(disc > 0 ? String(disc) : "");
                        const newNet = modalArrears + Math.max(0, modalMonthly - disc + modalAdm + modalCau + modalAnn + modalBus);
                        setCustomPaidAmount(String(newNet));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save per student, Open DPS Receipt, Mark Unpaid, Cancel */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollectingFee(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                {(collectingFee.paid || Number(collectingFee.paidAmount || 0) > 0) && (
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(false, true)}
                    disabled={saving === collectingFee.studentId}
                    className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-black transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    title="पूरा भुगतान हटाकर ₹0 बकाया (Unpaid) करें"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                    <span>Mark Unpaid (₹0)</span>
                  </button>
                )}
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(false, false)}
                    disabled={saving === collectingFee.studentId}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {saving === collectingFee.studentId ? "Saving..." : "✓ Save Payment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(true, false)}
                    disabled={saving === collectingFee.studentId}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white text-xs font-black transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <ReceiptText className="w-4 h-4 text-amber-300" />
                    <span>Save &amp; Official Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ADMISSION FEE COLLECTION MODAL ── */}
        {showAdmissionModal && (
          <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-6 max-h-[92vh] overflow-y-auto space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <ReceiptText className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      प्रवेश शुल्क रसीद (Admission Fee Collection)
                    </h3>
                    <p className="text-xs text-slate-500">
                      छात्र का नया प्रवेश शुल्क भरें और आधिकारिक रसीद प्रिंट करें
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Student Selector */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Select Student (छात्र चुनें) *
                </label>
                <select
                  value={admSelectedStudentId}
                  onChange={(e) => handleSelectAdmStudent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm font-bold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100">
                      {s.name} (Roll #{s.rollNo || "—"}, {s.className || className || "Class"}) • Father: {s.fatherName || "—"}
                    </option>
                  ))}
                </select>

                {admCurrentStudent && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Admission No: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{admCurrentStudent.admissionNo || "New"}</strong></span>
                    <span>Class: <strong>{admCurrentStudent.className || className}</strong></span>
                    <span>Phone: <strong>{admCurrentStudent.phone || "—"}</strong></span>
                    {admCurrentStudent.usesBus && <span className="text-teal-600 font-bold">🚌 Bus: {admCurrentStudent.busRoute || "Active"}</span>}
                  </div>
                )}
              </div>

              {/* Itemized Admission Fee Table */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <IndianRupee className="w-4 h-4" /> Admission Charges Breakdown (शुल्क विवरण)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setAdmFeeItems((p) => [
                          ...p,
                          { id: `bk_${Date.now()}`, description: "Books & Stationery Set (किताबें)", due: 1200 },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                    >
                      + Books
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAdmFeeItems((p) => [
                          ...p,
                          { id: `dr_${Date.now()}`, description: "School Uniform / Dress (ड्रेस)", due: 950 },
                        ])
                      }
                      className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                    >
                      + Dress
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAdmFeeItems((p) => [
                          ...p,
                          { id: `adm_c_${Date.now()}`, description: "Other Admission Charge", due: 0 },
                        ])
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Head
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {admFeeItems.map((row, idx) => (
                    <div key={row.id} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) =>
                          setAdmFeeItems((p) =>
                            p.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r))
                          )
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                      />
                      <input
                        type="number"
                        value={row.due}
                        onChange={(e) =>
                          setAdmFeeItems((p) =>
                            p.map((r) => (r.id === row.id ? { ...r, due: Math.max(0, Number(e.target.value)) } : r))
                          )
                        }
                        className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-black text-right"
                      />
                      <button
                        type="button"
                        onClick={() => setAdmFeeItems((p) => p.filter((r) => r.id !== row.id))}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Concession (छूट ₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={admConcession}
                      onChange={(e) => setAdmConcession(Math.max(0, Number(e.target.value)))}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Amount Paid Now (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={admPaidAmount}
                      onChange={(e) => {
                        setAdmPaidManual(true);
                        setAdmPaidAmount(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Payment Mode</label>
                    <select
                      value={admPayMode}
                      onChange={(e) => setAdmPayMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                    >
                      <option value="Cash">Cash (नकद)</option>
                      <option value="Online / UPI">UPI / QR</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ref / UTR No.</label>
                    <input
                      type="text"
                      value={admPayRef}
                      onChange={(e) => setAdmPayRef(e.target.value)}
                      placeholder="Optional"
                      className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
                  <span>
                    Net Payable: <strong>₹{admNet.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="font-black text-emerald-700 dark:text-emerald-300">
                    Paid: ₹{(Number(admPaidAmount) || 0).toLocaleString("en-IN")} • Due: ₹
                    {Math.max(0, admNet - (Number(admPaidAmount) || 0)).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdmissionModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAdmissionFee("receipt_only")}
                  disabled={admSaving || !admSelectedStudentId}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <ReceiptText className="w-4 h-4" />
                  <span>{admSaving ? "Saving..." : "✓ Save & Print Admission Receipt"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAdmissionFee("combined")}
                  disabled={admSaving || !admSelectedStudentId}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save &amp; Print Form + Receipt (A4)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── COMBINED ADMISSION FORM & RECEIPT PRINT STUDIO ── */}
        {admPrintStudio.open && (
          <AdmissionFormPrintModal
            isOpen={admPrintStudio.open}
            onClose={() => setAdmPrintStudio({ open: false, student: null, fee: null, mode: "receipt_only" })}
            school={school || { id: schoolId, name: schoolName || "School" } as any}
            student={admPrintStudio.student}
            className={
              rawClasses.find((c) => c.id === admPrintStudio.student?.classId)?.name ||
              admPrintStudio.student?.className ||
              className ||
              "Class"
            }
            sessionName={formatAcademicSession(sessionId || "2026-27")}
            feeRecord={admPrintStudio.fee}
            initialMode={admPrintStudio.mode}
          />
        )}

        {/* ── DEDICATED WHATSAPP SHARE & SEND MODAL (1-Click Number Copy + Direct Document Share) ── */}
        {whatsappModalTarget && whatsappTargetOptions && whatsappTargetMeta && (
          <WhatsAppShareModal

            isOpen={Boolean(whatsappModalTarget)}
            onClose={() => setWhatsappModalTarget(null)}
            studentName={whatsappModalTarget.student?.name || whatsappModalTarget.fee.studentName || "Student"}
            parentPhone={whatsappTargetMeta.rawPhone || whatsappModalTarget.student?.phone || ""}
            className={whatsappTargetOptions.className}
            rollNo={whatsappModalTarget.student?.rollNo || whatsappModalTarget.fee.rollNo}
            admissionNo={whatsappModalTarget.student?.admissionNo}
            fatherName={whatsappModalTarget.student?.fatherName}
            receiptNo={whatsappModalTarget.fee.receiptNo || whatsappTargetMeta.receiptData.receiptNo}
            title={whatsappModalTarget.isDueDemand ? "Fee Due Demand Slip (बकाया पर्ची)" : "Official Fee Payment Receipt (रसीद)"}
            formattedMessage={whatsappTargetMeta.message}
            isDueDemand={whatsappModalTarget.isDueDemand}
            totalAmount={whatsappTargetMeta.totalBill}
            paidAmount={whatsappTargetMeta.paidAmount}
            balanceDue={whatsappTargetMeta.balanceDue}
            generatePdfBlob={() => generateFeeDocumentPdfBlob(whatsappTargetOptions)}
          />
        )}

        {/* ── CLASS FEE ALERT BROADCAST MODAL (NSTA Messenger + A6 Slips + Lock-Screen Push) ── */}
        {showClassFeeAlertModal && (
          <ClassFeeAlertBroadcastModal
            isOpen={showClassFeeAlertModal}
            onClose={() => setShowClassFeeAlertModal(false)}
            school={school || { id: schoolId, name: schoolName || "School" }}
            students={students}
            fees={fees}
            classes={rawClasses}
            currentMonth={month}
            onSuccess={(msg) => setPushBannerMsg(msg)}
            onViewStudentFeeSlip={(f, st) => {
              setDpsReceiptFee(f);
              setSelectedStudentForModal(st);
            }}
          />
        )}
      </div>
  );
};

