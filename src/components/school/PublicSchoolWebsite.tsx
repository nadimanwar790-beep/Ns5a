import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type {
  AdmissionApplication,
  ClassSeatConfig,
  ExamEntry,
  NstaMessage,
  School,
  SchoolCertificate,
  SchoolClass,
  SchoolSession,
  SchoolStudent,
  SchoolTeacher,
  SchoolWebsiteHighlight,
} from "../../school-types";
import { sortSchoolClasses, hasCustomWebsiteCmsAccess } from "../../school-types";
import {
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  UserPlus,
  Search,
  Send,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  Percent,
  Calendar,
  Camera,
  Calculator,
  AlertCircle,
  MessageCircle,
  MessageSquare,
  ExternalLink,
  RotateCcw,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  ScanFace,
  QrCode,
  ReceiptText,
  X,
  PlayCircle,
  Clock,
  ArrowRight,
  GraduationCap,
  Upload,
  Loader2,
  RefreshCw,
  Code2,
  Megaphone,
  Bus,
  BookOpen,
  ShoppingBag,
  FileCheck2,
  Bell,
} from "lucide-react";
import {
  generateId,
  getAdmissionApplications,
  getCertificates,
  getClasses,
  getExams,
  getLocalClasses,
  getLocalStudents,
  getLocalTeachers,
  getSchoolGallery,
  getSessions,
  getStudents,
  getTeachers,
  isStudentInClass,
  saveNstaMessage,
  saveSchoolPublicInquiry,
  subscribeToNstaMessages,
} from "../../school-firebase";
import { loadSchoolSubcollection } from "../../utils/schoolCloudSync";
import { getLocalRoutes } from "../../utils/schoolTransportStore";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import { toast } from "sonner";
import { getSavedSchoolLogo, getVisibleSchoolRegNo, isAppLogo } from "./feeReceiptUtils";
import {
  DEFAULT_GLOBAL_DEVELOPER,
  subscribeToGlobalDeveloperConfig,
  type GlobalWebsiteDeveloperConfig,
} from "../../utils/globalDeveloperConfig";
import {
  buildDefaultSchoolTickerItems,
  parseCustomTickerItems,
} from "../../utils/schoolTickerUtils";
import {
  formatCleanSessionName,
  getDynamicAcademicSessionLabel,
  getUpcomingAdmissionSessionLabel,
  isOctoberToMarchAdmissionWindow,
  isSessionOlderOrEqual,
  normalizeSocialUrl,
  safeOpenExternalUrl,
  type SocialPlatformKey,
} from "../../utils/safeBrowserActions";
import { renderSocialPlatformIcon } from "./SchoolSocialIcons";
import {
  computeClassAdmissionOfferBreakdown,
  isAdmissionOfferActive,
} from "../../utils/admissionOfferUtils";
import campusHeroImg from "../../assets/images/school_campus_hero_1794756374517.jpg";
import smartLabImg from "../../assets/images/smart_classroom_lab_1794756374079.jpg";
import sportsArenaImg from "../../assets/images/school_sports_arena_1794756373791.jpg";
import { EntranceTestModal } from "./EntranceTestModal";

interface Props {
  school: School;
  schools?: School[];
  selectedSchoolId?: string;
  onSelectSchool?: (schoolId: string) => void;
  classes?: SchoolClass[];
  sessions?: SchoolSession[];
  teachers?: SchoolTeacher[];
  students?: SchoolStudent[];
  isAuthenticated?: boolean;
  portalButtonLabel?: string;
  onSwitchToPortal?: () => void;
  onOpenAccount?: () => void;
  onBack?: () => void;
  onOpenAdmission?: () => void;
  onOpenVerification?: (type: string, data?: string) => void;
}

type WebsiteSection = "home" | "campus" | "gallery" | "admissions" | "verify" | "contact";
type WingFilter = "ALL" | "PRE_PRIMARY" | "PRIMARY" | "SENIOR";

const DEFAULT_USPS: SchoolWebsiteHighlight[] = [
  {
    title: "Biometric & AI Face Attendance Desk",
    description:
      "Instant morning arrival verification at campus gates with automatic digital attendance records and parent notifications.",
    badge: "Attendance Precision",
  },
  {
    title: "QR Verified Marksheets & Academic Credentials",
    description:
      "Every report card, transfer certificate, and student ID carries a scannable QR code backed by the school registry.",
    badge: "Verified Trust",
  },
  {
    title: "Transparent Monthly Fee Ledger",
    description:
      "Clear tuition breakdown, itemized fee receipts, scholarship concessions, and instant digital passbook access.",
    badge: "Financial Clarity",
  },
];

const getClassWing = (className: string): WingFilter => {
  const n = className.toLowerCase();
  if (/(nursery|lkg|ukg|kg|prep|play)/i.test(n)) return "PRE_PRIMARY";
  const m = n.match(/\d+/);
  const num = m ? Number(m[0]) : 0;
  if (num >= 1 && num <= 5) return "PRIMARY";
  if (num >= 6) return "SENIOR";
  return "PRIMARY";
};

