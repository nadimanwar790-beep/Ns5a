import { MCQItem } from '../types';
import {
  detectQuestionType,
  extractMatchColumns,
  buildMatchStatements,
  cleanMatchQuestionStem,
  extractCaseStudy,
} from './questionTypeDetector';

/**
 * Normalize the markdown-heavy paste format used by coaching books before
 * parsing. The lightning marker is only a visual tag; it must never decide
 * whether a question has numbered statements.
 */
export function normalizeMcqPaste(raw: string): string {
    let text = raw.replace(/\r\n/g, '\n');
    text = text.replace(/^---+\s*$/gm, '');
    text = text.replace(/^###\s+.+$/gm, '');

    // Convert Devnagari numerals (०-९) to ASCII digits (0-9)
    text = text.replace(/[०-९]/g, (d) => String("०१२३४५६७८९".indexOf(d)));

    // Strip common AI chatbot preambles like "तालिका में दिए गए सभी 100 प्रश्नों को आपके वांछित प्रारूप (Q, Options, Answer, Explanation) में रूपांतरित कर प्रस्तुत किया गया है:"
    text = text.replace(/^(?:तालिका\s+में\s+दिए\s+गए|यहाँ\s+(?:\d+\s+)?प्रश्न|दिए\s+गए\s+प्रश्न|Sure,?\s+here\s+are|Here\s+are\s+the|Below\s+are\s+the)[^\n]*?(?:\n|$)/gim, '');
    // Strip inline conversational transitions like "ye 10 question ya तालिका में दिए गए सभी 100 प्रश्नों..." before a Q1. or Q11.
    text = text.replace(/(?:ye\s+\d+\s+question|तालिका\s+में\s+दिए\s+गए)[^\n]*?(?=\n\s*(?:Q\d+|Question\s+\d+|प्रश्न\s+\d+))/gi, '');

    // Remove duplicate/orphan answer labels before parsing. Lucent copies
    // sometimes put the answer label on one line and the answer on the next.
    text = text.replace(
        /^[ \t]*(?:\*{1,2})?\s*(?:सही\s*उत्तर|उत्तर|Ans(?:wer)?)\s*[:：]\s*(?:\*{1,2})?\s*$/gim,
        '',
    );
    text = text.replace(
        /\*\*\s*(?:सही\s*उत्तर|उत्तर|Ans(?:wer)?)\s*[:：]\s*\n+\s*(?=\*\*\s*(?:सही\s*उत्तर|उत्तर|Ans(?:wer)?))/gi,
        '',
    );

    // Strip visual/category markers from the beginning of question lines.
    text = text.replace(
        /^\s*\[(?:[⚡🔥💡🎯⭐✨🏆⚠️🌟][^\]]*?|[^\]]{1,10})\]\s*/gm,
        '',
    );
    // Normalize koot (codes) line for match questions so it acts as clear delimiter
    text = text.replace(/^\s*\*{0,2}\s*(?:कूट|Codes?)\s*[:：/]?\s*(?:Codes?)?\s*\*?\*?\s*$/gim, '\nकूट:');

    // 1. Move [Topic] prefixes placed before Q or numbers: e.g. "[Topic] Q74." or "[Topic] 74." -> "Q74. [Topic]"
    text = text.replace(/(?:^|\n)\s*(\[[^\]\n]{2,80}\])\s*Q\s*(\d+)[\.\:\-)]\s*/gi, '\nQ$2. $1 ');
    text = text.replace(/(?:^|\n)\s*(\[[^\]\n]{2,80}\])\s*(?:प्रश्न|Question)\s*(\d+)[\.\:\-)]\s*/gi, '\nQ$2. $1 ');
    text = text.replace(/(?:^|\n)\s*(\[[^\]\n]{2,80}\])\s*(\d{1,4})[\.\)\:\-]\s+(?=[^\n]+(?:\n+[ \t]*(?:\(?[A-Da-d]\)?[\.\:\-]|[\u0915-\u0918][\.\)])))/gi, '\nQ$2. $1 ');

    // 2. Convert all explicit Question/प्रश्न/प्र./Que/Ques variants to canonical "Q<n>. "
    // Handles: **Q1:**, Q1., Q.1, Q-1, Q 1:, Q1), Question 1:, Question 1., Que 1., Ques 1., Qstn 1.
    text = text.replace(/(?:^|\n)[ \t]*(?:\*\*\s*)?Q(?:uestion|ue|ues|stn)?\s*[:.\-]?\s*(\d+)\s*[:.\-)]\s*(?:\*\*)?/gi, '\nQ$1. ');
    // Handles: प्रश्न 1:, प्रश्न 1., प्रश्न: 1, प्रश्न संख्या 1, प्रश्न सं. 1, प्रश्न क्र. 1, प्र. 1., प्र 1:
    text = text.replace(/(?:^|\n)[ \t]*(?:\*\*\s*)?(?:प्रश्न(?:\s*संख्या|\s*सं|\s*क्र)?|प्र|Prashna)\s*[:.\-]?\s*(\d+)\s*[:.\-)]\s*(?:\*\*)?/gi, '\nQ$1. ');

    // 3. For bracketed/parenthesized question numbers like "(1) " or "[1] ", convert to "Q<n>. "
    text = text.replace(/(?:^|\n)[ \t]*(?:\*\*\s*)?(?:\(\s*(\d{1,4})\s*\)|\[\s*(\d{1,4})\s*\])\s*[:.\-]?\s+(?=[^\n]{2,})/gi, (_m, n1, n2) => `\nQ${n1 || n2}. `);

    // Convert old bold markdown question wrappers
    text = text.replace(/\*\*Q\s*(\d+)\s*[:.]\s*([\s\S]*?)\*\*/gi, (_m, n, q) =>
        `\nQ${n}. ${q.trim()}`,
    );
    text = text.replace(
        /\*\*\s*(?:प्रश्न|Question)\s*(\d+)\s*[:.\-]\s*([\s\S]*?)\*\*([^\n]*)/gi,
        (_m, n, q, rest) => {
            const combined = (String(q).trim() + ' ' + String(rest).trim())
                .trim()
                .replace(/\*\*$/, '')
                .replace(/\s*\((?:Easy|Medium|Hard|आसान|मध्यम|कठिन)[^)]*\)\s*$/i, '')
                .replace(/^\[(?:[⚡🔥💡🎯⭐✨🏆⚠️🌟][^\]]*?|[^\]]{1,10})\]\s*/g, '')
                .trim();
            return `\nQ${n}. ${combined}`;
        },
    );
    text = text.replace(/\*\*प्रश्न\s*[:：]?\*\*/gi, '__PRASHNA__');
    text = text.replace(/\*\*Question\s*[:：]?\*\*/gi, '__PRASHNA__');

    // Normalize bold answer labels before stripping presentation markdown.
    text = text.replace(
        /\*\*\s*(?:सही\s*उत्तर|उत्तर|Ans(?:wer)?)\s*[:：]\s*([^*]+?)\s*\*\*/gi,
        (_m, value) => `\n✅ Correct Answer: ${String(value).trim()}`,
    );
    text = text.replace(
        /\*\*(?:सही\s*उत्तर|उत्तर|Ans(?:wer)?)\s*[:：]?\*\*\s*/gi,
        '✅ Correct Answer: ',
    );
    text = text.replace(
        /(?:^|\n)\s*(?:Ans(?:wer)?|सही\s*उत्तर|उत्तर)\s*[:：=\-]\s*(?=[A-D1-4]|\([A-D1-4]\)|Option|विकल्प|[\u0900-\u097F\w\s]{1,40}\n)/gi,
        '\n✅ Correct Answer: ',
    );
    text = text.replace(/\*\*/g, '');

    // For unnumbered Lucent blocks, turn a line followed by A/B/C/D into a
    // canonical question marker.
    let questionNumber = 0;
    text = text.replace(/__PRASHNA__\s*/g, () => {
        questionNumber += 1;
        return `\nQ${questionNumber}. `;
    });

    const hasAnyQMarker = /^\s*Q\s*\d+[\.\)]/im.test(text);
    if (!hasAnyQMarker) {
        const lines = text.split('\n');
        const output: string[] = [];
        let counter = 0;
        for (let i = 0; i < lines.length; i += 1) {
            const line = lines[i];
            const next = (lines[i + 1] || '').trim();
            const looksLikeOptionStart =
                /^\s*\*?\s*(?:\([A-Da-d]\)|[A-Da-d])\s*(?:[\).:\-])?\s+\S/i.test(next);
            const isQuestionLine =
                looksLikeOptionStart &&
                line.trim().length > 0 &&
                !/✅|Correct Answer/i.test(line) &&
                !/^\s*\*?\s*(?:\([A-D]\)|[A-D])\s*(?:[\).:\-])?\s+\S/i.test(line);
            if (isQuestionLine) {
                counter += 1;
                output.push(
                    `Q${counter}. ${line.trim().replace(/^Q?\d+[.)]\s*/i, '')}`,
                );
            } else {
                output.push(line);
            }
        }
        text = output.join('\n');
    }

    return text;
}

