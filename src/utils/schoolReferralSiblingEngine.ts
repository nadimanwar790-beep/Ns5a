import type {
  MonthlyFee,
  ReferralCommissionDuration,
  ReferralCommissionScope,
  SchoolReferralSettings,
  SchoolStudent,
  SchoolTeacher,
  StaffEmployee,
  TeacherReferralPayout,
} from "../school-types";

export interface ReferrerOption {
  id: string;
  name: string;
  designation: string;
  phone?: string;
  employeeId?: string;
  source: "teacher" | "staff";
}

export interface SiblingDetectionResult {
  exactMatches: SchoolStudent[];
  partialMatches: SchoolStudent[];
  isExactFamily: boolean;
  hasAnyMatch: boolean;
  familyGroupId: string;
  childNumber: number; // e.g. 2 means 2nd child from same family
}

export interface ReferredStudentCommissionRow {
  studentId: string;
  studentName: string;
  admissionNo: string;
  rollNo: string;
  className: string;
  joinDate: string;
  commissionPct: number;
  commissionDuration: ReferralCommissionDuration;
  isSiblingMarked: boolean;
  grossBilledExclBus: number;
  eligiblePaidExclBus: number;
  pendingDueExclBus: number;
  earnedCommission: number;
  pendingCommission: number;
}

export interface TeacherCommissionSummary {
  teacherId: string;
  teacherName: string;
  designation: string;
  phone?: string;
  studentsCount: number;
  totalEligibleFeeCollected: number;
  totalEarnedCommission: number;
  totalPendingCommission: number;
  totalPaidOut: number;
  balancePayable: number;
  students: ReferredStudentCommissionRow[];
  payouts: TeacherReferralPayout[];
}

const HONORIFIC_REGEX = /^(mr\.?|mrs\.?|ms\.?|shri|sri|smt\.?|late|dr\.?|md\.?|mohd\.?|kumari|km\.?)\s+/i;

export const normalizePersonName = (raw?: string | null): string => {
  if (!raw) return "";
  let cleaned = String(raw).trim().toLowerCase();
  // Strip repeated honorifics at start
  while (HONORIFIC_REGEX.test(cleaned)) {
    cleaned = cleaned.replace(HONORIFIC_REGEX, "").trim();
  }
  return cleaned.replace(/[^a-z0-9\u0900-\u097f\s]/gi, "").replace(/\s+/g, " ").trim();
};

export const normalizeWhatsappOrPhone = (raw?: string | null): string => {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1);
  }
  return digits.length >= 10 ? digits.slice(-10) : digits;
};

export const buildFamilyGroupId = (
  fatherName?: string | null,
  motherName?: string | null,
  whatsappOrPhone?: string | null
): string => {
  const f = normalizePersonName(fatherName).replace(/\s+/g, "_").slice(0, 16);
  const m = normalizePersonName(motherName).replace(/\s+/g, "_").slice(0, 16);
  const w = normalizeWhatsappOrPhone(whatsappOrPhone);
  if (!w && !f && !m) return "";
  return `FAM_${w || "NA"}_${f || "NA"}_${m || "NA"}`;
};

/**
 * Detects whether a new/enrolling student belongs to an existing family in the school.
 * Primary Rule (Exact Same Family):
 *   Same Father's Name + Same Mother's Name + Same WhatsApp Number (or primary mobile if WhatsApp not entered separately).
 * Secondary Rule (Possible Sibling Suggestion):
 *   2 out of 3 fields match (e.g. Same WhatsApp + Same Father's Name) so minor spelling differences can still be marked in 1 click.
 */
