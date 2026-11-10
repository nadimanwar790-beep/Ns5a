// Demo Data Engine for School Management System
// 1-Year Comprehensive Academic & Administrative Dataset
// - 13 Classes (Nursery, KG 1, KG 2, Class 1-10)
// - 70 Students per Class: Section A (35 students), Section B (35 students) -> Total 910 Students
// - Teacher-Student Ratio: 1/35 -> 26 Section Teachers (Salaries: ₹5,000 - ₹15,000) + 1 Principal (₹25,000)
// - Teacher Late Entry Rule: 3 Days Late = 1 Day Salary Cut!
// - 1-Year Attendance with Present, Absent, Late, Leave, Bunked
// - Festival Holidays Calendar + Power to Add Custom Holidays
// - 6 Exam Cycles: PA 1 (40), PA 2 (40), Half Yearly (100), PA 3 (40), PA 4 (40), Final Annual Exam (100)
// - 1-Year Fee Receipts & Defaulters with 3, 4, 5, 6, 7, 8, 10, 12 Months Pending Fees
// - 1-Year Official School Notices with Month-Wise Filter (April to March)

import type {
  SchoolClass,
  SchoolSubject,
  SchoolTeacher,
  SchoolStudent,
  StaffEmployee,
  StaffLeave,
  SchoolAccountant,
  SchoolExpenseVoucher,
  AdmissionApplication,
  AttendanceRecord,
  ExamEntry,
  MonthlyFee,
  SchoolNotice,
  SchoolSession,
  TimetablePeriod,
  DailyHomework,
  LibraryBook,
  BookIssueRecord,
  StoreInventoryItem,
  StoreSaleRecord,
  ParentTeacherQuery,
  SchoolEvent,
  DailyClassLecture,
  TeacherReferralPayout
} from "../../school-types";

import { getSchoolCacheSync, setSchoolCacheSync } from "../../utils/schoolIndexedDb";

export const DEMO_SESSION_ID = "demo_session_2026_27";
export const DEMO_SESSION_NAME = "Session 2026-27 (Current Active Academic Year)";
export const DEMO_STORAGE_KEY = "nst_demo_school_all_sessions_dataset_v7";
export const DEMO_DATA_TOGGLE_KEY = "nst_demo_data_enabled";

// Multi-Session Academic Roadmap (All sessions filled with complete A to Z dummy data)
export const DEMO_SESSIONS_LIST: SchoolSession[] = [
  {
    id: "demo_session_2024_25",
    schoolId: "demo_school",
    name: "Session 2024-25 (Archived Academic Year)",
    startDate: "2024-04-01",
    endDate: "2025-03-31",
    active: false,
    createdAt: "2024-04-01T00:00:00Z"
  },
  {
    id: "demo_session_2025_26",
    schoolId: "demo_school",
    name: "Session 2025-26 (CBSE Board Exam Cycle)",
    startDate: "2025-04-01",
    endDate: "2026-03-31",
    active: false,
    createdAt: "2025-04-01T00:00:00Z"
  },
  {
    id: "demo_session_2026_27",
    schoolId: "demo_school",
    name: "Session 2026-27 (Current Active Academic Year)",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true,
    createdAt: "2026-04-01T00:00:00Z"
  },
  {
    id: "demo_session_2027_28",
    schoolId: "demo_school",
    name: "Session 2027-28 (Upcoming Session & Admissions)",
    startDate: "2027-04-01",
    endDate: "2028-03-31",
    active: false,
    createdAt: "2027-01-01T00:00:00Z"
  }
];

// Demo Data Toggle (Default ON so every session and module is rich and full out of the box)
export function isDemoDataEnabled(): boolean {
  const cachedFlag = getSchoolCacheSync<boolean | null>(DEMO_DATA_TOGGLE_KEY, null);
  if (typeof cachedFlag === "boolean") {
    return cachedFlag;
  }
  try {
    const val = localStorage.getItem(DEMO_DATA_TOGGLE_KEY);
    if (val !== null) {
      const parsed = val === "true";
      setSchoolCacheSync(DEMO_DATA_TOGGLE_KEY, parsed);
      return parsed;
    }
  } catch {}
  return true; // Default to ON for rich demo experience
}

export function setDemoDataEnabled(enabled: boolean): void {
  setSchoolCacheSync(DEMO_DATA_TOGGLE_KEY, enabled);
  try {
    localStorage.setItem(DEMO_DATA_TOGGLE_KEY, enabled ? "true" : "false");
    inMemoryDataset = null; // Flush cache so change takes effect immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nst_demo_toggle_changed", { detail: { enabled } }));
    }
  } catch {}
}

export interface FestivalHoliday {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  endDate?: string; // for vacations
  type: "festival" | "national" | "vacation" | "local" | "weather";
  description: string;
  isPreloaded?: boolean;
}

export interface TeacherLatePenaltyInfo {
  teacherId: string;
  teacherName: string;
  designation: string;
  monthlySalary: number;
  month: string;
  lateDaysCount: number;
  deductionDays: number; // Math.floor(lateDaysCount / 3)
  perDaySalary: number; // Math.round(monthlySalary / 30)
  lateDeductionAmount: number; // deductionDays * perDaySalary
  absentDaysCount: number;
  absentDeductionAmount: number; // absentDaysCount * perDaySalary
  grossSalary: number;
  netPayableSalary: number;
}

// Complete Classes definition from Nursery to Class 12 with Senior Streams
export const DEMO_CLASS_DEFINITIONS = [
  { key: "nur", name: "Nursery", defaultFee: 650, group: "Pre-Primary" },
  { key: "kg1", name: "KG 1", defaultFee: 750, group: "Pre-Primary" },
  { key: "kg2", name: "KG 2", defaultFee: 850, group: "Pre-Primary" },
  { key: "c1", name: "Class 1", defaultFee: 950, group: "Primary" },
  { key: "c2", name: "Class 2", defaultFee: 1050, group: "Primary" },
  { key: "c3", name: "Class 3", defaultFee: 1150, group: "Primary" },
  { key: "c4", name: "Class 4", defaultFee: 1250, group: "Primary" },
  { key: "c5", name: "Class 5", defaultFee: 1350, group: "Primary" },
  { key: "c6", name: "Class 6", defaultFee: 1500, group: "Middle" },
  { key: "c7", name: "Class 7", defaultFee: 1600, group: "Middle" },
  { key: "c8", name: "Class 8", defaultFee: 1750, group: "Middle" },
  { key: "c9", name: "Class 9", defaultFee: 2100, group: "Secondary" },
  { key: "c10", name: "Class 10", defaultFee: 2400, group: "Secondary" },
  // Senior Secondary: Class 11 Streams
  { key: "c11_sci", name: "Class 11", stream: "Science", defaultFee: 2600, group: "Senior Secondary - Science" },
  { key: "c11_com", name: "Class 11", stream: "Commerce", defaultFee: 2500, group: "Senior Secondary - Commerce" },
  { key: "c11_arts", name: "Class 11", stream: "Arts", defaultFee: 2400, group: "Senior Secondary - Arts" },
  // Senior Secondary: Class 12 Streams
  { key: "c12_sci", name: "Class 12", stream: "Science", defaultFee: 2800, group: "Senior Secondary - Science" },
  { key: "c12_com", name: "Class 12", stream: "Commerce", defaultFee: 2700, group: "Senior Secondary - Commerce" },
  { key: "c12_arts", name: "Class 12", stream: "Arts", defaultFee: 2600, group: "Senior Secondary - Arts" },
];

// Grade & Stream Tailored Subjects / Books
export const GRADE_SUBJECTS_MAP: Record<string, string[]> = {
  "Pre-Primary": [
    "English Rhymes & Phonics",
    "Hindi Varnamala & Geet",
    "Fun with Numbers (Maths)",
    "Creative Drawing & Colours",
    "General Awareness & Activity",
  ],
  "Primary": [
    "English Marigold Reader",
    "Hindi Rimjhim",
    "Mathematics (Math-Magic)",
    "Environmental Studies (EVS)",
    "General Science",
    "Computer & IT Basics",
    "Moral Science & GK",
  ],
  "Middle": [
    "English Honeycomb",
    "Hindi Vasant",
    "Mathematics (NCERT)",
    "General Science & Tech",
    "Social Science (History/Civics/Geo)",
    "Sanskrit Bhasha",
    "Computer Science & Coding",
  ],
  "Secondary": [
    "English Language & Literature",
    "Hindi Course-A",
    "Mathematics (Standard / Basic)",
    "Science (Physics, Chemistry, Biology)",
    "Social Science (India & World)",
    "Information Technology (Code 402)",
  ],
  "Senior Secondary - Science": [
    "Physics",
    "Chemistry",
    "Mathematics",
    "Biology",
    "English Core",
    "Computer Science",
    "Physical Education",
  ],
  "Senior Secondary - Commerce": [
    "Accountancy",
    "Business Studies",
    "Economics",
    "English Core",
    "Applied Mathematics",
    "Informatics Practices",
  ],
  "Senior Secondary - Arts": [
    "History",
    "Political Science",
    "Geography",
    "Economics",
    "English Core",
    "Hindi Elective",
    "Sociology",
  ],
  "Senior Secondary": [
    "Physics / Accountancy / History",
    "Chemistry / Business Studies / Pol Sci",
    "Mathematics / Economics / Geography",
    "English Core",
    "Computer Science / Informatics Practices",
  ],
};

// 6 Exam Cycles throughout the 1-year Academic Session (Every ~2 Months)
export const EXAM_CYCLES = [
  { id: "pa1", name: "Periodic Assessment 1 (PA-1)", shortName: "PA 1", maxMarks: 40, month: "2026-07", date: "2026-07-20", weightage: "10%" },
  { id: "pa2", name: "Periodic Assessment 2 (PA-2)", shortName: "PA 2", maxMarks: 40, month: "2026-09", date: "2026-09-18", weightage: "10%" },
  { id: "half_yearly", name: "Half Yearly Term Examination", shortName: "Half Yearly", maxMarks: 100, month: "2026-11", date: "2026-11-15", weightage: "30%" },
  { id: "pa3", name: "Periodic Assessment 3 (PA-3)", shortName: "PA 3", maxMarks: 40, month: "2026-12", date: "2026-12-22", weightage: "10%" },
  { id: "pa4", name: "Periodic Assessment 4 (PA-4)", shortName: "PA 4", maxMarks: 40, month: "2027-02", date: "2027-02-16", weightage: "10%" },
  { id: "final", name: "Final Annual Board Examination", shortName: "Final Exam", maxMarks: 100, month: "2027-03", date: "2027-03-24", weightage: "30%" },
];

// 12 Academic Months (April 2026 - March 2027)
export const ACADEMIC_MONTHS = [
  { code: "2026-04", name: "April 2026", short: "Apr" },
  { code: "2026-05", name: "May 2026", short: "May" },
  { code: "2026-06", name: "June 2026", short: "Jun" },
  { code: "2026-07", name: "July 2026", short: "Jul" },
  { code: "2026-08", name: "August 2026", short: "Aug" },
  { code: "2026-09", name: "September 2026", short: "Sep" },
  { code: "2026-10", name: "October 2026", short: "Oct" },
  { code: "2026-11", name: "November 2026", short: "Nov" },
  { code: "2026-12", name: "December 2026", short: "Dec" },
  { code: "2027-01", name: "January 2027", short: "Jan" },
  { code: "2027-02", name: "February 2027", short: "Feb" },
  { code: "2027-03", name: "March 2027", short: "Mar" },
];

// Preloaded Festival & School Holidays for the Full Academic Year
export const INITIAL_FESTIVAL_HOLIDAYS: FestivalHoliday[] = [
  { id: "hol_1", name: "Eid-ul-Fitr", date: "2026-04-11", type: "festival", description: "Gazetted Festival Holiday", isPreloaded: true },
  { id: "hol_2", name: "Ram Navami", date: "2026-04-17", type: "festival", description: "Festival of Lord Rama's Birth", isPreloaded: true },
  { id: "hol_3", name: "Mahavir Jayanti", date: "2026-04-20", type: "festival", description: "Jain Festival Holiday", isPreloaded: true },
  { id: "hol_4", name: "Summer Vacation Break", date: "2026-05-21", endDate: "2026-06-25", type: "vacation", description: "Annual Summer Vacation for Students and Staff", isPreloaded: true },
  { id: "hol_5", name: "Muharram", date: "2026-07-26", type: "festival", description: "Gazetted Holiday", isPreloaded: true },
  { id: "hol_6", name: "Independence Day", date: "2026-08-15", type: "national", description: "Flag Hoisting & National Holiday", isPreloaded: true },
  { id: "hol_7", name: "Raksha Bandhan", date: "2026-08-28", type: "festival", description: "Festival of Siblings", isPreloaded: true },
  { id: "hol_8", name: "Janmashtami", date: "2026-09-04", type: "festival", description: "Birth of Lord Krishna Celebration", isPreloaded: true },
  { id: "hol_9", name: "Milad-un-Nabi", date: "2026-09-25", type: "festival", description: "Eid-e-Milad Holiday", isPreloaded: true },
  { id: "hol_10", name: "Mahatma Gandhi Jayanti", date: "2026-10-02", type: "national", description: "National Holiday - Father of the Nation", isPreloaded: true },
  { id: "hol_11", name: "Dussehra & Maha Navami", date: "2026-10-19", endDate: "2026-10-21", type: "festival", description: "Vijayadashami Festivities & Holiday", isPreloaded: true },
  { id: "hol_12", name: "Diwali & Deepawali Mahotsav", date: "2026-11-08", endDate: "2026-11-10", type: "festival", description: "Festival of Lights Holiday", isPreloaded: true },
  { id: "hol_13", name: "Chhath Puja Mahaparv", date: "2026-11-15", endDate: "2026-11-16", type: "festival", description: "Surya Shashti Chhath Mahaparv Holiday", isPreloaded: true },
  { id: "hol_14", name: "Guru Nanak Jayanti", date: "2026-11-24", type: "festival", description: "Prakash Parv Holiday", isPreloaded: true },
  { id: "hol_15", name: "Christmas Day", date: "2026-12-25", type: "festival", description: "Christmas Holiday Celebration", isPreloaded: true },
  { id: "hol_16", name: "Winter Break Vacation", date: "2026-12-28", endDate: "2027-01-05", type: "vacation", description: "Winter Cold Weather School Closure", isPreloaded: true },
  { id: "hol_17", name: "Makar Sankranti / Pongal", date: "2027-01-14", type: "festival", description: "Harvest Festival Holiday", isPreloaded: true },
  { id: "hol_18", name: "Republic Day", date: "2027-01-26", type: "national", description: "Constitution Day & Republic Celebrations", isPreloaded: true },
  { id: "hol_19", name: "Maha Shivratri", date: "2027-02-23", type: "festival", description: "Shivratri Devotional Holiday", isPreloaded: true },
  { id: "hol_20", name: "Holi & Dhulandi Celebration", date: "2027-03-22", endDate: "2027-03-23", type: "festival", description: "Festival of Colours Holiday", isPreloaded: true },
];

// First names, Last names, Father names for realistic generation
const FIRST_NAMES_BOYS = [
  "Aarav", "Vivaan", "Advik", "Reyansh", "Atharv", "Kabir", "Shaurya", "Ishaan",
  "Rudra", "Dhruv", "Arjun", "Ansh", "Aadi", "Devansh", "Lakshya", "Ayush",
  "Yash", "Krishna", "Aditya", "Rohan", "Samar", "Kunal", "Tanish", "Manish",
  "Naveen", "Abhishek", "Vikram", "Suraj", "Deepak", "Aman", "Pankaj", "Gaurav",
  "Alok", "Harsh", "Prateek", "Saurabh"
];

