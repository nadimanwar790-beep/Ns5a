// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  RotateCcw,
  Search,
  CheckCircle,
  Printer,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Calendar,
  Clock,
  Filter,
  Wallet,
  ArrowLeft,
} from "lucide-react";
import { School, SchoolSession } from "../../school-types";
import { loadSchoolSubcollection, syncSchoolSubcollection } from "../../utils/schoolCloudSync";
import {
  getLocalFees,
  getAllSchoolFeeReceiptsRaw,
  cancelSchoolFeeReceipt,
} from "../../school-firebase";
import { getDynamicAcademicSessionLabel } from "../../utils/safeBrowserActions";
import { printElementInIframe } from "./AdmissionFormPrintModal";

export interface RefundVoucher {
  id: string;
  voucherNo: string;
  originalReceiptNo: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNo?: string;
  admissionNo?: string;
  refundAmount: number;
  refundMode: "CASH" | "UPI" | "ADJUST_FUTURE_DUES";
  reason: string;
  remarks: string;
  authorizedBy: string;
  date: string;
  time: string;
  sessionId?: string;
}

interface Props {
  school: School | null;
  activeSession: SchoolSession | null;
  isOpen: boolean;
  onClose: () => void;
  onReceiptCancelled?: () => void;
  defaultAuthorizedBy?: string;
  asPage?: boolean;
}

type PeriodFilterMode = "session" | "day" | "week" | "month";
type TxKindFilter = "ALL" | "PAID" | "REFUND";

interface TimelineEntry {
  key: string;
  kind: "PAID" | "REFUND";
  receiptNo: string;
  voucherNo?: string;
  studentId: string;
  studentName: string;
  className: string;
  rollNo: string;
  admissionNo: string;
  phone: string;
  amount: number;
  dateIso: string; // YYYY-MM-DD
  timeLabel: string;
  timestampMs: number;
  actorName: string;
  paymentMode: string;
  categoryLabel: string;
  reason?: string;
  remarks?: string;
  sessionId?: string;
  isAlreadyCancelled?: boolean;
  rawRecord?: any;
  rawVoucher?: RefundVoucher;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCurrentMonthIso(): string {
  return getTodayIso().slice(0, 7);
}

function getIsoWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getWeekBounds(weekStr: string): { start: string; end: string } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekStr);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const week = parseInt(m[2], 10);
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const monday = new Date(simple);
  if (dow <= 4) monday.setUTCDate(simple.getUTCDate() - (dow === 0 ? 6 : dow - 1));
  else monday.setUTCDate(simple.getUTCDate() + (8 - dow));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const fmt = (dt: Date) => dt.toISOString().slice(0, 10);
  return { start: fmt(monday), end: fmt(sunday) };
}

function parseDateAndTime(rawDate: unknown, fallbackTime?: string, fallbackMonth?: string): {
  dateIso: string;
  timeLabel: string;
  timestampMs: number;
} {
  const str = String(rawDate ?? "").trim();
  if (str) {
    // Handle YYYY-MM-DD or ISO timestamp
    const isoMatch = /^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?/.exec(str);
    if (isoMatch) {
      const dateIso = isoMatch[1];
      const dt = new Date(str);
      const ms = isNaN(dt.getTime()) ? new Date(`${dateIso}T12:00:00`).getTime() : dt.getTime();
      const timeLabel =
        fallbackTime ||
        (str.includes("T") && !isNaN(dt.getTime())
          ? dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
          : isoMatch[2] || "");
      return { dateIso, timeLabel, timestampMs: ms };
    }
    // Handle DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(str);
    if (dmyMatch) {
      const dateIso = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
      const ms = new Date(`${dateIso}T12:00:00`).getTime();
      return { dateIso, timeLabel: fallbackTime || "", timestampMs: ms };
    }
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, "0");
      const d = String(parsed.getDate()).padStart(2, "0");
      return {
        dateIso: `${y}-${m}-${d}`,
        timeLabel:
          fallbackTime ||
          parsed.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        timestampMs: parsed.getTime(),
      };
    }
  }
  const monthStr = String(fallbackMonth || "").trim();
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    const dateIso = `${monthStr}-01`;
    return { dateIso, timeLabel: fallbackTime || "", timestampMs: new Date(`${dateIso}T09:00:00`).getTime() };
  }
  const today = getTodayIso();
  return { dateIso: today, timeLabel: fallbackTime || "", timestampMs: Date.now() };
}

