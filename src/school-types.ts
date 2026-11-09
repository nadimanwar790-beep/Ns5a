// IIC×NSTA Smart School Ecosystem — Core Types

export type SchoolRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL_SUB_ADMIN' | 'TEACHER' | 'SCHOOL_STUDENT';

export type SubscriptionFeature = 'reading' | 'writing' | 'pdf' | 'mcq';

export type PlanDuration = '1_year' | '2_years' | 'lifetime' | 'monthly' | 'weekly' | '3months' | 'yearly';

export type SubscriptionTier = 'starter_200' | 'growth_500' | 'enterprise_2000' | 'lite' | 'full';

export interface SchoolSubscription {
  reading?: boolean;
  writing?: boolean;
  pdf?: boolean;
  mcq?: boolean;
  isElite?: boolean; // Elite Plan (2× Price) — Unlocks Custom School Curriculum (Class 6-12 Notes, MCQ, PDF & Video Manager)
  customCurriculumEnabled?: boolean; // Direct flag for custom school notes & curriculum power
  expiresAt?: string; // ISO date — plan hard expiry (set on assign)
  monthlyAmount: number;
  paidUntil?: string; // ISO date — subscription paid up to this date
  lastPaidDate?: string; // ISO date — when last payment was received
  lastPaidAmount?: number; // amount received in last payment
  paymentNotes?: string; // admin notes on payment
  status: 'active' | 'inactive' | 'suspended';
  tier?: SubscriptionTier;
  maxStudents?: number; // 200, 500, or 2000 students
  maxTeachers?: number; // 10, 25, or unlimited
  planDuration?: PlanDuration; // duration of last assigned plan
  assignedAt?: string; // ISO date — when plan was last assigned by super admin
}

export const TIER_CONFIG: Record<SubscriptionTier, { name: string; maxStudents: number; maxTeachers: number; monthlyPrice: number; sessionPrice: number; eliteMonthlyPrice: number; eliteSessionPrice: number; badge: string; desc: string }> = {
  starter_200: {
    name: "Basic Plan (200 Students)",
    maxStudents: 200,
    maxTeachers: 10,
    monthlyPrice: 999,
    sessionPrice: 9999,
    eliteMonthlyPrice: 1999, // 2× price for Elite Custom Curriculum
    eliteSessionPrice: 19999,
    badge: "BASIC 200",
    desc: "Upto 200 Students • 10 Teachers • Core Student ERP & Fee Due Register"
  },
  growth_500: {
    name: "Standard Plan (500 Students)",
    maxStudents: 500,
    maxTeachers: 25,
    monthlyPrice: 1999,
    sessionPrice: 19999,
    eliteMonthlyPrice: 3999, // 2× price for Elite Custom Curriculum
    eliteSessionPrice: 39999,
    badge: "STANDARD 500",
    desc: "Upto 500 Students • 25 Teachers • Sub-Admins, QR ID Cards & Admit Cards"
  },
  enterprise_2000: {
    name: "Pro Plan (2000 Students)",
    maxStudents: 2000,
    maxTeachers: 9999,
    monthlyPrice: 3999,
    sessionPrice: 39999,
    eliteMonthlyPrice: 7999, // 2× price for Elite Custom Curriculum
    eliteSessionPrice: 79999,
    badge: "PRO 2000",
    desc: "Upto 2000 Students • Unlimited Staff • Multi-Admins, Full Payroll HRM, Advance Accounts & Website"
  },
  lite: {
    name: "Basic Plan (200 Students)",
    maxStudents: 200,
    maxTeachers: 10,
    monthlyPrice: 999,
    sessionPrice: 9999,
    eliteMonthlyPrice: 1999,
    eliteSessionPrice: 19999,
    badge: "BASIC 200",
    desc: "Upto 200 Students • 10 Teachers • Core Student ERP & Fee Due Register"
  },
  full: {
    name: "Pro Plan (2000 Students)",
    maxStudents: 2000,
    maxTeachers: 9999,
    monthlyPrice: 3999,
    sessionPrice: 39999,
    eliteMonthlyPrice: 7999,
    eliteSessionPrice: 79999,
    badge: "PRO 2000",
    desc: "Upto 2000 Students • Unlimited Staff • Multi-Admins, Full Payroll HRM, Advance Accounts & Website"
  }
};

export const isSchoolEliteCurriculum = (school?: School | null): boolean => {
  if (!school) return false;
  if ((school as any).isElite === true || (school as any).customCurriculumEnabled === true) return true;
  const sub = school.subscription;
  if (!sub) return false;
  // If explicitly active with isElite or customCurriculumEnabled
  if (sub.isElite === true || sub.customCurriculumEnabled === true) return true;
  // If tier name indicates elite
  if (typeof sub.tier === 'string' && sub.tier.toLowerCase().includes('elite')) return true;
  // If monthly amount reflects 2x elite pricing
  if (sub.monthlyAmount && sub.monthlyAmount >= 1999 && sub.status === 'active') {
    // Check if designated elite in paymentNotes or config
    if (sub.paymentNotes?.toLowerCase()?.includes('elite')) return true;
  }
  return false;
};

export const getSchoolMaxStudents = (school?: School | null): number => {
  const tier = school?.subscription?.tier || 'enterprise_2000';
  if (tier && TIER_CONFIG[tier]) return TIER_CONFIG[tier].maxStudents;
  return school?.subscription?.maxStudents || 2000;
};

export const getSchoolMaxTeachers = (school?: School | null): number => {
  const tier = school?.subscription?.tier || 'enterprise_2000';
  if (tier && TIER_CONFIG[tier]) return TIER_CONFIG[tier].maxTeachers;
  return school?.subscription?.maxTeachers || 9999;
};

export interface SchoolProfileCustomField {
  id: string;
  label: string;
  value: string;
}

export type SchoolDocumentKey = "idCard" | "certificate" | "marksheet" | "feeReceipt";
export type SchoolPrintField =
  | "schoolName"
  | "address"
  | "phone"
  | "email"
  | "affiliation"
  | "code"
  | "principalName"
  | "principalPhone"
  | "directorName"
  | "directorPhone"
  | "customFields";
