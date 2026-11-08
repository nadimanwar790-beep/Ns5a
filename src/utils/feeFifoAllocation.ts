// FIFO (First-In, First-Out) Chronological Fee Ledger & Allocation Engine
// Solves: When a student has multi-month overdue fees (e.g. 10 months @ ₹1,800 = ₹18,000)
// and user pays a partial amount (e.g. ₹10,000):
// 1. Dues are paid sequentially starting from the 1st unpaid month.
// 2. Month 1..5 are marked FULL PAID (₹1,800 x 5 = ₹9,000).
// 3. Month 6 (e.g. Sep) gets remaining ₹1,000 paid (₹800 balance due remaining).
// 4. Months 7..10 remain UNPAID (₹1,800 x 4 = ₹7,200).
// 5. Total outstanding balance due (₹800 + ₹7,200 = ₹8,000) carries forward automatically
//    to next billing and next print statement.

export interface MonthDueItem {
  month: string; // "YYYY-MM"
  label?: string; // "Apr 2026"
  monthlyAmount?: number;
  totalDue: number; // current balance due for this month
  alreadyPaid?: number; // amount already paid in prior payments
  totalBill?: number; // total bill (monthly + bus + adm etc.)
  includeAdmissionFee?: boolean;
  includeCautionMoney?: boolean;
  includeAnnualCharges?: boolean;
  includeBusFee?: boolean;
  busFeeAmount?: number;
  concession?: number;
  feeRecordId?: string;
}

export interface FifoMonthAllocation {
  month: string;
  label: string;
  monthIndex: number; // 1st Month, 2nd Month, etc.
  originalDue: number;
  alreadyPaidBefore: number;
  effectiveDueBefore: number;
  allocatedThisTime: number;
  totalPaidAfter: number;
  balanceDueAfter: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  statusHindi: string;
  badgeClass: string;
  note: string;
}

export interface FifoPaymentResult {
  allocations: FifoMonthAllocation[];
  totalDueBefore: number;
  totalPaymentReceived: number;
  totalAllocated: number;
  unallocatedSurplus: number;
  fullyPaidMonths: FifoMonthAllocation[];
  partialMonth: FifoMonthAllocation | null;
  unpaidMonths: FifoMonthAllocation[];
  totalOutstandingDueAfter: number;
  nextBillingTotalWithUpcoming: number;
  summaryHindi: string;
  summaryEnglish: string;
  receiptItems: {
    id: string;
    slNo: number;
    description: string;
    due: number;
    con: number;
    paid: number;
  }[];
}

export function formatMonthLabel(monthStr: string): string {
  try {
    const [y, m] = monthStr.split("-").map(Number);
    const d = new Date(y, (m || 1) - 1, 1);
    if (isNaN(d.getTime())) return monthStr;
    return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  } catch {
    return monthStr;
  }
}

/**
 * Calculates First-In, First-Out (FIFO) chronological allocation of a payment amount
 * across an ordered list of unpaid / partial months.
 */
