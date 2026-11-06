// Helper utilities, SVG crests, and HTML generator for DPS-Style Official School Fee Receipt
// Matches the authentic Delhi Public School fee receipt layout with pixel precision,
// student photo, high-definition vector QR, and 4-in-1 A4 sheet printing (4 receipts per A4 page).

import type { Student, SchoolConfig } from '../../types';
import { getSchoolCacheSync, getSchoolLogoSync } from '../../utils/schoolIndexedDb';

export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  name: "Nstz Smart Academy",
  tagline: "Knowledge, Discipline & Excellence",
  affiliationNo: "CBSE/AFF/330169",
  schoolCode: "NSTZ-01",
  board: "CBSE, New Delhi",
  address: "Institutional Academic Campus, Educational Zone",
  cityStateZip: "Patna, Bihar 801503",
  phone: "+91 98765 43210",
  email: "contact@nstz.app",
  website: "www.nstz.app",
  upiId: "school@upi",
  logoUrl: "",
};

export const INITIAL_STUDENTS: Student[] = [
  {
    id: "std-01",
    rollNo: "01",
    admissionNo: "DPS/2023/1042",
    name: "Aarav Sharma",
    fatherName: "Rajesh Sharma",
    motherName: "Pooja Sharma",
    classGrade: "X",
    section: "A",
    phone: "9876543210",
    email: "aarav.sharma@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80",
    address: "Boring Road, Patna, Bihar",
    admissionDate: "2023-04-10",
    monthlyFee: 3850,
    duesAmount: 0,
  },
  {
    id: "std-02",
    rollNo: "02",
    admissionNo: "DPS/2023/1089",
    name: "Ananya Kumari",
    fatherName: "Sunil Verma",
    motherName: "Renu Verma",
    classGrade: "X",
    section: "A",
    phone: "9835012345",
    email: "ananya.verma@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80",
    address: "Kankarbagh Colony, Patna, Bihar",
    admissionDate: "2023-04-12",
    monthlyFee: 3850,
    duesAmount: 3850,
  },
  {
    id: "std-03",
    rollNo: "05",
    admissionNo: "DPS/2022/0784",
    name: "Vivaan Roy",
    fatherName: "Amitabh Roy",
    motherName: "Sushma Roy",
    classGrade: "IX",
    section: "B",
    phone: "9123456780",
    email: "vivaan.roy@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80",
    address: "Bailey Road, Patna, Bihar",
    admissionDate: "2022-04-05",
    monthlyFee: 3600,
    duesAmount: 0,
  },
  {
    id: "std-04",
    rollNo: "12",
    admissionNo: "DPS/2024/2105",
    name: "Diya Patel",
    fatherName: "Dharmendra Patel",
    motherName: "Geeta Patel",
    classGrade: "VIII",
    section: "A",
    phone: "9431098765",
    email: "diya.patel@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&auto=format&fit=crop&q=80",
    address: "Rajendra Nagar, Patna, Bihar",
    admissionDate: "2024-04-08",
    monthlyFee: 3450,
    duesAmount: 0,
  },
  {
    id: "std-05",
    rollNo: "18",
    admissionNo: "DPS/2021/0452",
    name: "Ishaan Gupta",
    fatherName: "Manoj Gupta",
    motherName: "Sunita Gupta",
    classGrade: "XII",
    section: "Science",
    phone: "9765432109",
    email: "ishaan.gupta@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80",
    address: "Ashiana Nagar, Patna, Bihar",
    admissionDate: "2021-04-02",
    monthlyFee: 4500,
    duesAmount: 4500,
  },
  {
    id: "std-06",
    rollNo: "21",
    admissionNo: "DPS/2023/1290",
    name: "Saanvi Mishra",
    fatherName: "Pradeep Mishra",
    motherName: "Archana Mishra",
    classGrade: "VI",
    section: "B",
    phone: "9811223344",
    email: "saanvi.m@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80",
    address: "Danapur Cantt, Patna, Bihar",
    admissionDate: "2023-04-15",
    monthlyFee: 3200,
    duesAmount: 0,
  },
  {
    id: "std-07",
    rollNo: "24",
    admissionNo: "DPS/2022/0914",
    name: "Reyansh Singh",
    fatherName: "Vikramaditya Singh",
    motherName: "Kavita Singh",
    classGrade: "VII",
    section: "A",
    phone: "9934123456",
    email: "reyansh.s@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80",
    address: "Anisabad, Patna, Bihar",
    admissionDate: "2022-04-18",
    monthlyFee: 3300,
    duesAmount: 3300,
  },
  {
    id: "std-08",
    rollNo: "30",
    admissionNo: "DPS/2020/0198",
    name: "Aadhya Roy",
    fatherName: "Tapan Roy",
    motherName: "Madhumita Roy",
    classGrade: "XI",
    section: "Commerce",
    phone: "9823456789",
    email: "aadhya.roy@dpspatna.edu.in",
    photoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=240&auto=format&fit=crop&q=80",
    address: "Exhibition Road, Patna, Bihar",
    admissionDate: "2020-04-06",
    monthlyFee: 4200,
    duesAmount: 0,
  }
];

export interface FeeReceiptItem {
  id: string;
  slNo: number;
  description: string;
  due: number;
  con: number; // Concession
  paid: number;
}

export interface PayModeInfo {
  payMode: string; // "Cheque" | "Cash" | "Online / UPI" | "Bank Transfer" | "Card"
  date: string; // DD/MM/YYYY
  bank: string; // e.g. "HDFC BANK"
  number: string; // Cheque No, UTR, or Ref No
}

export interface DpsReceiptData {
  schoolName: string;
  schoolAddress: string;
  schoolLogoUrl?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolAffiliation?: string;

  // Student & Receipt Info
  receiptNo: string;
  admissionNo: string;
  studentName: string;
  fatherName?: string;
  studentId?: string;
  schoolId?: string;
  rollNo?: string;
  phone?: string;
  studentPhotoUrl?: string; // Student picture
  installment: string; // e.g. "JULY-SEP" or "OCTOBER 2026"
  receiptDate: string; // DD/MM/YYYY
  session: string; // e.g. "2026-2027"
  className: string; // e.g. "6 - B"
  counterNo: string; // e.g. "DPS-RECEIPT"
  receiptTitle?: string; // e.g. "MONTHLY FEE RECEIPT / मासिक शुल्क रसीद" or "ADMISSION FEE RECEIPT / प्रवेश शुल्क रसीद"

  // Fee items
  items: FeeReceiptItem[];

  // Balance due, Last Paid & Last Due summary details
  balanceDue?: number;
  lastPaidAmount?: number;
  lastPaidDate?: string;
  lastDueAmount?: number;
  lastDueDate?: string;
  nextMonthEstimatedFee?: number;
  fifoSummary?: string;

  // Payment info
  payModeInfo: PayModeInfo;

  // Remarks & Note
  note?: string; // e.g. "356" or "Monthly fee received"

  // Signature & Payment QR
  upiId?: string;
  showDigitalSignature?: boolean;
  principalSignatureUrl?: string;
  principalName?: string;
  principalTitle?: string;
  directorSignatureUrl?: string;
  directorName?: string;
  signatoryTitle?: string;
  signatoryMode?: "both" | "cashier_only" | "principal_only";
  cashierTitle?: string;
  cashierSignatureUrl?: string;
}

export interface StudentFeeHistorySummary {
  lastPaidAmount: number;
  lastPaidDate: string;
  lastDueAmount: number;
  lastDueDate: string;
}

/**
 * Formats a "YYYY-MM" string as "Oct 2026".
 */