export type SchoolDocumentPrintFields = Partial<Record<SchoolDocumentKey, SchoolPrintField[]>>;

export const DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS: Record<SchoolDocumentKey, SchoolPrintField[]> = {
  idCard: ["schoolName", "affiliation", "address", "phone", "email", "code", "principalName"],
  certificate: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName"],
  marksheet: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName", "directorName"],
  feeReceipt: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName"],
};

export const schoolPrintFieldEnabled = (
  settings: SchoolDocumentPrintFields | undefined,
  document: SchoolDocumentKey,
  field: SchoolPrintField,
) => (settings?.[document] ?? DEFAULT_SCHOOL_DOCUMENT_PRINT_FIELDS[document]).includes(field);

export interface School {
  id: string;
  name: string;
  code: string; // short code e.g. "DPS_DEL"
  address?: string;
  phone?: string;
  email: string;
  affiliation?: string;
  adminEmail: string;
  logoUrl?: string;
  principalName?: string;
  principalPhone?: string;
  directorName?: string;
  directorPhone?: string;
  mobile?: string;
  principalSignatureUrl?: string; // Digital signature image of Principal (Base64 data URL or URL)
  directorSignatureUrl?: string; // Digital signature image of Director / Manager (Base64 data URL or URL)
  customFields?: SchoolProfileCustomField[];
  documentPrintFields?: SchoolDocumentPrintFields;
  idCardFieldSettings?: Record<string, boolean>;
  admissionFieldSettings?: AdmissionFormFieldSettings;
  upiId?: string; // Official School UPI ID for Scan & Pay on Fee Due Slips
  tagline?: string; // Short tagline shown on school card
  bannerColor?: string; // Hex color for card banner
  subscription: SchoolSubscription;
  active: boolean;
  createdAt: string;
  createdBy: string; // super admin uid
  totalStudents?: number;
  totalTeachers?: number;
  // Lock code — only SUPER_ADMIN and SCHOOL_ADMIN know this
  lockCode?: string;
  lockCodeActive?: boolean;
  // School-level lock — set by super admin, blocks all students from logging in
  locked?: boolean;
}

export interface SchoolSession {
  id: string;
  schoolId: string;
  name: string; // e.g. "2026-27"
  startDate: string;
  endDate: string;
  active: boolean;
  createdAt: string;
}

export interface ClassFeeHead {
  id: string;
  name: string; // e.g. "Exam Fee", "ID Card & Belt", "Computer Lab"
  amount: number;
  enabled?: boolean; // If false, hidden & excluded from online admission total
}

export interface ClassAdmissionHeadToggles {
  admissionFee: boolean;
  registrationFee: boolean;
  examinationFee?: boolean; // 6 Exams (P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam)
  republicDayCharge?: boolean;
  independenceDayCharge?: boolean;
  diaryCharge?: boolean;
  idCardCharge?: boolean;
  tieBeltCharge?: boolean;
  developmentCharge?: boolean;
  annualCharges: boolean;
  tuitionFee: boolean;
  cautionMoney: boolean;
  busFee: boolean; // Allows user to select/unselect bus transport on online form
}

export interface ClassFeeStructure {
  admissionFee: number;
  registrationFee?: number;
  examinationFee?: number; // 6 Exams (P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam)
  republicDayCharge?: number;
  independenceDayCharge?: number;
  diaryCharge?: number;
  idCardCharge?: number;
  tieBeltCharge?: number;
  developmentCharge?: number;
  tuitionFee: number;
  cautionMoney: number;
  annualCharges: number;
  developmentFee?: number;
  busFee: number;
  enabledHeads?: Partial<ClassAdmissionHeadToggles>;
  customHeads?: ClassFeeHead[];
}

export type SeniorStream = 'Science' | 'Commerce' | 'Arts';

export interface SchoolClass {
  id: string;
  schoolId: string;
  sessionId: string;
  name: string; // e.g. "Class 6" or "Class 11"
  section?: string; // e.g. "A" or "B"
  stream?: SeniorStream | string; // Stream for Class 11 & 12 (Science, Commerce, Arts)
  classTeacherId?: string;
  defaultFee?: number;
  feeStructure?: ClassFeeStructure;
  createdAt: string;
}

export interface SchoolSubject {
  id: string;
  schoolId: string;
  sessionId: string;
  classId: string;
  name: string; // e.g. "Physics", "Accountancy"
  stream?: SeniorStream | string; // Stream for Senior Secondary subjects
  teacherId?: string;
  createdAt: string;
}

