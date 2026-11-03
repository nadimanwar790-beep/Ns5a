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
  ExternalLink,
  LogOut,
  MessageCircle,
  Home,
  Users,
  Megaphone,
  Image as ImageIcon,
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
  currentMonthStr,
  getLocalFees,
  getStudentFees,
  subscribeToStudentFees,
  getLocalExams,
  getExams,
  subscribeToExams,
  subscribeToStudent,
  updateStudentPhoto,
  getHomework,
  getNotices,
  getSchoolHolidays,
  subscribeToNotices,
  subscribeToSchoolHolidays,
  subscribeToSchoolCommunityPosts,
  getClasses,
  isDemoRecord,
  shouldUseDemoForSchool,
  type SchoolCommunityPost,
} from "../../school-firebase";
import { getSavedSchoolLogo, isAppLogo } from "./feeReceiptUtils";
import { getDemoSchoolDataset, isHolidayDate, isDemoDataEnabled, setDemoDataEnabled } from "./demoDataStore";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { QrAttendanceScannerModal } from "./QrAttendanceScannerModal";
import { SchoolCommunityFeed } from "./SchoolCommunityFeed";
import { downloadFeeDocument, shareFeeReceiptOnWhatsApp } from "./feeDocument";
import {
  getSchoolPushEnabledState,
  enableSchoolPushForUser,
  disableSchoolPushForUser,
  syncStudentFeeDueForPush,
  sendSchoolPushNotification,
} from "../../utils/schoolPushClient";
import type { School, SchoolStudent } from "../../school-types";

interface Props {
  uid?: string;
  schoolId?: string;
  studentId?: string;
  studentName?: string;
  classId?: string;
  sessionId?: string;
  linkedStudent?: any;
  allLinkedStudents?: any[];
  initialTab?: TabType;
  onAddAnotherStudentQr?: () => void;
  onOpenPlatformContent?: () => void;
  onBack?: () => void;
  onLogout?: () => void;
  // Backward compatibility props
  students?: any[];
  onAddStudent?: any;
  onSelectForFee?: any;
}

type TabType = "overview" | "attendance" | "fees" | "exams" | "homework" | "notices" | "community" | "idcard";

