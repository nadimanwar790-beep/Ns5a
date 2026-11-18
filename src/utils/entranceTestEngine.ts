import { collection, doc, getDocs, setDoc } from "firebase/firestore";
import { get, ref, remove, set } from "firebase/database";
import { db, rtdb } from "../firebase";
import { getCuratedQuestionsForClass } from "../data/entranceTestQuestionBank";
import { generateId, saveSchoolPublicInquiry } from "../school-firebase";
import type {
  EntranceClassNumber,
  EntranceDiscountConfig,
  EntranceDiscountSlab,
  EntranceTestAttempt,
  EntranceTestPaperSet,
  EntranceTestPrefillPayload,
  EntranceTestQuestion,
  EntranceTestQuestionFormat,
  EntranceTestSubject,
} from "../school-types";

export const MAX_FREE_ATTEMPTS_PER_CLASS = 5;
export const TOTAL_PAPER_SETS = 100;

export interface ClassBlueprint {
  classLevel: EntranceClassNumber;
  classLabel: string;
  durationMinutes: number;
  totalQuestions: number;
  quotas: Array<{ subject: EntranceTestSubject; count: number }>;
  syllabusNote: string;
}

const BLUEPRINTS: Record<EntranceClassNumber, ClassBlueprint> = {
  1: {
    classLevel: 1,
    classLabel: "Class 1",
    durationMinutes: 20,
    totalQuestions: 30,
    quotas: [
      { subject: "English", count: 8 },
      { subject: "Mathematics", count: 8 },
      { subject: "Hindi", count: 7 },
      { subject: "EVS / GK", count: 7 },
    ],
    syllabusNote: "Vowels, Missing Letters, 1–100 Counting, Add/Sub, स्वर-व्यंजन & Basic GK",
  },
  2: {
    classLevel: 2,
    classLabel: "Class 2",
    durationMinutes: 20,
    totalQuestions: 30,
    quotas: [
      { subject: "English", count: 8 },
      { subject: "Mathematics", count: 8 },
      { subject: "Hindi", count: 7 },
      { subject: "EVS / GK", count: 7 },
    ],
    syllabusNote: "Nouns, a/an, 2-Digit Add/Sub, Tables 2–10, विलोम-लिंग & Helpers/Symbols",
  },
  3: {
    classLevel: 3,
    classLabel: "Class 3",
    durationMinutes: 20,
    totalQuestions: 30,
    quotas: [
      { subject: "English", count: 8 },
      { subject: "Mathematics", count: 8 },
      { subject: "Hindi", count: 7 },
      { subject: "EVS / GK", count: 7 },
    ],
    syllabusNote: "Pronouns, Verbs, 3-Digit Ops, Money/Time, संज्ञा-सर्वनाम & Science Basics",
  },
  4: {
    classLevel: 4,
    classLabel: "Class 4",
    durationMinutes: 30,
    totalQuestions: 50,
    quotas: [
      { subject: "English", count: 13 },
      { subject: "Mathematics", count: 13 },
      { subject: "Hindi", count: 12 },
      { subject: "EVS / GK", count: 12 },
    ],
    syllabusNote: "Degrees, Comprehension, Roman Numerals, Perimeter, मुहावरे & Solar/Body GK",
  },
  5: {
    classLevel: 5,
    classLabel: "Class 5",
    durationMinutes: 30,
    totalQuestions: 50,
    quotas: [
      { subject: "English", count: 13 },
      { subject: "Mathematics", count: 13 },
      { subject: "Hindi", count: 12 },
      { subject: "EVS / GK", count: 12 },
    ],
    syllabusNote: "Tenses, Idioms, LCM/HCF, Angles, % Basics, संधि-कारक & Indian Heritage",
  },
  6: {
    classLevel: 6,
    classLabel: "Class 6",
    durationMinutes: 30,
    totalQuestions: 50,
    quotas: [
      { subject: "English", count: 10 },
      { subject: "Mathematics", count: 12 },
      { subject: "Science", count: 12 },
      { subject: "Social Science", count: 8 },
      { subject: "Reasoning & GK", count: 8 },
    ],
    syllabusNote: "Direct-Indirect, Integers, Ratio, Algebra, NCERT Science & Ancient India",
  },
  7: {
    classLevel: 7,
    classLabel: "Class 7",
    durationMinutes: 40,
    totalQuestions: 80,
    quotas: [
      { subject: "English", count: 16 },
      { subject: "Mathematics", count: 18 },
      { subject: "Science", count: 18 },
      { subject: "Social Science", count: 14 },
      { subject: "Reasoning & GK", count: 14 },
    ],
    syllabusNote: "Active-Passive, Equations, Complementary Angles, Acids/Heat & Logical Reasoning",
  },
  8: {
    classLevel: 8,
    classLabel: "Class 8",
    durationMinutes: 40,
    totalQuestions: 80,
    quotas: [
      { subject: "English", count: 16 },
      { subject: "Mathematics", count: 18 },
      { subject: "Science", count: 18 },
      { subject: "Social Science", count: 14 },
      { subject: "Reasoning & GK", count: 14 },
    ],
    syllabusNote: "Clauses, Factorisation, Exponents, Cubes, Force/Cells, Modern History & Aptitude",
  },
};

export const getClassTestBlueprint = (classLevel: EntranceClassNumber): ClassBlueprint =>
  BLUEPRINTS[classLevel] || BLUEPRINTS[1];

export const formatSetId = (setNumber: number): string => {
  const n = Math.max(1, Math.min(TOTAL_PAPER_SETS, Math.round(setNumber || 1)));
  return `Set-${String(n).padStart(2, "0")}`;
};

