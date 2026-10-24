/**
 * McqQuestionDisplay
 * Renders an MCQ question with complete understanding and specialized layouts
 * for all 8 competitive exam objective question types:
 *  1. Direct Single Choice MCQs (सीधे बहुविकल्पीय प्रश्न)
 *  2. Multi-Statement Based MCQs (कथन आधारित प्रश्न)
 *  3. Assertion and Reason (अभिकथन और कारण)
 *  4. Match the Column (सुमेलित कीजिए / सही जोड़ी मिलाइए)
 *  5. Chronological Order / Sequencing (कालानुक्रम / सही क्रम)
 *  6. Data Sufficiency (आंकड़ों की पर्याप्तता)
 *  7. Reading Comprehension / Case Study (गद्यांश आधारित प्रश्न)
 *  8. Negative / "NOT" Type Questions (निषेधात्मक प्रश्न)
 */

import React from 'react';
import {
  CheckCircle2,
  Layers,
  Zap,
  GitCompare,
  ArrowRightLeft,
  BarChart2,
  BookOpen,
  AlertTriangle,
  Info
} from 'lucide-react';
import { MCQItem, MCQQuestionType } from '../types';
import { inlineMd, parseMcqQuestion, shouldShowMcqOptions } from '../utils/mcqRender';
import { getMcqOptions } from '../utils/mcqStructure';
import { renderMathInHtml } from '../utils/mathUtils';
import { resolveTelegramUrl } from '../services/telegramStorageService';
import {
  detectQuestionType,
  highlightNegativeInText,
  QuestionTypeBadgeConfig
} from '../utils/questionTypeDetector';

interface Props {
  q: MCQItem;
  /** Show the stable exam number when the item carries one. */
  showQuestionNumber?: boolean;
  /** Extra class applied to the question stem and suffix */
  questionClassName?: string;
  /** Optional custom class for each numbered statement */
  stmtClassName?: string;
  /** Visual variant: 'default' (light) | 'dark' (projector/dark mode) */
  variant?: 'default' | 'dark';
  /** In Q&A/Flashcard contexts, show options only for qualifying questions. */
  showOptions?: boolean;
  /** Show the competition question type badge (defaults to true) */
  showTypeBadge?: boolean;
}

const renderLine = (text: string) => renderMathInHtml(inlineMd(text));

const TYPE_ICONS: Record<MCQQuestionType, React.ElementType> = {
  DIRECT_MCQ: CheckCircle2,
  MULTI_STATEMENT: Layers,
  ASSERTION_REASON: Zap,
  MATCH_COLUMN: GitCompare,
  CHRONOLOGICAL: ArrowRightLeft,
  DATA_SUFFICIENCY: BarChart2,
  CASE_STUDY: BookOpen,
  NEGATIVE_NOT: AlertTriangle,
};

