import type {
  MonthlyFee,
  SchoolClass,
  SchoolSession,
  SchoolStudent,
} from "../school-types";
import { currentMonthStr, isDemoRecord } from "../school-firebase";
import { getMonthlyFeeFromStructure } from "./feeStructureUtils";

export interface BackMonthAuditItem {
  monthCode: string;
  label: string;
  expectedAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: "paid" | "partial" | "unpaid_saved" | "ungenerated_unpaid" | "exempt";
  receiptNo?: string;
}

export interface BackLedgerSummary {
  totalBilled: number;
  totalPaid: number;
  savedUnpaidDue: number;
  ungeneratedMonthsDue: number;
  monthlyUnpaidDue: number;
  admissionDue: number;
  prevCarriedDue: number;
  totalBackDue: number;
  unpaidItems: { label: string; amount: number; sourceType: "saved" | "ungenerated" | "admission" | "carryover" }[];
  monthTimeline: BackMonthAuditItem[];
  paidReceiptsCount: number;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonthCodeLabel(code: string): string {
  if (!/^\d{4}-\d{2}$/.test(code)) return code;
  const [y, m] = code.split("-").map(Number);
  const name = MONTH_SHORT[Math.max(0, Math.min(11, m - 1))] || code;
  return `${name} ${y}`;
}

export function inferSessionStartYear(session?: SchoolSession | null): number {
  if (session?.startDate && /^\d{4}-\d{2}/.test(session.startDate)) {
    const y = parseInt(session.startDate.slice(0, 4), 10);
    if (y >= 2000 && y <= 2100) return y;
  }
  const m = String(session?.name || "").match(/(20\d{2})/);
  if (m?.[1]) return parseInt(m[1], 10);
  const now = new Date();
  return now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function getSessionStartDateDefault(session?: SchoolSession | null): string {
  if (session?.startDate && /^\d{4}-\d{2}-\d{2}/.test(session.startDate)) {
    return session.startDate.slice(0, 10);
  }
  const sy = inferSessionStartYear(session);
  return `${sy}-04-01`;
}

export function getSessionMonthCodes(session?: SchoolSession | null): { code: string; label: string }[] {
  const startStr =
    session?.startDate && /^\d{4}-\d{2}/.test(session.startDate)
      ? session.startDate.slice(0, 7)
      : `${inferSessionStartYear(session)}-04`;
  const endStr =
    session?.endDate && /^\d{4}-\d{2}/.test(session.endDate)
      ? session.endDate.slice(0, 7)
      : `${inferSessionStartYear(session) + 1}-03`;

  const [sy, sm] = startStr.split("-").map(Number);
  const [ey, em] = endStr.split("-").map(Number);
  if (!sy || !sm || !ey || !em) return [];

  const result: { code: string; label: string }[] = [];
  let y = sy;
  let m = sm;
  for (let i = 0; i < 18; i++) {
    const code = `${y}-${String(m).padStart(2, "0")}`;
    result.push({ code, label: formatMonthCodeLabel(code) });
    if (y > ey || (y === ey && m >= em)) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return result;
}

export function resolveTargetClassRates(
  targetClass?: SchoolClass | null,
  section?: string,
  fallbackStudent?: SchoolStudent | null
): { monthlyTuition: number; busFee: number; defaultReAdmissionFee: number } {
  const struct = targetClass?.feeStructure;
  const monthlyTuition = getMonthlyFeeFromStructure(
    struct,
    Number(targetClass?.defaultFee ?? fallbackStudent?.monthlyFee ?? 1500),
    section || fallbackStudent?.section
  );
  const busFee = Number(
    fallbackStudent?.usesBus && Number(fallbackStudent?.busFee || 0) > 0
      ? fallbackStudent.busFee
      : struct?.busFee ?? fallbackStudent?.busFee ?? 0
  );
  const defaultReAdmissionFee = Number(struct?.annualCharges ?? 0);
  return {
    monthlyTuition: Math.max(0, monthlyTuition),
    busFee: Math.max(0, busFee),
    defaultReAdmissionFee: Math.max(0, defaultReAdmissionFee),
  };
}

export function computeCompleteBackLedger(
  student: SchoolStudent,
  feesForStudent: MonthlyFee[],
  sourceSession?: SchoolSession | null,
  sourceClasses?: SchoolClass[]
): BackLedgerSummary {
  const sessionFees = (feesForStudent || []).filter(
    (f) =>
      f &&
      f.studentId === student.id &&
      !isDemoRecord(f) &&
      (!f.sessionId || !sourceSession?.id || f.sessionId === sourceSession.id)
  );

  const byMonth = new Map<string, MonthlyFee>();
  const extraNonMonthFees: MonthlyFee[] = [];
  sessionFees.forEach((f) => {
    if (f.month && /^\d{4}-\d{2}$/.test(f.month) && f.feeType !== "admission" && f.receiptCategory !== "admission") {
      const prev = byMonth.get(f.month);
      if (
        !prev ||
        Number(f.paidAmount || 0) > Number(prev.paidAmount || 0) ||
        (Boolean(f.paid) && !prev.paid)
      ) {
        byMonth.set(f.month, f);
      }
    } else {
      extraNonMonthFees.push(f);
    }
  });

  // Determine student's monthly billing expectation in source session
  const srcClass = (sourceClasses || []).find((c) => c.id === student.classId);
  const baseTuition = Math.max(
    0,
    Number(
      student.monthlyFee && student.monthlyFee > 0
        ? student.monthlyFee
        : getMonthlyFeeFromStructure(srcClass?.feeStructure, srcClass?.defaultFee ?? 0, student.section)
    )
  );
  const pctDisc =
    Number(student.siblingDiscountPct || 0) > 0
      ? Math.round((baseTuition * Number(student.siblingDiscountPct)) / 100)
      : 0;
  const permanentConcession = student.isFreeEducation
    ? baseTuition
    : Math.max(Number(student.siblingDiscountAmount || 0), pctDisc);
  const expectedMonthlyNet =
    Math.max(0, baseTuition - permanentConcession) +
    (student.usesBus ? Math.max(0, Number(student.busFee ?? srcClass?.feeStructure?.busFee ?? 0)) : 0);

  const sessionMonths = getSessionMonthCodes(sourceSession);
  const sessionStartCode = sessionMonths[0]?.code || `${inferSessionStartYear(sourceSession)}-04`;
  const sessionEndCode =
    sessionMonths[sessionMonths.length - 1]?.code || `${inferSessionStartYear(sourceSession) + 1}-03`;

  const rawJoin =
    student.joinDate && /^\d{4}-\d{2}/.test(student.joinDate)
      ? student.joinDate.slice(0, 7)
      : sessionStartCode;
  const studentStartMonth = rawJoin > sessionStartCode && rawJoin <= sessionEndCode ? rawJoin : sessionStartCode;

  const activeCalMonth = currentMonthStr();
  const cutoffMonth = sessionEndCode < activeCalMonth ? sessionEndCode : activeCalMonth;

  const unpaidItems: BackLedgerSummary["unpaidItems"] = [];
  const monthTimeline: BackMonthAuditItem[] = [];
  let totalBilled = 0;
  let totalPaid = 0;
  let savedUnpaidDue = 0;
  let ungeneratedMonthsDue = 0;
  let paidReceiptsCount = 0;

  // Iterate through every month of the source session up to cutoffMonth
  for (const m of sessionMonths) {
    const saved = byMonth.get(m.code);

    if (m.code < studentStartMonth && !saved) {
      monthTimeline.push({
        monthCode: m.code,
        label: m.label,
        expectedAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
        status: "exempt",
      });
      continue;
    }

    if (saved) {
      const amt = Math.max(0, Number(saved.amount ?? saved.monthlyAmount ?? expectedMonthlyNet));
      const paidAmt = Math.max(0, Number(saved.paidAmount ?? (saved.paid ? amt : 0)));
      const balance =
        saved.balanceDue !== undefined
          ? Math.max(0, Number(saved.balanceDue))
          : saved.paid
          ? 0
          : Math.max(0, amt - paidAmt);

      totalBilled += amt;
      totalPaid += paidAmt;
      if (paidAmt > 0) paidReceiptsCount++;

      const status: BackMonthAuditItem["status"] =
        balance === 0 ? "paid" : paidAmt > 0 ? "partial" : "unpaid_saved";

      monthTimeline.push({
        monthCode: m.code,
        label: m.label,
        expectedAmount: amt,
        paidAmount: paidAmt,
        dueAmount: balance,
        status,
        receiptNo: saved.receiptNo,
      });

      if (balance > 0) {
        savedUnpaidDue += balance;
        unpaidItems.push({
          label: `${m.label} बकाया`,
          amount: balance,
          sourceType: "saved",
        });
      }
    } else if (m.code <= cutoffMonth) {
      // Elapsed month with NO saved fee record
      if (expectedMonthlyNet > 0 && !student.isFreeEducation) {
        totalBilled += expectedMonthlyNet;
        ungeneratedMonthsDue += expectedMonthlyNet;
        monthTimeline.push({
          monthCode: m.code,
          label: m.label,
          expectedAmount: expectedMonthlyNet,
          paidAmount: 0,
          dueAmount: expectedMonthlyNet,
          status: "ungenerated_unpaid",
        });
        unpaidItems.push({
          label: `${m.label} (असंकलित माह)`,
          amount: expectedMonthlyNet,
          sourceType: "ungenerated",
        });
      } else {
        monthTimeline.push({
          monthCode: m.code,
          label: m.label,
          expectedAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
          status: "exempt",
        });
      }
    }
  }

  // Include any saved extra / admission / custom fees
  extraNonMonthFees.forEach((f) => {
    const amt = Math.max(0, Number(f.amount ?? f.monthlyAmount ?? 0));
    const paidAmt = Math.max(0, Number(f.paidAmount ?? (f.paid ? amt : 0)));
    const bal =
      f.balanceDue !== undefined
        ? Math.max(0, Number(f.balanceDue))
        : f.paid
        ? 0
        : Math.max(0, amt - paidAmt);
    totalBilled += amt;
    totalPaid += paidAmt;
    if (paidAmt > 0) paidReceiptsCount++;
    // Admission due balance is handled separately via student.admissionDueBalance to avoid double count
    const isAdmRec = f.feeType === "admission" || f.receiptCategory === "admission";
    if (!isAdmRec && bal > 0) {
      savedUnpaidDue += bal;
      unpaidItems.push({
        label: f.month ? `${f.month} बकाया` : "अतिरिक्त शुल्क बकाया",
        amount: bal,
        sourceType: "saved",
      });
    }
  });

  const admissionDue = Math.max(0, Number(student.admissionDueBalance || 0));
  if (admissionDue > 0) {
    unpaidItems.push({
      label: "पिछला एडमिशन बकाया",
      amount: admissionDue,
      sourceType: "admission",
    });
  }

  const prevCarriedDue = Math.max(0, Number(student.previousSessionDue || 0));
  if (prevCarriedDue > 0) {
    unpaidItems.push({
      label: "पूर्व सत्र का शेष बकाया",
      amount: prevCarriedDue,
      sourceType: "carryover",
    });
  }

  const monthlyUnpaidDue = savedUnpaidDue + ungeneratedMonthsDue;
  const totalBackDue = monthlyUnpaidDue + admissionDue + prevCarriedDue;

  return {
    totalBilled,
    totalPaid,
    savedUnpaidDue,
    ungeneratedMonthsDue,
    monthlyUnpaidDue,
    admissionDue,
    prevCarriedDue,
    totalBackDue,
    unpaidItems,
    monthTimeline,
    paidReceiptsCount,
  };
}

export function suggestNextAvailableRollNo(
  targetStudents: SchoolStudent[],
  targetClassId: string,
  section?: string
): string {
  const normSec = (section || "").trim().toLowerCase();
  const peers = (targetStudents || []).filter((s) => {
    if (!s || s.active === false || s.classId !== targetClassId) return false;
    if (!normSec) return true;
    const sSec = (s.section || "").trim().toLowerCase();
    return !sSec || sSec === normSec;
  });

  let maxNum = 0;
  for (const p of peers) {
    const n = parseInt(String(p.rollNo || "").replace(/\D/g, ""), 10);
    if (!isNaN(n) && n > maxNum) maxNum = n;
  }
  return String(maxNum + 1);
}

export function isRollCollision(
  rollNo: string,
  targetStudents: SchoolStudent[],
  targetClassId: string,
  section?: string,
  excludeStudentId?: string
): SchoolStudent | undefined {
  const cleanRoll = (rollNo || "").trim().toLowerCase();
  if (!cleanRoll || !targetClassId) return undefined;
  const normSec = (section || "").trim().toLowerCase();
  return (targetStudents || []).find((s) => {
    if (!s || s.active === false || s.classId !== targetClassId) return false;
    if (excludeStudentId && s.id === excludeStudentId) return false;
    if (normSec) {
      const sSec = (s.section || "").trim().toLowerCase();
      if (sSec && sSec !== normSec) return false;
    }
    return String(s.rollNo || "").trim().toLowerCase() === cleanRoll;
  });
}