export const StudentSchoolPanel: React.FC<Props> = ({
  uid,
  schoolId = "dps_gurgaon_sector45",
  studentId,
  studentName,
  classId,
  sessionId,
  linkedStudent,
  allLinkedStudents,
  initialTab,
  onAddAnotherStudentQr,
  onOpenPlatformContent,
  onBack,
  onLogout,
}) => {
  const normalizeTab = (t?: string): TabType => {
    if (!t) return "overview";
    if (t === "notices" || t === "community") return "community";
    if (["overview", "attendance", "fees", "exams", "homework", "idcard"].includes(t)) {
      return t as TabType;
    }
    return "overview";
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => normalizeTab(initialTab));
  const [communityInitialFilter, setCommunityInitialFilter] = useState<"ALL" | "HOLIDAY" | "NOTICE" | "EVENT_MEDIA" | "HOMEWORK">("ALL");

  useEffect(() => {
    if (initialTab) {
      setActiveTab(normalizeTab(initialTab));
    }
  }, [initialTab]);

  const effectiveUid = useMemo(() => {
    if (uid) return uid;
    try {
      const raw = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (raw) {
        const p = JSON.parse(raw);
        if (p?.id || p?.uid) return String(p.id || p.uid);
      }
    } catch {}
    return studentId || "guest";
  }, [uid, studentId]);

  const [pushEnabled, setPushEnabled] = useState<boolean>(() => getSchoolPushEnabledState(effectiveUid));
  const [pushBusy, setPushBusy] = useState<boolean>(false);
  const [pushFeedback, setPushFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const handleStudentLogout = () => {
    try {
      localStorage.removeItem("nst_current_user");
      localStorage.removeItem("nsta_cached_user");
      localStorage.removeItem("nst_is_guest");
      localStorage.setItem("nst_logged_out", "true");
    } catch (e) {}
    if (onLogout) {
      onLogout();
    } else if (onBack) {
      onBack();
    } else {
      window.location.reload();
    }
  };
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
    const localClasses = getLocalClasses(schoolId);

    // Look up by studentId, admissionNo, linkedStudent, or sessionUser identity
    const matchId = studentId || linkedStudent?.id || sessionUser?.id || sessionUser?.studentId || sessionUser?.uid;
    const matchName = studentName || linkedStudent?.name || sessionUser?.name;
    const matchAdm = linkedStudent?.admissionNo || sessionUser?.admissionNo;
    const matchRoll = linkedStudent?.rollNo || sessionUser?.rollNo || sessionUser?.displayId?.replace("ROLL-", "");

    // Heal any student record whose className was previously polluted by rollNo (e.g. "01" instead of "Nursery")
    const healStudentRecord = (rec: any): SchoolStudent => {
      if (!rec) return rec;
      const healed = { ...rec };
      const rawClsName = typeof healed.className === "string" ? healed.className.trim() : "";
      const rawRoll = typeof healed.rollNo === "string" ? healed.rollNo.trim() : "";
      const isBogusRollClass =
        Boolean(rawClsName) &&
        ((rawRoll && rawClsName === rawRoll && /^0?\d+$/.test(rawClsName) && (healed.classId || "").toLowerCase().includes("nursery")) ||
          /^0\d+$/.test(rawClsName) ||
          /^class\s+0\d+$/i.test(rawClsName));

      if (isBogusRollClass) {
        const clsObj = localClasses.find((c) => c.id === healed.classId);
        const linkedCls =
          linkedStudent?.className &&
          !/^0\d+$/.test(String(linkedStudent.className).trim()) &&
          !/^class\s+0\d+$/i.test(String(linkedStudent.className).trim())
            ? linkedStudent.className
            : undefined;
        healed.className =
          clsObj?.name ||
          linkedCls ||
          ((healed.classId || "").toLowerCase().includes("nursery") ? "Nursery" : undefined);

        try {
          const targetSid = healed.schoolId || schoolId;
          const pool = getLocalStudents(targetSid);
          if (pool.some((p) => p.id === healed.id)) {
            setLocalStudents(
              targetSid,
              pool.map((p) => (p.id === healed.id ? { ...p, className: healed.className } : p))
            );
          }
        } catch {}
      }

      if (linkedStudent) {
        if (!healed.className && linkedStudent.className && !/^0\d+$/.test(String(linkedStudent.className).trim())) {
          healed.className = linkedStudent.className;
        }
        if (!healed.fatherName && linkedStudent.fatherName) healed.fatherName = linkedStudent.fatherName;
        if (!healed.motherName && linkedStudent.motherName) healed.motherName = linkedStudent.motherName;
        if (!healed.schoolName && linkedStudent.schoolName) healed.schoolName = linkedStudent.schoolName;
        if ((!healed.monthlyFee || healed.monthlyFee <= 0) && Number(linkedStudent.monthlyFee) > 0) {
          healed.monthlyFee = Number(linkedStudent.monthlyFee);
        }
      }
      return healed;
    };

    // 1. Match in current school's local student pool by unique ID or unique Admission No
    if (matchId) {
      const foundLocal = localStudents.find(
        (s) => s.id === matchId || (s.admissionNo && matchAdm && s.admissionNo.toLowerCase() === matchAdm.toLowerCase())
      );
      if (foundLocal) return healStudentRecord(foundLocal);
    }
    if (matchAdm) {
      const foundByAdm = localStudents.find(
        (s) => s.admissionNo && s.admissionNo.toLowerCase() === matchAdm.toLowerCase()
      );
      if (foundByAdm) return healStudentRecord(foundByAdm);
    }
    if (matchName) {
      const foundLocalByName = localStudents.find(
        (s) => s.name && s.name.trim().toLowerCase() === matchName.trim().toLowerCase()
      );
      if (foundLocalByName) return healStudentRecord(foundLocalByName);
    }

    // 2. If linkedStudent was passed directly from SchoolEcosystem QR/ID login, use it directly
    if (linkedStudent && (linkedStudent.id || linkedStudent.admissionNo || linkedStudent.name)) {
      return healStudentRecord(linkedStudent);
    }

    // 3. Check demo dataset ONLY when demo data is enabled for the default demo school
    const studentsList = (shouldUseDemoForSchool(schoolId) && Array.isArray(dataset?.students)) ? dataset.students : [];
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

    // 5. CRITICAL: If student is logged in or provided by name/props, construct their authentic record!
    if (matchName || matchAdm || matchId) {
      const isNadim = (matchName && matchName.toLowerCase().includes("nadim")) || (matchAdm && matchAdm.includes("6616"));
      const rawSessionCls = (sessionUser as any)?.className;
      const cleanSessionCls =
        rawSessionCls && !/^0\d+$/.test(String(rawSessionCls).trim()) && !/^class\s+0\d+$/i.test(String(rawSessionCls).trim())
          ? rawSessionCls
          : undefined;
      const safeStudent: SchoolStudent = {
        id: matchId || `std_${Date.now()}`,
        schoolId: sessionUser?.schoolId || schoolId,
        schoolName: sessionUser?.schoolName || (sessionUser as any)?.school || (isNadim ? "Life maker public school" : (sessionUser?.schoolName || "School")),
        sessionId: sessionId || "demo_session_2026_27",
        classId: (sessionUser as any)?.classId || classId || sessionUser?.classLevel || (isNadim ? "cls_nursery" : "cls_10"),
        className: cleanSessionCls || (isNadim ? "Nursery" : undefined),
        name: matchName || sessionUser?.name || "Student",
        rollNo: matchRoll || (matchId?.startsWith("ROLL-") ? matchId.replace("ROLL-", "") : "01"),
        admissionNo: matchAdm || sessionUser?.admissionNo || `ADM-${(matchId || "26").slice(-6).toUpperCase()}`,
        fatherName: sessionUser?.fatherName || "",
        motherName: sessionUser?.motherName || "",
        phone: sessionUser?.mobile || sessionUser?.phone || "",
        bloodGroup: sessionUser?.bloodGroup || undefined,
        dateOfBirth: (sessionUser as any)?.dateOfBirth || undefined,
        address: (sessionUser as any)?.address || undefined,
        monthlyFee: (typeof sessionUser?.monthlyFee === "number" && sessionUser.monthlyFee > 0)
          ? sessionUser.monthlyFee
          : 1000,
        photoUrl: sessionUser?.photoURL || sessionUser?.photoUrl || "",
        active: true,
        createdAt: new Date().toISOString(),
      };

      try {
        const cur = getLocalStudents(safeStudent.schoolId);
        if (!cur.some(s => s.id === safeStudent.id || (s.admissionNo && s.admissionNo === safeStudent.admissionNo))) {
          setLocalStudents(safeStudent.schoolId, [safeStudent, ...cur]);
        }
      } catch {}

      return safeStudent;
    }

    // Fallback demo student only when completely unauthenticated/guest
    const fallbackPool = Array.isArray(dataset?.students) ? dataset.students : [];
    const class10Student = fallbackPool.find(
      (s) =>
        s.classId === "demo_class_c10_sec_a" ||
        (s.classId?.includes("c10") && (!s.section || s.section === "A")) ||
        (s.classId === "cls_10" && s.section === "A")
    );
    return (
      class10Student ||
      fallbackPool[0] || {
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
  }, [studentId, studentName, classId, sessionId, schoolId, linkedStudent, dataset]);

  // Synchronize background details from remote Firestore or Admissions
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [liveStudentData, setLiveStudentData] = useState<Partial<SchoolStudent> | null>(null);

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

  // ── REAL-TIME LIVE SYNC WITH SCHOOL ADMIN DATABASE ──────────────────────────
  useEffect(() => {
    if (!schoolId || !currentStudent?.id) return;
    const unsub = subscribeToStudent(schoolId, currentStudent.id, (freshStudent) => {
      if (freshStudent) {
        setLiveStudentData((prev: any) => ({
          ...prev,
          ...freshStudent,
          // Preserve authentic monthlyFee when admin updates it in School Admin ERP
          monthlyFee:
            typeof freshStudent.monthlyFee === "number" && freshStudent.monthlyFee > 0
              ? freshStudent.monthlyFee
              : (prev?.monthlyFee ?? currentStudent.monthlyFee),
        }));
      }
    });
    return () => unsub();
  }, [schoolId, currentStudent?.id, currentStudent?.monthlyFee]);

  const activeStudent: SchoolStudent = useMemo(() => {
    return {
      ...currentStudent,
      ...(enrichedData || {}),
      ...(liveStudentData || {})
    };
  }, [currentStudent, enrichedData, liveStudentData]);

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
      const finalUrl = await updateStudentPhoto(schoolId, activeStudent.id, dataUrl);
      const resolvedUrl = finalUrl || dataUrl;
      setStudentPhoto(resolvedUrl);
      activeStudent.photoUrl = resolvedUrl;
      const cur = getLocalStudents(schoolId);
      setLocalStudents(
        schoolId,
        cur.map((s) => (s.id === activeStudent.id || s.admissionNo === activeStudent.admissionNo ? { ...s, photoUrl: resolvedUrl } : s))
      );
      if (resolvedUrl && !resolvedUrl.startsWith("data:image/")) {
        try {
          const u = localStorage.getItem("nst_current_user");
          if (u) {
            const parsed = JSON.parse(u);
            parsed.photoURL = resolvedUrl;
            localStorage.setItem("nst_current_user", JSON.stringify(parsed));
          }
        } catch {}
      }
    };
    reader.readAsDataURL(file);
  };

  const [classesList, setClassesList] = useState<any[]>(() => schoolId ? getLocalClasses(schoolId) : []);
  const [demoEnabled, setDemoEnabled] = useState<boolean>(() => isDemoDataEnabled());
  const schoolDemoActive = demoEnabled && shouldUseDemoForSchool(schoolId);

  useEffect(() => {
    const handleDemoChange = (e: any) => {
      if (typeof e?.detail?.enabled === "boolean") {
        setDemoEnabled(e.detail.enabled);
      }
    };
    window.addEventListener("nst_demo_toggle_changed", handleDemoChange);
    return () => window.removeEventListener("nst_demo_toggle_changed", handleDemoChange);
  }, []);

  const handleToggleDemo = (newVal: boolean) => {
    setDemoDataEnabled(newVal);
    setDemoEnabled(newVal);
  };

  useEffect(() => {
    if (!schoolId) return;
    getClasses(schoolId).then((cls) => {
      if (cls && cls.length > 0) setClassesList(cls);
    }).catch(() => {});
  }, [schoolId]);

  const studentClassLabel = useMemo(() => {
    const isBogusZeroRoll = (val?: string) => {
      if (!val || typeof val !== "string") return true;
      const t = val.trim();
      if (!t || t.startsWith("cls_")) return true;
      if (/^0\d+$/.test(t) || /^class\s+0\d+$/i.test(t)) return true;
      return false;
    };

    // 1. Check available School Admin classes first by exact classId so Admin renames/assignments win
    const localSchoolClasses = schoolId ? getLocalClasses(schoolId) : [];
    const schoolClasses = school?.classes || [];
    const datasetClasses = (schoolDemoActive && Array.isArray(dataset?.classes)) ? dataset.classes : [];
    const allClasses = [...classesList, ...localSchoolClasses, ...schoolClasses, ...datasetClasses];

    const targetClassId = activeStudent?.classId || (activeStudent as any)?.classLevel || linkedStudent?.classId;
    if (targetClassId) {
      const foundCls = allClasses.find(
        (c) => c.id === targetClassId || c.name?.toLowerCase() === String(targetClassId).toLowerCase()
      );
      if (foundCls?.name) {
        return foundCls.name.trim();
      }
    }

    // 2. Direct human-readable class name if present on student or linkedStudent
    const directName =
      (activeStudent as any)?.className ||
      linkedStudent?.className ||
      (activeStudent as any)?.classGrade ||
      (currentStudent as any)?.className;

    if (directName && typeof directName === "string" && !isBogusZeroRoll(directName) && directName.length < 24) {
      return directName.trim();
    }

    // 3. Check if targetClassId encodes Nursery / LKG / UKG / standard class
    if (targetClassId && typeof targetClassId === "string") {
      const lowerId = targetClassId.toLowerCase();
      if (lowerId.includes("pre_nursery") || lowerId.includes("prenursery")) return "Pre-Nursery";
      if (lowerId.includes("nursery")) return "Nursery";
      if (lowerId.includes("lkg")) return "LKG";
      if (lowerId.includes("ukg")) return "UKG";

      const isCrypticId = targetClassId.length >= 14 && /[A-Z]/.test(targetClassId) && /[0-9]/.test(targetClassId);
      if (!isCrypticId) {
        const clean = targetClassId
          .replace(/^cls_/i, "")
          .replace(/_/g, " ")
          .trim();
        if (clean && clean.toLowerCase() !== "demo class c10 sec a") {
          return clean.charAt(0).toUpperCase() + clean.slice(1);
        }
      }
    }

    // 4. Check session user in localStorage if valid
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed?.className && !isBogusZeroRoll(parsed.className)) {
          return parsed.className.trim();
        }
      }
    } catch {}

    return "Nursery";
  }, [activeStudent, linkedStudent, dataset, school, schoolId, classesList, demoEnabled, currentStudent]);

  // Format label so it never displays duplicate "Class Class 9" or "Class Nursery"
  const formatClassLabel = (label?: string): string => {
    if (!label) return "Nursery";
    const clean = label.trim();
    if (/^Class\s+/i.test(clean)) return clean;
    if (/^(Nursery|Pre-?Nursery|LKG|UKG|KG|Play|Prep)/i.test(clean)) return clean;
    return `Class ${clean}`;
  };


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

  const [realHolidays, setRealHolidays] = useState<any[]>([]);
  const [realNotices, setRealNotices] = useState<any[]>([]);
  const [realHomework, setRealHomework] = useState<any[]>([]);
  const [liveCommunityPosts, setLiveCommunityPosts] = useState<SchoolCommunityPost[]>([]);

  useEffect(() => {
    if (!schoolId) return;
    let mounted = true;
    const loadHomework = () => {
      getHomework(schoolId, activeStudent?.classId)
        .then((hws) => {
          if (mounted) setRealHomework(Array.isArray(hws) ? hws : []);
        })
        .catch(() => {});
    };

    getSchoolHolidays(schoolId)
      .then((hols) => {
        if (mounted && Array.isArray(hols) && hols.length > 0) setRealHolidays(hols);
      })
      .catch(() => {});
    getNotices(schoolId)
      .then((nts) => {
        if (mounted && Array.isArray(nts) && nts.length > 0) setRealNotices(nts);
      })
      .catch(() => {});
    loadHomework();

    const unsubNotices = subscribeToNotices(schoolId, (nts) => {
      if (mounted) setRealNotices(Array.isArray(nts) ? nts : []);
    });
    const unsubHolidays = subscribeToSchoolHolidays(schoolId, (hols) => {
      if (mounted) setRealHolidays(Array.isArray(hols) ? hols : []);
    });
    const unsubCommunity = subscribeToSchoolCommunityPosts(schoolId, (posts) => {
      if (mounted) setLiveCommunityPosts(Array.isArray(posts) ? posts : []);
    });

    window.addEventListener("homework-updated", loadHomework);
    return () => {
      mounted = false;
      unsubNotices();
      unsubHolidays();
      unsubCommunity();
      window.removeEventListener("homework-updated", loadHomework);
    };
  }, [schoolId, activeStudent?.classId, demoEnabled]);

  // Check if today is Sunday or holiday
  const todayHolidayInfo = useMemo(() => {
    const today = todayStr();
    const d = new Date();
    const isSunday = d.getDay() === 0;
    if (isSunday) return { isHoliday: true, name: "Sunday (रविवार - साप्ताहिक अवकाश)" };
    const matchedSchoolHoliday = realHolidays.find(
      (h: any) => h.startDate && today >= h.startDate && today <= (h.endDate || h.startDate)
    );
    if (matchedSchoolHoliday) {
      return { isHoliday: true, name: matchedSchoolHoliday.name || "School Holiday (अवकाश)" };
    }
    if (schoolDemoActive && isHolidayDate(today)) return { isHoliday: true, name: "Festival / Institutional Holiday (अवकाश)" };
    return { isHoliday: false, name: "" };
  }, [realHolidays, schoolDemoActive]);

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

  // Load real fees with Live Realtime Subscription
  useEffect(() => {
    if (!schoolId || !currentStudent.id) return;

    // Immediate local cache read
    try {
      const local = getLocalFees(schoolId).filter((f: any) => f.studentId === currentStudent.id);
      if (local && local.length > 0) {
        setLiveFees(local);
      }
    } catch {}

    const unsub = subscribeToStudentFees(schoolId, currentStudent.id, (freshFees) => {
      if (freshFees) {
        setLiveFees((prev) => {
          const map = new Map();
          prev.forEach((f) => {
            const k = f.feeType === "admission" || f.receiptCategory === "admission"
              ? `adm_${f.studentId}`
              : `${f.studentId}_${f.month || f.id}`;
            map.set(k, f);
          });
          freshFees.forEach((f) => {
            const k = f.feeType === "admission" || f.receiptCategory === "admission"
              ? `adm_${f.studentId}`
              : `${f.studentId}_${f.month || f.id}`;
            map.set(k, f);
          });
          return Array.from(map.values());
        });
      }
    });

    // Also fetch any remote fees from Firestore
    getStudentFees(schoolId, currentStudent.id)
      .then((remote) => {
        if (remote && remote.length > 0) {
          setLiveFees((prev) => {
            const map = new Map();
            prev.forEach((f) => {
              const k = f.feeType === "admission" || f.receiptCategory === "admission"
                ? `adm_${f.studentId}`
                : `${f.studentId}_${f.month || f.id}`;
              map.set(k, f);
            });
            remote.forEach((f) => {
              const k = f.feeType === "admission" || f.receiptCategory === "admission"
                ? `adm_${f.studentId}`
                : `${f.studentId}_${f.month || f.id}`;
              map.set(k, f);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});

    return () => unsub();
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
    return 1800;
  }, [activeStudent, dataset, school, schoolId, studentClassLabel]);

  const tuitionFee = Math.round(studentMonthlyFee * 0.7);
  const computerFee = Math.round(studentMonthlyFee * 0.15);
  const sportsFee = Math.max(0, studentMonthlyFee - tuitionFee - computerFee);

  // Student fees list: complete academic session passbook merged with real live payments (100% synced with School Admin)
  const allStudentFees = useMemo(() => {
    const sessionMonths = [
      { code: "2026-04", name: "April 2026" },
      { code: "2026-05", name: "May 2026" },
      { code: "2026-06", name: "June 2026" },
      { code: "2026-07", name: "July 2026" },
      { code: "2026-08", name: "August 2026" },
      { code: "2026-09", name: "September 2026" },
      { code: "2026-10", name: "October 2026" },
      { code: "2026-11", name: "November 2026" },
      { code: "2026-12", name: "December 2026" },
      { code: "2027-01", name: "January 2027" },
      { code: "2027-02", name: "February 2027" },
      { code: "2027-03", name: "March 2027" },
    ];

    const activeMonth = currentMonthStr();
    const filteredLiveFees = !schoolDemoActive ? liveFees.filter((f: any) => !isDemoRecord(f)) : liveFees;

    // Detect parent receipt numbers that already distributed lump-sum payments into FIFO-* child months
    const fifoParentReceipts = new Set<string>();
    filteredLiveFees.forEach((f: any) => {
      if (typeof f?.receiptNo === "string" && f.receiptNo.startsWith("FIFO-")) {
        const m = f.receiptNo.match(/^FIFO-\d{4}-\d{2}-(.+)$/);
        if (m?.[1]) fifoParentReceipts.add(m[1]);
      }
    });

    const liveMonthMap = new Map<string, any>();
    const extraFees: any[] = [];

    filteredLiveFees.forEach((rawFee: any) => {
      let f = rawFee;
      if (
        f.receiptNo &&
        !String(f.receiptNo).startsWith("FIFO-") &&
        fifoParentReceipts.has(String(f.receiptNo))
      ) {
        const billed = Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);
        const rawPaid = Number(f.paidAmount ?? 0);
        const balDue = Number(f.balanceDue ?? (f.paid ? 0 : billed));
        if (!f.paid && rawPaid > billed) {
          const normalizedPaid = Math.max(0, billed - balDue);
          f = {
            ...f,
            lastReceiptPaidAmount: f.lastReceiptPaidAmount ?? rawPaid,
            paidAmount: normalizedPaid,
            balanceDue: balDue,
            status: normalizedPaid > 0 ? "partial" : "due",
          };
        }
      }

      if (f.feeType === "admission" || f.receiptCategory === "admission") {
        extraFees.push(f);
      } else if (f.month) {
        liveMonthMap.set(f.month, f);
      } else {
        extraFees.push(f);
      }
    });

    if (filteredLiveFees.length === 0 && schoolDemoActive && currentStudent.id?.startsWith("demo_std_")) {
      const rawFees = Array.isArray(dataset?.fees) ? dataset.fees : [];
      const filtered = rawFees.filter((f: any) => f?.studentId === currentStudent.id);
      if (filtered.length > 0) return filtered;
    }

    const sessionList = sessionMonths.map((m, idx) => {
      const recorded = liveMonthMap.get(m.code);
      if (recorded) {
        return recorded;
      }

      const isUpcoming = m.code > activeMonth;
      if (isUpcoming) {
        return {
          id: `fee_${m.code}_${currentStudent.id}`,
          schoolId,
          sessionId: currentStudent.sessionId || "demo_session_2026_27",
          studentId: currentStudent.id,
          studentName: currentStudent.name,
          rollNo: currentStudent.rollNo,
          classId: currentStudent.classId,
          month: m.code,
          amount: studentMonthlyFee,
          monthlyAmount: studentMonthlyFee,
          paid: false,
          paidAmount: 0,
          balanceDue: 0,
          isUpcoming: true,
          status: "upcoming",
          receiptNo: "—",
          paidDate: undefined,
          paymentMode: "Upcoming",
        };
      }

      const isPastMonth = idx <= 5;
      const defaultStatus = schoolDemoActive && isPastMonth ? "paid" : "due";
      const isPaid = defaultStatus === "paid";

      return {
        id: `fee_${m.code}_${currentStudent.id}`,
        schoolId,
        sessionId: currentStudent.sessionId || "demo_session_2026_27",
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        rollNo: currentStudent.rollNo,
        classId: currentStudent.classId,
        month: m.code,
        amount: studentMonthlyFee,
        monthlyAmount: studentMonthlyFee,
        paid: isPaid,
        paidAmount: isPaid ? studentMonthlyFee : 0,
        balanceDue: isPaid ? 0 : studentMonthlyFee,
        status: defaultStatus,
        receiptNo: isPaid ? `DPS-26-${String(idx + 1).padStart(4, "0")}` : "—",
        paidDate: isPaid ? `${m.code}-05` : undefined,
        paymentMode: isPaid ? "UPI / Counter" : "Pending",
      };
    });

    return [...extraFees, ...sessionList];
  }, [liveFees, currentStudent, dataset, studentMonthlyFee, schoolId, schoolDemoActive]);

  const feeSummary = useMemo(() => {
    let totalBilled = 0;
    let totalDeposited = 0;
    let totalRemaining = 0;

    allStudentFees.forEach((f: any) => {
      const isUpcoming = Boolean(f.isUpcoming || f.status === "upcoming");
      const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
      const billed = Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);
      const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));
      const remaining = isUpcoming
        ? 0
        : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

      totalBilled += billed;
      totalDeposited += paid;
      totalRemaining += remaining;
    });

    return { totalBilled, totalDeposited, totalRemaining };
  }, [allStudentFees, studentMonthlyFee]);

  const pendingDues = feeSummary.totalRemaining;

  const [downloadingFeeId, setDownloadingFeeId] = useState<string | null>(null);

  const formatPaymentDateTime = (dateStr?: string) => {
    if (!dateStr) return { date: "—", time: "" };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: dateStr, time: "" };
      const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const hasTime = dateStr.includes("T") || dateStr.includes(":");
      const time = hasTime
        ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
        : "";
      return { date, time };
    } catch {
      return { date: dateStr, time: "" };
    }
  };

  const handleDownloadStudentPdf = async (f: any) => {
    setDownloadingFeeId(f.id || f.month || "active");
    try {
      await downloadFeeDocument({
        fee: f,
        student: activeStudent,
        schoolName: school?.name || schoolDisplayName || "School",
        className: formatClassLabel(studentClassLabel),
        schoolDetails: {
          schoolName: school?.name || schoolDisplayName || "School",
          address: school?.address || "",
          phone: school?.mobile || school?.phone || "",
          email: school?.email || "",
          affiliation: school?.affiliation || "",
          code: school?.code || "",
          logoUrl: getSavedSchoolLogo(school?.logoUrl, schoolId),
          principalSignatureUrl: school?.principalSignatureUrl || "",
          directorSignatureUrl: school?.directorSignatureUrl || "",
          principalName: school?.principalName || "",
        },
      });
    } catch (err) {
      console.error("Error downloading student PDF:", err);
    } finally {
      setDownloadingFeeId(null);
    }
  };

  const handleShareStudentWhatsApp = async (f: any) => {
    const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
    try {
      await shareFeeReceiptOnWhatsApp({
        fee: f,
        student: activeStudent,
        schoolName: school?.name || schoolDisplayName || "School",
        className: formatClassLabel(studentClassLabel),
        schoolDetails: {
          schoolName: school?.name || "School",
          address: school?.address || "",
          phone: school?.mobile || school?.phone || "",
          email: school?.email || "",
          affiliation: school?.affiliation || "",
          code: school?.code || "",
          logoUrl: getSavedSchoolLogo(school?.logoUrl, schoolId),
          principalSignatureUrl: school?.principalSignatureUrl || "",
          directorSignatureUrl: school?.directorSignatureUrl || "",
          principalName: school?.principalName || "",
        },
        isDueDemand: !isPaid,
      });
    } catch (err) {
      console.error("Error sharing fee on WhatsApp:", err);
    }
  };

  // Load real exams with Live Realtime Subscription
  useEffect(() => {
    if (!schoolId) return;
    const targetClass = currentStudent.classId || "cls_10";
    const unsub = subscribeToExams(schoolId, targetClass, (exams) => {
      if (exams) {
        setLiveExams((prev) => {
          const map = new Map();
          [...prev, ...exams].forEach((e) => map.set(e.id, e));
          return Array.from(map.values());
        });
      }
    });

    getExams(schoolId, targetClass)
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

    return () => unsub();
  }, [schoolId, currentStudent.classId]);

  // Check student marks across exams (strictly respects Demo OFF / Real Only mode and per-school isolation)
  const studentExams = useMemo(() => {
    const cleanLive = !schoolDemoActive ? liveExams.filter((e: any) => !isDemoRecord(e)) : liveExams;
    const combined = [...cleanLive];
    if (schoolDemoActive && currentStudent.id?.startsWith("demo_std_") && Array.isArray(dataset?.exams)) {
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
  }, [liveExams, dataset, currentStudent?.id, schoolDemoActive]);

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

  // Homework list synced with School Admin (falls back to sample items ONLY when Demo Mode is ON)
  const homeworkList = useMemo(() => {
    if (realHomework.length > 0) {
      return realHomework.map((hw: any) => ({
        id: hw.id,
        subject: hw.subjectName || hw.subject || "Class Work",
        title: hw.title || "Class Assignment",
        assignedBy: hw.teacherName || hw.assignedBy || "Class Teacher",
        dueDate: hw.dueDate ? `Due: ${hw.dueDate}` : "Assigned",
        status: "pending",
        description: hw.description || "",
      }));
    }
    if (!schoolDemoActive) return [];
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
    ];
  }, [realHomework, schoolDemoActive]);

  const noticesList = useMemo(() => {
    if (realNotices.length > 0) {
      return realNotices.map((n: any) => ({
        id: n.id,
        title: n.title || "School Notice",
        date: n.date || (n.createdAt ? new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""),
        category: n.category || n.type || "Official",
        body: n.content || n.body || n.message || "",
      }));
    }
    if (!schoolDemoActive) return [];
    return [
      {
        id: "demo-n1",
        title: "Annual Sports Meet & Athletic Championship 2026",
        date: "18 Oct 2026",
        category: "Sports",
        body: "Inter-house athletic meet will be organized in November. House Captains and sports teachers will conduct selection trials next week.",
      },
      {
        id: "demo-n2",
        title: "Parent-Teacher Meeting (PTM) for Half-Yearly Results",
        date: "12 Oct 2026",
        category: "Academic",
        body: "PTM will be conducted on Saturday between 08:30 AM to 12:30 PM. Parents must accompany students in complete school uniform.",
      },
    ];
  }, [realNotices, schoolDemoActive]);

  const holidaysList = useMemo(() => {
    if (realHolidays.length > 0) {
      return realHolidays.map((h: any) => ({
        id: h.id || h.name,
        name: h.name,
        date: h.endDate && h.endDate !== h.startDate ? `${h.startDate} to ${h.endDate}` : h.startDate,
        type: h.type || "holiday",
        days: h.description || (h.type ? String(h.type).toUpperCase() : "School Holiday"),
      }));
    }
    if (!schoolDemoActive) return [];
    return [
      { id: "h1", name: "Diwali (दीपावली)", date: "31 Oct 2026", type: "festival", days: "Vacation 29 Oct - 04 Nov" },
      { id: "h2", name: "Chhath Puja (छठ पूजा)", date: "06 Nov - 08 Nov 2026", type: "festival", days: "3 Days Holiday" },
      { id: "h3", name: "Guru Nanak Jayanti", date: "24 Nov 2026", type: "national", days: "1 Day Holiday" },
      { id: "h4", name: "Christmas & Winter Break", date: "25 Dec 2026 - 05 Jan 2027", type: "vacation", days: "Winter Vacation" },
      { id: "h5", name: "Republic Day (गणतंत्र दिवस)", date: "26 Jan 2027", type: "national", days: "Celebration at Campus" },
      { id: "h6", name: "Holi (होली)", date: "22 Mar - 24 Mar 2027", type: "festival", days: "3 Days Holiday" },
    ];
  }, [realHolidays, schoolDemoActive]);

  const [homeworkStatusMap, setHomeworkStatusMap] = useState<Record<string, string>>({});

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

  const schoolDisplayName = useMemo(() => {
    // 1. Loaded school profile for THIS schoolId takes highest priority for multi-school accuracy
    if (school?.name && school.name.trim() && school.name.trim().toLowerCase() !== "delhi public school" && school.name.trim() !== "School") {
      return school.name.trim();
    }

    // 2. Explicit student record schoolName
    const studentRecordSchoolName =
      (activeStudent as any)?.schoolName ||
      linkedStudent?.schoolName ||
      (currentStudent as any)?.schoolName ||
      enrichedData?.schoolName;

    if (studentRecordSchoolName && studentRecordSchoolName.trim() && studentRecordSchoolName.trim().toLowerCase() !== "delhi public school") {
      return studentRecordSchoolName.trim();
    }

    // 3. Logged-in session user schoolName ONLY if it matches this schoolId
    try {
      const rawUser = localStorage.getItem("nst_current_user") || localStorage.getItem("nsta_cached_user");
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (
          (!parsed?.schoolId || parsed.schoolId === schoolId) &&
          parsed?.schoolName &&
          typeof parsed.schoolName === "string" &&
          parsed.schoolName.trim() &&
          parsed.schoolName.trim().toLowerCase() !== "delhi public school"
        ) {
          return parsed.schoolName.trim();
        }
      }
    } catch {}

    // 4. Fallback to school?.name or student's school or Nstz
    return (school?.name && school.name.trim()) || (studentRecordSchoolName && studentRecordSchoolName.trim()) || "Nstz";
  }, [school?.name, schoolId, activeStudent, linkedStudent, currentStudent, enrichedData]);

  const schoolInitials = (schoolDisplayName || "NS").slice(0, 2).toUpperCase();
  const resolvedSchoolLogo = getSavedSchoolLogo(school?.logoUrl || (activeStudent as any)?.schoolLogo, schoolId);

  // Sync active student's pending fee balance to the Web Push server so monthly auto-reminders always have exact ₹ due!
  useEffect(() => {
    if (!activeStudent?.id || !schoolId) return;
    void syncStudentFeeDueForPush({
      studentId: activeStudent.id,
      schoolId,
      schoolName: schoolDisplayName,
      studentName: activeStudent.name,
      classId: activeStudent.classId,
      className: formatClassLabel(studentClassLabel),
      rollNo: activeStudent.rollNo,
      pendingDues,
      monthlyFee: studentMonthlyFee,
    });
  }, [activeStudent?.id, activeStudent?.name, activeStudent?.classId, activeStudent?.rollNo, schoolId, schoolDisplayName, studentClassLabel, pendingDues, studentMonthlyFee]);

  const buildPushStudentList = () => {
    const baseList = Array.isArray(allLinkedStudents) && allLinkedStudents.length > 0
      ? allLinkedStudents
      : [activeStudent];
    return baseList.map((st: any) => ({
      id: st.id,
      schoolId: st.schoolId || schoolId,
      schoolName: st.id === activeStudent.id ? schoolDisplayName : (st.schoolName || schoolDisplayName),
      classId: st.classId || "cls_nursery",
      className: st.id === activeStudent.id ? formatClassLabel(studentClassLabel) : (st.className || ""),
      name: st.name || "Student",
      rollNo: st.rollNo || "01",
      admissionNo: st.admissionNo || "",
      pendingDues: st.id === activeStudent.id ? pendingDues : undefined,
      monthlyFee: st.id === activeStudent.id ? studentMonthlyFee : st.monthlyFee,
    }));
  };

  const handleTogglePushAlerts = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushFeedback(null);
    try {
      if (pushEnabled) {
        await disableSchoolPushForUser(effectiveUid);
        setPushEnabled(false);
        setPushFeedback({ type: "ok", text: "Push notifications band kar diye gaye hain." });
      } else {
        const res = await enableSchoolPushForUser({
          userId: effectiveUid,
          students: buildPushStudentList(),
          replaceStudents: true,
        });
        if (res.ok) {
          setPushEnabled(true);
          const count = Array.isArray(allLinkedStudents) && allLinkedStudents.length > 1 ? allLinkedStudents.length : 1;
          setPushFeedback({
            type: "ok",
            text: `🔔 Lock Screen Alerts ON! ${count > 1 ? `Sabhi ${count} students` : activeStudent.name} ka monthly fee due aur school notice ab app band hone par bhi aayega.`,
          });
        } else {
          setPushFeedback({ type: "err", text: res.error || "Notification allow nahi ho paya." });
        }
      }
    } finally {
      setPushBusy(false);
      setTimeout(() => setPushFeedback(null), 7000);
    }
  };

  const handleSendTestLockScreenPush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const dueStr = pendingDues > 0
        ? `कुल शेष देय शुल्क ₹${pendingDues.toLocaleString("en-IN")} है।`
        : "इस माह तक कोई शुल्क बकाया नहीं है (No Dues)।";
      const res = await sendSchoolPushNotification({
        userId: effectiveUid,
        studentIds: [activeStudent.id],
        schoolId,
        type: "MONTHLY_FEE",
        title: `🏫 ${schoolDisplayName} • शुल्क व नोटिस अलर्ट`,
        body: `${activeStudent.name} (${formatClassLabel(studentClassLabel)}, Roll #${activeStudent.rollNo}): ${dueStr}`,
        url: `/?schoolPortal=1&studentId=${encodeURIComponent(activeStudent.id)}&schoolTab=fees`,
        urgent: true,
      });
      if (res.delivered > 0) {
        setPushFeedback({
          type: "ok",
          text: "✅ Push bhej diya gaya! Phone lock karke ya notification tray kholkar dekhein.",
        });
      } else {
        setPushFeedback({
          type: "err",
          text: "Push deliver nahi hua — kripya ek baar Alerts OFF karke dobara ON karein.",
        });
      }
    } finally {
      setPushBusy(false);
      setTimeout(() => setPushFeedback(null), 6000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* ── TOP NAV HEADER ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {resolvedSchoolLogo && !isAppLogo(resolvedSchoolLogo) ? (
              <img
                src={resolvedSchoolLogo}
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
                {activeStudent.name} • {formatClassLabel(studentClassLabel)} • Roll #{activeStudent.rollNo}
              </p>
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {/* 1-Tap Monthly Fee & Notice Push Notification Toggle */}
          <button
            onClick={handleTogglePushAlerts}
            disabled={pushBusy}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              pushEnabled
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
                : "bg-indigo-600 hover:bg-indigo-500 border-indigo-400/50 text-white shadow-md shadow-indigo-600/25"
            }`}
            title="Monthly Fee Due aur School Notice ka Lock Screen Push Notification ON/OFF karein"
          >
            <Bell className={`w-3.5 h-3.5 ${pushEnabled ? "text-emerald-400" : "text-amber-300 animate-bounce"}`} />
            <span>{pushBusy ? "..." : pushEnabled ? "Alerts ON" : "Enable Alerts"}</span>
          </button>

          {/* Demo Data Mode Toggle Button */}
          <button
            onClick={() => handleToggleDemo(!demoEnabled)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
              demoEnabled
                ? "bg-amber-500/20 border-amber-500/50 text-amber-300 hover:bg-amber-500/30"
                : "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/30"
            }`}
            title="Turn Demo Data ON/OFF"
          >
            <span className={`w-2 h-2 rounded-full ${demoEnabled ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span className="hidden sm:inline">Demo:</span>
            <span>{demoEnabled ? "ON" : "OFF (Real Only)"}</span>
          </button>

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
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 transition cursor-pointer"
            title="View Digital ID Card (QR Code)"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Logout button directly following QR code */}
          <button
            onClick={handleStudentLogout}
            className="px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition flex items-center gap-1.5 text-xs font-bold active:scale-95 cursor-pointer shadow-sm shadow-rose-950/40"
            title="Logout (लॉगआउट — आपके जुड़े हुए Student ID सुरक्षित रहेंगे)"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ── STUDENT IDENTITY HERO BANNER (SHOWN ON HOME OVERVIEW) ───────────── */}
      {activeTab === "overview" ? (
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 flex-1 min-w-0">
              <div className="relative group shrink-0">
                {activePhoto ? (
                  <img
                    src={activePhoto}
                    alt={activeStudent.name}
                    className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl object-cover border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-white select-none">
                    <span className="text-base sm:text-lg font-bold tracking-wider">{studentInitials}</span>
                    <span className="text-[8px] font-semibold text-emerald-400">Student</span>
                  </div>
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-white transition cursor-pointer"
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
                  <h2 className="text-base sm:text-lg font-bold text-white truncate">{activeStudent.name}</h2>
                  <span className="text-xs text-slate-400">
                    · Roll #{activeStudent.rollNo} · {formatClassLabel(studentClassLabel)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admission: <span className="font-mono text-slate-200">{activeStudent.admissionNo}</span>
                  {activeStudent.bloodGroup ? ` · Blood: ${activeStudent.bloodGroup}` : ""}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500">Father:</span>
                    <span className="font-semibold text-white truncate">{activeStudent.fatherName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-500">Mother:</span>
                    <span className="font-semibold text-white truncate">{activeStudent.motherName || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">Mobile:</span>
                    <span className="font-semibold text-emerald-400 tabular-nums">{activeStudent.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Stat Summary */}
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-center min-w-[88px] cursor-pointer transition"
              >
                <span className="text-[11px] text-slate-400 block">Attendance</span>
                <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                  {attendanceStats.percentage}%
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("fees")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-center min-w-[88px] cursor-pointer transition"
              >
                <span className="text-[11px] text-slate-400 block">Fee Dues</span>
                <span className={`text-sm sm:text-base font-bold tabular-nums ${pendingDues === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {pendingDues === 0 ? "Cleared" : `₹${pendingDues.toLocaleString("en-IN")}`}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("exams")}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-center min-w-[88px] cursor-pointer transition"
              >
                <span className="text-[11px] text-slate-400 block">Result</span>
                <span className="text-sm sm:text-base font-bold text-indigo-400 tabular-nums">
                  {latestExamSummary.hasMarks ? `${latestExamSummary.percentage}%` : "Active"}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Focused Sub-Page Header Bar when inside a specific section */
        <div className="sticky top-[53px] z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-400 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Student Home</span>
            </button>
            <div className="text-xs text-slate-400 truncate">
              <strong className="text-white">{activeStudent.name}</strong> · {formatClassLabel(studentClassLabel)}
            </div>
          </div>
        </div>
      )}

      {/* ── ATTENDANCE / PUSH FEEDBACK TOAST ────────────────────────────────── */}
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

      {pushFeedback && (
        <div
          className={`mx-4 mt-3 max-w-6xl mx-auto p-3 rounded-xl text-xs font-bold flex items-center justify-between animate-in fade-in border ${
            pushFeedback.type === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
              : "bg-rose-500/20 border-rose-500/40 text-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 shrink-0" />
            <span>{pushFeedback.text}</span>
          </div>
          <button onClick={() => setPushFeedback(null)} className="hover:text-white font-bold ml-2 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* ── 1-TAP LOCK SCREEN MONTHLY FEE & NOTICE PUSH BANNER (HOME ONLY) ── */}
      {activeTab === "overview" && (
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-4">
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${pushEnabled ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-400" : "bg-indigo-500/15 border-indigo-500/35 text-indigo-300"}`}>
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  Monthly Fee &amp; Community Push Alerts ·{" "}
                  <span className={pushEnabled ? "text-emerald-400" : "text-amber-400"}>
                    {pushEnabled ? "ON (Lock Screen Active)" : "OFF"}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {pushEnabled
                    ? `हर माह देय फीस (वर्तमान: ₹${pendingDues.toLocaleString("en-IN")}), छुट्टी और कम्युनिटी पोस्ट फ़ोन लॉक होने पर भी अपने आप दिखेंगे।`
                    : "1 टैप में चालू करें — मासिक फीस, छुट्टी व स्कूल कम्युनिटी अपडेट Lock Screen पर पाएं।"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
              {pushEnabled ? (
                <button
                  onClick={handleSendTestLockScreenPush}
                  disabled={pushBusy}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition cursor-pointer"
                >
                  Test Lock Screen Push
                </button>
              ) : (
                <button
                  onClick={handleTogglePushAlerts}
                  disabled={pushBusy}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{pushBusy ? "Activating..." : "1-Tap Enable Alerts"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN TAB CONTENT CONTAINER ─────────────────────────────────────── */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 pb-28 space-y-6">
        {/* TAB 1: CLEAN APP LAUNCHPAD HOME ──────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Today's Attendance & Quick QR Action */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    Today's Attendance:{" "}
                    {todayEntry ? (
                      <span className="text-emerald-400">
                        {todayEntry.status === "late" ? "Late Entry" : "Present"}
                      </span>
                    ) : todayHolidayInfo.isHoliday ? (
                      <span className="text-amber-400">Holiday ({todayHolidayInfo.name})</span>
                    ) : (
                      <span className="text-rose-400">Not Marked Yet</span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {todayEntry
                      ? `Marked at ${todayEntry.inTime || "08:15 AM"} · Overall Attendance ${attendanceStats.percentage}%`
                      : todayHolidayInfo.isHoliday
                      ? "आज विद्यालय में अवकाश है।"
                      : "क्लास QR स्कैन करके आज की उपस्थिति दर्ज करें।"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQrAttendanceScanner(true)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Attendance QR</span>
              </button>
            </div>

            {/* Clean Multi-Section Feature Button Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Student Portal Sections</h3>
                <span className="text-xs text-slate-400">किसी भी सेक्शन को खोलने के लिए टैप करें</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCommunityInitialFilter("ALL");
                    setActiveTab("community");
                  }}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">School Community</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      फ़ोटो, वीडियो, छुट्टी व नोटिस ({liveCommunityPosts.length + noticesList.length})
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("fees")}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Fees &amp; Receipts</p>
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      {pendingDues === 0 ? "कोई बकाया नहीं" : `देय बकाया: ₹${pendingDues.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attendance")}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">My Attendance</p>
                    <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                      Present: {attendanceStats.percentage}% ({attendanceStats.present} दिन)
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("exams")}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Marks &amp; Result</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {latestExamSummary.hasMarks ? `Grade ${latestExamSummary.grade} (${latestExamSummary.percentage}%)` : "Report Card देखें"}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("homework")}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Homework Diary</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {homeworkList.filter((h) => homeworkStatusMap[h.id] !== "completed").length} कार्य बाकी
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("idcard")}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-teal-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Digital ID Card</p>
                    <p className="text-xs text-slate-400 mt-0.5">QR Identity &amp; Print</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCommunityInitialFilter("HOLIDAY");
                    setActiveTab("community");
                  }}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Holidays (छुट्टियाँ)</p>
                    <p className="text-xs text-slate-400 mt-0.5">{holidaysList.length} अवकाश सूची</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (onAddAnotherStudentQr) onAddAnotherStudentQr();
                    else setActiveTab("idcard");
                  }}
                  className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">+ Add Student QR</p>
                    <p className="text-xs text-slate-400 mt-0.5">दूसरे बच्चे या स्कूल का QR जोड़ें</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Latest Community / Holiday Highlight Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white">Latest School Community Update</h3>
                <button
                  type="button"
                  onClick={() => {
                    setCommunityInitialFilter("ALL");
                    setActiveTab("community");
                  }}
                  className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Community Feed</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {liveCommunityPosts.length > 0 ? (
                <div
                  onClick={() => {
                    setCommunityInitialFilter("ALL");
                    setActiveTab("community");
                  }}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">
                      {liveCommunityPosts[0].title || "School Update"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{liveCommunityPosts[0].text}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ) : noticesList.length > 0 ? (
                <div
                  onClick={() => {
                    setCommunityInitialFilter("ALL");
                    setActiveTab("community");
                  }}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-white truncate">{noticesList[0].title}</p>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{noticesList[0].body}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  स्कूल कम्युनिटी में आने वाली सभी नई फ़ोटो, वीडियो और छुट्टी की सूचनाएँ यहाँ तुरंत लाइव दिखेंगी।
                </p>
              )}
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
            {/* Summary Metrics Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">कुल सत्र शुल्क (Total Fee)</span>
                  <span className="text-xl sm:text-2xl font-black text-white font-mono tabular-nums mt-1 block">
                    ₹{feeSummary.totalBilled.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Session 2026-27</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">जमा राशि (Total Deposited)</span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400 font-mono tabular-nums mt-1 block">
                    ₹{feeSummary.totalDeposited.toLocaleString("en-IN")}
                  </span>
                  <span className="text-[10px] text-emerald-500/80 font-medium mt-0.5 block">सफलतापूर्वक प्राप्त (Verified)</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">शेष बकाया (Net Balance Due)</span>
                  <span className={`text-xl sm:text-2xl font-black font-mono tabular-nums mt-1 block ${feeSummary.totalRemaining === 0 ? "text-emerald-400" : "text-amber-400"}`}>
                    {feeSummary.totalRemaining === 0 ? "₹0 (Cleared)" : `₹${feeSummary.totalRemaining.toLocaleString("en-IN")}`}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                    {feeSummary.totalRemaining === 0 ? "कोई बकाया नहीं" : "अगले देय माह में जुड़ेगा"}
                  </span>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${feeSummary.totalRemaining === 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* School Info Header */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {schoolDisplayName} • छात्र शुल्क पासबुक (Student Fee Ledger)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    छात्र: <strong className="text-slate-200">{activeStudent.name}</strong> • अनुक्रमांक: <strong className="text-slate-200">{activeStudent.rollNo || "—"}</strong> • कक्षा: <strong className="text-slate-200">{formatClassLabel(studentClassLabel)}</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {allStudentFees.filter((f: any) => f.paid).length} of {allStudentFees.length} Entries Paid
                </span>
              </div>
            </div>

            {/* Fee Ledger Table */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-3 px-3 rounded-l-lg">विवरण / माह</th>
                      <th className="py-3 px-3">जमा तिथि व समय</th>
                      <th className="py-3 px-3">रसीद सं.</th>
                      <th className="py-3 px-3 text-right">कुल देय (Billed)</th>
                      <th className="py-3 px-3 text-right">जमा (Paid)</th>
                      <th className="py-3 px-3 text-right">शेष (Due)</th>
                      <th className="py-3 px-3 text-center">स्थिति</th>
                      <th className="py-3 px-3 text-right rounded-r-lg">आधिकारिक दस्तावेज</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {allStudentFees.map((f: any, idx: number) => {
                      const isUpcoming = Boolean(f.isUpcoming || f.status === "upcoming");
                      const isPaid = typeof f.paid === "boolean" ? f.paid : f.status === "paid";
                      const monthCode = f.month || "2026-04";
                      let monthDisplay = monthCode;
                      if (f.feeType === "admission" || f.receiptCategory === "admission") {
                        monthDisplay = "प्रवेश शुल्क व किट (Admission & Kit)";
                      } else if (/^\d{4}-\d{2}$/.test(monthCode)) {
                        const d = new Date(`${monthCode}-01T00:00:00`);
                        if (!isNaN(d.getTime())) {
                          monthDisplay = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
                        }
                      }

                      const billed = Number(f.monthlyAmount ?? f.amount ?? studentMonthlyFee);
                      const paid = Number(f.paidAmount !== undefined ? f.paidAmount : (isPaid ? billed : 0));
                      const remaining = isUpcoming
                        ? 0
                        : Number(f.balanceDue !== undefined ? f.balanceDue : (isPaid ? 0 : Math.max(0, billed - paid)));

                      const isPartial = !isPaid && !isUpcoming && paid > 0 && remaining > 0;
                      const rNo = isPaid || paid > 0 ? (f.receiptNo || `DPS-26-${String(idx + 1).padStart(4, "0")}`) : "—";

                      const dtInfo = formatPaymentDateTime(f.paidDate || f.paymentDate);

                      return (
                        <tr key={f.id || f.receiptNo || `${monthCode}_${idx}`} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {f.feeType === "admission" && <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                              <span>{monthDisplay}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {isUpcoming ? "Upcoming Session Month" : (f.payModeInfo?.payMode || f.paymentMode || (isPaid ? "Cash / Counter" : "Fee Counter"))}
                            </span>
                          </td>
                          <td className="py-3.5 px-3">
                            {isPaid || paid > 0 ? (
                              <div>
                                <span className="font-medium text-slate-200 block">{dtInfo.date}</span>
                                {dtInfo.time ? (
                                  <span className="text-[10px] text-emerald-400/90 font-mono flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5" /> {dtInfo.time}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-mono">Official Hours</span>
                                )}
                              </div>
                            ) : isUpcoming ? (
                              <span className="text-slate-500 italic">आगामी माह</span>
                            ) : (
                              <span className="text-slate-500 italic">देय (Unpaid)</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 font-mono text-slate-400 font-bold">{rNo}</td>
                          <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-300 tabular-nums">
                            ₹{billed.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-black text-emerald-400 tabular-nums">
                            ₹{paid.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono font-black tabular-nums">
                            <span className={remaining > 0 ? "text-amber-400" : "text-slate-500"}>
                              {isUpcoming ? "—" : `₹${remaining.toLocaleString("en-IN")}`}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-2.5 h-2.5" /> पूर्ण जमा
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                <Clock className="w-2.5 h-2.5" /> आंशिक
                              </span>
                            ) : isUpcoming ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-800 text-slate-400 border border-slate-700">
                                आगामी (Upcoming)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                बकाया (Due)
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedFeeForReceipt(f)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition flex items-center gap-1"
                                title="View Official Receipt"
                              >
                                <FileText className="w-3 h-3 text-indigo-400" />
                                <span>देखें</span>
                              </button>

                              <button
                                onClick={() => handleDownloadStudentPdf(f)}
                                disabled={downloadingFeeId === (f.id || f.month)}
                                className="px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1 disabled:opacity-50"
                                title="Download Official PDF Document"
                              >
                                <Download className="w-3 h-3" />
                                <span>PDF</span>
                              </button>

                              <button
                                onClick={() => handleShareStudentWhatsApp(f)}
                                className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition flex items-center gap-1"
                                title="Share on WhatsApp"
                              >
                                <MessageCircle className="w-3 h-3 text-emerald-400" />
                              </button>
                            </div>
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
                        {formatClassLabel(studentClassLabel)} • Roll #{activeStudent.rollNo} • Admission: {activeStudent.admissionNo}
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
                  Assignments given by subject teachers for {formatClassLabel(studentClassLabel)}
                </p>
              </div>
            </div>

            {homeworkList.length > 0 ? (
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
            ) : (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <FileText className="w-8 h-8 text-amber-400/60 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">Abhi {formatClassLabel(studentClassLabel)} ke liye koi homework darj nahi hai</p>
                <p className="text-xs text-slate-400 mt-1">
                  Jaise hi School Admin ya Class Teacher homework assign karenge, yahan turant sync ho jayega.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SCHOOL COMMUNITY (PHOTOS, VIDEOS, HOLIDAYS & NOTICES) ─── */}
        {(activeTab === "community" || activeTab === "notices") && (
          <SchoolCommunityFeed
            schoolId={schoolId}
            schoolName={schoolDisplayName}
            currentUserId={activeStudent.id || effectiveUid}
            currentUserName={activeStudent.name}
            currentUserRole="STUDENT"
            studentClassId={activeStudent.classId}
            studentClassName={formatClassLabel(studentClassLabel)}
            initialFilter={communityInitialFilter}
          />
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
                    {resolvedSchoolLogo && !isAppLogo(resolvedSchoolLogo) ? (
                      <img src={resolvedSchoolLogo} alt="Logo" className="w-6 h-6 rounded-full bg-white object-contain p-0.5" />
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
                    <p className="text-[8.5px] font-black text-emerald-700">{formatClassLabel(studentClassLabel)}</p>
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

      {/* ── FIXED BOTTOM NAVIGATION BAR (STUDENT PORTAL) ────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 print:hidden">
        <div className="max-w-xl mx-auto grid grid-cols-5 gap-1">
          {[
            { id: "overview", label: "Home", icon: Home },
            { id: "attendance", label: "Attendance", icon: Calendar },
            { id: "fees", label: "Fees", icon: CreditCard },
            { id: "community", label: "Community", icon: ImageIcon },
            { id: "exams", label: "Results", icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            const isActive =
              item.id === "community"
                ? activeTab === "community" || activeTab === "notices"
                : activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === "community") setCommunityInitialFilter("ALL");
                  setActiveTab(item.id as TabType);
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  isActive
                    ? "bg-emerald-600/20 text-emerald-400 font-bold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-[10px] sm:text-[11px] leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── OFFICIAL FEE RECEIPT MODAL ─────────────────────────────────────── */}
      {selectedFeeForReceipt && (
        <OfficialFeeReceiptModal
          isOpen={true}
          onClose={() => setSelectedFeeForReceipt(null)}
          school={{
            ...(school || {}),
            id: schoolId,
            name: schoolDisplayName,
            logoUrl: resolvedSchoolLogo,
            address: school?.address || "Institutional Academic Campus, Educational Zone",
            affiliation: school?.affiliation || "Affiliated School Campus",
            code: school?.code || "NSTZ"
          } as any}
          fee={selectedFeeForReceipt}
          student={activeStudent}
          className={formatClassLabel(studentClassLabel)}
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
            className: formatClassLabel(studentClassLabel),
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

export default StudentSchoolPanel;