const McqQuestionDisplay: React.FC<Props> = ({
  q,
  showQuestionNumber = false,
  questionClassName = '',
  variant = 'default',
  stmtClassName,
  showOptions = false,
  showTypeBadge = true,
}) => {
  const isDark = variant === 'dark';
  const topicPassageMatch = q.topic?.match(/(?:गद्यांश|Passage|पैसेज)\s*[:：\-]\s*([\s\S]+)$/i);
  const passageFromTopic = topicPassageMatch ? topicPassageMatch[1].trim() : '';

  const detected = detectQuestionType(q);
  const { config, assertionReason, matchColumns, isNegative, caseStudy } = detected;

  const passageText = q.passage?.trim() || caseStudy?.passage?.trim() || passageFromTopic;
  const isCaseStudyType = Boolean(passageText) || detected.type === 'CASE_STUDY';
  const type = isCaseStudyType ? 'CASE_STUDY' : detected.type;
  const TypeIcon = TYPE_ICONS[type] || CheckCircle2;

  const displayQuestion = caseStudy?.passage ? caseStudy.cleanedQuestion : q.question;
  const questionForDisplay = displayQuestion === q.question
    ? q
    : { ...q, question: displayQuestion };
  const { questionHtml, statements, suffixHtml } = parseMcqQuestion(questionForDisplay);

  const defaultStmtClass = isDark
    ? 'bg-slate-800/80 border-l-4 border-indigo-400 text-slate-200 rounded-xl px-3 py-2.5 mb-1.5 text-xs sm:text-sm leading-relaxed'
    : 'bg-sky-50 border-l-4 border-sky-400 text-slate-800 rounded-xl px-3 py-2.5 mb-1.5 text-xs sm:text-sm leading-relaxed shadow-2xs';

  const statementClassName = stmtClassName || `${questionClassName} ${defaultStmtClass}`;

  const isAbove = q.imagePosition === 'above_question';
  const isAfterOptions = q.imagePosition === 'after_options';
  const isBelow = !isAbove && !isAfterOptions; // default: below question

  const imageElement = q.imageUrl ? (
    <div
      className={`my-2.5 flex ${
        q.imageAlign === 'left' ? 'justify-start' : q.imageAlign === 'right' ? 'justify-end' : 'justify-center'
      }`}
    >
      <div
        className={`rounded-xl overflow-hidden border ${
          isDark ? 'border-slate-700 bg-slate-900 shadow-md' : 'border-slate-300/80 bg-white/90 shadow-sm'
        }`}
        style={{
          width: typeof q.imageWidth === 'number' ? `${q.imageWidth}%` : (q.imageWidth || '100%'),
          maxWidth: '100%',
        }}
      >
        <img
          src={resolveTelegramUrl(q.imageUrl)}
          alt="Question Diagram"
          className="w-full h-auto object-contain max-h-[360px] sm:max-h-[460px] rounded-xl"
          loading="lazy"
        />
      </div>
    </div>
  ) : null;

  // Process question stem HTML: if negative question, highlight negative terms with warning pill
  const processedQuestionHtml = React.useMemo(() => {
    if (!questionHtml) return '';
    let html = questionHtml;
    if (matchColumns && matchColumns.rows && matchColumns.rows.length > 0) {
      // Remove raw header line from question stem if already parsed into matchColumns
      html = html.replace(/(?:(?:सूची[- ]?[I1]|List[- ]?[I1]|खण्ड\s*['"‘]?[अA]|Khand\s*['"‘]?[अA])).*?(?:\||vs|—|-|\t| {3,}).*?(?:(?:सूची[- ]?[II2]|List[- ]?[II2]|खण्ड\s*['"‘]?[बB]|Khand\s*['"‘]?[बB])).*(?:<br\s*\/?>)?/gi, '');
      // Remove raw pair lines like "a. विटामिन A | 1. स्कर्वी" or "a. ... — 1. ..."
      html = html.replace(/(?:^|<br\s*\/?>)\s*(?:\(?[a-dA-D1-4]\)?[\.\:\-]?\s*)?[^<|—\n\r]+?\s*(?:\||—|\t)\s*(?:\(?[1-4a-dA-DIVXivx]\)?[\.\:\-]?\s*)?[^<|—\n\r]+(?=<br\s*\/?>|$)/gi, '');
      html = html.replace(/(?:<br\s*\/?>\s*)+/gi, '<br/>').trim();
    }
    if (isNegative) {
      return highlightNegativeInText(html);
    }
    return html;
  }, [questionHtml, isNegative, matchColumns]);

  return (
    <div className="mcq-question-display-root">
      {/* ── QUESTION TYPE BADGE BAR (Exam-Grade Classifier) ── */}
      {showTypeBadge && (
        <div className="flex items-center gap-1.5 flex-wrap mb-2.5 select-none">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black border transition-all ${
              isDark
                ? `${config.bgDark} ${config.textDark} ${config.borderDark}`
                : `${config.bgLight} ${config.textLight} ${config.borderLight} shadow-2xs`
            }`}
            title={config.description}
          >
            <TypeIcon size={13} className="shrink-0" />
            <span>{config.badgeLabel}</span>
            <span className="opacity-60 text-[10px] hidden sm:inline font-mono">[{config.shortCode}]</span>
          </span>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
              isDark
                ? 'bg-slate-800/70 border-slate-700/60 text-slate-400'
                : 'bg-slate-100/80 border-slate-200 text-slate-500'
            }`}
          >
            🎯 {config.examTag}
          </span>

          {/* Year / PYQ Exam Year Badge */}
          {(q.year || q.examYear || q.pyqInspired) && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border transition-all ${
                isDark
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-300 shadow-2xs'
              }`}
              title={`परीक्षा वर्ष / PYQ: ${q.examYear || q.year || q.pyqInspired}`}
            >
              <span>📅</span>
              <span>{q.examYear || (q.year ? `वर्ष ${q.year}` : q.pyqInspired)}</span>
            </span>
          )}
        </div>
      )}

      {/* Stable Exam Question Number */}
      {showQuestionNumber && q.questionNumber !== undefined && (
        <div className={`${questionClassName} mb-1 font-black ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
          Q{q.questionNumber}.
        </div>
      )}

      {/* Attached Question Diagram: Above Question Stem */}
      {isAbove && imageElement}

      {/* ── TYPE 7: READING COMPREHENSION / CASE STUDY PASSAGE ── */}
      {passageText && (
        <div
          className={`my-3 p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm ${
            isDark
              ? 'bg-indigo-950/30 border-indigo-800/60 text-slate-200'
              : 'bg-indigo-50/50 border-indigo-200 text-slate-800 shadow-2xs'
          }`}
        >
          <div className="flex items-center gap-1.5 font-black text-indigo-600 dark:text-indigo-400 mb-2">
            <BookOpen size={14} />
            <span>📖 गद्यांश (Passage / Context):</span>
          </div>
          <div className="leading-relaxed border-l-2 border-indigo-400 pl-3 py-1 text-xs sm:text-sm font-medium whitespace-pre-wrap">
            {passageText}
          </div>
        </div>
      )}

      {/* ── QUESTION STEM ── */}
      {processedQuestionHtml && (
        <div
          className={`${questionClassName} leading-relaxed`}
          dangerouslySetInnerHTML={{ __html: processedQuestionHtml }}
        />
      )}

      {/* Attached Question Diagram: Below Question Stem (Default) */}
      {isBelow && imageElement}

      {/* ── TYPE 3: ASSERTION & REASON SPECIALIZED VIEW (अभिकथन और कारण) ── */}
      {assertionReason && (
        <div className="my-3 space-y-2.5">
          {/* Assertion Box */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border ${
              isDark
                ? 'bg-purple-950/30 border-purple-800/60 text-purple-100'
                : 'bg-purple-50/70 border-purple-200 text-slate-800 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-purple-600 text-white text-[11px] font-black tracking-wide flex items-center gap-1">
                <Zap size={11} />
                <span>अभिकथन (Assertion - A)</span>
              </span>
            </div>
            <div
              className="text-xs sm:text-sm font-semibold leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderLine(assertionReason.assertion) }}
            />
          </div>

          {/* Reason Box */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border ${
              isDark
                ? 'bg-indigo-950/30 border-indigo-800/60 text-indigo-100'
                : 'bg-indigo-50/70 border-indigo-200 text-slate-800 shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-black tracking-wide flex items-center gap-1">
                <Info size={11} />
                <span>कारण (Reason - R)</span>
              </span>
            </div>
            <div
              className="text-xs sm:text-sm font-semibold leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderLine(assertionReason.reason) }}
            />
          </div>
        </div>
      )}

      {/* ── TYPE 4: MATCH THE COLUMN (सुमेलित कीजिए / खण्ड 'अ' और खण्ड 'ब') ── */}
      {matchColumns && matchColumns.rows && matchColumns.rows.length > 0 && (
        <div className="my-2.5 space-y-2">
          <div className="grid grid-cols-2 gap-1.5 sm:gap-3 items-stretch">
            {/* ── LEFT BOX: खण्ड 'अ' (सूची-I) ── */}
            <div
              className={`rounded-xl border overflow-hidden flex flex-col ${
                isDark
                  ? 'bg-slate-900/80 border-indigo-800/60 text-slate-200'
                  : 'bg-indigo-50/50 border-indigo-200 text-slate-800 shadow-2xs'
              }`}
            >
              <div
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black border-b flex items-center justify-between ${
                  isDark
                    ? 'bg-indigo-950/70 text-indigo-200 border-indigo-800/60'
                    : 'bg-indigo-100/80 text-indigo-900 border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="truncate">
                    {matchColumns.list1Title
                      ? matchColumns.list1Title.includes('खण्ड')
                        ? matchColumns.list1Title
                        : `खण्ड 'अ' (${matchColumns.list1Title.replace(/^सूची[- ]?[I1]\s*\(?|\)?$/gi, '').trim() || 'सूची-I'})`
                      : "खण्ड 'अ' (सूची-I)"}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono opacity-60 shrink-0 ml-1">Box A</span>
              </div>
              <div className="p-1 sm:p-2 space-y-1 sm:space-y-1.5 flex-1 divide-y divide-indigo-100/60 dark:divide-indigo-900/30">
                {matchColumns.rows.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium min-h-[34px] sm:min-h-[38px] ${
                      isDark
                        ? 'bg-slate-800/60 text-slate-200 border border-slate-700/50'
                        : 'bg-white text-slate-800 border border-indigo-100/80 shadow-2xs'
                    }`}
                  >
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-indigo-600 text-white font-black text-[10px] sm:text-[11px] flex items-center justify-center shrink-0">
                      {row.leftKey || String.fromCharCode(97 + rIdx)}
                    </span>
                    <span className="leading-snug break-words flex-1" dangerouslySetInnerHTML={{ __html: renderLine(row.leftText) }} />
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT BOX: खण्ड 'ब' (सूची-II) ── */}
            <div
              className={`rounded-xl border overflow-hidden flex flex-col ${
                isDark
                  ? 'bg-slate-900/80 border-emerald-800/60 text-slate-200'
                  : 'bg-emerald-50/50 border-emerald-200 text-slate-800 shadow-2xs'
              }`}
            >
              <div
                className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black border-b flex items-center justify-between ${
                  isDark
                    ? 'bg-emerald-950/70 text-emerald-200 border-emerald-800/60'
                    : 'bg-emerald-100/80 text-emerald-900 border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="truncate">
                    {matchColumns.list2Title
                      ? matchColumns.list2Title.includes('खण्ड')
                        ? matchColumns.list2Title
                        : `खण्ड 'ब' (${matchColumns.list2Title.replace(/^सूची[- ]?[II2]\s*\(?|\)?$/gi, '').trim() || 'सूची-II'})`
                      : "खण्ड 'ब' (सूची-II)"}
                  </span>
                </div>
                <span className="text-[9px] sm:text-[10px] font-mono opacity-60 shrink-0 ml-1">Box B</span>
              </div>
              <div className="p-1 sm:p-2 space-y-1 sm:space-y-1.5 flex-1 divide-y divide-emerald-100/60 dark:divide-emerald-900/30">
                {matchColumns.rows.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className={`flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg text-[11px] sm:text-xs md:text-sm font-medium min-h-[34px] sm:min-h-[38px] ${
                      isDark
                        ? 'bg-slate-800/60 text-slate-200 border border-slate-700/50'
                        : 'bg-white text-slate-800 border border-emerald-100/80 shadow-2xs'
                    }`}
                  >
                    <span className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-emerald-600 text-white font-black text-[10px] sm:text-[11px] flex items-center justify-center shrink-0">
                      {row.rightKey || (rIdx + 1)}
                    </span>
                    <span className="leading-snug break-words flex-1" dangerouslySetInnerHTML={{ __html: renderLine(row.rightText) }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TYPE 5: CHRONOLOGICAL ORDER (कालानुक्रम) ── */}
      {type === 'CHRONOLOGICAL' && statements.length > 0 && !assertionReason && (
        <div className="my-2.5 space-y-1.5">
          <div className="text-[11px] font-black text-teal-600 dark:text-teal-400 flex items-center gap-1 mb-1">
            <ArrowRightLeft size={13} />
            <span>घटनाओं का कालानुक्रमिक क्रम निर्धारित करें:</span>
          </div>
          {statements.map((s, i) => {
            const cleanText = s.replace(/^(?:(?:\(?\d+\)?|\(?[IVXivx]+\)?)[.\-:]?\s*|(?:\*|-|•|▪|◦)\s+)/i, '');
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed ${
                  isDark
                    ? 'bg-teal-950/25 border-teal-800/50 text-slate-200'
                    : 'bg-teal-50/60 border-teal-200 text-slate-800'
                }`}
              >
                <span className="w-5 h-5 rounded-md bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1" dangerouslySetInnerHTML={{ __html: cleanText }} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── TYPE 6: DATA SUFFICIENCY (आंकड़ों की पर्याप्तता) ── */}
      {type === 'DATA_SUFFICIENCY' && statements.length > 0 && !assertionReason && (
        <div className="my-2.5 space-y-2">
          <div className="text-[11px] font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-1 mb-1">
            <BarChart2 size={13} />
            <span>कथनों की पर्याप्तता का मूल्यांकन करें (Evaluate Data Sufficiency):</span>
          </div>
          {statements.map((s, i) => {
            const cleanText = s.replace(/^(?:(?:कथन|Statement)\s*(?:[I1]+|[IVXivx]+|\d+)\s*[:：\-.]?\s*|(?:\*|-|•|▪|◦)\s+)/i, '');
            return (
              <div
                key={i}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-medium leading-relaxed ${
                  isDark
                    ? 'bg-cyan-950/25 border-cyan-800/50 text-slate-200'
                    : 'bg-cyan-50/60 border-cyan-200 text-slate-800'
                }`}
              >
                <span className="font-black text-cyan-700 dark:text-cyan-300 mr-2">
                  कथन {i === 0 ? 'I' : i === 1 ? 'II' : i + 1}:
                </span>
                <span dangerouslySetInnerHTML={{ __html: cleanText }} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── TYPE 2: MULTI-STATEMENT BASED MCQs (कथन आधारित प्रश्न) ── */}
      {type !== 'CHRONOLOGICAL' && type !== 'DATA_SUFFICIENCY' && type !== 'MATCH_COLUMN' && !assertionReason && statements.length > 0 && (
        <div className="my-2.5 space-y-1.5">
          {statements.map((s, i) => (
            <div
              key={i}
              className={statementClassName}
              dangerouslySetInnerHTML={{ __html: s }}
            />
          ))}
        </div>
      )}

      {/* Closing suffix ("उपर्युक्त में से कौन-सा/से कथन सही है/हैं?") */}
      {suffixHtml && (
        <div
          className={`${questionClassName} mt-2.5 font-bold ${
            isDark ? 'text-indigo-200' : 'text-slate-900'
          }`}
          dangerouslySetInnerHTML={{ __html: isNegative ? highlightNegativeInText(suffixHtml) : suffixHtml }}
        />
      )}

      {/* Attached Question Diagram: After Options */}
      {isAfterOptions && imageElement}

      {/* Options preview (e.g. for Q&A or Flashcard views) */}
      {showOptions && shouldShowMcqOptions(q) && q.options?.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {getMcqOptions(q).map((option, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium leading-snug ${
                isDark
                  ? 'border-slate-700 bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 rounded-full border-2 ${isDark ? 'border-slate-500' : 'border-slate-400'}`} />
              <span dangerouslySetInnerHTML={{ __html: renderMathInHtml(inlineMd(option)) }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default McqQuestionDisplay;
