// Helper utilities, SVG crests, and HTML generator for DPS-Style Official School Fee Receipt
// Matches the authentic Delhi Public School fee receipt layout with pixel precision,
// student photo, high-definition vector QR, and 4-in-1 A4 sheet printing (4 receipts per A4 page).

import type { Student, SchoolConfig } from '../../types';

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

  // Balance due & Next Billing details (FIFO multi-month support)
  balanceDue?: number;
  nextMonthEstimatedFee?: number;
  fifoSummary?: string;

  // Payment info
  payModeInfo: PayModeInfo;

  // Remarks & Note
  note?: string; // e.g. "356" or "Monthly fee received"

  // Signature
  showDigitalSignature?: boolean;
  principalSignatureUrl?: string;
  principalName?: string;
  principalTitle?: string;
}

export interface DpsReceiptRenderOptions {
  layout?: "full" | "compact" | "mini"; // "compact" fits 4 on 1 A4 page, "mini" fits 6 on 1 A4 page
  copyTitle?: string; // e.g. "STUDENT COPY", "OFFICE COPY", "ACCOUNTS COPY", "GUARDIAN COPY"
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
 * Resolves the user's authentic saved school logo.
 * Always prefers the user's saved school logo over any platform app logo.
 * Never returns the NSTA app logo for a school.
 */
export function getSavedSchoolLogo(preferredLogo?: string | null): string {
  // 1. If preferredLogo is provided and is a valid custom school logo (NOT an app logo), use it!
  if (preferredLogo && typeof preferredLogo === "string") {
    const cleaned = cleanLogoUrl(preferredLogo);
    if (cleaned && !isAppLogo(cleaned)) {
      return cleaned;
    }
  }

  // 2. Check localStorage for user's saved school logo
  if (typeof localStorage !== "undefined") {
    const active = localStorage.getItem("nst_active_school_logo") || localStorage.getItem("nst_school_logo");
    if (active && typeof active === "string") {
      const cleaned = cleanLogoUrl(active);
      if (cleaned && !isAppLogo(cleaned)) {
        return cleaned;
      }
    }

    // 3. Check cached schools list in localStorage
    try {
      const rawSchools = localStorage.getItem("nst_schools_local_cache");
      if (rawSchools) {
        const schools = JSON.parse(rawSchools);
        if (Array.isArray(schools)) {
          for (const s of schools) {
            if (s?.logoUrl && typeof s.logoUrl === "string") {
              const cleaned = cleanLogoUrl(s.logoUrl);
              if (cleaned && !isAppLogo(cleaned)) {
                return cleaned;
              }
            }
          }
        }
      }
    } catch {}
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

  const escapeHtml = (val: unknown) =>
    String(val ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c] as string));

  const totalDue = data.items.reduce((s, it) => s + (Number(it.due) || 0), 0);
  const totalPaid = data.items.reduce((s, it) => s + (Number(it.paid) || 0), 0);
  const grandTotal = totalPaid > 0 ? totalPaid : totalDue;
  const totalWords = numberToIndianWords(grandTotal);
  const calculatedBalDue = data.balanceDue !== undefined ? Number(data.balanceDue) : Math.max(0, totalDue - totalPaid);

  // Generate Ultra High-Definition Vector SVG / High-Res QR Code URL with NSTA-SCHOOL prefix for instant student login
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

  const qrVerificationData = `${qrLoginPrefix}\nFEE-RECEIPT\nReceiptNo: ${data.receiptNo}\nAdmNo: ${data.admissionNo}\nStudent: ${data.studentName}\nClass: ${data.className}\nSession: ${data.session}\nTotalPaid: ₹${grandTotal}\nDate: ${data.receiptDate}`;
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&format=svg&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;
  const qrHighResPngUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&qzone=1&margin=1&data=${encodeURIComponent(qrVerificationData)}`;

  // Resolve the actual school's logo: explicitly passed -> cached active school logo
  const effectiveLogo = getSavedSchoolLogo(data.schoolLogoUrl);

  const fallbackSvg = generateSchoolCrestSvg(data.schoolName, isMini);

  const logoMarkup = effectiveLogo
    ? `<img src="${escapeHtml(effectiveLogo)}" alt="${escapeHtml(data.schoolName || 'Logo')}" class="dps-logo-img" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='block';" />
       <div class="dps-logo-fallback" style="display:none;width:100%;height:100%;">${fallbackSvg}</div>`
    : fallbackSvg;

  const cardClasses = `dps-receipt-card ${isMini ? "is-mini is-compact" : isCompact ? "is-compact" : ""}`;

  return `
  <div class="${cardClasses}">
    <!-- Top Header with School Logo & Address -->
    <div class="dps-header">
      <div class="dps-logo-col">
        ${logoMarkup}
      </div>
      <div class="dps-school-info">
        <h1 class="dps-school-name">${escapeHtml(data.schoolName || "Nstz")}</h1>
        <p class="dps-school-address">${escapeHtml(data.schoolAddress || "Institutional Academic Campus, Educational Zone")}</p>
      </div>
    </div>