function formatDisplayDate(dateIso: string): string {
  if (!dateIso || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return dateIso || "—";
  const [y, m, d] = dateIso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function resolveSessionBounds(activeSession: SchoolSession | null): { start: string; end: string; label: string } {
  const label = activeSession?.name || getDynamicAcademicSessionLabel();
  if (activeSession?.startDate && activeSession?.endDate) {
    return {
      start: activeSession.startDate.slice(0, 10),
      end: activeSession.endDate.slice(0, 10),
      label,
    };
  }
  const yrMatch = /(20\d{2})/.exec(label);
  const startYear = yrMatch ? parseInt(yrMatch[1], 10) : new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
    label,
  };
}

function resolveCollectorDisplayName(r: any): string {
  const explicit = String(r?.collectedByName || r?.collectedBy || r?.collectorName || "").trim();
  if (explicit) return explicit;
  const roleLabel =
    r?.collectedByRole === "manager"
      ? "Manager"
      : r?.collectedByRole === "accountant"
      ? "Accountant"
      : "";
  const paidByRaw = String(r?.paidBy || "").trim();
  if (paidByRaw && paidByRaw.length <= 24 && !/^[A-Za-z0-9]{20,}$/.test(paidByRaw)) {
    return roleLabel ? `${paidByRaw} (${roleLabel})` : paidByRaw;
  }
  if (String(r?.paymentMode || "").toLowerCase().includes("razorpay") || r?.razorpayPaymentId) {
    return "Online / Razorpay";
  }
  return roleLabel || "School Admin / Counter";
}

export const ReceiptCancellationModal: React.FC<Props> = ({
  school,
  activeSession,
  isOpen,
  onClose,
  onReceiptCancelled,
  defaultAuthorizedBy,
  asPage = false,
}) => {
  const schoolId = school?.id || "SCH-001";
  const feeStorageKey = `school_fee_records_${schoolId}`;
  const refundStorageKey = `school_refund_vouchers_${schoolId}`;

  const [searchQuery, setSearchQuery] = useState("");
  const [periodMode, setPeriodMode] = useState<PeriodFilterMode>("session");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso);
  const [selectedWeek, setSelectedWeek] = useState<string>(() => getIsoWeekString());
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthIso);
  const [txKindFilter, setTxKindFilter] = useState<TxKindFilter>("ALL");

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState("गलत छात्र चयन (Wrong Student Selected)");
  const [refundMode, setRefundMode] = useState<"CASH" | "UPI" | "ADJUST_FUTURE_DUES">("CASH");
  const [remarks, setRemarks] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState(defaultAuthorizedBy || school?.principalName || "Admin (Principal)");
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmCancelReceiptId, setConfirmCancelReceiptId] = useState<string | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<RefundVoucher | null>(null);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [allFeeRecords, setAllFeeRecords] = useState<any[]>([]);
  const voucherPrintRef = useRef<HTMLDivElement>(null);

  const sessionBounds = useMemo(() => resolveSessionBounds(activeSession), [activeSession]);

  // Load refund audit logs
  const [auditLogs, setAuditLogs] = useState<RefundVoucher[]>(() => {
    try {
      const raw = localStorage.getItem(refundStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (err) {
      console.warn("[ReceiptCancellationModal] Failed reading refund audit logs:", err);
    }
    return [];
  });

  // Instant local hydration + full cloud/admission/monthly fee loading
  const refreshReceipts = async () => {
    if (!schoolId) return;
    try {
      const localList: any[] = [...getLocalFees(schoolId)];
      const legacyRaw = localStorage.getItem(feeStorageKey);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (Array.isArray(parsed)) localList.push(...parsed);
      }
      if (localList.length > 0) {
        setAllFeeRecords((prev) => (prev.length > 0 ? prev : localList));
      }
    } catch {}

    setLoadingReceipts(true);
    try {
      const allRaw = await getAllSchoolFeeReceiptsRaw(schoolId);
      setAllFeeRecords(allRaw);
    } catch (err) {
      console.warn("[ReceiptCancellationModal] Failed loading receipts:", err);
    } finally {
      setLoadingReceipts(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    refreshReceipts();
    const onFeeUpdated = (e: any) => {
      if (!e?.detail?.schoolId || e.detail.schoolId === schoolId) {
        refreshReceipts();
      }
    };
    window.addEventListener("fee-updated", onFeeUpdated);
    return () => window.removeEventListener("fee-updated", onFeeUpdated);
  }, [isOpen, schoolId]);

  useEffect(() => {
    if (!isOpen || !school?.id) return;
    let active = true;
    loadSchoolSubcollection<RefundVoucher>(school.id, "refund_vouchers", refundStorageKey)
      .then((cloudLogs) => {
        if (active && cloudLogs.length > 0) {
          setAuditLogs(cloudLogs);
          try {
            localStorage.setItem(refundStorageKey, JSON.stringify(cloudLogs));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn("[ReceiptCancellationModal] Failed loading cloud refund logs:", err);
      });
    return () => {
      active = false;
    };
  }, [isOpen, school?.id, refundStorageKey]);

  // Build PhonePe-style Unified Ledger (Paid = Green, Refund = Red) scoped to 1 Active Session
  const sessionTimelineEntries = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    const cancelledReceiptNos = new Set<string>();
    const refundVoucherReceiptNos = new Set<string>();

    (auditLogs || []).forEach((v) => {
      const orig = String(v.originalReceiptNo || "").trim().toUpperCase();
      if (orig) {
        cancelledReceiptNos.add(orig);
        refundVoucherReceiptNos.add(orig);
      }
      const parsedDt = parseDateAndTime(v.date, v.time);
      const inSession =
        v.sessionId && activeSession?.id
          ? v.sessionId === activeSession.id
          : parsedDt.dateIso >= sessionBounds.start && parsedDt.dateIso <= sessionBounds.end;
      if (!inSession) return;

      entries.push({
        key: `rfd_${v.id || v.voucherNo}`,
        kind: "REFUND",
        receiptNo: String(v.originalReceiptNo || v.voucherNo),
        voucherNo: v.voucherNo,
        studentId: v.studentId || "",
        studentName: v.studentName || "Student",
        className: v.className || "Class",
        rollNo: v.rollNo || "",
        admissionNo: v.admissionNo || "",
        phone: "",
        amount: Number(v.refundAmount || 0),
        dateIso: parsedDt.dateIso,
        timeLabel: parsedDt.timeLabel || v.time || "",
        timestampMs: parsedDt.timestampMs,
        actorName: v.authorizedBy || "Admin (Principal)",
        paymentMode: v.refundMode || "CASH",
        categoryLabel: "Refund Voucher",
        reason: v.reason,
        remarks: v.remarks,
        sessionId: v.sessionId,
        rawVoucher: v,
      });
    });

    (allFeeRecords || []).forEach((r, idx) => {
      if (!r || typeof r !== "object") return;
      const recNo = String(r.receiptNo || r.receiptNumber || r.id || r._docId || "").trim();
      const recUpper = recNo.toUpperCase();
      const isCancelledFlag =
        String(r.status || "").toUpperCase() === "CANCELLED" ||
        r.cancelled === true ||
        (recUpper ? cancelledReceiptNos.has(recUpper) : false);

      const paidVal = Number(r.paidAmount ?? (r.paid ? r.amount : 0) ?? 0);
      const hasPaid =
        paidVal > 0 ||
        Boolean(r.paid) ||
        String(r.status || "").toUpperCase() === "PAID";

      const rawDt = r.paidDate || r.updatedAt || r.createdAt;
      const parsedDt = parseDateAndTime(rawDt, undefined, r.month);

      // Strictly scope to 1 session
      const inSession =
        r.sessionId && activeSession?.id
          ? r.sessionId === activeSession.id
          : parsedDt.dateIso >= sessionBounds.start && parsedDt.dateIso <= sessionBounds.end;
      if (!inSession) return;

      if (hasPaid && paidVal > 0) {
        const isAdm =
          r.feeType === "admission" ||
          r.receiptCategory === "admission" ||
          recUpper.startsWith("ADM-") ||
          recUpper.startsWith("READM-");
        entries.push({
          key: `paid_${r.id || recNo}_${idx}`,
          kind: "PAID",
          receiptNo: recNo || `REC-${idx + 1}`,
          studentId: r.studentId || "",
          studentName: r.studentName || "Student",
          className: r.className || "Class",
          rollNo: r.rollNo || "",
          admissionNo: r.admissionNo || "",
          phone: r.phone || "",
          amount: paidVal,
          dateIso: parsedDt.dateIso,
          timeLabel: parsedDt.timeLabel,
          timestampMs: parsedDt.timestampMs,
          actorName: resolveCollectorDisplayName(r),
          paymentMode: r.paymentMode || r.payModeInfo?.payMode || "CASH",
          categoryLabel: isAdm ? "Admission Fee" : r.month ? `Monthly (${r.month})` : "Monthly Fee",
          sessionId: r.sessionId,
          isAlreadyCancelled: isCancelledFlag,
          rawRecord: r,
        });
      }

      // If fee doc was cancelled directly without a refund_vouchers entry, add a Red refund card too
      if (isCancelledFlag && paidVal > 0 && recUpper && !refundVoucherReceiptNos.has(recUpper)) {
        refundVoucherReceiptNos.add(recUpper);
        const cancelDt = parseDateAndTime(r.cancelledAt || r.updatedAt || r.paidDate, undefined, r.month);
        const syntheticVoucher: RefundVoucher = {
          id: `rfd_sync_${recNo}`,
          voucherNo: r.refundVoucherNo || `RFD-${recNo.slice(-6)}`,
          originalReceiptNo: recNo,
          studentId: r.studentId || "",
          studentName: r.studentName || "Student",
          className: r.className || "",
          rollNo: r.rollNo || "",
          admissionNo: r.admissionNo || "",
          refundAmount: paidVal,
          refundMode: (r.refundMode as any) || "CASH",
          reason: r.cancellationReason || "Receipt Cancelled",
          remarks: r.cancellationRemarks || "",
          authorizedBy: r.refundAuthorizedBy || r.cancelledBy || "Admin",
          date: cancelDt.dateIso,
          time: cancelDt.timeLabel || "",
        };
        entries.push({
          key: `rfd_fee_${recNo}_${idx}`,
          kind: "REFUND",
          receiptNo: recNo,
          voucherNo: syntheticVoucher.voucherNo,
          studentId: r.studentId || "",
          studentName: r.studentName || "Student",
          className: r.className || "Class",
          rollNo: r.rollNo || "",
          admissionNo: r.admissionNo || "",
          phone: r.phone || "",
          amount: paidVal,
          dateIso: cancelDt.dateIso,
          timeLabel: cancelDt.timeLabel,
          timestampMs: cancelDt.timestampMs + 1,
          actorName: syntheticVoucher.authorizedBy,
          paymentMode: syntheticVoucher.refundMode,
          categoryLabel: "Cancelled & Refunded",
          reason: syntheticVoucher.reason,
          remarks: syntheticVoucher.remarks,
          sessionId: r.sessionId,
          rawVoucher: syntheticVoucher,
        });
      }
    });

    return entries.sort((a, b) => b.timestampMs - a.timestampMs);
  }, [allFeeRecords, auditLogs, activeSession?.id, sessionBounds]);

  const filteredEntries = useMemo(() => {
    const cleanQ = searchQuery.trim().replace(/^#/, "").toLowerCase();
    const weekBounds = periodMode === "week" ? getWeekBounds(selectedWeek) : null;

    return sessionTimelineEntries.filter((item) => {
      if (txKindFilter !== "ALL" && item.kind !== txKindFilter) return false;

      if (periodMode === "day" && selectedDate) {
        if (item.dateIso !== selectedDate) return false;
      } else if (periodMode === "week" && weekBounds) {
        if (item.dateIso < weekBounds.start || item.dateIso > weekBounds.end) return false;
      } else if (periodMode === "month" && selectedMonth) {
        if (!item.dateIso.startsWith(selectedMonth)) return false;
      }

      if (!cleanQ) return true;

      const haystack = [
        item.studentName,
        item.className,
        item.receiptNo,
        item.voucherNo || "",
        item.admissionNo,
        item.rollNo,
        item.actorName,
        item.paymentMode,
        item.phone,
        item.categoryLabel,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(cleanQ);
    });
  }, [sessionTimelineEntries, txKindFilter, periodMode, selectedDate, selectedWeek, selectedMonth, searchQuery]);

  const summaryStats = useMemo(() => {
    let totalPaid = 0;
    let totalRefund = 0;
    let paidCount = 0;
    let refundCount = 0;
    filteredEntries.forEach((e) => {
      if (e.kind === "PAID") {
        totalPaid += e.amount;
        paidCount += 1;
      } else {
        totalRefund += e.amount;
        refundCount += 1;
      }
    });
    return {
      totalPaid,
      totalRefund,
      netTotal: totalPaid - totalRefund,
      paidCount,
      refundCount,
    };
  }, [filteredEntries]);

  if (!isOpen) return null;

  const handleExecuteCancellation = async () => {
    if (!selectedReceipt) return;
    if (!remarks.trim()) {
      toast.error("कृपया कैंसिलेशन व रिफंड का विस्तृत कारण (Remarks) दर्ज करें!");
      return;
    }

    const receiptKey = selectedReceipt.receiptNo || selectedReceipt.id;
    if (confirmCancelReceiptId !== receiptKey) {
      setConfirmCancelReceiptId(receiptKey);
      return;
    }

    try {
      setIsProcessing(true);

      const targetAmt = Number(selectedReceipt.paidAmount ?? selectedReceipt.amount ?? 0);
      const voucherNum = `RFD-${Date.now().toString().slice(-6)}`;
      const newVoucher: RefundVoucher = {
        id: `rfd_${Date.now()}`,
        voucherNo: voucherNum,
        originalReceiptNo: selectedReceipt.receiptNo || selectedReceipt.id,
        studentId: selectedReceipt.studentId || "",
        studentName: selectedReceipt.studentName || "Student",
        className: selectedReceipt.className || "",
        rollNo: selectedReceipt.rollNo,
        admissionNo: selectedReceipt.admissionNo || "",
        refundAmount: targetAmt,
        refundMode,
        reason: cancellationReason,
        remarks: remarks.trim(),
        authorizedBy,
        date: getTodayIso(),
        time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        sessionId: activeSession?.id || "",
      };

      await cancelSchoolFeeReceipt(schoolId, selectedReceipt, {
        voucherNo: voucherNum,
        reason: cancellationReason,
        remarks: remarks.trim(),
        refundMode,
        authorizedBy,
        refundAmount: targetAmt,
      });

      const updatedLogs = [newVoucher, ...auditLogs];
      setAuditLogs(updatedLogs);
      localStorage.setItem(refundStorageKey, JSON.stringify(updatedLogs));
      if (school?.id) {
        syncSchoolSubcollection(school.id, "refund_vouchers", updatedLogs);
      }

      setAllFeeRecords((prev) =>
        prev.map((r) =>
          (r.receiptNo || r.id) === receiptKey
            ? { ...r, status: "CANCELLED", cancelled: true, refundVoucherNo: voucherNum }
            : r
        )
      );

      setConfirmCancelReceiptId(null);
      setSuccessVoucher(newVoucher);
      setRemarks("");
      setIsProcessing(false);
      toast.success(`रसीद #${newVoucher.originalReceiptNo} निरस्त कर रिफंड वाउचर जारी किया गया!`);
      onReceiptCancelled?.();
    } catch (err: any) {
      toast.error("रसीद निरस्तीकरण में त्रुटि: " + (err?.message || err));
      setIsProcessing(false);
    }
  };

  const cardShell = (
    <div
      className={
        asPage
          ? "w-full max-w-5xl mx-auto p-3 sm:p-5 space-y-4"
          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-amber-500/35 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      }
    >
      {/* Clean High-Contrast Page / Section Header */}
      <div
        className={
          asPage
            ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            : "p-4 sm:p-5 bg-amber-50/90 dark:bg-slate-900 border-b border-amber-200 dark:border-amber-500/30 flex items-center justify-between gap-3"
        }
      >
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          {asPage && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition cursor-pointer shrink-0"
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="p-2.5 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/40 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Payment &amp; Refund History &bull; रसीद निरस्तीकरण
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-[10px] font-black">
                1 Session: {sessionBounds.label}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
              Paid (Green) व Refund (Red) की पूरी PhonePe-स्टाइल हिस्ट्री — Day, Week, Month और Student/Class फ़िल्टर के साथ
            </p>
          </div>
        </div>
        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2 rounded-xl hover:bg-slate-200/70 dark:hover:bg-slate-800 text-lg font-bold shrink-0 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className={asPage ? "space-y-4" : "p-4 sm:p-5 overflow-y-auto space-y-4"}>
          {successVoucher ? (
            /* SUCCESS PRINT SLIP */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-bold text-sm text-emerald-300">
                    रसीद #{successVoucher.originalReceiptNo} — रिफंड वाउचर #{successVoucher.voucherNo}
                  </div>
                  <div className="text-[11px] text-emerald-200/80">
                    छात्र: {successVoucher.studentName} ({successVoucher.className || "Class"}) • दिनांक: {formatDisplayDate(successVoucher.date)} {successVoucher.time}
                  </div>
                </div>
              </div>

              <div ref={voucherPrintRef} id="print-refund-voucher" className="bg-white text-slate-900 rounded-2xl p-6 border shadow space-y-4">
                <div className="text-center border-b pb-3">
                  <div className="text-xs font-black uppercase text-rose-700 tracking-wider">
                    OFFICIAL REFUND VOUCHER / भुगतान वापसी रसीद
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{school?.name || "SCHOOL NAME"}</h3>
                  <p className="text-[10px] text-slate-500">
                    {sessionBounds.label} &bull; Voucher No: <strong>{successVoucher.voucherNo}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500">छात्र का नाम:</span>
                    <div className="font-bold text-slate-900">{successVoucher.studentName}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">कक्षा व रोल नं:</span>
                    <div className="font-bold">
                      {successVoucher.className || "—"} {successVoucher.rollNo ? `(Roll: ${successVoucher.rollNo})` : ""}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500">मूल रसीद संख्या:</span>
                    <div className="font-bold text-rose-600 line-through">#{successVoucher.originalReceiptNo} (CANCELLED)</div>
                  </div>
                  <div>
                    <span className="text-slate-500">वापसी माध्यम:</span>
                    <div className="font-bold">{successVoucher.refundMode}</div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500">निरस्तीकरण का कारण:</span>
                    <div className="font-semibold text-slate-800">
                      {successVoucher.reason} {successVoucher.remarks ? `(${successVoucher.remarks})` : ""}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900">
                  <span className="text-xs font-bold uppercase">कुल वापस की गई राशि (Refund Amount):</span>
                  <span className="text-xl font-black">₹{Number(successVoucher.refundAmount || 0).toLocaleString("en-IN")}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-6 text-center text-[10px] text-slate-500 border-t">
                  <div>
                    <div className="border-t border-slate-300 pt-1">अभिभावक / प्राप्तकर्ता के हस्ताक्षर</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-300 pt-1">
                      प्रिंसिपल / अधिकृत हस्ताक्षर ({successVoucher.authorizedBy})
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 no-print print:hidden">
                <button
                  type="button"
                  onClick={() =>
                    voucherPrintRef.current &&
                    printElementInIframe(voucherPrintRef.current, `Refund_Voucher_${successVoucher.voucherNo}`)
                  }
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  रिफंड रसीद प्रिंट करें (Print)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessVoucher(null);
                    setSelectedReceipt(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                >
                  हिस्ट्री पर वापस जाएं
                </button>
              </div>
            </div>
          ) : selectedReceipt ? (
            /* CANCELLATION FORM FOR SELECTED RECEIPT */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-300">चयनित रसीद विवरण (Cancel &amp; Refund):</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReceipt(null);
                      setConfirmCancelReceiptId(null);
                    }}
                    className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                  >
                    हिस्ट्री पर लौटें
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    रसीद नं: <strong className="text-white">#{selectedReceipt.receiptNo || selectedReceipt.id}</strong>
                  </div>
                  <div>
                    छात्र: <strong className="text-white">{selectedReceipt.studentName}</strong> ({selectedReceipt.className || "Class"})
                  </div>
                  <div>
                    जमा राशि:{" "}
                    <strong className="text-emerald-400">
                      ₹{Number(selectedReceipt.paidAmount ?? selectedReceipt.amount ?? 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div>
                    Collected By: <strong className="text-white">{resolveCollectorDisplayName(selectedReceipt)}</strong>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">रसीद निरस्तीकरण का कारण चुनें (Reason) *</label>
                  <select
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    <option value="गलत छात्र चयन (Wrong Student Selected)">गलत छात्र चयन (Wrong Student Selected)</option>
                    <option value="डुप्लीकेट / डबल भुगतान (Duplicate Payment)">डुप्लीकेट / डबल भुगतान (Duplicate Payment)</option>
                    <option value="एडमिशन निरस्तीकरण (Admission Cancelled)">एडमिशन निरस्तीकरण (Admission Cancelled)</option>
                    <option value="छूट समायोजन (Fee Concession Adjustment)">छूट समायोजन (Fee Concession Adjustment)</option>
                    <option value="अन्य प्रशासनिक भूल (Other Administrative Error)">अन्य प्रशासनिक भूल (Other Administrative Error)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">रिफंड माध्यम (Refund Mode)</label>
                    <select
                      value={refundMode}
                      onChange={(e: any) => setRefundMode(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    >
                      <option value="CASH">नकद वापसी (Cash Counter)</option>
                      <option value="UPI">ऑनलाइन यूपीआई रिवर्सल (UPI)</option>
                      <option value="ADJUST_FUTURE_DUES">अगले महीने की फीस में एडजस्ट करें</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-300 mb-1">अधिकृत कर्ता (Authorized By)</label>
                    <input
                      type="text"
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">विस्तृत विवरण / टिप्पणी (Remarks) *</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="कैंसिलेशन का कारण स्पष्ट लिखें..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReceipt(null);
                    setConfirmCancelReceiptId(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  पीछे जाएं
                </button>
                {confirmCancelReceiptId === (selectedReceipt.receiptNo || selectedReceipt.id) ? (
                  <div className="flex-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExecuteCancellation}
                      disabled={isProcessing}
                      className="flex-1 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Confirm Refund (₹{Number(selectedReceipt.paidAmount ?? selectedReceipt.amount ?? 0).toLocaleString("en-IN")})
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmCancelReceiptId(null)}
                      className="px-3 py-2.5 rounded-xl bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                    >
                      रद्द
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteCancellation}
                    disabled={isProcessing}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    रसीद कैंसिल व रिफंड जारी करें
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* PHONEPE-STYLE PAYMENT & REFUND HISTORY */
            <div className="space-y-3.5">
              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/40 p-2.5 sm:p-3">
                  <div className="text-[10px] font-bold text-emerald-300 uppercase flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Total Paid
                  </div>
                  <div className="text-sm sm:text-lg font-black text-emerald-400 mt-0.5">
                    +₹{summaryStats.totalPaid.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-emerald-300/75 font-semibold">
                    {summaryStats.paidCount} Payments
                  </div>
                </div>

                <div className="rounded-2xl bg-rose-950/50 border border-rose-500/40 p-2.5 sm:p-3">
                  <div className="text-[10px] font-bold text-rose-300 uppercase flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Total Refund
                  </div>
                  <div className="text-sm sm:text-lg font-black text-rose-400 mt-0.5">
                    -₹{summaryStats.totalRefund.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-rose-300/75 font-semibold">
                    {summaryStats.refundCount} Refunds
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-950/80 border border-slate-700 p-2.5 sm:p-3">
                  <div className="text-[10px] font-bold text-amber-300 uppercase flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" /> Net Collection
                  </div>
                  <div className="text-sm sm:text-lg font-black text-white mt-0.5">
                    ₹{summaryStats.netTotal.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {filteredEntries.length} Total Txns
                  </div>
                </div>
              </div>

              {/* Search by Student Name / Class / Receipt / Collector */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="छात्र का नाम, Class (जैसे Class 3), Receipt No (ADM-/RCP-), या यूजर का नाम लिखें..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Time Filter Bar (1 Session / Day / Week / Month) + Paid/Refund Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 border border-slate-800 rounded-2xl p-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase px-1 flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Filter:
                  </span>
                  {(
                    [
                      { id: "session", label: "1 Session (All)" },
                      { id: "day", label: "Day Wise" },
                      { id: "week", label: "Week Wise" },
                      { id: "month", label: "Month Wise" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPeriodMode(tab.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer ${
                        periodMode === tab.id
                          ? "bg-amber-500 text-slate-950 shadow"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}

                  {periodMode === "day" && (
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-[11px] font-bold text-amber-200"
                    />
                  )}
                  {periodMode === "week" && (
                    <input
                      type="week"
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-[11px] font-bold text-amber-200"
                    />
                  )}
                  {periodMode === "month" && (
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-[11px] font-bold text-amber-200"
                    />
                  )}
                </div>

                {/* Paid (Green) vs Refund (Red) Filter */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setTxKindFilter("ALL")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      txKindFilter === "ALL"
                        ? "bg-slate-200 text-slate-950"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxKindFilter("PAID")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      txKindFilter === "PAID"
                        ? "bg-emerald-500 text-slate-950 font-black"
                        : "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900/50"
                    }`}
                  >
                    Paid (Green)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxKindFilter("REFUND")}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      txKindFilter === "REFUND"
                        ? "bg-rose-500 text-white font-black"
                        : "bg-rose-950/60 text-rose-300 border border-rose-500/30 hover:bg-rose-900/50"
                    }`}
                  >
                    Refund (Red)
                  </button>
                </div>
              </div>

              {/* PhonePe-style Feed List */}
              <div className={asPage ? "space-y-2.5" : "max-h-[46vh] overflow-y-auto space-y-2.5 pr-1"}>
                {loadingReceipts && filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    सेशन {sessionBounds.label} की पेमेंट और रिफंड हिस्ट्री लोड हो रही है...
                  </div>
                ) : filteredEntries.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/50 rounded-2xl border border-slate-800">
                    चुने गए फ़िल्टर या सर्च में कोई पेमेंट / रिफंड रिकॉर्ड नहीं मिला।
                  </div>
                ) : (
                  filteredEntries.map((item) => {
                    const isPaid = item.kind === "PAID";
                    return (
                      <div
                        key={item.key}
                        className={`rounded-2xl p-3 sm:p-3.5 border transition flex items-center justify-between gap-3 ${
                          isPaid
                            ? "bg-emerald-950/35 border-emerald-500/40 hover:border-emerald-400"
                            : "bg-rose-950/40 border-rose-500/45 hover:border-rose-400"
                        }`}
                      >
                        {/* Left PhonePe Icon + User & Student Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isPaid
                                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                : "bg-rose-500/20 border-rose-500/40 text-rose-400"
                            }`}
                          >
                            {isPaid ? (
                              <ArrowDownLeft className="w-5 h-5" />
                            ) : (
                              <RotateCcw className="w-5 h-5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-white truncate">
                                {item.studentName}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-slate-800/90 border border-slate-700 text-[10px] font-bold text-slate-200">
                                {item.className}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  isPaid
                                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                    : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                }`}
                              >
                                {isPaid ? "PAID" : "REFUNDED"}
                              </span>
                              {isPaid && item.isAlreadyCancelled && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-bold">
                                  Cancelled Later
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-300">
                              <span className="inline-flex items-center gap-1 font-bold text-amber-200">
                                <User className="w-3 h-3" />
                                {isPaid ? `Paid by / Collector: ${item.actorName}` : `Refunded by: ${item.actorName}`}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                #{item.voucherNo ? `${item.voucherNo} (Orig #${item.receiptNo})` : item.receiptNo}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDisplayDate(item.dateIso)}
                              </span>
                              {item.timeLabel && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {item.timeLabel}
                                </span>
                              )}
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">
                                {item.paymentMode}
                              </span>
                              <span>{item.categoryLabel}</span>
                              {item.admissionNo && <span>Adm: {item.admissionNo}</span>}
                            </div>

                            {!isPaid && item.reason && (
                              <div className="text-[10px] text-rose-300/90 font-medium">
                                कारण: {item.reason} {item.remarks ? `— ${item.remarks}` : ""}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right PhonePe Amount + Action */}
                        <div className="text-right shrink-0 space-y-1.5">
                          <div
                            className={`text-sm sm:text-base font-black tabular-nums ${
                              isPaid ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {isPaid ? "+" : "-"}₹{item.amount.toLocaleString("en-IN")}
                          </div>

                          {isPaid && !item.isAlreadyCancelled && item.rawRecord ? (
                            <button
                              type="button"
                              onClick={() => setSelectedReceipt(item.rawRecord)}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-200 text-[10px] font-bold transition cursor-pointer"
                            >
                              Cancel / Refund
                            </button>
                          ) : !isPaid && item.rawVoucher ? (
                            <button
                              type="button"
                              onClick={() => setSuccessVoucher(item.rawVoucher!)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <Printer className="w-3 h-3" /> Voucher
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );

  if (asPage) {
    return cardShell;
  }

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-xs">
      {cardShell}
    </div>
  );
};