export function calculateFifoAllocation(params: {
  unpaidMonths: MonthDueItem[];
  paymentAmount: number;
  upcomingMonthRate?: number;
}): FifoPaymentResult {
  const { unpaidMonths, paymentAmount, upcomingMonthRate = 0 } = params;

  // Ensure chronological ascending order (e.g. 2026-04, 2026-05, ...)
  const sortedMonths = [...unpaidMonths].sort((a, b) => a.month.localeCompare(b.month));

  let remainingMoney = Math.max(0, Number(paymentAmount) || 0);
  const totalPaymentReceived = remainingMoney;

  let totalDueBefore = 0;
  const allocations: FifoMonthAllocation[] = [];

  sortedMonths.forEach((item, index) => {
    const label = item.label || formatMonthLabel(item.month);
    const alreadyPaidBefore = Math.max(0, Number(item.alreadyPaid) || 0);
    const originalDue = Math.max(0, Number(item.totalBill ?? (item.totalDue + alreadyPaidBefore)));
    const effectiveDueBefore = Math.max(0, Number(item.totalDue));

    totalDueBefore += effectiveDueBefore;

    let allocatedThisTime = 0;
    let balanceDueAfter = effectiveDueBefore;
    let status: "PAID" | "PARTIAL" | "UNPAID" = "UNPAID";

    if (remainingMoney > 0) {
      if (remainingMoney >= effectiveDueBefore) {
        // Can fully clear this month!
        allocatedThisTime = effectiveDueBefore;
        remainingMoney -= effectiveDueBefore;
        balanceDueAfter = 0;
        status = "PAID";
      } else {
        // Partial settlement: money runs out here
        allocatedThisTime = remainingMoney;
        balanceDueAfter = effectiveDueBefore - remainingMoney;
        remainingMoney = 0;
        status = "PARTIAL";
      }
    } else {
      allocatedThisTime = 0;
      balanceDueAfter = effectiveDueBefore;
      status = "UNPAID";
    }

    const totalPaidAfter = alreadyPaidBefore + allocatedThisTime;

    let statusHindi = "";
    let badgeClass = "";
    let note = "";

    if (status === "PAID") {
      statusHindi = "✓ पूरा जमा (100% Paid)";
      badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
      note = `Full Paid: ₹${totalPaidAfter.toLocaleString("en-IN")}`;
    } else if (status === "PARTIAL") {
      statusHindi = `⚠️ आंशिक जमा (Paid: ₹${allocatedThisTime.toLocaleString("en-IN")} | बकाया: ₹${balanceDueAfter.toLocaleString("en-IN")})`;
      badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      note = `Partial: ₹${allocatedThisTime.toLocaleString("en-IN")} paid of ₹${effectiveDueBefore.toLocaleString("en-IN")} due. Remaining balance ₹${balanceDueAfter.toLocaleString("en-IN")}`;
    } else {
      statusHindi = `✗ पूरा बकाया (Due: ₹${balanceDueAfter.toLocaleString("en-IN")})`;
      badgeClass = "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300";
      note = `Unpaid: ₹${balanceDueAfter.toLocaleString("en-IN")} pending`;
    }

    allocations.push({
      month: item.month,
      label,
      monthIndex: index + 1,
      originalDue,
      alreadyPaidBefore,
      effectiveDueBefore,
      allocatedThisTime,
      totalPaidAfter,
      balanceDueAfter,
      status,
      statusHindi,
      badgeClass,
      note,
    });
  });

  const totalAllocated = totalPaymentReceived - remainingMoney;
  const unallocatedSurplus = remainingMoney;

  const fullyPaidMonths = allocations.filter(a => a.status === "PAID");
  const partialMonth = allocations.find(a => a.status === "PARTIAL") || null;
  const unpaidMonthsList = allocations.filter(a => a.status === "UNPAID");

  const totalOutstandingDueAfter = allocations.reduce((sum, a) => sum + a.balanceDueAfter, 0);
  const nextBillingTotalWithUpcoming = totalOutstandingDueAfter + (upcomingMonthRate || 0);

  // Build human friendly descriptions
  let summaryHindi = "";
  let summaryEnglish = "";

  if (fullyPaidMonths.length > 0) {
    const clearedNames = fullyPaidMonths.map(m => m.label).join(", ");
    summaryHindi += `${fullyPaidMonths.length} महीने पूरे जमा हुए (${clearedNames})`;
    summaryEnglish += `${fullyPaidMonths.length} months fully cleared (${clearedNames})`;
  }

  if (partialMonth) {
    const partTxtHi = ` • ${partialMonth.label} में ₹${partialMonth.allocatedThisTime.toLocaleString("en-IN")} जमा हुआ (बाकी: ₹${partialMonth.balanceDueAfter.toLocaleString("en-IN")})`;
    const partTxtEn = ` • ${partialMonth.label}: ₹${partialMonth.allocatedThisTime.toLocaleString("en-IN")} paid (Due remaining: ₹${partialMonth.balanceDueAfter.toLocaleString("en-IN")})`;
    summaryHindi += partTxtHi;
    summaryEnglish += partTxtEn;
  }

  if (unpaidMonthsList.length > 0) {
    const unpNames = unpaidMonthsList.map(m => m.label).join(", ");
    const unpDueTotal = unpaidMonthsList.reduce((s, m) => s + m.balanceDueAfter, 0);
    const unpTxtHi = ` • ${unpaidMonthsList.length} महीने अभी बाकी हैं (${unpNames}: ₹${unpDueTotal.toLocaleString("en-IN")})`;
    const unpTxtEn = ` • ${unpaidMonthsList.length} months pending (${unpNames}: ₹${unpDueTotal.toLocaleString("en-IN")})`;
    summaryHindi += unpTxtHi;
    summaryEnglish += unpTxtEn;
  }

  summaryHindi += ` • अगला कुल बकाया: ₹${totalOutstandingDueAfter.toLocaleString("en-IN")}`;
  summaryEnglish += ` • Total Next Balance Due: ₹${totalOutstandingDueAfter.toLocaleString("en-IN")}`;

  // Build formal DPS ledger items
  let sl = 1;
  const receiptItems: {
    id: string;
    slNo: number;
    description: string;
    due: number;
    con: number;
    paid: number;
  }[] = [];

  if (fullyPaidMonths.length > 0) {
    const clearedSum = fullyPaidMonths.reduce((s, m) => s + m.effectiveDueBefore, 0);
    const monthsRange = fullyPaidMonths.length > 2
      ? `${fullyPaidMonths[0].label} to ${fullyPaidMonths[fullyPaidMonths.length - 1].label}`
      : fullyPaidMonths.map(m => m.label).join(", ");

    receiptItems.push({
      id: `fifo_cleared`,
      slNo: sl++,
      description: `Cleared Arrears (${fullyPaidMonths.length} Mos: ${monthsRange})`,
      due: clearedSum,
      con: 0,
      paid: clearedSum,
    });
  }

  if (partialMonth) {
    receiptItems.push({
      id: `fifo_partial_${partialMonth.month}`,
      slNo: sl++,
      description: `${partialMonth.label} Fee (Partial Paid: ₹${partialMonth.allocatedThisTime.toLocaleString("en-IN")} | Bal Due: ₹${partialMonth.balanceDueAfter.toLocaleString("en-IN")})`,
      due: partialMonth.effectiveDueBefore,
      con: 0,
      paid: partialMonth.allocatedThisTime,
    });
  }

  if (unpaidMonthsList.length > 0) {
    const unpaidSum = unpaidMonthsList.reduce((s, m) => s + m.balanceDueAfter, 0);
    const unpRange = unpaidMonthsList.length > 2
      ? `${unpaidMonthsList[0].label} to ${unpaidMonthsList[unpaidMonthsList.length - 1].label}`
      : unpaidMonthsList.map(m => m.label).join(", ");

    receiptItems.push({
      id: `fifo_pending_arrears`,
      slNo: sl++,
      description: `Remaining Unpaid Arrears (${unpaidMonthsList.length} Mos: ${unpRange})`,
      due: unpaidSum,
      con: 0,
      paid: 0,
    });
  }

  return {
    allocations,
    totalDueBefore,
    totalPaymentReceived,
    totalAllocated,
    unallocatedSurplus,
    fullyPaidMonths,
    partialMonth,
    unpaidMonths: unpaidMonthsList,
    totalOutstandingDueAfter,
    nextBillingTotalWithUpcoming,
    summaryHindi,
    summaryEnglish,
    receiptItems,
  };
}
