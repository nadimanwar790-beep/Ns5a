// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef } from "react";
import QRCode from "react-qr-code";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  History,
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
  EyeOff,
  FolderOpen,
  Calendar,
  ArrowRight,
  CreditCard,
  ScanFace,
  Link2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { sendSchoolPushNotification } from "../../utils/schoolPushClient";
import {
  fetchSchoolRazorpayConfig,
  startOnlineAdmissionRazorpayCheckout,
  type PublicRazorpayConfig,
} from "../../utils/razorpayCheckout";
import { getLocalRoutes } from "../../utils/schoolTransportStore";
import {
  getUpcomingAdmissionSessionLabel,
  isOctoberToMarchAdmissionWindow,
  parseSessionStartYear,
} from "../../utils/safeBrowserActions";
import { AdmissionEnquiryCrm } from "./AdmissionEnquiryCrm";
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
  AdmissionFormFieldSettings,
  AdmissionOfferConfig,
  EntranceDiscountConfig,
} from "../../school-types";
import { isAdmissionOfferActive } from "../../utils/admissionOfferUtils";
import {
  BLOOD_GROUPS,
  ADMISSION_CATEGORIES,
  ADMISSION_DOCUMENT_OPTIONS,
  SENIOR_STREAMS,
  isSeniorClass,
  sortSchoolClasses,
  getDefaultSubjectsForClass,
  DEFAULT_ADMISSION_FIELD_SETTINGS,
} from "../../school-types";
import { enrollStudentFromPhotoUrl } from "../../utils/faceRecognitionEngine";
import {
  getAdmissionApplications,
  subscribeAdmissionApplications,
  saveAdmissionApplication,
  updateAdmissionStatus,
  saveStudent,
  getStudent,
  getStudents,
  getSessions,
  getClasses,
  getStudentFees,
  getSchoolFeeHistory,
  updateStudent,
  updateStudentPhoto,
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
  updateSchool,
} from "../../school-firebase";
import { computeCompleteBackLedger, type BackLedgerSummary } from "../../utils/reAdmissionUtils";
import { saveUserToLive } from "../../firebase";
import { DirectUploadButton } from "../DirectUploadButton";
import { ProfileCameraModal } from "../ProfileCameraModal";
import { OfficialFeeReceiptModal } from "./OfficialFeeReceiptModal";
import { AdmissionFormPrintModal, type AdmissionPrintMode, calculateAgeOnAprilFirst } from "./AdmissionFormPrintModal";
import { maskSensitive2Chars } from "./feeReceiptUtils";
import {
  detectFamilySiblings,
  mergeSchoolReferrerList,
  type ReferrerOption,
} from "../../utils/schoolReferralSiblingEngine";
import { AdmissionReferralAndSiblingPanel } from "./AdmissionReferralAndSiblingPanel";
import { getGroupNetItems, isItemShownInAdmission } from "../../utils/feeStructureUtils";
import {
  calculateEntranceScoreDiscount,
  clearEntranceAdmissionPrefill,
  evaluateEntranceScore,
  peekEntranceAdmissionPrefill,
} from "../../utils/entranceTestEngine";

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
      : 500; // Standard default registration fee

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
    offer?: AdmissionOfferConfig | null;
    entranceDiscount?: {
      scorePct?: number | null;
      config?: EntranceDiscountConfig | null;
      cancelled?: boolean;
      fixedAmountOverride?: number;
      labelOverride?: string;
    };
  }
) => {
  const applyOfferToResult = (
    rawHeads: {
      key: string;
      label: string;
      amount: number;
      hint?: string;
      isAdmissionPrimary?: boolean;
      isBus?: boolean;
    }[],
    baseResult: {
      registrationFee: number;
      examinationFee: number;
      republicDayCharge: number;
      independenceDayCharge: number;
      diaryCharge: number;
      idCardCharge: number;
      tieBeltCharge: number;
      developmentCharge: number;
      admissionFee: number;
      annualCharges: number;
      tuitionFee: number;
      busFee: number;
      rawBusFee: number;
      busAvailable: boolean;
      cautionMoney: number;
      customHeads: ClassFeeHead[];
      totalPayable: number;
    }
  ) => {
    const offer = options?.offer;
    const offerActive = Boolean(offer?.enabled);
    const offerDiscountPercent = offerActive
      ? Math.max(0, Math.min(90, Math.round(Number(offer?.discountPercent || 0))))
      : 0;
    const applyScope = offer?.applyScope === "admission_only" ? "admission_only" : "all";

    const enabledHeads = rawHeads.map((h) => {
      const originalAmount = Math.max(0, Number(h.amount || 0));
      const isBusItem = Boolean(h.isBus || h.key === "busFee" || h.key.startsWith("bus_"));
      const eligible =
        offerDiscountPercent > 0 &&
        !isBusItem &&
        (applyScope === "all" || Boolean(h.isAdmissionPrimary));
      const discountAmount = eligible
        ? Math.min(originalAmount, Math.round((originalAmount * offerDiscountPercent) / 100))
        : 0;
      const netAmount = Math.max(0, originalAmount - discountAmount);
      return {
        key: h.key,
        label: h.label,
        amount: netAmount,
        originalAmount,
        discountAmount,
        hint: h.hint,
      };
    });

    const grossTotalPayable = Math.max(0, Number(baseResult.totalPayable || 0));
    const offerDiscountTotal = enabledHeads.reduce((s, h) => s + h.discountAmount, 0);
    const netAfterOffer = Math.max(0, grossTotalPayable - offerDiscountTotal);

    // Apply Entrance Exam Percentage Merit Fee Off (excluding Bus items, after website offer)
    const entOpt = options?.entranceDiscount;
    const entCancelled = Boolean(entOpt?.cancelled);
    let entranceDiscountTotal = 0;
    let entranceDiscountLabel = "";
    let entranceDiscountBadge = "";

    if (!entCancelled && entOpt) {
      const entScope = entOpt.config?.applyScope === "admission_only" ? "admission_only" : "all";
      const entranceEligiblePool = rawHeads.reduce((sum, rawH, idx) => {
        const isBusItem = Boolean(rawH.isBus || rawH.key === "busFee" || rawH.key.startsWith("bus_"));
        if (isBusItem) return sum;
        if (entScope === "admission_only" && !rawH.isAdmissionPrimary) return sum;
        return sum + Number(enabledHeads[idx]?.amount || 0);
      }, 0);

      const calc = calculateEntranceScoreDiscount(
        entOpt.scorePct,
        entOpt.config,
        entranceEligiblePool
      );
      if (calc.eligible && calc.discountAmount > 0) {
        entranceDiscountTotal = Math.min(netAfterOffer, calc.discountAmount);
        entranceDiscountLabel = calc.label;
        entranceDiscountBadge = calc.displayBadge;
      } else if (
        !entOpt.config &&
        entOpt.fixedAmountOverride !== undefined &&
        entOpt.fixedAmountOverride > 0
      ) {
        entranceDiscountTotal = Math.min(
          netAfterOffer,
          Math.min(entranceEligiblePool, Math.round(Number(entOpt.fixedAmountOverride)))
        );
        entranceDiscountLabel = entOpt.labelOverride || "Entrance Merit Off";
        entranceDiscountBadge = `₹${entranceDiscountTotal.toLocaleString("en-IN")} OFF`;
      }
    }

    const netTotalPayable = Math.max(0, netAfterOffer - entranceDiscountTotal);

    return {
      ...baseResult,
      totalPayable: netTotalPayable,
      grossTotalPayable,
      offerDiscountTotal,
      offerDiscountPercent,
      offerBadgeText: offer?.badgeText || (offerDiscountPercent > 0 ? `${offerDiscountPercent}% OFF` : ""),
      offerTitle: offer?.title || "Special Admission Offer",
      entranceDiscountTotal,
      entranceDiscountLabel,
      entranceDiscountBadge,
      entranceDiscountCancelled: entCancelled,
      enabledHeads,
    };
  };

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
      grossTotalPayable: 0,
      offerDiscountTotal: 0,
      offerDiscountPercent: 0,
      offerBadgeText: "",
      offerTitle: "",
      entranceDiscountTotal: 0,
      entranceDiscountLabel: "",
      entranceDiscountBadge: "",
      entranceDiscountCancelled: false,
      enabledHeads: [] as {
        key: string;
        label: string;
        amount: number;
        originalAmount: number;
        discountAmount: number;
        hint?: string;
      }[],
    };
  }

  const fs = cls?.feeStructure;

  // New dynamic unlimited Fee Groups & Sub-Groups path
  if (fs?.feeGroups && Array.isArray(fs.feeGroups) && fs.feeGroups.length > 0) {
    const rawHeads: {
      key: string;
      label: string;
      amount: number;
      hint?: string;
      isAdmissionPrimary?: boolean;
      isBus?: boolean;
    }[] = [];
    let gAdm = 0;
    let gReg = 0;
    let gExam = 0;
    let gDev = 0;
    let gAnn = 0;
    let gTui = 0;
    let gCau = 0;
    let gBus = 0;
    let gBusAvailable = false;
    const gCustomHeads: ClassFeeHead[] = [];

    fs.feeGroups.forEach((grp) => {
      if (grp.enabled === false) return;
      const { summary: grpSummary, itemsWithNet } = getGroupNetItems(grp);
      const offNote =
        grpSummary.discount > 0
          ? ` (${grp.discountLabel ? `${grp.discountLabel} • ` : ""}${grpSummary.badgeText})`
          : "";
      itemsWithNet.forEach(({ item: it, netAmount, itemDiscount }) => {
        if (it.enabled === false) return;
        if (!isItemShownInAdmission(it, grp)) return;
        const rawAmt = Math.max(0, Number(it.amount || 0));
        const amt = netAmount;
        const isBus = Boolean(it.isUserOptional || it.legacyKey === "busFee");
        if (isBus) {
          gBusAvailable = true;
          const effectiveBus = options?.customBusFee !== undefined ? Math.max(0, Number(options.customBusFee)) : amt;
          gBus += effectiveBus;
          if (options?.usesBus) {
            rawHeads.push({
              key: `bus_${it.id}`,
              label: it.name,
              amount: effectiveBus,
              hint: `${grp.title}${itemDiscount > 0 ? offNote : ""}`,
              isAdmissionPrimary: false,
              isBus: true,
            });
          }
          return;
        }

        const sec = it.billingSection || grp.billingSection || "admission";
        if (it.legacyKey === "registrationFee") gReg += amt;
        else if (it.legacyKey === "admissionFee") gAdm += amt;
        else if (it.legacyKey === "examinationFee" || sec === "exam") gExam += amt;
        else if (it.legacyKey === "developmentCharge") gDev += amt;
        else if (it.legacyKey === "annualCharges" || sec === "annual") gAnn += amt;
        else if (it.legacyKey === "tuitionFee" || sec === "monthly") gTui += amt;
        else if (it.legacyKey === "cautionMoney") gCau += amt;
        else {
          gCustomHeads.push({ ...it, amount: amt, enabled: true });
        }

        if (rawAmt > 0 && (amt > 0 || itemDiscount > 0)) {
          rawHeads.push({
            key: `fg_${it.id}`,
            label: it.name,
            amount: amt,
            hint: `${grp.title}${itemDiscount > 0 ? `${offNote} — Saved ₹${itemDiscount}` : ""}`,
            isAdmissionPrimary:
              it.legacyKey === "admissionFee" ||
              it.legacyKey === "registrationFee" ||
              sec === "admission",
            isBus: false,
          });
        }
      });
    });

    const activeUsesBus = Boolean(options?.usesBus) && gBusAvailable;
    const payableBus = activeUsesBus ? gBus : 0;
    const nonBusTotal = rawHeads
      .filter((h) => !h.isBus)
      .reduce((sum, h) => sum + (Number(h.amount) || 0), 0);

    return applyOfferToResult(rawHeads, {
      registrationFee: gReg,
      examinationFee: gExam,
      republicDayCharge: 0,
      independenceDayCharge: 0,
      diaryCharge: 0,
      idCardCharge: 0,
      tieBeltCharge: 0,
      developmentCharge: gDev,
      admissionFee: gAdm,
      annualCharges: gAnn,
      tuitionFee: gTui,
      busFee: payableBus,
      rawBusFee: gBus,
      busAvailable: gBusAvailable,
      cautionMoney: gCau,
      customHeads: gCustomHeads,
      totalPayable: nonBusTotal + payableBus,
    });
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

  const rawHeads: {
    key: string;
    label: string;
    amount: number;
    hint?: string;
    isAdmissionPrimary?: boolean;
    isBus?: boolean;
  }[] = [];

  if (toggles.registrationFee) {
    rawHeads.push({
      key: "registrationFee",
      label: "Registration Fee (पंजीकरण शुल्क)",
      amount: registrationFee,
      hint: "प्रवेश पंजीकरण व फॉर्म शुल्क",
      isAdmissionPrimary: true,
    });
  }
  if (toggles.examinationFee) {
    rawHeads.push({
      key: "examinationFee",
      label: "1. Examination Fee (6 Exams: P.A-1, P.A-2, HYE, P.A-3, P.A-4, Annual Exam)",
      amount: examinationFee,
      hint: "वार्षिक 6 परीक्षाओं का संपूर्ण परीक्षा शुल्क",
    });
  }
  if (toggles.republicDayCharge) {
    rawHeads.push({
      key: "republicDayCharge",
      label: "2. Republic Day Charge (गणतंत्र दिवस शुल्क)",
      amount: republicDayCharge,
      hint: "26 जनवरी समारोह व गतिविधि",
    });
  }
  if (toggles.independenceDayCharge) {
    rawHeads.push({
      key: "independenceDayCharge",
      label: "3. Independence Day (स्वतंत्रता दिवस शुल्क)",
      amount: independenceDayCharge,
      hint: "15 अगस्त समारोह व मिठाई",
    });
  }
  if (toggles.diaryCharge) {
    rawHeads.push({
      key: "diaryCharge",
      label: "4. Diary (स्कूल डायरी)",
      amount: diaryCharge,
      hint: "आधिकारिक स्कूल छात्र डायरी",
    });
  }
  if (toggles.idCardCharge) {
    rawHeads.push({
      key: "idCardCharge",
      label: "5. I.Card (छात्र पहचान पत्र)",
      amount: idCardCharge,
      hint: "स्मार्ट आईडी कार्ड बारकोड/क्यूआर सहित",
    });
  }
  if (toggles.tieBeltCharge) {
    rawHeads.push({
      key: "tieBeltCharge",
      label: "6. Tie + Belt (स्कूल टाई व बेल्ट)",
      amount: tieBeltCharge,
      hint: "स्कूल यूनिफॉर्म टाई व बेल्ट सेट",
    });
  }
  if (toggles.developmentCharge) {
    rawHeads.push({
      key: "developmentCharge",
      label: "7. Development Charge (विकास शुल्क)",
      amount: developmentCharge,
      hint: "स्कूल इंफ्रास्ट्रक्चर व विकास शुल्क",
    });
  }

  if (toggles.admissionFee) {
    rawHeads.push({
      key: "admissionFee",
      label: "प्रवेश शुल्क (Admission Charge)",
      amount: admissionFee,
      hint: "कक्षा के लिए एकमुश्त प्रवेश शुल्क",
      isAdmissionPrimary: true,
    });
  }
  if (toggles.annualCharges) {
    rawHeads.push({
      key: "annualCharges",
      label: "अन्य वार्षिक शुल्क (Other Annual Charges)",
      amount: annualCharges,
      hint: "अन्य वार्षिक खेल व गतिविधि शुल्क",
    });
  }
  if (toggles.tuitionFee) {
    rawHeads.push({
      key: "tuitionFee",
      label: "प्रथम माह शिक्षण शुल्क (1st Month Tuition)",
      amount: tuitionFee,
      hint: "प्रवेश माह का शिक्षण शुल्क",
    });
  }
  if (toggles.cautionMoney) {
    rawHeads.push({
      key: "cautionMoney",
      label: "कॉशन / सिक्योरिटी राशि (Caution Money)",
      amount: cautionMoney,
      hint: "वापसी योग्य धरोहर राशि",
    });
  }

  activeCustomHeads.forEach((h) => {
    rawHeads.push({
      key: `custom_${h.id}`,
      label: h.name,
      amount: Math.max(0, Number(h.amount || 0)),
      hint: "स्कूल निर्धारित अतिरिक्त शुल्क",
    });
  });

  if (busAvailable && usesBus) {
    rawHeads.push({
      key: "busFee",
      label: "वाहन / बस शुल्क (Transport / Bus Fee)",
      amount: busFee,
      hint: "बस सुविधा चयनित",
      isBus: true,
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

  return applyOfferToResult(rawHeads, {
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
  });
};

interface Props {
  school: School;
  classes: SchoolClass[];
  sessions: SchoolSession[];
  activeSession: SchoolSession | null;
  admissionSessionLabel?: string;
  isAdmin?: boolean;
  viewMode?: "all" | "admissions_only" | "fee_setup_only";
  hideTopNavbar?: boolean;
  onBack: () => void;
  onStudentEnrolledAndLink?: (student: SchoolStudent) => void;
}

interface FeeItemRow {
  id: string;
  description: string;
  due: number;
  offerCon?: number;
}

export const OnlineAdmissionManager: React.FC<Props> = ({
  school,
  classes: propClasses,
  sessions,
  activeSession,
  admissionSessionLabel,
  isAdmin = true,
  viewMode = "all",
  hideTopNavbar = false,
  onBack,
  onStudentEnrolledAndLink,
}) => {
  const effectivePublicAdmissionSession = useMemo(
    () => admissionSessionLabel || getUpcomingAdmissionSessionLabel(activeSession?.name, sessions),
    [admissionSessionLabel, activeSession?.name, sessions]
  );
  const effectivePublicTargetSessionObj = useMemo(() => {
    if (!isOctoberToMarchAdmissionWindow()) {
      return activeSession || sessions[0] || null;
    }
    const targetYr = parseSessionStartYear(effectivePublicAdmissionSession);
    const matchedFuture = targetYr
      ? sessions.find((s) => parseSessionStartYear(s?.name || s?.startDate) === targetYr)
      : undefined;
    return matchedFuture || activeSession || sessions[0] || null;
  }, [activeSession, sessions, effectivePublicAdmissionSession]);
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

  const [activeTab, setActiveTab] = useState<"applications" | "new_form" | "enquiry_crm" | "fee_setup" | "field_settings">(() => {
    if (viewMode === "fee_setup_only") return "fee_setup";
    if (viewMode === "admissions_only") return isAdmin ? "applications" : "new_form";
    return isAdmin ? "applications" : "new_form";
  });
  const [maskSensitiveData, setMaskSensitiveData] = useState<boolean>(false);

  const configuredRoutes = useMemo(() => (school?.id ? getLocalRoutes(school.id) : []), [school?.id]);

  // Admin Admission Form Field Customization (What to show/hide in the form)
  const [fieldSettings, setFieldSettings] = useState<AdmissionFormFieldSettings>(() => {
    try {
      const stored = localStorage.getItem(`nst_admission_field_settings_${school.id}`);
      if (stored) {
        return { ...DEFAULT_ADMISSION_FIELD_SETTINGS, ...JSON.parse(stored) };
      }
      if (school.admissionFieldSettings) {
        return { ...DEFAULT_ADMISSION_FIELD_SETTINGS, ...school.admissionFieldSettings };
      }
    } catch {}
    return DEFAULT_ADMISSION_FIELD_SETTINGS;
  });

  const [savingFieldSettings, setSavingFieldSettings] = useState(false);
  const handleUpdateFieldSetting = async (key: keyof AdmissionFormFieldSettings, val: boolean) => {
    const next = { ...fieldSettings, [key]: val };
    setFieldSettings(next);
    try {
      localStorage.setItem(`nst_admission_field_settings_${school.id}`, JSON.stringify(next));
      await updateSchool(school.id, { admissionFieldSettings: next } as any);
    } catch (e) {
      console.warn("Failed to sync field setting:", e);
    }
  };

  const handleBulkUpdateFieldSettings = async (next: AdmissionFormFieldSettings) => {
    setSavingFieldSettings(true);
    setFieldSettings(next);
    try {
      localStorage.setItem(`nst_admission_field_settings_${school.id}`, JSON.stringify(next));
      await updateSchool(school.id, { admissionFieldSettings: next } as any);
      setSuccessToast("✅ एडमिशन फॉर्म फ़ील्ड सेटिंग्स सफलतापूर्वक सुरक्षित कर दी गईं!");
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (e) {
      console.warn("Failed to sync field settings:", e);
    } finally {
      setSavingFieldSettings(false);
    }
  };

  // Sync activeTab if viewMode changes externally
  useEffect(() => {
    if (viewMode === "fee_setup_only") {
      setActiveTab("fee_setup");
    } else if (viewMode === "admissions_only" && (activeTab === "fee_setup" || activeTab === "field_settings")) {
      setActiveTab(isAdmin ? "applications" : "new_form");
    }
  }, [viewMode, isAdmin]);

  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "today" | "pending" | "approved" | "rejected">("all");
  const [submitting, setSubmitting] = useState(false);
  const [submittedApp, setSubmittedApp] = useState<AdmissionApplication | null>(null);
  const [admissionStep, setAdmissionStep] = useState<1 | 2 | 3>(1);
  const [adminFormStep, setAdminFormStep] = useState<1 | 2>(1);
  const [jumpingToPortalApp, setJumpingToPortalApp] = useState<AdmissionApplication | null>(null);
  const autoJumpedAppIdsRef = useRef<Set<string>>(new Set());
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

  // Live Camera Studio Modal for Admission Photo Capture
  const [showLiveCameraModal, setShowLiveCameraModal] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"form" | "enroll" | "post_pay_photo">("form");
  const [showAdmissionTypeDrawer, setShowAdmissionTypeDrawer] = useState(false);

  // Direct Razorpay Admission Payment + Mandatory Face ID Photo + User Account Link States
  const [razorpayCfg, setRazorpayCfg] = useState<PublicRazorpayConfig | null>(null);
  const [payingAdmissionAppId, setPayingAdmissionAppId] = useState<string | null>(null);
  const [admissionPayError, setAdmissionPayError] = useState<string | null>(null);
  const [postPayPhotoSaving, setPostPayPhotoSaving] = useState<boolean>(false);
  const [accountLinkedDone, setAccountLinkedDone] = useState<boolean>(false);

  useEffect(() => {
    if (!school?.id) return;
    fetchSchoolRazorpayConfig(school.id).then((cfg) => setRazorpayCfg(cfg)).catch(() => {});
  }, [school?.id]);

  const [verifiedOperator] = useState<{
    role: "TEACHER" | "PARENT_SELF" | "ADMIN";
    name: string;
    verifiedMethod: "face_auto" | "session_auth" | "manual";
  }>({
    role: isAdmin ? "TEACHER" : "PARENT_SELF",
    name: isAdmin ? (school.name ? `${school.name} Faculty` : "Teacher Desk") : "अभिभावक ऑनलाइन प्रवेश (Parent / Self)",
    verifiedMethod: "session_auth",
  });
  const [teacherCustomAdmissionFee, setTeacherCustomAdmissionFee] = useState<string>("");
  const [teacherCustomConcession, setTeacherCustomConcession] = useState<string>("");

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
  const submitAsPendingRequestRef = useRef<boolean>(false);

  // Inline Reject Confirmation State (Replaces window.confirm)
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("Criteria / Documents incomplete");

  // Inline Resubmit Rejected Application (Screenshot + UTR) State
  const [resubmittingAppId, setResubmittingAppId] = useState<string | null>(null);
  const [resubmitScreenshot, setResubmitScreenshot] = useState<string | null>(null);
  const [resubmitUtr, setResubmitUtr] = useState<string>("");
  const [resubmitNote, setResubmitNote] = useState<string>("");
  const [resubmittingRejected, setResubmittingRejected] = useState<boolean>(false);
  const resubmitFileInputRef = useRef<HTMLInputElement | null>(null);

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
    isOnlyChild: false,
    identificationMark: "",
    motherTongue: "Hindi (हिंदी)",
    previousSchool: "",
    previousClass: "",
    previousMarks: "",
    previousBoard: "CBSE",
    previousTcNo: "",
    previousTcDate: "",
    fatherName: "",
    fatherQualification: "Graduate",
    fatherOccupation: "",
    fatherPhone: "",
    fatherWhatsapp: "",
    motherName: "",
    motherQualification: "Graduate",
    motherOccupation: "Home Maker",
    motherPhone: "",
    motherWhatsapp: "",
    annualIncome: "",
    emergencyContact: "",
    emergencyPhone: "",
    emergencyRelation: "Parent / Guardian",
    emergencyWhatsapp: "",
    medicalHistory: "Fit / No major condition",
    childSensitivity: false,
    childSensitivityRemarks: "",
    aadhaarNo: "",
    fatherAadhaar: "",
    motherAadhaar: "",
    phone: "",
    whatsappNo: "",
    email: "",
    address: "",
    city: "",
    pincode: "",
    correspondenceAddress: "",
    isSameAddress: true,
    usesBus: false,
    busRoute: "",
    transportModeIfNo: "Guardian" as "Walking" | "Guardian",
    transportDistanceKm: "",
    siblingDetails: [] as Array<{ slNo: number; name: string; relation: string; className: string; rollNo?: string }>,
    bankAccountName: "",
    bankName: "",
    bankAccountNumber: "",
    bankIfsc: "",
    parentDeclarationAccepted: true,
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

  const [entrancePrefillBanner, setEntrancePrefillBanner] = useState<{
    studentName: string;
    phone: string;
    classLevel?: number;
    classLabel: string;
    bestScorePct?: number;
    lastSetId?: string;
    evaluationTier?: 'MERIT' | 'QUALIFIED' | 'FOUNDATION_SUPPORT' | 'COUNSELING';
    evaluationTag?: string;
    recommendedClassLevel?: number;
    recommendedClassLabel?: string;
  } | null>(null);
  const [entrancePrefillDiscountCancelled, setEntrancePrefillDiscountCancelled] = useState(false);

  useEffect(() => {
    const applyPrefill = () => {
      const prefill = peekEntranceAdmissionPrefill();
      if (!prefill) return;
      if (prefill.schoolId && school?.id && prefill.schoolId !== school.id) return;

      const targetNum = String(prefill.recommendedClassLevel || prefill.classLevel || "");
      const targetLabel = (prefill.recommendedClassLabel || prefill.classLabel || "").toLowerCase();
      const matchedCls = classesList.find((c) => {
        const cname = (c.name || "").toLowerCase();
        return (
          cname === targetLabel ||
          new RegExp(`\\b${targetNum}\\b`).test(cname)
        );
      });

      setForm((prev) => ({
        ...prev,
        studentName: prev.studentName || prefill.studentName || "",
        phone: prev.phone || prefill.phone || "",
        fatherPhone: prev.fatherPhone || prefill.phone || "",
        fatherWhatsapp: prev.fatherWhatsapp || prefill.phone || "",
        classId: matchedCls?.id || prev.classId || classesList[0]?.id || "",
      }));

      setEntrancePrefillDiscountCancelled(false);
      setEntrancePrefillBanner({
        studentName: prefill.studentName,
        phone: prefill.phone,
        classLevel: prefill.classLevel,
        classLabel: prefill.classLabel,
        bestScorePct: prefill.bestScorePct,
        lastSetId: prefill.lastSetId,
        evaluationTier: prefill.evaluationTier,
        evaluationTag: prefill.evaluationTag,
        recommendedClassLevel: prefill.recommendedClassLevel,
        recommendedClassLabel: prefill.recommendedClassLabel,
      });

      if (!isAdmin) {
        setParentView("form");
      } else {
        setActiveTab("new_form");
      }
    };

    applyPrefill();
    window.addEventListener("nst_entrance_admission_prefill", applyPrefill);
    return () => window.removeEventListener("nst_entrance_admission_prefill", applyPrefill);
  }, [classesList, school?.id, isAdmin]);

  // Re-Admission Cascade States (Old Session -> Old Class -> Old Student -> Auto-Fill & Back Due)
  const [readmSessionsPool, setReadmSessionsPool] = useState<SchoolSession[]>([]);
  const [readmClassesPool, setReadmClassesPool] = useState<SchoolClass[]>([]);
  const [readmStudentsPool, setReadmStudentsPool] = useState<SchoolStudent[]>([]);
  const [readmFeesPool, setReadmFeesPool] = useState<MonthlyFee[]>([]);
  const [loadingReadmPool, setLoadingReadmPool] = useState<boolean>(false);
  const [oldSessionId, setOldSessionId] = useState<string>("");
  const [targetSessionId, setTargetSessionId] = useState<string>(() => activeSession?.id || sessions[0]?.id || "");
  const [includeBackDueInAdm, setIncludeBackDueInAdm] = useState<boolean>(true);
  const [oldClassFilter, setOldClassFilter] = useState<string>("all");
  const [oldStudentId, setOldStudentId] = useState<string>("");
  const [oldStudentSearch, setOldStudentSearch] = useState<string>("");
  const [pulledOldStudent, setPulledOldStudent] = useState<SchoolStudent | null>(null);
  const [pulledBackLedger, setPulledBackLedger] = useState<BackLedgerSummary | null>(null);
  const [showReadmMonthTable, setShowReadmMonthTable] = useState<boolean>(false);
  const [carriedBackDueInput, setCarriedBackDueInput] = useState<string>("0");

  useEffect(() => {
    if (!isAdmin || form.admissionType !== "READMISSION" || !school?.id) return;
    let cancelled = false;
    setLoadingReadmPool(true);
    Promise.all([
      getSessions(school.id).catch(() => []),
      getClasses(school.id).catch(() => []),
      getStudents(school.id).catch(() => []),
      getSchoolFeeHistory(school.id).catch(() => []),
    ])
      .then(([remoteSess, remoteCls, remoteSt, remoteFees]) => {
        if (cancelled) return;
        const sessMap = new Map<string, SchoolSession>();
        [...(sessions || []), ...(remoteSess || [])].forEach((s) => {
          if (s && s.id && !isDemoRecord(s)) sessMap.set(s.id, s);
        });
        const mergedSess = Array.from(sessMap.values());
        setReadmSessionsPool(mergedSess);

        const clsMap = new Map<string, SchoolClass>();
        [...(classesList || []), ...(remoteCls || [])].forEach((c) => {
          if (c && c.id && !isDemoRecord(c)) clsMap.set(c.id, c);
        });
        setReadmClassesPool(Array.from(clsMap.values()));

        const stMap = new Map<string, SchoolStudent>();
        [...getLocalStudents(school.id), ...(remoteSt || [])].forEach((s) => {
          if (s && s.id && !isDemoRecord(s)) stMap.set(s.id, s);
        });
        const mergedSt = Array.from(stMap.values());
        setReadmStudentsPool(mergedSt);

        const feeMap = new Map<string, MonthlyFee>();
        [...(getLocalFees(school.id) || []), ...(remoteFees || [])].forEach((f, idx) => {
          if (f && !isDemoRecord(f)) {
            feeMap.set(`${f.studentId}_${f.month}_${f.receiptNo || f.id || idx}`, f);
          }
        });
        setReadmFeesPool(Array.from(feeMap.values()));

        let resolvedOldId = oldSessionId;
        if (!resolvedOldId && mergedSess.length > 0) {
          const prevWithStudents = mergedSess.find(
            (s) => s.id !== activeSession?.id && mergedSt.some((st) => st.sessionId === s.id)
          );
          const anyPrev = mergedSess.find((s) => s.id !== activeSession?.id);
          resolvedOldId = prevWithStudents?.id || anyPrev?.id || mergedSess[0].id;
          setOldSessionId(resolvedOldId);
        }

        if (mergedSess.length > 0) {
          const sortedAsc = [...mergedSess].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          const curTargetValid = mergedSess.some((s) => s.id === targetSessionId);
          if (!targetSessionId || !curTargetValid || (mergedSess.length > 1 && targetSessionId === resolvedOldId)) {
            const activeValid = activeSession?.id && activeSession.id !== resolvedOldId && mergedSess.some((s) => s.id === activeSession.id);
            const oldIdx = sortedAsc.findIndex((s) => s.id === resolvedOldId);
            const nextAfterOld = oldIdx >= 0 && oldIdx + 1 < sortedAsc.length ? sortedAsc[oldIdx + 1] : undefined;
            const otherSess = nextAfterOld || sortedAsc.find((s) => s.id !== resolvedOldId) || mergedSess[0];
            setTargetSessionId(activeValid ? (activeSession?.id || otherSess.id) : otherSess.id);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingReadmPool(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, form.admissionType, school?.id]);

  const availableReadmSessionsList = useMemo(() => {
    const map = new Map<string, SchoolSession>();
    [...(sessions || []), ...readmSessionsPool].forEach((s) => {
      if (s && s.id && !isDemoRecord(s)) map.set(s.id, s);
    });
    return Array.from(map.values()).sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [sessions, readmSessionsPool]);

  const effectiveTargetClasses = useMemo(() => {
    if (isAdmin && form.admissionType === "READMISSION" && targetSessionId) {
      const targetCls = readmClassesPool.filter((c) => c.sessionId === targetSessionId);
      if (targetCls.length > 0) return sortSchoolClasses(targetCls);
    }
    return classesList;
  }, [isAdmin, form.admissionType, targetSessionId, readmClassesPool, classesList]);

  const selectedOldSessionObj = useMemo(
    () => readmSessionsPool.find((s) => s.id === oldSessionId) || null,
    [readmSessionsPool, oldSessionId]
  );

  const oldClassesForSession = useMemo(() => {
    const filtered = readmClassesPool.filter((c) => !oldSessionId || c.sessionId === oldSessionId);
    if (filtered.length > 0) return sortSchoolClasses(filtered);
    const seen = new Map<string, SchoolClass>();
    readmStudentsPool
      .filter((st) => !oldSessionId || st.sessionId === oldSessionId)
      .forEach((st) => {
        if (st.classId && !seen.has(st.classId)) {
          seen.set(st.classId, {
            id: st.classId,
            schoolId: school.id,
            sessionId: st.sessionId,
            name: st.className || "Class",
            defaultFee: Number(st.monthlyFee || 0),
          } as SchoolClass);
        }
      });
    return sortSchoolClasses(Array.from(seen.values()));
  }, [readmClassesPool, readmStudentsPool, oldSessionId, school.id]);

  const studentsInOldClass = useMemo(() => {
    if (!isAdmin || form.admissionType !== "READMISSION") return [];
    const targetClsObj = oldClassesForSession.find((c) => c.id === oldClassFilter);
    return readmStudentsPool
      .filter((s) => !oldSessionId || s.sessionId === oldSessionId)
      .filter((s) => {
        if (oldClassFilter === "all") return true;
        return (
          s.classId === oldClassFilter ||
          (targetClsObj?.name &&
            (s.className || "").trim().toLowerCase() === targetClsObj.name.trim().toLowerCase())
        );
      })
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [isAdmin, form.admissionType, readmStudentsPool, oldSessionId, oldClassFilter, oldClassesForSession]);

  const matchingReadmStudents = useMemo(() => {
    const q = oldStudentSearch.trim().toLowerCase();
    if (!q || !isAdmin || form.admissionType !== "READMISSION") return [];
    return studentsInOldClass
      .filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) ||
          (s.fatherName || "").toLowerCase().includes(q) ||
          (s.admissionNo || "").toLowerCase().includes(q) ||
          (s.phone || "").includes(q) ||
          (s.rollNo || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [oldStudentSearch, isAdmin, form.admissionType, studentsInOldClass]);

  const handlePullReadmStudent = (src: SchoolStudent) => {
    setPulledOldStudent(src);
    setOldStudentId(src.id);
    setOldStudentSearch("");

    // Determine promoted target class in selected target session
    let nextClassId = form.classId;
    const tgtClsList = effectiveTargetClasses.length > 0 ? effectiveTargetClasses : classesList;
    if (tgtClsList.length > 0) {
      const oldIdx = oldClassesForSession.findIndex(
        (c) =>
          c.id === src.classId ||
          (c.name || "").trim().toLowerCase() === (src.className || "").trim().toLowerCase()
      );
      const tgtIdx = tgtClsList.findIndex(
        (c) => (c.name || "").trim().toLowerCase() === (src.className || "").trim().toLowerCase()
      );
      let promotedTarget: SchoolClass | undefined;
      if (tgtIdx >= 0 && tgtIdx + 1 < tgtClsList.length) {
        promotedTarget = tgtClsList[tgtIdx + 1];
      } else if (oldIdx >= 0 && oldIdx + 1 < oldClassesForSession.length) {
        const nextOldName = (oldClassesForSession[oldIdx + 1].name || "").trim().toLowerCase();
        promotedTarget = tgtClsList.find((c) => (c.name || "").trim().toLowerCase() === nextOldName);
      }
      if (promotedTarget) {
        nextClassId = promotedTarget.id;
      }
    }

    setForm((prev) => ({
      ...prev,
      admissionType: "READMISSION",
      classId: nextClassId,
      stream: src.stream || prev.stream,
      studentName: src.name || prev.studentName,
      dateOfBirth: src.dateOfBirth || prev.dateOfBirth,
      gender: src.gender || prev.gender,
      category: src.category || prev.category,
      religion: src.religion || prev.religion,
      nationality: src.nationality || prev.nationality,
      bloodGroup: src.bloodGroup || "",
      apaarId: src.apaarId || "",
      photoUrl: src.photoUrl || "",
      isOnlyChild: Boolean(src.isOnlyChild),
      identificationMark: src.identificationMark || "",
      motherTongue: src.motherTongue || prev.motherTongue,
      previousSchool: school?.name || prev.previousSchool,
      previousClass: src.className || "",
      previousMarks: src.className ? `${src.className} (Promoted)` : prev.previousMarks,
      fatherName: src.fatherName || prev.fatherName,
      fatherQualification: src.fatherQualification || prev.fatherQualification,
      fatherOccupation: src.fatherOccupation || "",
      fatherPhone: src.fatherPhone || "",
      fatherWhatsapp: src.fatherWhatsapp || "",
      motherName: src.motherName || prev.motherName,
      motherQualification: src.motherQualification || prev.motherQualification,
      motherOccupation: src.motherOccupation || prev.motherOccupation,
      motherPhone: src.motherPhone || "",
      motherWhatsapp: src.motherWhatsapp || "",
      annualIncome: src.annualIncome || "",
      emergencyContact: src.emergencyContact || "",
      emergencyPhone: src.emergencyPhone || "",
      emergencyRelation: src.emergencyRelation || prev.emergencyRelation,
      emergencyWhatsapp: src.emergencyWhatsapp || "",
      medicalHistory: src.medicalHistory || prev.medicalHistory,
      aadhaarNo: src.aadhaarNo || "",
      fatherAadhaar: src.fatherAadhaar || "",
      motherAadhaar: src.motherAadhaar || "",
      phone: src.phone || prev.phone,
      whatsappNo: src.whatsappNo || src.fatherWhatsapp || src.phone || prev.whatsappNo,
      email: src.email || "",
      address: src.address || "",
      city: src.city || "",
      pincode: src.pincode || "",
      correspondenceAddress: src.correspondenceAddress || src.address || "",
      isSameAddress: src.isSameAddress !== undefined ? src.isSameAddress : true,
      usesBus: Boolean(src.usesBus),
      busRoute: src.busRoute || "",
      bankAccountName: src.bankAccountName || "",
      bankName: src.bankName || "",
      bankAccountNumber: src.bankAccountNumber || "",
      bankIfsc: src.bankIfsc || "",
      siblingDetails: Array.isArray(src.siblingDetails) ? src.siblingDetails : prev.siblingDetails,
      submittedDocs:
        Array.isArray(src.submittedDocs) && src.submittedDocs.length > 0
          ? src.submittedDocs
          : prev.submittedDocs,
    }));

    const srcSess =
      readmSessionsPool.find((s) => s.id === (src.sessionId || oldSessionId)) || selectedOldSessionObj;
    const initialFees = readmFeesPool.filter((f) => f.studentId === src.id);
    const ledger = computeCompleteBackLedger(
      src,
      initialFees,
      srcSess,
      oldClassesForSession.length > 0 ? oldClassesForSession : classesList
    );
    setPulledBackLedger(ledger);
    setCarriedBackDueInput(String(ledger.totalBackDue));

    getStudentFees(school.id, src.id)
      .then((freshFees) => {
        if (!Array.isArray(freshFees) || freshFees.length === 0) return;
        const merged = new Map<string, MonthlyFee>();
        [...initialFees, ...freshFees].forEach((f, idx) => {
          if (f && !isDemoRecord(f)) {
            merged.set(`${f.month}_${f.receiptNo || f.id || idx}`, f);
          }
        });
        const refined = computeCompleteBackLedger(
          src,
          Array.from(merged.values()),
          srcSess,
          oldClassesForSession.length > 0 ? oldClassesForSession : classesList
        );
        setPulledBackLedger(refined);
        setCarriedBackDueInput(String(refined.totalBackDue));
      })
      .catch(() => {});
  };

  // Calculate age as on 1st April of current academic session
  const sessionYearNum = useMemo(() => {
    const sName = activeSession?.name || sessions[0]?.name || "";
    const match = sName.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : new Date().getFullYear();
  }, [activeSession?.name, sessions]);

  const ageOnApril1 = useMemo(() => {
    return calculateAgeOnAprilFirst(form.dateOfBirth, sessionYearNum);
  }, [form.dateOfBirth, sessionYearNum]);

  const parentApplications = useMemo(() => {
    const raw = parentPortalPhone.trim();
    if (!raw) return [];
    const rawLower = raw.toLowerCase();
    const clean = raw.replace(/\D/g, "");
    return applications.filter((app) => {
      const appNo = String(app.applicationNo || "").toLowerCase();
      if (appNo && (appNo === rawLower || (rawLower.length >= 4 && appNo.includes(rawLower)))) {
        return true;
      }
      if (!clean) return false;
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
      toast.error("फ़ाइल 12MB से कम होनी चाहिए।");
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
      toast.error("स्क्रीनशॉट फ़ाइल 12MB से कम होनी चाहिए।");
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
    setAdmissionStep(1);
    setAdminFormStep(1);
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

  // Sync admin roll no & default amounts when class, bus, or back due changes
  useEffect(() => {
    if (!form.classId) return;
    const selectedCls =
      effectiveTargetClasses.find((c) => c.id === form.classId) ||
      classesList.find((c) => c.id === form.classId) ||
      classes.find((c) => c.id === form.classId);
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

      // Default total payable (including Re-Admission Back Due if toggled ON, minus active Website Offer % OFF & Entrance Merit Off)
      const fees = getClassFees(selectedCls, {
        usesBus: form.usesBus,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount:
          entrancePrefillBanner?.bestScorePct !== undefined
            ? {
                scorePct: entrancePrefillBanner.bestScorePct,
                config: school?.websiteConfig?.entranceDiscountConfig,
                cancelled: entrancePrefillDiscountCancelled,
              }
            : undefined,
      });
      const backDueExtra =
        form.admissionType === "READMISSION" && includeBackDueInAdm
          ? Math.max(0, Number(carriedBackDueInput || 0))
          : 0;
      if (!adminPaidManual) {
        setAdminPaidAmount(String(fees.totalPayable + backDueExtra));
      }
    } catch {
      setAdminRollNo("1");
    }
  }, [
    form.classId,
    form.usesBus,
    form.admissionType,
    includeBackDueInAdm,
    carriedBackDueInput,
    school.id,
    school?.websiteConfig?.admissionOffer,
    school?.websiteConfig?.entranceDiscountConfig,
    entrancePrefillBanner?.bestScorePct,
    entrancePrefillDiscountCancelled,
    effectiveTargetClasses,
    classesList,
    classes,
    adminPaidManual,
  ]);

  // Keep form.classId pointing to a valid class in effectiveTargetClasses
  useEffect(() => {
    const activeClsList = effectiveTargetClasses.length > 0 ? effectiveTargetClasses : classesList;
    if (activeClsList.length > 0) {
      setForm((prev) => {
        const exists = activeClsList.some((c) => c.id === prev.classId);
        if (!exists || !prev.classId) {
          const oldCls = classesList.find((c) => c.id === prev.classId) || readmClassesPool.find((c) => c.id === prev.classId);
          const byName = oldCls?.name
            ? activeClsList.find((c) => (c.name || "").trim().toLowerCase() === oldCls.name.trim().toLowerCase())
            : undefined;
          return { ...prev, classId: (byName || activeClsList[0]).id };
        }
        return prev;
      });
    }
  }, [effectiveTargetClasses, classesList, readmClassesPool]);

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

  const resolveRealStudentRecord = async (app: AdmissionApplication): Promise<SchoolStudent> => {
    const locals = getLocalStudents(school.id);
    const findMatch = (list: SchoolStudent[]) =>
      list.find(
        (s) =>
          (app.enrolledStudentId && s.id === app.enrolledStudentId) ||
          (s.admissionNo && app.applicationNo && s.admissionNo === app.applicationNo)
      ) || null;

    let matched = findMatch(locals);
    if (!matched && app.enrolledStudentId) {
      try {
        const direct = await getStudent(school.id, app.enrolledStudentId);
        if (direct) matched = direct;
      } catch {}
    }
    if (!matched) {
      try {
        const remoteList = await getStudents(school.id);
        matched = findMatch(remoteList);
      } catch {}
    }

    if (matched) {
      try {
        setLocalStudents(school.id, [matched, ...locals.filter((s) => s.id !== matched!.id)]);
      } catch {}
      return matched;
    }

    const fallbackCls = classes.find((c) => c.id === app.classId);
    const constructed: SchoolStudent = {
      id: app.enrolledStudentId || app.id,
      schoolId: school.id,
      sessionId: activeSession?.id || sessions[0]?.id || "2026-27",
      classId: app.classId,
      className: app.className || (fallbackCls ? `${fallbackCls.name} ${fallbackCls.section || ""}`.trim() : "Class"),
      name: app.studentName,
      rollNo: app.assignedRollNo || "1",
      admissionNo: app.applicationNo,
      gender: app.gender,
      category: app.category || "General",
      religion: app.religion || "Hindu",
      nationality: app.nationality || "Indian",
      fatherName: app.fatherName,
      motherName: app.motherName,
      phone: app.phone,
      whatsappNo: app.whatsappNo || app.phone,
      email: app.email,
      dateOfBirth: app.dateOfBirth,
      bloodGroup: app.bloodGroup,
      address: app.address,
      city: app.city,
      pincode: app.pincode,
      photoUrl: app.photoUrl,
      usesBus: app.usesBus,
      busRoute: app.busRoute,
      busFee: app.busFee,
      monthlyFee: Number(app.monthlyFee ?? fallbackCls?.feeStructure?.tuitionFee ?? fallbackCls?.defaultFee ?? 0),
      joinDate: (app.reviewedAt || app.appliedAt || new Date().toISOString()).slice(0, 10),
      active: true,
      createdAt: app.appliedAt || new Date().toISOString(),
    };
    try {
      setLocalStudents(school.id, [constructed, ...locals.filter((s) => s.id !== constructed.id)]);
    } catch {}
    return constructed;
  };

  useEffect(() => {
    if (!school?.id) return;
    const unsub = subscribeAdmissionApplications(school.id, (liveApps) => {
      setApplications(liveApps);
      setLoading(false);
    });
    const onStorageSync = (ev: StorageEvent) => {
      if (ev.key && (ev.key.includes("admission") || ev.key.includes(school.id))) {
        fetchApplications();
      }
    };
    window.addEventListener("storage", onStorageSync);
    return () => {
      if (typeof unsub === "function") unsub();
      window.removeEventListener("storage", onStorageSync);
    };
  }, [school.id]);

  // Fast background sync & real-time auto-jump to Student Portal when Admin approves while Parent is waiting
  useEffect(() => {
    if (isAdmin || !school?.id) return;
    const isWaitingForApproval =
      paymentSubmittedNotice ||
      submittedApp?.status === "pending" ||
      parentApplications.some((a) => a.status === "pending");
    if (!isWaitingForApproval) return;

    const timer = window.setInterval(() => {
      void getAdmissionApplications(school.id)
        .then((apps) => setApplications(apps))
        .catch(() => {});
    }, 3000);
    return () => window.clearInterval(timer);
  }, [isAdmin, school?.id, paymentSubmittedNotice, submittedApp?.status, parentApplications]);

  useEffect(() => {
    if (isAdmin || !submittedApp?.id || !onStudentEnrolledAndLink) return;
    const latest = applications.find((a) => a.id === submittedApp.id);
    if (!latest || latest.status !== "approved") return;
    if (autoJumpedAppIdsRef.current.has(latest.id)) return;

    autoJumpedAppIdsRef.current.add(latest.id);
    setSubmittedApp(latest);
    setJumpingToPortalApp(latest);
    toast.success(`🎉 ${latest.studentName} का एडमिशन अप्रूव हो गया! Student Portal खुल रहा है...`);

    let cancelled = false;
    resolveRealStudentRecord(latest)
      .then((studentRecord) => {
        if (cancelled) return;
        window.setTimeout(() => {
          if (cancelled) return;
          setJumpingToPortalApp(null);
          setPaymentSubmittedNotice(false);
          onStudentEnrolledAndLink(studentRecord);
        }, 700);
      })
      .catch(() => {
        if (!cancelled) setJumpingToPortalApp(null);
      });

    return () => {
      cancelled = true;
    };
  }, [applications, isAdmin, submittedApp?.id, onStudentEnrolledAndLink]);

  const fetchApplications = async () => {
    setLoading(true);
    const data = await getAdmissionApplications(school.id);
    setApplications(data);
    setLoading(false);
  };

  const getAppEntranceDiscountOpt = (app?: AdmissionApplication | null) =>
    app?.entranceTestScorePct !== undefined
      ? {
          scorePct: app.entranceTestScorePct,
          config: school?.websiteConfig?.entranceDiscountConfig,
          cancelled: Boolean(app.entranceDiscountCancelled),
          fixedAmountOverride:
            !app.entranceDiscountCancelled && app.entranceDiscountAmount !== undefined
              ? app.entranceDiscountAmount
              : undefined,
          labelOverride: app.entranceDiscountLabel,
        }
      : undefined;

  const handleToggleAppEntranceDiscount = async (app: AdmissionApplication) => {
    const nextCancelled = !Boolean(app.entranceDiscountCancelled);
    await updateAdmissionStatus(school.id, app.id, app.status, {
      entranceDiscountCancelled: nextCancelled,
    });
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, entranceDiscountCancelled: nextCancelled } : a))
    );
    if (enrollingApp?.id === app.id) {
      const updatedApp = { ...app, entranceDiscountCancelled: nextCancelled };
      setEnrollingApp(updatedApp);
      const selectedCls =
        classes.find((c) => c.id === enrollClassId) ||
        readmClassesPool.find((c) => c.id === enrollClassId) ||
        classes[0];
      const nextFees = getClassFees(selectedCls, {
        usesBus: enrollUsesBus,
        customBusFee: enrollBusFee,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount: getAppEntranceDiscountOpt(updatedApp),
      });
      const autoOffer = nextFees.offerDiscountTotal || 0;
      const autoEntrance = nextFees.entranceDiscountTotal || 0;
      setEnrollConcession(autoOffer + autoEntrance);
      setEnrollPaidManual(false);
    }
    toast.success(
      nextCancelled
        ? `${app.studentName} का Entrance Fee Off रद्द (Cancel) कर दिया गया।`
        : `${app.studentName} का Entrance Fee Off पुनः लागू (Restore) कर दिया गया!`
    );
  };

  const buildDefaultFeeItems = (cls: SchoolClass | undefined, withBus: boolean, customBusAmt?: number): FeeItemRow[] => {
    const fees = getClassFees(cls, {
      usesBus: withBus,
      customBusFee: customBusAmt,
      offer: school?.websiteConfig?.admissionOffer,
    });
    const rows: FeeItemRow[] = fees.enabledHeads.map((h) => ({
      id: h.key === "busFee" ? "fs_bus" : `fs_${h.key}`,
      description: h.label,
      due: h.originalAmount,
      offerCon: h.discountAmount,
    }));
    if (rows.length === 0) {
      rows.push({ id: "adm_0", description: "Admission Fee (प्रवेश शुल्क)", due: 0, offerCon: 0 });
    }
    return rows;
  };

  const openEnrollModal = (app: AdmissionApplication) => {
    const selectedCls =
      classes.find((c) => c.id === app.classId) ||
      readmClassesPool.find((c) => c.id === app.classId) ||
      classes[0];
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
    const baseItems = buildDefaultFeeItems(selectedCls, wantsBus, defBus);
    const appBackDue = app.admissionType === "READMISSION" ? Math.max(0, Number(app.previousSessionDue || 0)) : 0;
    if (appBackDue > 0 && app.includeBackDueInAdm !== false) {
      baseItems.push({
        id: "readm_back_due",
        description: `पिछला सत्र बकाया (Back Session Due${app.previousSessionName ? ` · ${app.previousSessionName}` : ""})`,
        due: appBackDue,
      });
    }
    const autoOfferCon = baseItems.reduce((s, r) => s + (Number(r.offerCon) || 0), 0);
    const entFees = getClassFees(selectedCls, {
      usesBus: wantsBus,
      customBusFee: defBus,
      offer: school?.websiteConfig?.admissionOffer,
      entranceDiscount: getAppEntranceDiscountOpt(app),
    });
    const autoEntranceCon = Number(entFees.entranceDiscountTotal || 0);
    setEnrollFeeItems(baseItems);
    setEnrollConcession(autoOfferCon + autoEntranceCon);
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
    const offerBaseCon = enrollFeeItems.reduce((s, r) => s + (Number(r.offerCon) || 0), 0);
    const remainingAfterOffer = Math.max(0, enrollEligibleGrossExclBus - offerBaseCon);
    const admDisc = pct > 0 ? Math.round((remainingAfterOffer * pct) / 100) : 0;
    setEnrollConcession(offerBaseCon + admDisc);
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
      const selectedCls =
        effectiveTargetClasses.find((c) => c.id === form.classId) ||
        classes.find((c) => c.id === form.classId) ||
        readmClassesPool.find((c) => c.id === form.classId);
      const isSenior = isSeniorClass(selectedCls?.name);
      const chosenStream = isSenior ? (form.stream || selectedCls?.stream || "Science") : undefined;
      const appId = (!isAdmin && submittedApp?.id) ? submittedApp.id : generateId();
      const appNo = (!isAdmin && submittedApp?.applicationNo)
        ? submittedApp.applicationNo
        : (form.admissionType === "READMISSION" && pulledOldStudent?.admissionNo)
        ? pulledOldStudent.admissionNo
        : generateNextAdmissionNo(school, applications.length);
      const readmCarriedDueAmt =
        form.admissionType === "READMISSION" ? Math.max(0, Number(carriedBackDueInput || 0)) : 0;
      const readmPrevSessionName =
        selectedOldSessionObj?.name ||
        readmSessionsPool.find((s) => s.id === pulledOldStudent?.sessionId)?.name ||
        "";
      const defaultNewAdmSession =
        !isAdmin || viewMode === "admissions_only"
          ? effectivePublicTargetSessionObj
          : activeSession || sessions[0];
      const resolvedTargetSessionId =
        form.admissionType === "READMISSION" && targetSessionId
          ? targetSessionId
          : defaultNewAdmSession?.id || activeSession?.id || sessions[0]?.id || "";
      const resolvedTargetSessionName =
        (readmSessionsPool.find((s) => s.id === resolvedTargetSessionId) ||
          sessions.find((s) => s.id === resolvedTargetSessionId))?.name ||
        defaultNewAdmSession?.name ||
        effectivePublicAdmissionSession ||
        activeSession?.name ||
        "";
      const newApp: AdmissionApplication = {
        id: appId,
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
        emergencyWhatsapp: form.emergencyWhatsapp.trim() || undefined,
        identificationMark: form.identificationMark.trim() || undefined,
        medicalHistory: form.medicalHistory.trim() || undefined,
        admissionType: form.admissionType || "NEW",
        ...(form.admissionType === "READMISSION"
          ? {
              targetSessionId: resolvedTargetSessionId || undefined,
              targetSessionName: resolvedTargetSessionName || undefined,
              includeBackDueInAdm,
              previousStudentId: pulledOldStudent?.id,
              previousSessionId: pulledOldStudent?.sessionId || oldSessionId || undefined,
              previousSessionName: readmPrevSessionName || undefined,
              previousClassName: pulledOldStudent?.className || form.previousClass.trim() || undefined,
              previousSessionDue: readmCarriedDueAmt,
            }
          : {}),
        bloodGroup: form.bloodGroup || undefined,
        apaarId: form.apaarId.trim() || undefined,
        photoUrl: form.photoUrl || undefined,
        classId: form.classId,
        className: selectedCls ? formatClassLabel(selectedCls) : "General",
        previousSchool: form.previousSchool.trim() || undefined,
        previousMarks: form.previousMarks.trim() || undefined,
        fatherName: form.fatherName.trim(),
        fatherOccupation: form.fatherOccupation.trim() || undefined,
        fatherPhone: form.fatherPhone.trim() || undefined,
        fatherWhatsapp: form.fatherWhatsapp.trim() || undefined,
        motherName: form.motherName.trim(),
        motherOccupation: form.motherOccupation.trim() || undefined,
        motherPhone: form.motherPhone.trim() || undefined,
        motherWhatsapp: form.motherWhatsapp.trim() || undefined,
        aadhaarNo: form.aadhaarNo.trim() || undefined,
        fatherAadhaar: form.fatherAadhaar.trim() || undefined,
        motherAadhaar: form.motherAadhaar.trim() || undefined,
        phone: form.phone.trim(),
        whatsappNo: form.whatsappNo.trim() || form.fatherWhatsapp.trim() || undefined,
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
        isOnlyChild: form.isOnlyChild || undefined,
        motherTongue: form.motherTongue.trim() || undefined,
        fatherQualification: form.fatherQualification.trim() || undefined,
        motherQualification: form.motherQualification.trim() || undefined,
        correspondenceAddress: form.isSameAddress ? form.address.trim() : (form.correspondenceAddress.trim() || form.address.trim()),
        isSameAddress: form.isSameAddress,
        previousBoard: form.previousBoard.trim() || undefined,
        previousTcNo: form.previousTcNo.trim() || undefined,
        previousTcDate: form.previousTcDate.trim() || undefined,
        transportModeIfNo: form.transportModeIfNo || undefined,
        transportDistanceKm: form.transportDistanceKm.trim() || undefined,
        childSensitivity: form.childSensitivity,
        childSensitivityRemarks: form.childSensitivityRemarks.trim() || undefined,
        siblingDetails: form.siblingDetails.length > 0 ? form.siblingDetails : undefined,
        bankAccountName: form.bankAccountName.trim() || undefined,
        bankName: form.bankName.trim() || undefined,
        bankAccountNumber: form.bankAccountNumber.trim() || undefined,
        bankIfsc: form.bankIfsc.trim() || undefined,
        parentDeclarationAccepted: form.parentDeclarationAccepted,
        ageOnAprilFirst: ageOnApril1 || undefined,
        admissionOperatorRole: verifiedOperator.role,
        admissionOperatorName: verifiedOperator.name,
        isAdmissionFeeEdited: verifiedOperator.role === "TEACHER" && teacherCustomAdmissionFee !== "",
        customAdmissionFeeApplied: verifiedOperator.role === "TEACHER" && teacherCustomAdmissionFee !== "" ? Number(teacherCustomAdmissionFee) : undefined,
        teacherConcessionApplied: verifiedOperator.role === "TEACHER" && Number(teacherCustomConcession) > 0 ? Number(teacherCustomConcession) : undefined,
        admissionMarkedTimestamp: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }),
        ...(entrancePrefillBanner && entrancePrefillBanner.bestScorePct !== undefined
          ? (() => {
              const evalMeta = evaluateEntranceScore(
                entrancePrefillBanner.bestScorePct,
                entrancePrefillBanner.classLabel,
                entrancePrefillBanner.classLevel
              );
              const prefillFees = getClassFees(selectedCls, {
                usesBus: form.usesBus,
                offer: school?.websiteConfig?.admissionOffer,
                entranceDiscount: {
                  scorePct: entrancePrefillBanner.bestScorePct,
                  config: school?.websiteConfig?.entranceDiscountConfig,
                  cancelled: entrancePrefillDiscountCancelled,
                },
              });
              return {
                entranceTestScorePct: entrancePrefillBanner.bestScorePct,
                entranceTestTier: evalMeta.tier,
                entranceTestTag: evalMeta.adminShortBadge,
                entranceTestSetId: entrancePrefillBanner.lastSetId,
                entranceRecommendedClass:
                  entrancePrefillBanner.recommendedClassLabel || evalMeta.recommendedClassLabel,
                entranceDiscountAmount:
                  prefillFees.entranceDiscountTotal > 0
                    ? prefillFees.entranceDiscountTotal
                    : undefined,
                entranceDiscountLabel: prefillFees.entranceDiscountLabel || undefined,
                entranceDiscountCancelled: entrancePrefillDiscountCancelled || undefined,
              };
            })()
          : {}),
        status: "pending",
        appliedAt: new Date().toISOString(),
      };

      const forcePendingRequest = submitAsPendingRequestRef.current;
      submitAsPendingRequestRef.current = false;

      if (isAdmin && !forcePendingRequest) {
        // Teacher / Admin Counter Enrollment: Direct Active Student + Offline Cash / Counter Fee Record!
        const studentId = generateId();
        const feeCalc = getClassFees(selectedCls, {
          usesBus: form.usesBus,
          offer: school?.websiteConfig?.admissionOffer,
          entranceDiscount:
            entrancePrefillBanner?.bestScorePct !== undefined
              ? {
                  scorePct: entrancePrefillBanner.bestScorePct,
                  config: school?.websiteConfig?.entranceDiscountConfig,
                  cancelled: entrancePrefillDiscountCancelled,
                }
              : undefined,
        });
        const offerConAmt =
          Number(feeCalc.offerDiscountTotal || 0) +
          Number(feeCalc.entranceDiscountTotal || 0);
        const backDueInAdmAmt =
          form.admissionType === "READMISSION" && includeBackDueInAdm
            ? readmCarriedDueAmt
            : 0;
        const concessionAmt = Number(adminConcession) || 0;
        const totalConcessionWithOffer = offerConAmt + concessionAmt;
        const grossPayableWithBack = feeCalc.totalPayable + backDueInAdmAmt;
        const netPayable = Math.max(0, grossPayableWithBack - concessionAmt);
        const paidAdmissionAmt = adminPaidAmount !== "" ? Math.max(0, Number(adminPaidAmount)) : netPayable;
        const balanceAmt = Math.max(0, netPayable - paidAdmissionAmt);

        // Zero-double-counting split between Back Due & Re-Admission Fees (FIFO: Back Due first)
        let remainingBackDueToSave = readmCarriedDueAmt;
        let remainingAdmDueToSave = balanceAmt > 0 ? balanceAmt : 0;
        if (backDueInAdmAmt > 0) {
          const conOnAdm = Math.min(feeCalc.totalPayable, concessionAmt);
          const conOnBack = Math.max(0, concessionAmt - conOnAdm);
          const backNet = Math.max(0, backDueInAdmAmt - conOnBack);
          const admNet = Math.max(0, feeCalc.totalPayable - conOnAdm);
          const paidTowardBack = Math.min(backNet, Math.max(0, paidAdmissionAmt));
          remainingBackDueToSave = Math.max(0, backNet - paidTowardBack);
          const paidTowardAdm = Math.max(0, paidAdmissionAmt - paidTowardBack);
          remainingAdmDueToSave = Math.max(0, admNet - paidTowardAdm);
        }

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
          sessionId: resolvedTargetSessionId,
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
          emergencyWhatsapp: form.emergencyWhatsapp.trim() || undefined,
          identificationMark: form.identificationMark.trim() || undefined,
          medicalHistory: form.medicalHistory.trim() || undefined,
          admissionType: form.admissionType || "NEW",
          ...(form.admissionType === "READMISSION"
            ? {
                previousStudentId: pulledOldStudent?.id,
                previousSessionId: pulledOldStudent?.sessionId || oldSessionId || undefined,
                previousSessionName: readmPrevSessionName || "पिछला सत्र",
                previousClassName: pulledOldStudent?.className || form.previousClass.trim() || "",
                previousSessionDue: remainingBackDueToSave,
                previousSessionDueInitial: readmCarriedDueAmt,
                reAdmissionDate: paidIso.slice(0, 10),
              }
            : {}),
          apaarId: form.apaarId.trim() || undefined,
          fatherName: form.fatherName.trim(),
          fatherOccupation: form.fatherOccupation.trim() || undefined,
          fatherPhone: form.fatherPhone.trim() || undefined,
          fatherWhatsapp: form.fatherWhatsapp.trim() || undefined,
          motherName: form.motherName.trim(),
          motherOccupation: form.motherOccupation.trim() || undefined,
          motherPhone: form.motherPhone.trim() || undefined,
          motherWhatsapp: form.motherWhatsapp.trim() || undefined,
          aadhaarNo: form.aadhaarNo.trim() || undefined,
          fatherAadhaar: form.fatherAadhaar.trim() || undefined,
          motherAadhaar: form.motherAadhaar.trim() || undefined,
          phone: form.phone.trim(),
          whatsappNo: form.whatsappNo.trim() || form.fatherWhatsapp.trim() || form.phone.trim(),
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
          busNumber: form.usesBus ? configuredRoutes.find((r) => r.routeName === form.busRoute)?.busNumber : undefined,
          driverName: form.usesBus ? configuredRoutes.find((r) => r.routeName === form.busRoute)?.driverName : undefined,
          driverPhone: form.usesBus ? configuredRoutes.find((r) => r.routeName === form.busRoute)?.driverPhone : undefined,
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
          isOnlyChild: form.isOnlyChild || undefined,
          motherTongue: form.motherTongue.trim() || undefined,
          fatherQualification: form.fatherQualification.trim() || undefined,
          motherQualification: form.motherQualification.trim() || undefined,
          correspondenceAddress: form.isSameAddress ? form.address.trim() : (form.correspondenceAddress.trim() || form.address.trim()),
          isSameAddress: form.isSameAddress,
          previousBoard: form.previousBoard.trim() || undefined,
          previousTcNo: form.previousTcNo.trim() || undefined,
          previousTcDate: form.previousTcDate.trim() || undefined,
          transportModeIfNo: form.transportModeIfNo || undefined,
          transportDistanceKm: form.transportDistanceKm.trim() || undefined,
          childSensitivity: form.childSensitivity,
          childSensitivityRemarks: form.childSensitivityRemarks.trim() || undefined,
          siblingDetails: form.siblingDetails.length > 0 ? form.siblingDetails : undefined,
          bankAccountName: form.bankAccountName.trim() || undefined,
          bankName: form.bankName.trim() || undefined,
          bankAccountNumber: form.bankAccountNumber.trim() || undefined,
          bankIfsc: form.bankIfsc.trim() || undefined,
          ageOnAprilFirst: ageOnApril1 || undefined,
          admissionTotalAmount: netPayable,
          admissionPaidAmount: paidAdmissionAmt,
          admissionDueBalance: remainingAdmDueToSave,
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

        // Build admission fee items (allocating Back Due + Admission heads FIFO item-by-item)
        const rawFeeItems = buildDefaultFeeItems(
          selectedCls,
          Boolean(form.usesBus && getClassFees(selectedCls).busAvailable),
          form.usesBus && getClassFees(selectedCls).busAvailable ? getClassFees(selectedCls, { usesBus: true }).busFee : 0
        );
        if (backDueInAdmAmt > 0) {
          rawFeeItems.push({
            id: "readm_back_due",
            description: `पिछला सत्र बकाया (Back Session Due${readmPrevSessionName ? ` · ${readmPrevSessionName}` : ""})`,
            due: backDueInAdmAmt,
          });
        }
        let remConDirect = concessionAmt;
        const conByDirectId = new Map<string, number>();
        rawFeeItems.forEach((it) => {
          const itemOffer = Math.min(Number(it.due) || 0, Number(it.offerCon) || 0);
          if (it.id !== "readm_back_due") {
            const availAfterOffer = Math.max(0, (Number(it.due) || 0) - itemOffer);
            const cVal = Math.min(availAfterOffer, Math.max(0, remConDirect));
            conByDirectId.set(it.id, itemOffer + cVal);
            remConDirect = Math.max(0, remConDirect - cVal);
          } else {
            conByDirectId.set(it.id, itemOffer);
          }
        });
        rawFeeItems.forEach((it) => {
          if (it.id === "readm_back_due") {
            const prevCon = conByDirectId.get(it.id) || 0;
            const cVal = Math.min(Math.max(0, (Number(it.due) || 0) - prevCon), Math.max(0, remConDirect));
            conByDirectId.set(it.id, prevCon + cVal);
            remConDirect = Math.max(0, remConDirect - cVal);
          }
        });
        let remDirectPaid = paidAdmissionAmt;
        const paidByDirectId = new Map<string, number>();
        rawFeeItems.forEach((it) => {
          if (it.id === "readm_back_due") {
            const netItemDue = Math.max(0, (Number(it.due) || 0) - (conByDirectId.get(it.id) || 0));
            const pVal = Math.min(netItemDue, Math.max(0, remDirectPaid));
            paidByDirectId.set(it.id, pVal);
            remDirectPaid = Math.max(0, remDirectPaid - pVal);
          }
        });
        rawFeeItems.forEach((it) => {
          if (it.id !== "readm_back_due") {
            const netItemDue = Math.max(0, (Number(it.due) || 0) - (conByDirectId.get(it.id) || 0));
            const pVal = Math.min(netItemDue, Math.max(0, remDirectPaid));
            paidByDirectId.set(it.id, pVal);
            remDirectPaid = Math.max(0, remDirectPaid - pVal);
          }
        });
        const finalItems = rawFeeItems.map((it, idx) => ({
          id: it.id,
          slNo: idx + 1,
          description: it.description.trim(),
          due: Number(it.due) || 0,
          con: conByDirectId.get(it.id) || 0,
          paid: paidByDirectId.get(it.id) || 0,
        }));

        const admissionFeeRecord: MonthlyFee = {
          schoolId: school.id,
          sessionId: resolvedTargetSessionId || "2026-27",
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
          concession: totalConcessionWithOffer,
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
            concession: totalConcessionWithOffer,
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

      // Online Parent flow OR Admin "Submit as Request": Save as pending
      await saveAdmissionApplication(school.id, newApp);
      try {
        window.dispatchEvent(new CustomEvent("school-admission-alert", {
          detail: {
            id: generateId(),
            schoolId: school.id,
            studentName: newApp.studentName,
            className: newApp.className,
            applicationNo: newApp.applicationNo,
            timestamp: new Date().toISOString(),
          },
        }));
      } catch {}

      if (isAdmin) {
        setSubmittedApp(null);
        setConfirmedAdmission(null);
        setAdminFormStep(1);
        setActiveTab("applications");
        setStatusFilter("pending");
        setSuccessToast(`📩 ${newApp.studentName} (${newApp.applicationNo}) का आवेदन Pending सूची में जुड़ गया! अब इसे Accept या Reject करें।`);
        setTimeout(() => setSuccessToast(null), 5000);
        fetchApplications();
        return;
      }

      setSubmittedApp(newApp);
      setAdmissionStep(2);
      setPaymentSubmittedNotice(false);
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
      try {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {}
    } catch (err: any) {
      submitAsPendingRequestRef.current = false;
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
      const selectedCls =
        classes.find((c) => c.id === enrollClassId) ||
        readmClassesPool.find((c) => c.id === enrollClassId);
      const studentId = generateId();
      const paidAdmissionAmt = Math.max(0, Number(enrollPaidAmount) || 0);
      const balanceAmt = Math.max(0, enrollNetPayable - paidAdmissionAmt);
      const receiptNo = `ADM-${Math.floor(10000 + Math.random() * 90000)}`;
      const paidIso = new Date().toISOString();
      const resolvedEnrollSessionId =
        enrollingApp.admissionType === "READMISSION" && enrollingApp.targetSessionId
          ? enrollingApp.targetSessionId
          : activeSession?.id || sessions[0]?.id || "";

      // Zero-double-counting split for pending Re-Admission enrollment
      const validEnrollLines = enrollFeeItems.filter((it) => it.description.trim() && Number(it.due) >= 0);
      const enrollConAmt = Number(enrollConcession) || 0;
      let remConEnroll = enrollConAmt;
      const conByEnrollId = new Map<string, number>();
      validEnrollLines.forEach((it) => {
        if (it.id !== "readm_back_due") {
          const cVal = Math.min(Number(it.due) || 0, Math.max(0, remConEnroll));
          conByEnrollId.set(it.id, cVal);
          remConEnroll = Math.max(0, remConEnroll - cVal);
        }
      });
      validEnrollLines.forEach((it) => {
        if (it.id === "readm_back_due") {
          const cVal = Math.min(Number(it.due) || 0, Math.max(0, remConEnroll));
          conByEnrollId.set(it.id, cVal);
          remConEnroll = Math.max(0, remConEnroll - cVal);
        }
      });
      let remEnrollPaid = paidAdmissionAmt;
      const paidByEnrollId = new Map<string, number>();
      validEnrollLines.forEach((it) => {
        if (it.id === "readm_back_due") {
          const netIt = Math.max(0, (Number(it.due) || 0) - (conByEnrollId.get(it.id) || 0));
          const pVal = Math.min(netIt, Math.max(0, remEnrollPaid));
          paidByEnrollId.set(it.id, pVal);
          remEnrollPaid = Math.max(0, remEnrollPaid - pVal);
        }
      });
      validEnrollLines.forEach((it) => {
        if (it.id !== "readm_back_due") {
          const netIt = Math.max(0, (Number(it.due) || 0) - (conByEnrollId.get(it.id) || 0));
          const pVal = Math.min(netIt, Math.max(0, remEnrollPaid));
          paidByEnrollId.set(it.id, pVal);
          remEnrollPaid = Math.max(0, remEnrollPaid - pVal);
        }
      });
      const enrollBackItem = validEnrollLines.find((it) => it.id === "readm_back_due" && Number(it.due) > 0);
      const appPrevDueInitial = Math.max(0, Number(enrollingApp.previousSessionDue || 0));
      const enrollRemainingBackDue = enrollBackItem
        ? Math.max(
            0,
            (Number(enrollBackItem.due) || 0) -
              (conByEnrollId.get("readm_back_due") || 0) -
              (paidByEnrollId.get("readm_back_due") || 0)
          )
        : appPrevDueInitial;
      const enrollRemainingAdmDue = enrollBackItem
        ? validEnrollLines
            .filter((it) => it.id !== "readm_back_due")
            .reduce(
              (sum, it) =>
                sum + Math.max(0, (Number(it.due) || 0) - (conByEnrollId.get(it.id) || 0) - (paidByEnrollId.get(it.id) || 0)),
              0
            )
        : balanceAmt > 0
        ? balanceAmt
        : 0;

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
        sessionId: resolvedEnrollSessionId,
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
        emergencyWhatsapp: enrollingApp.emergencyWhatsapp,
        identificationMark: enrollingApp.identificationMark,
        medicalHistory: enrollingApp.medicalHistory,
        admissionType: enrollingApp.admissionType || "NEW",
        ...(enrollingApp.admissionType === "READMISSION"
          ? {
              previousStudentId: enrollingApp.previousStudentId,
              previousSessionId: enrollingApp.previousSessionId,
              previousSessionName: enrollingApp.previousSessionName,
              previousClassName: enrollingApp.previousClassName,
              previousSessionDue: enrollRemainingBackDue,
              previousSessionDueInitial: appPrevDueInitial,
              reAdmissionDate: paidIso.slice(0, 10),
            }
          : {}),
        apaarId: enrollApaarId.trim() || enrollingApp.apaarId || undefined,
        fatherName: enrollingApp.fatherName,
        fatherOccupation: enrollingApp.fatherOccupation,
        fatherPhone: enrollingApp.fatherPhone,
        fatherWhatsapp: enrollingApp.fatherWhatsapp,
        motherName: enrollingApp.motherName,
        motherOccupation: enrollingApp.motherOccupation,
        motherPhone: enrollingApp.motherPhone,
        motherWhatsapp: enrollingApp.motherWhatsapp,
        fatherQualification: enrollingApp.fatherQualification,
        motherQualification: enrollingApp.motherQualification,
        aadhaarNo: enrollStudentAadhaar.trim() || enrollingApp.aadhaarNo || undefined,
        fatherAadhaar: enrollFatherAadhaar.trim() || enrollingApp.fatherAadhaar || undefined,
        motherAadhaar: enrollMotherAadhaar.trim() || enrollingApp.motherAadhaar || undefined,
        phone: enrollingApp.phone,
        whatsappNo: enrollingApp.whatsappNo || enrollingApp.fatherWhatsapp || enrollingApp.phone,
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
        busNumber: enrollUsesBus ? configuredRoutes.find((r) => r.routeName === enrollBusRoute)?.busNumber : undefined,
        driverName: enrollUsesBus ? configuredRoutes.find((r) => r.routeName === enrollBusRoute)?.driverName : undefined,
        driverPhone: enrollUsesBus ? configuredRoutes.find((r) => r.routeName === enrollBusRoute)?.driverPhone : undefined,
        submittedDocs: enrollSubmittedDocs,
        admissionReceiptNo: receiptNo,
        admissionTotalAmount: enrollNetPayable,
        admissionPaidAmount: paidAdmissionAmt,
        admissionDueBalance: enrollRemainingAdmDue,
        advanceMonthlyFeePaid: false,
        advanceMonthlyFeeDue: Number(enrollMonthlyFee) || 0,
        advanceMonthlyFeeMonth: paidIso.slice(0, 7),
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
          sessionId: resolvedEnrollSessionId || "2026-27",
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

        // Auto-enroll biometric Face ID for new student so logout -> Face login works seamlessly
        if (savedStudent.photoUrl) {
          enrollStudentFromPhotoUrl({
            id: savedStudent.id,
            schoolId: school.id,
            name: savedStudent.name,
            rollNo: String(savedStudent.rollNo || ""),
            classId: savedStudent.classId,
            className: savedStudent.className,
            photoUrl: savedStudent.photoUrl,
          }).catch(() => {});
        }
      } catch (cacheErr) {
        console.warn("Student profile sync notice:", cacheErr);
      }

      const finalItems = validEnrollLines.map((it, idx) => ({
        id: it.id,
        slNo: idx + 1,
        description: it.description.trim(),
        due: Number(it.due) || 0,
        con: conByEnrollId.get(it.id) || 0,
        paid: paidByEnrollId.get(it.id) || 0,
      }));

      const admissionFeeRecord: MonthlyFee = {
        schoolId: school.id,
        sessionId: resolvedEnrollSessionId || "2026-27",
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
        balanceDue: enrollRemainingAdmDue,
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
      try {
        window.dispatchEvent(new CustomEvent("school-admission-alert", { detail: { schoolId: school.id, appId: enrollingApp.id, status: "approved" } }));
      } catch {}
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
      const fees = getClassFees(selectedCls, {
        usesBus: submittedApp.usesBus,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount: getAppEntranceDiscountOpt(submittedApp),
      });

      // 1. Update application with payment proof, status remains PENDING for admin review (also clears previous rejection if resubmitted)
      const isWasRejected = submittedApp.status === "rejected";
      const nextCount = isWasRejected ? Number(submittedApp.resubmitCount || 0) + 1 : submittedApp.resubmitCount;
      await updateAdmissionStatus(school.id, submittedApp.id, "pending", {
        paymentScreenshotUrl: paymentScreenshot || submittedApp.paymentScreenshotUrl || undefined,
        transactionRef: transactionRef.trim() || submittedApp.transactionRef || undefined,
        paymentMode: "WhatsApp UPI",
        paymentSubmittedAt: new Date().toISOString(),
        ...(isWasRejected ? { resubmittedAt: new Date().toISOString(), resubmitCount: nextCount, rejectionReason: "" } : {}),
        remarks: `${isWasRejected ? "Resubmitted with updated proof. " : "WhatsApp payment submitted. "}UTR: ${transactionRef.trim() || "N/A"}. Awaiting Admin Approval.`,
      });

      // 2. Send Live Push Notification to School Admin
      try {
        await sendSchoolPushNotification({
          schoolId: school.id,
          title: isWasRejected
            ? `🔄 Rejected Admission Resubmitted: ${submittedApp.studentName}`
            : `📩 New Admission Payment: ${submittedApp.studentName}`,
          body: `${submittedApp.studentName} (${submittedApp.className}) ne ₹${fees.totalPayable} ka payment screenshot & UTR submit kiya hai. Kripya verify karke Accept ya Reject karein.`,
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
        paymentScreenshotUrl: paymentScreenshot || prev.paymentScreenshotUrl || undefined,
        transactionRef: transactionRef.trim() || prev.transactionRef || undefined,
        status: "pending",
        ...(isWasRejected ? { resubmittedAt: new Date().toISOString(), resubmitCount: nextCount, rejectionReason: undefined } : {}),
      } : null));

      setPaymentSubmittedNotice(true);
      fetchApplications();
    } catch (err: any) {
      setScreenshotError("स्क्रीनशॉट सबमिट करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setSubmittingScreenshot(false);
    }
  };

  // Auto-Accept & Auto-Enroll Admission Application immediately after Razorpay Payment succeeds
  const autoEnrollPaidAdmission = async (
    app: AdmissionApplication,
    paymentMeta: {
      receiptNo: string;
      paymentId: string;
      orderId: string;
      totalPayable: number;
    }
  ) => {
    const targetCls = classes.find((c) => c.id === app.classId);
    const localStudents = getLocalStudents(school.id);
    const clsStudents = localStudents.filter((s) =>
      isStudentInClass(s, targetCls?.id || app.classId, targetCls?.name || app.className)
    );
    const maxRoll = clsStudents.reduce((m, s) => {
      const n = parseInt(String(s.rollNo || "").replace(/\D/g, ""), 10);
      return !isNaN(n) && n > m ? n : m;
    }, 0);
    const nextRollNo = String(maxRoll + 1);
    const studentId = app.enrolledStudentId || generateId();
    const paidIso = new Date().toISOString();

    const usesBus = Boolean(app.usesBus && getClassFees(targetCls).busAvailable);
    const busFeeAmt = usesBus ? Number(app.busFee ?? getClassFees(targetCls, { usesBus: true }).busFee ?? 0) : 0;
    const rawFeeItems = buildDefaultFeeItems(targetCls, usesBus, busFeeAmt);
    const appFeesSummary = getClassFees(targetCls, {
      usesBus,
      customBusFee: busFeeAmt,
      offer: school?.websiteConfig?.admissionOffer,
      entranceDiscount: getAppEntranceDiscountOpt(app),
    });
    const finalItems = rawFeeItems.map((it, idx) => {
      const dueAmt = Number(it.due) || 0;
      const conAmt = Math.min(dueAmt, Number(it.offerCon) || 0);
      const paidAmt = Math.max(0, dueAmt - conAmt);
      return {
        id: it.id,
        slNo: idx + 1,
        description: it.description.trim(),
        due: dueAmt,
        con: conAmt,
        paid: paidAmt,
      };
    });

    const offerConTotal =
      finalItems.reduce((sum, it) => sum + Number(it.con || 0), 0) +
      Number(appFeesSummary.entranceDiscountTotal || 0);
    const netPayable =
      Number(paymentMeta.totalPayable || 0) > 0
        ? Number(paymentMeta.totalPayable || 0)
        : appFeesSummary.totalPayable;
    const monthlyTuition = Number(targetCls?.feeStructure?.tuitionFee ?? targetCls?.defaultFee ?? 0);

    const newStudent: SchoolStudent = {
      id: studentId,
      schoolId: school.id,
      sessionId: activeSession?.id || sessions[0]?.id || "2026-27",
      classId: app.classId,
      className: targetCls ? `${targetCls.name} ${targetCls.section || ""}`.trim() : app.className || "Class",
      stream: app.stream,
      name: app.studentName,
      rollNo: nextRollNo,
      admissionNo: app.applicationNo,
      gender: app.gender,
      category: app.category || "General",
      religion: app.religion || "Hindu",
      nationality: app.nationality || "Indian",
      annualIncome: app.annualIncome,
      emergencyContact: app.emergencyContact,
      emergencyPhone: app.emergencyPhone,
      emergencyRelation: app.emergencyRelation,
      emergencyWhatsapp: app.emergencyWhatsapp,
      identificationMark: app.identificationMark,
      medicalHistory: app.medicalHistory,
      admissionType: app.admissionType || "NEW",
      apaarId: app.apaarId,
      fatherName: app.fatherName,
      fatherOccupation: app.fatherOccupation,
      fatherPhone: app.fatherPhone,
      fatherWhatsapp: app.fatherWhatsapp,
      motherName: app.motherName,
      motherOccupation: app.motherOccupation,
      motherPhone: app.motherPhone,
      motherWhatsapp: app.motherWhatsapp,
      fatherQualification: app.fatherQualification,
      motherQualification: app.motherQualification,
      aadhaarNo: app.aadhaarNo,
      fatherAadhaar: app.fatherAadhaar,
      motherAadhaar: app.motherAadhaar,
      phone: app.phone,
      whatsappNo: app.whatsappNo || app.fatherWhatsapp || app.phone,
      email: app.email,
      dateOfBirth: app.dateOfBirth,
      bloodGroup: app.bloodGroup,
      address: app.address,
      city: app.city,
      pincode: app.pincode,
      previousSchool: app.previousSchool,
      previousMarks: app.previousMarks,
      photoUrl: app.photoUrl || undefined,
      usesBus,
      busRoute: usesBus ? app.busRoute : undefined,
      busFee: busFeeAmt,
      submittedDocs: app.submittedDocs,
      admissionReceiptNo: paymentMeta.receiptNo,
      admissionTotalAmount: netPayable,
      admissionPaidAmount: netPayable,
      admissionDueBalance: 0,
      advanceMonthlyFeePaid: false,
      advanceMonthlyFeeDue: monthlyTuition,
      advanceMonthlyFeeMonth: paidIso.slice(0, 7),
      monthlyFee: monthlyTuition,
      baseMonthlyFee: monthlyTuition,
      joinDate: paidIso.slice(0, 10),
      active: true,
      createdAt: paidIso,
    };

    const savedStudent = await saveStudent(newStudent);

    try {
      const curLocals = getLocalStudents(school.id);
      setLocalStudents(school.id, [savedStudent, ...curLocals.filter((s) => s.id !== savedStudent.id)]);

      const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
      const studentEmail =
        app.email ||
        `${savedStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;

      await saveSchoolUserProfile({
        uid: savedStudent.id,
        schoolId: school.id,
        role: "SCHOOL_STUDENT",
        name: savedStudent.name,
        email: studentEmail,
        studentRef: savedStudent.id,
        classId: app.classId,
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
          classLevel: app.classId,
          stream: app.stream || "General",
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

      if (savedStudent.photoUrl) {
        enrollStudentFromPhotoUrl({
          id: savedStudent.id,
          schoolId: school.id,
          name: savedStudent.name,
          rollNo: String(savedStudent.rollNo || ""),
          classId: savedStudent.classId,
          className: savedStudent.className,
          photoUrl: savedStudent.photoUrl,
        }).catch(() => {});
      }
    } catch {}

    const admissionFeeRecord: MonthlyFee = {
      schoolId: school.id,
      sessionId: activeSession?.id || "2026-27",
      studentId: savedStudent.id,
      studentName: savedStudent.name,
      rollNo: savedStudent.rollNo,
      classId: app.classId,
      className: savedStudent.className,
      month: paidIso.slice(0, 7),
      amount: netPayable,
      monthlyAmount: monthlyTuition,
      paid: true,
      paidDate: paidIso,
      receiptNo: paymentMeta.receiptNo,
      paidAmount: netPayable,
      balanceDue: 0,
      concession: offerConTotal,
      feeType: "admission",
      receiptCategory: "admission",
      includeBusFee: usesBus,
      busFeeAmount: busFeeAmt,
      busRoute: usesBus ? app.busRoute : undefined,
      payModeInfo: {
        payMode: "Razorpay Online",
        date: new Date().toLocaleDateString("en-GB"),
        bank: "Razorpay",
        number: paymentMeta.paymentId,
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
      concession: offerConTotal,
      totalPayable: netPayable,
      paidAmount: netPayable,
      balanceDue: 0,
      paymentMode: "Razorpay Online",
      receiptNo: paymentMeta.receiptNo,
      paidDate: paidIso,
      items: finalItems,
    };

    await updateAdmissionStatus(school.id, app.id, "approved", {
      enrolledStudentId: savedStudent.id,
      assignedRollNo: savedStudent.rollNo,
      classId: app.classId,
      className: savedStudent.className,
      photoUrl: savedStudent.photoUrl,
      transactionRef: paymentMeta.paymentId,
      paymentMode: "Razorpay Online",
      razorpayOrderId: paymentMeta.orderId,
      razorpayPaymentId: paymentMeta.paymentId,
      admissionFeeDetails: savedFeeDetails,
      remarks: `Auto-Approved via Razorpay Online Payment (Roll #${savedStudent.rollNo}). Receipt #${paymentMeta.receiptNo}`,
    });

    try {
      await sendSchoolPushNotification({
        schoolId: school.id,
        title: `✅ Auto-Approved Online Admission: ${savedStudent.name}`,
        body: `${savedStudent.name} (${savedStudent.className}) ne ₹${netPayable} Razorpay se pay kiya. Roll #${savedStudent.rollNo} auto-assign ho gaya (Receipt: ${paymentMeta.receiptNo}).`,
        urgent: true,
        type: "FEE_RECEIPT",
      });
    } catch {}

    const approvedApp: AdmissionApplication = {
      ...app,
      status: "approved",
      enrolledStudentId: savedStudent.id,
      assignedRollNo: savedStudent.rollNo,
      transactionRef: paymentMeta.paymentId,
      razorpayOrderId: paymentMeta.orderId,
      razorpayPaymentId: paymentMeta.paymentId,
      admissionFeeDetails: savedFeeDetails,
    };

    setSubmittedApp(approvedApp);
    setConfirmedAdmission({
      student: savedStudent,
      assignedRollNo: savedStudent.rollNo,
      existingCount: clsStudents.length,
      admissionCharge: finalItems[0]?.due || 0,
      annualCharge: (finalItems[1]?.due || 0) + (finalItems[2]?.due || 0),
      totalPayable: netPayable,
      receiptNo: paymentMeta.receiptNo,
      feeRecord: admissionFeeRecord,
    });
    setAccountLinkedDone(false);
    setPaymentSubmittedNotice(false);
    setAdmissionPayError(null);
    toast.success(`🎉 Payment verified! Roll #${savedStudent.rollNo} auto-assigned.`);
    fetchApplications();
  };

  const handleOnlineAdmissionRazorpayPay = async (app: AdmissionApplication) => {
    setAdmissionPayError(null);
    setPayingAdmissionAppId(app.id);

    try {
      let cfg = razorpayCfg;
      if (!cfg) {
        cfg = await fetchSchoolRazorpayConfig(school.id);
        setRazorpayCfg(cfg);
      }
      if (!cfg?.enabled) {
        setPayingAdmissionAppId(null);
        setAdmissionPayError(
          "Is school ka Razorpay online gateway abhi active nahi hai — कृपया WhatsApp/QR विकल्प का उपयोग करें।"
        );
        return;
      }

      const targetCls = classes.find((c) => c.id === app.classId);
      const fees = getClassFees(targetCls, {
        usesBus: app.usesBus,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount: getAppEntranceDiscountOpt(app),
      });
      const totalPayable = Number(fees.totalPayable || 0);

      if (totalPayable <= 0) {
        await autoEnrollPaidAdmission(app, {
          receiptNo: `ADM-FREE-${Date.now().toString(36).toUpperCase().slice(-5)}`,
          paymentId: "ZERO_FEE_ONLINE",
          orderId: "ZERO_FEE_ORDER",
          totalPayable: 0,
        });
        setPayingAdmissionAppId(null);
        return;
      }

      await startOnlineAdmissionRazorpayCheckout({
        schoolId: school.id,
        schoolName: school.name || "School Admission",
        application: {
          id: app.id,
          applicationNo: app.applicationNo,
          studentName: app.studentName,
          classId: app.classId,
          className: app.className,
          phone: app.phone,
          email: app.email,
          sessionId: activeSession?.id || "2026-27",
        },
        payableAmount: totalPayable,
        feeItems: fees.enabledHeads.map((h, i) => ({
          id: h.key,
          slNo: i + 1,
          description: h.label,
          due: h.amount,
        })),
        onSuccess: async (res) => {
          try {
            await autoEnrollPaidAdmission(app, {
              receiptNo: res.receiptNo,
              paymentId: res.paymentId,
              orderId: res.orderId,
              totalPayable,
            });
          } catch (err: any) {
            setAdmissionPayError(
              "Payment successful (" + res.paymentId + "), par auto-enrollment me error aaya: " + (err?.message || "Please retry")
            );
          } finally {
            setPayingAdmissionAppId(null);
          }
        },
        onError: (msg) => {
          setAdmissionPayError(msg);
          setPayingAdmissionAppId(null);
        },
        onDismiss: () => {
          setPayingAdmissionAppId(null);
        },
      });
    } catch (err: any) {
      setAdmissionPayError(err?.message || "Payment start karne me error aaya");
      setPayingAdmissionAppId(null);
    }
  };

  const handlePostPayFaceIdPhotoSave = async (photoDataUrl: string, shouldLinkImmediately = true) => {
    if (!confirmedAdmission?.student || !photoDataUrl) return;
    setPostPayPhotoSaving(true);
    try {
      const targetStudent = confirmedAdmission.student;
      const cloudUrl = await updateStudentPhoto(school.id, targetStudent.id, photoDataUrl);
      const updatedStudent: SchoolStudent = { ...targetStudent, photoUrl: cloudUrl };

      if (submittedApp?.id) {
        await updateAdmissionStatus(school.id, submittedApp.id, "approved", {
          photoUrl: cloudUrl,
        }).catch(() => {});
        setSubmittedApp((prev) => (prev ? { ...prev, photoUrl: cloudUrl } : prev));
      }

      setConfirmedAdmission((prev) =>
        prev ? { ...prev, student: updatedStudent } : prev
      );

      // Register student face descriptor in Face Recognition Engine for Face ID Attendance
      await enrollStudentFromPhotoUrl({
        id: updatedStudent.id,
        schoolId: school.id,
        name: updatedStudent.name,
        rollNo: String(updatedStudent.rollNo || ""),
        classId: updatedStudent.classId,
        className: updatedStudent.className,
        photoUrl: cloudUrl,
      }).catch(() => {});

      toast.success("✅ Student Photo saved & Face ID Attendance enrolled!");

      if (shouldLinkImmediately && onStudentEnrolledAndLink) {
        setAccountLinkedDone(true);
        onStudentEnrolledAndLink(updatedStudent);
      }
    } catch (err: any) {
      toast.error("Photo save karne me error: " + (err?.message || "Retry"));
    } finally {
      setPostPayPhotoSaving(false);
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
    const reasonText = rejectReason.trim() || "Application declined";
    await updateAdmissionStatus(school.id, app.id, "rejected", {
      remarks: reasonText,
      rejectionReason: reasonText,
    });
    setRejectingAppId(null);
    toast.success(`${app.studentName} का आवेदन Reject किया गया। अब यह नया स्क्रीनशॉट व UTR नंबर जोड़कर दोबारा भेजा जा सकता है।`);
    fetchApplications();
  };

  const handleResubmitScreenshotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("स्क्रीनशॉट फ़ाइल 8MB से कम होनी चाहिए।");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setResubmitScreenshot(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleResubmitRejectedApp = async (app: AdmissionApplication) => {
    const utrVal = resubmitUtr.trim();
    if (!resubmitScreenshot && !utrVal) {
      toast.error("दोबारा भेजने के लिए कृपया Payment Screenshot अपलोड करें और/या UTR नंबर दर्ज करें।");
      return;
    }
    setResubmittingRejected(true);
    try {
      const nowIso = new Date().toISOString();
      const nextCount = Number(app.resubmitCount || 0) + 1;
      const selectedCls = classes.find((c) => c.id === app.classId);
      const fees = getClassFees(selectedCls, {
        usesBus: app.usesBus,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount: getAppEntranceDiscountOpt(app),
      });

      await updateAdmissionStatus(school.id, app.id, "pending", {
        paymentScreenshotUrl: resubmitScreenshot || app.paymentScreenshotUrl || undefined,
        transactionRef: utrVal || app.transactionRef || undefined,
        paymentMode: "WhatsApp UPI",
        paymentSubmittedAt: nowIso,
        resubmittedAt: nowIso,
        resubmitCount: nextCount,
        rejectionReason: "",
        remarks: `Resubmitted (#${nextCount}) with Screenshot & UTR: ${utrVal || "Screenshot attached"}${resubmitNote.trim() ? ` • Note: ${resubmitNote.trim()}` : ""}`,
      });

      try {
        await sendSchoolPushNotification({
          schoolId: school.id,
          title: `🔄 Admission Request Resubmitted: ${app.studentName}`,
          body: `${app.studentName} (${app.className}) ne Screenshot aur UTR (${utrVal || "Attached"}) ke saath apna rejected aavedan dubara bheja hai (₹${fees.totalPayable}).`,
          urgent: true,
          type: "FEE_RECEIPT",
        });
      } catch {}

      try {
        const alertItem = {
          id: generateId(),
          schoolId: school.id,
          studentName: app.studentName,
          className: app.className,
          applicationNo: app.applicationNo,
          amount: fees.totalPayable,
          screenshotUrl: resubmitScreenshot || app.paymentScreenshotUrl,
          transactionRef: utrVal,
          timestamp: nowIso,
        };
        const existing = JSON.parse(localStorage.getItem(`school_admission_alerts_${school.id}`) || "[]");
        localStorage.setItem(`school_admission_alerts_${school.id}`, JSON.stringify([alertItem, ...existing]));
        window.dispatchEvent(new CustomEvent("school-admission-alert", { detail: alertItem }));
      } catch {}

      setResubmittingAppId(null);
      setResubmitScreenshot(null);
      setResubmitUtr("");
      setResubmitNote("");
      toast.success(`✅ ${app.studentName} का आवेदन नए Screenshot व UTR के साथ दोबारा (Pending Review में) भेज दिया गया!`);
      fetchApplications();
    } catch (err: any) {
      toast.error("Resubmit करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
    } finally {
      setResubmittingRejected(false);
    }
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

      const feeCalc = getClassFees(selectedCls, {
        usesBus: app.usesBus,
        offer: school?.websiteConfig?.admissionOffer,
        entranceDiscount: getAppEntranceDiscountOpt(app),
      });
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

      const savedQuickStudent = await saveStudent(newStudent);
      const updatedStudents = [savedQuickStudent, ...localStudents.filter((s) => s.id !== studentId)];
      setLocalStudents(school.id, updatedStudents);

      try {
        const safeSlug = (school.code || school.id || "school").toLowerCase().replace(/[^a-z0-9]/g, "") || "school";
        const studentEmail =
          app.email ||
          `${savedQuickStudent.admissionNo.toLowerCase().replace(/[^a-z0-9]/g, "")}@${safeSlug}.edu.in`;
        await saveSchoolUserProfile({
          uid: savedQuickStudent.id,
          schoolId: school.id,
          role: "SCHOOL_STUDENT",
          name: savedQuickStudent.name,
          email: studentEmail,
          studentRef: savedQuickStudent.id,
          classId: targetClsId,
          sessionId: activeSession?.id || "2026-27",
        }).catch(() => {});
        saveUserToLive(
          {
            id: savedQuickStudent.id,
            uid: savedQuickStudent.id,
            displayId: `ROLL-${savedQuickStudent.rollNo}`,
            name: savedQuickStudent.name,
            email: studentEmail,
            mobile: savedQuickStudent.phone,
            role: "STUDENT",
            schoolId: school.id,
            classLevel: targetClsId,
            stream: app.stream || "General",
            credits: 100,
            diamonds: 50,
            streak: 1,
            totalScore: 0,
            profileCompleted: true,
            subscriptionTier: "PRO",
            provider: "qr_student_id",
            isQrLogin: true,
            admissionNo: savedQuickStudent.admissionNo,
            rollNo: savedQuickStudent.rollNo,
            fatherName: savedQuickStudent.fatherName,
            motherName: savedQuickStudent.motherName,
            bloodGroup: savedQuickStudent.bloodGroup,
            monthlyFee: savedQuickStudent.monthlyFee,
          },
          { immediate: true }
        ).catch(() => {});
      } catch {}

      const itemsList = feeCalc.enabledHeads.map((h, i) => ({
        id: `item_${i + 1}`,
        slNo: i + 1,
        description: h.label,
        due: h.originalAmount,
        con: h.discountAmount,
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
        month: paidIso.slice(0, 7),
        year: new Date().getFullYear(),
        amount: totalAmount,
        monthlyAmount: Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0),
        paid: true,
        paidAmount: totalAmount,
        paidDate: paidIso,
        receiptNo,
        concession:
          (feeCalc.offerDiscountTotal || 0) + (feeCalc.entranceDiscountTotal || 0),
        collectedBy: "Admin Online Payment Verification",
        paymentMode: "UPI / Online Screenshot Verified",
        remarks: `Online Payment Verified. Ref: ${app.transactionRef || "Screenshot Verified"}`,
        feeType: "admission",
        receiptCategory: "admission",
        createdAt: paidIso,
        items: itemsList,
      };
      await saveFee(admissionFeeRecord);

      await updateAdmissionStatus(school.id, app.id, "approved", {
        enrolledStudentId: studentId,
        assignedRollNo: assignedRoll,
        assignedSection: selectedCls?.section || "A",
        monthlyFee: Number(selectedCls?.feeStructure?.tuitionFee ?? selectedCls?.defaultFee ?? 0),
        remarks: `Payment Verified & Confirmed by Admin (Roll #${assignedRoll}). Receipt #${receiptNo}`,
        admissionFeeDetails: {
          admissionFee: feeCalc.enabledHeads.find((h) => h.key === "admissionFee")?.originalAmount || 0,
          registrationFee: feeCalc.enabledHeads.find((h) => h.key === "registrationFee")?.originalAmount || 0,
          developmentFee: feeCalc.enabledHeads.find((h) => h.key === "developmentCharge")?.originalAmount || 0,
          idKitFee:
            (feeCalc.enabledHeads.find((h) => h.key === "idCardCharge")?.originalAmount || 0) +
            (feeCalc.enabledHeads.find((h) => h.key === "diaryCharge")?.originalAmount || 0) +
            (feeCalc.enabledHeads.find((h) => h.key === "tieBeltCharge")?.originalAmount || 0),
          examFund: feeCalc.enabledHeads.find((h) => h.key === "examinationFee")?.originalAmount || 0,
          concession: feeCalc.offerDiscountTotal || 0,
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

      try {
        window.dispatchEvent(new CustomEvent("school-admission-alert", { detail: { schoolId: school.id, appId: app.id, status: "approved" } }));
      } catch {}

      setSuccessToast(`🎉 ${app.studentName} का एडमिशन कन्फर्म हो गया! Roll #${assignedRoll} आवंटित हुआ।`);
      setTimeout(() => setSuccessToast(null), 5000);
      setViewScreenshotUrl(null);
      setQuickVerifyConfirmApp(null);
      fetchApplications();
    } catch (err: any) {
      toast.error("एडमिशन कन्फर्म करने में त्रुटि: " + (err?.message || "पुनः प्रयास करें"));
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
      {/* Top Navbar (Hidden when unified public shell renders a single combined header) */}
      {!hideTopNavbar && (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-3 text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 shadow-xs sticky top-0 z-30">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white truncate">
                {viewMode === "fee_setup_only"
                  ? "कक्षा-वार प्रवेश शुल्क एवं हेड सेट-अप (Online Admission Fee Setup)"
                  : !isAdmin
                  ? "अभिभावक ऑनलाइन प्रवेश पोर्टल (Parent Online Admission)"
                  : "Online Admissions & Print Portal"}
              </h1>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block font-bold truncate max-w-[180px]">
              {school.name}
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      <div className={`max-w-6xl mx-auto px-3 sm:px-4 ${hideTopNavbar ? "pt-4" : "mt-3"}`}>
        {/* Mode Tabs: Top 3 options always in ONE single row */}
        {isAdmin && viewMode !== "fee_setup_only" && (
          <div className="space-y-2 mb-4">
            <div className="grid grid-cols-3 gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
              <button
                type="button"
                onClick={() => setActiveTab("applications")}
                className={`w-full px-1.5 sm:px-3 py-2 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 min-w-0 transition cursor-pointer ${
                  activeTab === "applications"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Applications ({applications.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmittedApp(null);
                  setActiveTab("new_form");
                }}
                className={`w-full px-1.5 sm:px-3 py-2 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 min-w-0 transition cursor-pointer ${
                  activeTab === "new_form"
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">New Admission Form</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("enquiry_crm")}
                className={`w-full px-1.5 sm:px-3 py-2 rounded-xl text-[10.5px] sm:text-xs font-black flex items-center justify-center gap-1 min-w-0 transition cursor-pointer ${
                  activeTab === "enquiry_crm"
                    ? "bg-amber-600 text-white shadow"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Enquiry CRM &amp; Seats</span>
              </button>
            </div>
            {/* In admissions_only mode: fee_setup tab is NEVER rendered */}
            {viewMode !== "admissions_only" && (
              <div className="flex flex-wrap gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 w-fit">
                <button
                  type="button"
                  onClick={() => setActiveTab("fee_setup")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "fee_setup"
                      ? "bg-emerald-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" /> Class-Wise Fee &amp; Heads Setup
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("field_settings")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                    activeTab === "field_settings"
                      ? "bg-purple-600 text-white shadow"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-purple-400" /> Form Fields Manager
                </button>
              </div>
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

            {isAdmissionOfferActive(school?.websiteConfig?.admissionOffer) &&
              Number(school?.websiteConfig?.admissionOffer?.discountPercent || 0) > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/70 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold">
                  <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Website Offer Active:{" "}
                    <strong>
                      {school.websiteConfig?.admissionOffer?.title || "Special Admission Offer"} (
                      {school.websiteConfig?.admissionOffer?.discountPercent}% OFF)
                    </strong>{" "}
                    — यह छूट नीचे हर क्लास के एडमिशन पैकेज पर स्वतः लागू दिख रही है।
                  </span>
                </div>
                <span className="text-[11px] font-mono font-black text-amber-800 dark:text-amber-300">
                  Website Manager CMS → Admission Offer
                </span>
              </div>
            )}

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
                      { usesBus: false, offer: school?.websiteConfig?.admissionOffer }
                    );
                    const previewWithBus = getClassFees(
                      { ...cls, feeStructure: draft },
                      { usesBus: true, offer: school?.websiteConfig?.admissionOffer }
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

        {/* 0.4 ADMIN ENQUIRY CRM & SEAT MATRIX */}
        {activeTab === "enquiry_crm" && isAdmin && (
          <AdmissionEnquiryCrm
            school={school}
            classes={classes}
            students={getLocalStudents(school.id)}
            onConvertToAdmission={(prefill) => {
              setSubmittedApp(null);
              setForm((prev) => ({
                ...prev,
                name: prefill.studentName || prev.name,
                fatherName: prefill.parentName || prev.fatherName,
                phone: prefill.phone || prev.phone,
                whatsappNo: prefill.phone || prev.whatsappNo,
                classId: prefill.classId || prev.classId,
              }));
              setActiveTab("new_form");
              toast.success("Enquiry pre-filled into Admission Form!");
            }}
          />
        )}

        {/* 0.5 ADMIN ADMISSION FORM FIELDS MANAGER (SCHOOL ADMIN CUSTOMIZATION) */}
        {activeTab === "field_settings" && isAdmin && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-purple-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/30 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    <span>एडमिशन फॉर्म कस्टमाइज़र</span>
                  </span>
                  <span className="text-xs text-purple-200/80 font-bold">
                    ({Object.values(fieldSettings).filter(Boolean).length} / {Object.keys(fieldSettings).length} फ़ील्ड्स चालू)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">
                  एडमिशन फॉर्म फ़ील्ड मैनेजर (Form Fields Manager)
                </h2>
                <p className="text-xs sm:text-sm text-purple-200 mt-1 max-w-2xl">
                  यहाँ से स्कूल एडमिन चुन सकते हैं कि ऑनलाइन एडमिशन फॉर्म में अभिभावकों और शिक्षकों को कौन-कौन से फ़ील्ड दिखेंगे और कौन-से छिपे रहेंगे। चालू या बंद करने पर बदलाव तुरंत लाइव फॉर्म में दिखेंगे।
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const allOn: AdmissionFormFieldSettings = { ...fieldSettings };
                    (Object.keys(allOn) as (keyof AdmissionFormFieldSettings)[]).forEach((k) => {
                      allOn[k] = true;
                    });
                    handleBulkUpdateFieldSettings(allOn);
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>सभी फ़ील्ड चालू करें</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkUpdateFieldSettings(DEFAULT_ADMISSION_FIELD_SETTINGS)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>डिफ़ॉल्ट सेट करें</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("new_form")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow transition cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>लाइव फॉर्म देखें</span>
                </button>
              </div>
            </div>

            {/* Field Groups Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Group 1: Student Bio-Data Fields */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👤</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      1. छात्र विवरण (Student Bio-Data Fields)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">नाम व कक्षा अनिवार्य हैं</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showAgeOnAprilFirst", label: "1 अप्रैल को आयु (Auto Age as on 1st April)", hint: "DOB से वर्ष, माह और दिन स्वतः गिनेगा", emoji: "📅" },
                    { key: "showSingleChild", label: "इकलौता बच्चा (Single Child Status)", hint: "क्या छात्र माता-पिता की एकमात्र संतान है (हाँ/नहीं)", emoji: "⭐" },
                    { key: "showIdentificationMark", label: "पहचान चिन्ह (Identification Mark)", hint: "चेहरे या शरीर पर तिल, कट या चोट का स्थायी निशान", emoji: "🔍" },
                    { key: "showMotherTongue", label: "मातृभाषा (Mother Tongue)", hint: "हिंदी, भोजपुरी, उर्दू, अंग्रेजी आदि", emoji: "🗣️" },
                    { key: "showApaarId", label: "APAAR / PEN No. (UDISE+ ID)", hint: "शिक्षा मंत्रालय का 11-अंकीय राष्ट्रीय छात्र पहचान क्रमांक", emoji: "🆔" },
                    { key: "showBloodGroup", label: "रक्त समूह (Blood Group)", hint: "A+, B+, O+, AB+ आदि", emoji: "🩸" },
                    { key: "showCategoryCaste", label: "जाति / श्रेणी (Category / Caste)", hint: "General, OBC, SC, ST, EWS", emoji: "🏛️" },
                    { key: "showReligionNationality", label: "धर्म एवं राष्ट्रीयता (Religion & Nationality)", hint: "हिन्दू/मुस्लिम/सिख/ईसाई एवं Indian", emoji: "🕊️" },
                    { key: "showStudentAadhaar", label: "छात्र आधार (Student 12-Digit Aadhaar)", hint: "UIDAI 12-अंकीय आधार संख्या", emoji: "💳" },
                    { key: "showMedicalHistory", label: "स्वास्थ्य एवं एलर्जी विवरण (Medical History)", hint: "दमा, एलर्जी या नियमित दवा संबंधी निर्देश", emoji: "🩺" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 2: Parent & Guardian Fields */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍👩‍👧</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      2. अभिभावक प्रोफाइल (Parent &amp; Family Fields)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">पिता का नाम अनिवार्य है</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showFatherPhone", label: "पिता का मोबाइल नंबर (Father Mobile)", hint: "पिता से सीधे कॉलिंग संपर्क हेतु 10-अंकीय मोबाइल नंबर", emoji: "📞" },
                    { key: "showFatherWhatsapp", label: "पिता का व्हाट्सएप (Father WhatsApp)", hint: "पिता के व्हाट्सएप पर मैसेज व सूचनाएं भेजने हेतु", emoji: "💬" },
                    { key: "showFatherQualification", label: "पिता की शैक्षिक योग्यता (Father Qualification)", hint: "Postgraduate, Graduate, Intermediate, 10th आदि", emoji: "🎓" },
                    { key: "showFatherOccupation", label: "पिता का व्यवसाय (Father Occupation)", hint: "कृषि, व्यापार, सरकारी सेवा, निजी नौकरी आदि", emoji: "💼" },
                    { key: "showFatherAadhaar", label: "पिता का आधार (Father Aadhaar)", hint: "पिता की 12-अंकीय आधार संख्या", emoji: "💳" },
                    { key: "showMotherPhone", label: "माता का मोबाइल नंबर (Mother Mobile)", hint: "माता से सीधे कॉलिंग संपर्क हेतु मोबाइल नंबर", emoji: "📱" },
                    { key: "showMotherWhatsapp", label: "माता का व्हाट्सएप (Mother WhatsApp)", hint: "माता के व्हाट्सएप पर उपस्थिति व गृहकार्य सूचना हेतु", emoji: "💬" },
                    { key: "showMotherQualification", label: "माता की शैक्षिक योग्यता (Mother Qualification)", hint: "Postgraduate, Graduate, 10th, Home Maker आदि", emoji: "📚" },
                    { key: "showMotherOccupation", label: "माता का व्यवसाय (Mother Occupation)", hint: "गृहणी, शिक्षिका, व्यापार, नौकरी आदि", emoji: "👩‍💼" },
                    { key: "showMotherAadhaar", label: "माता का आधार (Mother Aadhaar)", hint: "माता की 12-अंकीय आधार संख्या", emoji: "💳" },
                    { key: "showAnnualIncome", label: "परिवार की वार्षिक आय (Annual Income)", hint: "छात्रवृत्ति एवं सरकारी पोर्टल हेतु वार्षिक आमदनी", emoji: "💰" },
                    { key: "showEmergencyContact", label: "आपातकालीन संपर्क व्यक्ति व फोन (Emergency Contact)", hint: "स्थानीय अभिभावक/रिश्तेदार का नाम, फोन व संबंध", emoji: "🚨" },
                    { key: "showEmergencyWhatsapp", label: "आपातकालीन व्हाट्सएप (Emergency WhatsApp)", hint: "आपातकाल में तुरंत व्हाट्सएप अलर्ट भेजने हेतु", emoji: "🚨" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 3: Previous School & TC Details */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏫</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      3. पूर्व विद्यालय एवं टी.सी. (Previous School &amp; TC)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600">Re-admission / Transfer</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showPreviousSchool", label: "पूर्व विद्यालय का नाम व कक्षा (School Last Attended)", hint: "छात्र पहले किस स्कूल और बोर्ड में पढ़ रहा था", emoji: "🏫" },
                    { key: "showPreviousTcDetails", label: "टी.सी. क्रमांक एवं दिनांक (TC / SLC No. & Date)", hint: "स्थानांतरण प्रमाण पत्र (TC) का क्रमांक और जारी होने की तिथि", emoji: "📜" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 4: Addresses */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📍</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      4. पता विवरण (Address &amp; Correspondence)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">स्थायी पता हमेशा अनिवार्य</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showCorrespondenceAddress", label: "पत्राचार का अलग पता (Correspondence Address)", hint: "यदि छात्र किराए पर रहता है (समान होने पर 'Same' चेकबॉक्स के साथ)", emoji: "📮" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 5: Transport & Commute */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚌</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      5. परिवहन एवं संवेदनशीलता (Transport &amp; Sensitivity)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-amber-600">Bus &amp; Distance</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showTransportModeIfNo", label: "बिना बस आवागमन साधन (Walking / Guardian)", hint: "अगर बस सुविधा नहीं लेते तो पैदल / अभिभावक द्वारा आएंगे", emoji: "🚶" },
                    { key: "showTransportDistance", label: "स्कूल से दूरी - किमी में (Distance from School)", hint: "घर से स्कूल की दूरी (किमी)", emoji: "📏" },
                    { key: "showChildSensitivity", label: "बच्चे की संवेदनशीलता / विशेष देखभाल (Child Sensitivity)", hint: "विशेष स्वास्थ्य संवेदनशीलता (हाँ/नहीं व रिमार्क)", emoji: "💖" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 6: Sibling Profile & Teacher Referrals */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👨‍👧‍👦</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      6. भाई-बहन एवं रेफरल (Siblings &amp; Referrals)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">Discounts &amp; Rewards</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showSiblingTable", label: "स्कूल में पढ़ने वाले भाई-बहन तालिका (Sibling Details)", hint: "नाम, भाई/बहन, कक्षा व रोल नंबर तालिका (Sibling Discount हेतु)", emoji: "👫" },
                    { key: "showTeacherReferral", label: "शिक्षक संदर्भ चयन (Teacher Referral Option)", hint: "एडमिशन किस शिक्षक के माध्यम से हुआ (10% कमीशन ऑटो-ट्रैकिंग)", emoji: "👨‍🏫" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 7: Bank Account Details */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏦</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      7. बैंक खाता विवरण (Bank Details for DBT / Scholarship)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600">पोशाक / छात्रवृत्ति</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showBankDetails", label: "बैंक खाता संख्या, बैंक नाम व IFSC (Bank Details)", hint: "सशर्त छात्रवृत्ति/सरकारी डीबीटी हेतु खाता विवरण", emoji: "🏦" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Group 8: Documents, Payment & Declarations */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📑</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      8. दस्तावेज़, पेमेंट व घोषणा (Documents &amp; Declarations)
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">Final Verification</span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { key: "showRequiredDocuments", label: "आवश्यक दस्तावेज़ अपलोड चेकलिस्ट (Document Checklist)", hint: "जन्म प्रमाण पत्र, आधार, टीसी, फोटो आदि", emoji: "📂" },
                    { key: "showPaymentScreenshot", label: "पेमेंट स्क्रीनशॉट व यू.टी.आर. विवरण (Payment Screenshot)", hint: "ऑनलाइन UPI भुगतान का स्क्रीनशॉट संलग्न करने का विकल्प", emoji: "📷" },
                    { key: "showParentDeclaration", label: "अभिभावक ऑनलाइन घोषणा पत्र (Parent Self-Declaration)", hint: "सत्यता एवं विद्यालय नियमों के पालन हेतु घोषणा चेकबॉक्स", emoji: "✍️" },
                  ].map((f) => (
                    <label
                      key={f.key}
                      className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer select-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                      <div className="flex items-start gap-2.5 pr-2">
                        <span className="text-base shrink-0 mt-0.5">{f.emoji}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                            {f.label}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{f.hint}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(fieldSettings[f.key as keyof AdmissionFormFieldSettings])}
                        onChange={(e) =>
                          handleUpdateFieldSetting(f.key as keyof AdmissionFormFieldSettings, e.target.checked)
                        }
                        className="w-5 h-5 accent-purple-600 rounded cursor-pointer shrink-0"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
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
              <div className="flex gap-1.5 w-full sm:w-auto overflow-x-auto items-center">
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
                <button
                  type="button"
                  onClick={() => fetchApplications()}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0 border border-blue-200 dark:border-blue-800"
                  title="Refresh Applications"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
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
                            {app.resubmittedAt && (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-black flex items-center gap-1 border border-indigo-300 dark:border-indigo-700">
                                <RotateCcw className="w-3 h-3" /> Resubmitted{app.resubmitCount ? ` (#${app.resubmitCount})` : ""}
                              </span>
                            )}
                            {app.entranceTestScorePct !== undefined && (() => {
                              const evalMeta = evaluateEntranceScore(
                                app.entranceTestScorePct,
                                app.className
                              );
                              const appCls = classes.find((c) => c.id === app.classId);
                              const appFees = getClassFees(appCls, {
                                usesBus: app.usesBus,
                                offer: school?.websiteConfig?.admissionOffer,
                                entranceDiscount: {
                                  scorePct: app.entranceTestScorePct,
                                  config: school?.websiteConfig?.entranceDiscountConfig,
                                  cancelled: false,
                                  fixedAmountOverride: app.entranceDiscountAmount,
                                  labelOverride: app.entranceDiscountLabel,
                                },
                              });
                              const tagStyle =
                                evalMeta.tier === "MERIT"
                                  ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700"
                                  : evalMeta.tier === "QUALIFIED"
                                  ? "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700"
                                  : evalMeta.tier === "FOUNDATION_SUPPORT"
                                  ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700"
                                  : "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700";
                              return (
                                <>
                                  <span
                                    className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black inline-flex items-center gap-1 tabular-nums ${tagStyle}`}
                                    title={`${evalMeta.adminTag}: ${evalMeta.adminRuleNote}`}
                                  >
                                    🎓 Entrance: {app.entranceTestTag || evalMeta.adminShortBadge}
                                  </span>
                                  {(appFees.entranceDiscountTotal > 0 || app.entranceDiscountCancelled) && (
                                    <span className="inline-flex items-center gap-1.5">
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums border ${
                                          app.entranceDiscountCancelled
                                            ? "bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-300 line-through"
                                            : "bg-emerald-600 text-white border-emerald-600"
                                        }`}
                                      >
                                        🎁 Merit Off: -₹{appFees.entranceDiscountTotal.toLocaleString("en-IN")}
                                      </span>
                                      {app.status !== "approved" && (
                                        <button
                                          type="button"
                                          onClick={() => void handleToggleAppEntranceDiscount(app)}
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border cursor-pointer ${
                                            app.entranceDiscountCancelled
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                                              : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                                          }`}
                                          title={
                                            app.entranceDiscountCancelled
                                              ? "Entrance Fee Off दोबारा लागू करें"
                                              : "Entrance Fee Off रद्द (Cancel) करें"
                                          }
                                        >
                                          {app.entranceDiscountCancelled ? "Restore Off" : "Cancel Off"}
                                        </button>
                                      )}
                                    </span>
                                  )}
                                </>
                              );
                            })()}
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
                              onClick={() => openEnrollModal(app)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
                              title="आवेदन स्वीकार करें व दाखिला दर्ज करें"
                            >
                              <Check className="w-4 h-4" /> ✅ Accept (Approve &amp; Enroll)
                            </button>
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
                              className="px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm active:scale-95 transition cursor-pointer"
                              title="पेमेंट चेक करके तुरंत दाखिला कन्फर्म करें"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Quick Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRejectingAppId(rejectingAppId === app.id ? null : app.id);
                                setRejectReason(app.rejectionReason || "Criteria / Documents / Payment screenshot incomplete");
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1 shadow-sm cursor-pointer"
                            >
                              <X className="w-4 h-4" /> ❌ Reject
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
                          </>
                        )}

                        {app.status === "rejected" && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                if (resubmittingAppId === app.id) {
                                  setResubmittingAppId(null);
                                } else {
                                  setResubmittingAppId(app.id);
                                  setResubmitScreenshot(app.paymentScreenshotUrl || null);
                                  setResubmitUtr(app.transactionRef || "");
                                  setResubmitNote("");
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                              title="स्क्रीनशॉट व UTR नंबर जोड़कर यह आवेदन दोबारा भेजें"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Resubmit (Screenshot + UTR)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openEnrollModal(app)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
                            >
                              <Check className="w-4 h-4" /> ✅ Accept Now
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

                    {/* Inline Rejection Reason Banner */}
                    {app.status === "rejected" && (app.rejectionReason || app.remarks) && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/70 text-xs text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2 flex-wrap">
                        <span>
                          <strong>Rejection Reason:</strong> {app.rejectionReason || app.remarks}
                        </span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-300">
                          Screenshot व UTR जोड़कर दोबारा भेजा जा सकता है
                        </span>
                      </div>
                    )}

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
                          className="flex-1 px-3 py-1.5 rounded-lg border border-rose-300 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
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

                    {/* Inline Resubmit Rejected Application Bar (Screenshot + UTR) */}
                    {resubmittingAppId === app.id && (
                      <div className="pt-3 border-t border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Rejected आवेदन दोबारा भेजें (Upload Payment Screenshot &amp; UTR Number)</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => setResubmittingAppId(null)}
                            className="p-1 rounded-lg text-slate-500 hover:bg-white/60 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <input
                          type="file"
                          ref={resubmitFileInputRef}
                          accept="image/*"
                          onChange={handleResubmitScreenshotFileChange}
                          className="hidden"
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800">
                            {resubmitScreenshot ? (
                              <img
                                src={resubmitScreenshot}
                                alt="Updated Payment Screenshot"
                                className="w-12 h-12 rounded-lg object-cover border border-indigo-300 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                <Camera className="w-5 h-5" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                {resubmitScreenshot ? "Screenshot Ready" : "Payment Screenshot *"}
                              </p>
                              <button
                                type="button"
                                onClick={() => resubmitFileInputRef.current?.click()}
                                className="mt-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black cursor-pointer"
                              >
                                {resubmitScreenshot ? "Change Screenshot" : "Upload Screenshot"}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                              UTR / Transaction Ref Number *
                            </label>
                            <input
                              type="text"
                              value={resubmitUtr}
                              onChange={(e) => setResubmitUtr(e.target.value)}
                              placeholder="e.g. 512398471923"
                              className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={resubmitNote}
                            onChange={(e) => setResubmitNote(e.target.value)}
                            placeholder="Optional remark / note for admin..."
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <button
                            type="button"
                            disabled={resubmittingRejected}
                            onClick={() => handleResubmitRejectedApp(app)}
                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{resubmittingRejected ? "Resubmitting..." : "दोबारा भेजें (Resubmit Request)"}</span>
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
                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-blue-700 dark:border-blue-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-500/20 border-2 border-amber-600/60 dark:border-amber-400/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-black text-2xl shadow-inner">
                      👨‍👩‍👧
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-600/50 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/30 text-[10px] font-black uppercase tracking-wider">
                          Parent ID Active
                        </span>
                        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-bold">
                          +91 {parentPortalPhone || "Self"}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black mt-1 text-slate-900 dark:text-white">
                        अभिभावक ऑनलाइन आवेदन डैशबोर्ड
                      </h2>
                      <p className="text-xs text-blue-800 dark:text-indigo-200 font-semibold">
                        आपके इस नंबर से कुल <strong className="text-amber-700 dark:text-amber-300">{parentApplications.length}</strong> छात्र आवेदन दर्ज हैं।
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
                      type="text"
                      value={parentPhoneInput}
                      onChange={(e) => setParentPhoneInput(e.target.value)}
                      placeholder="Mobile No. ya App No. (APP-...)"
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono w-48"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parentPhoneInput.trim();
                        if (val.length >= 4) {
                          localStorage.setItem("nsta_parent_portal_phone", val);
                          setParentPortalPhone(val);
                          setParentPhoneInput("");
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      खोजें
                    </button>
                  </div>
                </div>

                {admissionPayError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{admissionPayError}</span>
                  </div>
                )}

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
                              setAdmissionStep(3);
                              setPaymentSubmittedNotice(false);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-black cursor-pointer"
                          >
                            + स्क्रीनशॉट अपलोड करें
                          </button>
                        </div>
                      )}

                      {/* Rejection Notice + Resubmit with Screenshot & UTR */}
                      {app.status === "rejected" && (
                        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs text-rose-800 dark:text-rose-200">
                              <p className="font-black flex items-center gap-1.5">
                                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>अस्वीकृत कारण (Rejection Reason): {app.rejectionReason || app.remarks || "Verification pending / incomplete proof"}</span>
                              </p>
                              <p className="text-[11px] mt-0.5 text-rose-700 dark:text-rose-300">
                                आप नया Payment Screenshot और UTR / Transaction Number जोड़कर इस आवेदन को दोबारा भेज सकते हैं।
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (resubmittingAppId === app.id) {
                                  setResubmittingAppId(null);
                                } else {
                                  setResubmittingAppId(app.id);
                                  setResubmitScreenshot(app.paymentScreenshotUrl || null);
                                  setResubmitUtr(app.transactionRef || "");
                                  setResubmitNote("");
                                }
                              }}
                              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{resubmittingAppId === app.id ? "बंद करें" : "🔄 Screenshot व UTR से दोबारा भेजें"}</span>
                            </button>
                          </div>

                          {resubmittingAppId === app.id && (
                            <div className="pt-3 border-t border-rose-200 dark:border-rose-800 space-y-3">
                              <input
                                type="file"
                                ref={resubmitFileInputRef}
                                accept="image/*"
                                onChange={handleResubmitScreenshotFileChange}
                                className="hidden"
                              />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-800">
                                  {resubmitScreenshot ? (
                                    <img
                                      src={resubmitScreenshot}
                                      alt="Updated Payment Screenshot"
                                      className="w-12 h-12 rounded-lg object-cover border border-rose-300 shrink-0"
                                    />
                                  ) : (
                                    <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                      <Camera className="w-5 h-5" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">
                                      {resubmitScreenshot ? "Screenshot Attached" : "Payment Screenshot *"}
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => resubmitFileInputRef.current?.click()}
                                      className="mt-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black cursor-pointer"
                                    >
                                      {resubmitScreenshot ? "Change Photo" : "Upload Screenshot"}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block mb-1">
                                    UTR / Transaction Ref No. *
                                  </label>
                                  <input
                                    type="text"
                                    value={resubmitUtr}
                                    onChange={(e) => setResubmitUtr(e.target.value)}
                                    placeholder="e.g. 512398471923"
                                    className="w-full px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-900 dark:text-white"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={resubmittingRejected}
                                onClick={() => handleResubmitRejectedApp(app)}
                                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>{resubmittingRejected ? "दोबारा भेजा जा रहा है..." : "✅ Screenshot व UTR के साथ दोबारा आवेदन भेजें (Resubmit)"}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {app.status === "pending" && (
                          <button
                            type="button"
                            disabled={payingAdmissionAppId === app.id}
                            onClick={() => handleOnlineAdmissionRazorpayPay(app)}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-60 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-indigo-600/25 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>
                              {payingAdmissionAppId === app.id
                                ? "Opening Razorpay..."
                                : `💳 Pay ₹${getClassFees(classes.find((c) => c.id === app.classId), { usesBus: app.usesBus, offer: school?.websiteConfig?.admissionOffer, entranceDiscount: getAppEntranceDiscountOpt(app) }).totalPayable} Online (Instant Admission)`}
                            </span>
                          </button>
                        )}

                        {app.status === "approved" && onStudentEnrolledAndLink && (
                          <button
                            type="button"
                            onClick={async () => {
                              const student = await resolveRealStudentRecord(app);
                              if (student.photoUrl) {
                                enrollStudentFromPhotoUrl({
                                  id: student.id,
                                  schoolId: school.id,
                                  name: student.name,
                                  rollNo: String(student.rollNo || ""),
                                  classId: student.classId,
                                  className: student.className,
                                  photoUrl: student.photoUrl,
                                }).catch(() => {});
                              }
                              onStudentEnrolledAndLink(student);
                            }}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            <span>🎓 Student Portal खोलें (Go to Portal)</span>
                          </button>
                        )}

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
                const fees = getClassFees(targetCls, {
                  usesBus: submittedApp.usesBus,
                  offer: school?.websiteConfig?.admissionOffer,
                  entranceDiscount: getAppEntranceDiscountOpt(submittedApp),
                });
                const totalPayable = fees.totalPayable;
                const rawSchoolWa = (school.whatsappNo || "").replace(/\D/g, "");
                const targetWaDigits = rawSchoolWa.length >= 10 && rawSchoolWa !== "0000000000" ? rawSchoolWa : "9835763641";
                const cleanWhatsAppNumber = targetWaDigits.length === 10 ? `91${targetWaDigits}` : targetWaDigits;
                const displayWhatsAppNumber = targetWaDigits.length >= 10 ? targetWaDigits.slice(-10) : "9835763641";

                const whatsappLines = [
                  `*🏛️ ${school.name || "School"}*`,
                  `*📋 ऑनलाइन एडमिशन पेमेंट QR अनुरोध (QR Request)*`,
                  `----------------------------------`,
                  `• *आवेदन संख्या (App No):* ${submittedApp.applicationNo}`,
                  `• *छात्र का नाम (Student Name):* ${submittedApp.studentName}`,
                  `• *कक्षा (Class):* ${submittedApp.className}`,
                  `• *पिता का नाम (Father's Name):* ${submittedApp.fatherName}`,
                  `• *मोबाइल नंबर (Mobile):* ${submittedApp.phone}`,
                  `• *बस सुविधा:* ${submittedApp.usesBus ? `हाँ (${submittedApp.busRoute || "निर्दिष्ट रूट"})` : "नहीं"}`,
                  ``,
                  `*💰 शुल्क विवरण (Fee Breakdown):*`,
                  ...fees.enabledHeads.map((h) =>
                    h.discountAmount > 0
                      ? `• ${h.label}: ~₹${h.originalAmount}~ → ₹${h.amount} (${fees.offerDiscountPercent}% OFF)`
                      : `• ${h.label}: ₹${h.amount}`
                  ),
                  ...(fees.offerDiscountTotal > 0 || fees.entranceDiscountTotal > 0
                    ? [
                        `----------------------------------`,
                        `• *कुल पैकेज मूल्य (Original Total):* ₹${fees.grossTotalPayable}`,
                        ...(fees.offerDiscountTotal > 0
                          ? [`• *🎉 ${fees.offerTitle || "Admission Offer"} (${fees.offerDiscountPercent}% OFF):* -₹${fees.offerDiscountTotal}`]
                          : []),
                        ...(fees.entranceDiscountTotal > 0
                          ? [`• *🎓 Entrance Merit Off (${fees.entranceDiscountBadge || fees.entranceDiscountLabel}):* -₹${fees.entranceDiscountTotal}`]
                          : []),
                      ]
                    : []),
                  `----------------------------------`,
                  `*👉 कुल देय राशि (Total Payable): ₹${totalPayable}*`,
                  `----------------------------------`,
                  `नमस्ते, मैंने स्कूल पोर्टल पर एडमिशन फॉर्म पूरा भर दिया है। कृपया ₹${totalPayable} भुगतान के लिए स्कूल का QR कोड भेजें ताकि मैं पेमेंट करके स्क्रीनशॉट व UTR सबमिट कर सकूँ। धन्यवाद!`,
                ];
                const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(whatsappLines.join("\n"))}`;

                const currentStepIdx: 2 | 3 = paymentSubmittedNotice ? 3 : admissionStep === 3 ? 3 : 2;

                // Auto-jump Celebration Banner when Admin just approved while user was waiting
                if (jumpingToPortalApp && jumpingToPortalApp.id === submittedApp.id) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-10 shadow-xl border-2 border-emerald-400 dark:border-emerald-600 text-center space-y-5">
                      <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner animate-bounce">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>
                      <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 text-xs font-black uppercase tracking-wider">
                        🎉 Admission Approved • Live Portal Active
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        मुबारक हो! एडमिशन कन्फर्म हो गया
                      </h2>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                        <strong>{jumpingToPortalApp.studentName}</strong> ({jumpingToPortalApp.className}) का दाखिला अप्रूव हो गया है। अब आप सीधे इनके असली <strong>Student Portal</strong> पर जा रहे हैं...
                      </p>
                      {onStudentEnrolledAndLink && (
                        <button
                          type="button"
                          onClick={async () => {
                            const st = await resolveRealStudentRecord(jumpingToPortalApp);
                            setJumpingToPortalApp(null);
                            onStudentEnrolledAndLink(st);
                          }}
                          className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black shadow-lg cursor-pointer inline-flex items-center gap-2"
                        >
                          <GraduationCap className="w-5 h-5" />
                          <span>🎓 तुरंत Student Portal खोलें →</span>
                        </button>
                      )}
                    </div>
                  );
                }

                // 30-Min Pending Verification Screen after submitting Screenshot + UTR
                if (paymentSubmittedNotice) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-300 dark:border-amber-700 space-y-6 text-center">
                      <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 shadow-inner">
                        <Clock className="w-12 h-12" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 text-xs font-black uppercase tracking-wider">
                        ⏳ 30 मिनट के अंदर कन्फर्मेशन (Confirm Within 30 Minutes)
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                        पेमेंट स्क्रीनशॉट और UTR सबमिट हो गया!
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
                        आवेदन संख्या: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{submittedApp.applicationNo}</strong> • <strong>{submittedApp.studentName}</strong> ({submittedApp.className})
                        {transactionRef && (
                          <>
                            {" "}• UTR: <strong className="font-mono text-emerald-700 dark:text-emerald-300">{transactionRef}</strong>
                          </>
                        )}
                      </p>

                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-emerald-50/50 to-indigo-50/40 dark:from-amber-950/30 dark:via-slate-900 dark:to-indigo-950/30 border border-amber-200 dark:border-amber-800 text-left text-xs space-y-3 text-slate-700 dark:text-slate-200 max-w-lg mx-auto">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            आपका भुगतान विवरण सफलतापूर्वक दर्ज कर लिया गया है। <strong>30 मिनट के अंदर</strong> स्कूल द्वारा जाँच कर आपका एडमिशन कन्फर्म कर दिया जाएगा।
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>अप्रूव होते ही सीधा Student Portal खुलेगा:</strong> जैसे ही स्कूल एडमिन आपका आवेदन Accept करेंगे, आप इसी स्क्रीन से सीधे छात्र के असली स्टूडेंट पोर्टल पर पहुंच जाएंगे।
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-amber-200/70 dark:border-slate-700 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                          <span>लाइव अप्रूवल जांच सक्रिय है — कृपया प्रतीक्षा करें या नीचे से स्टेटस जांचें।</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const latestApps = await getAdmissionApplications(school.id);
                            setApplications(latestApps);
                            const found = latestApps.find((a) => a.id === submittedApp.id);
                            if (found?.status === "approved" && onStudentEnrolledAndLink) {
                              const st = await resolveRealStudentRecord(found);
                              setPaymentSubmittedNotice(false);
                              onStudentEnrolledAndLink(st);
                            } else {
                              toast.info("अभी पेंडिंग है — 30 मिनट के अंदर एडमिन कन्फर्म कर देंगे।");
                            }
                          }}
                          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition cursor-pointer"
                        >
                          <RefreshCw className="w-4 h-4" /> स्टेटस अभी चेक करें
                        </button>

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
                          <Printer className="w-4 h-4" /> फॉर्म प्रिंट करें (A4)
                        </button>

                        {!isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              setSubmittedApp(null);
                              setPaymentSubmittedNotice(false);
                              setAdmissionStep(1);
                              setParentView("dashboard");
                            }}
                            className="px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 active:scale-95 transition cursor-pointer"
                          >
                            <span>👨‍👩‍👧 मेरे सभी आवेदन देखें</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // If confirmed after direct counter or Razorpay
                if (confirmedAdmission) {
                  return (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-300 dark:border-emerald-700 space-y-6">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
                          <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <span className="px-3.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                          🎉 Admission Confirmed
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                          मुबारक हो! आपका एडमिशन पक्का हो गया
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1">
                          फीस रसीद व छात्र नामांकन रिकॉर्ड सफलतापूर्वक दर्ज हो गया है।
                        </p>
                      </div>

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
                            कक्षा {submittedApp.className} • रोल नंबर आवंटित
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <p className="font-extrabold text-slate-400 uppercase text-[10px] tracking-wider">छात्र व आवेदन विवरण</p>
                            <button
                              type="button"
                              onClick={() => setMaskSensitiveData((prev) => !prev)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition cursor-pointer ${
                                maskSensitiveData
                                  ? "bg-amber-600 text-white border-amber-500"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                              }`}
                              title="मोबाइल, आधार, पिता व माता का नाम 2 अक्षर के बाद xxxx में दिखाएं / पूरा दिखाएं"
                            >
                              {maskSensitiveData ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{maskSensitiveData ? "Mask: ON" : "Mask (xxxx)"}</span>
                            </button>
                          </div>
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
                            <strong className="text-slate-800 dark:text-white">
                              {maskSensitiveData ? maskSensitive2Chars(submittedApp.fatherName, true) : (submittedApp.fatherName || "—")}
                            </strong>
                          </div>
                          {submittedApp.motherName && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Mother's Name:</span>
                              <strong className="text-slate-800 dark:text-white">
                                {maskSensitiveData ? maskSensitive2Chars(submittedApp.motherName, true) : submittedApp.motherName}
                              </strong>
                            </div>
                          )}
                          {submittedApp.phone && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Mobile:</span>
                              <strong className="text-slate-800 dark:text-white font-mono">
                                {maskSensitiveData ? maskSensitive2Chars(submittedApp.phone, true) : submittedApp.phone}
                              </strong>
                            </div>
                          )}
                          {submittedApp.aadhaarNo && (
                            <div className="flex justify-between">
                              <span className="text-slate-500">Aadhaar:</span>
                              <strong className="text-slate-800 dark:text-white font-mono">
                                {maskSensitiveData ? maskSensitive2Chars(submittedApp.aadhaarNo, true) : submittedApp.aadhaarNo}
                              </strong>
                            </div>
                          )}
                        </div>

                        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-2 text-xs">
                          <p className="font-extrabold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider mb-2">जमा शुल्क विवरण</p>
                          <div className="pt-1 flex justify-between text-sm font-black text-emerald-700 dark:text-emerald-300">
                            <span>कुल देय / जमा राशि:</span>
                            <span className="tabular-nums">₹{confirmedAdmission.totalPayable}</span>
                          </div>
                        </div>
                      </div>

                      {!isAdmin && onStudentEnrolledAndLink && (
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => onStudentEnrolledAndLink(confirmedAdmission.student)}
                            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-black inline-flex items-center gap-2 shadow-lg cursor-pointer"
                          >
                            <GraduationCap className="w-5 h-5" />
                            <span>🎓 Student Portal खोलें (Go to Student Portal) →</span>
                          </button>
                        </div>
                      )}

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
                            setAdmissionStep(1);
                            setAdminFormStep(1);
                          }}
                          className="px-5 py-3 rounded-2xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-white text-xs sm:text-sm font-bold active:scale-95 transition cursor-pointer"
                        >
                          नया आवेदन भरें
                        </button>
                      </div>
                    </div>
                  );
                }

                // CLEAN 3-STEP WIZARD: STEP 2 (Fee Breakdown) & STEP 3 (WhatsApp QR 9835763641 + Screenshot/UTR)
                return (
                  <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6">
                    {/* 3-Step Visual Stepper */}
                    <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center text-[11px] font-black">
                      <button
                        type="button"
                        onClick={() => {
                          setAdmissionStep(1);
                        }}
                        className="py-2 px-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">1. फॉर्म ✓</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmissionStep(2)}
                        className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
                          currentStepIdx === 2
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"
                        }`}
                      >
                        <span>{currentStepIdx > 2 ? "2. शुल्क सूची ✓" : "2. शुल्क सूची"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdmissionStep(3)}
                        className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 transition cursor-pointer ${
                          currentStepIdx === 3
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        <span>3. पेमेंट व UTR</span>
                      </button>
                    </div>

                    {/* Header Summary */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div>
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[11px] font-black uppercase">
                          {currentStepIdx === 2 ? "Step 2 / 3 • शुल्क विवरण (Fee Breakdown)" : "Step 3 / 3 • QR पेमेंट व सबमिशन"}
                        </span>
                        <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5">
                          {submittedApp.studentName} — {submittedApp.className}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          App No: <strong className="text-indigo-600 dark:text-indigo-400">{submittedApp.applicationNo}</strong>
                          {submittedApp.usesBus ? ` • 🚌 Bus: ${submittedApp.busRoute || "Yes"}` : " • बिना बस सुविधा"}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] font-bold text-slate-500 block">कुल देय शुल्क</span>
                        <div className="flex sm:justify-end items-baseline gap-2">
                          {(fees.offerDiscountTotal > 0 || fees.entranceDiscountTotal > 0) && (
                            <span className="text-sm font-bold text-slate-400 line-through font-mono tabular-nums">
                              ₹{fees.grossTotalPayable.toLocaleString("en-IN")}
                            </span>
                          )}
                          <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                            ₹{totalPayable.toLocaleString("en-IN")}
                          </span>
                        </div>
                        {fees.offerDiscountTotal > 0 && (
                          <span className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 block">
                            🎉 {fees.offerDiscountPercent}% OFF • Save ₹{fees.offerDiscountTotal.toLocaleString("en-IN")}
                          </span>
                        )}
                        {fees.entranceDiscountTotal > 0 && (
                          <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block">
                            🎓 {fees.entranceDiscountBadge || "Entrance Off"} • Save ₹{fees.entranceDiscountTotal.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>

                    {submittedApp.status === "rejected" && (
                      <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200">
                        <strong>Rejection Reason:</strong> {submittedApp.rejectionReason || submittedApp.remarks || "Incomplete payment proof"} — कृपया नया Payment Screenshot और UTR नंबर जोड़कर दोबारा सबमिट करें।
                      </div>
                    )}

                    {/* STEP 2 VIEW: TRANSPARENT ITEMIZED FEE BREAKDOWN LIST + NEXT BUTTON */}
                    {currentStepIdx === 2 && (
                      <div className="space-y-5">
                        {fees.offerDiscountTotal > 0 && (
                          <div className="rounded-2xl bg-[#070D19] text-white border border-amber-400/50 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
                                {fees.offerBadgeText || `${fees.offerDiscountPercent}% OFF`}
                              </span>
                              <p className="text-sm font-black">
                                {fees.offerTitle || "Special Admission Offer"} — {fees.offerDiscountPercent}% OFF लागू
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 block">आपकी कुल बचत</span>
                              <span className="text-base font-black text-emerald-400 font-mono tabular-nums">
                                -₹{fees.offerDiscountTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        )}

                        {fees.entranceDiscountTotal > 0 && (
                          <div className="rounded-2xl bg-emerald-950 text-white border border-emerald-400/50 px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                                🎓 Entrance Exam Merit Scholarship ({submittedApp.entranceTestScorePct}%)
                              </span>
                              <p className="text-sm font-black">
                                {fees.entranceDiscountLabel || "Entrance Merit Fee Off"} ({fees.entranceDiscountBadge})
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[11px] text-emerald-200 block">मेरिट छूट (Fee Off)</span>
                              <span className="text-base font-black text-amber-300 font-mono tabular-nums">
                                -₹{fees.entranceDiscountTotal.toLocaleString("en-IN")}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="bg-slate-50 dark:bg-slate-900/70 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                              <ReceiptText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                              <span>कहाँ कितना पैसा लग रहा है (Fee Breakdown List)</span>
                            </h3>
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                              {fees.enabledHeads.length} शुल्क मदें
                            </span>
                          </div>

                          <div className="divide-y divide-slate-200 dark:divide-slate-700/80 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {fees.enabledHeads.map((headItem, idx) => (
                              <div
                                key={headItem.key}
                                className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                              >
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 dark:text-white">
                                    {idx + 1}. {headItem.label}
                                  </p>
                                  {headItem.hint && (
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{headItem.hint}</p>
                                  )}
                                  {headItem.discountAmount > 0 && (
                                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                      Offer {fees.offerDiscountPercent}% OFF • -₹{headItem.discountAmount.toLocaleString("en-IN")}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right shrink-0">
                                  {headItem.discountAmount > 0 && (
                                    <span className="block text-[11px] text-slate-400 line-through font-mono tabular-nums">
                                      ₹{headItem.originalAmount.toLocaleString("en-IN")}
                                    </span>
                                  )}
                                  <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-mono tabular-nums">
                                    ₹{headItem.amount.toLocaleString("en-IN")}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {fees.entranceDiscountTotal > 0 && (
                              <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs bg-emerald-50/70 dark:bg-emerald-950/30">
                                <div className="min-w-0">
                                  <p className="font-extrabold text-emerald-800 dark:text-emerald-300">
                                    🎓 {fees.entranceDiscountLabel || "Entrance Merit Off"} ({submittedApp.entranceTestScorePct}% Score)
                                  </p>
                                </div>
                                <span className="text-sm sm:text-base font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                                  -₹{fees.entranceDiscountTotal.toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-emerald-600 text-white rounded-xl shadow-md">
                            <div>
                              <span className="font-black text-sm block">कुल देय शुल्क (Total Payable Amount)</span>
                              <span className="text-[11px] text-emerald-100">
                                {(fees.offerDiscountTotal > 0 || fees.entranceDiscountTotal > 0)
                                  ? `मूल पैकेज ₹${fees.grossTotalPayable.toLocaleString("en-IN")}${
                                      fees.offerDiscountTotal > 0
                                        ? ` − ऑफर छूट ₹${fees.offerDiscountTotal.toLocaleString("en-IN")}`
                                        : ""
                                    }${
                                      fees.entranceDiscountTotal > 0
                                        ? ` − एंट्रेंस मेरिट छूट ₹${fees.entranceDiscountTotal.toLocaleString("en-IN")}`
                                        : ""
                                    }`
                                  : "फॉर्म सबमिट होने के बाद पारदर्शी शुल्क सूची"}
                              </span>
                            </div>
                            <span className="text-2xl font-black font-mono tabular-nums">₹{totalPayable.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              // Go back to Step 1 form keeping draft submittedApp id intact so no duplicate is created
                              setAdmissionStep(1);
                              const draftApp = submittedApp;
                              setSubmittedApp(null);
                              setForm((prev) => ({
                                ...prev,
                                studentName: draftApp.studentName || prev.studentName,
                                classId: draftApp.classId || prev.classId,
                                fatherName: draftApp.fatherName || prev.fatherName,
                                motherName: draftApp.motherName || prev.motherName,
                                phone: draftApp.phone || prev.phone,
                                usesBus: Boolean(draftApp.usesBus),
                                busRoute: draftApp.busRoute || prev.busRoute,
                              }));
                            }}
                            className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap"
                          >
                            ← फॉर्म सुधारें (Edit Step 1)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setAdmissionStep(3);
                              try {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              } catch {}
                            }}
                            className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-[0.99] transition cursor-pointer whitespace-nowrap"
                          >
                            <span>Next: पेमेंट करें (Step 3) →</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* STEP 3 VIEW: WHATSAPP QR REQUEST ON 9835763641 + SCREENSHOT & UTR UPLOAD */}
                    {currentStepIdx === 3 && (
                      <div className="space-y-5">
                        {/* WhatsApp QR Request Card (9835763641) */}
                        <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-slate-900 rounded-2xl p-5 sm:p-6 border-2 border-emerald-400 dark:border-emerald-700 space-y-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-md">
                              <MessageCircle className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
                                Step 3A • पेमेंट QR कोड प्राप्त करें
                              </span>
                              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white mt-0.5">
                                WhatsApp ({displayWhatsAppNumber}) पर QR कोड मांगें और पेमेंट करें
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                                नीचे दिए गए बटन पर क्लिक करते ही WhatsApp नंबर <strong className="font-mono text-emerald-700 dark:text-emerald-400">+91 {displayWhatsAppNumber}</strong> पर ₹{totalPayable} भुगतान का QR कोड मांगने वाला मैसेज तैयार खुलेगा। QR कोड मिलते ही पेमेंट करें।
                              </p>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/70 border border-emerald-200 dark:border-emerald-800 text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                            <span className="font-black text-emerald-800 dark:text-emerald-300 block mb-1">WhatsApp मैसेज प्रीव्यू:</span>
                            "नमस्ते, मैंने स्कूल पोर्टल पर एडमिशन फॉर्म भर दिया है ({submittedApp.studentName} • {submittedApp.className} • App #{submittedApp.applicationNo})। कृपया <strong>₹{totalPayable}</strong> फीस भुगतान के लिए <strong>QR कोड</strong> भेजें।"
                          </div>

                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3.5 px-5 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                          >
                            <MessageCircle className="w-5 h-5 text-white shrink-0" />
                            <span>WhatsApp ({displayWhatsAppNumber}) पर QR कोड मांगें →</span>
                          </a>
                        </div>

                        {/* Step 3B: Screenshot + UTR Upload */}
                        <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl p-5 border-2 border-dashed border-amber-300 dark:border-amber-700 space-y-4">
                          <div className="flex items-start gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                                Step 3B • भुगतान के बाद प्रूफ सबमिट करें
                              </span>
                              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                                पेमेंट स्क्रीनशॉट व UTR नंबर डालकर सबमिट करें
                              </h4>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                सबमिट करते ही <strong>30 मिनट के अंदर</strong> आपका एडमिशन कन्फर्म होगा और अप्रूव होते ही आप सीधे Student Portal पर पहुंच जाएंगे।
                              </p>
                            </div>
                          </div>

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
                                    <span>स्क्रीनशॉट संलग्न हो गया</span>
                                  </p>
                                  <p className="text-[11px] text-slate-500">UTR डालकर सबमिट करें</p>
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
                              <span className="text-xs font-black">पेमेंट स्क्रीनशॉट अपलोड करें (Upload Screenshot)</span>
                              <span className="text-[10px] text-slate-400">JPG, PNG या WebP फ़ाइल (अधिकतम 8MB)</span>
                            </button>
                          )}

                          <div className="text-left">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                              UPI Ref / Transaction UTR No. *
                            </label>
                            <input
                              type="text"
                              value={transactionRef}
                              onChange={(e) => setTransactionRef(e.target.value)}
                              placeholder="e.g. 512398471923 (12-digit UTR Number)"
                              className="w-full px-3.5 py-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
                            />
                          </div>

                          {screenshotError && (
                            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs rounded-xl flex items-center gap-1.5 font-bold">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>{screenshotError}</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={handleSendPaymentScreenshot}
                            disabled={submittingScreenshot}
                            className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-95 transition cursor-pointer"
                          >
                            {submittingScreenshot ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>पेमेंट विवरण सबमिट हो रहा है...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>पेमेंट स्क्रीनशॉट व UTR सबमिट करें</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Optional Instant Razorpay Gateway if School Configured */}
                        {!isAdmin && razorpayCfg?.enabled && (
                          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="text-xs">
                              <p className="font-black text-indigo-900 dark:text-indigo-200">या तुरंत ऑनलाइन पेमेंट करें (Razorpay)</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400">तुरंत Auto-Approve और Student Portal एक्सेस</p>
                            </div>
                            <button
                              type="button"
                              disabled={payingAdmissionAppId === submittedApp.id}
                              onClick={() => handleOnlineAdmissionRazorpayPay(submittedApp)}
                              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>{payingAdmissionAppId === submittedApp.id ? "Opening..." : `Pay ₹${totalPayable} Online`}</span>
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setAdmissionStep(2);
                              try {
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              } catch {}
                            }}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold cursor-pointer"
                          >
                            ← शुल्क सूची देखें (Step 2)
                          </button>

                          <div className="flex flex-wrap gap-2">
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
                              <Printer className="w-4 h-4" /> फॉर्म प्रिंट (A4)
                            </button>

                            {!isAdmin && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSubmittedApp(null);
                                  setAdmissionStep(1);
                                  setParentView("dashboard");
                                }}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black cursor-pointer"
                              >
                                मेरे सभी आवेदन देखें
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            ) : (
              <form
                onSubmit={handleSubmitForm}
                className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6"
              >
                {/* Clean Step Indicator for Step 1 Admission Form */}
                <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center text-[11px] font-black">
                  <div className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 ${(!isAdmin || adminFormStep === 1) ? "bg-indigo-600 text-white shadow-sm" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300"}`}>
                    <span>{isAdmin && adminFormStep === 2 ? "1. फॉर्म ✓" : "1. आवेदन फॉर्म"}</span>
                  </div>
                  <div className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1 ${isAdmin && adminFormStep === 2 ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-slate-400"}`}>
                    <span>2. शुल्क विवरण</span>
                  </div>
                  <div className="py-2 px-2 rounded-xl text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
                    <span>{isAdmin ? "3. दाखिला व रसीद" : "3. पेमेंट व UTR"}</span>
                  </div>
                </div>
                {(!isAdmin || adminFormStep === 1) && (
                  <>
                {/* PARENT QUICK NAVIGATION / LOOKUP BAR */}
                {!isAdmin && (
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950 text-slate-900 dark:text-white p-3.5 sm:p-4 rounded-2xl shadow-sm border-2 border-blue-700 dark:border-blue-500 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-600/50 dark:border-amber-400/40 flex items-center justify-center font-bold shrink-0">
                        👨‍👩‍👧
                      </div>
                      <div>
                        <p className="font-black text-slate-900 dark:text-white text-xs">
                          {parentApplications.length > 0
                            ? `पैरेंट आईडी (+91 ${parentPortalPhone}): ${parentApplications.length} आवेदन दर्ज हैं`
                            : "अभिभावक ऑनलाइन प्रवेश (Parent Admission Portal)"}
                        </p>
                        <p className="text-[11px] text-blue-800 dark:text-indigo-200 font-semibold">
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
                            type="text"
                            value={parentPhoneInput}
                            onChange={(e) => setParentPhoneInput(e.target.value)}
                            placeholder="Mobile ya App No."
                            className="px-2.5 py-1.5 rounded-xl border border-indigo-400/50 bg-slate-800 text-xs text-white placeholder:text-slate-400 font-mono w-36"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = parentPhoneInput.trim();
                              if (val.length >= 4) {
                                localStorage.setItem("nsta_parent_portal_phone", val);
                                setParentPortalPhone(val);
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
                        {!isAdmin || viewMode === "admissions_only"
                          ? `Admission Session ${effectivePublicAdmissionSession} • Official Registration`
                          : `Academic Session ${activeSession?.name || "2026-27"} • Official Registration`}
                      </p>
                    </div>
                  </div>

                  {/* Compact Photo Upload & Live Camera (Icon-Only, No Link Input) */}
                  <div className="flex items-center justify-between gap-3 bg-gradient-to-br from-indigo-50/70 to-slate-50 dark:from-slate-800/80 dark:to-slate-900 px-3 py-2 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative group w-11 h-12 rounded-xl border-2 border-dashed border-indigo-400/80 dark:border-indigo-500/60 overflow-hidden flex items-center justify-center bg-white dark:bg-slate-800 shrink-0 shadow-xs">
                        {form.photoUrl ? (
                          <>
                            <img src={form.photoUrl} alt="Applicant" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setForm((p) => ({ ...p, photoUrl: "" }))}
                              className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                              title="Remove Photo"
                            >
                              <X className="w-3.5 h-3.5 text-rose-300" />
                            </button>
                          </>
                        ) : (
                          <Camera className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">
                          Student Photo
                        </p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          Optional (ऐच्छिक)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraTarget("form");
                          setShowLiveCameraModal(true);
                        }}
                        className="p-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs active:scale-95 transition cursor-pointer"
                        title="Live Camera से फोटो लें"
                        aria-label="Take photo with Live Camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>

                      <DirectUploadButton
                        kind="image"
                        iconOnly
                        showLinkInput={false}
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

                {entrancePrefillBanner && (() => {
                  const hasScore = entrancePrefillBanner.bestScorePct !== undefined;
                  const evalBanner = hasScore
                    ? evaluateEntranceScore(
                        entrancePrefillBanner.bestScorePct,
                        entrancePrefillBanner.classLabel,
                        entrancePrefillBanner.classLevel
                      )
                    : null;
                  const selectedBannerCls =
                    effectiveTargetClasses.find((c) => c.id === form.classId) ||
                    classesList.find((c) => c.id === form.classId) ||
                    classes[0];
                  const previewFees = hasScore
                    ? getClassFees(selectedBannerCls, {
                        usesBus: form.usesBus,
                        offer: school?.websiteConfig?.admissionOffer,
                        entranceDiscount: {
                          scorePct: entrancePrefillBanner.bestScorePct,
                          config: school?.websiteConfig?.entranceDiscountConfig,
                          cancelled: entrancePrefillDiscountCancelled,
                        },
                      })
                    : null;
                  const uncancelledCalc = hasScore
                    ? calculateEntranceScoreDiscount(
                        entrancePrefillBanner.bestScorePct,
                        school?.websiteConfig?.entranceDiscountConfig
                      )
                    : null;
                  const isDirectGreen = evalBanner ? evalBanner.isDirectEligible : true;
                  const displayTargetCls =
                    entrancePrefillBanner.recommendedClassLabel ||
                    evalBanner?.recommendedClassLabel ||
                    entrancePrefillBanner.classLabel;
                  return (
                    <div
                      className={`p-3.5 rounded-xl border text-xs flex items-start sm:items-center justify-between gap-3 ${
                        isDirectGreen
                          ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                          : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            isDirectGreen
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }`}
                        />
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-extrabold">
                            {evalBanner
                              ? evalBanner.parentHeadline
                              : `Entrance Test Pre-filled · ${entrancePrefillBanner.classLabel}`}
                          </div>
                          <div className="opacity-90 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>
                              <strong>{entrancePrefillBanner.studentName}</strong> ({entrancePrefillBanner.phone}) · Exam:{" "}
                              {entrancePrefillBanner.classLabel} → Recommended:{" "}
                              <strong>{displayTargetCls}</strong>
                              {hasScore
                                ? ` · Score: ${entrancePrefillBanner.bestScorePct}%${
                                    isAdmin && evalBanner ? ` (${evalBanner.adminTag})` : ""
                                  }`
                                : ""}
                            </span>
                            {uncancelledCalc?.eligible && (
                              <span
                                className={`px-2 py-0.5 rounded font-black tabular-nums ${
                                  entrancePrefillDiscountCancelled
                                    ? "bg-slate-200 dark:bg-slate-800 text-slate-500 line-through"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                🎁 Fee Off: {uncancelledCalc.displayBadge}
                                {previewFees && previewFees.entranceDiscountTotal > 0
                                  ? ` (-₹${previewFees.entranceDiscountTotal})`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isAdmin && uncancelledCalc?.eligible && (
                          <button
                            type="button"
                            onClick={() => setEntrancePrefillDiscountCancelled((p) => !p)}
                            className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                              entrancePrefillDiscountCancelled
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                            }`}
                          >
                            {entrancePrefillDiscountCancelled ? "Re-apply Off" : "Cancel Off"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            clearEntranceAdmissionPrefill();
                            setEntrancePrefillBanner(null);
                            setEntrancePrefillDiscountCancelled(false);
                          }}
                          className={`font-bold underline shrink-0 cursor-pointer ${
                            isDirectGreen
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-amber-800 dark:text-amber-300"
                          }`}
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* Admission Type Selector & Re-Admission Cascade */}
                <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block">
                        प्रवेश का प्रकार (Admission Type)
                      </span>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        {form.admissionType === "NEW"
                          ? "New Admission (नया प्रवेश)"
                          : "Re-Admission / Promotion (पुनः प्रवेश — पुराना सत्र चुनें)"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, admissionType: "NEW" });
                          setShowAdmissionTypeDrawer(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          form.admissionType === "NEW"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <span>New Admission</span>
                        {form.admissionType === "NEW" && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, admissionType: "READMISSION" });
                          setShowAdmissionTypeDrawer(false);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          form.admissionType === "READMISSION"
                            ? "bg-indigo-600 text-white shadow"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <History className="w-3.5 h-3.5 shrink-0" />
                        <span>Re-Admission</span>
                        {form.admissionType === "READMISSION" && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    </div>
                  </div>

                  {isAdmin && form.admissionType === "READMISSION" && (
                    <div className="rounded-xl border-2 border-indigo-300 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/30 p-3.5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                            <History className="w-4 h-4 text-indigo-600" />
                            पुराना सत्र व कक्षा चुनें — पूरा फॉर्म व पिछला बकाया अपने आप भर जाएगा
                          </h4>
                          <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">
                            1. पिछला सत्र → 2. पुरानी कक्षा → 3. छात्र चुनें → 4. नया / अगला सत्र चुनें
                          </p>
                        </div>
                        {loadingReadmPool && (
                          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-300">
                            डेटा लोड हो रहा है...
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            1. पिछला सत्र (Old Session)
                          </label>
                          <select
                            value={oldSessionId}
                            onChange={(e) => {
                              const newOldId = e.target.value;
                              setOldSessionId(newOldId);
                              setOldClassFilter("all");
                              setOldStudentId("");
                              if (newOldId && targetSessionId === newOldId && availableReadmSessionsList.length > 1) {
                                const oldIdx = availableReadmSessionsList.findIndex((s) => s.id === newOldId);
                                const nextAfter =
                                  oldIdx >= 0 && oldIdx + 1 < availableReadmSessionsList.length
                                    ? availableReadmSessionsList[oldIdx + 1]
                                    : undefined;
                                const other = nextAfter || availableReadmSessionsList.find((s) => s.id !== newOldId);
                                if (other) setTargetSessionId(other.id);
                              }
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="">-- सभी सत्र --</option>
                            {readmSessionsPool.map((s) => {
                              const cnt = readmStudentsPool.filter((st) => st.sessionId === s.id).length;
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({cnt} छात्र)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            2. पुरानी कक्षा (Old Class)
                          </label>
                          <select
                            value={oldClassFilter}
                            onChange={(e) => {
                              setOldClassFilter(e.target.value);
                              setOldStudentId("");
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                          >
                            <option value="all">
                              सभी कक्षाएं ({readmStudentsPool.filter((s) => !oldSessionId || s.sessionId === oldSessionId).length})
                            </option>
                            {oldClassesForSession.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}{c.section ? ` (${c.section})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            3. छात्र चुनें (Student Name) *
                          </label>
                          <select
                            value={oldStudentId}
                            onChange={(e) => {
                              const st = studentsInOldClass.find((x) => x.id === e.target.value);
                              if (st) handlePullReadmStudent(st);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-indigo-300 dark:border-indigo-600 bg-white dark:bg-slate-900 text-xs font-black text-slate-900 dark:text-white"
                          >
                            <option value="">-- छात्र चुनें ({studentsInOldClass.length}) --</option>
                            {studentsInOldClass.map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.name} · {st.className || "Class"} · पिता: {st.fatherName || "—"} (Adm: {st.admissionNo || "—"})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                            4. नया / अगला सत्र (Next Session) *
                          </label>
                          <select
                            value={targetSessionId}
                            onChange={(e) => setTargetSessionId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-xs font-black text-emerald-800 dark:text-emerald-200"
                          >
                            {availableReadmSessionsList.length === 0 && (
                              <option value={activeSession?.id || ""}>
                                {activeSession?.name || "Active Session"}
                              </option>
                            )}
                            {availableReadmSessionsList.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}{s.id === activeSession?.id ? " (Active)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quick search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={oldStudentSearch}
                          onChange={(e) => setOldStudentSearch(e.target.value)}
                          placeholder="या नाम, Adm No, पिता का नाम या मोबाइल लिखकर खोजें..."
                          className="w-full pl-8 pr-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-900 dark:text-slate-100"
                        />
                        {matchingReadmStudents.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {matchingReadmStudents.map((st) => (
                              <button
                                key={st.id}
                                type="button"
                                onClick={() => handlePullReadmStudent(st)}
                                className="w-full text-left px-3 py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs flex items-center justify-between gap-2 cursor-pointer"
                              >
                                <span className="font-bold text-slate-900 dark:text-white truncate">
                                  {st.name} · {st.className || "Class"} (Adm: {st.admissionNo || "—"})
                                </span>
                                <span className="text-[11px] text-slate-500 shrink-0">
                                  पिता: {st.fatherName || "—"}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {pulledOldStudent && (
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-800 p-3.5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs">
                              <span className="font-black text-emerald-700 dark:text-emerald-400">
                                ✓ पूरा फॉर्म भर गया: {pulledOldStudent.name}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 ml-2">
                                ({selectedOldSessionObj?.name || pulledOldStudent.sessionId} · {pulledOldStudent.className || "—"} · Adm: {pulledOldStudent.admissionNo || "—"})
                              </span>
                            </div>
                            {pulledBackLedger && (
                              <button
                                type="button"
                                onClick={() => setShowReadmMonthTable((v) => !v)}
                                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {showReadmMonthTable ? "माह-वार तालिका छुपाएं" : `माह-वार विवरण देखें (${pulledBackLedger.monthTimeline.length} माह)`}
                                {showReadmMonthTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>

                          {pulledBackLedger && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono tabular-nums">
                              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-sans font-bold text-slate-500 block">पिछला कुल बिल</span>
                                <span className="text-sm font-black text-slate-900 dark:text-white">
                                  ₹{pulledBackLedger.totalBilled.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/70 p-2 border border-slate-200 dark:border-slate-700">
                                <span className="text-[10px] font-sans font-bold text-emerald-600 block">पिछला जमा</span>
                                <span className="text-sm font-black text-emerald-600">
                                  ₹{pulledBackLedger.totalPaid.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="rounded-lg bg-amber-50/70 dark:bg-amber-950/30 p-2 border border-amber-200 dark:border-amber-800">
                                <span className="text-[10px] font-sans font-bold text-amber-600 block">असंकलित माह Due</span>
                                <span className="text-sm font-black text-amber-600">
                                  ₹{pulledBackLedger.ungeneratedMonthsDue.toLocaleString("en-IN")}
                                </span>
                              </div>
                              <div className="rounded-lg bg-rose-50/80 dark:bg-rose-950/30 p-2 border border-rose-200 dark:border-rose-800">
                                <span className="text-[10px] font-sans font-bold text-rose-600 block">कुल पिछला बकाया (Back Due)</span>
                                <span className="text-sm font-black text-rose-600">
                                  ₹{pulledBackLedger.totalBackDue.toLocaleString("en-IN")}
                                </span>
                              </div>
                            </div>
                          )}

                          {showReadmMonthTable && pulledBackLedger && (
                            <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
                              <table className="w-full text-left text-[11px] font-mono tabular-nums">
                                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-sans">
                                  <tr>
                                    <th className="py-1.5 px-2.5">माह</th>
                                    <th className="py-1.5 px-2 text-right">अपेक्षित</th>
                                    <th className="py-1.5 px-2 text-right">जमा</th>
                                    <th className="py-1.5 px-2.5 text-right">शेष Due</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                  {pulledBackLedger.monthTimeline.map((row) => (
                                    <tr key={row.monthCode}>
                                      <td className="py-1 px-2.5 font-sans font-bold text-slate-800 dark:text-slate-200">{row.label}</td>
                                      <td className="py-1 px-2 text-right">₹{row.expectedAmount.toLocaleString("en-IN")}</td>
                                      <td className="py-1 px-2 text-right text-emerald-600">₹{row.paidAmount.toLocaleString("en-IN")}</td>
                                      <td className="py-1 px-2.5 text-right font-bold text-rose-600">
                                        {row.dueAmount > 0 ? `₹${row.dueAmount.toLocaleString("en-IN")}` : "₹0"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                  पिछला बकाया (Back Due ₹):
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={carriedBackDueInput}
                                  onChange={(e) => {
                                    setCarriedBackDueInput(e.target.value);
                                    setAdminPaidManual(false);
                                  }}
                                  className="w-28 px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-xs font-mono font-black text-rose-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCarriedBackDueInput("0");
                                    setAdminPaidManual(false);
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-[11px] font-bold text-slate-800 dark:text-slate-100 cursor-pointer"
                                >
                                  Waive ₹0
                                </button>
                                {pulledBackLedger && Number(carriedBackDueInput) !== pulledBackLedger.totalBackDue && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCarriedBackDueInput(String(pulledBackLedger.totalBackDue));
                                      setAdminPaidManual(false);
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                                    title="ऑटो बकाया वापस लाएं"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>

                              {Number(carriedBackDueInput || 0) > 0 && (
                                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={includeBackDueInAdm}
                                    onChange={(e) => {
                                      setIncludeBackDueInAdm(e.target.checked);
                                      setAdminPaidManual(false);
                                    }}
                                    className="w-4 h-4 accent-rose-600"
                                  />
                                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                                    Re-Admission बिल में अभी जोड़ें (+₹{Number(carriedBackDueInput || 0).toLocaleString("en-IN")})
                                  </span>
                                </label>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {includeBackDueInAdm && Number(carriedBackDueInput || 0) > 0
                                ? "पिछला बकाया Step 2 Re-Admission शुल्क में जुड़ जाएगा (आंशिक भुगतान होने पर केवल शेष राशि अगली माह की फीस में आगे बढ़ेगी)।"
                                : "यह बकाया अभी बिल में नहीं जुड़ेगा; अगले सत्र की Fee Slip में Previous Session Due के रूप में दिखेगा।"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                      {(effectiveTargetClasses.length > 0 ? effectiveTargetClasses : classes).length === 0 ? (
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
                          {(effectiveTargetClasses.length > 0 ? effectiveTargetClasses : classes).map((c) => (
                            <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                              {formatClassLabel(c)}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Senior Secondary Stream Selection for Class 11 & 12 */}
                    {(() => {
                      const curCls =
                        effectiveTargetClasses.find((c) => c.id === form.classId) ||
                        classes.find((c) => c.id === form.classId) ||
                        readmClassesPool.find((c) => c.id === form.classId) ||
                        classes[0];
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
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                        Date of Birth * (जन्म तिथि)
                      </label>
                      <input
                        type="date"
                        required
                        value={form.dateOfBirth}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Auto-calculated Age on 1st April */}
                    {fieldSettings.showAgeOnAprilFirst && ageOnApril1 && (
                      <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-indigo-950 dark:text-indigo-200">
                          <span>🎂</span>
                          <span>1 अप्रैल को आयु (Age as on 1st April):</span>
                        </div>
                        <span className="font-black font-mono px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] shadow-xs">
                          {ageOnApril1.years} वर्ष, {ageOnApril1.months} माह, {ageOnApril1.days} दिन
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Gender (लिंग)
                        </label>
                        <select
                          value={form.gender}
                          onChange={(e) => setForm({ ...form, gender: e.target.value as any })}
                          className="w-full px-2.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="male" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Male (पुरुष)</option>
                          <option value="female" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Female (महिला)</option>
                          <option value="other" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Other (अन्य)</option>
                        </select>
                      </div>

                      {fieldSettings.showBloodGroup && (
                        <div>
                          <label className="block text-xs font-bold text-rose-600 mb-1">
                            Blood Group
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
                      )}

                      {fieldSettings.showCategory && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Caste Category (जाति)
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
                      )}
                    </div>

                    {/* Single Child of Parents */}
                    {fieldSettings.showSingleChild && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Single Child Status (क्या छात्र माता-पिता की इकलौती संतान है?)
                          </p>
                          <p className="text-[10px] text-slate-500">Only child of parents (Yes / No)</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <input
                              type="radio"
                              name="isSingleChild"
                              checked={form.isSingleChild === true}
                              onChange={() => setForm({ ...form, isSingleChild: true })}
                              className="w-3.5 h-3.5 accent-indigo-600"
                            />
                            <span>हाँ (Yes)</span>
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <input
                              type="radio"
                              name="isSingleChild"
                              checked={form.isSingleChild === false}
                              onChange={() => setForm({ ...form, isSingleChild: false })}
                              className="w-3.5 h-3.5 accent-indigo-600"
                            />
                            <span>नहीं (No)</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Religion & Nationality */}
                    {(fieldSettings.showReligion || fieldSettings.showNationality) && (
                      <div className="grid grid-cols-2 gap-2">
                        {fieldSettings.showReligion && (
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Religion (धर्म)
                            </label>
                            <select
                              value={["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain"].includes(form.religion) ? form.religion : "Other"}
                              onChange={(e) => setForm({ ...form, religion: e.target.value === "Other" ? "Other" : e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="Hindu">Hindu (हिंदू)</option>
                              <option value="Muslim">Muslim (मुस्लिम)</option>
                              <option value="Sikh">Sikh (सिख)</option>
                              <option value="Christian">Christian (ईसाई)</option>
                              <option value="Buddhist">Buddhist (बौद्ध)</option>
                              <option value="Jain">Jain (जैन)</option>
                              <option value="Other">Other (अन्य)</option>
                            </select>
                            {!["Hindu", "Muslim", "Sikh", "Christian", "Buddhist", "Jain"].includes(form.religion) && (
                              <input
                                type="text"
                                value={form.religion === "Other" ? "" : form.religion}
                                onChange={(e) => setForm({ ...form, religion: e.target.value || "Other" })}
                                placeholder="अन्य धर्म लिखें (Optional)"
                                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        )}
                        {fieldSettings.showNationality && (
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
                        )}
                      </div>
                    )}

                    {/* Mother Tongue & Identification Mark */}
                    {(fieldSettings.showMotherTongue || fieldSettings.showIdentificationMark) && (
                      <div className="grid sm:grid-cols-2 gap-2">
                        {fieldSettings.showMotherTongue && (
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Mother Tongue (मातृभाषा)
                            </label>
                            <input
                              type="text"
                              value={form.motherTongue}
                              onChange={(e) => setForm({ ...form, motherTongue: e.target.value })}
                              placeholder="e.g. Hindi / Bhojpuri"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                        {fieldSettings.showIdentificationMark && (
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Identification Mark (पहचान चिन्ह)
                            </label>
                            <input
                              type="text"
                              value={form.identificationMark}
                              onChange={(e) => setForm({ ...form, identificationMark: e.target.value })}
                              placeholder="e.g. Mole on right cheek"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Student Aadhaar */}
                    {fieldSettings.showStudentAadhaar && (
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
                    )}

                    {/* APAAR / PEN ID */}
                    {fieldSettings.showApaarPenId && (
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          APAAR / PEN ID (भारत सरकार स्थायी शिक्षा संख्या)
                        </label>
                        <input
                          type="text"
                          value={form.apaarId}
                          onChange={(e) => setForm({ ...form, apaarId: e.target.value })}
                          placeholder="12-digit APAAR or 11-digit PEN ID"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    )}

                    {/* Medical History */}
                    {fieldSettings.showMedicalHistory && (
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
                    )}
                  </div>
                </div>

                {/* 2. Parent & Contact Details */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                    2. Parent &amp; Family Profile (माता-पिता का विवरण)
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Father's Info */}
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                        पिता का विवरण (Father's Profile)
                      </p>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Father's Name * (पिता का नाम)
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

                      {fieldSettings.showFatherQualification && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Educational Qualification (शैक्षणिक योग्यता)
                          </label>
                          <input
                            type="text"
                            value={form.fatherQualification}
                            onChange={(e) => setForm({ ...form, fatherQualification: e.target.value })}
                            placeholder="e.g. Graduate / 12th / Post Graduate"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {(fieldSettings.showFatherOccupation || fieldSettings.showFatherAadhaar) && (
                        <div className="grid grid-cols-2 gap-2">
                          {fieldSettings.showFatherOccupation && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Occupation (व्यवसाय)
                              </label>
                              <input
                                type="text"
                                value={form.fatherOccupation}
                                onChange={(e) => setForm({ ...form, fatherOccupation: e.target.value })}
                                placeholder="e.g. Business / Service"
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                          {fieldSettings.showFatherAadhaar && (
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Father Aadhaar
                              </label>
                              <input
                                type="text"
                                maxLength={14}
                                value={form.fatherAadhaar}
                                onChange={(e) => setForm({ ...form, fatherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                                placeholder="Aadhaar No."
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Father Mobile and Father WhatsApp */}
                      {(fieldSettings.showFatherPhone || fieldSettings.showFatherWhatsapp) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          {fieldSettings.showFatherPhone && (
                            <div>
                              <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1">
                                📞 Father Mobile (पिता का मोबाइल नंबर)
                              </label>
                              <input
                                type="tel"
                                maxLength={10}
                                value={form.fatherPhone}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                                  setForm((prev) => ({
                                    ...prev,
                                    fatherPhone: val,
                                    phone: !prev.phone || prev.phone === prev.fatherPhone ? val : prev.phone,
                                  }));
                                }}
                                placeholder="10-digit Mobile Number"
                                className="w-full px-3 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          )}

                          {fieldSettings.showFatherWhatsapp && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  💬 Father WhatsApp (पिता का व्हाट्सएप)
                                </label>
                                {form.fatherPhone && form.fatherWhatsapp !== form.fatherPhone && (
                                  <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, fatherWhatsapp: prev.fatherPhone }))}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    Same as Mobile
                                  </button>
                                )}
                              </div>
                              <input
                                type="tel"
                                maxLength={10}
                                value={form.fatherWhatsapp}
                                onChange={(e) => setForm({ ...form, fatherWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                placeholder="WhatsApp Number"
                                className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Mother's Info */}
                    <div className="space-y-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                      <p className="text-xs font-black text-pink-700 dark:text-pink-300 uppercase tracking-wider">
                        माता का विवरण (Mother's Profile)
                      </p>
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Mother's Name (माता का नाम)
                        </label>
                        <input
                          type="text"
                          value={form.motherName}
                          onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                          placeholder="Mother's Full Name"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      {fieldSettings.showMotherQualification && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Educational Qualification (शैक्षणिक योग्यता)
                          </label>
                          <input
                            type="text"
                            value={form.motherQualification}
                            onChange={(e) => setForm({ ...form, motherQualification: e.target.value })}
                            placeholder="e.g. 10th / Graduate / Housewife"
                            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {fieldSettings.showMotherOccupation && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Occupation (व्यवसाय)
                            </label>
                            <input
                              type="text"
                              value={form.motherOccupation}
                              onChange={(e) => setForm({ ...form, motherOccupation: e.target.value })}
                              placeholder="Housewife / Teacher"
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                        {fieldSettings.showMotherAadhaar && (
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                              Mother's Aadhaar (वैकल्पिक)
                            </label>
                            <input
                              type="text"
                              maxLength={14}
                              value={form.motherAadhaar}
                              onChange={(e) => setForm({ ...form, motherAadhaar: e.target.value.replace(/[^\d\s]/g, "") })}
                              placeholder="Aadhaar No."
                              className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Mother Mobile and Mother WhatsApp */}
                      {(fieldSettings.showMotherPhone || fieldSettings.showMotherWhatsapp) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                          {fieldSettings.showMotherPhone && (
                            <div>
                              <label className="block text-[11px] font-bold text-pink-700 dark:text-pink-300 mb-1">
                                📱 Mother Mobile (माता का मोबाइल नंबर)
                              </label>
                              <input
                                type="tel"
                                maxLength={10}
                                value={form.motherPhone}
                                onChange={(e) => setForm({ ...form, motherPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                placeholder="10-digit Mobile Number"
                                className="w-full px-3 py-2 rounded-xl border border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
                              />
                            </div>
                          )}

                          {fieldSettings.showMotherWhatsapp && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                                  💬 Mother WhatsApp (माता का व्हाट्सएप)
                                </label>
                                {form.motherPhone && form.motherWhatsapp !== form.motherPhone && (
                                  <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, motherWhatsapp: prev.motherPhone }))}
                                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                                  >
                                    Same as Mobile
                                  </button>
                                )}
                              </div>
                              <input
                                type="tel"
                                maxLength={10}
                                value={form.motherWhatsapp}
                                onChange={(e) => setForm({ ...form, motherWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                placeholder="WhatsApp Number"
                                className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Primary Contact Numbers */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                          Primary Contact Mobile * (मुख्य मोबाइल नंबर)
                        </label>
                        <div className="flex items-center gap-1.5">
                          {form.fatherPhone && form.phone !== form.fatherPhone && (
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, phone: prev.fatherPhone }))}
                              className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                            >
                              पिता का नंबर
                            </button>
                          )}
                          {form.motherPhone && form.phone !== form.motherPhone && (
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, phone: prev.motherPhone }))}
                              className="text-[10px] font-bold text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                            >
                              माता का नंबर
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        placeholder="10-digit Mobile Number"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                            WhatsApp No. (व्हाट्सएप नंबर)
                          </label>
                          {form.phone && form.whatsappNo !== form.phone && (
                            <button
                              type="button"
                              onClick={() => setForm((prev) => ({ ...prev, whatsappNo: prev.phone }))}
                              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                            >
                              Same as Mobile
                            </button>
                          )}
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          value={form.whatsappNo}
                          onChange={(e) => setForm({ ...form, whatsappNo: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                          placeholder="WhatsApp"
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      {fieldSettings.showAnnualIncome && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Annual Income (वार्षिक आय)
                          </label>
                          <input
                            type="text"
                            value={form.annualIncome}
                            onChange={(e) => setForm({ ...form, annualIncome: e.target.value })}
                            placeholder="e.g. ₹1,50,000 / year"
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Emergency Contact Section */}
                    {fieldSettings.showEmergencyContact && (
                      <div className="sm:col-span-2 p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <span>🚨</span>
                            <span>आपातकालीन संपर्क विवरण (Emergency Contact Details)</span>
                          </p>
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">अभिभावक अनुपलब्ध होने पर</span>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          <div>
                            <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                              Emergency Person (संपर्क व्यक्ति)
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
                            <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                              Emergency Mobile (मोबाइल नंबर)
                            </label>
                            <input
                              type="tel"
                              maxLength={10}
                              value={form.emergencyPhone}
                              onChange={(e) => setForm({ ...form, emergencyPhone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                              placeholder="10-digit Mobile"
                              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-200 mb-1">
                              Relation (विद्यार्थी से संबंध)
                            </label>
                            <input
                              type="text"
                              value={form.emergencyRelation}
                              onChange={(e) => setForm({ ...form, emergencyRelation: e.target.value })}
                              placeholder="e.g. Uncle / Grandfather"
                              className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                                💬 WhatsApp Number
                              </label>
                              {form.emergencyPhone && form.emergencyWhatsapp !== form.emergencyPhone && (
                                <button
                                  type="button"
                                  onClick={() => setForm((prev) => ({ ...prev, emergencyWhatsapp: prev.emergencyPhone }))}
                                  className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                                >
                                  Same as Mobile
                                </button>
                              )}
                            </div>
                            <input
                              type="tel"
                              maxLength={10}
                              value={form.emergencyWhatsapp}
                              onChange={(e) => setForm({ ...form, emergencyWhatsapp: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                              placeholder="Emergency WhatsApp"
                              className="w-full px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Permanent Address */}
                    <div className="sm:col-span-2 grid sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Permanent Address * (स्थायी पता)
                        </label>
                        <input
                          type="text"
                          required
                          value={form.address}
                          onChange={(e) => setForm({ ...form, address: e.target.value })}
                          placeholder="Village / Ward / Street / Landmark"
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
                          placeholder="e.g. Saran / Chapra"
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

                    {/* Correspondence Address */}
                    {fieldSettings.showCorrespondenceAddress && (
                      <div className="sm:col-span-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                            Correspondence Address (पत्राचार का पता)
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400 select-none">
                            <input
                              type="checkbox"
                              checked={form.isSameAddress}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  isSameAddress: e.target.checked,
                                  correspondenceAddress: e.target.checked ? form.address : form.correspondenceAddress,
                                })
                              }
                              className="w-4 h-4 accent-indigo-600 rounded"
                            />
                            <span>स्थायी पते के समान (Same as Permanent)</span>
                          </label>
                        </div>
                        {!form.isSameAddress && (
                          <input
                            type="text"
                            value={form.correspondenceAddress}
                            onChange={(e) => setForm({ ...form, correspondenceAddress: e.target.value })}
                            placeholder="Enter present communication address if different"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Previous School & TC Details */}
                {(fieldSettings.showPreviousSchool || fieldSettings.showPreviousTcDetails) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
                      3. Previous School &amp; TC Details (पूर्व विद्यालय विवरण)
                    </h3>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {fieldSettings.showPreviousSchool && (
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Name of School Last Attended (पूर्व विद्यालय का नाम)
                          </label>
                          <input
                            type="text"
                            value={form.previousSchool}
                            onChange={(e) => setForm({ ...form, previousSchool: e.target.value })}
                            placeholder="e.g. Govt Middle School"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      )}

                      {fieldSettings.showPreviousSchool && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Last Class Passed
                            </label>
                            <input
                              type="text"
                              value={form.previousClass}
                              onChange={(e) => setForm({ ...form, previousClass: e.target.value })}
                              placeholder="e.g. Class 5"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Board / Council
                            </label>
                            <input
                              type="text"
                              value={form.previousBoard}
                              onChange={(e) => setForm({ ...form, previousBoard: e.target.value })}
                              placeholder="e.g. BSEB / CBSE"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {fieldSettings.showPreviousTcDetails && (
                        <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              Transfer Certificate (TC / SLC) No.
                            </label>
                            <input
                              type="text"
                              value={form.previousTcNo}
                              onChange={(e) => setForm({ ...form, previousTcNo: e.target.value })}
                              placeholder="TC Serial Number"
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                              TC Issue Date
                            </label>
                            <input
                              type="date"
                              value={form.previousTcDate}
                              onChange={(e) => setForm({ ...form, previousTcDate: e.target.value })}
                              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Transport & Child Sensitivity */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    4. Transport &amp; Child Sensitivity (परिवहन एवं संवेदनशीलता)
                  </h3>

                  <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-3">
                    {getClassFees(
                      effectiveTargetClasses.find((c) => c.id === form.classId) ||
                        classes.find((c) => c.id === form.classId) ||
                        readmClassesPool.find((c) => c.id === form.classId) ||
                        classes[0]
                    ).busAvailable && (
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
                            Want to avail School Bus / Transport Facility (स्कूल वाहन सुविधा चाहिए)
                          </span>
                        </label>
                        {form.usesBus && (
                          <div className="flex flex-wrap items-center gap-2">
                            {configuredRoutes.length > 0 && (
                              <select
                                value={configuredRoutes.some((r) => r.routeName === form.busRoute) ? form.busRoute : "__custom__"}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setForm({ ...form, busRoute: val === "__custom__" ? "" : val });
                                }}
                                className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold sm:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              >
                                <option value="__custom__">-- Select Configured Route / Custom --</option>
                                {configuredRoutes.map((r) => (
                                  <option key={r.id} value={r.routeName}>
                                    {r.routeName} {r.busNumber ? `(${r.busNumber})` : ""}
                                  </option>
                                ))}
                              </select>
                            )}
                            {(!configuredRoutes.length || !configuredRoutes.some((r) => r.routeName === form.busRoute)) && (
                              <input
                                type="text"
                                value={form.busRoute}
                                onChange={(e) => setForm({ ...form, busRoute: e.target.value })}
                                placeholder="Specify Location / Stop (e.g. Main Market Stop)"
                                className="px-3.5 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-semibold sm:w-64 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* If Bus not availed: Walking / Guardian / Self */}
                    {!form.usesBus && fieldSettings.showTransportModeIfNo && (
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 pt-1">
                        <span className="text-slate-500">यदि वाहन नहीं चाहिए तो कैसे आएंगे:</span>
                        {(["Walking", "Guardian", "Self"] as const).map((mode) => (
                          <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="radio"
                              name="transportModeIfNo"
                              value={mode}
                              checked={form.transportModeIfNo === mode}
                              onChange={(e) => setForm({ ...form, transportModeIfNo: e.target.value as any })}
                              className="w-3.5 h-3.5 accent-amber-600"
                            />
                            <span>{mode === "Walking" ? "पैदल (Walking)" : mode === "Guardian" ? "अभिभावक साथ (Guardian)" : "स्वयं साधन (Self)"}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Distance from School in KM */}
                    {fieldSettings.showTransportDistance && (
                      <div className="w-full sm:w-72 pt-1">
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                          Distance from School in Km (स्कूल से दूरी किमी में)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={form.transportDistanceKm}
                          onChange={(e) => setForm({ ...form, transportDistanceKm: e.target.value })}
                          placeholder="e.g. 1.5 Km"
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}

                    {/* Child Sensitivity (Yes/No) + Remarks */}
                    {fieldSettings.showChildSensitivity && (
                      <div className="pt-2 border-t border-amber-200 dark:border-amber-900/30 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Sensitivity about Child (क्या बच्चे को कोई विशेष शारीरिक/मानसिक संवेदनशीलता या देखभाल की आवश्यकता है?)
                          </p>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="radio"
                                name="hasChildSensitivity"
                                checked={form.hasChildSensitivity === true}
                                onChange={() => setForm({ ...form, hasChildSensitivity: true })}
                                className="w-3.5 h-3.5 accent-rose-600"
                              />
                              <span>हाँ (Yes)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                              <input
                                type="radio"
                                name="hasChildSensitivity"
                                checked={form.hasChildSensitivity === false}
                                onChange={() => setForm({ ...form, hasChildSensitivity: false })}
                                className="w-3.5 h-3.5 accent-rose-600"
                              />
                              <span>नहीं (No)</span>
                            </label>
                          </div>
                        </div>
                        {form.hasChildSensitivity && (
                          <input
                            type="text"
                            value={form.childSensitivityRemarks}
                            onChange={(e) => setForm({ ...form, childSensitivityRemarks: e.target.value })}
                            placeholder="यदि हाँ, तो विवरण दें (Specify medical condition, allergy, or special care notes)"
                            className="w-full px-3.5 py-2 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Sibling Profile Table (If studying in school) */}
                  {fieldSettings.showSiblingTable && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-black text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                            Sibling Profile (यदि सगे भाई / बहन इस विद्यालय में पढ़ते हैं)
                          </p>
                          <p className="text-[10px] text-slate-500">Brothers / Sisters currently studying in this school</p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              siblingDetails: [
                                ...(form.siblingDetails || []),
                                { name: "", relation: "Brother", className: "", rollNo: "" },
                              ],
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer"
                        >
                          + भाई / बहन जोड़ें
                        </button>
                      </div>

                      {form.siblingDetails && form.siblingDetails.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300">
                              <tr>
                                <th className="p-2 w-10 text-center">क्र.</th>
                                <th className="p-2">Name (नाम)</th>
                                <th className="p-2 w-28">Brother / Sister</th>
                                <th className="p-2 w-24">Class (कक्षा)</th>
                                <th className="p-2 w-24">Roll / Adm No.</th>
                                <th className="p-2 w-10 text-center">हटाएं</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                              {form.siblingDetails.map((sib, sIdx) => (
                                <tr key={sIdx}>
                                  <td className="p-2 text-center font-bold text-slate-400">{sIdx + 1}</td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={sib.name}
                                      onChange={(e) => {
                                        const updated = [...form.siblingDetails!];
                                        updated[sIdx].name = e.target.value;
                                        setForm({ ...form, siblingDetails: updated });
                                      }}
                                      placeholder="Sibling's Name"
                                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <select
                                      value={sib.relation}
                                      onChange={(e) => {
                                        const updated = [...form.siblingDetails!];
                                        updated[sIdx].relation = e.target.value as any;
                                        setForm({ ...form, siblingDetails: updated });
                                      }}
                                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                    >
                                      <option value="Brother">Brother (भाई)</option>
                                      <option value="Sister">Sister (बहन)</option>
                                    </select>
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={sib.className}
                                      onChange={(e) => {
                                        const updated = [...form.siblingDetails!];
                                        updated[sIdx].className = e.target.value;
                                        setForm({ ...form, siblingDetails: updated });
                                      }}
                                      placeholder="Class"
                                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                    />
                                  </td>
                                  <td className="p-1.5">
                                    <input
                                      type="text"
                                      value={sib.rollNo || ""}
                                      onChange={(e) => {
                                        const updated = [...form.siblingDetails!];
                                        updated[sIdx].rollNo = e.target.value;
                                        setForm({ ...form, siblingDetails: updated });
                                      }}
                                      placeholder="Roll / Adm"
                                      className="w-full px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                    />
                                  </td>
                                  <td className="p-1.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = form.siblingDetails!.filter((_, i) => i !== sIdx);
                                        setForm({ ...form, siblingDetails: updated });
                                      }}
                                      className="text-rose-600 hover:text-rose-800 p-1 font-bold text-sm cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          वर्तमान में कोई सहोदर (भाई/बहन) विद्यालय में नामांकित नहीं है (यदि है तो ऊपर "+ भाई / बहन जोड़ें" बटन दबाएं)।
                        </p>
                      )}
                    </div>
                  )}

                  {/* 6. Bank Account Details (DBT / Scholarship) */}
                  {fieldSettings.showBankDetails && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
                      <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                        बैंक खाता विवरण (Bank Details for DBT / Scholarship)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            खाताधारक नाम (Account Name)
                          </label>
                          <input
                            type="text"
                            value={form.bankAccountName}
                            onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                            placeholder="Student / Parent Name"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            बैंक का नाम (Bank Name)
                          </label>
                          <input
                            type="text"
                            value={form.bankName}
                            onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                            placeholder="e.g. SBI / PNB"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            खाता संख्या (A/C No)
                          </label>
                          <input
                            type="text"
                            value={form.bankAccountNumber}
                            onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                            placeholder="Account Number"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                            IFSC कोड
                          </label>
                          <input
                            type="text"
                            value={form.bankIfsc}
                            onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                            placeholder="e.g. SBIN0001234"
                            className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono font-semibold"
                          />
                        </div>
                      </div>
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

                </div>

                {/* PARENT / GUARDIAN SELF-DECLARATION (अभिभावक घोषणा पत्र) */}
                {fieldSettings.showParentDeclaration && (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        required={!isAdmin}
                        checked={form.parentDeclarationAccepted}
                        onChange={(e) => setForm({ ...form, parentDeclarationAccepted: e.target.checked })}
                        className="w-4 h-4 mt-0.5 accent-indigo-600 rounded shrink-0 cursor-pointer"
                      />
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-900 dark:text-white">
                          अभिभावक स्व-घोषणा (Parent / Guardian Self-Declaration) *
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          "मैं प्रमाणित करता/करती हूँ कि ऊपर दी गई सभी जानकारियाँ मेरी जानकारी के अनुसार सत्य व सही हैं और कोई भी तथ्य छिपाया नहीं गया है। मैं एवं मेरा पाल्य विद्यालय के सभी नियमों, अनुशासन और शुल्क नीतियों का निष्ठापूर्वक पालन करेंगे।"
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.studentName.trim() || !form.fatherName.trim() || !form.phone.trim()) {
                        setFormError("कृपया छात्र का नाम, पिता का नाम और मोबाइल नंबर अवश्य भरें।");
                        return;
                      }
                      setFormError(null);
                      setAdminFormStep(2);
                      try {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } catch {}
                    }}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Next: शुल्क विवरण व नामांकन देखें (Step 2) →</span>
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? "फॉर्म सबमिट हो रहा है..." : "Next: शुल्क विवरण देखें (Step 2) →"}</span>
                  </button>
                )}
                  </>
                )}

                {/* ADMIN STEP 2: TRANSPARENT FEE BREAKDOWN + OFFLINE COUNTER COLLECTION */}
                {isAdmin && adminFormStep === 2 && (
                  <div className="space-y-5">
                    {(() => {
                      const curCls =
                        effectiveTargetClasses.find((c) => c.id === form.classId) ||
                        classes.find((c) => c.id === form.classId) ||
                        readmClassesPool.find((c) => c.id === form.classId) ||
                        classes[0];
                      const fees = getClassFees(curCls, {
                        usesBus: form.usesBus,
                        offer: school?.websiteConfig?.admissionOffer,
                        entranceDiscount:
                          entrancePrefillBanner?.bestScorePct !== undefined
                            ? {
                                scorePct: entrancePrefillBanner.bestScorePct,
                                config: school?.websiteConfig?.entranceDiscountConfig,
                                cancelled: entrancePrefillDiscountCancelled,
                              }
                            : undefined,
                      });
                      const backDueAmt = form.admissionType === "READMISSION" ? Math.max(0, Number(carriedBackDueInput || 0)) : 0;
                      const backDueAddedToBill = includeBackDueInAdm && backDueAmt > 0 ? backDueAmt : 0;
                      const combinedTotalPayable = fees.totalPayable + backDueAddedToBill;
                      const chosenTargetSess =
                        availableReadmSessionsList.find((s) => s.id === targetSessionId) || activeSession;
                      return (
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                                Step 2 • शुल्क विवरण (Fee Breakdown)
                              </span>
                              <h3 className="text-base font-black text-slate-900 dark:text-white">
                                {form.studentName} • {curCls ? formatClassLabel(curCls) : ""}
                                {form.admissionType === "READMISSION" && chosenTargetSess?.name
                                  ? ` • सत्र ${chosenTargetSess.name}`
                                  : ""}
                              </h3>
                            </div>
                            <div className="text-right">
                              {(fees.offerDiscountTotal > 0 || fees.entranceDiscountTotal > 0) && (
                                <span className="text-xs font-bold text-slate-400 line-through font-mono mr-2 tabular-nums">
                                  ₹{(fees.grossTotalPayable + backDueAddedToBill).toLocaleString("en-IN")}
                                </span>
                              )}
                              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                                Total: ₹{combinedTotalPayable.toLocaleString("en-IN")}
                              </span>
                              {fees.offerDiscountTotal > 0 && (
                                <span className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                  Website Offer {fees.offerDiscountPercent}% OFF (-₹{fees.offerDiscountTotal.toLocaleString("en-IN")})
                                </span>
                              )}
                              {fees.entranceDiscountTotal > 0 && (
                                <span className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                  🎓 Entrance Merit Off ({fees.entranceDiscountBadge}): -₹{fees.entranceDiscountTotal.toLocaleString("en-IN")}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                            {fees.enabledHeads.map((h, i) => (
                              <div key={h.key} className="flex items-center justify-between px-3.5 py-2.5 text-xs">
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">{i + 1}. {h.label}</span>
                                  {h.discountAmount > 0 && (
                                    <span className="ml-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                      (-₹{h.discountAmount} Offer)
                                    </span>
                                  )}
                                </div>
                                <div className="text-right font-mono tabular-nums">
                                  {h.discountAmount > 0 && (
                                    <span className="text-[10px] text-slate-400 line-through mr-1.5">₹{h.originalAmount}</span>
                                  )}
                                  <span className="font-black text-slate-900 dark:text-white">₹{h.amount}</span>
                                </div>
                              </div>
                            ))}
                            {(fees.entranceDiscountTotal > 0 || entrancePrefillDiscountCancelled) &&
                              entrancePrefillBanner?.bestScorePct !== undefined && (
                              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs bg-emerald-50/70 dark:bg-emerald-950/30">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`font-extrabold ${
                                      entrancePrefillDiscountCancelled
                                        ? "text-slate-400 line-through"
                                        : "text-emerald-800 dark:text-emerald-300"
                                    }`}
                                  >
                                    🎓 {fees.entranceDiscountLabel || "Entrance Merit Off"} ({entrancePrefillBanner.bestScorePct}%)
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setEntrancePrefillDiscountCancelled((p) => !p)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-black border cursor-pointer ${
                                      entrancePrefillDiscountCancelled
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                                    }`}
                                  >
                                    {entrancePrefillDiscountCancelled ? "Re-apply Off" : "Cancel Off"}
                                  </button>
                                </div>
                                <span
                                  className={`font-mono font-black tabular-nums ${
                                    entrancePrefillDiscountCancelled
                                      ? "text-slate-400"
                                      : "text-emerald-700 dark:text-emerald-300"
                                  }`}
                                >
                                  {entrancePrefillDiscountCancelled
                                    ? "₹0 (Cancelled)"
                                    : `-₹${fees.entranceDiscountTotal.toLocaleString("en-IN")}`}
                                </span>
                              </div>
                            )}
                            {backDueAddedToBill > 0 && (
                              <div className="flex items-center justify-between px-3.5 py-2.5 text-xs bg-rose-50/70 dark:bg-rose-950/30">
                                <span className="font-bold text-rose-800 dark:text-rose-200">
                                  {fees.enabledHeads.length + 1}. पिछला सत्र बकाया (Back Session Due{selectedOldSessionObj?.name ? ` · ${selectedOldSessionObj.name}` : ""})
                                </span>
                                <span className="font-mono font-black text-rose-700 dark:text-rose-300 tabular-nums">
                                  +₹{backDueAddedToBill.toLocaleString("en-IN")}
                                </span>
                              </div>
                            )}
                          </div>

                          {form.admissionType === "READMISSION" && backDueAmt > 0 && (
                            <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-rose-800 dark:text-rose-200">
                                {includeBackDueInAdm
                                  ? "पिछला सत्र बकाया Re-Admission के साथ कुल देय में जुड़ा है:"
                                  : "पिछला सत्र बकाया (अगली मासिक फीस स्लिप में जुड़ेगा):"}
                              </span>
                              <span className="font-mono font-black text-rose-700 dark:text-rose-300 tabular-nums">
                                ₹{backDueAmt.toLocaleString("en-IN")}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Offline Counter Collection */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-slate-900 border-2 border-emerald-400 dark:border-emerald-700 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
                            <Banknote className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>ऑफलाइन नकद फीस संग्रह व सीधा दाखिला</span>
                            </h4>
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold">
                              काउंटर द्वारा नकद / UPI फीस लेकर छात्र को तुरंत नामांकित करें।
                            </p>
                          </div>
                        </div>
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
                          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-sm tabular-nums">
                            {(() => {
                              const curCls =
                                effectiveTargetClasses.find((c) => c.id === form.classId) ||
                                classes.find((c) => c.id === form.classId) ||
                                readmClassesPool.find((c) => c.id === form.classId) ||
                                classes[0];
                              const baseDue = getClassFees(curCls, {
                                usesBus: form.usesBus,
                                offer: school?.websiteConfig?.admissionOffer,
                                entranceDiscount:
                                  entrancePrefillBanner?.bestScorePct !== undefined
                                    ? {
                                        scorePct: entrancePrefillBanner.bestScorePct,
                                        config: school?.websiteConfig?.entranceDiscountConfig,
                                        cancelled: entrancePrefillDiscountCancelled,
                                      }
                                    : undefined,
                              }).totalPayable;
                              const backDueExtra =
                                form.admissionType === "READMISSION" && includeBackDueInAdm
                                  ? Math.max(0, Number(carriedBackDueInput || 0))
                                  : 0;
                              return `₹${Math.max(0, baseDue + backDueExtra - (Number(adminConcession) || 0)).toLocaleString("en-IN")}`;
                            })()}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1">
                            जमा राशि (Paid Amount) *
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                            फीस में छूट (Concession / Discount)
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
                            मासिक ट्यूशन फीस (Monthly Tuition Fee)
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

                    <div className="space-y-2.5">
                      <button
                        type="submit"
                        disabled={submitting}
                        onClick={() => {
                          submitAsPendingRequestRef.current = false;
                        }}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-black text-sm shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2.5 transition cursor-pointer active:scale-[0.99] disabled:opacity-60"
                      >
                        <UserCheck className="w-5 h-5" />
                        <span>
                          {submitting
                            ? "छात्र नामांकित हो रहा है व रसीद बन रही है..."
                            : "✅ छात्र तुरंत नामांकित करें व नकद फीस जमा करें (Direct Enrollment)"}
                        </span>
                      </button>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <button
                          type="button"
                          onClick={() => setAdminFormStep(1)}
                          className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer whitespace-nowrap"
                        >
                          ← फॉर्म सुधारें (Step 1)
                        </button>
                        <button
                          type="submit"
                          disabled={submitting}
                          onClick={() => {
                            submitAsPendingRequestRef.current = true;
                          }}
                          className="flex-1 py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-950/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-60"
                        >
                          <Send className="w-4 h-4" />
                          <span>📩 Request ke Roop me Save Karein (Applications Queue)</span>
                        </button>
                      </div>
                    </div>
                  </div>
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
                <div className="relative group w-14 h-16 rounded-xl border border-slate-300 bg-white dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                  {enrollPhotoUrl ? (
                    <>
                      <img src={enrollPhotoUrl} alt="Student" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEnrollPhotoUrl("")}
                        className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4 text-rose-300" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Camera className="w-4 h-4 text-indigo-400 mb-0.5" />
                      <span className="text-[9px] font-bold uppercase text-slate-400">Photo</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Student Photo</p>
                    <span className="text-[10px] font-bold text-slate-400">(Optional)</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setCameraTarget("enroll");
                        setShowLiveCameraModal(true);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center gap-1.5 shadow-xs active:scale-95 transition cursor-pointer"
                      title="Live Camera से फोटो लें"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Live Photo</span>
                    </button>
                    <DirectUploadButton
                      kind="image"
                      iconOnly
                      showLinkInput={false}
                      currentUrl={enrollPhotoUrl}
                      onUploaded={(url) => setEnrollPhotoUrl(url)}
                      onClear={() => setEnrollPhotoUrl("")}
                    />
                  </div>
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
                      const cls =
                        classes.find((c) => c.id === nextId) ||
                        readmClassesPool.find((c) => c.id === nextId);
                      setEnrollMonthlyFee(String(cls?.feeStructure?.tuitionFee ?? cls?.defaultFee ?? 0));
                      const nextItems = buildDefaultFeeItems(cls, enrollUsesBus, Number(cls?.feeStructure?.busFee || 0));
                      const appBack =
                        enrollingApp?.admissionType === "READMISSION"
                          ? Math.max(0, Number(enrollingApp.previousSessionDue || 0))
                          : 0;
                      if (appBack > 0 && enrollingApp?.includeBackDueInAdm !== false) {
                        nextItems.push({
                          id: "readm_back_due",
                          description: `पिछला सत्र बकाया (Back Session Due${enrollingApp?.previousSessionName ? ` · ${enrollingApp.previousSessionName}` : ""})`,
                          due: appBack,
                        });
                      }
                      const nextOfferCon = nextItems.reduce((s, r) => s + (Number(r.offerCon) || 0), 0);
                      const nextEntFees = getClassFees(cls, {
                        usesBus: enrollUsesBus,
                        customBusFee: Number(cls?.feeStructure?.busFee || 0),
                        offer: school?.websiteConfig?.admissionOffer,
                        entranceDiscount: getAppEntranceDiscountOpt(enrollingApp),
                      });
                      setEnrollFeeItems(nextItems);
                      setEnrollConcession(nextOfferCon + Number(nextEntFees.entranceDiscountTotal || 0));
                      setEnrollPaidManual(false);
                    }}
                    className="w-full px-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-bold"
                  >
                    {(enrollingApp?.admissionType === "READMISSION" && enrollingApp?.targetSessionId && readmClassesPool.some((c) => c.sessionId === enrollingApp.targetSessionId)
                      ? sortSchoolClasses(readmClassesPool.filter((c) => c.sessionId === enrollingApp.targetSessionId))
                      : classes
                    ).map((c) => (
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

              {enrollingApp.entranceTestScorePct !== undefined && (() => {
                const modalCls =
                  classes.find((c) => c.id === enrollClassId) ||
                  readmClassesPool.find((c) => c.id === enrollClassId) ||
                  classes[0];
                const previewModalEnt = getClassFees(modalCls, {
                  usesBus: enrollUsesBus,
                  customBusFee: enrollBusFee,
                  offer: school?.websiteConfig?.admissionOffer,
                  entranceDiscount: {
                    scorePct: enrollingApp.entranceTestScorePct,
                    config: school?.websiteConfig?.entranceDiscountConfig,
                    cancelled: false,
                    fixedAmountOverride: enrollingApp.entranceDiscountAmount,
                    labelOverride: enrollingApp.entranceDiscountLabel,
                  },
                });
                if (!previewModalEnt.entranceDiscountTotal && !enrollingApp.entranceDiscountCancelled) {
                  return null;
                }
                return (
                  <div className="rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span
                      className={`font-bold ${
                        enrollingApp.entranceDiscountCancelled
                          ? "text-slate-400 line-through"
                          : "text-emerald-800 dark:text-emerald-300"
                      }`}
                    >
                      🎓 Entrance Merit Off ({enrollingApp.entranceTestScorePct}%):{" "}
                      ₹{previewModalEnt.entranceDiscountTotal.toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleToggleAppEntranceDiscount(enrollingApp)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                        enrollingApp.entranceDiscountCancelled
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100"
                      }`}
                    >
                      {enrollingApp.entranceDiscountCancelled ? "Restore Off" : "Cancel Off"}
                    </button>
                  </div>
                );
              })()}

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
          isStudentView={!isAdmin}
          defaultMasked={maskSensitiveData}
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
          isStudentView={!isAdmin}
          defaultMasked={maskSensitiveData}
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
      {/* Live Camera Studio Modal for Admission Photo */}
      {showLiveCameraModal && (
        <ProfileCameraModal
          isOpen={showLiveCameraModal}
          onClose={() => setShowLiveCameraModal(false)}
          userName={
            cameraTarget === "form"
              ? (form.studentName || "Applicant")
              : cameraTarget === "post_pay_photo"
              ? (confirmedAdmission?.student?.name || submittedApp?.studentName || "Student")
              : (enrollingApp?.studentName || "Student")
          }
          currentPhotoURL={
            cameraTarget === "form"
              ? form.photoUrl
              : cameraTarget === "post_pay_photo"
              ? (confirmedAdmission?.student?.photoUrl || "")
              : enrollPhotoUrl
          }
          onSavePhoto={(photoDataUrl) => {
            if (cameraTarget === "form") {
              setForm((p) => ({ ...p, photoUrl: photoDataUrl }));
            } else if (cameraTarget === "post_pay_photo") {
              void handlePostPayFaceIdPhotoSave(photoDataUrl, true);
            } else {
              setEnrollPhotoUrl(photoDataUrl);
            }
            setShowLiveCameraModal(false);
          }}
          onRemovePhoto={() => {
            if (cameraTarget === "form") {
              setForm((p) => ({ ...p, photoUrl: "" }));
            } else if (cameraTarget === "enroll") {
              setEnrollPhotoUrl("");
            }
            setShowLiveCameraModal(false);
          }}
        />
      )}
    </div>
  );
};
