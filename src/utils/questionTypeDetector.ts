import { MCQItem, MCQQuestionType, MatchColumnData, MatchColumnRow } from '../types';

export interface QuestionTypeBadgeConfig {
  type: MCQQuestionType;
  titleHindi: string;
  titleEn: string;
  badgeLabel: string;
  shortCode: string;
  examTag: string;
  description: string;
  bgLight: string;
  textLight: string;
  borderLight: string;
  bgDark: string;
  textDark: string;
  borderDark: string;
  iconName: string; // Used to pick appropriate icon
}

export const QUESTION_TYPES_CONFIG: Record<MCQQuestionType, QuestionTypeBadgeConfig> = {
  DIRECT_MCQ: {
    type: 'DIRECT_MCQ',
    titleHindi: 'सीधे बहुविकल्पीय प्रश्न',
    titleEn: 'Direct Single Choice MCQ',
    badgeLabel: 'सीधा प्रश्न',
    shortCode: 'DIR',
    examTag: 'SSC • Railway • Group D • Police',
    description: 'एक सीधा सवाल और 4 विकल्प, जिनमें से केवल एक सही होता है।',
    bgLight: 'bg-emerald-50',
    textLight: 'text-emerald-700',
    borderLight: 'border-emerald-200',
    bgDark: 'bg-emerald-950/50',
    textDark: 'text-emerald-300',
    borderDark: 'border-emerald-800/60',
    iconName: 'CheckCircle2',
  },
  MULTI_STATEMENT: {
    type: 'MULTI_STATEMENT',
    titleHindi: 'कथन आधारित प्रश्न',
    titleEn: 'Multi-Statement Based MCQ',
    badgeLabel: 'कथन आधारित',
    shortCode: 'STM',
    examTag: 'UPSC • State PCS • CDS • BSSC CGL',
    description: '2 या 3 कथन दिए जाते हैं और पूछा जाता है कि कौन-सा/से कथन सत्य या असत्य हैं।',
    bgLight: 'bg-blue-50',
    textLight: 'text-blue-700',
    borderLight: 'border-blue-200',
    bgDark: 'bg-blue-950/50',
    textDark: 'text-blue-300',
    borderDark: 'border-blue-800/60',
    iconName: 'Layers',
  },
  ASSERTION_REASON: {
    type: 'ASSERTION_REASON',
    titleHindi: 'अभिकथन और कारण',
    titleEn: 'Assertion & Reason',
    badgeLabel: 'अभिकथन व कारण',
    shortCode: 'A&R',
    examTag: 'NEET • JEE • CTET • UGC NET • PCS',
    description: 'अभिकथन (A) और कारण (R) की सत्यता तथा व्याख्यात्मक संबंध की जांच।',
    bgLight: 'bg-purple-50',
    textLight: 'text-purple-700',
    borderLight: 'border-purple-200',
    bgDark: 'bg-purple-950/50',
    textDark: 'text-purple-300',
    borderDark: 'border-purple-800/60',
    iconName: 'Zap',
  },
  MATCH_COLUMN: {
    type: 'MATCH_COLUMN',
    titleHindi: 'सुमेलित कीजिए / सही जोड़ी मिलाइए',
    titleEn: 'Match the Column',
    badgeLabel: 'सुमेलित कीजिए',
    shortCode: 'MTC',
    examTag: 'UPSC • PCS • SSC • NDA • Railway',
    description: 'सूची-I और सूची-II को सुमेलित कर सही कूट (Code) का चयन करना होता है।',
    bgLight: 'bg-amber-50',
    textLight: 'text-amber-800',
    borderLight: 'border-amber-200',
    bgDark: 'bg-amber-950/50',
    textDark: 'text-amber-300',
    borderDark: 'border-amber-800/60',
    iconName: 'GitCompare',
  },
  CHRONOLOGICAL: {
    type: 'CHRONOLOGICAL',
    titleHindi: 'कालानुक्रम / सही क्रम',
    titleEn: 'Chronological Order / Sequencing',
    badgeLabel: 'कालानुक्रम (क्रम)',
    shortCode: 'SEQ',
    examTag: 'UPSC • State PCS • History • Defence',
    description: 'घटनाओं, ऐतिहासिक युद्धों, या प्रक्रियाओं को पहले से बाद के क्रम में लगाना।',
    bgLight: 'bg-teal-50',
    textLight: 'text-teal-700',
    borderLight: 'border-teal-200',
    bgDark: 'bg-teal-950/50',
    textDark: 'text-teal-300',
    borderDark: 'border-teal-800/60',
    iconName: 'ArrowRightLeft',
  },
  DATA_SUFFICIENCY: {
    type: 'DATA_SUFFICIENCY',
    titleHindi: 'आंकड़ों की पर्याप्तता',
    titleEn: 'Data Sufficiency',
    badgeLabel: 'आंकड़ों की पर्याप्तता',
    shortCode: 'DS',
    examTag: 'Banking (PO/Clerk) • CAT • CSAT (UPSC)',
    description: 'प्रश्न का उत्तर देने के लिए कथन I या कथन II में से कौन पर्याप्त है।',
    bgLight: 'bg-cyan-50',
    textLight: 'text-cyan-700',
    borderLight: 'border-cyan-200',
    bgDark: 'bg-cyan-950/50',
    textDark: 'text-cyan-300',
    borderDark: 'border-cyan-800/60',
    iconName: 'BarChart2',
  },
  CASE_STUDY: {
    type: 'CASE_STUDY',
    titleHindi: 'गद्यांश / केस स्टडी आधारित प्रश्न',
    titleEn: 'Reading Comprehension / Case Study',
    badgeLabel: 'गद्यांश आधारित',
    shortCode: 'CS',
    examTag: 'UPSC CSAT • CTET • Banking • CLAT',
    description: 'दिए गए गद्यांश या केस स्टडी को पढ़कर विश्लेषण आधारित उत्तर देना।',
    bgLight: 'bg-indigo-50',
    textLight: 'text-indigo-700',
    borderLight: 'border-indigo-200',
    bgDark: 'bg-indigo-950/50',
    textDark: 'text-indigo-300',
    borderDark: 'border-indigo-800/60',
    iconName: 'BookOpen',
  },
  NEGATIVE_NOT: {
    type: 'NEGATIVE_NOT',
    titleHindi: 'निषेधात्मक प्रश्न (NOT Type)',
    titleEn: 'Negative / "NOT" Type MCQ',
    badgeLabel: 'निषेधात्मक (NOT)',
    shortCode: 'NOT',
    examTag: 'All Competitive Exams (High Trapping Rate)',
    description: 'परीक्षार्थियों को भ्रमित करने के लिए पूछा जाता है: कौन-सा सही नहीं / असत्य है।',
    bgLight: 'bg-rose-50',
    textLight: 'text-rose-700',
    borderLight: 'border-rose-300',
    bgDark: 'bg-rose-950/60',
    textDark: 'text-rose-300',
    borderDark: 'border-rose-800',
    iconName: 'AlertTriangle',
  },
};