export const detectFamilySiblings = (
  candidate: {
    fatherName?: string;
    motherName?: string;
    whatsappNo?: string;
    phone?: string;
    excludeStudentId?: string;
  },
  existingStudents: SchoolStudent[]
): SiblingDetectionResult => {
  const candFather = normalizePersonName(candidate.fatherName);
  const candMother = normalizePersonName(candidate.motherName);
  const candWhatsapp = normalizeWhatsappOrPhone(candidate.whatsappNo || candidate.phone);
  const candPhone = normalizeWhatsappOrPhone(candidate.phone);

  const familyGroupId = buildFamilyGroupId(
    candidate.fatherName,
    candidate.motherName,
    candidate.whatsappNo || candidate.phone
  );

  const exactMatches: SchoolStudent[] = [];
  const partialMatches: SchoolStudent[] = [];

  for (const st of existingStudents || []) {
    if (!st || st.active === false) continue;
    if (candidate.excludeStudentId && st.id === candidate.excludeStudentId) continue;

    const stFather = normalizePersonName(st.fatherName);
    const stMother = normalizePersonName(st.motherName);
    const stWhatsapp = normalizeWhatsappOrPhone(st.whatsappNo || st.phone);
    const stPhone = normalizeWhatsappOrPhone(st.phone);

    const fatherMatch = Boolean(candFather && stFather && candFather === stFather);
    const motherMatch = Boolean(candMother && stMother && candMother === stMother);
    const whatsappMatch = Boolean(
      candWhatsapp &&
        candWhatsapp.length >= 10 &&
        ((stWhatsapp && candWhatsapp === stWhatsapp) || (stPhone && candWhatsapp === stPhone))
    );
    const altPhoneMatch = Boolean(
      !whatsappMatch &&
        candPhone &&
        candPhone.length >= 10 &&
        ((stWhatsapp && candPhone === stWhatsapp) || (stPhone && candPhone === stPhone))
    );
    const numberMatch = whatsappMatch || altPhoneMatch;

    if (fatherMatch && motherMatch && numberMatch) {
      exactMatches.push(st);
    } else if (
      (numberMatch && (fatherMatch || motherMatch)) ||
      (fatherMatch && motherMatch && (candFather.length >= 3 && candMother.length >= 3))
    ) {
      partialMatches.push(st);
    }
  }

  const reusedFamilyId =
    exactMatches.find((s) => s.familyGroupId)?.familyGroupId ||
    familyGroupId;

  return {
    exactMatches,
    partialMatches,
    isExactFamily: exactMatches.length > 0,
    hasAnyMatch: exactMatches.length > 0 || partialMatches.length > 0,
    familyGroupId: reusedFamilyId,
    childNumber: exactMatches.length + 1,
  };
};

/**
 * Merges SchoolTeacher and StaffEmployee records into a clean, deduplicated referrer list.
 */