export const PublicSchoolWebsite: React.FC<Props> = ({
  school,
  schools = [],
  selectedSchoolId,
  onSelectSchool,
  classes: classesProp = [],
  sessions: sessionsProp = [],
  teachers: teachersProp = [],
  students: studentsProp = [],
  isAuthenticated = false,
  portalButtonLabel = "Switch to Student Portal",
  onSwitchToPortal,
  onOpenAccount,
  onBack,
  onOpenAdmission,
  onOpenVerification,
}) => {
  const [activeSection, setActiveSection] = useState<WebsiteSection>("home");
  const [isSchoolDrawerOpen, setIsSchoolDrawerOpen] = useState(false);
  const [schoolSearchQuery, setSchoolSearchQuery] = useState("");
  const [galleryFilter, setGalleryFilter] = useState<string>("ALL");
  const [wingFilter, setWingFilter] = useState<WingFilter>("ALL");
  const [erpShowcaseTab, setErpShowcaseTab] = useState<"ALL" | "USP" | "PARENTS">("ALL");
  const [activeMemoryPreview, setActiveMemoryPreview] = useState<any | null>(null);
  const [isEntranceTestOpen, setIsEntranceTestOpen] = useState(false);

  // Live Campus Data (auto-loads if parent only passed school object)
  const [classesList, setClassesList] = useState<SchoolClass[]>(classesProp);
  const [sessionsList, setSessionsList] = useState<SchoolSession[]>(sessionsProp);
  const [teachersList, setTeachersList] = useState<SchoolTeacher[]>(teachersProp);
  const [studentsList, setStudentsList] = useState<SchoolStudent[]>(studentsProp);
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [seatConfigs, setSeatConfigs] = useState<ClassSeatConfig[]>([]);
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [examsList, setExamsList] = useState<ExamEntry[]>([]);
  const [certificatesList, setCertificatesList] = useState<SchoolCertificate[]>([]);

  // Verification State (QR Code + Manual Lookup)
  const [verifyType, setVerifyType] = useState<"marksheet" | "certificate" | "idcard">("marksheet");
  const [verifySearchQuery, setVerifySearchQuery] = useState("");
  const [verifySearched, setVerifySearched] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedResult, setVerifiedResult] = useState<any>(null);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const [qrCameraError, setQrCameraError] = useState<string | null>(null);
  const [qrIsScanning, setQrIsScanning] = useState(false);
  const [qrFileScanning, setQrFileScanning] = useState(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Admission Status Lookup
  const [statusQuery, setStatusQuery] = useState("");
  const [statusSearched, setStatusSearched] = useState(false);
  const [matchedApps, setMatchedApps] = useState<AdmissionApplication[]>([]);

  // Global Developer Profile (Managed exclusively by Life Maker Super Admin across all schools)
  const [globalDeveloper, setGlobalDeveloper] = useState<GlobalWebsiteDeveloperConfig>(
    DEFAULT_GLOBAL_DEVELOPER
  );

  // Top Publicity Scrolling & Swipeable Ticker Refs
  const tickerScrollRef = useRef<HTMLDivElement | null>(null);
  const tickerPausedRef = useRef<boolean>(false);
  const tickerResumeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = subscribeToGlobalDeveloperConfig((cfg) => {
      setGlobalDeveloper(cfg);
    });
    return () => unsub();
  }, []);

  // Sync props when parent updates them
  useEffect(() => {
    if (classesProp.length > 0) setClassesList(classesProp);
  }, [classesProp]);

  useEffect(() => {
    if (sessionsProp.length > 0) setSessionsList(sessionsProp);
  }, [sessionsProp]);

  useEffect(() => {
    if (teachersProp.length > 0) setTeachersList(teachersProp);
  }, [teachersProp]);

  useEffect(() => {
    if (studentsProp.length > 0) setStudentsList(studentsProp);
  }, [studentsProp]);

  // Active academic session detection + deduplication so multi-session classes NEVER appear twice
  const activeSessionObj = useMemo(() => {
    if (!sessionsList || sessionsList.length === 0) return null;
    const explicitActive = sessionsList.find((s) => s.active);
    if (explicitActive) {
      // Ensure the active session actually has classes if classes carry sessionId
      const hasClasses = classesList.some((c) => c.sessionId === explicitActive.id);
      if (hasClasses || !classesList.some((c) => Boolean(c.sessionId))) {
        return explicitActive;
      }
    }
    const sorted = [...sessionsList].sort((a, b) =>
      String(b.name || b.startDate || "").localeCompare(String(a.name || a.startDate || ""))
    );
    return (
      sorted.find((s) => classesList.some((c) => c.sessionId === s.id)) ||
      explicitActive ||
      sorted[0] ||
      null
    );
  }, [sessionsList, classesList]);

  const sortedClasses = useMemo(() => {
    const raw = Array.isArray(classesList) ? classesList : [];
    if (raw.length === 0) return [];

    // 1. Prefer classes belonging to the active/latest academic session
    const activeSid = activeSessionObj?.id;
    const sessionMatched =
      activeSid ? raw.filter((c) => c.sessionId === activeSid) : [];
    const candidatePool = sessionMatched.length > 0 ? sessionMatched : raw;

    // 2. Deduplicate by normalized (name + section + stream) so classes across sessions or synced copies never double up
    const deduped = new Map<string, SchoolClass>();
    for (const cls of candidatePool) {
      const normName = String(cls.name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      const normSection = String(cls.section || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      const normStream = String(cls.stream || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
      const key = `${normName}|${normSection}|${normStream}`;
      if (!normName) continue;

      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, cls);
      } else {
        const clsScore =
          (activeSid && cls.sessionId === activeSid ? 4 : 0) +
          (Number(cls.feeStructure?.tuitionFee ?? cls.defaultFee ?? 0) > 0 ? 2 : 0) +
          (cls.feeStructure ? 1 : 0);
        const existingScore =
          (activeSid && existing.sessionId === activeSid ? 4 : 0) +
          (Number(existing.feeStructure?.tuitionFee ?? existing.defaultFee ?? 0) > 0 ? 2 : 0) +
          (existing.feeStructure ? 1 : 0);
        if (clsScore > existingScore) {
          deduped.set(key, cls);
        }
      }
    }

    return sortSchoolClasses(Array.from(deduped.values()));
  }, [classesList, activeSessionObj?.id]);

  // Scholarship & Sibling Fee Estimator
  const [calcClassId, setCalcClassId] = useState<string>(sortedClasses[0]?.id || "");
  const [calcSiblings, setCalcSiblings] = useState<number>(1);
  const [calcMeritPct, setCalcMeritPct] = useState<number>(0);
  const [calcUseBus, setCalcUseBus] = useState<boolean>(false);

  // Visit Booking & General Inquiry
  const [inquiryParent, setInquiryParent] = useState("");
  const [inquiryStudent, setInquiryStudent] = useState("");
  const [inquiryPhone, setInquiryPhone] = useState("");
  const [inquiryClass, setInquiryClass] = useState(sortedClasses[0]?.name || "Class 1");
  const [inquiryVisitDate, setInquiryVisitDate] = useState("");
  const [inquiryVisitTime, setInquiryVisitTime] = useState("10:30 AM");
  const [inquiryMessage, setInquiryMessage] = useState("");
  const [inquirySending, setInquirySending] = useState(false);
  const [inquirySent, setInquirySent] = useState(false);

  // NSTA Messenger Direct Chat with School Admin (Contact Admissions Office)
  const [isNstaChatOpen, setIsNstaChatOpen] = useState(false);
  const [nstaVisitorName, setNstaVisitorName] = useState("");
  const [nstaVisitorPhone, setNstaVisitorPhone] = useState("");
  const [nstaVisitorClass, setNstaVisitorClass] = useState("");
  const [nstaVisitorId, setNstaVisitorId] = useState("");
  const [nstaVisitorReady, setNstaVisitorReady] = useState(false);
  const [nstaChatMessages, setNstaChatMessages] = useState<NstaMessage[]>([]);
  const [nstaChatInput, setNstaChatInput] = useState("");
  const [nstaChatSending, setNstaChatSending] = useState(false);

  // Load saved website visitor NSTA identity per school
  useEffect(() => {
    if (!school?.id) return;
    try {
      const savedRaw = localStorage.getItem(`nsta_web_visitor_${school.id}`);
      if (savedRaw) {
        const parsed = JSON.parse(savedRaw);
        if (parsed?.visitorId && parsed?.name && parsed?.phone) {
          setNstaVisitorId(parsed.visitorId);
          setNstaVisitorName(parsed.name);
          setNstaVisitorPhone(parsed.phone);
          setNstaVisitorClass(parsed.studentClass || "");
          setNstaVisitorReady(true);
          return;
        }
      }
    } catch {}
    setNstaVisitorId("");
    setNstaVisitorReady(false);
    setNstaChatMessages([]);
  }, [school?.id]);

  // Live subscription to Visitor <-> School Admin NSTA Messenger thread
  useEffect(() => {
    if (!isNstaChatOpen || !school?.id || !nstaVisitorReady || !nstaVisitorId) return;
    const unsub = subscribeToNstaMessages(
      school.id,
      { threadType: "SCHOOL_DESK", studentId: nstaVisitorId },
      (msgs) => {
        const strictlyOwn = (msgs || []).filter(
          (m) => m && m.threadType === "SCHOOL_DESK" && m.studentId === nstaVisitorId
        );
        setNstaChatMessages(strictlyOwn);
      }
    );
    return () => unsub();
  }, [isNstaChatOpen, school?.id, nstaVisitorReady, nstaVisitorId]);

  // Keep selected class IDs synced whenever deduplicated classes change or school switches
  useEffect(() => {
    if (sortedClasses.length === 0) return;
    if (!calcClassId || !sortedClasses.some((c) => c.id === calcClassId)) {
      setCalcClassId(sortedClasses[0].id);
    }
    if (!inquiryClass || !sortedClasses.some((c) => c.name === inquiryClass)) {
      setInquiryClass(sortedClasses[0].name);
    }
    if (!nstaVisitorClass) {
      setNstaVisitorClass(sortedClasses[0].name);
    }
  }, [sortedClasses, calcClassId, inquiryClass, nstaVisitorClass]);

  useEffect(() => {
    let active = true;
    const sid = school?.id;
    if (!sid) return;

    if (classesProp.length > 0) {
      setClassesList(classesProp);
    } else {
      const localC = getLocalClasses(sid);
      setClassesList(localC);
      getClasses(sid)
        .then((c) => active && Array.isArray(c) && c.length > 0 && setClassesList(c))
        .catch(() => {});
    }

    if (sessionsProp.length > 0) {
      setSessionsList(sessionsProp);
    } else {
      getSessions(sid)
        .then((sess) => active && Array.isArray(sess) && setSessionsList(sess))
        .catch(() => {});
    }

    if (teachersProp.length > 0) {
      setTeachersList(teachersProp);
    } else {
      const localT = getLocalTeachers(sid);
      setTeachersList(localT);
      getTeachers(sid)
        .then((t) => active && setTeachersList(Array.isArray(t) ? t : []))
        .catch(() => {});
    }

    if (studentsProp.length > 0) {
      setStudentsList(studentsProp);
    } else {
      const localS = getLocalStudents(sid);
      setStudentsList(localS);
      getStudents(sid)
        .then((s) => active && setStudentsList(Array.isArray(s) ? s : []))
        .catch(() => {});
    }

    getSchoolGallery(sid)
      .then((items) => {
        if (!active) return;
        let merged: any[] = [...items];
        const pushLegacyMemory = (m: any) => {
          const mediaUrl = m?.url || m?.imageUrl || "";
          if (!mediaUrl && !m?.videoUrl) return;
          if (!merged.some((x) => x.id === m.id || (mediaUrl && x.imageUrl === mediaUrl))) {
            merged.push({
              id: m.id || `mem_${merged.length}`,
              schoolId: sid,
              title: m.title || "Campus Highlight",
              category: m.category || "CAMPUS",
              imageUrl: mediaUrl || campusHeroImg,
              videoUrl: m.videoUrl || "",
              mediaType: m.type === "VIDEO" || m.mediaType === "VIDEO" ? "VIDEO" : "IMAGE",
              description: m.description || "",
              date: m.date || new Date().toISOString().slice(0, 10),
            });
          }
        };

        try {
          const primaryRaw = localStorage.getItem(`school_memories_${sid}`);
          if (primaryRaw) {
            const parsed = JSON.parse(primaryRaw);
            if (Array.isArray(parsed)) parsed.forEach(pushLegacyMemory);
          }
          const altRaw = localStorage.getItem(`memories_${sid}`);
          if (altRaw) {
            const parsed = JSON.parse(altRaw);
            if (Array.isArray(parsed)) parsed.forEach(pushLegacyMemory);
          }
        } catch {}

        setGalleryItems(merged);
      })
      .catch(() => {});

    loadSchoolSubcollection<ClassSeatConfig>(sid, "class_seat_configs", `nst_class_seats_${sid}`).then((seats) => {
      if (active) setSeatConfigs(seats);
    });
    getAdmissionApplications(sid).then((apps) => active && setApplications(apps)).catch(() => {});
    getExams(sid).then((ex) => active && setExamsList(ex)).catch(() => {});
    getCertificates(sid).then((certs) => active && setCertificatesList(certs)).catch(() => {});

    return () => {
      active = false;
    };
  }, [school?.id, classesProp.length, sessionsProp.length, teachersProp.length, studentsProp.length]);

  const configuredRoutes = useMemo(() => (school?.id ? getLocalRoutes(school.id) : []), [school?.id]);

  // Website CMS config + automatic rich fallbacks (Custom CMS only on Elite / White-Label; Lite gets Default Website)
  const allowCustomWebsite = hasCustomWebsiteCmsAccess(school);
  const websiteCfg = allowCustomWebsite ? (school?.websiteConfig || {}) : {};
  const currentSessionLabel = formatCleanSessionName(activeSessionObj?.name || getDynamicAcademicSessionLabel());
  const isOctToMarWindow = isOctoberToMarchAdmissionWindow();
  const autoTargetAdmissionSession = getUpcomingAdmissionSessionLabel(
    activeSessionObj?.name || currentSessionLabel,
    sessionsList
  );
  // April–September: Admissions show current session; October–March: Admissions show the auto-created next session
  const sessionLabel =
    allowCustomWebsite &&
    websiteCfg.admissionSessionLabel &&
    (isOctToMarWindow
      ? !isSessionOlderOrEqual(websiteCfg.admissionSessionLabel, currentSessionLabel)
      : formatCleanSessionName(websiteCfg.admissionSessionLabel) === currentSessionLabel)
      ? formatCleanSessionName(websiteCfg.admissionSessionLabel)
      : autoTargetAdmissionSession;
  const admissionsOpen = allowCustomWebsite ? (websiteCfg.admissionsOpen ?? true) : true;
  const heroBadge =
    allowCustomWebsite &&
    websiteCfg.heroBadgeText &&
    (isOctToMarWindow
      ? !isSessionOlderOrEqual(websiteCfg.heroBadgeText, currentSessionLabel)
      : String(websiteCfg.heroBadgeText).includes(currentSessionLabel))
      ? websiteCfg.heroBadgeText
      : `Admissions Open · Session ${sessionLabel}`;
  const heroHeadline =
    websiteCfg.heroHeadline ||
    `Shaping Confident Scholars at ${school?.name || "Our Academy"}`;
  const heroSubheadline =
    websiteCfg.heroSubheadline ||
    (allowCustomWebsite ? school?.tagline : "") ||
    `${school?.name || "Our institution"}${school?.address ? `, ${school.address},` : ""} unites structured K–12 academics with verifiable digital records, transparent fee ledgers, and responsive parent communication.`;
  const heroBannerUrl = allowCustomWebsite && websiteCfg.heroBannerUrl ? websiteCfg.heroBannerUrl : campusHeroImg;
  const principalMessage =
    websiteCfg.principalMessage ||
    `Dear Parents and Students, at ${school?.name || "our school"}, every child receives personal mentorship, disciplined study habits, and complete digital transparency so families remain closely connected with academic progress.`;
  const aboutSchoolText =
    websiteCfg.aboutSchool ||
    `${school?.name || "Our institution"} offers structured K-12 education supported by experienced faculty, safe campus monitoring, and parent-first digital communication.`;
  const usps = useMemo(
    () =>
      allowCustomWebsite && Array.isArray(websiteCfg.highlights) && websiteCfg.highlights.length > 0
        ? websiteCfg.highlights
        : DEFAULT_USPS,
    [allowCustomWebsite, websiteCfg.highlights]
  );

  const hasCustomNonDefaultHighlights = useMemo(() => {
    if (!allowCustomWebsite || !Array.isArray(websiteCfg.highlights) || websiteCfg.highlights.length === 0) {
      return false;
    }
    const defaultTitles = new Set([
      "ai face attendance",
      "qr verified marksheets & id cards",
      "transparent fee passbook",
      "biometric & ai face attendance desk",
      "qr verified marksheets & academic credentials",
      "transparent monthly fee ledger",
    ]);
    return websiteCfg.highlights.some(
      (h) => h?.title && !defaultTitles.has(h.title.trim().toLowerCase())
    );
  }, [allowCustomWebsite, websiteCfg.highlights]);

  const visibleTeachers = useMemo(() => {
    if (!allowCustomWebsite) return teachersList;
    const hidden = new Set(websiteCfg.hiddenTeacherIds || []);
    return teachersList.filter((t) => !hidden.has(t.id));
  }, [allowCustomWebsite, teachersList, websiteCfg.hiddenTeacherIds]);

  const filteredTableClasses = useMemo(() => {
    if (wingFilter === "ALL") return sortedClasses;
    return sortedClasses.filter((c) => getClassWing(c.name) === wingFilter);
  }, [sortedClasses, wingFilter]);

  const calcSelectedClass = useMemo(
    () => sortedClasses.find((c) => c.id === calcClassId) || sortedClasses[0],
    [sortedClasses, calcClassId]
  );

  const admissionOfferCfg = school?.websiteConfig?.admissionOffer;

  const feeEstimate = useMemo(() => {
    const baseMonthly = Number(
      calcSelectedClass?.feeStructure?.tuitionFee ?? calcSelectedClass?.defaultFee ?? 1800
    );
    const pkgBreakdown = computeClassAdmissionOfferBreakdown(calcSelectedClass, admissionOfferCfg, {
      includeBus: calcUseBus,
    });
    const admFee = pkgBreakdown.items.length > 0 ? pkgBreakdown.discountedTotal : Number(calcSelectedClass?.feeStructure?.admissionFee ?? 2500);
    const admOriginalFee = pkgBreakdown.items.length > 0 ? pkgBreakdown.originalTotal : admFee;
    const admOfferSavings = pkgBreakdown.offerDiscountTotal;
    const admOfferPct = pkgBreakdown.discountPercent;
    const busFee = calcUseBus
      ? Number(configuredRoutes[0]?.monthlyFee ?? calcSelectedClass?.feeStructure?.busFee ?? 900)
      : 0;
    const siblingPct = calcSiblings >= 2 ? 10 : 0;
    const meritPct = calcMeritPct >= 90 ? 25 : calcMeritPct >= 80 ? 15 : 0;
    const totalPct = Math.min(35, siblingPct + meritPct);
    const monthlySavings = Math.round((baseMonthly * totalPct) / 100);
    const netMonthly = Math.max(0, baseMonthly - monthlySavings) + busFee;
    return {
      baseMonthly,
      admFee,
      admOriginalFee,
      admOfferSavings,
      admOfferPct,
      busFee,
      siblingPct,
      meritPct,
      monthlySavings,
      netMonthly,
    };
  }, [calcSelectedClass, admissionOfferCfg, calcUseBus, configuredRoutes, calcSiblings, calcMeritPct]);

  const showcaseGallery = useMemo(() => {
    if (allowCustomWebsite && galleryItems.length > 0) return galleryItems;
    return [
      {
        id: "g_default_1",
        schoolId: school?.id || "",
        title: `${school?.name || "School"} Main Campus`,
        category: "CAMPUS",
        mediaType: "IMAGE",
        imageUrl: heroBannerUrl || campusHeroImg,
        description: "Safe academic blocks, clean classrooms, and disciplined morning assemblies.",
        date: currentSessionLabel,
      },
      {
        id: "g_default_2",
        schoolId: school?.id || "",
        title: "Smart Classrooms & STEM Lab",
        category: "EXPO",
        mediaType: "IMAGE",
        imageUrl: smartLabImg,
        description: "Interactive digital lessons and hands-on science learning activities.",
        date: currentSessionLabel,
      },
      {
        id: "g_default_3",
        schoolId: school?.id || "",
        title: "Annual Sports & Athletics Arena",
        category: "SPORTS",
        mediaType: "IMAGE",
        imageUrl: sportsArenaImg,
        description: "Physical fitness, team sportsmanship, and annual athletics events.",
        date: currentSessionLabel,
      },
    ];
  }, [allowCustomWebsite, galleryItems, school?.id, school?.name, heroBannerUrl, currentSessionLabel]);

  const filteredGallery = useMemo(() => {
    return showcaseGallery.filter((item) => {
      if (galleryFilter === "ALL") return true;
      if (galleryFilter === "PHOTOS") return item.mediaType !== "VIDEO";
      if (galleryFilter === "VIDEOS") return item.mediaType === "VIDEO";
      return String(item.category || "").toUpperCase() === galleryFilter;
    });
  }, [showcaseGallery, galleryFilter]);

  const filteredSchoolsForSwitcher = useMemo(() => {
    const q = schoolSearchQuery.trim().toLowerCase();
    if (!q) return schools;
    return schools.filter(
      (s) =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.address?.toLowerCase().includes(q)
    );
  }, [schools, schoolSearchQuery]);

  // Admission Offer (% OFF + Multi-Image Swipe Carousel + Full Class Package Breakdown)
  const offerActive = isAdmissionOfferActive(admissionOfferCfg);
  const offerDiscountPct = offerActive
    ? Math.max(0, Math.min(90, Math.round(Number(admissionOfferCfg?.discountPercent || 0))))
    : 0;
  const [offerSlideIdx, setOfferSlideIdx] = useState(0);
  const [offerCarouselPaused, setOfferCarouselPaused] = useState(false);
  const [offerDragOffsetPx, setOfferDragOffsetPx] = useState(0);
  const [isOfferDragging, setIsOfferDragging] = useState(false);
  const offerTouchStartXRef = useRef<number | null>(null);
  const offerTouchStartYRef = useRef<number | null>(null);
  const offerSectionRef = useRef<HTMLElement | null>(null);
  const [offerSelectedClassId, setOfferSelectedClassId] = useState<string>("");
  const [offerIncludeBus, setOfferIncludeBus] = useState<boolean>(false);

  const offerSlides = useMemo(() => {
    const customImgs = Array.isArray(admissionOfferCfg?.images)
      ? admissionOfferCfg!.images.filter((im) => Boolean(im?.url?.trim()))
      : [];
    if (customImgs.length > 0) {
      return customImgs.map((im, idx) => ({
        id: im.id || `offer_slide_${idx}`,
        url: im.url,
        caption: im.caption || admissionOfferCfg?.title || `${school?.name || "School"} Admission Offer`,
      }));
    }
    return [
      {
        id: "offer_fallback_1",
        url: heroBannerUrl || campusHeroImg,
        caption: `${school?.name || "Campus"} · Session ${sessionLabel} Admissions`,
      },
      {
        id: "offer_fallback_2",
        url: smartLabImg,
        caption: "Smart Classrooms & Interactive STEM Labs",
      },
      {
        id: "offer_fallback_3",
        url: sportsArenaImg,
        caption: "Holistic Academics, Sports & Co-Curricular Campus",
      },
    ];
  }, [admissionOfferCfg, heroBannerUrl, school?.name, sessionLabel]);

  useEffect(() => {
    if (offerSlideIdx >= offerSlides.length) {
      setOfferSlideIdx(0);
    }
  }, [offerSlideIdx, offerSlides.length]);

  useEffect(() => {
    if (!offerActive || offerSlides.length <= 1 || offerCarouselPaused || isOfferDragging) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setOfferSlideIdx((prev) => (prev + 1) % offerSlides.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, [offerActive, offerSlides.length, offerCarouselPaused, isOfferDragging]);

  useEffect(() => {
    if (sortedClasses.length === 0) return;
    setOfferSelectedClassId((prev) =>
      prev && sortedClasses.some((c) => c.id === prev) ? prev : sortedClasses[0].id
    );
  }, [sortedClasses]);

  const offerActiveClass = useMemo(
    () => sortedClasses.find((c) => c.id === offerSelectedClassId) || sortedClasses[0] || null,
    [sortedClasses, offerSelectedClassId]
  );

  const offerPackageBreakdown = useMemo(
    () =>
      computeClassAdmissionOfferBreakdown(offerActiveClass, admissionOfferCfg, {
        includeBus: offerIncludeBus,
        customBusFee:
          configuredRoutes[0]?.monthlyFee !== undefined
            ? Number(configuredRoutes[0].monthlyFee)
            : undefined,
      }),
    [offerActiveClass, admissionOfferCfg, offerIncludeBus, configuredRoutes]
  );

  const goOfferSlide = (nextIdx: number) => {
    if (offerSlides.length === 0) return;
    const normalized = ((nextIdx % offerSlides.length) + offerSlides.length) % offerSlides.length;
    setOfferSlideIdx(normalized);
  };

  const handleOfferSwipeStart = (clientX: number, clientY?: number) => {
    offerTouchStartXRef.current = clientX;
    offerTouchStartYRef.current = clientY ?? null;
    setIsOfferDragging(true);
    setOfferCarouselPaused(true);
    setOfferDragOffsetPx(0);
  };

  const handleOfferSwipeMove = (clientX: number, clientY?: number) => {
    if (offerTouchStartXRef.current === null) return;
    const dx = clientX - offerTouchStartXRef.current;
    if (clientY !== undefined && offerTouchStartYRef.current !== null) {
      const dy = Math.abs(clientY - offerTouchStartYRef.current);
      if (dy > Math.abs(dx) && Math.abs(dx) < 12) return;
    }
    setOfferDragOffsetPx(dx);
  };

  const handleOfferSwipeEnd = () => {
    if (offerTouchStartXRef.current === null) return;
    const dx = offerDragOffsetPx;
    offerTouchStartXRef.current = null;
    offerTouchStartYRef.current = null;
    setIsOfferDragging(false);
    setOfferDragOffsetPx(0);
    if (Math.abs(dx) >= 42 && offerSlides.length > 1) {
      if (dx < 0) goOfferSlide(offerSlideIdx + 1);
      else goOfferSlide(offerSlideIdx - 1);
    }
    window.setTimeout(() => setOfferCarouselPaused(false), 2600);
  };

  const scrollToOfferShowcase = () => {
    if (activeSection !== "home") {
      setActiveSection("home");
      window.setTimeout(() => {
        offerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
    } else {
      offerSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!school) {
    return (
      <div className="min-h-screen bg-[#070D19] flex flex-col items-center justify-center p-4 text-white">
        <p className="text-sm font-semibold text-slate-300">Loading School Website...</p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-xs font-semibold hover:bg-white/20 cursor-pointer"
          >
            Back
          </button>
        )}
      </div>
    );
  }

  const bannerColor = school?.bannerColor || "#1e3a8a";
  const savedLogo = getSavedSchoolLogo(school.logoUrl, school.id);
  const hasValidLogo = Boolean(savedLogo && !isAppLogo(savedLogo));
  const cleanPhoneDigits = (websiteCfg.whatsappNumber || school.phone || "").replace(/\D/g, "");
  const primaryPhone = (school.phone || "").split(",")[0]?.trim() || "";
  const regNo = getVisibleSchoolRegNo(school);
  const hasMultipleSchools = schools.length > 1;

  // Top Publicity Scrolling Ticker (Admin-editable via school.websiteConfig; excludes email ID)
  const rawWebsiteCfg = school?.websiteConfig || {};
  const socialChannels = useMemo(
    () => [
      {
        key: "instagram" as SocialPlatformKey,
        label: "Instagram",
        actionLabel: "Official Page",
        url: normalizeSocialUrl(rawWebsiteCfg.instagramUrl, "instagram"),
        activeBorder: "border-pink-300 dark:border-pink-800 hover:border-pink-500",
        activeIconBg: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm",
      },
      {
        key: "youtube" as SocialPlatformKey,
        label: "YouTube",
        actionLabel: "Official Channel",
        url: normalizeSocialUrl(rawWebsiteCfg.youtubeUrl, "youtube"),
        activeBorder: "border-rose-300 dark:border-rose-800 hover:border-rose-500",
        activeIconBg: "bg-[#FF0000] text-white shadow-sm",
      },
      {
        key: "facebook" as SocialPlatformKey,
        label: "Facebook",
        actionLabel: "Official Page",
        url: normalizeSocialUrl(rawWebsiteCfg.facebookUrl, "facebook"),
        activeBorder: "border-blue-300 dark:border-blue-800 hover:border-blue-500",
        activeIconBg: "bg-[#1877F2] text-white shadow-sm",
      },
      {
        key: "whatsapp_group" as SocialPlatformKey,
        label: "WhatsApp Group",
        actionLabel: "Join Group",
        url: normalizeSocialUrl(rawWebsiteCfg.whatsappGroupUrl, "whatsapp_group"),
        activeBorder: "border-emerald-300 dark:border-emerald-800 hover:border-emerald-500",
        activeIconBg: "bg-[#25D366] text-white shadow-sm",
      },
    ],
    [
      rawWebsiteCfg.instagramUrl,
      rawWebsiteCfg.youtubeUrl,
      rawWebsiteCfg.facebookUrl,
      rawWebsiteCfg.whatsappGroupUrl,
    ]
  );

  const topTickerEnabled = rawWebsiteCfg.topTickerEnabled ?? true;
  const topTickerSpeed = rawWebsiteCfg.topTickerSpeed || "slow";
  const topTickerItems = useMemo(() => {
    const custom = parseCustomTickerItems(rawWebsiteCfg.topTickerText);
    if (custom.length > 0) return custom;
    return buildDefaultSchoolTickerItems({
      school,
      sessionLabel,
      admissionsOpen,
      regNo,
      highlights: usps,
    });
  }, [rawWebsiteCfg.topTickerText, school, sessionLabel, admissionsOpen, regNo, usps]);

  useEffect(() => {
    if (!topTickerEnabled || topTickerItems.length === 0) return;
    const el = tickerScrollRef.current;
    if (!el) return;

    const pxPerSec = topTickerSpeed === "fast" ? 72 : topTickerSpeed === "normal" ? 46 : 26;
    let rafId = 0;
    let lastTime = performance.now();
    let accum = el.scrollLeft;

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (!tickerPausedRef.current && el) {
        const halfWidth = el.scrollWidth / 2;
        if (halfWidth > el.clientWidth) {
          // Sync with manual scrollLeft if user swiped earlier
          if (Math.abs(el.scrollLeft - accum) > 2) {
            accum = el.scrollLeft;
          }
          accum += pxPerSec * dt;
          if (accum >= halfWidth) {
            accum -= halfWidth;
          }
          el.scrollLeft = accum;
        }
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      if (tickerResumeTimerRef.current) {
        window.clearTimeout(tickerResumeTimerRef.current);
      }
    };
  }, [topTickerEnabled, topTickerSpeed, topTickerItems]);

  const pauseTickerTemporarily = (resumeAfterMs?: number) => {
    tickerPausedRef.current = true;
    if (tickerResumeTimerRef.current) {
      window.clearTimeout(tickerResumeTimerRef.current);
      tickerResumeTimerRef.current = null;
    }
    if (typeof resumeAfterMs === "number") {
      tickerResumeTimerRef.current = window.setTimeout(() => {
        tickerPausedRef.current = false;
      }, resumeAfterMs);
    }
  };

  const jumpToEstimateClass = (classId: string) => {
    setCalcClassId(classId);
    setActiveSection("admissions");
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const navigateSection = (sec: WebsiteSection) => {
    setActiveSection(sec);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  };

  const handleInquirySubmit = async (e: React.FormEvent, isVisit = false) => {
    e.preventDefault();
    if (!inquiryParent.trim() || !inquiryPhone.trim()) {
      toast.error("Please enter parent name and phone number.");
      return;
    }
    setInquirySending(true);
    try {
      await saveSchoolPublicInquiry(school.id, {
        id: generateId("inq"),
        schoolId: school.id,
        name: inquiryParent.trim(),
        studentName: inquiryStudent.trim() || undefined,
        phone: inquiryPhone.trim(),
        studentClass: inquiryClass,
        inquiryType: isVisit ? "campus_visit" : "admission",
        source: "website",
        status: isVisit && inquiryVisitDate ? "visit_scheduled" : "new",
        visitDate: isVisit ? inquiryVisitDate || undefined : undefined,
        visitTime: isVisit ? inquiryVisitTime || undefined : undefined,
        message: inquiryMessage.trim() || (isVisit ? "Requested Campus Visit" : "Admission Inquiry"),
        createdAt: new Date().toISOString(),
      });
      setInquirySent(true);
      setInquiryParent("");
      setInquiryStudent("");
      setInquiryPhone("");
      setInquiryMessage("");
      toast.success(isVisit ? "Campus Visit scheduled! Admissions desk notified." : "Inquiry sent to school admissions desk.");
    } catch {
      toast.error("Failed to submit inquiry. Please call school office.");
    } finally {
      setInquirySending(false);
    }
  };

  const handleStartNstaVisitorSession = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nstaVisitorName.trim();
    const cleanPhone = nstaVisitorPhone.replace(/\D/g, "");
    if (!cleanName || cleanPhone.length < 10) {
      toast.error("Please enter your valid name and 10-digit mobile number.");
      return;
    }
    const vid = `web_adm_${cleanPhone.slice(-10)}`;
    setNstaVisitorId(vid);
    setNstaVisitorName(cleanName);
    setNstaVisitorPhone(cleanPhone.slice(-10));
    setNstaVisitorReady(true);
    try {
      localStorage.setItem(
        `nsta_web_visitor_${school.id}`,
        JSON.stringify({
          visitorId: vid,
          name: cleanName,
          phone: cleanPhone.slice(-10),
          studentClass: nstaVisitorClass,
        })
      );
    } catch {}
  };

  const handleSendNstaVisitorMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = nstaChatInput.trim();
    if (!text || nstaChatSending || !nstaVisitorId || !nstaVisitorName.trim()) return;
    setNstaChatSending(true);
    const cleanName = nstaVisitorName.trim();
    const cleanPhone = nstaVisitorPhone.trim();
    const msgId = generateId("msg");
    try {
      const msgPayload: NstaMessage = {
        id: msgId,
        schoolId: school.id,
        threadType: "SCHOOL_DESK",
        studentId: nstaVisitorId,
        studentName: `${cleanName} (${cleanPhone}) · Website Admission`,
        className: nstaVisitorClass || undefined,
        senderId: nstaVisitorId,
        senderName: `${cleanName} (${cleanPhone})`,
        senderRole: "STUDENT",
        text,
        createdAt: new Date().toISOString(),
        status: "sent",
      };
      await saveNstaMessage(msgPayload);

      // Sync to School Admin Admission Enquiries CRM as well
      await saveSchoolPublicInquiry(school.id, {
        id: `inq_${nstaVisitorId}`,
        schoolId: school.id,
        name: cleanName,
        phone: cleanPhone,
        studentClass: nstaVisitorClass || undefined,
        inquiryType: "admission",
        source: "nsta_messenger",
        status: "new",
        message: text,
        createdAt: new Date().toISOString(),
      });

      // Notify School Admin directly
      void sendSchoolPushNotification({
        schoolId: school.id,
        userId: "STAFF_ADMIN",
        senderId: nstaVisitorId,
        senderName: cleanName,
        title: `💬 NSTA Messenger · ${cleanName} (${cleanPhone})`,
        body: nstaVisitorClass ? `[${nstaVisitorClass}] ${text}` : text,
        type: "NSTA_MESSAGE",
        icon: school.logoUrl || "",
        senderPhoto: school.logoUrl || "",
        url: `/?schoolPortal=1&schoolTab=messenger&subTab=school`,
        urgent: true,
      });

      setNstaChatInput("");
      toast.success("Message sent to School Admin on NSTA Messenger.");
    } catch {
      toast.error("Could not send message. Please try again.");
    } finally {
      setNstaChatSending(false);
    }
  };

  const stopDocQrScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (e) {
        console.warn("[WebsiteDocVerify] stop error:", e);
      } finally {
        qrScannerRef.current = null;
        setQrIsScanning(false);
      }
    }
  };

  const verifyDecodedQrPayload = (rawQrText: string) => {
    const trimmed = String(rawQrText || "").trim();
    if (!trimmed) return;
    setVerifySearched(true);
    setVerifyError(null);

    const checkSchoolOwnership = (qrSchoolId?: string, qrSchoolName?: string) => {
      const cleanSid = String(qrSchoolId || "").trim().toLowerCase();
      const thisSid = String(school?.id || "").trim().toLowerCase();
      const thisCode = String(school?.code || "").trim().toLowerCase();
      if (cleanSid && cleanSid !== thisSid && cleanSid !== thisCode) {
        const cleanSName = String(qrSchoolName || "").trim().toLowerCase();
        const thisName = String(school?.name || "").trim().toLowerCase();
        if (!cleanSName || cleanSName !== thisName) {
          return false;
        }
      }
      return true;
    };

    // 1. NSTA-SCHOOL: or NSTA-SCHOOL-STAFF: ID Card QR format (raw OR inside Chrome URL #hash)
    if (trimmed.includes("NSTA-SCHOOL:") || trimmed.includes("NSTA-SCHOOL-STAFF:")) {
      const isStaff = trimmed.includes("NSTA-SCHOOL-STAFF:");
      const body = (isStaff ? trimmed.split("NSTA-SCHOOL-STAFF:")[1] : trimmed.split("NSTA-SCHOOL:")[1] || "").split(/[\r\n]/)[0];
      const parts = body.split(":").map((p) => {
        try {
          return decodeURIComponent(p);
        } catch {
          return p;
        }
      });
      const [
        qrSchoolId,
        qrStudentId,
        qrRoll,
        _qrClassId,
        qrName,
        qrAdmNo,
        qrPhone,
        qrFather,
        _qrMother,
        _qrBlood,
        _qrDob,
        _qrAddress,
        _qrFee,
        qrClassName,
        qrSchoolName,
      ] = parts;

      if (!checkSchoolOwnership(qrSchoolId, qrSchoolName)) {
        setVerifiedResult(null);
        setVerifyError(`This ID Card QR belongs to ${qrSchoolName || "another school"}, not ${school.name}.`);
        return;
      }

      const matchedStudent = studentsList.find(
        (s) =>
          (qrStudentId && s.id === qrStudentId) ||
          (qrAdmNo && s.admissionNo?.toLowerCase() === qrAdmNo.toLowerCase()) ||
          (qrRoll && s.rollNo?.toLowerCase() === qrRoll.toLowerCase())
      );

      setVerifyType("idcard");
      setVerifySearchQuery(qrAdmNo || qrRoll || qrName || "");
      setVerifiedResult({
        found: true,
        qrVerified: true,
        type: "idcard",
        officialVerified: true,
        school: matchedStudent ? school.name : qrSchoolName || school.name,
        schoolCode: school.code || regNo || "",
        student: matchedStudent?.name || qrName || "Registered Student",
        roll: matchedStudent?.rollNo || qrRoll || "—",
        regNo: matchedStudent?.admissionNo || qrAdmNo || qrStudentId || "ACTIVE",
        class: matchedStudent?.className || qrClassName || (isStaff ? "Faculty / Staff" : "Enrolled Class"),
        fatherName: matchedStudent?.fatherName || qrFather || "",
        phone: matchedStudent?.phone || qrPhone || "",
        photoUrl: matchedStudent?.photoUrl || "",
        status: isStaff ? "Verified Official Staff ID" : "Verified Official Campus ID",
        total: (matchedStudent?.fatherName || qrFather) ? `Guardian: ${matchedStudent?.fatherName || qrFather}` : "QR Authentic ID",
        date: matchedStudent?.joinDate || new Date().toISOString().slice(0, 10),
        session: currentSessionLabel,
      });
      toast.success("QR verified successfully!");
      return;
    }

    // 2. ADM-VERIFY| Admission Receipt QR format
    if (trimmed.startsWith("ADM-VERIFY|")) {
      const kv: Record<string, string> = {};
      trimmed
        .split("|")
        .slice(1)
        .forEach((seg) => {
          const idx = seg.indexOf(":");
          if (idx > 0) {
            kv[seg.slice(0, idx).trim().toLowerCase()] = seg.slice(idx + 1).trim();
          }
        });
      const qrAdmNo = kv["admno"] || kv["appno"] || "";
      const qrName = kv["name"] || "";
      const qrClass = kv["class"] || "";
      const qrRcpt = kv["rcpt"] || "";
      const qrPaid = kv["paid"] || "";
      const qrSchool = kv["school"] || school.name;

      const matchedApp = applications.find(
        (a) => qrAdmNo && a.applicationNo?.toLowerCase() === qrAdmNo.toLowerCase()
      );
      const matchedSt = studentsList.find(
        (s) => qrAdmNo && (s.admissionNo?.toLowerCase() === qrAdmNo.toLowerCase() || s.rollNo?.toLowerCase() === qrAdmNo.toLowerCase())
      );

      setVerifyType("idcard");
      setVerifySearchQuery(qrAdmNo || qrRcpt || qrName);
      setVerifiedResult({
        found: true,
        qrVerified: true,
        type: "idcard",
        officialVerified: true,
        school: qrSchool,
        student: matchedSt?.name || matchedApp?.studentName || qrName || "Verified Applicant",
        roll: matchedSt?.rollNo || qrRcpt || qrAdmNo || "VERIFIED",
        regNo: matchedSt?.admissionNo || matchedApp?.applicationNo || qrAdmNo || "RECEIPT",
        class: matchedSt?.className || matchedApp?.className || qrClass || "Admitted Class",
        status: qrPaid ? `Official Receipt Verified · Paid ₹${qrPaid}` : "Official Admission Receipt Verified",
        total: qrRcpt ? `Receipt: ${qrRcpt}` : "Authentic School Receipt",
        date: new Date().toISOString().slice(0, 10),
        session: sessionLabel,
      });
      toast.success("Admission Receipt QR verified!");
      return;
    }

    // 3. URL-based Verification QRs (Marksheet, Certificate, Student ID, Fee Receipt, Admit Card, Admission, Gate Pass)
    let parsedUrl: URL | null = null;
    try {
      if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/?") || trimmed.includes("verify=") || trimmed.includes("v=id")) {
        parsedUrl = new URL(trimmed, window.location.origin);
      }
    } catch {}

    if (parsedUrl) {
      const p = parsedUrl.searchParams;
      const dataStr = p.get("data");
      if (dataStr) {
        try {
          const decodedData = JSON.parse(decodeURIComponent(dataStr));
          const rawType = decodedData.type || decodedData.t || p.get("type") || "marksheet";
          const docType = rawType === "certificate" ? "certificate" : (rawType === "idcard" || rawType === "driver_id" || rawType === "fee_receipt" || rawType === "admission" || rawType === "gate_pass") ? "idcard" : "marksheet";
          setVerifyType(docType);
          const resolvedStudent = decodedData.student || decodedData.studentName || decodedData.nm || decodedData.name || "Verified Student";
          const resolvedRoll = decodedData.roll || decodedData.rollNo || decodedData.rl || decodedData.rno || "—";
          const resolvedReg = decodedData.regNo || decodedData.admNo || decodedData.adm || decodedData.cno || "—";
          setVerifySearchQuery(resolvedRoll !== "—" ? resolvedRoll : resolvedStudent);
          setVerifiedResult({
            found: true,
            qrVerified: true,
            officialVerified: true,
            ...decodedData,
            type: docType,
            school: decodedData.school || decodedData.sn || school.name,
            student: resolvedStudent,
            roll: resolvedRoll,
            regNo: resolvedReg,
            class: decodedData.class || decodedData.className || decodedData.cl || "—",
            status: decodedData.status || (decodedData.grade ? `PASSED · Grade ${decodedData.grade}` : rawType === "fee_receipt" ? `Fee Receipt Verified (${decodedData.rno || ""})` : "Verified Authentic Record"),
            total: decodedData.total || (decodedData.tp !== undefined ? `Paid: ₹${decodedData.tp}` : "Verified Academic Record"),
            date: decodedData.date || decodedData.dt || new Date().toISOString().slice(0, 10),
          });
          toast.success("Document QR verified!");
          return;
        } catch {}
      }

      const qrTypeParam = p.get("type") || (p.get("v") === "id" ? "idcard" : "");
      const urlName = p.get("n") || p.get("student") || p.get("name") || p.get("studentName") || "";
      const urlRoll = p.get("r") || p.get("roll") || p.get("rollNo") || "";
      const urlAdm = p.get("adm") || p.get("admNo") || p.get("regNo") || "";
      const urlCertNo = p.get("cNo") || p.get("certNo") || p.get("dispatchNo") || "";
      const urlSchoolId = p.get("s") || p.get("schoolId") || "";
      const urlSchoolName = p.get("school") || p.get("schoolName") || "";
      const urlCertTitle = p.get("certTitle") || p.get("title") || "";
      const urlSession = p.get("session") || currentSessionLabel;
      const urlGrade = p.get("grade") || "";
      const urlStudentId = p.get("u") || p.get("uid") || p.get("studentId") || p.get("id") || "";

      if (!checkSchoolOwnership(urlSchoolId, urlSchoolName)) {
        setVerifiedResult(null);
        setVerifyError(`This QR document belongs to ${urlSchoolName || "another school"}, not ${school.name}.`);
        return;
      }

      if (urlCertNo || qrTypeParam === "certificate") {
        const matchedCert = certificatesList.find(
          (c) =>
            (urlCertNo && c.dispatchNo?.toLowerCase() === urlCertNo.toLowerCase()) ||
            (urlRoll && c.rollNo?.toLowerCase() === urlRoll.toLowerCase())
        );
        setVerifyType("certificate");
        setVerifySearchQuery(urlCertNo || urlRoll || urlName);
        setVerifiedResult({
          found: true,
          qrVerified: true,
          officialVerified: true,
          type: "certificate",
          school: urlSchoolName || school.name,
          student: matchedCert?.studentName || urlName || "Verified Student",
          roll: matchedCert?.rollNo || urlRoll || urlCertNo || "—",
          regNo: matchedCert?.dispatchNo || urlCertNo || urlAdm || "—",
          certificateNo: matchedCert?.dispatchNo || urlCertNo || "—",
          certificateType: urlCertTitle || (matchedCert ? `${matchedCert.certificateType} Certificate` : "Official Certificate"),
          class: matchedCert?.className || "Certified Scholar",
          session: urlSession,
          status: `${urlCertTitle || matchedCert?.certificateType?.toUpperCase() || "Official"} Certificate · QR Verified`,
          total: matchedCert?.remarks || "Authentic School Registry Record",
          date: matchedCert?.issueDate || new Date().toISOString().slice(0, 10),
        });
        toast.success("Certificate QR verified!");
        return;
      }

      if (urlName || urlRoll || urlAdm || urlStudentId) {
        const matchedSt = studentsList.find(
          (s) =>
            (urlStudentId && s.id === urlStudentId) ||
            (urlAdm && s.admissionNo?.toLowerCase() === urlAdm.toLowerCase()) ||
            (urlRoll && s.rollNo?.toLowerCase() === urlRoll.toLowerCase())
        );
        const resolvedType = qrTypeParam === "idcard" ? "idcard" : "marksheet";
        setVerifyType(resolvedType);
        setVerifySearchQuery(urlRoll || urlAdm || urlName);
        setVerifiedResult({
          found: true,
          qrVerified: true,
          officialVerified: true,
          type: resolvedType,
          school: urlSchoolName || school.name,
          student: matchedSt?.name || urlName || "Verified Student",
          roll: matchedSt?.rollNo || urlRoll || "—",
          regNo: matchedSt?.admissionNo || urlAdm || urlStudentId || "VERIFIED",
          class: matchedSt?.className || "Enrolled Class",
          session: urlSession,
          grade: urlGrade || undefined,
          status: urlGrade ? `PASSED · Grade ${urlGrade} (QR Verified)` : "QR Verified Authentic Record",
          total: matchedSt?.fatherName ? `Guardian: ${matchedSt.fatherName}` : "Verified Campus Record",
          date: matchedSt?.joinDate || new Date().toISOString().slice(0, 10),
        });
        toast.success("Document QR verified!");
        return;
      }
    }

    // 4. Direct Roll / Admission / Dispatch number encoded in QR
    const directFound = lookupManualDocument(trimmed, verifyType);
    if (directFound) {
      setVerifySearchQuery(trimmed);
      setVerifiedResult({ ...directFound, qrVerified: true });
      toast.success("Record found from QR code!");
      return;
    }

    setVerifiedResult(null);
    setVerifyError("Invalid or unrecognized document QR code. Scan an official Marksheet, Certificate, or Student ID QR issued by this school.");
  };

  const startDocQrScanner = async () => {
    setQrCameraError(null);
    setQrIsScanning(true);
    try {
      await stopDocQrScanner();
      const html5QrCode = new Html5Qrcode("website-doc-qr-reader");
      qrScannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          setIsQrScannerOpen(false);
          void stopDocQrScanner();
          verifyDecodedQrPayload(decodedText);
        },
        () => {}
      );
    } catch {
      setQrIsScanning(false);
      setQrCameraError("Camera access was not granted. Allow camera permission or upload the document QR photo below.");
    }
  };

  useEffect(() => {
    if (!isQrScannerOpen) {
      void stopDocQrScanner();
      setQrCameraError(null);
      return;
    }
    const timer = setTimeout(() => {
      void startDocQrScanner();
    }, 200);
    return () => {
      clearTimeout(timer);
      void stopDocQrScanner();
    };
  }, [isQrScannerOpen]);

  const handleDocQrFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setQrFileScanning(true);
    setQrCameraError(null);
    setVerifyError(null);
    try {
      const fileScanner = new Html5Qrcode("website-doc-qr-file-helper");
      const decoded = await fileScanner.scanFile(file, true);
      await fileScanner.clear();
      setIsQrScannerOpen(false);
      verifyDecodedQrPayload(decoded);
    } catch {
      setVerifyError("Could not detect a clear QR code in the selected image. Please upload a sharper document QR photo.");
      setQrCameraError("Could not detect a QR code in that image. Try cropping closer to the QR square.");
    } finally {
      setQrFileScanning(false);
    }
  };

  const lookupManualDocument = (queryText: string, docKind: "marksheet" | "certificate" | "idcard") => {
    const q = queryText.trim().toLowerCase();
    if (!q) return null;

    if (docKind === "certificate") {
      const cert = certificatesList.find(
        (c) =>
          c.dispatchNo?.toLowerCase() === q ||
          c.studentName?.toLowerCase().includes(q) ||
          c.rollNo?.toLowerCase() === q
      );
      if (cert) {
        return {
          found: true,
          type: "certificate",
          officialVerified: true,
          school: school.name,
          student: cert.studentName,
          roll: cert.rollNo || cert.dispatchNo,
          regNo: cert.dispatchNo,
          certificateNo: cert.dispatchNo,
          certificateType: `${cert.certificateType} Certificate`,
          class: cert.className,
          session: currentSessionLabel,
          status: `${cert.certificateType.toUpperCase()} Certificate · Issued ${cert.issueDate}`,
          total: cert.remarks || "Verified Original Record",
          date: cert.issueDate,
        };
      }
    }

    const st = studentsList.find(
      (s) =>
        s.rollNo?.toLowerCase() === q ||
        s.admissionNo?.toLowerCase() === q ||
        s.id?.toLowerCase() === q
    );

    if (st) {
      if (docKind === "marksheet") {
        let obtained = 0;
        let max = 0;
        examsList.forEach((ex) => {
          const mk = ex.studentMarks?.[st.id];
          if (mk && !mk.absent) {
            obtained += Number(mk.marks || 0);
            max += Number(ex.maxMarks || 100);
          }
        });
        const pct = max > 0 ? Math.round((obtained / max) * 100) : null;
        return {
          found: true,
          type: "marksheet",
          officialVerified: true,
          school: school.name,
          student: st.name,
          roll: st.rollNo,
          regNo: st.admissionNo || st.id.slice(0, 10),
          class: st.className || "Enrolled Class",
          session: currentSessionLabel,
          status: pct !== null ? (pct >= 33 ? `PASSED (${pct}%)` : `APPEARED (${pct}%)`) : "Enrolled Academic Record",
          total: max > 0 ? `${obtained} / ${max}` : "Marks Pending Entry",
          date: st.joinDate || new Date().toISOString().slice(0, 10),
        };
      }

      return {
        found: true,
        type: "idcard",
        officialVerified: true,
        school: school.name,
        student: st.name,
        roll: st.rollNo,
        regNo: st.admissionNo || "ACTIVE",
        class: st.className || "Student",
        session: currentSessionLabel,
        fatherName: st.fatherName || "",
        photoUrl: st.photoUrl || "",
        status: st.active !== false ? "Active Verified Student" : "Alumni / Inactive",
        total: st.fatherName ? `Guardian: ${st.fatherName}` : "Verified Campus ID",
        date: st.joinDate || new Date().toISOString().slice(0, 10),
      };
    }

    return null;
  };

  const handleVerifySearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = verifySearchQuery.trim();
    if (!q) return;
    setVerifySearched(true);
    setVerifyError(null);
    const result = lookupManualDocument(q, verifyType);
    setVerifiedResult(result);
  };

  const handleTrackStatus = (e: React.FormEvent) => {
    e.preventDefault();
    const q = statusQuery.trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, "");
    if (!q) return;
    setStatusSearched(true);
    const hits = applications.filter(
      (a) =>
        a.applicationNo?.toLowerCase() === q ||
        (cleanQ.length >= 6 && (a.phone || "").replace(/\D/g, "").includes(cleanQ))
    );
    setMatchedApps(hits);
  };

  const getUspIcon = (idx: number) => {
    if (idx === 0) return <ScanFace className="w-5 h-5 text-amber-500" />;
    if (idx === 1) return <QrCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    return <ReceiptText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
  };

  const NAV_ITEMS: { id: WebsiteSection; label: string; mobileLabel?: string }[] = [
    { id: "home", label: "Home" },
    { id: "campus", label: "Campus & Fees", mobileLabel: "Fees" },
    { id: "gallery", label: "Memories" },
    { id: "admissions", label: "Admissions" },
    { id: "verify", label: "Verify" },
    { id: "contact", label: "Contact" },
  ];

  return (
    <div className="nst-isolated-modal min-h-screen bg-[#FAFBFD] dark:bg-[#070D19] text-slate-900 dark:text-slate-100 antialiased selection:bg-amber-400/30">
      {/* Top Slow-Scrolling & Swipeable School Publicity Ticker (Email ID Excluded, Admin Editable) */}
      {topTickerEnabled ? (
        <div className="bg-[#070D19] text-slate-200 text-[11px] sm:text-xs border-b border-white/10">
          <div className="max-w-6xl mx-auto flex items-center gap-1.5 px-2 sm:px-3">
            {onBack && !onSwitchToPortal && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 my-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-300 hover:text-sky-200 font-bold whitespace-nowrap shrink-0 z-10 cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span>Back to Admin</span>
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-2 text-amber-400 font-bold whitespace-nowrap shrink-0 border-r border-white/10">
              <Megaphone className="w-3.5 h-3.5" />
              <span>Campus Updates</span>
            </div>

            <div
              ref={tickerScrollRef}
              onMouseEnter={() => pauseTickerTemporarily()}
              onMouseLeave={() => pauseTickerTemporarily(400)}
              onTouchStart={() => pauseTickerTemporarily()}
              onTouchEnd={() => pauseTickerTemporarily(1400)}
              onPointerDown={() => pauseTickerTemporarily()}
              onPointerUp={() => pauseTickerTemporarily(1400)}
              style={{
                maskImage: "linear-gradient(to right, transparent 0%, black 18px, black calc(100% - 18px), transparent 100%)",
                WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 18px, black calc(100% - 18px), transparent 100%)",
              }}
              className="flex-1 min-w-0 overflow-x-auto no-scrollbar touch-pan-x select-none cursor-grab active:cursor-grabbing py-2 px-3"
              title="Swipe or scroll horizontally to read all school publicity details"
            >
              <div className="inline-flex items-center whitespace-nowrap w-max pl-3">
                {[0, 1].map((dupIdx) => (
                  <div key={dupIdx} className="inline-flex items-center gap-4 pr-6">
                    {topTickerItems.map((itemText, idx) => {
                      const lower = itemText.toLowerCase();
                      const isPhoneItem = Boolean(primaryPhone && itemText.includes(primaryPhone));
                      const isAdmissionItem =
                        !isPhoneItem &&
                        admissionsOpen &&
                        onOpenAdmission &&
                        (lower.includes("admission") || lower.includes("apply"));
                      return (
                        <React.Fragment key={`${dupIdx}-${idx}`}>
                          {isPhoneItem ? (
                            <a
                              href={`tel:${primaryPhone}`}
                              className="inline-flex items-center gap-1.5 text-emerald-300 hover:text-emerald-200 font-semibold whitespace-nowrap tabular-nums"
                            >
                              <Phone className="w-3 h-3 text-amber-400 shrink-0" />
                              <span>{itemText}</span>
                            </a>
                          ) : isAdmissionItem ? (
                            <button
                              type="button"
                              onClick={onOpenAdmission}
                              className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 font-semibold whitespace-nowrap cursor-pointer"
                            >
                              <span>{itemText}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-white/90 font-medium whitespace-nowrap">
                              {itemText}
                            </span>
                          )}
                          <span className="text-amber-400/80 font-bold select-none" aria-hidden="true">
                            ✦
                          </span>
                        </React.Fragment>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {admissionsOpen && onOpenAdmission && (
              <button
                type="button"
                onClick={onOpenAdmission}
                className="hidden md:inline-flex items-center px-3 py-2 text-amber-400 hover:text-amber-300 font-bold whitespace-nowrap shrink-0 border-l border-white/10 bg-[#070D19] cursor-pointer transition-colors"
              >
                Apply {sessionLabel} →
              </button>
            )}
          </div>
        </div>
      ) : (
        onBack &&
        !onSwitchToPortal && (
          <div className="bg-[#070D19] text-slate-200 text-[11px] py-1.5 px-4 border-b border-white/10">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold whitespace-nowrap cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back to Admin</span>
              </button>
              {admissionsOpen && onOpenAdmission && (
                <button
                  type="button"
                  onClick={onOpenAdmission}
                  className="text-amber-400 hover:text-amber-300 font-semibold whitespace-nowrap cursor-pointer"
                >
                  Admissions Open {sessionLabel} →
                </button>
              )}
            </div>
          </div>
        )
      )}

      {/* Primary Top Navigation Header (Clean 3-Zone Contract, Compact Mobile Height <= 12%) */}
      <header className="bg-white/95 dark:bg-[#0B1324]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/90 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Brand Wordmark + Multi-School Drawer Trigger */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1 lg:flex-initial">
            {hasValidLogo ? (
              <img
                src={savedLogo}
                alt={school.name}
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain rounded-lg bg-white p-0.5 border border-slate-200 shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                style={{ backgroundColor: bannerColor }}
              >
                {(school.name || "SC").slice(0, 2).toUpperCase()}
              </div>
            )}

            {hasMultipleSchools && onSelectSchool ? (
              <button
                type="button"
                onClick={() => setIsSchoolDrawerOpen(true)}
                className="flex items-center gap-1 text-left min-w-0 py-1 px-1.5 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                title="Switch School Campus"
              >
                <span className="text-xs sm:text-[15px] font-bold tracking-tight text-slate-950 dark:text-white truncate max-w-[165px] sm:max-w-[240px]">
                  {school.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white shrink-0" />
              </button>
            ) : (
              <span className="text-xs sm:text-[15px] font-bold tracking-tight text-slate-950 dark:text-white truncate max-w-[175px] sm:max-w-[260px]">
                {school.name}
              </span>
            )}
          </div>

          {/* Zone 2: Desktop Single-Line Typography Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateSection(item.id)}
                className={`py-2 text-[13px] font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  activeSection === item.id
                    ? "border-slate-950 text-slate-950 dark:border-amber-400 dark:text-white"
                    : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Zone 3: Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && onSwitchToPortal ? (
              <button
                type="button"
                onClick={onSwitchToPortal}
                className="px-3 py-1.5 sm:py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-semibold text-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{portalButtonLabel}</span>
                <span className="sm:hidden">Portal</span>
              </button>
            ) : (
              onOpenAccount && (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 font-semibold text-xs whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Account</span>
                </button>
              )
            )}

            {admissionsOpen && onOpenAdmission && (
              <button
                type="button"
                onClick={onOpenAdmission}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg whitespace-nowrap shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 hidden sm:inline" />
                <span className="hidden sm:inline">Apply Online</span>
                <span className="sm:hidden">Apply</span>
              </button>
            )}
          </div>
        </div>

        {/* Sleek Single-Line Mobile Nav Strip */}
        <div className="lg:hidden border-t border-slate-200/70 dark:border-slate-800 px-3 pr-5 flex items-center justify-between sm:justify-start sm:gap-5 gap-3 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateSection(item.id)}
              className={`py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                activeSection === item.id
                  ? "border-slate-950 text-slate-950 dark:border-amber-400 dark:text-white"
                  : "border-transparent text-slate-600 dark:text-slate-400"
              }`}
            >
              {item.mobileLabel || item.label}
            </button>
          ))}
        </div>
      </header>

      {/* MULTI-SCHOOL SWITCHER DRAWER */}
      {isSchoolDrawerOpen && hasMultipleSchools && onSelectSchool && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-start">
          <div className="w-full max-w-sm bg-white dark:bg-[#0B1324] h-full border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-amber-500" />
                <div>
                  <h2 className="text-sm font-bold text-slate-950 dark:text-white">Select School Campus</h2>
                  <p className="text-[11px] text-slate-500">Switch public website across registered schools</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSchoolDrawerOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
                aria-label="Close school switcher"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={schoolSearchQuery}
                  onChange={(e) => setSchoolSearchQuery(e.target.value)}
                  placeholder="Search school name or city..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredSchoolsForSwitcher.map((item) => {
                const isSelected = (selectedSchoolId || school.id) === item.id;
                const itemLogo = getSavedSchoolLogo(item.logoUrl, item.id);
                const validLogo = Boolean(itemLogo && !isAppLogo(itemLogo));
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSchool(item.id);
                      setIsSchoolDrawerOpen(false);
                      navigateSection("home");
                    }}
                    className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-500/60 text-slate-950 dark:text-white"
                        : "bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {validLogo ? (
                      <img
                        src={itemLogo}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg text-white font-bold text-xs flex items-center justify-center shrink-0"
                        style={{ backgroundColor: item.bannerColor || "#1e3a8a" }}
                      >
                        {(item.name || "SC").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold truncate">{item.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.address || item.code || "Official Campus Portal"}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0" />}
                  </button>
                );
              })}
              {filteredSchoolsForSwitcher.length === 0 && (
                <p className="text-center text-xs text-slate-500 py-8">No matching school found.</p>
              )}
            </div>
          </div>
          <div className="flex-1" onClick={() => setIsSchoolDrawerOpen(false)} />
        </div>
      )}

      {/* SECTION 1: HOME */}
      {activeSection === "home" && (
        <div className="space-y-16 sm:space-y-20 pb-16">
          {/* Prestigious Institutional Hero */}
          <section
            className="bg-[#070D19] text-white border-b border-white/10 relative overflow-hidden"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 65% 55% at 85% 10%, rgba(245, 158, 11, 0.13), transparent 70%), radial-gradient(ellipse 50% 45% at 10% 90%, rgba(59, 130, 246, 0.1), transparent 70%)",
            }}
          >
            <div className="max-w-6xl mx-auto px-4 pt-8 pb-8 lg:pt-14 lg:pb-12 space-y-8 lg:space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-10 items-stretch">
                <div className="lg:col-span-6 flex flex-col justify-center space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/12 border border-amber-400/30 text-[11px] sm:text-xs font-bold text-amber-300 tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span>{admissionsOpen ? heroBadge : school.name}</span>
                    </div>

                    {school.address && (
                      <div className="flex items-start gap-1.5 text-white/80">
                        <MapPin className="w-3.5 h-3.5 text-amber-400/85 shrink-0 mt-0.5" />
                        <span className="text-xs sm:text-[13px] text-white/80 font-medium leading-snug">
                          {school.address}
                        </span>
                      </div>
                    )}
                  </div>

                  <h1
                    className="text-3xl sm:text-4xl lg:text-[3.25rem] font-bold tracking-tight leading-[1.1] text-white"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif", textWrap: "balance", color: "#ffffff" }}
                  >
                    {heroHeadline}
                  </h1>

                  <p className="text-sm sm:text-[15px] text-white/80 leading-relaxed max-w-xl">
                    {heroSubheadline}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
                    {admissionsOpen && onOpenAdmission ? (
                      <button
                        type="button"
                        onClick={onOpenAdmission}
                        className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        <span>Apply Online ({sessionLabel})</span>
                      </button>
                    ) : null}

                    <div className="grid grid-cols-2 sm:flex gap-2.5">
                      <button
                        type="button"
                        onClick={() => navigateSection("campus")}
                        className="px-4 py-2.5 sm:py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                        style={{ color: "#ffffff" }}
                      >
                        <span>Fees &amp; Seats</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEntranceTestOpen(true)}
                        className="px-4 py-2.5 sm:py-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/45 text-emerald-300 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4 shrink-0 text-emerald-300" />
                        <span>Entrance Test</span>
                      </button>
                    </div>
                  </div>

                  {offerActive && (
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={scrollToOfferShowcase}
                        className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-amber-400/10 hover:bg-amber-400/15 border border-amber-400/25 text-left text-xs text-amber-200 transition-colors cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-mono font-black tabular-nums text-[11px] shrink-0">
                          {offerDiscountPct > 0 ? `${offerDiscountPct}% OFF` : "SPECIAL OFFER"}
                        </span>
                        <span className="font-semibold text-amber-100 truncate">
                          {admissionOfferCfg?.title || "View Admission Package & Offer Gallery"}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-300 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Editorial Campus Frame (matches row height on desktop) */}
                <div className="lg:col-span-6 flex">
                  <div className="w-full rounded-2xl overflow-hidden border border-white/20 bg-slate-950 shadow-2xl shadow-black/50 relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px]">
                    <img
                      src={heroBannerUrl}
                      alt={`${school.name} Campus`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#040811] via-[#040811]/35 to-black/15" />

                    {/* Top-right Verified Campus Pill */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/55 border border-white/20 backdrop-blur-md text-[10px] font-bold text-amber-300 inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>Verified Campus</span>
                    </div>

                    <div className="absolute bottom-0 inset-x-0 p-4 sm:p-5 flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 drop-shadow-xs">
                          Official Campus Showcase
                        </p>
                        <p
                          className="text-sm sm:text-base font-bold text-white leading-snug drop-shadow-xs truncate mt-0.5"
                          style={{ color: "#ffffff" }}
                        >
                          {school.name}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateSection("gallery")}
                        style={{ color: "#ffffff" }}
                        className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md text-white text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <span>Campus Gallery</span>
                        <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full-Width 4-Column Architectural KPI & Trust Strip */}
              <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/15 pt-6 gap-5 sm:gap-6">
                <div className="space-y-1">
                  <p className="text-[11px] text-white/60 font-medium">Principal / Academic Head</p>
                  <p className="text-sm sm:text-base font-bold text-white truncate" style={{ color: "#ffffff" }}>
                    {school.principalName || "Academic Principal"}
                  </p>
                </div>
                <div className="space-y-1 lg:border-l lg:border-white/10 lg:pl-6">
                  <p className="text-[11px] text-white/60 font-medium">Dedicated Faculty</p>
                  <p className="text-sm sm:text-base font-bold text-white tabular-nums" style={{ color: "#ffffff" }}>
                    {visibleTeachers.length || teachersList.length} Subject Mentors
                  </p>
                </div>
                <div className="space-y-1 lg:border-l lg:border-white/10 lg:pl-6">
                  <p className="text-[11px] text-white/60 font-medium">Academic Classes</p>
                  <p className="text-sm sm:text-base font-bold text-white tabular-nums" style={{ color: "#ffffff" }}>
                    {sortedClasses.length > 0 ? `${sortedClasses.length} Structured Classes` : "Nursery to Class 12"}
                  </p>
                </div>
                <div className="space-y-1 lg:border-l lg:border-white/10 lg:pl-6">
                  <p className="text-[11px] text-white/60 font-medium">Verification &amp; Registry</p>
                  <p className="text-sm sm:text-base font-bold text-amber-400 font-mono tabular-nums truncate">
                    {regNo || "QR Registry Active"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* EXCLUSIVE ADMISSION OFFER & COMPLETE FEE PACKAGE SHOWCASE */}
          {offerActive && (
            <section
              id="admission-offer-showcase"
              ref={(el) => {
                offerSectionRef.current = el;
              }}
              className="max-w-6xl mx-auto px-4 space-y-6 scroll-mt-20"
            >
              {/* Section Editorial Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold tracking-wider uppercase text-amber-600 dark:text-amber-400">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span>{admissionOfferCfg?.badgeText || "Special Admission Offer"}</span>
                    {admissionOfferCfg?.validTill && (
                      <>
                        <span aria-hidden="true" className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-300">
                          Valid till {admissionOfferCfg.validTill}
                        </span>
                      </>
                    )}
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {admissionOfferCfg?.title || `Admission Offer · Session ${sessionLabel}`}
                  </h2>
                  {admissionOfferCfg?.subtitle && (
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {admissionOfferCfg.subtitle}
                    </p>
                  )}
                </div>

                {offerDiscountPct > 0 && (
                  <div className="shrink-0 bg-[#070D19] text-white border border-amber-400/40 rounded-xl px-5 py-3 flex items-center gap-3.5">
                    <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                      <Percent className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold block">
                        Instant Admission Discount
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono tabular-nums leading-none">
                        {offerDiscountPct}% OFF
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2-Column Editorial Spotlight: Swipeable Multi-Photo Carousel + Full Class Admission Package */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* LEFT COLUMN: Touch-Swipeable Multi-Image Carousel */}
                <div className="lg:col-span-6 space-y-3">
                  <div
                    className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 bg-[#070D19] select-none touch-pan-y group"
                    onMouseEnter={() => setOfferCarouselPaused(true)}
                    onMouseLeave={() => {
                      setOfferCarouselPaused(false);
                      if (isOfferDragging) handleOfferSwipeEnd();
                    }}
                    onTouchStart={(e) =>
                      handleOfferSwipeStart(e.touches[0].clientX, e.touches[0].clientY)
                    }
                    onTouchMove={(e) =>
                      handleOfferSwipeMove(e.touches[0].clientX, e.touches[0].clientY)
                    }
                    onTouchEnd={handleOfferSwipeEnd}
                    onPointerDown={(e) => {
                      if (e.pointerType === "mouse") {
                        handleOfferSwipeStart(e.clientX, e.clientY);
                      }
                    }}
                    onPointerMove={(e) => {
                      if (e.pointerType === "mouse" && isOfferDragging) {
                        handleOfferSwipeMove(e.clientX, e.clientY);
                      }
                    }}
                    onPointerUp={(e) => {
                      if (e.pointerType === "mouse" && isOfferDragging) {
                        handleOfferSwipeEnd();
                      }
                    }}
                  >
                    {/* Sliding Horizontal Track */}
                    <div
                      className="flex aspect-[4/3] sm:aspect-[16/11]"
                      style={{
                        transform: `translate3d(calc(-${offerSlideIdx * 100}% + ${offerDragOffsetPx}px), 0, 0)`,
                        transition: isOfferDragging
                          ? "none"
                          : "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {offerSlides.map((slide, idx) => (
                        <div key={slide.id} className="w-full h-full shrink-0 relative bg-slate-950">
                          <img
                            src={slide.url}
                            alt={slide.caption || `Offer Slide ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            draggable={false}
                            onClick={() => {
                              if (Math.abs(offerDragOffsetPx) < 6) {
                                setActiveMemoryPreview({
                                  id: slide.id,
                                  title: slide.caption || admissionOfferCfg?.title || "Admission Offer",
                                  category: offerDiscountPct > 0 ? `${offerDiscountPct}% OFF OFFER` : "ADMISSION OFFER",
                                  imageUrl: slide.url,
                                  date: admissionOfferCfg?.validTill || `Session ${sessionLabel}`,
                                });
                              }
                            }}
                            className="w-full h-full object-cover cursor-zoom-in"
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
                        </div>
                      ))}
                    </div>

                    {/* Top Discount Plaque (Single clean hairline badge, no clutter) */}
                    {offerDiscountPct > 0 && (
                      <div className="pointer-events-none absolute top-3.5 left-3.5 px-3 py-1.5 rounded-lg bg-[#070D19]/85 backdrop-blur-md border border-amber-400/50 text-amber-300 text-xs font-mono font-bold tabular-nums">
                        {offerDiscountPct}% OFF · {sessionLabel}
                      </div>
                    )}

                    {/* Left / Right Slide Arrows */}
                    {offerSlides.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goOfferSlide(offerSlideIdx - 1);
                          }}
                          aria-label="Previous offer photo"
                          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            goOfferSlide(offerSlideIdx + 1);
                          }}
                          aria-label="Next offer photo"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 border border-white/25 backdrop-blur-md text-white flex items-center justify-center transition cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {/* Bottom Caption & Interactive Slide Indicators */}
                    <div className="absolute bottom-0 inset-x-0 p-4 flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-mono text-amber-300 tabular-nums">
                          {String(offerSlideIdx + 1).padStart(2, "0")} /{" "}
                          {String(offerSlides.length).padStart(2, "0")}
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-white truncate mt-0.5">
                          {offerSlides[offerSlideIdx]?.caption || admissionOfferCfg?.title || school.name}
                        </p>
                      </div>

                      {offerSlides.length > 1 && (
                        <div className="flex items-center gap-1.5 shrink-0 pb-1">
                          {offerSlides.map((s, i) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                goOfferSlide(i);
                              }}
                              aria-label={`Go to slide ${i + 1}`}
                              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                                i === offerSlideIdx
                                  ? "w-6 bg-amber-400"
                                  : "w-1.5 bg-white/45 hover:bg-white/75"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {offerSlides.length > 1 && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between px-1">
                      <span>← Swipe photo or tap arrows to view more offer slides →</span>
                      <span className="font-mono tabular-nums">{offerSlides.length} Slides</span>
                    </p>
                  )}
                </div>

                {/* RIGHT COLUMN: Complete Class-Wise Admission Package & Live % OFF Calculator */}
                <div className="lg:col-span-6 bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                  {/* Card Header + Class Selector */}
                  <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Complete Admission Package
                        </p>
                        <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white mt-0.5">
                          Class-Wise Itemized Fee Breakdown
                        </h3>
                      </div>

                      {sortedClasses.length > 0 && (
                        <select
                          value={offerActiveClass?.id || ""}
                          onChange={(e) => setOfferSelectedClassId(e.target.value)}
                          aria-label="Select class for admission package breakdown"
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-950 dark:text-white cursor-pointer"
                        >
                          {sortedClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.section ? `(${c.section})` : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Quick Horizontal Class Tabs */}
                    {sortedClasses.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                        {sortedClasses.map((cls) => {
                          const isCur = offerActiveClass?.id === cls.id;
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => setOfferSelectedClassId(cls.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                                isCur
                                  ? "bg-[#070D19] text-amber-400 border-[#070D19] dark:bg-amber-400 dark:text-slate-950 dark:border-amber-400"
                                  : "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-400"
                              }`}
                            >
                              {cls.name}
                              {cls.section ? ` (${cls.section})` : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Itemized Breakdown Rows (kis chijh ka kitna paisa lag raha) */}
                  {sortedClasses.length === 0 ? (
                    <div className="p-6 text-xs text-slate-500">
                      Class fee structure will appear once configured by School Administration.
                    </div>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[320px] overflow-y-auto">
                        {offerPackageBreakdown.items.map((item, idx) => (
                          <div
                            key={item.key}
                            className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-slate-100">
                                <span className="font-mono text-slate-400 mr-1.5 tabular-nums">
                                  {String(idx + 1).padStart(2, "0")}.
                                </span>
                                {item.label}
                              </p>
                              {item.hint && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                  {item.hint}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                              {item.discountAmount > 0 && (
                                <span className="text-[11px] text-slate-400 line-through">
                                  ₹{item.originalAmount.toLocaleString("en-IN")}
                                </span>
                              )}
                              <span className="text-sm font-bold text-slate-950 dark:text-white">
                                ₹{item.finalAmount.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        ))}

                        {offerPackageBreakdown.items.length === 0 && (
                          <div className="px-5 py-4 text-xs text-slate-500">
                            No one-time admission heads enabled for {offerActiveClass?.name}. Monthly Tuition: ₹
                            {offerPackageBreakdown.monthlyTuition.toLocaleString("en-IN")}/mo
                          </div>
                        )}
                      </div>

                      {/* Optional School Bus Toggle */}
                      {offerPackageBreakdown.busAvailable && offerPackageBreakdown.busFee > 0 && (
                        <div className="px-4 sm:px-5 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                          <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={offerIncludeBus}
                              onChange={(e) => setOfferIncludeBus(e.target.checked)}
                              className="w-4 h-4 accent-amber-500"
                            />
                            <span>Include Optional School Bus (1st Month)</span>
                          </label>
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                            +₹{offerPackageBreakdown.busFee.toLocaleString("en-IN")}
                          </span>
                        </div>
                      )}

                      {/* Obsidian Package Total & Offer Savings Footer */}
                      <div className="bg-[#070D19] text-white p-4 sm:p-5 space-y-4 border-t border-slate-800">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <div className="space-y-1">
                            {offerPackageBreakdown.offerDiscountTotal > 0 ? (
                              <>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-slate-400">Original Package:</span>
                                  <span className="font-mono line-through text-slate-400 tabular-nums">
                                    ₹{offerPackageBreakdown.originalTotal.toLocaleString("en-IN")}
                                  </span>
                                  <span className="text-emerald-400 font-bold font-mono tabular-nums">
                                    Save ₹{offerPackageBreakdown.offerDiscountTotal.toLocaleString("en-IN")} ({offerPackageBreakdown.discountPercent}% OFF)
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300 font-medium">
                                  Offer Payable at Admission ({offerActiveClass?.name})
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-slate-300 font-medium">
                                Total Admission Package ({offerActiveClass?.name})
                              </p>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums leading-none">
                              ₹{offerPackageBreakdown.discountedTotal.toLocaleString("en-IN")}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 font-mono tabular-nums">
                              Monthly Tuition: ₹{offerPackageBreakdown.monthlyTuition.toLocaleString("en-IN")}/mo
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          {admissionsOpen && onOpenAdmission ? (
                            <button
                              type="button"
                              onClick={onOpenAdmission}
                              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <UserPlus className="w-4 h-4 shrink-0" />
                              <span>
                                {offerDiscountPct > 0
                                  ? `Apply Online with ${offerDiscountPct}% OFF`
                                  : "Apply Online Now"}
                              </span>
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => navigateSection("campus")}
                            className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Compare All Classes</span>
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        </div>

                        {admissionOfferCfg?.termsNote && (
                          <p className="text-[11px] text-slate-400 pt-2 border-t border-white/10">
                            {admissionOfferCfg.termsNote}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Asymmetric Editorial Pillars (01, 02, 03) */}
          <section className="max-w-6xl mx-auto px-4 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="space-y-1.5 max-w-2xl">
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Institutional Standards
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Built for Academic Discipline &amp; Complete Parent Clarity
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md leading-relaxed">
                {aboutSchoolText}
              </p>
            </div>

            {hasCustomNonDefaultHighlights && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Marquee Capability Card */}
                  <div className="lg:col-span-7 bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">01.</span>
                        {getUspIcon(0)}
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
                        {usps[0]?.title || DEFAULT_USPS[0].title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                        {usps[0]?.description || DEFAULT_USPS[0].description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>Session {currentSessionLabel}</span>
                        <span aria-hidden="true">·</span>
                        <span>Verified Campus Ledger</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigateSection("verify")}
                        className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Verify Student Record</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right Stacked Editorial Capabilities */}
                  <div className="lg:col-span-5 flex flex-col gap-5">
                    {usps.slice(1, 3).map((usp, idx) => (
                      <div
                        key={idx}
                        className="flex-1 bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                              0{idx + 2}.
                            </span>
                            {getUspIcon(idx + 1)}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                            {usp.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {usp.description}
                          </p>
                        </div>
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => navigateSection(idx === 0 ? "verify" : "campus")}
                            className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-amber-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{idx === 0 ? "Open Verification Desk" : "Inspect Class Fee Chart"}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Academic Stages / Wings Architectural Strip */}
            <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { stage: "Pre-Primary", grades: "Nursery · KG-1 · KG-2", focus: "Phonics, early numeracy & activity care" },
                { stage: "Primary Wing", grades: "Class 1 – Class 5", focus: "Foundational literacy, math & curiosity" },
                { stage: "Middle School", grades: "Class 6 – Class 8", focus: "STEM labs, languages & analytical reasoning" },
                { stage: "Senior Academy", grades: "Class 9 – Class 12", focus: "Board readiness, mentoring & career clarity" },
              ].map((wing, i) => (
                <div
                  key={wing.stage}
                  className={i > 0 ? "sm:border-l sm:border-slate-200 sm:dark:border-slate-800 sm:pl-6 space-y-1.5" : "space-y-1.5"}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{wing.grades}</span>
                    <GraduationCap className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">{wing.stage}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{wing.focus}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 1 & 2: SMART CAMPUS ERP SHOWCASE (1. Hero / USP Innovations & 2. For Parents & Students) */}
          <section className="max-w-6xl mx-auto px-4 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
              <div className="space-y-1.5 max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Smart School ERP Ecosystem
                </p>
                <h2
                  className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Next-Gen Campus Technology &amp; Parent Convenience
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Real-time safety, zero-cost parent communication, online admissions, and verified academic records powered directly inside our School ERP.
                </p>
              </div>

              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 self-start md:self-auto">
                {[
                  { id: "ALL" as const, label: "All (1 & 2)" },
                  { id: "USP" as const, label: "1. Smart USPs" },
                  { id: "PARENTS" as const, label: "2. Parents & Students" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setErpShowcaseTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      erpShowcaseTab === tab.id
                        ? "bg-[#070D19] text-amber-400 dark:bg-amber-400 dark:text-slate-950 shadow-2xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PART 1: Hero / USP Innovations */}
            {(erpShowcaseTab === "ALL" || erpShowcaseTab === "USP") && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-amber-400/15 text-amber-700 dark:text-amber-300 border border-amber-400/30">
                      01
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                      Smart Campus USP Highlights
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    ₹0 Biometric Hardware · ₹0 WhatsApp API Fees
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* USP 1: AI Face & QR Attendance */}
                  <div className="bg-[#070D19] text-white rounded-2xl p-5 sm:p-6 border border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-400 flex items-center justify-center shrink-0">
                          <ScanFace className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          2-Sec Check-In
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-white">
                        AI Face Recognition &amp; QR Attendance
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Contactless morning gate check-in via smartphone or tablet — no expensive biometric hardware needed. Parents receive instant arrival push alerts and automated absentee follow-up.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5" />
                        Instant Parent Gate Alert
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateSection("verify")}
                        className="font-bold text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Verify Student ID</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* USP 2: NSTA Messenger */}
                  <div className="bg-white dark:bg-[#0B1324] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                          Zero API Cost
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white">
                        NSTA Messenger (School-Controlled Chat)
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Built-in WhatsApp-style suite featuring Class-wise Notice Broadcasts, Official School Desk, and secure 1-on-1 Teacher-Parent messaging without third-party SMS or WhatsApp API fees.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        Direct School Desk Support
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNstaChatOpen(true)}
                        className="font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open NSTA Messenger</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* USP 3: Live GPS Bus Tracking */}
                  <div className="bg-white dark:bg-[#0B1324] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                          <Bus className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Live GPS &amp; Siren
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white">
                        Live GPS Bus Tracking &amp; Proximity Alert
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Track real-time school bus location on Google Maps from the Driver Console and receive an automatic 1km arrival proximity siren before the bus reaches your pickup stop.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {configuredRoutes.length > 0
                          ? `${configuredRoutes.length} Active Bus Route${configuredRoutes.length > 1 ? "s" : ""}`
                          : "Route Safety Active"}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateSection("campus")}
                        className="font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View Bus &amp; Fee Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* USP 4: 1-Click QR Fee, Receipts & Passbook */}
                  <div className="bg-white dark:bg-[#0B1324] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <ReceiptText className="w-5 h-5" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          Instant PDF Slip
                        </span>
                      </div>
                      <h4 className="text-lg font-bold text-slate-950 dark:text-white">
                        1-Click Fee Receipts, QR Pay &amp; Passbook
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Automated monthly demand slips with sibling &amp; early-bird discounts, direct QR fee scanning, 3-inch thermal POS receipts, and a 12-month digital fee passbook for parents.
                      </p>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        100% Transparent Ledger
                      </span>
                      <button
                        type="button"
                        onClick={() => navigateSection("campus")}
                        className="font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open Fee Calculator</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PART 2: For Parents & Students */}
            {(erpShowcaseTab === "ALL" || erpShowcaseTab === "PARENTS") && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                      02
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                      Built for Parents &amp; Students
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    Admissions · Academics · Verified Records
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Parent Feature 1: Online Admission & Entrance Test */}
                  <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <UserPlus className="w-5 h-5 text-amber-500" />
                        <span className="font-mono text-[11px] font-bold text-slate-400">01.</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-950 dark:text-white">
                        Online Admission &amp; Entrance Test
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Apply from home, upload student documents, attempt the online entrance test for scholarship merit, and track live application approval status.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenAdmission ? onOpenAdmission() : navigateSection("admissions")
                      }
                      className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start"
                    >
                      <span>{admissionsOpen ? "Apply Online Now" : "Check Admission Portal"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parent Feature 2: Live Homework, Smart Class & Video Lectures */}
                  <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-mono text-[11px] font-bold text-slate-400">02.</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-950 dark:text-white">
                        Homework, Smart Class &amp; Video Lectures
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Daily class homework, chapter-wise study notes, syllabus pacing, and recorded YouTube classroom lectures accessible anytime inside the Student Portal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => (onSwitchToPortal || onOpenAccount)?.()}
                      className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start"
                    >
                      <span>{isAuthenticated ? portalButtonLabel : "Open Student Portal"}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parent Feature 3: QR-Verified Marksheets & Certificates */}
                  <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <FileCheck2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-mono text-[11px] font-bold text-slate-400">03.</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-950 dark:text-white">
                        QR-Verified Marksheets &amp; Certificates
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Instant access to exam report cards, admit cards, Transfer Certificates (TC), and Bonafide records — each secured with scannable QR verification.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateSection("verify")}
                      className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start"
                    >
                      <span>Verify Certificate / Result</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parent Feature 4: Parent-Teacher Query, Leave & PTM Desk */}
                  <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <MessageCircle className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                        <span className="font-mono text-[11px] font-bold text-slate-400">04.</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-950 dark:text-white">
                        Parent Leave, PTM &amp; Teacher Query Desk
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Submit planned student leaves with return dates, book PTM slots, and ask subject queries directly to class teachers with tracked replies.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNstaChatOpen(true)}
                      className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 cursor-pointer self-start"
                    >
                      <span>Chat with School Desk</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Parent Feature 5: School Store & Uniform/Book Reservations */}
                  <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 sm:col-span-2 lg:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-2.5 max-w-xl">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                          <span className="font-mono text-[11px] font-bold text-slate-400">05.</span>
                        </div>
                        <h4 className="text-base font-bold text-slate-950 dark:text-white">
                          Live School Store &amp; 24-Hour Pickup Reservations
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          Check real-time school inventory for uniforms, textbooks, notebooks, and ID badges. Reserve items online with zero upfront payment and collect at the campus counter with a 24-hour pickup voucher.
                        </p>
                      </div>
                      <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => (onSwitchToPortal || onOpenAccount)?.()}
                          className="px-4 py-2 rounded-lg bg-[#070D19] dark:bg-amber-400 text-white dark:text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Open School Store</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Principal Message (Editorial Broadsheet — Separated from Director) */}
          <section className="max-w-6xl mx-auto px-4">
            <div className="bg-[#070D19] text-white rounded-2xl p-6 sm:p-10 border border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-3 flex flex-col items-center md:items-start gap-3.5">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-slate-900 border border-white/15 flex items-center justify-center">
                  {allowCustomWebsite && school.principalPhotoUrl ? (
                    <img
                      src={school.principalPhotoUrl}
                      alt={school.principalName || "Principal"}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span
                      className="text-3xl font-bold text-amber-400"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {(school.principalName || school.name || "PR").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <div className="text-sm font-bold text-white">{school.principalName || "Academic Principal"}</div>
                  <div className="text-xs text-amber-400 font-medium mt-0.5">Principal</div>
                </div>
              </div>
              <div className="md:col-span-9 space-y-3">
                <p className="text-xs font-semibold text-amber-400 tracking-wide">
                  From the Principal's Desk
                </p>
                <blockquote
                  className="text-base sm:text-xl text-slate-100 leading-relaxed italic"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  “{principalMessage}”
                </blockquote>
              </div>
            </div>
          </section>

          {/* Separated Institutional Leadership, Website Team & Global Developer */}
          {(() => {
            const subPrincipalNameVal = (
              allowCustomWebsite
                ? school.subPrincipalName || websiteCfg.subPrincipalName
                : school.subPrincipalName
            )?.trim();
            const subPrincipalPhotoVal = allowCustomWebsite
              ? school.subPrincipalPhotoUrl || websiteCfg.subPrincipalPhotoUrl || ""
              : "";

            const directorNameVal = (school.directorName || "").trim();
            const directorPhotoVal = allowCustomWebsite
              ? school.directorPhotoUrl || websiteCfg.directorPhotoUrl || ""
              : "";

            const managerNameVal = (school.managerName || "").trim();
            const managerPhotoVal = allowCustomWebsite
              ? school.managerPhotoUrl || websiteCfg.managerPhotoUrl || ""
              : "";

            // Accountant on Website uses ONLY websiteConfig fields (separate from ERP school.accountantName)
            const websiteAccountantNameVal = allowCustomWebsite
              ? (websiteCfg.websiteAccountantName || "").trim()
              : "";
            const websiteAccountantPhotoVal = allowCustomWebsite
              ? websiteCfg.websiteAccountantPhotoUrl || ""
              : "";

            const digitalCreatorNameVal = (
              allowCustomWebsite
                ? school.digitalCreatorName || websiteCfg.digitalCreatorName
                : school.digitalCreatorName
            )?.trim();
            const digitalCreatorPhotoVal = allowCustomWebsite
              ? school.digitalCreatorPhotoUrl || websiteCfg.digitalCreatorPhotoUrl || ""
              : "";

            const roleCards: {
              id: string;
              role: string;
              name: string;
              photoUrl: string;
              subText?: string;
              isDeveloper?: boolean;
            }[] = [];

            if (directorNameVal || directorPhotoVal) {
              roleCards.push({
                id: "director",
                role: "Director",
                name: directorNameVal || "School Director",
                photoUrl: directorPhotoVal,
              });
            }
            if (subPrincipalNameVal || subPrincipalPhotoVal) {
              roleCards.push({
                id: "sub_principal",
                role: "Sub Principal",
                name: subPrincipalNameVal || "Sub Principal",
                photoUrl: subPrincipalPhotoVal,
              });
            }
            if (managerNameVal || managerPhotoVal) {
              roleCards.push({
                id: "manager",
                role: "Manager",
                name: managerNameVal || "School Manager",
                photoUrl: managerPhotoVal,
              });
            }
            if (websiteAccountantNameVal || websiteAccountantPhotoVal) {
              roleCards.push({
                id: "accountant",
                role: "Accountant",
                name: websiteAccountantNameVal || "Accounts Desk",
                photoUrl: websiteAccountantPhotoVal,
              });
            }
            if (digitalCreatorNameVal || digitalCreatorPhotoVal) {
              roleCards.push({
                id: "digital_creator",
                role: "Tech & Digital Media Incharge",
                name: digitalCreatorNameVal || "Tech & Digital Media Incharge",
                photoUrl: digitalCreatorPhotoVal,
              });
            }

            // Global Developer is ALWAYS displayed identically across all schools until Life Maker updates it
            roleCards.push({
              id: "developer",
              role: "Developer",
              name: globalDeveloper.name,
              photoUrl: globalDeveloper.photoUrl,
              subText: globalDeveloper.organization,
              isDeveloper: true,
            });

            return (
              <section className="max-w-6xl mx-auto px-4 space-y-5">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
                  <h3
                    className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    School Leadership &amp; Digital Team
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Administration, campus management, and platform engineering pillars.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roleCards.map((card) => (
                    <div
                      key={card.id}
                      className={`rounded-xl p-4 flex items-center gap-4 border ${
                        card.isDeveloper
                          ? "bg-[#070D19] text-white border-slate-800"
                          : "bg-white dark:bg-[#0B1324] border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 overflow-hidden font-bold ${
                          card.isDeveloper
                            ? "bg-slate-900 border border-amber-400/40 text-amber-400"
                            : "bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-amber-400"
                        }`}
                      >
                        {card.photoUrl ? (
                          <img
                            src={card.photoUrl}
                            alt={`${card.name} - ${card.role}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-base">{card.name.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-[11px] font-bold uppercase tracking-wider ${
                              card.isDeveloper
                                ? "text-amber-400"
                                : "text-indigo-600 dark:text-amber-400"
                            }`}
                          >
                            {card.role}
                          </span>
                          {card.isDeveloper && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[10px] font-bold shrink-0">
                              <Code2 className="w-2.5 h-2.5" />
                              <span>{card.subText || "Life Maker"}</span>
                            </span>
                          )}
                        </div>
                        <h4
                          className={`text-sm font-bold truncate mt-0.5 ${
                            card.isDeveloper ? "text-white" : "text-slate-950 dark:text-white"
                          }`}
                        >
                          {card.name}
                        </h4>
                        {card.isDeveloper && globalDeveloper.roleTitle && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {globalDeveloper.roleTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Featured Faculty Directory */}
          {visibleTeachers.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3
                    className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    Faculty &amp; Subject Mentors
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">
                    Dedicated educators guiding every classroom with consistency and care.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigateSection("campus")}
                  className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  View All Faculty ({visibleTeachers.length}) →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {visibleTeachers.slice(0, 8).map((t) => (
                  <div
                    key={t.id}
                    className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {allowCustomWebsite && t.photoUrl ? (
                        <img
                          src={t.photoUrl}
                          alt={t.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        t.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white truncate">{t.name}</h4>
                      <p className="text-xs text-indigo-600 dark:text-amber-400 font-medium truncate">
                        {t.designation || t.qualification || "Faculty"}
                      </p>
                      {t.experience && <p className="text-[11px] text-slate-500 truncate">{t.experience}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* School Memories & Photo Gallery Preview */}
          <section className="max-w-6xl mx-auto px-4 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h3
                  className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Campus Memories &amp; Life
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Annual functions, science exhibitions, sports tournaments, and daily campus moments.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigateSection("gallery")}
                className="text-xs font-bold text-indigo-600 dark:text-amber-400 hover:underline cursor-pointer"
              >
                Open Full Gallery ({showcaseGallery.length}) →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {showcaseGallery.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveMemoryPreview(item)}
                  className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-left hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer group"
                >
                  <div className="aspect-[4/3] bg-slate-950 relative overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                    {item.mediaType === "VIDEO" && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                        <PlayCircle className="w-10 h-10" />
                      </span>
                    )}
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <div className="text-[11px] text-amber-300 font-medium">
                        {item.category} {item.date ? `· ${item.date}` : ""}
                      </div>
                      <h4 className="text-sm font-bold truncate mt-0.5">{item.title}</h4>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Official Social Pages & WhatsApp Group Community Strip */}
          <section className="max-w-6xl mx-auto px-4 space-y-5">
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3
                  className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Official Social Pages &amp; Community
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Tap any active channel below to visit {school.name}&apos;s official page or join our WhatsApp community.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {socialChannels.map((ch) => {
                const isActive = Boolean(ch.url);
                if (isActive) {
                  return (
                    <a
                      key={ch.key}
                      href={ch.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-xl p-4 border bg-white dark:bg-[#0B1324] flex items-center gap-3.5 transition shadow-2xs hover:shadow-md group ${ch.activeBorder}`}
                    >
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${ch.activeIconBg}`}
                      >
                        {renderSocialPlatformIcon(ch.key, "w-5 h-5")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-950 dark:text-white truncate">
                            {ch.label}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate flex items-center gap-1 mt-0.5">
                          <span>{ch.actionLabel}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </p>
                      </div>
                    </a>
                  );
                }

                return (
                  <div
                    key={ch.key}
                    aria-disabled="true"
                    title={`${ch.label} link not added yet`}
                    className="rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/40 flex items-center gap-3.5 opacity-60 select-none"
                  >
                    <div className="w-11 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                      {renderSocialPlatformIcon(ch.key, "w-5 h-5")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate block">
                        {ch.label}
                      </span>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">Link Not Added</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 2: VIRTUAL CAMPUS TOUR, TRANSPARENT FEE STRUCTURE & FACULTY */}
      {activeSection === "campus" && (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-12">
          <section className="space-y-5">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Learning Environment</p>
              <h2
                className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white tracking-tight mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                Campus Facilities &amp; Infrastructure
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {
                  img: heroBannerUrl || campusHeroImg,
                  title: "Safe Academic Block",
                  desc: "CCTV-monitored campus gates, spacious ventilated classrooms, and clean drinking water stations.",
                },
                {
                  img: smartLabImg,
                  title: "Smart Classrooms & STEM Labs",
                  desc: "Interactive digital boards, computer workspace, and hands-on science experiment kits.",
                },
                {
                  img: sportsArenaImg,
                  title: "Sports & Athletics Arena",
                  desc: "Dedicated running track, outdoor games ground, and trained physical education mentors.",
                },
              ].map((spot) => (
                <div
                  key={spot.title}
                  className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden"
                >
                  <div className="aspect-[4/3] bg-slate-950">
                    <img
                      src={spot.img}
                      alt={spot.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-5 space-y-1.5">
                    <h3 className="text-sm font-bold text-slate-950 dark:text-white">{spot.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{spot.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Transparent Class-Wise Fee Structure & Seat Matrix */}
          <section className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3
                  className="text-xl font-bold text-slate-950 dark:text-white"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Transparent Class-Wise Fee Structure &amp; Seats
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Official session {currentSessionLabel} fee schedule ({sortedClasses.length} unique classes).
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto no-scrollbar">
                  {(
                    [
                      { id: "ALL", label: "All" },
                      { id: "PRE_PRIMARY", label: "Pre-Primary" },
                      { id: "PRIMARY", label: "1–5" },
                      { id: "SENIOR", label: "6–12" },
                    ] as { id: WingFilter; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setWingFilter(tab.id)}
                      className={`h-8 px-3 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-colors cursor-pointer ${
                        wingFilter === tab.id
                          ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                {admissionsOpen && onOpenAdmission && (
                  <button
                    type="button"
                    onClick={onOpenAdmission}
                    className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Apply Online
                  </button>
                )}
              </div>
            </div>
            {filteredTableClasses.length === 0 ? (
              <div className="p-6 text-xs text-slate-500">
                Class fee structure will appear once configured by School Admin.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Class</th>
                      <th className="py-3 px-4 font-semibold">
                        Admission Package{offerDiscountPct > 0 ? ` (${offerDiscountPct}% OFF)` : ""}
                      </th>
                      <th className="py-3 px-4 font-semibold">Monthly Tuition</th>
                      <th className="py-3 px-4 font-semibold">Annual / Exam</th>
                      <th className="py-3 px-4 font-semibold">Vacant Seats</th>
                      <th className="py-3 px-4 text-right font-semibold">Calculator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredTableClasses.map((c) => {
                      const fs = c.feeStructure;
                      const cfg = seatConfigs.find((s) => s.classId === c.id);
                      const totalSeats = cfg?.totalSeats ?? 40;
                      const occupied = studentsList.filter((st) => isStudentInClass(st, c.id, c.name)).length;
                      const vacant = Math.max(0, totalSeats - occupied - (cfg?.reservedSeats ?? 0));
                      const pkg = computeClassAdmissionOfferBreakdown(c, admissionOfferCfg);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-slate-950 dark:text-white">
                            {c.name} {c.section ? `(${c.section})` : ""}
                          </td>
                          <td className="py-3.5 px-4 tabular-nums font-mono">
                            {pkg.offerDiscountTotal > 0 ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                                  ₹{pkg.discountedTotal.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[10px] text-slate-400 line-through">
                                  ₹{pkg.originalTotal.toLocaleString("en-IN")}
                                </span>
                              </div>
                            ) : (
                              <span>
                                ₹{(pkg.originalTotal || Number(fs?.admissionFee ?? 2500)).toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 tabular-nums font-mono">
                            ₹{Number(fs?.tuitionFee ?? c.defaultFee ?? 0).toLocaleString("en-IN")}/mo
                          </td>
                          <td className="py-3.5 px-4 tabular-nums font-mono">
                            ₹{Number((fs?.annualCharges || 0) + (fs?.examinationFee || 0)).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4 font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
                            {vacant} / {totalSeats} Open
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => jumpToEstimateClass(c.id)}
                              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
                            >
                              Estimate →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Faculty Directory */}
          <section className="space-y-4">
            <h3
              className="text-2xl font-bold text-slate-950 dark:text-white"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Experienced Faculty Directory
            </h3>
            {visibleTeachers.length === 0 ? (
              <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-xs text-slate-500">
                Faculty profiles update automatically from the School Staff Directory.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleTeachers.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-start gap-3.5"
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden">
                      {allowCustomWebsite && t.photoUrl ? (
                        <img
                          src={t.photoUrl}
                          alt={t.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        t.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-950 dark:text-white truncate">{t.name}</h4>
                      <p className="text-xs text-indigo-600 dark:text-amber-400 font-medium">
                        {t.designation || t.qualification || "Subject Faculty"}
                      </p>
                      {t.experience && <p className="text-[11px] text-slate-500 mt-0.5">{t.experience}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* SECTION 3: CAMPUS MEMORIES & PHOTO GALLERY */}
      {activeSection === "gallery" && (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
            <div>
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Campus Archive</p>
              <h2
                className="text-2xl sm:text-3xl font-bold flex items-center gap-2 mt-1"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                <Camera className="w-6 h-6 text-amber-500" />
                <span>School Memories &amp; Photo Gallery</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Highlights from annual functions, sports day, science exhibitions, and campus activities.
              </p>
            </div>
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto no-scrollbar w-full sm:w-auto max-w-full">
              {[
                { id: "ALL", label: `All (${showcaseGallery.length})` },
                { id: "PHOTOS", label: "Photos" },
                { id: "VIDEOS", label: "Videos" },
                { id: "ANNUAL", label: "Annual Fest" },
                { id: "SPORTS", label: "Sports" },
                { id: "EXPO", label: "Science Expo" },
                { id: "CAMPUS", label: "Campus" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGalleryFilter(tab.id)}
                  className={`h-9 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center justify-center cursor-pointer transition-colors ${
                    galleryFilter === tab.id
                      ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs border border-slate-200/70 dark:border-slate-700"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGallery.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveMemoryPreview(item)}
                className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden text-left hover:border-slate-400 dark:hover:border-slate-600 transition-colors cursor-pointer group"
              >
                <div className="aspect-[4/3] bg-slate-950 relative overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {item.mediaType === "VIDEO" && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                      <PlayCircle className="w-12 h-12" />
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {item.category} {item.date ? `· ${item.date}` : ""}
                  </div>
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </button>
            ))}
            {filteredGallery.length === 0 && (
              <div className="col-span-full text-center py-12 text-xs text-slate-500 bg-white dark:bg-[#0B1324] rounded-2xl border border-slate-200 dark:border-slate-800">
                No memories available in this category yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 4: ADMISSION TRACKER, SCHOLARSHIP CALCULATOR & CAMPUS VISIT */}
      {activeSection === "admissions" && (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
          {admissionsOpen && onOpenAdmission && (
            <div className="bg-[#070D19] text-white rounded-2xl p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-amber-400">
                  {heroBadge}
                </p>
                <h3
                  className="text-xl sm:text-2xl font-bold mt-1"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Online Admission Form · {school.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {isOctToMarWindow ? `नए सत्र ${sessionLabel}` : `सत्र ${sessionLabel}`} के लिए घर बैठे बच्चे का ऑनलाइन रजिस्ट्रेशन व प्रवेश आवेदन भरें।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEntranceTestOpen(true)}
                  className="px-5 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center gap-2 shrink-0 cursor-pointer transition-colors"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Take Free Test (Class 1–8)</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAdmission}
                  className="px-6 py-3 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shrink-0 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Fill Online Form</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Online Admission Status Tracker */}
            <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-500" />
                <span>Track Admission Application Status</span>
              </h3>
              <p className="text-xs text-slate-500">
                Enter your Application Number (e.g. APP-2027-...) or registered 10-digit parent mobile number.
              </p>
              <form onSubmit={handleTrackStatus} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={statusQuery}
                  onChange={(e) => setStatusQuery(e.target.value)}
                  placeholder="Application No. or Mobile..."
                  className="flex-1 min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[42px] px-4 py-2 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Check Status
                </button>
              </form>

              {statusSearched &&
                (matchedApps.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>No admission application found matching "{statusQuery}".</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {matchedApps.map((app) => (
                      <div
                        key={app.id}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <strong className="font-mono text-indigo-600 dark:text-indigo-400">
                            {app.applicationNo}
                          </strong>
                          <span
                            className={`font-bold uppercase ${
                              app.status === "rejected"
                                ? "text-rose-600 dark:text-rose-400"
                                : app.status === "pending"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <p className="font-bold">
                          {app.studentName} · {app.className}
                        </p>
                        <p className="text-slate-500">
                          Submitted:{" "}
                          {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString("en-IN") : "Recently"}
                        </p>
                        {app.status === "rejected" && (
                          <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-2">
                            <p className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                              Reason:{" "}
                              {app.rejectionReason || app.remarks || "Verification failed / Incomplete payment proof"}
                            </p>
                            {onOpenAdmission && (
                              <button
                                type="button"
                                onClick={() => {
                                  try {
                                    localStorage.setItem(
                                      "nsta_parent_portal_phone",
                                      app.phone || app.applicationNo || ""
                                    );
                                  } catch {}
                                  onOpenAdmission();
                                }}
                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Resubmit with Screenshot &amp; UTR</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
            </div>

            {/* Sibling & Scholarship Estimator */}
            <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-emerald-500" />
                  <span>Sibling &amp; Merit Fee Calculator</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                  {sortedClasses.length} Classes
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Select Class</label>
                  <select
                    value={calcClassId}
                    onChange={(e) => setCalcClassId(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    {sortedClasses.length === 0 ? (
                      <option value="">Standard Tuition</option>
                    ) : (
                      sortedClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Children Studying Together</label>
                  <select
                    value={calcSiblings}
                    onChange={(e) => setCalcSiblings(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  >
                    <option value={1}>1 Child</option>
                    <option value={2}>2+ Siblings (10% Tuition Discount)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Previous Exam % (Merit)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={calcMeritPct}
                    onChange={(e) => setCalcMeritPct(Number(e.target.value))}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={calcUseBus}
                      onChange={(e) => setCalcUseBus(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                    />
                    <span>Include School Bus</span>
                  </label>
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[11px] text-slate-500 block">Standard Tuition</span>
                  <span className="text-sm font-bold font-mono tabular-nums">₹{feeEstimate.baseMonthly}/mo</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Concession</span>
                  <span className="text-sm font-bold text-emerald-600 font-mono tabular-nums">
                    -₹{feeEstimate.monthlySavings}/mo
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Net Monthly</span>
                  <span className="text-base font-bold text-indigo-600 dark:text-amber-400 font-mono tabular-nums">
                    ₹{feeEstimate.netMonthly}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1">
                <span>
                  Admission Package (Selected Class
                  {feeEstimate.admOfferSavings > 0 ? ` · ${feeEstimate.admOfferPct}% OFF` : ""}):
                </span>
                <span className="font-mono tabular-nums flex items-center gap-2">
                  {feeEstimate.admOfferSavings > 0 && (
                    <span className="line-through text-slate-400">
                      ₹{feeEstimate.admOriginalFee.toLocaleString("en-IN")}
                    </span>
                  )}
                  <strong className="text-slate-900 dark:text-slate-100">
                    ₹{feeEstimate.admFee.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Book a Campus Visit Form */}
          <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-500" />
              <span>Book a Guided Campus Tour &amp; Counselling</span>
            </h3>
            <form
              onSubmit={(e) => handleInquirySubmit(e, true)}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs"
            >
              <input
                required
                type="text"
                placeholder="Parent Name *"
                value={inquiryParent}
                onChange={(e) => setInquiryParent(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                type="text"
                placeholder="Child Name"
                value={inquiryStudent}
                onChange={(e) => setInquiryStudent(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                required
                type="tel"
                placeholder="Mobile Number *"
                value={inquiryPhone}
                onChange={(e) => setInquiryPhone(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                type="date"
                value={inquiryVisitDate}
                onChange={(e) => setInquiryVisitDate(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <select
                value={inquiryClass}
                onChange={(e) => setInquiryClass(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              >
                {sortedClasses.length === 0 ? (
                  <option value="Class 1">Class 1</option>
                ) : (
                  sortedClasses.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} {c.section ? `(${c.section})` : ""}
                    </option>
                  ))
                )}
              </select>
              <input
                type="text"
                placeholder="Preferred Time (10:30 AM)"
                value={inquiryVisitTime}
                onChange={(e) => setInquiryVisitTime(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <input
                type="text"
                placeholder="Notes / Bus Route Query"
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
              />
              <button
                type="submit"
                disabled={inquirySending}
                className="min-h-[42px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors"
              >
                {inquirySending ? "Booking..." : "Schedule Campus Visit"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 5: REAL QR CODE DOCUMENT VERIFICATION */}
      {activeSection === "verify" && (
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
          <div className="bg-white dark:bg-[#0B1324] p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-7 h-7 text-emerald-500 shrink-0" />
              <div>
                <h3
                  className="text-xl font-bold"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  Official Document Verification Portal
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scan the official QR code on any Marksheet, Certificate, or Student ID Card issued by {school.name}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
              {(["marksheet", "certificate", "idcard"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setVerifyType(t);
                    setVerifySearched(false);
                    setVerifyError(null);
                    setVerifiedResult(null);
                  }}
                  className={`h-9 px-2 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-colors cursor-pointer ${
                    verifyType === t
                      ? "bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-2xs"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  {t === "marksheet" ? "Marksheet" : t === "certificate" ? "Certificate" : "Student ID"}
                </button>
              ))}
            </div>

            {/* Primary QR Code Verification Box */}
            <div className="p-4 sm:p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-950 dark:text-white">
                    Verify Document by QR Code
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Use your camera to scan the printed QR code on the Marksheet, Certificate, or Student ID Card, or upload a photo of the QR code.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setVerifyError(null);
                    setIsQrScannerOpen(true);
                  }}
                  className="flex-1 min-w-[180px] min-h-[42px] px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  <Camera className="w-4 h-4 shrink-0" />
                  <span>Scan Document QR Code</span>
                </button>
                <input
                  type="file"
                  ref={qrFileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleDocQrFileUpload}
                />
                <button
                  type="button"
                  disabled={qrFileScanning}
                  onClick={() => qrFileInputRef.current?.click()}
                  className="min-h-[42px] px-4 py-2.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                >
                  {qrFileScanning ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
                  ) : (
                    <Upload className="w-4 h-4 text-indigo-500 shrink-0" />
                  )}
                  <span>{qrFileScanning ? "Scanning Image..." : "Upload QR Image"}</span>
                </button>
              </div>
              <div id="website-doc-qr-file-helper" className="hidden" />
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              <span className="whitespace-nowrap">Or verify manually by Roll / Admission / Certificate No</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <form onSubmit={handleVerifySearch} className="flex gap-2">
              <input
                type="text"
                required
                value={verifySearchQuery}
                onChange={(e) => setVerifySearchQuery(e.target.value)}
                placeholder={
                  verifyType === "certificate"
                    ? "Enter Certificate Serial No or Roll No..."
                    : "Enter Student Roll No or Admission No..."
                }
                className="flex-1 min-w-0 min-h-[42px] px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
              />
              <button
                type="submit"
                className="min-h-[42px] px-5 py-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Verify</span>
              </button>
            </form>
          </div>

          {verifyError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700 p-4 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{verifyError}</span>
            </div>
          )}

          {verifySearched && !verifyError && !verifiedResult && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-4 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                No matching student or certificate record found in {school.name} registry for "{verifySearchQuery}".
              </span>
            </div>
          )}

          {verifiedResult && (
            <div className="bg-white dark:bg-[#0B1324] p-6 rounded-2xl border-2 border-emerald-500 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>
                    {verifiedResult.qrVerified ? "Verified Authentic via Document QR Code" : "Verified Authentic Record"}
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400 tabular-nums">{verifiedResult.date}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs p-4 bg-slate-50 dark:bg-slate-950 rounded-xl">
                <div>
                  <span className="text-slate-400 block">Student Name</span>
                  <span className="font-bold text-sm">{verifiedResult.student}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Roll / Serial No</span>
                  <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                    {verifiedResult.roll}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Class</span>
                  <span className="font-bold">{verifiedResult.class}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{verifiedResult.status}</span>
                </div>
                {verifiedResult.regNo && verifiedResult.regNo !== "—" && (
                  <div>
                    <span className="text-slate-400 block">Admission / Reg No</span>
                    <span className="font-bold font-mono tabular-nums">{verifiedResult.regNo}</span>
                  </div>
                )}
                {verifiedResult.total && (
                  <div>
                    <span className="text-slate-400 block">Summary</span>
                    <span className="font-bold">{verifiedResult.total}</span>
                  </div>
                )}
              </div>
              {onOpenVerification && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenVerification(verifiedResult.type, JSON.stringify(verifiedResult))}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Full Record</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SECTION 6: CONTACT & GENERAL ENQUIRY */}
      {activeSection === "contact" && (
        <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5 space-y-4">
            <h3
              className="text-2xl font-bold"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Contact Admissions Office
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Reach out for admissions, fee structure queries, transport route availability, or campus appointments.
            </p>
            <div className="space-y-3 pt-2 text-xs font-medium">
              {school.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span>{school.address}</span>
                </div>
              )}
              {school.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="tabular-nums font-mono">{school.phone}</span>
                </div>
              )}
              {school.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{school.email}</span>
                </div>
              )}
              {websiteCfg.officeHours && (
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{websiteCfg.officeHours}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              {cleanPhoneDigits.length >= 10 && (
                <button
                  type="button"
                  onClick={() =>
                    safeOpenExternalUrl(
                      `https://wa.me/91${cleanPhoneDigits.slice(-10)}?text=${encodeURIComponent(
                        `Hello ${school.name}, I would like admission & fee details for session ${sessionLabel}.`
                      )}`
                    )
                  }
                  className="min-h-[42px] px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Desk</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsNstaChatOpen(true)}
                className="min-h-[42px] px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>NSTA Messenger</span>
              </button>
              {websiteCfg.googleMapsUrl && (
                <button
                  type="button"
                  onClick={() => safeOpenExternalUrl(websiteCfg.googleMapsUrl!)}
                  className="min-h-[42px] px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Open Campus Map</span>
                </button>
              )}
            </div>

            {/* Official Social Pages Icons */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Official Pages &amp; WhatsApp Group
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {socialChannels.map((ch) => {
                  const isActive = Boolean(ch.url);
                  if (isActive) {
                    return (
                      <a
                        key={ch.key}
                        href={ch.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${ch.label}`}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-white dark:bg-[#0B1324] text-xs font-bold text-slate-900 dark:text-white transition hover:shadow-sm ${ch.activeBorder}`}
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${ch.activeIconBg}`}>
                          {renderSocialPlatformIcon(ch.key, "w-4 h-4")}
                        </span>
                        <span>{ch.label}</span>
                      </a>
                    );
                  }
                  return (
                    <span
                      key={ch.key}
                      aria-disabled="true"
                      title={`${ch.label} link not added yet`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs font-semibold text-slate-400 opacity-60 select-none"
                    >
                      <span className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                        {renderSocialPlatformIcon(ch.key, "w-4 h-4")}
                      </span>
                      <span>{ch.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="md:col-span-7 bg-white dark:bg-[#0B1324] p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
            {inquirySent ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-base">Inquiry Submitted!</h4>
                <p className="text-xs text-slate-500">
                  Our admissions team has received your inquiry in the School CRM.
                </p>
                <button
                  type="button"
                  onClick={() => setInquirySent(false)}
                  className="mt-3 px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Send another inquiry
                </button>
              </div>
            ) : (
              <form onSubmit={(e) => handleInquirySubmit(e, false)} className="space-y-3 text-xs">
                <h4 className="font-bold text-sm mb-2">Send Admission Enquiry</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    required
                    type="text"
                    placeholder="Parent Name *"
                    value={inquiryParent}
                    onChange={(e) => setInquiryParent(e.target.value)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={inquiryStudent}
                    onChange={(e) => setInquiryStudent(e.target.value)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    required
                    type="tel"
                    placeholder="Phone Number *"
                    value={inquiryPhone}
                    onChange={(e) => setInquiryPhone(e.target.value)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    placeholder="Class Seeking"
                    value={inquiryClass}
                    onChange={(e) => setInquiryClass(e.target.value)}
                    className="min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Ask about admissions, fees, scholarship, or bus route..."
                  value={inquiryMessage}
                  onChange={(e) => setInquiryMessage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700"
                />
                <button
                  type="submit"
                  disabled={inquirySending}
                  className="w-full min-h-[42px] py-2.5 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{inquirySending ? "Sending..." : "Submit Inquiry"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MEMORY LIGHTBOX PREVIEW MODAL */}
      {activeMemoryPreview && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden text-white">
            <div className="relative aspect-video bg-black flex items-center justify-center">
              {activeMemoryPreview.videoUrl ? (
                <iframe
                  src={String(activeMemoryPreview.videoUrl).replace("watch?v=", "embed/")}
                  title={activeMemoryPreview.title}
                  className="w-full h-full border-0"
                  allowFullScreen
                />
              ) : (
                <img
                  src={activeMemoryPreview.imageUrl}
                  alt={activeMemoryPreview.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              )}
              <button
                type="button"
                onClick={() => setActiveMemoryPreview(null)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-1">
              <div className="text-xs text-amber-400 font-semibold">
                {activeMemoryPreview.category} {activeMemoryPreview.date ? `· ${activeMemoryPreview.date}` : ""}
              </div>
              <h4 className="text-base font-bold">{activeMemoryPreview.title}</h4>
              {activeMemoryPreview.description && (
                <p className="text-xs text-slate-300">{activeMemoryPreview.description}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LIVE CAMERA QR SCANNER MODAL FOR DOCUMENT VERIFICATION */}
      {isQrScannerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsQrScannerOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 text-white shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3.5 bg-[#070D19] border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">Scan Document QR Code</h4>
                  <p className="text-[11px] text-slate-400">Marksheet · Certificate · Student ID Card</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrScannerOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                aria-label="Close QR scanner"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center space-y-3">
              <div className="relative w-full max-w-[270px] h-[270px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-emerald-500/50 flex items-center justify-center">
                <div id="website-doc-qr-reader" className="w-full h-full" />
                {qrIsScanning && !qrCameraError && (
                  <div className="pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                )}
                {qrCameraError && (
                  <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-amber-400" />
                    <p className="text-xs text-slate-300 leading-relaxed">{qrCameraError}</p>
                    <button
                      type="button"
                      onClick={() => void startDocQrScanner()}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Retry Camera</span>
                    </button>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-slate-400 text-center">
                Hold the printed QR code steadily inside the frame
              </p>

              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                className="w-full min-h-[42px] px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-400" />
                <span>Upload QR Photo from Gallery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NSTA MESSENGER DIRECT TO SCHOOL ADMIN MODAL (CONTACT ADMISSIONS OFFICE) */}
      {isNstaChatOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-[#0B1324] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-[#070D19] text-white px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">NSTA Messenger · School Admin</h4>
                  <p className="text-[11px] text-slate-400 truncate">
                    Direct Admissions Desk · {school.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNstaChatOpen(false)}
                className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                title="Close NSTA Messenger"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!nstaVisitorReady ? (
              <form onSubmit={handleStartNstaVisitorSession} className="p-5 space-y-3 text-xs">
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Enter your name and mobile number to send a direct NSTA Messenger chat message to the School Admin.
                </p>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Parent / Visitor Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={nstaVisitorName}
                    onChange={(e) => setNstaVisitorName(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Mobile Number *</label>
                  <input
                    required
                    type="tel"
                    placeholder="10-digit mobile number"
                    value={nstaVisitorPhone}
                    onChange={(e) => setNstaVisitorPhone(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Class Seeking (Optional)</label>
                  <select
                    value={nstaVisitorClass}
                    onChange={(e) => setNstaVisitorClass(e.target.value)}
                    className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {sortedClasses.length === 0 ? (
                      <option value="Admission Inquiry">Admission Inquiry</option>
                    ) : (
                      sortedClasses.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.section ? `(${c.section})` : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full min-h-[44px] py-2.5 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Start Chat with School Admin</span>
                </button>
              </form>
            ) : (
              <>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300 truncate">
                    Chatting as <strong className="text-slate-900 dark:text-white">{nstaVisitorName}</strong> · {nstaVisitorPhone}
                  </span>
                  <button
                    type="button"
                    onClick={() => setNstaVisitorReady(false)}
                    className="text-indigo-600 dark:text-amber-400 font-bold hover:underline cursor-pointer shrink-0"
                  >
                    Edit Info
                  </button>
                </div>

                {/* Live Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[240px] max-h-[360px] bg-slate-50 dark:bg-slate-950">
                  {nstaChatMessages.length === 0 ? (
                    <div className="text-center py-8 space-y-1.5">
                      <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        Send your message directly to the School Admin
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Messages sent here go straight to the School Admin's NSTA Messenger School Desk &amp; Admissions Inbox.
                      </p>
                    </div>
                  ) : (
                    nstaChatMessages.map((msg) => {
                      const isVisitor = msg.senderId === nstaVisitorId || msg.senderRole !== "ADMIN";
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${isVisitor ? "ml-auto items-end" : "mr-auto items-start"}`}
                        >
                          <span className="text-[10px] text-slate-500 mb-0.5 px-1">
                            {isVisitor ? "You" : `${msg.senderName || "School Admin"}`}
                          </span>
                          <div
                            className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                              isVisitor
                                ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-xs"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            <p className={`text-[10px] mt-1 text-right ${isVisitor ? "text-slate-300" : "text-slate-400"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Message Composer */}
                <form
                  onSubmit={handleSendNstaVisitorMessage}
                  className="p-3 bg-white dark:bg-[#0B1324] border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
                >
                  <input
                    type="text"
                    required
                    value={nstaChatInput}
                    onChange={(e) => setNstaChatInput(e.target.value)}
                    placeholder="Write your message to School Admin..."
                    className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={nstaChatSending || !nstaChatInput.trim()}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{nstaChatSending ? "Sending..." : "Send"}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Quiet Institutional Footer */}
      <footer className="bg-[#070D19] text-slate-400 py-8 px-4 border-t border-white/10 text-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-bold text-white">{school.name}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {school.address || "Official Institutional Web Portal"}
              {regNo ? ` · Reg. No: ${regNo}` : ""}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {socialChannels.map((ch) =>
              ch.url ? (
                <a
                  key={ch.key}
                  href={ch.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${ch.label} — ${ch.actionLabel}`}
                  aria-label={ch.label}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform hover:scale-105 ${ch.activeIconBg}`}
                >
                  {renderSocialPlatformIcon(ch.key, "w-4 h-4")}
                </a>
              ) : (
                <span
                  key={ch.key}
                  aria-disabled="true"
                  title={`${ch.label} (Link not added yet)`}
                  className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-500 flex items-center justify-center opacity-50 select-none"
                >
                  {renderSocialPlatformIcon(ch.key, "w-4 h-4")}
                </span>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              type="button"
              onClick={() => navigateSection("campus")}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Campus &amp; Fees
            </button>
            <button
              type="button"
              onClick={() => navigateSection("admissions")}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Admissions {sessionLabel}
            </button>
            <button
              type="button"
              onClick={() => navigateSection("verify")}
              className="hover:text-white cursor-pointer transition-colors"
            >
              Verify Documents
            </button>
            {isAuthenticated && onSwitchToPortal ? (
              <button
                type="button"
                onClick={onSwitchToPortal}
                className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                {portalButtonLabel}
              </button>
            ) : (
              onOpenAccount && (
                <button
                  type="button"
                  onClick={onOpenAccount}
                  className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
                >
                  Login / Create Account
                </button>
              )
            )}
          </div>
        </div>
      </footer>

      <EntranceTestModal
        isOpen={isEntranceTestOpen}
        onClose={() => setIsEntranceTestOpen(false)}
        school={school}
        onProceedToAdmission={() => {
          setIsEntranceTestOpen(false);
          if (onOpenAdmission) {
            onOpenAdmission();
          } else {
            navigateSection("admissions");
          }
        }}
      />
    </div>
  );
};