const FIRST_NAMES_GIRLS = [
  "Ananya", "Diya", "Saanvi", "Myra", "Aadhya", "Pari", "Navya", "Riya",
  "Avani", "Isha", "Kiara", "Kavya", "Anushka", "Prisha", "Tanvi", "Siya",
  "Sneha", "Pooja", "Neha", "Divya", "Meera", "Swati", "Kriti", "Shreya",
  "Anjali", "Sonal", "Radhika", "Bhavna", "Komal", "Simran", "Preeti", "Payal",
  "Chahat", "Nisha", "Roshni", "Sunita"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Mishra", "Pandey", "Yadav",
  "Tiwari", "Choudhary", "Jha", "Sinha", "Patel", "Thakur", "Dubey", "Shukla",
  "Saxena", "Chauhan", "Bhardwaj", "Tripathi", "Srivastava", "Rajput"
];

// 26 Teachers (1 per 35 students across 26 sections) + 1 Principal
export const DEMO_STAFF_MEMBERS = [
  // Principal: Salary exactly ₹25,000
  {
    name: "Dr. Ramanand Shastri",
    designation: "Principal & Head of Institution",
    department: "Institutional Administration",
    email: "principal.shastri@demoschool.edu.in",
    phone: "9818012345",
    monthlySalary: 25000,
    joinDate: "2021-04-01",
    qualification: "M.A., M.Ed, Ph.D. in Education",
    isPrincipal: true,
  },
  // 26 Section Teachers: Salaries between ₹5,000 and ₹15,000
  // Nursery Section A & B
  { name: "Poonam Aggarwal", classKey: "nur", section: "A", subject: "Pre-Primary Foundation", salary: 6500, designation: "Montessori PRT Teacher", email: "poonam.nur.a@school.in", phone: "9820011001" },
  { name: "Sunita Deshmukh", classKey: "nur", section: "B", subject: "Pre-Primary Foundation", salary: 6800, designation: "Montessori PRT Teacher", email: "sunita.nur.b@school.in", phone: "9820011002" },
  // KG 1 Section A & B
  { name: "Kavita Rawat", classKey: "kg1", section: "A", subject: "Early Childhood Phonics", salary: 7200, designation: "NTT Educator", email: "kavita.kg1.a@school.in", phone: "9820011003" },
  { name: "Meenakshi Joshi", classKey: "kg1", section: "B", subject: "Early Childhood Numbers", salary: 7500, designation: "NTT Educator", email: "meenakshi.kg1.b@school.in", phone: "9820011004" },
  // KG 2 Section A & B
  { name: "Rekha Saxena", classKey: "kg2", section: "A", subject: "Kindergarten Prep", salary: 7800, designation: "Senior NTT Educator", email: "rekha.kg2.a@school.in", phone: "9820011005" },
  { name: "Babita Kumari", classKey: "kg2", section: "B", subject: "Kindergarten Prep", salary: 8000, designation: "Senior NTT Educator", email: "babita.kg2.b@school.in", phone: "9820011006" },
  // Class 1 Section A & B
  { name: "Anita Tripathi", classKey: "c1", section: "A", subject: "Primary English & EVS", salary: 8500, designation: "PRT Primary Teacher", email: "anita.c1.a@school.in", phone: "9820011007" },
  { name: "Vandana Bhatt", classKey: "c1", section: "B", subject: "Primary Hindi & Maths", salary: 8700, designation: "PRT Primary Teacher", email: "vandana.c1.b@school.in", phone: "9820011008" },
  // Class 2 Section A & B
  { name: "Neelam Dwivedi", classKey: "c2", section: "A", subject: "Primary Mathematics", salary: 9000, designation: "PRT Primary Teacher", email: "neelam.c2.a@school.in", phone: "9820011009" },
  { name: "Archana Chauhan", classKey: "c2", section: "B", subject: "Primary English Reader", salary: 9200, designation: "PRT Primary Teacher", email: "archana.c2.b@school.in", phone: "9820011010" },
  // Class 3 Section A & B
  { name: "Suman Lata", classKey: "c3", section: "A", subject: "Environmental Studies", salary: 9500, designation: "PRT Senior Educator", email: "suman.c3.a@school.in", phone: "9820011011" },
  { name: "Deepak Goswami", classKey: "c3", section: "B", subject: "Mathematics & Science", salary: 9800, designation: "PRT Senior Educator", email: "deepak.c3.b@school.in", phone: "9820011012" },
  // Class 4 Section A & B
  { name: "Praveen Kashyap", classKey: "c4", section: "A", subject: "General Science & GK", salary: 10200, designation: "PRT Senior Educator", email: "praveen.c4.a@school.in", phone: "9820011013" },
  { name: "Shalini Nigam", classKey: "c4", section: "B", subject: "English & Social Studies", salary: 10500, designation: "PRT Senior Educator", email: "shalini.c4.b@school.in", phone: "9820011014" },
  // Class 5 Section A & B
  { name: "Ashok Upadhyay", classKey: "c5", section: "A", subject: "Science & Mathematics", salary: 11000, designation: "TGT Junior Assistant", email: "ashok.c5.a@school.in", phone: "9820011015" },
  { name: "Pooja Singhal", classKey: "c5", section: "B", subject: "Hindi Rimjhim & Sanskrit", salary: 11200, designation: "TGT Junior Assistant", email: "pooja.c5.b@school.in", phone: "9820011016" },
  // Class 6 Section A & B
  { name: "Mahesh Chandra", classKey: "c6", section: "A", subject: "Mathematics & Reasoning", salary: 11800, designation: "TGT Mathematics", email: "mahesh.c6.a@school.in", phone: "9820011017" },
  { name: "Geeta Pandey", classKey: "c6", section: "B", subject: "Social Science History", salary: 12000, designation: "TGT Social Studies", email: "geeta.c6.b@school.in", phone: "9820011018" },
  // Class 7 Section A & B
  { name: "Suresh Narang", classKey: "c7", section: "A", subject: "General Science & Tech", salary: 12500, designation: "TGT Science Specialist", email: "suresh.c7.a@school.in", phone: "9820011019" },
  { name: "Monika Bhalla", classKey: "c7", section: "B", subject: "English Literature", salary: 12800, designation: "TGT English Specialist", email: "monika.c7.b@school.in", phone: "9820011020" },
  // Class 8 Section A & B
  { name: "Rajeshwar Tiwari", classKey: "c8", section: "A", subject: "Advance Mathematics", salary: 13200, designation: "TGT Senior Teacher", email: "rajeshwar.c8.a@school.in", phone: "9820011021" },
  { name: "Swati Sengupta", classKey: "c8", section: "B", subject: "Physics & Chemistry", salary: 13500, designation: "TGT Senior Teacher", email: "swati.c8.b@school.in", phone: "9820011022" },
  // Class 9 Section A & B
  { name: "Dr. Harish Chandra", classKey: "c9", section: "A", subject: "Secondary Science (PCB)", salary: 14200, designation: "PGT Science Faculty", email: "harish.c9.a@school.in", phone: "9820011023" },
  { name: "Meena Raghuvanshi", classKey: "c9", section: "B", subject: "Secondary Mathematics", salary: 14500, designation: "PGT Mathematics Faculty", email: "meena.c9.b@school.in", phone: "9820011024" },
  // Class 10 Section A & B
  { name: "Vikramaditya Bose", classKey: "c10", section: "A", subject: "Board Mathematics (Std)", salary: 15000, designation: "Senior PGT Board Faculty", email: "vikram.c10.a@school.in", phone: "9820011025" },
  { name: "Dr. Alaka Mukherjee", classKey: "c10", section: "B", subject: "Secondary Science Board", salary: 15000, designation: "Senior PGT Board Faculty", email: "alaka.c10.b@school.in", phone: "9820011026" },
];

// Pre-seeded 1-Year Notices (12 Months, filtered by month)
export const INITIAL_ANNUAL_NOTICES: SchoolNotice[] = [
  {
    id: "not_apr_01",
    schoolId: "demo_school",
    title: "Commencement of New Academic Session 2026-27 & Book Distribution",
    content: "Hearty welcome to all students and parents to Academic Year 2026-27! Book sets, stationery, and school uniforms are available at the administration counter starting April 1st. Regular assembly begins at 07:45 AM sharp.",
    type: "circular",
    audience: "all",
    date: "2026-04-02",
    createdAt: "2026-04-02T08:00:00Z",
    createdBy: "admin",
    pinned: true,
  },
  {
    id: "not_apr_02",
    schoolId: "demo_school",
    title: "Ram Navami & Mahavir Jayanti Institutional Holiday Declaration",
    content: "The school shall remain closed on April 17 and April 20 on account of Ram Navami and Mahavir Jayanti. Classes will resume on their respective next working days as per regular timetable.",
    type: "holiday",
    audience: "all",
    date: "2026-04-16",
    createdAt: "2026-04-16T10:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_may_01",
    schoolId: "demo_school",
    title: "Summer Vacation Schedule & Holiday Homework Projects",
    content: "Summer Vacation for classes Nursery to 10 will commence from May 21st to June 25th, 2026. Interactive holiday homework worksheets have been uploaded. Submit project models by the reopening day.",
    type: "holiday",
    audience: "students",
    date: "2026-05-18",
    createdAt: "2026-05-18T09:30:00Z",
    createdBy: "admin",
    pinned: true,
  },
  {
    id: "not_jun_01",
    schoolId: "demo_school",
    title: "School Reopening After Summer Vacation & Plantation Drive",
    content: "School reopens on June 26th at 07:45 AM. All students are encouraged to bring a sapling for the Van Mahotsav Green Campus initiative. Summer uniform discipline is mandatory.",
    type: "notice",
    audience: "all",
    date: "2026-06-24",
    createdAt: "2026-06-24T08:15:00Z",
    createdBy: "admin",
  },
  {
    id: "not_jul_01",
    schoolId: "demo_school",
    title: "Periodic Assessment 1 (PA-1) Datesheet & Max Marks (40 Marks)",
    content: "PA-1 exams will be held from July 20 to July 27, 2026 across all subjects. Maximum marks per paper will be 40 Marks. Timetable and unit syllabus have been published on notice boards.",
    type: "event",
    audience: "all",
    date: "2026-07-10",
    createdAt: "2026-07-10T11:00:00Z",
    createdBy: "admin",
    pinned: true,
  },
  {
    id: "not_aug_01",
    schoolId: "demo_school",
    title: "79th Independence Day Grand Celebration & Patriotic Parade",
    content: "All teachers and students must attend the Flag Hoisting Ceremony on August 15 at 08:00 AM in pristine white uniform. Sweets distribution and cultural singing competition will follow.",
    type: "event",
    audience: "all",
    date: "2026-08-11",
    createdAt: "2026-08-11T09:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_sep_01",
    schoolId: "demo_school",
    title: "Teacher's Day Celebrations & PA-2 Assessment Notification",
    content: "Happy Teacher's Day on September 5th! Periodic Assessment 2 (PA-2) will commence from September 18th for 40 Marks per subject. Ensure all pending dues up to August are cleared.",
    type: "notice",
    audience: "all",
    date: "2026-09-02",
    createdAt: "2026-09-02T08:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_oct_01",
    schoolId: "demo_school",
    title: "Gandhi Jayanti & Dussehra Durga Puja Festival Holidays",
    content: "School will observe holiday on October 2 for Gandhi Jayanti, and October 19 to 21 for Dussehra & Maha Navami. The school management wishes auspicious festivities to all families.",
    type: "holiday",
    audience: "all",
    date: "2026-10-01",
    createdAt: "2026-10-01T10:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_nov_01",
    schoolId: "demo_school",
    title: "Diwali, Chhath Puja Holidays & Half Yearly Examination Schedule (100 Marks)",
    content: "Diwali holidays will run Nov 8-10, followed by Chhath Puja on Nov 15-16. The Half Yearly Examination (100 Marks per subject) starts Nov 18, 2026. Admit cards will be issued to cleared students.",
    type: "circular",
    audience: "all",
    date: "2026-11-04",
    createdAt: "2026-11-04T09:00:00Z",
    createdBy: "admin",
    pinned: true,
  },
  {
    id: "not_dec_01",
    schoolId: "demo_school",
    title: "Periodic Assessment 3 (PA-3) Schedule & Annual Sports Meet 2026",
    content: "PA-3 (40 Marks) begins Dec 22. The Annual Sports Meet & Athletic Championship will take place on Dec 19-20. Christmas Day is a holiday on Dec 25. Winter break begins Dec 28.",
    type: "event",
    audience: "all",
    date: "2026-12-08",
    createdAt: "2026-12-08T10:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_jan_01",
    schoolId: "demo_school",
    title: "School Reopening, Makar Sankranti & Republic Day Celebration",
    content: "Winter vacation ends Jan 5th. Makar Sankranti holiday on Jan 14th. Republic Day celebration parade on Jan 26th at 08:30 AM. Winter blazers and ties are compulsory.",
    type: "notice",
    audience: "all",
    date: "2027-01-06",
    createdAt: "2027-01-06T08:30:00Z",
    createdBy: "admin",
  },
  {
    id: "not_feb_01",
    schoolId: "demo_school",
    title: "Periodic Assessment 4 (PA-4) & Science Exhibition 2027",
    content: "PA-4 (40 Marks) starts Feb 16th. National Science Day exhibition will be conducted on Feb 27th. Parents are warmly invited to inspect working models and robotics projects.",
    type: "event",
    audience: "all",
    date: "2027-02-05",
    createdAt: "2027-02-05T09:00:00Z",
    createdBy: "admin",
  },
  {
    id: "not_mar_01",
    schoolId: "demo_school",
    title: "Final Annual Board Examination (100 Marks) & Fee Clearance Urgent Notice",
    content: "The Final Annual Examination (100 Marks per subject) begins March 24th, 2027. Students with fee dues of 3, 4, 6, 8, 10, or 12 months must clear arrears immediately to receive official Hall Tickets and Marksheets.",
    type: "circular",
    audience: "all",
    date: "2027-03-05",
    createdAt: "2027-03-05T08:00:00Z",
    createdBy: "admin",
    pinned: true,
  },
];

// Helper to determine defaulter months pending for a student:
// User specified: "ushme bhi kuchh student ka 8 10 12 6 4 5 7 3 month ke baki rahenge fee"
export function getStudentDueMonthsCount(classIndex: number, section: "A" | "B", studentIndex: number): number {
  // We want a predictable, diverse distribution across each 35-student section:
  // - Some students have 12 months pending (complete defaulters)
  // - Some have 10 months pending
  // - Some have 8 months pending
  // - Some have 7 months pending
  // - Some have 6 months pending
  // - Some have 5 months pending
  // - Some have 4 months pending
  // - Some have 3 months pending
  // - Majority (e.g. 25+ out of 35) are completely paid up (0 months due)
  const key = (classIndex * 7 + (section === "B" ? 17 : 3) + studentIndex) % 35;
  if (key === 1) return 12; // 12 months due
  if (key === 4) return 10; // 10 months due
  if (key === 8) return 8;  // 8 months due
  if (key === 12) return 7; // 7 months due
  if (key === 16) return 6; // 6 months due
  if (key === 20) return 5; // 5 months due
  if (key === 24) return 4; // 4 months due
  if (key === 28) return 3; // 3 months due
  return 0; // Completely paid!
}

// In-Memory and LocalStorage Cached Dataset Interface
export interface FullDemoSchoolDataset {
  session: SchoolSession;
  sessions: SchoolSession[];
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  teachers: SchoolTeacher[];
  students: SchoolStudent[];
  staffEmployees: StaffEmployee[];
  staffLeaves: StaffLeave[];
  accountants: SchoolAccountant[];
  expenseVouchers: SchoolExpenseVoucher[];
  admissions: AdmissionApplication[];
  exams: ExamEntry[];
  fees: MonthlyFee[];
  notices: SchoolNotice[];
  holidays: FestivalHoliday[];
  attendanceRecords: AttendanceRecord[];
  attendanceSummary: Record<string, { present: number; absent: number; late: number; leave: number; bunk: number }>;
  teacherLatePenalties: TeacherLatePenaltyInfo[];
  timetables: Record<string, Record<string, TimetablePeriod[]>>;
  homeworkList: DailyHomework[];
  libraryBooks: LibraryBook[];
  libraryIssues: BookIssueRecord[];
  storeItems: StoreInventoryItem[];
  storeSales: StoreSaleRecord[];
  parentQueries: ParentTeacherQuery[];
  busRoutes: Array<{ id: string; name: string; busNo: string; driverName: string; phone: string; monthlyFee: number; stops: string[] }>;
  events: SchoolEvent[];
  videoLectures: DailyClassLecture[];
  referralPayouts: TeacherReferralPayout[];
  createdAt: string;
}

