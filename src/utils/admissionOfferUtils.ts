import type {
  AdmissionOfferConfig,
  ClassAdmissionHeadToggles,
  ClassFeeHead,
  ClassFeeStructure,
  SchoolClass,
} from "../school-types";
import { getGroupNetItems, isItemShownInAdmission } from "./feeStructureUtils";

export interface AdmissionPackageLineItem {
  key: string;
  label: string;
  hint?: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  isAdmissionPrimary: boolean;
}

export interface AdmissionOfferPackageBreakdown {
  items: AdmissionPackageLineItem[];
  originalTotal: number;
  offerDiscountTotal: number;
  discountedTotal: number;
  discountPercent: number;
  busFee: number;
  busAvailable: boolean;
  monthlyTuition: number;
}

export const isAdmissionOfferActive = (offer?: AdmissionOfferConfig | null): boolean => {
  if (!offer || offer.enabled !== true) return false;
  const pct = Math.max(0, Math.min(90, Number(offer.discountPercent || 0)));
  const hasImages = Array.isArray(offer.images) && offer.images.some((im) => Boolean(im?.url));
  return pct > 0 || hasImages;
};

/**
 * Normalizes legacy/modern ClassFeeStructure consistently with OnlineAdmissionManager's buildClassFeeDraft.
 */