// ── Negative Keywords for Highlighting ──
export const NEGATIVE_PATTERNS = [
  /\b(?:नहीं\s+है|नहीं\s+हैं|नहीं\s+होता|नहीं\s+होती|नहीं\s+था|नहीं\s+थी|नहीं\s+किया|नहीं\s+पड़ता|नहीं\s+पाया|नहीं\s+बनता|नहीं\s+रहता|नहीं\s+गिरती|नहीं\s+मिला|नहीं\s+मिलता|नहीं\s+हो\s*सकता)\b/gi,
  /\b(?:असत्य\s+है|असत्य\s+कथन|गलत\s+है|गलत\s+कथन|त्रुटिपूर्ण\s+है|सही\s+नहीं\s+है|सत्य\s+नहीं\s+है|सुमेलित\s+नहीं\s+है|सुमेलित\s+नहीं|सत्य\s+नहीं|सही\s+नहीं)\b/gi,
  /\b(?:परिचित\s+नहीं\s+थे|परिचित\s+नहीं\s+था|प्रयुक्त\s+नहीं\s+होता|विद्यमान\s+नहीं|शामिल\s+नहीं|प्राप्त\s+नहीं\s+हुआ|स्थित\s+नहीं\s+है|संबंधित\s+नहीं\s+है)\b/gi,
  /\b(?:NOT\s+correct|INCORRECT|NOT\s+true|FALSE|EXCEPT|NOT\s+a|NOT\s+an|NOT\s+matched)\b/gi,
  /\bNOT\b/g,
];

/**
 * Highlights negative keywords in question stem with high-visibility warning pill
 */
export function highlightNegativeInText(text: string): string {
  if (!text) return '';
  let result = text;
  // Replace negative patterns with styled highlight span
  const patterns = [
    {
      regex: /(कौन[- ]?सा\/से\s+)?(सही\s+नहीं\s+है|सत्य\s+नहीं\s+है|सुमेलित\s+नहीं\s+है|सुमेलित\s+नहीं|असत्य\s+है|गलत\s+है|त्रुटिपूर्ण\s+है|सत्य\s+नहीं|सही\s+नहीं)/gi,
      highlight: '<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-black bg-rose-500 text-white shadow-sm ring-1 ring-rose-400 text-xs sm:text-sm animate-pulse">$2</span>',
    },
    {
      regex: /(नहीं\s+[\u0900-\u097F]+(?:\s+है|\s+हैं)?|नहीं\s+हैं|नहीं\s+है|नहीं\s+थी|नहीं\s+था|नहीं\s+करता|नहीं\s+करती|नहीं\s+होता|नहीं\s+होती|नहीं\s+गिरती\s+है|नहीं\s+गिरती|प्राप्त\s+नहीं\s+हुआ|परिचित\s+नहीं\s+थे|प्रयुक्त\s+नहीं\s+होता|स्थित\s+नहीं\s+है|संबंधित\s+नहीं\s+है)/gi,
      highlight: '<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-black bg-rose-500 text-white shadow-sm ring-1 ring-rose-400 text-xs sm:text-sm animate-pulse">$1</span>',
    },
    {
      regex: /\b(NOT\s+correct|INCORRECT|NOT\s+true|FALSE|NOT\s+matched)\b/gi,
      highlight: '<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-black bg-rose-500 text-white shadow-sm ring-1 ring-rose-400 text-xs sm:text-sm tracking-wide uppercase">$1</span>',
    },
    {
      regex: /(?<!\w)(NOT)(?!\w)/g,
      highlight: '<span class="inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md font-black bg-rose-600 text-white shadow-sm text-xs uppercase underline tracking-wider">$1</span>',
    },
  ];

  for (const p of patterns) {
    result = result.replace(p.regex, p.highlight);
  }
  return result;
}

