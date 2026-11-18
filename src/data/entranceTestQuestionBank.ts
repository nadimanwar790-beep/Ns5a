import type { EntranceClassNumber, EntranceTestQuestion, EntranceTestSubject } from "../school-types";
import { ENTRANCE_BANK_LOWER } from "./entranceBankLower";
import { ENTRANCE_BANK_MIDDLE } from "./entranceBankMiddle";
import { ENTRANCE_BANK_UPPER } from "./entranceBankUpper";
import { CLASS_1_EXTRA } from "./entrance/class1Extra";
import { CLASS_2_EXTRA } from "./entrance/class2Extra";
import { CLASS_3_EXTRA } from "./entrance/class3Extra";
import { CLASS_4_EXTRA } from "./entrance/class4Extra";
import { CLASS_5_EXTRA } from "./entrance/class5Extra";
import { CLASS_6_EXTRA } from "./entrance/class6Extra";
import { CLASS_7_EXTRA } from "./entrance/class7Extra";
import { CLASS_8_EXTRA } from "./entrance/class8Extra";
import { getPrimaryExpansion } from "./entrance/primaryExpansion1to5";
import { getSecondaryExpansion } from "./entrance/secondaryExpansion6to9";

function mergeClassPool(
  base: EntranceTestQuestion[],
  extra: EntranceTestQuestion[],
  expansion: EntranceTestQuestion[]
): EntranceTestQuestion[] {
  const seenPrompts = new Set<string>();
  const seenIds = new Set<string>();
  const out: EntranceTestQuestion[] = [];
  for (const q of [...base, ...extra, ...expansion]) {
    const promptKey = `${q.subject}::${q.question.trim().toLowerCase()}`;
    if (seenPrompts.has(promptKey)) continue;
    seenPrompts.add(promptKey);
    let id = q.id;
    let suffix = 1;
    while (seenIds.has(id)) {
      id = `${q.id}_d${suffix++}`;
    }
    seenIds.add(id);
    out.push(id === q.id ? q : { ...q, id });
  }
  return out;
}

export const CURATED_ENTRANCE_BANK: Record<EntranceClassNumber, EntranceTestQuestion[]> = {
  1: mergeClassPool(ENTRANCE_BANK_LOWER[1], CLASS_1_EXTRA, getPrimaryExpansion(1)),
  2: mergeClassPool(ENTRANCE_BANK_LOWER[2], CLASS_2_EXTRA, getPrimaryExpansion(2)),
  3: mergeClassPool(ENTRANCE_BANK_LOWER[3], CLASS_3_EXTRA, getPrimaryExpansion(3)),
  4: mergeClassPool(ENTRANCE_BANK_MIDDLE[4], CLASS_4_EXTRA, getPrimaryExpansion(4)),
  5: mergeClassPool(ENTRANCE_BANK_MIDDLE[5], CLASS_5_EXTRA, getPrimaryExpansion(5)),
  6: mergeClassPool(ENTRANCE_BANK_MIDDLE[6], CLASS_6_EXTRA, getSecondaryExpansion(6)),
  7: mergeClassPool(ENTRANCE_BANK_UPPER[7], CLASS_7_EXTRA, getSecondaryExpansion(7)),
  8: mergeClassPool(ENTRANCE_BANK_UPPER[8], CLASS_8_EXTRA, getSecondaryExpansion(8)),
};

export const getCuratedQuestionsForClass = (classLevel: EntranceClassNumber): EntranceTestQuestion[] => {
  return CURATED_ENTRANCE_BANK[classLevel] || CURATED_ENTRANCE_BANK[1];
};

export interface EntranceBankClassStats {
  classLevel: EntranceClassNumber;
  totalQuestions: number;
  bySubject: Array<{ subject: EntranceTestSubject; count: number }>;
}

export const getEntranceBankStats = (classLevel: EntranceClassNumber): EntranceBankClassStats => {
  const pool = getCuratedQuestionsForClass(classLevel);
  const counts = new Map<EntranceTestSubject, number>();
  for (const q of pool) {
    counts.set(q.subject, (counts.get(q.subject) || 0) + 1);
  }
  return {
    classLevel,
    totalQuestions: pool.length,
    bySubject: Array.from(counts.entries()).map(([subject, count]) => ({ subject, count })),
  };
};

export const getTotalCuratedBankCount = (): number =>
  ([1, 2, 3, 4, 5, 6, 7, 8] as EntranceClassNumber[]).reduce(
    (sum, c) => sum + CURATED_ENTRANCE_BANK[c].length,
    0
  );