export function formatShortFeeMonth(ym?: string | null): string {
  if (!ym || typeof ym !== "string") return "";
  const m = ym.trim().match(/^(\d{4})-(\d{2})/);
  if (!m) return ym.trim();
  const year = parseInt(m[1], 10);
  const monthIdx = parseInt(m[2], 10) - 1;
  const d = new Date(year, monthIdx, 1);
  if (isNaN(d.getTime())) return ym.trim();
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/**
 * Formats an array of unpaid "YYYY-MM" months concisely so slips never overflow.
 * e.g. ["2026-10"] -> "Oct 2026"
 *      ["2026-09", "2026-10"] -> "Sep 2026, Oct 2026"
 *      ["2026-06", ..., "2026-10"] -> "Jun 2026 – Oct 2026 (5M)"
 */
export function formatConciseArrearsMonths(months?: string[] | null): string {
  if (!Array.isArray(months) || months.length === 0) return "";
  const sorted = Array.from(new Set(months.filter(Boolean))).sort();
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return formatShortFeeMonth(sorted[0]);
  if (sorted.length === 2) return `${formatShortFeeMonth(sorted[0])}, ${formatShortFeeMonth(sorted[1])}`;
  return `${formatShortFeeMonth(sorted[0])} – ${formatShortFeeMonth(sorted[sorted.length - 1])} (${sorted.length}M)`;
}

/**
 * Formats an ISO date or DD/MM/YYYY date cleanly as DD/MM/YYYY.
 */
function formatCleanSlipDate(rawDate?: string | null, fallbackMonth?: string | null): string {
  if (rawDate && typeof rawDate === "string") {
    const trimmed = rawDate.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(trimmed)) {
      const parts = trimmed.split("/");
      return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2].length === 2 ? "20" + parts[2] : parts[2]}`;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      return `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`;
    }
  }
  return formatShortFeeMonth(fallbackMonth);
}

/**
 * Computes accurate Last Paid (Amount + Date) and Last Due / Previous Arrears (Amount + Month/Date)
 * from a student's fee history + IndexedDB cache + current fee record.
 */
export function computeStudentFeeHistorySummary(params: {
  studentId?: string;
  schoolId?: string;
  currentMonth?: string;
  currentFee?: any;
  feeHistory?: any[];
}): StudentFeeHistorySummary {
  const { studentId, schoolId, currentMonth, currentFee, feeHistory } = params;

  // Merge provided feeHistory with synchronous IndexedDB cache for this school
  const cachedFees = schoolId
    ? getSchoolCacheSync<any[]>(`nst_school_fees_${schoolId}`, [])
    : [];
  const combinedMap = new Map<string, any>();

  const addRecord = (rec: any) => {
    if (!rec || (studentId && rec.studentId && rec.studentId !== studentId)) return;
    const key = `${rec.studentId || studentId || ""}_${rec.feeType === "admission" ? `adm_${rec.receiptNo || ""}` : (rec.month || rec.receiptNo || Math.random())}`;
    if (!combinedMap.has(key)) {
      combinedMap.set(key, rec);
    }
  };

  if (Array.isArray(feeHistory)) feeHistory.forEach(addRecord);
  if (Array.isArray(cachedFees)) cachedFees.forEach(addRecord);
  if (currentFee) addRecord(currentFee);

  const studentRecords = Array.from(combinedMap.values()).filter(
    r => !studentId || r.studentId === studentId
  );

  // 1. Compute Last Paid Amount & Date (group FIFO split rows by base receipt number so lump-sum payment shows accurately)
  type PaidTx = { amount: number; explicitLumpSum: number; sortTime: number; dateStr: string; month: string };
  const txGroups = new Map<string, PaidTx>();

  studentRecords.forEach((rec) => {
    const rawLump = Number(rec.lastReceiptPaidAmount || 0);
    const rowPaid = rec.paidAmount !== undefined
      ? Number(rec.paidAmount)
      : (rec.paid ? Number(rec.amount ?? rec.monthlyAmount ?? 0) : 0);

    if (rawLump <= 0 && rowPaid <= 0) return;

    const rawReceipt = String(rec.receiptNo || "").trim();
    const baseReceipt = rawReceipt.replace(/^FIFO-\d{4}-\d{2}-/, "");
    const groupKey = baseReceipt || (rec.paidDate ? `dt_${String(rec.paidDate).slice(0, 19)}` : `mo_${rec.month || "x"}`);

    let ts = 0;
    if (rec.paidDate) {
      const p = new Date(rec.paidDate).getTime();
      if (!isNaN(p)) ts = p;
    }
    if (!ts && rec.month && /^\d{4}-\d{2}/.test(rec.month)) {
      const p = new Date(`${rec.month.slice(0, 7)}-01T00:00:00`).getTime();
      if (!isNaN(p)) ts = p;
    }

    const formattedDate = formatCleanSlipDate(rec.paidDate || rec.payModeInfo?.date, rec.month);
    const existing = txGroups.get(groupKey);
    if (!existing) {
      txGroups.set(groupKey, {
        amount: rowPaid,
        explicitLumpSum: rawLump,
        sortTime: ts,
        dateStr: formattedDate,
        month: rec.month || "",
      });
    } else {
      existing.amount += rowPaid;
      if (rawLump > existing.explicitLumpSum) existing.explicitLumpSum = rawLump;
      if (ts > existing.sortTime) {
        existing.sortTime = ts;
        if (formattedDate) existing.dateStr = formattedDate;
      } else if (!existing.dateStr && formattedDate) {
        existing.dateStr = formattedDate;
      }
      if ((rec.month || "") > existing.month) existing.month = rec.month || "";
    }
  });

  const sortedTxs = Array.from(txGroups.values())
    .map(tx => ({
      finalAmount: tx.explicitLumpSum > 0 ? tx.explicitLumpSum : tx.amount,
      sortTime: tx.sortTime,
      dateStr: tx.dateStr || formatShortFeeMonth(tx.month),
      month: tx.month,
    }))
    .filter(tx => tx.finalAmount > 0)
    .sort((a, b) => {
      if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime;
      return (b.month || "").localeCompare(a.month || "");
    });

  const latestPaid = sortedTxs[0];
  const lastPaidAmount = latestPaid ? latestPaid.finalAmount : 0;
  const lastPaidDate = latestPaid ? latestPaid.dateStr : "";

  // 2. Compute Last Due / Previous Arrears Amount & Month/Date
  const resolvedMonth = currentMonth || currentFee?.month || "";
  const explicitArrears = Number(currentFee?.arrearsAmount || 0);
  const explicitArrearsMonths: string[] = Array.isArray(currentFee?.arrearsMonths)
    ? currentFee.arrearsMonths
    : [];

  let lastDueAmount = 0;
  let lastDueDate = "";

  if (explicitArrears > 0) {
    lastDueAmount = explicitArrears;
    lastDueDate = formatConciseArrearsMonths(explicitArrearsMonths) || "पिछला माह / Prev. Month";
  } else {
    // Check prior unpaid records in history before resolvedMonth
    const priorUnpaid = studentRecords.filter(r => {
      if (!r.month || (resolvedMonth && r.month >= resolvedMonth)) return false;
      if (r.feeType === "admission") return false;
      if (r.balanceDue !== undefined) return Number(r.balanceDue) > 0;
      if (r.paid) return false;
      const tot = Number(r.amount ?? r.monthlyAmount ?? 0);
      const pd = Number(r.paidAmount || 0);
      return tot - pd > 0;
    });

    if (priorUnpaid.length > 0) {
      lastDueAmount = priorUnpaid.reduce((sum, r) => {
        if (r.balanceDue !== undefined) return sum + Math.max(0, Number(r.balanceDue));
        return sum + Math.max(0, Number(r.amount ?? r.monthlyAmount ?? 0) - Number(r.paidAmount || 0));
      }, 0);
      lastDueDate = formatConciseArrearsMonths(priorUnpaid.map(r => r.month));
    } else if (
      currentFee &&
      Number(currentFee.paidAmount || 0) > 0 &&
      Number(currentFee.balanceDue || 0) > 0
    ) {
      // Partial balance remaining from earlier payment in the current month
      lastDueAmount = Number(currentFee.balanceDue);
      lastDueDate = `${formatShortFeeMonth(resolvedMonth) || "चालू माह"} (शेष)`;
    }
  }

  return {
    lastPaidAmount,
    lastPaidDate,
    lastDueAmount,
    lastDueDate,
  };
}

/**
 * Formats raw session strings like "demo session 2026_2" or "2026-2027" cleanly as "2026-27".
 */
export function formatAcademicSession(raw?: string | null): string {
  if (!raw || typeof raw !== "string") return "2026-27";
  const trimmed = raw.trim();
  if (!trimmed) return "2026-27";
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;

  const fullRangeMatch = trimmed.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (fullRangeMatch) {
    return `${fullRangeMatch[1]}-${fullRangeMatch[2].slice(-2)}`;
  }

  const yearMatch = trimmed.match(/((?:19|20)\d{2})/);
  if (yearMatch) {
    const startYear = parseInt(yearMatch[1], 10);
    const nextShort = String((startYear + 1) % 100).padStart(2, "0");
    return `${startYear}-${nextShort}`;
  }

  // Reject any raw Firestore document IDs or non-year hashes (e.g. dRhlh12mWxu57lw1VuNQ or session_abc123)
  if (!/\d{4}/.test(trimmed) || (trimmed.length >= 9 && /[a-zA-Z]/.test(trimmed))) {
    return "2026-27";
  }

  return trimmed;
}

export interface DpsReceiptRenderOptions {
  layout?: "full" | "compact" | "mini" | "pos"; // "compact" fits 4 on 1 A4 page, "mini" fits 6 on 1 A4 page, "pos" is 80mm/58mm thermal roll
  copyTitle?: string; // e.g. "STUDENT COPY", "OFFICE COPY", "ACCOUNTS COPY", "GUARDIAN COPY"
  rollWidthMm?: number; // e.g. 80 (default) or 58
}

/**
 * Converts any number to standard Indian numbering words.
 * Example: 177820 -> "One Lakh Seventy-seven Thousand Eight Hundred Twenty Only"
 */
export function numberToIndianWords(amount: number): string {
  const num = Math.floor(Math.abs(Number(amount) || 0));
  if (num === 0) return "Zero Rupees Only";

  const ones = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ",
    "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "
  ];
  const tens = ["", "", "Twenty ", "Thirty ", "Forty ", "Fifty ", "Sixty ", "Seventy ", "Eighty ", "Ninety "];

  function convertTwoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + ones[n % 10];
  }

  function convertThreeDigits(n: number): string {
    let res = "";
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 0) {
      res += convertTwoDigits(n);
    }
    return res;
  }

  let words = "";
  let remainder = num;

  const crore = Math.floor(remainder / 10000000);
  remainder %= 10000000;
  if (crore > 0) {
    words += convertThreeDigits(crore) + "Crore ";
  }

  const lakh = Math.floor(remainder / 100000);
  remainder %= 100000;
  if (lakh > 0) {
    words += convertThreeDigits(lakh) + "Lakh ";
  }

  const thousand = Math.floor(remainder / 1000);
  remainder %= 1000;
  if (thousand > 0) {
    words += convertThreeDigits(thousand) + "Thousand ";
  }

  if (remainder > 0) {
    words += convertThreeDigits(remainder);
  }

  words = words.trim();
  return words ? `${words} Only` : "Zero Rupees Only";
}

/**
 * Authentic Green School Crest SVG (Delhi Public School classic style shield with torch, wreath & ribbon).
 */
export const DPS_DEFAULT_CREST_SVG = `
<svg viewBox="0 0 100 120" width="72" height="86" xmlns="http://www.w3.org/2000/svg" class="dps-crest-svg">
  <!-- Outer double green shield -->
  <path d="M 50 4 C 76 4 94 16 94 38 C 94 76 68 104 50 116 C 32 104 6 76 6 38 C 6 16 24 4 50 4 Z" 
        fill="#ffffff" stroke="#15803d" stroke-width="3" />
  <path d="M 50 9 C 72 9 88 20 88 39 C 88 72 65 98 50 109 C 35 98 12 72 12 39 C 12 20 28 9 50 9 Z" 
        fill="#ffffff" stroke="#15803d" stroke-width="1.2" />
  
  <!-- Ribbon banner at top: KNOWLEDGE & EXCELLENCE -->
  <path d="M 16 22 Q 50 16 84 22 L 81 27 Q 50 21 19 27 Z" fill="#15803d" />
  <text x="50" y="25.5" font-family="Arial, sans-serif" font-size="3.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">KNOWLEDGE &amp; EXCELLENCE</text>
  
  <!-- Laurel Wreath Leaves on sides -->
  <g fill="none" stroke="#15803d" stroke-width="1.2" stroke-linecap="round">
    <path d="M 22 36 C 20 48 22 66 32 82" />
    <path d="M 78 36 C 80 48 78 66 68 82" />
    <ellipse cx="20" cy="42" rx="3.5" ry="1.5" transform="rotate(-30 20 42)" fill="#15803d" />
    <ellipse cx="21" cy="52" rx="3.5" ry="1.5" transform="rotate(-15 21 52)" fill="#15803d" />
    <ellipse cx="23" cy="62" rx="3.5" ry="1.5" transform="rotate(10 23 62)" fill="#15803d" />
    <ellipse cx="27" cy="72" rx="3.5" ry="1.5" transform="rotate(35 27 72)" fill="#15803d" />
    <ellipse cx="80" cy="42" rx="3.5" ry="1.5" transform="rotate(30 80 42)" fill="#15803d" />
    <ellipse cx="79" cy="52" rx="3.5" ry="1.5" transform="rotate(15 79 52)" fill="#15803d" />
    <ellipse cx="77" cy="62" rx="3.5" ry="1.5" transform="rotate(-10 77 62)" fill="#15803d" />
    <ellipse cx="73" cy="72" rx="3.5" ry="1.5" transform="rotate(-35 73 72)" fill="#15803d" />
  </g>
  
  <!-- Central Torch of Knowledge & Open Book -->
  <path d="M 50 32 C 46 36 45 40 48 44 C 49 42 51 41 52 41 C 51 44 51 46 48 48 C 55 46 56 41 53 37 C 52 35 51 33 50 32 Z" fill="#eab308" stroke="#ca8a04" stroke-width="0.8" />
  <path d="M 50 35 C 48 38 48 41 50 43 C 51 41 52 40 53 40 C 52 42 51 44 50 45 C 53 44 53 41 52 38 Z" fill="#ef4444" />
  <path d="M 47 48 L 53 48 L 52 66 L 48 66 Z" fill="#15803d" stroke="#14532d" stroke-width="0.6" />
  <rect x="46" y="47" width="8" height="2" fill="#15803d" rx="0.5" />
  <rect x="47.5" y="65" width="5" height="2" fill="#15803d" rx="0.5" />
  
  <!-- Open Book at base of torch -->
  <path d="M 38 72 Q 44 70 50 72 Q 56 70 62 72 L 62 79 Q 56 77 50 79 Q 44 77 38 79 Z" fill="#ffffff" stroke="#15803d" stroke-width="1.2" />
  <line x1="50" y1="72" x2="50" y2="79" stroke="#15803d" stroke-width="1" />
  <line x1="41" y1="74" x2="48" y2="74" stroke="#15803d" stroke-width="0.7" />
  <line x1="41" y1="76.5" x2="48" y2="76.5" stroke="#15803d" stroke-width="0.7" />
  <line x1="52" y1="74" x2="59" y2="74" stroke="#15803d" stroke-width="0.7" />
  <line x1="52" y1="76.5" x2="59" y2="76.5" stroke="#15803d" stroke-width="0.7" />
  <polygon points="50,86 51.5,90.5 56,90.5 52.5,93 54,97.5 50,95 46,97.5 47.5,93 44,90.5 48.5,90.5" fill="#15803d" />
</svg>
`;

/**
 * Checks if a URL points to the NSTA platform app's own logo (to prevent app branding from replacing school branding)
 */
export function isAppLogo(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes("nsta-logo") ||
    lower.includes("nsta_logo") ||
    lower.includes("branding/nsta") ||
    lower.includes("favicon.svg") ||
    lower.endsWith("/icons/icon-192.png") ||
    lower.endsWith("/icons/icon-512.png") ||
    lower.endsWith("/icon-192.png") ||
    lower.endsWith("/icon-512.png") ||
    lower.endsWith("/apple-touch-icon.png") ||
    lower === "/branding/nsta-logo.png" ||
    lower === "/branding/nsta-logo.svg" ||
    lower === "branding/nsta-logo.png" ||
    lower === "branding/nsta-logo.svg"
  );
}

/**
 * Normalizes and cleans image URLs (including Google Drive links) so browsers can render them in <img> tags.
 */
export function cleanLogoUrl(url?: string): string {
  if (!url || typeof url !== "string") return "";
  let trimmed = url.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("branding/")) {
    trimmed = "/" + trimmed;
  }
  if (trimmed.startsWith("icons/")) {
    trimmed = "/" + trimmed;
  }
  // Google Drive format 1: /file/d/ID/view
  const dMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (dMatch) {
    return `https://drive.google.com/uc?export=view&id=${dMatch[1]}`;
  }
  // Google Drive format 2: id=ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch && trimmed.includes("drive.google.com")) {
    return `https://drive.google.com/uc?export=view&id=${idMatch[1]}`;
  }
  return trimmed;
}

/**
 * Resolves the authentic saved school logo strictly isolated per schoolId.
 * Never leaks School A's logo onto School B, and never returns the NSTA app logo.
 */
export function getSavedSchoolLogo(preferredLogo?: string | null, schoolId?: string): string {
  // 1. If preferredLogo is provided and is a valid custom school logo (NOT an app logo), use it!
  if (preferredLogo && typeof preferredLogo === "string") {
    const cleaned = cleanLogoUrl(preferredLogo);
    if (cleaned && !isAppLogo(cleaned)) {
      return cleaned;
    }
  }

  // 2. If schoolId is specified, check strictly that school's IndexedDB logo & school profile
  if (schoolId) {
    const perSchoolLogo = getSchoolLogoSync(schoolId);
    if (perSchoolLogo) {
      const cleaned = cleanLogoUrl(perSchoolLogo);
      if (cleaned && !isAppLogo(cleaned)) {
        return cleaned;
      }
    }

    const schools = getSchoolCacheSync<any[]>("nst_schools_local_cache", []);
    if (Array.isArray(schools)) {
      const matched = schools.find((s) => s?.id === schoolId);
      if (matched?.logoUrl && typeof matched.logoUrl === "string") {
        const cleaned = cleanLogoUrl(matched.logoUrl);
        if (cleaned && !isAppLogo(cleaned)) {
          return cleaned;
        }
      }
    }

    return "";
  }

  // 3. Fallback when schoolId is omitted: only resolve if there is a single school in cache
  const schools = getSchoolCacheSync<any[]>("nst_schools_local_cache", []);
  if (Array.isArray(schools) && schools.length === 1 && schools[0]?.logoUrl) {
    const cleaned = cleanLogoUrl(schools[0].logoUrl);
    if (cleaned && !isAppLogo(cleaned)) {
      return cleaned;
    }
  }

  return "";
}