export function extractStatements(questionText: string): { statements: string[], cleanedQuestion: string } {
    const statements: string[] = [];
    let cleanedQuestion = "";

    // Normalize horizontal statements if string has no newlines
    let normalized = questionText;
    if (!normalized.includes('\n') && !normalized.includes('<br')) {
        normalized = normalized
            .replace(/(?<=[^\n])\s*(?=(?:(?:कथन|Statement)\s*(?:\(?\s*[0-9IVXivxABab]+\s*\)?)?\s*[:.\-)]|\(?\d+[\)\.\:\-]\s*|\(?[IVXivx]+[\)\.\:\-]\s*))/gi, '\n')
            .replace(/(?<=[^\n])\s*(?=(?:उपर्युक्त|उपरोक्त|निम्नलिखित\s+में\s+से|कूट\b|which\s+of\s+the\s+above))/gi, '\n');
    }

    const lines = normalized.split(/<br\s*\/?>|\n/);
    let inStatementBlock = false;
    let currentStatement = "";
    const tempQuestionLines: string[] = [];
    const endingQuestionLines: string[] = [];

    // Supports:
    // 1. Bullets: * or - or • or ▪ or ◦
    // 2. "Statement 1", "कथन I", "अभिकथन (A)", "कारण (R)"
    // 3. Numbers "1.", "(1)", "1)"
    // 4. Roman "(i)", "I."
    // 5. Letter "(a)"
    const statementStartRegex = /^(?:(?:\*|-|•|▪|◦)\s+|(?:Statement|कथन|Assertion|Reason|अभिकथन|कारण)\s*(?:\(?\s*[0-9IVXivxABab]+\s*\)?)?\s*[:\-\.]?|\(?\d+[\)\.\:\-]\s*|\(?[IVXivx]+[\)\.\:\-]\s*|\(?[a-dA-D]\)[\s\:\.]*)/i;
    const endingQuestionRegex = /^(?:which\s+of\s+the|which\s+of\s+above|उपर्युक्त|उपरोक्त|choose\s+the|select\s+the|find\s+the|निम्नलिखित\s+में\s+से|कूट\b|कूट\s+का|उपर्युक्त\s+कथनों|\*\*\s*कूट|उपर्युक्त\s+में\s+से|उपरोक्त\s+में\s+से|सही\s+विकल्प|सही\s+कूट|दिए\s*गए\s*कूट)/i;

    let bulletCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i].trim();
        if (!rawLine) continue;

        const isBullet = /^(?:\*|-|•|▪|◦)\s+/.test(rawLine);

        if (statementStartRegex.test(rawLine)) {
            if (currentStatement) {
                statements.push(currentStatement.trim());
            }
            if (isBullet) {
                bulletCounter += 1;
                const cleanContent = rawLine.replace(/^(?:\*|-|•|▪|◦)\s+/, '').trim();
                currentStatement = `${bulletCounter}. ${cleanContent}`;
            } else {
                currentStatement = rawLine;
            }
            inStatementBlock = true;
        } else if (inStatementBlock) {
            if (endingQuestionRegex.test(rawLine) || /^(?:उपर्युक्त|उपरोक्त|इनमें\s+से)\s+.*(?:सही|गलत|सत्य|असत्य)/i.test(rawLine)) {
                if (currentStatement) {
                    statements.push(currentStatement.trim());
                    currentStatement = "";
                }
                inStatementBlock = false;
                endingQuestionLines.push(rawLine);
            } else {
                currentStatement += " " + rawLine;
            }
        } else {
            if (statements.length > 0) {
                endingQuestionLines.push(rawLine);
            } else {
                tempQuestionLines.push(rawLine);
            }
        }
    }

    if (currentStatement) {
        statements.push(currentStatement.trim());
    }

    cleanedQuestion = tempQuestionLines.join('<br/>');
    if (endingQuestionLines.length > 0) {
        cleanedQuestion += (cleanedQuestion ? "<br/><br/>" : "") + endingQuestionLines.join('<br/>');
    }

    return { statements, cleanedQuestion: cleanedQuestion || questionText };
}

