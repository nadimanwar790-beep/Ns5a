// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "react-qr-code";
import {
  ChevronLeft,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Check,
  X,
  Phone,
  FileText,
  GraduationCap,
  Send,
  IndianRupee,
  Printer,
  ShieldCheck,
  ReceiptText,
  Bus,
  Plus,
  Trash2,
  Scissors,
  AlertCircle,
  FileCheck2,
  Upload,
  Camera,
  Sparkles,
  Copy,
  Smartphone,
  BadgeCheck,
  ExternalLink,
  QrCode,
  Image as ImageIcon,
  CheckCheck,
  Lock,
  MessageCircle,
  Sliders,
  Save,
  RefreshCw,
  Banknote,
  UserCheck,
  Users,
  Eye,
  FolderOpen,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import type {
  School,
  SchoolClass,
  SchoolSession,
  AdmissionApplication,
  SchoolStudent,
  MonthlyFee,
  ReferralCommissionScope,
  ReferralCommissionDuration,
  ClassFeeStructure,
  ClassFeeHead,
  ClassAdmissionHeadToggles,
  SeniorStream,
} from "../../school-types";
import {
  BLOOD_GROUPS,
  ADMISSION_CATEGORIES,
  ADMISSION_DOCUMENT_OPTIONS,
  SENIOR_STREAMS,
  isSeniorClass,
  sortSchoolClasses,
  getDefaultSubjectsForClass,
} from "../../school-types";
import {
  getAdmissionApplications,
  saveAdmissionApplication,
  updateAdmissionStatus,
  saveStudent,
  updateStudent,
  saveFee,
  generateId,
  generateNextAdmissionNo,
  getLocalStudents,
  setLocalStudents,
  getLocalFees,
  saveSchoolUserProfile,
  isStudentInClass,
  getLocalClasses,
  subscribeToClasses,
  shouldUseDemoForSchool,
  isDemoRecord,
  getTeachers,
  getStaffEmployees,
  getSchoolReferralSettings,
  saveSchoolReferralSettings,
  updateClassFeeStructure,
} from "../../school-firebase";
import { saveUserToLive } from "../../firebase";
import { DirectUploadButton } from "../DirectUploadButton";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode } from "./AdmissionFormPrintModal";
import {
  detectFamilySiblings,
  mergeSchoolReferrerList,
  type ReferrerOption,
} from "../../utils/schoolReferralSiblingEngine";
import { AdmissionReferralAndSiblingPanel } from "./AdmissionReferralAndSiblingPanel";

// Clean class label helper: prevents duplicate "(B)" if the class name already contains "Section B"
export const formatClassLabel = (c?: SchoolClass | null): string => {
  if (!c) return "";
  const name = (c.name || "").trim();
  const sec = (c.section || "").trim();
  if (!sec) return name;
  const nameLower = name.toLowerCase();
  const secLower = sec.toLowerCase();
  if (
    nameLower.includes(`section ${secLower}`) ||
    nameLower.includes(`sec ${secLower}`) ||
    nameLower.includes(`(${secLower})`) ||
    nameLower.endsWith(` ${secLower}`) ||
    nameLower.endsWith(`-${secLower}`)
  ) {
    return name;
  }
  return `${name} (Section ${sec})`;
};

export interface AdmissionFeeConfig {
  admissionFee: boolean;
  registrationFee: boolean;
  annualCharges: boolean;
  tuitionFee: boolean;
  cautionMoney?: boolean;
  busFee: boolean;
}

export const DEFAULT_ADMISSION_FEE_CONFIG: AdmissionFeeConfig = {
  admissionFee: true,
  registrationFee: true,
  annualCharges: true,
  tuitionFee: false,
  cautionMoney: false,
  busFee: true,
};

export const buildClassFeeDraft = (cls?: SchoolClass | null): ClassFeeStructure => {
  const fs = cls?.feeStructure;

  const rawRegistrationFee =
    fs?.registrationFee !== undefined
      ? Math.max(0, Number(fs.registrationFee))
      : (cls as any)?.registrationFee !== undefined
      ? Math.max(0, Number((cls as any).registrationFee))
      : 500; // Life Maker Public School standard default

  const rawExaminationFee =
    fs?.examinationFee !== undefined
      ? Math.max(0, Number(fs.examinationFee))
      : 600; // 6 Exams: P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam

  const rawRepublicDayCharge =
    fs?.republicDayCharge !== undefined
      ? Math.max(0, Number(fs.republicDayCharge))
      : 100;

  const rawIndependenceDayCharge =
    fs?.independenceDayCharge !== undefined
      ? Math.max(0, Number(fs.independenceDayCharge))
      : 100;

  const rawDiaryCharge =
    fs?.diaryCharge !== undefined
      ? Math.max(0, Number(fs.diaryCharge))
      : 200;

  const rawIdCardCharge =
    fs?.idCardCharge !== undefined
      ? Math.max(0, Number(fs.idCardCharge))
      : 100;

  const rawTieBeltCharge =
    fs?.tieBeltCharge !== undefined
      ? Math.max(0, Number(fs.tieBeltCharge))
      : 100;

  const rawDevelopmentCharge =
    fs?.developmentCharge !== undefined
      ? Math.max(0, Number(fs.developmentCharge))
      : fs?.developmentFee !== undefined
      ? Math.max(0, Number(fs.developmentFee))
      : 300;

  const rawAdmissionFee =
    fs?.admissionFee !== undefined
      ? Math.max(0, Number(fs.admissionFee))
      : (cls as any)?.admissionFee !== undefined
      ? Math.max(0, Number((cls as any).admissionFee))
      : 0;

  const rawAnnualCharges =
    fs?.annualCharges !== undefined
      ? Math.max(0, Number(fs.annualCharges))
      : 0;

  const rawTuitionFee =
    fs?.tuitionFee !== undefined
      ? Math.max(0, Number(fs.tuitionFee))
      : cls?.defaultFee !== undefined
      ? Math.max(0, Number(cls.defaultFee))
      : 0;

  const rawCautionMoney = fs?.cautionMoney !== undefined ? Math.max(0, Number(fs.cautionMoney)) : 0;

  const rawBusFee =
    fs?.busFee !== undefined
      ? Math.max(0, Number(fs.busFee))
      : (cls as any)?.busFee !== undefined
      ? Math.max(0, Number((cls as any).busFee))
      : 350;

  const savedToggles = fs?.enabledHeads;
  const enabledHeads: ClassAdmissionHeadToggles = {
    registrationFee:
      typeof savedToggles?.registrationFee === "boolean" ? savedToggles.registrationFee : true,
    examinationFee:
      typeof savedToggles?.examinationFee === "boolean" ? savedToggles.examinationFee : true,
    republicDayCharge:
      typeof savedToggles?.republicDayCharge === "boolean" ? savedToggles.republicDayCharge : true,
    independenceDayCharge:
      typeof savedToggles?.independenceDayCharge === "boolean" ? savedToggles.independenceDayCharge : true,
    diaryCharge:
      typeof savedToggles?.diaryCharge === "boolean" ? savedToggles.diaryCharge : true,
    idCardCharge:
      typeof savedToggles?.idCardCharge === "boolean" ? savedToggles.idCardCharge : true,
    tieBeltCharge:
      typeof savedToggles?.tieBeltCharge === "boolean" ? savedToggles.tieBeltCharge : true,
    developmentCharge:
      typeof savedToggles?.developmentCharge === "boolean" ? savedToggles.developmentCharge : true,
    admissionFee:
      typeof savedToggles?.admissionFee === "boolean" ? savedToggles.admissionFee : rawAdmissionFee > 0,
    annualCharges:
      typeof savedToggles?.annualCharges === "boolean" ? savedToggles.annualCharges : rawAnnualCharges > 0,
    tuitionFee:
      typeof savedToggles?.tuitionFee === "boolean" ? savedToggles.tuitionFee : rawTuitionFee > 0,
    cautionMoney:
      typeof savedToggles?.cautionMoney === "boolean" ? savedToggles.cautionMoney : rawCautionMoney > 0,
    busFee: typeof savedToggles?.busFee === "boolean" ? savedToggles.busFee : true,
  };

  const customHeads: ClassFeeHead[] = Array.isArray(fs?.customHeads)
    ? fs!.customHeads.map((h) => ({
        id: h.id || String(Date.now()),
        name: h.name || "Extra Charge",
        amount: Math.max(0, Number(h.amount || 0)),
        enabled: h.enabled !== false,
      }))
    : [];

  return {
    admissionFee: rawAdmissionFee,
    registrationFee: rawRegistrationFee,
    examinationFee: rawExaminationFee,
    republicDayCharge: rawRepublicDayCharge,
    independenceDayCharge: rawIndependenceDayCharge,
    diaryCharge: rawDiaryCharge,
    idCardCharge: rawIdCardCharge,
    tieBeltCharge: rawTieBeltCharge,
    developmentCharge: rawDevelopmentCharge,
    annualCharges: rawAnnualCharges,
    tuitionFee: rawTuitionFee,
    cautionMoney: rawCautionMoney,
    busFee: rawBusFee,
    enabledHeads,
    customHeads,
  };
};

// Official class-wise fee extractor: ONLY Admin-selected heads are shown and added; User can ONLY toggle Bus
export const getClassFees = (
  cls?: SchoolClass | null,
  options?: {
    usesBus?: boolean;
    config?: AdmissionFeeConfig;
    customBusFee?: number;
  }
) => {
  if (!cls) {
    return {
      admissionFee: 0,
      registrationFee: 0,
      examinationFee: 0,
      republicDayCharge: 0,
      independenceDayCharge: 0,
      diaryCharge: 0,
      idCardCharge: 0,
      tieBeltCharge: 0,
      developmentCharge: 0,
      annualCharges: 0,
      tuitionFee: 0,
      busFee: 0,
      rawBusFee: 0,
      busAvailable: false,
      cautionMoney: 0,
      customHeads: [] as ClassFeeHead[],
      totalPayable: 0,
      enabledHeads: [] as { key: string; label: string; amount: number; hint?: string }[],
    };
  }

  const draft = buildClassFeeDraft(cls);
  const toggles = draft.enabledHeads!;
  const busAvailable = Boolean(toggles.busFee);
  const usesBus = Boolean(options?.usesBus) && busAvailable;

  const rawBusFee =
    options?.customBusFee !== undefined
      ? Math.max(0, Number(options.customBusFee))
      : Math.max(0, Number(draft.busFee || 0));

  const registrationFee = toggles.registrationFee ? Math.max(0, Number(draft.registrationFee || 0)) : 0;
  const examinationFee = toggles.examinationFee ? Math.max(0, Number(draft.examinationFee || 0)) : 0;
  const republicDayCharge = toggles.republicDayCharge ? Math.max(0, Number(draft.republicDayCharge || 0)) : 0;
  const independenceDayCharge = toggles.independenceDayCharge ? Math.max(0, Number(draft.independenceDayCharge || 0)) : 0;
  const diaryCharge = toggles.diaryCharge ? Math.max(0, Number(draft.diaryCharge || 0)) : 0;
  const idCardCharge = toggles.idCardCharge ? Math.max(0, Number(draft.idCardCharge || 0)) : 0;
  const tieBeltCharge = toggles.tieBeltCharge ? Math.max(0, Number(draft.tieBeltCharge || 0)) : 0;
  const developmentCharge = toggles.developmentCharge ? Math.max(0, Number(draft.developmentCharge || 0)) : 0;

  const admissionFee = toggles.admissionFee ? Math.max(0, Number(draft.admissionFee || 0)) : 0;
  const annualCharges = toggles.annualCharges ? Math.max(0, Number(draft.annualCharges || 0)) : 0;
  const tuitionFee = toggles.tuitionFee ? Math.max(0, Number(draft.tuitionFee || 0)) : 0;
  const cautionMoney = toggles.cautionMoney ? Math.max(0, Number(draft.cautionMoney || 0)) : 0;
  const busFee = usesBus ? rawBusFee : 0;

  const activeCustomHeads = (draft.customHeads || []).filter((h) => h.enabled !== false);
  const customHeadsTotal = activeCustomHeads.reduce(
    (sum, h) => sum + Math.max(0, Number(h.amount || 0)),
    0
  );

  const enabledHeads: { key: string; label: string; amount: number; hint?: string }[] = [];

  if (toggles.registrationFee) {
    enabledHeads.push({
      key: "registrationFee",
      label: "Registration Fee (पंजीकरण शुल्क)",
      amount: registrationFee,
      hint: "प्रवेश पंजीकरण व फॉर्म शुल्क",
    });
  }
  if (toggles.examinationFee) {
    enabledHeads.push({
      key: "examinationFee",
      label: "1. Examination Fee (6 Exams: P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam)",
      amount: examinationFee,
      hint: "वार्षिक 6 परीक्षाओं का संपूर्ण परीक्षा शुल्क",
    });
  }
  if (toggles.republicDayCharge) {
    enabledHeads.push({
      key: "republicDayCharge",
      label: "2. Republic Day Charge (गणतंत्र दिवस शुल्क)",
      amount: republicDayCharge,
      hint: "26 जनवरी समारोह व गतिविधि",
    });
  }
  if (toggles.independenceDayCharge) {
    enabledHeads.push({
      key: "independenceDayCharge",
      label: "3. Independence Day (स्वतंत्रता दिवस शुल्क)",
      amount: independenceDayCharge,
      hint: "15 अगस्त समारोह व मिठाई",
    });
  }
  if (toggles.diaryCharge) {
    enabledHeads.push({
      key: "diaryCharge",
      label: "4. Diary (स्कूल डायरी)",
      amount: diaryCharge,
      hint: "आधिकारिक स्कूल छात्र डायरी",
    });
  }
  if (toggles.idCardCharge) {
    enabledHeads.push({
      key: "idCardCharge",
      label: "5. I.Card (छात्र पहचान पत्र)",
      amount: idCardCharge,
      hint: "स्मार्ट आईडी कार्ड बारकोड/क्यूआर सहित",
    });
  }
  if (toggles.tieBeltCharge) {
    enabledHeads.push({
      key: "tieBeltCharge",
      label: "6. Tie + Belt (स्कूल टाई व बेल्ट)",
      amount: tieBeltCharge,
      hint: "स्कूल यूनिफॉर्म टाई व बेल्ट सेट",
    });
  }
  if (toggles.developmentCharge) {
    enabledHeads.push({
      key: "developmentCharge",
      label: "7. Development Charge (विकास शुल्क)",
      amount: developmentCharge,
      hint: "स्कूल इंफ्रास्ट्रक्चर व विकास शुल्क",
    });
  }

  if (toggles.admissionFee) {
    enabledHeads.push({
      key: "admissionFee",
      label: "प्रवेश शुल्क (Admission Charge)",
      amount: admissionFee,
      hint: "कक्षा के लिए एकमुश्त प्रवेश शुल्क",
    });
  }
  if (toggles.annualCharges) {
    enabledHeads.push({
      key: "annualCharges",
      label: "अन्य वार्षिक शुल्क (Other Annual Charges)",
      amount: annualCharges,
      hint: "अन्य वार्षिक खेल व गतिविधि शुल्क",
    });
  }
  if (toggles.tuitionFee) {
    enabledHeads.push({
      key: "tuitionFee",
      label: "प्रथम माह शिक्षण शुल्क (1st Month Tuition)",
      amount: tuitionFee,
      hint: "प्रवेश माह का शिक्षण शुल्क",
    });
  }
  if (toggles.cautionMoney) {
    enabledHeads.push({
      key: "cautionMoney",
      label: "कॉशन / सिक्योरिटी राशि (Caution Money)",
      amount: cautionMoney,
      hint: "वापसी योग्य धरोहर राशि",
    });
  }

  activeCustomHeads.forEach((h) => {
    enabledHeads.push({
      key: `custom_${h.id}`,
      label: h.name,
      amount: Math.max(0, Number(h.amount || 0)),
      hint: "स्कूल निर्धारित अतिरिक्त शुल्क",
    });
  });

  if (busAvailable && usesBus) {
    enabledHeads.push({
      key: "busFee",
      label: "वाहन / बस शुल्क (Transport / Bus Fee)",
      amount: busFee,
      hint: "बस सुविधा चयनित",
    });
  }

  const totalPayable =
    registrationFee +
    examinationFee +
    republicDayCharge +
    independenceDayCharge +
    diaryCharge +
    idCardCharge +
    tieBeltCharge +
    developmentCharge +
    admissionFee +
    annualCharges +
    tuitionFee +
    cautionMoney +
    customHeadsTotal +
    busFee;

  return {
    registrationFee,
    examinationFee,
    republicDayCharge,
    independenceDayCharge,
    diaryCharge,
    idCardCharge,
    tieBeltCharge,
    developmentCharge,
    admissionFee,
    annualCharges,
    tuitionFee,
    busFee,
    rawBusFee,
    busAvailable,
    cautionMoney,
    customHeads: activeCustomHeads,
    totalPayable,
    enabledHeads,
  };
};

interface Props {
  school: School;
  classes: SchoolClass[];
  sessions: SchoolSession[];
  activeSession: SchoolSession | null;
  isAdmin?: boolean;
  viewMode?: "all" | "admissions_only" | "fee_setup_only";
  onBack: () => void;
}

interface FeeItemRow {
  id: string;
  description: string;
  due: number;
}