export const mergeSchoolReferrerList = (
  teachers: SchoolTeacher[] = [],
  staffList: StaffEmployee[] = []
): ReferrerOption[] => {
  const map = new Map<string, ReferrerOption>();
  const seenKeys = new Set<string>();

  for (const t of teachers) {
    if (!t || t.active === false || !t.name?.trim()) continue;
    const dedupeKey = `${normalizePersonName(t.name)}__${normalizeWhatsappOrPhone(t.phone)}`;
    seenKeys.add(dedupeKey);
    map.set(t.id, {
      id: t.id,
      name: t.name.trim(),
      designation: t.designation || (t.subjects?.length ? `${t.subjects[0]} Teacher` : "Faculty"),
      phone: t.phone,
      employeeId: t.employeeId,
      source: "teacher",
    });
  }

  for (const s of staffList) {
    if (!s || s.active === false || !s.name?.trim()) continue;
    const dedupeKey = `${normalizePersonName(s.name)}__${normalizeWhatsappOrPhone(s.phone)}`;
    if (map.has(s.id) || (normalizeWhatsappOrPhone(s.phone) && seenKeys.has(dedupeKey))) {
      continue;
    }
    seenKeys.add(dedupeKey);
    map.set(s.id, {
      id: s.id,
      name: s.name.trim(),
      designation: s.designation || s.department || "School Staff",
      phone: s.phone,
      employeeId: (s as any).employeeId,
      source: "staff",
    });
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const isBusFeeLineItem = (description?: string): boolean => {
  if (!description) return false;
  const d = description.toLowerCase();
  return d.includes("bus") || d.includes("transport") || d.includes("van") || d.includes("वाहन") || d.includes("बस");
};

/**
 * Computes eligible (non-bus, post-discount) collected amount and unpaid due from a MonthlyFee record.
 */
export const extractEligibleFeeAmounts = (fee: MonthlyFee): {
  billedExclBus: number;
  paidExclBus: number;
  dueExclBus: number;
} => {
  const explicitBus = Number(fee.busFeeAmount || 0);
  const itemBus = Array.isArray(fee.items)
    ? fee.items.reduce((sum, it) => (isBusFeeLineItem(it.description) ? sum + (Number(it.due) || 0) : sum), 0)
    : 0;
  const busComponent = Math.max(explicitBus, itemBus);

  const netPayableTotal = Math.max(0, Number(fee.amount || 0));
  const rawPaid =
    fee.paidAmount !== undefined
      ? Math.max(0, Number(fee.paidAmount || 0))
      : fee.paid
      ? netPayableTotal
      : 0;

  // Eligible net payable excludes bus/transport fee
  const billedExclBus = Math.max(0, netPayableTotal - busComponent);
  if (netPayableTotal <= 0 || billedExclBus <= 0) {
    return { billedExclBus: 0, paidExclBus: 0, dueExclBus: 0 };
  }

  // Allocate collected money proportionally (or cap at non-bus billed amount) so bus fee never earns commission
  const ratio = billedExclBus / netPayableTotal;
  const paidExclBus = Math.min(billedExclBus, Math.round(rawPaid * ratio));
  const dueExclBus = Math.max(0, billedExclBus - paidExclBus);

  return { billedExclBus, paidExclBus, dueExclBus };
};

export const formatReferralDurationLabel = (duration?: ReferralCommissionDuration): string => {
  if (duration === "2_years") return "2 Years Cap (2 साल)";
  if (duration === "lifetime") return "Lifetime (जब तक पढ़े)";
  return "1st Year Session Cap (1 साल)";
};

const parseYearMonthIndex = (raw?: string | null): number | null => {
  if (!raw) return null;
  const match = String(raw).trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return null;
  return year * 12 + (month - 1);
};

export const isFeeWithinReferralDuration = (
  student: SchoolStudent,
  fee: MonthlyFee,
  duration: ReferralCommissionDuration
): boolean => {
  if (duration === "lifetime") return true;
  if (fee.feeType === "admission" || fee.receiptCategory === "admission") return true;

  const maxMonths = duration === "2_years" ? 24 : 12;
  const maxDays = duration === "2_years" ? 731 : 366;

  const joinRaw = student.joinDate || student.createdAt || "";
  const startYm = parseYearMonthIndex(joinRaw);
  const feeYm = parseYearMonthIndex(fee.month) ?? parseYearMonthIndex(fee.paidDate);

  if (startYm !== null && feeYm !== null) {
    const elapsedMonths = feeYm - startYm;
    return elapsedMonths < maxMonths;
  }

  const startMs = joinRaw ? Date.parse(joinRaw) : NaN;
  const feeMs = fee.paidDate ? Date.parse(fee.paidDate) : NaN;
  if (!isNaN(startMs) && !isNaN(feeMs)) {
    const diffDays = (feeMs - startMs) / (1000 * 60 * 60 * 24);
    return diffDays <= maxDays;
  }

  if (duration === "1_year" && student.sessionId && fee.sessionId && student.sessionId !== fee.sessionId) {
    return false;
  }

  return true;
};

/**
 * Calculates the complete 10% (or custom %) Teacher Referral Ledger across the school.
 * Strictly unlocks commission ONLY on actually paid fees (excluding bus/transport & after sibling discounts)
 * and enforces the School Admin's allowed duration cap (1 Year, 2 Years, or Lifetime).
 */
export const calculateTeacherReferralLedger = (params: {
  students: SchoolStudent[];
  fees: MonthlyFee[];
  payouts: TeacherReferralPayout[];
  referrers: ReferrerOption[];
  settings?: Partial<SchoolReferralSettings>;
}): {
  teachers: TeacherCommissionSummary[];
  totals: {
    referredStudents: number;
    eligibleCollected: number;
    earnedCommission: number;
    pendingCommission: number;
    paidOut: number;
    balancePayable: number;
  };
} => {
  const defaultPct = Number(params.settings?.defaultCommissionPct ?? 10);
  const globalScope: ReferralCommissionScope = params.settings?.commissionScope || "all_fees";
  const adminDuration: ReferralCommissionDuration = params.settings?.commissionDuration || "1_year";

  const referrerLookup = new Map<string, ReferrerOption>();
  for (const r of params.referrers || []) {
    referrerLookup.set(r.id, r);
  }

  const feesByStudent = new Map<string, MonthlyFee[]>();
  for (const f of params.fees || []) {
    if (!f?.studentId) continue;
    const arr = feesByStudent.get(f.studentId) || [];
    arr.push(f);
    feesByStudent.set(f.studentId, arr);
  }

  const summaryMap = new Map<string, TeacherCommissionSummary>();

  const ensureTeacherBucket = (teacherId: string, fallbackName?: string): TeacherCommissionSummary => {
    const existing = summaryMap.get(teacherId);
    if (existing) return existing;
    const refMeta = referrerLookup.get(teacherId);
    const created: TeacherCommissionSummary = {
      teacherId,
      teacherName: refMeta?.name || fallbackName || "School Teacher",
      designation: refMeta?.designation || "Faculty",
      phone: refMeta?.phone,
      studentsCount: 0,
      totalEligibleFeeCollected: 0,
      totalEarnedCommission: 0,
      totalPendingCommission: 0,
      totalPaidOut: 0,
      balancePayable: 0,
      students: [],
      payouts: [],
    };
    summaryMap.set(teacherId, created);
    return created;
  };

  for (const st of params.students || []) {
    if (!st || st.active === false || !st.referredByTeacherId) continue;

    const bucket = ensureTeacherBucket(st.referredByTeacherId, st.referredByTeacherName);
    const pct = Number(st.referralCommissionPct ?? defaultPct);
    const scope = st.referralCommissionScope || globalScope;
    // School Admin's configured duration governs what is allowed across the school
    const effectiveDuration: ReferralCommissionDuration =
      params.settings?.commissionDuration || st.referralCommissionDuration || adminDuration;

    const studentFees = feesByStudent.get(st.id) || [];
    const relevantFees = studentFees.filter((f) => {
      if (scope === "admission_only") {
        return f.feeType === "admission" || f.receiptCategory === "admission";
      }
      return isFeeWithinReferralDuration(st, f, effectiveDuration);
    });

    let grossBilledExclBus = 0;
    let eligiblePaidExclBus = 0;
    let pendingDueExclBus = 0;

    for (const f of relevantFees) {
      const extracted = extractEligibleFeeAmounts(f);
      grossBilledExclBus += extracted.billedExclBus;
      eligiblePaidExclBus += extracted.paidExclBus;
      pendingDueExclBus += extracted.dueExclBus;
    }

    const earnedCommission = Math.round((eligiblePaidExclBus * pct) / 100);
    const pendingCommission = Math.round((pendingDueExclBus * pct) / 100);

    bucket.studentsCount += 1;
    bucket.totalEligibleFeeCollected += eligiblePaidExclBus;
    bucket.totalEarnedCommission += earnedCommission;
    bucket.totalPendingCommission += pendingCommission;
    bucket.students.push({
      studentId: st.id,
      studentName: st.name,
      admissionNo: st.admissionNo || "-",
      rollNo: st.rollNo || "-",
      className: st.className || "Class",
      joinDate: st.joinDate || st.createdAt?.slice(0, 10) || "",
      commissionPct: pct,
      commissionDuration: effectiveDuration,
      isSiblingMarked: Boolean(st.isSiblingMarked),
      grossBilledExclBus,
      eligiblePaidExclBus,
      pendingDueExclBus,
      earnedCommission,
      pendingCommission,
    });
  }

  for (const p of params.payouts || []) {
    if (!p?.teacherId) continue;
    const bucket = ensureTeacherBucket(p.teacherId, p.teacherName);
    bucket.payouts.push(p);
    bucket.totalPaidOut += Math.max(0, Number(p.amount || 0));
  }

  const teachers = Array.from(summaryMap.values())
    .map((b) => ({
      ...b,
      payouts: b.payouts.sort((a, c) => (c.paidDate || c.createdAt).localeCompare(a.paidDate || a.createdAt)),
      balancePayable: Math.max(0, b.totalEarnedCommission - b.totalPaidOut),
    }))
    .sort((a, b) => b.totalEarnedCommission - a.totalEarnedCommission || b.studentsCount - a.studentsCount);

  const totals = teachers.reduce(
    (acc, t) => ({
      referredStudents: acc.referredStudents + t.studentsCount,
      eligibleCollected: acc.eligibleCollected + t.totalEligibleFeeCollected,
      earnedCommission: acc.earnedCommission + t.totalEarnedCommission,
      pendingCommission: acc.pendingCommission + t.totalPendingCommission,
      paidOut: acc.paidOut + t.totalPaidOut,
      balancePayable: acc.balancePayable + t.balancePayable,
    }),
    {
      referredStudents: 0,
      eligibleCollected: 0,
      earnedCommission: 0,
      pendingCommission: 0,
      paidOut: 0,
      balancePayable: 0,
    }
  );

  return { teachers, totals };
};