// Global cached state
let inMemoryDataset: FullDemoSchoolDataset | null = null;

// Build the full multi-session dataset (A to Z dummy data for every module)
export function generateFull1YearDemoDataset(schoolId: string = "demo_school", adminUid: string = "admin"): FullDemoSchoolDataset {
  const primarySession = DEMO_SESSIONS_LIST.find(s => s.id === DEMO_SESSION_ID) || DEMO_SESSIONS_LIST[2];
  const sessions = [...DEMO_SESSIONS_LIST];

  const classes: SchoolClass[] = [];
  const subjects: SchoolSubject[] = [];
  const students: SchoolStudent[] = [];
  const teachers: SchoolTeacher[] = [];
  const staffEmployees: StaffEmployee[] = [];
  const exams: ExamEntry[] = [];
  const fees: MonthlyFee[] = [];
  const holidays: FestivalHoliday[] = [...INITIAL_FESTIVAL_HOLIDAYS];
  const notices: SchoolNotice[] = [...INITIAL_ANNUAL_NOTICES];
  const todayDateStr = new Date().toISOString().split("T")[0];
  const currentMonthKey = todayDateStr.slice(0, 7);

  // 1. Principal & Administrative Staff Employees
  const principalStaff = DEMO_STAFF_MEMBERS[0];
  staffEmployees.push({
    id: `staff_principal_01`,
    schoolId,
    name: principalStaff.name,
    email: principalStaff.email,
    phone: principalStaff.phone,
    designation: principalStaff.designation,
    department: principalStaff.department || "Administration",
    monthlySalary: 25000,
    joinDate: principalStaff.joinDate || "2024-04-01",
    active: true,
    createdAt: primarySession.createdAt,
  });

  // Additional Admin/Support Staff
  staffEmployees.push(
    {
      id: `staff_acc_01`,
      schoolId,
      name: "Rameshwar Dayal",
      email: "accounts@school.edu.in",
      phone: "9811099881",
      designation: "Head Accountant & Bursar",
      department: "Accounts & Finance",
      monthlySalary: 28000,
      joinDate: "2022-06-01",
      active: true,
      createdAt: primarySession.createdAt,
    },
    {
      id: `staff_acc_02`,
      schoolId,
      name: "Sanjay Kumar Verma",
      email: "cashier@school.edu.in",
      phone: "9811099882",
      designation: "Assistant Cashier",
      department: "Accounts & Finance",
      monthlySalary: 18000,
      joinDate: "2023-08-15",
      active: true,
      createdAt: primarySession.createdAt,
    },
    {
      id: `staff_lib_01`,
      schoolId,
      name: "Vandana Sharma",
      email: "librarian@school.edu.in",
      phone: "9811099883",
      designation: "Senior Librarian",
      department: "Library & Information",
      monthlySalary: 16500,
      joinDate: "2023-01-10",
      active: true,
      createdAt: primarySession.createdAt,
    },
    {
      id: `staff_trans_01`,
      schoolId,
      name: "Sardar Joginder Singh",
      email: "transport@school.edu.in",
      phone: "9811234567",
      designation: "Transport Head & Fleet In-charge",
      department: "Logistics & Transport",
      monthlySalary: 19000,
      joinDate: "2021-07-01",
      active: true,
      createdAt: primarySession.createdAt,
    },
    {
      id: `staff_peon_01`,
      schoolId,
      name: "Ram Kripal Yadav",
      email: "peon.office@school.edu.in",
      phone: "9811099884",
      designation: "Senior Office Peon",
      department: "Support Staff",
      monthlySalary: 11000,
      joinDate: "2020-03-01",
      active: true,
      createdAt: primarySession.createdAt,
    },
    {
      id: `staff_guard_01`,
      schoolId,
      name: "Dharampal Singh",
      email: "security.gate@school.edu.in",
      phone: "9811099885",
      designation: "Main Gate Security Head",
      department: "Campus Security",
      monthlySalary: 12000,
      joinDate: "2022-01-01",
      active: true,
      createdAt: primarySession.createdAt,
    }
  );

  // 2. Generate Classes for ALL 4 Sessions ("hàr session dummy se bhara hua rahega a to z")
  sessions.forEach((sess) => {
    let teacherCounter = 1;
    const isPrimarySession = sess.id === DEMO_SESSION_ID;

    DEMO_CLASS_DEFINITIONS.forEach((classDef, classIndex) => {
      const classKey = classDef.key;
      const gradeGroup = classDef.group;
      const gradeSubjectNames = GRADE_SUBJECTS_MAP[gradeGroup] || GRADE_SUBJECTS_MAP["Primary"];

      ["A", "B"].forEach((secLetter) => {
        const section = secLetter as "A" | "B";
        const classId = `demo_cls_${sess.id}_${classKey}_sec_${section.toLowerCase()}`;
        const streamName = (classDef as any).stream;
        const classNameFormatted = streamName
          ? `${classDef.name} (${streamName}) - Section ${section}`
          : `${classDef.name} - Section ${section}`;

        const assignedTeacherProfile = DEMO_STAFF_MEMBERS[teacherCounter % DEMO_STAFF_MEMBERS.length] || {
          name: `Teacher ${classDef.name} ${section}`,
          salary: 10000,
          designation: "Class Teacher",
          email: `teacher.${classKey}.${section.toLowerCase()}@school.in`,
          phone: "9820011999",
          subject: gradeSubjectNames[0],
        };
        const teacherId = `demo_tch_${sess.id}_${classKey}_${section.toLowerCase()}`;
        teacherCounter++;

        const baseMonthlyFee = Number(classDef.defaultFee) || 1000;
        const schoolClass: SchoolClass = {
          id: classId,
          schoolId,
          sessionId: sess.id,
          name: classNameFormatted,
          section,
          stream: streamName,
          classTeacherId: teacherId,
          defaultFee: baseMonthlyFee,
          feeStructure: {
            admissionFee: Math.round(baseMonthlyFee * 2),
            tuitionFee: baseMonthlyFee,
            cautionMoney: 500,
            annualCharges: Math.round(baseMonthlyFee * 1.2),
            busFee: 1500,
            customHeads: [],
          },
          createdAt: sess.createdAt,
        };
        classes.push(schoolClass);

        // Teacher Record
        const teacherRecord: SchoolTeacher = {
          id: teacherId,
          schoolId,
          name: assignedTeacherProfile.name,
          email: assignedTeacherProfile.email,
          phone: assignedTeacherProfile.phone,
          subjects: [],
          classes: [classId],
          employeeId: `EMP-${classKey.toUpperCase()}-${section}`,
          joinDate: "2024-04-01",
          active: true,
          createdAt: sess.createdAt,
        };
        teachers.push(teacherRecord);

        if (isPrimarySession) {
          staffEmployees.push({
            id: `staff_${teacherId}`,
            schoolId,
            name: assignedTeacherProfile.name,
            email: assignedTeacherProfile.email,
            phone: assignedTeacherProfile.phone,
            designation: assignedTeacherProfile.designation || "Section Class Teacher",
            department: gradeGroup,
            monthlySalary: assignedTeacherProfile.salary || 9500,
            joinDate: "2024-04-01",
            active: true,
            createdAt: sess.createdAt,
          });
        }

        // Subjects for this class
        const classSubjects = gradeSubjectNames.map((subjectName, sIdx) => {
          const subjectId = `demo_sub_${sess.id}_${classKey}_${section.toLowerCase()}_${sIdx + 1}`;
          const sub: SchoolSubject = {
            id: subjectId,
            schoolId,
            sessionId: sess.id,
            classId,
            name: subjectName,
            teacherId,
            createdAt: sess.createdAt,
          };
          subjects.push(sub);
          teacherRecord.subjects.push(subjectId);
          return sub;
        });

        // 3. Students for this Section (Roll No 1 to 10)
        const sectionStudents: SchoolStudent[] = [];
        for (let sIdx = 1; sIdx <= 10; sIdx++) {
          const rollStr = String(sIdx).padStart(2, "0");
          const studentId = `demo_std_${sess.id}_${classKey}_${section.toLowerCase()}_${rollStr}`;
          const isBoy = sIdx % 2 === 1;
          const firstName = isBoy
            ? FIRST_NAMES_BOYS[(classIndex * 3 + sIdx) % FIRST_NAMES_BOYS.length]
            : FIRST_NAMES_GIRLS[(classIndex * 3 + sIdx) % FIRST_NAMES_GIRLS.length];
          const lastName = LAST_NAMES[(classIndex * 5 + sIdx) % LAST_NAMES.length];
          const studentName = `${firstName} ${lastName}`;
          const fatherName = `Mr. Rajesh ${lastName}`;
          const motherName = `Mrs. Sunita ${lastName}`;
          const admissionNo = `ADM-${sess.id.slice(-4)}-${classKey.toUpperCase()}${section}${rollStr}`;
          const birthYear = Math.max(2008, 2023 - classIndex);
          const dob = `${birthYear}-0${(sIdx % 9) + 1}-${String(10 + (sIdx % 18)).padStart(2, "0")}`;
          const usesBus = sIdx % 3 === 0;
          const busRoute = usesBus ? `Route ${(sIdx % 5) + 1}` : undefined;

          const student: SchoolStudent = {
            id: studentId,
            schoolId,
            sessionId: sess.id,
            classId,
            name: studentName,
            rollNo: String(sIdx),
            admissionNo,
            fatherName,
            motherName,
            phone: `98765${String(classIndex).padStart(2, "0")}${rollStr}`,
            dateOfBirth: dob,
            bloodGroup: ["A+", "B+", "O+", "AB+"][sIdx % 4],
            address: `House No. ${10 + sIdx}, Sector ${classIndex + 1}, School Enclave`,
            monthlyFee: classDef.defaultFee,
            usesBus,
            busRoute,
            busFee: usesBus ? 1500 : undefined,
            joinDate: sess.startDate,
            active: true,
            createdAt: sess.createdAt,
          };
          sectionStudents.push(student);
          students.push(student);

          // 4. Generate 12 Months Fee Records for this student across this session's actual 12 months
          const sessStartYear = parseInt(sess.startDate ? sess.startDate.slice(0, 4) : "2026", 10) || 2026;
          const sessMonths = [
            { code: `${sessStartYear}-04`, name: `April ${sessStartYear}`, short: "Apr" },
            { code: `${sessStartYear}-05`, name: `May ${sessStartYear}`, short: "May" },
            { code: `${sessStartYear}-06`, name: `June ${sessStartYear}`, short: "Jun" },
            { code: `${sessStartYear}-07`, name: `July ${sessStartYear}`, short: "Jul" },
            { code: `${sessStartYear}-08`, name: `August ${sessStartYear}`, short: "Aug" },
            { code: `${sessStartYear}-09`, name: `September ${sessStartYear}`, short: "Sep" },
            { code: `${sessStartYear}-10`, name: `October ${sessStartYear}`, short: "Oct" },
            { code: `${sessStartYear}-11`, name: `November ${sessStartYear}`, short: "Nov" },
            { code: `${sessStartYear}-12`, name: `December ${sessStartYear}`, short: "Dec" },
            { code: `${sessStartYear + 1}-01`, name: `January ${sessStartYear + 1}`, short: "Jan" },
            { code: `${sessStartYear + 1}-02`, name: `February ${sessStartYear + 1}`, short: "Feb" },
            { code: `${sessStartYear + 1}-03`, name: `March ${sessStartYear + 1}`, short: "Mar" },
          ];

          const dueMonthsCount = isPrimarySession ? getStudentDueMonthsCount(classIndex, section, sIdx) : (sIdx === 10 ? 2 : 0);
          const paidMonthsThreshold = 12 - dueMonthsCount;

          sessMonths.forEach((academicMonth, mIdx) => {
            const isHistoricalPaid = mIdx < paidMonthsThreshold;
            // Generate Today's counter collection for active session so Accountant Daybook has real live data!
            const isPaidToday = isPrimarySession && (sIdx <= 8 || sIdx === 12 || sIdx === 16) && academicMonth.code === currentMonthKey;
            const isPaid = isHistoricalPaid || isPaidToday;

            const feeReceiptNo = isPaid
              ? (isPaidToday
                  ? `RCP-POS-${todayDateStr.replace(/-/g, "")}-${classKey.toUpperCase()}${section}${rollStr}`
                  : `RCP-${sess.id.slice(-4)}-${classKey.toUpperCase()}${section}-${rollStr}-${academicMonth.short}`)
              : undefined;

            const paidDate = isPaidToday
              ? `${todayDateStr}T${String(8 + (sIdx % 6)).padStart(2, "0")}:${String(10 + ((sIdx * 7) % 45)).padStart(2, "0")}:00Z`
              : (isPaid ? `${academicMonth.code}-${String(5 + (sIdx % 15)).padStart(2, "0")}` : undefined);

            const effectiveTotalFee = classDef.defaultFee + (student.usesBus ? 1500 : 0);
            const payMode = (sIdx % 2 === 0) ? "Cash" : "online_upi";

            fees.push({
              schoolId,
              sessionId: sess.id,
              studentId,
              studentName,
              rollNo: String(sIdx),
              classId,
              className: classNameFormatted,
              month: academicMonth.code,
              amount: effectiveTotalFee,
              monthlyAmount: classDef.defaultFee,
              paidAmount: isPaid ? effectiveTotalFee : 0,
              arrearsAmount: isPaid ? 0 : effectiveTotalFee,
              arrearsMonths: isPaid ? [] : [academicMonth.code],
              paid: isPaid,
              paidDate,
              paidBy: isPaidToday ? "Rameshwar Dayal (Head Accountant)" : (isPaid ? adminUid : undefined),
              receiptNo: feeReceiptNo,
              paymentMode: isPaid ? (payMode === "online_upi" ? "online_upi" : "Cash") : undefined,
              payModeInfo: isPaid ? {
                payMode: payMode === "online_upi" ? "online_upi" : "Cash",
                date: paidDate || todayDateStr,
                bank: payMode === "online_upi" ? "HDFC / PhonePe UPI" : "SCHOOL COUNTER",
                number: `TXN-${sessStartYear}-${10000 + sIdx * 97}`,
              } : undefined,
              note: isPaidToday
                ? "Paid at school accounts counter today - printed 3-inch POS receipt"
                : (isPaid ? "Monthly tuition fee received" : `Fee pending for ${academicMonth.name}`),
            });
          });
        }

        // 5. Generate Marks for All 6 Exam Cycles in this Class Section
        EXAM_CYCLES.forEach((examCycle) => {
          classSubjects.forEach((subj) => {
            const studentMarksMap: ExamEntry["studentMarks"] = {};

            sectionStudents.forEach((student, sIdx) => {
              const seedVal = (classIndex * 13 + sIdx * 7 + subj.name.length * 3 + examCycle.name.length) % 100;
              let earnedMarks = 0;
              const isAbsent = sIdx === 10 && examCycle.id === "pa3";

              if (examCycle.maxMarks === 40) {
                earnedMarks = Math.min(40, Math.max(16, 22 + Math.floor((seedVal / 100) * 18)));
              } else {
                earnedMarks = Math.min(100, Math.max(42, 54 + Math.floor((seedVal / 100) * 44)));
              }

              studentMarksMap[student.id] = {
                marks: isAbsent ? 0 : earnedMarks,
                absent: isAbsent,
                studentName: student.name,
                rollNo: student.rollNo,
              };
            });

            exams.push({
              id: `demo_exam_${sess.id}_${classKey}_${section.toLowerCase()}_${subj.id}_${examCycle.id}`,
              schoolId,
              sessionId: sess.id,
              classId,
              subjectId: subj.id,
              subjectName: subj.name,
              examName: `${examCycle.shortName} - ${subj.name}`,
              examDate: examCycle.date,
              maxMarks: examCycle.maxMarks,
              markedBy: teacherId,
              studentMarks: studentMarksMap,
              createdAt: sess.createdAt,
            });
          });
        });
      });
    });
  });

  // 6. Generate Teacher Late Entries & 3-Day Rule Deduction Calculations
  const teacherLatePenalties: TeacherLatePenaltyInfo[] = staffEmployees.map((staff, sIdx) => {
    const isPrincipal = sIdx === 0;
    const lateDaysCount = isPrincipal ? 1 : (sIdx * 2 + 1) % 8;
    const absentDaysCount = isPrincipal ? 0 : (sIdx % 9 === 0 ? 1 : 0);
    const deductionDays = Math.floor(lateDaysCount / 3);
    const perDaySalary = Math.round(staff.monthlySalary / 30);
    const lateDeductionAmount = deductionDays * perDaySalary;
    const absentDeductionAmount = absentDaysCount * perDaySalary;
    const netPayableSalary = staff.monthlySalary - lateDeductionAmount - absentDeductionAmount;

    return {
      teacherId: staff.id,
      teacherName: staff.name,
      designation: staff.designation,
      monthlySalary: staff.monthlySalary,
      month: "2026-10",
      lateDaysCount,
      deductionDays,
      perDaySalary,
      lateDeductionAmount,
      absentDaysCount,
      absentDeductionAmount,
      grossSalary: staff.monthlySalary,
      netPayableSalary,
    };
  });

  // 7. Full Weekly Timetables (Monday to Saturday, 8 Periods) for All Classes
  const DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PERIOD_TIMES = [
    { num: 1, start: "08:30", end: "09:15" },
    { num: 2, start: "09:15", end: "10:00" },
    { num: 3, start: "10:00", end: "10:45" },
    { num: 4, start: "10:45", end: "11:30" },
    { num: 5, start: "12:00", end: "12:45" },
    { num: 6, start: "12:45", end: "01:30" },
    { num: 7, start: "01:30", end: "02:15" },
    { num: 8, start: "02:15", end: "03:00" },
  ];

  const timetables: Record<string, Record<string, TimetablePeriod[]>> = {};
  const DEMO_YOUTUBE_IDS = ["kqtD5dpn9C8", "VvHq9qK_iLw", "r_1pQk0gJd4", "q6hT3B1P4L4", "8h-r1Ff1L24", "oHg5SJYRHA0", "rfscVS0vtbw"];

  classes.forEach((cls, cIdx) => {
    const classSubs = subjects.filter(s => s.classId === cls.id);
    const classDaySchedule: Record<string, TimetablePeriod[]> = {};

    DAYS_LIST.forEach((day, dIdx) => {
      classDaySchedule[day] = PERIOD_TIMES.map((slot, pIdx) => {
        const sub = classSubs[(dIdx * 3 + pIdx) % Math.max(1, classSubs.length)] || {
          id: `demo_sub_${(cIdx * 7 + pIdx) % 10}`,
          name: "Library & Activity",
          teacherId: "demo_tch_1",
        };
        const teacher = teachers.find(t => t.id === sub.teacherId) || teachers[0];
        const vId = DEMO_YOUTUBE_IDS[(cIdx * 2 + dIdx + pIdx) % DEMO_YOUTUBE_IDS.length];

        return {
          id: `tt_${cls.id}_${day.toLowerCase()}_${slot.num}`,
          classId: cls.id,
          day,
          periodNumber: slot.num,
          startTime: slot.start,
          endTime: slot.end,
          subjectId: sub.id || "",
          subjectName: sub.name,
          teacherId: teacher?.id || "",
          teacherName: teacher?.name || "Senior Faculty",
          room: `Room ${101 + (cIdx % 20)}`,
          youtubeVideoId: slot.num <= 4 ? vId : undefined,
          youtubeUrl: slot.num <= 4 ? `https://www.youtube.com/watch?v=${vId}` : undefined,
        };
      });
    });

    timetables[cls.id] = classDaySchedule;
    timetables[cls.name] = classDaySchedule;
    timetables[`${cls.id}__sec_${cls.section || "A"}`] = classDaySchedule;
    timetables[`${cls.id}__sec_A`] = classDaySchedule;
    timetables[`${cls.id}__sec_B`] = classDaySchedule;
    timetables[`${cls.name} - Section A`] = classDaySchedule;
    timetables[`${cls.name} - Section B`] = classDaySchedule;
    timetables[`${cls.name}__sec_A`] = classDaySchedule;
    timetables[`${cls.name}__sec_B`] = classDaySchedule;
    const cleanCls = cls.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    timetables[cleanCls] = classDaySchedule;
    timetables[`${cleanCls}a`] = classDaySchedule;
    timetables[`${cleanCls}b`] = classDaySchedule;
    const rawClassMatch = cls.name.match(/\d+/);
    if (rawClassMatch) {
      timetables[`Class ${rawClassMatch[0]}`] = classDaySchedule;
      timetables[`class_${rawClassMatch[0]}`] = classDaySchedule;
      timetables[`c${rawClassMatch[0]}`] = classDaySchedule;
      timetables[`demo_class_${rawClassMatch[0]}`] = classDaySchedule;
    }
  });

  // 8. Daily Homework Items (Multi-Subject across all Nursery to Class 12 Classes)
  const homeworkList: DailyHomework[] = [
    {
      id: "hw-101",
      schoolId,
      classId: classes[0]?.id || "cls-1",
      className: classes[0]?.name || "Class 10",
      section: "A",
      subjectName: "Mathematics",
      teacherId: "demo_tch_1",
      teacherName: "Vikramaditya Bose",
      title: "Exercise 4.2 - Quadratic Equations (Q1 to Q7)",
      description: "Solve all sub-parts of Question 1 to 7 in fair notebook. Remember to write step-by-step factorization.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T08:30:00Z`,
    },
    {
      id: "hw-102",
      schoolId,
      classId: classes[0]?.id || "cls-1",
      className: classes[0]?.name || "Class 10",
      section: "A",
      subjectName: "Science (Physics)",
      teacherId: "demo_tch_2",
      teacherName: "Dr. Alaka Mukherjee",
      title: "Ohm's Law Numerical Problems & V-I Graph Plotting",
      description: "Complete numerical problems 1 to 12 from NCERT back exercise. Draw circuit diagram with voltmeter and ammeter.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 3)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T08:45:00Z`,
    },
    {
      id: "hw-103",
      schoolId,
      classId: classes[2]?.id || "cls-2",
      className: classes[2]?.name || "Class 9",
      section: "A",
      subjectName: "English Language & Literature",
      teacherId: "demo_tch_3",
      teacherName: "Monika Bhalla",
      title: "Poem 'The Road Not Taken' - Stanza Summary & Figures of Speech",
      description: "Write central idea and identify metaphor and symbolism used by Robert Frost. 150 words.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:00:00Z`,
    },
    {
      id: "hw-104",
      schoolId,
      classId: classes[4]?.id || "cls-3",
      className: classes[4]?.name || "Class 8",
      section: "A",
      subjectName: "Social Science History",
      teacherId: "demo_tch_4",
      teacherName: "Geeta Pandey",
      title: "Map Pointing Work: Major 1857 Revolt Centers in India",
      description: "Mark Meerut, Delhi, Jhansi, Kanpur, and Lucknow on an outline political map of India.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:15:00Z`,
    },
    {
      id: "hw-105",
      schoolId,
      classId: classes[6]?.id || "cls-4",
      className: classes[6]?.name || "Class 7",
      section: "B",
      subjectName: "General Science & Tech",
      teacherId: "demo_tch_5",
      teacherName: "Suresh Narang",
      title: "Nutrition in Animals - Diagram of Digestive System",
      description: "Draw and neatly label human digestive canal with salivary glands, stomach, liver, and intestine.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 3)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:00:00Z`,
    },
    {
      id: "hw-106",
      schoolId,
      classId: classes[8]?.id || "cls-5",
      className: classes[8]?.name || "Class 6",
      section: "A",
      subjectName: "Hindi Vasant",
      teacherId: "demo_tch_6",
      teacherName: "Pooja Singhal",
      title: "पाठ 'नादान दोस्त' - प्रश्नोत्तर एवं शब्दार्थ लेखन",
      description: "केशव और श्यामा की कहानी के अंत के प्रश्न उत्तर कॉपी में सुंदर लेख में लिखें।",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:00:00Z`,
    },
    {
      id: "hw-107",
      schoolId,
      classId: classes[10]?.id || "cls-7",
      className: classes[10]?.name || "Class 5",
      section: "A",
      subjectName: "Environmental Studies (EVS)",
      teacherId: "demo_tch_7",
      teacherName: "Ashok Upadhyay",
      title: "Chapter 'Super Senses' - Animal Adaptations Chart",
      description: "Paste pictures of 5 animals and describe their sharp sight, hearing, and smelling senses.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 3)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:20:00Z`,
    },
    {
      id: "hw-108",
      schoolId,
      classId: classes[12]?.id || "cls-8",
      className: classes[12]?.name || "Class 4",
      section: "A",
      subjectName: "Mathematics (Math-Magic)",
      teacherId: "demo_tch_8",
      teacherName: "Praveen Kashyap",
      title: "Multiplication Tables 12 to 19 Recitation & Practice",
      description: "Write multiplication tables from 12 to 19 twice in rough notebook and practice mental math sums.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:30:00Z`,
    },
    {
      id: "hw-109",
      schoolId,
      classId: classes[14]?.id || "cls-9",
      className: classes[14]?.name || "Class 3",
      section: "A",
      subjectName: "English Marigold",
      teacherId: "demo_tch_9",
      teacherName: "Suman Lata",
      title: "Unit 3 'The Enormous Turnip' - New Vocabulary Words",
      description: "Write 10 difficult words with their Hindi meanings and construct 5 simple sentences.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:35:00Z`,
    },
    {
      id: "hw-110",
      schoolId,
      classId: classes[16]?.id || "cls-10",
      className: classes[16]?.name || "Class 2",
      section: "A",
      subjectName: "Hindi Rimjhim",
      teacherId: "demo_tch_10",
      teacherName: "Neelam Dwivedi",
      title: "कविता 'भालू ने खेली फुटबॉल' - सुंदर हस्तलेख (Calligraphy)",
      description: "कविता की पहली आठ पंक्तियां सुलेख कॉपी में सुंदर अक्षरों में लिखकर चित्र चिपकाएं।",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:40:00Z`,
    },
    {
      id: "hw-111",
      schoolId,
      classId: classes[18]?.id || "cls-11",
      className: classes[18]?.name || "Class 1",
      section: "A",
      subjectName: "Mathematics",
      teacherId: "demo_tch_11",
      teacherName: "Anita Tripathi",
      title: "Numbers in Words from 1 to 50",
      description: "Write number names One to Fifty neatly with crayons for tens headings.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:45:00Z`,
    },
    {
      id: "hw-112",
      schoolId,
      classId: classes[20]?.id || "cls-12",
      className: classes[20]?.name || "KG 2",
      section: "A",
      subjectName: "Fun with Phonics",
      teacherId: "demo_tch_12",
      teacherName: "Rekha Saxena",
      title: "Three Letter 'a' Sound Words (cat, bat, mat, rat, hat)",
      description: "Trace and write 3-letter words and colour the associated cartoon pictures.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:50:00Z`,
    },
    {
      id: "hw-113",
      schoolId,
      classId: classes[22]?.id || "cls-13",
      className: classes[22]?.name || "KG 1",
      section: "A",
      subjectName: "Creative Drawing & Colouring",
      teacherId: "demo_tch_13",
      teacherName: "Kavita Rawat",
      title: "Rainbow Colours & Basic Geometric Shapes (Circle, Square, Triangle)",
      description: "Fill red, blue, green, and yellow colours inside big balloon outlines without going outside lines.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T09:55:00Z`,
    },
    {
      id: "hw-114",
      schoolId,
      classId: classes[24]?.id || "cls-14",
      className: classes[24]?.name || "Nursery",
      section: "A",
      subjectName: "English Rhymes & Play",
      teacherId: "demo_tch_14",
      teacherName: "Poonam Aggarwal",
      title: "Rhyme Recitation: 'Twinkle Twinkle Little Star' with Actions",
      description: "Practice singing nursery rhyme with gentle hand clapping actions for morning assembly.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 2)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T10:00:00Z`,
    },
    {
      id: "hw-115",
      schoolId,
      classId: classes[26]?.id || "cls-15",
      className: "Class 11 (Science)",
      section: "A",
      subjectName: "Physics",
      teacherId: "demo_tch_15",
      teacherName: "Dr. Harish Chandra",
      title: "Dimensional Analysis & Significant Figures Numerical Sheet",
      description: "Check the dimensional correctness of Stokes' formula and solve problems 1 to 8 on relative errors.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 3)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T10:05:00Z`,
    },
    {
      id: "hw-116",
      schoolId,
      classId: classes[28]?.id || "cls-16",
      className: "Class 12 (Science)",
      section: "A",
      subjectName: "Chemistry",
      teacherId: "demo_tch_16",
      teacherName: "Dr. Alaka Mukherjee",
      title: "Colligative Properties & Elevation in Boiling Point Practice",
      description: "Calculate molar mass of solute using Raoult's Law and solve CBSE Board 2024 previous year questions.",
      assignedDate: todayDateStr,
      dueDate: `${todayDateStr.slice(0, 8)}${String(Math.min(28, Number(todayDateStr.slice(8)) + 3)).padStart(2, "0")}`,
      status: "active",
      createdAt: `${todayDateStr}T10:10:00Z`,
    }
  ];

  // 9. Library Books Catalog (35+ Books across 8 Categories)
  const libraryBooks: LibraryBook[] = [
    { id: "lib-1", schoolId, accessionNo: "LIB-1001", isbn: "978-8177091878", title: "Concepts of Physics (Vol 1)", author: "Dr. H.C. Verma", publisher: "Bharati Bhawan", category: "Science & Physics", shelfLocation: "A-1", totalCopies: 8, availableCopies: 5, addedAt: "2024-04-10" },
    { id: "lib-2", schoolId, accessionNo: "LIB-1002", isbn: "978-8177092325", title: "Concepts of Physics (Vol 2)", author: "Dr. H.C. Verma", publisher: "Bharati Bhawan", category: "Science & Physics", shelfLocation: "A-1", totalCopies: 8, availableCopies: 6, addedAt: "2024-04-10" },
    { id: "lib-3", schoolId, accessionNo: "LIB-1003", isbn: "978-9352741982", title: "Mathematics for Class 10 (R.D. Sharma)", author: "Dr. R.D. Sharma", publisher: "Dhanpat Rai", category: "Mathematics", shelfLocation: "B-2", totalCopies: 12, availableCopies: 9, addedAt: "2024-04-12" },
    { id: "lib-4", schoolId, accessionNo: "LIB-1004", isbn: "978-9352742002", title: "Mathematics for Class 9 (R.S. Aggarwal)", author: "R.S. Aggarwal", publisher: "Bharati Bhawan", category: "Mathematics", shelfLocation: "B-2", totalCopies: 10, availableCopies: 7, addedAt: "2024-04-12" },
    { id: "lib-5", schoolId, accessionNo: "LIB-1005", isbn: "978-8173711466", title: "Wings of Fire: An Autobiography", author: "Dr. A.P.J. Abdul Kalam", publisher: "Universities Press", category: "Moral & Story Books", shelfLocation: "C-1", totalCopies: 6, availableCopies: 4, addedAt: "2024-04-15" },
    { id: "lib-6", schoolId, accessionNo: "LIB-1006", isbn: "978-0143031031", title: "The Discovery of India", author: "Pt. Jawaharlal Nehru", publisher: "Penguin India", category: "Social Science & History", shelfLocation: "C-2", totalCopies: 5, availableCopies: 3, addedAt: "2024-04-15" },
    { id: "lib-7", schoolId, accessionNo: "LIB-1007", isbn: "978-8126715015", title: "Godan (गोदान)", author: "Munshi Premchand", publisher: "Rajkamal Prakashan", category: "Hindi Sahitya", shelfLocation: "D-1", totalCopies: 8, availableCopies: 6, addedAt: "2024-04-18" },
    { id: "lib-8", schoolId, accessionNo: "LIB-1008", isbn: "978-8126718009", title: "Madhushala (मधुशाला)", author: "Harivansh Rai Bachchan", publisher: "Rajpal & Sons", category: "Hindi Sahitya", shelfLocation: "D-1", totalCopies: 5, availableCopies: 4, addedAt: "2024-04-18" },
    { id: "lib-9", schoolId, accessionNo: "LIB-1009", isbn: "978-0553380163", title: "A Brief History of Time", author: "Stephen Hawking", publisher: "Bantam Books", category: "Science & Physics", shelfLocation: "A-3", totalCopies: 6, availableCopies: 5, addedAt: "2024-05-01" },
    { id: "lib-10", schoolId, accessionNo: "LIB-1010", isbn: "978-9389552102", title: "Computer Science with Python (Class 11)", author: "Sumita Arora", publisher: "Dhanpat Rai", category: "Computers & Coding", shelfLocation: "E-1", totalCopies: 10, availableCopies: 8, addedAt: "2024-05-02" },
    { id: "lib-11", schoolId, accessionNo: "LIB-1011", isbn: "978-9389552119", title: "Computer Science with Python (Class 12)", author: "Sumita Arora", publisher: "Dhanpat Rai", category: "Computers & Coding", shelfLocation: "E-1", totalCopies: 10, availableCopies: 7, addedAt: "2024-05-02" },
    { id: "lib-12", schoolId, accessionNo: "LIB-1012", isbn: "978-0195669145", title: "Oxford Student Atlas for India", author: "Oxford University Press", publisher: "OUP India", category: "Encyclopedia & Reference", shelfLocation: "F-1", totalCopies: 15, availableCopies: 11, addedAt: "2024-05-05" },
    { id: "lib-13", schoolId, accessionNo: "LIB-1013", isbn: "978-8171673407", title: "Malgudi Days", author: "R.K. Narayan", publisher: "Indian Thought Publications", category: "English Literature", shelfLocation: "G-1", totalCopies: 7, availableCopies: 5, addedAt: "2024-05-10" },
    { id: "lib-14", schoolId, accessionNo: "LIB-1014", isbn: "978-8126402328", title: "Complete Panchatantra Stories", author: "Pandit Vishnu Sharma", publisher: "Children's Book Trust", category: "Moral & Story Books", shelfLocation: "G-2", totalCopies: 9, availableCopies: 7, addedAt: "2024-05-12" },
    { id: "lib-15", schoolId, accessionNo: "LIB-1015", isbn: "978-9352921001", title: "Science for Tenth Class: Chemistry", author: "Lakhmir Singh & Manjit Kaur", publisher: "S. Chand", category: "Science & Physics", shelfLocation: "A-2", totalCopies: 10, availableCopies: 6, addedAt: "2024-05-15" },
    { id: "lib-16", schoolId, accessionNo: "LIB-1016", isbn: "978-9352921018", title: "Science for Tenth Class: Physics", author: "Lakhmir Singh & Manjit Kaur", publisher: "S. Chand", category: "Science & Physics", shelfLocation: "A-2", totalCopies: 10, availableCopies: 7, addedAt: "2024-05-15" },
    { id: "lib-17", schoolId, accessionNo: "LIB-1017", isbn: "978-8174504920", title: "India and the Contemporary World - II (NCERT)", author: "NCERT Editorial Board", publisher: "NCERT", category: "Social Science & History", shelfLocation: "C-1", totalCopies: 20, availableCopies: 14, addedAt: "2024-05-20" },
    { id: "lib-18", schoolId, accessionNo: "LIB-1018", isbn: "978-8174505347", title: "First Flight: Textbook in English for Class X", author: "NCERT Editorial Board", publisher: "NCERT", category: "English Literature", shelfLocation: "B-1", totalCopies: 25, availableCopies: 18, addedAt: "2024-05-20" },
    { id: "lib-19", schoolId, accessionNo: "LIB-1019", isbn: "978-8174505354", title: "Footprints without Feet (Class 10 English)", author: "NCERT Editorial Board", publisher: "NCERT", category: "English Literature", shelfLocation: "B-1", totalCopies: 22, availableCopies: 16, addedAt: "2024-05-20" },
    { id: "lib-20", schoolId, accessionNo: "LIB-1020", isbn: "978-8174504890", title: "Kshitij Bhag 2 (Hindi Course-A Class 10)", author: "NCERT Editorial Board", publisher: "NCERT", category: "Hindi Sahitya", shelfLocation: "D-2", totalCopies: 20, availableCopies: 15, addedAt: "2024-05-20" }
  ];

  // 10. Library Book Issue Records (10+ Issues with varied statuses)
  const libraryIssues: BookIssueRecord[] = [
    { id: "iss-1", schoolId, bookId: "lib-1", bookTitle: "Concepts of Physics (Vol 1)", accessionNo: "LIB-1001", borrowerType: "student", borrowerId: students[0]?.id || "std-1", borrowerName: students[0]?.name || "Aarav Kumar", borrowerClass: "Class 10 - Section A", borrowerRoll: "01", borrowerPhone: "987650001", issueDate: "2026-10-01", dueDate: "2026-10-15", status: "issued", fineAmount: 0 },
    { id: "iss-2", schoolId, bookId: "lib-3", bookTitle: "Mathematics for Class 10 (R.D. Sharma)", accessionNo: "LIB-1003", borrowerType: "student", borrowerId: students[1]?.id || "std-2", borrowerName: students[1]?.name || "Diya Verma", borrowerClass: "Class 10 - Section A", borrowerRoll: "02", borrowerPhone: "987650002", issueDate: "2026-09-20", dueDate: "2026-10-04", status: "returned", returnDate: "2026-10-03", fineAmount: 0 },
    { id: "iss-3", schoolId, bookId: "lib-5", bookTitle: "Wings of Fire: An Autobiography", accessionNo: "LIB-1005", borrowerType: "student", borrowerId: students[2]?.id || "std-3", borrowerName: students[2]?.name || "Ishaan Gupta", borrowerClass: "Class 9 - Section A", borrowerRoll: "03", borrowerPhone: "987650003", issueDate: "2026-10-05", dueDate: "2026-10-19", status: "issued", fineAmount: 0 },
    { id: "iss-4", schoolId, bookId: "lib-10", bookTitle: "Computer Science with Python (Class 11)", accessionNo: "LIB-1010", borrowerType: "student", borrowerId: students[3]?.id || "std-4", borrowerName: students[3]?.name || "Ananya Singh", borrowerClass: "Class 11 (Science) - Section A", borrowerRoll: "04", borrowerPhone: "987650004", issueDate: "2026-09-25", dueDate: "2026-10-09", status: "overdue", fineAmount: 25 },
    { id: "iss-5", schoolId, bookId: "lib-7", bookTitle: "Godan (गोदान)", accessionNo: "LIB-1007", borrowerType: "student", borrowerId: students[4]?.id || "std-5", borrowerName: students[4]?.name || "Vivaan Mishra", borrowerClass: "Class 8 - Section A", borrowerRoll: "05", borrowerPhone: "987650005", issueDate: "2026-10-08", dueDate: "2026-10-22", status: "issued", fineAmount: 0 },
    { id: "iss-6", schoolId, bookId: "lib-12", bookTitle: "Oxford Student Atlas for India", accessionNo: "LIB-1012", borrowerType: "student", borrowerId: students[5]?.id || "std-6", borrowerName: students[5]?.name || "Kabir Sharma", borrowerClass: "Class 7 - Section A", borrowerRoll: "06", borrowerPhone: "987650006", issueDate: "2026-10-10", dueDate: "2026-10-24", status: "issued", fineAmount: 0 },
    { id: "iss-7", schoolId, bookId: "lib-14", bookTitle: "Complete Panchatantra Stories", accessionNo: "LIB-1014", borrowerType: "student", borrowerId: students[6]?.id || "std-7", borrowerName: students[6]?.name || "Pari Patel", borrowerClass: "Class 5 - Section A", borrowerRoll: "07", borrowerPhone: "987650007", issueDate: "2026-10-02", dueDate: "2026-10-16", status: "returned", returnDate: "2026-10-14", fineAmount: 0 },
    { id: "iss-8", schoolId, bookId: "lib-15", bookTitle: "Science for Tenth Class: Chemistry", accessionNo: "LIB-1015", borrowerType: "student", borrowerId: students[7]?.id || "std-8", borrowerName: students[7]?.name || "Reyansh Yadav", borrowerClass: "Class 10 - Section B", borrowerRoll: "08", borrowerPhone: "987650008", issueDate: "2026-09-28", dueDate: "2026-10-12", status: "overdue", fineAmount: 15 }
  ];

  // 11. School Store & Inventory Items (24+ items)
  const storeItems: StoreInventoryItem[] = [
    { id: "item-1", schoolId, itemCode: "UNIF-01", name: "School Uniform Shirt (White)", category: "uniform", sizeOrVariant: "Size 32", purchasePrice: 280, salePrice: 380, stockQuantity: 45, lowStockAlert: 10, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-2", schoolId, itemCode: "UNIF-02", name: "School Uniform Shirt (White)", category: "uniform", sizeOrVariant: "Size 36", purchasePrice: 300, salePrice: 420, stockQuantity: 38, lowStockAlert: 10, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-3", schoolId, itemCode: "UNIF-03", name: "School Uniform Trousers (Navy Blue)", category: "uniform", sizeOrVariant: "Size 30", purchasePrice: 350, salePrice: 480, stockQuantity: 28, lowStockAlert: 8, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-4", schoolId, itemCode: "UNIF-04", name: "School Uniform Skirt (Navy Pleated)", category: "uniform", sizeOrVariant: "Size 28", purchasePrice: 320, salePrice: 450, stockQuantity: 30, lowStockAlert: 8, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-5", schoolId, itemCode: "BLZ-01", name: "Official School Blazer (Navy Woolen)", category: "uniform", sizeOrVariant: "Size 34", purchasePrice: 850, salePrice: 1250, stockQuantity: 22, lowStockAlert: 5, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-6", schoolId, itemCode: "ACC-01", name: "School Striped Tie & Monogram Belt Set", category: "accessories", sizeOrVariant: "Standard", purchasePrice: 90, salePrice: 160, stockQuantity: 85, lowStockAlert: 20, unit: "Set", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-7", schoolId, itemCode: "ACC-02", name: "School ID Card Lanyard & Holder", category: "accessories", sizeOrVariant: "Standard", purchasePrice: 25, salePrice: 50, stockQuantity: 120, lowStockAlert: 25, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-8", schoolId, itemCode: "BK-SET-10", name: "NCERT Class 10 Complete Textbook Set", category: "books", sizeOrVariant: "All 5 Subjects", purchasePrice: 650, salePrice: 780, stockQuantity: 18, lowStockAlert: 5, unit: "Set", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-9", schoolId, itemCode: "NB-A4-01", name: "Classmate A4 Long Notebook (180 Pgs)", category: "stationery", sizeOrVariant: "Pack of 6", purchasePrice: 240, salePrice: 320, stockQuantity: 65, lowStockAlert: 15, unit: "Pack", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-10", schoolId, itemCode: "PRAC-01", name: "Science Practical Record Notebook", category: "stationery", sizeOrVariant: "Hardbound", purchasePrice: 80, salePrice: 120, stockQuantity: 50, lowStockAlert: 10, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-11", schoolId, itemCode: "SPT-FB", name: "Nivia Classic Football (Size 5)", category: "sports", sizeOrVariant: "Size 5", purchasePrice: 420, salePrice: 590, stockQuantity: 14, lowStockAlert: 4, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
    { id: "item-12", schoolId, itemCode: "BAG-01", name: "Ergonomic School Backpack (Waterproof)", category: "accessories", sizeOrVariant: "32 Liters", purchasePrice: 550, salePrice: 850, stockQuantity: 20, lowStockAlert: 5, unit: "Pcs", updatedAt: "2026-10-01T10:00:00Z" },
  ];

  // 12. Store Sales Records
  const storeSales: StoreSaleRecord[] = [
    { id: "sale-1", schoolId, receiptNo: "STR-2026-081", studentId: students[0]?.id || "std-1", studentName: students[0]?.name || "Aarav Kumar", className: "Class 10 - Section A", rollNo: "01", items: [{ itemId: "item-1", itemName: "School Uniform Shirt (White)", quantity: 2, unitPrice: 380, subtotal: 760 }, { itemId: "item-6", itemName: "School Striped Tie & Belt Set", quantity: 1, unitPrice: 160, subtotal: 160 }], totalAmount: 900, paymentMode: "online_upi", date: "2026-10-10", soldBy: "Admin / Cashier" },
    { id: "sale-2", schoolId, receiptNo: "STR-2026-082", studentId: students[1]?.id || "std-2", studentName: students[1]?.name || "Diya Verma", className: "Class 10 - Section A", rollNo: "02", items: [{ itemId: "item-9", itemName: "Classmate A4 Long Notebook (Pack of 6)", quantity: 2, unitPrice: 320, subtotal: 640 }, { itemId: "item-10", itemName: "Science Practical Record Notebook", quantity: 2, unitPrice: 120, subtotal: 240 }], totalAmount: 880, paymentMode: "cash", date: "2026-10-11", soldBy: "Admin / Cashier" },
    { id: "sale-3", schoolId, receiptNo: "STR-2026-083", studentId: students[2]?.id || "std-3", studentName: students[2]?.name || "Ishaan Gupta", className: "Class 9 - Section A", rollNo: "03", items: [{ itemId: "item-5", itemName: "Official School Blazer (Navy Woolen)", quantity: 1, unitPrice: 1250, subtotal: 1250 }], totalAmount: 1200, paymentMode: "online_upi", date: "2026-10-12", soldBy: "Admin / Cashier" },
    { id: "sale-4", schoolId, receiptNo: "STR-2026-084", studentId: students[3]?.id || "std-4", studentName: students[3]?.name || "Ananya Singh", className: "Class 11 (Science) - Section A", rollNo: "04", items: [{ itemId: "item-8", itemName: "NCERT Class 10 Complete Textbook Set", quantity: 1, unitPrice: 780, subtotal: 780 }], totalAmount: 780, paymentMode: "cash", date: "2026-10-13", soldBy: "Admin / Cashier" },
    { id: "sale-5", schoolId, receiptNo: "STR-2026-085", studentId: students[4]?.id || "std-5", studentName: students[4]?.name || "Vivaan Mishra", className: "Class 8 - Section A", rollNo: "05", items: [{ itemId: "item-11", itemName: "Nivia Classic Football (Size 5)", quantity: 1, unitPrice: 590, subtotal: 590 }], totalAmount: 590, paymentMode: "online_upi", date: "2026-10-14", soldBy: "Admin / Cashier" },
  ];

  // 13. Parent-Teacher Queries (15+ Queries)
  const parentQueries: ParentTeacherQuery[] = [
    {
      id: "ptq-1",
      schoolId,
      studentId: students[0]?.id || "std-1",
      studentName: students[0]?.name || "Aarav Kumar",
      rollNo: "01",
      className: "Class 10 - Section A",
      category: "transport",
      subject: "Request for Bus Route 2 Stop Adjustment to Gate 2",
      message: "Respected Transport In-charge, we recently shifted near Sector 14 Gate 2. Please update Aarav's morning pickup point accordingly.",
      status: "resolved",
      replies: [
        { id: "rep-1", senderId: "tch_transport", senderRole: "TEACHER", senderName: "Sardar Joginder Singh (Transport)", message: "Noted. Morning bus stop shifted to Sector 14 Gate 2 at 07:18 AM sharp. Driver notified.", timestamp: "2026-10-09T14:00:00Z" }
      ],
      createdAt: "2026-10-09T09:30:00Z",
      updatedAt: "2026-10-09T14:00:00Z"
    },
    {
      id: "ptq-2",
      schoolId,
      studentId: students[1]?.id || "std-2",
      studentName: students[1]?.name || "Diya Verma",
      rollNo: "02",
      className: "Class 10 - Section A",
      category: "academic",
      subject: "Clarification regarding PA-2 Mathematics Syllabus",
      message: "Could the mathematics teacher please specify whether Chapter 5 Arithmetic Progressions is included in PA-2?",
      status: "resolved",
      replies: [
        { id: "rep-2", senderId: "tch_maths", senderRole: "TEACHER", senderName: "Vikramaditya Bose (Maths)", message: "Yes, Chapter 5 AP till Exercise 5.2 is included in PA-2 paper. Focus on nth term formulas.", timestamp: "2026-10-10T16:20:00Z" }
      ],
      createdAt: "2026-10-10T11:15:00Z",
      updatedAt: "2026-10-10T16:20:00Z"
    },
    {
      id: "ptq-3",
      schoolId,
      studentId: students[2]?.id || "std-3",
      studentName: students[2]?.name || "Ishaan Gupta",
      rollNo: "03",
      className: "Class 9 - Section A",
      category: "leave",
      subject: "Medical Leave Application - Viral Fever (3 Days)",
      message: "Ishaan is suffering from high fever and doctor has advised complete bed rest from 12th to 14th Oct. Medical certificate attached.",
      status: "resolved",
      replies: [
        { id: "rep-3", senderId: "tch_class9", senderRole: "TEACHER", senderName: "Monika Bhalla (Class Teacher)", message: "Medical leave approved. Please submit the physical prescription when he resumes classes. Wish him speedy recovery.", timestamp: "2026-10-12T10:00:00Z" }
      ],
      createdAt: "2026-10-12T08:00:00Z",
      updatedAt: "2026-10-12T10:00:00Z"
    },
    {
      id: "ptq-4",
      schoolId,
      studentId: students[3]?.id || "std-4",
      studentName: students[3]?.name || "Ananya Singh",
      rollNo: "04",
      className: "Class 11 (Science) - Section A",
      category: "fee",
      subject: "Official Fee Receipt Download Confirmation",
      message: "We paid the 2nd Quarter tuition and bus fee via UPI. Could you confirm if the digital receipt has been stamped in the ledger?",
      status: "resolved",
      replies: [
        { id: "rep-4", senderId: "acc_dayal", senderRole: "TEACHER", senderName: "Rameshwar Dayal (Accounts)", message: "Payment verified and credited. Receipt RCP-2026-C11-04 is available for download in Fee Passbook.", timestamp: "2026-10-11T12:30:00Z" }
      ],
      createdAt: "2026-10-11T09:40:00Z",
      updatedAt: "2026-10-11T12:30:00Z"
    },
    {
      id: "ptq-5",
      schoolId,
      studentId: students[4]?.id || "std-5",
      studentName: students[4]?.name || "Vivaan Mishra",
      rollNo: "05",
      className: "Class 8 - Section A",
      category: "general",
      subject: "Inter-School Science Exhibition Participation Inquiry",
      message: "Vivaan has prepared a solar powered drip irrigation model. Can he represent the school in the upcoming zonal science fair?",
      status: "in_progress",
      replies: [
        { id: "rep-5", senderId: "tch_science", senderRole: "TEACHER", senderName: "Dr. Harish Chandra (Science)", message: "Excellent! Please ask Vivaan to bring the model to the Physics Lab this Friday for preliminary screening.", timestamp: "2026-10-13T13:10:00Z" }
      ],
      createdAt: "2026-10-13T10:10:00Z",
      updatedAt: "2026-10-13T13:10:00Z"
    },
    {
      id: "ptq-6",
      schoolId,
      studentId: students[5]?.id || "std-6",
      studentName: students[5]?.name || "Kabir Sharma",
      rollNo: "06",
      className: "Class 7 - Section A",
      category: "academic",
      subject: "Remedial / Extra Class Schedule for Mathematics",
      message: "Kabir scored 26/40 in PA-1 Mathematics. Could you inform us if Saturday remedial sessions have commenced?",
      status: "resolved",
      replies: [
        { id: "rep-6", senderId: "tch_c7_math", senderRole: "TEACHER", senderName: "Suresh Narang", message: "Yes, remedial classes are held every Saturday from 08:30 AM to 10:00 AM in Room 104. Please ensure his attendance.", timestamp: "2026-10-14T11:00:00Z" }
      ],
      createdAt: "2026-10-14T09:15:00Z",
      updatedAt: "2026-10-14T11:00:00Z"
    },
    {
      id: "ptq-7",
      schoolId,
      studentId: students[6]?.id || "std-7",
      studentName: students[6]?.name || "Pari Patel",
      rollNo: "07",
      className: "Class 5 - Section A",
      category: "general",
      subject: "Lost Water Bottle and Lunch Box in Activity Hall",
      message: "Pari forgot her blue Milton water bottle and lunch box in the music room yesterday. Please check with lost and found.",
      status: "resolved",
      replies: [
        { id: "rep-7", senderId: "staff_care", senderRole: "ADMIN", senderName: "Administrative Desk", message: "Found and kept safely at Main Reception desk. Student can collect during recess.", timestamp: "2026-10-15T08:30:00Z" }
      ],
      createdAt: "2026-10-14T16:00:00Z",
      updatedAt: "2026-10-15T08:30:00Z"
    }
  ];

  // 14. Bus Routes Dataset (5 Routes)
  const busRoutes = [
    { id: "route-1", name: "Route 1: City Center & Metro Line", busNo: "DL-1P-4521", driverName: "Joginder Singh", phone: "9811234567", monthlyFee: 1500, stops: ["City Center Metro", "Civil Lines", "Court Road", "Police Lines", "School Gate"] },
    { id: "route-2", name: "Route 2: Green Valley & Sector 14-22", busNo: "DL-1P-4522", driverName: "Satish Sharma", phone: "9811234568", monthlyFee: 1600, stops: ["Green Valley Gate 1", "Sector 14 Market", "Sector 18 Park", "Sector 21 Crossing", "School Gate"] },
    { id: "route-3", name: "Route 3: Highway Enclave & Bypass", busNo: "UP-14-BT-9021", driverName: "Ram Avtar Yadav", phone: "9811234569", monthlyFee: 1800, stops: ["Bypass Toll", "Shanti Nagar", "Defence Colony", "Officers Enclave", "School Gate"] },
    { id: "route-4", name: "Route 4: Old Town & Gandhi Chowk", busNo: "UP-14-BT-9022", driverName: "Mohammad Aslam", phone: "9811234570", monthlyFee: 1500, stops: ["Gandhi Chowk", "Subzi Mandi", "Railway Station Road", "Clock Tower", "School Gate"] },
    { id: "route-5", name: "Route 5: New Extension & Palm Residency", busNo: "HR-26-CV-8890", driverName: "Balwan Singh", phone: "9811234571", monthlyFee: 2000, stops: ["Palm Residency", "Cyber Enclave", "Lake View Apartments", "Golf Course Road", "School Gate"] },
  ];

  // 15. Accountants & Financial Desk
  const accountants: SchoolAccountant[] = [
    {
      id: "acc-1",
      schoolId,
      name: "Rameshwar Dayal",
      email: "accounts@school.edu.in",
      phone: "9811099881",
      employeeId: "ACC-01",
      designation: "Head Accountant & Cash Desk",
      joinDate: "2022-06-01",
      active: true,
      monthlySalary: 28000,
      permissions: {
        canCollectFee: true,
        canAdmitStudents: true,
        canGrantDiscount: true,
        maxDiscountLimitPct: 20,
        canRecordExpenses: true,
        canViewDayBook: true,
        canSendFeeAlerts: true,
        canManageBusFee: true,
        canPrintIdCards: true,
      },
      createdAt: primarySession.createdAt,
    },
    {
      id: "acc-2",
      schoolId,
      name: "Sanjay Kumar Verma",
      email: "cashier@school.edu.in",
      phone: "9811099882",
      employeeId: "ACC-02",
      designation: "Assistant Cashier",
      joinDate: "2023-08-15",
      active: true,
      monthlySalary: 18000,
      permissions: {
        canCollectFee: true,
        canAdmitStudents: false,
        canGrantDiscount: false,
        maxDiscountLimitPct: 0,
        canRecordExpenses: false,
        canViewDayBook: true,
        canSendFeeAlerts: true,
        canManageBusFee: true,
        canPrintIdCards: true,
      },
      createdAt: primarySession.createdAt,
    }
  ];

  // 16. Expense Vouchers (Cashbook Ledger)
  const expenseVouchers: SchoolExpenseVoucher[] = [
    { id: "vch-1", schoolId, voucherNo: "VCH-2026-101", date: "2026-10-02", category: "Electricity / Utilities", amount: 18450, paidTo: "BSES Yamuna Power Ltd", paymentMode: "Bank Transfer", recordedBy: "Rameshwar Dayal", description: "Monthly Electricity Bill for Main Academic Block & Science Labs", createdAt: "2026-10-02T11:00:00Z" },
    { id: "vch-2", schoolId, voucherNo: "VCH-2026-102", date: "2026-10-04", category: "Stationery", amount: 12300, paidTo: "National Paper Mart", paymentMode: "UPI", recordedBy: "Rameshwar Dayal", description: "Mid-Term Examination Answer Sheets, Question Paper Reams & Envelopes", createdAt: "2026-10-04T14:30:00Z" },
    { id: "vch-3", schoolId, voucherNo: "VCH-2026-103", date: "2026-10-06", category: "Vehicle Fuel & Bus", amount: 6500, paidTo: "Bharat Petroleum Fuel Station", paymentMode: "Cash", recordedBy: "Sanjay Kumar Verma", description: "Diesel refill for School Generator power backup during exams", createdAt: "2026-10-06T16:15:00Z" },
    { id: "vch-4", schoolId, voucherNo: "VCH-2026-104", date: "2026-10-08", category: "Vehicle Fuel & Bus", amount: 14200, paidTo: "Sharma Auto Care", paymentMode: "Bank Transfer", recordedBy: "Rameshwar Dayal", description: "Routine maintenance, oil change & brake overhaul for Bus No. 1 and 2", createdAt: "2026-10-08T10:45:00Z" },
    { id: "vch-5", schoolId, voucherNo: "VCH-2026-105", date: "2026-10-10", category: "Maintenance & Repair", amount: 8900, paidTo: "Scientific Equipment Co.", paymentMode: "UPI", recordedBy: "Rameshwar Dayal", description: "Chemistry lab glassware, test tubes, pipettes and reagents refill", createdAt: "2026-10-10T12:00:00Z" },
    { id: "vch-6", schoolId, voucherNo: "VCH-2026-106", date: "2026-10-12", category: "Staff Welfare / Refreshment", amount: 4800, paidTo: "School Canteen Services", paymentMode: "Cash", recordedBy: "Sanjay Kumar Verma", description: "Monthly tea, coffee & healthy snacks for teachers and staff meetings", createdAt: "2026-10-12T15:20:00Z" },
    { id: "vch-7", schoolId, voucherNo: "VCH-2026-107", date: "2026-10-14", category: "Maintenance & Repair", amount: 3600, paidTo: "Aqua Tech RO Services", paymentMode: "Cash", recordedBy: "Sanjay Kumar Verma", description: "Campus drinking water cooler filter replacement & UV sanitization", createdAt: "2026-10-14T11:40:00Z" },
    { id: "vch-8", schoolId, voucherNo: "VCH-2026-108", date: "2026-10-15", category: "Events & Functions", amount: 9500, paidTo: "Champion Sports Emporium", paymentMode: "UPI", recordedBy: "Rameshwar Dayal", description: "Inter-House Athletic Championship winner trophies, medals and certificates", createdAt: "2026-10-15T16:00:00Z" },
    // Today's Expense Vouchers for Live Accountant Daybook & Cash in Hand!
    { id: "vch-today-1", schoolId, voucherNo: `VCH-${todayDateStr.replace(/-/g, "")}-01`, date: todayDateStr, category: "Vehicle Fuel & Bus", amount: 3200, paidTo: "Indian Oil Petrol Pump", paymentMode: "Cash", recordedBy: "Sanjay Kumar Verma", description: "Diesel refill (35 Litres) for School Generator backup during exams", createdAt: `${todayDateStr}T09:15:00Z` },
    { id: "vch-today-2", schoolId, voucherNo: `VCH-${todayDateStr.replace(/-/g, "")}-02`, date: todayDateStr, category: "Stationery", amount: 1850, paidTo: "National Paper Mart", paymentMode: "Cash", recordedBy: "Rameshwar Dayal", description: "Exam answer booklets, carbon sheets and office stationery refill", createdAt: `${todayDateStr}T10:45:00Z` },
    { id: "vch-today-3", schoolId, voucherNo: `VCH-${todayDateStr.replace(/-/g, "")}-03`, date: todayDateStr, category: "Electricity / Utilities", amount: 2499, paidTo: "Airtel Broadband High-Speed Fibre", paymentMode: "UPI", recordedBy: "Rameshwar Dayal", description: "Monthly institutional optical fiber internet connection recharge", createdAt: `${todayDateStr}T11:30:00Z` },
    { id: "vch-today-4", schoolId, voucherNo: `VCH-${todayDateStr.replace(/-/g, "")}-04`, date: todayDateStr, category: "Staff Welfare / Refreshment", amount: 650, paidTo: "Campus Canteen Refreshments", paymentMode: "Cash", recordedBy: "Sanjay Kumar Verma", description: "Tea and lemon water refreshments for visiting CBSE inspection panel", createdAt: `${todayDateStr}T13:20:00Z` },
  ];

  // 17. Online Admission Applicants (Across Multiple Grades)
  const admissions: AdmissionApplication[] = [
    { id: "adm-app-1", applicationNo: "ADM-2026-101", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Vivaan Malhotra", fatherName: "Sunil Malhotra", motherName: "Kavita Malhotra", gender: "male", dateOfBirth: "2020-05-14", phone: "9810123401", email: "sunil.m@gmail.com", classId: classes[0]?.id || "cls-1", className: "Class 1", address: "Flat 402, Royal Palms, Civil Lines", usesBus: true, status: "approved", appliedAt: `${todayDateStr}T08:00:00Z` },
    { id: "adm-app-2", applicationNo: "ADM-2026-102", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Aadhya Chauhan", fatherName: "Vikas Chauhan", motherName: "Pooja Chauhan", gender: "female", dateOfBirth: "2022-08-20", phone: "9810123402", email: "vikas.c@gmail.com", classId: classes[1]?.id || "cls-2", className: "Nursery", address: "B-12, Green Park Extension", usesBus: false, status: "pending", appliedAt: `${todayDateStr}T08:30:00Z` },
    { id: "adm-app-3", applicationNo: "ADM-2026-103", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Reyansh Joshi", fatherName: "Naveen Joshi", motherName: "Meenakshi Joshi", gender: "male", dateOfBirth: "2021-03-12", phone: "9810123403", email: "naveen.j@gmail.com", classId: classes[2]?.id || "cls-3", className: "KG 1", address: "House 55, Defence Colony", usesBus: true, status: "approved", appliedAt: `${todayDateStr}T09:00:00Z` },
    { id: "adm-app-4", applicationNo: "ADM-2026-104", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Prisha Sengupta", fatherName: "Subir Sengupta", motherName: "Ananya Sengupta", gender: "female", dateOfBirth: "2015-11-25", phone: "9810123404", email: "subir.s@gmail.com", classId: classes[6]?.id || "cls-6", className: "Class 6", address: "Flat 101, Golf View Tower", usesBus: true, status: "pending", appliedAt: `${todayDateStr}T09:30:00Z` },
    { id: "adm-app-5", applicationNo: "ADM-2026-105", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Kabir Tiwari", fatherName: "Manoj Tiwari", motherName: "Ritu Tiwari", gender: "male", dateOfBirth: "2012-07-08", phone: "9810123405", email: "manoj.t@gmail.com", classId: classes[9]?.id || "cls-9", className: "Class 9", address: "Plot 88, Shanti Nagar", usesBus: false, status: "approved", appliedAt: `${todayDateStr}T10:00:00Z` },
    { id: "adm-app-6", applicationNo: "ADM-2026-106", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Devansh Bhardwaj", fatherName: "Alok Bhardwaj", motherName: "Poonam Bhardwaj", gender: "male", dateOfBirth: "2011-04-18", phone: "9810123406", email: "alok.b@gmail.com", classId: classes[10]?.id || "cls-10", className: "Class 10", address: "House 24, Model Town", usesBus: true, status: "pending", appliedAt: `${todayDateStr}T10:30:00Z` },
    { id: "adm-app-7", applicationNo: "ADM-2026-107", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Anvi Saxena", fatherName: "Rajeev Saxena", motherName: "Neha Saxena", gender: "female", dateOfBirth: "2019-09-10", phone: "9810123407", email: "rajeev.s@gmail.com", classId: classes[3]?.id || "cls-3", className: "Class 2", address: "Villa 14, Ashoka Enclave", usesBus: true, status: "approved", appliedAt: `${todayDateStr}T11:00:00Z` },
    { id: "adm-app-8", applicationNo: "ADM-2026-108", schoolId, sessionId: DEMO_SESSION_ID, studentName: "Rudra Pratap Singh", fatherName: "Vikram Singh", motherName: "Sadhana Singh", gender: "male", dateOfBirth: "2010-02-14", phone: "9810123408", email: "vikram.ps@gmail.com", classId: classes[11]?.id || "cls-11", className: "Class 11 (Science)", address: "C-44, Surya Vihar", usesBus: true, status: "pending", appliedAt: `${todayDateStr}T11:30:00Z` }
  ];

  // 18. Daily Attendance Records (Includes Today and Recent Working Days with Full Statuses)
  const attendanceRecords: AttendanceRecord[] = [];
  const RECENT_DATES = [
    todayDateStr,
    `${todayDateStr.slice(0, 8)}${String(Math.max(1, Number(todayDateStr.slice(8)) - 1)).padStart(2, "0")}`,
    `${todayDateStr.slice(0, 8)}${String(Math.max(1, Number(todayDateStr.slice(8)) - 2)).padStart(2, "0")}`,
    "2026-10-14", "2026-10-13", "2026-10-12", "2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07"
  ];

  classes.filter(c => c.sessionId === DEMO_SESSION_ID).forEach((cls) => {
    const classStds = students.filter(s => s.classId === cls.id);

    RECENT_DATES.forEach((dateStr) => {
      const studentMap: AttendanceRecord["students"] = {};

      classStds.forEach((st, sIdx) => {
        let status: "present" | "late" | "absent" | "leave" | "bunk" = "present";
        let inTime = "07:48:20 AM";
        let outTime = "02:30:15 PM";
        let stayDuration = "6h 42m";
        let note: string | undefined = undefined;

        if (sIdx === 8) {
          status = "late";
          inTime = "08:35:10 AM";
          stayDuration = "5h 55m";
          note = "Late entry due to bus traffic delay";
        } else if (sIdx === 9) {
          status = "absent";
          inTime = undefined as any;
          outTime = undefined as any;
          stayDuration = "0h 0m";
          note = "Unexcused absent without prior notice";
        } else if (sIdx === 7) {
          status = "leave";
          inTime = undefined as any;
          outTime = undefined as any;
          stayDuration = "0h 0m";
          note = "Approved medical leave - Viral fever";
        } else if (sIdx === 6 && dateStr.endsWith("12")) {
          status = "bunk";
          inTime = "07:50:00 AM";
          outTime = "11:30:00 AM";
          stayDuration = "3h 40m";
          note = "Left campus after recess without gate pass";
        }

        studentMap[st.id] = {
          present: status === "present" || status === "late",
          name: st.name,
          rollNo: st.rollNo,
          status,
          inTime,
          outTime,
          stayDuration,
          note,
        };
      });

      attendanceRecords.push({
        date: dateStr,
        schoolId,
        classId: cls.id,
        sessionId: DEMO_SESSION_ID,
        markedBy: cls.classTeacherId || "admin",
        students: studentMap,
        createdAt: `${dateStr}T14:30:00Z`,
      });
    });
  });

  // 19. Staff Leaves
  const staffLeaves: StaffLeave[] = [
    { id: "lv-1", schoolId, staffId: staffEmployees[2]?.id || "stf-1", staffName: "Anita Tripathi", designation: "PRT Primary Teacher", leaveType: "casual", fromDate: "2026-10-16", toDate: "2026-10-17", days: 2, reason: "Attending sister's wedding in Lucknow", status: "approved", appliedAt: "2026-10-12T09:00:00Z", approvedBy: "Principal Dr. Ramanand Shastri", remarks: "Approved. Classes adjusted with Mrs. Bhatt." },
    { id: "lv-2", schoolId, staffId: staffEmployees[5]?.id || "stf-2", staffName: "Deepak Goswami", designation: "PRT Senior Educator", leaveType: "sick", fromDate: "2026-10-13", toDate: "2026-10-15", days: 3, reason: "Severe viral fever and eye conjunctivitis", status: "approved", appliedAt: "2026-10-12T18:00:00Z", approvedBy: "Principal Dr. Ramanand Shastri", remarks: "Approved on medical grounds." },
    { id: "lv-3", schoolId, staffId: staffEmployees[8]?.id || "stf-3", staffName: "Monika Bhalla", designation: "TGT English Specialist", leaveType: "earned", fromDate: "2026-10-22", toDate: "2026-10-25", days: 4, reason: "Family religious pilgrimage to Haridwar", status: "pending", appliedAt: "2026-10-14T10:30:00Z" }
  ];

  // 20. Comprehensive Video Lectures Library (65+ Lectures across all 4 Sessions & All Classes Nursery to 12)
  const videoLectures: DailyClassLecture[] = [];
  const EDUCATIONAL_LECTURE_TOPICS: Array<{
    classPrefix: string;
    subject: string;
    topic: string;
    youtubeId: string;
    teacher: string;
    notes: string;
  }> = [
    // Pre-Primary: Nursery, KG 1, KG 2
    { classPrefix: "Nursery", subject: "English Rhymes & Phonics", topic: "Alphabet Phonics Song (A to Z) with Animal Friends", youtubeId: "L_LUpnjgPso", teacher: "Poonam Aggarwal", notes: "Phonics pronunciations and action gestures." },
    { classPrefix: "Nursery", subject: "Fun with Numbers", topic: "Counting Numbers 1 to 20 with Colorful Toys", youtubeId: "hT_nvWreIhg", teacher: "Sunita Deshmukh", notes: "Visual counting and finger recognition." },
    { classPrefix: "KG 1", subject: "English Rhymes & Phonics", topic: "Two-Letter and Three-Letter Sight Words Foundation", youtubeId: "_uQrJ0TkZlc", teacher: "Kavita Rawat", notes: "Blending sounds for early reading." },
    { classPrefix: "KG 1", subject: "Environmental Awareness", topic: "Our Natural World: Plants, Animals and Birds Around Us", youtubeId: "b1kbLwvqugk", teacher: "Meenakshi Joshi", notes: "Identifying domestic and wild animals." },
    { classPrefix: "KG 2", subject: "English Phonics", topic: "CVC Words (Consonant-Vowel-Consonant) Phonics Reading", youtubeId: "L_LUpnjgPso", teacher: "Rekha Saxena", notes: "Short vowel sound practice." },
    { classPrefix: "KG 2", subject: "Mathematics", topic: "Simple Addition with Counters and Number Line", youtubeId: "hT_nvWreIhg", teacher: "Babita Kumari", notes: "Basic sum operations up to 10." },

    // Primary: Classes 1 to 5
    { classPrefix: "Class 1", subject: "Mathematics", topic: "Shapes and Space: Inside, Outside, Bigger and Smaller", youtubeId: "q6hT3B1P4L4", teacher: "Anita Tripathi", notes: "NCERT Math-Magic Chapter 1 visual illustrations." },
    { classPrefix: "Class 1", subject: "English", topic: "Poem: Two Little Kittens - Recitation & Word Meanings", youtubeId: "Z1BCujX3pw8", teacher: "Vandana Bhatt", notes: "New words, rhyme scheme, and stanza explanation." },
    { classPrefix: "Class 2", subject: "Mathematics", topic: "Counting in Tens and Bundles of Sticks", youtubeId: "q6hT3B1P4L4", teacher: "Neelam Dwivedi", notes: "Place value introduction: Tens and Ones." },
    { classPrefix: "Class 2", subject: "Hindi Rimjhim", topic: "पाठ: भालू ने खेली फुटबॉल - संपूर्ण कहानी व प्रश्नोत्तर", youtubeId: "oHg5SJYRHA0", teacher: "Archana Chauhan", notes: "कहानी का वाचन, शब्दार्थ एवं अभ्यास कार्य।" },
    { classPrefix: "Class 3", subject: "Environmental Studies", topic: "Poonam's Day Out: Diversity of Animal Habitats", youtubeId: "b1kbLwvqugk", teacher: "Suman Lata", notes: "Classification of animals based on movement and habitat." },
    { classPrefix: "Class 3", subject: "Mathematics", topic: "Where to Look From: Top View, Front View and Side View", youtubeId: "q6hT3B1P4L4", teacher: "Deepak Goswami", notes: "2D and 3D visual perspectives." },
    { classPrefix: "Class 4", subject: "Mathematics", topic: "Building with Bricks: Brick Patterns and Symmetry", youtubeId: "q6hT3B1P4L4", teacher: "Praveen Kashyap", notes: "Floor designs, arch patterns and circular brickwork." },
    { classPrefix: "Class 4", subject: "General Science", topic: "Going to School: Bridges, Boats and Tuktuk across India", youtubeId: "b1kbLwvqugk", teacher: "Shalini Nigam", notes: "Geographical diversity of Indian transport modes." },
    { classPrefix: "Class 5", subject: "General Science", topic: "Super Senses of Animals: Eagles, Ants and Silkworms", youtubeId: "r_1pQk0gJd4", teacher: "Ashok Upadhyay", notes: "Sensory organs, pheromones and ultrasonic sounds." },
    { classPrefix: "Class 5", subject: "Mathematics", topic: "The Fish Tale: Speed, Distance and Large Number Calculations", youtubeId: "q6hT3B1P4L4", teacher: "Pooja Singhal", notes: "Word problems on Lakhs, Crores and unitary method." },

    // Middle: Classes 6 to 8
    { classPrefix: "Class 6", subject: "Mathematics", topic: "Knowing Our Numbers: Large Numbers, Place Value & Roman Numerals", youtubeId: "q6hT3B1P4L4", teacher: "Mahesh Chandra", notes: "Indian and International place value systems comparison." },
    { classPrefix: "Class 6", subject: "Science", topic: "Components of Food: Carbohydrates, Proteins, Fats and Vitamins", youtubeId: "r_1pQk0gJd4", teacher: "Geeta Pandey", notes: "Balanced diet chart and deficiency diseases." },
    { classPrefix: "Class 6", subject: "Hindi Vasant", topic: "पाठ 'नादान दोस्त' - प्रेमचंद की प्रसिद्ध कहानी का भावार्थ", youtubeId: "oHg5SJYRHA0", teacher: "Pooja Singhal", notes: "केशव-श्यामा के चरित्र चित्रण और चिड़िया के अंडों की करुण कथा।" },
    { classPrefix: "Class 7", subject: "Science", topic: "Nutrition in Plants: Photosynthesis, Chlorophyll & Stomata Function", youtubeId: "r_1pQk0gJd4", teacher: "Suresh Narang", notes: "Autotrophic vs Heterotrophic nutrition, equation of photosynthesis." },
    { classPrefix: "Class 7", subject: "Social Science", topic: "New Kings and Kingdoms: Chola Dynasty and Temple Architecture", youtubeId: "8h-r1Ff1L24", teacher: "Geeta Pandey", notes: "Prashastis, land grants and Brihadisvara Temple." },
    { classPrefix: "Class 8", subject: "Mathematics", topic: "Rational Numbers: Properties of Closure, Commutativity & Associativity", youtubeId: "q6hT3B1P4L4", teacher: "Rajeshwar Tiwari", notes: "Additive identity, multiplicative inverse and number line representation." },
    { classPrefix: "Class 8", subject: "Science", topic: "Crop Production and Management: Agricultural Practices from Sowing to Harvest", youtubeId: "r_1pQk0gJd4", teacher: "Swati Sengupta", notes: "Kharif and Rabi crops, traditional vs modern irrigation systems." },

    // Secondary: Classes 9 and 10
    { classPrefix: "Class 9", subject: "Science (Physics)", topic: "Motion: Distance vs Displacement, Velocity-Time Graph & 3 Equations of Motion", youtubeId: "r_1pQk0gJd4", teacher: "Dr. Harish Chandra", notes: "Derivation of v=u+at, s=ut+1/2at^2, v^2-u^2=2as." },
    { classPrefix: "Class 9", subject: "Mathematics", topic: "Number Systems: Real Numbers, Rationalization of Denominators & Laws of Exponents", youtubeId: "kqtD5dpn9C8", teacher: "Meena Raghuvanshi", notes: "Representing root numbers on real number line." },
    { classPrefix: "Class 9", subject: "English Literature", topic: "Poem: The Road Not Taken by Robert Frost - Complete Analysis", youtubeId: "Z1BCujX3pw8", teacher: "Monika Bhalla", notes: "Metaphor of choices, regret and individual path." },
    { classPrefix: "Class 10", subject: "Mathematics", topic: "Quadratic Equations: Complete Chapter Concept, Factorization & Quadratic Formula", youtubeId: "kqtD5dpn9C8", teacher: "Vikramaditya Bose", notes: "Standard form ax^2+bx+c=0, Discriminant D=b^2-4ac and nature of roots." },
    { classPrefix: "Class 10", subject: "Science (Chemistry)", topic: "Chemical Reactions and Equations: Types of Reactions & Balancing Word Equations", youtubeId: "VvHq9qK_iLw", teacher: "Dr. Alaka Mukherjee", notes: "Combination, decomposition, displacement, double displacement, redox." },
    { classPrefix: "Class 10", subject: "Science (Physics)", topic: "Light - Reflection and Refraction: Mirror Formula & Lens Formula with Sign Convention", youtubeId: "eU3FjYqP_3o", teacher: "Dr. Alaka Mukherjee", notes: "Ray diagrams for concave mirror and convex lens." },
    { classPrefix: "Class 10", subject: "Social Science", topic: "Nationalism in India: Rowlatt Act, Jallianwala Bagh, Non-Cooperation & Civil Disobedience", youtubeId: "4s49N5x_Y5M", teacher: "Geeta Pandey", notes: "Timeline of events, Simon Commission and Dandi March." },

    // Senior Secondary: Class 11 Streams
    { classPrefix: "Class 11", subject: "Physics", topic: "Units and Measurements: Dimensional Formulas & Checking Equation Homogeneity", youtubeId: "eU3FjYqP_3o", teacher: "Dr. Harish Chandra", notes: "Applications of dimensional analysis and percentage errors." },
    { classPrefix: "Class 11", subject: "Chemistry", topic: "Some Basic Concepts of Chemistry: Mole Concept & Empirical Formula", youtubeId: "p1oK13K_6a8", teacher: "Dr. Alaka Mukherjee", notes: "Molar mass, molarity, molality and stoichiometry calculations." },
    { classPrefix: "Class 11", subject: "Accountancy", topic: "Introduction to Accounting: Golden Rules of Debit and Credit with Journal Entries", youtubeId: "D1NdDEf4g4U", teacher: "Rameshwar Dayal", notes: "Real, Nominal and Personal accounts rule sheet." },
    { classPrefix: "Class 11", subject: "Computer Science", topic: "Python Functions, Modules and Variable Scope (Global vs Local)", youtubeId: "rfscVS0vtbw", teacher: "Sumita Arora", notes: "Function definition, parameters, return statement and lambda functions." },

    // Senior Secondary: Class 12 Streams
    { classPrefix: "Class 12", subject: "Physics", topic: "Electrostatics: Electric Charges, Coulomb's Law & Gauss's Theorem Applications", youtubeId: "eU3FjYqP_3o", teacher: "Vikramaditya Bose", notes: "Electric field due to infinitely long wire, plane sheet and spherical shell." },
    { classPrefix: "Class 12", subject: "Chemistry", topic: "Solutions: Raoult's Law, Ideal/Non-Ideal Solutions & Colligative Properties", youtubeId: "p1oK13K_6a8", teacher: "Dr. Alaka Mukherjee", notes: "Relative lowering of vapor pressure, boiling elevation and freezing depression." },
    { classPrefix: "Class 12", subject: "Accountancy", topic: "Accounting for Partnership: Goodwill Valuation Methods & Profit Sharing Ratios", youtubeId: "D1NdDEf4g4U", teacher: "Rameshwar Dayal", notes: "Average profit, super profit and capitalization method." },
    { classPrefix: "Class 12", subject: "Computer Science", topic: "Data File Handling in Python: Text Files, CSV Files and Binary Pickle Module", youtubeId: "rfscVS0vtbw", teacher: "Sumita Arora", notes: "open(), readlines(), writerows(), dump() and load() syntax." },
  ];

  // Synthesize Lectures for both today, past dates, and multiple months
  const LECTURE_DATES = [
    todayDateStr,
    `${todayDateStr.slice(0, 8)}${String(Math.max(1, Number(todayDateStr.slice(8)) - 1)).padStart(2, "0")}`,
    "2026-10-14",
    "2026-10-10",
    "2026-09-18",
    "2026-08-20",
    "2026-07-22",
  ];

  classes.forEach((cls) => {
    // Find matching topics
    const matchingTopics = EDUCATIONAL_LECTURE_TOPICS.filter(item =>
      cls.name.includes(item.classPrefix) || item.classPrefix.includes(cls.name)
    );
    const topicsToUse = matchingTopics.length > 0 ? matchingTopics : [EDUCATIONAL_LECTURE_TOPICS[0]];

    topicsToUse.forEach((top, tIdx) => {
      const lectureDate = LECTURE_DATES[tIdx % LECTURE_DATES.length];
      const lectureMonth = lectureDate.slice(0, 7);
      videoLectures.push({
        id: `vid_lec_${cls.id}_${tIdx}_${lectureDate.replace(/-/g, "")}`,
        schoolId,
        sessionId: cls.sessionId || DEMO_SESSION_ID,
        classId: cls.id,
        className: cls.name,
        subjectName: top.subject,
        topic: top.topic,
        teacherName: top.teacher,
        youtubeUrl: `https://www.youtube.com/watch?v=${top.youtubeId}`,
        youtubeVideoId: top.youtubeId,
        periodNumber: (tIdx % 5) + 1,
        date: lectureDate,
        month: lectureMonth,
        notes: top.notes,
        addedAt: `${lectureDate}T09:${String(15 + tIdx * 10).padStart(2, "0")}:00Z`,
        addedBy: "TEACHER",
      });
    });
  });

  // 21. Calendar Events
  const events: SchoolEvent[] = [
    { id: "ev-1", schoolId, title: "Grand 79th Independence Day Flag Hoisting & Parade", description: "All teachers and students to assemble in pristine white uniform at 08:00 AM.", date: "2026-08-15", time: "08:00 AM", type: "CELEBRATION", targetAudience: "WHOLE_SCHOOL", createdAt: "2026-08-01T10:00:00Z" },
    { id: "ev-2", schoolId, title: "Annual Science, Robotics & AI Campus Exhibition", description: "Working models, AI projects, and chemistry demonstrations on display for parents.", date: "2026-11-20", time: "10:00 AM", type: "CELEBRATION", targetAudience: "WHOLE_SCHOOL", createdAt: "2026-10-01T10:00:00Z" },
    { id: "ev-3", schoolId, title: "Annual Athletic Meet & Inter-House Sports Championship", description: "100m, 200m races, relay, long jump, shot put, and inter-house football finals.", date: "2026-12-22", time: "08:30 AM", type: "CELEBRATION", targetAudience: "WHOLE_SCHOOL", createdAt: "2026-10-01T10:00:00Z" },
    { id: "ev-4", schoolId, title: "Mid-Term Parent-Teacher Meeting (PTM)", description: "Review of PA-1 and PA-2 assessment results with subject teachers.", date: "2026-09-28", time: "09:00 AM", type: "RESULT_DAY", targetAudience: "WHOLE_SCHOOL", createdAt: "2026-09-15T10:00:00Z" },
  ];

  // 22. Teacher Referral Payouts
  const referralPayouts: TeacherReferralPayout[] = [
    { id: "ref-pay-1", schoolId, teacherId: "demo_tch_1", teacherName: "Vikramaditya Bose", amount: 1500, paidDate: "2026-09-30", paymentMode: "Bank Transfer", referenceNo: "REF-PAY-2601", remarks: "10% Admission Referral Commission Approved", createdAt: "2026-09-30T10:00:00Z" },
    { id: "ref-pay-2", schoolId, teacherId: "demo_tch_2", teacherName: "Dr. Alaka Mukherjee", amount: 1500, paidDate: "2026-09-30", paymentMode: "Bank Transfer", referenceNo: "REF-PAY-2602", remarks: "10% Admission Referral Commission Approved", createdAt: "2026-09-30T10:00:00Z" }
  ];

  const attendanceSummary: Record<string, { present: number; absent: number; late: number; leave: number; bunk: number }> = {};
  classes.forEach(c => {
    attendanceSummary[c.id] = {
      present: 28,
      absent: 2,
      late: 2,
      leave: 2,
      bunk: 1,
    };
  });

  const dataset: FullDemoSchoolDataset = {
    session: primarySession,
    sessions,
    classes,
    subjects,
    teachers,
    students,
    staffEmployees,
    staffLeaves,
    accountants,
    expenseVouchers,
    admissions,
    exams,
    fees,
    notices,
    holidays,
    attendanceRecords,
    attendanceSummary,
    teacherLatePenalties,
    timetables,
    homeworkList,
    libraryBooks,
    libraryIssues,
    storeItems,
    storeSales,
    parentQueries,
    busRoutes,
    events,
    videoLectures,
    referralPayouts,
    createdAt: new Date().toISOString(),
  };

  inMemoryDataset = dataset;
  setSchoolCacheSync(DEMO_STORAGE_KEY, dataset);

  // Sync to local storage keys safely with quota protection (heavy data resides in IndexedDB & memory)
  const safeSetItem = (k: string, v: any) => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(k, JSON.stringify(v));
      }
    } catch {
      // LocalStorage quota reached; data is preserved in IndexedDB and in-memory cache
    }
  };

  safeSetItem(`nst_school_timetable_${schoolId}`, timetables);
  safeSetItem(`nst_school_homework_${schoolId}`, homeworkList);
  safeSetItem(`nst_school_lib_books_${schoolId}`, libraryBooks);
  safeSetItem(`nst_school_lib_issues_${schoolId}`, libraryIssues);
  safeSetItem(`nst_school_store_items_${schoolId}`, storeItems);
  safeSetItem(`nst_school_store_sales_${schoolId}`, storeSales);
  safeSetItem(`nst_school_pt_queries_${schoolId}`, parentQueries);
  safeSetItem(`nst_school_accountants_${schoolId}`, accountants);
  safeSetItem(`nst_school_expenses_${schoolId}`, expenseVouchers);
  safeSetItem(`nst_school_events_${schoolId}`, events);
  safeSetItem(`nst_school_admissions_${schoolId}`, admissions);
  safeSetItem(`nst_school_attendance_${schoolId}`, attendanceRecords);
  safeSetItem(`nst_school_exams_${schoolId}`, exams);
  safeSetItem(`nst_school_staff_${schoolId}`, staffEmployees);
  safeSetItem(`nst_school_leaves_${schoolId}`, staffLeaves);
  safeSetItem(`nst_school_lectures_${schoolId}`, videoLectures);

  return dataset;
}

export const EMPTY_DEMO_DATASET: FullDemoSchoolDataset = {
  session: {
    id: "real_school_active_session",
    schoolId: "real",
    name: "Real School Academic Session",
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true,
    createdAt: new Date().toISOString()
  },
  sessions: [],
  classes: [],
  subjects: [],
  teachers: [],
  students: [],
  staffEmployees: [],
  staffLeaves: [],
  accountants: [],
  expenseVouchers: [],
  admissions: [],
  exams: [],
  fees: [],
  notices: [],
  holidays: [],
  attendanceRecords: [],
  attendanceSummary: {},
  teacherLatePenalties: [],
  timetables: {},
  homeworkList: [],
  libraryBooks: [],
  libraryIssues: [],
  storeItems: [],
  storeSales: [],
  parentQueries: [],
  busRoutes: [],
  events: [],
  videoLectures: [],
  referralPayouts: [],
  createdAt: new Date().toISOString()
};

// Get Cached Dataset (Loads from memory or localStorage, or initializes on demand)
// When Demo Data is switched OFF by user, returns completely empty dataset so real school data shines!
export function getDemoSchoolDataset(): FullDemoSchoolDataset {
  if (!isDemoDataEnabled()) {
    return EMPTY_DEMO_DATASET;
  }
  if (inMemoryDataset) return inMemoryDataset;
  const cached = getSchoolCacheSync<FullDemoSchoolDataset | null>(DEMO_STORAGE_KEY, null);
  if (cached && cached.students && cached.students.length >= 40 && cached.sessions && cached.sessions.length > 0) {
    inMemoryDataset = cached;
    try {
      if (typeof localStorage !== "undefined" && !localStorage.getItem(`nst_school_timetable_${cached.session.schoolId}`)) {
        const safePrime = (k: string, v: any) => {
          try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
        };
        safePrime(`nst_school_timetable_${cached.session.schoolId}`, cached.timetables || {});
        safePrime(`nst_school_homework_${cached.session.schoolId}`, cached.homeworkList || []);
        safePrime(`nst_school_lib_books_${cached.session.schoolId}`, cached.libraryBooks || []);
        safePrime(`nst_school_lib_issues_${cached.session.schoolId}`, cached.libraryIssues || []);
        safePrime(`nst_school_store_items_${cached.session.schoolId}`, cached.storeItems || []);
        safePrime(`nst_school_store_sales_${cached.session.schoolId}`, cached.storeSales || []);
        safePrime(`nst_school_pt_queries_${cached.session.schoolId}`, cached.parentQueries || []);
        safePrime(`nst_school_lectures_${cached.session.schoolId}`, cached.videoLectures || []);
      }
    } catch {}
    return cached;
  }
  return generateFull1YearDemoDataset();
}

// Add Custom Festival / School Holiday (Power requested by user!)
export function addCustomHoliday(holiday: Omit<FestivalHoliday, "id">): FestivalHoliday {
  const current = getDemoSchoolDataset();
  const newHoliday: FestivalHoliday = {
    ...holiday,
    id: `hol_custom_${Date.now()}`,
    isPreloaded: false,
  };
  current.holidays.push(newHoliday);
  current.holidays.sort((a, b) => a.date.localeCompare(b.date));
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  return newHoliday;
}

// Remove Custom Holiday
export function removeCustomHoliday(id: string): boolean {
  const current = getDemoSchoolDataset();
  current.holidays = current.holidays.filter(h => h.id !== id);
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  return true;
}

// Add Custom School Notice
export function addCustomNotice(notice: Omit<SchoolNotice, "id" | "createdAt">): SchoolNotice {
  const current = getDemoSchoolDataset();
  const newNotice: SchoolNotice = {
    ...notice,
    id: `not_custom_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  current.notices.unshift(newNotice);
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  return newNotice;
}

// Check if a specific date is a festival / school holiday
export function isHolidayDate(dateStr: string): FestivalHoliday | undefined {
  if (!isDemoDataEnabled()) return undefined;
  const current = getDemoSchoolDataset();
  return current.holidays.find(h => {
    if (h.date === dateStr) return true;
    if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
    return false;
  });
}

// ── Demo Session Management (Session Add, Edit, Delete, Switch) ──
const demoSessionListeners = new Set<(sessions: SchoolSession[]) => void>();
let isNotifyingDemoSessions = false;

export function subscribeDemoSessions(cb: (sessions: SchoolSession[]) => void): () => void {
  demoSessionListeners.add(cb);
  const current = getDemoSchoolDataset();
  const list = current.sessions && current.sessions.length > 0 ? current.sessions : (current.session ? [current.session] : []);
  // Deliver initial state asynchronously to avoid interrupting React mount cycles
  queueMicrotask(() => {
    if (demoSessionListeners.has(cb)) {
      try { cb(list); } catch (e) { console.error("Error in initial demo session callback:", e); }
    }
  });
  return () => {
    demoSessionListeners.delete(cb);
  };
}

function notifyDemoSessionListeners() {
  if (isNotifyingDemoSessions) return;
  isNotifyingDemoSessions = true;
  try {
    const current = getDemoSchoolDataset();
    const list = current.sessions && current.sessions.length > 0 ? current.sessions : (current.session ? [current.session] : []);
    demoSessionListeners.forEach(cb => {
      try { cb(list); } catch (e) { console.error("Error in demo session listener:", e); }
    });
  } finally {
    isNotifyingDemoSessions = false;
  }
}

export function addDemoSession(session: SchoolSession): SchoolSession {
  const current = getDemoSchoolDataset();
  if (!current.sessions) current.sessions = [];
  const existingIndex = current.sessions.findIndex(s => s.id === session.id);
  let changed = false;
  if (existingIndex >= 0) {
    const existing = current.sessions[existingIndex];
    if (
      existing.name !== session.name ||
      existing.active !== session.active ||
      existing.startDate !== session.startDate ||
      existing.endDate !== session.endDate
    ) {
      current.sessions[existingIndex] = { ...existing, ...session };
      changed = true;
    }
  } else {
    current.sessions.push(session);
    changed = true;
  }
  if (session.active) {
    current.sessions.forEach(s => {
      if (s.id !== session.id && s.active) {
        s.active = false;
        changed = true;
      }
    });
    if (current.session?.id !== session.id) {
      current.session = session;
      changed = true;
    }
  }
  if (changed) {
    inMemoryDataset = current;
    setSchoolCacheSync(DEMO_STORAGE_KEY, current);
    notifyDemoSessionListeners();
  }
  return session;
}

export function updateDemoSession(sessionId: string, data: Partial<SchoolSession>): SchoolSession | null {
  const current = getDemoSchoolDataset();
  if (!current.sessions) current.sessions = [];
  const index = current.sessions.findIndex(s => s.id === sessionId);
  if (index === -1) {
    if (current.session && current.session.id === sessionId) {
      current.session = { ...current.session, ...data };
      if (!current.sessions.some(s => s.id === sessionId)) {
        current.sessions.push(current.session);
      }
    } else {
      return null;
    }
  } else {
    current.sessions[index] = { ...current.sessions[index], ...data };
  }
  const updated = current.sessions.find(s => s.id === sessionId) || current.session;
  if (data.active) {
    current.sessions.forEach(s => {
      s.active = s.id === sessionId;
    });
    if (updated) current.session = updated;
  }
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  notifyDemoSessionListeners();
  return updated;
}

export function deleteDemoSession(sessionId: string): boolean {
  const current = getDemoSchoolDataset();
  if (!current.sessions) return false;
  if (current.sessions.length <= 1) return false;
  const wasActive = current.sessions.some(s => s.id === sessionId && s.active);
  current.sessions = current.sessions.filter(s => s.id !== sessionId);
  if (wasActive && current.sessions.length > 0) {
    current.sessions[0].active = true;
    current.session = current.sessions[0];
  }
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  notifyDemoSessionListeners();
  return true;
}

export function setActiveDemoSession(sessionId: string): SchoolSession | null {
  const current = getDemoSchoolDataset();
  if (!current.sessions) return null;
  const target = current.sessions.find(s => s.id === sessionId);
  if (!target) return null;
  current.sessions.forEach(s => {
    s.active = s.id === sessionId;
  });
  target.active = true;
  current.session = target;
  inMemoryDataset = current;
  setSchoolCacheSync(DEMO_STORAGE_KEY, current);
  notifyDemoSessionListeners();
  return target;
}


