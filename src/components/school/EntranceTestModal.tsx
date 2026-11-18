import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileText,
  GraduationCap,
  HelpCircle,
  Loader2,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type {
  EntranceClassNumber,
  EntranceTestAttempt,
  EntranceTestPaperSet,
  EntranceTestPrefillPayload,
  EntranceTestQuestion,
  School,
} from "../../school-types";
import { generateId } from "../../school-firebase";
import {
  FORMAT_DISPLAY_LABEL,
  MAX_FREE_ATTEMPTS_PER_CLASS,
  calculateEntranceScoreDiscount,
  clearEntranceAdmissionPrefill,
  evaluateEntranceScore,
  generateEntrancePaperSet,
  getAttemptsForStudentClass,
  getClassTestBlueprint,
  getCustomEntranceQuestions,
  getEntranceDeviceId,
  getEntranceTestAttempts,
  normalizeEntranceDiscountConfig,
  normalizeIndianPhone,
  pickNextUnattemptedSetNumber,
  saveEntranceAdmissionPrefill,
  saveEntranceTestAttempt,
} from "../../utils/entranceTestEngine";
import {
  getEntranceBankStats,
  getTotalCuratedBankCount,
} from "../../data/entranceTestQuestionBank";
import { downloadEntrancePaperPdf } from "../../utils/entrancePaperPdf";
import { isAdmissionOfferActive } from "../../utils/admissionOfferUtils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  initialClassLevel?: EntranceClassNumber;
  onProceedToAdmission: (prefill: EntranceTestPrefillPayload) => void;
}

type Stage = "gate" | "running" | "result" | "limit_redirect";

const CLASSES: EntranceClassNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];
const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

