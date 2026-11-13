import type { StoreSaleRecord } from "../school-types";

export interface ChannelTotals {
  total: number;
  cash: number;
  onlineQr: number;
  nstaOnline: number;
}

export interface DetailedPaymentBreakdown extends ChannelTotals {
  feeTotal: number;
  storeTotal: number;
  feeCash: number;
  feeOnlineQr: number;
  feeNstaOnline: number;
  storeCash: number;
  storeOnlineQr: number;
  storeNstaOnline: number;
  feeCount: number;
  storeCount: number;
}

/**
 * Checks whether a fee record represents an active collected payment (not cancelled).
 */
export function isFeePaidRecord(f: any): boolean {
  if (!f || f.cancelled === true) return false;
  if (f.paid === true) return true;
  const st = String(f.status || "").toUpperCase();
  if (st === "PAID" || st === "PARTIAL") return true;
  if (Number(f.paidAmount || 0) > 0) return true;
  return false;
}

/**
 * Resolves the collected rupee amount from a fee record safely.
 */
export function getFeeCollectedAmount(f: any): number {
  if (!f || f.cancelled === true) return 0;
  if (f.paidAmount !== undefined && f.paidAmount !== null && Number(f.paidAmount) > 0) {
    return Number(f.paidAmount) || 0;
  }
  if (f.paid === true || String(f.status || "").toUpperCase() === "PAID") {
    return Number(f.totalAmount ?? f.amount ?? 0) || 0;
  }
  return 0;
}

/**
 * Extracts normalized YYYY-MM-DD payment date from a fee record.
 */
export function getFeePaidDateStr(f: any): string {
  const raw = String(f?.paidDate || f?.lastPaidDate || f?.updatedAt || "").trim();
  return raw.slice(0, 10);
}

/**
 * Classifies a single Fee record into the 3 channels:
 * - nstaOnline: Razorpay / NSTA Online gateway payments
 * - onlineQr: School counter UPI / QR / PhonePe / GPay / Bank / Card / Cheque
 * - cash: Cash collected at counter (including cash portion of split payments)
 */
export function classifyFeePayment(f: any): ChannelTotals {
  if (!isFeePaidRecord(f)) {
    return { total: 0, cash: 0, onlineQr: 0, nstaOnline: 0 };
  }

  const total = getFeeCollectedAmount(f);
  if (total <= 0) {
    return { total: 0, cash: 0, onlineQr: 0, nstaOnline: 0 };
  }

  const modeLower = String(f?.paymentMode || f?.payModeInfo?.payMode || "").toLowerCase();
  const paidByLower = String(f?.paidBy || "").toLowerCase();
  const isNstaOnline =
    Boolean(f?.razorpayPaymentId || f?.razorpayOrderId || f?.verifiedViaWebhook) ||
    modeLower.includes("razorpay") ||
    modeLower.includes("nsta_online") ||
    modeLower.includes("nsta online") ||
    paidByLower.includes("razorpay");

  if (isNstaOnline) {
    return { total, cash: 0, onlineQr: 0, nstaOnline: total };
  }

  // Handle explicit split payments (onlineAmount + offlineAmount or onlinePaid + cashPaid)
  const pmi = f?.payModeInfo;
  if (pmi) {
    const splitOnline = Number(pmi.onlineAmount ?? pmi.onlinePaid ?? 0) || 0;
    const splitOffline = Number(pmi.offlineAmount ?? pmi.cashPaid ?? 0) || 0;
    if (splitOnline > 0 && splitOffline > 0) {
      const sumSplit = splitOnline + splitOffline;
      const ratio = sumSplit > 0 ? total / sumSplit : 1;
      const onlineQr = Math.round(splitOnline * ratio);
      const cash = Math.max(0, total - onlineQr);
      return { total, cash, onlineQr, nstaOnline: 0 };
    }
    if (splitOnline > 0 && splitOffline <= 0) {
      return { total, cash: 0, onlineQr: total, nstaOnline: 0 };
    }
    if (splitOffline > 0 && splitOnline <= 0) {
      return { total, cash: total, onlineQr: 0, nstaOnline: 0 };
    }
  }

  const isOnlineQr =
    modeLower.includes("upi") ||
    modeLower.includes("qr") ||
    modeLower.includes("online") ||
    modeLower.includes("phonepe") ||
    modeLower.includes("gpay") ||
    modeLower.includes("paytm") ||
    modeLower.includes("bank") ||
    modeLower.includes("card") ||
    modeLower.includes("neft") ||
    modeLower.includes("rtgs") ||
    modeLower.includes("cheque");

  if (isOnlineQr) {
    return { total, cash: 0, onlineQr: total, nstaOnline: 0 };
  }

  return { total, cash: total, onlineQr: 0, nstaOnline: 0 };
}