/**
 * Generates an authentic school crest SVG with the school's actual name and initials.
 * Avoids showing any hardcoded other school name.
 */
export function generateSchoolCrestSvg(schoolName: string = "School", isMini: boolean = false): string {
  const cleanName = (schoolName || "School").trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  let initials = words.map(w => w[0]).join("").toUpperCase().slice(0, 4);
  if (!initials) initials = cleanName.slice(0, 3).toUpperCase();
  const shortName = cleanName.length > 18 ? cleanName.slice(0, 16) + ".." : cleanName;

  const w = isMini ? 26 : 64;
  const h = isMini ? 30 : 76;

  const escapeXml = (val: string) =>
    val.replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    }[c] as string));

  return `
<svg viewBox="0 0 100 120" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" class="dps-crest-svg" style="display:block;margin:auto;">
  <!-- Outer Shield with Gold & Deep Indigo styling -->
  <path d="M 50 4 C 76 4 94 16 94 38 C 94 76 68 104 50 116 C 32 104 6 76 6 38 C 6 16 24 4 50 4 Z" 
        fill="#1e1b4b" stroke="#f59e0b" stroke-width="2.5" />
  <path d="M 50 9 C 72 9 88 20 88 39 C 88 72 65 98 50 109 C 35 98 12 72 12 39 C 12 20 28 9 50 9 Z" 
        fill="#312e81" stroke="#fbbf24" stroke-width="1.2" />
  
  <!-- Top Emblem Star -->
  <circle cx="50" cy="22" r="5" fill="#f59e0b" />
  <polygon points="50,18 51.5,21.5 55,21.5 52,23.5 53.5,27 50,25 46.5,27 48,23.5 45,21.5 48.5,21.5" fill="#ffffff" />
  
  <!-- School Initials in Center -->
  <text x="50" y="56" font-family="'Arial Black', Arial, sans-serif" font-size="${initials.length > 3 ? 17 : 21}" font-weight="900" fill="#fbbf24" text-anchor="middle" letter-spacing="0.5">
    ${escapeXml(initials)}
  </text>
  
  <!-- Open Book at base -->
  <path d="M 32 72 Q 41 69 50 72 Q 59 69 68 72 L 68 81 Q 59 78 50 81 Q 41 78 32 81 Z" fill="#ffffff" stroke="#f59e0b" stroke-width="1.2" />
  <line x1="50" y1="72" x2="50" y2="81" stroke="#f59e0b" stroke-width="1.2" />
  <line x1="36" y1="75" x2="46" y2="75" stroke="#312e81" stroke-width="0.8" />
  <line x1="36" y1="77.5" x2="46" y2="77.5" stroke="#312e81" stroke-width="0.8" />
  <line x1="54" y1="75" x2="64" y2="75" stroke="#312e81" stroke-width="0.8" />
  <line x1="54" y1="77.5" x2="64" y2="77.5" stroke="#312e81" stroke-width="0.8" />

  <!-- Ribbon with School Name -->
  <path d="M 18 90 Q 50 86 82 90 L 80 100 Q 50 95 20 100 Z" fill="#f59e0b" stroke="#b45309" stroke-width="0.8" />
  <text x="50" y="97" font-family="Arial, sans-serif" font-size="5.5" font-weight="900" fill="#1e1b4b" text-anchor="middle">
    ${escapeXml(shortName.toUpperCase())}
  </text>
</svg>`;
}

/**
 * Generates an authentic, pixel-perfect HTML markup matching the DPS Fee Receipt layout,
 * supporting both Full Page and 4-in-1 Compact A4 layout.
 */