export const FORMAT_DISPLAY_LABEL: Record<EntranceTestQuestionFormat, string> = {
  MCQ: "Concept MCQ",
  FILL_BLANK: "Fill in Blank",
  ODD_ONE_OUT: "Odd One Out",
  TRUE_FALSE: "True / False",
  SERIES_PUZZLE: "Puzzle / Series",
  MINI_PASSAGE: "Mini Passage",
};

// ── Deterministic Seeded PRNG (Mulberry32) ──────────────────────────────────
function createSeededRng(seedInput: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedInput.length; i++) {
    h ^= seedInput.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildNumericOptions(
  correct: number,
  offsets: number[],
  rng: () => number,
  suffix = ""
): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const wrongs: number[] = [];
  for (const off of offsets) {
    const candidate = correct + off;
    if (candidate !== correct && candidate >= 0 && !wrongs.includes(candidate)) {
      wrongs.push(candidate);
    }
    if (wrongs.length === 3) break;
  }
  let step = 1;
  while (wrongs.length < 3) {
    const candidate = correct + step;
    if (candidate !== correct && !wrongs.includes(candidate)) wrongs.push(candidate);
    step++;
  }
  const combined = [
    { val: `${correct}${suffix}`, isCorrect: true },
    ...wrongs.slice(0, 3).map((w) => ({ val: `${w}${suffix}`, isCorrect: false })),
  ];
  const shuffled = seededShuffle(combined, rng);
  const idx = shuffled.findIndex((x) => x.isCorrect) as 0 | 1 | 2 | 3;
  return {
    options: [shuffled[0].val, shuffled[1].val, shuffled[2].val, shuffled[3].val],
    correctIndex: idx,
  };
}