/**
 * Classifies a Store Sale record into Cash / Online QR Code / NSTA Online.
 */
export function classifyStoreSale(s: Partial<StoreSaleRecord> | any): ChannelTotals {
  if (!s) return { total: 0, cash: 0, onlineQr: 0, nstaOnline: 0 };
  const total = Number(s.totalAmount || 0) || 0;
  if (total <= 0) return { total: 0, cash: 0, onlineQr: 0, nstaOnline: 0 };

  const modeLower = String(s.paymentMode || "").toLowerCase();
  const soldByLower = String(s.soldBy || "").toLowerCase();
  const isNstaOnline =
    Boolean(s.razorpayPaymentId || s.razorpayOrderId || s.verifiedViaWebhook) ||
    modeLower === "nsta_online" ||
    modeLower.includes("razorpay") ||
    modeLower.includes("nsta online") ||
    soldByLower.includes("razorpay") ||
    soldByLower.includes("nsta online");

  if (isNstaOnline) {
    return { total, cash: 0, onlineQr: 0, nstaOnline: total };
  }

  if (
    modeLower === "online_upi" ||
    modeLower === "card" ||
    modeLower.includes("upi") ||
    modeLower.includes("qr") ||
    modeLower.includes("online") ||
    modeLower.includes("bank")
  ) {
    return { total, cash: 0, onlineQr: total, nstaOnline: 0 };
  }

  return { total, cash: total, onlineQr: 0, nstaOnline: 0 };
}

/**
 * Computes unified 3-channel payment breakdown across Fees and School Store Sales.
 * Pass `datePrefix` as "YYYY-MM-DD" for a single day, "YYYY-MM" for a month, or omit for all-time.
 */
export function computePaymentBreakdown(params: {
  fees?: any[];
  storeSales?: any[];
  datePrefix?: string;
}): DetailedPaymentBreakdown {
  const { fees = [], storeSales = [], datePrefix } = params;

  let feeCash = 0;
  let feeOnlineQr = 0;
  let feeNstaOnline = 0;
  let feeCount = 0;

  for (const f of fees) {
    if (!isFeePaidRecord(f)) continue;
    if (datePrefix) {
      const paidDate = String(f?.paidDate || f?.lastPaidDate || f?.updatedAt || "");
      if (!paidDate.startsWith(datePrefix)) continue;
    }
    const c = classifyFeePayment(f);
    if (c.total > 0) {
      feeCash += c.cash;
      feeOnlineQr += c.onlineQr;
      feeNstaOnline += c.nstaOnline;
      feeCount++;
    }
  }

  let storeCash = 0;
  let storeOnlineQr = 0;
  let storeNstaOnline = 0;
  let storeCount = 0;

  for (const s of storeSales) {
    if (!s) continue;
    if (datePrefix) {
      const saleDate = String(s.date || s.updatedAt || "");
      if (!saleDate.startsWith(datePrefix)) continue;
    }
    const c = classifyStoreSale(s);
    if (c.total > 0) {
      storeCash += c.cash;
      storeOnlineQr += c.onlineQr;
      storeNstaOnline += c.nstaOnline;
      storeCount++;
    }
  }

  const feeTotal = feeCash + feeOnlineQr + feeNstaOnline;
  const storeTotal = storeCash + storeOnlineQr + storeNstaOnline;
  const cash = feeCash + storeCash;
  const onlineQr = feeOnlineQr + storeOnlineQr;
  const nstaOnline = feeNstaOnline + storeNstaOnline;

  return {
    total: cash + onlineQr + nstaOnline,
    cash,
    onlineQr,
    nstaOnline,
    feeTotal,
    storeTotal,
    feeCash,
    feeOnlineQr,
    feeNstaOnline,
    storeCash,
    storeOnlineQr,
    storeNstaOnline,
    feeCount,
    storeCount,
  };
}

/**
 * Formats Store payment mode label consistently in dashboards and receipts.
 */
export function formatStorePaymentModeLabel(sale: any): string {
  const modeLower = String(sale?.paymentMode || "").toLowerCase();
  if (
    sale?.razorpayPaymentId ||
    sale?.razorpayOrderId ||
    modeLower === "nsta_online" ||
    modeLower.includes("razorpay")
  ) {
    return "NSTA Online";
  }
  if (modeLower === "online_upi" || modeLower.includes("upi") || modeLower.includes("qr")) {
    return "Online QR Code";
  }
  if (modeLower === "card") {
    return "Card / Online QR";
  }
  return "Cash";
}