    <!-- Shaded Grey Banner: FEE RECEIPT (+ Copy Tag) -->
    <div class="dps-banner">
      <span>${escapeHtml(data.receiptTitle || "FEE RECEIPT")}</span>
      ${copyTitle ? `<span class="dps-copy-tag">[ ${escapeHtml(copyTitle)} ]</span>` : ""}
    </div>

    <!-- Student & Receipt Metadata Grid with Student Picture Frame -->
    <div class="dps-meta-grid">
      <!-- Left Column -->
      <div class="dps-meta-col dps-meta-col-left">
        <div class="dps-meta-row">
          <span class="dps-label">Receipt No</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold">${escapeHtml(data.receiptNo)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Adm No</span>
          <span class="dps-colon">:</span>
          <span class="dps-val">${escapeHtml(data.admissionNo)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Name</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase font-bold">${escapeHtml(data.studentName)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Installment</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase font-semibold">${escapeHtml(data.installment)}</span>
        </div>
      </div>

      <!-- Right Column -->
      <div class="dps-meta-col dps-meta-col-right">
        <div class="dps-meta-row">
          <span class="dps-label">Date</span>
          <span class="dps-colon">:</span>
          <span class="dps-val">${escapeHtml(data.receiptDate)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Session</span>
          <span class="dps-colon">:</span>
          <span class="dps-val">${escapeHtml(data.session)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">Class</span>
          <span class="dps-colon">:</span>
          <span class="dps-val font-bold">${escapeHtml(data.className)}</span>
        </div>
        <div class="dps-meta-row">
          <span class="dps-label">CounterNo</span>
          <span class="dps-colon">:</span>
          <span class="dps-val uppercase">${escapeHtml(data.counterNo || "FEE-RECEIPT")}</span>
        </div>
      </div>

      <!-- Student Picture Box -->
      <div class="dps-photo-col">
        <div class="dps-photo-box">
          ${data.studentPhotoUrl && data.studentPhotoUrl.trim() !== "" ? `
            <img 
              src="${escapeHtml(data.studentPhotoUrl)}" 
              alt="${escapeHtml(data.studentName)}" 
              class="dps-student-img" 
              onerror="this.style.display='none';this.parentElement.classList.add('photo-fallback');"
            />
          ` : `
            <div class="dps-photo-empty">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>PHOTO</span>
            </div>
          `}
        </div>
      </div>
    </div>

    <!-- Itemized Fee Table with Vertical Column Dividing Lines -->
    <div class="dps-table-container">
      <table class="dps-fee-table">
        <thead>
          <tr>
            <th class="th-sl">Sl.No</th>
            <th class="th-desc">Description</th>
            <th class="th-num">Due</th>
            <th class="th-con">Con</th>
            <th class="th-num">Paid</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map(item => `
            <tr class="fee-data-row">
              <td class="td-sl">${item.slNo}</td>
              <td class="td-desc">${escapeHtml(item.description)}</td>
              <td class="td-num">${Number(item.due).toLocaleString("en-IN")}</td>
              <td class="td-con">${Number(item.con).toLocaleString("en-IN")}</td>
              <td class="td-num font-bold">${Number(item.paid).toLocaleString("en-IN")}</td>
            </tr>
          `).join("")}
          <!-- Spacer empty rows to give authentic ledger vertical rules height -->
          ${Array.from({ length: Math.max(isCompact ? 1 : 2, (isCompact ? 4 : 6) - data.items.length) }).map(() => `
            <tr class="empty-spacer-row">
              <td class="td-sl">&nbsp;</td>
              <td class="td-desc">&nbsp;</td>
              <td class="td-num">&nbsp;</td>
              <td class="td-con">&nbsp;</td>
              <td class="td-num">&nbsp;</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>

    <!-- Shaded Grey Banner: PAY MODE INFORMATION -->
    <div class="dps-banner">
      <span>PAY MODE INFORMATION</span>
    </div>

    <!-- Payment Mode Details Grid -->
    <div class="dps-paymode-grid">
      <div class="dps-pay-row">
        <div class="dps-pay-field">
          <span class="dps-pay-label">Pay Mode</span>
          <span class="dps-pay-val">${escapeHtml(data.payModeInfo.payMode || "Cheque")}</span>
        </div>
        <div class="dps-pay-field text-right">
          <span class="dps-pay-label">Date</span>
          <span class="dps-pay-val">${escapeHtml(data.payModeInfo.date || data.receiptDate)}</span>
        </div>
      </div>
      <div class="dps-pay-row">
        <div class="dps-pay-field">
          <span class="dps-pay-label">Bank</span>
          <span class="dps-pay-val uppercase">${escapeHtml(data.payModeInfo.bank || "HDFC BANK")}</span>
        </div>
        <div class="dps-pay-field text-right">
          <span class="dps-pay-label">Number</span>
          <span class="dps-pay-val font-mono">${escapeHtml(data.payModeInfo.number || "689870,06,07")}</span>
        </div>
      </div>
    </div>

    <!-- Pay Mode Subtotal Bar -->
    <div class="dps-paymode-subtotal">
      <span class="subtotal-label">Total</span>
      <span class="subtotal-val">${grandTotal.toLocaleString("en-IN")}</span>
    </div>

    <!-- Grand Total Bar -->
    <div class="dps-grand-total-row">
      <span class="grand-label">${calculatedBalDue > 0 ? "Total Paid (कुल जमा) :" : "Total :"}</span>
      <span class="grand-val">${grandTotal.toLocaleString("en-IN")}</span>
    </div>

    ${calculatedBalDue > 0 ? `
    <!-- Net Balance Due Bar (अगला बकाया) -->
    <div class="dps-grand-total-row" style="background:#fff1f2;border-top:1px solid #fecdd3;color:#9f1239;display:flex;justify-content:space-between;align-items:center;padding:2px 8px;">
      <span class="grand-label" style="font-weight:800;color:#9f1239;font-size:${isCompact ? '7.5px' : '9.5px'};">Balance Due (शेष अगला बकाया) :</span>
      <span class="grand-val" style="font-weight:900;color:#be123c;font-size:${isCompact ? '8.5px' : '11px'};">₹${calculatedBalDue.toLocaleString("en-IN")}</span>
    </div>
    ` : ""}

    <!-- Total in Words Box -->
    <div class="dps-words-box">
      <strong>Total in Words:</strong>
      <span>${escapeHtml(totalWords)}</span>
      ${calculatedBalDue > 0 ? `
        <div style="margin-top:2px;font-size:${isCompact ? '6.5px' : '8px'};color:#b91c1c;font-weight:700;">
          * शेष बकाया ₹${calculatedBalDue.toLocaleString("en-IN")} अगले महीने के बिल प्रिंट में जुड़ेगा (Balance will carry forward to next billing)
        </div>
      ` : ""}
      ${data.fifoSummary ? `
        <div style="margin-top:1.5px;font-size:${isCompact ? '6px' : '7.5px'};color:#475569;font-style:italic;">
          ${escapeHtml(data.fifoSummary)}
        </div>
      ` : ""}
    </div>

    <!-- Footer: High-Definition Vector QR Code, Note, and Disclaimer -->
    <div class="dps-footer">
      <div class="dps-footer-left">
        <img 
          src="${qrSvgUrl}" 
          alt="Verification QR" 
          class="dps-qr-code" 
          onerror="this.onerror=null;this.src='${qrHighResPngUrl}'" 
        />
        <span class="dps-note-text">Note : ${escapeHtml(data.note || "356")}</span>
      </div>
      <div class="dps-footer-right">
        ${data.showDigitalSignature && data.principalSignatureUrl ? `
          <div class="dps-sign-block">
            <img src="${escapeHtml(data.principalSignatureUrl)}" alt="Principal Signature" class="dps-sign-img" />
            <span class="dps-sign-title">${escapeHtml(data.principalName || "Principal")}</span>
            <span class="dps-sign-role">Authorized Signatory</span>
          </div>
        ` : ""}
        <p class="dps-computer-gen">
          This is a computer generated Receipt. Does not required signature.
        </p>
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
export function generate4in1A4PageHtml(receipts4: { data: DpsReceiptData; copyTitle?: string }[]): string {
  const padded = [
    ...receipts4.slice(0, 4),
    ...Array.from({ length: Math.max(0, 4 - receipts4.length) }, () => null),
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
        item
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
    padding: 6mm;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: center;
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
    font-size: 11px;
    line-height: 1;
    padding: 1px 3px;
    font-weight: 700;
  }
  .dps-cut-scissor.left {
    margin-left: 2mm;
  }
  .dps-cut-scissor.right {
    margin-right: 2mm;
    transform: scaleX(-1);
  }
  .dps-cut-scissor.top {
    margin-top: 2mm;
    transform: rotate(90deg);
  }
  .dps-cut-scissor.bottom {
    margin-bottom: 2mm;
    transform: rotate(-90deg);
  }
  .dps-cut-label {
    background: #ffffff;
    color: #64748b;
    font-size: 6.5px;
    font-weight: 700;
    letter-spacing: 0.6px;
    padding: 0 5px;
    margin-right: 26%;
    text-transform: uppercase;
  }
  .dps-cut-center-cross {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 14px;
    height: 14px;
    background: #ffffff;
    color: #334155;
    font-size: 11px;
    font-weight: 700;
    line-height: 14px;
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
    max-width: 650px;
    margin: 0 auto;
    background: #ffffff;
    border: 1.5px solid #000000;
    font-size: 11px;
    line-height: 1.35;
    color: #000000;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
    box-sizing: border-box;
  }

  /* Header Box */
  .dps-header {
    display: flex;
    align-items: center;
    padding: 10px 14px 8px;
    gap: 14px;
    background: #ffffff;
  }
  .dps-logo-col {
    width: 68px;
    height: 80px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dps-logo-img {
    max-width: 66px;
    max-height: 80px;
    object-fit: contain;
  }
  .dps-school-info {
    flex: 1;
    text-align: center;
    padding-right: 18px;
  }
  .dps-school-name {
    margin: 0 0 3px 0;
    font-size: 21px;
    font-weight: 800;
    color: #000000;
    letter-spacing: 0.2px;
    font-family: 'Times New Roman', Georgia, serif;
    line-height: 1.15;
  }
  .dps-school-address {
    margin: 0;
    font-size: 10.5px;
    color: #000000;
    font-weight: 500;
    letter-spacing: 0.1px;
  }

  /* Shaded Grey Banners */
  .dps-banner {
    background: #d4d4d8 !important;
    background-color: #d1d5db !important;
    border-top: 1.5px solid #000000;
    border-bottom: 1.5px solid #000000;
    padding: 3.5px 6px;
    text-align: center;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.8px;
    color: #000000;
    text-transform: uppercase;
    font-family: Arial, sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .dps-copy-tag {
    font-size: 9.5px;
    font-weight: 900;
    color: #1e293b;
    letter-spacing: 0.5px;
  }

  /* Metadata Grid: 2 Columns + Student Photo Frame */
  .dps-meta-grid {
    display: flex;
    align-items: center;
    padding: 7px 12px;
    border-bottom: 1px solid #000000;
    gap: 12px;
    background: #ffffff;
  }
  .dps-meta-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .dps-meta-col-left {
    flex: 1.1;
  }
  .dps-meta-col-right {
    flex: 1;
  }
  .dps-meta-row {
    display: flex;
    align-items: baseline;
    font-size: 10.5px;
    line-height: 1.35;
  }
  .dps-label {
    width: 78px;
    flex-shrink: 0;
    font-weight: 700;
    color: #000000;
  }
  .dps-colon {
    width: 10px;
    flex-shrink: 0;
    text-align: center;
    font-weight: 700;
    color: #000000;
  }
  .dps-val {
    flex: 1;
    color: #000000;
    word-break: break-word;
  }
  .font-bold { font-weight: 800; }
  .font-semibold { font-weight: 600; }
  .uppercase { text-transform: uppercase; }

  /* Student Photo Box */
  .dps-photo-col {
    width: 64px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .dps-photo-box {
    width: 62px;
    height: 74px;
    border: 1.2px solid #000000;
    background: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
    border-radius: 2px;
  }
  .dps-student-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .dps-photo-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: #64748b;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.5px;
    user-select: none;
  }

  /* Fee Table */
  .dps-table-container {
    padding: 0;
    background: #ffffff;
  }
  .dps-fee-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 10.5px;
  }
  .dps-fee-table thead th {
    background: #ffffff;
    border-bottom: 1.2px solid #000000;
    border-right: 1px solid #475569;
    padding: 3.5px 7px;
    font-weight: 700;
    color: #000000;
    font-size: 10px;
  }
  .dps-fee-table thead th:last-child {
    border-right: none;
  }
  .dps-fee-table tbody td {
    padding: 3.5px 7px;
    border-right: 1px solid #475569;
    color: #000000;
    font-size: 10.5px;
    vertical-align: middle;
  }
  .dps-fee-table tbody td:last-child {
    border-right: none;
  }
  .fee-data-row {
    border-bottom: 1px solid #e2e8f0;
  }
  .th-sl, .td-sl {
    width: 44px;
    text-align: center;
  }
  .th-desc, .td-desc {
    text-align: left;
    padding-left: 10px !important;
  }
  .th-con, .td-con {
    width: 54px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .th-num, .td-num {
    width: 74px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .empty-spacer-row td {
    height: 16px;
    border-bottom: none;
  }

  /* Pay Mode Information */
  .dps-paymode-grid {
    padding: 6px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    font-size: 10.5px;
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
    gap: 12px;
  }
  .dps-pay-label {
    width: 60px;
    font-weight: 500;
    color: #000000;
  }
  .dps-pay-val {
    font-weight: 700;
    color: #000000;
  }

  /* Pay Mode Subtotal Bar */
  .dps-paymode-subtotal {
    background: #d4d4d8 !important;
    background-color: #d1d5db !important;
    border-top: 1px solid #000000;
    border-bottom: 1px solid #000000;
    padding: 3px 12px;
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    font-size: 10.5px;
    color: #000000;
  }

  /* Grand Total Row */
  .dps-grand-total-row {
    padding: 5px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #000000;
    font-size: 12px;
    font-weight: 800;
    color: #000000;
    background: #ffffff;
  }

  /* Total in Words */
  .dps-words-box {
    padding: 5px 12px;
    border-bottom: 1px solid #000000;
    font-size: 10px;
    color: #000000;
    display: flex;
    gap: 5px;
    align-items: baseline;
    background: #ffffff;
  }
  .dps-words-box strong {
    font-weight: 800;
    white-space: nowrap;
  }

  /* Footer */
  .dps-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px 8px;
    gap: 10px;
    background: #ffffff;
  }
  .dps-footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dps-qr-code {
    width: 60px;
    height: 60px;
    object-fit: contain;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    shape-rendering: crispEdges;
    border: 1.2px solid #000000;
    padding: 2px;
    background: #ffffff;
    display: block;
  }
  .dps-note-text {
    font-size: 10px;
    font-weight: 700;
    color: #000000;
  }
  .dps-footer-right {
    flex: 1;
    text-align: right;
  }
  .dps-computer-gen {
    margin: 0;
    font-size: 9px;
    font-weight: 700;
    color: #000000;
    letter-spacing: 0.1px;
  }
  .dps-sign-block {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 3px;
  }
  .dps-sign-img {
    height: 26px;
    max-width: 95px;
    object-fit: contain;
    margin-bottom: 2px;
  }
  .dps-sign-title {
    font-size: 8.5px;
    font-weight: 800;
    color: #000000;
  }
  .dps-sign-role {
    font-size: 7.5px;
    color: #475569;
    text-transform: uppercase;
  }

  /* ════════════════════════════════════════════════════════════════════
     COMPACT 4-IN-1 RECEIPT CARD STYLES (FITS 4 ON 1 A4 SHEET)
     ════════════════════════════════════════════════════════════════════ */
  .dps-receipt-card.is-compact {
    width: 100% !important;
    max-width: 100% !important;
    height: 100%;
    max-height: 136.5mm;
    border: 1.2px solid #000000;
    font-size: 8px;
    line-height: 1.2;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .is-compact .dps-header {
    padding: 3.5px 6px 2.5px;
    gap: 6px;
  }
  .is-compact .dps-logo-col {
    width: 38px;
    height: 44px;
  }
  .is-compact .dps-logo-col svg,
  .is-compact .dps-logo-img {
    max-width: 36px;
    max-height: 44px;
  }
  .is-compact .dps-school-info {
    padding-right: 6px;
  }
  .is-compact .dps-school-name {
    font-size: 13px;
    margin: 0 0 1px 0;
    font-weight: 800;
  }
  .is-compact .dps-school-address {
    font-size: 7.5px;
    line-height: 1.15;
  }
  .is-compact .dps-banner {
    padding: 2px 4px;
    font-size: 8px;
    border-top-width: 1px;
    border-bottom-width: 1px;
  }
  .is-compact .dps-copy-tag {
    font-size: 7.5px;
  }
  .is-compact .dps-meta-grid {
    padding: 3px 6px;
    gap: 6px;
    border-bottom-width: 1px;
  }
  .is-compact .dps-meta-col {
    gap: 1.5px;
  }
  .is-compact .dps-meta-row {
    font-size: 7.5px;
    line-height: 1.25;
  }
  .is-compact .dps-label {
    width: 52px;
  }
  .is-compact .dps-colon {
    width: 8px;
  }
  .is-compact .dps-photo-col {
    width: 38px;
  }
  .is-compact .dps-photo-box {
    width: 36px;
    height: 44px;
    border-width: 1px;
  }
  .is-compact .dps-photo-empty svg {
    width: 14px;
    height: 14px;
  }
  .is-compact .dps-photo-empty span {
    font-size: 6.5px;
  }
  .is-compact .dps-fee-table {
    font-size: 7.5px;
  }
  .is-compact .dps-fee-table thead th {
    padding: 2px 4px;
    font-size: 7px;
  }
  .is-compact .dps-fee-table tbody td {
    padding: 2px 4px;
    font-size: 7.5px;
  }
  .is-compact .th-sl, .is-compact .td-sl {
    width: 30px;
  }
  .is-compact .th-desc, .is-compact .td-desc {
    padding-left: 6px !important;
  }
  .is-compact .th-con, .is-compact .td-con {
    width: 38px;
  }
  .is-compact .th-num, .is-compact .td-num {
    width: 50px;
  }
  .is-compact .empty-spacer-row td {
    height: 8px;
  }
  .is-compact .dps-paymode-grid {
    padding: 2.5px 6px;
    gap: 1.5px;
    font-size: 7.5px;
  }
  .is-compact .dps-pay-label {
    width: 44px;
  }
  .is-compact .dps-paymode-subtotal {
    padding: 2px 6px;
    font-size: 7.8px;
  }
  .is-compact .dps-grand-total-row {
    padding: 2.5px 6px;
    font-size: 8.5px;
  }
  .is-compact .dps-words-box {
    padding: 2.5px 6px;
    font-size: 7px;
    line-height: 1.2;
  }
  .is-compact .dps-footer {
    padding: 3px 6px 4px;
    gap: 6px;
    margin-top: auto;
  }
  .is-compact .dps-qr-code {
    width: 38px;
    height: 38px;
    border-width: 1px;
    padding: 1px;
  }
  .is-compact .dps-note-text {
    font-size: 7.5px;
  }
  .is-compact .dps-computer-gen {
    font-size: 6.5px;
  }
  .is-compact .dps-sign-img {
    height: 18px;
    max-width: 65px;
  }
  .is-compact .dps-sign-title {
    font-size: 7px;
  }
  .is-compact .dps-sign-role {
    font-size: 6px;
  }

  /* ════════════════════════════════════════════════════════════════════
     6-IN-1 ULTRA-COMPACT (is-mini) STYLING (93mm max-height per receipt)
     ════════════════════════════════════════════════════════════════════ */
  .is-mini.dps-receipt-card {
    border-width: 1px;
    font-size: 6.5px;
    line-height: 1.15;
  }
  .is-mini .dps-header {
    padding: 2px 4px 1px;
    gap: 5px;
  }
  .is-mini .dps-logo-col {
    width: 24px;
    height: 28px;
  }
  .is-mini .dps-logo-img {
    max-width: 24px;
    max-height: 28px;
  }
  .is-mini .dps-logo-crest {
    width: 24px;
    height: 28px;
  }
  .is-mini .dps-school-info {
    padding-right: 2px;
  }
  .is-mini .dps-school-name {
    font-size: 10px;
    margin-bottom: 0px;
  }
  .is-mini .dps-school-address {
    font-size: 5.5px;
  }
  .is-mini .dps-banner {
    padding: 1.5px 3px;
    font-size: 7px;
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
  .is-mini .dps-meta-row {
    font-size: 6.5px;
    line-height: 1.15;
  }
  .is-mini .dps-label {
    width: 44px;
  }
  .is-mini .dps-colon {
    width: 6px;
  }
  .is-mini .dps-photo-col {
    width: 26px;
  }
  .is-mini .dps-photo-box {
    width: 24px;
    height: 30px;
    border-width: 1px;
  }
  .is-mini .dps-photo-empty svg {
    width: 10px;
    height: 10px;
  }
  .is-mini .dps-photo-empty span {
    font-size: 5px;
  }
  .is-mini .dps-fee-table {
    font-size: 6.5px;
  }
  .is-mini .dps-fee-table thead th {
    padding: 1px 3px;
    font-size: 5.8px;
  }
  .is-mini .dps-fee-table tbody td {
    padding: 1px 3px;
    font-size: 6.5px;
  }
  .is-mini .th-sl, .is-mini .td-sl {
    width: 18px;
  }
  .is-mini .th-con, .is-mini .td-con {
    width: 24px;
  }
  .is-mini .th-num, .is-mini .td-num {
    width: 36px;
  }
  .is-mini .empty-spacer-row td {
    height: 3px;
  }
  .is-mini .dps-paymode-grid {
    padding: 1px 4px;
    gap: 1px;
    font-size: 6px;
  }
  .is-mini .dps-pay-label {
    width: 34px;
  }
  .is-mini .dps-paymode-subtotal {
    padding: 1px 4px;
    font-size: 6.5px;
  }
  .is-mini .dps-grand-total-row {
    padding: 1.5px 4px;
    font-size: 7.2px;
  }
  .is-mini .dps-words-box {
    padding: 1px 4px;
    font-size: 5.8px;
    line-height: 1.1;
  }
  .is-mini .dps-footer {
    padding: 1.5px 4px;
    gap: 4px;
    margin-top: auto;
  }
  .is-mini .dps-qr-code {
    width: 26px;
    height: 26px;
    border-width: 1px;
    padding: 0.5px;
  }
  .is-mini .dps-note-text {
    font-size: 5.8px;
  }
  .is-mini .dps-computer-gen {
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
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.18);
    }
    .dps-4in1-page {
      width: 100%;
      max-width: 780px;
      height: auto;
      max-height: none;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto;
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.18);
      padding: 0;
      gap: 0;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
    }
    .dps-4in1-cell {
      width: 100%;
      height: auto;
      max-height: none;
      min-height: 360px;
      padding: 14px;
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
      padding: 6mm !important;
    }
    .dps-full-print-page {
      width: 210mm !important;
      height: 297mm !important;
      padding: 14mm !important;
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
export function printDpsReceipts4in1(
  receipts: DpsReceiptData[],
  options?: { customTitle?: string }
) {
  const printWin = window.open("", "_blank", "width=900,height=950");
  if (!printWin) {
    alert("Please allow pop-ups to print 4-in-1 fee receipts.");
    return;
  }

  let pagesHtml = "";

  if (receipts.length === 1) {
    // 1 student: print 4 copies on 1 A4 page
    const r = receipts[0];
    const copies = [
      { data: r, copyTitle: "STUDENT COPY" },
      { data: r, copyTitle: "SCHOOL / OFFICE COPY" },
      { data: r, copyTitle: "ACCOUNTS COPY" },
      { data: r, copyTitle: "PARENT / GUARDIAN COPY" },
    ];
    pagesHtml = generate4in1A4PageHtml(copies);
  } else {
    // Multiple students: chunk into 4 per page
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
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;
  printWin.document.write(htmlContent);
  printWin.document.close();
}

/**
 * Prints 6 receipts per A4 sheet (2x3 grid Super Saver format).
 * If 1 student: prints 6 copies (Student, School, Accounts, Guardian, Audit, Counter Copy).
 * If multiple students: chunks into 6 per A4 page!
 */
export function printDpsReceipts6in1(
  receipts: DpsReceiptData[],
  options?: { customTitle?: string }
) {
  const printWin = window.open("", "_blank", "width=900,height=950");
  if (!printWin) {
    alert("Please allow pop-ups to print 6-in-1 fee receipts.");
    return;
  }

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
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;
  printWin.document.write(htmlContent);
  printWin.document.close();
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

  const printWin = window.open("", "_blank", "width=850,height=900");
  if (!printWin) {
    alert("Please allow pop-ups to print the official fee receipt.");
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
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 250);
          };
        </script>
      </body>
    </html>
  `;
  printWin.document.write(htmlContent);
  printWin.document.close();
}
