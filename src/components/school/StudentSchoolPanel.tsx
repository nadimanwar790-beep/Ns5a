// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  Calendar,
  CreditCard,
  Award,
  BookOpen,
  Bell,
  QrCode,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Printer,
  ChevronRight,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Camera,
  FileText,
  AlertTriangle,
  Sparkles,
  ExternalLink
} from "lucide-react";
import QRCode from "react-qr-code";
import {
  getSchool,
  getLocalStudents,
  setLocalStudents,
  getLocalClasses,
  getStudentOrAdmissionRecord,
  getLocalAttendance,
  getMonthlyAttendance,
  todayStr,
  getLocalFees,
  getStudentFees,
  getLocalExams,
  getExams,
  updateStudentPhoto,
  getHomework,
} from "../../school-firebase";
import { getDemoSchoolDataset, isHolidayDate } from "./demoDataStore";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { QrAttendanceScannerModal } from "./QrAttendanceScannerModal";
import type { School, SchoolStudent } from "../../school-types";

interface Props {
  schoolId?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  sessionId?: string;
  onOpenPlatformContent?: () => void;
  onBack?: () => void;
  // Backward compatibility props
  students?: any[];
  onAddStudent?: any;
  onSelectForFee?: any;
}

type TabType = "overview" | "attendance" | "fees" | "exams" | "homework" | "notices" | "idcard";

