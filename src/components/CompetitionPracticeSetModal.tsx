import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  Trophy,
  LayoutGrid,
  Sparkles,
  HelpCircle,
  BarChart3,
  ListFilter,
  Check,
  AlertTriangle,
  Flame,
  ShieldCheck,
  Info
} from 'lucide-react';
import {
  PracticeSetMeta,
  PracticeSetQuestion,
  PracticeSetResult,
  calculatePracticeSetResult
} from '../utils/competitionPracticeSets';
import { saveSetLeaderboardScore } from '../utils/setLeaderboard';
import { hapticLight, hapticMedium, hapticStrong } from '../utils/haptic';
import { playSoundClick, playSoundCorrect, playSoundWrong, playSoundVictory } from '../utils/soundEffects';
import { renderMathInHtml, formatExplanationHtml } from '../utils/mathUtils';
import McqQuestionDisplay from './McqQuestionDisplay';
import { SetLeaderboardModal } from './SetLeaderboardModal';

interface Props {
  meta: PracticeSetMeta;
  questions: PracticeSetQuestion[];
  user?: any;
  isDarkMode?: boolean;
  onClose: () => void;
  onSaveResult?: (result: PracticeSetResult) => void;
}

export const CompetitionPracticeSetModal: React.FC<Props> = ({
  meta,
  questions,
  user,
  isDarkMode = false,
  onClose,
  onSaveResult
}) => {
  // ── Test Taking State ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<number>>(new Set());
  const [secondsRemaining, setSecondsRemaining] = useState(() => meta.durationMinutes * 60);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isResultOpen, setIsResultOpen] = useState(false);
  const [resultData, setResultData] = useState<PracticeSetResult | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<'ALL' | 'gk' | 'gs' | 'math' | 'reasoning'>('ALL');
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);

  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  // ── Timer Effect ──
  useEffect(() => {
    if (isResultOpen) return;

    timerRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleForceSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isResultOpen]);

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(remMins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isLowTime = secondsRemaining < 300; // < 5 mins

  // ── Filtered Question Indices ──
  const visibleIndices = useMemo(() => {
    if (sectionFilter === 'ALL') {
      return questions.map((_, i) => i);
    }
    return questions
      .map((q, i) => (q.sectionId === sectionFilter ? i : -1))
      .filter(i => i !== -1);
  }, [questions, sectionFilter]);

  const currentQ = questions[currentIndex] || questions[0];

  const handleSelectOption = (optIndex: number) => {
    if (isReviewMode) return;
    hapticLight();
    playSoundClick();
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: optIndex
    }));
  };

  const handleClearResponse = () => {
    if (isReviewMode) return;
    hapticLight();
    setAnswers(prev => {
      const next = { ...prev };
      delete next[currentIndex];
      return next;
    });
  };

  const handleToggleReview = () => {
    hapticLight();
    setMarkedForReview(prev => {
      const next = new Set(prev);
      if (next.has(currentIndex)) {
        next.delete(currentIndex);
      } else {
        next.add(currentIndex);
      }
      return next;
    });
  };

  const handleNext = () => {
    hapticLight();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    hapticLight();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleForceSubmit = () => {
    const timeSpent = Math.max(1, meta.durationMinutes * 60 - secondsRemaining);
    const res = calculatePracticeSetResult(meta, questions, answers, timeSpent);
    setResultData(res);
    setIsResultOpen(true);
    setIsSubmitConfirmOpen(false);
    playSoundVictory();
    hapticStrong();

    // 🏆 Dedicated Weekly Set Leaderboard Recording
    saveSetLeaderboardScore({
      id: `${meta.id}_${user?.id || 'guest'}_${Date.now()}`,
      setId: meta.id,
      userId: user?.id || 'guest',
      userName: user?.name || user?.displayName || 'अभ्यर्थी',
      userPhoto: user?.photoURL,
      classLevel: user?.classLevel || (meta as any).classLevel || '10',
      targetExam: meta.targetExam || 'General',
      marksObtained: res.marksObtained,
      maxMarks: res.maxMarks,
      percentage: res.percentage,
      correct: res.correct,
      wrong: res.wrong,
      unattempted: res.unattempted,
      timeSpentSeconds: timeSpent,
      submittedAt: new Date().toISOString(),
      weekKey: ''
    }).then(lb => {
      if (lb && lb.rank) {
        setLeaderboardRank(lb.rank);
      }
    }).catch(e => {
      console.warn('[CompetitionPracticeSetModal] Leaderboard save error:', e);
    });

    if (onSaveResult) {
      onSaveResult(res);
    }
  };

  const attemptedCount = Object.keys(answers).length;
  const unattemptedCount = questions.length - attemptedCount;
  const reviewCount = markedForReview.size;

  const modalContent = (
    <div
      className="fixed inset-0 w-full h-[100dvh] max-h-[100dvh] flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden font-sans"
      style={{ zIndex: 9999999 }}
    >
      {/* ── TOP APP BAR ── */}
      <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-2.5 bg-slate-800/95 border-b border-slate-700/80 shadow-md backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => {
              if (isResultOpen || isReviewMode) {
                onClose();
              } else {
                setIsSubmitConfirmOpen(true);
              }
            }}
            className="p-1.5 rounded-xl hover:bg-slate-700/80 text-slate-300 transition-colors"
          >
            <X size={18} />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                meta.type === 'ULTRA' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              }`}>
                {meta.type === 'ULTRA' ? 'ULTRA SET · 150 Qs' : 'BASIC SET · 100 Qs'}
              </span>
              {meta.negativeMarking ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  -0.25 Negative
                </span>
              ) : (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  No Negative
                </span>
              )}
            </div>
            <h1 className="text-xs sm:text-sm font-black truncate max-w-[200px] sm:max-w-md text-white mt-0.5">
              {meta.title}
            </h1>
          </div>
        </div>

        {/* Timer & Palette Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {!isResultOpen && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-black shadow-xs border transition-colors ${
              isLowTime
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-slate-700/60 text-emerald-300 border-slate-600'
            }`}>
              <Clock size={13} className={isLowTime ? 'text-rose-400' : 'text-emerald-400'} />
              <span>{formatTimer(secondsRemaining)}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsPaletteOpen(prev => !prev)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs hover:bg-slate-700"
          >
            <LayoutGrid size={15} />
            <span className="hidden sm:inline">OMR Palette</span>
          </button>

          {!isResultOpen && !isReviewMode && (
            <button
              type="button"
              onClick={() => setIsSubmitConfirmOpen(true)}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-sm active:scale-95 transition-all flex items-center gap-1"
            >
              <Send size={12} />
              <span>Submit</span>
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION TABS BAR ── */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 bg-slate-800/60 border-b border-slate-700/40 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setSectionFilter('ALL')}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 transition-all ${
            sectionFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({questions.length})
        </button>
        {meta.sections.map(sec => {
          const count = questions.filter(q => q.sectionId === sec.id).length;
          const isAct = sectionFilter === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSectionFilter(sec.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 transition-all flex items-center gap-1 ${
                isAct
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.hindiName.split(' ')[0]}</span>
              <span className="opacity-70 text-[10px]">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN QUESTION CONTAINER ── */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 max-w-4xl w-full mx-auto pb-8">
        {currentQ ? (
          <div className="space-y-4">
            {/* Header tags for Question */}
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg font-black bg-slate-800 border border-slate-700 text-indigo-300">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-2 py-0.5 rounded-lg font-bold bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px]">
                  {currentQ.sectionId === 'gk' && '🏛️ सामान्य ज्ञान (GK)'}
                  {currentQ.sectionId === 'gs' && '🔬 सामान्य विज्ञान (GS)'}
                  {currentQ.sectionId === 'math' && '📐 गणित (Mathematics)'}
                  {currentQ.sectionId === 'reasoning' && '🧩 तर्कशक्ति (Reasoning)'}
                </span>
                {(currentQ.year || currentQ.examYear || currentQ.pyqInspired) && (
                  <span className="px-2 py-0.5 rounded-lg font-black bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] flex items-center gap-1">
                    <span>📅</span>
                    <span>{currentQ.examYear || (currentQ.year ? `वर्ष ${currentQ.year}` : currentQ.pyqInspired)}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleToggleReview}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 border transition-all ${
                    markedForReview.has(currentIndex)
                      ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Bookmark size={12} className={markedForReview.has(currentIndex) ? 'fill-purple-300' : ''} />
                  <span>{markedForReview.has(currentIndex) ? 'Marked' : 'Mark Review'}</span>
                </button>
              </div>
            </div>

            {/* Question Text Card with Full 8-Type Support */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-lg">
              <McqQuestionDisplay
                q={currentQ}
                variant="dark"
                showTypeBadge={true}
                questionClassName="text-sm sm:text-base font-semibold leading-relaxed text-slate-100"
              />
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {(currentQ.options || []).map((opt, oIdx) => {
                const isSelected = answers[currentIndex] === oIdx;
                const optLetters = ['A', 'B', 'C', 'D'];
                const letter = optLetters[oIdx] || String(oIdx + 1);

                // Review mode colors
                let optBg = 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-200';
                if (isSelected) {
                  optBg = 'bg-indigo-600/20 border-indigo-500 text-indigo-200 shadow-sm';
                }

                if (isReviewMode) {
                  const isCorrect = oIdx === currentQ.correctAnswer;
                  if (isCorrect) {
                    optBg = 'bg-emerald-600/20 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500';
                  } else if (isSelected && !isCorrect) {
                    optBg = 'bg-rose-600/20 border-rose-500 text-rose-200 ring-1 ring-rose-500';
                  }
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    disabled={isReviewMode}
                    onClick={() => handleSelectOption(oIdx)}
                    className={`w-full p-3.5 sm:p-4 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer active:scale-[0.99] ${optBg}`}
                  >
                    <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-700/60 text-slate-300 border-slate-600'
                    }`}>
                      {letter}
                    </span>
                    <span
                      className="text-xs sm:text-sm font-medium leading-relaxed flex-1 break-words"
                      dangerouslySetInnerHTML={{ __html: renderMathInHtml(opt) }}
                    />
                    {isReviewMode && oIdx === currentQ.correctAnswer && (
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {isReviewMode && isSelected && oIdx !== currentQ.correctAnswer && (
                      <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation in Review Mode */}
            {isReviewMode && currentQ.explanation && (
              <div className="p-4 rounded-xl bg-slate-800/90 border border-indigo-500/30 text-xs sm:text-sm text-slate-300 space-y-1.5 animate-in fade-in duration-200">
                <div className="font-black text-indigo-400 flex items-center gap-1.5">
                  <Info size={14} />
                  <span>व्याख्या (Explanation):</span>
                </div>
                <div
                  className="leading-relaxed text-slate-300"
                  dangerouslySetInnerHTML={{ __html: formatExplanationHtml(currentQ.explanation) }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">कोई प्रश्न उपलब्ध नहीं है।</div>
        )}
      </div>

      {/* ── BOTTOM CONTROL ACTION BAR ── */}
      <div className="shrink-0 w-full px-3 sm:px-4 pt-2.5 pb-10 sm:pb-4 bg-slate-900 border-t border-slate-700/90 backdrop-blur-md z-50 shadow-[0_-12px_28px_rgba(0,0,0,0.6)]">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Left: Previous & Clear */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={currentIndex <= 0}
              onClick={handlePrev}
              className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 text-xs sm:text-sm font-black flex items-center gap-1 border border-slate-700 cursor-pointer active:scale-95 transition-all shadow-sm shrink-0"
            >
              <ChevronLeft size={16} />
              <span>पिछला</span>
            </button>

            {answers[currentIndex] !== undefined && !isReviewMode && (
              <button
                type="button"
                onClick={handleClearResponse}
                className="px-2 sm:px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer active:scale-95 transition-all shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          {/* Center: Progress Count */}
          <div className="text-center text-[11px] text-slate-400 font-bold shrink-0 hidden xs:block">
            हल: <span className="text-emerald-400 font-black">{attemptedCount}</span>/{questions.length}
          </div>

          {/* Right: Submit & Next (Always Rendered & Visible) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsSubmitConfirmOpen(true)}
              className={`px-2.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-all shrink-0 ${
                currentIndex >= questions.length - 1
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/40 ring-1 ring-emerald-400/40'
                  : 'bg-slate-800/90 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              <Send size={13} />
              <span>सबमिट</span>
            </button>

            <button
              type="button"
              disabled={currentIndex >= questions.length - 1}
              onClick={handleNext}
              className="px-3.5 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95 transition-all ring-1 ring-indigo-400/30 shrink-0"
            >
              <span>अगला (Next)</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── OMR PALETTE DRAWER ── */}
      {isPaletteOpen && (
        <div className="fixed inset-0 z-[1000000] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-700 flex flex-col shadow-2xl p-4 animate-in slide-in-from-right duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <LayoutGrid size={18} className="text-indigo-400" />
                <h3 className="text-sm font-black text-white">OMR Question Grid</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-bold">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <span className="w-3.5 h-3.5 rounded bg-emerald-500 shrink-0" />
                <span className="text-slate-300">Answered ({attemptedCount})</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                <span className="w-3.5 h-3.5 rounded bg-slate-600 shrink-0" />
                <span className="text-slate-300">Unanswered ({unattemptedCount})</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-800 border border-slate-700 col-span-2">
                <span className="w-3.5 h-3.5 rounded bg-purple-500 shrink-0" />
                <span className="text-slate-300">Marked for Review ({reviewCount})</span>
              </div>
            </div>

            {/* Grid list */}
            <div className="flex-1 overflow-y-auto pr-1 py-1 grid grid-cols-5 gap-2 content-start">
              {questions.map((q, idx) => {
                const isAns = answers[idx] !== undefined;
                const isMarked = markedForReview.has(idx);
                const isCur = currentIndex === idx;

                let cellBg = 'bg-slate-800 border-slate-700 text-slate-400';
                if (isMarked) {
                  cellBg = 'bg-purple-600 text-white border-purple-500';
                } else if (isAns) {
                  cellBg = 'bg-emerald-600 text-white border-emerald-500';
                }

                if (isReviewMode) {
                  const isCorrect = answers[idx] === q.correctAnswer;
                  if (answers[idx] !== undefined) {
                    cellBg = isCorrect
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : 'bg-rose-600 text-white border-rose-500';
                  }
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setIsPaletteOpen(false);
                      hapticLight();
                    }}
                    className={`h-9 rounded-xl text-xs font-black flex items-center justify-center border transition-all cursor-pointer ${cellBg} ${
                      isCur ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-105' : 'hover:opacity-90'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-800 mt-2">
              <button
                type="button"
                onClick={() => setIsPaletteOpen(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-black border border-slate-700 hover:bg-slate-700"
              >
                Close Palette
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT CONFIRMATION MODAL ── */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-[1000001] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-slate-800 border border-slate-700 p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black border border-indigo-500/30">
                <Send size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Submit Practice Test?</h3>
                <p className="text-[11px] text-slate-400">क्या आप टेस्ट जमा करना चाहते हैं?</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-800">
                <div className="text-slate-400 text-[10px]">Attempted</div>
                <div className="text-base font-black text-emerald-400 mt-0.5">{attemptedCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800">
                <div className="text-slate-400 text-[10px]">Unanswered</div>
                <div className="text-base font-black text-slate-300 mt-0.5">{unattemptedCount}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-800">
                <div className="text-slate-400 text-[10px]">Review</div>
                <div className="text-base font-black text-purple-400 mt-0.5">{reviewCount}</div>
              </div>
            </div>

            {meta.negativeMarking && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>
                  सावधानी: इस टेस्ट में <strong>-0.25 नेगेटिव मार्किंग</strong> है। गलत उत्तर पर अंक काटे जाएँगे।
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-300 hover:text-white text-xs font-black transition-all"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleForceSubmit}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md transition-all active:scale-95"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT / MARKSHEET MODAL ── */}
      {isResultOpen && resultData && (
        <div className="fixed inset-0 z-[1000002] flex items-center justify-center p-3 sm:p-5 bg-slate-950 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 p-5 sm:p-6 shadow-2xl my-auto space-y-5">
            {/* Header Badge */}
            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                <Trophy size={14} className="text-amber-400" />
                <span>{meta.title}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Test Marksheet & Scorecard
              </h2>
              <p className="text-xs text-slate-400">
                {meta.targetExam} · {resultData.totalQuestions} Questions · Time: {Math.round(resultData.timeSpentSeconds / 60)} min
              </p>
            </div>

            {/* Scorecard Hero */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-lg text-center relative overflow-hidden">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                Marks Obtained (प्राप्तांक)
              </div>
              <div className="text-4xl sm:text-5xl font-black text-white mt-1 tracking-tight">
                <span className="text-emerald-400">{resultData.marksObtained}</span>
                <span className="text-slate-500 text-2xl font-bold"> / {resultData.maxMarks}</span>
              </div>

              <div className="flex items-center justify-center gap-3 mt-3 text-xs flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-black border border-indigo-500/30">
                  {resultData.percentage}% Score
                </span>
                {resultData.negativeMarksDeducted > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                    -{resultData.negativeMarksDeducted} Negative Deducted
                  </span>
                )}
                {leaderboardRank ? (
                  <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-black border border-amber-500/40 flex items-center gap-1.5 shadow-sm">
                    <Trophy size={13} className="text-amber-400" />
                    <span>इस सप्ताह रैंक: #{leaderboardRank}</span>
                  </span>
                ) : null}
              </div>
            </div>

            {/* Performance Matrix */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold">Total</div>
                <div className="text-base font-black text-white mt-0.5">{resultData.totalQuestions}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <div className="text-[10px] text-emerald-400 font-bold">Correct</div>
                <div className="text-base font-black text-emerald-300 mt-0.5">{resultData.correct}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40">
                <div className="text-[10px] text-rose-400 font-bold">Wrong</div>
                <div className="text-base font-black text-rose-300 mt-0.5">{resultData.wrong}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <div className="text-[10px] text-slate-400 font-bold">Skipped</div>
                <div className="text-base font-black text-slate-400 mt-0.5">{resultData.unattempted}</div>
              </div>
            </div>

            {/* Sectional Performance Breakdown */}
            <div className="space-y-2">
              <div className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                <BarChart3 size={14} className="text-indigo-400" />
                <span>विषयवार प्रदर्शन (Section-wise Breakdown)</span>
              </div>
              <div className="space-y-2">
                {meta.sections.map(sec => {
                  const s = resultData.sectionStats[sec.id] || { total: 0, attempted: 0, correct: 0, wrong: 0, marks: 0 };
                  const acc = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
                  return (
                    <div key={sec.id} className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{sec.icon}</span>
                        <div>
                          <div className="font-bold text-white">{sec.hindiName}</div>
                          <div className="text-[10px] text-slate-400">Total: {s.total} प्रश्न</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-emerald-400">
                          {s.correct} <span className="text-slate-400 font-normal">/ {s.attempted} Ans</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          Acc: {acc}% · Marks: {s.marks}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* View Leaderboard Button */}
            <button
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Trophy size={14} className="text-slate-950" />
              <span>🏆 इस सेट का साप्ताहिक लीडरबोर्ड देखें (View Weekly Leaderboard)</span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsResultOpen(false);
                  setIsReviewMode(true);
                  setCurrentIndex(0);
                }}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <HelpCircle size={15} />
                <span>Review All Solutions</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black border border-slate-700 transition-all"
              >
                Done / Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SET LEADERBOARD MODAL ── */}
      {isLeaderboardOpen && (
        <SetLeaderboardModal
          setId={meta.id}
          setTitle={meta.title}
          targetExam={meta.targetExam}
          maxMarks={meta.totalQuestions * (meta.marksPerQuestion || 1)}
          user={user}
          isOpen={isLeaderboardOpen}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
