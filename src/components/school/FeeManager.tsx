// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  getStudents, getMonthlyFees, getClasses, saveFee, markFeePaid, currentMonthStr, getSchoolFeeHistory, updateStudent
} from "../../school-firebase";
import type { SchoolStudent, SchoolClass, MonthlyFee, School, SchoolDocumentPrintFields } from "../../school-types";
import { schoolPrintFieldEnabled } from "../../school-types";
import { CheckCircle, Clock, Download, ChevronLeft, ChevronRight, IndianRupee, Users, TrendingUp, AlertCircle, Printer, MessageCircle, ReceiptText, Building2, Sparkles, X, Check, RotateCcw, CheckCircle2, ShieldCheck, ToggleLeft, ToggleRight } from "lucide-react";
import { downloadFeeDocument } from "./feeDocument";
import { SchoolHeaderEditorModal, type SchoolHeaderDetails } from "./SchoolHeaderEditorModal";
import { StudentQuickActionModal } from "./StudentQuickActionModal";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { ClassFeeStructureModal } from "./ClassFeeStructureModal";
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
  const [rawClasses, setRawClasses] = useState<SchoolClass[]>([]);
  const [month, setMonth] = useState(currentMonthStr());
  const [loading, setLoading] = useState(true);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [selectedDueSlipIds, setSelectedDueSlipIds] = useState<string[]>([]);
  const [showSchoolHeaderModal, setShowSchoolHeaderModal] = useState(false);
  const [showClassFeeModal, setShowClassFeeModal] = useState(false);
  const [duesFilter, setDuesFilter] = useState<string>("all");
  const [dpsReceiptFee, setDpsReceiptFee] = useState<MonthlyFee | null>(null);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<SchoolStudent | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<"id_card" | "fees" | "attendance">("id_card");
  const [expandedStudentFeeIds, setExpandedStudentFeeIds] = useState<string[]>([]);
  const [showDuesBreakdownTable, setShowDuesBreakdownTable] = useState<boolean>(false);
  const [showAllFeesOverview, setShowAllFeesOverview] = useState<boolean>(true);

  // Custom payment collection modal state (optional custom paid amount / default print rate / fee heads)
  const [collectingFee, setCollectingFee] = useState<MonthlyFee | null>(null);
  const [customIncludeAdmissionFee, setCustomIncludeAdmissionFee] = useState<boolean>(false);
  const [customIncludeCautionMoney, setCustomIncludeCautionMoney] = useState<boolean>(false);
  const [customIncludeAnnualCharges, setCustomIncludeAnnualCharges] = useState<boolean>(false);
  const [customIncludeBusFee, setCustomIncludeBusFee] = useState<boolean>(false);
  const [customMonthlyAmount, setCustomMonthlyAmount] = useState<string>("");
  const [customPaidAmount, setCustomPaidAmount] = useState<string>("");
  const [customPayMode, setCustomPayMode] = useState<string>("Cash");
  const [customBankName, setCustomBankName] = useState<string>("");
  const [customChequeNo, setCustomChequeNo] = useState<string>("");
  const [customConcession, setCustomConcession] = useState<string>("");
  const [customPaymentDate, setCustomPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
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

    // Create fee records for students with true multi-month arrears carry-forward
    const feeMap = new Map(feeData.map(f => [f.studentId, f]));

    const allFees: MonthlyFee[] = sts.map(student => {
      const existing = feeMap.get(student.id);

      // All recorded past fees for this student prior to current viewed month
      const studentHistory = history
        .filter(fee => fee.studentId === student.id && fee.month < month)
        .sort((a, b) => a.month.localeCompare(b.month));

      let calculatedArrears = 0;
      const unpaidMonthsSet = new Set<string>();

      if (studentHistory.length > 0) {
        // The most recent prior recorded fee
        const latestPrev = studentHistory[studentHistory.length - 1];
        const latestUnpaid = getUnpaidDue(latestPrev);

        // If latestPrev has balanceDue or arrearsAmount tracked, it already represents cumulative prior dues
        if (latestPrev.balanceDue !== undefined || latestPrev.arrearsAmount !== undefined) {
          calculatedArrears = latestUnpaid;
          if (latestUnpaid > 0) {
            if (latestPrev.arrearsMonths && Array.isArray(latestPrev.arrearsMonths)) {
              latestPrev.arrearsMonths.forEach(m => unpaidMonthsSet.add(m));
            }
            unpaidMonthsSet.add(latestPrev.month);
          }
        } else {
          // Legacy records without cumulative fields: sum unpaid balances
          studentHistory.forEach(pastFee => {
            const unpaid = getUnpaidDue(pastFee);
            if (unpaid > 0) {
              calculatedArrears += unpaid;
              unpaidMonthsSet.add(pastFee.month);
            }
          });
        }
      }

      const arrearsAmount = calculatedArrears;
      const arrearsMonths = Array.from(unpaidMonthsSet).sort();

      const targetClass = schoolClasses.find((c: SchoolClass) => c.id === student.classId);
      const struct = targetClass?.feeStructure;
      const defaultTuition = Number(student.monthlyFee || struct?.tuitionFee || 19140);
      const monthlyAmount = Number(existing?.monthlyAmount ?? defaultTuition);

      // By default: Admission Fee, Caution Money, Annual Charges are one-time/optional
      const includeAdmissionFee = Boolean(existing?.includeAdmissionFee ?? false);
      const includeCautionMoney = Boolean(existing?.includeCautionMoney ?? false);
      const includeAnnualCharges = Boolean(existing?.includeAnnualCharges ?? false);

      // Bus Fee: PERMANENT per student! Once chosen, it persists automatically across ALL months!
      const hasBusHistory = studentHistory.some(f => Boolean(f.includeBusFee));
      const studentUsesBus = Boolean(student.usesBus ?? hasBusHistory);
      const includeBusFee = existing?.includeBusFee !== undefined
        ? Boolean(existing.includeBusFee)
        : studentUsesBus;

      const admFee = includeAdmissionFee ? Number(struct?.admissionFee ?? 65000) : 0;
      const cauFee = includeCautionMoney ? Number(struct?.cautionMoney ?? 60000) : 0;
      const annFee = includeAnnualCharges ? Number(struct?.annualCharges ?? 23320) : 0;
      const busFee = includeBusFee ? Number(struct?.busFee ?? 10360) : 0;
      const concession = Number(existing?.concession || 0);

      const currentMonthHeadsTotal = Math.max(0, monthlyAmount + admFee + cauFee + annFee + busFee - concession);

      // Check if student was already fully paid for this current month
      const isAlreadyFullyPaid = Boolean(existing?.paid && (!existing.balanceDue || existing.balanceDue === 0));

      let totalAmount: number;
      let isPaid: boolean;
      let paidAmount: number;
      let balanceDue: number;

      if (isAlreadyFullyPaid) {
        totalAmount = Number(existing?.amount ?? (currentMonthHeadsTotal + arrearsAmount));
        paidAmount = Number(existing?.paidAmount ?? totalAmount);
        balanceDue = 0;
        isPaid = true;
      } else {
        totalAmount = currentMonthHeadsTotal + arrearsAmount;
        paidAmount = existing?.paidAmount !== undefined ? Number(existing.paidAmount) : (existing?.paid ? totalAmount : 0);
        balanceDue = Math.max(0, totalAmount - paidAmount);
        isPaid = paidAmount >= totalAmount && totalAmount > 0;
      }

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
        includeAdmissionFee,
        includeCautionMoney,
        includeAnnualCharges,
        includeBusFee,
        arrearsAmount: isAlreadyFullyPaid ? Number(existing?.arrearsAmount || 0) : arrearsAmount,
        arrearsMonths: isAlreadyFullyPaid ? (existing?.arrearsMonths || []) : arrearsMonths,
        amount: totalAmount,
        paid: isPaid,
        paidAmount,
        balanceDue,
        concession,
      } as MonthlyFee;
    });

    // Auto-sync calculated arrears and bills into Firestore so all subsequent months and reports remain in sync
    const feesToSync = allFees.filter(fee => {
      if (fee.paid && (!fee.balanceDue || fee.balanceDue === 0)) return false;
      const stored = feeMap.get(fee.studentId);
      if (!stored) return true;

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

    if (feesToSync.length > 0) {
      try {
        await Promise.all(feesToSync.map(fee => saveFee(fee)));
      } catch (error) {
        console.error("Could not persist monthly fee dues:", error);
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

  const handleOpenPaymentModal = (fee: MonthlyFee) => {
    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;
    const curStudent = students.find(s => s.id === fee.studentId);
    setCollectingFee(fee);
    setCustomIncludeAdmissionFee(Boolean(fee.includeAdmissionFee ?? false));
    setCustomIncludeCautionMoney(Boolean(fee.includeCautionMoney ?? false));
    setCustomIncludeAnnualCharges(Boolean(fee.includeAnnualCharges ?? false));
    setCustomIncludeBusFee(Boolean(fee.includeBusFee ?? curStudent?.usesBus ?? false));
    setCustomMonthlyAmount(String(fee.monthlyAmount ?? struct?.tuitionFee ?? 19140));
    setCustomPaidAmount(fee.paidAmount !== undefined && fee.paidAmount > 0 ? String(fee.paidAmount) : (fee.paid ? String(fee.amount) : ""));
    setCustomConcession(fee.concession ? String(fee.concession) : "");
    setCustomPayMode(fee.payModeInfo?.payMode || "Cash");
    setCustomBankName(fee.payModeInfo?.bank || "");
    setCustomChequeNo(fee.payModeInfo?.number || "");
    setCustomPaymentDate(fee.paidDate ? fee.paidDate.slice(0, 10) : new Date().toISOString().slice(0, 10));
  };

  const handleConfirmPayment = async (openDpsReceipt: boolean, markUnpaidDirectly = false) => {
    if (!collectingFee) return;
    const fee = collectingFee;
    setSaving(fee.studentId);
    setFeeError(null);

    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;

    const monthlyAmount = Number(customMonthlyAmount) || Number(struct?.tuitionFee || 19140);
    const admAmount = customIncludeAdmissionFee ? Number(struct?.admissionFee ?? 65000) : 0;
    const cauAmount = customIncludeCautionMoney ? Number(struct?.cautionMoney ?? 60000) : 0;
    const annAmount = customIncludeAnnualCharges ? Number(struct?.annualCharges ?? 23320) : 0;
    const busAmount = customIncludeBusFee ? Number(struct?.busFee ?? 10360) : 0;
    const arrearsAmount = Number(fee.arrearsAmount || 0);
    const concession = Number(customConcession) || 0;

    const totalBill = Math.max(0, monthlyAmount + admAmount + cauAmount + annAmount + busAmount + arrearsAmount - concession);

    let effectivePaid: number;
    let isPaid: boolean;

    if (markUnpaidDirectly) {
      effectivePaid = 0;
      isPaid = false;
    } else if (customPaidAmount.trim() === "") {
      effectivePaid = totalBill;
      isPaid = totalBill > 0;
    } else {
      effectivePaid = Math.max(0, Number(customPaidAmount));
      isPaid = effectivePaid >= totalBill && totalBill > 0;
    }

    const balanceDue = Math.max(0, totalBill - effectivePaid);

    const receiptNo = fee.receiptNo || `DPS-RCP-${Math.floor(10000 + Math.random() * 90000)}`;
    const paidDate = customPaymentDate ? new Date(customPaymentDate).toISOString() : new Date().toISOString();
    const payModeInfo = {
      payMode: customPayMode,
      date: new Date(paidDate).toLocaleDateString("en-IN"),
      bank: customBankName,
      number: customChequeNo,
    };

    let sl = 1;
    const items: FeeReceiptItem[] = [];
    items.push({
      id: "1",
      slNo: sl++,
      description: "Tuition Fee",
      due: monthlyAmount,
      con: concession,
      paid: isPaid ? (monthlyAmount - concession) : Math.min(monthlyAmount - concession, effectivePaid),
    });

    if (customIncludeAdmissionFee) {
      items.push({
        id: "2",
        slNo: sl++,
        description: "Admission Fee",
        due: admAmount,
        con: 0,
        paid: isPaid ? admAmount : 0,
      });
    }

    if (customIncludeCautionMoney) {
      items.push({
        id: "3",
        slNo: sl++,
        description: "Caution Money",
        due: cauAmount,
        con: 0,
        paid: isPaid ? cauAmount : 0,
      });
    }

    if (customIncludeAnnualCharges) {
      items.push({
        id: "4",
        slNo: sl++,
        description: "Annual Charges",
        due: annAmount,
        con: 0,
        paid: isPaid ? annAmount : 0,
      });
    }

    if (customIncludeBusFee) {
      items.push({
        id: "5",
        slNo: sl++,
        description: "Bus Fee",
        due: busAmount,
        con: 0,
        paid: isPaid ? busAmount : 0,
      });
    }

    if (arrearsAmount > 0) {
      items.push({
        id: "6",
        slNo: sl++,
        description: "Back Due / Previous Arrears",
        due: arrearsAmount,
        con: 0,
        paid: isPaid ? arrearsAmount : 0,
      });
    }

    const updatedFee: MonthlyFee = {
      ...fee,
      month,
      monthlyAmount,
      includeAdmissionFee: customIncludeAdmissionFee,
      includeCautionMoney: customIncludeCautionMoney,
      includeAnnualCharges: customIncludeAnnualCharges,
      includeBusFee: customIncludeBusFee,
      amount: totalBill,
      paid: isPaid,
      paidAmount: effectivePaid,
      balanceDue,
      concession,
      paidDate: effectivePaid > 0 ? paidDate : undefined,
      paidBy: effectivePaid > 0 ? adminId : undefined,
      receiptNo: effectivePaid > 0 ? receiptNo : undefined,
      payModeInfo,
      items,
    };

    // Optimistic UI update
    setFees(prev => prev.map(f => f.studentId === fee.studentId ? updatedFee : f));
    setCollectingFee(null);

    try {
      await saveFee(updatedFee);
      if (isPaid) {
        await markFeePaid(schoolId, fee.studentId, month, adminId);
      }
      // Persist Bus status to student profile permanently so ALL future months inherit it:
      try {
        await updateStudent(schoolId, fee.studentId, { usesBus: customIncludeBusFee });
        setStudents(prev => prev.map(s => s.id === fee.studentId ? { ...s, usesBus: customIncludeBusFee } : s));
      } catch (err) {
        console.warn("Could not persist student bus setting:", err);
      }
      await loadData(true);
      if (openDpsReceipt && effectivePaid > 0) {
        setDpsReceiptFee(updatedFee);
      }
    } catch (error) {
      console.error("Could not save fee:", error);
      setFeeError(`Could not save ${fee.studentName}'s fee. Please retry.`);
      await loadData(true);
    } finally {
      setSaving(null);
    }
  };

  // Direct 1-Click Toggle for Student Bus (Permanently remembers across all months)
  const handleToggleStudentBus = async (fee: MonthlyFee) => {
    const newBusState = !fee.includeBusFee;
    setSaving(fee.studentId);
    setFeeError(null);

    try {
      // 1. Update Student Profile permanently in Firestore so all future months inherit it
      await updateStudent(schoolId, fee.studentId, { usesBus: newBusState });
      setStudents(prev => prev.map(s => s.id === fee.studentId ? { ...s, usesBus: newBusState } : s));

      // 2. Calculate fee difference for current month
      const targetClass = rawClasses.find(c => c.id === fee.classId);
      const struct = targetClass?.feeStructure;
      const busFeeAmount = Number(struct?.busFee ?? 10360);

      const diff = (newBusState ? 1 : -1) * busFeeAmount;
      const currentBase = Number(fee.amount || 0);
      const newTotal = Math.max(0, currentBase + diff);
      const paidAmount = Number(fee.paidAmount || 0);
      const newBalanceDue = Math.max(0, newTotal - paidAmount);
      const newPaid = paidAmount >= newTotal && newTotal > 0;

      const updatedFee: MonthlyFee = {
        ...fee,
        includeBusFee: newBusState,
        amount: newTotal,
        balanceDue: newBalanceDue,
        paid: newPaid,
      };

      setFees(prev => prev.map(f => f.studentId === fee.studentId ? updatedFee : f));
      await saveFee(updatedFee);
      await loadData(true);
    } catch (err) {
      console.error("Could not toggle student bus setting:", err);
      setFeeError(`Could not update bus setting for ${fee.studentName}. Please retry.`);
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

  const paidFees = fees.filter(f => f.paid && (!f.balanceDue || f.balanceDue === 0));
  const partialFees = fees.filter(f => (f.paidAmount && f.paidAmount > 0 && f.balanceDue && f.balanceDue > 0) || (!f.paid && f.paidAmount && f.paidAmount > 0));
  const unpaidFees = fees.filter(f => !f.paid && (!f.paidAmount || f.paidAmount === 0));
  const totalAmount = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
  const collectedAmount = fees.reduce((sum, f) => sum + (f.paidAmount !== undefined ? Number(f.paidAmount) : (f.paid ? Number(f.amount || 0) : 0)), 0);
  const pendingAmount = Math.max(0, totalAmount - collectedAmount);

  const filteredFees = fees.filter(f => {
    if (duesFilter === "paid") return f.paid && (!f.balanceDue || f.balanceDue === 0);
    if (duesFilter === "partial") return (f.paidAmount && f.paidAmount > 0 && f.balanceDue && f.balanceDue > 0) || (!f.paid && f.paidAmount && f.paidAmount > 0);
    if (duesFilter === "unpaid") return !f.paid;
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

  const toggleStudentFeeExpand = (studentId: string) => {
    setExpandedStudentFeeIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const getFeeItemsForStudent = (fee: MonthlyFee): FeeReceiptItem[] => {
    if (fee.items && fee.items.length > 0) {
      return fee.items;
    }
    const targetClass = rawClasses.find(c => c.id === fee.classId);
    const struct = targetClass?.feeStructure;
    const baseFee = Number(fee.monthlyAmount ?? fee.amount ?? struct?.tuitionFee ?? 19140);
    const effectivePaid = fee.paidAmount !== undefined ? Number(fee.paidAmount) : (fee.paid ? baseFee : 0);
    const arrears = Number(fee.arrearsAmount || 0);

    const isPaid = Boolean(fee.paid);
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
      const bus = Number(struct?.busFee ?? 10360);
      itemsList.push({
        id: "bus",
        slNo: sl++,
        description: "Bus Fee",
        due: bus,
        con: 0,
        paid: isPaid ? bus : 0,
      });
    }

    // 6. Back Due / Previous Arrears
    if (arrears > 0) {
      itemsList.push({
        id: "arrears",
        slNo: sl++,
        description: "Back Due / Previous Arrears",
        due: arrears,
        con: 0,
        paid: isPaid ? arrears : 0,
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
      payModeInfo: fee.payModeInfo || {
        payMode: fee.paid ? "Cheque" : "Pending / Due Slip",
        date: paidDate,
        bank: fee.paid ? "HDFC BANK" : "CASH COUNTER",
        number: fee.receiptNo || "—",
      },
      receiptTypeTitle: fee.paid ? "FEE RECEIPT" : "FEE DUE SLIP",
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowClassFeeModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-black shadow-sm transition cursor-pointer"
            title="Har class ka alag-alag fee structure set aur edit karein"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Class Fee Structure
          </button>
          <button
            onClick={() => setShowSchoolHeaderModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Building2 className="h-4 w-4" /> Receipt Details
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-5 max-w-5xl mx-auto">
        {feeError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 shadow-sm flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-600 shrink-0" /><span>{feeError}</span></div>}

        {/* ── Modern Month Selector & Quick Actions ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center px-4">
              <span className="block text-base sm:text-lg font-black text-slate-900 dark:text-white">
                {new Date(month + "-01T00:00:00").toLocaleString("en-IN", { month: "long", year: "numeric" })}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Academic Fee Cycle</span>
            </div>
            <button
              onClick={() => changeMonth(1)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {month !== currentMonthStr() && (
              <button
                type="button"
                onClick={() => setMonth(currentMonthStr())}
                className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition hover:bg-blue-100 cursor-pointer"
              >
                Today ({new Date().toLocaleString("en-IN", { month: "short" })})
              </button>
            )}
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {students.length} Students Enrolled
            </span>
          </div>
        </div>

        {/* ── 4 Executive KPI Metric Cards (Modern ERP Dashboard) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Expected */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Kul Deen (Total)</span>
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"><IndianRupee className="w-4 h-4" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">₹{totalAmount.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{fees.length} Total students</p>
          </div>

          {/* Card 2: Total Collected */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Jama (Collected)</span>
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"><TrendingUp className="w-4 h-4" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">₹{collectedAmount.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{paidFees.length} Students Full Paid</p>
          </div>

          {/* Card 3: Pending Balances */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Baki (Pending Due)</span>
              <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"><Clock className="w-4 h-4" /></div>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">₹{pendingAmount.toLocaleString("en-IN")}</p>
            <p className="text-[11px] text-slate-400 mt-1">{unpaidFees.length} Unpaid • {partialFees.length} Partial</p>
          </div>

          {/* Card 4: Total Arrears Carried Forward */}
          {(() => {
            const totalArrearsSum = fees.reduce((sum, f) => sum + (Number(f.arrearsAmount) || 0), 0);
            const defaultersCount = fees.filter(f => Number(f.arrearsAmount || 0) > 0).length;
            return (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pichhla Baki (Arrears)</span>
                  <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"><AlertCircle className="w-4 h-4" /></div>
                </div>
                <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">₹{totalArrearsSum.toLocaleString("en-IN")}</p>
                <p className="text-[11px] text-slate-400 mt-1">{defaultersCount} Students with Back Due</p>
              </div>
            );
          })()}
        </div>

        {/* ── Collection Progress Indicator ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-xs border border-slate-200/80 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs font-bold mb-2">
            <span className="text-slate-600 dark:text-slate-300">Monthly Collection Recovery</span>
            <span className="text-slate-900 dark:text-white font-black text-sm">
              {totalAmount > 0 ? Math.round((collectedAmount / totalAmount) * 100) : 0}% Complete
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${totalAmount > 0 ? Math.min(100, (collectedAmount / totalAmount) * 100) : 0}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
            <span>Collected: ₹{collectedAmount.toLocaleString("en-IN")}</span>
            <span>Target: ₹{totalAmount.toLocaleString("en-IN")}</span>
          </div>
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
                                    onClick={() => printReceipts([fee], "4in1")}
                                    className="p-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950/60 dark:text-orange-300"
                                    title="Print DPS Due Slip"
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
          {/* Dues & Arrears Quick Filter */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                Fee Dues & Arrears Filter (Pending Months):
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                {filteredFees.length} of {fees.length} students
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold no-scrollbar">
              <button
                onClick={() => setDuesFilter("all")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "all" ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"}`}
              >
                All ({fees.length})
              </button>
              <button
                onClick={() => setDuesFilter("paid")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "paid" ? "bg-emerald-600 text-white shadow-sm" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}
              >
                Paid ({paidFees.length})
              </button>
              <button
                onClick={() => setDuesFilter("unpaid")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "unpaid" ? "bg-orange-600 text-white shadow-sm" : "bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300"}`}
              >
                All Unpaid ({unpaidFees.length})
              </button>
              <button
                onClick={() => setDuesFilter("due3")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "due3" ? "bg-amber-600 text-white shadow-sm" : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300"}`}
              >
                ⚠️ 3+ Months Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 3).length})
              </button>
              <button
                onClick={() => setDuesFilter("due6")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "due6" ? "bg-rose-600 text-white shadow-sm" : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300"}`}
              >
                6+ Months Due ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 6).length})
              </button>
              <button
                onClick={() => setDuesFilter("due8")}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer ${duesFilter === "due8" ? "bg-rose-700 text-white shadow-sm" : "bg-rose-100 dark:bg-rose-950/60 text-rose-900 dark:text-rose-200"}`}
              >
                🚨 8-12 Months Defaulters ({fees.filter(f => !f.paid && (f.arrearsMonths?.length || 0) >= 8).length})
              </button>
            </div>
          </div>

          <div className="space-y-3.5">
            {filteredFees.map((fee, idx) => {
              const isPaid = fee.paid && (!fee.balanceDue || fee.balanceDue === 0);
              const isPartial = (Number(fee.paidAmount || 0) > 0 && Number(fee.balanceDue || 0) > 0) || (!fee.paid && Number(fee.paidAmount || 0) > 0);
              const isUnpaid = !fee.paid && (!fee.paidAmount || fee.paidAmount === 0);
              const hasArrears = Number(fee.arrearsAmount || 0) > 0;
              const items = getFeeItemsForStudent(fee);
              const isExpanded = expandedStudentFeeIds.includes(fee.studentId);

              return (
                <div
                  key={fee.studentId ? `fee-card-${fee.studentId}` : `fee-card-${fee.rollNo || idx}-${idx}`}
                  className={`rounded-2xl p-4 sm:p-5 transition-all border shadow-xs ${
                    isPaid
                      ? "bg-white dark:bg-slate-800 border-emerald-200 dark:border-emerald-800/60"
                      : isPartial
                      ? "bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-700/70 ring-1 ring-amber-400/20"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {/* ── Top Header Row: Checkbox, Roll No, Student Name & Status Badge ── */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/70">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={fee.paid ? selectedReceiptIds.includes(fee.studentId) : selectedDueSlipIds.includes(fee.studentId)}
                        onChange={() => {
                          if (fee.paid) {
                            toggleReceiptSelection(fee.studentId);
                          } else {
                            setSelectedDueSlipIds(cur => cur.includes(fee.studentId) ? cur.filter(id => id !== fee.studentId) : [...cur, fee.studentId]);
                          }
                        }}
                        className="h-4 w-4 rounded accent-blue-600 cursor-pointer shrink-0"
                        aria-label={`Select ${fee.studentName}`}
                      />
                      <span className="px-2 py-0.5 rounded-lg font-mono text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                        #{fee.rollNo || "00"}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
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
                            className="text-left font-black text-slate-900 dark:text-white text-base hover:text-blue-600 dark:hover:text-blue-400 truncate flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <span className="truncate">{fee.studentName}</span>
                            <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded-md shrink-0">
                              Profile ↗
                            </span>
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{classNames[fee.classId] || className || "Standard Class"}</span>
                          {fee.receiptNo && (
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                              {fee.receiptNo}
                            </span>
                          )}
                          {fee.paidDate && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              • Paid {new Date(fee.paidDate).toLocaleDateString("en-IN")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Status Pill Badge (Never squished) */}
                    <div className="shrink-0 self-start sm:self-center">
                      {isPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ FULL PAID (₹{Number(fee.paidAmount || fee.amount || 0).toLocaleString("en-IN")})</span>
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>⚠️ PARTIAL (₹{Number(fee.paidAmount || 0).toLocaleString("en-IN")} Paid • ₹{Number(fee.balanceDue || 0).toLocaleString("en-IN")} Due)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300">
                          <Clock className="w-3.5 h-3.5 text-rose-600" />
                          <span>✗ UNPAID DUE (₹{Number(fee.amount || 0).toLocaleString("en-IN")})</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Financial Highlights (4 Distinct Metric Columns) ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Monthly Tuition</span>
                      <span className="font-black text-slate-800 dark:text-slate-200 text-sm">
                        ₹{Number(fee.monthlyAmount ?? fee.amount ?? 0).toLocaleString("en-IN")}
                      </span>
                      {fee.includeAdmissionFee && (
                        <span className="block text-[10px] text-purple-600 dark:text-purple-400 font-bold mt-0.5">
                          + Adm: ₹{Number(items.find(i => i.description.toLowerCase().includes("admission"))?.due || 0).toLocaleString("en-IN")}
                        </span>
                      )}
                      {/* Persistent Bus Toggle: Once chosen, persists across all months */}
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStudentBus(fee)}
                          disabled={saving === fee.studentId}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition flex items-center gap-1 cursor-pointer border ${
                            fee.includeBusFee
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"
                          }`}
                          title="School Bus: Ek baar ON karne par yeh student ke sabhi mahino me permanent rahega"
                        >
                          <span>🚌 Bus:</span>
                          <span className={fee.includeBusFee ? "font-black text-amber-800 dark:text-amber-300" : "font-semibold"}>
                            {fee.includeBusFee ? "ON (Permanent)" : "OFF"}
                          </span>
                        </button>
                        {fee.includeBusFee && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">
                            +₹{Number(items.find(i => i.description.toLowerCase().includes("bus"))?.due || 10360).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Pichhla Baki (Arrears)</span>
                      {hasArrears ? (
                        <div>
                          <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
                            +₹{Number(fee.arrearsAmount).toLocaleString("en-IN")}
                          </span>
                          <span className="block text-[10px] text-orange-500 font-bold mt-0.5">
                            {fee.arrearsMonths?.length} Month Due
                          </span>
                        </div>
                      ) : (
                        <span className="font-bold text-slate-400 text-sm">₹0 (Nil)</span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Kul Bill (Total)</span>
                      <span className="font-black text-blue-700 dark:text-blue-400 text-base">
                        ₹{Number(fee.amount || 0).toLocaleString("en-IN")}
                      </span>
                      {fee.concession ? (
                        <span className="block text-[10px] text-emerald-600 font-medium">
                          Disc: -₹{Number(fee.concession).toLocaleString("en-IN")}
                        </span>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                        {isPaid ? "Payment Status" : "Remaining Due (Baki)"}
                      </span>
                      {isPaid ? (
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                          ✓ Cleared
                        </span>
                      ) : (
                        <span className="font-black text-rose-600 dark:text-rose-400 text-base block">
                          ₹{Number(fee.balanceDue ?? fee.amount ?? 0).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── Auto Arrears Notification Banner if previous months were pending ── */}
                  {hasArrears && (
                    <div className="mb-3 px-3 py-2 rounded-xl bg-orange-50/80 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-xs text-orange-900 dark:text-orange-200 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AlertCircle className="w-4 h-4 text-orange-600 shrink-0" />
                        <span>Pichhle mahine ka baki due: <strong>₹{Number(fee.arrearsAmount).toLocaleString("en-IN")}</strong> ({fee.arrearsMonths?.join(", ")}) is mahine ke bill me automatically shamil hai.</span>
                      </span>
                    </div>
                  )}

                  {/* ── In-Place Collapsible Fee Heads Breakdown Table ── */}
                  {isExpanded && (
                    <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span>📜 Official Fee Heads Breakdown ({fee.studentName}):</span>
                        <span className={isPaid ? "text-emerald-600 font-black" : "text-orange-600 font-black"}>
                          {isPaid ? "✓ PAID IN FULL" : (isPartial ? "⚠️ PARTIAL PAID" : "PENDING DUE")}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-left text-xs border-collapse bg-white dark:bg-slate-800">
                          <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                            <tr>
                              <th className="p-2 border-r dark:border-slate-600">Sl</th>
                              <th className="p-2 border-r dark:border-slate-600">Fee Head Description</th>
                              <th className="p-2 border-r dark:border-slate-600">Standard Due (₹)</th>
                              <th className="p-2 border-r dark:border-slate-600">Concession (₹)</th>
                              <th className="p-2">Paid (₹)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {items.map((item, i) => (
                              <tr key={item.id ? `item-${item.id}` : `item-${i}`}>
                                <td className="p-2 border-r dark:border-slate-700 text-slate-400 font-mono">{item.slNo}</td>
                                <td className="p-2 border-r dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200">{item.description}</td>
                                <td className="p-2 border-r dark:border-slate-700 font-mono">₹{Number(item.due).toLocaleString("en-IN")}</td>
                                <td className="p-2 border-r dark:border-slate-700 font-mono text-slate-500">₹{Number(item.con || 0).toLocaleString("en-IN")}</td>
                                <td className="p-2 font-bold text-emerald-600 dark:text-emerald-400 font-mono">₹{Number(item.paid).toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* ── Card Bottom: Fully Mobile-Friendly & Spacious Action Toolbar ── */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-700/60">
                    {/* Primary Workflow Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPaymentModal(fee)}
                        disabled={saving === fee.studentId}
                        className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer disabled:opacity-50"
                      >
                        <IndianRupee className="w-4 h-4" />
                        <span>{isPaid ? "Edit Payment Details" : "💳 Pay / Collect Fee"}</span>
                      </button>

                      {!isPaid ? (
                        <button
                          type="button"
                          onClick={() => setFeeStatus(fee, true)}
                          disabled={saving === fee.studentId}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>⚡ Quick Full Paid</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFeeStatus(fee, false)}
                          disabled={saving === fee.studentId}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-800 dark:bg-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Mark Unpaid</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDpsReceiptFee(isPaid ? fee : { ...fee, paid: true, paidDate: new Date().toISOString() })}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-amber-300" />
                        <span>{isPaid ? "DPS Receipt" : "DPS Slip"}</span>
                      </button>
                    </div>

                    {/* Secondary Utilities (Print, WhatsApp, PDF, Heads toggle) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => isPaid ? printDpsReceipts([fee], "4in1") : printReceipts([fee])}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title={isPaid ? "Print 4-in-1 A4 DPS Receipt" : "Print Due Slip"}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => isPaid ? sendReceiptOnWhatsApp(fee) : sendDueSlipOnWhatsApp(fee)}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer"
                        title="WhatsApp slip/receipt to parent"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFeeFile(fee)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition cursor-pointer"
                        title="Download MHTML Slip"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStudentFeeExpand(fee.studentId)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <ReceiptText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{isExpanded ? "Hide Heads ▲" : "Fee Heads ▼"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {fees.length === 0 && (
              <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
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
      <ClassFeeStructureModal
        isOpen={showClassFeeModal}
        onClose={() => setShowClassFeeModal(false)}
        classes={rawClasses}
        schoolId={schoolId}
        onUpdated={() => loadData(true)}
      />

      {/* ── CUSTOM PAYMENT ENTRY MODAL (Admission Fee Opt-In, Partial Payment & Individual Student Saving) ── */}
      {collectingFee && (() => {
        const modalTargetClass = rawClasses.find(c => c.id === collectingFee.classId);
        const modalStruct = modalTargetClass?.feeStructure;
        const modalMonthly = Number(customMonthlyAmount) || Number(modalStruct?.tuitionFee || 19140);
        const modalAdm = customIncludeAdmissionFee ? Number(modalStruct?.admissionFee ?? 65000) : 0;
        const modalCau = customIncludeCautionMoney ? Number(modalStruct?.cautionMoney ?? 60000) : 0;
        const modalAnn = customIncludeAnnualCharges ? Number(modalStruct?.annualCharges ?? 23320) : 0;
        const modalBus = customIncludeBusFee ? Number(modalStruct?.busFee ?? 10360) : 0;
        const modalArrears = Number(collectingFee.arrearsAmount || 0);
        const modalConcession = Number(customConcession) || 0;

        const modalTotalBill = Math.max(0, modalMonthly + modalAdm + modalCau + modalAnn + modalBus + modalArrears - modalConcession);
        const enteredPaid = customPaidAmount.trim() !== "" ? Number(customPaidAmount) : modalTotalBill;
        const remainingBalance = Math.max(0, modalTotalBill - enteredPaid);

        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full max-h-[92vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Sticky Header - Locked at top */}
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2 truncate">
                    <IndianRupee className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="truncate">Fee Payment & Heads</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    Student: <strong className="text-slate-800 dark:text-slate-200">{collectingFee.studentName}</strong> (Roll: #{collectingFee.rollNo || "00"}) • {classNames[collectingFee.classId] || className}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCollectingFee(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700 transition cursor-pointer shrink-0"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Modal Content - Scrolls smoothly from top to bottom */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 overscroll-contain">

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

                {/* Bus Fee Toggle (Persistent across all months) */}
                <label className={`flex items-center justify-between gap-3 p-2 rounded-lg border transition cursor-pointer ${customIncludeBusFee ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={customIncludeBusFee}
                      onChange={e => setCustomIncludeBusFee(e.target.checked)}
                      className="h-4 w-4 rounded accent-amber-600 cursor-pointer"
                    />
                    <div>
                      <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                        🚌 Bus Fee (+₹{Number(modalStruct?.busFee ?? 10360).toLocaleString("en-IN")})
                      </span>
                      <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                        {customIncludeBusFee ? "✓ Bus Route ON (Hamesha Sabhi Mahino Me Rahega)" : "Default: Band (Disabled)"}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${customIncludeBusFee ? "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200" : "bg-slate-100 text-slate-500"}`}>
                    {customIncludeBusFee ? `+₹${Number(modalStruct?.busFee ?? 10360).toLocaleString("en-IN")}` : "₹0"}
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

              {/* Total Calculated Bill Overview */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Kul Deen (Total Payable):</span>
                  <span className="text-xl font-black text-amber-300">
                    ₹{modalTotalBill.toLocaleString("en-IN")}
                  </span>
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
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setCustomPaidAmount(String(modalTotalBill))}
                        className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-800 cursor-pointer"
                      >
                        Full (₹{modalTotalBill.toLocaleString("en-IN")})
                      </button>
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
                      placeholder={`Full bill: ₹${modalTotalBill.toLocaleString("en-IN")}`}
                      value={customPaidAmount}
                      onChange={e => setCustomPaidAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm font-black text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Partial Payment Roll-over alert as requested by user */}
                  <div className="text-[11px] mt-1.5 p-2.5 rounded-lg border transition">
                    {customPaidAmount.trim() !== "" ? (
                      Number(customPaidAmount) < modalTotalBill && Number(customPaidAmount) > 0 ? (
                        <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-1.5 rounded space-y-0.5">
                          <span className="font-black text-amber-700 dark:text-amber-300 block">
                            ⚠️ Kam Jama (Partial Payment):
                          </span>
                          <span>
                            ₹{Number(customPaidAmount).toLocaleString("en-IN")} jama hoga. Baki <strong className="text-rose-600 dark:text-rose-400">₹{remainingBalance.toLocaleString("en-IN")}</strong> Due rahega aur agle mahine (Next Month) me automatically jud jayega!
                          </span>
                        </div>
                      ) : Number(customPaidAmount) >= modalTotalBill ? (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 p-1.5 rounded">
                          <span className="font-black text-emerald-700 dark:text-emerald-300 block">
                            ✓ Poora Bhugtan (Full Paid):
                          </span>
                          <span>Poora ₹{Number(customPaidAmount).toLocaleString("en-IN")} jama ho gaya hai, koi due nahi rahega.</span>
                        </div>
                      ) : (
                        <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 p-1.5 rounded">
                          <span className="font-black text-rose-700 dark:text-rose-300 block">
                            ✗ Koi Jama Nahi (Full Due):
                          </span>
                          <span>Poora ₹{modalTotalBill.toLocaleString("en-IN")} agle mahine ke liye pending due rahega.</span>
                        </div>
                      )
                    ) : (
                      <span className="text-slate-600 dark:text-slate-300">
                        💡 <strong>Default:</strong> Agar khali chhodenge to poora ₹{modalTotalBill.toLocaleString("en-IN")} jama mana jayega.
                      </span>
                    )}
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
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Payment Date:</label>
                    <input
                      type="date"
                      value={customPaymentDate}
                      onChange={e => setCustomPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-bold text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              </div>

              {/* Action Buttons: Sticky Modal Footer - Always accessible at bottom */}
              <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/95 shrink-0 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCollectingFee(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                {collectingFee.paid && (
                  <button
                    type="button"
                    onClick={() => handleConfirmPayment(false, true)}
                    disabled={saving === collectingFee.studentId}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    Mark Unpaid
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
                    <span>Save & DPS Receipt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
