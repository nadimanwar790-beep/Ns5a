// @ts-nocheck
import {
  currentMonthStr,
  getSessions,
  saveClass,
  deleteClass,
  getClasses,
  saveExam,
  saveFee,
  saveSession,
  saveStudent,
  saveSubject,
  saveStaffEmployee,
  saveNotice,
  saveSchoolHoliday,
  saveAttendance,
  generateId,
} from "../../school-firebase";
import type {
  ExamEntry,
  SchoolClass,
  SchoolSession,
  SchoolStudent,
  SchoolSubject,
  StaffEmployee,
  SchoolNotice,
  SchoolHoliday,
  AttendanceRecord,
  ClassFeeStructure
} from "../../school-types";

export const DEMO_SESSION_ID = "demo_session_2026_27";
export const DEMO_SESSION_NAME = "DEMO • 2026-27 (CBSE Full Year)";

// 13 Classes requested: Nursery, KG 1, KG 2, Class 1 to 10
export const DEMO_CLASSES_CONFIG = [
  {
    key: "nur",
    name: "Nursery",
    subjects: ["English Rhymes", "Hindi Balgeet", "Pre-Math Numbers", "Drawing & Coloring", "General Awareness"],
    feeStructure: { admissionFee: 25000, tuitionFee: 1800, cautionMoney: 10000, annualCharges: 8000, busFee: 1500 }
  },
  {
    key: "kg1",
    name: "KG 1",
    subjects: ["English Phonics & Writing", "Hindi Akshar Gyan", "Mathematics Basics", "EVS & Nature", "Art & Craft"],
    feeStructure: { admissionFee: 28000, tuitionFee: 2000, cautionMoney: 12000, annualCharges: 9000, busFee: 1600 }
  },
  {
    key: "kg2",
    name: "KG 2",
    subjects: ["English Words & Sentences", "Hindi Shabad Rachna", "Mathematics Add/Sub", "Environmental Awareness", "Creative Arts"],
    feeStructure: { admissionFee: 30000, tuitionFee: 2200, cautionMoney: 15000, annualCharges: 10000, busFee: 1800 }
  },
  {
    key: "1",
    name: "Class 1",
    subjects: ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Our Environment", "Computer Studies", "General Knowledge"],
    feeStructure: { admissionFee: 35000, tuitionFee: 2500, cautionMoney: 20000, annualCharges: 12000, busFee: 2000 }
  },
  {
    key: "2",
    name: "Class 2",
    subjects: ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Our World", "Computer Studies", "General Knowledge"],
    feeStructure: { admissionFee: 38000, tuitionFee: 2800, cautionMoney: 20000, annualCharges: 13000, busFee: 2100 }
  },
  {
    key: "3",
    name: "Class 3",
    subjects: ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer Coding", "General Knowledge"],
    feeStructure: { admissionFee: 40000, tuitionFee: 3000, cautionMoney: 25000, annualCharges: 14000, busFee: 2200 }
  },
  {
    key: "4",
    name: "Class 4",
    subjects: ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer & AI", "General Knowledge"],
    feeStructure: { admissionFee: 42000, tuitionFee: 3200, cautionMoney: 25000, annualCharges: 15000, busFee: 2300 }
  },
  {
    key: "5",
    name: "Class 5",
    subjects: ["English Marigold", "Hindi Rimjhim", "Mathematics Math-Magic", "EVS Looking Around", "General Science", "Computer & AI", "General Knowledge"],
    feeStructure: { admissionFee: 45000, tuitionFee: 3500, cautionMoney: 30000, annualCharges: 16000, busFee: 2500 }
  },
  {
    key: "6",
    name: "Class 6",
    // Mirrors the uploaded DPS receipt values
    subjects: ["English Honeysuckle", "Hindi Vasant", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer Science"],
    feeStructure: { admissionFee: 65000, tuitionFee: 19140, cautionMoney: 60000, annualCharges: 23320, busFee: 10360 }
  },
  {
    key: "7",
    name: "Class 7",
    subjects: ["English Honeycomb", "Hindi Vasant", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer Science"],
    feeStructure: { admissionFee: 65000, tuitionFee: 19140, cautionMoney: 60000, annualCharges: 23320, busFee: 10360 }
  },
  {
    key: "8",
    name: "Class 8",
    subjects: ["English Honeydew", "Hindi Bharat Ki Khoj", "Mathematics NCERT", "Science (PCB)", "Social Science", "Sanskrit", "Computer & Coding"],
    feeStructure: { admissionFee: 68000, tuitionFee: 20500, cautionMoney: 60000, annualCharges: 24000, busFee: 10500 }
  },
  {
    key: "9",
    name: "Class 9",
    subjects: ["English Beehive & Moments", "Hindi Kshitij & Kritika", "Mathematics NCERT", "Science (Physics, Chemistry, Biology)", "Social Science", "Information Technology 402"],
    feeStructure: { admissionFee: 72000, tuitionFee: 22000, cautionMoney: 65000, annualCharges: 26000, busFee: 11000 }
  },
  {
    key: "10",
    name: "Class 10",
    subjects: ["English First Flight & Footprints", "Hindi Kshitij & Kritika", "Mathematics NCERT Standard", "Science (Physics, Chem, Bio)", "Social Science Board", "Information Technology 402"],
    feeStructure: { admissionFee: 75000, tuitionFee: 24000, cautionMoney: 65000, annualCharges: 28000, busFee: 11500 }
  }
];

// 26 Section teachers (1 teacher per 35 students -> 1:35 ratio) + 1 Principal
const DEMO_STAFF_MEMBERS = [
  { name: "Dr. Arvind Swaminathan", role: "Principal", designation: "Principal & Academic Director", salary: 25000, phone: "9811023450", email: "principal@dps.edu.in", dept: "Administration", lateEntries: 0 },
  { name: "Priya Sharma", role: "Teacher", designation: "PRT Primary Teacher", salary: 8500, phone: "9871234001", email: "priya.s@dps.edu.in", dept: "Pre-Primary", lateEntries: 1 },
  { name: "Rajesh Kumar", role: "Teacher", designation: "PRT Primary Teacher", salary: 9000, phone: "9871234002", email: "rajesh.k@dps.edu.in", dept: "Pre-Primary", lateEntries: 4 }, // 4 lates = 1 day deducted
  { name: "Neha Verma", role: "Teacher", designation: "PRT Primary Teacher", salary: 8200, phone: "9871234003", email: "neha.v@dps.edu.in", dept: "Pre-Primary", lateEntries: 0 },
  { name: "Amit Gupta", role: "Teacher", designation: "PRT Primary Teacher", salary: 8800, phone: "9871234004", email: "amit.g@dps.edu.in", dept: "Pre-Primary", lateEntries: 3 }, // 3 lates = 1 day deducted
  { name: "Anjali Singh", role: "Teacher", designation: "PRT Primary Teacher", salary: 8500, phone: "9871234005", email: "anjali.s@dps.edu.in", dept: "Primary", lateEntries: 2 },
  { name: "Vikram Patel", role: "Teacher", designation: "PRT Primary Teacher", salary: 9200, phone: "9871234006", email: "vikram.p@dps.edu.in", dept: "Primary", lateEntries: 6 }, // 6 lates = 2 days deducted
  { name: "Sunita Rao", role: "Teacher", designation: "PRT Primary Teacher", salary: 8700, phone: "9871234007", email: "sunita.r@dps.edu.in", dept: "Primary", lateEntries: 1 },
  { name: "Manoj Joshi", role: "Teacher", designation: "PRT Primary Teacher", salary: 9500, phone: "9871234008", email: "manoj.j@dps.edu.in", dept: "Primary", lateEntries: 0 },
  { name: "Kavita Mishra", role: "Teacher", designation: "PRT Primary Teacher", salary: 9100, phone: "9871234009", email: "kavita.m@dps.edu.in", dept: "Primary", lateEntries: 3 }, // 3 lates = 1 day deducted
  { name: "Rahul Yadav", role: "Teacher", designation: "TGT Mathematics", salary: 11500, phone: "9871234010", email: "rahul.y@dps.edu.in", dept: "Mathematics", lateEntries: 1 },
  { name: "Pooja Tiwari", role: "Teacher", designation: "TGT Science", salary: 11800, phone: "9871234011", email: "pooja.t@dps.edu.in", dept: "Science", lateEntries: 2 },
  { name: "Deepak Mehta", role: "Teacher", designation: "TGT Social Science", salary: 11000, phone: "9871234012", email: "deepak.m@dps.edu.in", dept: "Social Studies", lateEntries: 5 }, // 5 lates = 1 day deducted
  { name: "Swati Pandey", role: "Teacher", designation: "TGT English", salary: 11200, phone: "9871234013", email: "swati.p@dps.edu.in", dept: "Languages", lateEntries: 0 },
  { name: "Suresh Nair", role: "Teacher", designation: "TGT Hindi & Sanskrit", salary: 10500, phone: "9871234014", email: "suresh.n@dps.edu.in", dept: "Languages", lateEntries: 4 }, // 4 lates = 1 day deducted
  { name: "Ritu Saxena", role: "Teacher", designation: "TGT Computer Science", salary: 12000, phone: "9871234015", email: "ritu.s@dps.edu.in", dept: "Computer Science", lateEntries: 1 },
  { name: "Sandeep Chauhan", role: "Teacher", designation: "TGT Mathematics", salary: 12500, phone: "9871234016", email: "sandeep.c@dps.edu.in", dept: "Mathematics", lateEntries: 7 }, // 7 lates = 2 days deducted
  { name: "Meenakshi Bhat", role: "Teacher", designation: "TGT General Science", salary: 12200, phone: "9871234017", email: "meenakshi.b@dps.edu.in", dept: "Science", lateEntries: 0 },
  { name: "Alok Srivastava", role: "Teacher", designation: "PGT Physics", salary: 14500, phone: "9871234018", email: "alok.s@dps.edu.in", dept: "Senior Science", lateEntries: 2 },
  { name: "Preeti Dubey", role: "Teacher", designation: "PGT Chemistry", salary: 14200, phone: "9871234019", email: "preeti.d@dps.edu.in", dept: "Senior Science", lateEntries: 3 }, // 3 lates = 1 day deducted
  { name: "Sanjay Kulkarni", role: "Teacher", designation: "PGT Mathematics", salary: 15000, phone: "9871234020", email: "sanjay.k@dps.edu.in", dept: "Senior Mathematics", lateEntries: 0 },
  { name: "Geeta Menon", role: "Teacher", designation: "PGT Biology", salary: 14000, phone: "9871234021", email: "geeta.m@dps.edu.in", dept: "Senior Science", lateEntries: 1 },
  { name: "Harish Rawat", role: "Teacher", designation: "PGT English Literature", salary: 13500, phone: "9871234022", email: "harish.r@dps.edu.in", dept: "Senior Languages", lateEntries: 4 }, // 4 lates = 1 day deducted
  { name: "Rashmi Kapoor", role: "Teacher", designation: "PGT History & Pol Science", salary: 13800, phone: "9871234023", email: "rashmi.k@dps.edu.in", dept: "Senior Social Science", lateEntries: 2 },
  { name: "Manish Thakur", role: "Teacher", designation: "PGT Economics", salary: 13500, phone: "9871234024", email: "manish.t@dps.edu.in", dept: "Senior Social Science", lateEntries: 0 },
  { name: "Sangeeta Das", role: "Teacher", designation: "PGT Computer & IT", salary: 14800, phone: "9871234025", email: "sangeeta.d@dps.edu.in", dept: "Computer Science", lateEntries: 1 },
  { name: "Ramesh Iyer", role: "Teacher", designation: "Physical Education Director", salary: 12500, phone: "9871234026", email: "ramesh.i@dps.edu.in", dept: "Sports", lateEntries: 3 }
];

// Authentic Indian student first names & last names
const FIRST_NAMES = [
  "Aarav", "Ananya", "Vivaan", "Diya", "Ishaan", "Saanvi", "Advik", "Myra", "Reyansh", "Aadhya",
  "Samarth", "Prisha", "Arjun", "Anvi", "Kabir", "Kiara", "Dhruv", "Riya", "Kavya", "Shaurya",
  "Tanvi", "Rudra", "Avani", "Atharva", "Ira", "Devansh", "Sara", "Kian", "Navya", "Rohan",
  "Bhavya", "Parth", "Ahana", "Yuvraj", "Siya"
];

const LAST_NAMES = [
  "Sharma", "Verma", "Bhardwaj", "Gupta", "Singh", "Patel", "Mishra", "Pandey", "Chauhan", "Joshi",
  "Yadav", "Tiwari", "Mehta", "Srivastava", "Saxena", "Bhat", "Dubey", "Kulkarni", "Menon", "Rawat",
  "Kapoor", "Thakur", "Das", "Iyer", "Nair", "Rao", "Reddy", "Choudhary", "Bhattacharya", "Mukherjee",
  "Chatterjee", "Banerjee", "Sengupta", "Malhotra", "Khanna"
];

// 6 Exams requested: 2-month intervals
export const DEMO_EXAMS_CONFIG = [
  { name: "PA 1 (Periodic Assessment 1)", date: "2026-05-18", maxMarks: 40, term: "PA1" },
  { name: "PA 2 (Periodic Assessment 2)", date: "2026-07-25", maxMarks: 40, term: "PA2" },
  { name: "Half Yearly Examination", date: "2026-09-22", maxMarks: 100, term: "HalfYearly" },
  { name: "PA 3 (Periodic Assessment 3)", date: "2026-11-28", maxMarks: 40, term: "PA3" },
  { name: "PA 4 (Periodic Assessment 4)", date: "2027-01-20", maxMarks: 40, term: "PA4" },
  { name: "Final Annual Examination", date: "2027-03-15", maxMarks: 100, term: "Final" }
];

// 12 Months of the Academic Year 2026-27
export const DEMO_SESSION_MONTHS = [
  "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09",
  "2026-10", "2026-11", "2026-12", "2027-01", "2027-02", "2027-03"
];

// 1-Year School Notices across all 12 months
const DEMO_NOTICES = [
  { month: "2026-04", date: "2026-04-05", title: "New Academic Session 2026-27 Orientation & Welcome", type: "notice", audience: "all", content: "Welcome all students, parents, and esteemed teachers to the new academic session 2026-27. Orientation guidelines and curriculum outlines have been shared with all sections." },
  { month: "2026-05", date: "2026-05-10", title: "Summer Vacation Announcement & Holiday Projects", type: "holiday", audience: "students", content: "Summer break will commence from 20th May to 30th June 2026. Students are requested to complete their PA-1 creative holiday projects and reading assignments." },
  { month: "2026-06", date: "2026-06-25", title: "School Reopening Guidelines & Textbook Verification", type: "circular", audience: "all", content: "The school will reopen on 1st July 2026 in full summer uniform. Parents are requested to ensure all textbooks and notebooks are properly labelled." },
  { month: "2026-07", date: "2026-07-15", title: "Periodic Assessment 1 (PA-1) 40 Marks Datesheet", type: "notice", audience: "all", content: "PA-1 exams will be conducted from 25th July for 40 marks each subject. Syllabus covers Unit 1 and 2. Attendance is mandatory." },
  { month: "2026-08", date: "2026-08-10", title: "79th Independence Day Celebration & Flag Hoisting", type: "event", audience: "all", content: "Grand Independence Day celebration on 15th August 2026 at 8:00 AM in the school main arena. Patriotic cultural program and prize distribution will follow." },
  { month: "2026-09", date: "2026-09-08", title: "Periodic Assessment 2 (PA-2) & Mid-Term PTM Notice", type: "notice", audience: "all", content: "PA-2 (40 Marks) schedule published. Parent-Teacher Meeting (PTM) for reviewing student progress scheduled for 28th September." },
  { month: "2026-10", date: "2026-10-12", title: "Durga Puja, Dussehra & Diwali Festival Vacation Notice", type: "holiday", audience: "all", content: "School will observe festival holidays from 18th October to 28th October for Durga Puja and Diwali. Wishing all families joy, prosperity, and light." },
  { month: "2026-11", date: "2026-11-05", title: "Half-Yearly Examination 2026 Datesheet (100 Marks)", type: "circular", audience: "all", content: "The Half-Yearly examinations (100 Marks per subject) will be held from 20th November to 5th December. Admit cards available in student dashboard." },
  { month: "2026-12", date: "2026-12-18", title: "Annual Sports Meet 2026 & Winter Vacation Notice", type: "event", audience: "all", content: "Annual Sports Day on 23rd December. Winter break starts from 28th December 2026 to 8th January 2027. Special coaching for board classes continues." },
  { month: "2027-01", date: "2027-01-12", title: "Republic Day Celebration & PA-3 Schedule (40 Marks)", type: "notice", audience: "all", content: "Republic Day parade and inter-house debate on 26th January. PA-3 examinations will begin from 28th January 2027." },
  { month: "2027-02", date: "2027-02-08", title: "Periodic Assessment 4 (PA-4) & Annual Fee Clearance Reminder", type: "circular", audience: "all", content: "PA-4 assessments will be conducted from 18th February. All parents with pending tuition, bus, or annual fee dues are requested to clear balances before 28th February to avoid late charges." },
  { month: "2027-03", date: "2027-03-02", title: "Final Board & Annual Examination 2027 Date Sheet (100 Marks)", type: "notice", audience: "all", content: "Final Annual Examinations for all classes Nursery to 10 will begin on 15th March 2027 for 100 marks per subject. Annual report cards will be released on 31st March 2027." }
];

// 1-Year Festival & National Holidays List
const DEMO_HOLIDAYS = [
  { title: "Mahavir Jayanti", startDate: "2026-04-14", endDate: "2026-04-14", days: 1, type: "festival", description: "Gazetted holiday on the occasion of Mahavir Jayanti." },
  { title: "Eid-ul-Fitr", startDate: "2026-04-21", endDate: "2026-04-22", days: 2, type: "festival", description: "Joyful celebration of Eid-ul-Fitr with families." },
  { title: "Buddha Purnima", startDate: "2026-05-05", endDate: "2026-05-05", days: 1, type: "festival", description: "Celebration of Buddha Purnima." },
  { title: "Summer Vacation 2026", startDate: "2026-05-20", endDate: "2026-06-30", days: 42, type: "vacation", description: "Annual summer break for all classes Nursery to 10." },
  { title: "Muharram", startDate: "2026-07-28", endDate: "2026-07-28", days: 1, type: "festival", description: "Holiday observed for Muharram." },
  { title: "Independence Day", startDate: "2026-08-15", endDate: "2026-08-15", days: 1, type: "national", description: "National celebration with flag hoisting ceremony." },
  { title: "Raksha Bandhan", startDate: "2026-08-28", endDate: "2026-08-28", days: 1, type: "festival", description: "Celebration of the sacred bond of protection." },
  { title: "Janmashtami", startDate: "2026-09-04", endDate: "2026-09-04", days: 1, type: "festival", description: "Celebration of Lord Krishna's birth." },
  { title: "Mahatma Gandhi Jayanti", startDate: "2026-10-02", endDate: "2026-10-02", days: 1, type: "national", description: "National holiday celebrating Bapu's birth anniversary." },
  { title: "Durga Puja & Dussehra Vacation", startDate: "2026-10-18", endDate: "2026-10-23", days: 6, type: "festival", description: "Maha Saptami to Vijayadashami festive break." },
  { title: "Diwali & Govardhan Puja Festival", startDate: "2026-11-08", endDate: "2026-11-12", days: 5, type: "festival", description: "Festival of Lights holidays with family." },
  { title: "Guru Nanak Jayanti", startDate: "2026-11-24", endDate: "2026-11-24", days: 1, type: "festival", description: "Prakash Gurpurab celebration." },
  { title: "Christmas & Winter Break", startDate: "2026-12-25", endDate: "2027-01-05", days: 12, type: "vacation", description: "Christmas festive celebrations and winter vacation." },
  { title: "Makar Sankranti & Pongal", startDate: "2027-01-14", endDate: "2027-01-14", days: 1, type: "festival", description: "Harvest festival holiday." },
  { title: "Republic Day", startDate: "2027-01-26", endDate: "2027-01-26", days: 1, type: "national", description: "National holiday with parade and honors." },
  { title: "Maha Shivratri", startDate: "2027-02-15", endDate: "2027-02-15", days: 1, type: "festival", description: "Spiritual festive holiday for Maha Shivratri." },
  { title: "Holi & Dhulandi Celebration", startDate: "2027-03-22", endDate: "2027-03-24", days: 3, type: "festival", description: "Festival of Colors holiday." }
];

export async function seedDemoSchoolData(schoolId: string, adminUid: string) {
  // 1. Session Setup (2026-27 full year)
  const existingSessions = await getSessions(schoolId);
  const existingDemoSession = existingSessions.find(s => s.id === DEMO_SESSION_ID);
  const session: SchoolSession = {
    id: DEMO_SESSION_ID,
    schoolId,
    name: DEMO_SESSION_NAME,
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    active: true,
    createdAt: existingDemoSession?.createdAt || new Date().toISOString(),
  };
  await saveSession(session);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = currentMonthStr();

  // 2. Staff Members & Teachers (Ratio 1:35 -> 26 teachers for 26 sections + 1 Principal)
  const staffList: StaffEmployee[] = DEMO_STAFF_MEMBERS.map((member, idx) => ({
    id: `demo_staff_${String(idx + 1).padStart(2, "0")}`,
    schoolId,
    name: member.name,
    email: member.email,
    phone: member.phone,
    designation: member.designation,
    department: member.dept,
    joinDate: "2024-04-01",
    monthlySalary: member.salary,
    active: true,
    createdAt: session.createdAt,
    // Late entries count for the 3-day penalty calculation rule
    lateEntriesCount: member.lateEntries,
  }));

  // Save all staff members
  await Promise.all(staffList.map(saveStaffEmployee));

  // 3. Cleanup any old demo classes from previous runs (e.g. split _a or _b classes)
  try {
    const existingClasses = await getClasses(schoolId, session.id);
    for (const ec of existingClasses) {
      if (ec.id.startsWith("demo_class_")) {
        await deleteClass(schoolId, ec.id);
      }
    }
  } catch (err) {
    console.warn("Class cleanup warning:", err);
  }

  // 4. Classes and Sections: 13 Classes (Nursery, KG 1, KG 2, Class 1 to 10)
  // Each class has exactly 70 students (Total: 13 x 70 = 910 students)
  // Teacher-Student Ratio = 1:35 -> 2 teachers per class (70 / 35 = 2)
  const createdClasses: SchoolClass[] = [];
  const createdSubjects: SchoolSubject[] = [];
  const createdStudents: SchoolStudent[] = [];
  const createdExams: ExamEntry[] = [];
  const createdFees: any[] = [];

  for (const [classIdx, classCfg] of DEMO_CLASSES_CONFIG.entries()) {
    const classKey = classCfg.key;
    const classId = `demo_class_${classKey}`;
    const className = classCfg.name;

    // 2 teachers per class (Teacher-Student Ratio 1:35 -> 70 students / 35 = 2 teachers)
    // Teachers 1 to 26 (Teacher 0 is Principal)
    const leadTeacher = staffList[(classIdx * 2 + 1) % staffList.length];
    const coTeacher = staffList[(classIdx * 2 + 2) % staffList.length];

    const schoolClass: SchoolClass = {
      id: classId,
      schoolId,
      sessionId: session.id,
      name: className,
      section: "A & B", // All 70 students in sections A & B
      classTeacherId: leadTeacher.id,
      defaultFee: classCfg.feeStructure.tuitionFee,
      feeStructure: classCfg.feeStructure,
      createdAt: session.createdAt,
    };
    createdClasses.push(schoolClass);

    // Subjects tailored to this class
    const classSubjects = classCfg.subjects.map((subName, subIdx) => ({
      id: `demo_subject_${classKey}_${subIdx + 1}`,
      schoolId,
      sessionId: session.id,
      classId,
      name: subName,
      teacherId: subIdx % 2 === 0 ? leadTeacher.id : coTeacher.id,
      createdAt: session.createdAt,
    }));
    createdSubjects.push(...classSubjects);

    // EXACTLY 70 Students in this class (sNo 1 to 70)
    // Section A: Roll 01-35 (Teacher: Lead Teacher)
    // Section B: Roll 36-70 (Teacher: Co-Teacher)
    const classStudents: SchoolStudent[] = [];
    for (let sNo = 1; sNo <= 70; sNo++) {
      const studentSuffix = String(sNo).padStart(2, "0");
      const firstName = FIRST_NAMES[(classIdx * 7 + sNo * 3) % FIRST_NAMES.length];
      const lastName = LAST_NAMES[(classIdx * 5 + sNo * 2) % LAST_NAMES.length];
      const sectionName = sNo <= 35 ? "A" : "B";
      const rollNo = `${classCfg.name.replace(/[^0-9A-Za-z]/g, "")}-${sectionName}-${studentSuffix}`;
      const admissionNo = `DPS-ADM-${140000 + classIdx * 100 + sNo}`;

      const student: SchoolStudent = {
        id: `demo_student_${classKey}_${studentSuffix}`,
        schoolId,
        sessionId: session.id,
        classId, // All 70 students share this same class!
        name: `${firstName} ${lastName}`,
        rollNo,
        admissionNo,
        fatherName: `Mr. Rajesh ${lastName}`,
        motherName: `Mrs. Sunita ${lastName}`,
        phone: `98${String(10000000 + classIdx * 500000 + sNo * 12345).slice(0, 8)}`,
        dateOfBirth: `201${Math.max(0, 8 - Math.min(classIdx, 8))}-07-${String(Math.min(28, (sNo % 28) + 1)).padStart(2, "0")}`,
        monthlyFee: classCfg.feeStructure.tuitionFee,
        joinDate: "2026-04-01",
        active: true,
        createdAt: session.createdAt,
      };
      classStudents.push(student);
    }
    createdStudents.push(...classStudents);

    // 5. Exams & 1-Year Auto-Filled Marks across all 6 exams:
    // PA 1 (40), PA 2 (40), Half Yearly (100), PA 3 (40), PA 4 (40), Final (100)
    for (const examCfg of DEMO_EXAMS_CONFIG) {
      for (const sub of classSubjects) {
        const studentMarks: ExamEntry["studentMarks"] = {};
        classStudents.forEach((st, sIdx) => {
          const isAbsent = (sIdx === 69 || sIdx === 34) && (examCfg.term === "PA2" || examCfg.term === "PA4");
          let score = 0;
          if (!isAbsent) {
            if (examCfg.maxMarks === 40) {
              // PA Exam: 18 to 39 out of 40
              score = 22 + ((classIdx * 4 + sIdx * 3 + sub.name.length) % 18);
            } else {
              // 100 Marks (Half Yearly & Final): 52 to 98 out of 100
              score = 55 + ((classIdx * 7 + sIdx * 5 + sub.name.length * 2) % 44);
            }
          }
          studentMarks[st.id] = {
            marks: score,
            absent: isAbsent,
            studentName: st.name,
            rollNo: st.rollNo,
          };
        });

        const exam: ExamEntry = {
          id: `demo_exam_${classKey}_${examCfg.term}_${sub.id}`,
          schoolId,
          sessionId: session.id,
          classId,
          subjectId: sub.id,
          subjectName: sub.name,
          examName: `${examCfg.name} • ${sub.name}`,
          examDate: examCfg.date,
          maxMarks: examCfg.maxMarks,
          markedBy: leadTeacher.id,
          studentMarks,
          createdAt: session.createdAt,
        };
        createdExams.push(exam);
      }
    }

    // 6. 1-Year Fee Records & Receipts with Varied Pending Dues:
    // Requirement: "kuchh student ka 8 10 12 6 4 5 7 3 month ke baki rahenge fee"
    classStudents.forEach((student, sIdx) => {
      // Assign pending months based on student index pattern
      let pendingMonthsCount = 0;
      if (sIdx === 69 || sIdx === 34) pendingMonthsCount = 12; // 12 months due
      else if (sIdx === 68 || sIdx === 33) pendingMonthsCount = 10; // 10 months due
      else if (sIdx === 67 || sIdx === 32 || sIdx === 31) pendingMonthsCount = 8; // 8 months due
      else if (sIdx === 66 || sIdx === 30) pendingMonthsCount = 7; // 7 months due
      else if (sIdx === 65 || sIdx === 29 || sIdx === 28) pendingMonthsCount = 6; // 6 months due
      else if (sIdx === 64 || sIdx === 27) pendingMonthsCount = 5; // 5 months due
      else if (sIdx === 63 || sIdx === 26 || sIdx === 25) pendingMonthsCount = 4; // 4 months due
      else if (sIdx === 62 || sIdx === 24 || sIdx === 23) pendingMonthsCount = 3; // 3 months due
      else if (sIdx % 5 === 0) pendingMonthsCount = 1; // 1 month due
      else pendingMonthsCount = 0; // completely up-to-date!

      // Generate fee records for all 12 session months
      DEMO_SESSION_MONTHS.forEach((mStr, mIdx) => {
        const isPending = mIdx >= (12 - pendingMonthsCount);
        const isPaid = !isPending;

        const baseAmount = classCfg.feeStructure.tuitionFee;
        const feeRecord = {
          schoolId,
          sessionId: session.id,
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          classId,
          month: mStr,
          amount: baseAmount,
          monthlyAmount: baseAmount,
          paid: isPaid,
          paidDate: isPaid ? `${mStr}-10` : undefined,
          paidBy: isPaid ? adminUid : undefined,
          receiptNo: isPaid ? `DPS-RCP-${43000 + classIdx * 100 + sIdx * 12 + mIdx}` : undefined,
          note: isPaid ? "Paid via Cheque/Online Banking" : `Fee overdue (${pendingMonthsCount} Months Pending)`,
          payModeInfo: isPaid ? {
            payMode: (sIdx + mIdx) % 3 === 0 ? "Cheque" : (sIdx + mIdx) % 3 === 1 ? "Online / UPI" : "Cash",
            date: `10/${mStr.slice(5, 7)}/${mStr.slice(0, 4)}`,
            bank: "HDFC BANK",
            number: `CHQ-${689800 + classIdx * 100 + sIdx * 5 + mIdx}`
          } : undefined
        };
        createdFees.push(feeRecord);
      });
    });
  }

  // 6. Fast batch / parallel persistence to Firebase + Local Cache
  // Save Classes, Subjects, Students, Exams, Fees in chunks to avoid network congestion
  for (const c of createdClasses) {
    await saveClass(c);
  }

  // Save staff and subjects
  await Promise.all(createdSubjects.map(saveSubject));

  // Save students in parallel chunks of 30
  const CHUNK_SIZE = 35;
  for (let i = 0; i < createdStudents.length; i += CHUNK_SIZE) {
    await Promise.all(createdStudents.slice(i, i + CHUNK_SIZE).map(saveStudent));
  }

  // Save fees in chunks
  for (let i = 0; i < createdFees.length; i += 70) {
    await Promise.all(createdFees.slice(i, i + 70).map(saveFee));
  }

  // Save exams in chunks
  for (let i = 0; i < createdExams.length; i += 20) {
    await Promise.all(createdExams.slice(i, i + 20).map(saveExam));
  }

  // 7. Seed 1-Year School Notices (Month-wise)
  for (const noticeData of DEMO_NOTICES) {
    const notice: SchoolNotice = {
      id: generateId(),
      schoolId,
      title: noticeData.title,
      content: noticeData.content,
      type: noticeData.type as any,
      audience: noticeData.audience as any,
      date: noticeData.date,
      createdAt: `${noticeData.date}T09:00:00Z`,
      createdBy: adminUid,
      pinned: noticeData.month === "2026-04" || noticeData.month === "2027-03",
    };
    await saveNotice(notice);
  }

  // 8. Seed 1-Year Festival Holidays Calendar
  for (const holidayData of DEMO_HOLIDAYS) {
    const holiday: SchoolHoliday = {
      id: generateId(),
      schoolId,
      title: holidayData.title,
      startDate: holidayData.startDate,
      endDate: holidayData.endDate,
      days: holidayData.days,
      type: holidayData.type as any,
      description: holidayData.description,
      createdAt: session.createdAt,
      createdBy: adminUid,
    };
    await saveSchoolHoliday(schoolId, holiday);
  }

  // 9. Seed 1-Year Student & Teacher Attendance Samples (with leaves, bunks, and lates)
  const sampleDates = [
    "2026-04-10", "2026-05-12", "2026-07-18", "2026-08-20",
    "2026-09-15", "2026-10-14", "2026-11-19", "2026-12-10",
    "2027-01-18", "2027-02-16", today
  ];

  for (const dateStr of sampleDates) {
    // Seed attendance for first 4 classes to keep responsiveness lightning-fast
    for (const c of createdClasses.slice(0, 4)) {
      const classStudents = createdStudents.filter(st => st.classId === c.id);
      const studentMap: AttendanceRecord["students"] = {};
      classStudents.forEach((st, idx) => {
        let status: any = "present";
        if (idx === 34) status = "bunk"; // bunk
        else if (idx === 33) status = "leave"; // approved leave
        else if (idx === 32 || idx === 31) status = "late"; // late entry
        else if (idx === 30) status = "absent"; // absent
        else status = "present";

        studentMap[st.id] = {
          present: status === "present" || status === "late",
          name: st.name,
          rollNo: st.rollNo,
          status,
          inTime: status === "late" ? "08:45 AM" : (status === "present" ? "08:05 AM" : undefined),
          note: status === "bunk" ? "Student left class after interval" : (status === "leave" ? "Sick leave applied by guardian" : undefined)
        };
      });

      const attRecord: AttendanceRecord = {
        date: dateStr,
        schoolId,
        classId: c.id,
        sessionId: session.id,
        markedBy: c.classTeacherId || adminUid,
        students: studentMap,
        createdAt: `${dateStr}T08:30:00Z`
      };
      await saveAttendance(attRecord);
    }
  }

  return {
    session,
    classes: createdClasses.length,
    students: createdStudents.length,
    subjects: createdSubjects.length,
    exams: createdExams.length,
    staff: staffList.length,
    notices: DEMO_NOTICES.length,
    holidays: DEMO_HOLIDAYS.length,
    month: currentMonth,
  };
}
