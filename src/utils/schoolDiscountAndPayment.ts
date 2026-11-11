import type { MonthlyFee, SchoolStudent } from "../school-types";

export const DISPLAY_DISCOUNT_LABEL = "5% Off";
export const MAX_SILENT_DISCOUNT_PCT = 10;

export interface DiscountLedgerEntry {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  className: string;
  section?: string;
  rollNo?: string;
  category: "admission" | "multi_admission" | "monthly_fee" | "sibling";
  whereLabel: string;
  grossAmount: number;
  discountAmount: number;
  discountPct: number;
  givenByName: string;
  givenByRole: string;
  createdAt: string;
  note?: string;
}

/**
 * Only School Admin, Principal, SuperAdmin, or Accountant can grant discounts.
 * Teachers NEVER have discount permission — any shortfall by a Teacher counts as Due.
 */
export function canRoleGiveDiscount(role?: string | null): boolean {
  const r = String(role || "").trim().toUpperCase();
  return (
    r === "ADMIN" ||
    r === "SCHOOL_ADMIN" ||
    r === "SCHOOLADMIN" ||
    r === "SUPERADMIN" ||
    r === "SUPER_ADMIN" ||
    r === "PRINCIPAL" ||
    r === "ACCOUNTANT"
  );
}

/**
 * Computes max allowed discount in ₹ (silently capped at 10% of grossAmount).
 * UI displays 5% label while allowing up to 10% internally without exposing 10%.
 */
export function getSilentMaxDiscountAmount(grossAmount: number): number {
  const gross = Math.max(0, Number(grossAmount) || 0);
  return Math.round((gross * MAX_SILENT_DISCOUNT_PCT) / 100);
}

export function clampDiscountAmount(grossAmount: number, requestedDiscount: number): number {
  const req = Math.max(0, Number(requestedDiscount) || 0);
  const cap = getSilentMaxDiscountAmount(grossAmount);
  return Math.min(req, cap);
}

export function clampDiscountPct(requestedPct: number): number {
  const pct = Math.max(0, Number(requestedPct) || 0);
  return Math.min(pct, MAX_SILENT_DISCOUNT_PCT);
}

export function buildSplitPayModeInfo(params: {
  onlineAmount: number;
  offlineAmount: number;
  date?: string;
  bank?: string;
  number?: string;
  fallbackMode?: string;
}) {
  const onlineAmt = Math.max(0, Number(params.onlineAmount) || 0);
  const offlineAmt = Math.max(0, Number(params.offlineAmount) || 0);
  const date = params.date || new Date().toISOString().split("T")[0];

  let payMode = params.fallbackMode || "Cash";
  if (onlineAmt > 0 && offlineAmt > 0) {
    payMode = "Online + Offline";
  } else if (onlineAmt > 0) {
    payMode = "Online / UPI";
  } else if (offlineAmt > 0) {
    payMode = "Cash (Offline)";
  }

  return {
    payMode,
    date,
    bank: params.bank || (onlineAmt > 0 ? "Online / UPI" : "School Counter"),
    number: params.number || "",
    onlineAmount: onlineAmt,
    offlineAmount: offlineAmt,
  };
}

const getDiscountStorageKey = (schoolId: string) => `nst_discount_ledger_${schoolId}`;

