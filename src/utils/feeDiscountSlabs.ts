import type { FeeDiscountSlab, School } from "../school-types";
import { updateSchool } from "../school-firebase";

export const DEFAULT_FEE_DISCOUNT_SLABS: FeeDiscountSlab[] = [
  {
    id: "slab_default_10",
    uptoDay: 10,
    discountType: "percent",
    discountValue: 5,
  },
];

const getStorageKey = (schoolId?: string) =>
  `nst_fee_discount_slabs_${schoolId || "default"}`;

export function normalizeFeeDiscountSlabs(slabs?: FeeDiscountSlab[] | null): FeeDiscountSlab[] {
  if (!Array.isArray(slabs)) return [];
  const cleaned = slabs
    .filter((s) => s && Number(s.uptoDay) >= 1 && Number(s.uptoDay) <= 31 && Number(s.discountValue) > 0)
    .map((s, idx) => ({
      id: s.id || `slab_${idx}_${s.uptoDay}`,
      uptoDay: Math.max(1, Math.min(31, Math.round(Number(s.uptoDay)))),
      discountType: (s.discountType === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
      discountValue:
        s.discountType === "fixed"
          ? Math.max(0, Math.round(Number(s.discountValue)))
          : Math.max(0, Math.min(100, Number(s.discountValue))),
    }))
    .sort((a, b) => a.uptoDay - b.uptoDay);

  // Deduplicate same uptoDay (keep highest discount for that day)
  const byDay = new Map<number, FeeDiscountSlab>();
  for (const s of cleaned) {
    const existing = byDay.get(s.uptoDay);
    if (!existing || s.discountValue > existing.discountValue) {
      byDay.set(s.uptoDay, s);
    }
  }
  return Array.from(byDay.values()).sort((a, b) => a.uptoDay - b.uptoDay);
}

export function getSchoolFeeDiscountSlabs(schoolId?: string, schoolObj?: School | null): FeeDiscountSlab[] {
  if (typeof window !== "undefined" && schoolId) {
    try {
      const raw = localStorage.getItem(getStorageKey(schoolId));
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return normalizeFeeDiscountSlabs(parsed);
        }
      }
    } catch {}
  }

  if (Array.isArray(schoolObj?.feeDiscountSlabs)) {
    return normalizeFeeDiscountSlabs(schoolObj.feeDiscountSlabs);
  }

  return DEFAULT_FEE_DISCOUNT_SLABS;
}

export async function saveSchoolFeeDiscountSlabs(
  schoolId: string,
  slabs: FeeDiscountSlab[]
): Promise<FeeDiscountSlab[]> {
  const normalized = normalizeFeeDiscountSlabs(slabs);
  if (typeof window !== "undefined" && schoolId) {
    try {
      localStorage.setItem(getStorageKey(schoolId), JSON.stringify(normalized));
      window.dispatchEvent(
        new CustomEvent("fee-discount-slabs-updated", {
          detail: { schoolId, slabs: normalized },
        })
      );
    } catch {}
  }

  if (schoolId && schoolId !== "default") {
    try {
      await updateSchool(schoolId, { feeDiscountSlabs: normalized });
    } catch (e) {
      console.warn("[feeDiscountSlabs] Cloud save notice:", e);
    }
  }

  return normalized;
}

export function computeSlabDiscountAmount(slab: FeeDiscountSlab, currentMonthFee: number): number {
  const base = Math.max(0, Number(currentMonthFee) || 0);
  if (base <= 0 || !slab || slab.discountValue <= 0) return 0;
  if (slab.discountType === "fixed") {
    return Math.min(base, Math.round(slab.discountValue));
  }
  return Math.min(base, Math.round((base * slab.discountValue) / 100));
}

export function resolveSlabForDay(
  slabs: FeeDiscountSlab[],
  dayOfMonth: number,
  currentMonthFee: number
): {
  matchedSlab: FeeDiscountSlab | null;
  discountAmount: number;
  label: string;
} {
  const sorted = normalizeFeeDiscountSlabs(slabs);
  const day = Math.max(1, Math.min(31, Number(dayOfMonth) || new Date().getDate()));
  const matched = sorted.find((s) => day <= s.uptoDay) || null;
  if (!matched) {
    return { matchedSlab: null, discountAmount: 0, label: "" };
  }
  const discountAmount = computeSlabDiscountAmount(matched, currentMonthFee);
  const valueText =
    matched.discountType === "fixed"
      ? `₹${matched.discountValue} OFF`
      : `${matched.discountValue}% OFF`;
  return {
    matchedSlab: matched,
    discountAmount,
    label: `${matched.uptoDay} तारीख तक ${valueText}`,
  };
}

export function formatSlabShort(slab: FeeDiscountSlab): string {
  const val = slab.discountType === "fixed" ? `₹${slab.discountValue}` : `${slab.discountValue}%`;
  return `${slab.uptoDay} तारीख तक ${val} OFF`;
}

export function formatSlabsHeadline(slabs: FeeDiscountSlab[]): string {
  const sorted = normalizeFeeDiscountSlabs(slabs);
  if (sorted.length === 0) return "";
  return sorted.map(formatSlabShort).join(" • ");
}
