import type {
  EntranceClassNumber,
  EntranceTestQuestion,
  EntranceTestQuestionFormat,
  EntranceTestSubject,
} from "../../school-types";

export type QTuple = [
  subject: EntranceTestSubject,
  format: EntranceTestQuestionFormat,
  question: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
  topicTag: string,
  passage?: string
];

function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function makeRng(seedStr: string): () => number {
  let state = hashSeed(seedStr);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleFourOptions(
  correct: string,
  wrongs: [string, string, string],
  seedStr: string
): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const rng = makeRng(seedStr);
  const items = [
    { text: correct, ok: true },
    { text: wrongs[0], ok: false },
    { text: wrongs[1], ok: false },
    { text: wrongs[2], ok: false },
  ];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const idx = items.findIndex((x) => x.ok) as 0 | 1 | 2 | 3;
  return {
    options: [items[0].text, items[1].text, items[2].text, items[3].text],
    correctIndex: idx,
  };
}

export function makeNumOptions(
  correct: number,
  offsets: number[],
  seedStr: string,
  suffix = "",
  allowNegative = false
): { options: [string, string, string, string]; correctIndex: 0 | 1 | 2 | 3 } {
  const wrongs: number[] = [];
  for (const off of offsets) {
    const cand = correct + off;
    if (cand !== correct && (allowNegative || cand >= 0) && !wrongs.includes(cand)) {
      wrongs.push(cand);
    }
    if (wrongs.length === 3) break;
  }
  let step = 1;
  while (wrongs.length < 3) {
    const cand = correct + step;
    if (cand !== correct && !wrongs.includes(cand)) wrongs.push(cand);
    step++;
  }
  return shuffleFourOptions(
    `${correct}${suffix}`,
    [`${wrongs[0]}${suffix}`, `${wrongs[1]}${suffix}`, `${wrongs[2]}${suffix}`],
    seedStr
  );
}

export interface FactPair {
  prompt: string;
  answer: string;
  explanation?: string;
}

/**
 * Converts a verified list of same-category fact pairs into distinct 4-option MCQs
 * where the 3 distractors come from other answers in the same category.
 */
export function buildFactBankTuples(params: {
  subject: EntranceTestSubject;
  format?: EntranceTestQuestionFormat;
  topicTag: string;
  seedPrefix: string;
  items: FactPair[];
  extraDistractors?: string[];
  explanationPrefix?: string;
}): QTuple[] {
  const {
    subject,
    format = "MCQ",
    topicTag,
    seedPrefix,
    items,
    extraDistractors = [],
    explanationPrefix = "Correct answer:",
  } = params;

  const answerPool = Array.from(
    new Set([...items.map((x) => x.answer), ...extraDistractors].filter(Boolean))
  );

  return items.map((item, idx) => {
    const rng = makeRng(`${seedPrefix}_${idx}_${item.prompt}`);
    const candidates = answerPool.filter((a) => a !== item.answer);
    // Deterministic Fisher-Yates pick of 3 distinct distractors
    const copy = [...candidates];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    const wrongs: [string, string, string] = [
      copy[0] || `${item.answer} (Alt 1)`,
      copy[1] || `${item.answer} (Alt 2)`,
      copy[2] || `${item.answer} (Alt 3)`,
    ];
    const { options, correctIndex } = shuffleFourOptions(
      item.answer,
      wrongs,
      `${seedPrefix}_opt_${idx}`
    );
    const exp = item.explanation || `${explanationPrefix} ${item.answer}.`;
    return [subject, format, item.prompt, options, correctIndex, exp, topicTag];
  });
}

export function expandClassQuestions(
  classLevel: EntranceClassNumber,
  tuples: QTuple[]
): EntranceTestQuestion[] {
  return tuples.map((t, idx) => ({
    id: `c${classLevel}_top_${idx + 1}`,
    classLevel,
    subject: t[0],
    format: t[1],
    question: t[2],
    options: t[3],
    correctIndex: t[4],
    explanation: t[5],
    topicTag: t[6],
    ...(t[7] ? { passage: t[7] } : {}),
  }));
}