/**
 * Detects if a text contains negative traps ("नहीं है", "NOT", "गलत है", "असत्य", "नहीं गिरती है")
 */
export function hasNegativeTrap(text: string): boolean {
  if (!text) return false;
  return (
    /(?:नहीं\s+[\u0900-\u097F]+(?:\s+है|\s+हैं)?|नहीं\s+है|नहीं\s+हैं|नहीं\s+होता|नहीं\s+होती|नहीं\s+था|नहीं\s+थी|नहीं\s+गिरती|प्राप्त\s+नहीं\s+हुआ|परिचित\s+नहीं\s+थे|प्रयुक्त\s+नहीं|स्थित\s+नहीं|संबंधित\s+नहीं|असत्य|गलत\s+है|सुमेलित\s+नहीं|सत्य\s+नहीं|सही\s+नहीं)(?:\s|[?.!,।:]|$)/i.test(text) ||
    /\b(?:NOT|INCORRECT|NOT\s+CORRECT|NOT\s+TRUE|FALSE|EXCEPT|NOT\s+MATCHED)\b/i.test(text)
  );
}

/**
 * Extracts Assertion (A) and Reason (R) from question text or statements
 */
export function extractAssertionReason(questionText: string, statements?: string[]): {
  assertion: string;
  reason: string;
  cleanedQuestion: string;
} | null {
  const combined = (questionText + '\n' + (statements || []).join('\n')).replace(/<br\s*\/?>/gi, '\n');

  // Pattern 1: Assertion (A): ... Reason (R): ...
  const match1 = combined.match(/(?:अभिकथन|Assertion|दावा)\s*(?:\([Aa]\)|-[Aa]|:|\b[Aa]\b)\s*[:：\-]?\s*([\s\S]+?)(?=\n|\r|(?:कारण|Reason)\s*(?:\([Rr]\)|-[Rr]|:|\b[Rr]\b))/i);
  const match2 = combined.match(/(?:कारण|Reason)\s*(?:\([Rr]\)|-[Rr]|:|\b[Rr]\b)\s*[:：\-]?\s*([\s\S]+?)(?=\n\s*(?:A\)|[A-D]\)|Option|विकल्प|उत्तर|Ans|✅)|$)/i);

  if (match1 && match2) {
    const assertion = match1[1].replace(/^(?:अभिकथन|Assertion|दावा)\s*(?:\([Aa]\)|-[Aa]|:|\b[Aa]\b)?\s*[:：\-]?\s*/i, '').trim();
    const reason = match2[1].replace(/^(?:कारण|Reason)\s*(?:\([Rr]\)|-[Rr]|:|\b[Rr]\b)?\s*[:：\-]?\s*/i, '').trim();
    const cleaned = questionText
      .replace(/(?:अभिकथन|Assertion|दावा)\s*(?:\([Aa]\)|-[Aa]|:|\b[Aa]\b)\s*[:：\-]?\s*[\s\S]+?(?=(?:कारण|Reason)|$)/gi, '')
      .replace(/(?:कारण|Reason)\s*(?:\([Rr]\)|-[Rr]|:|\b[Rr]\b)\s*[:：\-]?\s*[\s\S]+?(?=\n\s*(?:A\)|[A-D]\)|Option|विकल्प|उत्तर|Ans)|$)/gi, '')
      .replace(/<br\s*\/?>/gi, ' ')
      .trim();

    return {
      assertion,
      reason,
      cleanedQuestion: cleaned || 'नीचे दिए गए अभिकथन और कारण पर विचार कीजिए तथा सही विकल्प चुनिए:',
    };
  }

  // Check statements array
  if (statements && statements.length >= 2) {
    const aStmt = statements.find(s => /^(?:Assertion|अभिकथन|दावा|\(?[Aa]\)?)/i.test(s));
    const rStmt = statements.find(s => /^(?:Reason|कारण|\(?[Rr]\)?)/i.test(s));
    if (aStmt && rStmt) {
      return {
        assertion: aStmt.replace(/^(?:Assertion|अभिकथन|दावा)\s*(?:\([Aa]\)|-[Aa]|:|\b[Aa]\b)?\s*[:：\-]?\s*/i, '').trim(),
        reason: rStmt.replace(/^(?:Reason|कारण)\s*(?:\([Rr]\)|-[Rr]|:|\b[Rr]\b)?\s*[:：\-]?\s*/i, '').trim(),
        cleanedQuestion: questionText,
      };
    }
  }

  return null;
}

export function buildMatchStatements(matchColumns: MatchColumnData): string[] {
  if (!matchColumns || !matchColumns.rows || matchColumns.rows.length === 0) return [];
  return matchColumns.rows.map((r, i) => {
    const leftKey = r.leftKey || String.fromCharCode(65 + i);
    const rightKey = r.rightKey || String(i + 1);
    return `${leftKey}. ${r.leftText} — ${rightKey}. ${r.rightText}`;
  });
}

