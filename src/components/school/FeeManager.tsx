// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getMonthlyFees, getClasses, saveFee, markFeePaid, currentMonthStr, getSchoolFeeHistory, isStudentInClass, updateStudent, getLocalFees, isDemoRecord, getAccountants
} from "../../school-firebase";
import type { SchoolStudent, SchoolClass, MonthlyFee, School, SchoolDocumentPrintFields, SchoolAccountant } from "../../school-types";
import { schoolPrintFieldEnabled } from "../../school-types";
import { CheckCircle, Clock, Download, ChevronLeft, ChevronRight, ChevronDown, IndianRupee, Users, TrendingUp, AlertCircle, Printer, MessageCircle, ReceiptText, Building2, Sparkles, X, Check, RotateCcw, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight, Bus, QrCode, Search, Filter, Loader2, Bell, FileSpreadsheet, FileText, Plus, Trash2, CreditCard } from "lucide-react";
import { downloadFeeDocument, shareFeeReceiptOnWhatsApp, generateFeeDocumentPdfBlob, buildWhatsAppReceiptMessage } from "./feeDocument";
import { WhatsAppShareModal } from "./WhatsAppShareModal";
import {
  getMonthlyFeeFromStructure,
  matchesStudentSection,
  getGroupNetItems,
} from "../../utils/feeStructureUtils";

import { sendSchoolPushNotification, triggerMonthlySchoolFeePush } from "../../utils/schoolPushClient";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { ClassFeeStructureModal } from "./ClassFeeStructureModal";
import { QrFeeScannerModal } from "./QrFeeScannerModal";
import { BusTransportModal } from "./BusTransportModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode } from "./AdmissionFormPrintModal";
import { ClassFeeAlertBroadcastModal } from "./ClassFeeAlertBroadcastModal";
import { ReceiptCancellationModal } from "./ReceiptCancellationModal";
import { RazorpaySettingsModal } from "./RazorpaySettingsModal";
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
  getVisibleSchoolRegNo,
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
import {
  canRoleGiveDiscount,
  clampDiscountAmount,
  buildSplitPayModeInfo,
  recordDiscountEntry,
  DISPLAY_DISCOUNT_LABEL,
} from "../../utils/schoolDiscountAndPayment";
import { computePaymentBreakdown } from "../../utils/paymentBreakdown";
import {
  getSchoolFeeDiscountSlabs,
  resolveSlabForDay,
  formatSlabsHeadline,
} from "../../utils/feeDiscountSlabs";
import type { FeeDiscountSlab } from "../../school-types";

interface Props {
  schoolId: string;
  classId?: string;
  className?: string;
  schoolName?: string;
  school?: School;
  sessionId: string;
  adminId: string;
  userRole?: string;
  actorName?: string;
  onBack?: () => void;
  initialTool?: "qr_scanner" | "bus" | "admission_receipt" | "class_rates" | "fee_alert" | "header" | "razorpay" | "cancel_receipt";
  exitOnToolClose?: boolean;
}