function parseSimpleFormatBlock(block: string, topic: string): Partial<MCQItem> | null {
    // If multiple options are horizontal on the same line, split them
    let normalizedBlock = block.replace(/(?<=[^\n])\s{2,}(?=(?:\([A-Da-d\u0915-\u0918]\)|[A-Da-d\u0915-\u0918][\)\.\:\-]))/g, '\n');

    const lines = normalizedBlock.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length < 3) return null;

    // Detect question number and clean stem from lines[0]
    const questionNumberMatch = lines[0].match(/^\*{0,2}\s*(?:Q(?:uestion|ue|ues|stn)?|प्रश्न(?:\s*संख्या|\s*सं|\s*क्र)?|प्र)?\s*[:.\-]?\s*\(?(\d{1,4})\)?/i);

    let questionText = lines[0]
      .replace(/^\*{0,2}\s*(?:Q(?:uestion|ue|ues|stn)?|प्रश्न(?:\s*संख्या|\s*सं|\s*क्र)?|प्र)?\s*[:.\-]?\s*\(?\d{1,4}\)?[\.\:\-\)]\s*\*{0,2}/i, '')
      .replace(/^\*{0,2}\s*Q\s*\d+[\.\)]\s*\*{0,2}/i, '')
      .trim();

    // If lines[0] only contained the question number header (e.g. "Q1." alone on its line)
    if (!questionText && lines.length > 1) {
      questionText = lines[1];
    }

    if (!questionText) return null;

    // Detect if this question is a Match Column (सूची / सुमेलित) question
    const kootIdx = lines.findIndex(l => /^(?:\*{0,2}\s*)?(?:कूट\b|Codes?\b|दिए\s*गए\s*कूट|उपर्युक्त\s*कूट|सही\s*कूट)/i.test(l));
    const isMatchQuestion = kootIdx !== -1 || /(?:सूची[- ]?[I1]|List[- ]?[I1]|खण्ड\s*['"‘]?[अAab]|Khand\s*['"‘]?[अAab]|सुमेलित|सुमेल\s+करें|सही\s+जोड़ी|मिलान|Match\s+the\s+column|Match\s+the\s+following)/i.test(block);

    const isOptionLine = (l: string, idx: number) => {
        // Match list header lines or list lines are NEVER MCQ options
        if (/^(?:(?:सूची|List)[- ]*(?:I(?![I\w])|II|1|2\b)|खण्ड\s*['"‘]?[अबAB]|Khand\s*['"‘]?[अबAB])(?:\s*\([^)]*\))?\s*[:：\-.]/i.test(l)) return false;
        // If there's an explicit koot marker, lines before or on it are NOT MCQ options
        if (kootIdx !== -1 && idx <= kootIdx) return false;
        // Two columns separated by pipe, dash, tabs or multiple spaces are match rows, NOT options
        if (/(?:\||—|\t| {2,})\s*(?:(?:\(?([1-4a-dA-DIVXivx]+)\)?[\.\:\-]?\s*)?[^|—\t]{2,})$/.test(l)) return false;
        // In a match question without koot, lines under list 1 before list 2 are NOT options
        if (isMatchQuestion && kootIdx === -1) {
            const laterLines = lines.slice(idx + 1);
            if (laterLines.some(ll => /(?:सूची[- ]?[II2]|List[- ]?[II2]|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB]|^\s*[1-4][\.\:\)])/i.test(ll))) {
                return false;
            }
        }
        return /^\s*\*?\s*(?:\(([A-Da-d\u0915-\u0918])\)|\[([A-Da-d\u0915-\u0918])\]|([A-Da-d\u0915-\u0918]))\s*(?:[\).:\-])?\s+(.+)/i.test(l);
    };

    const isAnswerLine = (l: string) =>
      /^(?:\*{1,2}\s*)?(?:(?:Correct\s+)?Answer|Ans|सही\s*उत्तर|उत्तर)\s*[:：=\-]/i.test(l)
      || /^✅\s*Correct\s+Answer\s*[:：=\-]/i.test(l);
    const isExplainLine  = (l: string) => /^(?:Explanation|Exp|व्याख्या)\s*[:：=\-]/i.test(l);

    let bodyStart = 1; // index of first option/answer/explanation line
    const extraBodyLines: string[] = [];
    for (let i = 1; i < lines.length; i++) {
        if (isOptionLine(lines[i], i) || isAnswerLine(lines[i]) || isExplainLine(lines[i])) {
            bodyStart = i;
            break;
        }
        extraBodyLines.push(lines[i]);
        bodyStart = i + 1;
    }
    if (extraBodyLines.length > 0) {
        questionText = questionText + '\n' + extraBodyLines.join('\n');
    }

    // Collect option lines
    const optionMap: Record<number, string> = {};
    const starCorrects: number[] = [];
    let answerLine = '';
    let explanationLines: string[] = [];
    let collectingExplanation = false;

    const HINDI_TO_OPT: Record<string, string> = { 'क': 'A', 'ख': 'B', 'ग': 'C', 'घ': 'D' };

    for (let i = bodyStart; i < lines.length; i++) {
        const line = lines[i];

        // Option lines: *A) / *A: / A) / A. / A: / (A) / [A] / क) / (ख)
        const optionMatch = line.match(
          /^\s*(\*?)\s*(?:\(([A-Da-d\u0915-\u0918])\)|\[([A-Da-d\u0915-\u0918])\]|([A-Da-d\u0915-\u0918]))\s*(?:[\).:\-])?\s*(.+)/i,
        );
        if (optionMatch && !collectingExplanation) {
            const isCorrect = optionMatch[1] === '*';
            let letter = (optionMatch[2] || optionMatch[3] || optionMatch[4]).toUpperCase();
            if (HINDI_TO_OPT[letter]) letter = HINDI_TO_OPT[letter];
            const idx = letter.charCodeAt(0) - 65;
            if (idx >= 0 && idx < 4) {
                optionMap[idx] = optionMatch[5].trim();
                if (isCorrect) starCorrects.push(idx);
            }
            continue;
        }

        // Answer line: Ans: / Answer: / ✅ Correct Answer: / सही उत्तर: / उत्तर: / **सही उत्तर:
        if (/^(?:\*{1,2}\s*)?(?:(?:Correct\s+)?Answer|Ans|सही\s*उत्तर|उत्तर)\s*[:：=\-]/i.test(line) || /^✅\s*Correct\s+Answer\s*[:：=\-]/i.test(line)) {
            answerLine = line.replace(/^(?:\*{1,2}\s*)?(?:✅\s*)?(?:Correct\s+)?(?:Answer|Ans|सही\s*उत्तर|उत्तर)\s*[:：=\-]\s*/i, '').trim();
            continue;
        }

        // Explanation line: Explanation: / Exp: / व्याख्या:
        if (/^(?:Explanation|Exp|व्याख्या)\s*[:：=\-]/i.test(line)) {
            collectingExplanation = true;
            let expText = line.replace(/^(?:Explanation|Exp|व्याख्या)\s*[:：=\-]\s*/i, '').trim();
            // Clean any trailing conversational text before next question
            expText = expText.replace(/(?:ye\s+\d+\s+question|तालिका\s+में\s+दिए\s+गए|यहाँ\s+\d+\s+प्रश्न)[^\n]*$/i, '').trim();
            if (expText) explanationLines.push(expText);
            continue;
        }

        if (collectingExplanation) {
            const cleanLine = line.replace(/(?:ye\s+\d+\s+question|तालिका\s+में\s+दिए\s+गए|यहाँ\s+\d+\s+प्रश्न)[^\n]*$/i, '').trim();
            if (cleanLine) explanationLines.push(cleanLine);
        }
    }

    const options = [optionMap[0]||'', optionMap[1]||'', optionMap[2]||'', optionMap[3]||''].filter((_, i) => optionMap[i] !== undefined);
    if (Object.keys(optionMap).length < 2) return null;

    let correctAnswer: number | undefined;
    if (starCorrects.length > 0) {
        correctAnswer = starCorrects[0];
    } else if (answerLine) {
        const rawAns = answerLine.trim();
        let letter = '';
        const hindiMatch = rawAns.match(/[\(\[]?([क-घ])[\)\]]?/);
        if (hindiMatch && HINDI_TO_OPT[hindiMatch[1]]) {
          letter = HINDI_TO_OPT[hindiMatch[1]];
        } else {
          const letterMatch = rawAns.match(/(?:Option\s*)?[\(\[]?([A-D])(?:[\)\].:\s]|$)/i);
          if (letterMatch) letter = letterMatch[1].toUpperCase();
        }

        if (letter) {
            correctAnswer = ['A', 'B', 'C', 'D'].indexOf(letter);
        } else {
            const clean = answerLine.trim();
            const allOpts = [0, 1, 2, 3].map(index => optionMap[index] || '').filter(Boolean);
            const idx = allOpts.findIndex(o => clean.includes(o) || o.includes(clean));
            if (idx !== -1) correctAnswer = idx;
        }
    }

    if (correctAnswer === undefined || correctAnswer < 0) return null;

    const allOptions = [0, 1, 2, 3].map(index => optionMap[index] || '');

    const q: Partial<MCQItem> = {
        topic,
        ...(questionNumberMatch ? { questionNumber: questionNumberMatch[1] } : {}),
        question: questionText.replace(/\n/g, '<br/>'),
        options: allOptions,
        correctAnswer,
    };

    if (explanationLines.length > 0) {
        q.explanation = explanationLines.join(' ').trim();
    }

    return q;
}