export function cleanMatchQuestionStem(questionText: string): string {
  if (!questionText) return '';
  const lines = questionText.replace(/<br\s*\/?>/gi, '\n').split('\n');
  const kept: string[] = [];

  const isInstruction = (str: string) =>
    /(?:सुमेलित|सुमेल\s+करें|सही\s+जोड़ी|मिलान|Match\s+the|दिए\s*गए\s*कूट\s*से|उत्तर\s*चुनिए)/i.test(str) ||
    /(?:(?:सूची|List)[- ]*[I1].*?को.*?(?:सूची|List)[- ]*[II2])/i.test(str);

  const isListLine = (str: string) =>
    /^(?:(?:सूची|List)[- ]*(?:I(?![I\w])|II|1|2\b)|खण्ड\s*['"‘]?[अबAB]|Khand\s*['"‘]?[अबAB])(?:\s*\([^)]*\))?\s*[:：\-.]/i.test(str);

  const isPairLine = (str: string) =>
    /(?:\||—|\t| {2,})\s*(?:(?:\(?([1-4a-dA-DIVXivx]+)\)?[\.\:\-]?\s*)?[^|—\t]{2,})$/.test(str);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Remove list lines like "सूची-I: a. हड़प्पा, b. मोहनजोदड़ो..."
    if (isListLine(line)) {
      continue;
    }
    // Remove table/pair header or rows: "सूची-I (विटामिन) | सूची-II (रोग)" or "a. विटामिन A | 1. स्कर्वी"
    if (isPairLine(line)) {
      continue;
    }
    // Remove koot / codes marker line
    if (/^(?:कूट\b|Codes?\b|दिए\s*गए\s*कूट|उपर्युक्त\s*कूट)/i.test(line)) {
      continue;
    }
    // Single list header without instruction: "सूची-I" or "खण्ड 'अ'"
    if (/^(?:(?:सूची|List)[- ]*(?:I(?![I\w])|II|1|2\b)|खण्ड\s*['"‘]?[अबAB]|Khand\s*['"‘]?[अबAB])(?:\s*\([^)]*\))?$/i.test(line)) {
      continue;
    }
    // If line starts with match item key in match area: "a. हड़प्पा"
    if (/^(?:[a-dA-D1-4IVXivx][\.\)\:\-]\s*)/i.test(line) && !isInstruction(line)) {
      continue;
    }

    kept.push(line);
  }

  const result = kept.join('\n').trim();
  return result || questionText;
}

/**
 * Parses sub-items from an inline string such as:
 * "a. हड़प्पा, b. मोहनजोदड़ो, c. कालीबंगन, d. लोथल"
 * or "1. सिन्धु, 2. रावी, 3. भोगवा, 4. घग्घर"
 */
function parseInlineMatchItems(line: string): { key: string; text: string }[] {
  // Strip header part like "सूची-I (पुरातात्विक स्थल):" or "सूची-I:" or "खण्ड 'अ':"
  const content = line.replace(/^(?:(?:सूची|List)[- ]*(?:I(?![I\w])|II|1|2\b)|खण्ड\s*['"‘]?[अबAB]|Khand\s*['"‘]?[अबAB])(?:\s*\([^)]*\))?\s*[:：\-.]?\s*/i, '').trim();
  const regex = /(?:\(?([a-dA-D1-4IVXivx]+)\)?[\.\:\-]?\s*)([^,;|\n]+?)(?=(?:[,;|\n]\s*(?:\(?[a-dA-D1-4IVXivx]+\)?[\.\:\-]?\s*))|$)/g;
  const items: { key: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(content)) !== null) {
    const text = m[2]?.trim().replace(/\s*(?:कूट|Codes?)\s*[:：/]?.*$/i, '').trim();
    if (text) {
      items.push({ key: m[1], text });
    }
  }
  return items;
}

/**
 * Extracts Match Column items (सूची-I / List-I vs सूची-II / List-II)
 */
export function extractMatchColumns(questionText: string, statements?: string[]): MatchColumnData | null {
  const allText = (questionText + '\n' + (statements || []).join('\n')).replace(/<br\s*\/?>/gi, '\n');

  // Trigger words: Support Khand A / B, Suchi I / II, List I / II, Milan karein, Sumelit karein
  const isMatchTrigger = /(?:सूची[- ]?[I1]|List[- ]?[I1]|खण्ड\s*['"‘]?[अAab]|Khand\s*['"‘]?[अAab]|सुमेलित\s+कीजिए|सुमेल\s+करें|सही\s+जोड़ी|मिलान\s+करें|Match\s+the\s+column|Match\s+the\s+following|कूट\b|Codes?\b)/i.test(allText);
  if (!isMatchTrigger) return null;

  const lines = allText.split('\n').map(l => l.trim()).filter(Boolean);
  const rows: MatchColumnRow[] = [];
  let list1Title = "खण्ड 'अ' (सूची-I)";
  let list2Title = "खण्ड 'ब' (सूची-II)";

  const isList1 = (str: string) => /(?:(?:सूची|List)[- ]*(?:I(?![I\w])|1\b)|खण्ड\s*['"‘]?[अA]|Khand\s*['"‘]?[अA])/i.test(str);
  const isList2 = (str: string) => /(?:(?:सूची|List)[- ]*(?:II|2\b)|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB])/i.test(str);

  // Check header line: e.g. "सूची-I (विटामिन) | सूची-II (रोग)" or "खण्ड 'अ' (विटामिन) | खण्ड 'ब' (रोग)"
  for (const line of lines) {
    const headerMatch = line.match(/(?:(?:सूची[- ]*(?:I(?![I\w])|1\b)|List[- ]*(?:I(?![I\w])|1\b)|खण्ड\s*['"‘]?[अA]|Khand\s*['"‘]?[अA]))\s*(?:\((.*?)\))?.*?(?:\||vs|—|-|\t| {3,}).*?(?:(?:सूची[- ]*(?:II|2\b)|List[- ]*(?:II|2\b)|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB]))\s*(?:\((.*?)\))?/i);
    if (headerMatch) {
      list1Title = headerMatch[1] ? `खण्ड 'अ' (${headerMatch[1].trim()})` : "खण्ड 'अ' (सूची-I)";
      list2Title = headerMatch[2] ? `खण्ड 'ब' (${headerMatch[2].trim()})` : "खण्ड 'ब' (सूची-II)";
      break;
    }
  }

  // ── Strategy 1: Inline lists on single lines ──
  // E.g.: "सूची-I: a. हड़प्पा, b. मोहनजोदड़ो, c. कालीबंगन, d. लोथल"
  //       "सूची-II: 1. सिन्धु, 2. रावी, 3. भोगवा, 4. घग्घर"
  const list1InlineLine = lines.find(l => isList1(l) && !/(?:को|सुमेलित|Match\s+the|जोड़ी|मिलाइए)/i.test(l) && !l.includes('|'));
  const list2InlineLine = lines.find(l => isList2(l) && !/(?:को|सुमेलित|Match\s+the|जोड़ी|मिलाइए)/i.test(l) && !l.includes('|'));

  if (list1InlineLine && list2InlineLine) {
    const t1Match = list1InlineLine.match(/(?:(?:सूची|List)[- ]*(?:I(?![I\w])|1\b)|खण्ड\s*['"‘]?[अA]|Khand\s*['"‘]?[अA])\s*(?:\((.*?)\))?/i);
    if (t1Match && t1Match[1]) list1Title = `सूची-I (${t1Match[1].trim()})`;

    const t2Match = list2InlineLine.match(/(?:(?:सूची|List)[- ]*(?:II|2\b)|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB])\s*(?:\((.*?)\))?/i);
    if (t2Match && t2Match[1]) list2Title = `सूची-II (${t2Match[1].trim()})`;

    const leftInlineItems = parseInlineMatchItems(list1InlineLine);
    const rightInlineItems = parseInlineMatchItems(list2InlineLine);

    if (leftInlineItems.length >= 2 && rightInlineItems.length >= 2) {
      const count = Math.min(leftInlineItems.length, rightInlineItems.length);
      for (let i = 0; i < count; i++) {
        rows.push({
          leftKey: leftInlineItems[i].key.toUpperCase(),
          leftText: leftInlineItems[i].text,
          rightKey: rightInlineItems[i].key,
          rightText: rightInlineItems[i].text,
        });
      }
    }
  }

  // ── Strategy 2: Pair lines like: "a. विटामिन A | 1. स्कर्वी" or "a. विटामिन A   1. स्कर्वी" ──
  if (rows.length === 0) {
    for (const line of lines) {
      const cleanLine = line.replace(/^\||\|$/g, '').trim();
      const pairMatch = cleanLine.match(/^(?:(?:\(?([a-dA-D1-4])\)?[\.\:\-]?\s*)?([^|—\t]{2,}))\s*(?:\||—|\t| {2,})\s*(?:(?:\(?([1-4a-dA-DIVXivx]+)\)?[\.\:\-]?\s*)?([^|—\t]{2,}))$/);
      if (pairMatch) {
        const leftKey = pairMatch[1] || '';
        const leftText = pairMatch[2]?.trim() || '';
        const rightKey = pairMatch[3] || '';
        const rightText = pairMatch[4]?.trim() || '';

        if (leftText && rightText && !/(?:सूची|List|खण्ड|Khand|कूट|Code)/i.test(leftText)) {
          rows.push({
            leftKey,
            leftText,
            rightKey,
            rightText,
          });
        }
      }
    }
  }

  // ── Strategy 3: Statements look like pairs: "a. X - 1. Y" or "A. X — 1. Y" ──
  if (rows.length === 0 && statements && statements.length >= 2) {
    for (const stmt of statements) {
      const m = stmt.match(/^(?:\(?([a-dA-D])\)?[\.\:\-]?\s*)?([^—\-:]{2,})\s*(?:[—\-:]|\|)\s*(?:\(?([1-4IVXivx]+)\)?[\.\:\-]?\s*)?(.+)$/);
      if (m) {
        rows.push({
          leftKey: m[1] || '',
          leftText: m[2]?.trim() || '',
          rightKey: m[3] || '',
          rightText: m[4]?.trim() || '',
        });
      }
    }
  }

  // ── Strategy 4: Two vertical blocks (Khand A items followed by Khand B items) ──
  if (rows.length === 0) {
    const leftItems: { key: string; text: string }[] = [];
    const rightItems: { key: string; text: string }[] = [];
    let currentBlock: 'none' | 'left' | 'right' = 'none';

    for (const line of lines) {
      if (/^(?:कूट\b|Codes?\b|दिए\s*गए\s*कूट|उपर्युक्त\s*कूट|Ans|Answer|सही\s*उत्तर)/i.test(line)) {
        currentBlock = 'none';
        break;
      }

      // If line is intro / instructions mentioning both lists, don't trigger header
      const isIntro = /(?:सुमेलित|सुमेल\s+करें|सही\s+जोड़ी|मिलान|Match\s+the)/i.test(line) ||
        (isList1(line) && isList2(line));
      if (isIntro) {
        continue;
      }

      if (isList1(line) && !line.includes('|')) {
        currentBlock = 'left';
        const tMatch = line.match(/(?:सूची[- ]*(?:I(?![I\w])|1\b)|List[- ]*(?:I(?![I\w])|1\b)|खण्ड\s*['"‘]?[अA]|Khand\s*['"‘]?[अA])\s*(?:\((.*?)\))?/i);
        if (tMatch && tMatch[1]) {
          list1Title = `सूची-I (${tMatch[1].trim()})`;
        } else if (line.length <= 30 && !line.includes('को')) {
          list1Title = line;
        }
        // If this line also has inline items, parse them!
        const inline = parseInlineMatchItems(line);
        if (inline.length > 0) {
          leftItems.push(...inline);
        }
        continue;
      }
      if (isList2(line) && !line.includes('|')) {
        currentBlock = 'right';
        const tMatch = line.match(/(?:सूची[- ]*(?:II|2\b)|List[- ]*(?:II|2\b)|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB])\s*(?:\((.*?)\))?/i);
        if (tMatch && tMatch[1]) {
          list2Title = `सूची-II (${tMatch[1].trim()})`;
        } else if (line.length <= 30 && !line.includes('को')) {
          list2Title = line;
        }
        // If this line also has inline items, parse them!
        const inline = parseInlineMatchItems(line);
        if (inline.length > 0) {
          rightItems.push(...inline);
        }
        continue;
      }

      // Check item with key
      const itemMatch = line.match(/^(?:\(?([a-dA-D1-4IVXivx])\)?[\.\:\-]?\s*)(.+)$/);
      if (itemMatch) {
        const key = itemMatch[1];
        let text = itemMatch[2].trim().replace(/\s*(?:कूट|Codes?)\s*[:：/]?.*$/i, '').trim();
        if (currentBlock === 'left' || (/^[a-dA-D]$/i.test(key) && currentBlock === 'none')) {
          leftItems.push({ key: key.toUpperCase(), text });
        } else if (currentBlock === 'right' || (/^[1-4]$/.test(key) && currentBlock === 'none')) {
          rightItems.push({ key, text });
        }
      } else if (currentBlock === 'left' && line.length > 1 && !line.includes('?')) {
        leftItems.push({ key: String.fromCharCode(65 + leftItems.length), text: line.replace(/\s*(?:कूट|Codes?)\s*[:：/]?.*$/i, '').trim() });
      } else if (currentBlock === 'right' && line.length > 1 && !line.includes('?')) {
        rightItems.push({ key: String(rightItems.length + 1), text: line.replace(/\s*(?:कूट|Codes?)\s*[:：/]?.*$/i, '').trim() });
      }
    }

    if (leftItems.length >= 2 && rightItems.length >= 2) {
      const count = Math.min(leftItems.length, rightItems.length);
      for (let i = 0; i < count; i++) {
        rows.push({
          leftKey: leftItems[i].key,
          leftText: leftItems[i].text,
          rightKey: rightItems[i].key,
          rightText: rightItems[i].text,
        });
      }
    }
  }

  // Deduplicate rows by leftKey and leftText
  const uniqueRows: MatchColumnRow[] = [];
  const seenLeft = new Set<string>();
  for (const r of rows) {
    const k = (r.leftKey || '').toLowerCase() + '|' + (r.leftText || '').toLowerCase().trim();
    const txtKey = (r.leftText || '').toLowerCase().trim();
    if (!seenLeft.has(k) && !seenLeft.has(txtKey)) {
      seenLeft.add(k);
      seenLeft.add(txtKey);
      uniqueRows.push(r);
    }
  }

  if (uniqueRows.length >= 2) {
    return {
      list1Title,
      list2Title,
      rows: uniqueRows,
    };
  }

  return null;
}

/**
 * Detects Chronological Order / Sequencing questions
 */
export function extractChronology(questionText: string, options?: string[]): { isChronology: boolean; steps?: string[] } {
  const isChronoTrigger = /(?:कालानुक्रम|कालक्रम|सही\s+क्रम|कालक्रमानुसार|chronological|chronology|chronological\s+order|घटनाओं\s+का\s+क्रम|आरोही\s+क्रम|अवरोही\s+क्रम|पहले\s+से\s+बाद)/i.test(questionText);
  const optionsHaveArrows = options?.some(opt => /→|\\rightarrow|->|>|\b[1-4]\s*,\s*[1-4]\s*,\s*[1-4]\b/i.test(opt));

  return {
    isChronology: isChronoTrigger || Boolean(optionsHaveArrows),
  };
}

/**
 * Detects Data Sufficiency questions
 */
export function extractDataSufficiency(questionText: string, options?: string[]): boolean {
  const isDsTrigger = /(?:आंकड़ों\s+की\s+पर्याप्तता|डेटा\s+पर्याप्तता|data\s+sufficiency|पर्याप्त\s+है|पर्याप्त\s+हैं)/i.test(questionText);
  const optionsHaveSufficiency = options?.some(opt =>
    /(?:कथन\s*[I1]\s*(?:अकेले|उत्तर\s+देने\s+के\s+लिए)?\s*पर्याप्त|statement\s*[1I]\s*(?:alone)?\s*is\s*sufficient|दोनों\s+कथन\s+मिलकर\s+पर्याप्त|कथन\s*II\s*पर्याप्त)/i.test(opt)
  );

  return isDsTrigger || Boolean(optionsHaveSufficiency);
}

export function extractCaseStudy(questionText: string, explicitCaseStudy = false): { passage?: string; cleanedQuestion: string } | null {
  if (!questionText) return null;
  const normalized = questionText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .trim();
  const passageQuestionLead = /(?:प्रश्न\s*[:：.]?|Q(?:uestion)?\s*[:.]?|(?:उपर्युक्त|उपरोक्त|इस|दिए गए)\s+गद्यांश|गद्यांश\s+(?:के\s+(?:अनुसार|आधार)|को\s*पढ़कर)|(?:based on|according to)\s+(?:the\s+)?passage)/i;
  const marker = /<PASSAGE>|\[गद्यांश\]|\[CASE_STUDY\]|\[पैसेज\]|गद्यांश\s*[:：.\-]?|पैसेज\s*[:：.\-]?|अपठित\s+गद्यांश\s*[:：.\-]?|निर्देश[^\n]*(?:गद्यांश|पैसेज|Passage)|Passage\s*[:：.\-]?|Comprehension\s*[:：.\-]?|Case\s*Study\s*[:：.\-]?/i.exec(normalized);

  if (marker) {
    const passageStart = marker.index + marker[0].length;
    const afterMarker = normalized.slice(passageStart);
    const boundaries = [
      /<\/PASSAGE>|\[\/गद्यांश\]|\[\/CASE_STUDY\]|\[\/पैसेज\]/i,
      /\n\s*(?:प्रश्न\s*[:：.]?\s*|Q(?:uestion)?\s*[:.]?\s*)/i,
      /\n[ \t]*(?:\n[ \t]*)?(?=(?:उपर्युक्त|उपरोक्त|इस|दिए गए)\s+गद्यांश|गद्यांश\s+(?:के\s+(?:अनुसार|आधार)|को\s*पढ़कर)|(?:based on|according to)\s+(?:the\s+)?passage)/i,
    ];
    const boundaryMatches = boundaries
      .map(pattern => pattern.exec(afterMarker))
      .filter((match): match is RegExpExecArray => match !== null)
      .sort((a, b) => a.index - b.index);
    const boundary = boundaryMatches[0];

    const cleanPassageText = (raw: string) =>
      raw
        .replace(/<\/PASSAGE>|\[\/गद्यांश\]|\[\/CASE_STUDY\]|\[\/पैसेज\]/gi, '')
        .trim();

    if (!boundary) {
      // If no explicit boundary, check if last line/paragraph is a question stem
      const lines = afterMarker.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        const lastLineIdx = lines.length - 1;
        const lastLine = lines[lastLineIdx];
        const isQLine = /[?？]\s*$/.test(lastLine) || /(?:क्या|कौन|किसे|किसने|कहाँ|कब|क्यों|चुनिए|बताइए|सत्य|असत्य|उचित|सही विकल्प|उपर्युक्त|उपरोक्त|Which|What|Who|Where|When|Why|How)/i.test(lastLine);
        if (isQLine) {
          const passage = cleanPassageText(lines.slice(0, lastLineIdx).join('\n'));
          const prefix = normalized.slice(0, marker.index).trim();
          const cleanedQuestion = [prefix, lastLine].filter(Boolean).join('\n');
          if (passage) {
            return { passage, cleanedQuestion: cleanedQuestion || questionText };
          }
        }
      }

      // If entire afterMarker is the passage (e.g. standalone passage block before questions)
      const fullPassage = cleanPassageText(afterMarker);
      if (fullPassage.length >= 10) {
        return {
          passage: fullPassage,
          cleanedQuestion: normalized.slice(0, marker.index).trim() || '',
        };
      }
      return null;
    }

    const passage = cleanPassageText(afterMarker.slice(0, boundary.index));
    const prefix = normalized.slice(0, marker.index).trim();
    const suffix = afterMarker.slice(boundary.index + boundary[0].length).replace(/^[ \t]*<\/PASSAGE>|^[ \t]*\[\/गद्यांश\]/i, '').trim();
    const cleanedQuestion = [prefix, suffix].filter(Boolean).join('\n');
    if (passage) {
      return {
        passage,
        cleanedQuestion: cleanedQuestion || questionText,
      };
    }
  }

  const unmarkedBoundary = new RegExp(`\\n\\s*(?=${passageQuestionLead.source})`, 'i').exec(normalized);
  if (unmarkedBoundary) {
    const passage = normalized.slice(0, unmarkedBoundary.index).trim();
    const cleanedQuestion = normalized.slice(unmarkedBoundary.index + unmarkedBoundary[0].length).trim();
    if (passage && cleanedQuestion) {
      return { passage, cleanedQuestion };
    }
  }

  // Some imported questions store the passage and its question together as
  // separate paragraphs without a <PASSAGE> marker or a passage field.
  const paragraphs = normalized.split(/\n[ \t]*\n/);
  const questionParagraphIndex = paragraphs.findIndex((paragraph, index) => {
    if (index === 0) return false;
    if (passageQuestionLead.test(paragraph.trim())) return true;
    return explicitCaseStudy &&
      index === paragraphs.length - 1 &&
      paragraphs.slice(0, index).join('\n\n').trim().length >= 100 &&
      /[?？]\s*$/.test(paragraph.trim());
  });

  if (questionParagraphIndex > 0) {
    const passage = paragraphs.slice(0, questionParagraphIndex).join('\n\n').trim();
    const cleanedQuestion = paragraphs.slice(questionParagraphIndex).join('\n\n').trim();
    if (passage && cleanedQuestion) {
      return { passage, cleanedQuestion };
    }
  }

  return null;
}

/**
 * MAIN DETECTOR: Classifies any MCQ into one of the 8 Standard Competitive Exam Types
 */
export function detectQuestionType(q: Partial<MCQItem>): {
  type: MCQQuestionType;
  config: QuestionTypeBadgeConfig;
  assertionReason?: { assertion: string; reason: string; cleanedQuestion: string } | null;
  matchColumns?: MatchColumnData | null;
  caseStudy?: { passage?: string; cleanedQuestion: string } | null;
  isNegative: boolean;
  highlightedQuestion: string;
} {
  const explicitType = q.questionType;
  const qText = q.question || '';
  const stmts = q.statements || [];
  const options = q.options || [];

  // Check Assertion & Reason
  const arData = extractAssertionReason(qText, stmts);
  const isAR = explicitType === 'ASSERTION_REASON' || arData !== null || (
    /(?:अभिकथन|Assertion)/i.test(qText) && /(?:कारण|Reason)/i.test(qText)
  );

  // Check Match Column
  let mcData = q.matchColumns || extractMatchColumns(qText, stmts);
  if (mcData && mcData.rows && mcData.rows.length > 0) {
    const uniqueRows: MatchColumnRow[] = [];
    const seen = new Set<string>();
    for (const r of mcData.rows) {
      const k = (r.leftKey || '').toLowerCase() + '|' + (r.leftText || '').toLowerCase().trim();
      const txtKey = (r.leftText || '').toLowerCase().trim();
      if (!seen.has(k) && !seen.has(txtKey)) {
        seen.add(k);
        seen.add(txtKey);
        uniqueRows.push(r);
      }
    }
    mcData = {
      ...mcData,
      rows: uniqueRows,
    };
  }
  const isMC = explicitType === 'MATCH_COLUMN' || (mcData !== null && mcData.rows.length >= 2) || (
    /(?:सूची[- ]?[I1]|List[- ]?[I1])/i.test(qText) && /(?:सूची[- ]?[II2]|List[- ]?[II2])/i.test(qText)
  ) || options.some(opt => /^[a-dA-D][\-\:][1-4]/.test(opt));

  // Check Chronology
  const chrono = extractChronology(qText, options);
  const isChrono = explicitType === 'CHRONOLOGICAL' || chrono.isChronology;

  // Check Data Sufficiency
  const isDS = explicitType === 'DATA_SUFFICIENCY' || extractDataSufficiency(qText, options);

  // Check Case Study
  const caseData = extractCaseStudy(qText, explicitType === 'CASE_STUDY');
  const isCase = explicitType === 'CASE_STUDY' || Boolean(q.passage) || caseData !== null || (
    /(?:गद्यांश\s*(?:को\s*पढ़कर|के\s*आधार\s*पर)|read\s+the\s+passage|case\s+study)/i.test(qText)
  );

  // Check Negative / NOT trap
  const isNegative = hasNegativeTrap(qText);

  // Check Multi-Statement
  const hasMultipleStatements = stmts.length >= 2 || (
    /(?:निम्नलिखित\s+कथनों\s+पर\s+विचार|consider\s+the\s+following\s+statements)/i.test(qText)
  ) || options.some(opt => /(?:केवल\s*[12]|1\s*और\s*2\s*दोनों|Only\s*[12]|Neither\s*1\s*nor\s*2)/i.test(opt));

  let finalType: MCQQuestionType = 'DIRECT_MCQ';

  if (explicitType) {
    finalType = explicitType;
  } else if (isAR) {
    finalType = 'ASSERTION_REASON';
  } else if (isMC) {
    finalType = 'MATCH_COLUMN';
  } else if (isDS) {
    finalType = 'DATA_SUFFICIENCY';
  } else if (isChrono) {
    finalType = 'CHRONOLOGICAL';
  } else if (isCase) {
    finalType = 'CASE_STUDY';
  } else if (isNegative && !hasMultipleStatements) {
    finalType = 'NEGATIVE_NOT';
  } else if (hasMultipleStatements) {
    finalType = 'MULTI_STATEMENT';
  } else if (isNegative) {
    finalType = 'NEGATIVE_NOT';
  } else {
    finalType = 'DIRECT_MCQ';
  }

  const config = QUESTION_TYPES_CONFIG[finalType] || QUESTION_TYPES_CONFIG.DIRECT_MCQ;
  const highlightedQuestion = isNegative ? highlightNegativeInText(qText) : qText;

  return {
    type: finalType,
    config,
    assertionReason: arData,
    matchColumns: mcData,
    caseStudy: caseData,
    isNegative,
    highlightedQuestion,
  };
}