export const FeeManager: React.FC<Props> = ({ schoolId, classId, className, schoolName, school, sessionId, adminId, userRole = "SCHOOL_ADMIN", actorName = "Admin / Accountant", onBack, initialTool, exitOnToolClose = false }) => {
  const canGiveDiscount = canRoleGiveDiscount(userRole);
  const qrSwappedToStudentModalRef = React.useRef(false);
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
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [showQrScannerModal, setShowQrScannerModal] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [duesFilter, setDuesFilter] = useState<string>("all");
  const [feePage, setFeePage] = useState<number>(1);

  React.useEffect(() => {
    setFeePage(1);
  }, [searchQuery, duesFilter, classId]);
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [dpsModalFormat, setDpsModalFormat] = useState<"full" | "a6" | "pos">("pos");
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SchoolStudent | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");
  const [expandedStudentFeeIds, setExpandedStudentFeeIds] = useState<string[]>([]);
  const [showDuesBreakdownTable, setShowDuesBreakdownTable] = useState<boolean>(false);
  const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);
  const [whatsappModalTarget, setWhatsappModalTarget] = useState<{
    fee: MonthlyFee;
    student?: SchoolStudent;
    isDueDemand: boolean;
  } | null>(null);
  const [showClassFeeAlertModal, setShowClassFeeAlertModal] = useState<boolean>(false);
  const [showRazorpaySettingsModal, setShowRazorpaySettingsModal] = useState<boolean>(false);

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
  const [customOnlinePaid, setCustomOnlinePaid] = useState<string>("0");
  const [customOfflinePaid, setCustomOfflinePaid] = useState<string>("");
  const [customPayMode, setCustomPayMode] = useState<string>("Cash");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [customChequeNo, setCustomChequeNo] = useState<string>("");
  const [customConcession, setCustomConcession] = useState<string>("");
  const [customPaymentDate, setCustomPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [feeDiscountSlabs, setFeeDiscountSlabs] = useState<FeeDiscountSlab[]>(() =>
    getSchoolFeeDiscountSlabs(schoolId, school)
  );

  React.useEffect(() => {
    setFeeDiscountSlabs(getSchoolFeeDiscountSlabs(schoolId, school));
  }, [schoolId, school?.feeDiscountSlabs]);

  React.useEffect(() => {
    const onSlabsUpdated = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (!detail?.schoolId || detail.schoolId === schoolId) {
        setFeeDiscountSlabs(getSchoolFeeDiscountSlabs(schoolId, school));
      }
    };
    window.addEventListener("fee-discount-slabs-updated", onSlabsUpdated);
    return () => window.removeEventListener("fee-discount-slabs-updated", onSlabsUpdated);
  }, [schoolId, school]);

  // Admission Fee Collection Modal State
  const [showAdmissionModal, setShowAdmissionModal] = useState<boolean>(false);
  const [showReceiptCancellationModal, setShowReceiptCancellationModal] = useState<boolean>(false);
  const [admSelectedStudentId, setAdmSelectedStudentId] = useState<string>("");
  const [admFeeItems, setAdmFeeItems] = useState<{ id: string; description: string; due: number }[]>([]);
  const [admConcession, setAdmConcession] = useState<number>(0);
  const [admPaidAmount, setAdmPaidAmount] = useState<string>("");
  const [admOnlinePaid, setAdmOnlinePaid] = useState<string>("0");
  const [admOfflinePaid, setAdmOfflinePaid] = useState<string>("");
  const [admPaidManual, setAdmPaidManual] = useState<boolean>(false);
  const [admPayMode, setAdmPayMode] = useState<string>("Cash");
  const [admPayRef, setAdmPayRef] = useState<string>("");
  const [admPaymentDate, setAdmPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [admSaving, setAdmSaving] = useState<boolean>(false);
  const [accountants, setAccountants] = useState<SchoolAccountant[]>([]);
  const [collectorRole, setCollectorRole] = useState<"accountant" | "manager">("accountant");
  const [selectedAccountantId, setSelectedAccountantId] = useState<string>("");
  const [collectorCustomName, setCollectorCustomName] = useState<string>("");
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
    code: getVisibleSchoolRegNo(school),
    principalPhone: school?.principalPhone || "",
    directorName: school?.directorName || "",
    directorPhone: school?.directorPhone || "",
    managerName: school?.managerName || "",
    managerPhone: school?.managerPhone || "",
    accountantName: school?.accountantName || "",
    principalSignatureUrl: school?.principalSignatureUrl || "",
    directorSignatureUrl: school?.directorSignatureUrl || "",
    managerSignatureUrl: school?.managerSignatureUrl || "",
    accountantSignatureUrl: school?.accountantSignatureUrl || "",
    customFields: school?.customFields || [],
    documentPrintFields: school?.documentPrintFields || {},
  }));

  const resolveActiveCollector = () => {
    if (collectorRole === "manager") {
      const mName = collectorCustomName.trim() || schoolDetails.managerName || school?.managerName || "Manager";
      const mSig = schoolDetails.managerSignatureUrl || school?.managerSignatureUrl || "";
      return {
        collectedBy: mName,
        collectedByRole: "manager" as const,
        collectedByName: mName,
        collectorSignatureUrl: mSig,
      };
    }
    const matchedAcc =
      accountants.find(a => a.id === selectedAccountantId) ||
      accountants.find(a => a.id === adminId || (actorName && a.name?.toLowerCase() === actorName.toLowerCase())) ||
      accountants.find(a => a.active !== false) ||
      accountants[0];
    const defaultAccName =
      matchedAcc?.name ||
      schoolDetails.accountantName ||
      school?.accountantName ||
      (actorName && actorName !== "Admin / Accountant" ? actorName : "Accountant");
    const aName = collectorCustomName.trim() || defaultAccName;
    const aSig = matchedAcc?.signatureUrl || schoolDetails.accountantSignatureUrl || school?.accountantSignatureUrl || "";
    return {
      collectedBy: aName,
      collectedByRole: "accountant" as const,
      collectedByName: aName,
      collectorSignatureUrl: aSig,
    };
  };

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
    else if (initialTool === "razorpay") setShowRazorpaySettingsModal(true);
    else if (initialTool === "cancel_receipt") setShowReceiptCancellationModal(true);

    const handleOpenTool = (e: any) => {
      const tool = e?.detail?.tool;
      if (tool === "qr_scanner") setShowQrScannerModal(true);
      else if (tool === "bus") setShowBusModal(true);
      else if (tool === "admission_receipt") openAdmissionModalForStudent();
      else if (tool === "class_rates") setShowClassFeeModal(true);
      else if (tool === "fee_alert") setShowClassFeeAlertModal(true);
      else if (tool === "header") setShowSchoolHeaderModal(true);
      else if (tool === "razorpay") setShowRazorpaySettingsModal(true);
      else if (tool === "cancel_receipt") setShowReceiptCancellationModal(true);
    };
    window.addEventListener("open-fee-tool", handleOpenTool);
    return () => window.removeEventListener("open-fee-tool", handleOpenTool);
  }, [initialTool]);

  useEffect(() => {
    if (showAdmissionModal && !admSelectedStudentId && students.length > 0) {
      openAdmissionModalForStudent(students[0]);
    }
  }, [showAdmissionModal, admSelectedStudentId, students.length]);

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
      code: getVisibleSchoolRegNo(school),
      principalPhone: school.principalPhone || previous.principalPhone || "",
      directorName: school.directorName || previous.directorName || "",
      directorPhone: school.directorPhone || previous.directorPhone || "",
      principalSignatureUrl: school.principalSignatureUrl || previous.principalSignatureUrl || "",
      directorSignatureUrl: school.directorSignatureUrl || previous.directorSignatureUrl || "",
      managerName: school.managerName || previous.managerName || "",
      managerPhone: school.managerPhone || previous.managerPhone || "",
      managerSignatureUrl: school.managerSignatureUrl || previous.managerSignatureUrl || "",
      accountantName: school.accountantName || previous.accountantName || "",
      accountantSignatureUrl: school.accountantSignatureUrl || previous.accountantSignatureUrl || "",
      customFields: school.customFields || previous.customFields || [],
      documentPrintFields: school.documentPrintFields || previous.documentPrintFields || {},
    }));
  }, [school]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setFeeError(null);
    const [fetchedStudents, allFeeData, schoolClasses, feeHistory, fetchedAccountants] = await Promise.all([
      getStudents(schoolId, classId, className, sessionId),
      getMonthlyFees(schoolId, month, classId, sessionId),
      getClasses(schoolId, sessionId),
      getSchoolFeeHistory(schoolId, sessionId),
      getAccountants(schoolId).catch(() => []),
    ]);
    setAccountants(Array.isArray(fetchedAccountants) ? fetchedAccountants : []);

    const isDemoSession = Boolean(sessionId && (sessionId === "demo_session_2026_27" || sessionId.startsWith("demo_") || sessionId.includes("demo")));

    let allStudents = fetchedStudents || [];
    if (!isDemoSession) {
      allStudents = allStudents.filter(s => !isDemoRecord(s));
    }
    if (allStudents.length === 0 && classId) {
      // Fallback: fetch all school students and filter with isStudentInClass
      const allSchoolStudents = await getStudents(schoolId, undefined, undefined, sessionId);
      const filteredSchoolStudents = !isDemoSession ? allSchoolStudents.filter(s => !isDemoRecord(s)) : allSchoolStudents;
      allStudents = filteredSchoolStudents.filter(s => isStudentInClass(s, classId, className));
    }

    // Strict session matching: students & fees belong strictly to the active session
    const matchesSession = (entitySessionId?: string) => {
      if (!sessionId) return true;
      if (isDemoSession) return true;
      return entitySessionId === sessionId;
    };

    const sts = allStudents.filter(student => matchesSession(student.sessionId));

    let cleanAllFeeData = allFeeData || [];
    if (!isDemoSession) {
      cleanAllFeeData = cleanAllFeeData.filter(f => !isDemoRecord(f));
    }

    const feeData = cleanAllFeeData.filter(fee => !fee.sessionId || matchesSession(fee.sessionId));

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

    // Pre-index history by studentId: Map<studentId, Map<month, MonthlyFee>>
    // and legacy unpaid fees for 0ms instantaneous O(1) lookups
    const studentHistoryByMonth = new Map<string, Map<string, MonthlyFee>>();
    const studentLegacyMap = new Map<string, MonthlyFee[]>();
    history.forEach(h => {
      if (!h.studentId) return;
      let monthMap = studentHistoryByMonth.get(h.studentId);
      if (!monthMap) {
        monthMap = new Map<string, MonthlyFee>();
        studentHistoryByMonth.set(h.studentId, monthMap);
      }
      if (h.month) {
        monthMap.set(h.month, h);
      }
    });

    const classLookupMap = new Map<string, SchoolClass>();
    schoolClasses.forEach(c => classLookupMap.set(c.id, c));

    // Create fee records for students without one
    const feeMap = new Map(feeData.map(f => [f.studentId, f]));
    const allFees: MonthlyFee[] = sts.map(student => {
      const existing = feeMap.get(student.id);

      const targetClass = classLookupMap.get(student.classId || "") ||
        schoolClasses.find((c: SchoolClass) => isStudentInClass(student, c.id, c.name)) ||
        classLookupMap.get(classId || "") || rawClasses[0];
      const struct = targetClass?.feeStructure;
      const defaultTuition = Number(
        student.monthlyFee ||
          getMonthlyFeeFromStructure(struct, targetClass?.defaultFee ?? 2000, student.section)
      );
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

      // Check each prior month in running session using O(1) map
      let calculatedArrears = 0;
      const unpaidMonthsSet = new Set<string>();
      const studentMonthMap = studentHistoryByMonth.get(student.id);

      priorSessionMonths.forEach(pMonth => {
        const histFee = studentMonthMap?.get(pMonth);
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

      // Also include any legacy unpaid fees strictly prior to studentStartMonth from studentMonthMap
      if (studentMonthMap) {
        studentMonthMap.forEach((lf, mKey) => {
          if (mKey < studentStartMonth && getUnpaidDue(lf) > 0) {
            calculatedArrears += getUnpaidDue(lf);
            unpaidMonthsSet.add(lf.month);
          }
        });
      }

      // Carry forward unpaid Previous Session Back-Due & Admission Fee Balance onto every Fee Slip until completely paid
      const prevSessionDue = Math.max(0, Number(student.previousSessionDue || 0));
      if (prevSessionDue > 0) {
        calculatedArrears += prevSessionDue;
        unpaidMonthsSet.add("0000-BACK-DUE");
      }
      const admDueBal = Math.max(0, Number(student.admissionDueBalance || 0));
      if (admDueBal > 0) {
        calculatedArrears += admDueBal;
        unpaidMonthsSet.add("0001-ADM-DUE");
      }

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
      const pctDisc = Number(student.siblingDiscountPct || 0) > 0
        ? Math.round((monthlyAmount * Number(student.siblingDiscountPct)) / 100)
        : 0;
      const permanentStudentDiscount = student.isFreeEducation
        ? monthlyAmount
        : Math.max(Number(student.siblingDiscountAmount || 0), pctDisc);
      const concession = Number(existing?.concession ?? permanentStudentDiscount);

      const currentMonthHeadsTotal = Math.max(0, monthlyAmount + admFee + cauFee + annFee + busFee - concession);

      const hasPersistentCarryDue = prevSessionDue > 0 || admDueBal > 0;
      const totalAmount = existing?.paid && (!existing.balanceDue || existing.balanceDue === 0) && !hasPersistentCarryDue
        ? Number(existing.amount ?? currentMonthHeadsTotal)
        : currentMonthHeadsTotal + arrearsAmount;

      const isPaid = Boolean(existing?.paid) && !hasPersistentCarryDue;
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

      const effectiveArrears = isPaid && balanceDue === 0 && !hasPersistentCarryDue ? Number(existing?.arrearsAmount || 0) : arrearsAmount;
      const effectiveArrearsMonths = isPaid && balanceDue === 0 && !hasPersistentCarryDue ? (existing?.arrearsMonths || []) : arrearsMonths;
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

    const collectorInfo = paid ? resolveActiveCollector() : undefined;
    const updatedFee: MonthlyFee = {
      ...fee,
      month,
      paid,
      paidAmount,
      balanceDue,
      receiptNo,
      paidDate,
      paidBy,
      collectedBy: paid ? collectorInfo?.collectedBy : undefined,
      collectedByRole: paid ? collectorInfo?.collectedByRole : undefined,
      collectedByName: paid ? collectorInfo?.collectedByName : undefined,
      collectorSignatureUrl: paid ? collectorInfo?.collectorSignatureUrl : undefined,
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
        await markFeePaid(schoolId, fee.studentId, month, adminId, collectorInfo);
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
    const baseMonthly = Number(
      fee.monthlyAmount ??
        getMonthlyFeeFromStructure(struct, targetClass?.defaultFee ?? 2000, student?.section)
    );
    setCustomMonthlyAmount(String(baseMonthly));

    const todayDateStr = fee.paidDate ? fee.paidDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setCustomPaymentDate(todayDateStr);

    // Parse day cleanly without timezone shifts (e.g. 2026-11-09 -> 9)
    const dayParts = todayDateStr.split("-");
    const paymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
    const slabMatch = resolveSlabForDay(feeDiscountSlabs, paymentDay, baseMonthly);
    const earlyDisc = fee.paid ? Number(fee.earlyDiscount || 0) : slabMatch.discountAmount;
    const pctDisc = Number(student?.siblingDiscountPct || 0) > 0
      ? Math.round((baseMonthly * Number(student?.siblingDiscountPct)) / 100)
      : 0;
    const permanentDisc = student?.isFreeEducation
      ? baseMonthly
      : Math.max(Number(student?.siblingDiscountAmount || 0), pctDisc);
    const baseConcession = Number(fee.concession ?? permanentDisc);
    const effectiveConcession = fee.paid
      ? Math.max(baseConcession, Number(fee.earlyDiscount || 0) + permanentDisc)
      : (earlyDisc > 0 ? earlyDisc + permanentDisc : baseConcession);
    setCustomConcession(effectiveConcession > 0 ? String(effectiveConcession) : "");

    // Auto calculate net payable: Old Arrears (no discount) + Discounted Current Tuition
    const arrears = Number(fee.arrearsAmount || 0);
    const autoNetPayable = arrears + Math.max(0, baseMonthly - effectiveConcession);

    // Auto pre-fill with net payable (e.g. 300 arrears + 360 current = 660) if new collection, or prior paidAmount
    const initialPaid = fee.paid && Number(fee.paidAmount || 0) > 0
      ? String(fee.paidAmount)
      : String(autoNetPayable);
    setCustomPaidAmount(initialPaid);

    setCustomPayMode(fee.payModeInfo?.payMode || "Cash");
    setCustomBankName(fee.payModeInfo?.bank || "");
    setCustomChequeNo(fee.payModeInfo?.number || "");
    setCollectorRole(fee.collectedByRole === "manager" ? "manager" : "accountant");
    setCollectorCustomName(fee.collectedByName || "");
  };

  const buildAdmissionItemsForStudent = (targetStudent: SchoolStudent | null) => {
    if (!targetStudent) return [];
    const cls = rawClasses.find(c => c.id === targetStudent.classId);
    const fs = cls?.feeStructure;
    const items: { id: string; description: string; due: number }[] = [];
    if (fs?.feeGroups && Array.isArray(fs.feeGroups) && fs.feeGroups.length > 0) {
      fs.feeGroups.forEach((grp) => {
        if (grp.enabled === false) return;
        if (!matchesStudentSection(grp.targetSection, targetStudent.section)) return;
        const { summary: grpSummary, itemsWithNet } = getGroupNetItems(grp);
        const offSuffix =
          grpSummary.discount > 0
            ? `${grp.discountLabel ? `${grp.discountLabel} • ` : ""}${grpSummary.badgeText}`
            : "";
        itemsWithNet.forEach(({ item: it, netAmount, itemDiscount }) => {
          if (it.enabled === false) return;
          if (!matchesStudentSection(it.targetSection, targetStudent.section)) return;
          const isBus = Boolean(it.isUserOptional || it.legacyKey === "busFee");
          if (isBus) {
            if (targetStudent.usesBus) {
              const bAmt = Number(targetStudent.busFee || netAmount || 0);
              if (bAmt > 0) {
                items.push({
                  id: `adm_bus_${it.id}`,
                  description: `${it.name} (${targetStudent.busRoute || "Bus"}${itemDiscount > 0 ? ` • ${grpSummary.badgeText}` : ""})`,
                  due: bAmt,
                });
              }
            }
            return;
          }
          if (netAmount > 0 || (Number(it.amount || 0) > 0 && itemDiscount > 0)) {
            const grpName = grp.title ? grp.title.split("(")[0].trim() : "";
            const metaText = [grpName, itemDiscount > 0 ? offSuffix : ""].filter(Boolean).join(" • ");
            items.push({
              id: `adm_fg_${it.id}`,
              description: metaText ? `${it.name} — ${metaText}` : it.name,
              due: netAmount,
            });
          }
        });
      });
      if (items.length > 0) return items;
    }
    if (fs) {
      if (Number(fs.admissionFee) > 0) items.push({ id: "adm_1", description: "Admission Fee (प्रवेश शुल्क)", due: Number(fs.admissionFee) });
      if (Number(fs.cautionMoney) > 0) items.push({ id: "adm_2", description: "Registration / Form Fee", due: Number(fs.cautionMoney) });
      if (Number(fs.annualCharges) > 0) items.push({ id: "adm_3", description: "Annual / Development Fund", due: Number(fs.annualCharges) });
      if (Number(fs.tuitionFee) > 0) items.push({ id: "adm_4", description: "1st Month Tuition Fee", due: Number(fs.tuitionFee) });
      if (Array.isArray(fs.customHeads)) {
        fs.customHeads.forEach((h, i) => {
          if (h.enabled !== false && Number(h.amount) > 0) items.push({ id: `adm_c_${i}`, description: h.name, due: Number(h.amount) });
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

  const openStudentAdmissionStudio = (
    targetStudent?: Partial<SchoolStudent> | null,
    fallbackFee?: MonthlyFee | null,
    studioMode: AdmissionPrintMode = "form_only"
  ) => {
    const stId = targetStudent?.id || fallbackFee?.studentId;
    const resolvedStudent =
      (stId ? students.find((s) => s.id === stId) : null) ||
      (targetStudent as SchoolStudent) ||
      (fallbackFee
        ? ({
            id: fallbackFee.studentId,
            schoolId,
            sessionId: sessionId || "2026-27",
            classId: fallbackFee.classId,
            name: fallbackFee.studentName || "Student",
            rollNo: fallbackFee.rollNo || "1",
            monthlyFee: fallbackFee.monthlyAmount || fallbackFee.amount || 0,
            active: true,
            createdAt: new Date().toISOString(),
          } as SchoolStudent)
        : students[0] || null);

    if (!resolvedStudent) {
      setFeeError("कृपया पहले एक छात्र चुनें!");
      return;
    }

    const localFees = getLocalFees(schoolId);
    const allSources = [...feeHistory, ...fees, ...localFees];
    const matchedAdmFee =
      allSources.find(
        (f) =>
          (f.feeType === "admission" || f.receiptCategory === "admission") &&
          ((resolvedStudent.admissionReceiptNo && f.receiptNo === resolvedStudent.admissionReceiptNo) ||
            f.studentId === resolvedStudent.id)
      ) ||
      (fallbackFee && (fallbackFee.feeType === "admission" || fallbackFee.receiptCategory === "admission")
        ? fallbackFee
        : null);

    setAdmPrintStudio({
      open: true,
      student: resolvedStudent,
      fee: matchedAdmFee,
      mode: studioMode,
    });
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
  const effectiveAdmConcession = canGiveDiscount ? clampDiscountAmount(admGross, admConcession) : 0;
  const admNet = Math.max(0, admGross - effectiveAdmConcession);

  const handleSaveAdmissionFee = async (mode: AdmissionPrintMode = "receipt_only") => {
    const student = students.find(s => s.id === admSelectedStudentId);
    if (!student) {
      setFeeError("कृपया पहले एक छात्र चुनें!");
      return;
    }
    setFeeError(null);
    setAdmSaving(true);
    try {
      const onlAmt = Math.max(0, Number(admOnlinePaid) || 0);
      const offAmt = Math.max(0, Number(admOfflinePaid) || 0);
      const paidAmt = onlAmt + offAmt > 0 ? onlAmt + offAmt : Math.max(0, Number(admPaidAmount) || 0);
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
          con: idx === 0 ? Math.min(Number(it.due) || 0, effectiveAdmConcession) : 0,
          paid: Number(it.due) || 0,
        }));

      const splitAdmPayInfo = buildSplitPayModeInfo({
        onlineAmount: onlAmt,
        offlineAmount: offAmt > 0 || onlAmt > 0 ? offAmt : paidAmt,
        date: new Date(admPaymentDate || Date.now()).toLocaleDateString("en-IN"),
        number: admPayRef.trim() || "-",
        fallbackMode: admPayMode,
      });

      const admCollectorInfo = resolveActiveCollector();
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
        collectedBy: admCollectorInfo.collectedBy,
        collectedByRole: admCollectorInfo.collectedByRole,
        collectedByName: admCollectorInfo.collectedByName,
        collectorSignatureUrl: admCollectorInfo.collectorSignatureUrl,
        receiptNo,
        paidAmount: paidAmt,
        balanceDue: balanceAmt,
        concession: effectiveAdmConcession,
        note: effectiveAdmConcession > 0 ? "Admission Fee Concession • Waived (Not carried forward)" : undefined,
        feeType: "admission",
        receiptCategory: "admission",
        includeBusFee: Boolean(student.usesBus),
        busFeeAmount: student.usesBus ? Number(student.busFee) || 0 : 0,
        busRoute: student.busRoute,
        payModeInfo: splitAdmPayInfo,
        items: finalItems,
      };

      await saveFee(admissionFeeRecord);

      if (effectiveAdmConcession > 0) {
        recordDiscountEntry(schoolId, {
          studentId: student.id,
          studentName: student.name,
          className: classNames[student.classId] || student.className || "",
          section: student.section || "",
          rollNo: student.rollNo,
          category: "admission",
          whereLabel: "Admission Fee",
          grossAmount: admGross,
          discountAmount: effectiveAdmConcession,
          discountPct: admGross > 0 ? Math.round((effectiveAdmConcession / admGross) * 1000) / 10 : 5,
          givenByName: actorName,
          givenByRole: userRole,
          note: `Online ₹${splitAdmPayInfo.onlineAmount || 0} + Offline ₹${splitAdmPayInfo.offlineAmount || 0}`,
        });
      }

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

    // Calculate date-limited discount based on configured discount slabs & selected payment date
    const dateStr = customPaymentDate || new Date().toISOString().slice(0, 10);
    const dayParts = dateStr.split("-");
    const paymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
    const slabResolution = resolveSlabForDay(feeDiscountSlabs, paymentDay, monthlyAmount);
    const earlyDiscount = canGiveDiscount ? slabResolution.discountAmount : 0;

    const currentHeadsGross = monthlyAmount + admAmount + cauAmount + annAmount + busAmount;
    const rawManualConcession = canGiveDiscount ? Math.max(0, Number(customConcession) || 0) : 0;
    const manualConcession = clampDiscountAmount(currentHeadsGross, rawManualConcession);
    const totalConcession = Math.max(manualConcession, earlyDiscount);

    // Discount is permanently waived on current month heads and NEVER added to next month's due/arrears
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

    const splitOnline = Math.max(0, Number(customOnlinePaid) || 0);
    const splitOffline = Math.max(0, Number(customOfflinePaid) || 0);
    const combinedSplit = splitOnline + splitOffline;
    const effectivePaid = combinedSplit > 0 ? combinedSplit : Math.max(0, Number(customPaidAmount) || 0);
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
    const payModeInfo = buildSplitPayModeInfo({
      onlineAmount: splitOnline,
      offlineAmount: splitOffline > 0 || splitOnline > 0 ? splitOffline : (customPayMode === "Cash" ? effectivePaid : 0),
      date: new Date(paidDate).toLocaleDateString("en-IN"),
      bank: customBankName,
      number: customChequeNo,
      fallbackMode: customPayMode,
    });

    if (totalConcession > 0) {
      recordDiscountEntry(schoolId, {
        studentId: fee.studentId,
        studentName: student?.name || fee.studentName || "Student",
        className: classNames[fee.classId] || student?.className || "",
        section: student?.section || "",
        rollNo: student?.rollNo || fee.rollNo,
        category: "monthly_fee",
        whereLabel: `Monthly Fee (${formatMonthLabel(fee.month)})`,
        grossAmount: currentHeadsGross,
        discountAmount: totalConcession,
        discountPct: currentHeadsGross > 0 ? Math.round((totalConcession / currentHeadsGross) * 1000) / 10 : 5,
        givenByName: actorName,
        givenByRole: userRole,
        note: `Online ₹${payModeInfo.onlineAmount || 0} + Offline ₹${payModeInfo.offlineAmount || 0}`,
      });
    }

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
        if (m === "0000-BACK-DUE") {
          const backDueVal = Math.max(0, Number(student?.previousSessionDue || 0));
          return {
            month: m,
            label: formatMonthLabel(m),
            monthlyAmount: backDueVal,
            totalDue: backDueVal,
            alreadyPaid: 0,
            totalBill: backDueVal,
          };
        }
        if (m === "0001-ADM-DUE") {
          const admDueVal = Math.max(0, Number(student?.admissionDueBalance || 0));
          return {
            month: m,
            label: formatMonthLabel(m),
            monthlyAmount: admDueVal,
            totalDue: admDueVal,
            alreadyPaid: 0,
            totalBill: admDueVal,
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

    const collectorInfo = effectivePaid > 0 ? resolveActiveCollector() : undefined;

    // Settle every month in the database via FIFO! (Skip synthetic carry-due rows; they update student fields directly)
    for (const alloc of fifoResult.allocations) {
      if (alloc.month === "0000-BACK-DUE" || alloc.month === "0001-ADM-DUE") continue;
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
        collectedBy: alloc.allocatedThisTime > 0 ? collectorInfo?.collectedBy : existingRecord?.collectedBy,
        collectedByRole: alloc.allocatedThisTime > 0 ? collectorInfo?.collectedByRole : existingRecord?.collectedByRole,
        collectedByName: alloc.allocatedThisTime > 0 ? collectorInfo?.collectedByName : existingRecord?.collectedByName,
        collectorSignatureUrl: alloc.allocatedThisTime > 0 ? collectorInfo?.collectorSignatureUrl : existingRecord?.collectorSignatureUrl,
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
      collectedBy: effectivePaid > 0 ? collectorInfo?.collectedBy : undefined,
      collectedByRole: effectivePaid > 0 ? collectorInfo?.collectedByRole : undefined,
      collectedByName: effectivePaid > 0 ? collectorInfo?.collectedByName : undefined,
      collectorSignatureUrl: effectivePaid > 0 ? collectorInfo?.collectorSignatureUrl : undefined,
      receiptNo: effectivePaid > 0 ? receiptNo : undefined,
      payModeInfo,
      items: fifoResult.receiptItems.length > 0 ? fifoResult.receiptItems : [],
      note: earlyDiscount > 0
        ? `Paid on day ${paymentDay} (${slabResolution.label || "Date Offer"}) (-₹${earlyDiscount}) (Receipt: ${receiptNo})`
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
        await markFeePaid(schoolId, fee.studentId, month, adminId, collectorInfo);
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
        // Deduct exact FIFO allocations for Back Session Due & Admission Due so unpaid balances stay on Fee Slips until 0
        const backDueAlloc = fifoResult.allocations.find(a => a.month === "0000-BACK-DUE");
        if (backDueAlloc) {
          studentPatch.previousSessionDue = Math.max(0, Number(backDueAlloc.balanceDueAfter || 0));
        }

        const admAlloc = fifoResult.allocations.find(a => a.month === "0001-ADM-DUE");
        const curAdmDue = Number(student.admissionDueBalance || 0);
        if (admAlloc) {
          const clearedAdm = Math.max(0, Number(admAlloc.allocatedThisTime || 0));
          const remainingAdm = Math.max(0, Number(admAlloc.balanceDueAfter || 0));
          studentPatch.admissionDueBalance = remainingAdm;
          if (clearedAdm > 0) {
            studentPatch.admissionPaidAmount = Number(student.admissionPaidAmount || 0) + clearedAdm;
            studentPatch.admissionBalanceHistory = [
              ...(student.admissionBalanceHistory || []),
              {
                date: paidDate,
                paidAmount: clearedAdm,
                remainingDue: remainingAdm,
                receiptNo,
                paymentMode: customPayMode || "Cash",
              },
            ];
          }
        } else if (curAdmDue > 0 && effectivePaid > 0) {
          const clearedAdm = updatedFee.paid
            ? curAdmDue
            : Math.min(curAdmDue, effectivePaid);
          const remainingAdm = Math.max(0, curAdmDue - clearedAdm);
          studentPatch.admissionDueBalance = remainingAdm;
          studentPatch.admissionPaidAmount = Number(student.admissionPaidAmount || 0) + clearedAdm;
          studentPatch.admissionBalanceHistory = [
            ...(student.admissionBalanceHistory || []),
            {
              date: paidDate,
              paidAmount: clearedAdm,
              remainingDue: remainingAdm,
              receiptNo,
              paymentMode: customPayMode || "Cash",
            },
          ];
        }
        if (Object.keys(studentPatch).length > 0) {
          setStudents(prev => prev.map(st => st.id === student.id ? { ...st, ...studentPatch } : st));
          try {
            await updateStudent(schoolId, student.id, studentPatch);
          } catch (syncErr) {
            console.warn("Could not sync student due/bus details:", syncErr);
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

  const studentByIdMap = React.useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
  const classByIdMap = React.useMemo(() => new Map(rawClasses.map(c => [c.id, c])), [rawClasses]);

  const paidFees = fees.filter(f => f.paid && (!f.balanceDue || f.balanceDue === 0));
  const partialFees = fees.filter(f => (Number(f.paidAmount || 0) > 0 && Number(f.balanceDue || 0) > 0) || (!f.paid && Number(f.paidAmount || 0) > 0));
  const unpaidFees = fees.filter(f => !f.paid || (f.balanceDue !== undefined && f.balanceDue > 0));
  const busFees = fees.filter(f => {
    const s = studentByIdMap.get(f.studentId);
    return Boolean(f.includeBusFee || s?.usesBus);
  });
  const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const collectedAmount = fees.reduce((sum, f) => sum + (f.paidAmount !== undefined ? Number(f.paidAmount) : (f.paid ? Number(f.amount || 0) : 0)), 0);
  const pendingAmount = Math.max(0, totalAmount - collectedAmount);
  const feeChannelBreakdown = React.useMemo(() => computePaymentBreakdown({ fees }), [fees]);

  const filteredFees = fees.filter(f => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const s = studentByIdMap.get(f.studentId);
      const nameMatch = (f.studentName || "").toLowerCase().includes(q);
      const rollMatch = (f.rollNo || "").toLowerCase().includes(q);
      const admMatch = (s?.admissionNo || "").toLowerCase().includes(q);
      if (!nameMatch && !rollMatch && !admMatch) return false;
    }

    if (duesFilter === "paid") return f.paid && (!f.balanceDue || f.balanceDue === 0);
    if (duesFilter === "partial") return (Number(f.paidAmount || 0) > 0 && Number(f.balanceDue || 0) > 0) || (!f.paid && Number(f.paidAmount || 0) > 0);
    if (duesFilter === "unpaid") return !f.paid || (f.balanceDue !== undefined && f.balanceDue > 0);
    if (duesFilter === "bus") {
      const s = studentByIdMap.get(f.studentId);
      return Boolean(f.includeBusFee || s?.usesBus);
    }
    if (duesFilter === "due3") return !f.paid && (f.arrearsMonths?.length || 0) >= 3;
    if (duesFilter === "due6") return !f.paid && (f.arrearsMonths?.length || 0) >= 6;
    if (duesFilter === "due8") return !f.paid && (f.arrearsMonths?.length || 0) >= 8;
    return true;
  });

  const feePageSize = 50;
  const totalFeePages = Math.max(1, Math.ceil(filteredFees.length / feePageSize));
  const currentFeePage = Math.min(feePage, totalFeePages);
  const paginatedFees = React.useMemo(() => {
    const start = (currentFeePage - 1) * feePageSize;
    return filteredFees.slice(start, start + feePageSize);
  }, [filteredFees, currentFeePage, feePageSize]);

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
      showSchoolField("managerName") && schoolDetails.managerName ? `Manager: ${schoolDetails.managerName}` : "",
      showSchoolField("managerPhone") && schoolDetails.managerPhone ? `Manager mobile: ${schoolDetails.managerPhone}` : "",
      showSchoolField("affiliation") && schoolDetails.affiliation ? schoolDetails.affiliation : "",
      showSchoolField("code") && getVisibleSchoolRegNo(school, schoolDetails.code) ? `Reg. No: ${getVisibleSchoolRegNo(school, schoolDetails.code)}` : "",
      ...(showSchoolField("customFields") ? (schoolDetails.customFields || [])
        .filter(field => field.label?.trim() && field.value?.trim())
        .map(field => `${field.label}: ${field.value}`) : []),
    ].filter(Boolean).map(value => `<div>${escapeHtml(value)}</div>`).join("");
    const cleanedQuickLogo = getSavedSchoolLogo(schoolDetails.logoUrl || school?.logoUrl);
    const schoolLogoHtml = cleanedQuickLogo
      ? `<img src="${escapeHtml(cleanedQuickLogo)}" alt="Logo" style="width:38px;height:38px;object-fit:contain;border-radius:6px;border:1px solid #cbd5e1;background:#ffffff;margin-right:8px;flex-shrink:0;" />`
      : "";
    const collectorRole = fee.collectedByRole === "manager" ? "manager" : "accountant";
    const collectorLabel = collectorRole === "manager" ? "Manager Sign" : "Accountant Sign";
    const collectorSig = collectorRole === "manager"
      ? (fee.collectorSignatureUrl || schoolDetails.managerSignatureUrl || school?.managerSignatureUrl || "")
      : (fee.collectorSignatureUrl || schoolDetails.accountantSignatureUrl || school?.accountantSignatureUrl || "");
    const collectorDisplay = fee.collectedByName || fee.collectedBy || (collectorRole === "manager" ? (schoolDetails.managerName || school?.managerName) : (schoolDetails.accountantName || school?.accountantName)) || "";
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
        ${paid && collectorDisplay ? `<div><span>Collected By</span><strong>${escapeHtml(`${collectorRole === "manager" ? "Manager" : "Accountant"} (${collectorDisplay})`)}</strong></div>` : ""}
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
        <span class="sig" style="display:inline-flex; align-items:flex-end; gap:12px;">
          ${paid ? `<span style="display:inline-flex; flex-direction:column; align-items:center;">
            ${collectorSig ? `<img src="${escapeHtml(collectorSig)}" style="height:15px; max-width:65px; object-fit:contain; margin-bottom:2px;" alt="${escapeHtml(collectorLabel)}" />` : ""}
            <span>${escapeHtml(collectorLabel)}</span>
          </span>` : ""}
          <span style="display:inline-flex; flex-direction:column; align-items:flex-end;">
            ${schoolDetails.principalSignatureUrl ? `<img src="${escapeHtml(schoolDetails.principalSignatureUrl)}" style="height:15px; max-width:65px; object-fit:contain; margin-bottom:2px;" alt="Principal Sign" />` : ""}
            <span>${schoolDetails.principalName ? escapeHtml(schoolDetails.principalName) : "Principal Sign"}</span>
          </span>
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
    const student = studentByIdMap.get(fee.studentId) || students.find(s => s.id === fee.studentId);
    const admDue = Math.max(0, Number(student?.admissionDueBalance || 0));
    const nonAdmArrears = Math.max(0, arrears - admDue);
    const nonAdmMonths = (fee.arrearsMonths || []).filter((m) => m !== "0001-ADM-DUE");

    const conciseArrears = formatConciseArrearsMonths(nonAdmMonths);
    const formattedMonths = conciseArrears ? ` (${conciseArrears})` : "";

    if (fee.items && fee.items.length > 0) {
      const nextItems = [...fee.items];
      const hasAdmDueItem = nextItems.some(
        (it) => it.id === "adm-due" || it.description.toLowerCase().includes("admission balance due") || it.description.includes("प्रवेश बकाया")
      );
      if (admDue > 0 && !hasAdmDueItem) {
        nextItems.push({
          id: "adm-due",
          slNo: nextItems.length + 1,
          description: "Admission Balance Due (प्रवेश बकाया)",
          due: admDue,
          con: 0,
          paid: 0,
        });
      }
      const hasArrearsItem = nextItems.some(
        (it) => it.id === "arrears" || it.description.toLowerCase().includes("arrears") || it.description.toLowerCase().includes("back due")
      );
      if (nonAdmArrears > 0 && !hasArrearsItem) {
        nextItems.push({
          id: "arrears",
          slNo: nextItems.length + 1,
          description: `Back Due / Previous Arrears${formattedMonths}`,
          due: nonAdmArrears,
          con: 0,
          paid: isPaid ? nonAdmArrears : (fee.paidAmount && fee.paidAmount > (fee.monthlyAmount || 0) ? Math.min(nonAdmArrears, fee.paidAmount - (fee.monthlyAmount || 0)) : 0),
        });
      }
      return nextItems;
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

    // 6. Unpaid Admission Balance Due Carry-Forward (until cleared to ₹0)
    if (admDue > 0) {
      itemsList.push({
        id: "adm-due",
        slNo: sl++,
        description: "Admission Balance Due (प्रवेश बकाया)",
        due: admDue,
        con: 0,
        paid: 0,
      });
    }

    // 7. Back Due / Previous Monthly & Session Arrears
    if (nonAdmArrears > 0) {
      itemsList.push({
        id: "arrears",
        slNo: sl++,
        description: `Back Due / Previous Arrears${formattedMonths}`,
        due: nonAdmArrears,
        con: 0,
        paid: isPaid ? nonAdmArrears : (fee.paidAmount && fee.paidAmount > baseFee ? Math.min(nonAdmArrears, fee.paidAmount - baseFee) : 0),
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
      showDigitalSignature: Boolean(
        schoolDetails.principalSignatureUrl ||
        schoolDetails.accountantSignatureUrl ||
        schoolDetails.managerSignatureUrl ||
        schoolDetails.directorSignatureUrl ||
        fee.collectorSignatureUrl
      ),
      principalSignatureUrl: schoolDetails.principalSignatureUrl,
      principalName: schoolDetails.principalName || "Principal",
      principalTitle: "Principal",
      directorSignatureUrl: schoolDetails.directorSignatureUrl,
      directorName: schoolDetails.directorName,
      managerSignatureUrl: schoolDetails.managerSignatureUrl || school?.managerSignatureUrl,
      managerName: schoolDetails.managerName || school?.managerName || "Manager",
      accountantSignatureUrl: schoolDetails.accountantSignatureUrl || school?.accountantSignatureUrl,
      accountantName: schoolDetails.accountantName || school?.accountantName || "Accountant",
      collectedByRole: fee.collectedByRole || "accountant",
      collectedByName: fee.collectedByName,
      collectorSignatureUrl: fee.collectorSignatureUrl,
      signatoryMode: fee.paid || Number(fee.paidAmount || 0) > 0 ? "both" : "principal_only",
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

  // Dynamic date-limited discount calculation based on selected payment date & school slabs:
  const dayParts = (customPaymentDate || "").split("-");
  const modalPaymentDay = dayParts.length >= 3 ? parseInt(dayParts[2], 10) : new Date().getDate();
  const modalSlabMatch = resolveSlabForDay(feeDiscountSlabs, modalPaymentDay, modalMonthly);
  const isEarlyBirdEligible = Boolean(modalSlabMatch.matchedSlab && modalSlabMatch.discountAmount > 0);
  const modalEarlyDiscount = modalSlabMatch.discountAmount;

  const modalConcession = Number(customConcession) || 0;
  // For unpaid fees, evaluate dynamically by payment date; retain stored discount only if already paid
  const effectiveEarlyDiscount = collectingFee?.paid
    ? Number(collectingFee.earlyDiscount || 0)
    : modalEarlyDiscount;
  const modalSlabValueText = modalSlabMatch.matchedSlab
    ? (modalSlabMatch.matchedSlab.discountType === "fixed"
        ? `₹${modalSlabMatch.matchedSlab.discountValue} OFF`
        : `${modalSlabMatch.matchedSlab.discountValue}% OFF`)
    : (effectiveEarlyDiscount > 0 ? `₹${effectiveEarlyDiscount} OFF` : "");
  const modalSlabsSummary = formatSlabsHeadline(feeDiscountSlabs);

  // Date-limited offer applies strictly to regular tuition fee, never to old arrears
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

    // Compute arrears breakdown matching modalArrears exactly
    const arrearsMonthsList = sorted.filter(m => m !== collectingFee.month);
    const standardRate = modalMonthly + modalBus;

    const activeCollectingStudent = students.find(st => st.id === collectingFee.studentId);

    // Check if recorded history matches modalArrears exactly
    const histRecords = arrearsMonthsList.map(m => {
      if (m === "0000-BACK-DUE") {
        const backVal = Math.max(0, Number(activeCollectingStudent?.previousSessionDue || 0));
        return { month: m, hist: undefined, alreadyPaid: 0, due: backVal };
      }
      if (m === "0001-ADM-DUE") {
        const admVal = Math.max(0, Number(activeCollectingStudent?.admissionDueBalance || 0));
        return { month: m, hist: undefined, alreadyPaid: 0, due: admVal };
      }
      const hist = localFeeList.find(h => h.studentId === collectingFee.studentId && h.month === m)
        || feeHistory.find(h => h.studentId === collectingFee.studentId && h.month === m);
      const alreadyPaid = Number(hist?.paidAmount || 0);
      const due = hist?.balanceDue !== undefined
        ? Number(hist.balanceDue)
        : (hist?.paid ? 0 : Number(hist?.amount || hist?.monthlyAmount || standardRate));
      return { month: m, hist, alreadyPaid, due };
    });

    const sumHistDues = histRecords.reduce((acc, h) => acc + h.due, 0);
    const useDirectHist = sumHistDues === modalArrears && sumHistDues > 0;

    // If history sum does not match actual modalArrears, allocate modalArrears chronologically (preserving exact synthetic due items first)
    let arrearsRemaining = modalArrears;
    const allocatedArrearsMap = new Map<string, number>();
    arrearsMonthsList.forEach((m, idx) => {
      if (m === "0000-BACK-DUE" || m === "0001-ADM-DUE") {
        const exactVal = Math.min(arrearsRemaining, histRecords.find(h => h.month === m)?.due || 0);
        allocatedArrearsMap.set(m, exactVal);
        arrearsRemaining = Math.max(0, arrearsRemaining - exactVal);
        return;
      }
      const isLastArrears = idx === arrearsMonthsList.length - 1;
      const alloc = isLastArrears
        ? Math.max(0, arrearsRemaining)
        : Math.min(standardRate, Math.max(0, arrearsRemaining));
      allocatedArrearsMap.set(m, alloc);
      arrearsRemaining = Math.max(0, arrearsRemaining - alloc);
    });

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

        const histItem = histRecords.find(h => h.month === m);
        const alreadyPaid = histItem?.alreadyPaid || 0;
        const due = useDirectHist
          ? (histItem?.due || 0)
          : (allocatedArrearsMap.get(m) ?? 0);

        return {
          month: m,
          label: formatMonthLabel(m),
          monthlyAmount: (m === "0000-BACK-DUE" || m === "0001-ADM-DUE") ? due : Number(histItem?.hist?.monthlyAmount || standardRate),
          totalDue: due,
          alreadyPaid,
          totalBill: (m === "0000-BACK-DUE" || m === "0001-ADM-DUE") ? due : Math.max(due, Number(histItem?.hist?.amount || standardRate)),
        };
      })
      .filter(item => item.totalDue > 0 || item.month === collectingFee.month);
  }, [collectingFee, modalMonthly, modalCurrentMonthBill, modalBus, modalArrears, schoolId, feeHistory, students]);

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
            {className || "All Classes"} — Fee Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {students.length} students enrolled
          </p>
        </div>
        <div className="flex items-center gap-2 relative shrink-0">
          {/* Quick Search */}
          <div className="relative hidden sm:block">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or roll..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/15 dark:focus:ring-white/20 w-40 lg:w-52"
            />
          </div>

          {/* Quick Excel Export */}
          <button
            type="button"
            onClick={exportFeeRegisterToExcel}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors active:scale-95 cursor-pointer whitespace-nowrap"
            title="Download complete Fee Due Register (.CSV for Excel)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 max-w-3xl mx-auto">
        {feeError && (
          <div role="alert" className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs sm:text-sm text-red-800 dark:text-red-200">
            {feeError}
          </div>
        )}
        {pushBannerMsg && (
          <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 p-3 text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center justify-between gap-2">
            <span>{pushBannerMsg}</span>
            <button onClick={() => setPushBannerMsg(null)} className="text-indigo-500 hover:text-indigo-800 dark:hover:text-indigo-100 cursor-pointer px-1">✕</button>
          </div>
        )}

        {/* Month Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-center">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {new Date(month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">· Billing Cycle</span>
          </div>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Executive Financial Overview Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          {/* Primary KPI Split */}
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Collected</span>
              </div>
              <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                ₹{collectedAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {paidFees.length} {paidFees.length === 1 ? "student" : "students"} paid
              </p>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pending Dues</span>
              </div>
              <p className="mt-1.5 text-2xl sm:text-3xl font-extrabold tracking-tight font-mono tabular-nums text-amber-600 dark:text-amber-400">
                ₹{pendingAmount.toLocaleString("en-IN")}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {unpaidFees.length} {unpaidFees.length === 1 ? "student" : "students"} pending
              </p>
            </div>
          </div>

          {/* Payment Channel Breakdown Strip (Single-line clean metrics) */}
          <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50 px-4 py-2.5 grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="pr-2 sm:px-2 first:pl-0">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
                Online QR
              </span>
              <span className="mt-0.5 block text-xs sm:text-sm font-bold font-mono tabular-nums text-blue-600 dark:text-blue-400">
                ₹{feeChannelBreakdown.onlineQr.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="px-3">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
                NSTA Online
              </span>
              <span className="mt-0.5 block text-xs sm:text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                ₹{feeChannelBreakdown.nstaOnline.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="pl-3">
              <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap truncate">
                Cash Counter
              </span>
              <span className="mt-0.5 block text-xs sm:text-sm font-bold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                ₹{feeChannelBreakdown.cash.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          {/* Integrated Collection Progress Bar */}
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 sm:px-5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">Collection Progress</span>
              <div className="flex items-center gap-2 font-mono tabular-nums">
                <span className="text-slate-500 dark:text-slate-400">
                  ₹{collectedAmount.toLocaleString("en-IN")} / ₹{totalAmount.toLocaleString("en-IN")}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0}%
                </span>
              </div>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${totalAmount > 0 ? (collectedAmount / totalAmount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Student fee list */}
        {loading ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-xs font-medium text-slate-400">
            Loading fee records...
          </div>
        ) : (
          <>
          {unpaidFees.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400 mt-0.5">
                    <ReceiptText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                      Unpaid Fee Due Slips
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      <span className="font-semibold text-amber-600 dark:text-amber-400">{unpaidFees.length} Pending</span>
                      <span aria-hidden="true">·</span>
                      <span>DPS 4-in-1 A4 Format</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowDuesBreakdownTable(!showDuesBreakdownTable)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      showDuesBreakdownTable
                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                        : "bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <ReceiptText className="w-3.5 h-3.5 shrink-0" />
                    <span>{showDuesBreakdownTable ? "Hide Due List" : "View Due List"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDueSlipIds(selectedDueSlipIds.length === unpaidFees.length ? [] : unpaidFees.map(fee => fee.studentId))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {selectedDueSlipIds.length === unpaidFees.length ? "Deselect All" : "Select All"}
                  </button>
                </div>
              </div>

              {/* Action Buttons for Printing Dues */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => printReceipts(unpaidFees, "4in1")}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-xs sm:text-sm whitespace-nowrap active:scale-[0.99] transition-colors cursor-pointer shadow-xs"
                  title="Sabhi pending fees ke DPS slips 4-in-1 A4 paper par print karein"
                >
                  <Printer className="w-4 h-4 shrink-0" />
                  <span>Print All Due (4-in-1 A4 DPS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => printReceipts(unpaidFees.filter(fee => selectedDueSlipIds.includes(fee.studentId)), "4in1")}
                  disabled={!selectedDueSlipIds.length}
                  className="py-2.5 px-3 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:border disabled:border-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:disabled:border-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-1.5 text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed tabular-nums"
                  title="Print only checked students' due slips"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>Print Selected ({selectedDueSlipIds.length})</span>
                </button>
              </div>

              {/* ── EXPANDABLE ALL DUE STUDENTS LIST WITH ALL 5 FEE HEADS ── */}
              {showDuesBreakdownTable && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 overflow-hidden space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span>Complete 5 Fee Heads Breakdown</span>
                    <span className="text-slate-500 dark:text-slate-400 tabular-nums">{unpaidFees.length} unpaid</span>
                  </div>
                  <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-indigo-600 text-white sticky top-0 z-10 text-[11px]">
                        <tr>
                          <th className="p-2 border-r border-indigo-500">Roll</th>
                          <th className="p-2 border-r border-indigo-500">Student Name</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Admission</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Tuition</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Caution</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Annual</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Bus</th>
                          <th className="p-2 border-r border-indigo-500 text-right">Arrears</th>
                          <th className="p-2 border-r border-indigo-500 text-right font-bold text-amber-200">Total Due</th>
                          <th className="p-2 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px] tabular-nums">
                        {unpaidFees.map((fee, idx) => {
                          const items = getFeeItemsForStudent(fee);
                          const admItem = items.find(i => i.description.toLowerCase().includes("admission"))?.due || 0;
                          const tuiItem = items.find(i => i.description.toLowerCase().includes("tuition"))?.due || 0;
                          const cauItem = items.find(i => i.description.toLowerCase().includes("caution"))?.due || 0;
                          const annItem = items.find(i => i.description.toLowerCase().includes("annual"))?.due || 0;
                          const busItem = items.find(i => i.description.toLowerCase().includes("bus"))?.due || 0;
                          const arrItem = Number(fee.arrearsAmount || 0);

                          return (
                            <tr key={fee.studentId ? `unpaid-${fee.studentId}` : `unpaid-${fee.rollNo || idx}-${idx}`} className={idx % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/70 dark:bg-slate-900/50"}>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-500">{fee.rollNo}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 font-semibold text-slate-900 dark:text-white">
                                {fee.studentName}
                                {fee.arrearsMonths?.length ? (
                                  <span className="ml-1.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                                    · {fee.arrearsMonths.length}m due
                                  </span>
                                ) : null}
                              </td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">₹{Number(admItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-semibold text-blue-600 dark:text-blue-400">₹{Number(tuiItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">₹{Number(cauItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">₹{Number(annItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono">₹{Number(busItem).toLocaleString("en-IN")}</td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono text-amber-600 font-semibold">
                                {arrItem > 0 ? `₹${arrItem.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="p-2 border-r border-slate-200 dark:border-slate-800 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
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
                                    className="px-1.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1 text-[10px] font-semibold cursor-pointer"
                                    title="Demand Slip Dekhein (मांग पर्ची A6)"
                                  >
                                    <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    <span>Slip</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDpsModalFormat(fee.feeType === "admission" || fee.receiptCategory === "admission" ? "full" : "pos");
                                      setDpsReceiptFee(fee);
                                    }}
                                    className={`px-1.5 py-1 rounded flex items-center gap-1 text-[10px] font-semibold transition cursor-pointer ${
                                      fee.paid
                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                                    }`}
                                    title={fee.paid ? "Official Fee Receipt Dekhein (A4 / POS)" : "Fee jama hone par raseed banegi (Click karke preview karein)"}
                                  >
                                    <ReceiptText className={`w-3 h-3 ${fee.paid ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"}`} />
                                    <span>Receipt</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openStudentAdmissionStudio(students.find(s => s.id === fee.studentId) || null, fee, "form_only")}
                                    className="px-1.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-semibold cursor-pointer"
                                    title="Admission Form (Full A4)"
                                  >
                                    Adm Form
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openStudentAdmissionStudio(students.find(s => s.id === fee.studentId) || null, fee, "receipt_only")}
                                    className="px-1.5 py-1 rounded bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-300 text-[10px] font-semibold cursor-pointer"
                                    title="Admission Fee Receipt (Full A4)"
                                  >
                                    Adm Rcpt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const dpsData = getDpsDataForFee(fee);
                                      printA6SlipDirect(dpsData);
                                    }}
                                    className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 cursor-pointer"
                                    title="Print Demand Slip (मांग पर्ची प्रिंट करें)"
                                  >
                                    <Printer className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenPaymentModal(fee)}
                                    className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[10px] cursor-pointer"
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
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <ReceiptText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Paid Fee Receipts</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    4 receipts per A4 page · Select paid students to print
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReceiptIds(selectedReceiptIds.length === paidFees.length ? [] : paidFees.map(fee => fee.studentId))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap cursor-pointer transition-colors"
                >
                  {selectedReceiptIds.length === paidFees.length ? "Deselect All" : "Select All Paid"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => printDpsReceipts(paidFees.filter(fee => selectedReceiptIds.includes(fee.studentId)), "4in1")}
                disabled={!selectedReceiptIds.length}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-500 disabled:border disabled:border-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-400 dark:disabled:border-slate-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-xs whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed tabular-nums"
                title="Ek A4 paper par 4 receipts print karein"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>Print 4-in-1 A4 Receipts ({selectedReceiptIds.length})</span>
              </button>
            </div>
          )}

          {!classId && fees.length > 0 && (
            <button
              type="button"
              onClick={() => printDpsReceipts(fees.filter(f => f.paid), "4in1")}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 text-xs whitespace-nowrap transition-colors cursor-pointer tabular-nums shadow-xs"
              title="Ek A4 paper par 4 receipts print karein"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print All 4-in-1 A4 Receipts ({fees.filter(f => f.paid).length} Paid)</span>
            </button>
          )}

          {/* ── SEARCH & DUES QUICK FILTER ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Student name, Roll number, ya Admission number se search karein..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Filter by Fee Status</span>
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                {filteredFees.length} of {fees.length} students
              </span>
            </div>

            {/* Interactive Filter Controls */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs font-semibold no-scrollbar">
              <button
                type="button"
                onClick={() => setDuesFilter("all")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                  duesFilter === "all"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                All ({fees.length})
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("paid")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 tabular-nums ${
                  duesFilter === "paid"
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Full Paid ({paidFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("partial")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 tabular-nums ${
                  duesFilter === "partial"
                    ? "bg-amber-600 text-white"
                    : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Partial ({partialFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("unpaid")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 tabular-nums ${
                  duesFilter === "unpaid"
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                }`}
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Unpaid ({unpaidFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("bus")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 tabular-nums ${
                  duesFilter === "bus"
                    ? "bg-teal-600 text-white"
                    : "bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50"
                }`}
              >
                <Bus className="w-3.5 h-3.5 shrink-0" />
                <span>Bus ({busFees.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("due3")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                  duesFilter === "due3"
                    ? "bg-amber-700 text-white"
                    : "bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 hover:bg-amber-100"
                }`}
              >
                3+ Mo. Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 3).length})
              </button>
              <button
                type="button"
                onClick={() => setDuesFilter("due6")}
                className={`px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap transition-colors cursor-pointer tabular-nums ${
                  duesFilter === "due6"
                    ? "bg-rose-700 text-white"
                    : "bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 hover:bg-rose-100"
                }`}
              >
                6+ Mo. Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 6).length})
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs overflow-hidden border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedFees.map((fee, idx) => {
              const student = studentByIdMap.get(fee.studentId) || students.find(s => s.id === fee.studentId);
              const isBusActive = Boolean(fee.includeBusFee || student?.usesBus);
              const targetClass = classByIdMap.get(fee.classId) || rawClasses.find(c => c.id === fee.classId);
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
              const backDueOnly = Math.max(0, Number(fee.arrearsAmount || 0) - Number(student?.admissionDueBalance || 0));

              return (
                <div
                  key={fee.studentId ? `fee-${fee.studentId}` : `fee-${fee.rollNo || idx}-${idx}`}
                  className={`p-3.5 sm:px-5 sm:py-4 transition-colors ${
                    isFullPaid ? "bg-emerald-50/20 dark:bg-emerald-950/10" : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                  }`}
                >
                  {/* Top Row: Checkbox, Roll No, Student Name, and Crisp Status Text */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2.5 min-w-0">
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
                        className="h-4 w-4 accent-indigo-600 rounded cursor-pointer shrink-0"
                      />
                      <span className="text-xs font-mono font-semibold text-slate-400 shrink-0 tabular-nums">#{fee.rollNo}</span>
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
                        className="text-left font-bold text-slate-900 dark:text-white text-sm hover:text-indigo-600 dark:hover:text-indigo-400 truncate cursor-pointer"
                        title="Click student name to view ID Card, Fee Details & Attendance"
                      >
                        {fee.studentName}
                      </button>
                    </div>

                    {/* Clean Status Indicator (No bloated border pills) */}
                    <div className="flex items-center gap-1.5 shrink-0 font-mono tabular-nums text-xs font-bold">
                      {isFullPaid ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>PAID ₹{paidAmt.toLocaleString("en-IN")}</span>
                        </span>
                      ) : isPartial ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>PARTIAL ₹{paidAmt.toLocaleString("en-IN")}</span>
                        </span>
                      ) : (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>DUE ₹{dueAmt.toLocaleString("en-IN")}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Clean Divided Financial Metrics */}
                  <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50/90 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 px-3 py-2 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Total Bill</span>
                      <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        ₹{totalFee.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Paid</span>
                      <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{paidAmt.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Balance Due</span>
                      <span className={`font-mono tabular-nums font-bold ${dueAmt > 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-400 dark:text-slate-500"}`}>
                        ₹{dueAmt.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Secondary Metadata Line (Zero-pill inline dot-separated details) */}
                  <div className="mt-2 flex items-center gap-x-2.5 gap-y-1 flex-wrap text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    <span>
                      Tuition: <strong className="font-mono text-slate-700 dark:text-slate-200">₹{Number(fee.monthlyAmount ?? targetClass?.feeStructure?.tuitionFee ?? 2000).toLocaleString("en-IN")}</strong>
                    </span>
                    {isBusActive && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-teal-700 dark:text-teal-300 font-medium inline-flex items-center gap-1">
                          <Bus className="w-3 h-3" /> Bus ₹{busRate.toLocaleString("en-IN")}
                        </span>
                      </>
                    )}
                    {Number(student?.admissionDueBalance || 0) > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">
                          प्रवेश बकाया: +₹{Number(student?.admissionDueBalance || 0).toLocaleString("en-IN")}
                        </span>
                      </>
                    )}
                    {backDueOnly > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300">
                          Back Due: +₹{backDueOnly.toLocaleString("en-IN")}
                          {fee.arrearsMonths?.filter((m) => m !== "0001-ADM-DUE").length ? ` (${fee.arrearsMonths.filter((m) => m !== "0001-ADM-DUE").join(", ")})` : ""}
                        </span>
                      </>
                    )}
                    {fee.receiptNo && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">Rcpt #{fee.receiptNo}</span>
                      </>
                    )}
                  </div>

                  {/* Expandable Fee Heads Ledger Table for this student */}
                  {expandedStudentFeeIds.includes(fee.studentId) && (
                    <div className="mt-2.5 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>Fee Items Breakdown ({fee.studentName})</span>
                        <span className={isFullPaid ? "text-emerald-600" : isPartial ? "text-amber-600" : "text-amber-600"}>
                          {isFullPaid ? "PAID" : isPartial ? "PARTIAL PAID" : "PENDING DUE"}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                        <table className="w-full text-left text-[11px] border-collapse bg-white dark:bg-slate-900">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-bold">
                            <tr>
                              <th className="p-1.5 border-r dark:border-slate-700">Sl.No</th>
                              <th className="p-1.5 border-r dark:border-slate-700">Description</th>
                              <th className="p-1.5 border-r dark:border-slate-700 text-right">Due (₹)</th>
                              <th className="p-1.5 border-r dark:border-slate-700 text-right">Concession (₹)</th>
                              <th className="p-1.5 text-right">Paid (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 tabular-nums">
                            {getFeeItemsForStudent(fee).map((item, itemIdx) => (
                              <tr key={item.id ? `item-${item.id}` : `item-${item.description}-${itemIdx}`}>
                                <td className="p-1.5 border-r dark:border-slate-800 text-slate-400 font-mono">{item.slNo}</td>
                                <td className="p-1.5 border-r dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">{item.description}</td>
                                <td className="p-1.5 border-r dark:border-slate-800 text-right font-mono">₹{Number(item.due).toLocaleString("en-IN")}</td>
                                <td className="p-1.5 border-r dark:border-slate-800 text-right font-mono">₹{Number(item.con || 0).toLocaleString("en-IN")}</td>
                                <td className="p-1.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{Number(item.paid).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                    {/* Left: Payment Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(fee)}
                        disabled={saving === fee.studentId}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 active:scale-95 whitespace-nowrap"
                      >
                        <IndianRupee className="w-3.5 h-3.5" />
                        <span>{isFullPaid ? "Edit Pay" : "Pay Fee"}</span>
                      </button>

                      {(isFullPaid || isPartial) && (
                        <button
                          type="button"
                          onClick={() => setFeeStatus(fee, false)}
                          disabled={saving === fee.studentId}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                          title="पूरा भुगतान हटाकर ₹0 बकाया (Unpaid) करें"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Mark Unpaid</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleStudentFeeExpand(fee.studentId)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold cursor-pointer transition flex items-center gap-1 whitespace-nowrap"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{expandedStudentFeeIds.includes(fee.studentId) ? "Hide ▲" : "Heads ▼"}</span>
                      </button>
                    </div>

                    {/* Right: Print & Share Actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => openStudentAdmissionStudio(student || null, fee, "form_only")}
                        className="px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 whitespace-nowrap"
                        title="Open & Edit Admission Form (Full A4)"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>Adm Form</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openStudentAdmissionStudio(student || null, fee, "receipt_only")}
                        className="px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer bg-teal-50 hover:bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200 border border-teal-200 dark:border-teal-800 whitespace-nowrap"
                        title="Open Admission Fee Receipt (Full A4)"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        <span>Adm Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDpsModalFormat("a6");
                          setDpsReceiptFee(fee);
                        }}
                        className="px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200 border border-blue-200 dark:border-blue-800 whitespace-nowrap"
                        title="Preview Fee Demand Slip (मांग पर्ची A6)"
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Slip</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDpsModalFormat(fee.feeType === "admission" || fee.receiptCategory === "admission" ? "full" : "pos");
                          setDpsReceiptFee(fee);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1 transition cursor-pointer whitespace-nowrap ${
                          fee.paid
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        }`}
                        title={fee.paid ? "Open Official Fee Receipt (POS / 4-in-1 A4)" : "Fee jama hone par raseed banegi (Click karke preview karein)"}
                      >
                        <ReceiptText className={`w-3.5 h-3.5 ${fee.paid ? "text-emerald-100" : "text-slate-500"}`} />
                        <span>Receipt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => printPosSlip(fee)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition cursor-pointer whitespace-nowrap"
                        title="1-Click Mini Thermal POS Print (80mm / 58mm Roll Slip)"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>POS</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => (fee.paid ? sendReceiptOnWhatsApp(fee) : sendDueSlipOnWhatsApp(fee))}
                        disabled={sendingWhatsAppId === fee.studentId}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition disabled:opacity-50 cursor-pointer"
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
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
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
            {filteredFees.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium">No students found</p>
              </div>
            )}
          </div>

          {/* Fee Manager Pagination Controls */}
          {totalFeePages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 font-medium">
                Showing <strong className="text-slate-800 dark:text-white tabular-nums font-mono">{(currentFeePage - 1) * feePageSize + 1}</strong> to <strong className="text-slate-800 dark:text-white tabular-nums font-mono">{Math.min(currentFeePage * feePageSize, filteredFees.length)}</strong> of <strong className="text-slate-800 dark:text-white tabular-nums font-mono">{filteredFees.length}</strong> students
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentFeePage <= 1}
                  onClick={() => setFeePage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 px-2 font-mono font-bold text-slate-600 dark:text-slate-300">
                  <span className="tabular-nums text-indigo-600 dark:text-indigo-400">{currentFeePage}</span>
                  <span>/</span>
                  <span className="tabular-nums">{totalFeePages}</span>
                </div>
                <button
                  type="button"
                  disabled={currentFeePage >= totalFeePages}
                  onClick={() => setFeePage(p => Math.min(totalFeePages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700/60 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
          </>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={exportFeeRegisterToExcel}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            title="Download full due & fee register as Microsoft Excel spreadsheet (.csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100 shrink-0" />
            <span>Export Fee Register (.csv)</span>
          </button>

          <button
            type="button"
            onClick={downloadFeeReport}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download Fee Report (MHTML)</span>
          </button>
        </div>

      </div>
      <SchoolHeaderEditorModal
        isOpen={showSchoolHeaderModal}
        onClose={() => {
          setShowSchoolHeaderModal(false);
          if (exitOnToolClose && onBack) onBack();
        }}
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
          onClose={() => {
            setDpsReceiptFee(null);
            if (exitOnToolClose && initialTool === "qr_scanner" && onBack) onBack();
          }}
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
            directorName: schoolDetails.directorName || school?.directorName,
            directorSignatureUrl: schoolDetails.directorSignatureUrl || school?.directorSignatureUrl,
            managerName: schoolDetails.managerName || school?.managerName,
            managerPhone: schoolDetails.managerPhone || school?.managerPhone,
            managerSignatureUrl: schoolDetails.managerSignatureUrl || school?.managerSignatureUrl,
            accountantName: schoolDetails.accountantName || school?.accountantName,
            accountantSignatureUrl: schoolDetails.accountantSignatureUrl || school?.accountantSignatureUrl,
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
        onClose={() => {
          setShowClassFeeModal(false);
          if (exitOnToolClose && onBack) onBack();
        }}
        classes={rawClasses}
        schoolId={schoolId}
        onUpdated={() => loadData(true)}
      />
      <QrFeeScannerModal
        isOpen={showQrScannerModal}
        onClose={() => {
          setShowQrScannerModal(false);
          if (qrSwappedToStudentModalRef.current) {
            qrSwappedToStudentModalRef.current = false;
            return;
          }
          if (exitOnToolClose && onBack) onBack();
        }}
        schoolId={schoolId}
        students={students}
        fees={fees}
        classes={rawClasses}
        onSelectStudentForPayment={(student, fee) => {
          qrSwappedToStudentModalRef.current = true;
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
          qrSwappedToStudentModalRef.current = true;
          setDpsReceiptFee(fee);
        }}
      />
      <BusTransportModal
        isOpen={showBusModal}
        onClose={() => {
          setShowBusModal(false);
          if (exitOnToolClose && onBack) onBack();
        }}
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
                  onClick={() => {
                    setCollectingFee(null);
                    if (exitOnToolClose && initialTool === "qr_scanner" && onBack) onBack();
                  }}
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

                {/* Unpaid Admission Balance Due Carry-Forward */}
                {Number(modalStudent?.admissionDueBalance || 0) > 0 && (
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs flex items-center justify-between text-purple-900 dark:text-purple-200">
                    <div>
                      <span className="font-black block">🎓 Admission Balance Due (प्रवेश बकाया):</span>
                      <span className="text-[10px] text-purple-700 dark:text-purple-300">
                        एडमिशन के समय बकाया राशि — भुगतान होने तक मासिक बिल में जुड़ी रहेगी
                      </span>
                    </div>
                    <span className="font-black text-sm text-purple-700 dark:text-purple-300 tabular-nums">
                      +₹{Number(modalStudent?.admissionDueBalance || 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {/* Previous Arrears Warning if any */}
                {Math.max(0, modalArrears - Number(modalStudent?.admissionDueBalance || 0)) > 0 && (
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs flex items-center justify-between text-orange-900 dark:text-orange-200">
                    <div>
                      <span className="font-black block">⚠️ Pichhle Mahine Ka Baki (Arrears):</span>
                      <span className="text-[10px] text-orange-700 dark:text-orange-300">
                        {collectingFee.arrearsMonths?.filter((m) => m !== "0001-ADM-DUE").join(", ") || "Previous Unpaid Months"}
                      </span>
                    </div>
                    <span className="font-black text-sm text-orange-600 tabular-nums">
                      +₹{Math.max(0, modalArrears - Number(modalStudent?.admissionDueBalance || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* Date-Limited Offer Rule Callout Card */}
              {effectiveEarlyDiscount > 0 ? (
                <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-300 dark:border-emerald-700/60 text-xs shadow-sm space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-black text-emerald-900 dark:text-emerald-200">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>🎉 {modalSlabMatch.label || "समय पर भुगतान छूट लागू!"}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">
                      -₹{effectiveEarlyDiscount} ({modalSlabValueText || "OFF"})
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
                    ⚡ <strong>नियम:</strong> समय-सीमा छूट केवल चालू माह की फीस (₹{modalMonthly} - ₹{effectiveEarlyDiscount} = ₹{currentMonthTuitionAfterDiscount}) पर लागू है (तय तिथि के बाद पूरा शुल्क देय होगा)। पुराना बकाया (₹{modalArrears}) पूरा देय है।
                  </p>
                  {modalSlabsSummary && (
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                      📅 सक्रिय स्लैब्स: {modalSlabsSummary}
                    </p>
                  )}
                </div>
              ) : feeDiscountSlabs.length > 0 ? (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold block text-[11px]">ℹ️ छूट की तय तिथि समाप्त ({modalPaymentDay} तारीख):</span>
                    <span className="text-[10px] text-amber-800 dark:text-amber-300 block">
                      अंतिम ऑफर तिथियाँ ({modalSlabsSummary}) निकल चुकी हैं, इसलिए स्लिप पर लिखा पूरा शुल्क देय है।
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-800 dark:text-amber-300 shrink-0">
                    कुल देय: ₹{modalTotalBill}
                  </span>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold">कोई तारीख-सीमा छूट सक्रिय नहीं है — स्लिप की पूरी राशि देय है।</span>
                  <span className="text-xs font-black shrink-0">कुल देय: ₹{modalTotalBill}</span>
                </div>
              )}

              {/* Total Calculated Bill Overview */}
              <div className="p-3 bg-indigo-700 text-white rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[11px] text-indigo-100 font-bold block uppercase tracking-wider">Kul Deen (Total Payable):</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black font-mono tabular-nums text-amber-300">
                      ₹{modalTotalBill.toLocaleString("en-IN")}
                    </span>
                    {effectiveEarlyDiscount > 0 && (
                      <span className="text-xs text-indigo-200 line-through font-mono tabular-nums">
                        ₹{modalGrossTotalBeforeDiscount.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-[11px] text-indigo-100">
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
                          title={modalSlabMatch.label || "समय पर भुगतान छूट के बाद कुल देय"}
                        >
                          ⚡ {modalSlabValueText || "OFFER"}: ₹{modalTotalBill.toLocaleString("en-IN")}
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
                      <div className="p-2.5 rounded-lg bg-indigo-700 text-white space-y-1.5 text-xs shadow-sm">
                        <div className="flex items-center justify-between text-indigo-100">
                          <span>Total Paid Now (अभी जमा हुआ):</span>
                          <strong className="text-emerald-300 font-mono tabular-nums font-black text-sm">₹{modalFifoResult.totalAllocated.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="flex items-center justify-between text-indigo-100 border-t border-indigo-500/60 pt-1">
                          <span>Remaining Balance Due (कुल बाकी बकाया):</span>
                          <strong className="text-amber-300 font-mono tabular-nums font-black text-sm">₹{modalFifoResult.totalOutstandingDueAfter.toLocaleString("en-IN")}</strong>
                        </div>
                        <div className="flex items-center justify-between text-indigo-100 border-t border-indigo-500/60 pt-1">
                          <span>Next Bill &amp; Print Due (+ अगला नया महीना ₹{modalMonthly.toLocaleString("en-IN")}):</span>
                          <strong className="text-white font-mono tabular-nums font-black text-sm bg-indigo-600 px-2 py-0.5 rounded">
                            ₹{modalFifoResult.nextBillingTotalWithUpcoming.toLocaleString("en-IN")}
                          </strong>
                        </div>
                        <p className="text-[10px] text-indigo-100/90 pt-0.5 italic">
                          💡 <strong>अगली बार जब रसीद प्रिंट होगी:</strong> {modalFifoResult.partialMonth ? `${modalFifoResult.partialMonth.label} का बचा ₹${modalFifoResult.partialMonth.balanceDueAfter.toLocaleString("en-IN")}` : "बकाया"} + बाकी {modalFifoResult.unpaidMonths.length} महीने + अगला नया महीना सब जुड़कर रसीद पर प्रिंट होगा।
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Online + Offline Split Payment Inputs */}
                <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-xs text-slate-700 dark:text-slate-300">
                      💳 Online + 💵 Offline Split Payment (दोनों में अलग-अलग राशि डाल सकते हैं):
                    </label>
                    <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-400">
                      कुल जमा: ₹{((Number(customOnlinePaid) || 0) + (Number(customOfflinePaid) || 0) > 0 ? (Number(customOnlinePaid) || 0) + (Number(customOfflinePaid) || 0) : (Number(customPaidAmount) || 0)).toLocaleString("en-IN")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-400 mb-0.5">Online / UPI (₹)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={customOnlinePaid}
                        onChange={e => {
                          const v = e.target.value;
                          setCustomOnlinePaid(v);
                          const sum = (Number(v) || 0) + (Number(customOfflinePaid) || 0);
                          setCustomPaidAmount(String(sum));
                          if ((Number(v) || 0) > 0 && (Number(customOfflinePaid) || 0) > 0) setCustomPayMode("Online + Offline");
                          else if ((Number(v) || 0) > 0) setCustomPayMode("Online / UPI");
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-blue-400 bg-white dark:bg-slate-900 font-black text-xs text-blue-700 dark:text-blue-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-400 mb-0.5">Offline / Cash (₹)</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={customOfflinePaid}
                        onChange={e => {
                          const v = e.target.value;
                          setCustomOfflinePaid(v);
                          const sum = (Number(customOnlinePaid) || 0) + (Number(v) || 0);
                          setCustomPaidAmount(String(sum));
                          if ((Number(customOnlinePaid) || 0) > 0 && (Number(v) || 0) > 0) setCustomPayMode("Online + Offline");
                          else if ((Number(v) || 0) > 0) setCustomPayMode("Cash");
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg border-2 border-emerald-500 bg-white dark:bg-slate-900 font-black text-xs text-emerald-700 dark:text-emerald-300"
                      />
                    </div>
                  </div>
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
                  {canGiveDiscount ? (
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block font-bold text-slate-700 dark:text-slate-300">Concession / Discount (₹):</label>
                        <button
                          type="button"
                          onClick={() => {
                            const fivePct = Math.round(((Number(customMonthlyAmount) || 0) * 5) / 100);
                            setCustomConcession(String(fivePct));
                          }}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[9px] font-black cursor-pointer"
                        >
                          {DISPLAY_DISCOUNT_LABEL}
                        </button>
                      </div>
                      <input
                        type="number"
                        placeholder="0"
                        value={customConcession}
                        onChange={e => {
                          const gross = Number(customMonthlyAmount) || 0;
                          const clamped = clampDiscountAmount(gross, Math.max(0, Number(e.target.value) || 0));
                          setCustomConcession(String(clamped));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                      />
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center">
                      ⚠️ Discount केवल Admin / Accountant दे सकते हैं।
                    </div>
                  )}
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date{" "}
                      {feeDiscountSlabs.length > 0 && (
                        isEarlyBirdEligible ? (
                          <span className="text-emerald-600 font-bold">({modalSlabMatch.label} लागू)</span>
                        ) : (
                          <span className="text-amber-600 font-bold">(छूट तिथि समाप्त — पूरा पेमेंट)</span>
                        )
                      )}
                      :
                    </label>
                    <input
                      type="date"
                      value={customPaymentDate}
                      onChange={e => {
                        const newDt = e.target.value;
                        setCustomPaymentDate(newDt);
                        const parts = newDt.split("-");
                        const d = parts.length >= 3 ? parseInt(parts[2], 10) : new Date(newDt).getDate();
                        const matched = resolveSlabForDay(feeDiscountSlabs, d, modalMonthly);
                        const disc = matched.discountAmount;
                        const pctDisc = Number(modalStudent?.siblingDiscountPct || 0) > 0
                          ? Math.round((modalMonthly * Number(modalStudent?.siblingDiscountPct)) / 100)
                          : 0;
                        const permDisc = modalStudent?.isFreeEducation
                          ? modalMonthly
                          : Math.max(Number(modalStudent?.siblingDiscountAmount || 0), pctDisc);
                        const totalDisc = disc + permDisc;
                        setCustomConcession(totalDisc > 0 ? String(totalDisc) : "");
                        const newNet = modalArrears + Math.max(0, modalMonthly - totalDisc + modalAdm + modalCau + modalAnn + modalBus);
                        setCustomPaidAmount(String(newNet));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>

                {/* Fee Collected By (Accountant vs Manager) Selector */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                      कौन फीस जमा कर रहा है? (Collected By)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setCollectorRole("accountant");
                          setCollectorCustomName("");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer transition ${
                          collectorRole === "accountant"
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        🧾 Accountant
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCollectorRole("manager");
                          setCollectorCustomName("");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer transition ${
                          collectorRole === "manager"
                            ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                            : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        🛡️ Manager
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-center">
                    {collectorRole === "accountant" && accountants.length > 0 ? (
                      <select
                        value={selectedAccountantId || (accountants.find(a => a.active !== false)?.id || accountants[0]?.id || "")}
                        onChange={e => {
                          setSelectedAccountantId(e.target.value);
                          setCollectorCustomName("");
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] font-bold"
                      >
                        {accountants.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} ({acc.employeeId || "ACC"}) {acc.signatureUrl ? "✓ Sign" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {collectorRole === "manager"
                          ? `Manager Sign: ${schoolDetails.managerSignatureUrl ? "✓ रसीद पर दिखेगा" : "⚠️ Settings में Manager Sign जोड़ें"}`
                          : `Accountant Sign: ${schoolDetails.accountantSignatureUrl ? "✓ रसीद पर दिखेगा" : "⚠️ Settings में Accountant Sign जोड़ें"}`}
                      </div>
                    )}
                    <input
                      type="text"
                      value={collectorCustomName}
                      onChange={e => setCollectorCustomName(e.target.value)}
                      placeholder={
                        collectorRole === "manager"
                          ? `Manager नाम: ${schoolDetails.managerName || school?.managerName || "Manager"}`
                          : `Accountant नाम: ${resolveActiveCollector().collectedByName}`
                      }
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-[11px] font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons: Save per student, Open DPS Receipt, Mark Unpaid, Cancel */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCollectingFee(null);
                    if (exitOnToolClose && initialTool === "qr_scanner" && onBack) onBack();
                  }}
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
                  onClick={() => {
                    setShowAdmissionModal(false);
                    if (exitOnToolClose && onBack) onBack();
                  }}
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
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span>Admission No: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{admCurrentStudent.admissionNo || "New"}</strong></span>
                      <span>Class: <strong>{admCurrentStudent.className || className}</strong></span>
                      <span>Phone: <strong>{admCurrentStudent.phone || "—"}</strong></span>
                      {admCurrentStudent.usesBus && <span className="text-teal-600 font-bold">🚌 Bus: {admCurrentStudent.busRoute || "Active"}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openStudentAdmissionStudio(admCurrentStudent, null, "form_only")}
                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Form (A4)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openStudentAdmissionStudio(admCurrentStudent, null, "receipt_only")}
                        className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <ReceiptText className="w-3 h-3" />
                        <span>View Receipt (A4)</span>
                      </button>
                    </div>
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
                  {canGiveDiscount && (
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <label className="block text-[10px] font-bold text-slate-500">Discount (छूट ₹)</label>
                        <button
                          type="button"
                          onClick={() => setAdmConcession(Math.round((admGross * 5) / 100))}
                          className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black cursor-pointer"
                        >
                          {DISPLAY_DISCOUNT_LABEL}
                        </button>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={admConcession}
                        onChange={(e) => setAdmConcession(clampDiscountAmount(admGross, Math.max(0, Number(e.target.value))))}
                        className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1">Online / UPI (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={admOnlinePaid}
                      onChange={(e) => {
                        setAdmPaidManual(true);
                        const v = e.target.value;
                        setAdmOnlinePaid(v);
                        setAdmPaidAmount(String((Number(v) || 0) + (Number(admOfflinePaid) || 0)));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border-2 border-blue-400 bg-white dark:bg-slate-900 text-xs font-black text-blue-700 dark:text-blue-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Offline / Cash (₹)</label>
                    <input
                      type="number"
                      min={0}
                      value={admOfflinePaid || admPaidAmount}
                      onChange={(e) => {
                        setAdmPaidManual(true);
                        const v = e.target.value;
                        setAdmOfflinePaid(v);
                        setAdmPaidAmount(String((Number(admOnlinePaid) || 0) + (Number(v) || 0)));
                      }}
                      className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-300"
                    />
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

                {/* Collector Selector for Admission Fee Receipt */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    कौन जमा कर रहा है? (Signatory on Receipt):
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCollectorRole("accountant")}
                      className={`px-2.5 py-1 rounded-lg font-black border cursor-pointer ${
                        collectorRole === "accountant"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      🧾 Accountant ({schoolDetails.accountantName || school?.accountantName || "Default"})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCollectorRole("manager")}
                      className={`px-2.5 py-1 rounded-lg font-black border cursor-pointer ${
                        collectorRole === "manager"
                          ? "bg-amber-600 text-white border-amber-600"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600"
                      }`}
                    >
                      🛡️ Manager ({schoolDetails.managerName || school?.managerName || "Manager"})
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
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
                  <span>{admSaving ? "Saving..." : "✓ Save & Print Admission Receipt (A4)"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAdmissionFee("combined")}
                  disabled={admSaving || !admSelectedStudentId}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save &amp; Form + Receipt (A4)</span>
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
            onClose={() => {
              setShowClassFeeAlertModal(false);
              if (exitOnToolClose && onBack) onBack();
            }}
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

        {/* ── RECEIPT CANCELLATION & REFUND VOUCHER MODAL ── */}
        {showReceiptCancellationModal && (
          <ReceiptCancellationModal
            school={school || { id: schoolId, name: schoolName || "School" }}
            activeSession={null}
            isOpen={showReceiptCancellationModal}
            onClose={() => {
              setShowReceiptCancellationModal(false);
              if (exitOnToolClose && onBack) onBack();
            }}
            onReceiptCancelled={() => {
              loadFees();
            }}
          />
        )}

        {/* ── PER-SCHOOL RAZORPAY ONLINE FEE & AUTO-WEBHOOK SETTINGS ── */}
        {showRazorpaySettingsModal && (
          <RazorpaySettingsModal
            isOpen={showRazorpaySettingsModal}
            onClose={() => {
              setShowRazorpaySettingsModal(false);
              if (exitOnToolClose && onBack) onBack();
            }}
            schoolId={schoolId}
            schoolName={schoolName || school?.name}
            adminUid={adminId}
            onSaved={() => {
              setPushBannerMsg("✅ Razorpay Online Fee & Auto-Webhook settings update ho gayi!");
            }}
          />
        )}
      </div>
  );
};