export function getStoredDiscountLedger(schoolId: string): DiscountLedgerEntry[] {
  if (!schoolId) return [];
  try {
    const raw = localStorage.getItem(getDiscountStorageKey(schoolId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDiscountEntry(
  schoolId: string,
  entry: Omit<DiscountLedgerEntry, "id" | "createdAt" | "schoolId"> & { id?: string; createdAt?: string }
): DiscountLedgerEntry | null {
  if (!schoolId || Number(entry.discountAmount) <= 0) return null;
  const fullEntry: DiscountLedgerEntry = {
    id: entry.id || `disc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    schoolId,
    studentId: entry.studentId,
    studentName: entry.studentName,
    className: entry.className || "",
    section: entry.section || "",
    rollNo: entry.rollNo || "",
    category: entry.category,
    whereLabel: entry.whereLabel,
    grossAmount: Math.max(0, Number(entry.grossAmount) || 0),
    discountAmount: Math.max(0, Number(entry.discountAmount) || 0),
    discountPct:
      entry.discountPct > 0
        ? entry.discountPct
        : entry.grossAmount > 0
        ? Math.round((entry.discountAmount / entry.grossAmount) * 1000) / 10
        : 5,
    givenByName: entry.givenByName || "Admin",
    givenByRole: entry.givenByRole || "SCHOOL_ADMIN",
    createdAt: entry.createdAt || new Date().toISOString(),
    note: entry.note,
  };

  try {
    const existing = getStoredDiscountLedger(schoolId);
    const updated = [fullEntry, ...existing.filter((e) => e.id !== fullEntry.id)].slice(0, 500);
    localStorage.setItem(getDiscountStorageKey(schoolId), JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("nst_discount_ledger_updated", { detail: { schoolId } }));
  } catch {}
  return fullEntry;
}

/**
 * Merges explicit discount ledger entries with historical fee/student concessions
 * so the Discount List is always complete and accurate.
 */
export function getCombinedDiscountLedger(
  schoolId: string,
  students: SchoolStudent[] = [],
  fees: MonthlyFee[] = []
): DiscountLedgerEntry[] {
  const stored = getStoredDiscountLedger(schoolId);
  const seenKeys = new Set<string>(
    stored.map((s) => `${s.studentId}_${s.whereLabel}_${s.discountAmount}`)
  );

  const combined: DiscountLedgerEntry[] = [...stored];
  const studentMap = new Map<string, SchoolStudent>();
  for (const st of students) {
    if (st?.id) studentMap.set(st.id, st);
  }

  for (const f of fees) {
    const disc = Math.max(0, Number(f.concession || 0) + Number(f.earlyDiscount || 0));
    if (disc <= 0) continue;
    const st = studentMap.get(f.studentId);
    const isAdm = f.feeType === "admission" || f.receiptCategory === "admission";
    const whereLabel = isAdm
      ? "Admission Fee"
      : `Monthly Fee (${f.month || "Current"})`;
    const dedupeKey = `${f.studentId}_${whereLabel}_${disc}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const gross = Math.max(disc, Number(f.amount || 0) + disc);
    combined.push({
      id: `fee_disc_${f.studentId}_${f.receiptNo || f.month || Date.now()}`,
      schoolId,
      studentId: f.studentId,
      studentName: st?.name || f.studentName || "Student",
      className: st?.className || f.className || "",
      section: st?.section || "",
      rollNo: st?.rollNo || f.rollNo || "",
      category: isAdm ? "admission" : "monthly_fee",
      whereLabel,
      grossAmount: gross,
      discountAmount: disc,
      discountPct: gross > 0 ? Math.round((disc / gross) * 1000) / 10 : 5,
      givenByName: "School Admin / Accountant",
      givenByRole: "SCHOOL_ADMIN",
      createdAt: f.paidDate || f.lastPaidDate || new Date().toISOString(),
      note: f.note,
    });
  }

  for (const st of students) {
    const monthlySib = Number(st.siblingDiscountAmount || 0);
    if (monthlySib > 0) {
      const whereLabel = "Sibling Concession (Monthly)";
      const dedupeKey = `${st.id}_${whereLabel}_${monthlySib}`;
      if (!seenKeys.has(dedupeKey)) {
        seenKeys.add(dedupeKey);
        combined.push({
          id: `sib_disc_${st.id}`,
          schoolId,
          studentId: st.id,
          studentName: st.name,
          className: st.className || "",
          section: st.section || "",
          rollNo: st.rollNo || "",
          category: "sibling",
          whereLabel,
          grossAmount: monthlySib * 20,
          discountAmount: monthlySib,
          discountPct: Number(st.siblingDiscountPct || 5),
          givenByName: "School Admin",
          givenByRole: "SCHOOL_ADMIN",
          createdAt: st.createdAt || new Date().toISOString(),
        });
      }
    }
  }

  return combined.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
