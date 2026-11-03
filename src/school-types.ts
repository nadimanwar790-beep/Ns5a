// IIC×NSTA Smart School Ecosystem — Core Types

export type SchoolRole = 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'SCHOOL_SUB_ADMIN' | 'TEACHER' | 'SCHOOL_STUDENT';

export type SubscriptionFeature = 'reading' | 'writing' | 'pdf' | 'mcq';

export type PlanDuration = 'weekly' | 'monthly' | '3months' | 'yearly';

export interface SchoolSubscription {
  reading: boolean;
  writing: boolean;
  pdf: boolean;
  mcq: boolean;
  expiresAt?: string; // ISO date — plan hard expiry (set on assign)
  monthlyAmount: number;
  paidUntil?: string; // ISO date — subscription paid up to this date
  lastPaidDate?: string; // ISO date — when last payment was received
  lastPaidAmount?: number; // amount received in last payment
  paymentNotes?: string; // admin notes on payment
  status: 'active' | 'inactive' | 'suspended';
  tier?: 'lite' | 'full'; // lite = student data only, full = content + student data
  planDuration?: PlanDuration; // duration of last assigned plan
  assignedAt?: string; // ISO date — when plan was last assigned by super admin
}

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
  name: string; // e.g. "Admission Fee", "Tuition Fee", "Caution Money", "Annual Charges", "Bus Fee"
  amount: number;
}

export interface ClassFeeStructure {
  admissionFee: number;
  tuitionFee: number;
  cautionMoney: number;
  annualCharges: number;
  busFee: number;
  customHeads?: ClassFeeHead[];
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  sessionId: string;
  name: string; // e.g. "Class 6"
  section?: string; // e.g. "A" or "B"
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
  name: string; // e.g. "Mathematics"
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
}

export interface SchoolStudent {
  id: string; // Firebase Auth UID
  schoolId: string;
  sessionId: string;
  classId: string;
  className?: string;
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
  motherName?: string;
  motherOccupation?: string;
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
  identificationMark?: string;
  medicalHistory?: string;
  admissionType?: 'NEW' | 'READMISSION';
}

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
  joinDate: string;
  monthlySalary: number;
  active: boolean;
  photoUrl?: string;
  address?: string;
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
  motherName: string;
  motherOccupation?: string;
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
  identificationMark?: string;
  medicalHistory?: string;
  admissionType?: 'NEW' | 'READMISSION';
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
}

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