export function generateDpsReceiptHtml(
  data: DpsReceiptData,
  options: DpsReceiptRenderOptions = {}
): string {
  const isMini = options.layout === "mini";
  const isCompact = options.layout === "compact" || isMini;
  const copyTitle = options.copyTitle || "";

  if (!data) return "";
  const escapeHtml = (val: unknown) =>
    String(val ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c] as string));

  const items = Array.isArray(data.items) ? data.items : [];
  const totalDue = items.reduce((s, it) => s + (Number(it?.due) || 0), 0);
  const totalConcession = items.reduce((s, it) => s + (Number(it?.con) || 0), 0);
  const netPayable = Math.max(0, totalDue - totalConcession);
  const totalPaid = items.reduce((s, it) => s + (Number(it?.paid) || 0), 0);
  const grandTotal = totalPaid > 0 ? totalPaid : netPayable;
  const totalWords = numberToIndianWords(grandTotal);
  const calculatedBalDue = data.balanceDue !== undefined ? Number(data.balanceDue) : Math.max(0, netPayable - totalPaid);
  const cleanSession = formatAcademicSession(data.session);
  const isDueSlip = totalPaid === 0 || calculatedBalDue > 0;
  const payableDueAmount = totalPaid === 0 ? netPayable : calculatedBalDue;
  const isDemandNote =
    totalPaid === 0 ||
    (payableDueAmount > 0 &&
      (data.counterNo === "DUE-DEMAND" ||
        /DUE|DEMAND|बकाया/i.test(data.receiptTitle || "")));

  // Auto-resolve Father's Name & Phone from IndexedDB student cache if not explicitly passed
  let resolvedFatherName = (data.fatherName || "").trim();
  let resolvedStudentPhone = (data.phone || "")
    .replace(/\s*\([A-Za-z0-9_-]{10,}\)\s*/g, "")
    .trim();
  if ((!resolvedFatherName || !resolvedStudentPhone) && data.schoolId && data.studentId) {
    const cachedStudents = getSchoolCacheSync<any[]>(`nst_school_students_${data.schoolId}`, []);
    if (Array.isArray(cachedStudents)) {
      const matchedSt = cachedStudents.find(s => s?.id === data.studentId);
      if (matchedSt) {
        if (!resolvedFatherName && matchedSt.fatherName) resolvedFatherName = String(matchedSt.fatherName).trim();
        if (!resolvedStudentPhone && (matchedSt.phone || matchedSt.whatsappNo)) {
          resolvedStudentPhone = String(matchedSt.phone || matchedSt.whatsappNo)
            .replace(/\s*\([A-Za-z0-9_-]{10,}\)\s*/g, "")
            .trim();
        }
      }
    }
  }

  // Auto-resolve Last Paid (Amount + Date) & Last Due / Previous Arrears (Amount + Date/Month)
  const arrearsItem = data.items.find(
    it => it.id === "arrears" || /arrears|back due|पिछला बकाया/i.test(it.description || "")
  );
  const arrearsFromItems = arrearsItem ? Number(arrearsItem.due || 0) : 0;
  const arrearsParenMatch = arrearsItem?.description?.match(/\(([^)]+)\)/);
  const arrearsPeriodFromDesc = arrearsParenMatch ? arrearsParenMatch[1].trim() : "";

  const fallbackSummary = (data.lastPaidAmount === undefined || data.lastDueAmount === undefined)
    ? computeStudentFeeHistorySummary({
        studentId: data.studentId,
        schoolId: data.schoolId,
        currentFee: {
          arrearsAmount: arrearsFromItems,
          paidAmount: totalPaid,
          balanceDue: calculatedBalDue,
        },
      })
    : { lastPaidAmount: 0, lastPaidDate: "", lastDueAmount: 0, lastDueDate: "" };

  const effectiveLastPaidAmount = data.lastPaidAmount !== undefined
    ? Number(data.lastPaidAmount)
    : fallbackSummary.lastPaidAmount;
  const effectiveLastPaidDate = (data.lastPaidDate || fallbackSummary.lastPaidDate || "").trim();

  const effectiveLastDueAmount = data.lastDueAmount !== undefined
    ? Number(data.lastDueAmount)
    : (arrearsFromItems > 0 ? arrearsFromItems : fallbackSummary.lastDueAmount);
  const effectiveLastDueDate = (
    data.lastDueDate ||
    arrearsPeriodFromDesc ||
    fallbackSummary.lastDueDate ||
    (effectiveLastDueAmount > 0 ? "पिछला माह / Prev. Month" : "")
  ).trim();

  // Resolve School UPI ID (explicit -> per-school IndexedDB cache)
  let effectiveUpiId = (data.upiId || "").trim();
  let effectiveSchoolPhone = (data.schoolPhone || "").trim();
  if ((!effectiveUpiId || !effectiveSchoolPhone) && data.schoolId) {
    const cachedSchools = getSchoolCacheSync<any[]>("nst_schools_local_cache", []);
    const matchedSchool = Array.isArray(cachedSchools) ? cachedSchools.find((s) => s?.id === data.schoolId) : null;
    if (matchedSchool?.upiId && !effectiveUpiId) effectiveUpiId = String(matchedSchool.upiId).trim();
    if ((matchedSchool?.phone || matchedSchool?.mobile) && !effectiveSchoolPhone) {
      effectiveSchoolPhone = String(matchedSchool.phone || matchedSchool.mobile).trim();
    }
  }

  const upiUri = effectiveUpiId && payableDueAmount > 0
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent((data.schoolName || "School").slice(0, 40))}&am=${payableDueAmount}&cu=INR&tn=${encodeURIComponent(`Fee ${data.admissionNo || data.studentName}`)}`
    : "";
  const upiQrSvgUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=svg&qzone=1&margin=1&data=${encodeURIComponent(upiUri)}`
    : "";
  const upiQrPngUrl = upiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&qzone=1&margin=1&data=${encodeURIComponent(upiUri)}`
    : "";

  // Generate Ultra High-Definition Vector SVG / High-Res QR Code URL with NSTA-SCHOOL prefix for instant student login
  const cleanSchoolId = data.schoolId || 'school_campus';
  const cleanStudentId = data.studentId || '';
  const cleanRollNo = data.rollNo || '';
  const cleanClassId = data.className || '';
  const cleanStudentName = data.studentName || '';
  const cleanAdmissionNo = data.admissionNo || '';
  const cleanPhone = resolvedStudentPhone;

  const qrLoginPrefix = `NSTA-SCHOOL:${[
    encodeURIComponent(cleanSchoolId),
    encodeURIComponent(cleanStudentId),
    encodeURIComponent(cleanRollNo),
    encodeURIComponent(cleanClassId),
    encodeURIComponent(cleanStudentName),
    encodeURIComponent(cleanAdmissionNo),
    encodeURIComponent(cleanPhone)
  ].join(":")}`;

  const qrVerificationData = `${qrLoginPrefix}\nFEE-RECEIPT\nReceiptNo: ${data.receiptNo}\nAdmNo: ${data.admissionNo}\nStudent: ${data.studentName}\nClass: ${data.className}\nSession: ${cleanSession}\nAmount: ₹${grandTotal}\nDate: ${data.receiptDate}`;
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=svg&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;
  const qrHighResPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;

  // Resolve the actual school's logo: explicitly passed -> cached active school logo
  const effectiveLogo = getSavedSchoolLogo(data.schoolLogoUrl, data.schoolId);
  const fallbackSvg = generateSchoolCrestSvg(data.schoolName, isMini);

  const logoMarkup = effectiveLogo
    ? `<img src="${escapeHtml(effectiveLogo)}" alt="${escapeHtml(data.schoolName || 'Logo')}" class="dps-logo-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" />
       <div class="dps-logo-fallback" style="display:none;width:100%;height:100%;">${fallbackSvg}</div>`
    : fallbackSvg;

  const cardClasses = `dps-receipt-card ${isMini ? "is-mini is-compact" : isCompact ? "is-compact" : ""} ${isDemandNote ? "is-demand-slip" : "is-paid-receipt"}`;
  const cleanDateShort = String(data.receiptDate || "").split("(")[0].trim() || data.receiptDate;
  const showDemandSimpleCols = isDemandNote && totalPaid === 0;
  const showConCol = !showDemandSimpleCols || totalConcession > 0;
  const totalTableCols = showDemandSimpleCols ? (showConCol ? 4 : 3) : 5;

  const bannerTitle = isDemandNote
    ? "FEE DEMAND SLIP • बकाया शुल्क तकादा पर्ची"
    : (data.receiptTitle || "OFFICIAL FEE RECEIPT • शुल्क रसीद");

  return `
  <div class="${cardClasses}">
    <!-- Top Header with School Logo, Name, Address & Office Helpline -->
    <div class="dps-header">
      <div class="dps-logo-col">
        ${logoMarkup}
      </div>
      <div class="dps-school-info">
        <h1 class="dps-school-name">${escapeHtml(data.schoolName || "School")}</h1>
        <p class="dps-school-address">
          ${escapeHtml(data.schoolAddress || "Institutional Academic Campus, Educational Zone")}${effectiveSchoolPhone ? ` • Ph: ${escapeHtml(effectiveSchoolPhone)}` : ""}
        </p>
      </div>
    </div>

    <!-- Shaded Title Banner -->
    <div class="dps-banner">
      <span>${escapeHtml(bannerTitle)}</span>
      ${copyTitle ? `<span class="dps-copy-tag">[ ${escapeHtml(copyTitle)} ]</span>` : ""}
    </div>

    <!-- Student & Slip Metadata Grid (Clear, High-Contrast 2-Column Layout) -->
    <div class="dps-meta-grid">
      <!-- Left Column: Student Identity -->
      <div class="dps-meta-col dps-meta-col-left">
        <div class="dps-meta-row">
          <span class="dps-label">Student</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase font-bold dps-student-name-val">${escapeHtml(data.studentName)}</span>
        </div>
        ${resolvedFatherName ? `
        <div class="dps-meta-row">
          <span class="dps-label">Father</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase font-semibold">${escapeHtml(resolvedFatherName)}</span>
        </div>
        ` : ""}
        <div class="dps-meta-row">
          <span class="dps-label">Class</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold">${escapeHtml(data.className)}${data.rollNo ? ` (Roll: ${escapeHtml(data.rollNo)})` : ""}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Adm No</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold dps-tabular">${escapeHtml(data.admissionNo)}</span>
        </div>
      </div>

      <!-- Right Column: Slip & Billing Period -->
      <div class="dps-meta-col dps-meta-col-right">
        <div class="dps-meta-row">
          <span class="dps-label">${isDemandNote && totalPaid === 0 ? "Slip No" : "Receipt No"}</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold dps-tabular">${escapeHtml(data.receiptNo)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Date</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-semibold dps-tabular">${escapeHtml(cleanDateShort)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Month</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase font-bold">${escapeHtml(data.installment)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">${resolvedStudentPhone ? "Mobile" : "Session"}</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold dps-tabular">${escapeHtml(resolvedStudentPhone || cleanSession)}</span>
        </div>
      </div>
    </div>

    ${isDemandNote ? `
    <!-- Previous Payment & Previous Due Summary Strip (With Dates) -->
    <div class="dps-history-strip">
      <div class="dps-history-cell dps-history-paid">
        <div class="dps-history-kicker">पिछला जमा • LAST PAID</div>
        <div class="dps-history-main">
          <span class="dps-history-amt">₹${effectiveLastPaidAmount.toLocaleString("en-IN")}</span>
          <span class="dps-history-date">${effectiveLastPaidAmount > 0
            ? `Date: ${escapeHtml(effectiveLastPaidDate || "Recorded")}`
            : "कोई पिछला जमा नहीं"}</span>
        </div>
      </div>
      <div class="dps-history-cell dps-history-due ${effectiveLastDueAmount > 0 ? "has-due" : "is-clear"}">
        <div class="dps-history-kicker">पिछला बकाया • LAST DUE</div>
        <div class="dps-history-main">
          <span class="dps-history-amt">₹${effectiveLastDueAmount.toLocaleString("en-IN")}</span>
          <span class="dps-history-date">${effectiveLastDueAmount > 0
            ? `${escapeHtml(effectiveLastDueDate)}`
            : "पिछला बकाया शून्य (Clear)"}</span>
        </div>
      </div>
    </div>
    ` : ""}

    <!-- Itemized Fee Table (Elastic Full-Height Ledger — Eliminates Dead Blank Space) -->
    <div class="dps-table-container">
      <table class="dps-fee-table">
        <colgroup>
          <col class="col-sl" />
          <col class="col-desc" />
          ${showDemandSimpleCols ? `
            ${showConCol ? `<col class="col-con" />` : ""}
            <col class="col-demand-amt" />
          ` : `
            <col class="col-due" />
            <col class="col-con" />
            <col class="col-paid" />
          `}
        </colgroup>
        <thead>
          <tr>
            <th class="th-sl">Sl.</th>
            <th class="th-desc">${showDemandSimpleCols ? "Fee Particulars / शुल्क विवरण" : "Description"}</th>
            ${showDemandSimpleCols ? `
              ${showConCol ? `<th class="th-con">Con.</th>` : ""}
              <th class="th-num th-demand-amt">Amount (₹)</th>
            ` : `
              <th class="th-num">Due</th>
              <th class="th-con">Con</th>
              <th class="th-num">Paid</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => {
            const lineNetDue = Math.max(0, Number(item.due || 0) - Number(item.con || 0));
            return `
            <tr class="fee-data-row">
              <td class="td-sl">${item.slNo}</td>
              <td class="td-desc font-semibold">${escapeHtml(item.description)}</td>
              ${showDemandSimpleCols ? `
                ${showConCol ? `<td class="td-con">${Number(item.con).toLocaleString("en-IN")}</td>` : ""}
                <td class="td-num td-demand-amt font-bold">₹${(showConCol ? Number(item.due) : lineNetDue).toLocaleString("en-IN")}</td>
              ` : `
                <td class="td-num">${Number(item.due).toLocaleString("en-IN")}</td>
                <td class="td-con">${Number(item.con).toLocaleString("en-IN")}</td>
                <td class="td-num font-bold">${Number(item.paid).toLocaleString("en-IN")}</td>
              `}
            </tr>
            `;
          }).join("")}
          <!-- Elastic ledger filler row: stretches column dividers cleanly to bottom of table without empty white holes -->
          <tr class="dps-filler-row" aria-hidden="true">
            ${Array.from({ length: totalTableCols }).map((_, idx) => `
              <td class="${idx === 0 ? "td-sl" : idx === 1 ? "td-desc" : "td-num"}"></td>
            `).join("")}
          </tr>
        </tbody>
      </table>
    </div>

    ${!isDemandNote ? `
    <!-- Paid Receipt: Pay Mode Information -->
    <div class="dps-banner">
      <span>PAY MODE INFORMATION</span>
    </div>
    <div class="dps-paymode-grid">
      <div class="dps-pay-row">
        <div class="dps-pay-field">
          <span class="dps-pay-label">Pay Mode</span>
          <span class="dps-pay-val">${escapeHtml(data.payModeInfo.payMode || "Cash")}</span>
        </div>
        <div class="dps-pay-field text-right">
          <span class="dps-pay-label">Pay Date</span>
          <span class="dps-pay-val dps-tabular">${escapeHtml(data.payModeInfo.date || cleanDateShort)}</span>
        </div>
      </div>
      <div class="dps-pay-row">
        <div class="dps-pay-field">
          <span class="dps-pay-label">Counter</span>
          <span class="dps-pay-val uppercase">${escapeHtml(data.payModeInfo.bank || "SCHOOL COUNTER")}</span>
        </div>
        <div class="dps-pay-field text-right">
          <span class="dps-pay-label">Ref No</span>
          <span class="dps-pay-val dps-tabular">${escapeHtml(data.payModeInfo.number || "—")}</span>
        </div>
      </div>
    </div>
    ` : ""}

    <!-- Highlighted Net Payable / Total Paid Bar -->
    <div class="dps-grand-total-row ${isDemandNote ? "is-due-highlight" : ""}">
      <span class="grand-label">${isDemandNote
        ? "कुल देय राशि • NET PAYABLE DUE :"
        : (calculatedBalDue > 0 ? "कुल जमा • TOTAL PAID :" : "कुल प्राप्त राशि • TOTAL PAID :")}</span>
      <span class="grand-val dps-tabular">₹${(isDemandNote ? payableDueAmount : grandTotal).toLocaleString("en-IN")}</span>
    </div>

    ${!isDemandNote && totalPaid > 0 && calculatedBalDue > 0 ? `
    <!-- Net Balance Due Bar on Partial Paid Receipt -->
    <div class="dps-balance-due-row">
      <span class="grand-label">शेष बकाया • BALANCE DUE :</span>
      <span class="grand-val dps-tabular">₹${calculatedBalDue.toLocaleString("en-IN")}</span>
    </div>
    ` : ""}

    <!-- Amount in Words Box -->
    <div class="dps-words-box">
      <div><strong>In Words:</strong> <span>${escapeHtml(numberToIndianWords(isDemandNote ? payableDueAmount : grandTotal))}</span></div>
      ${!isDemandNote && calculatedBalDue > 0 && totalPaid > 0 ? `
        <div class="dps-words-subnote">
          * शेष बकाया ₹${calculatedBalDue.toLocaleString("en-IN")} अगले माह के बिल में जुड़ेगा
        </div>
      ` : ""}
      ${/admission/i.test(data.receiptTitle || "") ? `
        <div class="dps-words-subnote" style="color:#475569;font-weight:600;margin-top:2px;">
          * Note: Admission &amp; Registration fees once paid are non-refundable. Computer generated official receipt.
        </div>
      ` : ""}
    </div>

    ${isDemandNote ? `
    <!-- Parent Payment Undertaking Box (Promise Date + Parent Signature on Demand Slips Only) -->
    <div class="dps-parent-promise-box">
      <div class="dps-promise-header">
        <span>अभिभावक वचनबद्धता • PARENT PAYMENT PROMISE</span>
        <span class="dps-promise-note">(तिथि भरकर हस्ताक्षर करें)</span>
      </div>
      <div class="dps-promise-grid">
        <div class="dps-promise-col dps-promise-date-col">
          <span class="dps-promise-label">जमा करने की तिथि / Promise Date:</span>
          <div class="dps-promise-date-slots">
            <span class="dps-date-blank"></span>
            <span class="dps-date-sep">/</span>
            <span class="dps-date-blank"></span>
            <span class="dps-date-sep">/</span>
            <span class="dps-date-year">20<span class="dps-date-blank-yr"></span></span>
          </div>
        </div>
        <div class="dps-promise-col dps-promise-sign-col">
          <span class="dps-promise-label">अभिभावक हस्ताक्षर / Parent Sign:</span>
          <div class="dps-promise-sign-line"></div>
        </div>
      </div>
    </div>
    ` : ""}

    <!-- Footer: Verification QR + School Payment UPI QR (on Due Slips) + Principal Signatory -->
    <div class="dps-footer">
      <div class="dps-footer-left">
        <img 
          src="${qrSvgUrl}" 
          alt="Verification QR" 
          class="dps-qr-code" 
          onerror="this.onerror=null;this.src='${qrHighResPngUrl}'" 
        />
        <div class="dps-qr-caption">
          <span class="dps-note-text">Verify QR</span>
          <span class="dps-note-sub">${escapeHtml(isDemandNote ? "Pay by 10th of month" : (data.note || "Official Record"))}</span>
        </div>
      </div>

      ${isDueSlip && payableDueAmount > 0 ? `
        <div class="dps-upi-pay-box">
          ${upiQrSvgUrl ? `
            <img
              src="${upiQrSvgUrl}"
              alt="School UPI QR"
              class="dps-qr-code dps-upi-qr"
              onerror="this.onerror=null;this.src='${upiQrPngUrl}'"
            />
          ` : `
            <div class="dps-upi-placeholder">
              <span>SCHOOL</span>
              <span>UPI PAY</span>
            </div>
          `}
          <div class="dps-upi-meta">
            <div class="dps-upi-title">Scan &amp; Pay</div>
            <div class="dps-upi-amt dps-tabular">₹${payableDueAmount.toLocaleString("en-IN")}</div>
            <div class="dps-upi-id">${effectiveUpiId ? escapeHtml(effectiveUpiId) : "UPI / Counter"}</div>
          </div>
        </div>
      ` : ""}

      <div class="dps-footer-right">
        ${(data.signatoryMode === "both" || data.signatoryMode === "cashier_only") ? `
          <div class="dps-sign-block" style="margin-right: 12px;">
            ${data.showDigitalSignature && (data.directorSignatureUrl || data.cashierSignatureUrl) ? `
              <img src="${escapeHtml(data.directorSignatureUrl || data.cashierSignatureUrl)}" alt="Cashier Sign" class="dps-sign-img" />
            ` : `
              <div class="dps-sign-manual-space"></div>
            `}
            <span class="dps-sign-title">${escapeHtml(data.cashierTitle || "Cashier / Clerk")}</span>
            <span class="dps-sign-role">Accounts</span>
          </div>
        ` : ""}
        ${(data.signatoryMode !== "cashier_only") ? `
          <div class="dps-sign-block">
            ${data.showDigitalSignature && data.principalSignatureUrl ? `
              <img src="${escapeHtml(data.principalSignatureUrl)}" alt="Principal Signature" class="dps-sign-img" />
            ` : `
              <div class="dps-sign-manual-space"></div>
            `}
            <span class="dps-sign-title">${escapeHtml(data.principalName || "Principal")}</span>
            <span class="dps-sign-role">${escapeHtml(data.principalTitle || "Principal (Sign & Seal)")}</span>
          </div>
        ` : ""}
      </div>
    </div>
  </div>
  `;
}

/**
 * Generates an A4 sheet containing exactly 4 receipts in a 2x2 grid
 * divided into 4 equal A6 quadrants (105mm × 148.5mm) with dashed scissor cut lines
 * and equal symmetrical padding on all 4 sides of each cut slip.
 */
export function generate4in1A4PageHtml(receipts4: any[]): string {
  const normalized = (Array.isArray(receipts4) ? receipts4 : [receipts4]).filter(Boolean).map(item => {
    if (item && typeof item === "object" && "data" in item && item.data) {
      return item as { data: DpsReceiptData; copyTitle?: string };
    }
    return { data: item as DpsReceiptData, copyTitle: "" };
  });

  const padded = [
    ...normalized.slice(0, 4),
    ...Array.from({ length: Math.max(0, 4 - normalized.length) }, () => null),
  ];

  return `
    <div class="dps-4in1-page">
      <!-- Precision Cross Cut Marks (Horizontal & Vertical Center Guides with Scissor Icons) -->
      <div class="dps-cut-line-h" aria-hidden="true">
        <span class="dps-cut-scissor left">✂</span>
        <span class="dps-cut-label">CUT HERE • यहाँ से काटें</span>
        <span class="dps-cut-scissor right">✂</span>
      </div>
      <div class="dps-cut-line-v" aria-hidden="true">
        <span class="dps-cut-scissor top">✂</span>
        <span class="dps-cut-scissor bottom">✂</span>
      </div>
      <div class="dps-cut-center-cross" aria-hidden="true">+</div>

      ${padded.map((item, idx) =>
        item && item.data
          ? `
        <div class="dps-4in1-cell dps-quadrant-${idx + 1}">
          ${generateDpsReceiptHtml(item.data, { layout: "compact", copyTitle: item.copyTitle })}
        </div>
      `
          : `
        <div class="dps-4in1-cell dps-quadrant-${idx + 1} dps-4in1-empty">
          <div class="dps-empty-slot-box"></div>
        </div>
      `
      ).join("")}
    </div>
  `;
}

/**
 * Generates an A4 sheet containing exactly 6 receipts in a 2x3 grid (Super Saver format).
 */
export function generate6in1A4PageHtml(receipts6: { data: DpsReceiptData; copyTitle?: string }[]): string {
  return `
    <div class="dps-6in1-page">
      ${receipts6.map(item => `
        <div class="dps-6in1-cell">
          ${generateDpsReceiptHtml(item.data, { layout: "mini", copyTitle: item.copyTitle })}
        </div>
      `).join("")}
      ${Array.from({ length: Math.max(0, 6 - receipts6.length) }).map(() => `
        <div class="dps-6in1-cell dps-6in1-empty"></div>
      `).join("")}
    </div>
  `;
}

/**
 * Generates a standalone single A6 Fee Demand Slip (105mm × 148.5mm, 1/4th of an A4 sheet)
 * specifically designed for mobile viewing, instant NSTA Messenger delivery, and A6 direct printing.
 */
export function generateSingleA6SlipHtml(
  data: DpsReceiptData,
  options?: { copyTitle?: string; showWatermark?: boolean }
): string {
  const isDueDemand =
    data.counterNo === "DUE-DEMAND" ||
    /DUE|DEMAND|मांग|बकाया/i.test(data.receiptTitle || "") ||
    Number(data.balanceDue || 0) > 0;
  const defaultTitle = isDueDemand
    ? "FEE DEMAND SLIP (मांग पर्ची)"
    : "OFFICIAL FEE RECEIPT (रसीद)";

  return `
    <div class="dps-a6-standalone-wrapper">
      <div class="dps-4in1-cell dps-a6-card" style="width: 105mm; min-height: 148.5mm; max-height: 148.5mm; margin: 0 auto; box-sizing: border-box; overflow: hidden; background: #ffffff; border: 1.5px solid #000000; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        ${generateDpsReceiptHtml(data, {
          layout: "compact",
          copyTitle: options?.copyTitle || defaultTitle,
        })}
      </div>
    </div>
  `;
}

/**
 * Direct print helper for standalone A6 Fee Demand Slip (105mm x 148.5mm portrait)
 */
export function printA6SlipDirect(
  data: DpsReceiptData,
  options?: { copyTitle?: string }
): void {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="hi">
      <head>
        <meta charset="utf-8" />
        <title>A6 Slip - ${data.studentName} (${data.className || "Class"})</title>
        <style>
          @page {
            size: 105mm 148.5mm portrait;
            margin: 0mm;
          }
          ${DPS_RECEIPT_CSS}
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 105mm !important;
            height: 148.5mm !important;
            background: #ffffff !important;
          }
          .dps-a6-standalone-wrapper {
            width: 105mm !important;
            height: 148.5mm !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .dps-a6-card {
            border: none !important;
            box-shadow: none !important;
            width: 105mm !important;
            height: 148.5mm !important;
            max-height: 148.5mm !important;
          }
        </style>
      </head>
      <body>
        ${generateSingleA6SlipHtml(data, options)}
      </body>
    </html>
  `;
  printReceiptHtmlInIframe(htmlContent, `A6 Slip - ${data.studentName}`);
}

/**
 * Common CSS Stylesheet for printing and previewing the DPS Fee Receipt (both Full, 4-in-1, and 6-in-1 A4 sheet).
 */
export const DPS_RECEIPT_CSS = `
  @page {
    size: A4 portrait;
    margin: 0mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #000000;
    background: #ffffff;
  }

  /* ════════════════════════════════════════════════════════════════════
     4-IN-1 A4 GRID: 4 EXACT EQUAL QUADRANTS (105mm × 148.5mm EACH)
     WITH DASHED SCISSOR CUT LINES & EQUAL 4-SIDE MARGINS ON EACH SLIP
     ════════════════════════════════════════════════════════════════════ */
  .dps-4in1-page {
    position: relative;
    width: 210mm;
    height: 297mm;
    max-height: 297mm;
    display: grid;
    grid-template-columns: 105mm 105mm;
    grid-template-rows: 148.5mm 148.5mm;
    gap: 0;
    page-break-after: always;
    break-after: page;
    page-break-inside: avoid;
    break-inside: avoid;
    box-sizing: border-box;
    margin: 0 auto;
    padding: 0;
    background: #ffffff;
    overflow: hidden;
  }
  .dps-4in1-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .dps-4in1-cell {
    position: relative;
    box-sizing: border-box;
    width: 105mm;
    height: 148.5mm;
    max-height: 148.5mm;
    padding: 2.5mm 2.8mm;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    overflow: hidden;
    z-index: 1;
  }
  .dps-empty-slot-box {
    width: 100%;
    height: 100%;
    border: 1px dashed #cbd5e1;
    background: #f8fafc;
  }

  /* Scissor & Dashed Cutting Guides at Exact Center (50% Horizontal & 50% Vertical) */
  .dps-cut-line-h {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 0;
    border-top: 1.2px dashed #64748b;
    transform: translateY(-50%);
    z-index: 5;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .dps-cut-line-v {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1.2px dashed #64748b;
    transform: translateX(-50%);
    z-index: 5;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .dps-cut-scissor {
    background: #ffffff;
    color: #334155;
    font-size: 10px;
    line-height: 1;
    padding: 1px 2px;
    font-weight: 700;
  }
  .dps-cut-scissor.left {
    margin-left: 1.2mm;
  }
  .dps-cut-scissor.right {
    margin-right: 1.2mm;
    transform: scaleX(-1);
  }
  .dps-cut-scissor.top {
    margin-top: 1.2mm;
    transform: rotate(90deg);
  }
  .dps-cut-scissor.bottom {
    margin-bottom: 1.2mm;
    transform: rotate(-90deg);
  }
  .dps-cut-label {
    background: #ffffff;
    color: #64748b;
    font-size: 6px;
    font-weight: 700;
    letter-spacing: 0.5px;
    padding: 0 4px;
    margin-right: 26%;
    text-transform: uppercase;
  }
  .dps-cut-center-cross {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    background: #ffffff;
    color: #334155;
    font-size: 10px;
    font-weight: 700;
    line-height: 12px;
    text-align: center;
    z-index: 6;
    pointer-events: none;
  }

  /* ════════════════════════════════════════════════════════════════════
     6-IN-1 A4 GRID (2 COLUMNS × 3 ROWS = 6 RECEIPTS PER A4 PAGE - SUPER SAVER)
     ════════════════════════════════════════════════════════════════════ */
  .dps-6in1-page {
    width: 200mm;
    height: 288mm;
    max-height: 288mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr 1fr;
    gap: 2mm;
    page-break-after: always;
    break-after: page;
    box-sizing: border-box;
    margin: 0 auto;
    background: #ffffff;
    overflow: hidden;
  }
  .dps-6in1-page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  .dps-6in1-cell {
    position: relative;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    max-height: 94mm;
    overflow: hidden;
  }
  .dps-6in1-empty {
    border: 1px dashed #cbd5e1;
    background: #f8fafc;
  }

  /* ════════════════════════════════════════════════════════════════════
     STANDARD / FULL-PAGE CARD
     ════════════════════════════════════════════════════════════════════ */
  .dps-receipt-card {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    background: #ffffff;
    border: 1.5px solid #0f172a;
    font-size: 11.5px;
    line-height: 1.35;
    color: #0f172a;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }
  .dps-tabular {
    font-variant-numeric: tabular-nums;
  }

  /* Header Box */
  .dps-header {
    display: flex;
    align-items: center;
    padding: 10px 14px 8px;
    gap: 12px;
    background: #ffffff;
  }
  .dps-logo-col {
    width: 64px;
    height: 74px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dps-logo-img {
    max-width: 62px;
    max-height: 72px;
    object-fit: contain;
  }
  .dps-school-info {
    flex: 1;
    text-align: center;
    padding-right: 10px;
    min-width: 0;
  }
  .dps-school-name {
    margin: 0 0 3px 0;
    font-size: 22px;
    font-weight: 900;
    color: #0f172a;
    letter-spacing: 0.2px;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.12;
  }
  .dps-school-address {
    margin: 0;
    font-size: 11px;
    color: #1e293b;
    font-weight: 600;
    line-height: 1.25;
  }

  /* Shaded Section Banners */
  .dps-banner {
    background: #e2e8f0 !important;
    background-color: #e2e8f0 !important;
    border-top: 1.4px solid #0f172a;
    border-bottom: 1.4px solid #0f172a;
    padding: 4px 10px;
    text-align: center;
    font-weight: 900;
    font-size: 11px;
    letter-spacing: 0.5px;
    color: #0f172a;
    text-transform: uppercase;
    font-family: Arial, Helvetica, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .dps-copy-tag {
    font-size: 10px;
    font-weight: 900;
    color: #1e293b;
    letter-spacing: 0.4px;
  }

  /* Metadata Grid: 2 Balanced Columns */
  .dps-meta-grid {
    display: flex;
    align-items: flex-start;
    padding: 8px 14px;
    border-bottom: 1.2px solid #0f172a;
    gap: 14px;
    background: #ffffff;
  }
  .dps-meta-col {
    display: flex;
    flex-direction: column;
    gap: 3.5px;
    min-width: 0;
  }
  .dps-meta-col-left {
    flex: 1.18;
  }
  .dps-meta-col-right {
    flex: 0.95;
  }
  .dps-meta-row {
    display: flex;
    align-items: baseline;
    font-size: 11px;
    line-height: 1.32;
  }
  .dps-label {
    width: 68px;
    flex-shrink: 0;
    font-weight: 700;
    color: #334155;
  }
  .dps-colon {
    width: 10px;
    flex-shrink: 0;
    text-align: center;
    font-weight: 800;
    color: #0f172a;
  }
  .dps-val {
    flex: 1;
    color: #0f172a;
    min-width: 0;
    word-break: break-word;
  }
  .dps-student-name-val {
    font-size: 12px;
    color: #000000;
  }
  .font-bold { font-weight: 800; }
  .font-semibold { font-weight: 700; }
  .uppercase { text-transform: uppercase; }

  /* Last Paid & Last Due Summary Strip (Demand Slips) */
  .dps-history-strip {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1.2px solid #0f172a;
    background: #f8fafc;
  }
  .dps-history-cell {
    padding: 6px 14px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dps-history-paid {
    border-right: 1.2px solid #0f172a;
    background: #f0fdf4;
  }
  .dps-history-due.has-due {
    background: #fff1f2;
  }
  .dps-history-due.is-clear {
    background: #f8fafc;
  }
  .dps-history-kicker {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.3px;
    text-transform: uppercase;
    color: #334155;
  }
  .dps-history-paid .dps-history-kicker {
    color: #166534;
  }
  .dps-history-due.has-due .dps-history-kicker {
    color: #9f1239;
  }
  .dps-history-main {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
    flex-wrap: wrap;
  }
  .dps-history-amt {
    font-size: 13.5px;
    font-weight: 900;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
  }
  .dps-history-paid .dps-history-amt {
    color: #14532d;
  }
  .dps-history-due.has-due .dps-history-amt {
    color: #be123c;
  }
  .dps-history-date {
    font-size: 10px;
    font-weight: 700;
    color: #1e293b;
    font-variant-numeric: tabular-nums;
  }
  .dps-history-due.has-due .dps-history-date {
    color: #881337;
  }

  /* Elastic Itemized Fee Table */
  .dps-table-container {
    flex: 1;
    min-height: 90px;
    display: flex;
    flex-direction: column;
    padding: 0;
    background: #ffffff;
  }
  .dps-fee-table {
    width: 100%;
    height: auto;
    table-layout: fixed;
    border-collapse: collapse;
    font-size: 11px;
  }
  .dps-fee-table thead th {
    background: #f1f5f9;
    border-bottom: 1.2px solid #0f172a;
    border-right: 1px solid #475569;
    padding: 4px 6px;
    font-weight: 800;
    color: #0f172a;
    font-size: 10px;
    vertical-align: middle;
  }
  .dps-fee-table thead th:last-child {
    border-right: none;
  }
  .dps-fee-table tbody td {
    padding: 4px 6px;
    border-right: 1px solid #475569;
    color: #0f172a;
    font-size: 10.5px;
    vertical-align: middle;
    line-height: 1.25;
  }
  .dps-fee-table tbody td:last-child {
    border-right: none;
  }
  .fee-data-row {
    height: auto !important;
    border-bottom: 1px solid #cbd5e1;
  }
  .dps-filler-row {
    display: none;
  }
  .dps-filler-row td {
    padding: 0 6px !important;
    border-bottom: none;
  }
  .th-sl, .td-sl, .col-sl {
    width: 32px;
    text-align: center;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .th-desc, .td-desc, .col-desc {
    text-align: left;
    padding-left: 10px !important;
  }
  .th-con, .td-con, .col-con {
    width: 60px;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .th-num, .td-num, .col-due, .col-paid, .col-num {
    width: 86px;
    text-align: right;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .th-demand-amt, .td-demand-amt, .col-demand-amt {
    width: 96px;
    white-space: nowrap;
  }

  /* Pay Mode Information (Paid Receipts) */
  .dps-paymode-grid {
    padding: 6px 14px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 11px;
    border-bottom: 1px solid #0f172a;
    background: #ffffff;
  }
  .dps-pay-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .dps-pay-field {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .dps-pay-label {
    width: 62px;
    font-weight: 600;
    color: #334155;
  }
  .dps-pay-val {
    font-weight: 800;
    color: #0f172a;
  }

  /* Grand Total & Net Payable Row */
  .dps-grand-total-row {
    padding: 6px 14px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1.4px solid #0f172a;
    border-bottom: 1.2px solid #0f172a;
    font-size: 13px;
    font-weight: 900;
    color: #0f172a;
    background: #f1f5f9;
  }
  .dps-grand-total-row.is-due-highlight {
    background: #fef2f2;
    color: #881337;
  }
  .dps-grand-total-row .grand-val {
    font-size: 15.5px;
    font-weight: 900;
    color: #0f172a;
  }
  .dps-grand-total-row.is-due-highlight .grand-val {
    color: #9f1239;
  }
  .dps-balance-due-row {
    background: #fff1f2;
    border-bottom: 1px solid #0f172a;
    color: #9f1239;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 14px;
    font-size: 11.5px;
    font-weight: 800;
  }

  /* Total in Words */
  .dps-words-box {
    padding: 5px 14px;
    border-bottom: 1.2px solid #0f172a;
    font-size: 10.5px;
    color: #0f172a;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #ffffff;
  }
  .dps-words-box strong {
    font-weight: 800;
  }
  .dps-words-subnote {
    font-size: 9px;
    color: #b91c1c;
    font-weight: 700;
  }

  /* Parent Payment Promise Box (Demand Slips Only) */
  .dps-parent-promise-box {
    border-bottom: 1.2px solid #0f172a;
    background: #fffbeb;
    color: #0f172a;
  }
  .dps-promise-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    padding: 3.5px 14px;
    background: #fef3c7;
    border-bottom: 1px dashed #64748b;
    font-size: 9.5px;
    font-weight: 900;
    letter-spacing: 0.2px;
    color: #0f172a;
  }
  .dps-promise-note {
    font-size: 9px;
    font-weight: 700;
    color: #334155;
  }
  .dps-promise-grid {
    display: flex;
    align-items: stretch;
  }
  .dps-promise-col {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 6px 14px 8px;
    gap: 6px;
  }
  .dps-promise-date-col {
    flex: 1.08;
    border-right: 1px dashed #475569;
  }
  .dps-promise-sign-col {
    flex: 1;
  }
  .dps-promise-label {
    font-size: 10px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }
  .dps-promise-date-slots {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    padding-top: 6px;
    font-size: 12px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1;
  }
  .dps-date-blank {
    display: inline-block;
    width: 34px;
    height: 16px;
    border-bottom: 1.4px solid #0f172a;
  }
  .dps-date-sep {
    font-weight: 900;
    color: #334155;
    padding-bottom: 1px;
  }
  .dps-date-year {
    display: inline-flex;
    align-items: flex-end;
    font-weight: 900;
    color: #0f172a;
  }
  .dps-date-blank-yr {
    display: inline-block;
    width: 26px;
    height: 16px;
    border-bottom: 1.4px solid #0f172a;
    margin-left: 1px;
  }
  .dps-promise-sign-line {
    width: 100%;
    height: 20px;
    border-bottom: 1.4px dotted #0f172a;
  }

  /* Footer */
  .dps-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 14px 8px;
    gap: 10px;
    background: #ffffff;
  }
  .dps-footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dps-qr-code {
    width: 58px;
    height: 58px;
    object-fit: contain;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    shape-rendering: crispEdges;
    border: 1.2px solid #0f172a;
    padding: 2px;
    background: #ffffff;
    display: block;
    flex-shrink: 0;
  }
  .dps-qr-caption {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .dps-note-text {
    font-size: 10px;
    font-weight: 800;
    color: #0f172a;
  }
  .dps-note-sub {
    font-size: 9px;
    font-weight: 600;
    color: #334155;
    line-height: 1.2;
  }
  .dps-upi-pay-box {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.2px dashed #0f766e;
    background: #f0fdfa;
    padding: 4px 8px;
    border-radius: 4px;
  }
  .dps-upi-qr {
    border-color: #0f766e;
    width: 52px;
    height: 52px;
  }
  .dps-upi-placeholder {
    width: 50px;
    height: 50px;
    border: 1px dashed #0f766e;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 8px;
    font-weight: 900;
    color: #0f766e;
    line-height: 1.15;
    padding: 2px;
    flex-shrink: 0;
  }
  .dps-upi-meta {
    text-align: left;
    line-height: 1.2;
  }
  .dps-upi-title {
    font-size: 9px;
    font-weight: 900;
    color: #0f766e;
    text-transform: uppercase;
  }
  .dps-upi-amt {
    font-size: 11.5px;
    font-weight: 900;
    color: #0f172a;
  }
  .dps-upi-id {
    font-size: 8px;
    font-family: monospace;
    font-weight: 700;
    color: #334155;
  }
  .dps-footer-right {
    text-align: right;
    display: flex;
    justify-content: flex-end;
    align-items: flex-end;
  }
  .dps-sign-block {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    min-width: 78px;
  }
  .dps-sign-img {
    height: 26px;
    max-width: 95px;
    object-fit: contain;
    margin-bottom: 2px;
  }
  .dps-sign-manual-space {
    width: 74px;
    height: 22px;
    border-bottom: 1px solid #334155;
    margin-bottom: 3px;
  }
  .dps-sign-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.15;
  }
  .dps-sign-role {
    font-size: 8px;
    font-weight: 700;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  /* ════════════════════════════════════════════════════════════════════
     COMPACT 4-IN-1 A4 SLIP STYLES (FULL-QUADRANT 99.4mm × 143.5mm CLARITY)
     ════════════════════════════════════════════════════════════════════ */
  .dps-receipt-card.is-compact {
    width: 100% !important;
    max-width: 100% !important;
    height: 100%;
    max-height: 143.5mm;
    border: 1.3px solid #0f172a;
    font-size: 9.2px;
    line-height: 1.25;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .is-compact .dps-header {
    padding: 5px 8px 4px;
    gap: 8px;
  }
  .is-compact .dps-logo-col {
    width: 40px;
    height: 44px;
  }
  .is-compact .dps-logo-col svg,
  .is-compact .dps-logo-img {
    max-width: 40px;
    max-height: 44px;
  }
  .is-compact .dps-school-info {
    padding-right: 4px;
  }
  .is-compact .dps-school-name {
    font-size: 15px;
    margin: 0 0 2px 0;
    font-weight: 900;
    line-height: 1.12;
  }
  .is-compact .dps-school-address {
    font-size: 8.5px;
    line-height: 1.2;
    font-weight: 600;
  }
  .is-compact .dps-banner {
    padding: 3px 6px;
    font-size: 8.8px;
    letter-spacing: 0.35px;
    border-top-width: 1.1px;
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-copy-tag {
    font-size: 8px;
  }
  .is-compact .dps-meta-grid {
    padding: 5px 8px;
    gap: 8px;
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-meta-col {
    gap: 2px;
  }
  .is-compact .dps-meta-row {
    font-size: 9px;
    line-height: 1.28;
  }
  .is-compact .dps-student-name-val {
    font-size: 9.6px;
  }
  .is-compact .dps-label {
    width: 48px;
  }
  .is-compact .dps-colon {
    width: 7px;
  }
  .is-compact .dps-history-strip {
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-history-cell {
    padding: 4px 8px;
    gap: 1.5px;
  }
  .is-compact .dps-history-paid {
    border-right-width: 1.1px;
  }
  .is-compact .dps-history-kicker {
    font-size: 7.4px;
  }
  .is-compact .dps-history-amt {
    font-size: 10.6px;
  }
  .is-compact .dps-history-date {
    font-size: 8.2px;
  }
  .is-compact .dps-table-container {
    min-height: 38px;
    overflow: visible;
  }
  .is-compact .dps-fee-table {
    font-size: 8.8px;
    table-layout: fixed;
  }
  .is-compact .dps-fee-table thead th {
    padding: 3px 5px;
    font-size: 8.4px;
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-fee-table tbody td {
    padding: 3px 5px !important;
    font-size: 8.8px !important;
    vertical-align: middle !important;
    line-height: 1.22 !important;
  }
  .is-compact .th-sl, .is-compact .td-sl, .is-compact .col-sl {
    width: 24px !important;
    text-align: center;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  .is-compact .th-desc, .is-compact .td-desc, .is-compact .col-desc {
    padding-left: 6px !important;
    vertical-align: middle !important;
    word-break: break-word;
  }
  .is-compact .th-con, .is-compact .td-con, .is-compact .col-con {
    width: 38px !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  .is-compact .th-num, .is-compact .td-num, .is-compact .col-due, .is-compact .col-paid, .is-compact .col-num {
    width: 58px !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  .is-compact .th-demand-amt, .is-compact .td-demand-amt, .is-compact .col-demand-amt {
    width: 72px !important;
    font-size: 9.2px !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }
  .is-compact .dps-grand-total-row {
    position: relative;
    z-index: 2;
    flex-shrink: 0;
  }
  .is-compact .dps-paymode-grid {
    padding: 3.5px 8px;
    gap: 2px;
    font-size: 8.6px;
  }
  .is-compact .dps-pay-label {
    width: 48px;
  }
  .is-compact .dps-grand-total-row {
    padding: 4.5px 8px;
    font-size: 10.2px;
    border-top-width: 1.2px;
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-grand-total-row .grand-val {
    font-size: 12.8px;
  }
  .is-compact .dps-balance-due-row {
    padding: 3px 8px;
    font-size: 9.2px;
  }
  .is-compact .dps-words-box {
    padding: 3.5px 8px;
    font-size: 8.2px;
    line-height: 1.22;
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-words-subnote {
    font-size: 7.4px;
  }
  .is-compact .dps-parent-promise-box {
    border-bottom-width: 1.1px;
  }
  .is-compact .dps-promise-header {
    padding: 2.5px 8px;
    font-size: 7.6px;
  }
  .is-compact .dps-promise-note {
    font-size: 7.2px;
  }
  .is-compact .dps-promise-col {
    padding: 4px 8px 5px;
    gap: 3.5px;
  }
  .is-compact .dps-promise-label {
    font-size: 8.2px;
  }
  .is-compact .dps-promise-date-slots {
    padding-top: 3px;
    font-size: 9.6px;
    gap: 3px;
  }
  .is-compact .dps-date-blank {
    width: 24px;
    height: 13px;
    border-bottom-width: 1.2px;
  }
  .is-compact .dps-date-blank-yr {
    width: 19px;
    height: 13px;
    border-bottom-width: 1.2px;
  }
  .is-compact .dps-promise-sign-line {
    height: 16px;
    border-bottom-width: 1.2px;
  }
  .is-compact .dps-footer {
    padding: 4px 8px 5px;
    gap: 6px;
  }
  .is-compact .dps-qr-code {
    width: 42px;
    height: 42px;
    border-width: 1px;
    padding: 1.5px;
  }
  .is-compact .dps-note-text {
    font-size: 8.2px;
  }
  .is-compact .dps-note-sub {
    font-size: 7.2px;
  }
  .is-compact .dps-upi-pay-box {
    gap: 5px;
    padding: 3px 6px;
  }
  .is-compact .dps-upi-qr,
  .is-compact .dps-upi-placeholder {
    width: 40px;
    height: 40px;
    font-size: 6.5px;
  }
  .is-compact .dps-upi-title {
    font-size: 7.4px;
  }
  .is-compact .dps-upi-amt {
    font-size: 9.4px;
  }
  .is-compact .dps-upi-id {
    font-size: 6.6px;
  }
  .is-compact .dps-sign-block {
    min-width: 62px;
  }
  .is-compact .dps-sign-img {
    height: 20px;
    max-width: 68px;
  }
  .is-compact .dps-sign-manual-space {
    width: 58px;
    height: 16px;
    margin-bottom: 2px;
  }
  .is-compact .dps-sign-title {
    font-size: 8px;
  }
  .is-compact .dps-sign-role {
    font-size: 6.8px;
  }

  /* ════════════════════════════════════════════════════════════════════
     6-IN-1 ULTRA-COMPACT (is-mini) STYLING (94mm max-height per receipt)
     ════════════════════════════════════════════════════════════════════ */
  .is-mini.dps-receipt-card {
    border-width: 1px;
    font-size: 6.5px;
    line-height: 1.15;
    max-height: 93mm;
  }
  .is-mini .dps-header {
    padding: 2px 4px 1px;
    gap: 5px;
  }
  .is-mini .dps-logo-col {
    width: 24px;
    height: 28px;
  }
  .is-mini .dps-logo-img,
  .is-mini .dps-logo-col svg {
    max-width: 24px;
    max-height: 28px;
  }
  .is-mini .dps-school-info {
    padding-right: 2px;
  }
  .is-mini .dps-school-name {
    font-size: 10.5px;
    margin-bottom: 0px;
  }
  .is-mini .dps-school-address {
    font-size: 6px;
  }
  .is-mini .dps-banner {
    padding: 1.5px 3px;
    font-size: 6.8px;
    border-top-width: 1px;
    border-bottom-width: 1px;
  }
  .is-mini .dps-copy-tag {
    font-size: 6px;
  }
  .is-mini .dps-meta-grid {
    padding: 2px 4px;
    gap: 4px;
  }
  .is-mini .dps-meta-col {
    gap: 0.5px;
  }
  .is-mini .dps-meta-row,
  .is-mini .dps-student-name-val {
    font-size: 6.5px;
    line-height: 1.15;
  }
  .is-mini .dps-label {
    width: 38px;
  }
  .is-mini .dps-colon {
    width: 5px;
  }
  .is-mini .dps-history-cell {
    padding: 2px 4px;
  }
  .is-mini .dps-history-kicker {
    font-size: 5.5px;
  }
  .is-mini .dps-history-amt {
    font-size: 7.5px;
  }
  .is-mini .dps-history-date {
    font-size: 5.8px;
  }
  .is-mini .dps-fee-table {
    font-size: 6.5px;
  }
  .is-mini .dps-fee-table thead th {
    padding: 1.5px 3px;
    font-size: 6px;
  }
  .is-mini .dps-fee-table tbody td {
    padding: 1.5px 3px;
    font-size: 6.5px;
  }
  .is-mini .th-sl, .is-mini .td-sl {
    width: 18px;
  }
  .is-mini .th-con, .is-mini .td-con {
    width: 26px;
  }
  .is-mini .th-num, .is-mini .td-num,
  .is-mini .th-demand-amt, .is-mini .td-demand-amt {
    width: 44px;
    font-size: 6.8px;
  }
  .is-mini .dps-paymode-grid {
    padding: 1.5px 4px;
    gap: 1px;
    font-size: 6px;
  }
  .is-mini .dps-pay-label {
    width: 34px;
  }
  .is-mini .dps-grand-total-row {
    padding: 2px 4px;
    font-size: 7.2px;
  }
  .is-mini .dps-grand-total-row .grand-val {
    font-size: 8.5px;
  }
  .is-mini .dps-words-box {
    padding: 1.5px 4px;
    font-size: 5.8px;
    line-height: 1.1;
  }
  .is-mini .dps-promise-header {
    padding: 1px 4px;
    font-size: 5.5px;
  }
  .is-mini .dps-promise-note {
    font-size: 5px;
  }
  .is-mini .dps-promise-col {
    padding: 1.5px 4px 2px;
    gap: 1.5px;
  }
  .is-mini .dps-promise-label {
    font-size: 5.8px;
  }
  .is-mini .dps-promise-date-slots {
    padding-top: 2px;
    font-size: 6.8px;
    gap: 2px;
  }
  .is-mini .dps-date-blank {
    width: 16px;
    height: 8px;
  }
  .is-mini .dps-date-blank-yr {
    width: 13px;
    height: 8px;
  }
  .is-mini .dps-promise-sign-line {
    height: 10px;
  }
  .is-mini .dps-footer {
    padding: 2px 4px;
    gap: 4px;
  }
  .is-mini .dps-qr-code,
  .is-mini .dps-upi-qr,
  .is-mini .dps-upi-placeholder {
    width: 26px;
    height: 26px;
    border-width: 1px;
    padding: 0.5px;
  }
  .is-mini .dps-note-text {
    font-size: 5.8px;
  }
  .is-mini .dps-note-sub {
    font-size: 5px;
  }
  .is-mini .dps-sign-manual-space {
    width: 40px;
    height: 10px;
  }
  .is-mini .dps-sign-title {
    font-size: 6px;
  }
  .is-mini .dps-sign-role {
    font-size: 5px;
  }

  @media screen {
    .dps-preview-wrapper {
      padding: 16px;
      background: #e2e8f0;
      display: flex;
      justify-content: center;
    }
    .dps-receipt-card {
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.14);
    }
    .dps-receipt-card.is-compact {
      box-shadow: 0 1px 6px rgba(15, 23, 42, 0.08);
    }
    .dps-4in1-page {
      width: 100%;
      max-width: 794px;
      height: auto;
      max-height: none;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      box-shadow: 0 6px 28px rgba(15, 23, 42, 0.18);
      padding: 0;
      gap: 0;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
    }
    .dps-4in1-cell {
      width: 100%;
      height: 100%;
      max-height: none;
      min-height: 540px;
      padding: 9px 10px;
    }
    .dps-6in1-page {
      width: 100%;
      max-width: 760px;
      height: auto;
      max-height: none;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.18);
      padding: 6px;
      gap: 4px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .dps-6in1-cell {
      max-height: none;
      min-height: auto;
    }
  }

  @media print {
    @page {
      size: A4 portrait;
      margin: 0mm;
    }
    html, body {
      width: 210mm !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }
    .dps-4in1-page {
      width: 210mm !important;
      height: 297mm !important;
      max-height: 297mm !important;
      grid-template-columns: 105mm 105mm !important;
      grid-template-rows: 148.5mm 148.5mm !important;
      gap: 0 !important;
      margin: 0 auto !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      border-radius: 0 !important;
    }
    .dps-4in1-cell {
      width: 105mm !important;
      height: 148.5mm !important;
      max-height: 148.5mm !important;
      min-height: 148.5mm !important;
      padding: 2.5mm 2.8mm !important;
    }
    .dps-receipt-card.is-compact {
      box-shadow: none !important;
      max-height: 143.5mm !important;
    }
    .dps-full-print-page {
      width: 210mm !important;
      height: 297mm !important;
      padding: 12mm !important;
      margin: 0 auto !important;
      box-sizing: border-box !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      page-break-after: always !important;
      break-after: page !important;
    }
    .dps-full-print-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .dps-6in1-page {
      width: 210mm !important;
      height: 297mm !important;
      max-height: 297mm !important;
      margin: 0 auto !important;
      padding: 5mm !important;
      box-shadow: none !important;
      border: none !important;
    }
    .dps-6in1-cell {
      max-height: 94mm !important;
    }
  }
`;

/**
 * Prints 4 receipts per A4 sheet (standard Indian school 4-in-1 format).
 * If 1 student: prints 4 official copies (Student Copy, Office Copy, Accounts Copy, Guardian Copy).
 * If multiple students: chunks them into 4 per A4 page!
 */
export function printReceiptHtmlInIframe(htmlContent: string, title = "Fee Receipt"): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById("nst-receipt-print-iframe");
  if (existing && existing.parentNode) {
    existing.parentNode.removeChild(existing);
  }

  const iframe = document.createElement("iframe");
  iframe.id = "nst-receipt-print-iframe";
  iframe.title = title;
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(htmlContent);
  doc.close();

  let printed = false;
  const runPrint = () => {
    if (printed) return;
    printed = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.warn("Iframe receipt print warning:", err);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 4500);
    }
  };

  iframe.onload = () => setTimeout(runPrint, 350);
  setTimeout(runPrint, 900);
}

/**
 * Prints 4 receipts per A4 sheet (standard Indian school 4-in-1 format).
 * If 1 student: prints 4 official copies (Student Copy, Office Copy, Accounts Copy, Guardian Copy).
 * If multiple students: chunks them into 4 per A4 page!
 */
export function printDpsReceipts4in1(
  receipts: DpsReceiptData[],
  options?: { customTitle?: string }
) {
  let pagesHtml = "";

  if (receipts.length === 1) {
    const r = receipts[0];
    const copies = [
      { data: r, copyTitle: "STUDENT COPY" },
      { data: r, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: r, copyTitle: "ACCOUNTS COPY" },
      { data: r, copyTitle: "PARENT / GUARDIAN COPY" },
    ];
    pagesHtml = generate4in1A4PageHtml(copies);
  } else {
    for (let i = 0; i < receipts.length; i += 4) {
      const chunk = receipts.slice(i, i + 4).map((r, idx) => ({
        data: r,
        copyTitle: `STUDENT #${i + idx + 1}`,
      }));
      pagesHtml += generate4in1A4PageHtml(chunk);
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${options?.customTitle || "Fee Receipts (4-in-1 A4 Sheet)"}</title>
        <style>
          ${DPS_RECEIPT_CSS}
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
  printReceiptHtmlInIframe(htmlContent, options?.customTitle || "Fee Receipts (4-in-1 A4 Sheet)");
}

/**
 * Prints 6 receipts per A4 sheet (2x3 grid Super Saver format).
 */
export function printDpsReceipts6in1(
  receipts: DpsReceiptData[],
  options?: { customTitle?: string }
) {
  let pagesHtml = "";

  if (receipts.length === 1) {
    const r = receipts[0];
    const copies = [
      { data: r, copyTitle: "STUDENT COPY" },
      { data: r, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: r, copyTitle: "ACCOUNTS COPY" },
      { data: r, copyTitle: "PARENT / GUARDIAN COPY" },
      { data: r, copyTitle: "AUDIT / RECORD COPY" },
      { data: r, copyTitle: "EXTRA COUNTER COPY" },
    ];
    pagesHtml = generate6in1A4PageHtml(copies);
  } else {
    for (let i = 0; i < receipts.length; i += 6) {
      const chunk = receipts.slice(i, i + 6).map((r, idx) => ({
        data: r,
        copyTitle: `STUDENT #${i + idx + 1}`,
      }));
      pagesHtml += generate6in1A4PageHtml(chunk);
    }
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${options?.customTitle || "Fee Receipts (6-in-1 Super Saver A4 Sheet)"}</title>
        <style>
          ${DPS_RECEIPT_CSS}
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
    </html>
  `;
  printReceiptHtmlInIframe(htmlContent, options?.customTitle || "Fee Receipts (6-in-1 A4 Sheet)");
}

/**
 * Direct print helper: supports 4-in-1, 6-in-1 (super saver), and full A4 sheet.
 */
export function printDpsReceiptDirect(
  data: DpsReceiptData,
  mode: "4in1" | "6in1" | "full" = "4in1"
) {
  if (mode === "4in1") {
    printDpsReceipts4in1([data]);
    return;
  }
  if (mode === "6in1") {
    printDpsReceipts6in1([data]);
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Fee Receipt - ${data.studentName} - ${data.receiptNo}</title>
        <style>
          ${DPS_RECEIPT_CSS}
        </style>
      </head>
      <body>
        <div class="dps-full-print-page">
          ${generateDpsReceiptHtml(data, { layout: "full" })}
        </div>
      </body>
    </html>
  `;
  printReceiptHtmlInIframe(htmlContent, `Fee Receipt - ${data.studentName}`);
}

/**
 * Common CSS Stylesheet for Mini Thermal POS Roll Printers (80mm / 58mm).
 * Designed for crisp, zero-waste thermal printing with no margins and perfect roll cutting.
 */
export const POS_SLIP_CSS = `
  @page {
    size: 80mm auto;
    margin: 0mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 80mm;
    background: #ffffff;
    color: #000000;
    font-family: 'Courier New', Courier, monospace, system-ui;
    font-size: 11px;
    line-height: 1.3;
  }
  .pos-slip-card {
    width: 76mm;
    margin: 0 auto;
    padding: 3mm 2mm 8mm;
    background: #ffffff;
    color: #000000;
    box-sizing: border-box;
  }
  .pos-header {
    text-align: center;
    margin-bottom: 2mm;
  }
  .pos-school-name {
    font-size: 15px;
    font-weight: 900;
    letter-spacing: 0.5px;
    margin: 0 0 1mm;
    text-transform: uppercase;
    font-family: Arial, Helvetica, sans-serif;
  }
  .pos-school-sub {
    font-size: 9.5px;
    font-weight: 600;
    margin: 0.5mm 0;
    color: #111111;
  }
  .pos-divider-double {
    border-top: 1.5px dashed #000000;
    margin: 2mm 0;
  }
  .pos-divider-single {
    border-top: 1px dashed #444444;
    margin: 1.5mm 0;
  }
  .pos-title-badge {
    text-align: center;
    font-size: 11px;
    font-weight: 900;
    text-transform: uppercase;
    padding: 1mm 0;
    letter-spacing: 0.5px;
    font-family: Arial, Helvetica, sans-serif;
  }
  .pos-status-badge {
    text-align: center;
    font-size: 10px;
    font-weight: 800;
    margin: 1mm 0;
    padding: 1px 4px;
    border: 1px solid #000000;
    display: inline-block;
  }
  .pos-meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    margin: 0.8mm 0;
  }
  .pos-meta-label {
    font-weight: 700;
  }
  .pos-meta-val {
    font-weight: 800;
    text-align: right;
  }
  .pos-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10px;
    margin: 1mm 0;
  }
  .pos-table th {
    border-bottom: 1px dashed #000000;
    padding: 1mm 0.5mm;
    text-align: left;
    font-size: 9.5px;
    font-weight: 800;
  }
  .pos-table td {
    padding: 1mm 0.5mm;
    vertical-align: top;
  }
  .pos-grand-paid {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 900;
    padding: 1.5mm 0;
    border-top: 1.5px solid #000000;
    border-bottom: 1.5px solid #000000;
    margin: 1.5mm 0;
    font-family: Arial, Helvetica, sans-serif;
  }
  .pos-grand-due {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 800;
    padding: 1mm 0;
    border-bottom: 1px dashed #000000;
  }
  .pos-words-box {
    font-size: 9px;
    margin: 1.5mm 0;
    line-height: 1.25;
  }
  .pos-qr-box {
    text-align: center;
    margin: 3mm 0 1.5mm;
  }
  .pos-qr-img {
    width: 85px;
    height: 85px;
    margin: 0 auto;
    display: block;
  }
  .pos-footer-text {
    text-align: center;
    font-size: 8.5px;
    color: #333333;
    margin-top: 2mm;
  }
  @media screen {
    .pos-preview-wrap {
      width: 76mm;
      max-width: 320px;
      margin: 0 auto;
      background: #ffffff;
      box-shadow: 0 6px 25px rgba(0,0,0,0.22);
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      color: #000000;
    }
  }
`;

/**
 * Generates compact, ultra-sharp HTML markup designed for 80mm / 58mm Thermal POS Printers.
 */
export function generatePosSlipHtml(
  data: DpsReceiptData,
  options: DpsReceiptRenderOptions = {}
): string {
  const escapeHtml = (val: unknown) =>
    String(val ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c] as string));

  const totalDue = data.items.reduce((s, it) => s + (Number(it.due) || 0), 0);
  const totalConcession = data.items.reduce((s, it) => s + (Number(it.con) || 0), 0);
  const netPayable = Math.max(0, totalDue - totalConcession);
  const totalPaid = data.items.reduce((s, it) => s + (Number(it.paid) || 0), 0);
  const grandTotal = totalPaid > 0 ? totalPaid : netPayable;
  const totalWords = numberToIndianWords(grandTotal);
  const itemizedRemaining = Math.max(0, netPayable - totalPaid);
  const calculatedBalDue = data.balanceDue !== undefined
    ? Math.max(Number(data.balanceDue), itemizedRemaining)
    : itemizedRemaining;
  const isFullPaid = totalPaid > 0 && calculatedBalDue <= 0 && totalPaid >= netPayable;
  const isPartial = !isFullPaid && totalPaid > 0;

  const cleanSchoolId = data.schoolId || 'school_campus';
  const cleanStudentId = data.studentId || '';
  const cleanRollNo = data.rollNo || '';
  const cleanClassId = data.className || '';
  const cleanStudentName = data.studentName || '';
  const cleanAdmissionNo = data.admissionNo || '';
  const cleanPhone = data.phone || '';

  const qrLoginPrefix = `NSTA-SCHOOL:${[
    encodeURIComponent(cleanSchoolId),
    encodeURIComponent(cleanStudentId),
    encodeURIComponent(cleanRollNo),
    encodeURIComponent(cleanClassId),
    encodeURIComponent(cleanStudentName),
    encodeURIComponent(cleanAdmissionNo),
    encodeURIComponent(cleanPhone)
  ].join(":")}`;

  const cleanSession = formatAcademicSession(data.session);
  const qrVerificationData = `${qrLoginPrefix}\nFEE-RECEIPT\nReceiptNo: ${data.receiptNo}\nAdmNo: ${data.admissionNo}\nStudent: ${data.studentName}\nClass: ${data.className}\nSession: ${cleanSession}\nTotalPaid: ₹${grandTotal}\nDate: ${data.receiptDate}`;
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&format=svg&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;
  const qrHighResPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;

  let effectiveUpiId = (data.upiId || "").trim();
  if (!effectiveUpiId && data.schoolId) {
    const cachedSchools = getSchoolCacheSync<any[]>("nst_schools_local_cache", []);
    const matchedSchool = Array.isArray(cachedSchools) ? cachedSchools.find((s) => s?.id === data.schoolId) : null;
    if (matchedSchool?.upiId) effectiveUpiId = String(matchedSchool.upiId).trim();
  }
  const payableDue = totalPaid === 0 ? netPayable : calculatedBalDue;
  const posUpiUri = effectiveUpiId && payableDue > 0
    ? `upi://pay?pa=${encodeURIComponent(effectiveUpiId)}&pn=${encodeURIComponent((data.schoolName || "School").slice(0, 40))}&am=${payableDue}&cu=INR&tn=${encodeURIComponent(`Fee ${data.admissionNo || data.studentName}`)}`
    : "";
  const posUpiQrSvgUrl = posUpiUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=320x320&format=svg&qzone=1&margin=1&data=${encodeURIComponent(posUpiUri)}`
    : "";

  return `
    <div class="pos-slip-card pos-preview-wrap">
      <!-- School Header -->
      <div class="pos-header">
        <div class="pos-school-name">${escapeHtml(data.schoolName || "School")}</div>
        ${data.schoolAffiliation ? `<div class="pos-school-sub">${escapeHtml(data.schoolAffiliation)}</div>` : ""}
        ${data.schoolAddress ? `<div class="pos-school-sub">${escapeHtml(data.schoolAddress)}</div>` : ""}
        ${data.schoolPhone ? `<div class="pos-school-sub">Helpline: ${escapeHtml(data.schoolPhone)}</div>` : ""}
      </div>

      <div class="pos-divider-double"></div>

      <!-- Slip Title -->
      <div class="pos-title-badge">
        ${escapeHtml(data.receiptTitle || "OFFICIAL FEE PAYMENT RECEIPT")}
      </div>

      <div style="text-align:center;margin:1mm 0;">
        <span class="pos-status-badge">
          ${isFullPaid ? "*** FULL PAID (पूर्ण भुगतान) ***" : isPartial ? "** PARTIAL PAID (आंशिक भुगतान) **" : "* DEMAND SLIP (बकाया विवरण) *"}
        </span>
      </div>

      <div class="pos-divider-single"></div>

      <!-- Receipt Meta -->
      <div class="pos-meta-row">
        <span class="pos-meta-label">${totalPaid === 0 ? "Slip No:" : "Receipt No:"}</span>
        <span class="pos-meta-val">${escapeHtml(data.receiptNo)}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Date &amp; Time:</span>
        <span class="pos-meta-val">${escapeHtml(data.receiptDate)}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Session:</span>
        <span class="pos-meta-val">${escapeHtml(cleanSession)}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Pay Mode:</span>
        <span class="pos-meta-val">${escapeHtml(totalPaid === 0 ? "Payment Pending" : (data.payModeInfo.payMode || "Cash"))}</span>
      </div>

      <div class="pos-divider-single"></div>

      <!-- Student Details -->
      <div class="pos-meta-row">
        <span class="pos-meta-label">Student:</span>
        <span class="pos-meta-val uppercase" style="font-size:11px;">${escapeHtml(data.studentName)}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Class &amp; Roll:</span>
        <span class="pos-meta-val">${escapeHtml(data.className)} | Roll: ${escapeHtml(data.rollNo || "—")}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Adm No:</span>
        <span class="pos-meta-val">${escapeHtml(data.admissionNo)}</span>
      </div>
      <div class="pos-meta-row">
        <span class="pos-meta-label">Installment:</span>
        <span class="pos-meta-val">${escapeHtml(data.installment)}</span>
      </div>

      ${(!isFullPaid && !isPartial) ? (() => {
        const posHist = computeStudentFeeHistorySummary({
          studentId: data.studentId,
          schoolId: data.schoolId,
        });
        const posLastPaid = data.lastPaidAmount !== undefined ? Number(data.lastPaidAmount) : posHist.lastPaidAmount;
        const posLastPaidDate = (data.lastPaidDate || posHist.lastPaidDate || "").trim();
        const posArrearsItem = data.items.find(it => it.id === "arrears" || /arrears|back due/i.test(it.description || ""));
        const posLastDue = data.lastDueAmount !== undefined
          ? Number(data.lastDueAmount)
          : (posArrearsItem ? Number(posArrearsItem.due || 0) : posHist.lastDueAmount);
        const posLastDueDate = (data.lastDueDate || posHist.lastDueDate || "").trim();
        return `
          <div class="pos-divider-single"></div>
          <div class="pos-meta-row">
            <span class="pos-meta-label">Last Paid (पिछला जमा):</span>
            <span class="pos-meta-val">₹${posLastPaid.toLocaleString("en-IN")}${posLastPaid > 0 && posLastPaidDate ? ` (${escapeHtml(posLastPaidDate)})` : ""}</span>
          </div>
          <div class="pos-meta-row">
            <span class="pos-meta-label">Last Due (पिछला बकाया):</span>
            <span class="pos-meta-val">₹${posLastDue.toLocaleString("en-IN")}${posLastDue > 0 && posLastDueDate ? ` (${escapeHtml(posLastDueDate)})` : " (Clear)"}</span>
          </div>
        `;
      })() : ""}

      <div class="pos-divider-single"></div>

      <!-- Itemized Table -->
      <table class="pos-table">
        <thead>
          <tr>
            <th style="width:16px;">#</th>
            <th>Item / Head</th>
            <th style="text-align:right;">Due</th>
            <th style="text-align:right;">Paid</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((it, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight:700;">${escapeHtml(it.description)}</td>
              <td style="text-align:right;">₹${Number(it.due).toLocaleString("en-IN")}</td>
              <td style="text-align:right;font-weight:800;">₹${Number(it.paid).toLocaleString("en-IN")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <!-- Grand Total Bar -->
      <div class="pos-grand-paid">
        <span>${totalPaid === 0 ? "TOTAL DUE:" : "TOTAL PAID:"}</span>
        <span>₹${grandTotal.toLocaleString("en-IN")}</span>
      </div>

      ${totalPaid > 0 && calculatedBalDue > 0 ? `
        <div class="pos-grand-due">
          <span>BALANCE DUE (शेष बकाया):</span>
          <span style="font-weight:900;">₹${calculatedBalDue.toLocaleString("en-IN")}</span>
        </div>
      ` : ""}

      <div class="pos-words-box">
        <strong>In Words:</strong> ${escapeHtml(totalWords)}
        ${totalPaid > 0 && calculatedBalDue > 0 ? `<br/><span style="font-size:8.5px;">* शेष बकाया ₹${calculatedBalDue.toLocaleString("en-IN")} अगले माह के बिल में जुड़ेगा।</span>` : ""}
      </div>

      ${posUpiQrSvgUrl && payableDue > 0 ? `
        <div class="pos-qr-box" style="border:1px dashed #000;padding:2mm;border-radius:4px;">
          <div style="font-size:9px;font-weight:900;margin-bottom:1mm;">SCAN UPI TO PAY ₹${payableDue.toLocaleString("en-IN")}</div>
          <img src="${posUpiQrSvgUrl}" alt="UPI Pay QR" class="pos-qr-img" />
          <div style="font-size:8px;font-weight:700;margin-top:1mm;">UPI: ${escapeHtml(effectiveUpiId)}</div>
        </div>
      ` : `
        <div class="pos-qr-box">
          <img 
            src="${qrSvgUrl}" 
            alt="QR Verification" 
            class="pos-qr-img" 
            onerror="this.onerror=null;this.src='${qrHighResPngUrl}'" 
          />
          <div style="font-size:8px;font-weight:700;margin-top:1mm;">SCAN FOR VERIFICATION</div>
        </div>
      `}

      ${(!isFullPaid && !isPartial) ? `
        <div style="border:1px solid #000000;padding:2mm;margin:2mm 0;border-radius:3px;">
          <div style="font-size:8.5px;font-weight:900;text-align:center;border-bottom:1px dashed #444;padding-bottom:1mm;margin-bottom:1.5mm;">
            अभिभावक वचनबद्धता / PARENT PROMISE
          </div>
          <div style="font-size:9px;font-weight:800;margin-bottom:2.5mm;">
            जमा तिथि (Promise Date): ____ / ____ / 20____
          </div>
          <div style="font-size:9px;font-weight:800;padding-top:1mm;">
            अभिभावक हस्ताक्षर (Sign): ___________________
          </div>
        </div>
      ` : ""}

      <div class="pos-divider-double"></div>

      <!-- Signatory & Disclaimer -->
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:2mm;font-size:9px;">
        <span style="font-size:8px;">Type: ${escapeHtml(totalPaid === 0 ? "DUE-SLIP" : (data.counterNo || "POS"))}</span>
        <div style="text-align:right;">
          ${data.showDigitalSignature && data.principalSignatureUrl ? `
            <img src="${escapeHtml(data.principalSignatureUrl)}" alt="Signature" style="height:18px;max-width:60px;object-fit:contain;display:block;margin-left:auto;" />
          ` : ""}
          <span style="font-weight:800;border-top:1px solid #000000;display:inline-block;padding-top:1px;">
            ${escapeHtml(data.principalName || "Principal")}
          </span>
        </div>
      </div>

      <div class="pos-footer-text">
        *** Thank You • Keep this slip for record ***<br/>
        Computer Generated Official Slip
      </div>
    </div>
  `;
}

/**
 * Direct print helper for Mini Thermal POS Roll Printers (80mm / 58mm).
 */
export function printPosSlipDirect(
  data: DpsReceiptData,
  rollWidthMm: number = 80
) {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>POS Receipt - ${data.studentName} - ${data.receiptNo}</title>
        <style>
          ${POS_SLIP_CSS}
        </style>
      </head>
      <body>
        ${generatePosSlipHtml(data, { rollWidthMm })}
      </body>
    </html>
  `;
  printReceiptHtmlInIframe(htmlContent, `POS Receipt - ${data.studentName}`);
}