export const OnlineAdmissionManager: React.FC<Props> = ({
  school,
  classes: propClasses,
  sessions,
  activeSession,
  isAdmin = true,
  viewMode = "all",
  onBack,
}) => {
  // Live classes list: strictly shows only classes created for this school, sorted Nursery to 12!
  const [classesList, setClassesList] = useState<SchoolClass[]>(() => {
    try {
      const local = getLocalClasses(school.id);
      const realLocal = local.filter((c: any) => !isDemoRecord(c));
      if (realLocal.length > 0) return sortSchoolClasses(realLocal);
      if (propClasses && propClasses.length > 0) {
        const realProp = propClasses.filter((c: any) => !isDemoRecord(c));
        if (realProp.length > 0) return sortSchoolClasses(realProp);
      }
      if (shouldUseDemoForSchool(school.id)) {
        return sortSchoolClasses(local.length > 0 ? local : (propClasses || []));
      }
      return [];
    } catch {
      return sortSchoolClasses(propClasses || []);
    }
  });

  // Alias classes so all existing references use the live real classes of this school
  const classes = classesList;

  // Real-time synchronization: when school admin creates/updates/deletes a class, it updates immediately!
  useEffect(() => {
    const syncClasses = () => {
      const local = getLocalClasses(school.id);
      const realLocal = local.filter((c: any) => !isDemoRecord(c));
      if (realLocal.length > 0) {
        setClassesList(sortSchoolClasses(realLocal));
        return;
      }
      if (shouldUseDemoForSchool(school.id)) {
        setClassesList(sortSchoolClasses(local.length > 0 ? local : (propClasses || [])));
      } else {
        setClassesList([]);
      }
    };
    syncClasses();

    const unsub = subscribeToClasses(school.id, activeSession?.id || "", (latest) => {
      const real = latest.filter((c: any) => !isDemoRecord(c));
      if (real.length > 0) {
        setClassesList(sortSchoolClasses(real));
      } else if (shouldUseDemoForSchool(school.id)) {
        setClassesList(sortSchoolClasses(latest));
      } else {
        setClassesList([]);
      }
    });

    if (typeof window !== "undefined") {
      window.addEventListener("school-idb-hydrated", syncClasses);
    }
    return () => {
      if (typeof unsub === "function") unsub();
      if (typeof window !== "undefined") {
        window.removeEventListener("school-idb-hydrated", syncClasses);
      }
    };
  }, [school.id, activeSession?.id]);

  const [activeTab, setActiveTab] = useState<"applications" | "new_form" | "fee_setup">(() => {
    if (viewMode === "fee_setup_only") return "fee_setup";
    if (viewMode === "admissions_only") return isAdmin ? "applications" : "new_form";
    return isAdmin ? "applications" : "new_form";
  });

  // Sync activeTab if viewMode changes externally
  useEffect(() => {
    if (viewMode === "fee_setup_only") {
      setActiveTab("fee_setup");
    } else if (viewMode === "admissions_only" && activeTab === "fee_setup") {
      setActiveTab(isAdmin ? "applications" : "new_form");
    }
  }, [viewMode, isAdmin]);

  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "today" | "pending" | "approved" | "rejected">("all");
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<AdmissionApplication | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Parent Portal & Multiple Admissions under single ID / Mobile state
  const [parentPortalPhone, setParentPortalPhone] = useState<string>(() => {
    try {
      return localStorage.getItem("nsta_parent_portal_phone") || "";
    } catch {
      return "";
    }
  });
  const [parentPhoneInput, setParentPhoneInput] = useState<string>("");
  const [parentView, setParentView] = useState<"dashboard" | "form">("dashboard");
  const [viewDocumentsApp, setViewDocumentsApp] = useState<AdmissionApplication | null>(null);
  const [inspectDocModal, setInspectDocModal] = useState<{ title: string; url: string } | null>(null);
  const [quickVerifyConfirmApp, setQuickVerifyConfirmApp] = useState<AdmissionApplication | null>(null);
  const [quickConfirmRollNo, setQuickConfirmRollNo] = useState<string>("");
  const [quickConfirming, setQuickConfirming] = useState<boolean>(false);

  // Enroll Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollingApp, setEnrollingApp] = useState<AdmissionApplication | null>(null);
  const [enrollClassId, setEnrollClassId] = useState("");
  const [enrollRollNo, setEnrollRollNo] = useState("");
  const [enrollMonthlyFee, setEnrollMonthlyFee] = useState("0");
  const [enrollPhotoUrl, setEnrollPhotoUrl] = useState("");
  const [enrollStudentAadhaar, setEnrollStudentAadhaar] = useState("");
  const [enrollFatherAadhaar, setEnrollFatherAadhaar] = useState("");
  const [enrollMotherAadhaar, setEnrollMotherAadhaar] = useState("");
  const [enrollApaarId, setEnrollApaarId] = useState("");
  const [enrollUsesBus, setEnrollUsesBus] = useState(false);
  const [enrollBusRoute, setEnrollBusRoute] = useState("");
  const [enrollBusFee, setEnrollBusFee] = useState(0);
  const [enrollSubmittedDocs, setEnrollSubmittedDocs] = useState<string[]>([]);

  // Dynamic Admission Fee Items in Enroll Modal
  const [enrollFeeItems, setEnrollFeeItems] = useState<FeeItemRow[]>([]);
  const [enrollBaseMonthlyFee, setEnrollBaseMonthlyFee] = useState<number>(0);
  const [enrollConcession, setEnrollConcession] = useState<number>(0);
  const [enrollPaidAmount, setEnrollPaidAmount] = useState<string>("");
  const [enrollPaidManual, setEnrollPaidManual] = useState<boolean>(false);
  const [enrollPayMode, setEnrollPayMode] = useState("Cash");
  const [enrollPayRef, setEnrollPayRef] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Sibling Discount & Teacher 10% Referral States
  const [referrers, setReferrers] = useState<ReferrerOption[]>([]);
  const [enrollReferredById, setEnrollReferredById] = useState<string>("");
  const [enrollCustomTeacherName, setEnrollCustomTeacherName] = useState<string>("");
  const [enrollCommissionPct, setEnrollCommissionPct] = useState<number>(10);
  const [enrollCommissionScope, setEnrollCommissionScope] = useState<ReferralCommissionScope>("all_fees");
  const [enrollCommissionDuration, setEnrollCommissionDuration] = useState<ReferralCommissionDuration>("1_year");
  const [enrollManualSibling, setEnrollManualSibling] = useState<boolean>(false);
  const [enrollSiblingDiscountPct, setEnrollSiblingDiscountPct] = useState<number>(0);
  const [enrollApplyMonthlySibling, setEnrollApplyMonthlySibling] = useState<boolean>(false);

  // Online Payment Screenshot & Next Sequential Roll No state
  const [paymentScreenshot, setPaymentScreenshot] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState<string>("");
  const [submittingScreenshot, setSubmittingScreenshot] = useState<boolean>(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [viewScreenshotUrl, setViewScreenshotUrl] = useState<string | null>(null);
  const [paymentSubmittedNotice, setPaymentSubmittedNotice] = useState<boolean>(false);

  // Admin Class-Wise Fee & Active Heads Setup State
  const [classFeeDrafts, setClassFeeDrafts] = useState<Record<string, ClassFeeStructure>>({});
  const [savingClassFeeId, setSavingClassFeeId] = useState<string | null>(null);
  const [savingAllClassFees, setSavingAllClassFees] = useState<boolean>(false);
  const [feeSetupSearch, setFeeSetupSearch] = useState<string>("");
  const [newCustomHeadInputs, setNewCustomHeadInputs] = useState<Record<string, { name: string; amount: string }>>({});

  useEffect(() => {
    setClassFeeDrafts((prev) => {
      const next: Record<string, ClassFeeStructure> = { ...prev };
      classesList.forEach((cls) => {
        if (!next[cls.id]) {
          next[cls.id] = buildClassFeeDraft(cls);
        }
      });
      return next;
    });
  }, [classesList]);

  const toggleClassFeeHead = (classId: string, headKey: keyof ClassAdmissionHeadToggles) => {
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      const curToggles = cur.enabledHeads || {
        admissionFee: false,
        registrationFee: false,
        annualCharges: false,
        tuitionFee: false,
        cautionMoney: false,
        busFee: true,
      };
      return {
        ...prev,
        [classId]: {
          ...cur,
          enabledHeads: {
            ...curToggles,
            [headKey]: !curToggles[headKey],
          },
        },
      };
    });
  };

  const updateClassFeeAmount = (
    classId: string,
    field:
      | "registrationFee"
      | "examinationFee"
      | "republicDayCharge"
      | "independenceDayCharge"
      | "diaryCharge"
      | "idCardCharge"
      | "tieBeltCharge"
      | "developmentCharge"
      | "admissionFee"
      | "annualCharges"
      | "tuitionFee"
      | "cautionMoney"
      | "busFee",
    rawValue: string
  ) => {
    const val = Math.max(0, parseInt(rawValue, 10) || 0);
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      return {
        ...prev,
        [classId]: {
          ...cur,
          [field]: val,
        },
      };
    });
  };

  const addClassCustomHead = (classId: string) => {
    const input = newCustomHeadInputs[classId];
    if (!input?.name?.trim()) return;
    const newHead: ClassFeeHead = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: input.name.trim(),
      amount: Math.max(0, parseInt(input.amount || "0", 10) || 0),
      enabled: true,
    };
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      return {
        ...prev,
        [classId]: {
          ...cur,
          customHeads: [...(cur.customHeads || []), newHead],
        },
      };
    });
    setNewCustomHeadInputs((prev) => ({ ...prev, [classId]: { name: "", amount: "" } }));
  };

  const toggleClassCustomHead = (classId: string, headId: string) => {
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      return {
        ...prev,
        [classId]: {
          ...cur,
          customHeads: (cur.customHeads || []).map((h) =>
            h.id === headId ? { ...h, enabled: h.enabled === false } : h
          ),
        },
      };
    });
  };

  const updateClassCustomHeadAmount = (classId: string, headId: string, rawVal: string) => {
    const val = Math.max(0, parseInt(rawVal, 10) || 0);
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      return {
        ...prev,
        [classId]: {
          ...cur,
          customHeads: (cur.customHeads || []).map((h) => (h.id === headId ? { ...h, amount: val } : h)),
        },
      };
    });
  };

  const removeClassCustomHead = (classId: string, headId: string) => {
    setClassFeeDrafts((prev) => {
      const cur = prev[classId] || buildClassFeeDraft(classes.find((c) => c.id === classId));
      return {
        ...prev,
        [classId]: {
          ...cur,
          customHeads: (cur.customHeads || []).filter((h) => h.id !== headId),
        },
      };
    });
  };

  const copyActiveTogglesToAllClasses = (sourceClassId: string) => {
    const source = classFeeDrafts[sourceClassId];
    if (!source?.enabledHeads) return;
    setClassFeeDrafts((prev) => {
      const next: Record<string, ClassFeeStructure> = {};
      classesList.forEach((cls) => {
        const cur = prev[cls.id] || buildClassFeeDraft(cls);
        next[cls.id] = {
          ...cur,
          enabledHeads: { ...source.enabledHeads },
        };
      });
      return next;
    });
    setSuccessToast("सभी कक्षाओं में चुने गए Active Fee Checkboxes कॉपी हो गए! 'Save All Classes' दबाकर सेव करें।");
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const copyFullFeeStructureToAllClasses = (sourceClassId: string) => {
    const source = classFeeDrafts[sourceClassId] || buildClassFeeDraft(classes.find((c) => c.id === sourceClassId));
    if (!source) return;
    setClassFeeDrafts((prev) => {
      const next: Record<string, ClassFeeStructure> = {};
      classesList.forEach((cls) => {
        next[cls.id] = {
          ...source,
          tuitionFee: source.tuitionFee > 0 ? source.tuitionFee : Number(cls.feeStructure?.tuitionFee ?? cls.defaultFee ?? 0),
          enabledHeads: { ...source.enabledHeads },
          customHeads: Array.isArray(source.customHeads) ? source.customHeads.map((h) => ({ ...h })) : [],
        };
      });
      return next;
    });
    setSuccessToast("इस कक्षा की सभी शुल्क दरें व सक्रिय चेकबॉक्स बाकी सभी क्लास में लागू हो गए! 'Save All Classes' दबाकर सेव करें।");
    setTimeout(() => setSuccessToast(null), 4500);
  };

  const saveSingleClassFeeSetup = async (cls: SchoolClass) => {
    const draft = classFeeDrafts[cls.id] || buildClassFeeDraft(cls);
    setSavingClassFeeId(cls.id);
    try {
      await updateClassFeeStructure(school.id, cls.id, draft);
      setClassesList((prev) =>
        prev.map((c) =>
          c.id === cls.id ? { ...c, feeStructure: draft, defaultFee: draft.tuitionFee || 0 } : c
        )
      );
      setSuccessToast(`${formatClassLabel(cls)} का निर्धारित शुल्क व चयनित घटक सफलतापूर्वक सेव हो गए!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (e: any) {
      setFormError("क्लास फीस सेव करने में त्रुटि: " + (e?.message || "पुनः प्रयास करें"));
    } finally {
      setSavingClassFeeId(null);
    }
  };

  const saveAllClassFeeSetups = async () => {
    setSavingAllClassFees(true);
    try {
      const updatedMap: Record<string, ClassFeeStructure> = {};
      for (const cls of classesList) {
        const draft = classFeeDrafts[cls.id] || buildClassFeeDraft(cls);
        updatedMap[cls.id] = draft;
        await updateClassFeeStructure(school.id, cls.id, draft);
      }
      setClassesList((prev) =>
        prev.map((c) =>
          updatedMap[c.id]
            ? { ...c, feeStructure: updatedMap[c.id], defaultFee: updatedMap[c.id].tuitionFee || 0 }
            : c
        )
      );
      setSuccessToast(`सभी ${classesList.length} कक्षाओं का शुल्क स्ट्रक्चर सफलतापूर्वक सेव हो गया!`);
      setTimeout(() => setSuccessToast(null), 4500);
    } catch (e: any) {
      setFormError("सभी कक्षाओं की फीस सेव करने में त्रुटि: " + (e?.message || "पुनः प्रयास करें"));
    } finally {
      setSavingAllClassFees(false);
    }
  };
  const [confirmedAdmission, setConfirmedAdmission] = useState<{
    student: SchoolStudent;
    assignedRollNo: string;
    existingCount: number;
    totalPayable: number;
    admissionCharge: number;
    annualCharge: number;
    receiptNo: string;
    feeRecord?: MonthlyFee | null;
  } | null>(null);
  const screenshotFileInputRef = useRef<HTMLInputElement | null>(null);

  // Inline Reject Confirmation State (Replaces window.confirm)
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Criteria / Documents incomplete");

  // Print & Receipt Modals
  const [printStudioState, setPrintStudioState] = useState<{
    open: boolean;
    student?: Partial<SchoolStudent> | null;
    application?: Partial<AdmissionApplication> | null;
    className?: string;
    feeRecord?: MonthlyFee | null;
    mode?: AdmissionPrintMode;
  }>({ open: false });

  const [posReceiptState, setPosReceiptState] = useState<{
    open: boolean;
    student: SchoolStudent | null;
    fee: MonthlyFee | null;
  }>({ open: false, student: null, fee: null });

  // Form State
  const [form, setForm] = useState({
    admissionType: "NEW" as "NEW" | "READMISSION",
    studentName: "",
    dateOfBirth: "",
    gender: "male" as "male" | "female" | "other",
    category: "General",
    religion: "Hindu",
    nationality: "Indian",
    bloodGroup: "",
    apaarId: "",
    photoUrl: "",
    classId: classes[0]?.id || "",
    stream: "Science" as SeniorStream,
    previousSchool: "",
    previousMarks: "",
    fatherName: "",
    fatherOccupation: "",
    motherName: "",
    motherOccupation: "",
    annualIncome: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelation: "Parent / Guardian",
    identificationMark: "",
    medicalHistory: "Fit / No major condition",
    aadhaarNo: "",
    fatherAadhaar: "",
    motherAadhaar: "",
    phone: "",
    whatsappNo: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    usesBus: false,
    busRoute: "",
    referredByTeacherId: "",
    submittedDocs: [
      "Birth Certificate (जन्म प्रमाण पत्र)",
      "Student Aadhaar Card (छात्र आधार)",
      "Passport Photos (पासपोर्ट फोटो)",
    ] as string[],
    uploadedDocuments: {} as Record<string, string>,
    paymentScreenshotUrl: "",
    transactionRef: "",
  });

  const parentApplications = useMemo(() => {
    if (!parentPortalPhone.trim()) return [];
    const clean = parentPortalPhone.trim().replace(/\D/g, "");
    if (!clean) return [];
    return applications.filter((app) => {
      const p1 = (app.phone || "").replace(/\D/g, "");
      const p2 = (app.whatsappNo || "").replace(/\D/g, "");
      return (
        (clean.length >= 10 && (p1.endsWith(clean.slice(-10)) || p2.endsWith(clean.slice(-10)))) ||
        p1 === clean ||
        p2 === clean ||
        app.familyGroupId === `FAM_${clean.slice(-6)}`
      );
    });
  }, [applications, parentPortalPhone]);

  const handleDocumentUpload = (docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      alert("फ़ाइल 12MB से कम होनी चाहिए।");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setForm((prev) => ({
        ...prev,
        uploadedDocuments: {
          ...(prev.uploadedDocuments || {}),
          [docName]: res,
        },
        submittedDocs: prev.submittedDocs.includes(docName)
          ? prev.submittedDocs
          : [...prev.submittedDocs, docName],
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveUploadedDoc = (docName: string) => {
    setForm((prev) => {
      const copy = { ...(prev.uploadedDocuments || {}) };
      delete copy[docName];
      return {
        ...prev,
        uploadedDocuments: copy,
      };
    });
  };

  const handleFormScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      alert("स्क्रीनशॉट फ़ाइल 12MB से कम होनी चाहिए।");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setForm((prev) => ({
        ...prev,
        paymentScreenshotUrl: res,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleStartNewSiblingAdmission = () => {
    const lastApp = parentApplications[0];
    setForm((prev) => ({
      ...prev,
      studentName: "",
      dateOfBirth: "",
      gender: "male",
      photoUrl: "",
      apaarId: "",
      aadhaarNo: "",
      uploadedDocuments: {},
      paymentScreenshotUrl: "",
      transactionRef: "",
      fatherName: lastApp?.fatherName || prev.fatherName,
      motherName: lastApp?.motherName || prev.motherName,
      phone: lastApp?.phone || parentPortalPhone || prev.phone,
      whatsappNo: lastApp?.whatsappNo || parentPortalPhone || prev.whatsappNo,
      address: lastApp?.address || prev.address,
      city: lastApp?.city || prev.city,
      pincode: lastApp?.pincode || prev.pincode,
      fatherAadhaar: lastApp?.fatherAadhaar || prev.fatherAadhaar,
      motherAadhaar: lastApp?.motherAadhaar || prev.motherAadhaar,
      category: lastApp?.category || prev.category,
      religion: lastApp?.religion || prev.religion,
      emergencyPhone: lastApp?.emergencyPhone || prev.emergencyPhone,
    }));
    setSubmittedApp(null);
    setConfirmedAdmission(null);
    setPaymentSubmittedNotice(false);
    setParentView("form");
    setActiveTab("new_form");
  };

  // Admin Offline Counter Collection State (When teacher/admin fills the form in school)
  const [adminRollNo, setAdminRollNo] = useState("");
  const [adminPayMode, setAdminPayMode] = useState<"Cash" | "UPI" | "Bank">("Cash");
  const [adminPayRef, setAdminPayRef] = useState("");
  const [adminConcession, setAdminConcession] = useState<number>(0);
  const [adminPaidAmount, setAdminPaidAmount] = useState<string>("");
  const [adminPaidManual, setAdminPaidManual] = useState<boolean>(false);
  const [adminMonthlyFee, setAdminMonthlyFee] = useState<string>("");

  // Sync admin roll no & default amounts when class or bus changes
  useEffect(() => {
    if (!form.classId) return;
    const selectedCls = classesList.find((c) => c.id === form.classId) || classes.find((c) => c.id === form.classId);
    if (!selectedCls) return;

    // Auto-calculate next available Roll No for this class
    try {
      const localStudents = getLocalStudents(school.id);
      const clsStudents = localStudents.filter(
        (s) =>
          s.classId === form.classId ||
          s.className === selectedCls.name ||
          s.className === `${selectedCls.name} ${selectedCls.section || ""}`.trim()
      );
      const maxRoll = clsStudents.reduce((m, s) => {
        const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > m ? n : m;
      }, 0);
      setAdminRollNo(String(maxRoll + 1));

      // Default monthly tuition fee
      const defMonthly = Number(selectedCls.feeStructure?.tuitionFee ?? selectedCls.defaultFee ?? 0);
      setAdminMonthlyFee(String(defMonthly));

      // Default total payable
      const fees = getClassFees(selectedCls, { usesBus: form.usesBus });
      if (!adminPaidManual) {
        setAdminPaidAmount(String(fees.totalPayable));
      }
    } catch {
      setAdminRollNo("1");
    }
  }, [form.classId, form.usesBus, school.id, classesList, classes, adminPaidManual]);

  // Keep form.classId pointing to a valid class in classesList
  useEffect(() => {
    if (classesList.length > 0) {
      setForm((prev) => {
        const exists = classesList.some((c) => c.id === prev.classId);
        if (!exists || !prev.classId) {
          return { ...prev, classId: classesList[0].id };
        }
        return prev;
      });
    }
  }, [classesList]);

  useEffect(() => {
    fetchApplications();
    Promise.all([
      getTeachers(school.id).catch(() => []),
      getStaffEmployees(school.id).catch(() => []),
      getSchoolReferralSettings(school.id).catch(() => null),
    ]).then(([tList, sList, refSettings]) => {
      setReferrers(mergeSchoolReferrerList(tList, sList));
      if (refSettings) {
        setEnrollCommissionPct(Number(refSettings.defaultCommissionPct ?? 10));
        setEnrollCommissionScope(refSettings.commissionScope || "all_fees");
        setEnrollCommissionDuration(refSettings.commissionDuration || "1_year");
      }
    });
  }, [school.id]);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await getAdmissionApplications(school.id);
    setApplications(data);
    setLoading(false);
  };

  const buildDefaultFeeItems = (cls: SchoolClass | undefined, withBus: boolean, customBusAmt?: number): FeeItemRow[] => {
    const fees = getClassFees(cls, { usesBus: withBus, customBusFee: customBusAmt });
    const rows: FeeItemRow[] = fees.enabledHeads.map((h) => ({
      id: h.key === "busFee" ? "fs_bus" : `fs_${h.key}`,
      description: h.label,
      due: h.amount,
    }));
    if (rows.length === 0) {
      rows.push({ id: "adm_0", description: "Admission Fee (प्रवेश शुल्क)", due: 0 });
    }
    return rows;
  };

  const openEnrollModal = (app: AdmissionApplication) => {
    const selectedCls = classes.find((c) => c.id === app.classId) || classes[0];
    const targetClsId = selectedCls?.id || app.classId || "";
    const localStudents = getLocalStudents(school.id);
    const clsStudents = localStudents.filter((s) => isStudentInClass(s, targetClsId, selectedCls?.name));
    const maxRoll = clsStudents.reduce((m, s) => {
      const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
      return !isNaN(n) && n > m ? n : m;
    }, 0);

    const defMonthly = Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0);
    const defBus = Number(app.busFee ?? selectedCls?.feeStructure?.busFee ?? 0);
    const wantsBus = Boolean(app.usesBus);

    setEnrollingApp(app);
    setEnrollClassId(targetClsId);
    setEnrollRollNo(String(maxRoll + 1));
    setEnrollBaseMonthlyFee(defMonthly);
    setEnrollMonthlyFee(String(defMonthly));
    setEnrollPhotoUrl(app.photoUrl || "");
    setEnrollStudentAadhaar(app.aadhaarNo || "");
    setEnrollFatherAadhaar(app.fatherAadhaar || "");
    setEnrollMotherAadhaar(app.motherAadhaar || "");
    setEnrollApaarId(app.apaarId || "");
    setEnrollUsesBus(wantsBus);
    setEnrollBusRoute(app.busRoute || "");
    setEnrollBusFee(defBus);
    setEnrollSubmittedDocs(
      app.submittedDocs && app.submittedDocs.length > 0
        ? app.submittedDocs
        : ["Birth Certificate (जन्म प्रमाण पत्र)", "Student Aadhaar Card (छात्र आधार)", "Passport Photos (पासपोर्ट फोटो)"]
    );
    setEnrollFeeItems(buildDefaultFeeItems(selectedCls, wantsBus, defBus));
    setEnrollConcession(0);
    setEnrollPaidManual(false);
    setEnrollPayMode("Cash");
    setEnrollPayRef("");
    setEnrollReferredById(app.referredByTeacherId || "");
    setEnrollCustomTeacherName(
      app.referredByTeacherId && !referrers.some((r) => r.id === app.referredByTeacherId) && app.referredByTeacherName
        ? app.referredByTeacherName
        : ""
    );
    setEnrollManualSibling(Boolean(app.isSiblingMarked));
    setEnrollSiblingDiscountPct(0);
    setEnrollApplyMonthlySibling(false);
    setEnrollError(null);
    setShowEnrollModal(true);
  };

  // Sync bus fee row inside Enroll Modal
  useEffect(() => {
    if (!showEnrollModal) return;
    setEnrollFeeItems((prev) => {
      const rest = prev.filter((r) => r.id !== "fs_bus");
      if (enrollUsesBus && Number(enrollBusFee) > 0) {
        return [...rest, { id: "fs_bus", description: `Transport / Bus Fee (${enrollBusRoute || "Bus"})`, due: Number(enrollBusFee) }];
      }
      return rest;
    });
  }, [enrollUsesBus, enrollBusFee, enrollBusRoute, showEnrollModal]);

  const formSiblingDetection = useMemo(
    () =>
      detectFamilySiblings(
        {
          fatherName: form.fatherName,
          motherName: form.motherName,
          whatsappNo: form.whatsappNo || form.phone,
          phone: form.phone,
        },
        getLocalStudents(school.id)
      ),
    [form.fatherName, form.motherName, form.whatsappNo, form.phone, school.id]
  );

  const enrollSiblingDetection = useMemo(
    () =>
      enrollingApp
        ? detectFamilySiblings(
            {
              fatherName: enrollingApp.fatherName,
              motherName: enrollingApp.motherName,
              whatsappNo: enrollingApp.whatsappNo || enrollingApp.phone,
              phone: enrollingApp.phone,
            },
            getLocalStudents(school.id)
          )
        : {
            exactMatches: [],
            partialMatches: [],
            isExactFamily: false,
            hasAnyMatch: false,
            familyGroupId: "",
            childNumber: 1,
          },
    [enrollingApp, school.id, showEnrollModal]
  );

  const enrollGrossTotal = useMemo(
    () => enrollFeeItems.reduce((sum, r) => sum + (Number(r.due) || 0), 0),
    [enrollFeeItems]
  );
  const enrollBusTotal = useMemo(
    () =>
      enrollFeeItems.reduce(
        (sum, r) =>
          r.id === "fs_bus" || /bus|transport|वाहन/i.test(r.description) ? sum + (Number(r.due) || 0) : sum,
        0
      ),
    [enrollFeeItems]
  );
  const enrollEligibleGrossExclBus = Math.max(0, enrollGrossTotal - enrollBusTotal);
  const enrollNetPayable = Math.max(0, enrollGrossTotal - (Number(enrollConcession) || 0));
  const enrollNetPayableExclBus = Math.max(0, enrollNetPayable - enrollBusTotal);

  useEffect(() => {
    if (!enrollPaidManual) {
      setEnrollPaidAmount(String(enrollNetPayable));
    }
  }, [enrollNetPayable, enrollPaidManual]);

  const enrollPaidNowVal = Math.max(0, Number(enrollPaidAmount) || 0);
  const enrollEligiblePaidExclBus =
    enrollNetPayable > 0 && enrollNetPayableExclBus > 0
      ? Math.min(enrollNetPayableExclBus, Math.round(enrollPaidNowVal * (enrollNetPayableExclBus / enrollNetPayable)))
      : 0;
  const enrollEligibleDueExclBus = Math.max(0, enrollNetPayableExclBus - enrollEligiblePaidExclBus);

  const handleEnrollSiblingPresetPct = (pct: number) => {
    setEnrollSiblingDiscountPct(pct);
    const admDisc = pct > 0 ? Math.round((enrollEligibleGrossExclBus * pct) / 100) : 0;
    setEnrollConcession(admDisc);
    setEnrollPaidManual(false);
    if (enrollApplyMonthlySibling) {
      const mDisc = pct > 0 ? Math.round((enrollBaseMonthlyFee * pct) / 100) : 0;
      setEnrollMonthlyFee(String(Math.max(0, enrollBaseMonthlyFee - mDisc)));
    }
  };

  const handleEnrollToggleMonthlySibling = (enabled: boolean) => {
    setEnrollApplyMonthlySibling(enabled);
    if (enabled && enrollSiblingDiscountPct > 0) {
      const mDisc = Math.round((enrollBaseMonthlyFee * enrollSiblingDiscountPct) / 100);
      setEnrollMonthlyFee(String(Math.max(0, enrollBaseMonthlyFee - mDisc)));
    } else {
      setEnrollMonthlyFee(String(enrollBaseMonthlyFee));
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim() || !form.fatherName.trim() || !form.phone.trim()) {
      setFormError("कृपया छात्र का नाम, पिता का नाम और मोबाइल नंबर अवश्य भरें।");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      const selectedCls = classes.find((c) => c.id === form.classId);
      const isSenior = isSeniorClass(selectedCls?.name);
      const chosenStream = isSenior ? (form.stream || selectedCls?.stream || "Science") : undefined;
      const appNo = generateNextAdmissionNo(school, applications.length);
      const newApp: AdmissionApplication = {
        id: generateId(),
        schoolId: school.id,
        applicationNo: appNo,
        studentName: form.studentName.trim(),
        stream: chosenStream,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        category: form.category,
        religion: form.religion,
        nationality: form.nationality,
        annualIncome: form.annualIncome.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        emergencyPhone: form.emergencyPhone.trim() || undefined,
        emergencyRelation: form.emergencyRelation.trim() || undefined,
        identificationMark: form.identificationMark.trim() || undefined,
        medicalHistory: form.medicalHistory.trim() || undefined,
        admissionType: form.admissionType || "NEW",
        bloodGroup: form.bloodGroup || undefined,
        apaarId: form.apaarId.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        classId: form.classId,
        className: selectedCls ? formatClassLabel(selectedCls) : "General",
        previousSchool: form.previousSchool.trim() || undefined,
        previousMarks: form.previousMarks.trim() || undefined,
        fatherName: form.fatherName.trim(),
        fatherOccupation: form.fatherOccupation.trim() || undefined,
        motherName: form.motherName.trim(),
        motherOccupation: form.motherOccupation.trim() || undefined,
        aadhaarNo: form.aadhaarNo.trim() || undefined,
        fatherAadhaar: form.fatherAadhaar.trim() || undefined,
        motherAadhaar: form.motherAadhaar.trim() || undefined,
        phone: form.phone.trim(),
        whatsappNo: form.whatsappNo.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        usesBus: Boolean(form.usesBus && getClassFees(selectedCls).busAvailable),
        busRoute:
          form.usesBus && getClassFees(selectedCls).busAvailable ? form.busRoute.trim() : undefined,
        busFee:
          form.usesBus && getClassFees(selectedCls).busAvailable
            ? getClassFees(selectedCls, { usesBus: true }).busFee
            : 0,
        submittedDocs: form.submittedDocs,
        uploadedDocuments:
          form.uploadedDocuments && Object.keys(form.uploadedDocuments).length > 0
            ? form.uploadedDocuments
            : undefined,
        paymentScreenshotUrl: form.paymentScreenshotUrl.trim() || undefined,
        transactionRef: form.transactionRef.trim() || undefined,
        referredByTeacherId: form.referredByTeacherId || undefined,
        referredByTeacherName: form.referredByTeacherId
          ? referrers.find((r) => r.id === form.referredByTeacherId)?.name
          : undefined,
        isSiblingMarked: formSiblingDetection.isExactFamily || undefined,
        familyGroupId: formSiblingDetection.isExactFamily ? formSiblingDetection.familyGroupId : undefined,
        status: "pending",
        appliedAt: new Date().toISOString(),
      };

      if (isAdmin) {
        // Teacher / Admin Counter Enrollment: Direct Active Student + Offline Cash / Counter Fee Record!
        const studentId = generateId();
        const feeCalc = getClassFees(selectedCls, { usesBus: form.usesBus });
        const netPayable = Math.max(0, feeCalc.totalPayable - (Number(adminConcession) || 0));
        const paidAdmissionAmt = adminPaidAmount !== "" ? Math.max(0, Number(adminPaidAmount)) : netPayable;
        const balanceAmt = Math.max(0, netPayable - paidAdmissionAmt);
        const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
        const paidIso = new Date().toISOString();

        const resolvedRollNo = adminRollNo.trim() || "1";
        const monthlyTuition = adminMonthlyFee !== "" ? Number(adminMonthlyFee) : Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0);

        const isFamilyMarked = formSiblingDetection.isExactFamily;
        const linkedSiblings = formSiblingDetection.exactMatches;
        const siblingIds = linkedSiblings.map((s) => s.id);
        const resolvedFamilyGroupId = isFamilyMarked
          ? formSiblingDetection.familyGroupId || `FAM_${studentId.slice(-6)}`
          : undefined;

        const newStudent: SchoolStudent = {
          id: studentId,
          schoolId: school.id,
          sessionId: activeSession?.id || sessions[0]?.id || "",
          classId: form.classId,
          className: selectedCls ? `${selectedCls.name} ${selectedCls.section || ""}`.trim() : (form.className || "Class"),
          stream: chosenStream,
          name: form.studentName.trim(),
          rollNo: resolvedRollNo,
          admissionNo: appNo,
          gender: form.gender,
          category: form.category || "General",
          religion: form.religion || "Hindu",
          nationality: form.nationality || "Indian",
          annualIncome: form.annualIncome.trim() || undefined,
          emergencyContact: form.emergencyContact.trim() || undefined,
          emergencyPhone: form.emergencyPhone.trim() || undefined,
          emergencyRelation: form.emergencyRelation.trim() || undefined,
          identificationMark: form.identificationMark.trim() || undefined,
          medicalHistory: form.medicalHistory.trim() || undefined,
          admissionType: form.admissionType || "NEW",
          apaarId: form.apaarId.trim() || undefined,
          fatherName: form.fatherName.trim(),
          fatherOccupation: form.fatherOccupation.trim() || undefined,
          motherName: form.motherName.trim(),
          motherOccupation: form.motherOccupation.trim() || undefined,
          aadhaarNo: form.aadhaarNo.trim() || undefined,
          fatherAadhaar: form.fatherAadhaar.trim() || undefined,
          motherAadhaar: form.motherAadhaar.trim() || undefined,
          phone: form.phone.trim(),
          whatsappNo: form.whatsappNo.trim() || form.phone.trim(),
          email: form.email.trim() || undefined,
          dateOfBirth: form.dateOfBirth,
          bloodGroup: form.bloodGroup || undefined,
          address: form.address.trim(),
          city: form.city.trim() || undefined,
          pincode: form.pincode.trim() || undefined,
          previousSchool: form.previousSchool.trim() || undefined,
          previousMarks: form.previousMarks.trim() || undefined,
          photoUrl: form.photoUrl || undefined,
          usesBus: Boolean(form.usesBus && getClassFees(selectedCls).busAvailable),
          busRoute: form.usesBus && getClassFees(selectedCls).busAvailable ? form.busRoute.trim() : undefined,
          busFee: form.usesBus && getClassFees(selectedCls).busAvailable ? getClassFees(selectedCls, { usesBus: true }).busFee : 0,
          submittedDocs: form.submittedDocs,
          admissionReceiptNo: receiptNo,
          monthlyFee: monthlyTuition,
          baseMonthlyFee: Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0) || monthlyTuition,
          referredByTeacherId: form.referredByTeacherId || undefined,
          referredByTeacherName: form.referredByTeacherId ? referrers.find((r) => r.id === form.referredByTeacherId)?.name : undefined,
          familyGroupId: resolvedFamilyGroupId,
          isSiblingMarked: isFamilyMarked || undefined,
          siblingStudentIds: siblingIds.length > 0 ? siblingIds : undefined,
          admissionSiblingDiscount: isFamilyMarked && Number(adminConcession) > 0 ? Number(adminConcession) : undefined,
          joinDate: paidIso.slice(0, 10),
          active: true,
          createdAt: paidIso,
        };

        const savedStudent = await saveStudent(newStudent);

        // Update local student cache immediately
        try {
          const curLocals = getLocalStudents(school.id);
          setLocalStudents(school.id, [savedStudent, ...curLocals.filter((s) => s.id !== savedStudent.id)]);
        } catch (cacheErr) {
          console.warn("Student cache sync note:", cacheErr);
        }

        // Build admission fee items
        const rawFeeItems = buildDefaultFeeItems(
          selectedCls,
          Boolean(form.usesBus && getClassFees(selectedCls).busAvailable),
          form.usesBus && getClassFees(selectedCls).busAvailable ? getClassFees(selectedCls, { usesBus: true }).busFee : 0
        );
        const finalItems = rawFeeItems.map((it, idx) => ({
          id: it.id,
          slNo: idx + 1,
          description: it.description.trim(),
          due: Number(it.due) || 0,
          con: idx === 0 ? Math.min(Number(it.due) || 0, Number(adminConcession) || 0) : 0,
          paid: Number(it.due) || 0,
        }));

        const admissionFeeRecord: MonthlyFee = {
          schoolId: school.id,
          sessionId: activeSession?.id || "2026-27",
          studentId: savedStudent.id,
          studentName: savedStudent.name,
          rollNo: savedStudent.rollNo,
          classId: form.classId,
          className: savedStudent.className,
          month: paidIso.slice(0, 7),
          amount: netPayable,
          monthlyAmount: monthlyTuition,
          paid: paidAdmissionAmt >= netPayable,
          paidDate: paidIso,
          receiptNo,
          paidAmount: paidAdmissionAmt,
          balanceDue: balanceAmt,
          concession: Number(adminConcession) || 0,
          feeType: "admission",
          receiptCategory: "admission",
          includeBusFee: savedStudent.usesBus,
          busFeeAmount: savedStudent.busFee || 0,
          busRoute: savedStudent.busRoute,
          payModeInfo: {
            payMode: adminPayMode,
            date: new Date().toLocaleDateString("en-GB"),
            bank: adminPayMode === "Cash" ? "School Counter" : adminPayMode,
            number: adminPayRef.trim() || "-",
          },
          items: finalItems,
        };

        await saveFee(admissionFeeRecord);

        const approvedApp: AdmissionApplication = {
          ...newApp,
          status: "approved",
          enrolledStudentId: savedStudent.id,
          assignedRollNo: savedStudent.rollNo,
          admissionFeeDetails: {
            admissionFee: finalItems[0]?.due || 0,
            registrationFee: finalItems[1]?.due || 0,
            developmentFee: finalItems[2]?.due || 0,
            idKitFee: finalItems[3]?.due || 0,
            examFund: finalItems[4]?.due || 0,
            concession: Number(adminConcession) || 0,
            totalPayable: netPayable,
            paidAmount: paidAdmissionAmt,
            balanceDue: balanceAmt,
            paymentMode: adminPayMode,
            receiptNo,
            paidDate: paidIso,
            items: finalItems,
          },
          remarks: `Direct Enrolled by School Staff (Roll #${savedStudent.rollNo}). Counter ${adminPayMode} Receipt #${receiptNo}`,
        };

        await saveAdmissionApplication(school.id, approvedApp);

        // Instant Confirmation View: Roll Number + Print Form + Print Receipt!
        setConfirmedAdmission({
          student: savedStudent,
          assignedRollNo: savedStudent.rollNo,
          existingCount: getLocalStudents(school.id).filter((s) => s.classId === form.classId).length,
          admissionCharge: finalItems[0]?.due || 0,
          annualCharge: (finalItems[1]?.due || 0) + (finalItems[2]?.due || 0),
          totalPayable: netPayable,
          feeRecord: admissionFeeRecord,
        });
        setSubmittedApp(approvedApp);
        setPaymentSubmittedNotice(false);
        setPaymentScreenshot(null);
        setTransactionRef("");
        setScreenshotError(null);
        fetchApplications();
        return;
      }

      // Online Parent flow: Save as pending and show WhatsApp payment step
      await saveAdmissionApplication(school.id, newApp);
      setSubmittedApp(newApp);
      if (form.phone.trim()) {
        try {
          localStorage.setItem("nsta_parent_portal_phone", form.phone.trim());
          setParentPortalPhone(form.phone.trim());
        } catch {}
      }
      setPaymentScreenshot(form.paymentScreenshotUrl.trim() || null);
      setTransactionRef(form.transactionRef.trim() || "");
      setConfirmedAdmission(null);
      setScreenshotError(null);
      fetchApplications();
    } catch (err: any) {
      setFormError("आवेदन जमा करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndEnroll = async () => {
    if (!enrollingApp || !enrollClassId) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const selectedCls = classes.find((c) => c.id === enrollClassId);
      const studentId = generateId();
      const paidAdmissionAmt = Math.max(0, Number(enrollPaidAmount) || 0);
      const balanceAmt = Math.max(0, enrollNetPayable - paidAdmissionAmt);
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();

      const isFamilyMarked = enrollSiblingDetection.isExactFamily || enrollManualSibling;
      const linkedSiblings =
        enrollSiblingDetection.exactMatches.length > 0
          ? enrollSiblingDetection.exactMatches
          : enrollManualSibling
          ? enrollSiblingDetection.partialMatches
          : [];
      const siblingIds = linkedSiblings.map((s) => s.id);
      const resolvedFamilyGroupId = isFamilyMarked
        ? enrollSiblingDetection.familyGroupId || `FAM_${studentId.slice(-6)}`
        : undefined;

      const selectedRefObj = referrers.find((r) => r.id === enrollReferredById);
      const resolvedRefId =
        enrollReferredById === "__custom__"
          ? enrollCustomTeacherName.trim()
            ? `custom_tea_${enrollCustomTeacherName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_")}`
            : undefined
          : enrollReferredById || undefined;
      const resolvedRefName =
        enrollReferredById === "__custom__"
          ? enrollCustomTeacherName.trim() || undefined
          : selectedRefObj?.name || undefined;

      const monthlySiblingConcession =
        isFamilyMarked && enrollApplyMonthlySibling
          ? Math.max(0, enrollBaseMonthlyFee - (Number(enrollMonthlyFee) || 0))
          : 0;

      const isSenior = isSeniorClass(selectedCls?.name || enrollingApp.className);
      const chosenStream = enrollingApp.stream || (isSenior ? (selectedCls?.stream || "Science") : undefined);

      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        classId: enrollClassId,
        className: selectedCls ? `${selectedCls.name} ${selectedCls.section || ""}`.trim() : enrollingApp.className || "Class",
        stream: chosenStream,
        name: enrollingApp.studentName,
        rollNo: enrollRollNo.trim() || "1",
        admissionNo: enrollingApp.applicationNo,
        gender: enrollingApp.gender,
        category: enrollingApp.category || "General",
        religion: enrollingApp.religion || "Hindu",
        nationality: enrollingApp.nationality || "Indian",
        annualIncome: enrollingApp.annualIncome,
        emergencyContact: enrollingApp.emergencyContact,
        emergencyPhone: enrollingApp.emergencyPhone,
        emergencyRelation: enrollingApp.emergencyRelation,
        identificationMark: enrollingApp.identificationMark,
        medicalHistory: enrollingApp.medicalHistory,
        admissionType: enrollingApp.admissionType || "NEW",
        apaarId: enrollApaarId.trim() || enrollingApp.apaarId || undefined,
        fatherName: enrollingApp.fatherName,
        fatherOccupation: enrollingApp.fatherOccupation,
        motherName: enrollingApp.motherName,
        motherOccupation: enrollingApp.motherOccupation,
        aadhaarNo: enrollStudentAadhaar.trim() || enrollingApp.aadhaarNo || undefined,
        fatherAadhaar: enrollFatherAadhaar.trim() || enrollingApp.fatherAadhaar || undefined,
        motherAadhaar: enrollMotherAadhaar.trim() || enrollingApp.motherAadhaar || undefined,
        phone: enrollingApp.phone,
        whatsappNo: enrollingApp.whatsappNo || enrollingApp.phone,
        email: enrollingApp.email,
        dateOfBirth: enrollingApp.dateOfBirth,
        bloodGroup: enrollingApp.bloodGroup || undefined,
        address: enrollingApp.address,
        city: enrollingApp.city,
        pincode: enrollingApp.pincode,
        previousSchool: enrollingApp.previousSchool,
        previousMarks: enrollingApp.previousMarks,
        photoUrl: enrollPhotoUrl || enrollingApp.photoUrl || undefined,
        usesBus: enrollUsesBus,
        busRoute: enrollUsesBus ? enrollBusRoute.trim() : undefined,
        busFee: enrollUsesBus ? Number(enrollBusFee) || 0 : 0,
        submittedDocs: enrollSubmittedDocs,
        admissionReceiptNo: receiptNo,
        monthlyFee: Number(enrollMonthlyFee) || 0,
        baseMonthlyFee: enrollBaseMonthlyFee || Number(enrollMonthlyFee) || 0,
        referredByTeacherId: resolvedRefId,
        referredByTeacherName: resolvedRefName,
        referralCommissionPct: resolvedRefId ? Number(enrollCommissionPct) || 10 : undefined,
        referralCommissionScope: resolvedRefId ? enrollCommissionScope : undefined,
        referralCommissionDuration: resolvedRefId ? enrollCommissionDuration : undefined,
        familyGroupId: resolvedFamilyGroupId,
        isSiblingMarked: isFamilyMarked || undefined,
        siblingStudentIds: siblingIds.length > 0 ? siblingIds : undefined,
        siblingDiscountPct: isFamilyMarked && enrollSiblingDiscountPct > 0 ? enrollSiblingDiscountPct : undefined,
        siblingDiscountAmount: monthlySiblingConcession > 0 ? monthlySiblingConcession : undefined,
        admissionSiblingDiscount: isFamilyMarked && Number(enrollConcession) > 0 ? Number(enrollConcession) : undefined,
        joinDate: paidIso.slice(0, 10),
        active: true,
        createdAt: paidIso,
      };

      const savedStudent = await saveStudent(newStudent);

      if (isFamilyMarked && resolvedFamilyGroupId && linkedSiblings.length > 0) {
        linkedSiblings.forEach((sib) => {
          const mergedSibIds = Array.from(new Set([...(sib.siblingStudentIds || []), savedStudent.id]));
          void updateStudent(school.id, sib.id, {
            familyGroupId: sib.familyGroupId || resolvedFamilyGroupId,
            isSiblingMarked: true,
            siblingStudentIds: mergedSibIds,
          });
        });
      }

      // Strictly school-isolated cache & login profile (no cross-school copying!)
      try {
        const curLocals = getLocalStudents(school.id);
        setLocalStudents(school.id, [savedStudent, ...curLocals.filter((s) => s.id !== savedStudent.id)]);

        const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
        const studentEmail =
          enrollingApp.email ||
          `${savedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;

        await saveSchoolUserProfile({
          uid: savedStudent.id,
          schoolId: school.id,
          role: "SCHOOL_STUDENT",
          name: savedStudent.name,
          email: studentEmail,
          studentRef: savedStudent.id,
          classId: enrollClassId,
          sessionId: activeSession?.id || "2026-27",
        }).catch(() => {});

        saveUserToLive(
          {
            id: savedStudent.id,
            uid: savedStudent.id,
            displayId: `ROLL-${savedStudent.rollNo}`,
            name: savedStudent.name,
            email: studentEmail,
            mobile: savedStudent.phone,
            role: "STUDENT",
            schoolId: school.id,
            classLevel: enrollClassId,
            stream: chosenStream || "General",
            credits: 100,
            diamonds: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            subscriptionTier: "PRO",
            provider: "qr_student_id",
            isQrLogin: true,
            admissionNo: savedStudent.admissionNo,
            rollNo: savedStudent.rollNo,
            fatherName: savedStudent.fatherName,
            motherName: savedStudent.motherName,
            bloodGroup: savedStudent.bloodGroup,
            monthlyFee: savedStudent.monthlyFee,
          },
          { immediate: true }
        ).catch(() => {});
      } catch (cacheErr) {
        console.warn("Student profile sync notice:", cacheErr);
      }

      const finalItems = enrollFeeItems
        .filter((it) => it.description.trim() && Number(it.due) >= 0)
        .map((it, idx) => ({
          id: it.id,
          slNo: idx + 1,
          description: it.description.trim(),
          due: Number(it.due) || 0,
          con: idx === 0 ? Math.min(Number(it.due) || 0, Number(enrollConcession) || 0) : 0,
          paid: Number(it.due) || 0,
        }));

      const admissionFeeRecord: MonthlyFee = {
        schoolId: school.id,
        sessionId: activeSession?.id || "2026-27",
        studentId: savedStudent.id,
        studentName: savedStudent.name,
        rollNo: savedStudent.rollNo,
        classId: enrollClassId,
        month: paidIso.slice(0, 7),
        amount: enrollNetPayable,
        monthlyAmount: Number(enrollMonthlyFee) || 0,
        paid: paidAdmissionAmt >= enrollNetPayable,
        paidDate: paidIso,
        receiptNo,
        paidAmount: paidAdmissionAmt,
        balanceDue: balanceAmt,
        concession: Number(enrollConcession) || 0,
        siblingDiscountAmount: isFamilyMarked && Number(enrollConcession) > 0 ? Number(enrollConcession) : undefined,
        referredByTeacherId: resolvedRefId,
        referredByTeacherName: resolvedRefName,
        note: isFamilyMarked && Number(enrollConcession) > 0 ? "Sibling / Same-Family Concession Applied" : undefined,
        feeType: "admission",
        receiptCategory: "admission",
        includeBusFee: enrollUsesBus,
        busFeeAmount: enrollUsesBus ? Number(enrollBusFee) || 0 : 0,
        busRoute: enrollUsesBus ? enrollBusRoute : undefined,
        payModeInfo: {
          payMode: enrollPayMode,
          date: new Date().toLocaleDateString("en-GB"),
          bank: enrollPayMode === "Cash" ? "School Counter" : enrollPayMode,
          number: enrollPayRef.trim() || "-",
        },
        items: finalItems,
      };

      await saveFee(admissionFeeRecord);

      const savedFeeDetails: AdmissionApplication["admissionFeeDetails"] = {
        admissionFee: finalItems[0]?.due || 0,
        registrationFee: finalItems[1]?.due || 0,
        developmentFee: finalItems[2]?.due || 0,
        idKitFee: finalItems[3]?.due || 0,
        examFund: finalItems[4]?.due || 0,
        concession: Number(enrollConcession) || 0,
        totalPayable: enrollNetPayable,
        paidAmount: paidAdmissionAmt,
        balanceDue: balanceAmt,
        paymentMode: enrollPayMode,
        receiptNo,
        paidDate: paidIso,
        items: finalItems,
      };

      await updateAdmissionStatus(school.id, enrollingApp.id, "approved", {
        enrolledStudentId: savedStudent.id,
        assignedRollNo: savedStudent.rollNo,
        classId: enrollClassId,
        className: savedStudent.className,
        photoUrl: savedStudent.photoUrl,
        aadhaarNo: savedStudent.aadhaarNo,
        fatherAadhaar: savedStudent.fatherAadhaar,
        motherAadhaar: savedStudent.motherAadhaar,
        apaarId: savedStudent.apaarId,
        usesBus: savedStudent.usesBus,
        busRoute: savedStudent.busRoute,
        busFee: savedStudent.busFee,
        submittedDocs: enrollSubmittedDocs,
        monthlyFee: savedStudent.monthlyFee,
        admissionFeeDetails: savedFeeDetails,
        remarks: `Enrolled (Roll #${savedStudent.rollNo}). Receipt #${receiptNo}`,
      });

      setShowEnrollModal(false);
      setSuccessToast(`🎉 ${savedStudent.name} नामांकित हो गए (Roll #${savedStudent.rollNo})! एडमिशन फॉर्म व रसीद तैयार है।`);
      setTimeout(() => setSuccessToast(null), 5000);
      fetchApplications();

      // Open Single A4 Full Admission Form Studio
      setPrintStudioState({
        open: true,
        student: savedStudent,
        application: { ...enrollingApp, admissionFeeDetails: savedFeeDetails, assignedRollNo: savedStudent.rollNo },
        className: savedStudent.className,
        feeRecord: admissionFeeRecord,
        mode: "form_only",
      });
    } catch (err: any) {
      setEnrollError("Enrollment failed: " + (err?.message || "Please retry"));
    } finally {
      setEnrolling(false);
    }
  };

  const handleScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setScreenshotError("फ़ाइल का साइज़ 8MB से कम होना चाहिए।");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPaymentScreenshot(dataUrl);
      setScreenshotError(null);
    };
    reader.onerror = () => {
      setScreenshotError("फ़ाइल पढ़ने में त्रुटि हुई, कृपया पुनः प्रयास करें।");
    };
    reader.readAsDataURL(file);
  };

  const handleSendPaymentScreenshot = async () => {
    if (!submittedApp) return;
    if (!paymentScreenshot && !transactionRef.trim()) {
      setScreenshotError("कृपया भुगतान का स्क्रीनशॉट अपलोड करें या UTR / Transaction No. दर्ज करें।");
      return;
    }
    setSubmittingScreenshot(true);
    setScreenshotError(null);
    try {
      const selectedCls = classes.find((c) => c.id === submittedApp.classId);
      const fees = getClassFees(selectedCls, { usesBus: submittedApp.usesBus });

      // 1. Update application with payment proof, status remains PENDING for admin review
      await updateAdmissionStatus(school.id, submittedApp.id, "pending", {
        paymentScreenshotUrl: paymentScreenshot || undefined,
        transactionRef: transactionRef.trim() || undefined,
        paymentMode: "WhatsApp UPI",
        paymentSubmittedAt: new Date().toISOString(),
        remarks: `WhatsApp payment submitted. UTR: ${transactionRef.trim() || "N/A"}. Awaiting Admin Approval.`,
      });

      // 2. Send Live Push Notification to School Admin
      try {
        await sendSchoolPushNotification({
          schoolId: school.id,
          title: `📩 New Admission Payment: ${submittedApp.studentName}`,
          body: `${submittedApp.studentName} (${submittedApp.className}) ne ₹${fees.totalPayable} ka WhatsApp payment proof submit kiya hai. Kripya Admin portal me verify karke approve karein.`,
          urgent: true,
          type: "FEE_RECEIPT",
        });
      } catch (pushErr) {
        console.warn("Push notification error:", pushErr);
      }

      // 3. Save alert to localStorage & dispatch event so School Admin panel shows live alert banner immediately
      try {
        const alertItem = {
          id: generateId(),
          schoolId: school.id,
          studentName: submittedApp.studentName,
          className: submittedApp.className,
          applicationNo: submittedApp.applicationNo,
          amount: fees.totalPayable,
          screenshotUrl: paymentScreenshot,
          transactionRef: transactionRef.trim(),
          timestamp: new Date().toISOString(),
        };
        const existing = JSON.parse(localStorage.getItem(`school_admission_alerts_${school.id}`) || "[]");
        localStorage.setItem(`school_admission_alerts_${school.id}`, JSON.stringify([alertItem, ...existing]));
        window.dispatchEvent(new CustomEvent("school-admission-alert", { detail: alertItem }));
      } catch (e) {}

      // 4. Update UI to pending notice
      setSubmittedApp((prev) => (prev ? {
        ...prev,
        paymentScreenshotUrl: paymentScreenshot || undefined,
        transactionRef: transactionRef.trim() || undefined,
        status: "pending",
      } : null));

      setPaymentSubmittedNotice(true);
      fetchApplications();
    } catch (err: any) {
      setScreenshotError("स्क्रीनशॉट सबमिट करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSubmittingScreenshot(false);
    }
  };

  // Resolve real student & real admission fee for any approved application (Zero fake ₹5300!)
  const resolveApplicationStudentAndFee = (app: AdmissionApplication): { student: SchoolStudent; fee: MonthlyFee | null } => {
    const locals = getLocalStudents(school.id);
    const matchedStudent =
      locals.find(
        (s) =>
          (app.enrolledStudentId && s.id === app.enrolledStudentId) ||
          (s.admissionNo && s.admissionNo === app.applicationNo)
      ) || null;

    const student: SchoolStudent = matchedStudent || {
      id: app.enrolledStudentId || app.id,
      schoolId: school.id,
      sessionId: activeSession?.id || "2026-27",
      classId: app.classId,
      className: app.className,
      name: app.studentName,
      rollNo: app.assignedRollNo || "1",
      admissionNo: app.applicationNo,
      gender: app.gender,
      category: app.category,
      religion: app.religion || "Hindu",
      nationality: app.nationality || "Indian",
      annualIncome: app.annualIncome,
      emergencyContact: app.emergencyContact,
      emergencyPhone: app.emergencyPhone,
      emergencyRelation: app.emergencyRelation,
      identificationMark: app.identificationMark,
      medicalHistory: app.medicalHistory,
      admissionType: app.admissionType || "NEW",
      apaarId: app.apaarId,
      fatherName: app.fatherName,
      fatherOccupation: app.fatherOccupation,
      motherName: app.motherName,
      motherOccupation: app.motherOccupation,
      aadhaarNo: app.aadhaarNo,
      fatherAadhaar: app.fatherAadhaar,
      motherAadhaar: app.motherAadhaar,
      phone: app.phone,
      whatsappNo: app.whatsappNo,
      email: app.email,
      dateOfBirth: app.dateOfBirth,
      bloodGroup: app.bloodGroup,
      address: app.address,
      city: app.city,
      pincode: app.pincode,
      previousSchool: app.previousSchool,
      previousMarks: app.previousMarks,
      photoUrl: app.photoUrl,
      usesBus: app.usesBus,
      busRoute: app.busRoute,
      busFee: app.busFee,
      submittedDocs: app.submittedDocs,
      monthlyFee: Number(app.monthlyFee || 0),
      joinDate: (app.reviewedAt || app.appliedAt).slice(0, 10),
      active: true,
      createdAt: app.appliedAt,
    };

    const localFees = getLocalFees(school.id);
    const savedFee =
      localFees.find((f) => {
        const isAdm = f.feeType === "admission" || f.receiptCategory === "admission";
        if (!isAdm) return false;
        if (app.admissionFeeDetails?.receiptNo && f.receiptNo === app.admissionFeeDetails.receiptNo) return true;
        if (student.id && f.studentId === student.id) return true;
        return false;
      }) || null;

    if (savedFee) {
      return { student, fee: savedFee };
    }

    if (app.admissionFeeDetails) {
      const d = app.admissionFeeDetails;
      const items =
        d.items && d.items.length > 0
          ? d.items
          : [
              d.admissionFee > 0 && { id: "1", slNo: 1, description: "Admission Fee (प्रवेश शुल्क)", due: d.admissionFee, con: 0, paid: d.admissionFee },
              d.registrationFee > 0 && { id: "2", slNo: 2, description: "Registration & Form Fee", due: d.registrationFee, con: 0, paid: d.registrationFee },
              d.developmentFee > 0 && { id: "3", slNo: 3, description: "Annual / Development Fund", due: d.developmentFee, con: 0, paid: d.developmentFee },
              d.idKitFee > 0 && { id: "4", slNo: 4, description: "Student Kit, ID Card & Diary", due: d.idKitFee, con: 0, paid: d.idKitFee },
              d.examFund > 0 && { id: "5", slNo: 5, description: "Exam & Activity Charges", due: d.examFund, con: 0, paid: d.examFund },
            ].filter(Boolean);

      return {
        student,
        fee: {
          schoolId: school.id,
          sessionId: activeSession?.id || "2026-27",
          studentId: student.id,
          studentName: student.name,
          rollNo: student.rollNo,
          classId: student.classId,
          month: (d.paidDate || app.appliedAt).slice(0, 7),
          amount: d.totalPayable,
          monthlyAmount: student.monthlyFee,
          paid: d.paidAmount >= d.totalPayable,
          paidDate: d.paidDate || app.reviewedAt || app.appliedAt,
          receiptNo: d.receiptNo || `ADM-${app.applicationNo.replace(/\D/g, "").slice(-5) || "1001"}`,
          paidAmount: d.paidAmount,
          balanceDue: d.balanceDue,
          concession: d.concession || 0,
          feeType: "admission",
          receiptCategory: "admission",
          payModeInfo: {
            payMode: d.paymentMode || "Cash",
            date: new Date(d.paidDate || app.appliedAt).toLocaleDateString("en-GB"),
            bank: "",
            number: "-",
          },
          items,
        },
      };
    }

    return { student, fee: null };
  };

  const handleConfirmReject = async (app: AdmissionApplication) => {
    await updateAdmissionStatus(school.id, app.id, "rejected", {
      remarks: rejectReason.trim() || "Application declined",
    });
    setRejectingAppId(null);
    fetchApplications();
  };

  const toggleFormDoc = (docLabel: string) => {
    setForm((prev) => ({
      ...prev,
      submittedDocs: prev.submittedDocs.includes(docLabel)
        ? prev.submittedDocs.filter((d) => d !== docLabel)
        : [...prev.submittedDocs, docLabel],
    }));
  };

  const toggleEnrollDoc = (docLabel: string) => {
    setEnrollSubmittedDocs((prev) =>
      prev.includes(docLabel) ? prev.filter((d) => d !== docLabel) : [...prev, docLabel]
    );
  };

  const isTodayIso = (iso?: string) => {
    if (!iso) return false;
    try {
      const d = new Date(iso);
      const now = new Date();
      return (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      );
    } catch {
      return false;
    }
  };

  const handleQuickConfirmAdmission = async (app: AdmissionApplication, customRoll?: string) => {
    setQuickConfirming(true);
    try {
      const selectedCls = classes.find((c) => c.id === app.classId) || classes[0];
      const targetClsId = selectedCls?.id || app.classId || "";
      const localStudents = getLocalStudents(school.id);
      const clsStudents = localStudents.filter((s) => isStudentInClass(s, targetClsId, selectedCls?.name));
      const maxRoll = clsStudents.reduce((m, s) => {
        const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
        return !isNaN(n) && n > m ? n : m;
      }, 0);
      const assignedRoll = (customRoll && customRoll.trim()) || String(maxRoll + 1);

      const feeCalc = getClassFees(selectedCls, { usesBus: app.usesBus });
      const totalAmount = feeCalc.totalPayable;
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();
      const studentId = generateId();

      const newStudent: SchoolStudent = {
        id: studentId,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        classId: targetClsId,
        className: selectedCls ? `${selectedCls.name} ${selectedCls.section || ""}`.trim() : app.className || "Class",
        name: app.studentName,
        rollNo: assignedRoll,
        admissionNo: app.applicationNo,
        gender: app.gender,
        dateOfBirth: app.dateOfBirth,
        fatherName: app.fatherName,
        motherName: app.motherName,
        phone: app.phone,
        whatsappNo: app.whatsappNo || app.phone,
        address: app.address,
        bloodGroup: app.bloodGroup,
        photoUrl: app.photoUrl,
        monthlyFee: Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0),
        usesBus: app.usesBus,
        busRoute: app.busRoute,
        busFee: app.busFee,
        apaarId: app.apaarId,
        aadhaarNo: app.aadhaarNo,
        fatherAadhaar: app.fatherAadhaar,
        motherAadhaar: app.motherAadhaar,
        category: app.category,
        annualIncome: app.annualIncome,
        emergencyContact: app.emergencyContact,
        emergencyPhone: app.emergencyPhone,
        admissionDate: paidIso.split("T")[0],
        status: "active",
        createdAt: paidIso,
      };

      await saveStudent(school.id, newStudent);
      const updatedStudents = [...localStudents.filter((s) => s.id !== studentId), newStudent];
      setLocalStudents(school.id, updatedStudents);

      const itemsList = feeCalc.enabledHeads.map((h, i) => ({
        id: `item_${i + 1}`,
        slNo: i + 1,
        description: h.label,
        due: h.amount,
        con: 0,
        paid: h.amount,
      }));

      const admissionFeeRecord: MonthlyFee = {
        id: `fee_${studentId}_adm_${Date.now()}`,
        schoolId: school.id,
        sessionId: activeSession?.id || sessions[0]?.id || "",
        studentId: studentId,
        studentName: app.studentName,
        rollNo: assignedRoll,
        classId: targetClsId,
        className: selectedCls ? `${selectedCls.name} ${selectedCls.section || ""}`.trim() : app.className || "Class",
        month: "Admission Fee (दाखिला शुल्क)",
        year: new Date().getFullYear(),
        amount: totalAmount,
        paid: true,
        paidAmount: totalAmount,
        paidDate: paidIso,
        receiptNo,
        collectedBy: "Admin Online Payment Verification",
        paymentMode: "UPI / Online Screenshot Verified",
        remarks: `Online Payment Verified. Ref: ${app.transactionRef || "Screenshot Verified"}`,
        feeType: "admission",
        receiptCategory: "admission",
        createdAt: paidIso,
        items: itemsList,
      };
      await saveFee(school.id, admissionFeeRecord);

      await updateAdmissionStatus(school.id, app.id, "approved", {
        enrolledStudentId: studentId,
        assignedRollNo: assignedRoll,
        assignedSection: selectedCls?.section || "A",
        remarks: `Payment Verified & Confirmed by Admin (Roll #${assignedRoll}). Receipt #${receiptNo}`,
        admissionFeeDetails: {
          admissionFee: feeCalc.enabledHeads.find((h) => h.key === "admissionFee")?.amount || 0,
          registrationFee: feeCalc.enabledHeads.find((h) => h.key === "registrationFee")?.amount || 0,
          developmentFee: feeCalc.enabledHeads.find((h) => h.key === "developmentCharge")?.amount || 0,
          idKitFee:
            (feeCalc.enabledHeads.find((h) => h.key === "idCardCharge")?.amount || 0) +
            (feeCalc.enabledHeads.find((h) => h.key === "diaryCharge")?.amount || 0) +
            (feeCalc.enabledHeads.find((h) => h.key === "tieBeltCharge")?.amount || 0),
          examFund: feeCalc.enabledHeads.find((h) => h.key === "examinationFee")?.amount || 0,
          totalPayable: totalAmount,
          paidAmount: totalAmount,
          balanceDue: 0,
          paymentMode: "UPI / Online Screenshot Verified",
          receiptNo,
          paidDate: paidIso,
          items: itemsList,
        },
      });

      try {
        await sendSchoolPushNotification({
          schoolId: school.id,
          title: `🎉 दाखिला कन्फर्म: ${app.studentName}`,
          body: `कक्षा ${app.className} में प्रवेश कन्फर्म हो गया है। रोल नंबर: Roll #${assignedRoll}।`,
          url: "/?view=online_admissions",
        });
      } catch {}

      setSuccessToast(`🎉 ${app.studentName} का एडमिशन कन्फर्म हो गया! Roll #${assignedRoll} आवंटित हुआ।`);
      setTimeout(() => setSuccessToast(null), 5000);
      setViewScreenshotUrl(null);
      setQuickVerifyConfirmApp(null);
      fetchApplications();
    } catch (err: any) {
      alert("एडमिशन कन्फर्म करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setQuickConfirming(false);
    }
  };

  const filteredApps = applications.filter((a) => {
    if (statusFilter === "today") {
      if (!isTodayIso(a.appliedAt)) return false;
    } else if (statusFilter !== "all" && a.status !== statusFilter) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.applicationNo.toLowerCase().includes(q) ||
        a.fatherName.toLowerCase().includes(q) ||
        a.phone.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 pb-16">
      {/* Top Navbar */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-blue-950 px-4 py-4 text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-blue-200 hover:text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-amber-400" />
            <h1 className="text-base sm:text-lg font-black tracking-tight">
              {viewMode === "fee_setup_only"
                ? "कक्षा-वार प्रवेश शुल्क एवं हेड सेट-अप (Online Admission Fee Setup)"
                : !isAdmin
                ? "अभिभावक ऑनलाइन प्रवेश पोर्टल (Parent Online Admission)"
                : "Online Admissions &amp; Print Portal"}
            </h1>
          </div>
          <div className="text-xs text-blue-200 hidden sm:block font-semibold">
            {school.name}
          </div>
        </div>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 mt-5">
        {/* Mode Tabs: In fee_setup_only mode: NEVER show tabs (upar ke dono option nahi dikhenge) */}
        {isAdmin && viewMode !== "fee_setup_only" && (
          <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 w-fit">
            <button
              onClick={() => setActiveTab("applications")}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "applications"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <FileText className="w-4 h-4" /> Applications ({applications.length})
            </button>
            <button
              onClick={() => {
                setSubmittedApp(null);
                setActiveTab("new_form");
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === "new_form"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <UserPlus className="w-4 h-4" /> + New Admission Form
            </button>
            {/* In admissions_only mode: fee_setup tab is NEVER rendered (Online Admission & Fee wla part na dikhega) */}
            {viewMode !== "admissions_only" && (
              <button
                onClick={() => setActiveTab("fee_setup")}
                className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === "fee_setup"
                    ? "bg-emerald-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Sliders className="w-4 h-4" /> Class-Wise Fee &amp; Heads Setup
              </button>
            )}
          </div>
        )}

        {/* 0. ADMIN CLASS-WISE FEE & ACTIVE HEADS SETUP */}
        {((activeTab === "fee_setup" && isAdmin) || viewMode === "fee_setup_only") &&
          viewMode !== "admissions_only" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  कक्षा-वार शुल्क एवं सक्रिय घटक सेटअप (Class-Wise Fee &amp; Active Heads)
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  यहाँ हर क्लास के लिए अलग-अलग राशि सेट करें और <strong>[✓] टिक करें</strong>। केवल एडमिन द्वारा टिक किए गए शुल्क ही ऑनलाइन फॉर्म में दिखेंगे और जुड़ेंगे — फॉर्म भरने वाला छात्र/अभिभावक सिर्फ <strong>Bus सुविधा</strong> चुन या हटा सकेगा।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={feeSetupSearch}
                    onChange={(e) => setFeeSetupSearch(e.target.value)}
                    placeholder="क्लास खोजें (e.g. Class 3)..."
                    className="pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={saveAllClassFeeSetups}
                  disabled={savingAllClassFees || classes.length === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                >
                  {savingAllClassFees ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{savingAllClassFees ? "Saving All..." : "Save All Classes"}</span>
                </button>
              </div>
            </div>

            {classes.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center border border-slate-200 dark:border-slate-700">
                <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  अभी कोई कक्षा उपलब्ध नहीं है। पहले Class Management में कक्षाएं जोड़ें।
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {classes
                  .filter((c) =>
                    !feeSetupSearch.trim()
                      ? true
                      : formatClassLabel(c).toLowerCase().includes(feeSetupSearch.trim().toLowerCase())
                  )
                  .map((cls, idx) => {
                    const draft = classFeeDrafts[cls.id] || buildClassFeeDraft(cls);
                    const toggles = draft.enabledHeads || {
                      admissionFee: false,
                      registrationFee: false,
                      annualCharges: false,
                      tuitionFee: false,
                      cautionMoney: false,
                      busFee: true,
                    };
                    const previewWithoutBus = getClassFees(
                      { ...cls, feeStructure: draft },
                      { usesBus: false }
                    );
                    const previewWithBus = getClassFees(
                      { ...cls, feeStructure: draft },
                      { usesBus: true }
                    );
                    const isSavingOne = savingClassFeeId === cls.id;
                    const customInput = newCustomHeadInputs[cls.id] || { name: "", amount: "" };

                    const headRows: {
                      key: keyof ClassAdmissionHeadToggles;
                      field:
                        | "registrationFee"
                        | "examinationFee"
                        | "republicDayCharge"
                        | "independenceDayCharge"
                        | "diaryCharge"
                        | "idCardCharge"
                        | "tieBeltCharge"
                        | "developmentCharge"
                        | "admissionFee"
                        | "annualCharges"
                        | "tuitionFee"
                        | "cautionMoney"
                        | "busFee";
                      title: string;
                      subtitle: string;
                      badge?: string;
                      isBus?: boolean;
                    }[] = [
                      {
                        key: "registrationFee",
                        field: "registrationFee",
                        title: "Registration Fee (पंजीकरण शुल्क)",
                        subtitle: "प्रवेश पंजीकरण व फॉर्म शुल्क",
                        badge: "Reg. Fee",
                      },
                      {
                        key: "examinationFee",
                        field: "examinationFee",
                        title: "1. Examination Fee (परीक्षा शुल्क)",
                        subtitle: "6 Exams: P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam",
                        badge: "Annual #1",
                      },
                      {
                        key: "republicDayCharge",
                        field: "republicDayCharge",
                        title: "2. Republic Day Charge (गणतंत्र दिवस)",
                        subtitle: "26 जनवरी समारोह व गतिविधि",
                        badge: "Annual #2",
                      },
                      {
                        key: "independenceDayCharge",
                        field: "independenceDayCharge",
                        title: "3. Independence Day (स्वतंत्रता दिवस)",
                        subtitle: "15 अगस्त समारोह व मिठाई",
                        badge: "Annual #3",
                      },
                      {
                        key: "diaryCharge",
                        field: "diaryCharge",
                        title: "4. School Diary (स्कूल डायरी)",
                        subtitle: "छात्र गृहकार्य व सूचना डायरी",
                        badge: "Annual #4",
                      },
                      {
                        key: "idCardCharge",
                        field: "idCardCharge",
                        title: "5. I.Card (छात्र पहचान पत्र)",
                        subtitle: "बारकोड/क्यूआर युक्त छात्र आईडी कार्ड",
                        badge: "Annual #5",
                      },
                      {
                        key: "tieBeltCharge",
                        field: "tieBeltCharge",
                        title: "6. Tie + Belt (स्कूल टाई व बेल्ट)",
                        subtitle: "स्कूल यूनिफॉर्म टाई व बेल्ट सेट",
                        badge: "Annual #6",
                      },
                      {
                        key: "developmentCharge",
                        field: "developmentCharge",
                        title: "7. Development Charge (विकास शुल्क)",
                        subtitle: "स्कूल इंफ्रास्ट्रक्चर व विकास फंड",
                        badge: "Annual #7",
                      },
                      {
                        key: "busFee",
                        field: "busFee",
                        title: "बस / वाहन सुविधा (School Bus Fee)",
                        subtitle: "ऑनलाइन फॉर्म में छात्र आवश्यकतानुसार चुन सकेगा",
                        badge: "Transport",
                        isBus: true,
                      },
                      {
                        key: "admissionFee",
                        field: "admissionFee",
                        title: "प्रवेश शुल्क (Admission Charge)",
                        subtitle: "नए नामांकन का एकमुश्त शुल्क",
                      },
                      {
                        key: "tuitionFee",
                        field: "tuitionFee",
                        title: "प्रथम माह ट्यूशन (1st Month Tuition)",
                        subtitle: "मासिक शिक्षण शुल्क",
                      },
                      {
                        key: "cautionMoney",
                        field: "cautionMoney",
                        title: "कॉशन / सिक्योरिटी राशि (Caution Money)",
                        subtitle: "वापसी योग्य धरोहर राशि",
                      },
                      {
                        key: "annualCharges",
                        field: "annualCharges",
                        title: "अन्य वार्षिक शुल्क (Other Annual)",
                        subtitle: "अतिरिक्त वार्षिक शुल्क",
                      },
                    ];

                    return (
                      <div
                        key={cls.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 sm:p-5 shadow-xs space-y-4"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-xs flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                              {idx + 1}
                            </div>
                            <div>
                              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                                {formatClassLabel(cls)}
                              </h3>
                              <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums mt-0.5">
                                बिना बस कुल देय:{" "}
                                <strong className="text-emerald-700 dark:text-emerald-400">
                                  ₹{previewWithoutBus.totalPayable.toLocaleString("en-IN")}
                                </strong>
                                {toggles.busFee && (
                                  <>
                                    {" "}· बस सहित:{" "}
                                    <strong className="text-indigo-600 dark:text-indigo-400">
                                      ₹{previewWithBus.totalPayable.toLocaleString("en-IN")}
                                    </strong>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyActiveTogglesToAllClasses(cls.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold cursor-pointer"
                              title="इस क्लास के ✓/✕ चुनाव को बाकी सभी कक्षाओं पर लागू करें (राशि नहीं बदलेगी)"
                            >
                              ✓/✕ चुनाव सभी में लागू करें
                            </button>
                            <button
                              type="button"
                              onClick={() => copyFullFeeStructureToAllClasses(cls.id)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold cursor-pointer"
                              title="इस क्लास की सभी शुल्क दरें और चुनाव सभी कक्षाओं में कॉपी करें"
                            >
                              📋 दरें व चुनाव सभी में लागू करें
                            </button>
                            <button
                              type="button"
                              onClick={() => saveSingleClassFeeSetup(cls)}
                              disabled={isSavingOne}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              {isSavingOne ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Check className="w-3.5 h-3.5" />
                              )}
                              <span>{isSavingOne ? "Saving..." : `Save ${cls.name}`}</span>
                            </button>
                          </div>
                        </div>

                        {/* 6 Configurable Fee Heads Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {headRows.map((item) => {
                            const active = Boolean(toggles[item.key]);
                            const val = Number(draft[item.field] || 0);
                            return (
                              <div
                                key={item.key}
                                className={`p-3 rounded-xl border transition-colors ${
                                  active
                                    ? item.isBus
                                      ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800"
                                      : "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800"
                                    : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 opacity-75"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <label className="flex items-start gap-2 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={active}
                                      onChange={() => toggleClassFeeHead(cls.id, item.key)}
                                      className="w-4 h-4 mt-0.5 accent-emerald-600 cursor-pointer"
                                    />
                                    <div>
                                      <span className="text-xs font-bold text-slate-900 dark:text-white block leading-snug">
                                        {item.title}
                                      </span>
                                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                                        {active
                                          ? item.isBus
                                            ? "ऑनलाइन फॉर्म में बस विकल्प दिखेगा"
                                            : "दिखेगा और कुल राशि में जुड़ेगा"
                                          : "न दिखेगा, न जुड़ेगा (Hidden)"}
                                      </span>
                                    </div>
                                  </label>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    value={val === 0 ? "" : val}
                                    onChange={(e) => updateClassFeeAmount(cls.id, item.field, e.target.value)}
                                    placeholder="0"
                                    className="w-full pl-6 pr-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black tabular-nums text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Extra Custom Fee Heads per Class */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/70 space-y-2">
                          {(draft.customHeads || []).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {(draft.customHeads || []).map((ch) => {
                                const chActive = ch.enabled !== false;
                                return (
                                  <div
                                    key={ch.id}
                                    className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                                      chActive
                                        ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800"
                                        : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-70"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={chActive}
                                      onChange={() => toggleClassCustomHead(cls.id, ch.id)}
                                      className="w-4 h-4 accent-indigo-600 cursor-pointer shrink-0"
                                    />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex-1">
                                      {ch.name}
                                    </span>
                                    <div className="relative w-24 shrink-0">
                                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                                        ₹
                                      </span>
                                      <input
                                        type="number"
                                        min={0}
                                        value={ch.amount}
                                        onChange={(e) => updateClassCustomHeadAmount(cls.id, ch.id, e.target.value)}
                                        className="w-full pl-5 pr-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-black tabular-nums text-right text-slate-900 dark:text-white"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => removeClassCustomHead(cls.id, ch.id)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                            <input
                              type="text"
                              value={customInput.name}
                              onChange={(e) =>
                                setNewCustomHeadInputs((prev) => ({
                                  ...prev,
                                  [cls.id]: { ...customInput, name: e.target.value },
                                }))
                              }
                              placeholder="+ अन्य शुल्क जोड़ें (जैसे Exam Fee, Tie-Belt, Computer Fee)"
                              className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-white"
                            />
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                value={customInput.amount}
                                onChange={(e) =>
                                  setNewCustomHeadInputs((prev) => ({
                                    ...prev,
                                    [cls.id]: { ...customInput, amount: e.target.value },
                                  }))
                                }
                                placeholder="राशि ₹"
                                className="w-28 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-bold tabular-nums text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={() => addClassCustomHead(cls.id)}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> जोड़ें
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* 1. ADMIN APPLICATIONS REVIEW LIST */}
        {activeTab === "applications" && isAdmin && (
          <div className="space-y-4">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {[
                { label: "Total Applications", count: applications.length, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
                { label: "⭐ Today's New", count: applications.filter((a) => isTodayIso(a.appliedAt)).length, color: "text-amber-600 font-black", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700" },
                { label: "Pending Review", count: applications.filter((a) => a.status === "pending").length, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
                { label: "Approved & Enrolled", count: applications.filter((a) => a.status === "approved").length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
                { label: "Rejected", count: applications.filter((a) => a.status === "rejected").length, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
              ].map((s, idx) => (
                <div key={idx} className={`${s.bg} p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700`}>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{s.label}</p>
                  <p className={`text-xl sm:text-2xl font-black mt-1 tabular-nums ${s.color}`}>{s.count}</p>
                </div>
              ))}
            </div>

            {/* Search & Filter */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, App No, phone..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-medium"
                />
              </div>
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto">
                {(["all", "today", "pending", "approved", "rejected"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer shrink-0 ${
                      statusFilter === st
                        ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {st === "today" ? `⭐ Today (${applications.filter((a) => isTodayIso(a.appliedAt)).length})` : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Applications List */}
            {loading ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center text-slate-400 text-sm font-bold">
                Loading admission applications...
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
                <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="font-black text-slate-700 dark:text-slate-200 text-base">
                  No Admission Applications Yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  नया आवेदन भरने के लिए "+ New Admission Form" पर क्लिक करें।
                </p>
                <button
                  onClick={() => setActiveTab("new_form")}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs cursor-pointer"
                >
                  + Fill New Admission Form
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredApps.map((app) => (
                  <div
                    key={app.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0 font-black text-blue-600">
                          {app.photoUrl ? (
                            <img src={app.photoUrl} alt={app.studentName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{app.studentName.charAt(0).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-mono text-[11px] font-black">
                              {app.applicationNo}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
                              Class: {app.className}
                            </span>
                            {isTodayIso(app.appliedAt) && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center gap-1 shadow-xs">
                                <Sparkles className="w-3 h-3" /> आज का नया आवेदन (Today)
                              </span>
                            )}
                            {app.status === "pending" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                            {app.status === "approved" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Enrolled {app.assignedRollNo ? `(Roll #${app.assignedRollNo})` : ""}
                              </span>
                            )}
                            {app.status === "rejected" && (
                              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-black text-slate-900 dark:text-white">
                            {app.studentName}{" "}
                            <span className="text-xs font-normal text-slate-500">
                              ({app.gender}, DOB: {app.dateOfBirth || "N/A"})
                            </span>
                            {app.bloodGroup && (
                              <span className="ml-2 px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                🩸 {app.bloodGroup}
                              </span>
                            )}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <span>👨 Father: <strong>{app.fatherName}</strong></span>
                            <span>👩 Mother: <strong>{app.motherName || "—"}</strong></span>
                            <a
                              href={`tel:${app.phone}`}
                              className="inline-flex items-center gap-1 font-black text-blue-700 dark:text-blue-300 hover:underline px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3.5 h-3.5 text-blue-600" />
                              <span>{app.phone}</span>
                            </a>
                            {app.whatsappNo && (
                              <a
                                href={`https://wa.me/91${app.whatsappNo.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-black text-emerald-700 dark:text-emerald-300 hover:underline px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800"
                                title="WhatsApp Chat"
                              >
                                <span>💬 {app.whatsappNo}</span>
                              </a>
                            )}
                            {app.admissionFeeDetails && (
                              <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                💰 Paid: ₹{Number(app.admissionFeeDetails.paidAmount || 0).toLocaleString("en-IN")}
                                {app.admissionFeeDetails.balanceDue > 0 ? ` (Due ₹${app.admissionFeeDetails.balanceDue})` : ""}
                              </span>
                            )}
                          </div>

                          {/* Payment Screenshot Preview Strip */}
                          {app.paymentScreenshotUrl && (
                            <div className="mt-2 p-2 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-2.5 flex-wrap">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={app.paymentScreenshotUrl}
                                  alt="Payment Proof"
                                  onClick={() => {
                                    setViewScreenshotUrl(app.paymentScreenshotUrl!);
                                    setSelectedScreenshotApp(app);
                                  }}
                                  className="w-11 h-11 object-cover rounded-lg border-2 border-amber-400 shadow-xs cursor-pointer hover:scale-105 transition shrink-0"
                                />
                                <div>
                                  <span className="text-[11px] font-black text-amber-900 dark:text-amber-200 flex items-center gap-1">
                                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>पेमेंट स्क्रीनशॉट संलग्न (Payment Screenshot Attached)</span>
                                  </span>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-300 font-mono">
                                    {app.transactionRef ? `Ref / UTR: ${app.transactionRef}` : "ऑनलाइन भुगतान प्रमाण"}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setViewScreenshotUrl(app.paymentScreenshotUrl!);
                                  setSelectedScreenshotApp(app);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-xs"
                              >
                                <Eye className="w-3 h-3" />
                                <span>स्क्रीनशॉट जांचें</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {/* Uploaded Documents Button */}
                        {app.uploadedDocuments && Object.keys(app.uploadedDocuments).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewDocumentsApp(app)}
                            className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs"
                            title="अपलोड किए गए दस्तावेज़ देखें"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-indigo-600" />
                            <span>दस्तावेज़ ({Object.keys(app.uploadedDocuments).length})</span>
                          </button>
                        )}

                        {app.status === "pending" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setQuickVerifyConfirmApp(app);
                                const selectedCls = classes.find((c) => c.id === app.classId) || classes[0];
                                const localStudents = getLocalStudents(school.id);
                                const clsStudents = localStudents.filter((s) => isStudentInClass(s, selectedCls?.id || app.classId, selectedCls?.name));
                                const maxRoll = clsStudents.reduce((m, s) => {
                                  const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
                                  return !isNaN(n) && n > m ? n : m;
                                }, 0);
                                setQuickConfirmRollNo(String(maxRoll + 1));
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/25 active:scale-95 transition cursor-pointer"
                              title="पेमेंट चेक करके तुरंत दाखिला कन्फर्म करें"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>पेमेंट चेक व एडमिशन कन्फर्म</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPrintStudioState({
                                  open: true,
                                  application: app,
                                  className: app.className,
                                  mode: "form_only",
                                })
                              }
                              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" /> फॉर्म प्रिंट
                            </button>
                            <button
                              type="button"
                              onClick={() => openEnrollModal(app)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> Approve &amp; Enroll
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAppId(rejectingAppId === app.id ? null : app.id);
                                setRejectReason("Criteria / Documents incomplete");
                              }}
                              className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-4 h-4" /> Reject
                            </button>
                          </>
                        )}

                        {app.status === "approved" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                setPrintStudioState({
                                  open: true,
                                  student,
                                  application: app,
                                  className: student.className || app.className,
                                  feeRecord: fee,
                                  mode: "form_only",
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" /> दाखिला फॉर्म (A4)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                setPrintStudioState({
                                  open: true,
                                  student,
                                  application: app,
                                  className: student.className || app.className,
                                  feeRecord: fee,
                                  mode: "receipt_only",
                                });
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                              title="प्रवेश शुल्क रसीद अलग से प्रिंट करें"
                            >
                              <ReceiptText className="w-3.5 h-3.5" /> प्रवेश रसीद (Receipt)
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const { student, fee } = resolveApplicationStudentAndFee(app);
                                if (fee) {
                                  setPosReceiptState({ open: true, student, fee });
                                } else {
                                  setPrintStudioState({
                                    open: true,
                                    student,
                                    application: app,
                                    className: student.className || app.className,
                                    feeRecord: null,
                                    mode: "receipt_only",
                                  });
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                              <ReceiptText className="w-3.5 h-3.5" /> POS / रसीद
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Reject Confirmation Bar */}
                    {rejectingAppId === app.id && (
                      <div className="pt-3 border-t border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-center gap-2 bg-rose-50/60 dark:bg-rose-950/20 p-3 rounded-xl">
                        <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                          Reject {app.studentName}? Reason:
                        </span>
                        <input
                          type="text"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-xs"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmReject(app)}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold cursor-pointer"
                          >
                            Confirm Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingAppId(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. ADMISSION APPLICATION FORM & PARENT DASHBOARD */}
        {activeTab === "new_form" && (
          <>
            {/* PARENT DASHBOARD: Registered Applications & "+ Admission" option for multiple applications under 1 ID */}
            {!isAdmin && parentView === "dashboard" && parentApplications.length > 0 && !submittedApp ? (
              <div className="max-w-4xl mx-auto space-y-5">
                {/* Parent ID & Overview Card */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center font-black text-2xl shadow-inner">
                      👨‍👩‍👧
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                          Parent ID Active
                        </span>
                        <span className="text-xs text-slate-300 font-mono">
                          +91 {parentPortalPhone || "Self"}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black mt-1">
                        अभिभावक ऑनलाइन आवेदन डैशबोर्ड
                      </h2>
                      <p className="text-xs text-indigo-200">
                        आपके इस नंबर से कुल <strong className="text-amber-300">{parentApplications.length}</strong> छात्र आवेदन दर्ज हैं।
                      </p>
                    </div>
                  </div>

                  {/* Action Button: + Add Student Admission under the same ID */}
                  <button
                    type="button"
                    onClick={handleStartNewSiblingAdmission}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ नया छात्र एडमिशन जोड़ें (+ Admission)</span>
                  </button>
                </div>

                {/* Quick search/switch number bar */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
                  <span className="text-slate-600 dark:text-slate-300 font-bold flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span>किसी अन्य फोन नंबर से आवेदन देखें या बदलें:</span>
                  </span>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="tel"
                      maxLength={10}
                      value={parentPhoneInput}
                      onChange={(e) => setParentPhoneInput(e.target.value.replace(/\D/g, ""))}
                      placeholder="10 अंकों का मोबाइल नंबर"
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono w-44"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (parentPhoneInput.length === 10) {
                          localStorage.setItem("nsta_parent_portal_phone", parentPhoneInput);
                          setParentPortalPhone(parentPhoneInput);
                          setParentPhoneInput("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      खोजें
                    </button>
                  </div>
                </div>

                {/* Applications List */}
                <div className="space-y-4">
                  {parentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-md border border-slate-200 dark:border-slate-700 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-black text-indigo-600 shrink-0">
                            {app.photoUrl ? (
                              <img src={app.photoUrl} alt={app.studentName} className="w-full h-full object-cover" />
                            ) : (
                              <span>{app.studentName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                {app.applicationNo}
                              </span>
                              <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                Class: {app.className}
                              </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                              {app.studentName}
                            </h3>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {app.status === "pending" && (
                            <div className="px-3.5 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-black flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>सत्यापन हेतु लंबित (Pending Admin Verification)</span>
                            </div>
                          )}
                          {app.status === "approved" && (
                            <div className="px-3.5 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 text-xs font-black flex items-center gap-1.5 shadow-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>🎉 दाखिला पक्का! Roll #{app.assignedRollNo || "1"}</span>
                            </div>
                          )}
                          {app.status === "rejected" && (
                            <div className="px-3.5 py-1.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800 text-xs font-black flex items-center gap-1.5">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>आवेदन अस्वीकृत (Rejected)</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-600 dark:text-slate-300">
                        <div>
                          <span className="text-[10px] text-slate-400 block">पिता का नाम:</span>
                          <strong className="text-slate-900 dark:text-white">{app.fatherName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">आवेदन तिथि:</span>
                          <strong>{new Date(app.appliedAt).toLocaleDateString("en-IN")}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">वाहन / बस सुविधा:</span>
                          <strong>{app.usesBus ? `हाँ (${app.busRoute || "Bus"})` : "नहीं"}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">दस्तावेज़ स्थिति:</span>
                          <strong className="text-emerald-600">
                            {app.uploadedDocuments
                              ? `${Object.keys(app.uploadedDocuments).length} फाइलें अपलोडेड`
                              : `${(app.submittedDocs || []).length} संलग्न`}
                          </strong>
                        </div>
                      </div>

                      {/* Payment Screenshot Preview */}
                      {app.paymentScreenshotUrl ? (
                        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3">
                            <img
                              src={app.paymentScreenshotUrl}
                              alt="Payment Proof"
                              onClick={() => {
                                setViewScreenshotUrl(app.paymentScreenshotUrl!);
                                setSelectedScreenshotApp(app);
                              }}
                              className="w-12 h-12 object-cover rounded-xl border border-emerald-400 shadow-xs cursor-pointer hover:scale-105 transition"
                            />
                            <div className="text-xs">
                              <span className="font-black text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                                <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>पेमेंट स्क्रीनशॉट संलग्न है (Payment Attached)</span>
                              </span>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {app.transactionRef ? `Ref / UTR: ${app.transactionRef}` : "ऑनलाइन भुगतान प्रमाण"}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setViewScreenshotUrl(app.paymentScreenshotUrl!);
                              setSelectedScreenshotApp(app);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                          >
                            स्क्रीनशॉट देखें
                          </button>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3 text-xs flex-wrap">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>पेमेंट स्क्रीनशॉट अभी अपलोड नहीं किया गया है।</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittedApp(app);
                              setPaymentSubmittedNotice(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer"
                          >
                            + स्क्रीनशॉट अपलोड करें
                          </button>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setPrintStudioState({
                              open: true,
                              application: app,
                              className: app.className,
                              mode: "form_only",
                            })
                          }
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> दाखिला फॉर्म प्रिंट करें (A4)
                        </button>

                        {app.status === "approved" && (
                          <button
                            type="button"
                            onClick={() => {
                              const { student, fee } = resolveApplicationStudentAndFee(app);
                              setPrintStudioState({
                                open: true,
                                student,
                                application: app,
                                className: student.className || app.className,
                                feeRecord: fee,
                                mode: "receipt_only",
                              });
                            }}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            <ReceiptText className="w-3.5 h-3.5" /> आधिकारिक फीस रसीद (Official Receipt)
                          </button>
                        )}

                        {app.uploadedDocuments && Object.keys(app.uploadedDocuments).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setViewDocumentsApp(app)}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                            <span>दस्तावेज़ देखें ({Object.keys(app.uploadedDocuments).length})</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
            {submittedApp ? (
              (() => {
                const targetCls = classes.find((c) => c.id === submittedApp.classId);
                const fees = getClassFees(targetCls, { usesBus: submittedApp.usesBus });
                const totalPayable = fees.totalPayable;
                const schoolPhone = (school.whatsappNo || school.mobile || school.phone || "").replace(/\D/g, "");
                const cleanWhatsAppNumber = schoolPhone.length === 10 ? `91${schoolPhone}` : schoolPhone || "919876543210";

                const whatsappLines = [
                  `*🏛️ ${school.name || "School"}*`,
                  `*📋 नए प्रवेश हेतु ऑनलाइन आवेदन (Online Admission Application)*`,
                  `----------------------------------`,
                  `• *आवेदन संख्या (App No):* ${submittedApp.applicationNo}`,
                  `• *छात्र का नाम (Student Name):* ${submittedApp.studentName}`,
                  `• *कक्षा (Class Applied):* ${submittedApp.className}`,
                  `• *पिता का नाम (Father's Name):* ${submittedApp.fatherName}`,
                  `• *मोबाइल नंबर (Mobile):* ${submittedApp.phone}`,
                  `• *बस / वाहन सुविधा:* ${submittedApp.usesBus ? `हाँ (Route: ${submittedApp.busRoute || "निर्दिष्ट नहीं"})` : "नहीं (लागू नहीं)"}`,
                  ``,
                  `*💰 निर्धारित प्रवेश शुल्क विवरण (Fee Breakdown):*`,
                  ...fees.enabledHeads.map((h) => `• ${h.label}: ₹${h.amount}`),
                  `----------------------------------`,
                  `*👉 कुल देय राशि (Total Payable): ₹${totalPayable}*`,
                  `----------------------------------`,
                  `नमस्ते, मैंने स्कूल पोर्टल पर एडमिशन फॉर्म भर दिया है। कृपया फीस भुगतान हेतु स्कूल का QR कोड / बैंक विवरण भेजें ताकि हम ₹${totalPayable} का भुगतान कर सकें। धन्यवाद!`,
                ];
                const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(whatsappLines.join("\n"))}`;

                // If pending notice after screenshot/WhatsApp submission
                if (paymentSubmittedNotice) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-300 dark:border-amber-700 space-y-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <Clock className="w-12 h-12" />
                      </div>
                      <span className="px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-black uppercase tracking-wider">
                        ⏳ सत्यापन हेतु लंबित (Pending Admin Approval)
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                        आवेदन व भुगतान विवरण दर्ज हो गया!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto">
                        आवेदन संख्या: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{submittedApp.applicationNo}</strong> • {submittedApp.studentName} ({submittedApp.className})
                      </p>
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-left text-xs space-y-2.5 text-slate-700 dark:text-slate-200 max-w-md mx-auto">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>आपका एडमिशन फॉर्म व फीस भुगतान विवरण स्कूल एडमिन को प्राप्त हो गया है।</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>स्कूल एडमिन द्वारा WhatsApp पर प्राप्त भुगतान का सत्यापन करके आवेदन अप्रूव (Approve) किया जाएगा।</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span>एडमिन द्वारा अप्रूव होते ही छात्र को रोल नंबर आवंटित हो जाएगा और स्टूडेंट पोर्टल पर लॉगिन सक्रिय हो जाएगा।</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPrintStudioState({
                              open: true,
                              application: submittedApp,
                              className: submittedApp.className,
                              mode: "form_only",
                            })
                          }
                          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" /> एडमिशन फॉर्म प्रिंट करें (A4)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedApp(null);
                            setPaymentSubmittedNotice(false);
                            setConfirmedAdmission(null);
                            setPaymentScreenshot(null);
                            setTransactionRef("");
                          }}
                          className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs sm:text-sm font-bold active:scale-95 transition cursor-pointer"
                        >
                          नया आवेदन दर्ज करें
                        </button>

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittedApp(null);
                              setPaymentSubmittedNotice(false);
                              setParentView("dashboard");
                            }}
                            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition cursor-pointer"
                          >
                            <span>👨‍👩‍👧 मेरे सभी आवेदन व स्थिति देखें (+ Admission)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // If confirmed after submitting screenshot
                if (confirmedAdmission) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-300 dark:border-emerald-700 space-y-6">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                          🎉 Online Admission Confirmed
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                          मुबारक हो! आपका एडमिशन पक्का हो गया
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                          फीस रसीद व छात्र नामांकन रिकॉर्ड सफलतापूर्वक दर्ज हो गया है।
                        </p>
                      </div>

                      {/* Allocated Roll Number Highlight Box */}
                      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-15">
                          <GraduationCap className="w-32 h-32" />
                        </div>
                        <p className="text-xs uppercase font-extrabold tracking-widest text-amber-100">
                          🎓 आवंटित छात्र क्रमांक (Allocated Roll Number)
                        </p>
                        <div className="text-5xl sm:text-6xl font-black my-2 tracking-tight drop-shadow-md">
                          Roll #{confirmedAdmission.assignedRollNo}
                        </div>
                        <div className="inline-flex items-center gap-2 bg-black/25 backdrop-blur-xs px-4 py-1.5 rounded-full text-xs font-bold text-white/95">
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>
                            कक्षा {submittedApp.className} के कुल {confirmedAdmission.existingCount} छात्रों के बाद अगला रोल नंबर मिला है
                          </span>
                        </div>
                      </div>

                      {/* Details & Fee Summary */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                          <p className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider mb-2">छात्र व आवेदन विवरण</p>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Application No:</span>
                            <strong className="font-mono text-indigo-600 dark:text-indigo-400">{submittedApp.applicationNo}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Student Name:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.studentName}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Class Enrolled:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.className}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Father's Name:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.fatherName}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mobile:</span>
                            <strong className="text-slate-800 dark:text-white">{submittedApp.phone}</strong>
                          </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
                          <p className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider mb-2">जमा शुल्क विवरण (Paid)</p>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>प्रवेश शुल्क (Admission Charge):</span>
                            <strong className="text-slate-900 dark:text-white">₹{confirmedAdmission.admissionCharge}</strong>
                          </div>
                          <div className="flex justify-between text-slate-600 dark:text-slate-300">
                            <span>वार्षिक शुल्क (Annual Charge):</span>
                            <strong className="text-slate-900 dark:text-white">₹{confirmedAdmission.annualCharge}</strong>
                          </div>
                          <div className="pt-2 border-t border-emerald-300 dark:border-emerald-800 flex justify-between text-sm font-black text-emerald-700 dark:text-emerald-300">
                            <span>कुल भुगतान (Total Paid):</span>
                            <span>₹{confirmedAdmission.totalPayable}</span>
                          </div>
                          <div className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Payment Screenshot & Push Notification sent to School Admin</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment Screenshot Preview if submitted */}
                      {paymentScreenshot && (
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img src={paymentScreenshot} alt="Payment Proof" className="w-12 h-12 object-cover rounded-xl border border-slate-300 dark:border-slate-600 shrink-0" />
                            <div className="text-left text-xs">
                              <p className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                                <span>पेमेंट स्क्रीनशॉट संलग्न है</span>
                              </p>
                              {transactionRef && <p className="text-[11px] text-slate-500 font-mono">Ref / UTR: {transactionRef}</p>}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setViewScreenshotUrl(paymentScreenshot)}
                            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-xs font-bold rounded-lg text-slate-800 dark:text-white hover:bg-slate-300 cursor-pointer"
                          >
                            देखें
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPrintStudioState({
                              open: true,
                              student: confirmedAdmission.student,
                              application: { ...submittedApp, assignedRollNo: confirmedAdmission.assignedRollNo },
                              className: submittedApp.className,
                              feeRecord: confirmedAdmission.feeRecord,
                              mode: "form_only",
                            });
                          }}
                          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <Printer className="w-4 h-4" /> दाखिला फॉर्म प्रिंट करें (A4)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setPrintStudioState({
                              open: true,
                              student: confirmedAdmission.student,
                              application: { ...submittedApp, assignedRollNo: confirmedAdmission.assignedRollNo },
                              className: submittedApp.className,
                              feeRecord: confirmedAdmission.feeRecord,
                              mode: "receipt_only",
                            });
                          }}
                          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <ReceiptText className="w-4 h-4" /> सिर्फ फीस रसीद (Receipt)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedApp(null);
                            setConfirmedAdmission(null);
                            setPaymentScreenshot(null);
                            setTransactionRef("");
                          }}
                          className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs sm:text-sm font-bold active:scale-95 transition cursor-pointer"
                        >
                          Submit Another Application
                        </button>

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittedApp(null);
                              setConfirmedAdmission(null);
                              setPaymentScreenshot(null);
                              setTransactionRef("");
                              setParentView("dashboard");
                            }}
                            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition cursor-pointer"
                          >
                            <span>👨‍👩‍👧 मेरे सभी आवेदन देखें (+ Add Admission)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // If not yet confirmed -> Show Fee Breakdown + UPI QR + Screenshot Upload
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
                    {/* Header */}
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <CheckCircle2 className="w-9 h-9" />
                      </div>
                      <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-black uppercase">
                        चरण 2: शुल्क भुगतान एवं स्क्रीनशॉट
                      </span>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        प्रवेश आवेदन दर्ज हो गया!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                        Application No:{" "}
                        <strong className="font-mono text-indigo-600 dark:text-indigo-400 text-sm sm:text-base">
                          {submittedApp.applicationNo}
                        </strong>{" "}
                        • {submittedApp.studentName} ({submittedApp.className})
                      </p>
                    </div>

                    {/* Step 1: Fee Charges Breakdown Box (Admission + Annual Charge) - Strictly Fixed & Non-editable */}
                    <div className="bg-gradient-to-br from-indigo-50/80 via-blue-50/60 to-slate-50 dark:from-indigo-950/40 dark:via-slate-900/50 dark:to-slate-900/80 rounded-2xl p-5 border border-indigo-200/90 dark:border-indigo-800/70 shadow-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <IndianRupee className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            कक्षा {submittedApp.className} का निर्धारित आधिकारिक शुल्क (Fixed Official Charges)
                          </h3>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase flex items-center gap-1 border border-amber-300/80 dark:border-amber-800">
                          <Lock className="w-3 h-3 text-amber-700 dark:text-amber-400" />
                          <span>फिक्स शुल्क (Non-Editable)</span>
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        {fees.enabledHeads.map((headItem) => (
                          <div
                            key={headItem.key}
                            className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/70 dark:border-slate-700"
                          >
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <span>{headItem.label}</span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                  Exact
                                </span>
                              </p>
                              {headItem.hint && <p className="text-[11px] text-slate-500">{headItem.hint}</p>}
                            </div>
                            <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                              ₹{headItem.amount}
                            </span>
                          </div>
                        ))}

                        <div className="flex items-center justify-between p-3.5 bg-emerald-600 text-white rounded-xl shadow-md">
                          <div>
                            <span className="font-black text-sm block">कुल देय राशि (Exact Total Payable Amount):</span>
                            <span className="text-[10px] text-emerald-100 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-200" />
                              <span>कोई कमी या बदलाव (कम/बेशी) देय नहीं है</span>
                            </span>
                          </div>
                          <span className="text-xl sm:text-2xl font-black font-mono">₹{totalPayable}</span>
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Pay via Direct WhatsApp to School */}
                    <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 rounded-3xl p-6 border-2 border-emerald-400 dark:border-emerald-700 text-center space-y-4 shadow-lg shadow-emerald-500/10">
                      <div className="w-14 h-14 rounded-2xl bg-[#25D366] text-white flex items-center justify-center mx-auto shadow-md">
                        <MessageCircle className="w-8 h-8" />
                      </div>

                      <div>
                        <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-black uppercase tracking-wider border border-emerald-300 dark:border-emerald-700">
                          WhatsApp डायरेक्ट पेमेंट (Direct WhatsApp Payment)
                        </span>
                        <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-2">
                          WhatsApp पर फीस विवरण भेजें व स्कूल से QR कोड प्राप्त करें
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-md mx-auto">
                          नीचे दिए गए बटन पर क्लिक करते ही स्कूल के WhatsApp नंबर (<strong className="font-mono text-emerald-700 dark:text-emerald-400">+{cleanWhatsAppNumber}</strong>) पर छात्र का नाम, कक्षा और कुल ₹{totalPayable} फीस का संदेश तैयार मिलेगा।
                        </p>
                      </div>

                      <div className="max-w-md mx-auto">
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                        >
                          <MessageCircle className="w-5 h-5 text-white" />
                          <span>WhatsApp पर फीस भेजें और QR कोड प्राप्त करें</span>
                        </a>

                        <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold mt-2.5 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>WhatsApp पर QR कोड से पेमेंट करने के बाद नीचे स्क्रीनशॉट / UTR अपलोड करें</span>
                        </p>
                      </div>
                    </div>

                    {/* Step 3: Upload Screenshot & Send */}
                    <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl p-5 border-2 border-dashed border-amber-300 dark:border-amber-700 space-y-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Upload className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-black text-sm text-slate-900 dark:text-white">
                            पेमेंट का स्क्रीनशॉट भेजें (Upload Screenshot)
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            स्क्रीनशॉट भेजते ही स्कूल एडमिन को <strong>लाइव नोटिफिकेशन</strong> चला जाएगा और छात्र को <strong>कक्षा के छात्रों के बाद का रोल नंबर</strong> तुरंत मिल जाएगा।
                          </p>
                        </div>
                      </div>

                      {/* File input button & preview */}
                      <input
                        type="file"
                        ref={screenshotFileInputRef}
                        accept="image/*"
                        onChange={handleScreenshotFileChange}
                        className="hidden"
                      />

                      {paymentScreenshot ? (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={paymentScreenshot}
                              alt="Payment Screenshot Preview"
                              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                            />
                            <div className="text-left text-xs">
                              <p className="font-bold text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>स्क्रीनशॉट चुना गया</span>
                              </p>
                              <p className="text-[11px] text-slate-500">तैयार है भेजने के लिए</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentScreenshot(null)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-bold cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => screenshotFileInputRef.current?.click()}
                          className="w-full py-4 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-xl bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-700/60 transition flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Camera className="w-6 h-6 text-amber-600" />
                          <span className="text-xs font-black">कैमरा / गैलरी से पेमेंट स्क्रीनशॉट अपलोड करें</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG या WebP फ़ाइल (अधिकतम 8MB)</span>
                        </button>
                      )}

                      {/* Optional UTR / Reference ID */}
                      <div className="text-left">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                          UPI Ref / Transaction UTR No. (वैकल्पिक):
                        </label>
                        <input
                          type="text"
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="e.g. 512398471923 या UTR नंबर"
                          className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                      </div>

                      {screenshotError && (
                        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{screenshotError}</span>
                        </div>
                      )}

                      {/* Send Button */}
                      <button
                        type="button"
                        onClick={handleSendPaymentScreenshot}
                        disabled={submittingScreenshot}
                        className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                      >
                        {submittingScreenshot ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>स्क्रीनशॉट भेजा जा रहा है व रोल नंबर आवंटित हो रहा है...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>स्क्रीनशॉट भेजें और एडमिशन पक्का करें (Get Roll Number)</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex flex-wrap justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPrintStudioState({
                            open: true,
                            application: submittedApp,
                            className: submittedApp.className,
                            mode: "form_only",
                          })
                        }
                        className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Printer className="w-4 h-4" /> फॉर्म प्रिंट करें (A4)
                      </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            const appToEnroll = submittedApp;
                            setSubmittedApp(null);
                            setActiveTab("applications");
                            openEnrollModal(appToEnroll);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> एडमिन: नकद फीस जमा करें
                        </button>
                      )}

                      {!isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setSubmittedApp(null);
                            setParentView("dashboard");
                          }}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/25 active:scale-95 transition cursor-pointer"
                        >
                          👨‍👩‍👧 मेरे सभी आवेदन देखें (+ Add Admission)
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedApp(null);
                          if (!isAdmin) setParentView("dashboard");
                        }}
                        className="px-4 py-2.5 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
                      >
                        {!isAdmin ? "← डैशबोर्ड" : "वापस जाएं"}
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <form
                onSubmit={handleSubmitForm}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6"
              >
                {/* PARENT QUICK NAVIGATION / LOOKUP BAR */}
                {!isAdmin && (
                  <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-bold shrink-0">
                        👨‍👩‍👧
                      </div>
                      <div>
                        <p className="font-black text-white text-xs">
                          {parentApplications.length > 0
                            ? `पैरेंट आईडी (+91 ${parentPortalPhone}): ${parentApplications.length} आवेदन दर्ज हैं`
                            : "अभिभावक ऑनलाइन प्रवेश (Parent Admission Portal)"}
                        </p>
                        <p className="text-[11px] text-indigo-200">
                          {parentApplications.length > 0
                            ? "एक ही आईडी से आप अपने दूसरे बच्चों का भी नया एडमिशन जोड़ सकते हैं।"
                            : "फॉर्म सबमिट करते ही आपका पैरेंट आईडी व डैशबोर्ड एक्टिव हो जाएगा।"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      {parentApplications.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setParentView("dashboard")}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>पंजीकृत आवेदन देखें ({parentApplications.length})</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                          <input
                            type="tel"
                            maxLength={10}
                            value={parentPhoneInput}
                            onChange={(e) => setParentPhoneInput(e.target.value.replace(/\D/g, ""))}
                            placeholder="पूर्व मोबाइल नंबर"
                            className="px-2.5 py-1.5 rounded-xl border border-indigo-400/50 bg-slate-800 text-xs text-white placeholder:text-slate-400 font-mono w-32"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (parentPhoneInput.length === 10) {
                                localStorage.setItem("nsta_parent_portal_phone", parentPhoneInput);
                                setParentPortalPhone(parentPhoneInput);
                                setParentView("dashboard");
                                setParentPhoneInput("");
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shrink-0"
                          >
                            खोजें
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="border-b border-slate-200 dark:border-slate-700 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">
                        {school.name} — Admission Form
                      </h2>
                      <p className="text-xs text-slate-500">
                        Academic Session {activeSession?.name || "2026-27"} • Official Registration
                      </p>
                    </div>
                  </div>

                  {/* Photo Upload in Form */}
                  <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <div className="w-12 h-14 rounded-lg border border-dashed border-indigo-400 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 shrink-0">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="Applicant" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-400 text-center font-bold px-1">Photo</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 mb-1">Student Photo</p>
                      <DirectUploadButton
                        kind="image"
                        compact
                        currentUrl={form.photoUrl}
                        onUploaded={(url) => setForm((p) => ({ ...p, photoUrl: url }))}
                        onClear={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                      />
                    </div>
                  </div>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Admission Type Toggle */}
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      प्रवेश का प्रकार (Admission Type)
                    </span>
                    <p className="text-[11px] text-slate-500">क्या यह नया नामांकन है या अगली कक्षा में पुनः प्रवेश?</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, admissionType: "NEW" })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        form.admissionType === "NEW"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      ✓ NEW ADMISSION (नया प्रवेश)
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, admissionType: "READMISSION" })}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        form.admissionType === "READMISSION"
                          ? "bg-indigo-600 text-white shadow"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      RE-ADMISSION / PROMOTION (पुनः प्रवेश)
                    </button>
                  </div>
                </div>

                {/* Student Bio-Data */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                    1. Student Bio-Data (छात्र का विवरण)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Student Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.studentName}
                        onChange={(e) => setForm({ ...form, studentName: e.target.value })}
                        placeholder="e.g. Aarav Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Applying For Class *
                      </label>
                      {classes.length === 0 ? (
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>इस स्कूल में अभी कोई कक्षा उपलब्ध नहीं है। कृपया स्कूल एडमिन से क्लास जोड़ने को कहें।</span>
                        </div>
                      ) : (
                        <select
                          value={form.classId}
                          onChange={(e) => setForm({ ...form, classId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {classes.map((c) => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {formatClassLabel(c)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Senior Secondary Stream Selection for Class 11 & 12 */}
                    {(() => {
                      const curCls = classes.find((c) => c.id === form.classId) || classes[0];
                      if (!curCls || !isSeniorClass(curCls.name)) return null;
                      return (
                        <div className="sm:col-span-2 p-3.5 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 dark:from-indigo-950/40 dark:to-purple-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                              <span>🔬 Senior Secondary Stream (11वीं / 12वीं स्ट्रीम चयन) *</span>
                            </label>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                              {curCls.name} Mandatory
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {SENIOR_STREAMS.map((st) => {
                              const isSel = (form.stream || "Science") === st.id;
                              return (
                                <button
                                  type="button"
                                  key={st.id}
                                  onClick={() => setForm({ ...form, stream: st.id })}
                                  className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isSel
                                      ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-400"
                                      : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}
                                >
                                  {st.icon} {st.id}
                                </button>
                              );
                            })}
                          </div>
                          <div className="text-[11px] text-indigo-900 dark:text-indigo-200 bg-white/80 dark:bg-slate-900/80 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900">
                            <span className="font-bold">स्ट्रीम विषय (Pre-configured Subjects): </span>
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {getDefaultSubjectsForClass(curCls.name, form.stream || "Science").join(", ")}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Official Class Fee Summary (Locked by School Admin; User can ONLY toggle Bus) */}
                    {(() => {
                      const curCls = classes.find((c) => c.id === form.classId) || classes[0];
                      if (!curCls) return null;
                      const fees = getClassFees(curCls, { usesBus: form.usesBus });
                      const curClsLabel = formatClassLabel(curCls);
                      return (
                        <div className="sm:col-span-2 p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-slate-900 rounded-2xl border border-emerald-300 dark:border-emerald-800 shadow-xs space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900 dark:text-emerald-300">
                              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                {curClsLabel ? `कक्षा ${curClsLabel}` : "चयनित कक्षा"} का निर्धारित ऑफिशियल शुल्क (Fixed Official Charges)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setActiveTab("fee_setup")}
                                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Sliders className="w-3 h-3" />
                                  <span>Admin: Class-Wise शुल्क बदलें</span>
                                </button>
                              )}
                              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                <span>नॉन-एडिटेबल (Fixed)</span>
                              </span>
                            </div>
                          </div>

                          {/* User-Only Bus Select / Unselect Option (Shown ONLY if Admin enabled Bus for this class) */}
                          {fees.busAvailable && (
                            <div className="p-3 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-200 dark:border-emerald-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={form.usesBus}
                                  onChange={(e) => setForm({ ...form, usesBus: e.target.checked })}
                                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                />
                                <Bus className="w-4 h-4 text-amber-600 shrink-0" />
                                <div className="text-xs">
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    स्कूल बस / वाहन सुविधा चुनें (Bus Facility)
                                  </span>
                                  <span className="ml-1.5 font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                                    {fees.rawBusFee > 0 ? `(+₹${fees.rawBusFee})` : "(₹0)"}
                                  </span>
                                </div>
                              </label>
                              {form.usesBus && (
                                <input
                                  type="text"
                                  value={form.busRoute}
                                  onChange={(e) => setForm({ ...form, busRoute: e.target.value })}
                                  placeholder="बस स्टॉप / रूट लिखें (Nearest Stop)"
                                  className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white sm:w-60"
                                />
                              )}
                            </div>
                          )}

                          {/* Itemized Fee Breakdown List */}
                          <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between pb-1 text-xs font-black text-slate-800 dark:text-slate-200">
                              <span className="flex items-center gap-1.5">
                                <ReceiptText className="w-3.5 h-3.5 text-emerald-600" />
                                <span>शुल्क विवरण — किस चीज़ का कितना पैसा लिया जा रहा है (Itemized Fee Breakdown):</span>
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                {fees.enabledHeads.length} शुल्क घटक
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              {fees.enabledHeads.map((head) => (
                                <div
                                  key={head.key}
                                  className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-emerald-100 dark:border-slate-700 flex items-center justify-between gap-2 shadow-2xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <p className="font-bold text-slate-900 dark:text-white truncate text-xs" title={head.label}>
                                      {head.label}
                                    </p>
                                    {head.hint && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                        {head.hint}
                                      </p>
                                    )}
                                  </div>
                                  <span className="font-mono font-black text-slate-900 dark:text-white tabular-nums px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shrink-0 text-xs">
                                    ₹{head.amount}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Prominent Total Bar */}
                            <div className="p-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white rounded-xl shadow-md flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black uppercase tracking-wider">कुल देय प्रवेश शुल्क (Total Payable)</p>
                                <p className="text-[10px] text-emerald-100">
                                  {form.usesBus ? "बस / वाहन सुविधा सम्मिलित" : "बिना बस सुविधा"}
                                </p>
                              </div>
                              <span className="text-xl sm:text-2xl font-black font-mono tabular-nums bg-white/20 px-3.5 py-1 rounded-xl">
                                ₹{fees.totalPayable}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Gender
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="male" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Male</option>
                          <option value="female" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Female</option>
                          <option value="other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-rose-600 mb-1">
                          Blood Grp
                        </label>
                        <select
                          value={form.bloodGroup}
                          onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Optional</option>
                          {BLOOD_GROUPS.map((bg) => (
                            <option key={bg} value={bg} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {bg}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Category
                        </label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {ADMISSION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Religion (धर्म)
                        </label>
                        <input
                          type="text"
                          value={form.religion}
                          onChange={(e) => setForm({ ...form, religion: e.target.value })}
                          placeholder="e.g. Hindu / Muslim"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Nationality (राष्ट्रीयता)
                        </label>
                        <input
                          type="text"
                          value={form.nationality}
                          onChange={(e) => setForm({ ...form, nationality: e.target.value })}
                          placeholder="Indian"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Student Aadhaar (12-Digit)
                      </label>
                      <input
                        type="text"
                        maxLength={14}
                        value={form.aadhaarNo}
                        onChange={(e) => setForm({ ...form, aadhaarNo: e.target.value.replace(/[^\d\s]/g, "") })}
                        placeholder="XXXX XXXX XXXX"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Medical History / Allergies (स्वास्थ्य विवरण)
                      </label>
                      <input
                        type="text"
                        value={form.medicalHistory}
                        onChange={(e) => setForm({ ...form, medicalHistory: e.target.value })}
                        placeholder="e.g. None / Normal / Asthma"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Parent & Contact Details */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                    2. Parent &amp; Contact Information (अभिभावक विवरण)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Father's Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.fatherName}
                        onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                        placeholder="Father's Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Father's Occupation &amp; Aadhaar
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.fatherOccupation}
                          onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
                          placeholder="Occupation"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          value={form.fatherAadhaar}
                          onChange={(e) => setForm({ ...form, fatherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                          placeholder="Father Aadhaar"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Mother's Name
                      </label>
                      <input
                        type="text"
                        value={form.motherName}
                        onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        placeholder="Mother's Full Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Mother's Occupation &amp; Aadhaar
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={form.motherOccupation}
                          onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })}
                          placeholder="Occupation"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <input
                          type="text"
                          maxLength={14}
                          value={form.motherAadhaar}
                          onChange={(e) => setForm({ ...form, motherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                          placeholder="Mother Aadhaar"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Primary Mobile Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="10-digit Mobile Number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          WhatsApp No.
                        </label>
                        <input
                          type="tel"
                          value={form.whatsappNo}
                          onChange={(e) => setForm({ ...form, whatsappNo: e.target.value })}
                          placeholder="WhatsApp"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Family Annual Income (वार्षिक आय)
                        </label>
                        <input
                          type="text"
                          value={form.annualIncome}
                          onChange={(e) => setForm({ ...form, annualIncome: e.target.value })}
                          placeholder="e.g. ₹1,50,000 / year"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid sm:grid-cols-3 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40">
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Emergency Contact Person (आपातकालीन संपर्क)
                        </label>
                        <input
                          type="text"
                          value={form.emergencyContact}
                          onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                          placeholder="Name of Uncle / Guardian"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Emergency Phone No.
                        </label>
                        <input
                          type="tel"
                          value={form.emergencyPhone}
                          onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value })}
                          placeholder="Emergency Mobile"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-amber-900 dark:text-amber-200 mb-1">
                          Relation with Student
                        </label>
                        <input
                          type="text"
                          value={form.emergencyRelation}
                          onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                          placeholder="e.g. Uncle / Brother"
                          className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 grid sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Residential Address *
                        </label>
                        <input
                          type="text"
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="House / Village / Street"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          City / District
                        </label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                          placeholder="City"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          PIN Code
                        </label>
                        <input
                          type="text"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, "") })}
                          placeholder="PIN Code"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transport & Documents */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                  {getClassFees(classes.find((c) => c.id === form.classId) || classes[0]).busAvailable && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={form.usesBus}
                          onChange={(e) => setForm({ ...form, usesBus: e.target.checked })}
                          className="w-4 h-4 accent-amber-600"
                        />
                        <Bus className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-slate-800 dark:text-white">
                          School Bus / Transport Facility Required
                        </span>
                      </label>
                      {form.usesBus && (
                        <input
                          type="text"
                          value={form.busRoute}
                          onChange={(e) => setForm({ ...form, busRoute: e.target.value })}
                          placeholder="Nearest Bus Stop / Route"
                          className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold sm:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      )}
                    </div>
                  )}

                  {/* Same-Family Sibling Live Detection + Teacher Referral in Online Form */}
                  <div className="grid sm:grid-cols-2 gap-3 pt-1">
                    {referrers.length > 0 && (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Referred By Teacher / Staff (शिक्षक संदर्भ — वैकल्पिक)
                        </label>
                        <select
                          value={form.referredByTeacherId}
                          onChange={(e) => setForm({ ...form, referredByTeacherId: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                        >
                          <option value="">-- Direct Admission / कोई शिक्षक नहीं --</option>
                          {referrers.map((ref) => (
                            <option key={ref.id} value={ref.id}>
                              {ref.name} ({ref.designation})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {formSiblingDetection.isExactFamily && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 text-xs space-y-1">
                        <p className="font-bold text-amber-900 dark:text-amber-200">
                          Same Family Sibling Identified ({formSiblingDetection.childNumber}nd/rd Child)
                        </p>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                          इस परिवार से पहले से छात्र नामांकित है:{" "}
                          <strong>{formSiblingDetection.exactMatches.map((s) => s.name).join(", ")}</strong>। प्रवेश अप्रूवल के समय School Admin द्वारा Sibling Discount लागू किया जा सकेगा।
                        </p>
                      </div>
                    )}
                  </div>

                  {/* REQUIRED DOCUMENTS UPLOAD SECTION (Visible to both Parents & Admin) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-emerald-600" />
                          <span>3. आवश्यक दस्तावेज़ अपलोड (Upload Required Documents)</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          नीचे दिए गए सभी दस्तावेजों की फोटो या PDF अपलोड करें अथवा हार्डकॉपी जमा करने पर टिक करें:
                        </p>
                      </div>
                      <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300">
                        {Object.keys(form.uploadedDocuments || {}).length} फाइल्स अपलोडेड
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      {ADMISSION_DOCUMENT_OPTIONS.map((docItem) => {
                        const isUploaded = Boolean(form.uploadedDocuments?.[docItem]);
                        const uploadedData = form.uploadedDocuments?.[docItem];
                        const isChecked = form.submittedDocs.includes(docItem);
                        const fileInputId = `doc_file_${docItem.replace(/[^a-zA-Z0-9]/g, "_")}`;

                        return (
                          <div
                            key={docItem}
                            className={`p-3 rounded-2xl border transition-all space-y-2 ${
                              isUploaded
                                ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-xs"
                                : isChecked
                                ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
                                : "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleFormDoc(docItem)}
                                  className="w-4 h-4 accent-emerald-600 rounded shrink-0 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                                  {docItem}
                                </span>
                              </label>

                              {isUploaded ? (
                                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-black uppercase shrink-0">
                                  ✓ अपलोडेड
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                                  वैकल्पिक/जरूरी
                                </span>
                              )}
                            </div>

                            {/* Uploaded File preview or Upload button */}
                            {isUploaded ? (
                              <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-emerald-300 dark:border-emerald-800">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {uploadedData?.startsWith("data:image/") ? (
                                    <img
                                      src={uploadedData}
                                      alt={docItem}
                                      className="w-9 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 flex items-center justify-center shrink-0">
                                      <FileText className="w-4 h-4" />
                                    </div>
                                  )}
                                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {docItem.split("(")[0]}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setInspectDocModal({ title: docItem, url: uploadedData! })}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 cursor-pointer"
                                    title="दस्तावेज़ देखें"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveUploadedDoc(docItem)}
                                    className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                                    title="हटाएं"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <input
                                  id={fileInputId}
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={(e) => handleDocumentUpload(docItem, e)}
                                  className="hidden"
                                />
                                <label
                                  htmlFor={fileInputId}
                                  className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 bg-white dark:bg-slate-800 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Camera className="w-3.5 h-3.5" />
                                  <span>📷 फोटो / PDF अपलोड करें</span>
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. PAYMENT SCREENSHOT & REFERENCE UPLOAD IN FORM */}
                  <div className="pt-2">
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-orange-50/50 to-white dark:from-amber-950/40 dark:via-slate-900 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700 space-y-3.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-sm">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>4. फीस पेमेंट स्क्रीनशॉट व UTR विवरण (Payment Screenshot)</span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                                Proof Attached
                              </span>
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold">
                              ऑनलाइन फीस भुगतान का स्क्रीनशॉट यहाँ अटैच करें ताकि स्कूल एडमिन तुरंत चेक करके दाखिला अप्रूव कर सकें।
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Screenshot selector / preview */}
                      <input
                        id="form_screenshot_upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFormScreenshotUpload}
                        className="hidden"
                      />

                      {form.paymentScreenshotUrl ? (
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl border-2 border-emerald-400 dark:border-emerald-700 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-3">
                            <img
                              src={form.paymentScreenshotUrl}
                              alt="Payment Proof"
                              className="w-14 h-14 object-cover rounded-xl border border-slate-200 shrink-0"
                            />
                            <div className="text-xs">
                              <span className="font-black text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>पेमेंट स्क्रीनशॉट संलग्न हो गया</span>
                              </span>
                              <p className="text-[11px] text-slate-500">
                                आवेदन के साथ एडमिन को सीधे भेजा जाएगा।
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setInspectDocModal({ title: "Payment Screenshot Proof", url: form.paymentScreenshotUrl })}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                            >
                              देखें
                            </button>
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, paymentScreenshotUrl: "" }))}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label
                          htmlFor="form_screenshot_upload"
                          className="w-full py-4 border-2 border-dashed border-amber-400 dark:border-amber-600 rounded-2xl bg-white dark:bg-slate-800 hover:bg-amber-50/60 dark:hover:bg-slate-700/60 transition flex flex-col items-center justify-center gap-1 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          <Camera className="w-6 h-6 text-amber-600" />
                          <span className="text-xs font-black">
                            📷 कैमरा / गैलरी से पेमेंट स्क्रीनशॉट अटैच करें
                          </span>
                          <span className="text-[10px] text-slate-400">
                            UPI payment receipt, GPay/PhonePe screenshot (JPG, PNG)
                          </span>
                        </label>
                      )}

                      {/* UTR / Ref field */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          UPI Ref / Transaction UTR No. (यदि उपलब्ध हो):
                        </label>
                        <input
                          type="text"
                          value={form.transactionRef}
                          onChange={(e) => setForm({ ...form, transactionRef: e.target.value })}
                          placeholder="e.g. 512398471923 या UTR नंबर"
                          className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* TEACHER / ADMIN OFFLINE COUNTER COLLECTION & DIRECT ENROLLMENT CARD */}
                {isAdmin && (
                  <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-slate-900 border-2 border-emerald-400 dark:border-emerald-700 space-y-4 shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                          <Banknote className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>ऑफलाइन नकद फीस संग्रह व सीधा दाखिला</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
                              Offline Counter
                            </span>
                          </h4>
                          <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                            शिक्षक / काउंटर द्वारा नकद फीस लेकर छात्र तुरंत सक्रिय (Active) हो जाएगा — कोई WhatsApp या अप्रूवल का इंतजार नहीं।
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                        ⚡ Instant Roll No &amp; Receipt
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          आवंटित रोल नंबर (Roll No)
                        </label>
                        <input
                          type="text"
                          value={adminRollNo}
                          onChange={(e) => setAdminRollNo(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-black text-center text-sm focus:ring-2 focus:ring-emerald-500"
                          placeholder="Roll No"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          भुगतान माध्यम (Pay Mode)
                        </label>
                        <select
                          value={adminPayMode}
                          onChange={(e) => setAdminPayMode(e.target.value as any)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold text-xs"
                        >
                          <option value="Cash">💵 Cash (नकद काउंटर)</option>
                          <option value="UPI">📱 Counter UPI / QR</option>
                          <option value="Bank">🏦 Bank Transfer / POS</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          कुल देय शुल्क (Total Due)
                        </label>
                        <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm">
                          ₹{Math.max(0, getClassFees(classes.find((c) => c.id === form.classId) || classes[0], { usesBus: form.usesBus }).totalPayable - (Number(adminConcession) || 0))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                          जमा नकद राशि (Paid Cash) *
                        </label>
                        <input
                          type="number"
                          value={adminPaidAmount}
                          onChange={(e) => {
                            setAdminPaidAmount(e.target.value);
                            setAdminPaidManual(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-400 dark:border-emerald-600 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 font-black text-sm focus:ring-2 focus:ring-emerald-500"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {/* Itemized Counter Breakdown Strip */}
                    {(() => {
                      const curCls = classes.find((c) => c.id === form.classId) || classes[0];
                      const fees = getClassFees(curCls, { usesBus: form.usesBus });
                      return (
                        <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1.5">
                          <p className="font-bold text-slate-700 dark:text-slate-200 text-[11px]">
                            काउंटर रसीद मदें (Counter Receipt Items):
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {fees.enabledHeads.map((h) => (
                              <span
                                key={h.key}
                                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold"
                              >
                                {h.label.split("(")[0].trim()}: <strong>₹{h.amount}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          फीस में रियायत / छूट (Concession / Discount) — यदि लागू हो
                        </label>
                        <input
                          type="number"
                          value={adminConcession || ""}
                          onChange={(e) => setAdminConcession(Math.max(0, Number(e.target.value)))}
                          placeholder="₹ 0"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                          मासिक ट्यूशन फीस (Monthly Tuition Fee for Next Months)
                        </label>
                        <input
                          type="number"
                          value={adminMonthlyFee}
                          onChange={(e) => setAdminMonthlyFee(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {isAdmin ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition cursor-pointer active:scale-[0.99] disabled:opacity-60"
                  >
                    <UserCheck className="w-5 h-5" />
                    <span>
                      {submitting
                        ? "छात्र नामांकित हो रहा है व रसीद बन रही है..."
                        : "✅ छात्र तुरंत नामांकित करें व नकद फीस जमा करें (Direct Student Enrollment)"}
                    </span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? "Submitting Application..." : "Submit Admission Application (आवेदन जमा करें)"}</span>
                  </button>
                )}
              </form>
            )}
              </div>
            )}
          </>
        )}
      </div>

      {/* APPROVE & ENROLL + ADMISSION FEE RECEIPT MODAL */}
      {showEnrollModal && enrollingApp && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 my-6 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                  Direct Student Enrollment &amp; Receipt
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1">
                  Approve &amp; Enroll: {enrollingApp.studentName}
                </h3>
                <p className="text-xs text-slate-500">
                  App No: <strong className="font-mono">{enrollingApp.applicationNo}</strong> • Father: {enrollingApp.fatherName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {enrollError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {enrollError}
              </div>
            )}

            {/* Photo + Class + Roll + Monthly Fee */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-14 h-16 rounded-xl border border-slate-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                  {enrollPhotoUrl ? (
                    <img src={enrollPhotoUrl} alt="Student" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold text-center px-1">Photo</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">Student Photo</p>
                  <DirectUploadButton
                    kind="image"
                    compact
                    currentUrl={enrollPhotoUrl}
                    onUploaded={(url) => setEnrollPhotoUrl(url)}
                    onClear={() => setEnrollPhotoUrl("")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 flex-1 w-full">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assign Class</label>
                  <select
                    value={enrollClassId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setEnrollClassId(nextId);
                      const cls = classes.find((c) => c.id === nextId);
                      setEnrollMonthlyFee(String(cls?.feeStructure?.tuitionFee ?? cls?.defaultFee ?? 0));
                      setEnrollFeeItems(buildDefaultFeeItems(cls, enrollUsesBus, Number(cls?.feeStructure?.busFee || 0)));
                      setEnrollPaidManual(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                        {formatClassLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Roll No.</label>
                  <input
                    type="text"
                    value={enrollRollNo}
                    onChange={(e) => setEnrollRollNo(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Monthly Fee (₹)</label>
                  <input
                    type="number"
                    value={enrollMonthlyFee}
                    onChange={(e) => setEnrollMonthlyFee(e.target.value)}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Aadhaar / APAAR & Bus */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Student Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollStudentAadhaar}
                  onChange={(e) => setEnrollStudentAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Father Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollFatherAadhaar}
                  onChange={(e) => setEnrollFatherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Mother Aadhaar</label>
                <input
                  type="text"
                  maxLength={14}
                  value={enrollMotherAadhaar}
                  onChange={(e) => setEnrollMotherAadhaar(e.target.value.replace(/[^\d\s]/g, ""))}
                  placeholder="12-digit"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">APAAR / PEN ID</label>
                <input
                  type="text"
                  value={enrollApaarId}
                  onChange={(e) => setEnrollApaarId(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-mono font-semibold"
                />
              </div>
            </div>

            {/* Documents Verified Checklist */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-300">
                Documents Verified (प्रवेश फॉर्म पर [✓] छपेगा)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ADMISSION_DOCUMENT_OPTIONS.map((docItem) => {
                  const active = enrollSubmittedDocs.includes(docItem);
                  return (
                    <label
                      key={docItem}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                        active
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-800 dark:text-emerald-200"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggleEnrollDoc(docItem)}
                        className="w-3.5 h-3.5 accent-emerald-600"
                      />
                      <span className="truncate">{docItem}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Same-Family Sibling Auto-Discount & Teacher 10% Referral Panel */}
            <AdmissionReferralAndSiblingPanel
              siblingDetection={enrollSiblingDetection}
              manualSiblingMarked={enrollManualSibling}
              onManualSiblingChange={setEnrollManualSibling}
              siblingDiscountPct={enrollSiblingDiscountPct}
              siblingAdmissionDiscountAmt={enrollConcession}
              applyMonthlySiblingDiscount={enrollApplyMonthlySibling}
              baseMonthlyTuition={enrollBaseMonthlyFee}
              eligibleAdmissionGrossExclBus={enrollEligibleGrossExclBus}
              onApplySiblingPresetPct={handleEnrollSiblingPresetPct}
              onCustomAdmissionDiscountChange={(amt) => {
                setEnrollSiblingDiscountPct(0);
                setEnrollConcession(amt);
                setEnrollPaidManual(false);
              }}
              onToggleMonthlySiblingDiscount={handleEnrollToggleMonthlySibling}
              referrers={referrers}
              referredByTeacherId={enrollReferredById}
              customTeacherName={enrollCustomTeacherName}
              commissionPct={enrollCommissionPct}
              commissionScope={enrollCommissionScope}
              commissionDuration={enrollCommissionDuration}
              eligiblePaidNowExclBus={enrollEligiblePaidExclBus}
              eligibleDueExclBus={enrollEligibleDueExclBus}
              onSelectReferrer={setEnrollReferredById}
              onCustomTeacherNameChange={setEnrollCustomTeacherName}
              onCommissionPctChange={setEnrollCommissionPct}
              onCommissionScopeChange={setEnrollCommissionScope}
              onCommissionDurationChange={(dur) => {
                setEnrollCommissionDuration(dur);
                void saveSchoolReferralSettings(school.id, { commissionDuration: dur });
              }}
            />

            {/* Dynamic Admission Fee Items */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <IndianRupee className="w-4 h-4" /> Admission Fee Breakdown (प्रवेश शुल्क रसीद)
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `bk_${Date.now()}`, description: "Books & Stationery Set (किताबें)", due: 1200 },
                      ])
                    }
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                  >
                    + Books
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `dr_${Date.now()}`, description: "School Uniform / Dress (ड्रेस)", due: 950 },
                      ])
                    }
                    className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 text-[11px] font-bold text-emerald-700 cursor-pointer"
                  >
                    + Dress
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEnrollFeeItems((p) => [
                        ...p,
                        { id: `cu_${Date.now()}`, description: "Other Admission Charge", due: 0 },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Row
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                {enrollFeeItems.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{idx + 1}.</span>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        setEnrollFeeItems((p) =>
                          p.map((r) => (r.id === row.id ? { ...r, description: e.target.value } : r))
                        )
                      }
                      className="flex-1 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                    />
                    <input
                      type="number"
                      value={row.due}
                      onChange={(e) =>
                        setEnrollFeeItems((p) =>
                          p.map((r) => (r.id === row.id ? { ...r, due: Math.max(0, Number(e.target.value)) } : r))
                        )
                      }
                      className="w-24 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-black text-right"
                    />
                    <button
                      type="button"
                      onClick={() => setEnrollFeeItems((p) => p.filter((r) => r.id !== row.id))}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200 dark:border-emerald-800/60">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Concession (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={enrollConcession}
                    onChange={(e) => setEnrollConcession(Math.max(0, Number(e.target.value)))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={enrollPaidAmount}
                    onChange={(e) => {
                      setEnrollPaidManual(true);
                      setEnrollPaidAmount(e.target.value);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl border-2 border-emerald-500 bg-white dark:bg-slate-900 text-xs font-black text-emerald-700 dark:text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Pay Mode</label>
                  <select
                    value={enrollPayMode}
                    onChange={(e) => setEnrollPayMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  >
                    <option value="Cash" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cash (नकद)</option>
                    <option value="Online / UPI" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">UPI / QR</option>
                    <option value="Bank Transfer" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Bank Transfer</option>
                    <option value="Cheque" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Ref / UTR No</label>
                  <input
                    type="text"
                    value={enrollPayRef}
                    onChange={(e) => setEnrollPayRef(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-emerald-200">
                <span>
                  Net Payable: <strong>₹{enrollNetPayable.toLocaleString("en-IN")}</strong>
                </span>
                <span className="font-black text-emerald-700">
                  Paid: ₹{(Number(enrollPaidAmount) || 0).toLocaleString("en-IN")} • Due: ₹
                  {Math.max(0, enrollNetPayable - (Number(enrollPaidAmount) || 0)).toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEnrollModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApproveAndEnroll}
                disabled={enrolling}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>{enrolling ? "Enrolling..." : "Confirm & Print Form + Receipt"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMBINED A4 ADMISSION FORM + RECEIPT PRINT STUDIO */}
      {printStudioState.open && (
        <AdmissionFormPrintModal
          isOpen={printStudioState.open}
          onClose={() => setPrintStudioState({ open: false })}
          school={school}
          student={printStudioState.student}
          application={printStudioState.application}
          className={printStudioState.className}
          sessionName={activeSession?.name || "2026-27"}
          feeRecord={printStudioState.feeRecord || null}
          initialMode={printStudioState.mode}
        />
      )}

      {/* STANDALONE POS / WHATSAPP RECEIPT MODAL */}
      {posReceiptState.open && posReceiptState.fee && posReceiptState.student && (
        <OfficialFeeReceiptModal
          isOpen={posReceiptState.open}
          onClose={() => setPosReceiptState({ open: false, student: null, fee: null })}
          school={school}
          fee={posReceiptState.fee}
          student={posReceiptState.student}
          className={
            formatClassLabel(classes.find((c) => c.id === posReceiptState.student?.classId)) ||
            posReceiptState.student?.className ||
            "Class"
          }
          sessionName={activeSession?.name || "2026-27"}
        />
      )}

      {/* SCREENSHOT FULL PREVIEW MODAL */}
      {viewScreenshotUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 relative shadow-2xl border border-slate-300 dark:border-slate-700 animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-500" />
                <span>Payment Screenshot Proof</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setViewScreenshotUrl(null);
                  setSelectedScreenshotApp(null);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedScreenshotApp && (
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">
                    {selectedScreenshotApp.studentName} ({selectedScreenshotApp.className})
                  </h4>
                  <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                    App: {selectedScreenshotApp.applicationNo} • 📞 {selectedScreenshotApp.phone}
                  </p>
                  {selectedScreenshotApp.transactionRef && (
                    <p className="text-emerald-600 font-mono text-[11px] font-bold mt-0.5">
                      Ref / UTR: {selectedScreenshotApp.transactionRef}
                    </p>
                  )}
                </div>
                {selectedScreenshotApp.status === "pending" && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider shrink-0">
                    Pending Verification
                  </span>
                )}
              </div>
            )}

            <div className="max-h-[60vh] overflow-auto rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800">
              <img
                src={viewScreenshotUrl}
                alt="Payment Screenshot"
                className="max-h-[55vh] object-contain rounded-lg shadow-md"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {isAdmin && selectedScreenshotApp && selectedScreenshotApp.status === "pending" ? (
                <button
                  type="button"
                  onClick={() => {
                    const targetApp = selectedScreenshotApp;
                    setViewScreenshotUrl(null);
                    setSelectedScreenshotApp(null);
                    setQuickVerifyConfirmApp(targetApp);
                    const selectedCls = classes.find((c) => c.id === targetApp.classId) || classes[0];
                    const localStudents = getLocalStudents(school.id);
                    const clsStudents = localStudents.filter((s) => isStudentInClass(s, selectedCls?.id || targetApp.classId, selectedCls?.name));
                    const maxRoll = clsStudents.reduce((m, s) => {
                      const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
                      return !isNaN(n) && n > m ? n : m;
                    }, 0);
                    setQuickConfirmRollNo(String(maxRoll + 1));
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✅ Verify Payment &amp; Confirm Admission</span>
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={() => {
                  setViewScreenshotUrl(null);
                  setSelectedScreenshotApp(null);
                }}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VERIFY PAYMENT & CONFIRM ADMISSION MODAL (ADMIN) */}
      {quickVerifyConfirmApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 relative shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    एडमिशन व फीस कन्फर्मेशन
                  </h3>
                  <p className="text-[11px] text-slate-500">Confirm Online Admission &amp; Allocate Roll</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickVerifyConfirmApp(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">छात्र का नाम:</span>
                <strong className="text-slate-900 dark:text-white font-black text-sm">
                  {quickVerifyConfirmApp.studentName}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">कक्षा:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {quickVerifyConfirmApp.className}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">आवेदन संख्या:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {quickVerifyConfirmApp.applicationNo}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">पिता का नाम:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {quickVerifyConfirmApp.fatherName}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">मोबाइल नंबर:</span>
                <span className="font-mono">{quickVerifyConfirmApp.phone}</span>
              </div>
              {quickVerifyConfirmApp.transactionRef && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-slate-500">UPI / Ref No:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    {quickVerifyConfirmApp.transactionRef}
                  </span>
                </div>
              )}
            </div>

            {/* Payment Screenshot Thumbnail if available */}
            {quickVerifyConfirmApp.paymentScreenshotUrl && (
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={quickVerifyConfirmApp.paymentScreenshotUrl}
                    alt="Proof"
                    className="w-12 h-12 object-cover rounded-lg border border-amber-400"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-200">
                      पेमेंट स्क्रीनशॉट संलग्न है
                    </span>
                    <p className="text-[10px] text-slate-500">सत्यापन किया गया</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectDocModal({ title: "Payment Proof", url: quickVerifyConfirmApp.paymentScreenshotUrl! })}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-bold cursor-pointer"
                >
                  ज़ूम करें
                </button>
              </div>
            )}

            {/* Roll Number input */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                आवंटित किया जाने वाला रोल नंबर (Assigned Roll No):
              </label>
              <input
                type="text"
                value={quickConfirmRollNo}
                onChange={(e) => setQuickConfirmRollNo(e.target.value)}
                placeholder="Roll No (e.g. 1)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setQuickVerifyConfirmApp(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
              >
                रद्द करें
              </button>
              <button
                type="button"
                disabled={quickConfirming}
                onClick={() => handleQuickConfirmAdmission(quickVerifyConfirmApp, quickConfirmRollNo)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95 transition"
              >
                {quickConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>कन्फर्म हो रहा है...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>दाखिला कन्फर्म करें व रसीद बनाएं</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ALL UPLOADED DOCUMENTS MODAL */}
      {viewDocumentsApp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 relative shadow-2xl border border-slate-300 dark:border-slate-700 space-y-4 max-h-[85vh] flex flex-col animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    अपलोड किए गए दस्तावेज़ (Uploaded Documents)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {viewDocumentsApp.studentName} ({viewDocumentsApp.className}) • App #{viewDocumentsApp.applicationNo}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewDocumentsApp(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {viewDocumentsApp.uploadedDocuments && Object.keys(viewDocumentsApp.uploadedDocuments).length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-3">
                  {Object.entries(viewDocumentsApp.uploadedDocuments).map(([title, url]) => (
                    <div
                      key={title}
                      className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2"
                    >
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 block">
                        {title}
                      </span>
                      <div className="h-36 rounded-xl bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-800">
                        {url.startsWith("data:image/") || url.includes("image") ? (
                          <img src={url} alt={title} className="w-full h-full object-contain" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-blue-400 gap-1">
                            <FileText className="w-8 h-8" />
                            <span className="text-[11px] font-bold">PDF Document</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setInspectDocModal({ title, url })}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>बड़ा देखें (Zoom)</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  कोई अपलोड की गई फाइल नहीं मिली।
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setViewDocumentsApp(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white cursor-pointer"
              >
                बंद करें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE DOCUMENT ZOOM MODAL */}
      {inspectDocModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-5 relative shadow-2xl border border-slate-300 dark:border-slate-700 animate-in fade-in duration-200 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate pr-4">
                {inspectDocModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setInspectDocModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-800">
              {inspectDocModal.url.startsWith("data:image/") || inspectDocModal.url.includes("image") ? (
                <img
                  src={inspectDocModal.url}
                  alt={inspectDocModal.title}
                  className="max-h-[65vh] object-contain rounded-lg shadow-md"
                />
              ) : (
                <iframe
                  src={inspectDocModal.url}
                  title={inspectDocModal.title}
                  className="w-full h-[65vh] rounded-lg"
                />
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInspectDocModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-300 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
