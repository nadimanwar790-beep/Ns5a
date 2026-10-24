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
  idCard: ["schoolName", "affiliation", "address", "phone", "email", "code", "principalName", "principalPhone", "directorName", "directorPhone"],
  certificate: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName", "principalPhone", "directorName", "directorPhone"],
  marksheet: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName", "principalPhone", "directorName", "directorPhone"],
  feeReceipt: ["schoolName", "address", "phone", "email", "affiliation", "code", "principalName", "principalPhone", "directorName", "directorPhone"],
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
  customFields?: SchoolProfileCustomField[];
  documentPrintFields?: SchoolDocumentPrintFields;
  idCardFieldSettings?: Record<string, boolean>;
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

export interface SchoolClass {
  id: string;
  schoolId: string;
  sessionId: string;
  name: string; // e.g. "Class 10-A"
  section?: string;
  classTeacherId?: string;
  defaultFee?: number;
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
  email: string;
  phone?: string;
  subjects: string[]; // subject IDs
  classes: string[]; // class IDs
  employeeId?: string;
  joinDate: string;
  active: boolean;
  createdAt: string;
}

export interface SchoolStudent {
  id: string; // Firebase Auth UID
  schoolId: string;
  sessionId: string;
  classId: string;
  name: string;
  email?: string;
  phone?: string;
  rollNo: string;
  admissionNo?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  address?: string;
  monthlyFee: number;
  joinDate: string;
  active: boolean;
  createdAt: string;
  photoUrl?: string; // base64 or Google Drive URL of student photo
  iicUid?: string; // linked IIC account UID
}

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
      status?: "present" | "late" | "half_day" | "absent";
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
  fatherName: string;
  fatherOccupation?: string;
  motherName: string;
  motherOccupation?: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  pincode?: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  remarks?: string;
  assignedRollNo?: string;
  assignedSection?: string;
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
}