export interface LessonMCQ {
  id: string;
  questionNumber?: string | number;
  question: string;
  statements?: string[];
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface SchoolLesson {
  id: string;
  schoolId: string;
  sessionId: string;
  classId: string;
  subjectId: string;
  title: string;
  order: number;
  readingContent?: string; // HTML/rich text for reading mode
  writingContent?: string; // Board-style content
  pdfUrl?: string;
  mcqs?: LessonMCQ[];
  impNotes?: string; // Important points
  features: {
    readingEnabled: boolean;
    writingEnabled: boolean;
    pdfEnabled: boolean;
    mcqEnabled: boolean;
  };
  createdAt: string;
  createdBy: string;
}

export interface SchoolTeacher {
  id: string; // Firebase Auth UID
  schoolId: string;
  name: string;
  email?: string;
  phone?: string; // Optional internal phone for administrative use only (never displayed to students)
  subjects: string[]; // subject names or IDs
  classes: string[]; // class IDs
  employeeId?: string;
  joinDate: string;
  active: boolean;
  createdAt: string;
  photoUrl?: string; // Teacher portrait picture
  designation?: string; // e.g. "Senior Science Faculty", "TGT Mathematics", "Head of English"
  qualification?: string; // e.g. "M.Sc. (Physics), B.Ed", "B.Tech, CTET"
  experience?: string; // e.g. "8+ Years"
  bio?: string; // Short bio / inspiring message for students
  monthlySalary?: number; // Base or total monthly salary in INR
  salaryStructure?: TeacherSalaryStructure;
  hasReferralIncentive?: boolean; // Admin-granted permission: only teachers with true can see and earn 10% referral incentives
}

export interface TeacherSalaryStructure {
  monthlyBaseSalary: number; // मूल मासिक वेतन (Base Monthly Pay)
  allowanceHra?: number; // मकान किराया भत्ता (HRA)
  allowanceTravel?: number; // यात्रा / वाहन भत्ता (Conveyance Allowance)
  allowanceSpecial?: number; // विशेष प्रोत्साहन भत्ता (Special Allowance)
  deductionPf?: number; // प्रोविडेंट फंड व ईएसआई कटौती (PF / ESI)
  deductionOther?: number; // अन्य मासिक कटौती (Other Deductions)
  netMonthlySalary: number; // कुल शुद्ध मासिक भुगतान (Net Monthly Salary)
  paymentMode?: "Bank Transfer" | "Cash" | "Cheque" | "UPI";
  updatedAt?: string;
}

export interface SchoolStudent {
  id: string; // Firebase Auth UID
  schoolId: string;
  sessionId: string;
  classId: string;
  className?: string;
  section?: string;
  name: string;
  email?: string;
  phone?: string;
  whatsappNo?: string;
  rollNo: string;
  admissionNo?: string;
  gender?: 'male' | 'female' | 'other';
  category?: string; // General, OBC, SC, ST, EWS
  apaarId?: string; // UDISE+ APAAR / PEN No.
  fatherName?: string;
  fatherOccupation?: string;
  fatherPhone?: string; // Father's Calling Mobile
  fatherWhatsapp?: string; // Father's WhatsApp Number
  motherName?: string;
  motherOccupation?: string;
  motherPhone?: string; // Mother's Calling Mobile
  motherWhatsapp?: string; // Mother's WhatsApp Number
  aadhaarNo?: string; // 12-digit student UIDAI Aadhaar Number
  fatherAadhaar?: string; // 12-digit Father's Aadhaar
  motherAadhaar?: string; // 12-digit Mother's Aadhaar
  dateOfBirth?: string;
  bloodGroup?: string;
  address?: string;
  city?: string;
  pincode?: string;
  previousSchool?: string;
  previousMarks?: string;
  submittedDocs?: string[];
  admissionReceiptNo?: string;
  monthlyFee: number;
  baseMonthlyFee?: number;
  joinDate: string;
  active: boolean;
  createdAt: string;
  photoUrl?: string; // Cloud CDN URL of student photo
  iicUid?: string; // linked IIC account UID
  usesBus?: boolean; // whether student avails school bus / transport
  busRoute?: string; // bus route or stop name
  busStop?: string; // boarding / drop stop
  busFee?: number; // custom bus fee if set individually
  religion?: string;
  nationality?: string;
  annualIncome?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  emergencyWhatsapp?: string; // Emergency WhatsApp Number
  identificationMark?: string;
  medicalHistory?: string;
  admissionType?: 'NEW' | 'READMISSION';
  // Teacher Referral & 10% Commission Tracking
  referredByTeacherId?: string;
  referredByTeacherName?: string;
  referralCommissionPct?: number; // Default 10
  referralCommissionScope?: 'admission_only' | 'all_fees';
  referralCommissionDuration?: '1_year' | '2_years' | 'lifetime';
  // Same-Family / Sibling Detection & Discount Tracking
  familyGroupId?: string;
  isSiblingMarked?: boolean;
  siblingStudentIds?: string[];
  siblingDiscountPct?: number;
  siblingDiscountAmount?: number; // Monthly concession amount if applied to monthly fee
  admissionSiblingDiscount?: number; // One-time admission fee concession/discount for sibling
  stream?: SeniorStream | string; // Senior Secondary stream: Science, Commerce, Arts
  fatherQualification?: string;
  motherQualification?: string;
  isOnlyChild?: boolean;
  motherTongue?: string;
  correspondenceAddress?: string;
  isSameAddress?: boolean;
  previousBoard?: string;
  previousTcNo?: string;
  previousTcDate?: string;
  transportModeIfNo?: 'Walking' | 'Guardian';
  transportDistanceKm?: string | number;
  childSensitivity?: boolean;
  childSensitivityRemarks?: string;
  siblingDetails?: Array<{ slNo: number; name: string; relation: string; className: string; rollNo?: string }>;
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  ageOnAprilFirst?: { years: number; months: number; days: number };
  busNumber?: string;
  driverName?: string;
  driverPhone?: string;
  conductorName?: string;
  conductorPhone?: string;
  teacherRemark?: string;
  homeworkStatus?: string;
  awardsAchievements?: string;
  tcIssued?: boolean;
  tcNumber?: string;
  tcDate?: string;
}

// ── CANONICAL CLASS & STREAM CONFIGURATION ──────────────────────────────────
export const CLASS_PRESETS = [
  "Nursery",
  "LKG",
  "UKG",
  "Class 1",
  "Class 2",
  "Class 3",
  "Class 4",
  "Class 5",
  "Class 6",
  "Class 7",
  "Class 8",
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12"
] as const;

export const SENIOR_STREAMS: { id: SeniorStream; label: string; icon: string; desc: string }[] = [
  { id: 'Science', label: 'Science (विज्ञान)', icon: '🔬', desc: 'Physics, Chemistry, Maths, Biology, Computer Science, PE' },
  { id: 'Commerce', label: 'Commerce (वाणिज्य)', icon: '📊', desc: 'Accountancy, Business Studies, Economics, Applied Maths, IP' },
  { id: 'Arts', label: 'Arts / Humanities (कला)', icon: '🎨', desc: 'History, Political Science, Geography, Economics, Hindi, Sociology' },
];

export const isSeniorClass = (className: string = ""): boolean => {
  const clean = (className || "").trim().toLowerCase();
  return (
    clean === "11" ||
    clean === "12" ||
    clean.includes("class 11") ||
    clean.includes("class 12") ||
    clean.includes("11th") ||
    clean.includes("12th") ||
    /\b(11|12|xi|xii)\b/i.test(clean)
  );
};

export const isBoardClass = (className: string = ""): boolean => {
  const clean = (className || "").trim().toLowerCase();
  const is10 = clean === "10" || clean === "x" || clean.includes("class 10") || clean.includes("class x") || clean.includes("10th") || clean.includes("grade 10") || clean.includes("std 10") || clean.includes("tenth");
  const is12 = clean === "12" || clean === "xii" || clean.includes("class 12") || clean.includes("class xii") || clean.includes("12th") || clean.includes("grade 12") || clean.includes("std 12") || clean.includes("twelfth");
  return is10 || is12;
};

export const getClassSortRank = (className: string = "", stream?: string): number => {
  const clean = (className || "").trim().toLowerCase();

  // Play / Pre-Nursery
  if (clean.includes("play") || clean.includes("pre-nur") || clean.includes("prenursery")) return 1;
  // Nursery
  if (clean.includes("nursery") || clean === "nur") return 2;
  // LKG / KG-1
  if (clean.includes("lkg") || clean.includes("kg-1") || clean.includes("kg 1") || clean.includes("jr")) return 3;
  // UKG / KG-2 / Prep
  if (clean.includes("ukg") || clean.includes("kg-2") || clean.includes("kg 2") || clean.includes("prep") || clean.includes("sr")) return 4;

  // Exact number match for 1 to 12
  const numMatch = clean.match(/\b([1-9]|1[0-2])\b/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    let rank = n * 10;
    if (n === 11 || n === 12) {
      const st = (stream || clean).toLowerCase();
      if (st.includes("sci")) rank += 1;
      else if (st.includes("com")) rank += 2;
      else if (st.includes("art") || st.includes("hum")) rank += 3;
    }
    return rank;
  }

  // Fallback digits extraction
  const digits = clean.replace(/\D+/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (n >= 1 && n <= 12) {
      let rank = n * 10;
      if (n === 11 || n === 12) {
        const st = (stream || clean).toLowerCase();
        if (st.includes("sci")) rank += 1;
        else if (st.includes("com")) rank += 2;
        else if (st.includes("art") || st.includes("hum")) rank += 3;
      }
      return rank;
    }
  }

  return 999;
};

export const sortSchoolClasses = <T extends { name: string; section?: string; stream?: string }>(classes: T[]): T[] => {
  if (!Array.isArray(classes)) return [];
  return [...classes].sort((a, b) => {
    const rankA = getClassSortRank(a.name, a.stream);
    const rankB = getClassSortRank(b.name, b.stream);
    if (rankA !== rankB) return rankA - rankB;
    const secA = (a.section || "").trim();
    const secB = (b.section || "").trim();
    if (secA !== secB) return secA.localeCompare(secB);
    return (a.name || "").localeCompare(b.name || "");
  });
};

// ── PRE-CONFIGURED STREAM-WISE & GRADE-WISE SUBJECTS ────────────────────────
export const DEFAULT_CLASS_SUBJECTS: Record<string, string[]> = {
  "Nursery": ["English Rhymes", "Hindi Balgeet", "Pre-Math Numbers", "Drawing & Coloring", "General Awareness"],
  "LKG": ["English Phonics & Writing", "Hindi Akshar Gyan", "Mathematics Basics", "EVS & Nature", "Art & Craft"],
  "UKG": ["English Words & Sentences", "Hindi Shabad Rachna", "Mathematics Add/Sub", "Environmental Awareness", "Creative Arts"],
  "Class 1": ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Our Environment", "Computer Studies", "General Knowledge"],
  "Class 2": ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Our World", "Computer Studies", "General Knowledge"],
  "Class 3": ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer Coding", "General Knowledge"],
  "Class 4": ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer & AI", "General Knowledge"],
  "Class 5": ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer & AI", "General Knowledge"],
  "Class 6": ["English Honeysuckle", "Hindi Vasant", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer Science"],
  "Class 7": ["English Honeycomb", "Hindi Vasant", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer Science"],
  "Class 8": ["English Honeydew", "Hindi Bharat Ki Khoj", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer & Coding"],
  "Class 9": ["English Beehive & Moments", "Hindi Kshitij & Kritika", "Mathematics NCERT", "Science (Physics, Chemistry, Biology)", "Social Science", "Information Technology 402"],
  "Class 10": ["English First Flight & Footprints", "Hindi Kshitij & Kritika", "Mathematics NCERT Standard", "Science (Physics, Chem, Bio)", "Social Science Board", "Information Technology 402"],
  // Stream-wise subjects for 11 & 12
  "Class 11_Science": ["Physics", "Chemistry", "Mathematics", "Biology", "English Core", "Computer Science", "Physical Education"],
  "Class 11_Commerce": ["Accountancy", "Business Studies", "Economics", "English Core", "Applied Mathematics", "Informatics Practices"],
  "Class 11_Arts": ["History", "Political Science", "Geography", "Economics", "English Core", "Hindi Elective", "Sociology"],
  "Class 12_Science": ["Physics", "Chemistry", "Mathematics", "Biology", "English Core", "Computer Science", "Physical Education"],
  "Class 12_Commerce": ["Accountancy", "Business Studies", "Economics", "English Core", "Applied Mathematics", "Informatics Practices"],
  "Class 12_Arts": ["History", "Political Science", "Geography", "Economics", "English Core", "Hindi Elective", "Sociology"],
};

export const getDefaultSubjectsForClass = (className: string, stream?: string): string[] => {
  const clean = (className || "").trim();
  const st = (stream || "").trim().toLowerCase();

  if (isSeniorClass(clean)) {
    const is12 = clean.includes("12") || clean.includes("xii");
    const prefix = is12 ? "Class 12" : "Class 11";
    if (st.includes("sci") || clean.toLowerCase().includes("sci")) {
      return DEFAULT_CLASS_SUBJECTS[`${prefix}_Science`];
    }
    if (st.includes("com") || clean.toLowerCase().includes("com")) {
      return DEFAULT_CLASS_SUBJECTS[`${prefix}_Commerce`];
    }
    if (st.includes("art") || st.includes("hum") || clean.toLowerCase().includes("art")) {
      return DEFAULT_CLASS_SUBJECTS[`${prefix}_Arts`];
    }
    // Default to Science stream if unspecified
    return DEFAULT_CLASS_SUBJECTS[`${prefix}_Science`];
  }

  // Exact lookup
  if (DEFAULT_CLASS_SUBJECTS[clean]) return DEFAULT_CLASS_SUBJECTS[clean];

  // Case-insensitive lookup
  for (const [k, v] of Object.entries(DEFAULT_CLASS_SUBJECTS)) {
    if (clean.toLowerCase() === k.toLowerCase()) return v;
  }

  // Fallback
  return ["English", "Hindi", "Mathematics", "Science", "Social Science", "Computer / IT"];
};

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;
export type BloodGroup = typeof BLOOD_GROUPS[number];

export const ADMISSION_CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"] as const;

export const ADMISSION_DOCUMENT_OPTIONS = [
  "Birth Certificate (जन्म प्रमाण पत्र)",
  "Student Aadhaar Card (छात्र आधार)",
  "Parent Aadhaar Card (अभिभावक आधार)",
  "Transfer Certificate / SLC (टी.सी.)",
  "Previous Marksheet (पिछला अंकपत्र)",
  "Passport Photos (पासपोर्ट फोटो)",
  "Caste / Income Cert. (जाति/आय प्रमाण)",
] as const;

// ATTENDANCE
export interface AttendanceRecord {
  date: string; // "YYYY-MM-DD"
  schoolId: string;
  classId: string;
  sessionId: string;
  markedBy: string; // teacher UID
  students: {
    [studentId: string]: {
      present: boolean;
      name: string;
      rollNo: string;
      note?: string;
      inTime?: string; // e.g. "08:15:30 AM"
      outTime?: string; // e.g. "02:30:15 PM"
      stayDuration?: string; // e.g. "6h 15m"
      status?: "present" | "late" | "half_day" | "absent" | "leave" | "bunk";
      scanType?: "in" | "out";
       /** Timestamp retained by some legacy attendance entries. */
       createdAt?: string;
    };
  };
  createdAt: string;
}

// MARKS
export interface ExamEntry {
  id: string;
  schoolId: string;
  sessionId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  examName: string; // e.g. "Unit Test 1", "Half Yearly"
  examDate: string;
  maxMarks: number;
  markedBy: string;
  studentMarks: {
    [studentId: string]: {
      marks: number;
      absent?: boolean;
      studentName: string;
      rollNo: string;
    };
  };
  createdAt: string;
}

// FEE
export interface MonthlyFee {
  schoolId: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  classId: string;
  month: string; // "YYYY-MM"
  amount: number;
  monthlyAmount?: number;
  arrearsAmount?: number;
  arrearsMonths?: string[];
  paid: boolean;
  paidDate?: string;
  paidBy?: string; // admin UID
  receiptNo?: string;
  note?: string;
  paidAmount?: number;
  lastReceiptPaidAmount?: number;
  lastPaidAmount?: number;
  lastPaidDate?: string;
  lastDueAmount?: number;
  lastDueDate?: string;
  balanceDue?: number;
  concession?: number;
  earlyDiscount?: number;
  isEarlyBirdEligible?: boolean;
  feeType?: 'monthly' | 'admission';
  receiptCategory?: 'monthly' | 'admission';
  includeAdmissionFee?: boolean;
  includeCautionMoney?: boolean;
  includeAnnualCharges?: boolean;
  includeBusFee?: boolean;
  busFeeAmount?: number;
  busRoute?: string;
  admissionBreakdown?: {
    admissionFee: number;
    registrationFee: number;
    developmentFee: number;
    idKitFee: number;
    examFund: number;
    otherCharges?: number;
  };
  payModeInfo?: {
    payMode: string;
    date: string;
    bank: string;
    number: string;
  };
  items?: {
    id: string;
    slNo: number;
    description: string;
    due: number;
    con: number;
    paid: number;
  }[];
  siblingDiscountAmount?: number;
  referredByTeacherId?: string;
  referredByTeacherName?: string;
}

// HOMEWORK
export interface SchoolHomework {
  id: string;
  schoolId: string;
  classId: string;
  subjectId: string;
  subjectName: string;
  title: string;
  description: string;
  dueDate: string;
  assignedBy: string; // teacher UID
  createdAt: string;
}

// LESSON COMPLETION (per teacher class session)
export interface LessonCompletion {
  id: string;
  schoolId: string;
  classId: string;
  lessonId: string;
  lessonTitle: string;
  teacherId: string;
  completedAt: string;
  note?: string;
}

// MCQ RESULT (school context)
export interface SchoolMCQResult {
  id: string;
  schoolId: string;
  classId: string;
  studentId: string;
  studentName: string;
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  score: number;
  total: number;
  percentage: number;
  date: string;
}

// ANALYTICS
export interface SchoolAnalytics {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  averageAttendance: number; // percentage
  feePending: number; // amount
  feeCollected: number;
}

// SUPER ADMIN DASHBOARD
export interface SuperAdminStats {
  totalSchools: number;
  activeSchools: number;
  inactiveSchools: number;
  totalStudents: number;
  totalTeachers: number;
  monthlyRevenue: number;
  pendingRevenue: number;
}

// School User Profile (stored in users/{uid} for school roles)
export interface SchoolUserProfile {
  uid: string;
  schoolId: string;
  role: SchoolRole;
  name: string;
  email: string;
  // For teachers
  teacherRef?: string;
  // For students
  studentRef?: string;
  classId?: string;
  sessionId?: string;
}

// ── ADVANCED 9-MODULE TYPES ──────────────────────────────────────────────────

export interface SchoolNotice {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  type: 'notice' | 'circular' | 'holiday' | 'event';
  audience: 'all' | 'students' | 'teachers';
  date: string;
  createdAt: string;
  createdBy: string;
  attachmentUrl?: string;
  pinned?: boolean;
}

export interface SchoolHoliday {
  id: string;
  schoolId: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  days: number;
  type: 'festival' | 'national' | 'vacation' | 'emergency';
  description?: string;
  createdAt: string;
  createdBy: string;
}

export interface SchoolCertificate {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  className: string;
  fatherName?: string;
  motherName?: string;
  dob?: string;
  certificateType: 'tc' | 'character' | 'bonafide' | 'merit';
  issueDate: string;
  dispatchNo: string;
  reason?: string;
  remarks?: string;
  conduct?: string;
}

export interface ExamTimetableItem {
  subject: string;
  date: string;
  time: string;
  room?: string;
}

export interface SchoolAdmitCardConfig {
  id: string;
  schoolId: string;
  sessionId: string;
  classId: string;
  examName: string;
  centerName: string;
  examStartDate: string;
  examEndDate: string;
  timetable: ExamTimetableItem[];
  instructions: string[];
  createdAt: string;
}

export interface StaffEmployee {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  phone: string;
  designation: string; // e.g. "Senior PGT Teacher", "Lab Assistant", "Accountant"
  department: string;
  employeeId?: string;
  lateEntriesCount?: number;
  joinDate: string;
  monthlySalary: number;
  active: boolean;
  photoUrl?: string;
  address?: string;
  createdAt: string;
}

export interface AccountantPermissions {
  canCollectFee: boolean;
  canAdmitStudents: boolean;
  canGrantDiscount: boolean;
  maxDiscountLimitPct?: number;
  canRecordExpenses: boolean;
  canViewDayBook: boolean;
  canSendFeeAlerts: boolean;
  canManageBusFee: boolean;
  canPrintIdCards: boolean;
  canManageAbsentee?: boolean;
}

export interface StudentAcknowledgedLeave {
  id: string;
  studentId: string;
  schoolId: string;
  studentName?: string;
  rollNo?: string;
  className?: string;
  classId?: string;
  parentName?: string;
  parentPhone?: string;
  reason: string;
  customNotes?: string;
  leaveStartDate: string;
  expectedReturnDate: string;
  recordedBy: string;
  recordedRole: "ADMIN" | "ACCOUNTANT" | "TEACHER";
  recordedAt: string;
  status: "active" | "returned" | "overdue";
}

export interface StudentAbsenteeCallLog {
  id: string;
  studentId: string;
  schoolId: string;
  studentName?: string;
  date: string;
  callerName: string;
  callerRole: "ADMIN" | "ACCOUNTANT" | "TEACHER";
  callTimestamp: string;
  parentRemarks?: string;
  status: "connected" | "not_reachable" | "call_back" | "leave_granted";
}

export interface SchoolAccountant {
  id: string;
  schoolId: string;
  name: string;
  email?: string;
  phone: string;
  employeeId?: string;
  designation?: string;
  joinDate: string;
  active: boolean;
  photoUrl?: string;
  permissions: AccountantPermissions;
  monthlySalary?: number;
  teacherRef?: string;
  createdAt: string;
}

export interface SchoolExpenseVoucher {
  id: string;
  schoolId: string;
  voucherNo: string;
  date: string;
  category: "Stationery" | "Electricity / Utilities" | "Maintenance & Repair" | "Vehicle Fuel & Bus" | "Events & Functions" | "Staff Welfare / Refreshment" | "Other";
  amount: number;
  paidTo: string;
  paymentMode: "Cash" | "UPI" | "Bank Transfer" | "Cheque";
  recordedBy: string;
  description: string;
  createdAt: string;
}

export interface StaffLeave {
  id: string;
  schoolId: string;
  staffId: string;
  staffName: string;
  designation: string;
  leaveType: 'casual' | 'sick' | 'earned' | 'unpaid';
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  approvedBy?: string;
  remarks?: string;
}

export type ReferralCommissionScope = 'admission_only' | 'all_fees';
export type ReferralCommissionDuration = '1_year' | '2_years' | 'lifetime';

export interface SchoolReferralSettings {
  schoolId: string;
  enabled?: boolean;
  defaultCommissionPct: number; // Default 10%
  commissionScope: ReferralCommissionScope; // 'admission_only' or 'all_fees'
  commissionDuration?: ReferralCommissionDuration; // '1_year' | '2_years' | 'lifetime' (Admin controlled)
  excludeTransportFee?: boolean;
  siblingDiscountEnabled?: boolean;
  defaultSiblingDiscountPct: number; // Default 10%
  updatedAt: string;
}

export interface TeacherReferralPayout {
  id: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;
  amount: number;
  paidDate: string; // YYYY-MM-DD or ISO
  paymentMode: string; // Cash, UPI, Bank Transfer, Added to Salary
  referenceNo?: string;
  remarks?: string;
  createdAt: string;
}

// ── ONLINE ADMISSIONS & REGISTRATION ──
export interface AdmissionApplication {
  id: string;
  applicationNo: string; // e.g. "ADM-2026-1042"
  schoolId: string;
  sessionId: string;
  classId: string;
  className: string;
  studentName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  bloodGroup?: string;
  category?: string; // General, OBC, SC, ST
  previousSchool?: string;
  previousMarks?: string;
  photoUrl?: string;
  apaarId?: string;
  fatherName: string;
  fatherOccupation?: string;
  fatherPhone?: string; // Father's Calling Mobile
  fatherWhatsapp?: string; // Father's WhatsApp Number
  motherName: string;
  motherOccupation?: string;
  motherPhone?: string; // Mother's Calling Mobile
  motherWhatsapp?: string; // Mother's WhatsApp Number
  phone: string;
  whatsappNo?: string;
  email?: string;
  aadhaarNo?: string; // 12-digit student Aadhaar number
  fatherAadhaar?: string; // 12-digit Father's Aadhaar
  motherAadhaar?: string; // 12-digit Mother's Aadhaar
  address: string;
  city?: string;
  pincode?: string;
  usesBus?: boolean;
  busRoute?: string;
  busStop?: string;
  busFee?: number;
  submittedDocs?: string[];
  religion?: string;
  nationality?: string;
  annualIncome?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelation?: string;
  emergencyWhatsapp?: string; // Emergency WhatsApp Number
  identificationMark?: string;
  medicalHistory?: string;
  admissionType?: 'NEW' | 'READMISSION';
  fatherQualification?: string;
  motherQualification?: string;
  isOnlyChild?: boolean;
  siblingDetails?: Array<{ slNo: number; name: string; relation: string; className: string }>;
  transportModeIfNo?: 'Walking' | 'Guardian';
  transportDistanceKm?: string | number;
  childSensitivity?: boolean;
  childSensitivityRemarks?: string;
  ageOnAprilFirst?: { years: number; months: number; days: number };
  uploadedDocuments?: Record<string, string>;
  enrolledStudentId?: string;
  monthlyFee?: number;
  admissionFeeDetails?: {
    admissionFee: number;
    registrationFee: number;
    developmentFee: number;
    idKitFee: number;
    examFund: number;
    concession?: number;
    totalPayable: number;
    paidAmount: number;
    balanceDue: number;
    paymentMode: string;
    receiptNo?: string;
    paidDate?: string;
    items?: {
      id: string;
      slNo: number;
      description: string;
      due: number;
      con: number;
      paid: number;
    }[];
  };
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remarks?: string;
  assignedRollNo?: string;
  assignedSection?: string;
  paymentScreenshotUrl?: string;
  transactionRef?: string;
  referredByTeacherId?: string;
  referredByTeacherName?: string;
  familyGroupId?: string;
  isSiblingMarked?: boolean;
  siblingDiscountAmount?: number;
  stream?: SeniorStream | string; // Senior Secondary stream: Science, Commerce, Arts
  motherTongue?: string;
  correspondenceAddress?: string;
  isSameAddress?: boolean;
  previousBoard?: string;
  previousTcNo?: string;
  previousTcDate?: string;
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  parentDeclarationAccepted?: boolean;
}

export interface AdmissionFormFieldSettings {
  // Student Profile
  showAgeOnAprilFirst: boolean;
  showSingleChild: boolean;
  showIdentificationMark: boolean;
  showApaarId: boolean;
  showMotherTongue: boolean;
  showBloodGroup: boolean;
  showCategoryCaste: boolean;
  showReligionNationality: boolean;
  showStudentAadhaar: boolean;
  showMedicalHistory: boolean;

  // Parents Profile
  showFatherQualification: boolean;
  showFatherOccupation: boolean;
  showFatherAadhaar: boolean;
  showFatherPhone: boolean;
  showFatherWhatsapp: boolean;
  showMotherQualification: boolean;
  showMotherOccupation: boolean;
  showMotherAadhaar: boolean;
  showMotherPhone: boolean;
  showMotherWhatsapp: boolean;
  showAnnualIncome: boolean;
  showEmergencyContact: boolean;
  showEmergencyWhatsapp: boolean;

  // Addresses
  showCorrespondenceAddress: boolean;

  // Previous School & TC
  showPreviousSchool: boolean;
  showPreviousTcDetails: boolean;

  // Transport & Child Sensitivity
  showTransportModeIfNo: boolean;
  showTransportDistance: boolean;
  showChildSensitivity: boolean;

  // Sibling Profile
  showSiblingTable: boolean;
  showTeacherReferral: boolean;

  // Bank Account (DBT / Scholarship)
  showBankDetails: boolean;

  // Documents & Payments
  showRequiredDocuments: boolean;
  showPaymentScreenshot: boolean;
  showParentDeclaration: boolean;
}

export const DEFAULT_ADMISSION_FIELD_SETTINGS: AdmissionFormFieldSettings = {
  showAgeOnAprilFirst: true,
  showSingleChild: true,
  showIdentificationMark: true,
  showApaarId: true,
  showMotherTongue: true,
  showBloodGroup: true,
  showCategoryCaste: true,
  showReligionNationality: true,
  showStudentAadhaar: true,
  showMedicalHistory: true,

  showFatherQualification: true,
  showFatherOccupation: true,
  showFatherAadhaar: true,
  showFatherPhone: true,
  showFatherWhatsapp: true,
  showMotherQualification: true,
  showMotherOccupation: true,
  showMotherAadhaar: true,
  showMotherPhone: true,
  showMotherWhatsapp: true,
  showAnnualIncome: true,
  showEmergencyContact: true,
  showEmergencyWhatsapp: true,

  showCorrespondenceAddress: true,

  showPreviousSchool: true,
  showPreviousTcDetails: true,

  showTransportModeIfNo: true,
  showTransportDistance: true,
  showChildSensitivity: true,

  showSiblingTable: true,
  showTeacherReferral: true,

  showBankDetails: true,

  showRequiredDocuments: true,
  showPaymentScreenshot: true,
  showParentDeclaration: true,
};

// ── SCHOOL PUBLIC WEBSITE & PORTAL ──
export interface SchoolSliderSlide {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
}

export interface SchoolGalleryItem {
  id: string;
  schoolId: string;
  title: string;
  category: 'campus' | 'sports' | 'cultural' | 'academic' | 'lab';
  imageUrl: string;
  description?: string;
  date?: string;
}

export interface SchoolEventItem {
  id: string;
  schoolId: string;
  title: string;
  eventType: 'exam' | 'sports' | 'holiday' | 'cultural' | 'meeting';
  startDate: string;
  endDate?: string;
  time?: string;
  location?: string;
  description?: string;
}

export interface SchoolPublicInquiry {
  id: string;
  schoolId: string;
  name: string;
  phone: string;
  email?: string;
  studentClass?: string;
  message: string;
  createdAt: string;
  status: 'new' | 'contacted' | 'resolved';
}// ── 1. TIMETABLE & PERIOD ROUTINE ──
export interface TimetablePeriod {
  id: string;
  periodNumber: number; // 1 to 8
  startTime: string; // e.g. "08:30"
  endTime: string; // e.g. "09:15"
  subjectId?: string;
  subjectName: string;
  teacherId?: string;
  teacherName: string;
  room?: string;
  isBreak?: boolean;
  youtubeUrl?: string;
  youtubeVideoId?: string;
  topic?: string;
}

export interface ClassWeeklyTimetable {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  section?: string;
  sessionId: string;
  schedule: Record<string, TimetablePeriod[]>; // key: "Monday", "Tuesday", etc.
  updatedAt: string;
}

// ── DAILY CLASSROOM VIDEO LECTURE ARCHIVE ──
export interface DailyClassLecture {
  id: string;
  schoolId: string;
  sessionId: string;
  classId: string;
  className: string;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
  periodNumber: number;
  periodTime?: string;
  subjectName: string;
  topic: string;
  teacherName: string;
  teacherId?: string;
  youtubeUrl: string;
  youtubeVideoId: string;
  notes?: string;
  addedAt: string;
  addedBy: "TEACHER" | "ADMIN";
}

// ── 2. DAILY HOMEWORK & ASSIGNMENTS ──
export interface DailyHomework {
  id: string;
  schoolId: string;
  classId: string;
  className: string;
  section?: string;
  subjectId?: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  title: string;
  description: string;
  assignedDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  attachmentUrl?: string;
  status: 'active' | 'archived';
  createdAt: string;
}

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  submittedAt: string;
  text?: string;
  fileUrl?: string;
  status: 'submitted' | 'reviewed';
  remarks?: string;
}

// ── 3. LIBRARY MANAGEMENT ──
export interface LibraryBook {
  id: string;
  schoolId: string;
  accessionNo: string; // e.g. "LIB-1001"
  isbn?: string;
  title: string;
  author: string;
  publisher?: string;
  category: string;
  shelfLocation?: string;
  totalCopies: number;
  availableCopies: number;
  addedAt: string;
}

export interface BookIssueRecord {
  id: string;
  schoolId: string;
  bookId: string;
  bookTitle: string;
  accessionNo: string;
  borrowerType: 'student' | 'teacher';
  borrowerId: string;
  borrowerName: string;
  borrowerClass?: string;
  borrowerRoll?: string;
  borrowerPhone?: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  returnDate?: string;
  status: 'issued' | 'returned' | 'overdue' | 'lost';
  fineAmount?: number;
  finePaid?: boolean;
  remarks?: string;
}

// ── 4. PARENT-TEACHER QUERY / HELPDESK ──
export interface QueryReply {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'PARENT' | 'STUDENT' | 'TEACHER' | 'ADMIN';
  message: string;
  timestamp: string;
}

export interface ParentTeacherQuery {
  id: string;
  schoolId: string;
  studentId: string;
  studentName: string;
  rollNo?: string;
  className: string;
  category: 'academic' | 'fee' | 'transport' | 'leave' | 'general';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved';
  replies: QueryReply[];
  createdAt: string;
  updatedAt: string;
}

// ── 5. SCHOOL STORE & INVENTORY ──
export interface StoreInventoryItem {
  id: string;
  schoolId: string;
  itemCode: string;
  name: string;
  category: 'uniform' | 'books' | 'accessories' | 'stationery' | 'sports' | 'other';
  sizeOrVariant?: string;
  purchasePrice: number;
  salePrice: number;
  stockQuantity: number;
  lowStockAlert: number;
  unit: string;
  updatedAt: string;
}

export interface StoreSaleRecord {
  id: string;
  schoolId: string;
  receiptNo: string;
  studentId?: string;
  studentName: string;
  className?: string;
  rollNo?: string;
  items: {
    itemId: string;
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  totalAmount: number;
  paymentMode: 'cash' | 'online_upi' | 'card';
  date: string;
  soldBy: string;
}

// ── 6. NSTA MESSENGER SUITE (WhatsApp-Style 3-Screen Architecture) ──
export type NstaThreadType = "CLASS_GROUP" | "SCHOOL_DESK" | "TEACHER_CHAT";

export interface NstaFeeSlipData {
  type: "A6_DEMAND_SLIP" | "FEE_RECEIPT";
  studentName?: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  feeItems?: any[];
  month?: string;
  monthLabel?: string;
  amount?: number;
  balanceDue?: number;
  monthlyAmount?: number;
  oldArrears?: number;
  earlyDiscount?: number;
  netPayableWithDiscount?: number;
  discountValidUntil?: string;
  isEligibleForEarlyDiscount?: boolean;
  receiptNo?: string;
  dueDate?: string;
  pdfUrl?: string;
  payLink?: string;
  particulars?: { head: string; amount: number }[];
}

export interface NstaMessage {
  id: string;
  schoolId: string;
  threadType: NstaThreadType;
  classId?: string;       // For CLASS_GROUP
  studentId?: string;     // For SCHOOL_DESK & TEACHER_CHAT
  studentName?: string;
  teacherId?: string;     // For TEACHER_CHAT
  teacherName?: string;
  senderId: string;
  senderName: string;
  senderRole: "ADMIN" | "TEACHER" | "STUDENT";
  text: string;
  attachmentUrl?: string;
  attachmentType?: "IMAGE" | "VIDEO" | "PDF" | "NOTICE" | "AUDIO" | "DOCUMENT" | "ZIP" | "FILE" | "CONTACT" | "LOCATION";
  fileName?: string;
  fileSize?: number;
  audioDuration?: number;
  contactData?: {
    name: string;
    phone?: string;
    role?: string;
    designation?: string;
    avatarUrl?: string;
  };
  locationData?: {
    name?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  feeSlip?: NstaFeeSlipData;
  createdAt: string;      // ISO string
  status?: "sent" | "delivered" | "read";
  deletedFor?: string[];  // User IDs for whom this message is deleted (Delete for me)
  deletedForEveryone?: boolean;
  deletedForEveryoneAt?: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
    attachmentType?: "IMAGE" | "VIDEO" | "PDF" | "NOTICE" | "AUDIO" | "DOCUMENT" | "ZIP" | "FILE" | "CONTACT" | "LOCATION";
  };
  reactions?: Record<string, string[]>; // e.g. { "❤️": ["uid1"], "👍": ["uid2"] }
  deliveredTo?: Array<{
    userId: string;
    userName: string;
    deliveredAt: string;
    role?: string;
  }>;
  readBy?: Array<{
    userId: string;
    userName: string;
    readAt: string;
    role?: string;
  }>;
  isForwarded?: boolean;
}
