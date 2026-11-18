import type {
  ClassAdmissionHeadToggles,
  ClassFeeGroup,
  ClassFeeHead,
  ClassFeeStructure,
  FeeSectionBucket,
} from "../school-types";

export interface FeeSectionMeta {
  value: FeeSectionBucket;
  label: string;
  shortLabel: string;
  hindi: string;
  badgeClass: string;
}

export const FEE_SECTION_OPTIONS: FeeSectionMeta[] = [
  {
    value: "admission",
    label: "Admission Section (प्रवेश शुल्क)",
    shortLabel: "Admission",
    hindi: "प्रवेश फॉर्म व रसीद",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    value: "monthly",
    label: "Monthly Fee Section (मासिक शुल्क)",
    shortLabel: "Monthly",
    hindi: "हर माह बिलिंग",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  },
  {
    value: "annual",
    label: "Annual & Development (वार्षिक / विकास)",
    shortLabel: "Annual / Dev",
    hindi: "वार्षिक व विकास कोष",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  },
  {
    value: "exam",
    label: "Exam & Activity (परीक्षा / गतिविधि)",
    shortLabel: "Exam / Activity",
    hindi: "परीक्षा व अन्य कार्यक्रम",
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800",
  },
  {
    value: "optional",
    label: "Optional / Transport (वैकल्पिक / बस)",
    shortLabel: "Optional / Bus",
    hindi: "बस, किट व वैकल्पिक",
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
];

export const getFeeSectionMeta = (section?: FeeSectionBucket): FeeSectionMeta =>
  FEE_SECTION_OPTIONS.find((s) => s.value === section) || FEE_SECTION_OPTIONS[0];

export interface FeeGroupTemplate {
  id: string;
  label: string;
  title: string;
  billingSection: FeeSectionBucket;
  items: { name: string; amount: number; isUserOptional?: boolean }[];
}

export const FEE_GROUP_TEMPLATES: FeeGroupTemplate[] = [
  {
    id: "annual_dev",
    label: "+ Annual Fee",
    title: "Annual & Maintenance Fee (वार्षिक शुल्क)",
    billingSection: "annual",
    items: [
      { name: "Annual Function & Cultural Charge", amount: 500 },
      { name: "Annual Maintenance & Library Fee", amount: 500 },
    ],
  },
  {
    id: "development",
    label: "+ Development Fee",
    title: "Development & Infrastructure Fee (विकास शुल्क)",
    billingSection: "annual",
    items: [
      { name: "School Development Charge", amount: 600 },
      { name: "Smart Class & Digital Board Fee", amount: 400 },
    ],
  },
  {
    id: "exam",
    label: "+ Exam Fee",
    title: "Examination & Assessment Fee (परीक्षा शुल्क)",
    billingSection: "exam",
    items: [
      { name: "Periodic & Half Yearly Exam Fee", amount: 300 },
      { name: "Annual Final Exam & Report Card", amount: 400 },
    ],
  },
  {
    id: "lab_computer",
    label: "+ Computer / Lab",
    title: "Computer & Science Lab Fee (लैब शुल्क)",
    billingSection: "monthly",
    items: [
      { name: "Computer Lab Fee", amount: 150 },
      { name: "Science Practical Charge", amount: 100 },
    ],
  },
  {
    id: "kit_uniform",
    label: "+ Kit / Diary / ID",
    title: "Student Kit, ID Card & Diary (किट व डायरी)",
    billingSection: "admission",
    items: [
      { name: "Smart ID Card", amount: 100 },
      { name: "School Diary & Syllabus", amount: 120 },
      { name: "Tie, Belt & Badge Set", amount: 150 },
    ],
  },
  {
    id: "transport",
    label: "+ Transport / Bus",
    title: "Transport / Bus Facility (वाहन शुल्क)",
    billingSection: "optional",
    items: [{ name: "Monthly School Bus Fee (User Opt)", amount: 600, isUserOptional: true }],
  },
];

let uidCounter = 0;
export const makeFeeUid = (prefix = "fg"): string => {
  uidCounter = (uidCounter + 1) % 10000;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter.toString(36)}`;
};

export const isGroupShownInAdmission = (grp: ClassFeeGroup): boolean => {
  if (typeof grp.showInAdmission === "boolean") return grp.showInAdmission;
  return grp.billingSection !== "monthly";
};

export const isItemShownInAdmission = (item: ClassFeeHead, grp?: ClassFeeGroup): boolean => {
  if (typeof item.showInAdmission === "boolean") return item.showInAdmission;
  if (grp && typeof grp.showInAdmission === "boolean") return grp.showInAdmission;
  const sec = item.billingSection || grp?.billingSection || "admission";
  return sec !== "monthly";
};

/**
 * Converts a legacy or modern ClassFeeStructure into an editable array of ClassFeeGroup.
 */
export const normalizeFeeGroups = (
  fs?: ClassFeeStructure | null,
  fallbackTuition = 0
): ClassFeeGroup[] => {
  if (fs?.feeGroups && Array.isArray(fs.feeGroups) && fs.feeGroups.length > 0) {
    return fs.feeGroups.map((g, gIdx) => {
      const discVal = Math.max(0, Number(g.discountValue || 0));
      const grpSec = (g.billingSection as FeeSectionBucket) || "admission";
      const grpShowAdm = typeof g.showInAdmission === "boolean" ? g.showInAdmission : grpSec !== "monthly";
      return {
        id: g.id || makeFeeUid(`grp${gIdx}`),
        title: g.title || `Fee Group ${gIdx + 1}`,
        billingSection: grpSec,
        targetSection: g.targetSection || "ALL",
        enabled: g.enabled !== false,
        showInAdmission: grpShowAdm,
        discountEnabled: typeof g.discountEnabled === "boolean" ? g.discountEnabled : discVal > 0,
        discountType: g.discountType === "percent" ? "percent" : "flat",
        discountValue: discVal,
        discountLabel: g.discountLabel || "",
        items: Array.isArray(g.items)
          ? g.items.map((it, iIdx) => {
              const itSec = it.billingSection || grpSec;
              const itShowAdm =
                typeof it.showInAdmission === "boolean"
                  ? it.showInAdmission
                  : typeof g.showInAdmission === "boolean"
                  ? g.showInAdmission
                  : itSec !== "monthly";
              return {
                id: it.id || makeFeeUid(`item${iIdx}`),
                name: it.name || "Fee Item",
                amount: Math.max(0, Number(it.amount || 0)),
                enabled: it.enabled !== false,
                showInAdmission: itShowAdm,
                billingSection: itSec,
                targetSection: it.targetSection || g.targetSection || "ALL",
                groupId: g.id,
                groupTitle: g.title,
                legacyKey: it.legacyKey,
                isUserOptional: Boolean(it.isUserOptional || it.legacyKey === "busFee"),
              };
            })
          : [],
      };
    });
  }

  // Legacy migration -> grouped cleanly so admin can freely edit/add/delete
  const toggles = fs?.enabledHeads || {};
  const rawAdm = Number(fs?.admissionFee || 0);
  const rawReg = Number(fs?.registrationFee || 0);
  const rawTui = Number(fs?.tuitionFee ?? fallbackTuition ?? 0);
  const rawAnn = Number(fs?.annualCharges || 0);
  const rawDev = Number(fs?.developmentCharge || fs?.developmentFee || 0);
  const rawExam = Number(fs?.examinationFee || 0);
  const rawCau = Number(fs?.cautionMoney || 0);
  const rawBus = Number(fs?.busFee || 0);
  const rawDiary = Number(fs?.diaryCharge || 0);
  const rawIdCard = Number(fs?.idCardCharge || 0);
  const rawTieBelt = Number(fs?.tieBeltCharge || 0);

  const groups: ClassFeeGroup[] = [];

  // 1. Admission & Registration Group
  const gAdmId = makeFeeUid("grp_adm");
  groups.push({
    id: gAdmId,
    title: "Admission & Registration (प्रवेश एवं पंजीकरण)",
    billingSection: "admission",
    targetSection: "ALL",
    enabled: true,
    showInAdmission: true,
    items: [
      {
        id: makeFeeUid("it_adm"),
        name: "Admission Fee (प्रवेश शुल्क)",
        amount: rawAdm,
        enabled: typeof toggles.admissionFee === "boolean" ? toggles.admissionFee : rawAdm > 0,
        showInAdmission: true,
        billingSection: "admission",
        legacyKey: "admissionFee",
      },
      {
        id: makeFeeUid("it_reg"),
        name: "Registration / Form Fee (पंजीकरण शुल्क)",
        amount: rawReg,
        enabled: typeof toggles.registrationFee === "boolean" ? toggles.registrationFee : rawReg > 0,
        showInAdmission: true,
        billingSection: "admission",
        legacyKey: "registrationFee",
      },
    ],
  });

  // 2. Monthly Tuition Group (monthly billing ON by default; Admission inclusion optional)
  const gTuiId = makeFeeUid("grp_tui");
  groups.push({
    id: gTuiId,
    title: "Monthly Tuition Fee (मासिक शिक्षण शुल्क)",
    billingSection: "monthly",
    targetSection: "ALL",
    enabled: true,
    showInAdmission: Boolean(toggles.tuitionFee),
    items: [
      {
        id: makeFeeUid("it_tui"),
        name: "Monthly Tuition Fee",
        amount: rawTui,
        enabled: typeof toggles.tuitionFee === "boolean" ? toggles.tuitionFee : rawTui > 0,
        showInAdmission: Boolean(toggles.tuitionFee),
        billingSection: "monthly",
        legacyKey: "tuitionFee",
      },
    ],
  });

  // 3. Annual & Development Group
  const annShowAdm = typeof toggles.annualCharges === "boolean" ? toggles.annualCharges : true;
  const annItems: ClassFeeHead[] = [
    {
      id: makeFeeUid("it_ann"),
      name: "Annual Charges (वार्षिक शुल्क)",
      amount: rawAnn,
      enabled: typeof toggles.annualCharges === "boolean" ? toggles.annualCharges : rawAnn > 0,
      showInAdmission: annShowAdm,
      billingSection: "annual",
      legacyKey: "annualCharges",
    },
  ];
  if (rawDev > 0 || toggles.developmentCharge) {
    annItems.push({
      id: makeFeeUid("it_dev"),
      name: "Development Charge (विकास शुल्क)",
      amount: rawDev,
      enabled: typeof toggles.developmentCharge === "boolean" ? toggles.developmentCharge : rawDev > 0,
      showInAdmission: typeof toggles.developmentCharge === "boolean" ? toggles.developmentCharge : true,
      billingSection: "annual",
      legacyKey: "developmentCharge",
    });
  }
  groups.push({
    id: makeFeeUid("grp_ann"),
    title: "Annual & Development Fee (वार्षिक एवं विकास शुल्क)",
    billingSection: "annual",
    targetSection: "ALL",
    enabled: true,
    showInAdmission: annShowAdm,
    items: annItems,
  });

  // 4. Exam & Activity Group (only if configured or keep Caution/Kit cleanly)
  if (rawExam > 0 || toggles.examinationFee) {
    const examShowAdm = typeof toggles.examinationFee === "boolean" ? toggles.examinationFee : true;
    groups.push({
      id: makeFeeUid("grp_exam"),
      title: "Examination Fee (परीक्षा शुल्क)",
      billingSection: "exam",
      targetSection: "ALL",
      enabled: true,
      showInAdmission: examShowAdm,
      items: [
        {
          id: makeFeeUid("it_exam"),
          name: "Examination Fee",
          amount: rawExam,
          enabled: typeof toggles.examinationFee === "boolean" ? toggles.examinationFee : rawExam > 0,
          showInAdmission: examShowAdm,
          billingSection: "exam",
          legacyKey: "examinationFee",
        },
      ],
    });
  }

  // 5. Caution / Kit Group
  const kitItems: ClassFeeHead[] = [
    {
      id: makeFeeUid("it_cau"),
      name: "Caution / Security / Kit Fee",
      amount: rawCau,
      enabled: typeof toggles.cautionMoney === "boolean" ? toggles.cautionMoney : rawCau > 0,
      billingSection: "admission",
      legacyKey: "cautionMoney",
    },
  ];
  if (rawIdCard > 0) {
    kitItems.push({
      id: makeFeeUid("it_idc"),
      name: "ID Card Charge",
      amount: rawIdCard,
      enabled: toggles.idCardCharge !== false,
      billingSection: "admission",
      legacyKey: "idCardCharge",
    });
  }
  if (rawDiary > 0) {
    kitItems.push({
      id: makeFeeUid("it_dia"),
      name: "School Diary Charge",
      amount: rawDiary,
      enabled: toggles.diaryCharge !== false,
      billingSection: "admission",
      legacyKey: "diaryCharge",
    });
  }
  if (rawTieBelt > 0) {
    kitItems.push({
      id: makeFeeUid("it_tie"),
      name: "Tie & Belt Charge",
      amount: rawTieBelt,
      enabled: toggles.tieBeltCharge !== false,
      billingSection: "admission",
      legacyKey: "tieBeltCharge",
    });
  }
  groups.push({
    id: makeFeeUid("grp_kit"),
    title: "Caution, Kit & Misc (धरोहर एवं किट)",
    billingSection: "admission",
    targetSection: "ALL",
    enabled: true,
    items: kitItems,
  });

  // 6. Transport / Bus Group
  groups.push({
    id: makeFeeUid("grp_bus"),
    title: "Transport / Bus Fee (वाहन शुल्क — User Optional)",
    billingSection: "optional",
    targetSection: "ALL",
    enabled: true,
    items: [
      {
        id: makeFeeUid("it_bus"),
        name: "Monthly Bus / Transport Fee",
        amount: rawBus,
        enabled: typeof toggles.busFee === "boolean" ? toggles.busFee : true,
        billingSection: "optional",
        legacyKey: "busFee",
        isUserOptional: true,
      },
    ],
  });

  // 7. Existing customHeads if any
  if (Array.isArray(fs?.customHeads) && fs!.customHeads.length > 0) {
    groups.push({
      id: makeFeeUid("grp_custom"),
      title: "Additional Custom Fee Heads (अतिरिक्त शुल्क)",
      billingSection: "admission",
      targetSection: "ALL",
      enabled: true,
      items: fs!.customHeads.map((h, i) => ({
        id: h.id || makeFeeUid(`ch${i}`),
        name: h.name || "Custom Charge",
        amount: Math.max(0, Number(h.amount || 0)),
        enabled: h.enabled !== false,
        billingSection: (h.billingSection as FeeSectionBucket) || "admission",
        targetSection: h.targetSection || "ALL",
      })),
    });
  }

  return groups;
};

/**
 * Syncs ClassFeeGroup[] back into legacy ClassFeeStructure scalar fields, enabledHeads, and customHeads
 * so all existing modules remain 100% consistent.
 */
export const syncStructureFromFeeGroups = (
  groups: ClassFeeGroup[],
  base?: Partial<ClassFeeStructure>
): ClassFeeStructure => {
  const cleanGroups: ClassFeeGroup[] = groups.map((g) => {
    const discVal = Math.max(0, Number(g.discountValue || 0));
    const discType = g.discountType === "percent" ? "percent" : "flat";
    const grpSec = g.billingSection || "admission";
    const grpShowAdm =
      typeof g.showInAdmission === "boolean" ? g.showInAdmission : grpSec !== "monthly";
    return {
      ...g,
      title: g.title.trim() || "Untitled Group",
      billingSection: grpSec,
      targetSection: g.targetSection || "ALL",
      enabled: g.enabled !== false,
      showInAdmission: grpShowAdm,
      discountEnabled: typeof g.discountEnabled === "boolean" ? g.discountEnabled : discVal > 0,
      discountType: discType,
      discountValue: discType === "percent" ? Math.min(100, discVal) : discVal,
      discountLabel: (g.discountLabel || "").trim(),
      items: (g.items || []).map((it) => {
        const itSec = it.billingSection || grpSec;
        const itShowAdm =
          typeof it.showInAdmission === "boolean"
            ? it.showInAdmission
            : typeof g.showInAdmission === "boolean"
            ? g.showInAdmission
            : itSec !== "monthly";
        return {
          ...it,
          name: it.name.trim() || "Fee Item",
          amount: Math.max(0, Number(it.amount || 0)),
          enabled: it.enabled !== false,
          showInAdmission: itShowAdm,
          billingSection: itSec,
          targetSection: it.targetSection || g.targetSection || "ALL",
          groupId: g.id,
          groupTitle: g.title.trim() || "Untitled Group",
        };
      }),
    };
  });

  const findLegacy = (key: keyof ClassAdmissionHeadToggles) => {
    for (const g of cleanGroups) {
      for (const it of g.items) {
        if (it.legacyKey === key) {
          return {
            found: true,
            amount: it.amount,
            enabled: g.enabled && it.enabled !== false,
          };
        }
      }
    }
    return { found: false, amount: 0, enabled: false };
  };

  const adm = findLegacy("admissionFee");
  const reg = findLegacy("registrationFee");
  const ann = findLegacy("annualCharges");
  const dev = findLegacy("developmentCharge");
  const exam = findLegacy("examinationFee");
  const cau = findLegacy("cautionMoney");
  const idc = findLegacy("idCardCharge");
  const dia = findLegacy("diaryCharge");
  const tie = findLegacy("tieBeltCharge");
  const bus = findLegacy("busFee");
  const tuiLegacy = findLegacy("tuitionFee");

  // Compute total active Monthly recurring fee (so monthly fee slips & defaultFee include any custom monthly sub-heads & group OFF!)
  let monthlyRecurringTotal = 0;
  let hasMonthlyActive = false;
  cleanGroups.forEach((g) => {
    if (!g.enabled) return;
    const { itemsWithNet } = getGroupNetItems(g);
    itemsWithNet.forEach(({ item: it, netAmount }) => {
      if (it.enabled === false) return;
      const effSec = it.billingSection || g.billingSection;
      const isBus = it.legacyKey === "busFee" || it.isUserOptional;
      if (effSec === "monthly" && !isBus) {
        monthlyRecurringTotal += netAmount;
        hasMonthlyActive = true;
      }
    });
  });

  // Fallback if admin put tuitionFee inside a non-monthly section
  const resolvedTuition = hasMonthlyActive
    ? monthlyRecurringTotal
    : tuiLegacy.found
    ? tuiLegacy.amount
    : 0;

  // Compute optional bus amount from either legacyKey === "busFee" or any isUserOptional transport item
  let resolvedBusAmount = bus.found ? bus.amount : 0;
  let resolvedBusEnabled = bus.found ? bus.enabled : false;
  if (!bus.found) {
    for (const g of cleanGroups) {
      for (const it of g.items) {
        if (it.isUserOptional || g.billingSection === "optional") {
          if (it.name.toLowerCase().includes("bus") || it.name.toLowerCase().includes("transport")) {
            resolvedBusAmount += Math.max(0, Number(it.amount || 0));
            if (g.enabled && it.enabled !== false) resolvedBusEnabled = true;
          }
        }
      }
    }
  }

  // Collect all custom (non-legacy) heads into flat customHeads for fallback compatibility
  const customHeads: ClassFeeHead[] = [];
  cleanGroups.forEach((g) => {
    g.items.forEach((it) => {
      if (!it.legacyKey && !(it.isUserOptional && (it.name.toLowerCase().includes("bus") || it.name.toLowerCase().includes("transport")))) {
        customHeads.push({
          id: it.id,
          name: it.name,
          amount: it.amount,
          enabled: g.enabled && it.enabled !== false,
          billingSection: it.billingSection || g.billingSection,
          targetSection: it.targetSection || g.targetSection || "ALL",
          groupId: g.id,
          groupTitle: g.title,
        });
      }
    });
  });

  const enabledHeads: Partial<ClassAdmissionHeadToggles> = {
    ...(base?.enabledHeads || {}),
    admissionFee: adm.enabled,
    registrationFee: reg.enabled,
    annualCharges: ann.enabled,
    developmentCharge: dev.enabled,
    examinationFee: exam.enabled,
    cautionMoney: cau.enabled,
    idCardCharge: idc.enabled,
    diaryCharge: dia.enabled,
    tieBeltCharge: tie.enabled,
    tuitionFee: hasMonthlyActive ? monthlyRecurringTotal > 0 || tuiLegacy.enabled : tuiLegacy.enabled,
    busFee: resolvedBusEnabled,
  };

  return {
    ...(base || {}),
    admissionFee: adm.amount,
    registrationFee: reg.amount,
    annualCharges: ann.amount,
    developmentCharge: dev.amount,
    examinationFee: exam.amount,
    cautionMoney: cau.amount,
    idCardCharge: idc.amount,
    diaryCharge: dia.amount,
    tieBeltCharge: tie.amount,
    tuitionFee: resolvedTuition,
    busFee: resolvedBusAmount,
    enabledHeads,
    customHeads,
    feeGroups: cleanGroups,
  };
};

export const calculateGroupDiscount = (grp: ClassFeeGroup) => {
  if (!grp || grp.enabled === false) {
    return {
      gross: 0,
      discount: 0,
      net: 0,
      busGross: 0,
      nonBusGross: 0,
      busNet: 0,
      nonBusNet: 0,
      badgeText: "",
    };
  }
  let busGross = 0;
  let nonBusGross = 0;
  (grp.items || []).forEach((it) => {
    if (it.enabled === false) return;
    const amt = Math.max(0, Number(it.amount || 0));
    if (it.isUserOptional || it.legacyKey === "busFee") {
      busGross += amt;
    } else {
      nonBusGross += amt;
    }
  });
  const gross = busGross + nonBusGross;
  const rawVal = Math.max(0, Number(grp.discountValue || 0));
  const isDiscActive = grp.discountEnabled !== false && rawVal > 0 && gross > 0;
  let discount = 0;
  let badgeText = "";
  if (isDiscActive) {
    if (grp.discountType === "percent") {
      const pct = Math.min(100, rawVal);
      discount = Math.min(gross, Math.round((gross * pct) / 100));
      if (discount > 0) badgeText = `${pct}% OFF`;
    } else {
      discount = Math.min(gross, rawVal);
      if (discount > 0) badgeText = `₹${discount.toLocaleString("en-IN")} OFF`;
    }
  }
  const net = Math.max(0, gross - discount);
  const nonBusDisc = Math.min(nonBusGross, discount);
  const busDisc = Math.max(0, discount - nonBusDisc);

  return {
    gross,
    discount,
    net,
    busGross,
    nonBusGross,
    busNet: Math.max(0, busGross - busDisc),
    nonBusNet: Math.max(0, nonBusGross - nonBusDisc),
    badgeText,
  };
};

/**
 * Distributes a group's OFF discount proportionally across its active items so every line stays >= 0
 * and their sum matches net group total without rounding drift.
 */
export const getGroupNetItems = (grp: ClassFeeGroup) => {
  const summary = calculateGroupDiscount(grp);
  const items = grp.items || [];
  const activeIndices: number[] = [];
  items.forEach((it, idx) => {
    if (it.enabled !== false && Math.max(0, Number(it.amount || 0)) > 0) {
      activeIndices.push(idx);
    }
  });

  const allocations = items.map((it) => ({
    item: it,
    grossAmount: Math.max(0, Number(it.amount || 0)),
    netAmount: Math.max(0, Number(it.amount || 0)),
    itemDiscount: 0,
  }));

  if (grp.enabled === false) {
    allocations.forEach((a) => {
      a.netAmount = 0;
    });
    return { summary, itemsWithNet: allocations };
  }

  if (summary.discount > 0 && summary.gross > 0 && activeIndices.length > 0) {
    let remainingDiscount = summary.discount;
    let firstPositiveIdx = activeIndices[0];
    let maxAmt = -1;
    activeIndices.forEach((idx, pos) => {
      const amt = allocations[idx].grossAmount;
      if (amt > maxAmt) {
        maxAmt = amt;
        firstPositiveIdx = idx;
      }
      if (pos < activeIndices.length - 1) {
        const share = Math.min(
          amt,
          Math.floor((summary.discount * amt) / summary.gross)
        );
        allocations[idx].itemDiscount = share;
        allocations[idx].netAmount = amt - share;
        remainingDiscount -= share;
      }
    });
    const lastIdx = activeIndices[activeIndices.length - 1];
    const lastAmt = allocations[lastIdx].grossAmount;
    if (remainingDiscount <= lastAmt) {
      allocations[lastIdx].itemDiscount = remainingDiscount;
      allocations[lastIdx].netAmount = lastAmt - remainingDiscount;
    } else {
      allocations[lastIdx].itemDiscount = lastAmt;
      allocations[lastIdx].netAmount = 0;
      const leftover = remainingDiscount - lastAmt;
      const take = Math.min(allocations[firstPositiveIdx].netAmount, leftover);
      allocations[firstPositiveIdx].itemDiscount += take;
      allocations[firstPositiveIdx].netAmount -= take;
    }
  }

  return { summary, itemsWithNet: allocations };
};

export const calculateFeeGroupsTotals = (groups: ClassFeeGroup[]) => {
  let grossWithoutOptional = 0;
  let withoutOptional = 0;
  let optionalTransport = 0;
  let totalDiscount = 0;
  let admissionTotal = 0;
  let admissionOptionalBus = 0;
  const bySection: Record<FeeSectionBucket, number> = {
    admission: 0,
    monthly: 0,
    annual: 0,
    exam: 0,
    optional: 0,
  };

  groups.forEach((g) => {
    if (!g.enabled) return;
    const { summary, itemsWithNet } = getGroupNetItems(g);
    grossWithoutOptional += summary.nonBusGross;
    withoutOptional += summary.nonBusNet;
    optionalTransport += summary.busNet;
    totalDiscount += summary.discount;

    itemsWithNet.forEach(({ item: it, netAmount }) => {
      if (it.enabled === false) return;
      const sec: FeeSectionBucket = it.billingSection || g.billingSection || "admission";
      bySection[sec] = (bySection[sec] || 0) + netAmount;
      if (isItemShownInAdmission(it, g)) {
        if (it.isUserOptional || it.legacyKey === "busFee") {
          admissionOptionalBus += netAmount;
        } else {
          admissionTotal += netAmount;
        }
      }
    });
  });

  return {
    grossWithoutOptional,
    withoutOptional,
    withOptional: withoutOptional + optionalTransport,
    optionalTransport,
    totalDiscount,
    admissionTotal,
    admissionOptionalBus,
    bySection,
  };
};

/**
 * Checks if a fee group / item applies to a student's class section.
 */
export const matchesStudentSection = (targetSection?: string, studentSection?: string): boolean => {
  if (!targetSection || targetSection === "ALL") return true;
  if (!studentSection) return true; // If student has no section assigned yet, don't hide
  return targetSection.trim().toLowerCase() === studentSection.trim().toLowerCase();
};

/**
 * Returns active Monthly recurring tuition total from ClassFeeStructure (respecting custom monthly groups, sub-heads & group OFF).
 */
export const getMonthlyFeeFromStructure = (
  fs?: ClassFeeStructure | null,
  fallbackDefault = 0,
  studentSection?: string
): number => {
  if (!fs) return fallbackDefault;
  if (fs.feeGroups && Array.isArray(fs.feeGroups) && fs.feeGroups.length > 0) {
    let sum = 0;
    let foundMonthly = false;
    fs.feeGroups.forEach((g) => {
      if (g.enabled === false) return;
      if (!matchesStudentSection(g.targetSection, studentSection)) return;
      const { itemsWithNet } = getGroupNetItems(g);
      itemsWithNet.forEach(({ item: it, netAmount }) => {
        if (it.enabled === false) return;
        if (!matchesStudentSection(it.targetSection, studentSection)) return;
        const sec = it.billingSection || g.billingSection;
        const isBus = it.legacyKey === "busFee" || it.isUserOptional;
        if (sec === "monthly" && !isBus) {
          sum += netAmount;
          foundMonthly = true;
        }
      });
    });
    if (foundMonthly) return sum;
  }
  return Number(fs.tuitionFee ?? fallbackDefault ?? 0);
};