const buildDraftFromClass = (cls?: SchoolClass | null): ClassFeeStructure => {
  const fs = cls?.feeStructure;

  const rawRegistrationFee =
    fs?.registrationFee !== undefined
      ? Math.max(0, Number(fs.registrationFee))
      : (cls as any)?.registrationFee !== undefined
      ? Math.max(0, Number((cls as any).registrationFee))
      : 500;

  const rawExaminationFee =
    fs?.examinationFee !== undefined ? Math.max(0, Number(fs.examinationFee)) : 600;

  const rawRepublicDayCharge =
    fs?.republicDayCharge !== undefined ? Math.max(0, Number(fs.republicDayCharge)) : 100;

  const rawIndependenceDayCharge =
    fs?.independenceDayCharge !== undefined ? Math.max(0, Number(fs.independenceDayCharge)) : 100;

  const rawDiaryCharge =
    fs?.diaryCharge !== undefined ? Math.max(0, Number(fs.diaryCharge)) : 200;

  const rawIdCardCharge =
    fs?.idCardCharge !== undefined ? Math.max(0, Number(fs.idCardCharge)) : 100;

  const rawTieBeltCharge =
    fs?.tieBeltCharge !== undefined ? Math.max(0, Number(fs.tieBeltCharge)) : 100;

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
    fs?.annualCharges !== undefined ? Math.max(0, Number(fs.annualCharges)) : 0;

  const rawTuitionFee =
    fs?.tuitionFee !== undefined
      ? Math.max(0, Number(fs.tuitionFee))
      : cls?.defaultFee !== undefined
      ? Math.max(0, Number(cls.defaultFee))
      : 0;

  const rawCautionMoney =
    fs?.cautionMoney !== undefined ? Math.max(0, Number(fs.cautionMoney)) : 0;

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

/**
 * Computes itemized Admission Package breakdown + Admission Offer % OFF for any class.
 */
export const computeClassAdmissionOfferBreakdown = (
  cls?: SchoolClass | null,
  offer?: AdmissionOfferConfig | null,
  options?: { includeBus?: boolean; customBusFee?: number }
): AdmissionOfferPackageBreakdown => {
  if (!cls) {
    return {
      items: [],
      originalTotal: 0,
      offerDiscountTotal: 0,
      discountedTotal: 0,
      discountPercent: 0,
      busFee: 0,
      busAvailable: false,
      monthlyTuition: 0,
    };
  }

  const fs = cls.feeStructure;
  const rawItems: Array<{
    key: string;
    label: string;
    hint?: string;
    originalAmount: number;
    isAdmissionPrimary: boolean;
  }> = [];

  let busAvailable = false;
  let resolvedBusFee = 0;

  if (fs?.feeGroups && Array.isArray(fs.feeGroups) && fs.feeGroups.length > 0) {
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
        const isBus = Boolean(it.isUserOptional || it.legacyKey === "busFee");
        if (isBus) {
          busAvailable = true;
          resolvedBusFee +=
            options?.customBusFee !== undefined ? Math.max(0, Number(options.customBusFee)) : netAmount;
          return;
        }
        const rawAmt = Math.max(0, Number(it.amount || 0));
        if (rawAmt <= 0 && netAmount <= 0) return;
        const sec = it.billingSection || grp.billingSection || "admission";
        rawItems.push({
          key: `fg_${it.id}`,
          label: it.name,
          hint: `${grp.title}${itemDiscount > 0 ? `${offNote} — Saved ₹${itemDiscount}` : ""}`,
          originalAmount: netAmount,
          isAdmissionPrimary:
            it.legacyKey === "admissionFee" ||
            it.legacyKey === "registrationFee" ||
            sec === "admission",
        });
      });
    });
  } else {
    const draft = buildDraftFromClass(cls);
    const toggles = draft.enabledHeads!;
    busAvailable = Boolean(toggles.busFee);
    resolvedBusFee =
      options?.customBusFee !== undefined
        ? Math.max(0, Number(options.customBusFee))
        : Math.max(0, Number(draft.busFee || 0));

    const pushIf = (
      cond: boolean | undefined,
      key: string,
      label: string,
      hint: string,
      amount: number | undefined,
      isAdmissionPrimary: boolean
    ) => {
      const val = Math.max(0, Number(amount || 0));
      if (cond && val > 0) {
        rawItems.push({ key, label, hint, originalAmount: val, isAdmissionPrimary });
      }
    };

    pushIf(
      toggles.registrationFee,
      "registrationFee",
      "Registration Fee (पंजीकरण शुल्क)",
      "प्रवेश पंजीकरण व फॉर्म शुल्क",
      draft.registrationFee,
      true
    );
    pushIf(
      toggles.admissionFee,
      "admissionFee",
      "Admission Charge (प्रवेश शुल्क)",
      "कक्षा के लिए एकमुश्त प्रवेश शुल्क",
      draft.admissionFee,
      true
    );
    pushIf(
      toggles.examinationFee,
      "examinationFee",
      "Examination Fee (वार्षिक 6 परीक्षा शुल्क)",
      "P.A-1, P.A-2, HYE, P.A-3, P.A-4 व Annual Exam",
      draft.examinationFee,
      false
    );
    pushIf(
      toggles.developmentCharge,
      "developmentCharge",
      "Development Charge (विकास शुल्क)",
      "स्कूल इंफ्रास्ट्रक्चर व विकास कोष",
      draft.developmentCharge,
      false
    );
    pushIf(
      toggles.diaryCharge,
      "diaryCharge",
      "School Diary (स्कूल डायरी)",
      "आधिकारिक छात्र डायरी व सिलेबस",
      draft.diaryCharge,
      false
    );
    pushIf(
      toggles.idCardCharge,
      "idCardCharge",
      "Smart QR ID Card (पहचान पत्र)",
      "क्यूआर कोड युक्त छात्र पहचान पत्र",
      draft.idCardCharge,
      false
    );
    pushIf(
      toggles.tieBeltCharge,
      "tieBeltCharge",
      "Tie & Belt Set (टाई व बेल्ट)",
      "आधिकारिक स्कूल टाई व बेल्ट",
      draft.tieBeltCharge,
      false
    );
    pushIf(
      toggles.republicDayCharge,
      "republicDayCharge",
      "Republic Day Celebration (26 जनवरी)",
      "गणतंत्र दिवस समारोह व कार्यक्रम",
      draft.republicDayCharge,
      false
    );
    pushIf(
      toggles.independenceDayCharge,
      "independenceDayCharge",
      "Independence Day Celebration (15 अगस्त)",
      "स्वतंत्रता दिवस समारोह व मिठाई",
      draft.independenceDayCharge,
      false
    );
    pushIf(
      toggles.annualCharges,
      "annualCharges",
      "Other Annual Charges (अन्य वार्षिक शुल्क)",
      "वार्षिक खेल व सांस्कृतिक कार्यक्रम",
      draft.annualCharges,
      false
    );
    pushIf(
      toggles.tuitionFee,
      "tuitionFee",
      "1st Month Tuition Fee (प्रथम माह शिक्षण शुल्क)",
      "प्रवेश माह का मासिक शुल्क",
      draft.tuitionFee,
      false
    );
    pushIf(
      toggles.cautionMoney,
      "cautionMoney",
      "Caution / Security Deposit",
      "वापसी योग्य धरोहर राशि",
      draft.cautionMoney,
      false
    );

    (draft.customHeads || [])
      .filter((h) => h.enabled !== false && Number(h.amount || 0) > 0)
      .forEach((h) => {
        rawItems.push({
          key: `custom_${h.id}`,
          label: h.name,
          hint: "अतिरिक्त निर्धारित शुल्क",
          originalAmount: Math.max(0, Number(h.amount || 0)),
          isAdmissionPrimary: false,
        });
      });
  }

  if (options?.includeBus && busAvailable && resolvedBusFee > 0) {
    rawItems.push({
      key: "busFee",
      label: "School Bus / Transport Fee (1st Month)",
      hint: "वैकल्पिक स्कूल वाहन सुविधा",
      originalAmount: resolvedBusFee,
      isAdmissionPrimary: false,
    });
  }

  const offerEnabled = Boolean(offer?.enabled);
  const discountPercent = offerEnabled
    ? Math.max(0, Math.min(90, Math.round(Number(offer?.discountPercent || 0))))
    : 0;
  const applyScope = offer?.applyScope === "admission_only" ? "admission_only" : "all";

  const items: AdmissionPackageLineItem[] = rawItems.map((it) => {
    const isBusItem = it.key === "busFee";
    const eligible =
      discountPercent > 0 &&
      !isBusItem &&
      (applyScope === "all" || it.isAdmissionPrimary);
    const disc = eligible ? Math.round((it.originalAmount * discountPercent) / 100) : 0;
    const boundedDisc = Math.min(it.originalAmount, disc);
    return {
      ...it,
      discountAmount: boundedDisc,
      finalAmount: Math.max(0, it.originalAmount - boundedDisc),
    };
  });

  const originalTotal = items.reduce((s, it) => s + it.originalAmount, 0);
  const offerDiscountTotal = items.reduce((s, it) => s + it.discountAmount, 0);
  const discountedTotal = Math.max(0, originalTotal - offerDiscountTotal);
  const monthlyTuition = Number(fs?.tuitionFee ?? cls.defaultFee ?? 0);

  return {
    items,
    originalTotal,
    offerDiscountTotal,
    discountedTotal,
    discountPercent,
    busFee: resolvedBusFee,
    busAvailable,
    monthlyTuition,
  };
};