export function parseMCQText(text: string): { questions: MCQItem[], notes: {title: string, content: string}[] } {
  const questions: MCQItem[] = [];
  const notes: {title: string, content: string}[] = [];
  text = normalizeMcqPaste(text);

  // ── Extract <NOTE: title>...</NOTE: title> blocks first ──────────────────
  // These are explicit note sections the user pastes alongside MCQs.
  const noteTagRegex = /<NOTE:\s*(.*?)>([\s\S]*?)<\/NOTE(?::\s*[^>]*)?>/gi;
  let noteMatch: RegExpExecArray | null;
  const extractedNoteRanges: { start: number; end: number }[] = [];

  while ((noteMatch = noteTagRegex.exec(text)) !== null) {
    const noteTitle = noteMatch[1].trim();
    const noteContent = noteMatch[2].trim();
    if (noteContent) {
      notes.push({ title: noteTitle, content: noteContent });
    }
    extractedNoteRanges.push({ start: noteMatch.index, end: noteMatch.index + noteMatch[0].length });
  }

  // Remove extracted NOTE blocks from the text so MCQ parser doesn't trip on them
  let cleanText = text;
  for (let i = extractedNoteRanges.length - 1; i >= 0; i--) {
    const { start, end } = extractedNoteRanges[i];
    cleanText = cleanText.slice(0, start) + cleanText.slice(end);
  }

  // ── Detect if text contains simple Q1./Q2., **प्रश्न 1.** or numbered format ──────
  const hasSimpleFormat = /^\s*(?:\*{0,2}\s*(?:Q(?:uestion|ue|ues|stn)?\s*[:.\-]?\s*\d+|प्रश्न(?:\s*संख्या|\s*सं|\s*क्र)?\s*[:.\-]?\s*\d+|प्र\s*[:.]\s*\d+|\(?\d{1,4}\)?[\.\:\-]\s+)|<TOPIC:|<PASSAGE>|\[गद्यांश\]|गद्यांश\s*[:：]|पैसेज\s*[:：])/im.test(cleanText)
    || /(?:(?:Correct\s+)?Answer|Ans|सही\s*उत्तर|उत्तर)\s*[:：=\-]/i.test(cleanText);

  if (hasSimpleFormat) {
    // ── SIMPLE FORMAT PARSER ─────────────────────────────────────────────────
    // Split by <TOPIC: ...> first to get topic sections
    const topicParts: { topic: string; content: string }[] = [];

    // Find all TOPIC tags and split content
    const topicMatches: { index: number; topic: string }[] = [];
    let tempMatch: RegExpExecArray | null;
    const topicFinder = new RegExp(/<TOPIC:\s*(.*?)>/gi);
    while ((tempMatch = topicFinder.exec(cleanText)) !== null) {
      topicMatches.push({ index: tempMatch.index, topic: tempMatch[1].trim() });
    }

    if (topicMatches.length === 0) {
      // No TOPIC tags — treat entire text as one block with default topic
      topicParts.push({ topic: 'General', content: cleanText });
    } else {
      // Content before first TOPIC tag
      if (topicMatches[0].index > 0) {
        const before = cleanText.slice(0, topicMatches[0].index).trim();
        if (before) topicParts.push({ topic: 'General', content: before });
      }
      // Content for each TOPIC section
      for (let i = 0; i < topicMatches.length; i++) {
        const topicEnd = topicMatches[i].index + cleanText.slice(topicMatches[i].index).match(/<TOPIC:\s*.*?>/i)![0].length;
        const contentEnd = i + 1 < topicMatches.length ? topicMatches[i + 1].index : cleanText.length;
        const content = cleanText.slice(topicEnd, contentEnd).trim();
        topicParts.push({ topic: topicMatches[i].topic, content });
      }
    }

    interface ContentBlock {
      type: 'passage' | 'question';
      content: string;
    }

    const splitContentIntoBlocks = (text: string): ContentBlock[] => {
      const lines = text.split('\n');
      const blocks: ContentBlock[] = [];
      let currentLines: string[] = [];
      let currentType: 'passage' | 'question' = 'question';
      let hasSeenOptions = false;
      let hasSeenAnswer = false;

      const isOption = (l: string) => /^\s*(\*?)\s*(?:\(([A-Da-d\u0915-\u0918])\)|\[([A-Da-d\u0915-\u0918])\]|([A-Da-d\u0915-\u0918]))\s*(?:[\).:\-])?\s+(.+)/i.test(l);
      const isAnswer = (l: string) => /^(?:\*{1,2}\s*)?(?:(?:Correct\s+)?Answer|Ans|सही\s*उत्तर|उत्तर)\s*[:：=\-]/i.test(l) || /^✅/i.test(l);
      const isExplicitQ = (l: string) => /^\s*\*{0,2}\s*(?:Q(?:uestion|ue|ues|stn)?\s*[:.\-]?\s*\d+|प्रश्न(?:\s*संख्या|\s*सं|\s*क्र)?\s*[:.\-]?\s*\d+|प्र\s*[:.]\s*\d+)/i.test(l);
      const isPassageHeader = (l: string) => /^(?:<PASSAGE>|\[गद्यांश\]|\[CASE_STUDY\]|\[पैसेज\]|गद्यांश\s*[:：]|पैसेज\s*[:：]|अपठित\s+गद्यांश\s*[:：]|निर्देश\s*[:：][^\n]*(?:गद्यांश|पैसेज)|Passage\s*[:：]|Comprehension\s*[:：]|Case\s*Study\s*[:：])/i.test(l);
      const isBareNumberQ = (l: string) => {
        const m = l.match(/^\s*\*{0,2}\s*(?:\(?\s*(\d{1,4})\s*[\.\)\:\-]\s*|\[\s*(\d{1,4})\s*\]\s*)/);
        if (!m) return null;
        return parseInt(m[1] || m[2], 10);
      };

      const flush = () => {
        if (currentLines.length > 0) {
          const content = currentLines.join('\n').trim();
          if (content) {
            blocks.push({ type: currentType, content });
          }
          currentLines = [];
          hasSeenOptions = false;
          hasSeenAnswer = false;
          currentType = 'question';
        }
      };

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          if (currentLines.length > 0) currentLines.push(line);
          continue;
        }

        if (isPassageHeader(trimmed)) {
          flush();
          currentType = 'passage';
          currentLines.push(line);
          continue;
        }

        if (isExplicitQ(trimmed)) {
          flush();
          currentType = 'question';
          currentLines.push(line);
          continue;
        }

        const num = isBareNumberQ(trimmed);
        if (num !== null) {
          const isStart = currentLines.length === 0 || hasSeenAnswer || hasSeenOptions || num > 5;
          if (isStart) {
            flush();
            currentType = 'question';
            currentLines.push(line);
            continue;
          }
        }

        if (isOption(trimmed)) hasSeenOptions = true;
        if (isAnswer(trimmed)) hasSeenAnswer = true;

        currentLines.push(line);
      }
      flush();
      return blocks;
    };

    let currentActivePassage = '';
    let passageRemainingCount: number | null = null;

    // For each topic section, split into question & passage blocks
    for (const { topic, content } of topicParts) {
      let cleanTopic = topic;
      const topicPassageMatch = topic.match(/^(.*?)(?:गद्यांश|Passage|पैसेज)\s*[:：\-]\s*([\s\S]+)$/i);
      if (topicPassageMatch) {
        cleanTopic = topicPassageMatch[1].trim() || 'General';
        currentActivePassage = topicPassageMatch[2].trim();
        passageRemainingCount = 5;
      }

      const blocks = splitContentIntoBlocks(content);

      for (const block of blocks) {
        if (block.type === 'passage') {
          const rawPassage = block.content;
          const rangeMatch = rawPassage.match(/(?:प्रश्न|Q(?:uestion)?)\s*(?:संख्या|सं)?\s*(\d+)\s*(?:से|to|-)\s*(\d+)/i)
            || rawPassage.match(/\((\d+)\s*(?:से|to|-)\s*(\d+)\)/i);
          if (rangeMatch) {
            const startQ = parseInt(rangeMatch[1], 10);
            const endQ = parseInt(rangeMatch[2], 10);
            if (endQ >= startQ) {
              passageRemainingCount = endQ - startQ + 1;
            }
          } else {
            passageRemainingCount = 5;
          }

          currentActivePassage = rawPassage
            .replace(/^(?:<PASSAGE>|\[गद्यांश\]|\[CASE_STUDY\]|\[पैसेज\]|गद्यांश\s*[:：]|पैसेज\s*[:：]|अपठित\s+गद्यांश\s*[:：]|निर्देश\s*[:：][^\n]*(?:गद्यांश|पैसेज)|Passage\s*[:：]|Comprehension\s*[:：]|Case\s*Study\s*[:：])\s*/i, '')
            .replace(/<\/PASSAGE>|\[\/गद्यांश\]|\[\/CASE_STUDY\]|\[\/पैसेज\]$/i, '')
            .trim();
          continue;
        }

        let trimmed = block.content.trim();
        if (!trimmed) continue;

        const parsed = parseSimpleFormatBlock(trimmed, cleanTopic);
        if (parsed && parsed.question && parsed.options && parsed.options.length >= 2 && parsed.correctAnswer !== undefined) {
          // Multi-statement extraction
          const statementData = extractStatements(parsed.question);
          if (statementData.statements.length > 0) {
            parsed.statements = statementData.statements;
            parsed.question = statementData.cleanedQuestion;
          }

          // If question contains inline passage, extract it
          const inlinePassage = extractCaseStudy(parsed.question);
          if (inlinePassage?.passage) {
            parsed.passage = inlinePassage.passage;
            currentActivePassage = inlinePassage.passage;
            passageRemainingCount = 5;
            if (inlinePassage.cleanedQuestion) {
              parsed.question = inlinePassage.cleanedQuestion;
            }
          } else if (!parsed.passage && currentActivePassage) {
            // Attach active passage
            parsed.passage = currentActivePassage;
            if (passageRemainingCount !== null) {
              passageRemainingCount--;
              if (passageRemainingCount <= 0) {
                currentActivePassage = '';
                passageRemainingCount = null;
              }
            }
          }

          // 8 Competition Question Types Detection & Enrichment
          const detected = detectQuestionType(parsed);
          parsed.questionType = parsed.passage ? 'CASE_STUDY' : detected.type;
          if (detected.assertionReason) {
            parsed.assertion = detected.assertionReason.assertion;
            parsed.reason = detected.assertionReason.reason;
            if (detected.assertionReason.cleanedQuestion) {
              parsed.question = detected.assertionReason.cleanedQuestion;
            }
          }
          if (detected.matchColumns) {
            parsed.matchColumns = detected.matchColumns;
            parsed.questionType = 'MATCH_COLUMN';
            parsed.statements = buildMatchStatements(detected.matchColumns);
            const cleanStem = cleanMatchQuestionStem(parsed.question);
            if (cleanStem) {
              parsed.question = cleanStem;
            }
          }
          if (detected.caseStudy?.passage && !parsed.passage) {
            parsed.passage = detected.caseStudy.passage;
            if (detected.caseStudy.cleanedQuestion) {
              parsed.question = detected.caseStudy.cleanedQuestion;
            }
          }
          if (detected.isNegative) {
            parsed.negativeHighlight = 'NOT';
          }

          questions.push(parsed as MCQItem);
        }
      }
    }

    const hybrid = Object.assign([...questions], { questions, notes });
    return hybrid as any;
  }

  // ── STRUCTURED/EMOJI FORMAT PARSER (original logic) ─────────────────────
  let activeMainTopic: string | null = null;

  const markerRegex = /(?:\*\*Question\s+(\d+)\*\*|Question\s+(\d+):?)/ig;
  const markers = [...cleanText.matchAll(markerRegex)];
  const blocks: { content: string; questionNumber?: string }[] = [];
  if (markers.length > 0) {
    markers.forEach((marker, index) => {
      const start = (marker.index || 0) + marker[0].length;
      const end = index + 1 < markers.length ? (markers[index + 1].index || cleanText.length) : cleanText.length;
      blocks.push({
        content: cleanText.slice(start, end),
        questionNumber: marker[1] || marker[2],
      });
    });
  } else {
    blocks.push({ content: cleanText });
  }

  blocks.forEach(({ content: block, questionNumber }, blockIndex) => {
    let q: Partial<MCQItem> = {};
    if (questionNumber) q.questionNumber = questionNumber;

    const allTopicMatches = [...block.matchAll(/<TOPIC:\s*(.*?)>/ig)];
    if (blockIndex === 0 && allTopicMatches.length > 0) {
        activeMainTopic = allTopicMatches[allTopicMatches.length - 1][1].trim();
    }

    const cleanedBlock = block.replace(/###\s*<TOPIC:\s*.*?>/ig, '').replace(/<TOPIC:\s*.*?>/ig, '').trim();

    const pyqMatch = cleanedBlock.match(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/i);
    if (pyqMatch) {
      q.pyqInspired = pyqMatch[1].trim();
      q.examYear = q.examYear || pyqMatch[1].trim();
    }

    const yearMatch = cleanedBlock.match(/(?:📅\s*)?(?:Year|वर्ष|Exam\s*Year|परीक्षा\s*वर्ष)\s*[:：\-]\s*([^\n\r]+)/i);
    const tagYearMatch = cleanedBlock.match(/<YEAR:\s*(.*?)>/i);
    if (tagYearMatch) {
      q.year = tagYearMatch[1].trim();
      q.examYear = tagYearMatch[1].trim();
    } else if (yearMatch) {
      q.year = yearMatch[1].trim();
      q.examYear = yearMatch[1].trim();
    }

    const topicMatch = cleanedBlock.match(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/i);

    if (activeMainTopic) {
        q.topic = activeMainTopic;
    } else if (topicMatch) {
        q.topic = topicMatch[1].trim();
    } else {
        q.topic = "General";
    }

    const hasAlphabetOptions = /(?:\n\s*[A-D][\)\.])/.test(cleanedBlock);

    let questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:Options(?:\s*\(विकल्प\))?:|विकल्प:))/i);
    if (!questionMatch) {
        if (hasAlphabetOptions) {
            questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:\n\s*[A-D][\)\.]))/i);
        } else {
            questionMatch = cleanedBlock.match(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?(?:\s*❓\s*Question:?)?\s*([\s\S]*?)(?=(?:\n\s*[1-4][\)\.]))/i);
        }
    }

    if (!questionMatch) {
        const optionsIdxMatch = cleanedBlock.match(/(?:Options(?:\s*\(विकल्प\))?:|विकल्प:|\n\s*[A-D1-4][\)\.])/i);
        if (optionsIdxMatch && optionsIdxMatch.index !== undefined) {
             let potentialQuestion = cleanedBlock.substring(0, optionsIdxMatch.index);
             potentialQuestion = potentialQuestion.replace(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:❓\s*)?(?:\*\*)?Question(?:\s*\(प्रश्न\))?:?(?:\*\*)?/ig, '');
             q.question = potentialQuestion.trim();
        }
    }

    if (!q.question && !questionMatch) {
         const optionsIdxMatch = cleanedBlock.match(/(?:Options(?:\s*\(विकल्प\))?:|विकल्प:|\n\s*[A-D1-4][\)\.])/i);
         if (optionsIdxMatch && optionsIdxMatch.index !== undefined) {
             let potentialQuestion = cleanedBlock.substring(0, optionsIdxMatch.index);
             potentialQuestion = potentialQuestion.replace(/(?:🔥\s*)?PYQ Inspired:\s*(.+)/ig, '');
             potentialQuestion = potentialQuestion.replace(/(?:📖\s*)?(?:Topic|विषय).*?:\s*(.+)/ig, '');
             q.question = potentialQuestion.trim();
         }
    }

    if (questionMatch || q.question) {
      if (questionMatch) {
          q.question = questionMatch[1].trim();
      } else {
          q.question = q.question!.trim();
      }
      q.question = q.question.replace(/^(?:Q?\d+[\.\)\-]\s*)/i, '');
      q.question = q.question.replace(/\*\*/g, '');
      q.question = q.question.replace(/^\[.*?\]\s*/g, '');
      q.question = q.question.replace(/\n?\s*कूट\s*:?\s*$/gi, '').trim();
      q.question = q.question.replace(/\n/g, '<br/>');

      const statementData = extractStatements(q.question);
      if (statementData.statements.length > 0) {
          q.statements = statementData.statements;
          q.question = statementData.cleanedQuestion;
      }
    }

    let optionsMatch = cleanedBlock.match(/(?:(?:Options(?:\s*\(विकल्प\))?:|विकल्प:)\s*)([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
    if (!optionsMatch) {
        if (hasAlphabetOptions) {
            optionsMatch = cleanedBlock.match(/(?:\n\s*[A-D][\)\.])([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
            if (optionsMatch) {
                optionsMatch[1] = cleanedBlock.match(/(?:\n\s*[A-D][\)\.])/i)![0] + optionsMatch[1];
            }
        } else {
            optionsMatch = cleanedBlock.match(/(?:\n\s*[1-4][\)\.])([\s\S]*?)(?=✅|(?:Correct Answer(?:\s*\(सही उत्तर\))?:))/i);
            if (optionsMatch) {
                optionsMatch[1] = cleanedBlock.match(/(?:\n\s*[1-4][\)\.])/i)![0] + optionsMatch[1];
            }
        }
    }

    if (optionsMatch) {
      const optionsText = optionsMatch[1].trim();
      const optionLines = optionsText.split(/\n/).map(line => line.trim()).filter(line => /^(?:[A-D]|[1-4])[\)\.](?:\s|$)/i.test(line));

      if (optionLines.length >= 2) {
          q.options = [0, 1, 2, 3].map(index => (
            optionLines[index]
              ? optionLines[index].replace(/^(?:[A-D]|[1-4])[\)\.]\s*/i, '').trim()
              : ''
          ));
      }
    }

    const answerMatch = cleanedBlock.match(/(?:✅\s*)?(?:\*\*)?Correct Answer(?:\s*\(सही उत्तर\))?:?(?:\*\*)?(?:\s*✅\s*Correct Answer:?)?\s*([\s\S]*?)(?=💡|🔎|🎯|⚠|🧠|📊|Concept|Explanation|व्याख्या|Solution|Sol\b|हल|Reason|कारण|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (answerMatch) {
        const rawAns = answerMatch[1].trim();
        const letterMatch = rawAns.match(/^([A-D])(?:[\)\.]|$)/i);
        if (letterMatch) {
            const letter = letterMatch[1].toUpperCase();
            q.correctAnswer = ['A', 'B', 'C', 'D'].indexOf(letter);
        } else if (q.options) {
            const ansTextClean = rawAns.replace(/^(?:[A-D])(?:[\)\.]|$)\s*/i, '').trim();
            const index = q.options.findIndex(opt => ansTextClean.includes(opt) || opt.includes(ansTextClean));
            if (index !== -1) {
                q.correctAnswer = index;
            }
        }
    }

    const conceptMatch = block.match(/(?:💡\s*)?(?:\*\*)?Concept(?:\s*\(अवधारणा\))?:?(?:\*\*)?(?:\s*💡\s*Concept:?)?\s*([\s\S]*?)(?=🔎|🎯|⚠|🧠|📊|Explanation|व्याख्या|Solution|Sol\b|हल|Reason|कारण|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (conceptMatch) q.concept = conceptMatch[1].trim();

    const explanationMatch = block.match(
      /(?:🔎\s*)?(?:\*\*)?(?:Explanation(?:\s*\(व्याख्या\))?|व्याख्या(?:\s*\(Explanation\))?|Solution|Sol\b|हल|Reason|कारण|Ans\.?\s*Explanation):?\s*(?:\*\*)?(?:\s*🔎\s*(?:Explanation|व्याख्या):?)?\s*([\s\S]*?)(?=🎯|⚠|🧠|📊|Exam Tip|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i
    );
    if (explanationMatch) q.explanation = explanationMatch[1].trim();

    const examTipMatch = block.match(/(?:🎯\s*)?(?:\*\*)?Exam Tip(?:\s*\(परीक्षा टिप\))?:?(?:\*\*)?(?:\s*🎯\s*Exam Tip:?)?\s*([\s\S]*?)(?=⚠|🧠|📊|Common Mistake|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (examTipMatch) q.examTip = examTipMatch[1].trim();

    const commonMistakeMatch = block.match(/(?:⚠\s*)?(?:\*\*)?Common Mistake(?:\s*\(सामान्य गलती\))?:?(?:\*\*)?(?:\s*⚠\s*Common Mistake:?)?\s*([\s\S]*?)(?=🧠|📊|Memory Trick|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (commonMistakeMatch) q.commonMistake = commonMistakeMatch[1].trim();

    const memoryTrickMatch = block.match(/(?:🧠\s*)?(?:\*\*)?Memory Trick(?:\s*\(याद रखने का तरीका\))?:?(?:\*\*)?(?:\s*🧠\s*Memory Trick:?)?\s*([\s\S]*?)(?=📊|Difficulty Level|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (memoryTrickMatch) q.mnemonic = memoryTrickMatch[1].trim();

    const difficultyMatch = block.match(/(?:📊\s*)?(?:\*\*)?Difficulty Level(?:\s*\(कठिनाई\))?:?(?:\*\*)?(?:\s*📊\s*Difficulty Level:?)?\s*([\s\S]*?)(?=\n\n|<h[1-6]|<p|<div|<ul|<ol|###|$)/i);
    if (difficultyMatch) {
      const diffStr = difficultyMatch[1].trim().toLowerCase();
      if(diffStr.includes("easy")) q.difficultyLevel = "Easy";
      else if(diffStr.includes("medium")) q.difficultyLevel = "Medium";
      else if(diffStr.includes("hard")) q.difficultyLevel = "Hard";
      else q.difficultyLevel = diffStr;
    }

    if (q.question && q.options && q.options.length > 0 && q.correctAnswer !== undefined) {
      // 8 Competition Question Types Detection & Enrichment
      const detected = detectQuestionType(q);
      q.questionType = detected.type;
      if (detected.assertionReason) {
        q.assertion = detected.assertionReason.assertion;
        q.reason = detected.assertionReason.reason;
        if (detected.assertionReason.cleanedQuestion) {
          q.question = detected.assertionReason.cleanedQuestion;
        }
      }
      if (detected.matchColumns) {
        q.matchColumns = detected.matchColumns;
        q.questionType = 'MATCH_COLUMN';
        q.statements = buildMatchStatements(detected.matchColumns);
        const cleanStem = cleanMatchQuestionStem(q.question);
        if (cleanStem) {
          q.question = cleanStem;
        }
      }
      if (detected.caseStudy?.passage) {
        q.passage = detected.caseStudy.passage;
        if (detected.caseStudy.cleanedQuestion) {
          q.question = detected.caseStudy.cleanedQuestion;
        }
      }
      if (detected.isNegative) {
        q.negativeHighlight = 'NOT';
      }

      questions.push(q as MCQItem);

      const lastMatch = difficultyMatch || memoryTrickMatch || commonMistakeMatch || examTipMatch || explanationMatch || conceptMatch || answerMatch;
      if (lastMatch && lastMatch.index !== undefined) {
          const textAfterLastMatch = cleanedBlock.substring(lastMatch.index + lastMatch[0].length).trim();
          if (textAfterLastMatch.length > 20 && !textAfterLastMatch.startsWith('Options') && !textAfterLastMatch.startsWith('Question')) {
              const title = q.topic || "Note";
              notes.push({ title: title, content: textAfterLastMatch });
          }
      }
    } else if (cleanedBlock.length > 20 && !cleanedBlock.startsWith('Options')) {
      const paragraphs = cleanedBlock.split(/\n\n+/);

      for (const para of paragraphs) {
          if (para.trim().length === 0) continue;

          let title = "Note";
          const paraTopicMatch = para.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/i);

          if (paraTopicMatch) {
              title = paraTopicMatch[1].replace(/<[^>]+>/g, '').replace(/#|\*|_/g, '').trim().substring(0, 50);
          } else {
              const lines = para.split('\n').map(l => l.trim()).filter(l => l);
              if (lines.length > 0) {
                  const firstLine = lines[0];
                  let rawTitle = firstLine;
                  if (firstLine.includes(' Definition:')) {
                      rawTitle = firstLine.split(' Definition:')[0];
                  }
                  rawTitle = rawTitle.replace(/<[^>]+>/g, '').replace(/#|\*|_/g, '').trim();
                  title = rawTitle.substring(0, 50) || "Note";
              }
          }

          notes.push({ title: title !== "Note" ? title : (activeMainTopic || "Note"), content: para.trim() });
      }
    }

    if (allTopicMatches.length > 0) {
        activeMainTopic = allTopicMatches[allTopicMatches.length - 1][1].trim();
    }
  });

  const hybrid = Object.assign([...questions], { questions, notes });
  return hybrid as any;
}