const formatClock = (totalSecs: number): string => {
  const s = Math.max(0, Math.floor(totalSecs));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const EntranceTestModal: React.FC<Props> = ({
  isOpen,
  onClose,
  school,
  initialClassLevel = 1,
  onProceedToAdmission,
}) => {
  const schoolId = school?.id || "";
  const deviceId = useMemo(() => getEntranceDeviceId(), []);
  const admissionOffer = school?.websiteConfig?.admissionOffer;
  const offerActive = isAdmissionOfferActive(admissionOffer);
  const offerPct = offerActive ? Math.max(0, Math.round(Number(admissionOffer?.discountPercent || 0))) : 0;
  const entranceDiscountConfig = useMemo(
    () => normalizeEntranceDiscountConfig(school?.websiteConfig?.entranceDiscountConfig),
    [school?.websiteConfig?.entranceDiscountConfig]
  );
  const activeDiscountSlabs = useMemo(
    () =>
      entranceDiscountConfig.enabled
        ? entranceDiscountConfig.slabs.filter((s) => s.enabled !== false && s.discountValue > 0)
        : [],
    [entranceDiscountConfig]
  );

  const [stage, setStage] = useState<Stage>("gate");
  const [selectedClass, setSelectedClass] = useState<EntranceClassNumber>(() =>
    (initialClassLevel >= 1 && initialClassLevel <= 8 ? initialClassLevel : 1) as EntranceClassNumber
  );
  const [studentName, setStudentName] = useState<string>(() => {
    try {
      return localStorage.getItem("nst_entrance_last_name") || "";
    } catch {
      return "";
    }
  });
  const [phone, setPhone] = useState<string>(() => {
    try {
      return localStorage.getItem("nst_entrance_last_phone") || "";
    } catch {
      return "";
    }
  });

  const [allAttempts, setAllAttempts] = useState<EntranceTestAttempt[]>([]);
  const [customQuestions, setCustomQuestions] = useState<EntranceTestQuestion[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  // Active exam state
  const [activePaper, setActivePaper] = useState<EntranceTestPaperSet | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Result / Review state
  const [activeAttemptResult, setActiveAttemptResult] = useState<EntranceTestAttempt | null>(null);
  const [resultPaper, setResultPaper] = useState<EntranceTestPaperSet | null>(null);
  const [reviewFilter, setReviewFilter] = useState<"all" | "wrong" | "correct">("all");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const answersRef = useRef<Record<string, number>>({});
  const paperRef = useRef<EntranceTestPaperSet | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    paperRef.current = activePaper;
  }, [activePaper]);

  useEffect(() => {
    if (!isOpen || !schoolId) return;
    let alive = true;
    setLoadingBank(true);
    Promise.all([getEntranceTestAttempts(schoolId), getCustomEntranceQuestions(schoolId)])
      .then(([attempts, customs]) => {
        if (!alive) return;
        setAllAttempts(attempts);
        setCustomQuestions(customs);
      })
      .finally(() => {
        if (alive) setLoadingBank(false);
      });
    return () => {
      alive = false;
    };
  }, [isOpen, schoolId]);

  const classBlueprint = useMemo(() => getClassTestBlueprint(selectedClass), [selectedClass]);
  const classBankStats = useMemo(() => getEntranceBankStats(selectedClass), [selectedClass]);
  const totalCuratedBankCount = useMemo(() => getTotalCuratedBankCount(), []);

  const attemptsForSelectedClass = useMemo(
    () => getAttemptsForStudentClass(allAttempts, selectedClass, phone, deviceId),
    [allAttempts, selectedClass, phone, deviceId]
  );

  const attemptsUsed = attemptsForSelectedClass.length;
  const attemptsLeft = Math.max(0, MAX_FREE_ATTEMPTS_PER_CLASS - attemptsUsed);
  const isClassLimitReached = attemptsUsed >= MAX_FREE_ATTEMPTS_PER_CLASS;

  // Persist last typed identity locally for parent convenience
  useEffect(() => {
    try {
      if (studentName.trim()) localStorage.setItem("nst_entrance_last_name", studentName.trim());
      if (normalizeIndianPhone(phone).length === 10) {
        localStorage.setItem("nst_entrance_last_phone", normalizeIndianPhone(phone));
      }
    } catch {}
  }, [studentName, phone]);

  // Live countdown timer with 0-second Auto-Submit
  useEffect(() => {
    if (stage !== "running" || !activePaper) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          void finalizeExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, activePaper?.setId]);

  // Auto-redirect countdown when 5-attempt gate modal opens
  useEffect(() => {
    if (stage !== "limit_redirect") {
      setRedirectCountdown(null);
      return;
    }
    setRedirectCountdown(4);
    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          window.clearInterval(interval);
          triggerAdmissionRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const buildPrefillPayload = (): EntranceTestPrefillPayload => {
    const bestScorePct =
      attemptsForSelectedClass.length > 0
        ? Math.max(...attemptsForSelectedClass.map((a) => Number(a.percentage || 0)))
        : undefined;
    const latest = attemptsForSelectedClass[0];
    const evalSummary =
      bestScorePct !== undefined
        ? evaluateEntranceScore(bestScorePct, classBlueprint.classLabel, selectedClass)
        : undefined;
    const scoreDiscount =
      bestScorePct !== undefined
        ? calculateEntranceScoreDiscount(bestScorePct, entranceDiscountConfig)
        : null;
    return {
      schoolId,
      studentName: studentName.trim() || latest?.studentName || "",
      phone: normalizeIndianPhone(phone) || latest?.phone || "",
      classLevel: selectedClass,
      classLabel: classBlueprint.classLabel,
      attemptsUsed,
      bestScorePct,
      lastSetId: latest?.setId,
      evaluationTier: evalSummary?.tier,
      evaluationTag: evalSummary?.adminShortBadge,
      recommendedClassLevel: evalSummary?.recommendedClassLevel,
      recommendedClassLabel: evalSummary?.recommendedClassLabel,
      entranceDiscountLabel: scoreDiscount?.eligible
        ? `${scoreDiscount.displayBadge}${scoreDiscount.label ? ` · ${scoreDiscount.label}` : ""}`
        : undefined,
      entranceDiscountAmount:
        scoreDiscount?.eligible && scoreDiscount.discountType === "fixed"
          ? scoreDiscount.discountAmount
          : undefined,
      createdAt: new Date().toISOString(),
    };
  };

  const triggerAdmissionRedirect = () => {
    const payload = buildPrefillPayload();
    saveEntranceAdmissionPrefill(payload);
    onClose();
    onProceedToAdmission(payload);
  };

  const handleStartTestClick = () => {
    const cleanName = studentName.trim();
    const cleanPhone = normalizeIndianPhone(phone);

    if (!cleanName || cleanName.length < 2) {
      toast.error("कृपया छात्र का पूरा नाम (Student Name) दर्ज करें।");
      return;
    }
    if (cleanPhone.length < 10) {
      toast.error("कृपया सही 10 अंकों का मोबाइल नंबर दर्ज करें।");
      return;
    }

    // Enforce 5-Attempt Lock & Direct Admission Funnel
    if (isClassLimitReached) {
      setStage("limit_redirect");
      return;
    }

    const nextSetNo = pickNextUnattemptedSetNumber(selectedClass, attemptsForSelectedClass);
    const paper = generateEntrancePaperSet({
      schoolId,
      classLevel: selectedClass,
      setNumber: nextSetNo,
      customQuestions,
    });

    submitLockRef.current = false;
    setActivePaper(paper);
    setCurrentIdx(0);
    setAnswers({});
    answersRef.current = {};
    setRemainingSeconds(paper.durationMinutes * 60);
    setShowPalette(false);
    setStage("running");
  };

  const handleStartStepUpTest = (nextClassLevel: EntranceClassNumber) => {
    const nextAttempts = getAttemptsForStudentClass(allAttempts, nextClassLevel, phone, deviceId);
    setSelectedClass(nextClassLevel);

    if (nextAttempts.length >= MAX_FREE_ATTEMPTS_PER_CLASS) {
      toast.info(`Class ${nextClassLevel} के सभी 5 टेस्ट पहले से पूर्ण हैं — नीचे स्कोरकार्ड देखें।`);
      setStage("gate");
      return;
    }

    const nextSetNo = pickNextUnattemptedSetNumber(nextClassLevel, nextAttempts);
    const paper = generateEntrancePaperSet({
      schoolId,
      classLevel: nextClassLevel,
      setNumber: nextSetNo,
      customQuestions,
    });

    submitLockRef.current = false;
    setActivePaper(paper);
    setCurrentIdx(0);
    setAnswers({});
    answersRef.current = {};
    setRemainingSeconds(paper.durationMinutes * 60);
    setShowPalette(false);
    setStage("running");
    toast.success(`Best-Fit Discovery: Class ${nextClassLevel} असेसमेंट शुरू हो गया!`);
  };

  const finalizeExam = async (autoSubmitted: boolean) => {
    const paper = paperRef.current;
    if (!paper || submitLockRef.current) return;

    const chosenMap = { ...answersRef.current };
    if (!autoSubmitted) {
      const firstUnansweredIdx = paper.questions.findIndex(
        (q) => chosenMap[q.id] === undefined || chosenMap[q.id] === null
      );
      if (firstUnansweredIdx !== -1) {
        const remainingCount = paper.questions.filter(
          (q) => chosenMap[q.id] === undefined || chosenMap[q.id] === null
        ).length;
        setCurrentIdx(firstUnansweredIdx);
        setShowPalette(false);
        toast.error(
          `बिना सभी प्रश्न बनाए सबमिट नहीं कर सकते! अभी ${remainingCount} प्रश्न बाकी हैं (Q.${firstUnansweredIdx + 1} पर ले जाया गया है)।`
        );
        return;
      }
    }

    submitLockRef.current = true;
    setSubmitting(true);

    try {
      let correctCount = 0;
      let wrongCount = 0;
      let skippedCount = 0;

      paper.questions.forEach((q) => {
        const chosen = chosenMap[q.id];
        if (chosen === undefined || chosen === null) {
          skippedCount += 1;
        } else if (chosen === q.correctIndex) {
          correctCount += 1;
        } else {
          wrongCount += 1;
        }
      });

      const totalQ = paper.totalQuestions;
      const pct = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;
      const totalDurationSecs = paper.durationMinutes * 60;
      const takenSecs = autoSubmitted
        ? totalDurationSecs
        : Math.max(1, totalDurationSecs - remainingSeconds);

      const cleanPhone = normalizeIndianPhone(phone);
      const attemptNo = Math.min(
        MAX_FREE_ATTEMPTS_PER_CLASS,
        getAttemptsForStudentClass(allAttempts, paper.classLevel, cleanPhone, deviceId).length + 1
      );

      const attempt: EntranceTestAttempt = {
        id: generateId("eta"),
        schoolId,
        studentName: studentName.trim(),
        phone: cleanPhone,
        deviceId,
        classLevel: paper.classLevel,
        classLabel: paper.classLabel,
        setNumber: paper.setNumber,
        setId: paper.setId,
        attemptNumber: attemptNo,
        score: correctCount,
        totalQuestions: totalQ,
        correctCount,
        wrongCount,
        skippedCount,
        percentage: pct,
        timeTakenSeconds: takenSecs,
        durationSeconds: totalDurationSecs,
        autoSubmitted,
        answers: chosenMap,
        questionIds: paper.questions.map((q) => q.id),
        createdAt: new Date().toISOString(),
      };

      await saveEntranceTestAttempt(schoolId, attempt);
      setAllAttempts((prev) => [attempt, ...prev]);
      setActiveAttemptResult(attempt);
      setResultPaper(paper);
      setReviewFilter("all");
      setStage("result");

      if (autoSubmitted) {
        toast.info("समय समाप्त! आपका टेस्ट स्वतः सबमिट (Auto-Submit) हो गया है।");
      } else {
        toast.success(`Scorecard तैयार है! आपने ${correctCount}/${totalQ} (${pct}%) अंक प्राप्त किए।`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPastAttempt = (att: EntranceTestAttempt) => {
    const reconstructedPaper = generateEntrancePaperSet({
      schoolId,
      classLevel: att.classLevel,
      setNumber: att.setNumber,
      customQuestions,
    });
    setActiveAttemptResult(att);
    setResultPaper(reconstructedPaper);
    setReviewFilter("all");
    setStage("result");
  };

  const handleDownloadResultPdf = async (mode: "full" | "questions_only") => {
    if (!resultPaper) return;
    setDownloadingPdf(true);
    try {
      const scoreEval = activeAttemptResult
        ? evaluateEntranceScore(
            activeAttemptResult.percentage,
            activeAttemptResult.classLabel,
            activeAttemptResult.classLevel
          )
        : null;
      await downloadEntrancePaperPdf({
        school,
        paper: resultPaper,
        mode,
        studentName: activeAttemptResult?.studentName || studentName,
        scoreSummary:
          activeAttemptResult && scoreEval
            ? {
                score: activeAttemptResult.score,
                total: activeAttemptResult.totalQuestions,
                percentage: activeAttemptResult.percentage,
                badge: `${scoreEval.parentBadge} · Recommended: ${scoreEval.recommendedClassLabel}`,
                headline: scoreEval.parentHeadline,
                isDirectEligible: scoreEval.isDirectEligible,
              }
            : undefined,
      });
      toast.success(
        mode === "full"
          ? "Question Paper + Answer Key (2-Part PDF) डाउनलोड हो गया!"
          : "Student Question Paper PDF डाउनलोड हो गया!"
      );
    } catch (e: any) {
      toast.error("PDF डाउनलोड करने में समस्या: " + (e?.message || "पुनः प्रयास करें"));
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (!isOpen) return null;

  const answeredCount = activePaper
    ? activePaper.questions.filter((q) => answers[q.id] !== undefined).length
    : 0;
  const totalQuestionsCount = activePaper?.totalQuestions ?? 0;
  const unansweredCount = Math.max(0, totalQuestionsCount - answeredCount);
  const allQuestionsAnswered = Boolean(activePaper && answeredCount >= totalQuestionsCount);
  const allowQuestionGrid = Boolean(activePaper && activePaper.classLevel > 3);
  const currentQuestion = activePaper?.questions[currentIdx] || null;
  const isTimeCritical = remainingSeconds <= 60;
  const isTimeWarning = remainingSeconds > 60 && remainingSeconds <= 180;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <div className="w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-[#F8FAFC] dark:bg-[#0B1324] text-slate-900 dark:text-slate-100 sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* TOP PORTAL BAR */}
        <div className="px-4 py-3 bg-[#070D19] text-white border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold truncate">
                {school?.name || "School"} · Free Online Entrance Test
              </p>
              <p className="text-[11px] text-slate-300 truncate tabular-nums">
                Class 1 to 8 · {totalCuratedBankCount.toLocaleString("en-IN")}-Question Bank ({classBankStats.totalQuestions}/Class) · Auto-Check &amp; Answer Key PDF
              </p>
            </div>
          </div>

          {stage === "running" && activePaper ? (
            <div className="flex items-center gap-2 shrink-0">
              <div
                className={`px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm font-bold tabular-nums flex items-center gap-1.5 ${
                  isTimeCritical
                    ? "bg-red-600/20 border-red-400 text-red-200"
                    : isTimeWarning
                    ? "bg-amber-500/20 border-amber-400 text-amber-200"
                    : "bg-slate-800 border-slate-700 text-emerald-300"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{formatClock(remainingSeconds)}</span>
              </div>
              <button
                type="button"
                onClick={() => finalizeExam(false)}
                disabled={submitting || !allQuestionsAnswered}
                title={
                  allQuestionsAnswered
                    ? "सभी प्रश्न हल हो चुके हैं — अभी सबमिट करें"
                    : `सबमिट करने से पहले सभी ${totalQuestionsCount} प्रश्न हल करें (${unansweredCount} बाकी)`
                }
                className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors tabular-nums ${
                  allQuestionsAnswered
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                    : "bg-slate-800 text-slate-300 border border-slate-700 opacity-75 cursor-not-allowed"
                }`}
              >
                {!allQuestionsAnswered && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                <span>
                  {submitting
                    ? "Checking..."
                    : allQuestionsAnswered
                    ? "Submit Test"
                    : `${answeredCount}/${totalQuestionsCount}`}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                clearEntranceAdmissionPrefill();
                onClose();
              }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              aria-label="Close Entrance Test"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* STAGE 1: VERIFICATION & CLASS GATE */}
        {stage === "gate" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Step 1: Class 1 to 8 Selector */}
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  1. अपनी कक्षा चुनें (Select Exam Class 1 to 8)
                </label>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                  {classBlueprint.totalQuestions} MCQs · {classBlueprint.durationMinutes} Min
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                &lt;33% पर यही कक्षा, 33%+ पर अगली कक्षा (Next Class) का सुझाव मिलेगा — और <strong>90%+ स्कोर</strong> पर Best-Fit Next Class Discovery Offer अनलॉक होगा।
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {CLASSES.map((clsNo) => {
                  const active = selectedClass === clsNo;
                  const clsCount = getAttemptsForStudentClass(
                    allAttempts,
                    clsNo,
                    phone,
                    deviceId
                  ).length;
                  return (
                    <button
                      key={clsNo}
                      type="button"
                      onClick={() => setSelectedClass(clsNo)}
                      className={`py-2.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                        active
                          ? "bg-[#070D19] text-white border-amber-400 shadow-sm"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <div className="text-xs font-bold">Class {clsNo}</div>
                      <div
                        className={`text-[10px] font-mono tabular-nums mt-0.5 ${
                          clsCount >= MAX_FREE_ATTEMPTS_PER_CLASS
                            ? "text-amber-400 font-bold"
                            : active
                            ? "text-slate-300"
                            : "text-slate-500"
                        }`}
                      >
                        {clsCount}/5 used
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Blueprint Summary Strip */}
              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 tabular-nums">
                    <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    <span>
                      {classBlueprint.classLabel} Syllabus Mix ({classBlueprint.totalQuestions} Qs from {classBankStats.totalQuestions}-Question Pool)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {classBlueprint.syllabusNote}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums shrink-0">
                  {classBlueprint.quotas.map((q, idx) => {
                    const poolCount =
                      classBankStats.bySubject.find((s) => s.subject === q.subject)?.count ?? 0;
                    return (
                      <React.Fragment key={q.subject}>
                        {idx > 0 && <span className="text-slate-400" aria-hidden="true">·</span>}
                        <span>
                          {q.subject}: {q.count}
                          <span className="text-slate-400 font-normal">/{poolCount}</span>
                        </span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {activeDiscountSlabs.length > 0 && (
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/35 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <span className="font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Entrance Merit Fee Off:</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 text-emerald-900 dark:text-emerald-200 font-bold tabular-nums">
                    {activeDiscountSlabs.map((slab) => (
                      <span
                        key={slab.id}
                        className="px-2 py-0.5 rounded bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700"
                      >
                        {slab.minPercentage}%–{slab.maxPercentage}%:{" "}
                        <strong className="text-emerald-700 dark:text-emerald-400">
                          {slab.discountType === "percent"
                            ? `${slab.discountValue}% OFF`
                            : `₹${slab.discountValue.toLocaleString("en-IN")} OFF`}
                        </strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Student Details + Attempt Quota */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              <div className="md:col-span-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-3.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  2. छात्र का विवरण (Student Identity Verification)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="e.g. Aarav Kumar"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Parent Mobile Number *
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-sm font-mono tabular-nums focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  हर बार 100 पेपर के पूल (Set-01 से Set-100) में से एक नया अनअटेम्प्टेड पेपर मिलेगा। सबमिट करने के लिए सभी प्रश्न हल करना अनिवार्य है।
                </p>
              </div>

              <div className="md:col-span-5 rounded-xl bg-[#070D19] text-white border border-slate-800 p-4 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">
                      {classBlueprint.classLabel} Free Attempts
                    </span>
                    <span className="font-mono font-bold tabular-nums text-amber-400">
                      {attemptsUsed} / {MAX_FREE_ATTEMPTS_PER_CLASS} Used
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isClassLimitReached ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (attemptsUsed / MAX_FREE_ATTEMPTS_PER_CLASS) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-300 pt-1">
                    {isClassLimitReached
                      ? `आपने ${classBlueprint.classLabel} के सभी 5 फ्री मॉक टेस्ट पूरे कर लिए हैं। अब सीधे ऑनलाइन प्रवेश (Admission) के लिए आगे बढ़ें!`
                      : `${attemptsLeft} फ्री ऑनलाइन टेस्ट शेष हैं। समय समाप्त होने पर पेपर ऑटो-सबमिट हो जाएगा।`}
                  </p>
                </div>

                {isClassLimitReached ? (
                  <button
                    type="button"
                    onClick={() => setStage("limit_redirect")}
                    className="w-full py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>5 Attempts Full → Admission Page पर जाएं</span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={loadingBank}
                    onClick={handleStartTestClick}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {loadingBank ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 fill-current" />
                    )}
                    <span>
                      Start {classBlueprint.classLabel} Test (Attempt {attemptsUsed + 1}/5)
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Past Attempts History for Selected Class */}
            {attemptsForSelectedClass.length > 0 && (
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  आपके पिछले टेस्ट रिकॉर्ड — {classBlueprint.classLabel} ({attemptsForSelectedClass.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {attemptsForSelectedClass.map((att) => {
                    const attEval = evaluateEntranceScore(att.percentage, att.classLabel);
                    return (
                      <div
                        key={att.id}
                        className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                              {att.setId}
                            </span>
                            <span className="truncate">{att.studentName}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums flex flex-wrap items-center gap-1.5">
                            <span>
                              Score:{" "}
                              <strong
                                className={
                                  attEval.isDirectEligible
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-amber-600 dark:text-amber-400"
                                }
                              >
                                {att.score}/{att.totalQuestions} ({att.percentage}%)
                              </strong>{" "}
                              · Attempt #{att.attemptNumber}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                attEval.isDirectEligible
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                  : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                              }`}
                            >
                              {attEval.tier === "MERIT"
                                ? "Merit Topper"
                                : attEval.isDirectEligible
                                ? "Direct Eligible"
                                : "Counseling / Support"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenPastAttempt(att)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          Answer Key &amp; PDF
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STAGE 2: LIVE TIMED EXAM RUNNER */}
        {stage === "running" && activePaper && currentQuestion && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Sub-header with Paper Set + Progress + Palette Toggle */}
            <div className="px-4 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-md bg-[#070D19] text-amber-400 font-mono">
                  {activePaper.classLabel} · {activePaper.setId}
                </span>
                <span className="text-slate-600 dark:text-slate-300 tabular-nums">
                  Q.{currentIdx + 1} / {activePaper.totalQuestions}
                </span>
                <span className="hidden sm:inline text-emerald-600 dark:text-emerald-400 tabular-nums">
                  Answered: {answeredCount}/{activePaper.totalQuestions}
                </span>
              </div>

              {allowQuestionGrid ? (
                <button
                  type="button"
                  onClick={() => setShowPalette((p) => !p)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>All {activePaper.totalQuestions} Qs</span>
                </button>
              ) : (
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                  Done: {answeredCount}/{activePaper.totalQuestions}
                </span>
              )}
            </div>

            {allowQuestionGrid && showPalette && (
              <div className="p-3 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-6 sm:grid-cols-10 gap-1.5 max-h-56 overflow-y-auto shrink-0">
                {activePaper.questions.map((q, idx) => {
                  const isAnswered = answers[q.id] !== undefined;
                  const isCurrent = idx === currentIdx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIdx(idx);
                        setShowPalette(false);
                      }}
                      className={`py-1.5 rounded-md text-xs font-bold font-mono tabular-nums cursor-pointer border ${
                        isCurrent
                          ? "bg-sky-600 text-white border-sky-500"
                          : isAnswered
                          ? "bg-emerald-600 text-white border-emerald-500"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Question Canvas */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-2.5 py-1 rounded-md bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-xs font-bold text-sky-800 dark:text-sky-300">
                  {currentQuestion.subject}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {FORMAT_DISPLAY_LABEL[currentQuestion.format] || currentQuestion.format} · 1 Mark
                </span>
              </div>

              {currentQuestion.passage && (
                <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 p-4 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                    Read the Passage Carefully
                  </div>
                  {currentQuestion.passage}
                </div>
              )}

              <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
                <h3 className="text-base sm:text-lg font-bold leading-snug text-slate-950 dark:text-white">
                  Q.{currentIdx + 1}. {currentQuestion.question}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt, oi) => {
                    const selected = answers[currentQuestion.id] === oi;
                    return (
                      <button
                        key={oi}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: oi,
                          }))
                        }
                        className={`min-h-[48px] px-4 py-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          selected
                            ? "bg-[#070D19] dark:bg-sky-600 text-white border-[#070D19] dark:border-sky-400 shadow-sm"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-400"
                        }`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                            selected
                              ? "bg-amber-400 text-slate-950"
                              : "bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                          }`}
                        >
                          {OPTION_LETTERS[oi]}
                        </span>
                        <span className="text-sm font-medium leading-snug">{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Navigation Bar */}
            <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {answers[currentQuestion.id] !== undefined && (
                <button
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => {
                      const copy = { ...prev };
                      delete copy[currentQuestion.id];
                      return copy;
                    })
                  }
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  Clear Choice
                </button>
              )}

              {currentIdx < activePaper.totalQuestions - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIdx((i) => Math.min(activePaper.totalQuestions - 1, i + 1))}
                  className="px-5 py-2.5 rounded-xl bg-[#070D19] dark:bg-sky-600 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90"
                >
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => finalizeExam(false)}
                  disabled={submitting}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    allQuestionsAnswered
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                      : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                  }`}
                >
                  {allQuestionsAnswered ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? "Submitting..."
                      : allQuestionsAnswered
                      ? "Finish & Auto-Check"
                      : `Complete ${unansweredCount} Qs to Submit`}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 3: INSTANT AUTO-CHECK SCORECARD + ANSWER KEY + 2-PART PDF */}
        {stage === "result" && activeAttemptResult && resultPaper && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Score Hero Card */}
            <div className="rounded-2xl bg-[#070D19] text-white border border-slate-800 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-amber-400 font-bold">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>
                      Auto-Checked Scorecard · {activeAttemptResult.classLabel} · {activeAttemptResult.setId}
                    </span>
                    {activeAttemptResult.autoSubmitted && (
                      <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-200 border border-amber-400/30 text-[10px]">
                        AUTO-SUBMITTED ON TIMEOUT
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold">
                    {activeAttemptResult.studentName} ({activeAttemptResult.phone})
                  </h2>
                  <p className="text-xs text-slate-300 tabular-nums">
                    Attempt {activeAttemptResult.attemptNumber} of {MAX_FREE_ATTEMPTS_PER_CLASS} · Time Taken:{" "}
                    {formatClock(activeAttemptResult.timeTakenSeconds)}
                  </p>
                </div>

                <div className="px-5 py-3 rounded-xl bg-white/10 border border-white/15 text-center shrink-0">
                  <div className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">
                    Final Score
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tabular-nums">
                    {activeAttemptResult.score}/{activeAttemptResult.totalQuestions}
                  </div>
                  <div className="text-xs font-bold text-emerald-300 tabular-nums">
                    {activeAttemptResult.percentage}% Accuracy
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/10 text-center">
                <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-200 font-semibold">● Correct</div>
                  <div className="text-lg font-black text-emerald-300 font-mono tabular-nums">
                    {activeAttemptResult.correctCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/30">
                  <div className="text-[11px] text-red-200 font-semibold">▲ Wrong</div>
                  <div className="text-lg font-black text-red-300 font-mono tabular-nums">
                    {activeAttemptResult.wrongCount}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-[11px] text-slate-300 font-semibold">○ Skipped</div>
                  <div className="text-lg font-black text-white font-mono tabular-nums">
                    {activeAttemptResult.skippedCount}
                  </div>
                </div>
              </div>

              {/* PDF + Next Action Row */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={downloadingPdf}
                  onClick={() => handleDownloadResultPdf("full")}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-60"
                >
                  {downloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Download Question + Answer Key (2-Part PDF)</span>
                </button>

                {isClassLimitReached ? (
                  <button
                    type="button"
                    onClick={() => setStage("limit_redirect")}
                    className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <GraduationCap className="w-4 h-4" />
                    <span>5 Tests Complete — Proceed to Admission{offerPct > 0 ? ` (${offerPct}% OFF)` : ""}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setStage("gate")}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Next Free Test ({attemptsLeft} Left)</span>
                    </button>
                    <button
                      type="button"
                      onClick={triggerAdmissionRedirect}
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>
                        {activeAttemptResult.percentage >= 50
                          ? `Apply for Direct Admission${offerPct > 0 ? ` (${offerPct}% OFF)` : ""}`
                          : "Book Free Counseling & Seat"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Zero-Rejection Class Placement & Eligibility Banner */}
            {(() => {
              const resultEval = evaluateEntranceScore(
                activeAttemptResult.percentage,
                activeAttemptResult.classLabel,
                activeAttemptResult.classLevel
              );
              const scoreDiscount = calculateEntranceScoreDiscount(
                activeAttemptResult.percentage,
                entranceDiscountConfig
              );
              const isMerit = resultEval.tier === "MERIT";
              const isGreen = resultEval.isDirectEligible;
              return (
                <div className="space-y-4">
                  <div
                    className={`rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isGreen
                        ? "bg-emerald-50 dark:bg-emerald-950/35 border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-100"
                        : "bg-amber-50 dark:bg-amber-950/35 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-100"
                    }`}
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider ${
                            isMerit
                              ? "bg-amber-400 text-slate-950"
                              : isGreen
                              ? "bg-emerald-600 text-white"
                              : "bg-amber-500 text-slate-950"
                          }`}
                        >
                          {resultEval.parentBadge}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-[#070D19] text-amber-300 text-[11px] font-bold tabular-nums">
                          Recommended Class: {resultEval.recommendedClassLabel}
                        </span>
                        <span className="text-xs font-bold opacity-80 tabular-nums">
                          {activeAttemptResult.percentage}% in {activeAttemptResult.classLabel}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-extrabold leading-snug">
                        {resultEval.parentHeadline}
                      </h3>
                      <p className="text-xs opacity-90 leading-relaxed">{resultEval.parentSubtext}</p>
                      {scoreDiscount.eligible && (
                        <div className="inline-flex flex-wrap items-center gap-1.5 mt-1 px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-extrabold tabular-nums shadow-xs">
                          <span>🎁 Admission Fee Off Unlocked: {scoreDiscount.displayBadge}</span>
                          {scoreDiscount.label && (
                            <span className="opacity-90 font-semibold">· {scoreDiscount.label}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={triggerAdmissionRedirect}
                      className={`px-4 py-3 rounded-xl font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors shadow-sm ${
                        isGreen
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-amber-400 hover:bg-amber-300 text-slate-950"
                      }`}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>{resultEval.parentCtaLabel}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>

                  {/* Exclusive 90%+ Premium Offer Card: Best-Fit Class Discovery */}
                  {resultEval.stepUpOfferEligible && (
                    <div className="rounded-2xl bg-[#070D19] text-white border border-amber-400/50 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                      <div className="space-y-1.5 min-w-0">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                          <Sparkles className="w-3 h-3" />
                          <span>90%+ Scholar Exclusive Offer</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-extrabold text-white">
                          Best-Fit Class Discovery — One More Test Offer
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                          {resultEval.stepUpTargetClassLevel ? (
                            <>
                              असाधारण प्रदर्शन ({activeAttemptResult.percentage}%)! आप{" "}
                              <strong className="text-amber-300">{resultEval.recommendedClassLabel}</strong>{" "}
                              के लिए पूरी तरह तैयार हैं। हम आपको{" "}
                              <strong className="text-amber-300">{resultEval.stepUpTargetClassLabel}</strong>{" "}
                              में <strong>एक और टेस्ट</strong> देने का स्पेशल ऑफर देते हैं ताकि हम आपके बच्चे के लिए{" "}
                              <strong>Best-Fit Class</strong> पक्की कर सकें!
                            </>
                          ) : (
                            <>
                              असाधारण प्रदर्शन ({activeAttemptResult.percentage}%)! Class 8 के टॉप 90%+ स्कॉलर होने के कारण आप{" "}
                              <strong className="text-amber-300">Class 9 Priority Admission &amp; Merit Scholarship</strong>{" "}
                              के लिए चयनित हैं।
                            </>
                          )}
                        </p>
                      </div>

                      {resultEval.stepUpTargetClassLevel ? (
                        <button
                          type="button"
                          onClick={() => handleStartStepUpTest(resultEval.stepUpTargetClassLevel!)}
                          className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                        >
                          <Play className="w-4 h-4 fill-current shrink-0" />
                          <span>Try {resultEval.stepUpTargetClassLabel} Assessment</span>
                          <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={triggerAdmissionRedirect}
                          className="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors"
                        >
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          <span>Claim Class 9 Merit Seat</span>
                          <ArrowRight className="w-4 h-4 shrink-0" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Answer Key Review Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <span>Detailed Answer Key &amp; Solutions ({resultPaper.setId})</span>
              </h3>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: "all", label: `All (${resultPaper.totalQuestions})` },
                    { id: "wrong", label: `Wrong (${activeAttemptResult.wrongCount})` },
                    { id: "correct", label: `Correct (${activeAttemptResult.correctCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setReviewFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${
                      reviewFilter === tab.id
                        ? "bg-[#070D19] text-white border-[#070D19] dark:border-amber-400"
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {resultPaper.questions.map((q, idx) => {
                const chosen = activeAttemptResult.answers?.[q.id];
                const isCorrect = chosen === q.correctIndex;
                const isSkipped = chosen === undefined || chosen === null;
                if (reviewFilter === "wrong" && (isCorrect || isSkipped)) return null;
                if (reviewFilter === "correct" && !isCorrect) return null;

                return (
                  <div
                    key={q.id}
                    className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Q.{idx + 1} · {q.subject} ({FORMAT_DISPLAY_LABEL[q.format]})
                      </span>
                      {isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> CORRECT
                        </span>
                      ) : isSkipped ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold">
                          SKIPPED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 font-bold">
                          <XCircle className="w-3.5 h-3.5" /> WRONG
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-bold text-slate-950 dark:text-white">{q.question}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                      {q.options.map((opt, oi) => {
                        const isAns = oi === q.correctIndex;
                        const isUser = oi === chosen;
                        return (
                          <div
                            key={oi}
                            className={`px-3 py-2 rounded-lg border flex items-center justify-between gap-2 ${
                              isAns
                                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 text-emerald-900 dark:text-emerald-200 font-bold"
                                : isUser
                                ? "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-900 dark:text-red-200 font-semibold"
                                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span>
                              ({OPTION_LETTERS[oi]}) {opt}
                            </span>
                            {isAns && <span className="text-[10px] font-bold">✓ Answer</span>}
                            {isUser && !isAns && <span className="text-[10px] font-bold">Your Pick</span>}
                          </div>
                        );
                      })}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STAGE 4: 5-ATTEMPT FUNNEL COMPLETION & DIRECT /admission REDIRECT */}
        {stage === "limit_redirect" && (
          <div className="flex-1 overflow-y-auto p-6 sm:p-10 flex items-center justify-center">
            <div className="max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center space-y-5 shadow-lg">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#070D19] text-amber-400 text-xs font-bold tabular-nums">
                  <span>5 / 5 FREE TESTS COMPLETED · {classBlueprint.classLabel.toUpperCase()}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">
                  बधाई हो! {studentName || "Student"}, आपके 5 फ्री प्रैक्टिस टेस्ट पूरे हो चुके हैं
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {classBlueprint.classLabel} की सभी 5 ऑनलाइन परीक्षाएं देने के लिए धन्यवाद! अब आप सीधे{" "}
                  <strong>Online Admission Portal</strong> पर जा रहे हैं जहाँ आपका नाम, मोबाइल नंबर, कक्षा और स्कोर टैग पहले से भरा हुआ मिलेगा।
                </p>
              </div>

              {attemptsForSelectedClass.length > 0 && (() => {
                const bestPct = Math.max(
                  ...attemptsForSelectedClass.map((a) => Number(a.percentage || 0))
                );
                const bestEval = evaluateEntranceScore(
                  bestPct,
                  classBlueprint.classLabel,
                  classBlueprint.classLevel
                );
                const bestDiscount = calculateEntranceScoreDiscount(
                  bestPct,
                  entranceDiscountConfig
                );
                return (
                  <div
                    className={`rounded-xl border p-3 text-left text-xs space-y-1 ${
                      bestEval.isDirectEligible
                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                        : "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200"
                    }`}
                  >
                    <div className="font-extrabold">
                      Best Score: {bestPct}% · {bestEval.parentBadge} · Recommended: {bestEval.recommendedClassLabel}
                    </div>
                    <div className="opacity-90">{bestEval.parentHeadline}</div>
                    {bestDiscount.eligible && (
                      <div className="font-black text-emerald-700 dark:text-emerald-300 pt-0.5">
                        🎁 Admission Merit Off Unlocked: {bestDiscount.displayBadge} ({bestDiscount.label})
                      </div>
                    )}
                  </div>
                );
              })()}

              {offerActive && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 p-3 text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {offerPct > 0
                      ? `Active Offer: ${offerPct}% OFF on Admission Fee!`
                      : admissionOffer?.title || "Special Admission Offer Active!"}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={triggerAdmissionRedirect}
                  className="flex-1 py-3 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    Open Admission Form Now
                    {redirectCountdown !== null ? ` (${redirectCountdown}s)` : ""}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setStage("gate")}
                  className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>View My 5 Scorecards</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
