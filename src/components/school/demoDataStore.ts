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
  AttendanceRecord,
  ExamEntry,
  MonthlyFee,
  SchoolNotice,
  SchoolSession
} from "../../school-types";

export const DEMO_SESSION_ID = "demo_session_2026_27";
export const DEMO_SESSION_NAME = "DEMO • 2026-27 (Full 1-Year Auto-Filled)";
export const DEMO_STORAGE_KEY = "nst_demo_school_1year_dataset_v3";

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

// 13 Classes definition
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
];

// Grade-Tailored Subjects / Books
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
  classes: SchoolClass[];
  subjects: SchoolSubject[];
  teachers: SchoolTeacher[];
  students: SchoolStudent[];
  staffEmployees: StaffEmployee[];
  exams: ExamEntry[];
  fees: MonthlyFee[];
  notices: SchoolNotice[];
  holidays: FestivalHoliday[];
  attendanceSummary: Record<string, { present: number; absent: number; late: number; leave: number; bunk: number }>;
  teacherLatePenalties: TeacherLatePenaltyInfo[];
  createdAt: string;
}

// Global cached state
let inMemoryDataset: FullDemoSchoolDataset | null = null;

// Build the full 1-year dataset
export function generateFull1YearDemoDataset(schoolId: string = "demo_school", adminUid: string = "admin"): FullDemoSchoolDataset {
  const session: SchoolSession = {
    id: DEMO_SESSION_ID,
    schoolId,
    name: DEMO_SESSION_NAME,
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true,
    createdAt: new Date().toISOString(),
  };

  const classes: SchoolClass[] = [];
  const subjects: SchoolSubject[] = [];
  const students: SchoolStudent[] = [];
  const teachers: SchoolTeacher[] = [];
  const staffEmployees: StaffEmployee[] = [];
  const exams: ExamEntry[] = [];
  const fees: MonthlyFee[] = [];
  const holidays: FestivalHoliday[] = [...INITIAL_FESTIVAL_HOLIDAYS];
  const notices: SchoolNotice[] = [...INITIAL_ANNUAL_NOTICES];

  // 1. Add Principal to Staff Employees (Salary ₹25,000)
  const principalStaff = DEMO_STAFF_MEMBERS[0];
  staffEmployees.push({
    id: `staff_principal_01`,
    schoolId,
    name: principalStaff.name,
    email: principalStaff.email,
    phone: principalStaff.phone,
    designation: principalStaff.designation,
    department: principalStaff.department,
    monthlySalary: 25000,
    joinDate: principalStaff.joinDate,
    active: true,
    createdAt: session.createdAt,
  });

  // 2. Build 13 Classes × 2 Sections (A & B) = 26 Class Sections
  let teacherIndexCounter = 1; // start from teacher 1 (0 is principal)

  DEMO_CLASS_DEFINITIONS.forEach((classDef, classIndex) => {
    const classKey = classDef.key;
    const gradeGroup = classDef.group;
    const gradeSubjectNames = GRADE_SUBJECTS_MAP[gradeGroup] || GRADE_SUBJECTS_MAP["Primary"];

    // Sections A and B (35 students each = 70 students total)
    ["A", "B"].forEach((secLetter) => {
      const section = secLetter as "A" | "B";
      const classId = `demo_class_${classKey}_sec_${section.toLowerCase()}`;
      const classNameFormatted = `${classDef.name} - Section ${section}`;

      // Assign teacher (1 teacher per 35 students)
      const assignedTeacherProfile = DEMO_STAFF_MEMBERS[teacherIndexCounter] || {
        name: `Teacher ${classDef.name} ${section}`,
        salary: 10000,
        designation: "Class Teacher",
        email: `teacher.${classKey}.${section.toLowerCase()}@school.in`,
        phone: "9820011999",
        subject: gradeSubjectNames[0],
      };
      const teacherId = `demo_teacher_${classKey}_${section.toLowerCase()}`;
      teacherIndexCounter++;

      const schoolClass: SchoolClass = {
        id: classId,
        schoolId,
        sessionId: session.id,
        name: classNameFormatted,
        section,
        classTeacherId: teacherId,
        defaultFee: classDef.defaultFee,
        createdAt: session.createdAt,
      };
      classes.push(schoolClass);

      // Create Teacher Record & Staff Employee Record
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
        createdAt: session.createdAt,
      };
      teachers.push(teacherRecord);

      staffEmployees.push({
        id: `staff_${teacherId}`,
        schoolId,
        name: assignedTeacherProfile.name,
        email: assignedTeacherProfile.email,
        phone: assignedTeacherProfile.phone,
        designation: assignedTeacherProfile.designation || "Section Class Teacher",
        department: gradeGroup,
        monthlySalary: assignedTeacherProfile.salary || 9500, // strictly 5,000 to 15,000
        joinDate: "2024-04-01",
        active: true,
        createdAt: session.createdAt,
      });

      // Create Subjects for this class section
      const classSubjects = gradeSubjectNames.map((subjectName, sIdx) => {
        const subjectId = `demo_sub_${classKey}_${section.toLowerCase()}_${sIdx + 1}`;
        const sub: SchoolSubject = {
          id: subjectId,
          schoolId,
          sessionId: session.id,
          classId,
          name: subjectName,
          teacherId,
          createdAt: session.createdAt,
        };
        subjects.push(sub);
        teacherRecord.subjects.push(subjectId);
        return sub;
      });

      // 3. Create 35 Students for this Section (Roll No 1 to 35)
      const sectionStudents: SchoolStudent[] = [];
      for (let sIdx = 1; sIdx <= 35; sIdx++) {
        const rollStr = String(sIdx).padStart(2, "0");
        const studentId = `demo_std_${classKey}_${section.toLowerCase()}_${rollStr}`;
        const isBoy = sIdx % 2 === 1;
        const firstName = isBoy
          ? FIRST_NAMES_BOYS[(classIndex * 3 + sIdx) % FIRST_NAMES_BOYS.length]
          : FIRST_NAMES_GIRLS[(classIndex * 3 + sIdx) % FIRST_NAMES_GIRLS.length];
        const lastName = LAST_NAMES[(classIndex * 5 + sIdx) % LAST_NAMES.length];
        const studentName = `${firstName} ${lastName}`;
        const fatherName = `Mr. Rajesh ${lastName}`;
        const motherName = `Mrs. Sunita ${lastName}`;
        const admissionNo = `ADM-26-${classKey.toUpperCase()}${section}${rollStr}`;
        const birthYear = Math.max(2008, 2023 - classIndex);
        const dob = `${birthYear}-0${(sIdx % 9) + 1}-${String(10 + (sIdx % 18)).padStart(2, "0")}`;

        const student: SchoolStudent = {
          id: studentId,
          schoolId,
          sessionId: session.id,
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
          joinDate: "2026-04-01",
          active: true,
          createdAt: session.createdAt,
        };
        sectionStudents.push(student);
        students.push(student);

        // 4. Generate 1-Year Fee Records for this Student (12 Months: April 2026 to March 2027)
        // Defaulter pattern: 3, 4, 5, 6, 7, 8, 10, 12 months pending, or 0 (fully paid)
        const dueMonthsCount = getStudentDueMonthsCount(classIndex, section, sIdx);
        // Paid months count = 12 - dueMonthsCount
        const paidMonthsThreshold = 12 - dueMonthsCount;

        ACADEMIC_MONTHS.forEach((academicMonth, mIdx) => {
          const isPaid = mIdx < paidMonthsThreshold;
          const feeReceiptNo = isPaid
            ? `RCP-${classKey.toUpperCase()}${section}-${rollStr}-${academicMonth.short}`
            : undefined;
          const paidDate = isPaid
            ? `${academicMonth.code}-${String(5 + (sIdx % 15)).padStart(2, "0")}`
            : undefined;

          fees.push({
            schoolId,
            sessionId: session.id,
            studentId,
            studentName,
            rollNo: String(sIdx),
            classId,
            month: academicMonth.code,
            amount: classDef.defaultFee,
            monthlyAmount: classDef.defaultFee,
            arrearsAmount: 0,
            arrearsMonths: [],
            paid: isPaid,
            paidDate,
            paidBy: isPaid ? adminUid : undefined,
            receiptNo: feeReceiptNo,
            note: isPaid ? "Monthly tuition fee received" : `Fee pending for ${academicMonth.name}`,
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
            const isAbsent = sIdx === 34 && examCycle.id === "pa3"; // 1 student absent in 1 exam for realism

            if (examCycle.maxMarks === 40) {
              // Out of 40: marks between 18 and 39
              earnedMarks = Math.min(40, Math.max(16, 22 + Math.floor((seedVal / 100) * 18)));
            } else {
              // Out of 100: marks between 45 and 98
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
            id: `demo_exam_${classKey}_${section.toLowerCase()}_${subj.id}_${examCycle.id}`,
            schoolId,
            sessionId: session.id,
            classId,
            subjectId: subj.id,
            subjectName: subj.name,
            examName: `${examCycle.shortName} - ${subj.name}`,
            examDate: examCycle.date,
            maxMarks: examCycle.maxMarks,
            markedBy: teacherId,
            studentMarks: studentMarksMap,
            createdAt: session.createdAt,
          });
        });
      });
    });
  });

  // 6. Generate Teacher Late Entries & 3-Day Rule Deduction Calculations
  // User Rule: "teacher ka late ebtry 3 day oe fee 1 day ka kat jayega aur jitne teacher honge fee rahega 5000 se 15000 ke bixh zur principal ka 25000"
  const teacherLatePenalties: TeacherLatePenaltyInfo[] = staffEmployees.map((staff, sIdx) => {
    // Generate realistic monthly late entry counts (e.g. 1 to 7 late days)
    const isPrincipal = sIdx === 0;
    const lateDaysCount = isPrincipal ? 1 : (sIdx * 2 + 1) % 8; // e.g., 1, 3, 5, 7, 2, 4, 6...
    const absentDaysCount = isPrincipal ? 0 : (sIdx % 9 === 0 ? 1 : 0);
    const deductionDays = Math.floor(lateDaysCount / 3); // 3 days late = 1 day cut!
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

  // 7. Generate Attendance Records Sample for the Year
  // With statuses: Present, Absent, Late, Leave, Bunk ("leave bunk late szb student karte ragenfe")
  const attendanceSummary: Record<string, { present: number; absent: number; late: number; leave: number; bunk: number }> = {};
  classes.forEach(c => {
    attendanceSummary[c.id] = {
      present: 28,
      absent: 2,
      late: 2,
      leave: 2,
      bunk: 1, // 28 + 2 + 2 + 2 + 1 = 35 students!
    };
  });

  const dataset: FullDemoSchoolDataset = {
    session,
    classes,
    subjects,
    teachers,
    students,
    staffEmployees,
    exams,
    fees,
    notices,
    holidays,
    attendanceSummary,
    teacherLatePenalties,
    createdAt: new Date().toISOString(),
  };

  inMemoryDataset = dataset;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(dataset));
  } catch (e) {
    console.warn("Local storage write skipped (dataset active in memory):", e);
  }

  return dataset;
}

// Get Cached Dataset (Loads from memory or localStorage, or initializes on demand)
export function getDemoSchoolDataset(): FullDemoSchoolDataset {
  if (inMemoryDataset) return inMemoryDataset;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.students && parsed.students.length >= 900) {
        inMemoryDataset = parsed;
        return parsed;
      }
    }
  } catch {}
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
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current));
  } catch {}
  return newHoliday;
}

// Remove Custom Holiday
export function removeCustomHoliday(id: string): boolean {
  const current = getDemoSchoolDataset();
  current.holidays = current.holidays.filter(h => h.id !== id);
  inMemoryDataset = current;
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current));
  } catch {}
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
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(current));
  } catch {}
  return newNotice;
}

// Check if a specific date is a festival / school holiday
export function isHolidayDate(dateStr: string): FestivalHoliday | undefined {
  const current = getDemoSchoolDataset();
  return current.holidays.find(h => {
    if (h.date === dateStr) return true;
    if (h.endDate && dateStr >= h.date && dateStr <= h.endDate) return true;
    return false;
  });
}