// ── Parametric Verified Generators per Grade Band (guarantees unique numbers across Set-01..Set-100) ──
function buildParametricMathQuestions(
  classLevel: EntranceClassNumber,
  setNumber: number,
  rng: () => number
): EntranceTestQuestion[] {
  const out: EntranceTestQuestion[] = [];
  const prefix = `c${classLevel}_s${setNumber}_dyn_m`;

  if (classLevel === 1) {
    const a1 = 2 + Math.floor(rng() * 7);
    const b1 = 1 + Math.floor(rng() * 8);
    const opt1 = buildNumericOptions(a1 + b1, [-1, 1, 2, -2, 3], rng);
    out.push({
      id: `${prefix}_1`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Add the numbers: ${a1} + ${b1} = ?`,
      ...opt1,
      explanation: `Counting ${b1} steps forward from ${a1} gives ${a1 + b1}.`,
      topicTag: "1-Digit Addition",
    });

    const big2 = 8 + Math.floor(rng() * 9);
    const small2 = 2 + Math.floor(rng() * 6);
    const opt2 = buildNumericOptions(big2 - small2, [1, -1, 2, 3], rng);
    out.push({
      id: `${prefix}_2`,
      classLevel,
      subject: "Mathematics",
      format: "FILL_BLANK",
      question: `Subtract: ${big2} − ${small2} = ___`,
      ...opt2,
      explanation: `Taking away ${small2} from ${big2} leaves ${big2 - small2}.`,
      topicTag: "Subtraction",
    });

    const mid = 21 + Math.floor(rng() * 65);
    const opt3 = buildNumericOptions(mid, [-1, 1, 2, -2], rng);
    out.push({
      id: `${prefix}_3`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `What number comes BETWEEN ${mid - 1} and ${mid + 1}?`,
      ...opt3,
      explanation: `${mid} comes right after ${mid - 1} and before ${mid + 1}.`,
      topicTag: "Between Numbers",
    });

    const p1 = 10 + Math.floor(rng() * 3) * 10;
    const step = 5;
    const opt4 = buildNumericOptions(p1 + 3 * step, [-5, 5, 10, 2], rng);
    out.push({
      id: `${prefix}_4`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `Complete the skip-counting pattern: ${p1}, ${p1 + step}, ${p1 + 2 * step}, ___`,
      ...opt4,
      explanation: `Add ${step} each time: ${p1 + 2 * step} + ${step} = ${p1 + 3 * step}.`,
      topicTag: "Patterns",
    });
  } else if (classLevel === 2) {
    const a1 = 24 + Math.floor(rng() * 45);
    const b1 = 13 + Math.floor(rng() * 28);
    const opt1 = buildNumericOptions(a1 + b1, [-10, 10, 1, -1], rng);
    out.push({
      id: `${prefix}_1`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Solve the 2-digit addition: ${a1} + ${b1} = ?`,
      ...opt1,
      explanation: `${a1} + ${b1} = ${a1 + b1}.`,
      topicTag: "2-Digit Addition",
    });

    const tA = 3 + Math.floor(rng() * 7);
    const tB = 4 + Math.floor(rng() * 6);
    const opt2 = buildNumericOptions(tA * tB, [tA, -tA, 4, -2], rng);
    out.push({
      id: `${prefix}_2`,
      classLevel,
      subject: "Mathematics",
      format: "FILL_BLANK",
      question: `Multiply using tables: ${tA} × ${tB} = ___`,
      ...opt2,
      explanation: `${tA} times ${tB} equals ${tA * tB}.`,
      topicTag: "Multiplication Tables",
    });

    const subA = 62 + Math.floor(rng() * 30);
    const subB = 18 + Math.floor(rng() * 25);
    const opt3 = buildNumericOptions(subA - subB, [-10, 10, 2, -2], rng);
    out.push({
      id: `${prefix}_3`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Subtract: ${subA} − ${subB} = ?`,
      ...opt3,
      explanation: `${subA} − ${subB} = ${subA - subB}.`,
      topicTag: "2-Digit Subtraction",
    });

    const cStart = 12 + Math.floor(rng() * 20);
    const opt4 = buildNumericOptions(cStart + 9, [-3, 3, 6, 1], rng);
    out.push({
      id: `${prefix}_4`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `Complete the number series: ${cStart}, ${cStart + 3}, ${cStart + 6}, ___`,
      ...opt4,
      explanation: `Each number increases by 3: ${cStart + 6} + 3 = ${cStart + 9}.`,
      topicTag: "Series",
    });
  } else if (classLevel === 3 || classLevel === 4) {
    const mA = 14 + Math.floor(rng() * 25);
    const mB = 4 + Math.floor(rng() * 6);
    const opt1 = buildNumericOptions(mA * mB, [10, -10, mB, -mB], rng);
    out.push({
      id: `${prefix}_1`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `What is the product of ${mA} × ${mB}?`,
      ...opt1,
      explanation: `${mA} × ${mB} = ${mA * mB}.`,
      topicTag: "Multiplication",
    });

    const dQ = 6 + Math.floor(rng() * 9);
    const dD = 4 + Math.floor(rng() * 6);
    const totalItems = dQ * dD;
    const opt2 = buildNumericOptions(dQ, [-1, 1, 2, -2], rng);
    out.push({
      id: `${prefix}_2`,
      classLevel,
      subject: "Mathematics",
      format: "FILL_BLANK",
      question: `${totalItems} pencils are packed equally in ${dD} boxes. Each box holds ___ pencils.`,
      ...opt2,
      explanation: `${totalItems} ÷ ${dD} = ${dQ} pencils per box.`,
      topicTag: "Division",
    });

    const len = 6 + Math.floor(rng() * 9);
    const br = 3 + Math.floor(rng() * 5);
    const perim = 2 * (len + br);
    const opt3 = buildNumericOptions(perim, [len + br, -4, 4, 6], rng, " cm");
    out.push({
      id: `${prefix}_3`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Find the perimeter of a rectangle of length ${len} cm and breadth ${br} cm:`,
      ...opt3,
      explanation: `Perimeter = 2 × (${len} + ${br}) = ${perim} cm.`,
      topicTag: "Perimeter",
    });

    const rStep = 6 + Math.floor(rng() * 6);
    const rBase = 10 + Math.floor(rng() * 15);
    const opt4 = buildNumericOptions(rBase + 3 * rStep, [-rStep, rStep, 2, -2], rng);
    out.push({
      id: `${prefix}_4`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `Find the missing number: ${rBase}, ${rBase + rStep}, ${rBase + 2 * rStep}, ___`,
      ...opt4,
      explanation: `Add ${rStep} at each step: ${rBase + 2 * rStep} + ${rStep} = ${rBase + 3 * rStep}.`,
      topicTag: "Number Patterns",
    });
  } else if (classLevel === 5 || classLevel === 6) {
    const pctChoices = [10, 20, 25, 40, 50];
    const pct = pctChoices[Math.floor(rng() * pctChoices.length)];
    const baseNum = (2 + Math.floor(rng() * 7)) * 100;
    const ans = (pct * baseNum) / 100;
    const opt1 = buildNumericOptions(ans, [-20, 20, 10, -10], rng);
    out.push({
      id: `${prefix}_1`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Calculate ${pct}% of ${baseNum}:`,
      ...opt1,
      explanation: `(${pct} / 100) × ${baseNum} = ${ans}.`,
      topicTag: "Percentage",
    });

    const xVal = 4 + Math.floor(rng() * 11);
    const coeff = 2 + Math.floor(rng() * 4);
    const addC = 3 + Math.floor(rng() * 9);
    const rhs = coeff * xVal + addC;
    const opt2 = buildNumericOptions(xVal, [-1, 1, 2, -2], rng);
    out.push({
      id: `${prefix}_2`,
      classLevel,
      subject: "Mathematics",
      format: "FILL_BLANK",
      question: `Solve for x: ${coeff}x + ${addC} = ${rhs}, then x = ___`,
      ...opt2,
      explanation: `${coeff}x = ${rhs} − ${addC} = ${rhs - addC} → x = ${xVal}.`,
      topicTag: "Simple Algebra",
    });

    const aSq = 4 + Math.floor(rng() * 12);
    const opt3 = buildNumericOptions(aSq * aSq, [4, -4, 10, -6], rng, " cm²");
    out.push({
      id: `${prefix}_3`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `If the side of a square garden is ${aSq} cm, what is its area?`,
      ...opt3,
      explanation: `Area = side × side = ${aSq} × ${aSq} = ${aSq * aSq} cm².`,
      topicTag: "Area & Mensuration",
    });

    const n1 = 3 + Math.floor(rng() * 6);
    const diffStart = 2 + Math.floor(rng() * 3);
    const t2 = n1 + diffStart;
    const t3 = t2 + (diffStart + 2);
    const t4 = t3 + (diffStart + 4);
    const t5 = t4 + (diffStart + 6);
    const opt4 = buildNumericOptions(t5, [-2, 2, 4, -4], rng);
    out.push({
      id: `${prefix}_4`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `Find the next number in the series: ${n1}, ${t2}, ${t3}, ${t4}, ___`,
      ...opt4,
      explanation: `Differences increase by 2 (+${diffStart}, +${diffStart + 2}, +${diffStart + 4}, +${diffStart + 6}): ${t4} + ${diffStart + 6} = ${t5}.`,
      topicTag: "Series",
    });
  } else {
    // Class 7, 8
    const cp = (4 + Math.floor(rng() * 9)) * 100;
    const gainPct = [10, 15, 20, 25][Math.floor(rng() * 4)];
    const sp = cp + (cp * gainPct) / 100;
    const opt1 = buildNumericOptions(sp, [-50, 50, 100, -100], rng);
    out.push({
      id: `${prefix}_1`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `An article bought for ₹${cp} is sold at a profit of ${gainPct}%. Find its Selling Price (in ₹):`,
      ...opt1,
      explanation: `Profit = ${gainPct}% of ₹${cp} = ₹${(cp * gainPct) / 100}. Selling Price = ₹${cp} + ₹${(cp * gainPct) / 100} = ₹${sp}.`,
      topicTag: "Profit & Loss",
    });

    const xAns = 3 + Math.floor(rng() * 9);
    const k1 = 3 + Math.floor(rng() * 4);
    const k2 = 5 + Math.floor(rng() * 8);
    const rhsVal = k1 * xAns - k2;
    const opt2 = buildNumericOptions(xAns, [-1, 1, 2, -2], rng);
    out.push({
      id: `${prefix}_2`,
      classLevel,
      subject: "Mathematics",
      format: "FILL_BLANK",
      question: `Solve the linear equation: ${k1}x − ${k2} = ${rhsVal} → x = ___`,
      ...opt2,
      explanation: `${k1}x = ${rhsVal} + ${k2} = ${k1 * xAns} → x = ${xAns}.`,
      topicTag: "Linear Equations",
    });

    const ang1 = 35 + Math.floor(rng() * 40);
    const ang2 = 40 + Math.floor(rng() * 35);
    const ang3 = 180 - (ang1 + ang2);
    const opt3 = buildNumericOptions(ang3, [-10, 10, 5, -5], rng, "°");
    out.push({
      id: `${prefix}_3`,
      classLevel,
      subject: "Mathematics",
      format: "MCQ",
      question: `Two angles of a triangle measure ${ang1}° and ${ang2}°. Find the third angle:`,
      ...opt3,
      explanation: `Sum of angles in a triangle = 180°. Third angle = 180° − (${ang1}° + ${ang2}°) = ${ang3}°.`,
      topicTag: "Triangles & Geometry",
    });

    const pBase = 2 + Math.floor(rng() * 4);
    const s1 = pBase;
    const s2 = s1 * 2 + 1;
    const s3 = s2 * 2 + 1;
    const s4 = s3 * 2 + 1;
    const s5 = s4 * 2 + 1;
    const opt4 = buildNumericOptions(s5, [-2, 2, 4, -4], rng);
    out.push({
      id: `${prefix}_4`,
      classLevel,
      subject: "Mathematics",
      format: "SERIES_PUZZLE",
      question: `Find the missing term in the series: ${s1}, ${s2}, ${s3}, ${s4}, ___`,
      ...opt4,
      explanation: `Pattern is ×2 + 1: ${s4} × 2 + 1 = ${s5}.`,
      topicTag: "Number Series",
    });
  }

  return out;
}

// ── Build Deterministic Paper Set (Set-01 .. Set-100) ────────────────────────
export function generateEntrancePaperSet(params: {
  schoolId: string;
  classLevel: EntranceClassNumber;
  setNumber: number;
  customQuestions?: EntranceTestQuestion[];
}): EntranceTestPaperSet {
  const { schoolId, classLevel, customQuestions = [] } = params;
  const setNumber = Math.max(1, Math.min(TOTAL_PAPER_SETS, Math.round(params.setNumber || 1)));
  const setId = formatSetId(setNumber);
  const blueprint = getClassTestBlueprint(classLevel);

  const rng = createSeededRng(`lmps_v1_c${classLevel}_set${setNumber}`);
  const curatedPool = getCuratedQuestionsForClass(classLevel);
  const customForClass = customQuestions.filter((q) => Number(q.classLevel) === classLevel);
  const parametricMath = buildParametricMathQuestions(classLevel, setNumber, rng);

  // Merge all candidates per subject, keeping custom questions priority-eligible + shuffling cleanly per setNumber
  const usedIds = new Set<string>();
  const finalQuestions: EntranceTestQuestion[] = [];
  const breakdown: Array<{ subject: EntranceTestSubject; count: number }> = [];

  for (const quota of blueprint.quotas) {
    const subjCustom = seededShuffle(
      customForClass.filter((q) => q.subject === quota.subject),
      rng
    );
    const subjParametric =
      quota.subject === "Mathematics" ? seededShuffle(parametricMath, rng) : [];
    const subjCurated = seededShuffle(
      curatedPool.filter((q) => q.subject === quota.subject),
      rng
    );

    // Combine: up to 2 parametric math items + custom items + curated items so each paper has rich variety
    const orderedCandidates: EntranceTestQuestion[] = [
      ...subjCustom.slice(0, 3),
      ...subjParametric.slice(0, 2),
      ...subjCurated,
      ...subjParametric.slice(2),
      ...subjCustom.slice(3),
    ];

    const picked: EntranceTestQuestion[] = [];
    for (const q of orderedCandidates) {
      if (picked.length >= quota.count) break;
      if (!usedIds.has(q.id)) {
        usedIds.add(q.id);
        picked.push(q);
      }
    }

    // Fallback safety if a sub-bucket had fewer items than quota
    if (picked.length < quota.count) {
      const anyPool = seededShuffle([...curatedPool, ...customForClass, ...parametricMath], rng);
      for (const q of anyPool) {
        if (picked.length >= quota.count) break;
        if (!usedIds.has(q.id)) {
          usedIds.add(q.id);
          picked.push(q);
        }
      }
    }

    finalQuestions.push(...picked);
    breakdown.push({ subject: quota.subject, count: picked.length });
  }

  return {
    schoolId,
    classLevel,
    classLabel: blueprint.classLabel,
    setNumber,
    setId,
    durationMinutes: blueprint.durationMinutes,
    totalQuestions: finalQuestions.length,
    maxMarks: finalQuestions.length,
    questions: finalQuestions,
    subjectBreakdown: breakdown,
  };
}

// ── Device Identity & Local + Cloud Persistence ─────────────────────────────
const DEVICE_ID_STORAGE_KEY = "nst_entrance_device_id";
const ATTEMPTS_LOCAL_KEY = (schoolId: string) => `nst_entrance_attempts_${schoolId}`;
const CUSTOM_Q_LOCAL_KEY = (schoolId: string) => `nst_entrance_custom_q_${schoolId}`;
const ADMISSION_PREFILL_KEY = "nst_entrance_admission_prefill";

export function getEntranceDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;
    const fresh = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, fresh);
    return fresh;
  } catch {
    return "dev_browser_session";
  }
}

export function normalizeIndianPhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJson(key: string, val: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.warn("[EntranceEngine] localStorage write skipped:", e);
  }
}

export async function getEntranceTestAttempts(schoolId: string): Promise<EntranceTestAttempt[]> {
  if (!schoolId) return [];
  const local = readLocalJson<EntranceTestAttempt[]>(ATTEMPTS_LOCAL_KEY(schoolId), []);
  const map = new Map<string, EntranceTestAttempt>();
  (Array.isArray(local) ? local : []).forEach((a) => {
    if (a?.id) map.set(a.id, a);
  });

  // Read from RTDB (open school sub-node) + Firestore best-effort
  try {
    if (rtdb) {
      const snap = await Promise.race([
        get(ref(rtdb, `schools/${schoolId}/entrance_test_attempts`)),
        new Promise<null>((r) => setTimeout(() => r(null), 2600)),
      ]);
      if (snap && snap.exists()) {
        const obj = snap.val() as Record<string, EntranceTestAttempt>;
        Object.values(obj || {}).forEach((a) => {
          if (a?.id) map.set(a.id, a);
        });
      }
    }
  } catch {}

  try {
    if (db) {
      const snap = await Promise.race([
        getDocs(collection(db, `schools/${schoolId}/public_test_attempts`)),
        new Promise<null>((r) => setTimeout(() => r(null), 2500)),
      ]);
      if (snap && !snap.empty) {
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as EntranceTestAttempt;
          if (data?.id) map.set(data.id, data);
        });
      }
    }
  } catch {}

  const merged = Array.from(map.values()).sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  writeLocalJson(ATTEMPTS_LOCAL_KEY(schoolId), merged);
  return merged;
}

export async function saveEntranceTestAttempt(
  schoolId: string,
  attempt: EntranceTestAttempt
): Promise<void> {
  if (!schoolId || !attempt?.id) return;

  // 1. Save immediately in localStorage
  const current = readLocalJson<EntranceTestAttempt[]>(ATTEMPTS_LOCAL_KEY(schoolId), []);
  const next = [attempt, ...(Array.isArray(current) ? current : []).filter((x) => x.id !== attempt.id)];
  writeLocalJson(ATTEMPTS_LOCAL_KEY(schoolId), next);

  // 2. Persist in RTDB (public-safe school path)
  try {
    if (rtdb) {
      await Promise.race([
        set(ref(rtdb, `schools/${schoolId}/entrance_test_attempts/${attempt.id}`), attempt),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch (e) {
    console.warn("[EntranceEngine] RTDB save warning:", e);
  }

  // 3. Persist in Firestore public_test_attempts
  try {
    if (db) {
      await Promise.race([
        setDoc(doc(db, `schools/${schoolId}/public_test_attempts/${attempt.id}`), attempt, {
          merge: true,
        }),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch {}

  // 4. Sync lead to School Admission Inquiries CRM so Admin sees test-takers cleanly with auto-tag
  try {
    const cleanPhone = normalizeIndianPhone(attempt.phone);
    if (cleanPhone.length >= 10) {
      const sameStudentAttempts = next.filter(
        (x) =>
          Number(x.classLevel) === Number(attempt.classLevel) &&
          normalizeIndianPhone(x.phone) === cleanPhone
      );
      const bestPct =
        sameStudentAttempts.length > 0
          ? Math.max(...sameStudentAttempts.map((x) => Number(x.percentage || 0)))
          : Number(attempt.percentage || 0);
      const evalInfo = evaluateEntranceScore(bestPct, attempt.classLabel, attempt.classLevel);

      await saveSchoolPublicInquiry(schoolId, {
        id: `inq_test_${cleanPhone}_c${attempt.classLevel}`,
        schoolId,
        name: attempt.studentName,
        studentName: attempt.studentName,
        phone: cleanPhone,
        studentClass: evalInfo.recommendedClassLabel || attempt.classLabel,
        inquiryType: "admission",
        source: "website",
        status: attempt.attemptNumber >= MAX_FREE_ATTEMPTS_PER_CLASS ? "applied" : "new",
        message: `Online Entrance Test (${attempt.setId}) — Exam: ${attempt.classLabel} · Attempt ${attempt.attemptNumber}/5 · Score: ${attempt.score}/${attempt.totalQuestions} (${attempt.percentage}%) · Best: ${bestPct}% · Suggested: ${evalInfo.recommendedClassLabel} · [${evalInfo.adminShortBadge}]`,
        remarks: `${evalInfo.adminTag}: ${evalInfo.adminRuleNote}`,
        createdAt: attempt.createdAt,
      });
    }
  } catch {}
}

export function getAttemptsForStudentClass(
  allAttempts: EntranceTestAttempt[],
  classLevel: EntranceClassNumber,
  phone: string,
  deviceId: string
): EntranceTestAttempt[] {
  const cleanPhone = normalizeIndianPhone(phone);
  return allAttempts
    .filter((a) => {
      if (Number(a.classLevel) !== classLevel) return false;
      const phoneMatch = cleanPhone.length >= 10 && normalizeIndianPhone(a.phone) === cleanPhone;
      const deviceMatch = Boolean(deviceId && a.deviceId === deviceId);
      return phoneMatch || deviceMatch;
    })
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function pickNextUnattemptedSetNumber(
  classLevel: EntranceClassNumber,
  classAttempts: EntranceTestAttempt[]
): number {
  const triedSetNumbers = new Set(classAttempts.map((a) => Number(a.setNumber)));
  const candidates: number[] = [];
  for (let s = 1; s <= TOTAL_PAPER_SETS; s++) {
    if (!triedSetNumbers.has(s)) candidates.push(s);
  }
  if (candidates.length === 0) return ((classAttempts.length % TOTAL_PAPER_SETS) || 0) + 1;
  // Use deterministic-but-varied stride across Set-01..Set-100 so tests don't always start at Set-01
  const seedRng = createSeededRng(`pick_${classLevel}_${Date.now()}_${classAttempts.length}`);
  return candidates[Math.floor(seedRng() * candidates.length)];
}

// ── Custom Admin Question Bank CRUD ─────────────────────────────────────────
export async function getCustomEntranceQuestions(
  schoolId: string
): Promise<EntranceTestQuestion[]> {
  if (!schoolId) return [];
  const local = readLocalJson<EntranceTestQuestion[]>(CUSTOM_Q_LOCAL_KEY(schoolId), []);
  const map = new Map<string, EntranceTestQuestion>();
  (Array.isArray(local) ? local : []).forEach((q) => {
    if (q?.id) map.set(q.id, q);
  });

  try {
    if (rtdb) {
      const snap = await Promise.race([
        get(ref(rtdb, `schools/${schoolId}/entrance_custom_questions`)),
        new Promise<null>((r) => setTimeout(() => r(null), 2500)),
      ]);
      if (snap && snap.exists()) {
        const obj = snap.val() as Record<string, EntranceTestQuestion>;
        Object.values(obj || {}).forEach((q) => {
          if (q?.id) map.set(q.id, q);
        });
      }
    }
  } catch {}

  const merged = Array.from(map.values()).sort((a, b) =>
    (b.createdAt || "").localeCompare(a.createdAt || "")
  );
  writeLocalJson(CUSTOM_Q_LOCAL_KEY(schoolId), merged);
  return merged;
}

export async function saveCustomEntranceQuestion(
  schoolId: string,
  q: Omit<EntranceTestQuestion, "id" | "isCustom" | "createdAt"> & { id?: string }
): Promise<EntranceTestQuestion> {
  const full: EntranceTestQuestion = {
    ...q,
    id: q.id || generateId("eq"),
    isCustom: true,
    createdAt: new Date().toISOString(),
  };
  const current = readLocalJson<EntranceTestQuestion[]>(CUSTOM_Q_LOCAL_KEY(schoolId), []);
  const next = [full, ...(Array.isArray(current) ? current : []).filter((x) => x.id !== full.id)];
  writeLocalJson(CUSTOM_Q_LOCAL_KEY(schoolId), next);

  try {
    if (rtdb) {
      await Promise.race([
        set(ref(rtdb, `schools/${schoolId}/entrance_custom_questions/${full.id}`), full),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch {}

  return full;
}

export async function deleteCustomEntranceQuestion(
  schoolId: string,
  questionId: string
): Promise<void> {
  const current = readLocalJson<EntranceTestQuestion[]>(CUSTOM_Q_LOCAL_KEY(schoolId), []);
  writeLocalJson(
    CUSTOM_Q_LOCAL_KEY(schoolId),
    (Array.isArray(current) ? current : []).filter((q) => q.id !== questionId)
  );
  try {
    if (rtdb) {
      await Promise.race([
        remove(ref(rtdb, `schools/${schoolId}/entrance_custom_questions/${questionId}`)),
        new Promise<void>((r) => setTimeout(r, 2500)),
      ]);
    }
  } catch {}
}

// ── Admission Redirect Prefill Handoff ──────────────────────────────────────
export function saveEntranceAdmissionPrefill(payload: EntranceTestPrefillPayload): void {
  writeLocalJson(ADMISSION_PREFILL_KEY, payload);
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nst_entrance_admission_prefill", { detail: payload }));
    }
  } catch {}
}

export function peekEntranceAdmissionPrefill(): EntranceTestPrefillPayload | null {
  const p = readLocalJson<EntranceTestPrefillPayload | null>(ADMISSION_PREFILL_KEY, null);
  if (!p?.studentName && !p?.phone) return null;
  // Expire prefill after 2 hours
  if (p.createdAt && Date.now() - new Date(p.createdAt).getTime() > 2 * 60 * 60 * 1000) {
    clearEntranceAdmissionPrefill();
    return null;
  }
  return p;
}

export function clearEntranceAdmissionPrefill(): void {
  try {
    localStorage.removeItem(ADMISSION_PREFILL_KEY);
  } catch {}
}

// ── 4-Tier Entrance Evaluation & Zero-Rejection Admission Rules ────────────
export type EntranceEvaluationTier =
  | "MERIT"
  | "QUALIFIED"
  | "FOUNDATION_SUPPORT"
  | "COUNSELING";

export interface EntranceTestEvaluation {
  tier: EntranceEvaluationTier;
  percentage: number;
  isDirectEligible: boolean; // >= 50%
  isNextClassQualified: boolean; // >= 33%
  stepUpOfferEligible: boolean; // >= 90%
  examClassLabel: string;
  recommendedClassLevel?: number;
  recommendedClassLabel: string;
  stepUpTargetClassLevel?: EntranceClassNumber;
  stepUpTargetClassLabel?: string;
  parentBadge: string;
  parentHeadline: string;
  parentSubtext: string;
  parentCtaLabel: string;
  adminTag: string;
  adminShortBadge: string;
  adminRuleNote: string;
}

export function evaluateEntranceScore(
  percentageInput: number | undefined | null,
  classLabel = "Class 1",
  classLevelInput?: number
): EntranceTestEvaluation {
  const pct = Math.max(0, Math.min(100, Math.round(Number(percentageInput || 0))));
  const examCls = classLabel || "Class 1";
  const matchedDigit = examCls.match(/\b([1-9]|1[0-2])\b/);
  const parsedLevel =
    typeof classLevelInput === "number" && classLevelInput >= 1
      ? classLevelInput
      : matchedDigit
      ? Number(matchedDigit[1])
      : undefined;

  const nextLevel = parsedLevel ? parsedLevel + 1 : undefined;
  const nextLabel = nextLevel ? `Class ${nextLevel}` : "Next Class";
  const stepUpLevel =
    parsedLevel && parsedLevel < 8 ? ((parsedLevel + 1) as EntranceClassNumber) : undefined;
  const stepUpLabel = stepUpLevel ? `Class ${stepUpLevel}` : undefined;

  if (pct >= 90) {
    return {
      tier: "MERIT",
      percentage: pct,
      isDirectEligible: true,
      isNextClassQualified: true,
      stepUpOfferEligible: true,
      examClassLabel: examCls,
      recommendedClassLevel: nextLevel,
      recommendedClassLabel: nextLabel,
      stepUpTargetClassLevel: stepUpLevel,
      stepUpTargetClassLabel: stepUpLabel,
      parentBadge: "90%+ Scholar · Next Class Ready",
      parentHeadline: `Congratulations! Eligible for Direct Admission + Scholarship in ${nextLabel}`,
      parentSubtext: `शानदार उपलब्धि! आपने ${examCls} स्तर में ${pct}% स्कोर किया है — आप ${nextLabel} के लिए पूर्णतः योग्य हैं और मेरिट स्कॉलरशिप के पात्र हैं।`,
      parentCtaLabel: `Claim Merit Seat in ${nextLabel}`,
      adminTag: `90–100% · Scholar / Discovery (${nextLabel})`,
      adminShortBadge: `${pct}% - 90%+ Scholar (${nextLabel})`,
      adminRuleNote: `${nextLabel} में सीधा प्रवेश (Direct Admission) + Merit Scholarship दें। 90%+ होने के कारण Best-Fit Next Class Discovery Offer अनलॉक है।`,
    };
  }

  if (pct >= 80) {
    return {
      tier: "MERIT",
      percentage: pct,
      isDirectEligible: true,
      isNextClassQualified: true,
      stepUpOfferEligible: false,
      examClassLabel: examCls,
      recommendedClassLevel: nextLevel,
      recommendedClassLabel: nextLabel,
      parentBadge: "Merit Topper · Next Class Ready",
      parentHeadline: `Congratulations! Merit Topper — Direct Admission + Scholarship in ${nextLabel}`,
      parentSubtext: `उत्कृष्ट प्रदर्शन! ${examCls} में ${pct}% अंक के साथ आपका बच्चा ${nextLabel} के लिए मेरिट श्रेणी में चयनित है। ऑफिस डेस्क पर मेरिट स्कॉलरशिप प्राप्त करें।`,
      parentCtaLabel: `Claim Merit Seat in ${nextLabel}`,
      adminTag: `80–89% · Merit Topper (${nextLabel})`,
      adminShortBadge: `${pct}% - Merit ${nextLabel}`,
      adminRuleNote: `${nextLabel} में सीधा प्रवेश + Merit Scholarship दें।`,
    };
  }

  if (pct >= 50) {
    return {
      tier: "QUALIFIED",
      percentage: pct,
      isDirectEligible: true,
      isNextClassQualified: true,
      stepUpOfferEligible: false,
      examClassLabel: examCls,
      recommendedClassLevel: nextLevel,
      recommendedClassLabel: nextLabel,
      parentBadge: `Qualified · Eligible for ${nextLabel}`,
      parentHeadline: `Congratulations! Eligible for Direct Admission in ${nextLabel}`,
      parentSubtext: `बच्चे ने ${examCls} स्तर में ${pct}% अंक प्राप्त किए हैं। वह ${nextLabel} का सिलेबस आसानी से संभाल लेगा — ऑनलाइन फॉर्म भरकर सीट कन्फर्म करें।`,
      parentCtaLabel: `Proceed to Admission (${nextLabel})`,
      adminTag: `50–79% · Qualified (${nextLabel})`,
      adminShortBadge: `${pct}% - Direct ${nextLabel}`,
      adminRuleNote: `${nextLabel} में सीधा प्रवेश (Eligible for Next Class) — सामान्य प्रक्रिया से दाखिला पूरा करें।`,
    };
  }

  if (pct >= 33) {
    return {
      tier: "FOUNDATION_SUPPORT",
      percentage: pct,
      isDirectEligible: false,
      isNextClassQualified: true,
      stepUpOfferEligible: false,
      examClassLabel: examCls,
      recommendedClassLevel: nextLevel,
      recommendedClassLabel: nextLabel,
      parentBadge: `33%+ Passed · ${nextLabel} (Guided)`,
      parentHeadline: `Foundation Assessment Complete — Eligible for ${nextLabel} (With Support)`,
      parentSubtext: `आपने ${examCls} में ${pct}% स्कोर कर 33% बेंचमार्क पार किया है। हम ${nextLabel} में प्रवेश के साथ 1-महीने के Extra Foundation Support व फ्री काउंसलिंग की सलाह देते हैं।`,
      parentCtaLabel: `Book Counseling & ${nextLabel} Seat`,
      adminTag: `33–49% · Conditional Next Class (${nextLabel})`,
      adminShortBadge: `${pct}% - ${nextLabel} (1M Support)`,
      adminRuleNote: `33%–49% स्कोर: ${nextLabel} में सशर्त प्रवेश दें + शुरुआती 1 महीने Extra Foundation Support रखें।`,
    };
  }

  return {
    tier: "COUNSELING",
    percentage: pct,
    isDirectEligible: false,
    isNextClassQualified: false,
    stepUpOfferEligible: false,
    examClassLabel: examCls,
    recommendedClassLevel: parsedLevel,
    recommendedClassLabel: examCls,
    parentBadge: `Best-Fit Class: ${examCls}`,
    parentHeadline: `Foundation Assessment Complete — Recommended Class: ${examCls}`,
    parentSubtext: `33% से कम स्कोर (${pct}%) के आधार पर बच्चे के मजबूत भविष्य के लिए ${examCls} में ही नामांकन सबसे सही रहेगा। कृपया प्रिंसिपल सर से फ्री काउंसलिंग व सीट बुकिंग करें।`,
    parentCtaLabel: `Book Counseling & ${examCls} Seat`,
    adminTag: `Below 33% · Suggest Same Class (${examCls})`,
    adminShortBadge: `${pct}% - Keep in ${examCls}`,
    adminRuleNote: `33% से कम अंक (${pct}%): अभिभावक को बच्चे का नामांकन ${examCls} (इसी कक्षा) में रखने या 1-महीने के Bridge Course की सलाह दें।`,
  };
}

// ── Entrance Exam Percentage-Based Admission Fee Off Slabs ──────────────────
export const DEFAULT_SAMPLE_ENTRANCE_SLABS: EntranceDiscountSlab[] = [
  {
    id: "slab_90_100",
    minPercentage: 90,
    maxPercentage: 100,
    discountType: "fixed",
    discountValue: 500,
    label: "90%+ Scholar Merit Off",
    enabled: true,
  },
  {
    id: "slab_80_89",
    minPercentage: 80,
    maxPercentage: 89,
    discountType: "fixed",
    discountValue: 300,
    label: "Merit Topper Off",
    enabled: true,
  },
  {
    id: "slab_60_79",
    minPercentage: 60,
    maxPercentage: 79,
    discountType: "fixed",
    discountValue: 200,
    label: "Qualified Merit Off",
    enabled: true,
  },
];

export function normalizeEntranceDiscountConfig(
  cfg?: EntranceDiscountConfig | null
): EntranceDiscountConfig {
  const slabs: EntranceDiscountSlab[] = Array.isArray(cfg?.slabs)
    ? cfg!.slabs
        .filter((s) => s && typeof s === "object")
        .map((s, idx) => {
          const minP = Math.max(0, Math.min(100, Math.round(Number(s.minPercentage ?? 0))));
          const maxP = Math.max(minP, Math.min(100, Math.round(Number(s.maxPercentage ?? 100))));
          const dType: "fixed" | "percent" = s.discountType === "percent" ? "percent" : "fixed";
          const rawVal = Math.max(0, Math.round(Number(s.discountValue ?? 0)));
          const clampedVal = dType === "percent" ? Math.min(100, rawVal) : rawVal;
          return {
            id: String(s.id || `slab_${idx + 1}`),
            minPercentage: minP,
            maxPercentage: maxP,
            discountType: dType,
            discountValue: clampedVal,
            label: String(s.label || "").trim() || `${minP}%–${maxP}% Merit Off`,
            enabled: s.enabled !== false,
          };
        })
        .sort((a, b) => b.minPercentage - a.minPercentage || b.discountValue - a.discountValue)
    : [];

  return {
    enabled: Boolean(cfg?.enabled),
    applyScope: cfg?.applyScope === "admission_only" ? "admission_only" : "all",
    slabs,
  };
}

export interface EntranceDiscountResult {
  eligible: boolean;
  discountAmount: number;
  rawValue: number;
  discountType: "fixed" | "percent";
  label: string;
  displayBadge: string;
  slab: EntranceDiscountSlab | null;
}

export function calculateEntranceScoreDiscount(
  scorePct: number | undefined | null,
  config?: EntranceDiscountConfig | null,
  eligibleFeeTotal?: number
): EntranceDiscountResult {
  const empty: EntranceDiscountResult = {
    eligible: false,
    discountAmount: 0,
    rawValue: 0,
    discountType: "fixed",
    label: "",
    displayBadge: "",
    slab: null,
  };
  if (scorePct === undefined || scorePct === null || Number.isNaN(Number(scorePct))) {
    return empty;
  }
  const normalized = normalizeEntranceDiscountConfig(config);
  if (!normalized.enabled) return empty;

  const pct = Math.max(0, Math.min(100, Math.round(Number(scorePct))));
  const matched = normalized.slabs.find(
    (s) => s.enabled !== false && s.discountValue > 0 && pct >= s.minPercentage && pct <= s.maxPercentage
  );
  if (!matched) return empty;

  const baseFee =
    eligibleFeeTotal !== undefined ? Math.max(0, Number(eligibleFeeTotal || 0)) : undefined;

  let calculatedAmount = 0;
  if (matched.discountType === "percent") {
    calculatedAmount =
      baseFee !== undefined ? Math.round((baseFee * matched.discountValue) / 100) : 0;
  } else {
    calculatedAmount = matched.discountValue;
  }

  const finalDiscount =
    baseFee !== undefined ? Math.min(baseFee, Math.max(0, calculatedAmount)) : calculatedAmount;

  const displayBadge =
    matched.discountType === "percent"
      ? `${matched.discountValue}% OFF`
      : `₹${matched.discountValue.toLocaleString("en-IN")} OFF`;

  return {
    eligible: true,
    discountAmount: finalDiscount,
    rawValue: matched.discountValue,
    discountType: matched.discountType,
    label: matched.label || `${matched.minPercentage}%–${matched.maxPercentage}% Entrance Merit Off`,
    displayBadge,
    slab: matched,
  };
}