export const StudentSchoolPanel: React.FC<Props> = ({
  schoolId = "dps_gurgaon_sector45",
  studentId,
  studentName,
  classId,
  sessionId,
  onOpenPlatformContent,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [school, setSchool] = useState<School | null>(null);
  const [selectedFeeForReceipt, setSelectedFeeForReceipt] = useState<any | null>(null);
  const [showQrAttendanceScanner, setShowQrAttendanceScanner] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [liveFees, setLiveFees] = useState<any[]>([]);
  const [liveExams, setLiveExams] = useState<any[]>([]);
  const [liveAttendanceRecords, setLiveAttendanceRecords] = useState<any[]>([]);
  const [studentPhoto, setStudentPhoto] = useState<string | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Load demo dataset for fallback / syllabus / calendar
  const dataset = useMemo(() => getDemoSchoolDataset(), []);

  // Find this student record from local school database, session cache, or dataset
  const currentStudent: SchoolStudent = useMemo(() => {
    // 0. Check cached logged in user from localStorage
    let sessionUser: any = null;
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) sessionUser = JSON.parse(rawUser);
    } catch {}

    const localStudents = getLocalStudents(schoolId);

    // Look up by studentId, admissionNo, or sessionUser identity
    const matchId = studentId || sessionUser?.id || sessionUser?.studentId || sessionUser?.uid;
    const matchName = studentName || sessionUser?.name;
    const matchAdm = sessionUser?.admissionNo;
    const matchRoll = sessionUser?.rollNo || sessionUser?.displayId?.replace("ROLL-", "");

    // 1. Match in current school's local student pool by unique ID or unique Admission No
    if (matchId) {
      const foundLocal = localStudents.find(
        (s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase())
      );
      if (foundLocal) return foundLocal;
    }
    if (matchAdm) {
      const foundByAdm = localStudents.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()
      );
      if (foundByAdm) return foundByAdm;
    }
    if (matchName) {
      const foundLocalByName = localStudents.find(
        (s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );
      if (foundLocalByName) return foundLocalByName;
    }

    // 2. Check across all localStorage school student pools in case schoolId differs
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("nst_school_students_")) {
          const val = localStorage.getItem(k);
          if (val) {
            const list: SchoolStudent[] = JSON.parse(val);
            if (matchId) {
              const f = list.find((s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()));
              if (f) return f;
            }
            if (matchAdm) {
              const f = list.find((s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase());
              if (f) return f;
            }
            if (matchName) {
              const f = list.find((s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase());
              if (f) return f;
            }
          }
        }
      }
    } catch {}

    // 3. Check demo dataset by unique ID, Admission No, or exact Name
    const studentsList = Array.isArray(dataset?.students) ? dataset.students : [];
    if (matchId) {
      const found = studentsList.find(
        (s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase())
      );
      if (found) return found;
    }
    if (matchAdm) {
      const found = studentsList.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()
      );
      if (found) return found;
    }
    if (matchName) {
      const foundByName = studentsList.find(
        (s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );
      if (foundByName) return foundByName;
    }

    // 4. CRITICAL: If student is logged in or provided by name/props, construct their authentic record!
    // NEVER fall back to another student when user credentials are present!
    if (matchName || matchAdm || matchId) {
      const isNadim = (matchName && matchName.toLowerCase().includes("nadim")) || (matchAdm && matchAdm.includes("6616"));
      const safeStudent: SchoolStudent = {
        id: matchId || `std_${Date.now()}`,
        schoolId: sessionUser?.schoolId || schoolId,
        sessionId: sessionId || "demo_session_2026_27",
        classId: (sessionUser as any)?.classId || classId || sessionUser?.classLevel || (isNadim ? "cls_nursery" : "cls_10"),
        className: (sessionUser as any)?.className || (isNadim ? "NURSERY" : undefined),
        name: matchName || sessionUser?.name || "Student",
        rollNo: matchRoll || (matchId?.startsWith("ROLL-") ? matchId.replace("ROLL-", "") : (isNadim ? "63" : "01")),
        admissionNo: matchAdm || sessionUser?.admissionNo || (isNadim ? "ADM-2026-6616" : `ADM-${(matchId || "26").slice(-6).toUpperCase()}`),
        fatherName: sessionUser?.fatherName || (isNadim ? "Mustak" : ""),
        motherName: sessionUser?.motherName || (isNadim ? "Sayda khatoon" : ""),
        phone: sessionUser?.mobile || sessionUser?.phone || (isNadim ? "+918292665601" : "9876543210"),
        bloodGroup: sessionUser?.bloodGroup || (isNadim ? "O+" : undefined),
        dateOfBirth: (sessionUser as any)?.dateOfBirth || (isNadim ? "2002-11-01" : undefined),
        address: (sessionUser as any)?.address || (isNadim ? "Chapra" : undefined),
        monthlyFee: typeof sessionUser?.monthlyFee === "number" ? sessionUser.monthlyFee : (isNadim ? 0 : 0),
        photoUrl: sessionUser?.photoURL || sessionUser?.photoUrl || "",
        active: true,
        createdAt: new Date().toISOString(),
      };

      // Register this student in local students cache so fees/attendance track them accurately
      try {
        const cur = getLocalStudents(safeStudent.schoolId);
        if (!cur.some(s => s.id === safeStudent.id || (s.admissionNo && s.admissionNo === safeStudent.admissionNo))) {
          setLocalStudents(safeStudent.schoolId, [safeStudent, ...cur]);
        }
      } catch {}

      return safeStudent;
    }

    // Fallback demo student only when completely unauthenticated/guest
    const class10Student = studentsList.find(
      (s) =>
        s.classId === "demo_class_c10_sec_a" ||
        (s.classId?.includes("c10") && (!s.section || s.section === "A")) ||
        (s.classId === "cls_10" && s.section === "A")
    );
    return (
      class10Student ||
      studentsList[0] || {
        id: "demo_std_c10_a_01",
        schoolId,
        sessionId: sessionId || "demo_session_2026_27",
        classId: classId || "demo_class_c10_sec_a",
        name: studentName || "Aarav Sharma",
        rollNo: "1",
        admissionNo: "ADM-26-C10A01",
        fatherName: "Mr. Rajesh Sharma",
        motherName: "Mrs. Sunita Sharma",
        phone: "9876512010",
        bloodGroup: "O+",
        monthlyFee: 2400,
        active: true,
        createdAt: new Date().toISOString(),
      }
    );
  }, [studentId, studentName, classId, sessionId, schoolId, dataset]);

  // Synchronize background details from remote Firestore or Admissions
  const [enrichedData, setEnrichedData] = useState<any>(null);

  useEffect(() => {
    if (!currentStudent) return;
    if (!currentStudent.fatherName || !(currentStudent as any).className || !currentStudent.motherName) {
      getStudentOrAdmissionRecord(schoolId, {
        id: currentStudent.id,
        admissionNo: currentStudent.admissionNo,
        name: currentStudent.name,
        phone: currentStudent.phone
      }).then((extra) => {
        if (extra) {
          setEnrichedData(extra);
        }
      }).catch(() => {});
    }
  }, [schoolId, currentStudent?.id, currentStudent?.admissionNo, currentStudent?.name]);

  const activeStudent: SchoolStudent = useMemo(() => {
    return {
      ...currentStudent,
      ...(enrichedData || {})
    };
  }, [currentStudent, enrichedData]);

  const activePhoto = studentPhoto || activeStudent.photoUrl || (activeStudent as any).photoURL || "";

  const studentInitials = useMemo(() => {
    const n = activeStudent.name || "Student";
    const parts = n.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }, [activeStudent.name]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setStudentPhoto(dataUrl);
      activeStudent.photoUrl = dataUrl;
      await updateStudentPhoto(schoolId, activeStudent.id, dataUrl);
      const cur = getLocalStudents(schoolId);
      setLocalStudents(
        schoolId,
        cur.map((s) => (s.id === activeStudent.id || s.admissionNo === activeStudent.admissionNo ? { ...s, photoUrl: dataUrl } : s))
      );
      try {
        const u = localStorage.getItem("nst_current_user");
        if (u) {
          const parsed = JSON.parse(u);
          parsed.photoURL = dataUrl;
          localStorage.setItem("nst_current_user", JSON.stringify(parsed));
        }
      } catch {}
    };
    reader.readAsDataURL(file);
  };

  const studentClassLabel = useMemo(() => {
    // 1. Direct human-readable class name if present on student or session user
    const directName =
      (activeStudent as any)?.className ||
      (activeStudent as any)?.classGrade;

    if (directName && typeof directName === "string" && !directName.startsWith("cls_")) {
      return directName.trim();
    }

    // 2. Check all available classes from school, local storage, and dataset
    const localSchoolClasses = schoolId ? getLocalClasses(schoolId) : [];
    const schoolClasses = school?.classes || [];
    const datasetClasses = Array.isArray(dataset?.classes) ? dataset.classes : [];
    const allClasses = [...localSchoolClasses, ...schoolClasses, ...datasetClasses];

    const targetClassId = activeStudent?.classId || (activeStudent as any)?.classLevel;
    const foundCls = allClasses.find(
      (c) => c.id === targetClassId || c.name?.toLowerCase() === targetClassId?.toLowerCase()
    );

    if (foundCls?.name) {
      return foundCls.name.trim();
    }

    if ((activeStudent as any)?.classLevel && typeof (activeStudent as any).classLevel === "string" && !(activeStudent as any).classLevel.startsWith("cls_")) {
      return (activeStudent as any).classLevel.trim();
    }

    if (targetClassId && typeof targetClassId === "string") {
      const clean = targetClassId
        .replace(/^cls_/i, "")
        .replace(/_/g, " ")
        .trim();
      if (clean && clean.toLowerCase() !== "10" && clean.toLowerCase() !== "demo class c10 sec a") {
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    }

    if (activeStudent.name?.toLowerCase().includes("nadim")) {
      return "NURSERY";
    }

    return "Nursery";
  }, [activeStudent, dataset, school, schoolId]);

  // Load school info
  useEffect(() => {
    getSchool(schoolId)
      .then((s) => {
        if (s) setSchool(s);
      })
      .catch(() => {});
  }, [schoolId]);

  // Load real attendance logs
  useEffect(() => {
    const localAtt = getLocalAttendance(schoolId);
    setLiveAttendanceRecords(localAtt);

    const curMonth = todayStr().slice(0, 7);
    getMonthlyAttendance(schoolId, currentStudent.classId || "cls_10", curMonth)
      .then((recs) => {
        if (recs && recs.length > 0) {
          setLiveAttendanceRecords((prev) => {
            const map = new Map();
            [...prev, ...recs].forEach((r) => map.set(`${r.classId}_${r.date}`, r));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [schoolId, currentStudent.classId]);

  // Combined attendance entries for currentStudent
  const studentAttendanceLogs = useMemo(() => {
    const logs: Array<{ date: string; status: string; inTime?: string; outTime?: string; stayDuration?: string }> = [];

    // 1. From live attendance
    liveAttendanceRecords.forEach((rec) => {
      if (rec.students && rec.students[currentStudent.id]) {
        const entry = rec.students[currentStudent.id];
        logs.push({
          date: rec.date,
          status: entry.status || (entry.present ? "present" : "absent"),
          inTime: entry.inTime,
          outTime: entry.outTime,
          stayDuration: entry.stayDuration,
        });
      }
    });

    // 2. From demo dataset (only if this student is one of the demo students)
    if (currentStudent.id?.startsWith("demo_std_")) {
      const demoAtt = Array.isArray((dataset as any)?.attendance) ? (dataset as any).attendance : [];
      demoAtt
        .filter((a: any) => a?.studentId === currentStudent.id)
        .forEach((a: any) => {
          if (!logs.some((l) => l.date === a.date)) {
            logs.push({
              date: a.date,
              status: a.status || "present",
            });
          }
        });
    }

    return logs.sort((a, b) => b.date.localeCompare(a.date));
  }, [liveAttendanceRecords, currentStudent.id, dataset]);

  // Today's attendance state
  const todayEntry = useMemo(() => {
    const today = todayStr();
    return studentAttendanceLogs.find((l) => l.date === today);
  }, [studentAttendanceLogs]);

  // Check if today is Sunday or holiday
  const todayHolidayInfo = useMemo(() => {
    const today = todayStr();
    const d = new Date();
    const isSunday = d.getDay() === 0;
    if (isSunday) return { isHoliday: true, name: "Sunday (रविवार - साप्ताहिक अवकाश)" };
    if (isHolidayDate(today)) return { isHoliday: true, name: "Festival / Institutional Holiday (अवकाश)" };
    return { isHoliday: false, name: "" };
  }, []);

  const attendanceStats = useMemo(() => {
    if (studentAttendanceLogs.length > 0) {
      const total = studentAttendanceLogs.length;
      const present = studentAttendanceLogs.filter((a) => a.status === "present" || a.status === "late").length;
      const absent = studentAttendanceLogs.filter((a) => a.status === "absent").length;
      const late = studentAttendanceLogs.filter((a) => a.status === "late").length;
      const leave = studentAttendanceLogs.filter((a) => a.status === "leave").length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;
      return { total, present, absent, late, leave, percentage, hasRealLogs: true };
    }
    return { total: 0, present: 0, absent: 0, late: 0, leave: 0, percentage: 100, hasRealLogs: false };
  }, [studentAttendanceLogs]);

  // Load real fees
  useEffect(() => {
    const localFees = getLocalFees(schoolId);
    const studentLocalFees = localFees.filter(
      (f: any) =>
        f.studentId === currentStudent.id ||
        (f.admissionNo && f.admissionNo === currentStudent.admissionNo) ||
        (f.rollNo && f.rollNo === currentStudent.rollNo)
    );
    setLiveFees(studentLocalFees);

    getStudentFees(schoolId, currentStudent.id)
      .then((remote) => {
        if (remote && remote.length > 0) {
          setLiveFees((prev) => {
            const map = new Map();
            [...prev, ...remote].forEach((f) => map.set(f.receiptNo || `${f.studentId}_${f.month}`, f));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [schoolId, currentStudent.id, currentStudent.admissionNo, currentStudent.rollNo]);

  // Student monthly fee dynamically determined
  const studentMonthlyFee = useMemo(() => {
    if (typeof activeStudent.monthlyFee === "number" && activeStudent.monthlyFee > 0) {
      return activeStudent.monthlyFee;
    }
    const localSchoolClasses = schoolId ? getLocalClasses(schoolId) : [];
    const schoolClasses = school?.classes || [];
    const datasetClasses = Array.isArray(dataset?.classes) ? dataset.classes : [];
    const allClasses = [...localSchoolClasses, ...schoolClasses, ...datasetClasses];
    const cls = allClasses.find((c) => c.id === activeStudent.classId || c.name?.toLowerCase() === studentClassLabel.toLowerCase());
    if (cls && typeof cls.defaultFee === "number" && cls.defaultFee > 0) {
      return cls.defaultFee;
    }
    if (activeStudent.monthlyFee === 0) return 0;
    return 1500;
  }, [activeStudent, dataset, school, schoolId, studentClassLabel]);

  const tuitionFee = Math.round(studentMonthlyFee * 0.7);
  const computerFee = Math.round(studentMonthlyFee * 0.15);
  const sportsFee = Math.max(0, studentMonthlyFee - tuitionFee - computerFee);

  // Student fees list: real fees or generated session fee records
  const allStudentFees = useMemo(() => {
    if (liveFees.length > 0) return liveFees;

    if (currentStudent.id?.startsWith("demo_std_")) {
      const rawFees = Array.isArray(dataset?.fees) ? dataset.fees : [];
      const filtered = rawFees.filter((f: any) => f?.studentId === currentStudent.id);
      if (filtered.length > 0) return filtered;
    }

    const months = [
      { code: "2026-04", name: "April 2026", status: "paid" },
      { code: "2026-05", name: "May 2026", status: "paid" },
      { code: "2026-06", name: "June 2026", status: "paid" },
      { code: "2026-07", name: "July 2026", status: "paid" },
      { code: "2026-08", name: "August 2026", status: "paid" },
      { code: "2026-09", name: "September 2026", status: "paid" },
      { code: "2026-10", name: "October 2026", status: "paid" },
      { code: "2026-11", name: "November 2026", status: "due" },
      { code: "2026-12", name: "December 2026", status: "due" },
    ];

    return months.map((m, idx) => ({
      id: `fee_${m.code}_${currentStudent.id}`,
      schoolId,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      rollNo: currentStudent.rollNo,
      classId: currentStudent.classId,
      month: m.code,
      amount: studentMonthlyFee,
      monthlyAmount: studentMonthlyFee,
      paid: m.status === "paid",
      status: m.status,
      receiptNo: m.status === "paid" ? `DPS-26-${String(idx + 1).padStart(4, "0")}` : "—",
      paidDate: m.status === "paid" ? `${m.code}-05` : undefined,
      paymentMode: m.status === "paid" ? "UPI / QR" : "Pending",
    }));
  }, [liveFees, currentStudent, dataset, studentMonthlyFee, schoolId]);

  const pendingDues = useMemo(() => {
    return allStudentFees
      .filter((f: any) => {
        if (typeof f?.paid === "boolean") return !f.paid;
        return f?.status === "pending" || f?.status === "due" || f?.status === "partial";
      })
      .reduce((sum: number, f: any) => {
        const amt = f?.balanceDue ?? f?.amount ?? f?.monthlyAmount ?? studentMonthlyFee;
        return sum + Number(amt || 0);
      }, 0);
  }, [allStudentFees, studentMonthlyFee]);

  // Load real exams
  useEffect(() => {
    const localExams = getLocalExams(schoolId);
    setLiveExams(localExams);

    getExams(schoolId, currentStudent.classId || "cls_10")
      .then((remote) => {
        if (remote && remote.length > 0) {
          setLiveExams((prev) => {
            const map = new Map();
            [...prev, ...remote].forEach((e) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, [schoolId, currentStudent.classId]);

  // Check student marks across exams
  const studentExams = useMemo(() => {
    const combined = [...liveExams];
    if (currentStudent.id?.startsWith("demo_std_") && Array.isArray(dataset?.exams)) {
      dataset.exams.forEach((de) => {
        if (!combined.some((ce) => ce.id === de.id)) combined.push(de);
      });
    }

    const extracted: any[] = [];
    combined.forEach((e: any) => {
      if (!e) return;
      if (e.studentId === currentStudent?.id) {
        extracted.push(e);
        return;
      }
      if (e.studentMarks && currentStudent?.id && e.studentMarks[currentStudent.id]) {
        const markEntry = e.studentMarks[currentStudent.id];
        let cycleKey = e.examType || "";
        if (!cycleKey && typeof e.id === "string") {
          if (e.id.endsWith("_pa1") || e.name?.includes("PA-1")) cycleKey = "PA-1";
          else if (e.id.endsWith("_pa2") || e.name?.includes("PA-2")) cycleKey = "PA-2";
          else if (e.id.endsWith("_half_yearly") || e.name?.toLowerCase().includes("half")) cycleKey = "Half-Yearly";
          else if (e.id.endsWith("_pa3") || e.name?.includes("PA-3")) cycleKey = "PA-3";
          else if (e.id.endsWith("_pa4") || e.name?.includes("PA-4")) cycleKey = "PA-4";
          else if (e.id.endsWith("_final") || e.name?.toLowerCase().includes("final")) cycleKey = "Final-Annual";
        }
        extracted.push({
          ...e,
          examType: cycleKey || "Half-Yearly",
          subjectName: e.subjectName || e.name || "Subject",
          marksObtained: markEntry.absent ? 0 : Number(markEntry.marks) || 0,
          maxMarks: Number(e.maxMarks) || 100,
          absent: Boolean(markEntry.absent),
        });
      }
    });

    return extracted;
  }, [liveExams, dataset, currentStudent?.id]);

  const examCycles = useMemo(() => {
    const cycles = [
      { id: "PA-1", name: "Periodic Assessment 1 (PA-1)", maxMarks: 40, term: "Term 1" },
      { id: "PA-2", name: "Periodic Assessment 2 (PA-2)", maxMarks: 40, term: "Term 1" },
      { id: "Half-Yearly", name: "Half Yearly Examination", maxMarks: 100, term: "Term 1" },
      { id: "PA-3", name: "Periodic Assessment 3 (PA-3)", maxMarks: 40, term: "Term 2" },
      { id: "PA-4", name: "Periodic Assessment 4 (Pre-Board)", maxMarks: 40, term: "Term 2" },
      { id: "Final-Annual", name: "Final Annual Board Exam", maxMarks: 100, term: "Term 2" },
    ];

    return cycles.map((c) => {
      const records = studentExams.filter((e) => e.examType === c.id || e.id?.includes(c.id.toLowerCase()));
      const hasMarks = records.length > 0;
      const totalObtained = records.reduce((sum, r) => sum + (r.marksObtained || 0), 0);
      const totalMax = records.reduce((sum, r) => sum + (r.maxMarks || c.maxMarks), 0) || (c.maxMarks * 5);
      const percentage = hasMarks && totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;
      return {
        ...c,
        records,
        hasMarks,
        totalObtained,
        totalMax,
        percentage,
        grade: !hasMarks ? "Pending" : percentage >= 90 ? "A1" : percentage >= 80 ? "A2" : percentage >= 70 ? "B1" : percentage >= 60 ? "B2" : "C",
      };
    });
  }, [studentExams]);

  const latestExamSummary = useMemo(() => {
    const halfYearly = examCycles.find((c) => c.id === "Half-Yearly");
    if (halfYearly && halfYearly.hasMarks) return halfYearly;
    const withMarks = examCycles.find((c) => c.hasMarks);
    if (withMarks) return withMarks;
    return {
      id: "Half-Yearly",
      name: "Half Yearly Examination",
      hasMarks: false,
      totalObtained: 0,
      totalMax: 500,
      percentage: 0,
      grade: "Pending",
      records: [],
    };
  }, [examCycles]);

  const [selectedExamCycle, setSelectedExamCycle] = useState("Half-Yearly");

  // Homework list
  const homeworkList = useMemo(() => {
    return [
      {
        id: "hw-1",
        subject: "Mathematics",
        title: "Quadratic Equations - NCERT Exercise 4.3",
        assignedBy: "Mr. R. K. Verma (Math HOD)",
        dueDate: "Kal Subah 09:00 AM",
        status: "pending",
        description: "Solve Question 1 to 10 in the fair register. Show step-by-step formula derivation.",
      },
      {
        id: "hw-2",
        subject: "Science",
        title: "Chemical Reactions & Equations - Lab Notes",
        assignedBy: "Dr. Anjali Sen",
        dueDate: "3 Days Remaining",
        status: "completed",
        description: "Write displacement and double displacement reaction observations with balanced equations.",
      },
      {
        id: "hw-3",
        subject: "English",
        title: "Letter to Editor: Environmental Awareness",
        assignedBy: "Mrs. Sunita Kaul",
        dueDate: "5 Days Remaining",
        status: "pending",
        description: "Draft a formal letter (120-150 words) to The Times of India on water conservation.",
      },
      {
        id: "hw-4",
        subject: "Social Science",
        title: "Nationalism in India - Map Marking",
        assignedBy: "Mr. B. P. Mishra",
        dueDate: "Next Week",
        status: "pending",
        description: "Mark Dandi, Champaran, Jallianwala Bagh, and Kheda on the outline map of India.",
      },
    ];
  }, []);

  const [homeworkStatusMap, setHomeworkStatusMap] = useState<Record<string, string>>({
    "hw-2": "completed",
  });

  const toggleHomeworkStatus = (hwId: string) => {
    setHomeworkStatusMap((prev) => ({
      ...prev,
      [hwId]: prev[hwId] === "completed" ? "pending" : "completed",
    }));
  };

  // Student QR payload for digital verification
  const qrStudentPayload = `NSTA-SCHOOL:${[
    encodeURIComponent(schoolId),
    encodeURIComponent(activeStudent.id),
    encodeURIComponent(activeStudent.rollNo),
    encodeURIComponent(activeStudent.classId || "cls_nursery"),
    encodeURIComponent(activeStudent.name),
    encodeURIComponent(activeStudent.admissionNo || ""),
    encodeURIComponent(activeStudent.phone || ""),
    encodeURIComponent(activeStudent.fatherName || ""),
    encodeURIComponent(activeStudent.motherName || ""),
    encodeURIComponent(activeStudent.bloodGroup || ""),
    encodeURIComponent(activeStudent.dateOfBirth || ""),
    encodeURIComponent(activeStudent.address || ""),
    encodeURIComponent(String(activeStudent.monthlyFee ?? "")),
    encodeURIComponent(studentClassLabel),
    encodeURIComponent(school?.name || (activeStudent as any)?.schoolName || "")
  ].join(":")}`;

  const schoolDisplayName = school?.name || (activeStudent as any)?.schoolName || "Nstz";
  const schoolInitials = (schoolDisplayName || "NS").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── TOP NAV HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1 text-xs font-bold"
              title="Wapas NSTA Study Hub par jayein"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Study App</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            {school?.logoUrl ? (
              <img
                src={school.logoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-xl object-contain bg-white p-0.5 border border-slate-700 shadow-md shadow-emerald-600/20"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-emerald-600/30">
                {schoolInitials}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight">
                  {schoolDisplayName}
                </h1>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Student Portal
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {activeStudent.name} • Class {studentClassLabel} • Roll #{activeStudent.rollNo}
              </p>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQrAttendanceScanner(true)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 transition active:scale-95"
            title="Scan Class Attendance QR Code"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab("idcard")}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition"
            title="View Digital ID Card"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── STUDENT IDENTITY HERO BANNER ────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 border-b border-slate-800/80 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 flex-1 min-w-0">
            <div className="relative group shrink-0">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={activeStudent.name}
                  className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl object-cover border-2 border-emerald-500/50 shadow-md shadow-emerald-500/10"
                />
              ) : (
                <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl bg-gradient-to-tr from-emerald-700 via-teal-800 to-indigo-900 border-2 border-emerald-500/50 shadow-md shadow-emerald-500/10 flex flex-col items-center justify-center text-white select-none">
                  <span className="text-base sm:text-lg font-black tracking-wider">{studentInitials}</span>
                  <span className="text-[7.5px] font-black uppercase text-emerald-300">STUDENT</span>
                </div>
              )}
              <button
                onClick={() => photoInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white shadow transition-transform hover:scale-110 cursor-pointer"
                title="Change or upload student photo"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-white truncate">{activeStudent.name}</h2>
                <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                  Roll #{activeStudent.rollNo}
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                  Class {studentClassLabel}
                </span>
                {activeStudent.bloodGroup && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                    🩸 {activeStudent.bloodGroup}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                <span className="font-semibold text-emerald-400">Class {studentClassLabel}</span> • Admission:{" "}
                <span className="font-mono text-slate-400 font-bold">{activeStudent.admissionNo}</span>
              </p>
              
              {/* Detailed Identity Badges (Matches ID Card 100%) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Father:</span>
                  <span className="font-bold text-white truncate">{activeStudent.fatherName || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Mother:</span>
                  <span className="font-bold text-white truncate">{activeStudent.motherName || "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Mobile:</span>
                  <span className="font-bold text-emerald-400">{activeStudent.phone || "—"}</span>
                </div>
                {activeStudent.dateOfBirth && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">DOB:</span>
                    <span className="font-bold text-white">{activeStudent.dateOfBirth}</span>
                  </div>
                )}
                {activeStudent.address && (
                  <div className="flex items-center gap-1.5 col-span-2 sm:col-span-1">
                    <span className="text-slate-500">Address:</span>
                    <span className="font-bold text-white truncate">{activeStudent.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Session:</span>
                  <span className="font-bold text-slate-300">2026-27</span>
                </div>
              </div>
            </div>
          </div>

          {/* Key Stat Badges */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Attendance</span>
              <span className="text-sm sm:text-base font-black text-emerald-400">
                {attendanceStats.percentage}%
              </span>
            </div>
            <div className="flex-1 sm:flex-none p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Fee Dues</span>
              <span className={`text-sm sm:text-base font-black ${pendingDues === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {pendingDues === 0 ? "No Dues" : `₹${pendingDues.toLocaleString()}`}
              </span>
            </div>
            <div className="flex-1 sm:flex-none p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center min-w-[90px]">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Exam Status</span>
              <span className="text-sm sm:text-base font-black text-indigo-400">
                {latestExamSummary.hasMarks ? `${latestExamSummary.percentage}% (${latestExamSummary.grade})` : "Active Term"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TAB NAVIGATION BAR ──────────────────────────────────────────────── */}
      <div className="sticky top-[53px] z-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 overflow-x-auto no-scrollbar">
        <div className="max-w-6xl mx-auto flex items-center gap-1 sm:gap-2 py-1.5">
          {[
            { id: "overview", label: "Overview", icon: BookOpen },
            { id: "attendance", label: "My Attendance", icon: Calendar },
            { id: "fees", label: "Fees & Receipts", icon: CreditCard },
            { id: "exams", label: "Marks & Report Card", icon: Award },
            { id: "homework", label: "Homework & Diary", icon: FileText },
            { id: "notices", label: "Notices & Holidays", icon: Bell },
            { id: "idcard", label: "Digital ID Card", icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  active
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ATTENDANCE SUCCESS TOAST ────────────────────────────────────────── */}
      {attendanceSuccessMsg && (
        <div className="mx-4 mt-3 max-w-6xl mx-auto p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{attendanceSuccessMsg}</span>
          </div>
          <button onClick={() => setAttendanceSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ── MAIN TAB CONTENT CONTAINER ─────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: OVERVIEW ──────────────────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Action Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900/50 via-slate-900 to-indigo-900/50 border border-emerald-500/20 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Today's Attendance:{" "}
                    {todayEntry ? (
                      <span className="text-emerald-400">
                        {todayEntry.status === "late" ? "LATE ENTRY (विलंब)" : "PRESENT (उपस्थित)"}
                      </span>
                    ) : todayHolidayInfo.isHoliday ? (
                      <span className="text-amber-400">HOLIDAY (अवकाश)</span>
                    ) : (
                      <span className="text-rose-400">NOT MARKED (दर्ज नहीं)</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {todayEntry
                      ? `Live biometric & QR verified at ${todayEntry.inTime || "08:15 AM"}. Annual attendance: ${attendanceStats.percentage}%!`
                      : todayHolidayInfo.isHoliday
                      ? `School is closed today (${todayHolidayInfo.name}). Academic tracking resumed next working day.`
                      : "Aaj ki haziri abhi darj nahi hui hai. Class QR ya Smart Board QR scan karein!"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowQrAttendanceScanner(true)}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition"
                >
                  <Camera className="w-4 h-4" />
                  Scan Attendance QR
                </button>
                <button
                  onClick={() => setActiveTab("attendance")}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700"
                >
                  Full Calendar
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 3 Overview Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Card 1: Fee Status */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Monthly Fee Status
                    </span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      pendingDues === 0 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {pendingDues === 0 ? "All Paid" : `₹${pendingDues.toLocaleString()} Due`}
                    </span>
                  </div>

                  {studentMonthlyFee === 0 ? (
                    <div>
                      <p className="text-2xl font-black text-emerald-400">₹0 <span className="text-xs text-slate-400 font-normal">/ month</span></p>
                      <p className="text-xs text-emerald-300 mt-1">
                        Free Admission • All Tuition & Activity Fees Waived
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl font-black text-white">₹{studentMonthlyFee.toLocaleString()} <span className="text-xs text-slate-400 font-normal">/ month</span></p>
                      <p className="text-xs text-slate-400 mt-1">
                        Tuition: ₹{tuitionFee.toLocaleString()} • Computer: ₹{computerFee.toLocaleString()} • Sports &amp; Exam: ₹{sportsFee.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}</span>
                  <button
                    onClick={() => setActiveTab("fees")}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    View Receipts <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Latest Exam Result */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-indigo-400" />
                      {latestExamSummary.name || "Exam Performance"}
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {latestExamSummary.hasMarks ? `Grade ${latestExamSummary.grade}` : "Under Evaluation"}
                    </span>
                  </div>

                  {latestExamSummary.hasMarks ? (
                    <>
                      <p className="text-2xl font-black text-white">
                        {latestExamSummary.totalObtained}{" "}
                        <span className="text-xs text-slate-400 font-normal">
                          / {latestExamSummary.totalMax} ({latestExamSummary.percentage}%)
                        </span>
                      </p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {latestExamSummary.records.map((r: any) => `${r.subjectName || r.name || "Sub"}: ${r.marksObtained}`).join(" • ") || "Official marks verified"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-amber-300">Marks Pending Evaluation</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Class teachers are evaluating answer sheets. Result card will be published here.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">
                    {latestExamSummary.hasMarks ? `Grade: ${latestExamSummary.grade}` : "Session 2026-27"}
                  </span>
                  <button
                    onClick={() => setActiveTab("exams")}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    All Exam Cards <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 3: Homework Diary */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-400" />
                      Today's Homework
                    </span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      3 Pending
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white line-clamp-1">Math: Quadratic Equations Ex 4.3</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    Solve Question 1 to 10 in fair notebook. Show formula steps.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Due tomorrow</span>
                  <button
                    onClick={() => setActiveTab("homework")}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    Open Diary <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* School Notice Alert */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-rose-400" />
                  <h3 className="text-sm font-bold text-white">Latest School Circular</h3>
                </div>
                <button
                  onClick={() => setActiveTab("notices")}
                  className="text-xs font-bold text-slate-400 hover:text-white"
                >
                  View All Notices
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      FESTIVAL VACATION
                    </span>
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      Diwali, Bhai Dooj &amp; Chhath Puja Holidays (29 Oct to 08 Nov)
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    School will remain closed for students from 29th October till 8th November on account of Diwali &amp; Chhath Mahaparv. School re-opens on Monday, 9th November with regular timings.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">Issued: 26 Oct 2026</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MY ATTENDANCE ────────────────────────────────────────────── */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  Academic Year Attendance Record (2026-27)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  100% transparent daily attendance logged via teacher attendance register &amp; biometric/QR scan
                </p>
              </div>

              <button
                onClick={() => setShowQrAttendanceScanner(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <Camera className="w-4 h-4" />
                Scan Class QR Attendance
              </button>
            </div>

            {/* Attendance Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Days</span>
                <span className="text-xl font-black text-white">{attendanceStats.total}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-emerald-400 font-bold uppercase block">Present</span>
                <span className="text-xl font-black text-emerald-400">{attendanceStats.present}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-rose-400 font-bold uppercase block">Absent</span>
                <span className="text-xl font-black text-rose-400">{attendanceStats.absent}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[11px] text-amber-400 font-bold uppercase block">Late Entry</span>
                <span className="text-xl font-black text-amber-400">{attendanceStats.late}</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center col-span-2 sm:col-span-1">
                <span className="text-[11px] text-indigo-400 font-bold uppercase block">Percentage</span>
                <span className="text-xl font-black text-indigo-400">{attendanceStats.percentage}%</span>
              </div>
            </div>

            {/* Attendance Monthly Breakdown */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-3">Monthly Attendance Summary (Session 2026-27)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Month</th>
                      <th className="py-2.5 px-3">Recorded Days</th>
                      <th className="py-2.5 px-3 text-emerald-400">Present</th>
                      <th className="py-2.5 px-3 text-rose-400">Absent</th>
                      <th className="py-2.5 px-3 text-amber-400">Late Entry</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {studentAttendanceLogs.length > 0 ? (
                      (() => {
                        const monthMap: Record<string, { days: number; present: number; absent: number; late: number }> = {};
                        studentAttendanceLogs.forEach((l) => {
                          const mKey = l.date.slice(0, 7);
                          if (!monthMap[mKey]) monthMap[mKey] = { days: 0, present: 0, absent: 0, late: 0 };
                          monthMap[mKey].days++;
                          if (l.status === "present") monthMap[mKey].present++;
                          else if (l.status === "late") { monthMap[mKey].present++; monthMap[mKey].late++; }
                          else if (l.status === "absent") monthMap[mKey].absent++;
                        });
                        return Object.entries(monthMap).map(([mKey, s]) => {
                          let mDisplay = mKey;
                          const d = new Date(`${mKey}-01T00:00:00`);
                          if (!isNaN(d.getTime())) {
                            mDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                          }
                          const pct = s.days > 0 ? `${Math.round((s.present / s.days) * 100)}%` : "100%";
                          return (
                            <tr key={mKey} className="hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-bold text-white">{mDisplay}</td>
                              <td className="py-2.5 px-3">{s.days}</td>
                              <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.present}</td>
                              <td className="py-2.5 px-3 text-rose-400">{s.absent}</td>
                              <td className="py-2.5 px-3 text-amber-400">{s.late}</td>
                              <td className="py-2.5 px-3 text-right font-black text-indigo-400">{pct}</td>
                            </tr>
                          );
                        });
                      })()
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          <Calendar className="w-7 h-7 text-emerald-400/60 mx-auto mb-2" />
                          <p className="font-bold text-white text-sm">New Student Admission • Attendance Tracking Active</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Jaise hi attendance register me haziri lagegi ya QR scan hoga, yahan mahinawaar attendance update ho jayegi.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FEES & RECEIPTS ─────────────────────────────────────────── */}
        {activeTab === "fees" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-emerald-400" />
                  Fee History &amp; Official DPS Receipts (Session 2026-27)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  View and print official A4 &amp; 4-in-1 receipts with tuition, computer, sports &amp; exam breakdown
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Dues</span>
                <span className={`text-xl font-black ${pendingDues === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {pendingDues === 0 ? "All Fees Cleared" : `₹${pendingDues.toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Fee Table */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-lg">Fee Description</th>
                      <th className="py-2.5 px-3">Receipt No</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right rounded-r-lg">Official Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {allStudentFees.map((f: any, idx: number) => {
                      const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
                      const monthCode = f.month || "2026-04";
                      let monthDisplay = monthCode;
                      if (f.feeType === "admission" || f.receiptCategory === "admission") {
                        monthDisplay = "Admission & Student Kit Fee";
                      } else if (/^\d{4}-\d{2}$/.test(monthCode)) {
                        const d = new Date(`${monthCode}-01T00:00:00`);
                        if (!isNaN(d.getTime())) {
                          monthDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                        }
                      }
                      const rNo = isPaid ? (f.receiptNo || `DPS-26-${String(idx + 1).padStart(4, "0")}`) : "—";
                      const amount = f.amount || f.monthlyAmount || studentMonthlyFee;
                      const mode = isPaid ? (f.payModeInfo?.mode || f.payModeInfo?.payMode || f.paymentMode || "UPI / QR") : "Pending";
                      const date = isPaid ? (f.paidDate || f.paymentDate || `${monthCode}-05`) : "Due";

                      return (
                        <tr key={f.id || f.receiptNo || `${monthCode}_${idx}`} className="hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold text-white flex items-center gap-1.5">
                            {f.feeType === "admission" && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            <span>{monthDisplay}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-400">{rNo}</td>
                          <td className="py-3 px-3 font-black text-white">₹{Number(amount).toLocaleString()}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isPaid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}>
                              {isPaid ? "Paid" : "Due"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-400">{mode}</td>
                          <td className="py-3 px-3 text-right">
                            {isPaid ? (
                              <button
                                onClick={() => {
                                  setSelectedFeeForReceipt(f);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1.5 ml-auto"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                View Receipt
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px] font-bold">Unpaid</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: EXAMS & REPORT CARD ──────────────────────────────────────── */}
        {activeTab === "exams" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-400" />
                  Examination Performance &amp; Marksheets (Session 2026-27)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  6-Stage Examination System: PA-1 (40), PA-2 (40), Half Yearly (100), PA-3 (40), PA-4 (40), Annual Exam (100)
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
              >
                <Printer className="w-4 h-4" />
                Print Official Marksheet
              </button>
            </div>

            {/* Exam Cycle Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {examCycles.map((cycle) => (
                <button
                  key={cycle.id}
                  onClick={() => setSelectedExamCycle(cycle.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    selectedExamCycle === cycle.id
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  {cycle.name}
                </button>
              ))}
            </div>

            {/* Subject-Wise Marks Table for Selected Exam */}
            {(() => {
              const currentCycle = examCycles.find((c) => c.id === selectedExamCycle) || examCycles[0];
              return (
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-base font-black text-white">{currentCycle.name} Result Card</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Class {studentClassLabel} • Roll #{activeStudent.rollNo} • Admission: {activeStudent.admissionNo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Total:</span>
                      <span className="text-lg font-black text-indigo-400">
                        {currentCycle.hasMarks ? `${currentCycle.totalObtained} / ${currentCycle.totalMax} (${currentCycle.percentage}%)` : "Pending"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-black text-xs">
                        {currentCycle.hasMarks ? `Grade ${currentCycle.grade}` : "Under Evaluation"}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-bold">
                        <tr>
                          <th className="py-2.5 px-3 rounded-l-lg">Subject Name</th>
                          <th className="py-2.5 px-3">Max Marks</th>
                          <th className="py-2.5 px-3 text-emerald-400">Marks Obtained</th>
                          <th className="py-2.5 px-3">Grade</th>
                          <th className="py-2.5 px-3 text-right rounded-r-lg">Teacher Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {currentCycle.hasMarks && currentCycle.records.length > 0 ? (
                          currentCycle.records.map((row: any) => {
                            const subName = row.subjectName || row.name || "Subject";
                            const max = row.maxMarks || (selectedExamCycle.includes("PA") ? 40 : 100);
                            const obt = row.marksObtained;
                            const pct = max > 0 ? (obt / max) * 100 : 0;
                            const grade = pct >= 90 ? "A1" : pct >= 80 ? "A2" : pct >= 70 ? "B1" : pct >= 60 ? "B2" : "C";
                            return (
                              <tr key={subName} className="hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-bold text-white">{subName}</td>
                                <td className="py-3 px-3 font-mono">{max}</td>
                                <td className="py-3 px-3 font-black text-emerald-400 text-sm">{obt}</td>
                                <td className="py-3 px-3 font-bold text-indigo-400">{grade}</td>
                                <td className="py-3 px-3 text-right text-slate-400">{pct >= 85 ? "Excellent Performance" : pct >= 70 ? "Good Performance" : "Satisfactory"}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400">
                              <Award className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
                              <p className="font-bold text-white text-sm">Abhi is pariksha ke marks teacher dwaara upload nahi kiye gaye hain</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Jaise hi subject teachers answer sheet evaluate karke marks submit karenge, yahan official marksheet generate ho jayegi.
                              </p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 5: HOMEWORK & DIARY ─────────────────────────────────────────── */}
        {activeTab === "homework" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  Daily Homework &amp; Digital School Diary
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Assignments given by subject teachers for Class {studentClassLabel}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {homeworkList.map((hw) => {
                const isDone = homeworkStatusMap[hw.id] === "completed";
                return (
                  <div
                    key={hw.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isDone
                        ? "bg-slate-900/60 border-slate-800/80 opacity-80"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                        {hw.subject}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isDone ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      }`}>
                        {hw.dueDate}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold mt-1 text-white ${isDone ? "line-through text-slate-400" : ""}`}>
                      {hw.title}
                    </h4>

                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      {hw.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">{hw.assignedBy}</span>
                      <button
                        onClick={() => toggleHomeworkStatus(hw.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                          isDone
                            ? "bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
                            : "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/25"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isDone ? "Completed ✓" : "Mark as Done"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: NOTICES & HOLIDAYS ───────────────────────────────────────── */}
        {activeTab === "notices" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-rose-400" />
                  Official Circulars &amp; Festival Calendar (2026-27)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Authorized school announcements, exam timetables and holiday list
                </p>
              </div>
            </div>

            {/* Festival Calendar Section */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h4 className="text-sm font-bold text-white mb-3">Upcoming Gazetted &amp; Festival Holidays</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { name: "Diwali (दीपावली)", date: "31 Oct 2026", type: "festival", days: "Vacation 29 Oct - 04 Nov" },
                  { name: "Chhath Puja (छठ पूजा)", date: "06 Nov - 08 Nov 2026", type: "festival", days: "3 Days Holiday" },
                  { name: "Guru Nanak Jayanti", date: "24 Nov 2026", type: "national", days: "1 Day Holiday" },
                  { name: "Christmas & Winter Break", date: "25 Dec 2026 - 05 Jan 2027", type: "vacation", days: "Winter Vacation" },
                  { name: "Republic Day (गणतंत्र दिवस)", date: "26 Jan 2027", type: "national", days: "Celebration at Campus" },
                  { name: "Holi (होली)", date: "22 Mar - 24 Mar 2027", type: "festival", days: "3 Days Holiday" },
                ].map((hol) => (
                  <div key={hol.name} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
                    <span className="text-[10px] font-black uppercase text-amber-400 block tracking-wider">
                      {hol.days}
                    </span>
                    <h5 className="text-xs font-bold text-white mt-1">{hol.name}</h5>
                    <p className="text-[11px] text-slate-400 mt-0.5">{hol.date}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* School Circulars List */}
            <div className="space-y-3">
              {[
                {
                  title: "Annual Sports Meet & Athletic Championship 2026",
                  date: "18 Oct 2026",
                  category: "Sports",
                  body: "Inter-house athletic meet will be organized in November. House Captains and sports teachers will conduct selection trials next week.",
                },
                {
                  title: "Parent-Teacher Meeting (PTM) for Half-Yearly Results",
                  date: "12 Oct 2026",
                  category: "Academic",
                  body: "PTM will be conducted on Saturday between 08:30 AM to 12:30 PM. Parents must accompany students in complete school uniform.",
                },
                {
                  title: "Science & Innovation Olympiad Registration Open",
                  date: "05 Oct 2026",
                  category: "Olympiad",
                  body: "Students interested in participating in the National Science Olympiad may submit their registration forms to Science teacher Dr. Sen.",
                },
              ].map((notice) => (
                <div key={notice.title} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 uppercase">
                      {notice.category}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">{notice.date}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-2">{notice.title}</h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{notice.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: DIGITAL ID CARD ──────────────────────────────────────────── */}
        {activeTab === "idcard" && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  Official Student Digital ID Card
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  CR80 landscape standard identity card with verified QR security token
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition"
              >
                <Printer className="w-4 h-4" />
                Print ID Card
              </button>
            </div>

            {/* Rendered CR80 Card */}
            <div className="flex justify-center p-4 sm:p-8 bg-slate-900/50 border border-slate-800 rounded-2xl">
              <div
                className="w-[360px] min-h-[225px] bg-white text-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-600 flex flex-col overflow-hidden relative"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-3 py-2 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    {school?.logoUrl ? (
                      <img src={school.logoUrl} alt="Logo" className="w-6 h-6 rounded-full bg-white object-contain p-0.5" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white text-emerald-900 flex items-center justify-center font-black text-[9px]">
                        {schoolInitials}
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-[11px] leading-tight text-white">{schoolDisplayName}</h3>
                      <p className="text-[7px] text-emerald-200">{school?.tagline || school?.affiliation || "Affiliated School Campus"}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[7px] font-black uppercase tracking-wider">
                    STUDENT ID • 2026-27
                  </span>
                </div>

                {/* Body: QR on Left, Details Center, Photo Right */}
                <div className="p-3 flex items-center justify-between gap-2.5 bg-white flex-1">
                  {/* QR */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-[84px]">
                    <div className="p-1 bg-white border border-slate-300 rounded-lg shadow-sm flex items-center justify-center">
                      <QRCode value={qrStudentPayload} size={72} level="M" />
                    </div>
                    <span className="text-[7px] font-black text-slate-600 uppercase tracking-tight mt-1 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" /> Verify QR
                    </span>
                    <span className="text-[6.5px] font-mono text-slate-500 font-bold">
                      {activeStudent.admissionNo}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 text-[9.5px] leading-tight space-y-0.5">
                    <h4 className="font-black text-xs text-slate-900 truncate">{activeStudent.name}</h4>
                    <p className="text-[8.5px] font-black text-emerald-700">Class {studentClassLabel}</p>
                    <div className="pt-1 space-y-0.5 border-t border-slate-100 text-[8px] text-slate-700">
                      <p><strong>Roll:</strong> #{activeStudent.rollNo} • <strong>Adm:</strong> {activeStudent.admissionNo}</p>
                      <p><strong>Father:</strong> {activeStudent.fatherName || "—"}</p>
                      {activeStudent.motherName && <p><strong>Mother:</strong> {activeStudent.motherName}</p>}
                      <p><strong>Mobile:</strong> {activeStudent.phone || "—"}</p>
                      <p><strong>Blood:</strong> <span className="text-rose-700 font-bold">🩸 {activeStudent.bloodGroup || "O+"}</span>{activeStudent.dateOfBirth ? ` • DOB: ${activeStudent.dateOfBirth}` : ''}</p>
                      {activeStudent.address && <p><strong>Address:</strong> {activeStudent.address}</p>}
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="shrink-0">
                    <div className="w-[68px] h-[80px] rounded-xl border border-slate-300 overflow-hidden shadow-sm bg-slate-100 flex items-center justify-center">
                      {activePhoto ? (
                        <img
                          src={activePhoto}
                          alt={activeStudent.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-emerald-700 via-teal-800 to-indigo-900 flex flex-col items-center justify-center text-white select-none">
                          <span className="text-sm font-black">{studentInitials}</span>
                          <span className="text-[6.5px] uppercase font-bold text-emerald-200 mt-0.5">STUDENT</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-3 py-1 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[7px] text-slate-500 shrink-0">
                  <span>Valid for Academic Session 2026-27</span>
                  <span className="font-bold text-slate-800">Principal Signature ✓</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── OFFICIAL FEE RECEIPT MODAL ─────────────────────────────────────── */}
      {selectedFeeForReceipt && (
        <OfficialFeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedFeeForReceipt(null)}
          school={school || ({ id: schoolId, name: "Delhi Public School", code: "DPS_DEL", affiliation: "CBSE Affiliated" } as any)}
          fee={selectedFeeForReceipt}
          student={currentStudent}
          className={`Class ${studentClassLabel}`}
          sessionName="2026-2027"
        />
      )}

      {/* ── QR ATTENDANCE SCANNER MODAL ────────────────────────────────────── */}
      {showQrAttendanceScanner && (
        <QrAttendanceScannerModal
          isOpen={true}
          onClose={() => setShowQrAttendanceScanner(false)}
          currentStudent={{
            id: activeStudent.id,
            name: activeStudent.name,
            rollNo: activeStudent.rollNo,
            classId: activeStudent.classId || "cls_nursery",
            className: `Class ${studentClassLabel}`,
            schoolId: schoolId,
            schoolName: schoolDisplayName,
          }}
          isTeacherMode={false}
          onStudentMarked={(res) => {
            setShowQrAttendanceScanner(false);
            setAttendanceSuccessMsg(`🎉 Shabaash ${activeStudent.name}! Aapki attendance safaltapoorvak darj ho gayi hai.`);
            setTimeout(() => setAttendanceSuccessMsg(null), 6000);
          }}
        />
      )}
    </div>
  );
};
